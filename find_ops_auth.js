import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rzzxxkppkiasuouuglaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
);

async function searchForOpsManager() {
  console.log('🔍 Searching for ops_manager in multiple ways...\n');

  const email = 'g.basera5+ops_manager@gmail.com';

  // Try 1: List all users and filter
  console.log('1️⃣ Listing all auth users...');
  try {
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (listError) {
      console.log('   ❌ Error:', listError.message, '(status:', listError.status + ')');
    } else {
      const allTestUsers = listData.users.filter(u => u.email?.includes('g.basera5'));
      console.log('   ✅ Found', allTestUsers.length, 'test users:');
      allTestUsers.forEach(u => {
        console.log(`      - ${u.email}`);
        console.log(`        ID: ${u.id}`);
        console.log(`        Confirmed: ${u.email_confirmed_at ? 'YES' : 'NO'}`);
      });

      const opsUser = listData.users.find(u => u.email === email);
      if (opsUser) {
        console.log('\n   ✅ Found ops_manager in list!');
        console.log('      ID:', opsUser.id);
      } else {
        console.log('\n   ❌ ops_manager NOT in list');
      }
    }
  } catch (err) {
    console.log('   ❌ Exception:', err.message);
  }

  // Try 2: Try to delete the user (to clear any ghost records)
  console.log('\n2️⃣ Attempting to delete any existing ops_manager auth record...');
  const profileId = '854e4a38-5d9c-464d-b6b0-2e3ee529fb1f';

  const { data: deleteData, error: deleteError } = await supabase.auth.admin.deleteUser(profileId);

  if (deleteError) {
    if (deleteError.status === 404) {
      console.log('   ✅ No user to delete (as expected)');
    } else {
      console.log('   ❌ Error:', deleteError.message);
    }
  } else {
    console.log('   ⚠️  Successfully deleted a user record!');
    console.log('      This suggests there WAS a ghost record');
  }

  // Try 3: Check if we can now create the user
  console.log('\n3️⃣ Attempting to create user after cleanup...');
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: email,
    password: 'Broadband@123',
    email_confirm: true,
    user_metadata: {
      full_name: 'John Operations'
    }
  });

  if (createError) {
    console.log('   ❌ Still cannot create:', createError.message);
    console.log('      Code:', createError.code);
    console.log('      Status:', createError.status);
  } else {
    console.log('   ✅ SUCCESS! User created:');
    console.log('      ID:', createData.user.id);
    console.log('      Email:', createData.user.email);
    console.log('      Confirmed:', createData.user.email_confirmed_at ? 'YES' : 'NO');
  }
}

searchForOpsManager().then(() => process.exit(0)).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
