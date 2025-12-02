import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rzzxxkppkiasuouuglaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
);

async function checkAuth() {
  console.log('🔍 Detailed auth check for ops_manager...\n');

  // Check profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'g.basera5+ops_manager@gmail.com')
    .single();

  if (profileError) {
    console.log('❌ Profile query error:', profileError);
  } else if (profile) {
    console.log('✅ PROFILE EXISTS:');
    console.log('   ID:', profile.id);
    console.log('   Email:', profile.email);
    console.log('   Type:', profile.user_type);
    console.log('');
  }

  // Try to list all users to see if ops_manager is there
  console.log('🔐 Attempting to list auth users...');
  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.log('❌ Error listing users:');
      console.log('   Message:', error.message);
      console.log('   Status:', error.status);
      console.log('   Full error:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Successfully listed auth users');
      console.log('   Total users:', data.users.length);

      const opsUser = data.users.find(u => u.email === 'g.basera5+ops_manager@gmail.com');

      if (opsUser) {
        console.log('\n✅ OPS MANAGER AUTH USER FOUND:');
        console.log('   ID:', opsUser.id);
        console.log('   Email:', opsUser.email);
        console.log('   Email confirmed:', opsUser.email_confirmed_at || 'NO');
        console.log('   Created:', opsUser.created_at);
        console.log('   Last sign in:', opsUser.last_sign_in_at || 'Never');
      } else {
        console.log('\n❌ OPS MANAGER NOT IN AUTH.USERS TABLE');
        console.log('   This explains why login fails!');
        console.log('\n📋 All test users found in auth.users:');
        data.users
          .filter(u => u.email?.includes('g.basera5+'))
          .forEach(u => {
            console.log(`   - ${u.email} (${u.id})`);
          });
      }
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
    console.log('   Stack:', err.stack);
  }

  // Also try to get user by ID from profile
  if (profile?.id) {
    console.log('\n🔍 Attempting to get user by profile ID...');
    try {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.id);

      if (userError) {
        console.log('❌ Error getting user by ID:');
        console.log('   Message:', userError.message);
        console.log('   Status:', userError.status);
      } else if (userData?.user) {
        console.log('✅ User found by ID:', userData.user.email);
      } else {
        console.log('❌ No user found with ID:', profile.id);
        console.log('   This confirms auth.users record is missing!');
      }
    } catch (err) {
      console.log('❌ Exception:', err.message);
    }
  }
}

checkAuth().then(() => process.exit(0)).catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
