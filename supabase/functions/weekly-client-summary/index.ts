import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
    loadTemplate,
    getBranding,
    shouldSendNotification,
    logNotificationSent,
    logNotificationFailed,
    logNotificationSkipped,
    generateDownloadUrls,
    generateStaffProfileLink
} from "../_shared/all.ts";

/**
 * 📧 WEEKLY CLIENT SUMMARY
 * 
 * Sends automated weekly email summaries to clients every Monday at 8 AM
 * 
 * FEATURES:
 * ✅ Last Week: Actual hours from timesheets (confirmed)
 * ✅ This Week: Scheduled hours (estimated)
 * ✅ Pending Timesheets: Flagged separately
 * ✅ Compact Table: Role rows with Day/Night columns
 * ✅ White-labeled: Dynamic agency branding
 */

// CORS headers for browser requests
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Check for trigger type
        let body: { manual_trigger?: boolean; client_id?: string; agency_id?: string; trigger_source?: string } = {};
        try {
            body = await req.json();
        } catch {
            // No body
        }

        const isManualTrigger = body.manual_trigger === true;
        const isWeeklyCron = body.cron_weekly === true;
        const isMonthlyCron = body.cron_monthly === true;
        
        const triggerSource = body.trigger_source || (isWeeklyCron ? 'cron_weekly' : isMonthlyCron ? 'cron_monthly' : isManualTrigger ? 'manual' : 'scheduled');
        const targetClientId = body.client_id;
        const targetAgencyId = body.agency_id;

        console.log(`📧 [Monthly/Weekly Summary] Starting... Source: ${triggerSource}`);
        
        const now = new Date();
        let startDate: Date;
        let endDate: Date;
        let reportTitle = "Monthly Alignment Summary";

        if (triggerSource === 'cron_monthly') {
            // Full Previous Month
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            reportTitle = "Monthly Alignment Summary";
        } else if (triggerSource === 'cron_weekly') {
            // Full Previous Week (Monday to Sunday)
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay() - 6); // Previous Monday
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); // Up to Sunday
            endDate.setHours(23, 59, 59, 999);
            
            reportTitle = "Weekly Alignment Summary";
        } else {
            // Default to current week (or as requested for alignment)
            // Month-to-Date
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            reportTitle = "Month-to-Date Performance";
        }

        console.log(`📅 Report Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

        // Get active clients
        let clientsQuery = supabase
            .from('clients')
            .select(`id, name, email, agency_id`)
            .eq('status', 'active');

        if (isManualTrigger && targetClientId) {
            clientsQuery = clientsQuery.eq('id', targetClientId);
        }
        if (isManualTrigger && targetAgencyId) {
            clientsQuery = clientsQuery.eq('agency_id', targetAgencyId);
        }

        const { data: clients, error: clientsError } = await clientsQuery;
        if (clientsError) throw clientsError;

        console.log(`👥 Processing ${clients?.length || 0} clients`);

        const results = { sent: 0, skipped: 0, failed: 0 };

        for (const client of clients || []) {
            try {
                // 3. Fetch MTD data for stats
                const mtdStartDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
                const { data: mtdData, error: mtdError } = await supabase.rpc('get_weekly_summary_data', {
                    p_client_id: client.id,
                    p_start_date: mtdStartDate.toISOString().split('T')[0],
                    p_end_date: endDate.toISOString().split('T')[0],
                    p_include_all_statuses: true
                });

                if (mtdError) throw mtdError;

                // 4. Filter for Weekly Range (for the table)
                const shiftData = mtdData ? mtdData.filter((s: any) => {
                    const shiftDate = new Date(s.date);
                    return shiftDate >= startDate && shiftDate <= endDate;
                }) : [];

                if (shiftData.length === 0 && !isManualTrigger) {
                    results.skipped++;
                    continue;
                }

                const branding = await getBranding(supabase, client.agency_id);
                
                // Preference check
                if (!isManualTrigger) {
                    const pref = await shouldSendNotification(supabase, client.email, 'weekly_summary', 'email', 'client');
                    if (!pref.allowed) {
                        results.skipped++;
                        continue;
                    }
                }

                // Build HTML
                const emailHtml = await buildWeeklySummaryEmail({
                    supabase,
                    client,
                    shiftData, // Last Week / Selected Range
                    mtdData: mtdData || [], // Month to Date
                    range: { start: startDate, end: endDate },
                    branding,
                    reportTitle
                });

                // Send email
                const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
                    body: {
                        to: client.email,
                        subject: triggerSource === 'cron_weekly' 
                            ? `${reportTitle}: Week Ending ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                            : `${reportTitle}: ${formatMonthYear(startDate)}`,
                        html: emailHtml,
                        from_name: branding.companyName
                    }
                });

                if (emailError || !emailResult?.success) throw new Error(emailError?.message || 'Send failed');

                await logNotificationSent(supabase, {
                    recipientEmail: client.email,
                    recipientFirstName: client.name,
                    recipientType: 'client',
                    agencyId: client.agency_id,
                    notificationType: 'weekly_summary',
                    channel: 'email',
                    subject: `${reportTitle} - ${client.name}`,
                    templateName: 'monthly_alignment_summary',
                    provider: 'resend',
                    providerMessageId: emailResult.messageId,
                    metadata: { client_id: client.id, shift_count: shiftData.length }
                });

                results.sent++;
            } catch (err) {
                console.error(`❌ Client ${client.name} failed:`, err.message);
                results.failed++;
            }
        }

        return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});

function formatMonthYear(date: Date): string {
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

async function buildWeeklySummaryEmail(params: {
    supabase: SupabaseClient;
    client: any;
    shiftData: any[];
    mtdData: any[];
    range: { start: Date; end: Date };
    branding: Branding;
    reportTitle: string;
}): Promise<string> {
    const { client, shiftData, mtdData, range, branding } = params;

    // 1. Calculate Weekly Stats
    const totalShifts = shiftData.length;
    const totalHours = shiftData.reduce((acc, s) => acc + (Number(s.actual_hours) || Number(s.duration_hours) || 0), 0);
    const uniqueStaff = new Set(shiftData.map(s => s.staff_id || s.assigned_staff_id).filter(Boolean)).size;

    // 2. Calculate MTD Stats
    const totalShiftsMtd = mtdData.length;
    const totalHoursMtd = mtdData.reduce((acc, s) => acc + (Number(s.actual_hours) || Number(s.duration_hours) || 0), 0);
    const uniqueStaffMtd = new Set(mtdData.map(s => s.staff_id || s.assigned_staff_id).filter(Boolean)).size;

    const formatWeekRange = (s: Date, e: Date) => 
        `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    // 3. Build rows (Chronological Mon-Sun)
    const sortedShifts = [...shiftData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const buildRows = async (shifts: any[]) => {
        const rows = await Promise.all(shifts.map(async (s, idx) => {
            const rowColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
            const displayDate = new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            const roleName = s.role_name || s.role || 'Staff'; // Fallback
            
            let profileLinkHtml = '';
            const staffId = s.staff_id || s.assigned_staff_id;
            if (staffId) {
                try {
                    const profileLink = await generateStaffProfileLink(
                        supabase,
                        staffId,
                        client.id,
                        client.agency_id
                    );
                    profileLinkHtml = `<br><a href="${profileLink}" style="color: #0284c7; text-decoration: none; font-size: 11px; font-weight: bold;">[📋 View Profile]</a>`;
                } catch (err) {
                    console.warn(`⚠️ [Weekly Summary] Failed to generate profile link for staff ${staffId}:`, err);
                }
            }

            const staffName = s.staff_first_name ? (`${s.staff_first_name} ${s.staff_last_name || ''}`).trim() : 'Scheduled';

            return `
                <tr style="background: ${rowColor};">
                    <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-weight: 600; font-size: 13px;">${displayDate}</td>
                    <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">${s.start_time} - ${s.end_time}</td>
                    <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">${roleName}</td>
                    <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; text-align: center; font-weight: 700; font-size: 13px;">${staffName}${profileLinkHtml}</td>
                    <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 600; font-size: 13px;">${Number(s.actual_hours || s.duration_hours).toFixed(1)}h</td>
                </tr>
            `;
        }));
        return rows.join('');
    };

    // 4. Template
    return await loadTemplate('weekly_summary', {
        client_name: client.name,
        week_range: formatWeekRange(range.start, range.end),
        total_shifts: totalShifts,
        total_hours: totalHours.toFixed(1),
        total_staff: uniqueStaff,
        total_shifts_mtd: totalShiftsMtd,
        total_hours_mtd: totalHoursMtd.toFixed(1),
        total_staff_mtd: uniqueStaffMtd,
        shift_rows: await buildRows(sortedShifts),
        agency_name: branding.companyName,
        agency_email: branding.supportEmail,
        agency_phone: branding.supportPhone,
        preferences_url: `${branding.siteUrl}/preferences?email=${encodeURIComponent(client.email)}`,
        current_year: new Date().getFullYear().toString()
    });
}
