-- ============================================================================
-- CRON JOB: Shift Status Automation (Daily at 2am)
-- ============================================================================
-- Runs: Once daily at 2am (off-peak hours for multi-tenant scalability)
-- Function: shift-status-automation
-- Purpose: Auto-transition past-dated shifts to awaiting_admin_closure
-- ============================================================================

-- Ensure pg_cron and pg_net extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule the job to run daily at 2am
SELECT cron.schedule(
    'shift-status-automation-daily',      -- Job name
    '0 2 * * *',                          -- Every day at 2am (cron format: minute hour day month weekday)
    $$
    SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/shift-status-automation',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);

-- ============================================================================
-- MONITORING VIEWS (if not already created)
-- ============================================================================

-- Create view to monitor cron job status (if not exists)
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

-- Create view to see recent cron job runs (if not exists)
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
-- VERIFICATION QUERIES
-- ============================================================================

-- To verify the job is scheduled, run:
-- SELECT * FROM cron_job_status WHERE jobname = 'shift-status-automation-daily';

-- To see recent runs:
-- SELECT * FROM cron_job_runs WHERE jobname = 'shift-status-automation-daily' ORDER BY start_time DESC LIMIT 10;

-- To manually trigger the job for testing:
-- SELECT net.http_post(
--     url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/shift-status-automation',
--     headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
--     ),
--     body := '{}'::jsonb
-- );

-- To unschedule the job (if needed):
-- SELECT cron.unschedule('shift-status-automation-daily');

