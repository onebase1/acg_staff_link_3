import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getBranding } from "../_shared/getBranding.ts";
import { shiftRequiresGPS } from "../_shared/gpsHelper.ts";

/**
 * 🤖 SHIFT STATUS AUTOMATION ENGINE
 *
 * Automatically updates shift statuses based on time progression
 * Runs every 5 minutes via cron
 *
 * AUTOMATIONS:
 * 0. Past shifts → awaiting_admin_closure (48h after scheduled end_time, handles overnight shifts)
 * 1. confirmed → in_progress (when shift start time reached)
 * 2. in_progress → awaiting_admin_closure OR completed (2h after shift end time + grace period)
 *
 * ✅ FIXED: Uses scheduled end_time + 48h grace period for past shifts (SQL function)
 * ✅ FIXED: Uses scheduled end_time + 2h grace period for today's shifts (Edge function)
 * ✅ FIXED: Handles overnight shifts (end_time < start_time means next day)
 * 🎯 GRACE PERIOD: Staff can clock out with GPS up to 2 hours after scheduled end
 * Creates admin_workflows for all shifts moved to awaiting_admin_closure
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
            workflows_escalated: 0, // ✅ NEW: Track escalated workflows
            unconfirmed_to_marketplace: 0, // ✅ NEW: Track auto-marketplace moves
            confirmation_reminders_sent: 0, // ✅ NEW: Track reminders
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

                // Get all shifts that need workflows
                const { data: shiftsNeedingWorkflows, error: shiftsError } = await supabase
                    .from('shifts')
                    .select('id, agency_id, date, client_id, assigned_staff_id')
                    .eq('status', 'awaiting_admin_closure')
                    .lt('date', today);

                if (shiftsError) {
                    console.error(`❌ [Shift Automation] Failed to fetch shifts needing workflows:`, shiftsError);
                } else if (shiftsNeedingWorkflows && shiftsNeedingWorkflows.length > 0) {
                    console.log(`📋 [Shift Automation] Found ${shiftsNeedingWorkflows.length} shifts needing workflows`);

                    // Get existing workflows to avoid duplicates
                    const { data: existingWorkflows, error: existingError } = await supabase
                        .from('admin_workflows')
                        .select('related_entity')
                        .eq('type', 'shift_completion_verification');

                    const existingShiftIds = new Set(
                        (existingWorkflows || [])
                            .filter(w => w.related_entity?.entity_type === 'shift')
                            .map(w => w.related_entity?.entity_id)
                    );

                    // Create workflows for shifts that don't have one yet
                    const workflowsToCreate = shiftsNeedingWorkflows
                        .filter(shift => !existingShiftIds.has(shift.id))
                        .map(shift => ({
                            agency_id: shift.agency_id,
                            name: `Past Shift Needs Closure - ${shift.id.substring(0, 8).toUpperCase()}`,
                            type: 'shift_completion_verification',
                            priority: 'medium',
                            status: 'pending',
                            title: `Past Shift Needs Closure - ${shift.id.substring(0, 8).toUpperCase()}`,
                            description: `Shift from ${shift.date} needs admin review. Was it worked? No-show? Cancelled?`,
                            related_entity: {
                                entity_type: 'shift',
                                entity_id: shift.id,
                                client_id: shift.client_id,
                                staff_id: shift.assigned_staff_id
                            },
                            deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours from now
                            auto_created: true,
                            created_date: new Date().toISOString()
                        }));

                    if (workflowsToCreate.length > 0) {
                        const { error: insertError } = await supabase
                            .from('admin_workflows')
                            .insert(workflowsToCreate);

                        if (insertError) {
                            console.error(`❌ [Shift Automation] Failed to create workflows:`, insertError);
                        } else {
                            console.log(`✅ [Shift Automation] Created ${workflowsToCreate.length} new workflows`);
                        }
                    } else {
                        console.log(`ℹ️ [Shift Automation] All shifts already have workflows`);
                    }
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
                let endDateTime = new Date(`${shift.date}T${shift.end_time}`);

                // ✅ FIX: Handle overnight shifts (end_time < start_time means shift ends next day)
                if (shift.end_time < shift.start_time) {
                    endDateTime.setDate(endDateTime.getDate() + 1);
                    console.log(`🌙 [Shift Automation] Overnight shift detected ${shift.id.substring(0, 8)} - end time adjusted to next day`);
                }

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

                // ✅ FIXED: AUTOMATION 2: Shift should end (in_progress → awaiting_admin_closure OR auto-complete)
                // 🎯 GRACE PERIOD: Give staff 2 hours after scheduled end to clock out with GPS
                const twoHoursAfterEnd = new Date(endDateTime.getTime() + 2 * 60 * 60 * 1000);

                if (shift.status === 'in_progress' && now >= twoHoursAfterEnd) {
                    console.log(`🟠 [Shift Automation] Ending shift ${shift.id.substring(0, 8)} (2h grace period expired) - checking for auto-verification...`);

                    // 🆕 Get client to check GPS requirement
                    const { data: client } = await supabase
                        .from('clients')
                        .select('id, name, geofence_enabled')
                        .eq('id', shift.client_id)
                        .single();

                    const requiresGPS = shiftRequiresGPS(shift, client);

                    // ✅ SMART AUTO-VERIFICATION: Check if shift can be auto-completed
                    let canAutoComplete = false;
                    let autoCompleteReason = '';

                    // 🆕 Check 0: Non-GPS shift - auto-complete without GPS verification
                    if (!requiresGPS) {
                        canAutoComplete = true;
                        autoCompleteReason = 'Non-GPS shift (manual timesheet mode)';
                        console.log(`✅ [Shift Automation] Shift ${shift.id.substring(0, 8)} is non-GPS shift - auto-completing`);
                    }

                    // Check 1: Is there an approved timesheet?
                    if (!canAutoComplete) {
                        const { data: timesheet } = await supabase
                            .from('timesheets')
                            .select('id, status, clock_in_time, clock_out_time, actual_start_time, actual_end_time')
                            .eq('shift_id', shift.id)
                            .eq('status', 'approved')
                            .single();

                        if (timesheet) {
                            canAutoComplete = true;
                            autoCompleteReason = 'Approved timesheet exists';
                            console.log(`✅ [Shift Automation] Shift ${shift.id.substring(0, 8)} has approved timesheet - auto-completing`);
                        }
                    }

                    // Check 2: Is there GPS clock-in/out data? (Only for GPS-required shifts)
                    if (!canAutoComplete && requiresGPS) {
                        const { data: gpsData } = await supabase
                            .from('timesheets')
                            .select('id, clock_in_time, clock_out_time, clock_in_location, clock_out_location')
                            .eq('shift_id', shift.id)
                            .not('clock_in_location', 'is', null)
                            .not('clock_out_location', 'is', null)
                            .single();

                        if (gpsData && gpsData.clock_in_time && gpsData.clock_out_time) {
                            canAutoComplete = true;
                            autoCompleteReason = 'GPS clock-in/out verified';
                            console.log(`✅ [Shift Automation] Shift ${shift.id.substring(0, 8)} has GPS clock-in/out - auto-completing`);
                        }
                    }

                    if (canAutoComplete) {
                        // AUTO-COMPLETE: Shift has verification data
                        await supabase
                            .from("shifts")
                            .update({
                                status: 'completed',
                                shift_ended_at: now.toISOString(),
                                admin_closed_at: now.toISOString(),
                                shift_journey_log: [
                                    ...(shift.shift_journey_log || []),
                                    {
                                        state: 'completed',
                                        timestamp: now.toISOString(),
                                        method: 'automated',
                                        notes: `Auto-completed: ${autoCompleteReason}`
                                    }
                                ]
                            })
                            .eq("id", shift.id);

                        results.shifts_verified++;
                        console.log(`✅ [Shift Automation] Auto-completed shift ${shift.id.substring(0, 8)}: ${autoCompleteReason}`);
                    } else {
                        // MANUAL VERIFICATION REQUIRED: No timesheet or GPS data after 2h grace period
                        await supabase
                            .from("shifts")
                            .update({
                                status: 'awaiting_admin_closure',
                                shift_ended_at: now.toISOString(),
                                shift_journey_log: [
                                    ...(shift.shift_journey_log || []),
                                    {
                                        state: 'awaiting_admin_closure',
                                        timestamp: now.toISOString(),
                                        method: 'automated',
                                        notes: 'Auto-ended 2 hours after scheduled end time - awaiting admin verification (no timesheet or GPS data received during grace period)'
                                    }
                                ]
                            })
                            .eq("id", shift.id);

                        // Create admin workflow for manual verification
                        try {
                            await supabase
                                .from("admin_workflows")
                                .insert({
                                    agency_id: shift.agency_id,
                                    type: 'shift_completion_verification',
                                    priority: 'medium',
                                    status: 'pending',
                                    title: `Verify Shift Completion - ${shift.id.substring(0, 8).toUpperCase()}`,
                                    description: `Shift ended at ${shift.end_time}. No timesheet or GPS data found. Please verify shift was worked as planned.`,
                                    related_entity: {
                                        entity_type: 'shift',
                                        entity_id: shift.id,
                                        client_id: shift.client_id,
                                        staff_id: shift.assigned_staff_id
                                    },
                                    deadline: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24h deadline
                                    auto_created: true,
                                    created_date: now.toISOString()
                                });
                            console.log(`✅ [Shift Automation] Created verification workflow for shift ${shift.id.substring(0, 8)}`);
                        } catch (workflowError) {
                            console.error(`⚠️ [Shift Automation] Failed to create workflow:`, workflowError);
                        }

                        results.shifts_ended++;
                    }
                }

            } catch (shiftError) {
                console.error(`❌ [Shift Automation] Error processing shift ${shift.id}:`, shiftError);
                results.errors.push({
                    shift_id: shift.id,
                    error: shiftError.message
                });
            }
        }

        // ✅ NEW: AUTOMATION 3: Auto-complete awaiting_admin_closure shifts if they have verification data
        console.log(`🔍 [Shift Automation] Checking awaiting_admin_closure shifts for auto-completion...`);

        const { data: awaitingShifts, error: awaitingError } = await supabase
            .from("shifts")
            .select("*")
            .eq('status', 'awaiting_admin_closure');

        if (awaitingError) {
            console.error(`❌ [Shift Automation] Failed to fetch awaiting shifts:`, awaitingError);
        } else if (awaitingShifts && awaitingShifts.length > 0) {
            console.log(`📊 [Shift Automation] Found ${awaitingShifts.length} shifts awaiting admin closure`);

            for (const shift of awaitingShifts) {
                try {
                    let canAutoComplete = false;
                    let autoCompleteReason = '';

                    // Check 1: Is there an approved timesheet?
                    const { data: timesheet } = await supabase
                        .from('timesheets')
                        .select('id, status, clock_in_time, clock_out_time, actual_start_time, actual_end_time')
                        .eq('shift_id', shift.id)
                        .eq('status', 'approved')
                        .single();

                    if (timesheet) {
                        canAutoComplete = true;
                        autoCompleteReason = 'Approved timesheet exists';
                        console.log(`✅ [Shift Automation] Shift ${shift.id.substring(0, 8)} has approved timesheet - auto-completing`);
                    }

                    // Check 2: Is there GPS clock-in/out data?
                    if (!canAutoComplete) {
                        const { data: gpsData } = await supabase
                            .from('timesheets')
                            .select('id, clock_in_time, clock_out_time, clock_in_location, clock_out_location')
                            .eq('shift_id', shift.id)
                            .not('clock_in_location', 'is', null)
                            .not('clock_out_location', 'is', null)
                            .single();

                        if (gpsData && gpsData.clock_in_time && gpsData.clock_out_time) {
                            canAutoComplete = true;
                            autoCompleteReason = 'GPS clock-in/out verified';
                            console.log(`✅ [Shift Automation] Shift ${shift.id.substring(0, 8)} has GPS clock-in/out - auto-completing`);
                        }
                    }

                    if (canAutoComplete) {
                        // AUTO-COMPLETE: Shift has verification data
                        await supabase
                            .from("shifts")
                            .update({
                                status: 'completed',
                                admin_closed_at: now.toISOString(),
                                shift_journey_log: [
                                    ...(shift.shift_journey_log || []),
                                    {
                                        state: 'completed',
                                        timestamp: now.toISOString(),
                                        method: 'automated',
                                        notes: `Auto-completed: ${autoCompleteReason}`
                                    }
                                ]
                            })
                            .eq("id", shift.id);

                        // Close related admin workflow if it exists
                        await supabase
                            .from("admin_workflows")
                            .update({
                                status: 'completed',
                                resolved_at: now.toISOString(),
                                resolved_by: 'system_automation',
                                resolution_notes: `Auto-completed: ${autoCompleteReason}`
                            })
                            .eq('type', 'shift_completion_verification')
                            .eq('related_entity->>entity_id', shift.id)
                            .eq('status', 'pending');

                        results.shifts_verified++;
                        console.log(`✅ [Shift Automation] Auto-completed shift ${shift.id.substring(0, 8)}: ${autoCompleteReason}`);
                    }
                } catch (autoCompleteError) {
                    console.error(`❌ [Shift Automation] Error auto-completing shift ${shift.id}:`, autoCompleteError);
                }
            }
        }

        // ✅ NEW: AUTOMATION 4: Smarter Recursive Re-assignment & Urgency Ladder
        console.log(`🔍 [Shift Automation] Checking for unconfirmed assignments via Urgency Ladder...`);

        const { data: unconfirmedShifts, error: unconfirmedError } = await supabase
            .from("shifts")
            .select("*, agency:agency_id(settings), staff:assigned_staff_id(first_name, last_name, email, phone)")
            .eq('status', 'assigned')
            .gte('date', today)
            .not('assigned_staff_id', 'is', null);

        if (unconfirmedError) {
            console.error(`❌ [Shift Automation] Failed to fetch unconfirmed shifts:`, unconfirmedError);
        } else if (unconfirmedShifts && unconfirmedShifts.length > 0) {
            console.log(`📊 [Shift Automation] Found ${unconfirmedShifts.length} assigned shifts to check`);

            for (const shift of unconfirmedShifts) {
                try {
                    // Get branding for this agency
                    const branding = await getBranding(supabase, shift.agency_id);
                    const agencyName = shift.agency?.settings?.name || "Agile Care Management";

                    // 1. Check for confirmation_deadline in Journey Log
                    type JourneyEntry = { state: string; timestamp: string; confirmation_deadline?: string; staff_id?: string; [key: string]: unknown };
                    const journeyLog = (shift.shift_journey_log || []) as JourneyEntry[];
                    
                    const lastAssignedEntry = journeyLog
                        .filter(e => e.state === 'assigned')
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

                    if (!lastAssignedEntry) continue;

                    // Fallback to 24h if no explicit deadline found
                    const deadline = lastAssignedEntry.confirmation_deadline 
                        ? new Date(lastAssignedEntry.confirmation_deadline) 
                        : new Date(new Date(lastAssignedEntry.timestamp).getTime() + 24 * 60 * 60 * 1000);

                    const isExpired = now > deadline;
                    const hoursUntilStart = (new Date(`${shift.date}T${shift.start_time}`).getTime() - now.getTime()) / 3600000;

                    // 2. Handle Expiry or High Urgency
                    if (isExpired || hoursUntilStart < 6) {
                        const reason = isExpired ? 'Confirmation deadline expired' : 'Shift starting soon (< 6h)';
                        console.log(`🛒 [Shift Automation] Shift ${shift.id.substring(0, 8)}: ${reason} - triggering re-assignment`);

                        const previousAssignments = journeyLog
                            .filter(e => e.state === 'assigned' && e.staff_id)
                            .map(e => e.staff_id as string);
                        
                        const uniqueExcluded = [...new Set(previousAssignments)];

                        if (uniqueExcluded.length >= 3 || hoursUntilStart < 4) {
                            // FALLBACK TO MARKETPLACE: Too many failures or too close to start
                            console.log(`🛒 [Shift Automation] Shift ${shift.id.substring(0, 8)} - Fallback to Marketplace`);
                            const { error: marketplaceError } = await supabase
                                .from("shifts")
                                .update({
                                    status: 'open',
                                    assigned_staff_id: null,
                                    marketplace_visible: true,
                                    marketplace_added_at: now.toISOString(),
                                    urgency: hoursUntilStart < 24 ? 'high' : shift.urgency,
                                    shift_journey_log: [
                                        ...journeyLog,
                                        {
                                            state: 'open',
                                            timestamp: now.toISOString(),
                                            method: 'automated_reassignment_failed',
                                            notes: `Max recursive attempts (${uniqueExcluded.length}) reached or time critical (${hoursUntilStart.toFixed(1)}h). Moved to marketplace.`
                                        }
                                    ]
                                })
                                .eq("id", shift.id);
                            
                            if (!marketplaceError) {
                                results.unconfirmed_to_marketplace++;

                                // 📧 NOTIFY STAFF: Recursive re-assignment rotation or fallback
                                try {
                                    await supabase.functions.invoke('send-email', {
                                        body: {
                                            to: shift.staff?.email,
                                            subject: `Shift Update: Assignment Released - ${shift.date}`,
                                            html: `
                                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb;">
                                                    <div style="background-color: #ef4444; color: white; padding: 30px; text-align: center;">
                                                        <h1 style="margin: 0; font-size: 24px;">Shift Assignment Released</h1>
                                                    </div>
                                                    <div style="padding: 30px; background: #fff;">
                                                        <p style="font-size: 16px; color: #374151;">Hi ${shift.staff?.first_name || 'there'},</p>
                                                        <p>Your assignment for the shift on <strong>${shift.date}</strong> has been released because it was not confirmed within the required time window.</p>
                                                        
                                                        <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
                                                            <strong>Reason:</strong> No confirmation received by deadline.<br/>
                                                            <strong>Status:</strong> Shift released to other staff/marketplace.
                                                        </div>

                                                        <p>To avoid losing shifts in the future, please ensure you confirm them promptly in the staff portal.</p>

                                                        <div style="text-align: center; margin: 30px 0;">
                                                            <a href="${branding.appUrl}/marketplace" style="display: inline-block; background-color: #ef4444; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                                                View Available Shifts
                                                            </a>
                                                        </div>
                                                    </div>
                                                    <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center;">
                                                        <p style="margin: 0; font-size: 13px;">© ${new Date().getFullYear()} ${agencyName}. All rights reserved.</p>
                                                    </div>
                                                </div>
                                            `
                                        }
                                    });
                                } catch (notifyErr) {
                                    console.error(`❌ [Shift Automation] Failed to notify staff of unassignment:`, notifyErr);
                                }
                            } else {
                                console.error(`❌ [Shift Automation] Failed to move shift ${shift.id} to marketplace:`, marketplaceError);
                            }
                        } else {
                            // RECURSIVE RE-ASSIGNMENT: Call the SQL engine with exclusion
                            console.log(`🔄 [Shift Automation] Attempting recursive re-assignment for ${shift.id.substring(0, 8)}...`);
                            
                            // sanitize exclusion list
                            const cleanExclusions = uniqueExcluded.filter(id => id && typeof id === 'string');
                            // Ensure current staff is excluded (if they expired)
                            if (shift.assigned_staff_id && !cleanExclusions.includes(shift.assigned_staff_id)) {
                                cleanExclusions.push(shift.assigned_staff_id);
                            }

                            const { data: reassignResult, error: reassignError } = await supabase
                                .rpc('auto_assign_shift', { 
                                    p_shift_id: shift.id,
                                    p_agency_id: shift.agency_id,
                                    exclude_staff_ids: cleanExclusions
                                });

                            if (reassignError) {
                                console.error(`❌ [Shift Automation] Re-assignment failed for ${shift.id}:`, reassignError);
                            } else {
                                console.log(`✅ [Shift Automation] Re-assignment successful for ${shift.id}:`, reassignResult);
                                
                                // 📧 NOTIFY PREVIOUS STAFF: They lost the shift due to rotation
                                // Only send if re-assignment (DB update) actually succeeded
                                try {
                                    await supabase.functions.invoke('send-email', {
                                        body: {
                                            to: shift.staff?.email,
                                            subject: `Shift Update: Assignment Released - ${shift.date}`,
                                            html: `
                                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb;">
                                                    <div style="background-color: #ef4444; color: white; padding: 30px; text-align: center;">
                                                        <h1 style="margin: 0; font-size: 24px;">Shift Assignment Released</h1>
                                                    </div>
                                                    <div style="padding: 30px; background: #fff;">
                                                        <p style="font-size: 16px; color: #374151;">Hi ${shift.staff?.first_name || 'there'},</p>
                                                        <p>Your assignment for the shift on <strong>${shift.date}</strong> has been released because it was not confirmed within the required time window.</p>
                                                        
                                                        <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
                                                            <strong>Reason:</strong> Confirmation deadline expired.<br/>
                                                            <strong>Action:</strong> Shift offered to next available candidate.
                                                        </div>

                                                        <div style="text-align: center; margin: 30px 0;">
                                                            <a href="${branding.appUrl}/marketplace" style="display: inline-block; background-color: #ef4444; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                                                View Marketplace
                                                            </a>
                                                        </div>
                                                    </div>
                                                    <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center;">
                                                        <p style="margin: 0; font-size: 13px;">© ${new Date().getFullYear()} ${agencyName}. All rights reserved.</p>
                                                    </div>
                                                </div>
                                            `
                                        }
                                    });
                                } catch (notifyErr) {
                                    console.error(`❌ [Shift Automation] Failed to notify staff of rotation:`, notifyErr);
                                }
                            }
                        }
                    } else {
                        // 3. Optional: Send Reminder if at 50% of window
                        const totalWindow = deadline.getTime() - new Date(lastAssignedEntry.timestamp).getTime();
                        const timePassed = now.getTime() - new Date(lastAssignedEntry.timestamp).getTime();
                        
                        if (timePassed > totalWindow / 2 && !shift.confirmation_reminder_sent && shift.staff?.email) {
                            console.log(`📧 [Shift Automation] Window 50% reached for ${shift.id.substring(0, 8)} - sending reminder...`);
                            
                            const deadlineStr = deadline.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                            const deadlineDateStr = deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

                            try {
                                await supabase.functions.invoke('send-email', {
                                    body: {
                                        to: shift.staff.email,
                                        subject: `⏰ Action Required: Confirm your shift on ${shift.date}`,
                                        html: `
                                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb;">
                                                <div style="background-color: #f59e0b; color: white; padding: 30px; text-align: center;">
                                                    <h1 style="margin: 0; font-size: 24px;">⏰ Shift Confirmation Reminder</h1>
                                                </div>
                                                <div style="padding: 30px; background: #fff;">
                                                    <p style="font-size: 16px; color: #374151;">Hi ${shift.staff.first_name},</p>
                                                    <p>You have an assigned shift that needs confirmation. Please confirm <strong>to secure this booking</strong>.</p>
                                                    
                                                    <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
                                                        <strong>Date:</strong> ${shift.date}<br/>
                                                        <strong>Time:</strong> ${shift.start_time} - ${shift.end_time}<br/>
                                                        <p style="color: #b45309; font-weight: bold; margin-top: 10px;">
                                                            ⚠️ Deadline: Please confirm by ${deadlineStr} (${deadlineDateStr}) or this shift will be offered to other staff.
                                                        </p>
                                                    </div>

                                                    <div style="text-align: center; margin: 30px 0;">
                                                        <a href="${branding.appUrl}/shifts" style="display: inline-block; background-color: #f59e0b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                                            Confirm Shift in Staff Portal
                                                        </a>
                                                    </div>
                                                </div>
                                                <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center;">
                                                    <p style="margin: 0; font-size: 13px;">© ${new Date().getFullYear()} ${agencyName}. All rights reserved.</p>
                                                </div>
                                            </div>
                                        `
                                    }
                                });

                                await supabase
                                    .from("shifts")
                                    .update({ confirmation_reminder_sent: true })
                                    .eq("id", shift.id);

                                results.confirmation_reminders_sent++;
                            } catch (err) {
                                console.error(`❌ [Shift Automation] Failed to send reminder for ${shift.id}:`, err);
                            }
                        }
                    }
                } catch (shiftError) {
                    console.error(`❌ [Shift Automation] Error processing unconfirmed shift ${shift.id}:`, shiftError);
                }
            }
        }

        // ✅ AUTOMATION 5: Escalate overdue workflows
        console.log(`🔍 [Shift Automation] Checking for overdue workflows...`);

        const { data: overdueWorkflows, error: overdueError } = await supabase
            .from("admin_workflows")
            .select("*")
            .eq('type', 'shift_completion_verification')
            .eq('status', 'pending')
            .not('deadline', 'is', null);

        if (overdueError) {
            console.error(`❌ [Shift Automation] Failed to fetch overdue workflows:`, overdueError);
        } else if (overdueWorkflows && overdueWorkflows.length > 0) {
            console.log(`📊 [Shift Automation] Found ${overdueWorkflows.length} pending workflows`);

            for (const workflow of overdueWorkflows) {
                try {
                    const createdAt = new Date(workflow.created_date);
                    const hoursOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
                    const escalationCount = workflow.escalation_count || 0;

                    // Escalation thresholds
                    if (hoursOld >= 72 && escalationCount < 3) {
                        // 72h: Final escalation - mark as high priority
                        await supabase
                            .from("admin_workflows")
                            .update({
                                priority: 'high',
                                escalation_count: 3,
                                description: workflow.description + '\n\n⚠️ URGENT: 72+ hours overdue - requires immediate attention'
                            })
                            .eq("id", workflow.id);

                        results.workflows_escalated++;
                        console.log(`🚨 [Shift Automation] Escalated workflow ${workflow.id.substring(0, 8)} to HIGH priority (72h overdue)`);

                    } else if (hoursOld >= 48 && escalationCount < 2) {
                        // 48h: Second escalation
                        await supabase
                            .from("admin_workflows")
                            .update({
                                priority: 'medium',
                                escalation_count: 2,
                                description: workflow.description + '\n\n⚠️ WARNING: 48+ hours overdue'
                            })
                            .eq("id", workflow.id);

                        results.workflows_escalated++;
                        console.log(`⚠️ [Shift Automation] Escalated workflow ${workflow.id.substring(0, 8)} (48h overdue)`);

                    } else if (hoursOld >= 24 && escalationCount < 1) {
                        // 24h: First escalation
                        await supabase
                            .from("admin_workflows")
                            .update({
                                escalation_count: 1,
                                description: workflow.description + '\n\nℹ️ REMINDER: 24+ hours overdue'
                            })
                            .eq("id", workflow.id);

                        results.workflows_escalated++;
                        console.log(`ℹ️ [Shift Automation] Escalated workflow ${workflow.id.substring(0, 8)} (24h overdue)`);
                    }
                } catch (escalationError) {
                    console.error(`❌ [Shift Automation] Error escalating workflow ${workflow.id}:`, escalationError);
                }
            }
        }

        // ✅ FINAL STEP: Send Admin Digest
        if (results.shifts_ended > 0 || results.past_shifts_closed > 0) {
            const totalShiftsNeedingClosure = results.shifts_ended + results.past_shifts_closed;
            try {
                const subject = `Digest: ${totalShiftsNeedingClosure} Shifts Awaiting Admin Closure`;
                const body_html = `
                    <p>Hello Admin,</p>
                    <p>The automated system has processed recent shifts. The following shifts have ended and require your review to be marked as 'Completed'.</p>
                    <ul>
                        <li><strong>${results.past_shifts_closed}</strong> past-dated shifts were moved to 'Awaiting Closure'.</li>
                        <li><strong>${results.shifts_ended}</strong> shifts from today were moved to 'Awaiting Closure'.</li>
                    </ul>
                    <p>Please visit the 'Awaiting Closure' tab in the Shift Management dashboard to review these shifts.</p>
                    <p>This is an automated daily digest.</p>
                `;

                await supabase.functions.invoke('internal-admin-notifier', {
                    body: { subject, body_html, change_type: 'daily_closure_digest' }
                });
                console.log("✅ Admin digest for shifts awaiting closure sent.");
            } catch (digestError) {
                console.error("❌ Failed to send admin digest:", digestError);
            }
        }


        console.log('✅ [Shift Automation] Complete:', results);

        return new Response(
            JSON.stringify({
                success: true,
                timestamp: now.toISOString(),
                results
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [Shift Automation] Fatal error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
