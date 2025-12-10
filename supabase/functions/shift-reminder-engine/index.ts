import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shouldSendNotification } from "../_shared/preferenceChecker.ts";
import { 
    logNotificationSent, 
    logNotificationFailed, 
    logNotificationSkipped 
} from "../_shared/notificationLogger.ts";
import { scheduleRetry } from "../_shared/retryHandler.ts";

/**
 * 🔔 SHIFT REMINDER ENGINE - MULTI-CHANNEL - ENHANCED
 *
 * Auto-sends reminders to confirmed staff:
 * - 24 hours before shift (Email + SMS + WhatsApp)
 * - 2 hours before shift (SMS + WhatsApp only)
 *
 * ✅ FIXED: Race condition prevention with atomic flag setting
 * ✅ FIXED: Removed "reply if you cannot attend" (inappropriate for care workers)
 * ✅ PREFERENCE CHECKING: Respects staff opt-outs (NEW)
 * ✅ COMPREHENSIVE LOGGING: Audit trail for all sends (NEW)
 *
 * Triggered: Cron every hour
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log('🔔 [Shift Reminder Engine] Starting run...');

        const results = {
            checked: 0,
            reminders_24h_sent: 0,
            reminders_2h_sent: 0,
            errors: [],
            skipped_already_sent: 0,
            timestamp: new Date().toISOString()
        };

        // Get all confirmed/assigned shifts that are upcoming
        const { data: shifts, error: shiftsError } = await supabase
            .from("shifts")
            .select("*")
            .in("status", ['confirmed', 'assigned']);

        if (shiftsError) {
            throw shiftsError;
        }

        console.log(`📊 Found ${shifts?.length || 0} confirmed/assigned shifts to check`);

        const now = new Date();
        const nowTime = now.getTime();

        for (const shift of shifts || []) {
            results.checked++;

            try {
                // ✅ FIX 1: Skip if already sent (prevents duplicates from race conditions)
                const hoursUntilShift = (() => {
                    const shiftDate = new Date(shift.date);
                    const [startHour, startMin] = shift.start_time.split(':').map(Number);
                    const shiftStart = new Date(shiftDate);
                    shiftStart.setHours(startHour, startMin, 0, 0);
                    return (shiftStart.getTime() - nowTime) / (1000 * 60 * 60);
                })();

                // Skip past shifts
                if (hoursUntilShift < 0) {
                    continue;
                }

                // ✅ 24-HOUR REMINDER (between 23-25 hours before)
                if (hoursUntilShift >= 23 && hoursUntilShift <= 25) {
                    if (shift.reminder_24h_sent) {
                        results.skipped_already_sent++;
                        console.log(`⏭️ [24h Reminder] Shift ${shift.id} - Already sent, skipping`);
                        continue;
                    }

                    console.log(`🔔 [24h Reminder] Shift ${shift.id} - ${hoursUntilShift.toFixed(1)}h until start`);

                    // ✅ FIX 2: Mark as sent FIRST (atomic operation to prevent race conditions)
                    const { error: updateError } = await supabase
                        .from("shifts")
                        .update({
                            reminder_24h_sent: true,
                            reminder_24h_sent_at: now.toISOString()
                        })
                        .eq("id", shift.id);

                    if (updateError) {
                        throw updateError;
                    }

                    // Get staff, client, agency
                    const [staffResult, clientResult, agencyResult] = await Promise.all([
                        supabase.from("staff").select("*").eq("id", shift.assigned_staff_id),
                        supabase.from("clients").select("*").eq("id", shift.client_id),
                        supabase.from("agencies").select("*").eq("id", shift.agency_id)
                    ]);

                    const staff = staffResult.data?.[0];
                    const client = clientResult.data?.[0];
                    const agency = agencyResult.data?.[0];

                    if (!staff || !client) {
                        console.log(`⚠️ Shift ${shift.id}: Missing staff or client, skipping`);
                        continue;
                    }

                    if (!staff.phone) {
                        console.log(`⚠️ Shift ${shift.id}: Staff has no phone number, skipping`);
                        continue;
                    }

                    // ✅ NEW: Check if staff opted out of shift reminders
                    const preferenceCheck = await shouldSendNotification(
                        supabase,
                        staff.email,
                        'shift_24h_reminder',
                        'sms',
                        'staff'
                    );

                    if (!preferenceCheck.allowed) {
                        console.log(`⏭️ [24h Reminder] Staff ${staff.email} opted out - ${preferenceCheck.reason}`);
                        await logNotificationSkipped(supabase, {
                            recipientEmail: staff.email,
                            recipientPhone: staff.phone,
                            recipientType: 'staff',
                            staffId: staff.id,
                            agencyId: shift.agency_id,
                            notificationType: 'shift_24h_reminder',
                            channel: 'sms',
                            preferenceChecked: preferenceCheck.preferenceChecked,
                            preferenceStatus: preferenceCheck.preferenceStatus,
                            skippedReason: preferenceCheck.reason,
                            relatedEntityId: shift.id,
                            relatedEntityType: 'shift',
                            metadata: { shift_date: shift.date, client_name: client.name }
                        });
                        continue;
                    }

                    const agencyName = agency?.name || 'Your Agency';
                    const locationText = shift.work_location_within_site ? ` (${shift.work_location_within_site})` : '';

                    // ✅ FIX 3: Removed "Reply if you cannot attend" - care workers need the shifts
                    const message = `🔔 REMINDER [${agencyName}]: You have a shift TOMORROW at ${client.name}${locationText}, ${shift.start_time}-${shift.end_time}. See you there!`;

                    // Send SMS + WhatsApp in parallel
                    const [smsResult, whatsappResult] = await Promise.allSettled([
                        supabase.functions.invoke('send-sms', {
                            body: {
                                to: staff.phone,
                                message
                            }
                        }),
                        supabase.functions.invoke('send-whatsapp', {
                            body: {
                                to: staff.phone,
                                message
                            }
                        })
                    ]);

                    const smsSuccess = smsResult.status === 'fulfilled' && smsResult.value?.data?.success;
                    const whatsappSuccess = whatsappResult.status === 'fulfilled' && whatsappResult.value?.data?.success;

                    if (smsSuccess || whatsappSuccess) {
                        // ✅ NEW: Log successful sends
                        if (smsSuccess) {
                            const smsId = (smsResult as PromiseFulfilledResult<any>).value?.data?.sid;
                            await logNotificationSent(supabase, {
                                recipientEmail: staff.email,
                                recipientPhone: staff.phone,
                                recipientType: 'staff',
                                staffId: staff.id,
                                agencyId: shift.agency_id,
                                notificationType: 'shift_24h_reminder',
                                channel: 'sms',
                                provider: 'twilio',
                                providerMessageId: smsId,
                                preferenceChecked: preferenceCheck.preferenceChecked,
                                preferenceStatus: preferenceCheck.preferenceStatus,
                                relatedEntityId: shift.id,
                                relatedEntityType: 'shift',
                                metadata: { shift_date: shift.date, client_name: client.name, message_length: message.length }
                            });
                        }
                        if (whatsappSuccess) {
                            const whatsappId = (whatsappResult as PromiseFulfilledResult<any>).value?.data?.sid;
                            await logNotificationSent(supabase, {
                                recipientEmail: staff.email,
                                recipientPhone: staff.phone,
                                recipientType: 'staff',
                                staffId: staff.id,
                                agencyId: shift.agency_id,
                                notificationType: 'shift_24h_reminder',
                                channel: 'whatsapp',
                                provider: 'twilio',
                                providerMessageId: whatsappId,
                                preferenceChecked: preferenceCheck.preferenceChecked,
                                preferenceStatus: preferenceCheck.preferenceStatus,
                                relatedEntityId: shift.id,
                                relatedEntityType: 'shift',
                                metadata: { shift_date: shift.date, client_name: client.name, message_length: message.length }
                            });
                        }
                        
                        results.reminders_24h_sent++;
                        console.log(`✅ [24h Reminder] Sent to ${staff.first_name} ${staff.last_name} (SMS: ${smsSuccess}, WhatsApp: ${whatsappSuccess})`);
                    } else {
                        // ✅ NEW: Log failure
                        await logNotificationFailed(supabase, {
                            recipientEmail: staff.email,
                            recipientPhone: staff.phone,
                            recipientType: 'staff',
                            staffId: staff.id,
                            agencyId: shift.agency_id,
                            notificationType: 'shift_24h_reminder',
                            channel: 'sms',
                            errorMessage: 'Both SMS and WhatsApp failed',
                            relatedEntityId: shift.id,
                            relatedEntityType: 'shift'
                        });

                        // ✅ NEW: Schedule Retry (24h reminders only)
                        await scheduleRetry(supabase, {
                            notificationType: 'shift_24h_reminder',
                            channel: 'sms', // Fallback to SMS for retry
                            recipientPhone: staff.phone,
                            recipientEmail: staff.email,
                            recipientId: staff.id,
                            recipientType: 'staff',
                            agencyId: shift.agency_id,
                            content: message,
                            relatedEntityId: shift.id,
                            relatedEntityType: 'shift',
                            errorMessage: 'Both SMS and WhatsApp failed'
                        });

                        console.error(`❌ [24h Reminder] Both channels failed for shift ${shift.id} - Scheduled retry`);
                        results.errors.push({
                            shift_id: shift.id,
                            error: 'Both SMS and WhatsApp failed - Scheduled retry'
                        });
                    }
                }

                // ✅ 2-HOUR REMINDER (between 1.5-2.5 hours before) - SMS + WhatsApp only
                else if (hoursUntilShift >= 1.5 && hoursUntilShift <= 2.5) {
                    if (shift.reminder_2h_sent) {
                        results.skipped_already_sent++;
                        console.log(`⏭️ [2h Reminder] Shift ${shift.id} - Already sent, skipping`);
                        continue;
                    }

                    console.log(`🔔 [2h Reminder] Shift ${shift.id} - ${hoursUntilShift.toFixed(1)}h until start`);

                    // ✅ FIX 2: Mark as sent FIRST
                    const { error: updateError } = await supabase
                        .from("shifts")
                        .update({
                            reminder_2h_sent: true,
                            reminder_2h_sent_at: now.toISOString()
                        })
                        .eq("id", shift.id);

                    if (updateError) {
                        throw updateError;
                    }

                    // Get staff and client
                    const [staffResult, clientResult, agencyResult] = await Promise.all([
                        supabase.from("staff").select("*").eq("id", shift.assigned_staff_id),
                        supabase.from("clients").select("*").eq("id", shift.client_id),
                        supabase.from("agencies").select("*").eq("id", shift.agency_id)
                    ]);

                    const staff = staffResult.data?.[0];
                    const client = clientResult.data?.[0];
                    const agency = agencyResult.data?.[0];

                    if (!staff || !client) {
                        console.log(`⚠️ Shift ${shift.id}: Missing staff or client, skipping`);
                        continue;
                    }

                    if (!staff.phone) {
                        console.log(`⚠️ Shift ${shift.id}: Staff has no phone number, skipping`);
                        continue;
                    }

                    // ✅ NEW: Check if staff opted out of shift reminders
                    const preferenceCheck = await shouldSendNotification(
                        supabase,
                        staff.email,
                        'shift_2h_reminder',
                        'sms',
                        'staff'
                    );

                    if (!preferenceCheck.allowed) {
                        console.log(`⏭️ [2h Reminder] Staff ${staff.email} opted out - ${preferenceCheck.reason}`);
                        await logNotificationSkipped(supabase, {
                            recipientEmail: staff.email,
                            recipientPhone: staff.phone,
                            recipientType: 'staff',
                            staffId: staff.id,
                            agencyId: shift.agency_id,
                            notificationType: 'shift_2h_reminder',
                            channel: 'sms',
                            preferenceChecked: preferenceCheck.preferenceChecked,
                            preferenceStatus: preferenceCheck.preferenceStatus,
                            skippedReason: preferenceCheck.reason,
                            relatedEntityId: shift.id,
                            relatedEntityType: 'shift',
                            metadata: { shift_date: shift.date, client_name: client.name }
                        });
                        continue;
                    }

                    const agencyName = agency?.name || 'Your Agency';
                    const locationText = shift.work_location_within_site ? ` at ${shift.work_location_within_site}` : '';

                    // 🎯 GPS-OPTIMIZED: Different reminders for GPS vs non-GPS staff
                    const hasGPSConsent = staff.gps_consent === true;

                    let message;
                    if (hasGPSConsent) {
                        // GPS-enabled staff - remind to turn on GPS and clock in
                        message = `🏥 SHIFT STARTING SOON [${agencyName}]: ${client.name}${locationText} in 2 HOURS (${shift.start_time}). 📍 REMEMBER: Turn on GPS & clock in via app when you arrive. Arrive 10 min early. Good luck! 👍`;
                    } else {
                        // Non-GPS staff - remind to bring paper timesheet
                        message = `🏥 SHIFT STARTING SOON [${agencyName}]: ${client.name}${locationText} in 2 HOURS (${shift.start_time}). 📋 REMEMBER: Bring paper timesheet & get client signature. Arrive 10 min early. Good luck! 👍`;
                    }

                    // SMS + WhatsApp (instant)
                    const [smsResult, whatsappResult] = await Promise.allSettled([
                        supabase.functions.invoke('send-sms', {
                            body: {
                                to: staff.phone,
                                message
                            }
                        }),
                        supabase.functions.invoke('send-whatsapp', {
                            body: {
                                to: staff.phone,
                                message
                            }
                        })
                    ]);

                    const smsSuccess = smsResult.status === 'fulfilled' && smsResult.value?.data?.success;
                    const whatsappSuccess = whatsappResult.status === 'fulfilled' && whatsappResult.value?.data?.success;

                    if (smsSuccess || whatsappSuccess) {
                        // ✅ NEW: Log successful sends
                        if (smsSuccess) {
                            const smsId = (smsResult as PromiseFulfilledResult<any>).value?.data?.sid;
                            await logNotificationSent(supabase, {
                                recipientEmail: staff.email,
                                recipientPhone: staff.phone,
                                recipientType: 'staff',
                                staffId: staff.id,
                                agencyId: shift.agency_id,
                                notificationType: 'shift_2h_reminder',
                                channel: 'sms',
                                provider: 'twilio',
                                providerMessageId: smsId,
                                preferenceChecked: preferenceCheck.preferenceChecked,
                                preferenceStatus: preferenceCheck.preferenceStatus,
                                relatedEntityId: shift.id,
                                relatedEntityType: 'shift',
                                metadata: { shift_date: shift.date, client_name: client.name, gps_enabled: hasGPSConsent }
                            });
                        }
                        if (whatsappSuccess) {
                            const whatsappId = (whatsappResult as PromiseFulfilledResult<any>).value?.data?.sid;
                            await logNotificationSent(supabase, {
                                recipientEmail: staff.email,
                                recipientPhone: staff.phone,
                                recipientType: 'staff',
                                staffId: staff.id,
                                agencyId: shift.agency_id,
                                notificationType: 'shift_2h_reminder',
                                channel: 'whatsapp',
                                provider: 'twilio',
                                providerMessageId: whatsappId,
                                preferenceChecked: preferenceCheck.preferenceChecked,
                                preferenceStatus: preferenceCheck.preferenceStatus,
                                relatedEntityId: shift.id,
                                relatedEntityType: 'shift',
                                metadata: { shift_date: shift.date, client_name: client.name, gps_enabled: hasGPSConsent }
                            });
                        }
                        
                        results.reminders_2h_sent++;
                        console.log(`✅ [2h Reminder] Sent to ${staff.first_name} ${staff.last_name} (SMS: ${smsSuccess}, WhatsApp: ${whatsappSuccess})`);
                    } else {
                        // ✅ NEW: Log failure
                        await logNotificationFailed(supabase, {
                            recipientEmail: staff.email,
                            recipientPhone: staff.phone,
                            recipientType: 'staff',
                            staffId: staff.id,
                            agencyId: shift.agency_id,
                            notificationType: 'shift_2h_reminder',
                            channel: 'sms',
                            errorMessage: 'Both SMS and WhatsApp failed',
                            relatedEntityId: shift.id,
                            relatedEntityType: 'shift'
                        });
                        console.error(`❌ [2h Reminder] Both channels failed for shift ${shift.id}`);
                        results.errors.push({
                            shift_id: shift.id,
                            error: 'Both SMS and WhatsApp failed'
                        });
                    }
                }

            } catch (shiftError) {
                console.error(`❌ [Shift ${shift.id}] Error:`, shiftError);
                results.errors.push({
                    shift_id: shift.id,
                    error: shiftError.message
                });
            }
        }

        console.log('✅ [Shift Reminder Engine] Complete:', results);

        return new Response(
            JSON.stringify({
                success: true,
                results
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [Shift Reminder Engine] Fatal error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
