import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * ⚡ AUTO-TIMESHEET APPROVAL ENGINE
 *
 * Automatically approves timesheets that meet quality criteria:
 * ✅ GPS validated (if consent given)
 * ✅ Both signatures present
 * ✅ Hours within threshold (±15 mins default)
 * ✅ No existing disputes
 *
 * TRIGGERS:
 * - Called when timesheet.status = 'submitted'
 * - Can be called manually by admin
 *
 * SAFETY:
 * - Creates AdminWorkflow if criteria not met
 * - Logs all decisions for audit trail
 * - Respects agency auto-approval settings
 *
 * Created: 2025-01-08
 */

serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { timesheet_id, manual_trigger = false } = await req.json();

    if (!timesheet_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'timesheet_id is required'
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch timesheet with service role (admin operation)
    const { data: timesheet, error: timesheetError } = await supabase
      .from("timesheets")
      .select("*")
      .eq("id", timesheet_id)
      .single();

    if (timesheetError || !timesheet) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Timesheet not found'
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Already approved/paid? Skip
    if (timesheet.status === 'approved' || timesheet.status === 'paid') {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'already_processed',
          message: 'Timesheet already approved or paid'
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch related entities
    const [
      { data: agencies },
      { data: staff },
      { data: shifts },
      { data: bookings }
    ] = await Promise.all([
      supabase.from("agencies").select("*"),
      supabase.from("staff").select("*"),
      supabase.from("shifts").select("*"),
      supabase.from("bookings").select("*")
    ]);

    const agency = agencies?.find(a => a.id === timesheet.agency_id);
    const staffMember = staff?.find(s => s.id === timesheet.staff_id);
    const booking = bookings?.find(b => b.id === timesheet.booking_id);
    const shift = booking ? shifts?.find(s => s.id === booking.shift_id) : null;

    // Check if agency has auto-approval enabled
    const autoApprovalEnabled = agency?.settings?.automation_settings?.auto_timesheet_approval ?? true;

    if (!autoApprovalEnabled && !manual_trigger) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'disabled',
          message: 'Auto-approval disabled for this agency'
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // === VALIDATION CRITERIA ===
    const validationResults = {
      signatures_present: false,
      gps_validated: false,
      hours_acceptable: false,
      no_disputes: false,
      all_checks_passed: false
    };

    const issues = [];

    // 1. Check signatures
    if (timesheet.staff_signature && timesheet.client_signature) {
      validationResults.signatures_present = true;
    } else {
      issues.push({
        type: 'missing_signature',
        severity: 'high',
        message: `Missing ${!timesheet.staff_signature ? 'staff' : 'client'} signature`
      });
    }

    // 2. Check GPS (only if staff has consented)
    if (staffMember?.gps_consent) {
      if (timesheet.geofence_validated === true) {
        validationResults.gps_validated = true;
      } else if (timesheet.geofence_validated === false) {
        issues.push({
          type: 'geofence_violation',
          severity: 'high',
          message: `Clock-in ${Math.round(timesheet.geofence_distance_meters || 0)}m outside geofence`
        });
      } else {
        issues.push({
          type: 'missing_gps',
          severity: 'medium',
          message: 'GPS validation not performed'
        });
      }
    } else {
      // Staff hasn't consented to GPS - skip this check
      validationResults.gps_validated = true; // Don't penalize for no consent
    }

    // 3. Check hours discrepancy
    const hoursThreshold = 0.25; // 15 minutes tolerance
    if (shift && timesheet.total_hours) {
      const scheduledHours = shift.duration_hours || 12;
      const workedHours = timesheet.total_hours;
      const hoursDiff = Math.abs(workedHours - scheduledHours);

      if (hoursDiff <= hoursThreshold) {
        validationResults.hours_acceptable = true;
      } else {
        issues.push({
          type: 'hours_mismatch',
          severity: hoursDiff > 2 ? 'high' : 'medium',
          message: `Worked ${workedHours}h, scheduled ${scheduledHours}h (${hoursDiff > 0 ? '+' : ''}${hoursDiff.toFixed(1)}h difference)`
        });
      }
    } else {
      // No shift reference or hours - flag as issue
      issues.push({
        type: 'missing_data',
        severity: 'high',
        message: 'Missing shift reference or total hours'
      });
    }

    // 4. Check for existing disputes
    const { data: workflows } = await supabase
      .from("admin_workflows")
      .select("*")
      .eq("related_entity->>entity_type", "timesheet")
      .eq("related_entity->>entity_id", timesheet_id)
      .eq("status", "pending");

    if (!workflows || workflows.length === 0) {
      validationResults.no_disputes = true;
    } else {
      issues.push({
        type: 'existing_dispute',
        severity: 'critical',
        message: `${workflows.length} pending workflow(s) related to this timesheet`
      });
    }

    // === DECISION ===
    const canAutoApprove =
      validationResults.signatures_present &&
      validationResults.gps_validated &&
      validationResults.hours_acceptable &&
      validationResults.no_disputes;

    validationResults.all_checks_passed = canAutoApprove;

    // === AUTO-APPROVE ===
    if (canAutoApprove) {
      console.log('✅ [Auto-Approval] All checks passed - approving timesheet:', timesheet_id);

      await supabase
        .from("timesheets")
        .update({
          status: 'approved',
          client_approved_at: new Date().toISOString(),
          notes: (timesheet.notes || '') + '\n[AUTO-APPROVED: All validation criteria met]'
        })
        .eq("id", timesheet_id);

      // Update shift status
      if (shift) {
        const newShiftStatus = shift.status === 'in_progress'
          ? 'awaiting_admin_closure'
          : shift.status;

        await supabase
          .from("shifts")
          .update({
            status: newShiftStatus,
            timesheet_received: true,
            timesheet_received_at: new Date().toISOString(),
            shift_journey_log: [
              ...(shift.shift_journey_log || []),
              {
                state: 'timesheet_auto_approved',
                timestamp: new Date().toISOString(),
                method: 'auto_approval_engine',
                confidence_score: 100,
                factors: ['signatures_verified', 'gps_validated', 'hours_within_threshold'],
                timesheet_submitted: true,
                gps_validated: validationResults.gps_validated,
                signatures_present: true
              }
            ]
          })
          .eq("id", shift.id);
      }

      // Send notification to staff
      if (staffMember?.email) {
        try {
          const { data: clients } = await supabase
            .from("clients")
            .select("*");
          const client = clients?.find(c => c.id === timesheet.client_id);

          await supabase.functions.invoke('send-email', {
            body: {
              to: staffMember.email,
              subject: '✅ Timesheet Approved',
              body: `Good news ${staffMember.first_name}! Your timesheet for ${client?.name || 'client'} on ${timesheet.shift_date} has been automatically approved. Payment will be processed in the next payroll cycle.`
            }
          });
        } catch (emailError) {
          console.error('Email notification failed:', emailError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'approved',
          reason: 'auto_approved',
          validation_results: validationResults,
          message: '✅ Timesheet auto-approved - all criteria met',
          timesheet_id: timesheet_id
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // === MANUAL REVIEW REQUIRED ===
    console.log('⚠️ [Auto-Approval] Failed criteria - flagging for manual review:', timesheet_id);

    // Create AdminWorkflow for manual review
    const highSeverityIssues = issues.filter(i => i.severity === 'high' || i.severity === 'critical');
    const workflowTitle = highSeverityIssues.length > 0
      ? `Timesheet Review Required - ${issues.length} issue(s)`
      : `Timesheet Pending Review`;

    const workflowDescription = issues.map(i => `${i.type}: ${i.message}`).join('\n');

    await supabase
      .from("admin_workflows")
      .insert({
        agency_id: timesheet.agency_id,
        type: 'timesheet_discrepancy',
        priority: highSeverityIssues.length > 0 ? 'high' : 'medium',
        status: 'pending',
        title: workflowTitle,
        description: workflowDescription,
        related_entity: {
          entity_type: 'timesheet',
          entity_id: timesheet_id
        },
        auto_created: true
      });

    return new Response(
      JSON.stringify({
        success: false,
        action: 'flagged_for_review',
        reason: 'validation_failed',
        validation_results: validationResults,
        issues: issues,
        message: `⚠️ Timesheet flagged for manual review (${issues.length} issue${issues.length > 1 ? 's' : ''})`,
        timesheet_id: timesheet_id
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('❌ [Auto-Approval Engine] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
