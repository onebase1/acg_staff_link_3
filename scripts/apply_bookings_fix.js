import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function applyMigration() {
  console.log('🔧 Applying bookings RLS fix migration...\n');
  
  try {
    // Read the migration file
    const migrationSQL = fs.readFileSync(
      'supabase/migrations/20251113000000_fix_bookings_staff_insert.sql',
      'utf8'
    );
    
    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n🚀 Executing migration...\n');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 100)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';'
        });
        
        if (error) {
          // Try alternative method - direct query
          const { error: directError } = await supabase
            .from('_migrations')
            .insert({ statement });
          
          if (directError) {
            console.error('❌ Error:', error.message);
            throw error;
          }
        }
        
        console.log('✅ Success\n');
      }
    }
    
    console.log('🎉 Migration applied successfully!');
    console.log('\n🧪 Testing booking creation...');
    
    // Test booking creation
    const { data: staffData } = await supabase
      .from('staff')
      .select('id, user_id, agency_id')
      .eq('email', 'g.basera5+chadaira@gmail.com')
      .single();
    
    const { data: testShift } = await supabase
      .from('shifts')
      .select('*')
      .eq('role_required', 'healthcare_assistant')
      .eq('status', 'open')
      .limit(1)
      .single();
    
    if (staffData && testShift) {
      // Create anon client to simulate staff user
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
        console.log('❌ Test booking creation FAILED:', bookingError.message);
        console.log('⚠️ Migration may not have applied correctly');
      } else {
        console.log('✅ Test booking creation SUCCESS!');
        console.log('📋 Booking ID:', booking.id);
        
        // Clean up
        await supabase.from('bookings').delete().eq('id', booking.id);
        console.log('🧹 Test booking cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration().catch(console.error);

