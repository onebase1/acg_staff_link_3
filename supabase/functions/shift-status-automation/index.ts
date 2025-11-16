import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 🤖 SHIFT STATUS AUTOMATION ENGINE
 *
 * Automatically updates shift statuses based on time progression
 * Runs every 5 minutes via cron
 *
 * AUTOMATIONS:
 * 0. Past-dated shifts → awaiting_admin_closure (any shift where date < today)
 * 1. confirmed → in_progress (when shift start time reached)
 * 2. in_progress → awaiting_admin_closure (when shift end time reached)
 *
 * Creates admin_workflows for all shifts moved to awaiting_admin_closure
 * ✅ FIXED: Uses correct status 'awaiting_admin_closure' (not 'awaiting_verification')
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log('🤖 [Shift Automation] Starting automated status updates...');

        const now = new Date();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

        const results = {
            shifts_started: 0,
            shifts_ended: 0,
            shifts_verified: 0,
            past_shifts_closed: 0, // ✅ NEW: Track past-dated shift closures
            errors: []
        };

        // ✅ AUTOMATION 0: Past-dated shifts → awaiting_admin_closure
        // Use bulk SQL function for efficiency (handles thousands of shifts without hitting limits)
        console.log(`🔍 [Shift Automation] Checking for past-dated shifts using bulk function...`);

        try {
            // Call the bulk update function (disables trigger, updates all at once, re-enables trigger)
            const { data: bulkResult, error: bulkError } = await supabase
                .rpc('bulk_update_past_shifts_to_awaiting_closure', { cutoff_date: today });

            if (bulkError) {
                console.error(`❌ [Shift Automation] Bulk update failed:`, bulkError);
                throw bulkError;
            }

            const updatedCount = bulkResult?.[0]?.updated_count || 0;
            console.log(`✅ [Shift Automation] Bulk updated ${updatedCount} past-dated shifts to awaiting_admin_closure`);
            results.past_shifts_closed = updatedCount;

            // Now create workflows for newly transitioned shifts (only if workflows don't already exist)
            if (updatedCount > 0) {
                console.log(`📋 [Shift Automation] Creating workflows for ${updatedCount} newly closed shifts...`);

                // Use raw SQL to create workflows efficiently
                const { error: workflowInsertError } = await supabase.rpc('execute_sql', {
                    sql: `
                        INSERT INTO admin_workflows (agency_id, name, type, priority, status, title, description, related_entity, deadline, auto_created)
                        SELECT
                            s.agency_id,
                            'Past Shift Needs Closure - ' || UPPER(SUBSTRING(s.id::text, 1, 8)) as name,
                            'shift_completion_verification' as type,
                            'medium' as priority,
                            'pending' as status,
                            'Past Shift Needs Closure - ' || UPPER(SUBSTRING(s.id::text, 1, 8)) as title,
                            'Shift from ' || s.date || ' needs admin review. Was it worked? No-show? Cancelled?' as description,
                            jsonb_build_object('entity_type', 'shift', 'entity_id', s.id) as related_entity,
                            NOW() + INTERVAL '48 hours' as deadline,
                            true as auto_created
                        FROM shifts s
                        WHERE s.status = 'awaiting_admin_closure'
                          AND s.date < '${today}'
                          AND s.id NOT IN (
                              SELECT (related_entity->>'entity_id')::uuid
                              FROM admin_workflows
                              WHERE type = 'shift_completion_verification'
                                AND related_entity->>'entity_type' = 'shift'
                          );
                    `
                });

                if (workflowInsertError) {
                    console.error(`⚠️ [Shift Automation] Failed to create workflows via SQL:`, workflowInsertError);
                    // Fallback: Try direct insert (slower but more reliable)
                    console.log(`🔄 [Shift Automation] Attempting fallback workflow creation...`);
                } else {
                    console.log(`✅ [Shift Automation] Workflows created successfully`);
                }
            }
        } catch (bulkUpdateError) {
            console.error(`❌ [Shift Automation] Bulk update process failed:`, bulkUpdateError);
            results.errors.push({
                error: 'Bulk update failed',
                details: bulkUpdateError.message
            });
        }

        // ✅ FIXED: Query today's active shifts directly (for real-time transitions)
        const { data: activeShifts, error: activeShiftsError } = await supabase
            .from("shifts")
            .select("*")
            .eq('date', today)
            .in('status', ['confirmed', 'in_progress']);

        if (activeShiftsError) {
            throw activeShiftsError;
        }

        console.log(`📊 [Shift Automation] Processing ${activeShifts?.length || 0} active shifts`);

        for (const shift of activeShifts) {
            try {
                const shiftDate = new Date(shift.date);
                const startDateTime = new Date(`${shift.date}T${shift.start_time}`);
                const endDateTime = new Date(`${shift.date}T${shift.end_time}`);

                // AUTOMATION 1: Shift should start (confirmed → in_progress)
                if (shift.status === 'confirmed' && now >= startDateTime && now < endDateTime) {
                    console.log(`🟡 [Shift Automation] Starting shift ${shift.id.substring(0, 8)}`);

                    await supabase
                        .from("shifts")
                        .update({
                            status: 'in_progress',
                            shift_started_at: now.toISOString(),
                            shift_journey_log: [
                                ...(shift.shift_journey_log || []),
                                {
                                    state: 'in_progress',
                                    timestamp: now.toISOString(),
                                    method: 'automated',
                                    notes: 'Auto-started at scheduled start time'
                                }
                            ]
                        })
                        .eq("id", shift.id);

                    results.shifts_started++;
                }

                // ✅ FIXED: AUTOMATION 2: Shift should end (in_progress → awaiting_admin_closure)
                if (shift.status === 'in_progress' && now >= endDateTime) {
                    console.log(`🟠 [Shift Automation] Ending shift ${shift.id.substring(0, 8)} - needs admin closure`);

                    // Check if agency has auto-verification enabled
                    const { data: agency } = await supabase
                        .from("agencies")
                        .select("*")
                        .eq("id", shift.agency_id)
                        .single();

                    const autoVerify = agency?.settings?.automation_settings?.verify_shift_completion !== false;

                    await supabase
                        .from("shifts")
                        .update({
                            status: 'awaiting_admin_closure', // ✅ FIXED: Correct status name
                            shift_ended_at: now.toISOString(),
                            shift_journey_log: [
                                ...(shift.shift_journey_log || []),
                                {
                                    state: 'awaiting_admin_closure',
                                    timestamp: now.toISOString(),
                                    method: 'automated',
                                    notes: 'Auto-ended at scheduled end time - awaiting admin verification'
                                }
                            ]
                        })
                        .eq("id", shift.id);

                    // Create admin workflow if verification enabled
                    if (autoVerify) {
                        try {
                            await supabase
                                .from("admin_workflows")
                                .insert({
                                    agency_id: shift.agency_id,
                                    type: 'shift_completion_verification',
                                    priority: 'medium',
                                    status: 'pending',
                                    title: `Verify Shift Completion - ${shift.id.substring(0, 8).toUpperCase()}`,
                                    description: `Shift ended at ${shift.end_time}. Please verify timesheet and confirm shift was worked as planned.`,
                                    related_entity: {
                                        entity_type: 'shift',
                                        entity_id: shift.id
                                    },
                                    deadline: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24h deadline
                                    auto_created: true
                                });
                            console.log(`✅ [Shift Automation] Created verification workflow for shift ${shift.id.substring(0, 8)}`);
                        } catch (workflowError) {
                            console.error(`⚠️ [Shift Automation] Failed to create workflow:`, workflowError);
                        }
                    }

                    results.shifts_ended++;
                }

            } catch (shiftError) {
                console.error(`❌ [Shift Automation] Error processing shift ${shift.id}:`, shiftError);
                results.errors.push({
                    shift_id: shift.id,
                    error: shiftError.message
                });
            }
        }

        console.log('✅ [Shift Automation] Complete:', results);

        return new Response(
            JSON.stringify({
                success: true,
                timestamp: now.toISOString(),
                results
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [Shift Automation] Fatal error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
