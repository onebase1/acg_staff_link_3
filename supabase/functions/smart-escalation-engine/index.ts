import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * TIER 2B-5: Smart Escalation Notifications
 *
 * Progressive escalation for urgent shifts that remain unfilled:
 * 1. Broadcast via WhatsApp to all available staff
 * 2. Wait X minutes (configurable: 5-60 mins)
 * 3. If still unfilled → Call coordinator (future: use Twilio voice)
 * 4. Create admin workflow for manual intervention
 *
 * Triggered: Manually OR via scheduled check (every 5 mins)
 * Settings:
 * - automation_settings.smart_escalation_enabled
 * - automation_settings.escalation_tolerance_minutes (default: 15)
 *
 * ROLLBACK: Disable via settings or set tolerance to 999
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log('🚨 [Smart Escalation] Starting run...');

        const { data: agencies, error: agenciesError } = await supabase
            .from("agencies")
            .select("*");

        if (agenciesError) {
            throw agenciesError;
        }

        const results = {
            shifts_checked: 0,
            escalations_triggered: 0,
            broadcasts_sent: 0,
            workflows_created: 0,
            errors: [],
        };

        const now = new Date();

        for (const agency of agencies) {
            const settings = agency.settings?.automation_settings || {};

            // Check if feature enabled
            if (!settings.smart_escalation_enabled) {
                console.log(`⏭️  [Agency: ${agency.name}] Smart escalation disabled`);
                continue;
            }

            const toleranceMinutes = settings.escalation_tolerance_minutes || 15;

            console.log(`🏥 [Agency: ${agency.name}] Checking urgent shifts (tolerance: ${toleranceMinutes} mins)`);

            // Get all urgent/critical open shifts
            const { data: urgentShifts, error: shiftsError } = await supabase
                .from("shifts")
                .select("*")
                .eq("agency_id", agency.id)
                .eq("status", "open")
                .in("urgency", ['urgent', 'critical']);

            if (shiftsError) {
                throw shiftsError;
            }

            for (const shift of urgentShifts || []) {
                results.shifts_checked++;

                try {
                    const createdAt = new Date(shift.created_date);
                    const minutesSinceCreation = (now - createdAt) / (1000 * 60);

                    // STAGE 1: Initial broadcast (if not sent yet)
                    if (!shift.broadcast_sent_at) {
                        console.log(`📢 [Shift ${shift.id}] Sending initial broadcast...`);

                        // Get all available staff with matching role
                        const { data: availableStaff, error: staffError } = await supabase
                            .from("staff")
                            .select("*")
                            .eq("agency_id", agency.id)
                            .eq("status", "active")
                            .eq("role", shift.role_required);

                        if (staffError) {
                            throw staffError;
                        }

                        if (availableStaff.length > 0) {
                            const staffIds = availableStaff.map(s => s.id);

                            // Send enhanced WhatsApp offers
                            await supabase.functions.invoke('enhanced-whatsapp-offers', {
                                body: {
                                    shift_id: shift.id,
                                    staff_ids: staffIds
                                }
                            });

                            // Mark broadcast as sent
                            const { error: updateError } = await supabase
                                .from("shifts")
                                .update({
                                    broadcast_sent_at: now.toISOString(),
                                    escalation_deadline: new Date(now.getTime() + toleranceMinutes * 60 * 1000).toISOString()
                                })
                                .eq("id", shift.id);

                            if (updateError) {
                                throw updateError;
                            }

                            results.broadcasts_sent++;
                            console.log(`✅ Broadcast sent to ${staffIds.length} staff`);
                        } else {
                            console.log(`⚠️  No available staff for broadcast`);
                        }

                        continue; // Wait for next cycle to check escalation
                    }

                    // STAGE 2: Check if escalation needed
                    if (shift.escalation_deadline) {
                        const escalationDeadline = new Date(shift.escalation_deadline);

                        if (now >= escalationDeadline) {
                            console.log(`🚨 [Shift ${shift.id}] ESCALATION TRIGGERED!`);

                            // Get client info
                            const { data: clients, error: clientError } = await supabase
                                .from("clients")
                                .select("*")
                                .eq("id", shift.client_id);

                            if (clientError) {
                                throw clientError;
                            }

                            const client = clients[0];

                            // ESCALATION ACTION 1: Create Admin Workflow
                            const { data: workflow, error: workflowError } = await supabase
                                .from("admin_workflows")
                                .insert({
                                    agency_id: agency.id,
                                    type: 'unfilled_urgent_shift',
                                    priority: shift.urgency === 'critical' ? 'critical' : 'high',
                                    status: 'pending',
                                    title: `🚨 ESCALATION: ${shift.role_required.replace('_', ' ')} needed at ${client?.name || 'Client'}`,
                                    description: `Shift has been unfilled for ${Math.round(minutesSinceCreation)} minutes despite broadcast to all available staff.\n\nDATE: ${shift.date}\nTIME: ${shift.start_time}-${shift.end_time}\nPAY RATE: £${shift.pay_rate}/hr\n\nIMMEDIATE ACTION REQUIRED: Call coordinator or reach out to external network.`,
                                    related_entity: {
                                        entity_type: 'shift',
                                        entity_id: shift.id
                                    },
                                    deadline: new Date(now.getTime() + 30 * 60 * 1000).toISOString(), // 30 mins to resolve
                                    auto_created: true,
                                    escalation_count: 1
                                })
                                .select()
                                .single();

                            if (workflowError) {
                                throw workflowError;
                            }

                            results.workflows_created++;

                            // ESCALATION ACTION 2: Send urgent notification to admin
                            // (Future: Trigger Twilio voice call to coordinator)
                            const { data: adminUsers, error: usersError } = await supabase
                                .from("users")
                                .select("*")
                                .eq("agency_id", agency.id)
                                .eq("user_type", "agency_admin");

                            if (usersError) {
                                throw usersError;
                            }

                            for (const admin of adminUsers || []) {
                                if (admin.phone) {
                                    try {
                                        await supabase.functions.invoke('send-sms', {
                                            body: {
                                                to: admin.phone,
                                                message: `🚨 URGENT: ${shift.role_required.replace('_', ' ')} shift still unfilled after ${toleranceMinutes} mins!\n\n${client?.name}\n${shift.date} ${shift.start_time}-${shift.end_time}\n\nCheck admin workflows now: ${shift.id.slice(-8)}`
                                            }
                                        });
                                    } catch (smsError) {
                                        console.error(`Failed to send SMS to admin: ${smsError.message}`);
                                    }
                                }
                            }

                            // Mark shift as escalated
                            const { error: updateError } = await supabase
                                .from("shifts")
                                .update({
                                    status: 'unfilled_escalated'
                                })
                                .eq("id", shift.id);

                            if (updateError) {
                                throw updateError;
                            }

                            results.escalations_triggered++;
                            console.log(`🚨 [ESCALATED] Shift ${shift.id} → Workflow ${workflow.id}`);
                        } else {
                            const minutesRemaining = Math.round((escalationDeadline - now) / (1000 * 60));
                            console.log(`⏳ [Shift ${shift.id}] ${minutesRemaining} mins until escalation`);
                        }
                    }

                } catch (shiftError) {
                    console.error(`❌ [Shift ${shift.id}] Error:`, shiftError.message);
                    results.errors.push({
                        shift_id: shift.id,
                        error: shiftError.message
                    });
                }
            }
        }

        console.log('✅ [Smart Escalation] Complete:', results);

        return new Response(
            JSON.stringify({
                success: true,
                timestamp: new Date().toISOString(),
                results: results
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [Smart Escalation] Fatal error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
