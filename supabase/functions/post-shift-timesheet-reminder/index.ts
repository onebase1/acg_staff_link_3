import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shouldSendNotification } from "../_shared/preferenceChecker.ts";
import {
    logNotificationSent,
    logNotificationFailed,
    logNotificationSkipped
} from "../_shared/notificationLogger.ts";
import { scheduleRetry } from "../_shared/retryHandler.ts";
import { shiftRequiresGPS } from "../_shared/gpsHelper.ts";

/**
 * 📋 POST-SHIFT TIMESHEET REMINDER
 *
 * Sends WhatsApp + Email reminders to staff after shift ends
 * Asks them to upload their timesheet via Staff Portal
 *
 * TRIGGER: Called when shift status changes to "awaiting_admin_closure"
 * OR can be run manually/via cron to catch shifts that ended
 *
 * SENDS:
 * - WhatsApp message with link to Staff Portal
 * - Email with link to specific timesheet
 *
 * NO CRON NEEDED: Triggered by shift status change
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

        console.log('📋 [Post-Shift Reminder] Starting run...');

        const { shift_id } = await req.json();

        // If specific shift provided, process it
        if (shift_id) {
            console.log(`📋 [Post-Shift Reminder] Processing shift: ${shift_id}`);
            const { data: shifts, error } = await supabase
                .from("shifts")
                .select("*")
                .eq("id", shift_id);

            if (error || shifts.length === 0) {
                return new Response(JSON.stringify({ error: 'Shift not found' }), {
                    status: 404,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            const result = await sendTimesheetReminder(supabase, shifts[0]);
            return new Response(JSON.stringify({ success: true, result }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Otherwise, find all shifts that ended recently without timesheet
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        console.log('📋 [Post-Shift Reminder] Finding unprocessed shifts from the last 7 days...');

        const { data: allShifts, error: shiftsError } = await supabase
            .from("shifts")
            .select("*")
            .eq("status", 'awaiting_admin_closure')
            .eq("timesheet_reminder_sent", false)
            .gte("date", sevenDaysAgo.toISOString().split('T')[0]);

        if (shiftsError) {
            throw shiftsError;
        }

        console.log(`📋 [Post-Shift Reminder] Found ${allShifts.length} shifts needing reminders`);

        const results = {
            success: true,
            shifts_processed: allShifts.length,
            reminders_sent: 0,
            errors: []
        };

        for (const shift of allShifts) {
            try {
                await sendTimesheetReminder(supabase, shift);
                results.reminders_sent++;
            } catch (error) {
                console.error(`❌ [Post-Shift Reminder] Error for shift ${shift.id}:`, error);
                results.errors.push({
                    shift_id: shift.id,
                    error: error.message
                });
            }
        }

        console.log(`✅ [Post-Shift Reminder] Complete: ${results.reminders_sent}/${results.shifts_processed} sent`);
        return new Response(JSON.stringify(results), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('❌ [Post-Shift Reminder] Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});

async function sendTimesheetReminder(supabase, shift) {
    console.log(`📋 [Reminder] Processing shift ${shift.id}`);

    // Get staff, client, agency
    const { data: allStaff, error: staffError } = await supabase
        .from("staff")
        .select("*");

    if (staffError) throw staffError;

    const staffMember = allStaff.find(s => s.id === shift.assigned_staff_id);

    if (!staffMember) {
        console.log(`⚠️ [Reminder] No staff assigned to shift ${shift.id}`);
        return { skipped: true, reason: 'No staff assigned' };
    }

    const { data: allClients } = await supabase
        .from("clients")
        .select("*");

    const client = allClients?.find(c => c.id === shift.client_id);

    // 📅 Check if GPS is required for this shift/client
    const requiresGPS = shiftRequiresGPS(shift, client);
    console.log(`📍 [Reminder] Shift ${shift.id} - GPS required: ${requiresGPS}`);

    const { data: allAgencies } = await supabase
        .from("agencies")
        .select("*");

    const agency = allAgencies?.find(a => a.id === shift.agency_id);

    const agencyName = agency?.name || 'Your Agency';

    // Check if timesheet already exists
    const { data: existingTimesheets } = await supabase
        .from("timesheets")
        .select("*")
        .eq("staff_id", staffMember.id)
        .eq("client_id", shift.client_id)
        .eq("shift_date", shift.date);

    // Portal link to Staff Portal (they can navigate to timesheets from there)
    const portalLink = 'https://agilecaremanagement.netlify.app/staff'; 

    // 🎯 MESSAGING STRATEGY: Differentiate between GPS vs Paper shifts
    const timesheet = existingTimesheets && existingTimesheets.length > 0 
        ? existingTimesheets[0] 
        : null; // Note: We insert/select above if missing

    const hasGPSData = timesheet?.clock_in_time && timesheet?.clock_out_time;
    const isGPSTimesheet = requiresGPS && hasGPSData;

    let whatsappMessage, emailSubject, emailBody;

    if (isGPSTimesheet) {
        // ✅ GPS STAFF - Confirmation message (no action needed, but optional upload mentioned)
        whatsappMessage = `✅ SHIFT COMPLETE [${agencyName}]: Your shift at ${client?.name} (${shift.date}) has ended. GPS timesheet auto-created from clock-in/out. Status: Submitted for approval. Optional: If you have a paper timesheet, you can upload it as backup via ${portalLink}`;

        emailSubject = `✅ Shift Complete - GPS Timesheet Auto-Created`;
        emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #10b981;">✅ Shift Complete - GPS Verified</h2>

                <p>Hi ${staffMember.first_name},</p>

                <p>Your shift at <strong>${client?.name}</strong> has ended. Your timesheet was automatically created from your GPS clock-in/out data.</p>

                <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                    <h3 style="color: #065f46; margin-top: 0;">🎯 GPS STAFF - NO ACTION NEEDED!</h3>
                    <p style="margin: 10px 0;">Your timesheet has been automatically:</p>
                    <ul style="margin: 10px 0;">
                        <li>✅ Created from GPS clock-in/out</li>
                        <li>✅ Submitted for approval</li>
                        <li>✅ Sent to client for verification</li>
                    </ul>
                    <p style="margin: 10px 0;"><strong>Status:</strong> Awaiting approval</p>
                </div>

                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Shift Details</h3>
                    <p><strong>Client:</strong> ${client?.name}</p>
                    <p><strong>Date:</strong> ${shift.date}</p>
                    <p><strong>Time:</strong> ${shift.start_time} - ${shift.end_time}</p>
                    ${shift.work_location_within_site ? `<p><strong>Location:</strong> ${shift.work_location_within_site}</p>` : ''}
                    ${timesheet?.actual_start_time ? `<p><strong>Actual Start:</strong> ${timesheet.actual_start_time}</p>` : ''}
                    ${timesheet?.actual_end_time ? `<p><strong>Actual End:</strong> ${timesheet.actual_end_time}</p>` : ''}
                    ${timesheet?.total_hours ? `<p><strong>Total Hours:</strong> ${timesheet.total_hours}</p>` : ''}
                </div>

                <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                    <h3 style="color: #1e40af; margin-top: 0;">📋 Optional: Paper Timesheet</h3>
                    <p style="margin: 10px 0; color: #1e3a8a;">
                        If you have a signed paper timesheet, you can upload it as backup evidence.
                        This is <strong>optional</strong> but may be useful during the transition period.
                    </p>
                    <p style="margin: 10px 0; color: #1e3a8a;">
                        <strong>To upload:</strong> Staff Portal → Timesheets → Upload Document
                    </p>
                </div>

                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                    <tr>
                        <td align="center">
                            <table border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="background-color: #059669; border-radius: 8px;" bgcolor="#059669">
                                        <a href="${portalLink}" style="display: inline-block; padding: 15px 30px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif;">
                                            📱 View Timesheet
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                    <strong>Forgot to clock out?</strong> Please clock out now via the app.<br>
                    Sent by ${agencyName}
                </p>
            </div>
        `;
    } else {
        // ❌ NON-GPS STAFF - Action required message
        whatsappMessage = `📋 TIMESHEET DUE [${agencyName}]: Your shift at ${client?.name} (${shift.date}) has ended. Please upload your signed timesheet via the Staff Portal: ${portalLink}`;

        emailSubject = `⏱️ Timesheet Due - ${client?.name} (${shift.date})`;
        emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0284c7;">📋 Timesheet Submission Reminder</h2>

                <p>Hi ${staffMember.first_name},</p>

                <p>Your shift at <strong>${client?.name}</strong> has ended. Please upload your signed timesheet as soon as possible.</p>

                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Shift Details</h3>
                    <p><strong>Client:</strong> ${client?.name}</p>
                    <p><strong>Date:</strong> ${shift.date}</p>
                    <p><strong>Time:</strong> ${shift.start_time} - ${shift.end_time}</p>
                    ${shift.work_location_within_site ? `<p><strong>Location:</strong> ${shift.work_location_within_site}</p>` : ''}
                </div>

                <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #0284c7;">
                    <h3 style="color: #1e40af; margin-top: 0;">📤 How to Submit Your Timesheet</h3>
                    <ol style="margin: 10px 0;">
                        <li>Take a clear photo of your completed, signed timesheet</li>
                        <li>Go to <strong>Staff Portal → Timesheets</strong></li>
                        <li>Click on your timesheet for this shift</li>
                        <li>Upload the document using the upload button</li>
                    </ol>
                </div>

                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                    <tr>
                        <td align="center">
                            <table border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="background-color: #0369a1; border-radius: 8px;" bgcolor="#0369a1">
                                        <a href="${portalLink}" style="display: inline-block; padding: 15px 30px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif;">
                                            📱 Upload Timesheet
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                    Timesheets must be submitted within 48 hours of shift completion.<br>
                    Sent by ${agencyName}
                </p>
            </div>
        `;
    }

    const results = {
        whatsapp: { success: false },
        email: { success: false }
    };

    // Send WhatsApp + Email in parallel
    if (staffMember.phone) {
        // --- WHATSAPP ---
        try {
            const waPref = await shouldSendNotification(supabase, staffMember.email, 'shift_complete', 'whatsapp', 'staff');
            
            if (waPref.allowed) {
                const whatsappResult = await supabase.functions.invoke('send-whatsapp', {
                    body: { to: staffMember.phone, message: whatsappMessage }
                });

                if (whatsappResult.error || !whatsappResult.data?.success) {
                    throw new Error(whatsappResult.error?.message || whatsappResult.data?.error || 'Unknown WhatsApp error');
                }

                results.whatsapp = { success: true };
                await logNotificationSent(supabase, {
                    recipientEmail: staffMember.email,
                    recipientPhone: staffMember.phone,
                    recipientType: 'staff',
                    staffId: staffMember.id,
                    agencyId: shift.agency_id,
                    notificationType: 'shift_complete',
                    channel: 'whatsapp',
                    provider: 'twilio',
                    providerMessageId: whatsappResult.data?.sid,
                    preferenceChecked: waPref.preferenceChecked,
                    preferenceStatus: waPref.preferenceStatus,
                    relatedEntityId: shift.id,
                    relatedEntityType: 'shift'
                });
            } else {
                console.log(`⏭️ [Timesheet Reminder] WhatsApp skipped for ${staffMember.phone} - ${waPref.reason}`);
                await logNotificationSkipped(supabase, {
                    recipientEmail: staffMember.email,
                    recipientPhone: staffMember.phone,
                    recipientType: 'staff',
                    staffId: staffMember.id,
                    agencyId: shift.agency_id,
                    notificationType: 'shift_complete',
                    channel: 'whatsapp',
                    preferenceChecked: waPref.preferenceChecked,
                    preferenceStatus: waPref.preferenceStatus,
                    skippedReason: waPref.reason,
                    relatedEntityId: shift.id,
                    relatedEntityType: 'shift'
                });
            }
        } catch (error: any) {
            console.error(`❌ [Timesheet Reminder] WhatsApp failed:`, error);
            results.whatsapp = { success: false, error: error.message };
            
            await logNotificationFailed(supabase, {
                recipientEmail: staffMember.email,
                recipientPhone: staffMember.phone,
                recipientType: 'staff',
                staffId: staffMember.id,
                agencyId: shift.agency_id,
                notificationType: 'shift_complete',
                channel: 'whatsapp',
                errorMessage: error.message,
                relatedEntityId: shift.id,
                relatedEntityType: 'shift'
            });

            // Schedule retry
            await scheduleRetry(supabase, {
                notificationType: 'shift_complete',
                channel: 'whatsapp',
                recipientEmail: staffMember.email,
                recipientPhone: staffMember.phone,
                recipientId: staffMember.id,
                agencyId: shift.agency_id,
                content: whatsappMessage,
                relatedEntityId: shift.id,
                relatedEntityType: 'shift',
                errorMessage: error.message
            });
        }

        // --- EMAIL ---
        try {
            const emailPref = await shouldSendNotification(supabase, staffMember.email, 'shift_complete', 'email', 'staff');

            if (emailPref.allowed) {
                const emailResult = await supabase.functions.invoke('send-email', {
                    body: { to: staffMember.email, subject: emailSubject, html: emailBody }
                });

                if (emailResult.error) throw new Error(emailResult.error);

                results.email = { success: true };
                await logNotificationSent(supabase, {
                    recipientEmail: staffMember.email,
                    recipientType: 'staff',
                    staffId: staffMember.id,
                    agencyId: shift.agency_id,
                    notificationType: 'shift_complete',
                    channel: 'email',
                    provider: 'resend',
                    providerMessageId: emailResult.data?.id,
                    preferenceChecked: emailPref.preferenceChecked,
                    preferenceStatus: emailPref.preferenceStatus,
                    relatedEntityId: shift.id,
                    relatedEntityType: 'shift'
                });
            } else {
                console.log(`⏭️ [Timesheet Reminder] Email skipped for ${staffMember.email} - ${emailPref.reason}`);
                await logNotificationSkipped(supabase, {
                    recipientEmail: staffMember.email,
                    recipientType: 'staff',
                    staffId: staffMember.id,
                    agencyId: shift.agency_id,
                    notificationType: 'shift_complete',
                    channel: 'email',
                    preferenceChecked: emailPref.preferenceChecked,
                    preferenceStatus: emailPref.preferenceStatus,
                    skippedReason: emailPref.reason,
                    relatedEntityId: shift.id,
                    relatedEntityType: 'shift'
                });
            }
        } catch (error: any) {
            console.error(`❌ [Timesheet Reminder] Email failed:`, error);
            results.email = { success: false, error: error.message };

            await logNotificationFailed(supabase, {
                recipientEmail: staffMember.email,
                recipientType: 'staff',
                staffId: staffMember.id,
                agencyId: shift.agency_id,
                notificationType: 'shift_complete',
                channel: 'email',
                errorMessage: error.message,
                relatedEntityId: shift.id,
                relatedEntityType: 'shift'
            });

            // Schedule retry
            await scheduleRetry(supabase, {
                notificationType: 'shift_complete',
                channel: 'email',
                recipientEmail: staffMember.email,
                recipientId: staffMember.id,
                agencyId: shift.agency_id,
                subject: emailSubject,
                content: emailBody,
                relatedEntityId: shift.id,
                relatedEntityType: 'shift',
                errorMessage: error.message
            });
        }

    } else {
        // Email only (no phone)
        try {
            const emailPref = await shouldSendNotification(supabase, staffMember.email, 'shift_complete', 'email', 'staff');

            if (emailPref.allowed) {
                const { data, error } = await supabase.functions.invoke('send-email', {
                    body: {
                        to: staffMember.email,
                        subject: emailSubject,
                        html: emailBody
                    }
                });
                
                if (error) throw new Error(error.message);

                results.email = { success: true };
                await logNotificationSent(supabase, {
                    recipientEmail: staffMember.email,
                    recipientType: 'staff',
                    staffId: staffMember.id,
                    agencyId: shift.agency_id,
                    notificationType: 'shift_complete',
                    channel: 'email',
                    provider: 'resend',
                    providerMessageId: data?.id,
                    preferenceChecked: emailPref.preferenceChecked,
                    preferenceStatus: emailPref.preferenceStatus,
                    relatedEntityId: shift.id,
                    relatedEntityType: 'shift'
                });
            } else {
                console.log(`⏭️ [Timesheet Reminder] Email skipped for ${staffMember.email} - ${emailPref.reason}`);
                await logNotificationSkipped(supabase, {
                    recipientEmail: staffMember.email,
                    recipientType: 'staff',
                    staffId: staffMember.id,
                    agencyId: shift.agency_id,
                    notificationType: 'shift_complete',
                    channel: 'email',
                    preferenceChecked: emailPref.preferenceChecked,
                    preferenceStatus: emailPref.preferenceStatus,
                    skippedReason: emailPref.reason,
                    relatedEntityId: shift.id,
                    relatedEntityType: 'shift'
                });
            }
        } catch (error: any) {
            console.error(`❌ [Timesheet Reminder] Email failed:`, error);
            results.email = { success: false, error: error.message };
            
            await logNotificationFailed(supabase, {
                recipientEmail: staffMember.email,
                recipientType: 'staff',
                staffId: staffMember.id,
                agencyId: shift.agency_id,
                notificationType: 'shift_complete',
                channel: 'email',
                errorMessage: error.message,
                relatedEntityId: shift.id,
                relatedEntityType: 'shift'
            });

            // Schedule retry
            await scheduleRetry(supabase, {
                notificationType: 'shift_complete',
                channel: 'email',
                recipientEmail: staffMember.email,
                recipientId: staffMember.id,
                agencyId: shift.agency_id,
                subject: emailSubject,
                content: emailBody,
                relatedEntityId: shift.id,
                relatedEntityType: 'shift',
                errorMessage: error.message
            });
        }
    }

    // Mark shift as reminder sent
    await supabase
        .from("shifts")
        .update({
            timesheet_reminder_sent: true,
            timesheet_reminder_sent_at: new Date().toISOString()
        })
        .eq("id", shift.id);

    console.log(`✅ [Reminder] Sent to ${staffMember.first_name}: WhatsApp=${results.whatsapp.success}, Email=${results.email.success}`);

    return results;
}
