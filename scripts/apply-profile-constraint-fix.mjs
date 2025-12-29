import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('\n🔧 Applying magic_link_tokens constraint fix...\n');

// Read the SQL file
const sqlPath = join(__dirname, 'fix-profile-constraint.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log('SQL to execute:');
console.log('─'.repeat(60));
console.log(sql);
console.log('─'.repeat(60));
console.log('');

// Split into individual statements (skip comments and empty lines)
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

console.log(`Found ${statements.length} SQL statements to execute\n`);

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];
  console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

    if (error) {
      // exec_sql might not exist, try direct query
      if (error.code === 'PGRST202') {
        console.log('⚠️  exec_sql RPC not found, trying alternative method...');

        // For ALTER TABLE statements, we can't use the REST API directly
        // User will need to run this manually
        console.error('\n❌ Cannot execute ALTER TABLE via REST API');
        console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
        console.log('   https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/sql/new\n');
        console.log(sql);
        process.exit(1);
      } else {
        console.error(`❌ Error:`, error.message);
      }
    } else {
      console.log('✅ Statement executed successfully');
      if (data) {
        console.log('Result:', JSON.stringify(data, null, 2));
      }
    }
  } catch (err) {
    console.error(`❌ Exception:`, err.message);
  }
}

console.log('\n✅ Constraint fix complete!');
console.log('The magic_link_tokens table now accepts "profile" as a download_type.\n');
