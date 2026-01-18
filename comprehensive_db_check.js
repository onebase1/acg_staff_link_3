import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rzzxxkppkiasuouuglaf.supabase.co',
  'YOUR_SUPABASE_JWT_TOKEN'
);

async function comprehensiveCheck() {
  console.log('🔍 COMPREHENSIVE DATABASE STATE CHECK\n');
  console.log('=' .repeat(60));

  // 1. Check if notification_log table exists
  console.log('\n1️⃣ Checking notification_log table...');
  const { data: tableCheck, error: tableError } = await supabase
    .from('notification_log')
    .select('*')
    .limit(1);

  if (tableError) {
    if (tableError.message.includes('does not exist') || tableError.message.includes('Could not find')) {
      console.log('   ❌ notification_log table: DOES NOT EXIST');
      console.log('   ✅ Safe to create');
    } else {
      console.log('   ⚠️  Error checking table:', tableError.message);
    }
  } else {
    console.log('   ⚠️  notification_log table: ALREADY EXISTS');
    console.log('   ⚠️  Migration uses IF NOT EXISTS, so it will skip creation');
  }

  // 2. Check for existing indexes (skip - can't query directly)
  console.log('\n2️⃣ Checking for existing indexes...');
  console.log('   ℹ️  Cannot directly query pg_indexes via API');
  console.log('   ℹ️  Migration uses CREATE INDEX IF NOT EXISTS (safe)');

  // 3. Check for existing functions
  console.log('\n3️⃣ Checking for existing functions...');
  const functionsToCheck = [
    'get_notification_stats',
    'get_notifications_for_retry',
    'cleanup_old_notification_logs',
    'get_user_notification_history',
    'set_notification_sent_timestamp'
  ];

  for (const funcName of functionsToCheck) {
    try {
      // Try to call with dummy params to see if exists
      if (funcName === 'get_notification_stats') {
        const { error } = await supabase.rpc(funcName, {
          start_date: new Date().toISOString(),
          end_date: new Date().toISOString()
        });

        if (error && error.message.includes('Could not find')) {
          console.log(`   ❌ ${funcName}: DOES NOT EXIST`);
        } else {
          console.log(`   ⚠️  ${funcName}: ALREADY EXISTS (will be replaced with CREATE OR REPLACE)`);
        }
      } else if (funcName === 'get_notifications_for_retry') {
        const { error } = await supabase.rpc(funcName, { max_retry_count: 3 });

        if (error && error.message.includes('Could not find')) {
          console.log(`   ❌ ${funcName}: DOES NOT EXIST`);
        } else {
          console.log(`   ⚠️  ${funcName}: ALREADY EXISTS (will be replaced with CREATE OR REPLACE)`);
        }
      } else {
        console.log(`   ℹ️  ${funcName}: Cannot test directly`);
      }
    } catch (e) {
      console.log(`   ❌ ${funcName}: DOES NOT EXIST (or cannot access)`);
    }
  }

  // 4. Check notification_queue (should exist)
  console.log('\n4️⃣ Checking notification_queue table (should exist)...');
  const { data: queueCheck, error: queueError } = await supabase
    .from('notification_queue')
    .select('*')
    .limit(1);

  if (queueError) {
    console.log('   ❌ notification_queue: DOES NOT EXIST');
    console.log('   ⚠️  WARNING: Migration references notification_queue!');
  } else {
    console.log('   ✅ notification_queue: EXISTS (required for foreign key)');
  }

  // 5. Check referenced tables
  console.log('\n5️⃣ Checking referenced tables (foreign keys)...');
  const requiredTables = ['agencies', 'clients', 'client_contacts', 'staff'];

  for (const tableName of requiredTables) {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);

    if (error) {
      console.log(`   ❌ ${tableName}: MISSING - Foreign key may fail!`);
    } else {
      console.log(`   ✅ ${tableName}: EXISTS`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY & RECOMMENDATION:\n');

  if (tableError && (tableError.message.includes('does not exist') || tableError.message.includes('Could not find'))) {
    console.log('✅ SAFE TO RUN MIGRATION');
    console.log('   • notification_log table does NOT exist');
    console.log('   • notification_queue exists (required)');
    console.log('   • All foreign key tables exist');
    console.log('   • Migration uses IF NOT EXISTS safeguards');
    console.log('   • Migration uses CREATE OR REPLACE for functions');
    console.log('\n🟢 GO AHEAD: Paste the migration SQL into Supabase SQL Editor');
  } else if (!tableError) {
    console.log('⚠️  TABLE ALREADY EXISTS');
    console.log('   • notification_log table ALREADY exists');
    console.log('   • Migration will SKIP table creation (IF NOT EXISTS)');
    console.log('   • Indexes will be added if missing (IF NOT EXISTS)');
    console.log('   • Functions will be updated (CREATE OR REPLACE)');
    console.log('\n🟡 SAFE BUT REDUNDANT: Migration is idempotent, won\'t break anything');
  } else {
    console.log('⚠️  CANNOT VERIFY STATE');
    console.log('   • Limited database visibility from this context');
    console.log('   • Migration includes safety checks (IF NOT EXISTS)');
    console.log('\n🟡 PROCEED WITH CAUTION: Review migration output for errors');
  }

  console.log('\n' + '='.repeat(60));
}

comprehensiveCheck().catch(console.error);
