import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shouldSendNotification } from "../_shared/preferenceChecker.ts";
import {
    logNotificationSent,
    logNotificationFailed,
    logNotificationSkipped
} from "../_shared/notificationLogger.ts";
import { scheduleRetry } from "../_shared/retryHandler.ts";
import { shiftRequiresGPS, logGPSDecision } from "../_shared/gpsHelper.ts";

/**
 * OPTION A: No-Show Detection Engine
 *
 * Automatically detects when staff don't show up for shifts
 * Creates escalation workflows and triggers replacement staff broadcasts
 *
 * Runs every 5 minutes via cron job or manual invocation
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log('🔍 [No-Show Detection] Starting scan...');

        // Get all confirmed shifts that should have started by now
        const { data: allShifts, error: shiftsError } = await supabase
            .from("shifts")
            .select("*");

        if (shiftsError) {
            throw shiftsError;
        }

        const now = new Date();
        const currentTime = now.toTimeString().substring(0, 5); // HH:MM
        const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

        const potentialNoShows = allShifts.filter(shift => {
            // Only check shifts that are confirmed/assigned and should have started
            if (!['confirmed', 'assigned'].includes(shift.status)) return false;

            // Check if shift date is today or in the past
            if (shift.date > currentDate) return false;

            // If shift is today, check if start time + 15 mins has passed
            if (shift.date === currentDate) {
                const [startHour, startMin] = shift.start_time.split(':').map(Number);
                const shiftStartMins = startHour * 60 + startMin;
                const [nowHour, nowMin] = currentTime.split(':').map(Number);
                const nowMins = nowHour * 60 + nowMin;

                // Give 15 minute grace period
                return nowMins > (shiftStartMins + 15);
            }

            // If shift date is in the past, definitely should have started
            return true;
        });

        console.log(`📊 Found ${potentialNoShows.length} shifts to check for no-shows`);

        const results: {
            checked: number;
            noShows: { shift_id: string; staff_name: string; client_name: string | undefined; workflow_id: string; action: string }[];
            reminded: { shift_id: string; staff_name: string; action: string }[];
            errors: { shift_id: string; error: string }[];
        } = {
            checked: potentialNoShows.length,
            noShows: [],
            reminded: [],
            errors: []
        };

        for (const shift of potentialNoShows) {
            try {
                // Check if staff clocked in
                const { data: timesheets, error: timesheetsError } = await supabase
                    .from("timesheets")
                    .select("*")
                    .eq("booking_id", shift.id);

                if (timesheetsError) {
                    throw timesheetsError;
                }

                const hasClockIn = timesheets.some(t => t.clock_in_time);

                if (!hasClockIn) {
                    console.log(`❌ NO-SHOW DETECTED: Shift ${shift.id} - Staff ${shift.assigned_staff_id}`);

                    // Get staff and client details
                    const [staffResult, clientResult] = await Promise.all([
                        shift.assigned_staff_id
                            ? supabase.from("staff").select("*").eq("id", shift.assigned_staff_id)
                            : Promise.resolve({ data: [] }),
                        supabase.from("clients").select("*").eq("id", shift.client_id)
                    ]);

                    const staffMember = staffResult.data?.[0];
                    const clientData = clientResult.data?.[0];

                    // 🆕 Check if this shift requires GPS clock-in
                    const requiresGPS = shiftRequiresGPS(shift, clientData);
                    logGPSDecision(shift.id, shift.requires_gps, clientData?.geofence_enabled, requiresGPS);

                    if (!requiresGPS) {
                        console.log(`⏭️ [No-Show] Skipping shift ${shift.id} - GPS clock-in not required for this client`);
                        continue; // Skip no-show detection for non-GPS shifts
                    }

                    // Check if we've already sent a reminder
                    const { data: workflows, error: workflowsError } = await supabase
                        .from("admin_workflows")
                        .select("*")
                        .eq("related_entity->>entity_id", shift.id)
                        .eq("type", "staff_no_show");

                    if (workflowsError) {
                        throw workflowsError;
                    }

                    // Check if we already sent a no-show reminder (using shift flag)
                    const alreadySentReminder = shift.no_show_reminder_sent === true;

                    if (workflows.length === 0) {
                        // First detection - send reminder to staff (only if not already sent)
                        if (alreadySentReminder) {
                            console.log(`⏭️ [No-Show] Skipping reminder for shift ${shift.id} - already sent previously`);
                        } else if (staffMember?.phone) {
                            try {
                                const preferenceCheck = await shouldSendNotification(
                                    supabase,
                                    staffMember.email, // Use email for preference lookup
                                    'system_update', // Using system_update as per plan
                                    'sms',
                                    'staff'
                                );

                                if (!preferenceCheck.allowed) {
                                    console.log(`⏭️ [No-Show] Skipped SMS for ${staffMember.email} - ${preferenceCheck.reason}`);
                                    await logNotificationSkipped(supabase, {
                                        recipientEmail: staffMember.email,
                                        recipientType: 'staff',
                                        staffId: staffMember.id,
                                        agencyId: shift.agency_id,
                                        notificationType: 'system_update',
                                        channel: 'sms',
                                        preferenceChecked: preferenceCheck.preferenceChecked,
                                        preferenceStatus: preferenceCheck.preferenceStatus,
                                        skippedReason: preferenceCheck.reason || 'notification_disabled',
                                        metadata: { shift_id: shift.id, action: 'no_show_reminder' }
                                    });
                                } else {
                                    const { error: smsError } = await supabase.functions.invoke('send-sms', {
                                        body: {
                                            to: staffMember.phone,
                                            message: `⚠️ URGENT: Did you forget to clock in for your shift at ${clientData?.name}? Please clock in now or contact the office immediately. Reply HELP if you need assistance.`
                                        }
                                    });

                                    if (smsError) throw smsError;

                                    await logNotificationSent(supabase, {
                                        recipientEmail: staffMember.email,
                                        recipientType: 'staff',
                                        staffId: staffMember.id,
                                        agencyId: shift.agency_id,
                                        notificationType: 'system_update',
                                        channel: 'sms',
                                        provider: 'twilio',
                                        preferenceChecked: preferenceCheck.preferenceChecked,
                                        preferenceStatus: preferenceCheck.preferenceStatus,
                                        metadata: { shift_id: shift.id, action: 'no_show_reminder' }
                                    });

                                    // ✅ Mark shift as reminded to prevent duplicates
                                    await supabase
                                        .from('shifts')
                                        .update({ no_show_reminder_sent: true })
                                        .eq('id', shift.id);

                                    results.reminded.push({
                                        shift_id: shift.id,
                                        staff_name: `${staffMember.first_name} ${staffMember.last_name}`,
                                        action: 'reminder_sent'
                                    });

                                    console.log(`📱 Reminder sent to ${staffMember.first_name} ${staffMember.last_name}`);
                                }
                            } catch (smsError) {
                                const errorMsg = smsError instanceof Error ? smsError.message : 'Unknown error';
                                console.error('SMS send failed:', errorMsg);
                                await logNotificationFailed(supabase, {
                                    recipientEmail: staffMember.email,
                                    recipientType: 'staff',
                                    staffId: staffMember.id,
                                    agencyId: shift.agency_id,
                                    notificationType: 'system_update',
                                    channel: 'sms',
                                    errorMessage: errorMsg,
                                    errorCode: 'send_failed'
                                });
                                // Retry logic for SMS? Maybe not for immediate no-show, but let's add it for consistency
                                await scheduleRetry(supabase, {
                                    notificationType: 'system_update',
                                    recipientEmail: staffMember.email,
                                    recipientId: staffMember.id,
                                    agencyId: shift.agency_id,
                                    channel: 'sms',
                                    metadata: { shift_id: shift.id, action: 'no_show_reminder' }
                                });
                            }
                        }

                        // Wait 30 minutes before escalating (check if we're 30+ mins past start)
                        const [startHour, startMin] = shift.start_time.split(':').map(Number);
                        const shiftStartMins = startHour * 60 + startMin;
                        const [nowHour, nowMin] = currentTime.split(':').map(Number);
                        const nowMins = nowHour * 60 + nowMin;
                        const minsPassed = nowMins - shiftStartMins;

                        if (minsPassed >= 30 || shift.date < currentDate) {
                            // Escalate to admin workflow
                            const { data: workflow, error: workflowError } = await supabase
                                .from("admin_workflows")
                                .insert({
                                    agency_id: shift.agency_id,
                                    type: 'staff_no_show',
                                    priority: 'critical',
                                    status: 'pending',
                                    title: `CRITICAL: Staff No-Show - ${staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unknown Staff'}`,
                                    description: `Staff member failed to clock in for shift at ${clientData?.name}.\n\n` +
                                        `Shift Details:\n` +
                                        `- Date: ${shift.date}\n` +
                                        `- Time: ${shift.start_time} - ${shift.end_time}\n` +
                                        `- Role: ${shift.role_required}\n` +
                                        `- Staff: ${staffMember ? `${staffMember.first_name} ${staffMember.last_name} (${staffMember.phone})` : 'Not assigned'}\n\n` +
                                        `Actions Required:\n` +
                                        `1. Contact staff member to confirm status\n` +
                                        `2. Contact client to inform them\n` +
                                        `3. Find replacement staff immediately\n` +
                                        `4. Update shift status once resolved`,
                                    related_entity: {
                                        entity_type: 'shift',
                                        entity_id: shift.id
                                    },
                                    auto_created: true,
                                    deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour deadline
                                })
                                .select()
                                .single();

                            if (workflowError) {
                                throw workflowError;
                            }

                            // Update shift status
                            const { error: updateError } = await supabase
                                .from("shifts")
                                .update({
                                    status: 'no_show',
                                    cancellation_reason: 'Staff no-show - failed to clock in',
                                    cancelled_by: 'system',
                                    cancelled_at: new Date().toISOString()
                                })
                                .eq("id", shift.id);

                            if (updateError) {
                                throw updateError;
                            }

                            // TODO: Trigger replacement staff broadcast
                            // This would call the urgentShiftEscalation function
                            try {
                                await supabase.functions.invoke('urgent-shift-escalation', {
                                    body: {
                                        shift_id: shift.id,
                                        reason: 'no_show_replacement'
                                    }
                                });
                            } catch (broadcastError) {
                                console.error('Broadcast failed:', broadcastError);
                            }

                            results.noShows.push({
                                shift_id: shift.id,
                                staff_name: staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unknown',
                                client_name: clientData?.name,
                                workflow_id: workflow.id,
                                action: 'escalated_and_broadcast'
                            });

                            console.log(`🚨 NO-SHOW ESCALATED: Workflow ${workflow.id} created`);
                        }
                    }
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Error processing shift ${shift.id}:`, errorMsg);
                results.errors.push({
                    shift_id: shift.id,
                    error: errorMsg
                });
            }
        }

        console.log(`✅ [No-Show Detection] Complete: ${results.noShows.length} no-shows detected, ${results.reminded.length} reminders sent`);

        return new Response(
            JSON.stringify({
                success: true,
                ...results
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [No-Show Detection] Fatal error:', errorMsg);
        return new Response(
            JSON.stringify({
                success: false,
                error: errorMsg
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
