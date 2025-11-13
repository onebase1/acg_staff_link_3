#!/usr/bin/env node
/**
 * Fix Dashboard RLS - Apply Row Level Security Policies
 * This script uses Supabase service role key to apply RLS policies
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo';

console.log('🚀 Dashboard RLS Fix Tool\n');
console.log('═'.repeat(60));

// Initialize Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Read the SQL file
const sqlFile = './supabase/migrations/20251112000000_enable_rls_policies.sql';
console.log(`📄 Reading: ${sqlFile}`);

try {
  const sql = readFileSync(sqlFile, 'utf8');
  console.log(`✅ Loaded ${sql.length} characters\n`);

  console.log('⚠️  IMPORTANT: Supabase client library does not support direct SQL execution.');
  console.log('   You must apply this migration manually via Supabase Dashboard.\n');

  console.log('═'.repeat(60));
  console.log('📋 STEP-BY-STEP INSTRUCTIONS');
  console.log('═'.repeat(60));
  console.log('');
  console.log('1️⃣  Open your browser and go to:');
  console.log('   👉 https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/editor');
  console.log('');
  console.log('2️⃣  Click "SQL Editor" in the left sidebar');
  console.log('');
  console.log('3️⃣  Click "+ New Query" button');
  console.log('');
  console.log('4️⃣  Open this file in your text editor:');
  console.log(`   👉 ${sqlFile}`);
  console.log('');
  console.log('5️⃣  Copy the ENTIRE contents of the file');
  console.log('');
  console.log('6️⃣  Paste into the SQL Editor in Supabase Dashboard');
  console.log('');
  console.log('7️⃣  Click "Run" (or press Ctrl+Enter)');
  console.log('');
  console.log('8️⃣  Wait for "Success" message (may take 30-60 seconds)');
  console.log('');
  console.log('9️⃣  Refresh your dashboard at http://localhost:5173');
  console.log('');
  console.log('🔟  Log in as: info@guest-glow.com');
  console.log('    Password: Dominion#2025');
  console.log('');
  console.log('═'.repeat(60));
  console.log('');
  console.log('📊 Expected Result:');
  console.log('   ✅ Dashboard will show staff, shifts, revenue data');
  console.log('   ✅ All tables will have proper RLS policies');
  console.log('   ✅ Multi-tenant security will be enabled');
  console.log('');
  console.log('═'.repeat(60));
  console.log('');
  console.log('🔍 To verify the fix worked, run this SQL in Dashboard:');
  console.log('');
  console.log('   SELECT COUNT(*) as policy_count FROM pg_policies');
  console.log('   WHERE schemaname = \'public\';');
  console.log('');
  console.log('   Expected result: ~50+ policies');
  console.log('');
  console.log('═'.repeat(60));

} catch (error) {
  console.error('❌ Error reading SQL file:', error.message);
  process.exit(1);
}
