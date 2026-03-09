import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadTemplate } from "../_shared/templateLoader.ts";

/**
 * 🚫 STAFF SELF-DECLINE SHIFT
 *
 * Allows staff members to decline/remove themselves from assigned shifts
 *
 * Features:
 * - Multi-channel unassignment notification (Email + SMS + WhatsApp)
 * - Automatic timesheet cleanup
 * - Conditional automation based on time-until-shift
 * - Audit trail in shift_journey_log
 *
 * Conditional Logic:
 * - <24h: Set urgency='high', trigger urgent broadcast, add to marketplace
 * - >24h: Try auto-assignment OR add to marketplace (based on agency settings)
 *
 * Called from: Staff Portal (MyShifts.jsx or StaffPortal.jsx)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('🚫 [Staff Decline] Function invoked');

  try {
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ [Staff Decline] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ [Staff Decline] Auth failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { shift_id, staff_id, hours_until_shift, decline_reason } = await req.json();

    console.log('📋 [Staff Decline] Request:', {
      shift_id: shift_id?.substring(0, 8),
      staff_id: staff_id?.substring(0, 8),
      hours_until_shift,
      decline_reason: decline_reason?.substring(0, 50)
    });

    // ============================================================================
    // STEP 1: VALIDATION
    // ============================================================================

    if (!shift_id) {
      return new Response(
        JSON.stringify({ error: 'shift_id is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!staff_id) {
      return new Response(
        JSON.stringify({ error: 'staff_id is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch shift
    console.log('🔍 [Staff Decline] Fetching shift...');
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', shift_id)
      .single();

    if (shiftError || !shift) {
      console.error('❌ [Staff Decline] Shift not found:', shiftError);
      return new Response(
        JSON.stringify({ error: 'Shift not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify staff owns this shift
    if (shift.assigned_staff_id !== staff_id) {
      console.error('❌ [Staff Decline] Unauthorized: Staff does not own shift');
      console.error(`   Shift assigned to: ${shift.assigned_staff_id}`);
      console.error(`   Requesting staff: ${staff_id}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: This shift is not assigned to you' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent decline if shift already started/past
    if (hours_until_shift !== undefined && hours_until_shift < 0) {
      console.error('❌ [Staff Decline] Cannot decline past shift');
      return new Response(
        JSON.stringify({ error: 'Cannot decline a shift that has already started or ended' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if timesheet already submitted/approved
    console.log('🔍 [Staff Decline] Checking for submitted timesheets...');
    const { data: timesheets } = await supabase
      .from('timesheets')
      .select('id, status')
      .eq('staff_id', staff_id)
      .eq('shift_date', shift.date)
      .eq('client_id', shift.client_id);

    if (timesheets && timesheets.length > 0) {
      const hasSubmitted = timesheets.some(t =>
        ['submitted', 'approved', 'paid', 'invoiced'].includes(t.status)
      );
      if (hasSubmitted) {
        console.error('❌ [Staff Decline] Cannot decline: Timesheet already submitted');
        return new Response(
          JSON.stringify({ error: 'Cannot decline: Timesheet already submitted or approved' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log('✅ [Staff Decline] Validation passed');

    // ============================================================================
    // STEP 2: FETCH RELATED DATA
    // ============================================================================

    console.log('🔍 [Staff Decline] Fetching related data...');

    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', staff_id)
      .single();

    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', shift.client_id)
      .single();

    const { data: agency } = await supabase
      .from('agencies')
      .select('*')
      .eq('id', shift.agency_id)
      .single();

    if (!staff) {
      console.error('❌ [Staff Decline] Staff not found');
      return new Response(
        JSON.stringify({ error: 'Staff member not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('✅ [Staff Decline] Data fetched:', {
      staff: `${staff.first_name} ${staff.last_name}`,
      client: client?.name,
      agency: agency?.name
    });

    // ============================================================================
    // STEP 3: SEND UNASSIGNMENT NOTIFICATION TO STAFF
    // ============================================================================

    console.log('📧 [Staff Decline] Sending unassignment notification...');

    try {
      const { error: notifyError } = await supabase.functions.invoke('critical-change-notifier', {
        body: {
          change_type: 'shift_reassigned',
          staff_email: staff.email,
          staff_name: `${staff.first_name} ${staff.last_name}`,
          client_name: client?.name || 'Unknown Client',
          shift_date: shift.date,
          shift_time: `${shift.start_time} - ${shift.end_time}`,
          reason: `You declined this shift. ${decline_reason ? `Reason: ${decline_reason}` : ''}`,
          agency_id: shift.agency_id
        }
      });

      if (notifyError) {
        console.error('⚠️ [Staff Decline] Notification failed (non-blocking):', notifyError);
      } else {
        console.log('✅ [Staff Decline] Notification sent to staff');
      }
    } catch (notifyException) {
      console.error('⚠️ [Staff Decline] Notification exception (non-blocking):', notifyException);
    }

    // ============================================================================
    // STEP 4: UPDATE SHIFT STATUS
    // ============================================================================

    console.log('🔄 [Staff Decline] Updating shift status...');

    const { error: updateError } = await supabase
      .from('shifts')
      .update({
        status: 'open',
        assigned_staff_id: null,
        staff_confirmed_at: null,
        staff_confirmation_method: null,
        shift_journey_log: [
          ...(shift.shift_journey_log || []),
          {
            state: 'open',
            timestamp: new Date().toISOString(),
            staff_id: staff_id,
            method: 'staff_self_decline',
            notes: `Staff declined shift. ${decline_reason ? `Reason: ${decline_reason}` : 'No reason provided'}`
          }
        ]
      })
      .eq('id', shift_id);

    if (updateError) {
      console.error('❌ [Staff Decline] Failed to update shift:', updateError);
      return new Response(
        JSON.stringify({ error: `Failed to update shift: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('✅ [Staff Decline] Shift status updated to open');

    // ============================================================================
    // STEP 5: CLEAN UP ORPHANED TIMESHEETS
    // ============================================================================

    console.log('🗑️ [Staff Decline] Cleaning up orphaned timesheets...');

    const { data: orphanedTimesheets } = await supabase
      .from('timesheets')
      .select('id, status')
      .eq('staff_id', staff_id)
      .eq('shift_date', shift.date)
      .eq('client_id', shift.client_id)
      .in('status', ['draft', 'pending']);

    if (orphanedTimesheets && orphanedTimesheets.length > 0) {
      const { error: deleteError } = await supabase
        .from('timesheets')
        .delete()
        .in('id', orphanedTimesheets.map(t => t.id));

      if (deleteError) {
        console.error('⚠️ [Staff Decline] Failed to delete timesheets (non-blocking):', deleteError);
      } else {
        console.log(`✅ [Staff Decline] Deleted ${orphanedTimesheets.length} orphaned timesheet(s)`);
      }
    } else {
      console.log('ℹ️ [Staff Decline] No orphaned timesheets found');
    }

    // ============================================================================
    // STEP 6: DELETE BOOKING RECORD
    // ============================================================================

    console.log('🗑️ [Staff Decline] Deleting booking record...');

    const { data: bookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('shift_id', shift_id)
      .eq('staff_id', staff_id);

    if (bookings && bookings.length > 0) {
      const { error: deleteBookingError } = await supabase
        .from('bookings')
        .delete()
        .in('id', bookings.map(b => b.id));

      if (deleteBookingError) {
        console.error('⚠️ [Staff Decline] Failed to delete bookings (non-blocking):', deleteBookingError);
      } else {
        console.log(`✅ [Staff Decline] Deleted ${bookings.length} booking record(s)`);
      }
    } else {
      console.log('ℹ️ [Staff Decline] No booking records found');
    }

    // ============================================================================
    // STEP 7: CONDITIONAL AUTOMATION BASED ON TIME UNTIL SHIFT
    // ============================================================================

    let actionTaken = 'none';

    if (hours_until_shift !== undefined && hours_until_shift < 24) {
      // 🚨 URGENT PATH (<24 hours)
      console.log(`🚨 [Staff Decline] URGENT: ${hours_until_shift.toFixed(1)}h until shift. Broadcasting...`);

      // Set urgency and add to marketplace
      const { error: urgentError } = await supabase
        .from('shifts')
        .update({
          urgency: 'high',
          marketplace_visible: true,
          marketplace_added_at: new Date().toISOString()
        })
        .eq('id', shift_id);

      if (urgentError) {
        console.error('⚠️ [Staff Decline] Failed to set urgency (non-blocking):', urgentError);
      } else {
        console.log('✅ [Staff Decline] Shift marked as urgent and added to marketplace');
      }

      // 📉 NEW: Log penalty for late cancellation
      console.log('📉 [Staff Decline] Logging penalty for late cancellation...');
      const { error: penaltyError } = await supabase
        .from('score_history')
        .insert({
          staff_id,
          agency_id: shift.agency_id,
          change_amount: -15,
          change_reason: `Late cancellation (${hours_until_shift.toFixed(1)}h before shift)`,
          related_shift_id: shift_id
        });

      if (penaltyError) {
        console.error('⚠️ [Staff Decline] Failed to log penalty (non-blocking):', penaltyError);
      } else {
        // Update last_incident_date to trigger decay logic
        await supabase
          .from('staff')
          .update({ last_incident_date: new Date().toISOString() })
          .eq('id', staff_id);
        console.log('✅ [Staff Decline] Penalty logged and staff record updated');
      }

      // Trigger urgent broadcast (non-blocking)
      try {
        supabase.functions.invoke('auto-urgent-digest-broadcaster', {
          body: { shift_id }
        }).catch(err => console.error('⚠️ Urgent broadcast failed:', err));

        console.log('✅ [Staff Decline] Urgent broadcast triggered');
        actionTaken = 'urgent_broadcast';
      } catch (broadcastError) {
        console.error('⚠️ [Staff Decline] Broadcast error (non-blocking):', broadcastError);
      }

    } else {
      // ⏰ NORMAL PATH (>24 hours or time unknown)
      console.log('⏰ [Staff Decline] >24h until shift. Checking agency settings...');

      const { data: agencySettings } = await supabase
        .from('agency_settings')
        .select('auto_assignment_enabled, marketplace_enabled')
        .eq('agency_id', shift.agency_id)
        .single();

      console.log('📋 [Staff Decline] Agency settings:', agencySettings);

      if (agencySettings?.auto_assignment_enabled) {
        // Try auto-assignment first
        console.log('🤖 [Staff Decline] Auto-assignment enabled. Triggering matcher...');

        try {
          supabase.functions.invoke('auto-shift-assignment-engine', {
            body: { 
              shift_ids: [shift_id], 
              agency_id: shift.agency_id,
              exclude_staff_ids: [staff_id] 
            }
          }).catch(err => console.error('⚠️ Auto-assignment failed:', err));

          console.log('✅ [Staff Decline] Auto-assignment triggered');
          actionTaken = 'auto_assignment';
        } catch (assignError) {
          console.error('⚠️ [Staff Decline] Auto-assignment error (non-blocking):', assignError);
        }

      } else if (agencySettings?.marketplace_enabled) {
        // Add to marketplace
        console.log('🛒 [Staff Decline] Marketplace enabled. Adding shift...');

        const { error: marketplaceError } = await supabase
          .from('shifts')
          .update({
            marketplace_visible: true,
            marketplace_added_at: new Date().toISOString()
          })
          .eq('id', shift_id);

        if (marketplaceError) {
          console.error('⚠️ [Staff Decline] Failed to add to marketplace (non-blocking):', marketplaceError);
        } else {
          console.log('✅ [Staff Decline] Shift added to marketplace');
          actionTaken = 'marketplace';
        }

      } else {
        // Neither enabled - just leave as open
        console.log('ℹ️ [Staff Decline] No automation enabled. Shift left as open.');
        actionTaken = 'left_open';
      }
    }

    // ============================================================================
    // STEP 8: NOTIFY AGENCY ADMIN (OPTIONAL)
    // ============================================================================

    if (agency?.email) {
      console.log('📧 [Staff Decline] Notifying agency admin...');

      try {
        // ✅ Use template system for branded email
        const actionDescription =
          actionTaken === 'urgent_broadcast' ? 'Shift marked as URGENT and broadcast sent to all staff' :
          actionTaken === 'auto_assignment' ? 'Auto-assignment engine triggered to find replacement staff' :
          actionTaken === 'marketplace' ? 'Shift added to marketplace for staff to claim' :
          'Shift returned to open status';

        const emailHtml = await loadTemplate('staff_decline_admin', {
          agency_name: agency.name || 'Your Agency',
          agency_email: agency.email,
          staff_name: `${staff.first_name} ${staff.last_name}`,
          client_name: client?.name || 'Unknown Client',
          shift_date: shift.date,
          shift_time: `${shift.start_time} - ${shift.end_time}`,
          decline_reason: decline_reason || 'No reason provided',
          hours_until_shift: hours_until_shift ? Math.round(hours_until_shift).toString() : 'Unknown',
          action_description: actionDescription
        });

        supabase.functions.invoke('send-email', {
          body: {
            to: agency.email,
            subject: `⚠️ Staff Declined Shift - ${shift.date}`,
            html: emailHtml
          }
        }).catch(err => console.error('⚠️ Admin email failed:', err));

        console.log('✅ [Staff Decline] Admin notification sent');
      } catch (emailError) {
        console.error('⚠️ [Staff Decline] Admin email error (non-blocking):', emailError);
      }
    }

    // ============================================================================
    // RETURN SUCCESS
    // ============================================================================

    console.log('✅ [Staff Decline] Complete. Action taken:', actionTaken);

    return new Response(JSON.stringify({
      success: true,
      message: 'Shift declined successfully',
      action_taken: actionTaken,
      shift_id: shift_id,
      hours_until_shift: hours_until_shift
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('❌ [Staff Decline] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
