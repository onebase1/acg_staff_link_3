import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * ✅ AUTO-TIMESHEET CREATOR
 * Auto-creates draft timesheets when shifts are confirmed
 * Features:
 * - Comprehensive logging and validation
 * - Default shift times rounded to 30-minute intervals
 * - Day/night shift pattern detection
 * - Editable by admin when completing shift
 *
 * Called from: Shifts.jsx, StaffPortal.jsx after shift confirmation
 */

/**
 * Round time to nearest 30-minute interval
 * @param timeString - Time in HH:MM:SS format
 * @returns Time rounded to :00 or :30 (e.g., "08:00", "14:30")
 */
function roundToHalfHour(timeString: string): string {
    if (!timeString) return "00:00";

    const [hours, minutes] = timeString.split(':').map(Number);
    const roundedMinutes = minutes < 15 ? 0 : (minutes < 45 ? 30 : 0);
    const roundedHours = minutes >= 45 ? (hours + 1) % 24 : hours;

    return `${String(roundedHours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
}

/**
 * Determine if shift is a night shift based on start time
 * @param startTime - Shift start time
 * @returns true if night shift (starts between 18:00 and 06:00)
 */
function isNightShift(startTime: string): boolean {
    if (!startTime) return false;

    const hour = parseInt(startTime.split(':')[0]);
    return hour >= 18 || hour < 6;
}

/**
 * Get default shift times based on shift pattern
 * Returns times rounded to 30-minute intervals
 * @param shift - Shift data with start_time, end_time, duration_hours
 * @returns Object with actual_start_time and actual_end_time
 */
function getDefaultShiftTimes(shift: any): { actual_start_time: string; actual_end_time: string } {
    // If shift has specific times, use them (rounded)
    if (shift.start_time && shift.end_time) {
        return {
            actual_start_time: roundToHalfHour(shift.start_time),
            actual_end_time: roundToHalfHour(shift.end_time)
        };
    }

    // Otherwise, use standard patterns based on shift type
    const isNight = isNightShift(shift.start_time || "08:00");

    if (isNight) {
        // Night shift: 20:00 - 08:00 (12 hours)
        return {
            actual_start_time: "20:00",
            actual_end_time: "08:00"
        };
    } else {
        // Day shift: 08:00 - 20:00 (12 hours)
        return {
            actual_start_time: "08:00",
            actual_end_time: "20:00"
        };
    }
}

// CORS headers for all responses
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    console.log('📄 [AutoTimesheet] Function invoked');

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const payload = await req.json();

        console.log('📋 [AutoTimesheet] Payload received:', JSON.stringify(payload, null, 2));

        // ✅ VALIDATION: Check required fields
        const { booking_id, shift_id, staff_id, client_id, agency_id } = payload;

        if (!booking_id) {
            console.error('❌ [AutoTimesheet] VALIDATION FAILED: booking_id missing');
            return new Response(JSON.stringify({
                success: false,
                message: 'booking_id is required',
                error: 'Missing required field: booking_id'
            }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        if (!shift_id) {
            console.error('❌ [AutoTimesheet] VALIDATION FAILED: shift_id missing');
            return new Response(JSON.stringify({
                success: false,
                message: 'shift_id is required',
                error: 'Missing required field: shift_id'
            }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        if (!staff_id) {
            console.error('❌ [AutoTimesheet] VALIDATION FAILED: staff_id missing');
            return new Response(JSON.stringify({
                success: false,
                message: 'staff_id is required',
                error: 'Missing required field: staff_id'
            }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        if (!client_id) {
            console.error('❌ [AutoTimesheet] VALIDATION FAILED: client_id missing');
            return new Response(JSON.stringify({
                success: false,
                message: 'client_id is required',
                error: 'Missing required field: client_id'
            }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        console.log('✅ [AutoTimesheet] Validation passed - all required fields present');

        // ✅ FETCH SHIFT DATA
        console.log(`🔍 [AutoTimesheet] Fetching shift: ${shift_id}`);
        let shift;
        try {
            const { data: shifts } = await supabase
                .from("shifts")
                .select("*")
                .eq("id", shift_id);

            if (!shifts || shifts.length === 0) {
                console.error('❌ [AutoTimesheet] Shift not found:', shift_id);
                return new Response(JSON.stringify({
                    success: false,
                    message: 'Shift not found',
                    error: `Shift with id ${shift_id} does not exist`
                }), {
                    status: 404,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
            shift = shifts[0];
            console.log('✅ [AutoTimesheet] Shift loaded:', {
                date: shift.date,
                start_time: shift.start_time,
                end_time: shift.end_time,
                duration_hours: shift.duration_hours,
                pay_rate: shift.pay_rate,
                charge_rate: shift.charge_rate,
                work_location: shift.work_location_within_site
            });
        } catch (shiftError) {
            console.error('❌ [AutoTimesheet] Error fetching shift:', shiftError);
            return new Response(JSON.stringify({
                success: false,
                message: 'Failed to fetch shift data',
                error: shiftError.message
            }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // ✅ CHECK FOR EXISTING TIMESHEET (prevent duplicates)
        console.log(`🔍 [AutoTimesheet] Checking for existing timesheet for booking: ${booking_id}`);
        try {
            const { data: existingTimesheets } = await supabase
                .from("timesheets")
                .select("*")
                .eq("booking_id", booking_id);

            if (existingTimesheets && existingTimesheets.length > 0) {
                console.warn('⚠️ [AutoTimesheet] Timesheet already exists for this booking:', existingTimesheets[0].id);
                return new Response(JSON.stringify({
                    success: true,
                    message: 'Timesheet already exists',
                    timesheet_id: existingTimesheets[0].id,
                    duplicate: true
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
            console.log('✅ [AutoTimesheet] No existing timesheet found - proceeding with creation');
        } catch (checkError) {
            console.error('❌ [AutoTimesheet] Error checking for existing timesheet:', checkError);
            // Continue anyway - better to create duplicate than fail
        }

        // ✅ VALIDATE RATES
        if (!shift.pay_rate || shift.pay_rate === 0) {
            console.error('❌ [AutoTimesheet] VALIDATION FAILED: pay_rate is zero or missing');
            return new Response(JSON.stringify({
                success: false,
                message: 'Shift has no pay rate configured',
                error: 'pay_rate is required and must be greater than 0'
            }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        if (!shift.charge_rate || shift.charge_rate === 0) {
            console.error('❌ [AutoTimesheet] VALIDATION FAILED: charge_rate is zero or missing');
            return new Response(JSON.stringify({
                success: false,
                message: 'Shift has no charge rate configured',
                error: 'charge_rate is required and must be greater than 0'
            }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        console.log('✅ [AutoTimesheet] Rates validated: Pay £' + shift.pay_rate + '/hr, Charge £' + shift.charge_rate + '/hr');

        // ✅ GET DEFAULT SHIFT TIMES (rounded to 30-minute intervals)
        const defaultTimes = getDefaultShiftTimes(shift);
        console.log('🕐 [AutoTimesheet] Default shift times:', defaultTimes);

        // ✅ CALCULATE AMOUNTS (accounting for break time)
        const breakHours = (shift.break_duration_minutes || 60) / 60;
        const billableHours = Math.max(0, (shift.duration_hours || 0) - breakHours);
        const staff_pay_amount = billableHours * (shift.pay_rate || 0);
        const client_charge_amount = billableHours * (shift.charge_rate || 0);

        console.log('💰 [AutoTimesheet] Calculated amounts:', {
            total_hours: shift.duration_hours,
            break_hours: breakHours,
            billable_hours: billableHours,
            staff_pay: `£${staff_pay_amount.toFixed(2)}`,
            client_charge: `£${client_charge_amount.toFixed(2)}`
        });

        // ✅ CREATE DRAFT TIMESHEET WITH DEFAULT TIMES
        // These times are rounded to 30-minute intervals and can be edited by admin
        // when completing the shift after receiving actual timesheet/OCR data
        console.log('📝 [AutoTimesheet] Creating draft timesheet with default times...');
        const timesheetData = {
            agency_id: agency_id || shift.agency_id,
            booking_id: booking_id,
            staff_id: staff_id,
            client_id: client_id,
            shift_id: shift_id,
            shift_date: shift.date,
            work_location_within_site: shift.work_location_within_site || null,
            total_hours: shift.duration_hours || 0,
            break_duration_minutes: shift.break_duration_minutes || 0,
            pay_rate: shift.pay_rate,
            charge_rate: shift.charge_rate,
            staff_pay_amount: staff_pay_amount,
            client_charge_amount: client_charge_amount,
            status: 'draft',
            // Default times rounded to 30-minute intervals
            // Admin will update these with actual times when completing shift
            actual_start_time: defaultTimes.actual_start_time,
            actual_end_time: defaultTimes.actual_end_time
        };

        console.log('📋 [AutoTimesheet] Timesheet data prepared:', JSON.stringify(timesheetData, null, 2));

        let newTimesheet;
        try {
            const { data, error: createError } = await supabase
                .from("timesheets")
                .insert(timesheetData)
                .select()
                .single();

            if (createError) {
                throw createError;
            }

            newTimesheet = data;
            console.log('✅ [AutoTimesheet] SUCCESS! Draft timesheet created:', newTimesheet.id);
        } catch (createError) {
            console.error('❌ [AutoTimesheet] CRITICAL ERROR creating timesheet:', createError);
            console.error('❌ [AutoTimesheet] Error stack:', createError.stack);
            return new Response(JSON.stringify({
                success: false,
                message: 'Failed to create timesheet in database',
                error: createError.message,
                stack: createError.stack,
                attempted_data: timesheetData
            }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // ✅ SUCCESS RESPONSE
        return new Response(JSON.stringify({
            success: true,
            message: 'Draft timesheet created successfully',
            timesheet_id: newTimesheet.id,
            timesheet: {
                id: newTimesheet.id,
                status: newTimesheet.status,
                shift_date: newTimesheet.shift_date,
                total_hours: newTimesheet.total_hours,
                staff_pay_amount: newTimesheet.staff_pay_amount,
                client_charge_amount: newTimesheet.client_charge_amount
            }
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('❌ [AutoTimesheet] FATAL UNCAUGHT ERROR:', error);
        console.error('❌ [AutoTimesheet] Error stack:', error.stack);
        return new Response(JSON.stringify({
            success: false,
            message: 'Unexpected error in timesheet creation',
            error: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
