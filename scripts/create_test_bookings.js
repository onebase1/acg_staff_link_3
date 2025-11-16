import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTestBookings() {
  console.log('📋 Creating test bookings for assigned/confirmed shifts...\n');
  
  try {
    // Get Chadaira's details
    const { data: chadaira } = await supabase
      .from('staff')
      .select('*')
      .eq('email', 'g.basera5+chadaira@gmail.com')
      .single();
    
    console.log('✅ Chadaira found:', chadaira.id);
    
    // Get all shifts assigned to Chadaira
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
      .eq('assigned_staff_id', chadaira.id)
      .order('date', { ascending: true });
    
    if (shiftsError) {
      console.error('❌ Error fetching shifts:', shiftsError.message);
      return;
    }
    
    console.log(`✅ Found ${shifts.length} assigned shifts\n`);
    
    // Create bookings for each shift
    for (const shift of shifts) {
      // Check if booking already exists
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id')
        .eq('shift_id', shift.id)
        .eq('staff_id', chadaira.id)
        .single();
      
      if (existingBooking) {
        console.log(`⏭️  Booking already exists for shift ${shift.date}`);
        continue;
      }
      
      // Determine booking status based on shift status
      let bookingStatus = 'pending';
      let confirmedByStaffAt = null;
      
      if (shift.status === 'confirmed') {
        bookingStatus = 'confirmed';
        confirmedByStaffAt = new Date(shift.date + 'T08:00:00Z').toISOString();
      } else if (shift.status === 'completed') {
        bookingStatus = 'completed';
        confirmedByStaffAt = new Date(shift.date + 'T08:00:00Z').toISOString();
      } else if (shift.status === 'assigned') {
        bookingStatus = 'pending';
      }
      
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          agency_id: shift.agency_id,
          shift_id: shift.id,
          staff_id: chadaira.id,
          client_id: shift.client_id,
          status: bookingStatus,
          booking_date: shift.date,
          shift_date: shift.date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          confirmation_method: 'app',
          confirmed_by_staff_at: confirmedByStaffAt,
          notes: `Test booking for ${shift.status} shift`
        })
        .select()
        .single();
      
      if (bookingError) {
        console.error(`❌ Error creating booking for ${shift.date}:`, bookingError.message);
      } else {
        console.log(`✅ Created booking: ${shift.date} - ${bookingStatus}`);
      }
    }
    
    console.log('\n✅ Booking creation complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestBookings().catch(console.error);

