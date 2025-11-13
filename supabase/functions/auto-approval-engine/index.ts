import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * OPTION B: Auto-Approval Engine
 *
 * Batch processes all submitted timesheets and auto-approves clean ones
 * Dramatically increases automation rate by handling perfect timesheets without human review
 *
 * Runs every hour via cron or on-demand
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log('🤖 [Auto-Approval Engine] Starting batch processing...');

        // Get all submitted timesheets waiting for approval
        const { data: timesheets, error: timesheetsError } = await supabase
            .from("timesheets")
            .select("*")
            .eq("status", "submitted");

        if (timesheetsError) {
            throw timesheetsError;
        }

        console.log(`📊 Found ${timesheets?.length || 0} timesheets pending approval`);

        const results = {
            checked: timesheets?.length || 0,
            autoApproved: [],
            flagged: [],
            errors: []
        };

        for (const timesheet of timesheets || []) {
            try {
                // Get related shift for validation
                const { data: shifts, error: shiftError } = await supabase
                    .from("shifts")
                    .select("*")
                    .eq("id", timesheet.booking_id);

                if (shiftError) {
                    throw shiftError;
                }

                const shift = shifts?.[0];

                // Run validation logic
                const validation = await validateTimesheet(timesheet, shift);

                if (validation.canAutoApprove) {
                    // AUTO-APPROVE
                    const { error: updateError } = await supabase
                        .from("timesheets")
                        .update({
                            status: 'approved',
                            client_approved_at: new Date().toISOString(),
                            auto_approved: true,
                            approval_notes: validation.approvalNotes || 'Auto-approved - all validations passed'
                        })
                        .eq("id", timesheet.id);

                    if (updateError) {
                        throw updateError;
                    }

                    // Update shift status
                    if (shift) {
                        const { error: shiftUpdateError } = await supabase
                            .from("shifts")
                            .update({
                                status: 'completed'
                            })
                            .eq("id", shift.id);

                        if (shiftUpdateError) {
                            console.error('Failed to update shift status:', shiftUpdateError);
                        }
                    }

                    results.autoApproved.push({
                        timesheet_id: timesheet.id,
                        staff_id: timesheet.staff_id,
                        total_hours: timesheet.total_hours,
                        validation_score: validation.score
                    });

                    console.log(`✅ Auto-approved timesheet ${timesheet.id} (score: ${validation.score})`);
                } else {
                    // FLAG FOR REVIEW
                    results.flagged.push({
                        timesheet_id: timesheet.id,
                        staff_id: timesheet.staff_id,
                        reason: validation.flagReason,
                        issues: validation.issues
                    });

                    console.log(`⚠️ Flagged timesheet ${timesheet.id}: ${validation.flagReason}`);
                }
            } catch (error) {
                console.error(`Error processing timesheet ${timesheet.id}:`, error);
                results.errors.push({
                    timesheet_id: timesheet.id,
                    error: error.message
                });
            }
        }

        // Generate summary stats
        const approvalRate = results.checked > 0
            ? ((results.autoApproved.length / results.checked) * 100).toFixed(1)
            : 0;

        console.log(`✅ [Auto-Approval Engine] Complete:`);
        console.log(`   - Checked: ${results.checked}`);
        console.log(`   - Auto-approved: ${results.autoApproved.length}`);
        console.log(`   - Flagged for review: ${results.flagged.length}`);
        console.log(`   - Approval rate: ${approvalRate}%`);

        return new Response(
            JSON.stringify({
                success: true,
                ...results,
                approvalRate: parseFloat(approvalRate)
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [Auto-Approval Engine] Fatal error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});

/**
 * Validation logic extracted for clarity
 */
function validateTimesheet(timesheet, shift) {
    const validation = {
        canAutoApprove: true,
        score: 100,
        issues: [],
        warnings: [],
        approvalNotes: null,
        flagReason: null
    };

    // RULE 1: GPS Verification (Critical)
    if (!timesheet.geofence_validated) {
        if (timesheet.clock_in_location) {
            // GPS captured but validation failed
            validation.canAutoApprove = false;
            validation.score -= 50;
            validation.flagReason = 'Geofence validation failed';
            validation.issues.push(`Clock-in location ${timesheet.geofence_distance_meters}m from site`);
        } else {
            // No GPS data at all
            validation.canAutoApprove = false;
            validation.score -= 40;
            validation.flagReason = 'No GPS data available';
            validation.issues.push('GPS coordinates not captured');
        }
    }

    // RULE 2: Hours Worked vs Scheduled
    if (shift) {
        const scheduledHours = shift.duration_hours || 12;
        const actualHours = timesheet.total_hours || 0;
        const hoursDiff = Math.abs(scheduledHours - actualHours);
        const percentageDiff = (hoursDiff / scheduledHours) * 100;

        if (hoursDiff <= 0.08) {
            // Perfect match (±5 minutes)
            validation.score += 0; // No penalty
        } else if (hoursDiff <= 0.5) {
            // Minor variance (±30 minutes) - still auto-approve with note
            validation.score -= 5;
            validation.warnings.push(`${hoursDiff.toFixed(2)}h variance (acceptable)`);
            validation.approvalNotes = `Auto-approved with ${hoursDiff.toFixed(2)}h variance (within acceptable tolerance)`;
        } else if (percentageDiff > 20) {
            // Major variance (>20% difference) - DO NOT auto-approve
            validation.canAutoApprove = false;
            validation.score -= 50;
            validation.flagReason = 'Significant hours discrepancy';
            validation.issues.push(`${hoursDiff.toFixed(2)}h variance (${percentageDiff.toFixed(0)}% of scheduled hours)`);
        } else {
            // Moderate variance (0.5h to 20%) - flag for review
            validation.canAutoApprove = false;
            validation.score -= 30;
            validation.flagReason = 'Hours variance requires review';
            validation.issues.push(`${hoursDiff.toFixed(2)}h variance needs manager approval`);
        }

        // RULE 3: Suspiciously short shifts
        if (actualHours < 0.5 && scheduledHours > 4) {
            validation.canAutoApprove = false;
            validation.score -= 60;
            validation.flagReason = 'Possible early departure or no-show';
            validation.issues.push(`Staff worked only ${(actualHours * 60).toFixed(0)} minutes on a ${scheduledHours}h shift`);
        }
    }

    // RULE 4: Clock-out location (Warning, not critical)
    if (timesheet.clock_out_location && !timesheet.location_verified) {
        validation.score -= 10;
        validation.warnings.push('Clock-out location outside geofence');
        // Don't block auto-approval for this alone, but note it
    }

    // RULE 5: Missing data
    if (!timesheet.clock_in_time || !timesheet.clock_out_time) {
        validation.canAutoApprove = false;
        validation.score -= 70;
        validation.flagReason = 'Missing clock-in or clock-out time';
        validation.issues.push('Incomplete timesheet data');
    }

    // RULE 6: Total hours calculation check
    if (timesheet.clock_in_time && timesheet.clock_out_time) {
        const clockIn = new Date(timesheet.clock_in_time);
        const clockOut = new Date(timesheet.clock_out_time);
        const calculatedHours = (clockOut - clockIn) / (1000 * 60 * 60);
        const reportedHours = timesheet.total_hours || 0;
        const timeDiff = Math.abs(calculatedHours - reportedHours);

        if (timeDiff > 0.2) {
            // More than 12 minutes difference between calculated and reported hours
            validation.canAutoApprove = false;
            validation.score -= 40;
            validation.flagReason = 'Hours calculation mismatch';
            validation.issues.push(`Calculated ${calculatedHours.toFixed(2)}h but reported ${reportedHours.toFixed(2)}h`);
        }
    }

    // FINAL DECISION
    // Only auto-approve if score >= 85 AND canAutoApprove flag is still true
    if (validation.score < 85) {
        validation.canAutoApprove = false;
        if (!validation.flagReason) {
            validation.flagReason = 'Validation score below threshold';
        }
    }

    return validation;
}
