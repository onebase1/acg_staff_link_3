import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * TIER 3A: Intelligent Timesheet Validator
 *
 * Strategic Goal: 100% automation for confident cases
 *
 * AUTO-APPROVES timesheets that pass all validations
 * Creates ADMIN WORKFLOWS only for genuine red flags
 *
 * Called after timesheet submission to determine next action
 */

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { timesheet_id } = await req.json();

        if (!timesheet_id) {
            return new Response(JSON.stringify({
                success: false,
                error: 'timesheet_id required'
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`🔍 [Intelligent Validator] Analyzing timesheet ${timesheet_id}`);

        // Fetch timesheet
        const { data: timesheets } = await supabase
            .from("timesheets")
            .select("*")
            .eq("id", timesheet_id);

        if (!timesheets || timesheets.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Timesheet not found'
            }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        const timesheet = timesheets[0];

        // Fetch related entities
        const { data: shift } = await supabase
            .from("shifts")
            .select("*")
            .eq("id", timesheet.booking_id);

        const shiftData = shift && shift.length > 0 ? shift[0] : null;

        // Fetch agency settings for GPS auto-completion
        const { data: agency } = await supabase
            .from("agencies")
            .select("settings")
            .eq("id", timesheet.agency_id)
            .single();

        const gpsAutoCompleteEnabled = agency?.settings?.automation_settings?.gps_auto_complete_shifts ?? true;

        // Initialize validation results
        const validations = {
            gps_verified: false,
            hours_match: false,
            within_tolerance: false,
            signatures_present: false,
            no_geofence_violations: false
        };

        const issues = [];
        const warnings = [];

        // VALIDATION 1: GPS Verification
        if (timesheet.geofence_validated) {
            validations.gps_verified = true;
            console.log('✅ GPS verified at clock-in');
        } else {
            if (timesheet.clock_in_location) {
                issues.push({
                    severity: 'high',
                    type: 'geofence_violation',
                    message: `Clock-in location failed geofence validation (${timesheet.geofence_distance_meters}m from site)`
                });
                console.log('❌ Geofence violation detected');
            } else {
                warnings.push({
                    severity: 'medium',
                    type: 'gps_unavailable',
                    message: 'GPS data not available for this timesheet'
                });
                console.log('⚠️  GPS data unavailable');
            }
        }

        // VALIDATION 2: Hours Worked vs Scheduled
        const scheduledHours = shiftData?.duration_hours || 12;
        const actualHours = timesheet.total_hours || 0;
        const hoursDifference = Math.abs(scheduledHours - actualHours);
        const percentageDiff = (hoursDifference / scheduledHours) * 100;

        // ±5 minutes tolerance = 0.08 hours
        const MINOR_TOLERANCE = 0.08; // 5 minutes
        const ACCEPTABLE_TOLERANCE = 0.5; // 30 minutes

        if (hoursDifference <= MINOR_TOLERANCE) {
            validations.hours_match = true;
            validations.within_tolerance = true;
            console.log(`✅ Hours match perfectly (${hoursDifference.toFixed(2)}h difference)`);
        } else if (hoursDifference <= ACCEPTABLE_TOLERANCE) {
            validations.within_tolerance = true;
            warnings.push({
                severity: 'low',
                type: 'minor_hours_variance',
                message: `${hoursDifference.toFixed(2)}h variance (within acceptable range)`
            });
            console.log(`⚠️  Minor hours variance: ${hoursDifference.toFixed(2)}h`);
        } else if (hoursDifference > ACCEPTABLE_TOLERANCE && percentageDiff < 20) {
            // 30 mins to 20% variance = warning, not critical
            warnings.push({
                severity: 'medium',
                type: 'hours_variance',
                message: `${hoursDifference.toFixed(2)}h variance (${percentageDiff.toFixed(0)}% difference)`
            });
            console.log(`⚠️  Moderate hours variance: ${hoursDifference.toFixed(2)}h (${percentageDiff.toFixed(0)}%)`);
        } else {
            // >20% variance = critical issue
            issues.push({
                severity: 'critical',
                type: 'significant_hours_mismatch',
                message: `CRITICAL: ${hoursDifference.toFixed(2)}h variance (${percentageDiff.toFixed(0)}% of scheduled hours). Scheduled: ${scheduledHours}h, Worked: ${actualHours}h`
            });
            console.log(`❌ CRITICAL hours mismatch: ${hoursDifference.toFixed(2)}h (${percentageDiff.toFixed(0)}%)`);
        }

        // VALIDATION 3: Signatures (Optional)
        if (timesheet.staff_signature && timesheet.client_signature) {
            validations.signatures_present = true;
            console.log('✅ All signatures present');
        } else if (!timesheet.staff_signature || !timesheet.client_signature) {
            // Signatures optional, but note if missing
            warnings.push({
                severity: 'low',
                type: 'missing_signatures',
                message: 'Digital signatures not collected'
            });
        }

        // VALIDATION 4: Clock-out geofence (if available)
        if (timesheet.clock_out_location && !timesheet.location_verified) {
            warnings.push({
                severity: 'medium',
                type: 'clock_out_geofence_fail',
                message: 'Clock-out location outside geofence (staff may have left site before clocking out)'
            });
            console.log('⚠️  Clock-out outside geofence');
        }

        // VALIDATION 5: Unusual patterns
        if (actualHours < 0.5 && scheduledHours > 4) {
            // Staff worked < 30 mins on a 4+ hour shift = suspicious
            issues.push({
                severity: 'critical',
                type: 'possible_no_show',
                message: `Staff clocked in/out within ${(actualHours * 60).toFixed(0)} minutes on a ${scheduledHours}h shift. Possible no-show or early departure.`
            });
            console.log('❌ Possible no-show/early departure detected');
        }

        // DECISION ENGINE
        const hasCriticalIssues = issues.some(i => i.severity === 'critical');
        const hasHighSeverityIssues = issues.some(i => i.severity === 'high');
        const hasAnyIssues = issues.length > 0;
        const onlyMinorWarnings = warnings.length > 0 && !hasAnyIssues;

        let decision;
        let action;

        if (!hasAnyIssues && warnings.length === 0) {
            // PERFECT TIMESHEET - AUTO APPROVE
            decision = 'auto_approve';
            action = 'approved';
            console.log('✅ DECISION: AUTO-APPROVE (perfect timesheet)');

        } else if (!hasAnyIssues && onlyMinorWarnings && validations.gps_verified) {
            // MINOR WARNINGS ONLY + GPS VERIFIED - AUTO APPROVE WITH NOTES
            decision = 'auto_approve_with_notes';
            action = 'approved';
            console.log('✅ DECISION: AUTO-APPROVE with notes (minor warnings only)');

        } else if (hasHighSeverityIssues || hasCriticalIssues) {
            // CRITICAL/HIGH ISSUES - CREATE ADMIN WORKFLOW
            decision = 'escalate_to_admin';
            action = 'pending_review';
            console.log('🚨 DECISION: ESCALATE to Admin Workflow (critical issues)');

        } else {
            // MEDIUM ISSUES - FLAG FOR REVIEW BUT DON'T AUTO-APPROVE
            decision = 'flag_for_review';
            action = 'pending_review';
            console.log('⚠️  DECISION: FLAG for manual review (medium issues)');
        }

        // EXECUTE DECISION
        const updates = {
            validation_completed_at: new Date().toISOString(),
            validation_decision: decision,
            validation_issues: issues,
            validation_warnings: warnings
        };

        if (decision === 'auto_approve' || decision === 'auto_approve_with_notes') {
            updates.status = 'approved';
            updates.client_approved_at = new Date().toISOString();
            updates.auto_approved = true;
            updates.approval_notes = decision === 'auto_approve_with_notes'
                ? `Auto-approved with minor warnings: ${warnings.map(w => w.message).join('; ')}`
                : 'Auto-approved - all validations passed';
        }

        await supabase
            .from("timesheets")
            .update(updates)
            .eq("id", timesheet_id);

        // 🎯 GPS AUTOMATION: Auto-complete shift when GPS timesheet is auto-approved
        if ((decision === 'auto_approve' || decision === 'auto_approve_with_notes') && validations.gps_verified && shiftData && gpsAutoCompleteEnabled) {
            console.log(`🎯 [GPS Auto-Complete] Shift ${shiftData.id.substring(0, 8)} - GPS validated, auto-completing shift`);

            await supabase
                .from("shifts")
                .update({
                    status: 'completed',
                    shift_ended_at: timesheet.clock_out_time || new Date().toISOString(),
                    admin_closure_outcome: 'auto_completed_gps',
                    admin_closed_at: new Date().toISOString(),
                    shift_journey_log: [
                        ...(shiftData.shift_journey_log || []),
                        {
                            state: 'completed',
                            timestamp: new Date().toISOString(),
                            method: 'gps_auto_completion',
                            notes: `Auto-completed via GPS validation. Timesheet auto-approved. Actual times: ${timesheet.actual_start_time || 'N/A'} - ${timesheet.actual_end_time || 'N/A'}`,
                            gps_validated: true,
                            geofence_distance: timesheet.geofence_distance_meters
                        }
                    ]
                })
                .eq("id", shiftData.id);

            console.log(`✅ [GPS Auto-Complete] Shift ${shiftData.id.substring(0, 8)} marked as completed`);
        } else if ((decision === 'auto_approve' || decision === 'auto_approve_with_notes') && (!validations.gps_verified || !gpsAutoCompleteEnabled) && shiftData) {
            // Timesheet approved but no GPS or GPS auto-complete disabled - set to awaiting_admin_closure for manual review
            const reason = !gpsAutoCompleteEnabled
                ? 'GPS auto-completion disabled in agency settings'
                : 'No GPS validation';
            console.log(`⚠️  [Manual Closure Required] Shift ${shiftData.id.substring(0, 8)} - ${reason}, requires admin closure`);

            await supabase
                .from("shifts")
                .update({
                    status: 'awaiting_admin_closure',
                    shift_ended_at: timesheet.clock_out_time || new Date().toISOString(),
                    shift_journey_log: [
                        ...(shiftData.shift_journey_log || []),
                        {
                            state: 'awaiting_admin_closure',
                            timestamp: new Date().toISOString(),
                            method: 'automated',
                            notes: `Timesheet approved but ${reason} - requires manual admin closure`
                        }
                    ]
                })
                .eq("id", shiftData.id);
        }

        // CREATE ADMIN WORKFLOW IF NEEDED
        if (decision === 'escalate_to_admin') {
            await supabase.from("admin_workflows").insert({
                agency_id: timesheet.agency_id,
                type: 'timesheet_discrepancy',
                priority: hasCriticalIssues ? 'critical' : 'high',
                status: 'pending',
                title: `Timesheet Discrepancy - ${issues[0].message.substring(0, 60)}...`,
                description: `Timesheet #${timesheet_id.substring(0, 8)} requires review:\n\n` +
                    `Issues Detected:\n${issues.map(i => `- ${i.message}`).join('\n')}\n\n` +
                    `Warnings:\n${warnings.map(w => `- ${w.message}`).join('\n') || 'None'}`,
                related_entity: {
                    entity_type: 'timesheet',
                    entity_id: timesheet_id
                },
                auto_created: true,
                deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });

            console.log(`📋 Admin Workflow created`);
        }

        return new Response(JSON.stringify({
            success: true,
            timesheet_id,
            decision,
            action,
            validations,
            issues,
            warnings,
            auto_approved: decision === 'auto_approve' || decision === 'auto_approve_with_notes',
            requires_review: decision === 'flag_for_review' || decision === 'escalate_to_admin',
            message: decision === 'auto_approve'
                ? 'Timesheet automatically approved - all validations passed'
                : decision === 'auto_approve_with_notes'
                ? 'Timesheet automatically approved with minor warnings noted'
                : decision === 'escalate_to_admin'
                ? 'Critical issues detected - Admin Workflow created for review'
                : 'Issues detected - manual review required'
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('❌ [Intelligent Validator] Fatal error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
