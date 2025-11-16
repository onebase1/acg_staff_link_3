import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
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
                    headers: { "Content-Type": "application/json" }
                });
            }

            const result = await sendTimesheetReminder(supabase, shifts[0]);
            return new Response(JSON.stringify({ success: true, result }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // Otherwise, find all shifts that ended recently without timesheet
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        console.log('📋 [Post-Shift Reminder] Finding shifts that ended in the last hour...');

        const { data: allShifts, error: shiftsError } = await supabase
            .from("shifts")
            .select("*")
            .in("status", ['awaiting_admin_closure', 'in_progress']);

        if (shiftsError) {
            throw shiftsError;
        }

        console.log(`📋 [Post-Shift Reminder] Found ${allShifts.length} potential shifts`);

        const shiftsToRemind = allShifts.filter(shift => {
            // Check if shift has ended
            const shiftDate = new Date(shift.date);
            const [endHour, endMin] = shift.end_time.split(':').map(Number);
            const shiftEnd = new Date(shiftDate);
            shiftEnd.setHours(endHour, endMin, 0, 0);

            // Shift ended between 1 hour ago and now
            const hasEnded = shiftEnd <= now && shiftEnd >= oneHourAgo;

            // Don't send if already sent reminder
            const reminderAlreadySent = shift.timesheet_reminder_sent === true;

            return hasEnded && !reminderAlreadySent;
        });

        console.log(`📋 [Post-Shift Reminder] ${shiftsToRemind.length} shifts need reminders`);

        const results = {
            success: true,
            shifts_processed: shiftsToRemind.length,
            reminders_sent: 0,
            errors: []
        };

        for (const shift of shiftsToRemind) {
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
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('❌ [Post-Shift Reminder] Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
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

    let timesheetId;
    if (existingTimesheets && existingTimesheets.length > 0) {
        timesheetId = existingTimesheets[0].id;
        console.log(`📝 [Reminder] Timesheet exists: ${timesheetId}`);
    } else {
        // Create draft timesheet if doesn't exist
        console.log(`📝 [Reminder] Creating draft timesheet`);
        const { data: newTimesheet, error: createError } = await supabase
            .from("timesheets")
            .insert({
                agency_id: shift.agency_id,
                staff_id: staffMember.id,
                client_id: shift.client_id,
                shift_date: shift.date,
                work_location_within_site: shift.work_location_within_site,
                pay_rate: shift.pay_rate,
                charge_rate: shift.charge_rate,
                total_hours: shift.duration_hours,
                break_duration_minutes: shift.break_duration_minutes || 0,
                staff_pay_amount: shift.duration_hours * shift.pay_rate,
                client_charge_amount: shift.duration_hours * shift.charge_rate,
                status: 'draft'
            })
            .select()
            .single();

        if (createError) throw createError;
        timesheetId = newTimesheet.id;
    }

    // Portal link to Staff Portal (they can navigate to timesheets from there)
    const portalLink = 'https://your-app-url.com/StaffPortal'; // Replace with actual URL

    // 🎯 GPS-OPTIMIZED MESSAGING: Different messages for GPS vs non-GPS staff
    const hasGPSConsent = staffMember.gps_consent === true;
    const hasGPSData = timesheet?.clock_in_time && timesheet?.clock_out_time;
    const isGPSTimesheet = hasGPSConsent && hasGPSData;

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

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${portalLink}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                       color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px;
                       font-weight: 600; display: inline-block;">
                        📱 View Timesheet
                    </a>
                </div>

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

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${portalLink}" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                       color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px;
                       font-weight: 600; display: inline-block;">
                        📱 Upload Timesheet
                    </a>
                </div>

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
        const [whatsappResult, emailResult] = await Promise.allSettled([
            supabase.functions.invoke('send-whatsapp', {
                body: {
                    to: staffMember.phone,
                    message: whatsappMessage
                }
            }),
            supabase.functions.invoke('send-email', {
                body: {
                    to: staffMember.email,
                    subject: emailSubject,
                    html: emailBody
                }
            })
        ]);

        results.whatsapp = whatsappResult.status === 'fulfilled' && whatsappResult.value?.data?.success
            ? { success: true }
            : { success: false, error: whatsappResult.reason?.message };

        results.email = emailResult.status === 'fulfilled' && emailResult.value?.data?.success
            ? { success: true }
            : { success: false, error: emailResult.reason?.message };
    } else {
        // Email only
        try {
            const { data, error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: staffMember.email,
                    subject: emailSubject,
                    html: emailBody
                }
            });
            results.email = error ? { success: false, error: error.message } : { success: true };
        } catch (error) {
            results.email = { success: false, error: error.message };
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
