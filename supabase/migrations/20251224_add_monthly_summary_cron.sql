-- Migration: Add Monthly Client Summary cron job
-- Purpose: Schedules the Monthly Alignment Summary email for all active clients
-- Schedule: 1st of every month at 08:00 AM

-- 1. Enable pg_cron extension if not already enabled (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the Monthly Client Summary
SELECT cron.schedule(
    'monthly-client-summary-automation', -- unique job name
    '0 8 1 * *',                         -- 08:00 AM on the 1st day of every month
    $$ SELECT net.http_post(
        url := (SELECT value FROM settings WHERE key = 'SUPABASE_URL') || '/functions/v1/weekly-client-summary',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'SERVICE_ROLE_KEY')
        ),
        body := jsonb_build_object('trigger_source', 'cron_monthly')
    ) $$
);

COMMENT ON COLUMN cron.job.jobname IS 'Monthly summary scheduled for the 1st of every month.';
