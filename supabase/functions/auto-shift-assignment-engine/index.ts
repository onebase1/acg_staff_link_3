import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * AUTO SHIFT ASSIGNMENT ENGINE
 *
 * Uber-style intelligent shift auto-assignment system.
 * Called after bulk shift creation when agency has auto_assign_shifts enabled.
 *
 * FLOW:
 * 1. Check agency setting (auto_assign_shifts)
 * 2. For each shift:
 *    a. Get day of week from shift date
 *    b. Filter staff by availability[day].includes(shift_type)
 *    c. Filter by role match
 *    d. Call AI Shift Matcher for scoring
 *    e. Auto-assign top scorer (if score >= 60)
 *    f. Create booking record
 *    g. Send notification to assigned staff
 * 3. Overflow shifts (no match) → set marketplace_visible = true
 *
 * INPUT: { shift_ids: string[], agency_id: string }
 * OUTPUT: { assigned: [...], overflow: [...], errors: [...] }
 */

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MINIMUM_SCORE_THRESHOLD = 60;
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { shift_ids, agency_id } = await req.json();

    if (!shift_ids || !Array.isArray(shift_ids) || shift_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'shift_ids array required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!agency_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'agency_id required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🤖 [Auto-Assignment] Processing ${shift_ids.length} shifts for agency ${agency_id}`);

    // Check if auto-assignment is enabled for this agency
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('settings')
      .eq('id', agency_id)
      .single();

    if (agencyError) {
      throw new Error(`Failed to get agency settings: ${agencyError.message}`);
    }

    // Check both possible field names for backwards compatibility
    const autoAssignEnabled =
      agency?.settings?.automation_settings?.auto_assign_enabled === true ||
      agency?.settings?.automation_settings?.auto_assign_shifts === true;
    // Auto-confirm mode: 'confirmed' status (no staff action needed) vs 'assigned' (staff must confirm)
    const autoConfirmMode = agency?.settings?.automation_settings?.auto_confirm_mode === true;

    if (!autoAssignEnabled) {
      console.log('⏭️ [Auto-Assignment] Feature disabled for this agency');
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: 'auto_assign_shifts disabled in agency settings',
          assigned: [],
          overflow: [],
          errors: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🔧 [Auto-Assignment] Mode: ${autoConfirmMode ? 'AUTO-CONFIRM (staff bypassed)' : 'AUTO-ASSIGN (staff must confirm)'}`);

    // Determine status based on mode
    const targetStatus = autoConfirmMode ? 'confirmed' : 'assigned';
    const bookingStatus = autoConfirmMode ? 'confirmed' : 'pending';

    // Get all shifts to process
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .in('id', shift_ids)
      .eq('status', 'open'); // Only process open shifts

    if (shiftsError) {
      throw new Error(`Failed to get shifts: ${shiftsError.message}`);
    }

    if (!shifts || shifts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No open shifts to process',
          assigned: [],
          overflow: [],
          errors: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 [Auto-Assignment] Found ${shifts.length} open shifts to process`);

    // Get all active staff for this agency
    const { data: allStaff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('agency_id', agency_id)
      .eq('status', 'active');

    if (staffError) {
      throw new Error(`Failed to get staff: ${staffError.message}`);
    }

    console.log(`👥 [Auto-Assignment] Found ${allStaff?.length || 0} active staff members`);

    const results = {
      assigned: [] as any[],
      overflow: [] as any[],
      errors: [] as any[]
    };

    // Process each shift
    for (const shift of shifts) {
      try {
        console.log(`\n🔄 [Auto-Assignment] Processing shift ${shift.id.substring(0, 8)}...`);

        // 1. Get day of week from shift date
        const shiftDate = new Date(shift.date + 'T00:00:00');
        const dayOfWeek = DAY_NAMES[shiftDate.getDay()];
        const shiftType = shift.shift_type || 'day';

        console.log(`   📅 ${dayOfWeek} ${shiftType} shift, role: ${shift.role_required}`);

        // 2. Filter staff by availability
        const availableStaff = (allStaff || []).filter(staff => {
          const dayAvailability = staff.availability?.[dayOfWeek] || [];
          const hasAvailability = dayAvailability.includes(shiftType) || dayAvailability.includes('both');
          const hasRole = staff.role === shift.role_required;
          return hasAvailability && hasRole;
        });

        console.log(`   👥 ${availableStaff.length} staff available on ${dayOfWeek} for ${shiftType}`);

        if (availableStaff.length === 0) {
          // No available staff → overflow to marketplace
          console.log(`   ⚠️ No available staff, moving to marketplace`);
          await moveToMarketplace(supabase, shift, 'no_available_staff');
          results.overflow.push({
            shift_id: shift.id,
            reason: 'no_available_staff',
            date: shift.date,
            role: shift.role_required
          });
          continue;
        }

        // 3. Call AI Shift Matcher for scoring
        const matchResult = await callAIShiftMatcher(supabase, shift.id);

        if (!matchResult.success || !matchResult.matches || matchResult.matches.length === 0) {
          console.log(`   ⚠️ AI Matcher returned no matches, moving to marketplace`);
          await moveToMarketplace(supabase, shift, 'ai_matcher_no_results');
          results.overflow.push({
            shift_id: shift.id,
            reason: 'ai_matcher_no_results',
            date: shift.date,
            role: shift.role_required
          });
          continue;
        }

        // 4. Find top scorer that is also available
        const topMatch = matchResult.matches.find((match: any) =>
          availableStaff.some(s => s.id === match.staff_id) &&
          match.total_score >= MINIMUM_SCORE_THRESHOLD
        );

        if (!topMatch) {
          console.log(`   ⚠️ No staff meets threshold (${MINIMUM_SCORE_THRESHOLD}+), moving to marketplace`);
          await moveToMarketplace(supabase, shift, 'no_qualified_match');
          results.overflow.push({
            shift_id: shift.id,
            reason: 'no_qualified_match',
            best_score: matchResult.matches[0]?.total_score || 0,
            date: shift.date,
            role: shift.role_required
          });
          continue;
        }

        // 5. Auto-assign the top scorer
        console.log(`   ✅ ${autoConfirmMode ? 'Confirming' : 'Assigning'} to ${topMatch.staff_name} (score: ${topMatch.total_score})`);

        const assignResult = await assignShiftToStaff(supabase, shift, topMatch, targetStatus, bookingStatus, autoConfirmMode);

        if (assignResult.success) {
          results.assigned.push({
            shift_id: shift.id,
            staff_id: topMatch.staff_id,
            staff_name: topMatch.staff_name,
            score: topMatch.total_score,
            date: shift.date,
            role: shift.role_required,
            mode: autoConfirmMode ? 'auto_confirmed' : 'auto_assigned'
          });

          // 6. Queue notification to staff (different message based on mode)
          await queueAssignmentNotification(supabase, shift, topMatch, autoConfirmMode);
        } else {
          results.errors.push({
            shift_id: shift.id,
            error: assignResult.error
          });
        }

      } catch (shiftError: any) {
        console.error(`   ❌ Error processing shift ${shift.id}:`, shiftError);
        results.errors.push({
          shift_id: shift.id,
          error: shiftError.message
        });
      }
    }

    // Summary
    console.log(`\n📊 [Auto-Assignment] Complete!`);
    console.log(`   ✅ Assigned: ${results.assigned.length}`);
    console.log(`   ⚠️ Overflow: ${results.overflow.length}`);
    console.log(`   ❌ Errors: ${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        summary: {
          total_processed: shifts.length,
          assigned: results.assigned.length,
          overflow: results.overflow.length,
          errors: results.errors.length
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('❌ [Auto-Assignment] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Call the AI Shift Matcher edge function
 */
async function callAIShiftMatcher(supabase: any, shiftId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('ai-shift-matcher', {
      body: { shift_id: shiftId, limit: 10 }
    });

    if (error) {
      console.error('AI Matcher error:', error);
      return { success: false, matches: [] };
    }

    return data || { success: false, matches: [] };
  } catch (e) {
    console.error('AI Matcher exception:', e);
    return { success: false, matches: [] };
  }
}

/**
 * Assign shift to staff member
 * @param targetStatus - 'assigned' (staff must confirm) or 'confirmed' (bypass)
 * @param bookingStatus - 'pending' (await confirmation) or 'confirmed' (bypass)
 * @param autoConfirmMode - true if bypassing staff confirmation
 */
async function assignShiftToStaff(
  supabase: any,
  shift: any,
  match: any,
  targetStatus: string,
  bookingStatus: string,
  autoConfirmMode: boolean
) {
  try {
    const now = new Date().toISOString();

    // Build journey log entry
    const journeyEntry: Record<string, unknown> = {
      state: targetStatus,
      timestamp: now,
      staff_id: match.staff_id,
      method: autoConfirmMode ? 'auto_confirm_engine' : 'auto_assignment_engine',
      notes: autoConfirmMode
        ? `Auto-confirmed to ${match.staff_name} (score: ${match.total_score}) - no staff action required`
        : `Auto-assigned to ${match.staff_name} (score: ${match.total_score}) - awaiting staff confirmation`
    };

    // Add confirmation deadline for assigned (not confirmed) shifts
    if (!autoConfirmMode) {
      journeyEntry.confirmation_deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    // Update shift
    const updateData: Record<string, unknown> = {
      assigned_staff_id: match.staff_id,
      status: targetStatus,
      shift_journey_log: [
        ...(shift.shift_journey_log || []),
        journeyEntry
      ]
    };

    // If auto-confirm, set confirmation fields
    if (autoConfirmMode) {
      updateData.staff_confirmed_at = now;
      updateData.staff_confirmation_method = 'auto_confirm_engine';
    }

    const { error: shiftError } = await supabase
      .from('shifts')
      .update(updateData)
      .eq('id', shift.id);

    if (shiftError) {
      throw shiftError;
    }

    // Create booking record
    const bookingData: Record<string, unknown> = {
      agency_id: shift.agency_id,
      shift_id: shift.id,
      staff_id: match.staff_id,
      client_id: shift.client_id,
      status: bookingStatus,
      booking_date: now,
      shift_date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      confirmation_method: autoConfirmMode ? 'auto_confirm' : 'auto_assignment'
    };

    if (autoConfirmMode) {
      bookingData.confirmed_by_staff_at = now;
    }

    const { error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData);

    if (bookingError) {
      console.warn('Booking creation warning:', bookingError.message);
      // Don't fail the assignment if booking fails
    }

    return { success: true };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Move shift to marketplace
 */
async function moveToMarketplace(supabase: any, shift: any, reason: string) {
  try {
    await supabase
      .from('shifts')
      .update({
        marketplace_visible: true,
        marketplace_added_at: new Date().toISOString(),
        shift_journey_log: [
          ...(shift.shift_journey_log || []),
          {
            state: 'marketplace',
            timestamp: new Date().toISOString(),
            method: 'auto_assignment_engine',
            notes: `Moved to marketplace: ${reason}`
          }
        ]
      })
      .eq('id', shift.id);
  } catch (e) {
    console.error('Error moving to marketplace:', e);
  }
}

/**
 * Queue notification to assigned staff
 * @param autoConfirmMode - true if bypassing staff confirmation (different message)
 */
async function queueAssignmentNotification(
  supabase: any,
  shift: any,
  match: any,
  autoConfirmMode: boolean
) {
  try {
    // Get staff details
    const { data: staff } = await supabase
      .from('staff')
      .select('email, phone, first_name')
      .eq('id', match.staff_id)
      .single();

    if (!staff) return;

    // Get client name
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', shift.client_id)
      .single();

    // Build message based on mode
    const message = autoConfirmMode
      ? `Hi ${staff.first_name}! You've been confirmed for a shift at ${client?.name || 'client'} on ${shift.date}. No action needed - see you there!`
      : `Hi ${staff.first_name}! You've been assigned a shift at ${client?.name || 'client'} on ${shift.date}. Reply YES to confirm or check the app. You have 24h to respond.`;

    const notificationType = autoConfirmMode ? 'shift_auto_confirmed' : 'shift_auto_assigned';

    // Queue SMS notification
    if (staff.phone) {
      await supabase.functions.invoke('send-sms', {
        body: {
          to: staff.phone,
          message: message,
          context: autoConfirmMode ? 'auto_confirm' : 'auto_assignment',
          shift_id: shift.id
        }
      });
    }

    // Log notification
    await supabase.from('notification_log').insert({
      agency_id: shift.agency_id,
      recipient_id: match.staff_id,
      recipient_type: 'staff',
      notification_type: notificationType,
      channel: staff.phone ? 'sms' : 'email',
      status: 'sent',
      context: {
        shift_id: shift.id,
        client_name: client?.name,
        date: shift.date,
        score: match.total_score,
        mode: autoConfirmMode ? 'auto_confirm' : 'auto_assign'
      }
    });

  } catch (e) {
    console.error('Notification error:', e);
  }
}

