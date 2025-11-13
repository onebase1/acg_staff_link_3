-- ============================================================================
-- SUPABASE NATIVE CRON JOBS SETUP
-- ============================================================================
-- This migration sets up pg_cron for automated shift notifications
-- No more external cron services needed!
-- ============================================================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension (for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ============================================================================
-- CRON JOB 1: Pre-Shift Reminders (24h & 2h before)
-- ============================================================================
-- Runs: Every hour
-- Function: shift-reminder-engine
-- Purpose: Send reminders 24h and 2h before shifts start
-- ============================================================================

SELECT cron.schedule(
    'shift-reminder-engine-hourly',           -- Job name
    '0 * * * *',                               -- Every hour at minute 0
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

-- ============================================================================
-- CRON JOB 2: Post-Shift Timesheet Reminders
-- ============================================================================
-- Runs: Every hour
-- Function: post-shift-timesheet-reminder
-- Purpose: Remind staff to upload timesheets after shifts end
-- ============================================================================

SELECT cron.schedule(
    'post-shift-timesheet-reminder-hourly',   -- Job name
    '0 * * * *',                               -- Every hour at minute 0
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

-- ============================================================================
-- CRON JOB 3: Compliance Monitor (Daily at 8am)
-- ============================================================================
-- Runs: Daily at 8am
-- Function: compliance-monitor
-- Purpose: Check expiring compliance documents and send reminders
-- ============================================================================

SELECT cron.schedule(
    'compliance-monitor-daily',               -- Job name
    '0 8 * * *',                              -- Every day at 8am
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

-- ============================================================================
-- CRON JOB 4: Email Automation Engine (Every 5 minutes)
-- ============================================================================
-- Runs: Every 5 minutes
-- Function: email-automation-engine
-- Purpose: Process batched email queue
-- ============================================================================

SELECT cron.schedule(
    'email-automation-engine-5min',           -- Job name
    '*/5 * * * *',                            -- Every 5 minutes
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

-- ============================================================================
-- MONITORING VIEWS
-- ============================================================================

-- Create view to monitor cron job status
CREATE OR REPLACE VIEW cron_job_status AS
SELECT
    jobid,
    jobname,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job
ORDER BY jobname;

-- Create view to see recent cron job runs
CREATE OR REPLACE VIEW cron_job_runs AS
SELECT
    r.jobid,
    j.jobname,
    r.runid,
    r.job_pid,
    r.database,
    r.username,
    r.command,
    r.status,
    r.return_message,
    r.start_time,
    r.end_time
FROM cron.job_run_details r
LEFT JOIN cron.job j ON r.jobid = j.jobid
ORDER BY r.start_time DESC
LIMIT 100;

-- Grant permissions to view cron jobs
GRANT SELECT ON cron_job_status TO postgres, authenticated;
GRANT SELECT ON cron_job_runs TO postgres, authenticated;

-- ============================================================================
-- USEFUL QUERIES
-- ============================================================================

-- View all scheduled cron jobs
COMMENT ON VIEW cron_job_status IS 'View all scheduled cron jobs. Query: SELECT * FROM cron_job_status;';

-- View recent cron job runs
COMMENT ON VIEW cron_job_runs IS 'View recent cron job executions. Query: SELECT * FROM cron_job_runs WHERE start_time > NOW() - INTERVAL ''24 hours'';';

-- Manually unschedule a job (if needed)
COMMENT ON SCHEMA cron IS 'To unschedule a job: SELECT cron.unschedule(''job-name-here'');';

-- Manually run a job (testing)
COMMENT ON EXTENSION pg_cron IS 'To manually trigger a cron job for testing, copy the command from cron.job table and execute it directly.';
