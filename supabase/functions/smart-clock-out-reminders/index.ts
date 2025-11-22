import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 📲 SMART CLOCK-OUT REMINDER SYSTEM (Phase 2)
 *
 * Sends automated reminders during 2-hour grace period
 * Multi-stage escalation to ensure staff don't forget to clock out
 *
 * REMINDER STAGES:
 * 1. 15 minutes after shift end - Friendly reminder
 * 2. 1 hour after shift end - Standard reminder
 * 3. 1h 45m after shift end - URGENT final warning (15 mins before closure)
 *
 * CHANNELS: SMS + WhatsApp + Email (multi-channel for reliability)
 * RUNS: Every 5 minutes via cron
 * SKIPS: If staff already clocked out (checks GPS data)
 */

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log('📲 [Smart Reminders] Starting reminder scan...');

        const now = new Date();
        const results = {
            reminders_15min: 0,
            reminders_1hour: 0,
            reminders_urgent: 0,
            skipped_already_clocked_out: 0,
            errors: []
        };

        // Get today's shifts that are in_progress
        const today = now.toISOString().split('T')[0];
        const { data: activeShifts, error: shiftsError } = await supabase
            .from("shifts")
            .select("*")
            .eq('date', today)
            .eq('status', 'in_progress');

        if (shiftsError) {
            throw shiftsError;
        }

        console.log(`📲 [Smart Reminders] Found ${activeShifts?.length || 0} active shifts`);

        for (const shift of activeShifts) {
            try {
                // Calculate shift end time
                const shiftDate = new Date(shift.date);
                let endDateTime = new Date(`${shift.date}T${shift.end_time}`);

                // Handle overnight shifts
                if (shift.end_time < shift.start_time) {
                    endDateTime.setDate(endDateTime.getDate() + 1);
                }

                // Skip if shift hasn't ended yet
                if (now < endDateTime) {
                    continue;
                }

                // Calculate minutes since shift ended
                const minutesSinceEnd = Math.floor((now.getTime() - endDateTime.getTime()) / (1000 * 60));

                // ✅ CRITICAL CHECK: Only send reminders to staff who CLOCKED IN via GPS
                // (Don't send GPS reminders to staff using paper timesheets)
                const { data: timesheet } = await supabase
                    .from('timesheets')
                    .select('id, clock_in_time, clock_out_time, clock_in_location')
                    .eq('shift_id', shift.id)
                    .not('clock_in_time', 'is', null)
                    .single();

                // Skip if no timesheet or no GPS clock-in data
                if (!timesheet || !timesheet.clock_in_location || !timesheet.clock_in_time) {
                    console.log(`⏭️ [Smart Reminders] Shift ${shift.id.substring(0, 8)} - No GPS clock-in, skipping (staff may be using paper timesheet)`);
                    results.skipped_no_gps_clock_in = (results.skipped_no_gps_clock_in || 0) + 1;
                    continue;
                }

                // Skip if already clocked out
                if (timesheet.clock_out_time) {
                    console.log(`✅ [Smart Reminders] Shift ${shift.id.substring(0, 8)} - Staff already clocked out, skipping`);
                    results.skipped_already_clocked_out++;
                    continue;
                }

                // Get staff details
                const { data: staff } = await supabase
                    .from('staff')
                    .select('*')
                    .eq('id', shift.assigned_staff_id)
                    .single();

                if (!staff) {
                    console.log(`⚠️ [Smart Reminders] No staff found for shift ${shift.id}`);
                    continue;
                }

                // Get client details for better messaging
                const { data: client } = await supabase
                    .from('clients')
                    .select('name')
                    .eq('id', shift.client_id)
                    .single();

                const clientName = client?.name || 'the facility';

                // STAGE 1: 15-minute reminder (send once between 15-20 mins)
                if (minutesSinceEnd >= 15 && minutesSinceEnd < 20 && !shift.reminder_15min_sent) {
                    console.log(`📲 [Smart Reminders] Sending 15-min reminder for shift ${shift.id.substring(0, 8)}`);

                    await sendReminder(supabase, staff, shift, clientName, '15min', {
                        urgency: 'low',
                        message: `Hi ${staff.first_name}, your shift at ${clientName} ended 15 minutes ago. Don't forget to clock out via the app to capture your GPS location! 📍`,
                        subject: '⏰ Reminder: Clock Out Now'
                    });

                    await supabase
                        .from('shifts')
                        .update({ reminder_15min_sent: true })
                        .eq('id', shift.id);

                    results.reminders_15min++;
                }

                // STAGE 2: 1-hour reminder (send once between 60-65 mins)
                if (minutesSinceEnd >= 60 && minutesSinceEnd < 65 && !shift.reminder_1hour_sent) {
                    console.log(`📲 [Smart Reminders] Sending 1-hour reminder for shift ${shift.id.substring(0, 8)}`);

                    await sendReminder(supabase, staff, shift, clientName, '1hour', {
                        urgency: 'medium',
                        message: `⏰ REMINDER: ${staff.first_name}, your shift ended 1 hour ago. Please clock out now via the app. You have 1 hour remaining before the shift requires admin closure. 📍`,
                        subject: '⏰ Important: Please Clock Out Now'
                    });

                    await supabase
                        .from('shifts')
                        .update({ reminder_1hour_sent: true })
                        .eq('id', shift.id);

                    results.reminders_1hour++;
                }

                // STAGE 3: Urgent reminder (send once between 105-110 mins - 15 mins before closure)
                if (minutesSinceEnd >= 105 && minutesSinceEnd < 110 && !shift.reminder_urgent_sent) {
                    console.log(`🚨 [Smart Reminders] Sending URGENT reminder for shift ${shift.id.substring(0, 8)}`);

                    await sendReminder(supabase, staff, shift, clientName, 'urgent', {
                        urgency: 'high',
                        message: `🚨 URGENT: ${staff.first_name}, you have 15 MINUTES to clock out of your shift at ${clientName}! After that, the shift will require admin closure and may delay your timesheet approval. Clock out NOW via the app! 📍`,
                        subject: '🚨 URGENT: Clock Out Within 15 Minutes'
                    });

                    await supabase
                        .from('shifts')
                        .update({ reminder_urgent_sent: true })
                        .eq('id', shift.id);

                    results.reminders_urgent++;
                }

            } catch (shiftError) {
                console.error(`❌ [Smart Reminders] Error processing shift ${shift.id}:`, shiftError);
                results.errors.push({
                    shift_id: shift.id,
                    error: shiftError.message
                });
            }
        }

        console.log('✅ [Smart Reminders] Complete:', results);

        return new Response(
            JSON.stringify({
                success: true,
                timestamp: now.toISOString(),
                results
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [Smart Reminders] Fatal error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});

async function sendReminder(supabase: any, staff: any, shift: any, clientName: string, stage: string, options: any) {
    const { urgency, message, subject } = options;

    // Build rich email template
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: ${urgency === 'high' ? '#ef4444' : urgency === 'medium' ? '#fbbf24' : '#3b82f6'}; color: white; padding: 40px 30px; text-align: center;" bgcolor="${urgency === 'high' ? '#ef4444' : urgency === 'medium' ? '#fbbf24' : '#3b82f6'}">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${subject}</h1>
            </div>

            <div style="background: #fff; padding: 40px 30px;">
                <p style="font-size: 16px; color: #1f2937; margin-bottom: 20px;">Hi ${staff.first_name},</p>

                <div style="background: ${urgency === 'high' ? '#fee2e2' : urgency === 'medium' ? '#fef3c7' : '#dbeafe'}; border-left: 4px solid ${urgency === 'high' ? '#dc2626' : urgency === 'medium' ? '#f59e0b' : '#0284c7'}; padding: 20px; margin: 25px 0;">
                    <p style="margin: 0; color: ${urgency === 'high' ? '#991b1b' : urgency === 'medium' ? '#92400e' : '#1e40af'}; font-weight: bold; font-size: 18px;">
                        ${urgency === 'high' ? '🚨 URGENT ACTION REQUIRED' : urgency === 'medium' ? '⏰ Please Act Soon' : '📍 Friendly Reminder'}
                    </p>
                    <p style="margin: 15px 0 0 0; color: ${urgency === 'high' ? '#7f1d1d' : urgency === 'medium' ? '#78350f' : '#1e3a8a'}; line-height: 1.8;">
                        ${message}
                    </p>
                </div>

                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="margin-top: 0; color: #1f2937;">📋 Shift Details</h3>
                    <p style="margin: 5px 0;"><strong>Client:</strong> ${clientName}</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${shift.date}</p>
                    <p style="margin: 5px 0;"><strong>Scheduled Time:</strong> ${shift.start_time} - ${shift.end_time}</p>
                </div>

                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                    <tr>
                        <td align="center">
                            <table border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="background-color: ${urgency === 'high' ? '#ef4444' : urgency === 'medium' ? '#fbbf24' : '#0369a1'}; border-radius: 8px;" bgcolor="${urgency === 'high' ? '#ef4444' : urgency === 'medium' ? '#fbbf24' : '#0369a1'}">
                                        <a href="${Deno.env.get("VITE_APP_URL") || 'https://agilecaremanagement.netlify.app'}/StaffPortal" style="display: inline-block; padding: 15px 40px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 18px; font-family: Arial, sans-serif;">
                                            📱 Clock Out Now
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                ${urgency === 'high' ? `
                <div style="background: #fef2f2; border: 2px solid #dc2626; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #991b1b; margin-top: 0;">⚠️ What Happens If You Don't Clock Out?</h3>
                    <ul style="color: #7f1d1d; line-height: 1.8;">
                        <li>Your shift will move to "Awaiting Admin Closure"</li>
                        <li>Admin will need to manually verify your timesheet</li>
                        <li>This may delay your timesheet approval and payment</li>
                        <li>GPS verification data will be lost</li>
                    </ul>
                </div>
                ` : ''}

                <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <strong>Why clock out via GPS?</strong><br>
                    It verifies your location and automatically approves your timesheet, ensuring faster payment processing.
                </p>
            </div>
        </div>
    `;

    // Send via all channels in parallel for maximum delivery rate
    const promises = [];

    // Email (always send)
    promises.push(
        supabase.functions.invoke('send-email', {
            body: {
                to: staff.email,
                subject: subject,
                html: emailHtml
            }
        })
    );

    // SMS (if phone number exists)
    if (staff.phone) {
        promises.push(
            supabase.functions.invoke('send-sms', {
                body: {
                    to: staff.phone,
                    message: message
                }
            })
        );
    }

    // WhatsApp (if phone number exists and WhatsApp enabled)
    if (staff.phone) {
        promises.push(
            supabase.functions.invoke('send-whatsapp', {
                body: {
                    to: staff.phone,
                    message: message
                }
            })
        );
    }

    const results = await Promise.allSettled(promises);

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📲 [Reminder ${stage}] Sent to ${staff.first_name}: ${successful} successful, ${failed} failed`);

    return { successful, failed };
}
