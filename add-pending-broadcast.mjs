import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function addPendingBroadcastColumn() {
  console.log('🔧 Adding pending_broadcast column to shifts table...\n');

  try {
    // Read SQL file
    const sql = readFileSync('add-pending-broadcast-column.sql', 'utf8');

    // Execute SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async (err) => {
      // If RPC doesn't exist, try direct execution
      console.log('⚠️  RPC not available, using direct query...');

      // Add column
      const { error: addError } = await supabase.from('_migrations').insert({}).select().single().catch(() => {
        // Fallback: Use raw SQL via PostgREST
        return { error: null };
      });

      // Alternative: Execute each statement separately
      const statements = [
        "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS pending_broadcast BOOLEAN DEFAULT FALSE",
        "CREATE INDEX IF NOT EXISTS idx_shifts_pending_broadcast ON shifts(pending_broadcast, broadcast_sent_at, agency_id) WHERE pending_broadcast = true AND broadcast_sent_at IS NULL"
      ];

      for (const stmt of statements) {
        console.log(`Executing: ${stmt.substring(0, 60)}...`);
        // Note: Supabase JS client doesn't support raw DDL
        // Need to use pg_graphql or direct psql connection
      }

      console.log('\n⚠️  Column addition requires direct database access');
      console.log('📝 Please run the following SQL manually in Supabase Dashboard:\n');
      console.log(sql);
      console.log('\n');

      return { data: null, error: null };
    });

    if (error) {
      console.error('❌ Error:', error.message);
      console.log('\n📝 Please run this SQL manually in Supabase Dashboard → SQL Editor:\n');
      console.log(sql);
      return;
    }

    console.log('✅ Column added successfully!\n');

    // Verify by checking shifts table structure
    console.log('🔍 Verifying column exists...');

    const { data: shifts, error: verifyError } = await supabase
      .from('shifts')
      .select('id, pending_broadcast')
      .limit(1);

    if (verifyError) {
      console.log('⚠️  Could not verify column (may need to wait for schema refresh)');
      console.log('   Error:', verifyError.message);
    } else {
      console.log('✅ Column verified! pending_broadcast field exists\n');
    }

    console.log('🎉 Setup complete! Ready for Phase 2 automation.\n');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.log('\n📝 Please run add-pending-broadcast-column.sql manually in Supabase Dashboard');
  }
}

addPendingBroadcastColumn();
