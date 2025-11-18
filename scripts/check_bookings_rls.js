import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkBookingsRLS() {
  console.log('🔍 Investigating bookings table RLS policies...\n');
  
  try {
    // Method 1: Direct query to get table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Error querying bookings:', tableError.message);
    } else {
      console.log('✅ Bookings table accessible with service key');
      if (tableInfo && tableInfo.length > 0) {
        console.log('📋 Sample booking columns:', Object.keys(tableInfo[0]));
      }
    }
    
    // Method 2: Check if we can query pg_policies view
    console.log('\n🔍 Attempting to query RLS policies...');
    
    // Try using raw SQL query
    const { data: policies, error: policyError } = await supabase
      .rpc('exec_sql', { 
        query: "SELECT * FROM pg_policies WHERE tablename = 'bookings'" 
      });
    
    if (policyError) {
      console.log('⚠️ Cannot query pg_policies directly:', policyError.message);
      console.log('\n💡 This is expected - we need to check RLS policies in Supabase Dashboard');
      console.log('📍 Go to: Database → Policies → bookings table');
    } else {
      console.log('✅ RLS Policies found:', JSON.stringify(policies, null, 2));
    }
    
    // Method 3: Test creating a booking as staff user
    console.log('\n🧪 Testing booking creation with staff user credentials...');
    
    // Get Chadaira's user_id
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, user_id, email, agency_id')
      .eq('email', 'g.basera5+chadaira@gmail.com')
      .single();
    
    if (staffError) {
      console.log('❌ Error fetching staff:', staffError.message);
      return;
    }
    
    console.log('✅ Staff found:', {
      id: staffData.id,
      user_id: staffData.user_id,
      email: staffData.email,
      agency_id: staffData.agency_id
    });
    
    // Get a test shift
    const { data: testShift, error: shiftError } = await supabase
      .from('shifts')
      .select('*')
      .eq('role_required', 'healthcare_assistant')
      .eq('status', 'open')
      .limit(1)
      .single();
    
    if (shiftError) {
      console.log('❌ Error fetching test shift:', shiftError.message);
      return;
    }
    
    console.log('✅ Test shift found:', {
      id: testShift.id,
      client_id: testShift.client_id,
      agency_id: testShift.agency_id,
      date: testShift.date
    });
    
    // Check if booking already exists
    const { data: existingBooking, error: existingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('shift_id', testShift.id)
      .eq('staff_id', staffData.id);
    
    console.log('\n📊 Existing bookings for this shift:', existingBooking?.length || 0);
    
    // Try to create booking with service key (should work)
    console.log('\n🔧 Attempting to create booking with SERVICE KEY...');
    const { data: serviceBooking, error: serviceError } = await supabase
      .from('bookings')
      .insert({
        shift_id: testShift.id,
        staff_id: staffData.id,
        client_id: testShift.client_id,
        agency_id: testShift.agency_id,
        status: 'pending',
        booking_date: new Date().toISOString().split('T')[0],
        shift_date: testShift.date,
        start_time: testShift.start_time, // ✅ TEXT (HH:MM) from shifts
        end_time: testShift.end_time      // ✅ TEXT (HH:MM) from shifts
      })
      .select()
      .single();
    
    if (serviceError) {
      console.log('❌ Service key insert failed:', serviceError.message);
      console.log('Full error:', JSON.stringify(serviceError, null, 2));
    } else {
      console.log('✅ Service key insert SUCCESS:', serviceBooking.id);
      
      // Clean up test booking
      await supabase.from('bookings').delete().eq('id', serviceBooking.id);
      console.log('🧹 Test booking cleaned up');
    }
    
    // Now test with anon key (simulating staff user)
    console.log('\n🔧 Attempting to create booking with ANON KEY (staff user simulation)...');
    const anonSupabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    // This should fail with RLS error
    const { data: anonBooking, error: anonError } = await anonSupabase
      .from('bookings')
      .insert({
        shift_id: testShift.id,
        staff_id: staffData.id,
        client_id: testShift.client_id,
        agency_id: testShift.agency_id,
        status: 'pending',
        booking_date: new Date().toISOString().split('T')[0],
        shift_date: testShift.date,
        start_time: testShift.start_time,
        end_time: testShift.end_time
      })
      .select()
      .single();
    
    if (anonError) {
      console.log('❌ Anon key insert FAILED (expected):', anonError.message);
      console.log('🔍 Error code:', anonError.code);
      console.log('🔍 Error details:', anonError.details);
      console.log('\n💡 This confirms RLS is blocking staff users from creating bookings');
      console.log('📋 Need to add INSERT policy for staff users on bookings table');
    } else {
      console.log('✅ Anon key insert SUCCESS (unexpected!):', anonBooking.id);
      await anonSupabase.from('bookings').delete().eq('id', anonBooking.id);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkBookingsRLS().catch(console.error);

