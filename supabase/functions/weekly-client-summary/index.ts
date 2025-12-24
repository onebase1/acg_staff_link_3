import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getBranding } from "../_shared/getBranding.ts";
import { shouldSendNotification } from "../_shared/preferenceChecker.ts";
import {
    logNotificationSent,
    logNotificationFailed,
    logNotificationSkipped
} from "../_shared/notificationLogger.ts";
import { generateDownloadUrls } from "../_shared/magic-tokens.ts";

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

serve(async (req) => {
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
                // Fetch ALL shifts for the period (Open, Assigned, Confirmed, etc.)
                const { data: shiftData, error: shiftError } = await supabase.rpc('get_weekly_summary_data', {
                    p_client_id: client.id,
                    p_start_date: startDate.toISOString().split('T')[0],
                    p_end_date: endDate.toISOString().split('T')[0],
                    p_include_all_statuses: true
                });

                if (shiftError) throw shiftError;

                if (!shiftData || shiftData.length === 0) {
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
                const emailHtml = await buildMonthlyAlignmentEmail({
                    supabase,
                    client,
                    shiftData,
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

        return new Response(JSON.stringify({ success: true, results }), { headers: { "Content-Type": "application/json" } });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
});

function formatMonthYear(date: Date): string {
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

async function buildMonthlyAlignmentEmail(params: {
    supabase: SupabaseClient;
    client: any;
    shiftData: any[];
    range: { start: Date; end: Date };
    branding: any;
    reportTitle: string;
}): Promise<string> {
    const { supabase, client, shiftData, range, branding, reportTitle } = params;

    // Totals
    const totalShifts = shiftData.length;
    const confirmedShifts = shiftData.filter(s => ['confirmed', 'completed', 'awaiting_admin_closure'].includes(s.shift_status)).length;
    const totalHours = shiftData.reduce((acc, s) => acc + (Number(s.actual_hours) || Number(s.duration_hours) || 0), 0);
    const fulfillment = totalShifts > 0 ? Math.round((confirmedShifts / totalShifts) * 100) : 0;

    // Table rows with requested DATE column
    let tableRows = '';
    shiftData.forEach((s, idx) => {
        const rowColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
        const statusColor = ['confirmed', 'completed'].includes(s.shift_status) ? '#059669' : '#dc2626';
        const displayDate = new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        
        tableRows += `
            <tr style="background: ${rowColor};">
                <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-weight: 600; font-size: 13px;">${displayDate}</td>
                <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">${s.role}</td>
                <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; text-align: center;">
                    <span style="background: ${s.shift_type === 'Day' ? '#fef3c7' : '#1e293b'}; color: ${s.shift_type === 'Day' ? '#92400e' : '#e0f2fe'}; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase;">${s.shift_type}</span>
                </td>
                <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; text-align: center; font-weight: 700; color: ${statusColor}; font-size: 12px; text-transform: capitalize;">${s.shift_status.replace(/_/g, ' ')}</td>
                <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 600; font-size: 13px;">${Number(s.actual_hours || s.duration_hours).toFixed(1)}h</td>
            </tr>
        `;
    });

    // Magic buttons
    let downloadSection = '';
    try {
        const downloadUrls = await generateDownloadUrls(supabase, {
            agency_id: client.agency_id,
            client_id: client.id,
            metadata: { 
                date_from: range.start.toISOString().split('T')[0], 
                date_to: range.end.toISOString().split('T')[0],
                type: 'monthly_alignment'
            }
        });
        downloadSection = `
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 16px; padding: 24px; margin-bottom: 32px; text-align: center;">
                <div style="font-size: 14px; color: #0c4a6e; font-weight: 700; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em;">📥 Export Reconciliation Data</div>
                <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
                    <a href="${downloadUrls.pdf}" style="display: inline-block; background: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px;">📄 PDF Report</a>
                    <a href="${downloadUrls.csv}" style="display: inline-block; background: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px;">📊 Excel/CSV</a>
                </div>
            </div>
        `;
    } catch (info) { console.warn("Buttons failed:", info); }

    return `
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 40px 20px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800;">${reportTitle}</h1>
                <p style="color: #e0f2fe; margin: 8px 0 0 0; font-size: 15px;">Period: ${range.start.toLocaleDateString('en-GB')} - ${range.end.toLocaleDateString('en-GB')}</p>
            </div>
            <div style="padding: 30px;">
                <p style="font-size: 16px; color: #374151;">Dear <strong>${client.name}</strong>,</p>
                <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">Please find your automated alignment summary below. This side-by-side view helps ensure accurate reconciliation for the billing cycle.</p>
                
                ${downloadSection}

                <div style="display: flex; justify-content: space-around; background: #ffffff; border: 2px solid #e5e7eb; border-radius: 16px; padding: 20px; margin-bottom: 30px;">
                    <div style="text-align: center;"><div style="font-size: 24px; font-weight: 800; color: #0284c7;">${totalShifts}</div><div style="font-size: 11px; font-weight: 600; color: #64748b;">TOTAL SHIFTS</div></div>
                    <div style="text-align: center; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; padding: 0 20px;"><div style="font-size: 24px; font-weight: 800; color: #059669;">${totalHours.toFixed(0)}h</div><div style="font-size: 11px; font-weight: 600; color: #64748b;">TOTAL HOURS</div></div>
                    <div style="text-align: center;"><div style="font-size: 24px; font-weight: 800; color: #d97706;">${fulfillment}%</div><div style="font-size: 11px; font-weight: 600; color: #64748b;">FULFILLMENT</div></div>
                </div>

                <h3 style="color: #1f2937; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 15px;">Detailed Performance Log</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr style="background: #1f2937; color: #ffffff;">
                            <th style="padding: 12px 16px; text-align: left; font-size: 12px; border-radius: 8px 0 0 0;">Date</th>
                            <th style="padding: 12px 16px; text-align: left; font-size: 12px;">Role</th>
                            <th style="padding: 12px 16px; text-align: center; font-size: 12px;">Type</th>
                            <th style="padding: 12px 16px; text-align: center; font-size: 12px;">Status</th>
                            <th style="padding: 12px 16px; text-align: right; font-size: 12px; border-radius: 0 8px 0 0;">Hours</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>

                <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 15px; border-radius: 8px; font-size: 13px; color: #854d0e;">
                    <strong>ℹ️ Note:</strong> This summary includes all shifts (Filled & Open). Please report any discrepancies by the 5th of the month.
                </div>
                
                <p style="margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center;">Questions? Contact us at <a href="mailto:${branding.supportEmail}" style="color: #0284c7; text-decoration: none;">${branding.supportEmail}</a></p>
            </div>
            <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px;">
                © ${new Date().getFullYear()} ${branding.companyName}. Powered by ACG StaffLink
            </div>
        </div>
    </body>
    </html>`;
}
