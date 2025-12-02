// Quick script to check test user status
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rzzxxkppkiasuouuglaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
);

async function checkUsers() {
  console.log('🔍 Checking test users...\n');

  // Check auth.users
  const { data: authUsers, error: authError } = await supabase.rpc('get_test_users_auth');

  if (authError) {
    console.log('Using direct query instead...');

    // Check profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, user_type, client_id')
      .like('email', 'g.basera5+%@gmail.com')
      .order('email');

    console.log('📋 PROFILES:');
    if (profileError) {
      console.error('❌', profileError.message);
    } else {
      profiles?.forEach(p => {
        console.log(`  - ${p.email}`);
        console.log(`    ID: ${p.id}`);
        console.log(`    Name: ${p.full_name}`);
        console.log(`    Type: ${p.user_type}`);
        console.log(`    Client: ${p.client_id}`);
        console.log('');
      });
    }

    // Check client_contacts
    const { data: contacts, error: contactError } = await supabase
      .from('client_contacts')
      .select('profile_id, email, role, is_active, client_id')
      .like('email', 'g.basera5+%@gmail.com')
      .order('email');

    console.log('📋 CLIENT_CONTACTS:');
    if (contactError) {
      console.error('❌', contactError.message);
    } else {
      if (contacts?.length === 0) {
        console.log('  ⚠️  NO CLIENT CONTACTS FOUND');
      } else {
        contacts?.forEach(c => {
          console.log(`  - ${c.email}`);
          console.log(`    Role: ${c.role}`);
          console.log(`    Active: ${c.is_active}`);
          console.log(`    Client: ${c.client_id}`);
          console.log('');
        });
      }
    }

    // Check for finance user specifically
    const { data: financeProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'g.basera5+finance@gmail.com')
      .single();

    if (financeProfile) {
      console.log('💰 FINANCE USER DETAILS:');
      console.log(JSON.stringify(financeProfile, null, 2));
    }
  }
}

checkUsers().then(() => process.exit(0)).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
