import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * ✅ FIX 3: ENHANCED ERROR LOGGING FOR TIMESHEET CREATION
 * Auto-creates draft timesheets when shifts are assigned
 * NOW WITH: Comprehensive logging, validation checks, and detailed error messages
 *
 * Called from: Shifts.jsx after booking creation
 */

serve(async (req) => {
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
                headers: { "Content-Type": "application/json" }
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
                headers: { "Content-Type": "application/json" }
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
                headers: { "Content-Type": "application/json" }
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
                headers: { "Content-Type": "application/json" }
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
                    headers: { "Content-Type": "application/json" }
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
                headers: { "Content-Type": "application/json" }
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
                    headers: { "Content-Type": "application/json" }
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
                headers: { "Content-Type": "application/json" }
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
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log('✅ [AutoTimesheet] Rates validated: Pay £' + shift.pay_rate + '/hr, Charge £' + shift.charge_rate + '/hr');

        // ✅ CALCULATE AMOUNTS
        const staff_pay_amount = (shift.duration_hours || 0) * (shift.pay_rate || 0);
        const client_charge_amount = (shift.duration_hours || 0) * (shift.charge_rate || 0);

        console.log('💰 [AutoTimesheet] Calculated amounts:', {
            hours: shift.duration_hours,
            staff_pay: `£${staff_pay_amount.toFixed(2)}`,
            client_charge: `£${client_charge_amount.toFixed(2)}`
        });

        // ✅ CREATE DRAFT TIMESHEET
        console.log('📝 [AutoTimesheet] Creating draft timesheet...');
        const timesheetData = {
            agency_id: agency_id || shift.agency_id,
            booking_id: booking_id,
            staff_id: staff_id,
            client_id: client_id,
            shift_date: shift.date,
            work_location_within_site: shift.work_location_within_site || null,
            total_hours: shift.duration_hours || 0,
            break_duration_minutes: shift.break_duration_minutes || 0,
            pay_rate: shift.pay_rate,
            charge_rate: shift.charge_rate,
            staff_pay_amount: staff_pay_amount,
            client_charge_amount: client_charge_amount,
            status: 'draft'
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
                headers: { "Content-Type": "application/json" }
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
            headers: { "Content-Type": "application/json" }
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
            headers: { "Content-Type": "application/json" }
        });
    }
});
