import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rzzxxkppkiasuouuglaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
);

async function fixOpsManager() {
  console.log('🔧 Creating auth.users record for ops_manager...\n');

  const email = 'g.basera5+ops_manager@gmail.com';
  const password = 'Broadband@123';
  const profileId = '854e4a38-5d9c-464d-b6b0-2e3ee529fb1f';

  // Create user with admin API using the existing profile UUID
  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,  // Auto-confirm email for test user
    user_metadata: {
      full_name: 'John Operations'
    }
  });

  if (error) {
    console.log('❌ Error creating auth user:');
    console.log('   Message:', error.message);
    console.log('   Status:', error.status);
    console.log('   Code:', error.code);
    console.log('\n⚠️  This might mean the auth user already exists with a different ID');
    console.log('   or there\'s a conflict we need to resolve.');
    return;
  }

  console.log('✅ Auth user created successfully!');
  console.log('   Auth ID:', data.user.id);
  console.log('   Email:', data.user.email);
  console.log('   Email confirmed:', data.user.email_confirmed_at ? 'YES' : 'NO');
  console.log('');

  // Now we need to update the profile to match the new auth ID
  if (data.user.id !== profileId) {
    console.log('⚠️  AUTH ID MISMATCH DETECTED:');
    console.log('   Profile ID:', profileId);
    console.log('   New Auth ID:', data.user.id);
    console.log('');
    console.log('🔄 Updating profile to match new auth ID...');

    // Update the profile ID to match the auth user ID
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ id: data.user.id })
      .eq('id', profileId);

    if (updateError) {
      console.log('❌ Could not update profile ID:', updateError.message);
      console.log('');
      console.log('🔧 MANUAL FIX REQUIRED:');
      console.log('   1. Go to Supabase Dashboard → Table Editor → profiles');
      console.log('   2. Find the profile with email: g.basera5+ops_manager@gmail.com');
      console.log('   3. Change the ID from:', profileId);
      console.log('   4. To:', data.user.id);
      console.log('');
      console.log('   OR delete the old profile and let it be created on first login.');
    } else {
      console.log('✅ Profile ID updated successfully!');

      // Also update client_contacts if it exists
      const { error: contactError } = await supabase
        .from('client_contacts')
        .update({ profile_id: data.user.id })
        .eq('profile_id', profileId);

      if (contactError) {
        console.log('⚠️  Could not update client_contacts:', contactError.message);
      } else {
        console.log('✅ Client_contacts updated successfully!');
      }
    }
  }

  console.log('');
  console.log('🎉 FIX COMPLETE!');
  console.log('   You can now login as ops_manager with:');
  console.log('   Email: g.basera5+ops_manager@gmail.com');
  console.log('   Password: Broadband@123');
}

fixOpsManager().then(() => process.exit(0)).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
