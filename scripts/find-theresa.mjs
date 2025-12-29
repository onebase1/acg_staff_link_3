import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1OTYwNDgsImV4cCI6MjA3NzE3MjA0OH0.eYyjJTxHeYSGJEmDhOEq-b1v473kg-OqHhAtC4BBHrY';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🔍 Searching for Theresa Atomi...\n');

// Search in staff table
console.log('📋 Searching staff table...\n');
const { data: staffResults, error: staffError } = await supabase
  .from('staff')
  .select('*')
  .or('first_name.ilike.%theresa%,last_name.ilike.%atomi%,email.ilike.%theresa%,email.ilike.%atomi%');

if (staffError) {
  console.error('❌ Error searching staff:', staffError);
} else if (staffResults && staffResults.length > 0) {
  console.log(`✅ Found ${staffResults.length} staff record(s):\n`);
  staffResults.forEach((s, i) => {
    console.log(`${i + 1}. ${s.first_name} ${s.last_name}`);
    console.log(`   ID: ${s.id}`);
    console.log(`   Email: ${s.email}`);
    console.log(`   User ID: ${s.user_id || 'N/A'}`);
    console.log(`   Agency ID: ${s.agency_id}`);
    console.log('');
  });
} else {
  console.log('⚠️  No staff records found\n');
}

// Search in profiles table
console.log('👤 Searching profiles table...\n');
const { data: profileResults, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .or('email.ilike.%theresa%,email.ilike.%atomi%');

if (profileError) {
  console.error('❌ Error searching profiles:', profileError);
} else if (profileResults && profileResults.length > 0) {
  console.log(`✅ Found ${profileResults.length} profile(s):\n`);
  profileResults.forEach((p, i) => {
    console.log(`${i + 1}. Profile ID: ${p.id}`);
    console.log(`   Email: ${p.email}`);
    console.log(`   User Type: ${p.user_type}`);
    console.log(`   Agency ID: ${p.agency_id || 'N/A'}`);
    console.log(`   All fields:`, JSON.stringify(p, null, 2));
    console.log('');
  });
} else {
  console.log('⚠️  No profiles found\n');
}

// Also search compliance table for any docs
console.log('📄 Searching compliance table...\n');
const { data: compResults, error: compError } = await supabase
  .from('compliance')
  .select('*, staff:staff_id(first_name, last_name, email)')
  .limit(10);

if (compError) {
  console.error('❌ Error searching compliance:', compError);
} else if (compResults && compResults.length > 0) {
  console.log(`✅ Found ${compResults.length} compliance record(s):\n`);
  compResults.forEach((c, i) => {
    console.log(`${i + 1}. Staff ID: ${c.staff_id}`);
    console.log(`   Document: ${c.document_name || c.document_type}`);
    console.log(`   Status: ${c.status}`);
    if (c.staff) {
      console.log(`   Staff: ${c.staff.first_name} ${c.staff.last_name} (${c.staff.email})`);
    }
    console.log('');
  });
}

console.log('\n✅ Search complete\n');
