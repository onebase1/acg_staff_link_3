import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 🤖 SHIFT STATUS AUTOMATION ENGINE
 *
 * Automatically updates shift statuses based on time progression
 * Runs every 5 minutes via cron
 *
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
        const results = {
            shifts_started: 0,
            shifts_ended: 0,
            shifts_verified: 0,
            errors: []
        };

        // Get all shifts that need status updates
        const { data: allShifts, error: shiftsError } = await supabase
            .from("shifts")
            .select("*");

        if (shiftsError) {
            throw shiftsError;
        }

        // Filter shifts that are confirmed or in_progress
        const activeShifts = allShifts.filter(s =>
            s.status === 'confirmed' || s.status === 'in_progress'
        );

        console.log(`📊 [Shift Automation] Processing ${activeShifts.length} active shifts`);

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
