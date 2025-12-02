import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rzzxxkppkiasuouuglaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
);

async function checkSchema() {
  console.log('🔍 Checking profiles table schema...\n');

  // Get one profile to see all columns
  const { data: sample, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('📋 PROFILES TABLE COLUMNS:');
  Object.keys(sample).forEach(key => {
    console.log(`   - ${key}: ${typeof sample[key]} (value: ${sample[key]})`);
  });

  // Check client_contacts schema
  const { data: contactSample } = await supabase
    .from('client_contacts')
    .select('*')
    .limit(1)
    .single();

  if (contactSample) {
    console.log('\n📋 CLIENT_CONTACTS TABLE COLUMNS:');
    Object.keys(contactSample).forEach(key => {
      console.log(`   - ${key}: ${typeof contactSample[key]} (value: ${contactSample[key]})`);
    });
  }

  // Check if there are any users with multiple client_contacts
  const { data: multiClient, error: multiError } = await supabase
    .from('client_contacts')
    .select('profile_id')
    .order('profile_id');

  if (!multiError && multiClient) {
    const profileCounts = {};
    multiClient.forEach(c => {
      profileCounts[c.profile_id] = (profileCounts[c.profile_id] || 0) + 1;
    });

    const multiClientUsers = Object.entries(profileCounts).filter(([id, count]) => count > 1);

    console.log('\n🔍 MULTI-CLIENT USERS:');
    if (multiClientUsers.length > 0) {
      console.log(`   Found ${multiClientUsers.length} users with multiple client associations`);
      multiClientUsers.forEach(([id, count]) => {
        console.log(`   - Profile ${id}: ${count} clients`);
      });
    } else {
      console.log('   ⚠️  No users with multiple client associations found');
      console.log('   Current design: 1 user → 1 client (via profiles.client_id)');
    }
  }
}

checkSchema().then(() => process.exit(0)).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
