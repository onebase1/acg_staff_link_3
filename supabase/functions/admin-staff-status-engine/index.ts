import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * ADMIN STAFF STATUS ENGINE
 * 
 * Runs daily via cron
 * Provides admins with a summary of inactive staff and those with stale availability.
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log('📋 [Admin Status Engine] Starting daily status review...');

    try {
        // 1. Get all agencies
        const { data: agencies, error: agencyError } = await supabase
            .from('agencies')
            .select('id, name');

        if (agencyError) throw agencyError;

        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        for (const agency of agencies) {
            console.log(`🔍 Processing agency: ${agency.name}`);

            // 2. Find Inactive/Suspended staff
            const { data: inactiveStaff } = await supabase
                .from('staff')
                .select('first_name, last_name, status, archived_reason, archived_at')
                .eq('agency_id', agency.id)
                .in('status', ['inactive', 'suspended']);

            // 3. Find Stale Availability staff (Active but haven't updated in 14 days)
            const { data: staleStaff } = await supabase
                .from('staff')
                .select('first_name, last_name, availability_updated_at')
                .eq('agency_id', agency.id)
                .eq('status', 'active')
                .or(`availability_updated_at.lt.${fourteenDaysAgo.toISOString()},availability_updated_at.is.null`);

            // If nothing to report, skip
            if ((!inactiveStaff || inactiveStaff.length === 0) && (!staleStaff || staleStaff.length === 0)) {
                console.log(`⏩ Nothing to report for ${agency.name}`);
                continue;
            }

            // 4. Get agency admins
            const { data: admins } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('agency_id', agency.id)
                .eq('user_type', 'agency_admin');

            if (!admins || admins.length === 0) {
                console.log(`⚠️ No admins found for ${agency.name}, skipping email.`);
                continue;
            }

            // 5. Generate Report Table
            let inactiveRows = '';
            if (inactiveStaff && inactiveStaff.length > 0) {
                inactiveRows = inactiveStaff.map(s => `
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #edf2f7;">
                            <strong>${s.first_name} ${s.last_name}</strong>
                            ${s.archived_reason ? `<br/><span style="font-size: 11px; color: #718096;">Reason: ${s.archived_reason}</span>` : ''}
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #edf2f7;">
                            <span style="background: ${s.status === 'suspended' ? '#fff5f5' : '#f7fafc'}; 
                                         color: ${s.status === 'suspended' ? '#c53030' : '#4a5568'}; 
                                         padding: 2px 8px; border-radius: 9999px; font-size: 11px; text-transform: capitalize; border: 1px solid ${s.status === 'suspended' ? '#feb2b2' : '#e2e8f0'};">
                                ${s.status}
                            </span>
                            ${s.archived_at ? `<br/><span style="font-size: 10px; color: #a0aec0;">${new Date(s.archived_at).toLocaleDateString('en-GB')}</span>` : ''}
                        </td>
                    </tr>
                `).join('');
            }

            let staleRows = '';
            if (staleStaff && staleStaff.length > 0) {
                staleRows = staleStaff.map(s => `
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #edf2f7;">${s.first_name} ${s.last_name}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; color: #718096; font-size: 13px;">
                            ${s.availability_updated_at ? new Date(s.availability_updated_at).toLocaleDateString('en-GB') : 'Never Updated'}
                        </td>
                    </tr>
                `).join('');
            }

            const appUrl = Deno.env.get('APP_URL') || 'https://acg-staff-link.vercel.app';

            const emailHtml = `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #2d3748;">
                    <div style="background: #2d3748; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 22px;">📋 Daily Staff Status Review</h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.8;">Action items for ${agency.name}</p>
                    </div>

                    <div style="padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; background: white;">
                        ${inactiveRows ? `
                            <h3 style="color: #4a5568; border-left: 4px solid #e53e3e; padding-left: 10px; margin-top: 0;">Inactive & Suspended Staff</h3>
                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                                <thead>
                                    <tr style="text-align: left; color: #718096; font-size: 12px; text-transform: uppercase;">
                                        <th style="padding: 10px; border-bottom: 2px solid #edf2f7;">Name & Reason</th>
                                        <th style="padding: 10px; border-bottom: 2px solid #edf2f7;">Status & Date</th>
                                    </tr>
                                </thead>
                                <tbody>${inactiveRows}</tbody>
                            </table>
                        ` : ''}

                        ${staleRows ? `
                            <h3 style="color: #4a5568; border-left: 4px solid #ed8936; padding-left: 10px;">Stale Availability (>14 days)</h3>
                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                                <thead>
                                    <tr style="text-align: left; color: #718096; font-size: 12px; text-transform: uppercase;">
                                        <th style="padding: 10px; border-bottom: 2px solid #edf2f7;">Name</th>
                                        <th style="padding: 10px; border-bottom: 2px solid #edf2f7;">Last Updated</th>
                                    </tr>
                                </thead>
                                <tbody>${staleRows}</tbody>
                            </table>
                        ` : ''}

                        <div style="background: #ebf8ff; border-radius: 8px; padding: 15px; border-left: 4px solid #3182ce; margin: 30px 0;">
                            <p style="margin: 0; font-size: 14px; color: #2c5282;">
                                💡 <strong>Tip:</strong> Consider archiving staff who are in "Inactive" status for a long time to keep your roster clean.
                            </p>
                        </div>

                        <div style="text-align: center;">
                            <a href="${appUrl}/staff" 
                               style="background: #2d3748; color: white; padding: 12px 24px; 
                                      border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                                Manage Staff Roster
                            </a>
                        </div>
                    </div>
                </div>
            `;

            // 6. Send to all admins
            for (const admin of admins) {
                await supabase.functions.invoke('send-email', {
                    body: {
                        to: admin.email,
                        subject: `📋 Staff Status Review - ${agency.name}`,
                        html: emailHtml,
                        from_name: "StaffLink System"
                    }
                });
                console.log(`📧 Sent report to admin: ${admin.email}`);
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (err) {
        console.error('❌ [Admin Status Engine] Error:', err);
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
