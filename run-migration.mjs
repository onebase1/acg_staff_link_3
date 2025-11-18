import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sql = `
-- Make duration_hours nullable and set default
ALTER TABLE shifts ALTER COLUMN duration_hours DROP NOT NULL;
ALTER TABLE shifts ALTER COLUMN duration_hours SET DEFAULT 12;

COMMENT ON COLUMN shifts.duration_hours IS 'Static display field (12 hours). NOT used for invoicing - use actual_start_time/actual_end_time instead.';
`;

console.log('🔧 Running migration to fix duration_hours...\n');

try {
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('✅ Migration completed successfully!');
  console.log('✅ duration_hours is now nullable with DEFAULT 12');
  console.log('\n🎯 Now hard refresh your browser (Ctrl+Shift+R) and try creating shifts again!');

} catch (err) {
  console.error('❌ Exception:', err.message);

  // If exec_sql doesn't exist, try direct SQL
  console.log('\n📝 Trying direct SQL execution...');

  const queries = [
    'ALTER TABLE shifts ALTER COLUMN duration_hours DROP NOT NULL',
    'ALTER TABLE shifts ALTER COLUMN duration_hours SET DEFAULT 12',
    "COMMENT ON COLUMN shifts.duration_hours IS 'Static display field (12 hours). NOT used for invoicing - use actual_start_time/actual_end_time instead.'"
  ];

  for (const query of queries) {
    try {
      const { error } = await supabase.from('_sql').select(query);
      if (error) {
        console.error(`❌ Query failed: ${query}`);
        console.error(error);
      }
    } catch (e) {
      console.log(`⚠️ Could not execute: ${query}`);
    }
  }

  console.log('\n⚠️ Direct SQL may not be supported. Please run this SQL manually in Supabase dashboard:');
  console.log('\nhttps://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/sql/new\n');
  console.log(sql);
}
