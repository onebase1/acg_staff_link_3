#!/usr/bin/env node

/**
 * Setup Native pg_cron Jobs in Supabase
 * Executes SQL statements to schedule automated cron jobs
 */

const https = require('https');

const SUPABASE_URL = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo';

// SQL statements to execute
const sqlStatements = [
  {
    name: 'Enable pg_cron extension',
    sql: 'CREATE EXTENSION IF NOT EXISTS pg_cron'
  },
  {
    name: 'Enable pg_net extension',
    sql: 'CREATE EXTENSION IF NOT EXISTS pg_net'
  },
  {
    name: 'Grant cron permissions',
    sql: 'GRANT USAGE ON SCHEMA cron TO postgres'
  },
  {
    name: 'Schedule shift-reminder-engine',
    sql: `SELECT cron.schedule(
      'shift-reminder-engine-hourly',
      '0 * * * *',
      $$
      SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/shift-reminder-engine',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $$
    )`
  },
  {
    name: 'Schedule post-shift-timesheet-reminder',
    sql: `SELECT cron.schedule(
      'post-shift-timesheet-reminder-hourly',
      '0 * * * *',
      $$
      SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/post-shift-timesheet-reminder',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $$
    )`
  },
  {
    name: 'Schedule compliance-monitor',
    sql: `SELECT cron.schedule(
      'compliance-monitor-daily',
      '0 8 * * *',
      $$
      SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/compliance-monitor',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $$
    )`
  },
  {
    name: 'Schedule email-automation-engine',
    sql: `SELECT cron.schedule(
      'email-automation-engine-5min',
      '*/5 * * * *',
      $$
      SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/email-automation-engine',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $$
    )`
  },
  {
    name: 'Create monitoring views',
    sql: `CREATE OR REPLACE VIEW cron_job_status AS
      SELECT jobid, jobname, schedule, command, nodename, nodeport, database, username, active
      FROM cron.job ORDER BY jobname`
  },
  {
    name: 'Create cron_job_runs view',
    sql: `CREATE OR REPLACE VIEW cron_job_runs AS
      SELECT r.jobid, j.jobname, r.runid, r.job_pid, r.database, r.username, r.command, r.status, r.return_message, r.start_time, r.end_time
      FROM cron.job_run_details r
      LEFT JOIN cron.job j ON r.jobid = j.jobid
      ORDER BY r.start_time DESC LIMIT 100`
  },
  {
    name: 'Grant view permissions',
    sql: 'GRANT SELECT ON cron_job_status TO postgres, authenticated'
  }
];

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: 'rzzxxkppkiasuouuglaf.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/exec',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, body });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function setupCronJobs() {
  console.log('🚀 Setting up native pg_cron jobs in Supabase...\n');

  let successCount = 0;
  let failCount = 0;

  for (const statement of sqlStatements) {
    try {
      console.log(`⏳ ${statement.name}...`);
      await executeSQL(statement.sql);
      console.log(`✅ ${statement.name} - SUCCESS\n`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${statement.name} - FAILED`);
      console.error(`   Error: ${error.message}\n`);
      failCount++;
    }
  }

  console.log('═'.repeat(60));
  console.log(`\n📊 Setup Summary:`);
  console.log(`   ✅ Successful: ${successCount}/${sqlStatements.length}`);
  console.log(`   ❌ Failed: ${failCount}/${sqlStatements.length}\n`);

  if (failCount === 0) {
    console.log('🎉 All cron jobs have been set up successfully!');
    console.log('\n📋 Verify with: SELECT * FROM cron_job_status;\n');
  } else {
    console.log('⚠️  Some operations failed. Please check the errors above.');
  }
}

// Run the setup
setupCronJobs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
