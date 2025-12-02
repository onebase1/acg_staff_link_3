import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rzzxxkppkiasuouuglaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
);

const testEmails = [
  'g.basera5+ops_manager@gmail.com',
  'g.basera5+finance@gmail.com',
  'g.basera5+coordinator@gmail.com',
  'g.basera5+viewonly@gmail.com'
];

async function checkAllTestUsers() {
  console.log('🔍 Checking all 4 test users for auth.users records...\n');

  for (const email of testEmails) {
    console.log(`\n📧 ${email}`);
    console.log('─'.repeat(60));

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, user_type')
      .eq('email', email)
      .single();

    if (!profile) {
      console.log('   ❌ No profile found');
      continue;
    }

    console.log('   ✅ Profile exists');
    console.log('      ID:', profile.id);
    console.log('      Name:', profile.full_name);
    console.log('      Type:', profile.user_type);

    // Try to get auth user by ID
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(profile.id);

    if (authError) {
      if (authError.status === 404) {
        console.log('   ❌ AUTH RECORD MISSING (404)');
      } else {
        console.log('   ❌ Error:', authError.message);
      }
    } else if (authData?.user) {
      console.log('   ✅ Auth record exists');
      console.log('      Email confirmed:', authData.user.email_confirmed_at ? 'YES' : 'NO');
      console.log('      Created:', authData.user.created_at);
      console.log('      Last sign in:', authData.user.last_sign_in_at || 'Never');
    }
  }

  console.log('\n\n📊 SUMMARY:');
  console.log('─'.repeat(60));

  let missingCount = 0;
  for (const email of testEmails) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profile) {
      const { error } = await supabase.auth.admin.getUserById(profile.id);
      if (error?.status === 404) {
        console.log(`❌ ${email} - MISSING AUTH RECORD`);
        missingCount++;
      } else if (error) {
        console.log(`⚠️  ${email} - ERROR: ${error.message}`);
      } else {
        console.log(`✅ ${email} - OK`);
      }
    }
  }

  console.log('\n');
  if (missingCount > 0) {
    console.log(`⚠️  ${missingCount} out of 4 test users are missing auth.users records`);
    console.log('   These users cannot login until auth records are created');
  } else {
    console.log('✅ All test users have auth records');
  }
}

checkAllTestUsers().then(() => process.exit(0)).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
