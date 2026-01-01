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

serve(async (req: any) => {
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
        let body: any = {};
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
        let reportTitle = "Monthly Service Summary";

        if (triggerSource === 'cron_monthly') {
            // Logic: If run on 1st-5th, assume previous month. If late in month (manual 31st), assume CURRENT month.
            const isFirstFewDays = now.getDate() <= 5;
            const targetMonth = isFirstFewDays ? now.getMonth() - 1 : now.getMonth();
            const targetYear = now.getFullYear(); 
            
            startDate = new Date(targetYear, targetMonth, 1);
            endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
            reportTitle = isFirstFewDays ? "Monthly Service Summary" : "Monthly Progress Summary";
        } else if (triggerSource === 'cron_weekly') {
            // Full Previous Week (Monday to Sunday)
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay() - 6); // Previous Monday
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6); // Up to Sunday
            endDate.setHours(23, 59, 59, 999);
            
            reportTitle = "Weekly Service Summary";
        } else {
            // Default to current month-to-date
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            reportTitle = "Service Summary (MTD)";
        }

        console.log(`📅 Report Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

        // Get active clients with primary contact and their agency info for white-labeling
        let clientsQuery = supabase
            .from('clients')
            .select(`
                id, name, email, agency_id, contact_person,
                agencies:agency_id (name, email, phone, contact_email, contact_phone)
            `)
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
        const errors: any[] = [];

        for (const client of clients || []) {
            try {
                // Determine Agency Identity (White-labeling)
                const agencyInfo = client.agencies;
                const agencyName = agencyInfo?.name || "Agile Care Management";
                const agencyEmail = agencyInfo?.contact_email || agencyInfo?.email || "support@agilecaremanagement.co.uk";
                const agencyPhone = agencyInfo?.contact_phone || agencyInfo?.phone || "+44 20 1234 5678";

                // 3. Fetch data for stats and aggregation
                const { data: mtdData, error: mtdError } = await supabase.rpc('get_weekly_summary_data', {
                    p_client_id: client.id,
                    p_start_date: startDate.toISOString().split('T')[0],
                    p_end_date: endDate.toISOString().split('T')[0],
                    p_include_all_statuses: true
                });

                if (mtdError) throw mtdError;

                // 4. In this new design, the 'shiftData' for the table IS the mtdData (or restricted range if needed)
                const shiftData = mtdData || [];

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
                    shiftData,
                    range: { start: startDate, end: endDate },
                    branding,
                    reportTitle,
                    agency: {
                        name: agencyName,
                        email: agencyEmail,
                        phone: agencyPhone
                    }
                });

                // Send email
                const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
                    body: {
                        to: client.email,
                        subject: `${reportTitle}: ${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
                        html: emailHtml,
                        from_name: agencyName
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
                    templateName: 'weekly_summary',
                    provider: 'resend',
                    providerMessageId: emailResult.messageId,
                    metadata: { client_id: client.id, shift_count: shiftData.length }
                });

                results.sent++;
            } catch (err: any) {
                console.error(`❌ [Weekly Summary] Error processing client ${client.name} (ID: ${client.id}):`, err);
                errors.push({ client_id: client.id, error: err.message || String(err) });
                results.failed++;
            }
        }

        return new Response(JSON.stringify({ success: true, results, errors }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message || String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});

async function buildWeeklySummaryEmail(params: {
    supabase: SupabaseClient;
    client: any;
    shiftData: any[];
    range: { start: Date; end: Date };
    branding: any;
    reportTitle: string;
    agency: { name: string; email: string; phone: string };
}): Promise<string> {
    const { supabase, client, shiftData, range, branding, reportTitle, agency } = params;

    // 1. Calculate Stats
    const totalShifts = shiftData.length;
    const totalHours = shiftData.reduce((acc, s) => acc + (Number(s.actual_hours) || Number(s.duration_hours) || 0), 0);
    const uniqueStaff = new Set(shiftData.map(s => s.staff_id || s.assigned_staff_id).filter(Boolean)).size;

    const formatRange = (s: Date, e: Date) => 
        `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    // 2. Aggregate Shifts for Invoice-Style Table
    const buildAggregatedRows = (shifts: any[]) => {
        const groups: Record<string, any> = {};
        
        // Sort first to ensure consistency
        const sorted = [...shifts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (const s of sorted) {
            const rawDate = new Date(s.date);
            const dateStr = rawDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            const timeStr = `${s.start_time || ''} - ${s.end_time || ''}`;
            const roleStr = s.role_name || s.role || 'Staff';
            const key = `${s.date}_${timeStr}_${roleStr}`;

            if (!groups[key]) {
                groups[key] = {
                    date: dateStr,
                    time: timeStr,
                    role: roleStr,
                    qty: 0,
                    hours: 0,
                    rawDate: rawDate.getTime()
                };
            }
            groups[key].qty += 1;
            groups[key].hours += (Number(s.actual_hours) || Number(s.duration_hours) || 0);
        }

        return Object.values(groups).map((g: any, idx: number) => {
            const rowColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            return `
                <tr style="background: ${rowColor};">
                    <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 13px; color: #1e293b;">${g.date}</td>
                    <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569;">${g.time}</td>
                    <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569;">${g.role}</td>
                    <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 800; font-size: 13px; color: #0284c7;">${g.qty}</td>
                    <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; font-size: 13px; color: #1e293b;">${g.hours.toFixed(1)}h</td>
                </tr>
            `;
        }).join('');
    };

    // 3. Template
    return await loadTemplate('weekly_summary', {
        report_title: reportTitle,
        contact_name: client.contact_person?.name || 'Team',
        client_name: client.name,
        date_range: formatRange(range.start, range.end),
        total_shifts: totalShifts,
        total_hours: totalHours.toFixed(1),
        total_staff: uniqueStaff,
        shifts_html: buildAggregatedRows(shiftData),
        agency_name: agency.name,
        agency_email: agency.email,
        agency_phone: agency.phone,
        preferences_url: `${branding.siteUrl}/preferences?email=${encodeURIComponent(client.email)}`,
        current_year: new Date().getFullYear().toString()
    });
}
