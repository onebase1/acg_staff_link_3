#!/usr/bin/env node
/**
 * Apply RLS Policies Directly to Postgres
 * Uses pg library to connect and execute SQL
 */

import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

// Postgres connection string
const connectionString = 'postgresql://postgres.rzzxxkppkiasuouuglaf:Dominion#2025@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

console.log('🚀 Applying RLS Policies to Supabase Database\n');
console.log('═'.repeat(60));

async function applyRLS() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📡 Connecting to Supabase Postgres...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read SQL file
    const sqlFile = './supabase/migrations/20251112000000_enable_rls_policies.sql';
    console.log(`📄 Reading: ${sqlFile}`);
    const sql = readFileSync(sqlFile, 'utf8');
    console.log(`✅ Loaded ${sql.length} characters\n`);

    console.log('⚙️  Executing RLS policies migration...');
    console.log('   This may take 30-60 seconds...\n');

    // Execute the entire SQL file
    await client.query(sql);

    console.log('✅ RLS policies applied successfully!\n');
    console.log('═'.repeat(60));
    console.log('📊 VERIFICATION');
    console.log('═'.repeat(60));

    // Verify policies were created
    const result = await client.query(`
      SELECT COUNT(*) as policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
    `);

    const policyCount = result.rows[0].policy_count;
    console.log(`✅ Total RLS policies created: ${policyCount}`);

    if (policyCount > 40) {
      console.log('✅ All policies applied successfully!\n');
      console.log('═'.repeat(60));
      console.log('🎉 DASHBOARD SHOULD NOW WORK!');
      console.log('═'.repeat(60));
      console.log('');
      console.log('Next steps:');
      console.log('1. Go to: http://localhost:5173');
      console.log('2. Log in as: info@guest-glow.com');
      console.log('3. Password: Dominion#2025');
      console.log('4. Dashboard should now show all data!');
      console.log('');
    } else {
      console.warn(`⚠️  Expected 50+ policies, found ${policyCount}`);
      console.warn('   Some policies may have failed to apply.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);

    if (error.message.includes('password authentication failed')) {
      console.log('\n⚠️  Database password is incorrect.');
      console.log('   Please update the password in this script or use manual method.');
    }

    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run it
applyRLS();
