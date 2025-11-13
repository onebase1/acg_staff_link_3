-- ============================================================================
-- 🚀 COPY THIS ENTIRE FILE AND PASTE INTO SUPABASE SQL EDITOR
-- ============================================================================
-- URL: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/sql/new
-- Just paste this entire file and click RUN ▶️
-- ============================================================================

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Step 3: Schedule Cron Jobs

-- ⏰ Pre-Shift Reminders (every hour)
SELECT cron.schedule(
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
);

-- 📋 Post-Shift Timesheet Reminders (every hour)
SELECT cron.schedule(
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
);

-- 🛡️ Compliance Monitor (daily at 8am)
SELECT cron.schedule(
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
);

-- 📧 Email Queue Processor (every 5 minutes)
SELECT cron.schedule(
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
);

-- Step 4: Create monitoring views
CREATE OR REPLACE VIEW cron_job_status AS
SELECT jobid, jobname, schedule, command, nodename, nodeport, database, username, active
FROM cron.job ORDER BY jobname;

CREATE OR REPLACE VIEW cron_job_runs AS
SELECT r.jobid, j.jobname, r.runid, r.job_pid, r.database, r.username, r.command, r.status, r.return_message, r.start_time, r.end_time
FROM cron.job_run_details r
LEFT JOIN cron.job j ON r.jobid = j.jobid
ORDER BY r.start_time DESC LIMIT 100;

GRANT SELECT ON cron_job_status TO postgres, authenticated;
GRANT SELECT ON cron_job_runs TO postgres, authenticated;

-- ============================================================================
-- ✅ VERIFY IT WORKED
-- ============================================================================
-- Run this to see your scheduled cron jobs:
SELECT * FROM cron_job_status;
