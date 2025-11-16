import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testShiftAcceptance() {
  console.log('🧪 Testing shift acceptance workflow with authenticated user...\n');
  
  try {
    // Step 1: Sign in as Chadaira
    console.log('🔐 Signing in as Chadaira...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'g.basera5+chadaira@gmail.com',
      password: 'Test1234!' // You may need to update this
    });
    
    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      console.log('\n💡 If password is incorrect, please provide the correct password for Chadaira');
      return;
    }
    
    console.log('✅ Authenticated as:', authData.user.email);
    console.log('📋 User ID:', authData.user.id);
    
    // Step 2: Get staff profile
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();
    
    if (staffError) {
      console.error('❌ Error fetching staff profile:', staffError.message);
      return;
    }
    
    console.log('✅ Staff profile found:', {
      id: staffData.id,
      role: staffData.role,
      agency_id: staffData.agency_id
    });
    
    // Step 3: Get a test shift
    const { data: testShift, error: shiftError } = await supabase
      .from('shifts')
      .select('*')
      .eq('role_required', 'healthcare_assistant')
      .eq('status', 'open')
      .limit(1)
      .single();
    
    if (shiftError) {
      console.error('❌ Error fetching test shift:', shiftError.message);
      return;
    }
    
    console.log('✅ Test shift found:', {
      id: testShift.id,
      date: testShift.date,
      client_id: testShift.client_id
    });
    
    // Step 4: Try to create a booking (this is what happens when accepting a shift)
    console.log('\n🔧 Attempting to create booking (shift acceptance)...');
    const { data: booking, error: bookingError } = await supabase
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
        end_time: testShift.end_time,
        confirmation_method: 'app'
      })
      .select()
      .single();
    
    if (bookingError) {
      console.log('❌ Booking creation FAILED:', bookingError.message);
      console.log('🔍 Error code:', bookingError.code);
      console.log('🔍 Error details:', bookingError.details);
      
      if (bookingError.message.includes('row-level security')) {
        console.log('\n⚠️ RLS policy is still blocking the insert!');
        console.log('📋 This means the policy fix did not work as expected.');
        console.log('\n🔍 Debugging info:');
        console.log('- User ID:', authData.user.id);
        console.log('- Staff ID:', staffData.id);
        console.log('- Agency ID:', staffData.agency_id);
        console.log('- Shift Agency ID:', testShift.agency_id);
        
        // Check if user_id matches
        if (staffData.user_id !== authData.user.id) {
          console.log('⚠️ MISMATCH: staff.user_id !== auth.uid()');
        }
        
        // Check if agency_id matches
        const { data: userAgency } = await supabase.rpc('get_user_agency_id');
        console.log('- get_user_agency_id() returns:', userAgency);
        
        if (userAgency !== staffData.agency_id) {
          console.log('⚠️ MISMATCH: get_user_agency_id() !== staff.agency_id');
        }
      }
    } else {
      console.log('✅ Booking creation SUCCESS!');
      console.log('📋 Booking ID:', booking.id);
      console.log('📋 Status:', booking.status);
      
      // Clean up test booking
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);
      
      if (deleteError) {
        console.log('⚠️ Could not delete test booking:', deleteError.message);
      } else {
        console.log('🧹 Test booking cleaned up');
      }
      
      console.log('\n🎉 SUCCESS! Staff can now accept shifts!');
    }
    
    // Sign out
    await supabase.auth.signOut();
    console.log('\n🔓 Signed out');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testShiftAcceptance().catch(console.error);

