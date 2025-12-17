import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkCronJob() {
  console.log('🔍 Checking Cron Job Status\n');
  console.log('='.repeat(80) + '\n');

  try {
    // Check if cron job exists
    const { data: cronJobs, error: cronError } = await supabase
      .rpc('check_cron_job', {});

    if (cronError) {
      // If RPC doesn't exist, try direct query
      const { data, error } = await supabase
        .from('cron.job')
        .select('*')
        .eq('jobname', 'auto-urgent-digest-broadcaster');

      if (error) {
        console.log('⚠️  Cannot query cron.job table directly (expected)');
        console.log('   This requires running SQL in Supabase Dashboard\n');
        console.log('📋 TO CHECK CRON JOB:');
        console.log('   1. Go to Supabase Dashboard → SQL Editor');
        console.log('   2. Run this query:\n');
        console.log('   SELECT jobid, jobname, schedule, active');
        console.log('   FROM cron.job');
        console.log('   WHERE jobname = \'auto-urgent-digest-broadcaster\';\n');
        return;
      }

      if (data && data.length > 0) {
        console.log('✅ CRON JOB FOUND:\n');
        data.forEach(job => {
          console.log(`   Job Name: ${job.jobname}`);
          console.log(`   Schedule: ${job.schedule}`);
          console.log(`   Active: ${job.active ? '✅ YES' : '❌ NO'}`);
          console.log(`   Job ID: ${job.jobid}\n`);
        });
      } else {
        console.log('❌ CRON JOB NOT FOUND\n');
        console.log('📋 SETUP REQUIRED:');
        console.log('   Run: setup-auto-broadcaster-cron.sql in Supabase Dashboard\n');
      }
    }

    // Check edge function deployment
    console.log('📦 Checking Edge Function Deployment...\n');

    const { data: funcTest, error: funcError } = await supabase.functions.invoke(
      'auto-urgent-digest-broadcaster',
      { body: {} }
    );

    if (funcError) {
      console.log('❌ Edge Function NOT deployed or has error:');
      console.log(`   ${funcError.message}\n`);
    } else {
      console.log('✅ Edge Function is deployed and responding\n');
      if (funcTest) {
        console.log('   Response:', JSON.stringify(funcTest, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCronJob();
