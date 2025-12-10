import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://rzzxxkppkiasuouuglaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
);

async function applyMigration() {
  console.log('📋 Reading notification_log migration file...\n');

  const sql = readFileSync('./supabase/migrations/20251205000001_create_notification_log.sql', 'utf8');

  console.log('🚀 Applying migration to database...\n');

  // Execute via RPC (raw SQL)
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });

  if (error) {
    console.log('❌ Migration failed:', error.message);
    console.log('\n📝 Manual Application Required:');
    console.log('Go to: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/sql/new');
    console.log('And paste the contents of: supabase/migrations/20251205000001_create_notification_log.sql');
  } else {
    console.log('✅ Migration applied successfully!');
  }

  // Verify it worked
  console.log('\n🔍 Verifying table exists...');
  const { data: testData, error: testError } = await supabase
    .from('notification_log')
    .select('*')
    .limit(1);

  if (testError) {
    console.log('❌ Verification failed:', testError.message);
  } else {
    console.log('✅ notification_log table verified!');
  }
}

applyMigration().catch(console.error);
