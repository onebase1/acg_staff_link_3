import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function fixMissingTimesheets() {
    console.log('🔄 Fixing missing bookings and timesheets for Chadaira...');

    const shiftsToFix = [
        '3a5a9d58-163f-42f0-8762-4fe0137a50f6', // Feb 27
        '7a42147b-ea06-4812-b34f-08428d49d610'  // Feb 26
    ];

    for (const shiftId of shiftsToFix) {
        const { data: shift, error: shiftErr } = await supabase.from('shifts').select('*').eq('id', shiftId).single();
        if (shiftErr) continue;

        console.log(`\n⏳ Processing Shift ${shiftId} (${shift.date})...`);

        // We use the Service Role key in this script so RLS is bypassed.
        const { data: newBooking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
                agency_id: shift.agency_id,
                shift_id: shift.id,
                staff_id: shift.actual_staff_id,
                client_id: shift.client_id,
                status: 'confirmed',
                booking_date: new Date().toISOString(),
                shift_date: shift.date,
                start_time: shift.start_time,
                end_time: shift.end_time,
                confirmation_method: 'admin_retrospective'
            })
            .select()
            .single();

        if (bookingError) {
            console.error(`❌ Booking failed for ${shift.date}:`, bookingError.message);
            continue;
        }

        console.log(`✅ Booking created: ${newBooking.id}`);

        const { data: tsData, error: tsError } = await supabase.functions.invoke('auto-timesheet-creator', {
            body: {
                booking_id: newBooking.id,
                shift_id: shift.id,
                staff_id: shift.actual_staff_id,
                client_id: shift.client_id,
                agency_id: shift.agency_id
            }
        });

        if (tsError) {
            console.error(`❌ Timesheet failed for ${shift.date}:`, tsError);
        } else {
            console.log(`✅ Timesheet created:`, tsData);
        }
    }
}

fixMissingTimesheets().catch(console.error);
