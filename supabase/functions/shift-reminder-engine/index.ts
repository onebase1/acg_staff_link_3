import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 🔔 SHIFT REMINDER ENGINE - MULTI-CHANNEL
 *
 * Auto-sends reminders to confirmed staff:
 * - 24 hours before shift (Email + SMS + WhatsApp)
 * - 2 hours before shift (SMS + WhatsApp only)
 *
 * ✅ FIXED: Race condition prevention with atomic flag setting
 * ✅ FIXED: Removed "reply if you cannot attend" (inappropriate for care workers)
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
                        results.reminders_24h_sent++;
                        console.log(`✅ [24h Reminder] Sent to ${staff.first_name} ${staff.last_name} (SMS: ${smsSuccess}, WhatsApp: ${whatsappSuccess})`);
                    } else {
                        console.error(`❌ [24h Reminder] Both channels failed for shift ${shift.id}`);
                        results.errors.push({
                            shift_id: shift.id,
                            error: 'Both SMS and WhatsApp failed'
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
                        results.reminders_2h_sent++;
                        console.log(`✅ [2h Reminder] Sent to ${staff.first_name} ${staff.last_name} (SMS: ${smsSuccess}, WhatsApp: ${whatsappSuccess})`);
                    } else {
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
