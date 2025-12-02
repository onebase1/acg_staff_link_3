import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rzzxxkppkiasuouuglaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
);

async function checkFinanceProfile() {
  console.log('🔍 Checking finance user profile...\n');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'g.basera5+finance@gmail.com')
    .single();

  console.log('📋 PROFILE DATA:');
  console.log(JSON.stringify(profile, null, 2));

  const { data: contact } = await supabase
    .from('client_contacts')
    .select('*')
    .eq('email', 'g.basera5+finance@gmail.com')
    .single();

  console.log('\n📋 CLIENT_CONTACT DATA:');
  console.log(JSON.stringify(contact, null, 2));
}

checkFinanceProfile().then(() => process.exit(0)).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
