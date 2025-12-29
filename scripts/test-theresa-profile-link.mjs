import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
  console.log('Please set it in your .env file or run:');
  console.log('export SUPABASE_SERVICE_KEY="your-service-key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  📋 STAFF PROFILE LINK TEST - Module 34 Privacy Fix');
console.log('═══════════════════════════════════════════════════════════\n');

// Step 1: Find Theresa Atomi
console.log('🔍 Step 1: Searching for Theresa Atomi...\n');

const { data: staffResults, error: staffError } = await supabase
  .from('staff')
  .select('id, first_name, last_name, email, phone, agency_id, role')
  .ilike('first_name', '%theresa%')
  .ilike('last_name', '%atomi%');

if (staffError) {
  console.error('❌ Error searching for staff:', staffError.message);
  process.exit(1);
}

if (!staffResults || staffResults.length === 0) {
  console.error('❌ No staff found with name "Theresa Atomi"');
  process.exit(1);
}

const staff = staffResults[0];
console.log('✅ Staff Found:');
console.log(`   Name: ${staff.first_name} ${staff.last_name}`);
console.log(`   ID: ${staff.id}`);
console.log(`   Email: ${staff.email}`);
console.log(`   Phone: ${staff.phone} (⚠️ This should NOT appear in emails)`);
console.log(`   Role: ${staff.role}`);
console.log(`   Agency ID: ${staff.agency_id}\n`);

// Step 2: Get a client for testing
console.log('🔍 Step 2: Finding a client for testing...\n');

const { data: clientResults, error: clientError } = await supabase
  .from('clients')
  .select('id, name, agency_id')
  .eq('agency_id', staff.agency_id)
  .limit(1);

if (clientError || !clientResults || clientResults.length === 0) {
  console.error('❌ No clients found for this agency');
  process.exit(1);
}

const client = clientResults[0];
console.log('✅ Test Client:');
console.log(`   Name: ${client.name}`);
console.log(`   ID: ${client.id}\n`);

// Step 3: Generate magic token
console.log('🔍 Step 3: Generating magic profile link...\n');

const token = randomUUID();
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 14); // 14-day expiry

const { error: insertError } = await supabase
  .from('magic_link_tokens')
  .insert({
    token,
    staff_id: staff.id,
    client_id: client.id,
    agency_id: staff.agency_id,
    download_type: 'profile',
    expires_at: expiresAt.toISOString(),
    metadata: {
      test: true,
      generated_by: 'test-theresa-profile-link.mjs',
      staff_name: `${staff.first_name} ${staff.last_name}`
    }
  });

if (insertError) {
  console.error('❌ Failed to create magic token:', insertError.message);
  process.exit(1);
}

const profileLink = `${supabaseUrl}/functions/v1/staff-profile-linker?token=${token}`;

console.log('✅ Magic Token Created Successfully!\n');

console.log('═══════════════════════════════════════════════════════════');
console.log('  🎉 GENERATED PROFILE LINK');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📋 Profile Link:');
console.log(`   ${profileLink}\n`);

console.log('⏰ Token Details:');
console.log(`   Token UUID: ${token}`);
console.log(`   Expires: ${expiresAt.toLocaleString('en-GB', {
     dateStyle: 'full',
     timeStyle: 'short'
   })}`);
console.log(`   Valid for: 14 days`);
console.log(`   Database: magic_link_tokens table\n`);

console.log('═══════════════════════════════════════════════════════════');
console.log('  📝 TESTING INSTRUCTIONS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('1. Copy the profile link above');
console.log('2. Open it in your browser (or incognito window)');
console.log('3. The link should redirect to: /staffprofilesimulation?id=' + staff.id);
console.log('4. Verify the CQC-compliant profile page loads');
console.log('5. CRITICAL: Confirm NO phone numbers are visible in client emails\n');

console.log('✅ Privacy Fix Verification:');
console.log(`   Email BEFORE: • ${staff.first_name} ${staff.last_name} (${staff.phone})`);
console.log(`   Email AFTER:  • ${staff.first_name} ${staff.last_name} [📋 View Profile]\n`);

console.log('═══════════════════════════════════════════════════════════\n');
