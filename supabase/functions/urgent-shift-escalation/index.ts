import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * PHASE 2 - TIER 1: Urgent Shift Auto-Escalation
 *
 * Monitors urgent/critical shifts and creates admin workflows if unfilled after X minutes
 *
 * Triggered: Every 5 minutes via scheduled cron
 * Rollback: Controlled by agency.settings.automation_settings.escalate_unfilled_shifts_after_minutes
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log('🚨 [Urgent Shift Escalation] Starting scheduled run...');

        const { data: agencies, error: agenciesError } = await supabase
            .from("agencies")
            .select("*");

        if (agenciesError) {
            throw agenciesError;
        }

        const results = {
            checked: 0,
            escalated: 0,
            errors: [],
        };

        for (const agency of agencies) {
            const escalationMinutes = agency.settings?.automation_settings?.escalate_unfilled_shifts_after_minutes || 15;

            console.log(`🏥 [Agency: ${agency.name}] Checking urgent shifts (threshold: ${escalationMinutes} min)...`);

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

            const now = new Date();

            for (const shift of urgentShifts || []) {
                results.checked++;

                try {
                    const createdAt = new Date(shift.created_date);
                    const minutesSinceCreation = (now - createdAt) / (1000 * 60);

                    // Check if shift has been open longer than threshold
                    if (minutesSinceCreation >= escalationMinutes) {

                        // Check if workflow already exists for this shift
                        const { data: existingWorkflows } = await supabase
                            .from("admin_workflows")
                            .select("*")
                            .eq("related_entity->>entity_id", shift.id)
                            .eq("type", "unfilled_urgent_shift")
                            .in("status", ['pending', 'in_progress']);

                        if (existingWorkflows && existingWorkflows.length > 0) {
                            console.log(`⏭️  [Shift ${shift.id}] Workflow already exists, skipping`);
                            continue;
                        }

                        // Get client info
                        const { data: client } = await supabase
                            .from("clients")
                            .select("*")
                            .eq("id", shift.client_id)
                            .single();

                        // Create escalation workflow
                        await supabase
                            .from("admin_workflows")
                            .insert({
                                agency_id: agency.id,
                                type: 'unfilled_urgent_shift',
                                priority: shift.urgency === 'critical' ? 'critical' : 'high',
                                status: 'pending',
                                title: `🚨 URGENT: ${shift.role_required.replace('_', ' ')} needed at ${client?.name || 'Client'}`,
                                description: `Shift has been unfilled for ${Math.round(minutesSinceCreation)} minutes. Date: ${shift.date}, Time: ${shift.start_time}-${shift.end_time}. IMMEDIATE ACTION REQUIRED.`,
                                related_entity: {
                                    entity_type: 'shift',
                                    entity_id: shift.id
                                },
                                deadline: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour
                                auto_created: true,
                                escalation_count: 1
                            });

                        // Mark shift as escalated
                        await supabase
                            .from("shifts")
                            .update({ status: 'unfilled_escalated' })
                            .eq("id", shift.id);

                        console.log(`🚨 [ESCALATED] Shift ${shift.id} → Created workflow`);
                        results.escalated++;
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

        console.log('✅ [Urgent Shift Escalation] Complete:', results);

        return new Response(
            JSON.stringify({
                success: true,
                timestamp: new Date().toISOString(),
                results: results
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [Urgent Shift Escalation] Fatal error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
