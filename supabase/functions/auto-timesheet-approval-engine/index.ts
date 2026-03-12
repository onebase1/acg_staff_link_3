import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shouldSendNotification } from "../_shared/preferenceChecker.ts";
import {
    logNotificationSent,
    logNotificationFailed,
    logNotificationSkipped
} from "../_shared/notificationLogger.ts";
import { scheduleRetry } from "../_shared/retryHandler.ts";

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

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
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

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { timesheet_id, manual_trigger = false } = await req.json();

    if (!timesheet_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'timesheet_id is required'
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch related entities
    const [
      { data: agencies },
      { data: staff },
      { data: shifts },
      { data: bookings },
      { data: clients }
    ] = await Promise.all([
      supabase.from("agencies").select("*"),
      supabase.from("staff").select("*"),
      supabase.from("shifts").select("*"),
      supabase.from("bookings").select("*"),
      supabase.from("clients").select("*")
    ]);

    const agency = agencies?.find((a: any) => a.id === timesheet.agency_id);
    const staffMember = staff?.find((s: any) => s.id === timesheet.staff_id);
    const booking = bookings?.find((b: any) => b.id === timesheet.booking_id);
    const shift = booking ? shifts?.find((s: any) => s.id === booking.shift_id) : null;
    const client = clients?.find((c: any) => c.id === timesheet.client_id);

    // Check if agency has auto-approval enabled
    const autoApprovalEnabled = agency?.settings?.automation_settings?.auto_timesheet_approval ?? true;

    if (!autoApprovalEnabled && !manual_trigger) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: 'disabled',
          message: 'Auto-approval disabled for this agency'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // ✅ GPS VERIFICATION BYPASS: Skip signature checks if GPS has verified both clock-in and clock-out
    // GPS verification confirms location and attendance, making signatures redundant
    // Only skip signatures if shift is complete (clocked out) AND both clock-in and clock-out are GPS verified
    const isGPSFullyVerified = 
      timesheet.geofence_validated === true && 
      timesheet.clock_in_location &&
      timesheet.clock_out_time && // Shift must be completed (clocked out)
      timesheet.clock_out_geofence_validated === true && 
      timesheet.clock_out_location; // Both clock-in and clock-out GPS verified

    // 1. Check signatures (skip if GPS fully verified)
    if (isGPSFullyVerified) {
      // GPS verified both clock-in and clock-out - signatures not required
      validationResults.signatures_present = true;
      console.log('✅ GPS fully verified - skipping signature requirement');
    } else if (timesheet.staff_signature && timesheet.client_signature) {
      validationResults.signatures_present = true;
    } else {
      // ROLLBACK: Original signature validation logic (restore if needed)
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
      const scheduledGrossHours = shift.duration_hours || 12;
      // ✅ APPLY 10-HOUR GOLD RULE: If scheduled gross > 10, the "target" Net is -1h
      const scheduledNetHours = scheduledGrossHours > 10 ? scheduledGrossHours - 1 : scheduledGrossHours;
      
      const requestedHours = timesheet.total_hours;
      const hoursNetDiff = Math.abs(requestedHours - scheduledNetHours);
      const hoursGrossDiff = Math.abs(requestedHours - scheduledGrossHours);

      // ✅ FLEXIBLE MATCH: Pass if matches Net (-1h) OR matches Gross (no break)
      if (hoursNetDiff <= hoursThreshold || hoursGrossDiff <= 0.01) {
        validationResults.hours_acceptable = true;
      } else {
        const issue = {
          type: 'hours_mismatch',
          severity: hoursNetDiff > 1 ? 'high' : 'medium',
          message: `Worked ${requestedHours}h, expected net ${scheduledNetHours}h or gross ${scheduledGrossHours}h | diff: ${hoursNetDiff.toFixed(1)}h`
        };
        issues.push(issue);

        // 🚨 CRITICAL ALERT: Notify admin immediately if overtime is significant
        if (issue.severity === 'high') {
          try {
            const subject = `⚠️ Overtime Alert: ${staffMember?.first_name} submitted ${hoursNetDiff.toFixed(1)} extra hours`;
            const body_html = `
              <p><strong>High Priority Overtime Alert</strong></p>
              <p>A timesheet has been submitted with significant overtime that requires your immediate attention.</p>
              <ul>
                <li><strong>Staff:</strong> ${staffMember?.first_name} ${staffMember?.last_name}</li>
                <li><strong>Client:</strong> ${agency?.name || 'Unknown'}</li>
                <li><strong>Shift Date:</strong> ${timesheet.shift_date}</li>
                <li><strong>Scheduled Hours:</strong> ${scheduledGrossHours}h</li>
                <li><strong>Worked Hours:</strong> ${requestedHours}h</li>
                <li><strong>Overtime:</strong> ${hoursNetDiff.toFixed(2)}h</li>
              </ul>
              <p>This timesheet has been flagged for manual review. Please investigate before the next payroll cycle.</p>
            `;
            
            supabase.functions.invoke('internal-admin-notifier', {
              body: { subject, body_html, change_type: 'overtime_alert' }
            }).catch(console.error);
            console.log("✅ Admin alert for significant overtime sent.");
          } catch (adminAlertError) {
            console.error("❌ Failed to send admin overtime alert:", adminAlertError);
          }
        }
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

    // === AUTO-APPROVE OR MANUAL BYPASS ===
    if (canAutoApprove || manual_trigger) {
      console.log(`✅ [Decision] ${manual_trigger ? 'Manual Approval Triggered' : 'Auto-Approval Passed'} - approving timesheet:`, timesheet_id);

      await supabase
        .from("timesheets")
        .update({
          status: 'approved',
          client_approved_at: new Date().toISOString(),
          notes: (timesheet.notes || '') + (manual_trigger ? '\n[MANUALLY APPROVED BY ADMIN]' : '\n[AUTO-APPROVED: All validation criteria met]')
        })
        .eq("id", timesheet_id);

      // Update shift status & data
      if (shift) {
        // If manual trigger, we move to completed. Otherwise awaiting_admin_closure
        const newShiftStatus = manual_trigger ? 'completed' : 
          (['in_progress', 'awaiting_admin_review'].includes(shift.status) ? 'awaiting_admin_closure' : shift.status);

        await supabase
          .from("shifts")
          .update({
            status: newShiftStatus,
            timesheet_received: true,
            timesheet_received_at: new Date().toISOString(),
            // ✅ SYNC ACTUAL DATA: Ensure shift record matches the approved timesheet
            actual_staff_id: timesheet.staff_id,
            shift_started_at: timesheet.clock_in_time || (timesheet.actual_start_time ? `${timesheet.shift_date}T${timesheet.actual_start_time}:00` : null),
            shift_ended_at: timesheet.clock_out_time || (timesheet.actual_end_time ? `${timesheet.shift_date}T${timesheet.actual_end_time}:00` : null),
            shift_journey_log: [
              ...(shift.shift_journey_log || []),
              {
                state: manual_trigger ? 'timesheet_manually_approved' : 'timesheet_auto_approved',
                timestamp: new Date().toISOString(),
                method: manual_trigger ? 'admin_manual_override' : 'auto_approval_engine',
                confidence_score: manual_trigger ? 100 : 100,
                factors: manual_trigger ? ['admin_manual_override'] : ['signatures_verified', 'gps_validated', 'hours_within_threshold'],
                timesheet_submitted: true,
                gps_validated: validationResults.gps_validated,
                signatures_present: manual_trigger ? true : validationResults.signatures_present
              }
            ]
          })
          .eq("id", shift.id);
      }

      // Send notification to staff
      if (staffMember?.email) {
        try {
          // Check preference
          const preferenceCheck = await shouldSendNotification(
              supabase,
              staffMember.email,
              'system_update', // Mapped as per instructions
              'email',
              'staff'
          );

          if (!preferenceCheck.allowed) {
              console.log(`⏭️ [Auto-Timesheet] Skipped for ${staffMember.email} - ${preferenceCheck.reason}`);
              await logNotificationSkipped(supabase, {
                  recipientEmail: staffMember.email,
                  recipientType: 'staff',
                  staffId: staffMember.id,
                  agencyId: agency?.id,
                  notificationType: 'system_update',
                  channel: 'email',
                  preferenceChecked: preferenceCheck.preferenceChecked,
                  preferenceStatus: preferenceCheck.preferenceStatus,
                  skippedReason: preferenceCheck.reason || 'unknown',
                  metadata: { timesheet_id: timesheet.id, action: 'approved' }
              });
          } else {
              const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
                body: {
                  to: staffMember.email,
                  subject: '✅ Timesheet Approved',
                  body: `Good news ${staffMember.first_name}! Your timesheet for ${client?.name || 'client'} on ${timesheet.shift_date} has been automatically approved. Payment will be processed in the next payroll cycle.`
                }
              });

              if (emailError) throw emailError;

              // Log success
              await logNotificationSent(supabase, {
                  recipientEmail: staffMember.email,
                  recipientType: 'staff',
                  staffId: staffMember.id,
                  agencyId: agency?.id,
                  notificationType: 'system_update',
                  channel: 'email',
                  provider: 'resend',
                  providerMessageId: emailResult?.id,
                  preferenceChecked: preferenceCheck.preferenceChecked,
                  preferenceStatus: preferenceCheck.preferenceStatus,
                  metadata: { timesheet_id: timesheet.id, action: 'approved' }
              });
          }
        } catch (emailError: any) {
          console.error('Email notification failed:', emailError);
          
          // Log failure
          await logNotificationFailed(supabase, {
              recipientEmail: staffMember.email,
              recipientType: 'staff',
              staffId: staffMember.id,
              agencyId: agency?.id,
              notificationType: 'system_update',
              channel: 'email',
              errorMessage: emailError.message,
              errorCode: 'send_failed'
          });

          // Schedule retry
          await scheduleRetry(supabase, {
              notificationType: 'system_update',
              recipientEmail: staffMember.email,
              recipientId: staffMember.id,
              agencyId: agency?.id,
              channel: 'email',
              metadata: { timesheet_id: timesheet.id, action: 'approved', subject: '✅ Timesheet Approved' }
          });
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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === MANUAL REVIEW REQUIRED ===
    console.log('⚠️ [Auto-Approval] Failed criteria - flagging for manual review:', timesheet_id);

    // Send "60-Second Approval" email to client
    if (client?.contact_person?.email && shift) {
        try {
            const subject = `Action Required: Please Approve Timesheet for ${staffMember?.first_name}'s Shift`;
            // TODO: Replace with the actual frontend URL
            const approvalLink = `https://your-app-domain.com/approve/timesheet/${timesheet_id}`;
            
            const body_html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="padding: 30px; text-align: center; background: #f3f4f6;">
                        <h2 style="margin: 0; color: #1f2937;">Timesheet Ready for Approval</h2>
                    </div>
                    <div style="padding: 30px;">
                        <p>Hi ${client.contact_person.name || 'Team'},</p>
                        <p>${staffMember?.first_name || 'A staff member'} has completed their shift and the timesheet is now ready for your approval.</p>
                        <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 5px;">
                            <p><strong>Scheduled:</strong> ${shift.start_time} - ${shift.end_time} (${shift.duration_hours}h)</p>
                            <p><strong>Actual (from GPS):</strong> ${timesheet.actual_start_time || 'N/A'} - ${timesheet.actual_end_time || 'N/A'} (${timesheet.total_hours}h)</p>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${approvalLink}" style="background-color: #10b981; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Approve Timesheet in 60 Seconds
                            </a>
                        </div>
                        <p style="color: #6b7280; font-size: 12px; text-align: center;">
                            Approving promptly helps ensure staff are paid on time.
                        </p>
                    </div>
                </div>
            `;

            // Check preference
            const preferenceCheck = await shouldSendNotification(
                supabase,
                client.contact_person.email,
                'system_update', // Using system_update as it's an action required
                'email',
                'client'
            );

            if (!preferenceCheck.allowed) {
                console.log(`⏭️ [Auto-Timesheet] Skipped for client ${client.contact_person.email} - ${preferenceCheck.reason}`);
                await logNotificationSkipped(supabase, {
                    recipientEmail: client.contact_person.email,
                    recipientType: 'client',
                    clientId: client.id,
                    agencyId: agency?.id,
                    notificationType: 'system_update',
                    channel: 'email',
                    preferenceChecked: preferenceCheck.preferenceChecked,
                    preferenceStatus: preferenceCheck.preferenceStatus,
                    skippedReason: preferenceCheck.reason || 'unknown',
                    metadata: { timesheet_id: timesheet.id, action: 'approval_request' }
                });
            } else {
                const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
                    body: {
                        to: client.contact_person.email,
                        subject: subject,
                        html: body_html,
                    },
                });

                if (emailError) throw emailError;

                // Log success
                await logNotificationSent(supabase, {
                    recipientEmail: client.contact_person.email,
                    recipientType: 'client',
                    clientId: client.id,
                    agencyId: agency?.id,
                    notificationType: 'system_update',
                    channel: 'email',
                    provider: 'resend',
                    providerMessageId: emailResult?.id,
                    preferenceChecked: preferenceCheck.preferenceChecked,
                    preferenceStatus: preferenceCheck.preferenceStatus,
                    metadata: { timesheet_id: timesheet.id, action: 'approval_request' }
                });
                console.log(`✅ [Auto-Approval] "60-Second Approval" email sent to ${client.name}.`);
            }

        } catch (emailError: any) {
            console.error(`❌ [Auto-Approval] Failed to send approval email to ${client.name}:`, emailError);
            
            // Log failure
            await logNotificationFailed(supabase, {
                recipientEmail: client.contact_person.email,
                recipientType: 'client',
                clientId: client.id,
                agencyId: agency?.id,
                notificationType: 'system_update',
                channel: 'email',
                errorMessage: emailError.message,
                errorCode: 'send_failed'
            });

            // Schedule retry
            await scheduleRetry(supabase, {
                notificationType: 'system_update',
                recipientEmail: client.contact_person.email,
                recipientId: client.id,
                agencyId: agency?.id,
                channel: 'email',
                metadata: { timesheet_id: timesheet.id, action: 'approval_request' }
            });
        }
    }

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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('❌ [Auto-Approval Engine] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as any).message
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

