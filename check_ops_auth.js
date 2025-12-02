import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rzzxxkppkiasuouuglaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
);

async function checkOpsManager() {
  console.log('🔍 Checking ops_manager auth status...\n');

  // Check profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'g.basera5+ops_manager@gmail.com')
    .single();

  console.log('📋 PROFILE:');
  if (profile) {
    console.log('  ✅ Profile exists');
    console.log('  ID:', profile.id);
    console.log('  Email:', profile.email);
    console.log('  Name:', profile.full_name);
    console.log('  Type:', profile.user_type);
    console.log('  Client:', profile.client_id);
  } else {
    console.log('  ❌ NO PROFILE FOUND');
  }
  console.log('');

  // Try to check auth.users via admin API
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.log('⚠️  Cannot list auth users (need service_role key)');
    } else {
      const opsUser = users?.find(u => u.email === 'g.basera5+ops_manager@gmail.com');
      
      console.log('🔐 AUTH.USERS:');
      if (opsUser) {
        console.log('  ✅ Auth user exists');
        console.log('  ID:', opsUser.id);
        console.log('  Email:', opsUser.email);
        console.log('  Email confirmed:', opsUser.email_confirmed_at ? '✅ YES' : '❌ NO');
        console.log('  Created:', opsUser.created_at);
        console.log('  Last sign in:', opsUser.last_sign_in_at || 'Never');
        console.log('  Banned:', opsUser.banned_until || 'No');
      } else {
        console.log('  ❌ NO AUTH USER FOUND - THIS IS THE PROBLEM!');
        console.log('  Email does not exist in auth.users table');
      }
    }
  } catch (err) {
    console.log('Error checking auth:', err.message);
  }
}

checkOpsManager().then(() => process.exit(0)).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
