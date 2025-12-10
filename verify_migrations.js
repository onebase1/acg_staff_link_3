import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rzzxxkppkiasuouuglaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
);

async function verifyTables() {
  console.log('🔍 Checking if notification tables exist...\n');

  // Check notification_queue
  const { data: queueData, error: queueError } = await supabase
    .from('notification_queue')
    .select('*')
    .limit(1);

  if (queueError) {
    console.log('❌ notification_queue table:', queueError.message);
  } else {
    console.log('✅ notification_queue table: EXISTS');
  }

  // Check notification_log
  const { data: logData, error: logError } = await supabase
    .from('notification_log')
    .select('*')
    .limit(1);

  if (logError) {
    console.log('❌ notification_log table:', logError.message);
  } else {
    console.log('✅ notification_log table: EXISTS');
  }

  console.log('\n✅ MIGRATION VERIFICATION COMPLETE!');
}

verifyTables().catch(console.error);
