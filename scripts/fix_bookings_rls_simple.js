import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixBookingsRLS() {
  console.log('🔧 Fixing bookings RLS policies...\n');
  
  try {
    // Since we can't execute raw SQL directly, we'll need to do this via Supabase Dashboard
    // But let's test if the current setup works first
    
    console.log('🧪 Testing current RLS setup...\n');
    
    // Get Chadaira's details
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, user_id, email, agency_id')
      .eq('email', 'g.basera5+chadaira@gmail.com')
      .single();
    
    if (staffError) {
      console.error('❌ Error fetching staff:', staffError.message);
      return;
    }
    
    console.log('✅ Staff found:', {
      id: staffData.id,
      user_id: staffData.user_id,
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
      console.error('❌ Error fetching shift:', shiftError.message);
      return;
    }
    
    console.log('✅ Test shift found:', testShift.id);
    
    // Test with anon key (simulating staff user)
    console.log('\n🔧 Testing booking creation with ANON KEY...');
    const anonSupabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    const { data: booking, error: bookingError } = await anonSupabase
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
    
    if (bookingError) {
      console.log('❌ Booking creation FAILED:', bookingError.message);
      console.log('\n📋 MANUAL FIX REQUIRED:');
      console.log('Go to Supabase Dashboard → Database → Policies → bookings table');
      console.log('\n1. Delete policy: "Agency admins can insert bookings"');
      console.log('2. Create new policy: "Agency admins and staff can insert bookings"');
      console.log('   - Policy command: INSERT');
      console.log('   - WITH CHECK expression:');
      console.log('```sql');
      console.log('is_super_admin() OR');
      console.log('(is_agency_admin() AND agency_id = get_user_agency_id()) OR');
      console.log('(');
      console.log('  staff_id::text IN (');
      console.log('    SELECT id::text FROM staff WHERE user_id = auth.uid()');
      console.log('  )');
      console.log('  AND agency_id = get_user_agency_id()');
      console.log(')');
      console.log('```');
      console.log('\n3. Update policy: "Agency admins can update bookings"');
      console.log('   - Rename to: "Agency admins and staff can update bookings"');
      console.log('   - USING expression:');
      console.log('```sql');
      console.log('is_super_admin() OR');
      console.log('(is_agency_admin() AND agency_id = get_user_agency_id()) OR');
      console.log('(');
      console.log('  staff_id::text IN (');
      console.log('    SELECT id::text FROM staff WHERE user_id = auth.uid()');
      console.log('  )');
      console.log(')');
      console.log('```');
      
      console.log('\n⚠️ PAUSING - Please apply the fix manually in Supabase Dashboard');
      console.log('After applying, run this script again to verify');
      
    } else {
      console.log('✅ Booking creation SUCCESS!');
      console.log('📋 Booking ID:', booking.id);
      
      // Clean up
      await supabase.from('bookings').delete().eq('id', booking.id);
      console.log('🧹 Test booking cleaned up');
      console.log('\n🎉 RLS policies are working correctly!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixBookingsRLS().catch(console.error);

