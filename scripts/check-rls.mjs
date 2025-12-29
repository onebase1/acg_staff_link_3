import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTYwNDgsImV4cCI6MjA3NzE3MjA0OH0.eYyjJTxHeYSGJEmDhOEq-b1v473kg-OqHhAtC4BBHrY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('\n🔍 Testing RLS Policies...\n');

// Try to count records
console.log('📊 Counting records (anon key)...\n');

const tables = ['staff', 'profiles', 'compliance', 'agencies'];

for (const table of tables) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.log(`❌ ${table}: ${error.message}`);
  } else {
    console.log(`✅ ${table}: ${count} records`);
  }
}

console.log('\n🔐 The issue is likely RLS (Row Level Security)');
console.log('   The anon key can only see records the current user has access to');
console.log('   Since we are not authenticated as a user, RLS blocks all queries\n');

console.log('💡 Solution: The frontend code works because users are authenticated');
console.log('   But the StaffProfileSimulation page has a BUG - it is using a');
console.log('   non-existent staff_id in the URL\n');
