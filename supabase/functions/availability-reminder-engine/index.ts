import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * WEEKLY AVAILABILITY REMINDER ENGINE
 * 
 * Runs every Sunday 6pm via cron
 * Sends email to active staff who haven't updated availability recently
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log('📅 [Availability Reminder] Starting weekly reminder check...');

    try {
        // 1. Get all active staff who have an email
        const { data: allStaff, error: staffError } = await supabase
            .from('staff')
            .select('id, first_name, last_name, email, agency_id, availability, availability_updated_at')
            .eq('status', 'active')
            .not('email', 'is', null);

        if (staffError) throw staffError;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        let sent = 0;
        let skipped = 0;

        for (const staff of allStaff) {
            // Check if updated recently
            let needsReminder = true;
            if (staff.availability_updated_at) {
                const lastUpdate = new Date(staff.availability_updated_at);
                if (lastUpdate > sevenDaysAgo) {
                    needsReminder = false;
                }
            }

            if (!needsReminder) {
                skipped++;
                continue;
            }

            // 2. Fetch agency info for branding
            const { data: agency } = await supabase
                .from('agencies')
                .select('name')
                .eq('id', staff.agency_id)
                .single();

            const agencyName = agency?.name || 'Your Agency';

            // Generate availability summary for context
            const availability = staff.availability || {};
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            
            const summary = days.map(day => {
                const shifts = availability[day] || [];
                if (shifts.length === 0) return `<li style="margin-bottom: 5px;">❌ <strong>${day.charAt(0).toUpperCase() + day.slice(1)}:</strong> Not available</li>`;
                return `<li style="margin-bottom: 5px;">✅ <strong>${day.charAt(0).toUpperCase() + day.slice(1)}:</strong> ${shifts.join(', ')}</li>`;
            }).join('');

            const appUrl = Deno.env.get('APP_URL') || 'https://acg-staff-link.vercel.app';
            
            const emailHtml = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
                    <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 24px;">📅 Weekly Availability Check</h1>
                    </div>
                    
                    <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background-color: #ffffff;">
                        <p style="font-size: 18px; margin-top: 0;">Hi ${staff.first_name},</p>
                        <p>We're planning next week's schedule! Please ensure your availability is up to date so we can match you with the best shifts at <strong>${agencyName}</strong>.</p>
                        
                        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px inset #f3f4f6;">
                            <h3 style="margin-top: 0; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Your Current Settings:</h3>
                            <ul style="list-style: none; padding: 0; margin: 15px 0;">
                                ${summary}
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${appUrl}/my-availability" 
                               style="background-color: #0891b2; color: #ffffff; padding: 14px 28px; 
                                      border-radius: 8px; text-decoration: none; font-weight: bold; 
                                      display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                Update My Availability
                            </a>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px; background: #fffbeb; padding: 10px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                            <strong>Note:</strong> Keeping your availability fresh ensures you don't miss out on prime shift offers. If your availability hasn't changed, feel free to ignore this email.
                        </p>

                        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 30px 0;" />
                        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-bottom: 0;">
                            Sent automatically by ACG StaffLink on behalf of ${agencyName}.
                        </p>
                    </div>
                </div>
            `;

            // 3. Send email via internal invoke
            await supabase.functions.invoke('send-email', {
                body: {
                    to: staff.email,
                    subject: `📅 Weekly Availability Review - ${agencyName}`,
                    html: emailHtml,
                    from_name: agencyName
                }
            });

            sent++;
            console.log(`📧 [Availability Reminder] Sent to ${staff.first_name} ${staff.last_name} (${staff.email})`);
        }

        console.log(`✅ [Availability Reminder] Finished: ${sent} sent, ${skipped} skipped`);

        return new Response(JSON.stringify({
            success: true,
            sent,
            skipped,
            total: allStaff.length
        }), { 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });

    } catch (err) {
        console.error('❌ [Availability Reminder] Critical Error:', err);
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
