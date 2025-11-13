// Apply RLS Policies Script
// This script reads the RLS migration file and applies it to Supabase

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase connection (using service role key for admin operations)
const SUPABASE_URL = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyRLSPolicies() {
  console.log('🔧 Starting RLS Policies Application...\n');

  try {
    // Read the RLS migration file
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20251112000000_enable_rls_policies.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    const sql = readFileSync(migrationPath, 'utf8');

    console.log(`✅ Migration file loaded (${sql.length} characters)\n`);

    // Split SQL by statements (basic split on semicolon followed by newline)
    // Note: This is a simple approach; complex SQL might need better parsing
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue;
      }

      // Get a brief description of the statement
      const description = statement.substring(0, 80).replace(/\n/g, ' ') + '...';

      try {
        console.log(`[${i + 1}/${statements.length}] Executing: ${description}`);

        // Execute the SQL statement
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        }).catch(async () => {
          // If rpc doesn't exist, try direct SQL execution via REST API
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify({ sql_query: statement + ';' })
          });

          if (!response.ok) {
            // Try alternative: use pg_admin functions via SQL query endpoint
            const altResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/vnd.pgrst.object+json',
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({ query: statement + ';' })
            });

            if (!altResponse.ok) {
              throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            return { data: await altResponse.json(), error: null };
          }
          return { data: await response.json(), error: null };
        });

        if (error) {
          // Some errors are expected (e.g., "function already exists")
          if (error.message && (
            error.message.includes('already exists') ||
            error.message.includes('duplicate')
          )) {
            console.log(`   ⚠️  Already exists (skipping): ${error.message.substring(0, 60)}`);
          } else {
            console.error(`   ❌ Error: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(`   ✅ Success`);
          successCount++;
        }
      } catch (err) {
        console.error(`   ❌ Exception: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📝 Total: ${statements.length}`);
    console.log('='.repeat(60) + '\n');

    if (errorCount === 0) {
      console.log('🎉 RLS policies applied successfully!');
      console.log('\n🔍 Next steps:');
      console.log('1. Refresh your dashboard at http://localhost:5173');
      console.log('2. Log in as: info@guest-glow.com (password: Dominion#2025)');
      console.log('3. Data should now be visible!\n');
    } else {
      console.log('⚠️  Some statements failed. This may be normal if policies already exist.');
      console.log('Check the errors above to see if they are critical.\n');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Alternative: Apply via REST API directly
async function applyViaRestAPI() {
  console.log('🔧 Applying RLS Policies via REST API...\n');

  try {
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20251112000000_enable_rls_policies.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log(`📄 Loaded migration (${sql.length} characters)`);
    console.log('📡 Sending to Supabase...\n');

    // Use pg_admin REST endpoint to execute SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ RLS policies applied successfully!');
    console.log(result);

  } catch (error) {
    console.error('❌ Error applying via REST API:', error.message);
    console.log('\n📝 Manual application required. Please:');
    console.log('1. Go to: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/editor');
    console.log('2. Open SQL Editor');
    console.log('3. Copy contents of: supabase/migrations/20251112000000_enable_rls_policies.sql');
    console.log('4. Paste and run in SQL Editor\n');
  }
}

// Run the application
console.log('🚀 RLS Policies Application Tool\n');
applyRLSPolicies();
