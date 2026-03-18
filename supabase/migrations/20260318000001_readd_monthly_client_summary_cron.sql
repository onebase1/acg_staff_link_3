-- ============================================================================
-- Migration: Fix client summary cron jobs
--
-- 1. Re-add monthly client summary (1st of month) — was accidentally removed
--    when the monthly cron was converted to weekly in 20251224_update_magic_tokens_and_cron.sql
--
-- 2. Patch the weekly client summary cron to use hardcoded URL instead of
--    settings table lookup (key 'supabase_functions_url' may not exist)
--
-- 3. Unschedule legacy email-automation-engine (replaced by dedicated
--    daily-agency-digest and weekly-agency-summary functions)
-- ============================================================================

-- ============================================================================
-- FIX 1: Re-add monthly client summary cron (1st of month, 8 AM)
-- ============================================================================

-- Safety unschedule in case it already exists from a prior run
DO $$
DECLARE
    job_exists INT;
BEGIN
    SELECT COUNT(*) INTO job_exists FROM cron.job WHERE jobname = 'monthly-client-summary-1st';
    IF job_exists > 0 THEN
        PERFORM cron.unschedule('monthly-client-summary-1st');
    END IF;
END $$;

SELECT cron.schedule(
    'monthly-client-summary-1st',
    '0 8 1 * *',   -- 08:00 AM on the 1st of every month
    $$
    SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/weekly-client-summary',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'SERVICE_ROLE_KEY')
        ),
        body := jsonb_build_object('trigger_source', 'cron_monthly')
    )
    $$
);

-- ============================================================================
-- FIX 2: Patch weekly cron to use hardcoded URL (replaces settings table lookup)
-- The job 'monthly-client-summary-automation' was repurposed as the weekly job.
-- Its URL used settings key 'supabase_functions_url' which may not exist.
-- ============================================================================

DO $$
DECLARE
    job_exists INT;
BEGIN
    SELECT COUNT(*) INTO job_exists FROM cron.job WHERE jobname = 'monthly-client-summary-automation';
    IF job_exists > 0 THEN
        PERFORM cron.unschedule('monthly-client-summary-automation');
    END IF;
END $$;

SELECT cron.schedule(
    'weekly-client-summary-mondays',   -- renamed for clarity
    '30 8 * * 1',   -- 08:30 AM every Monday
    $$
    SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/weekly-client-summary',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'SERVICE_ROLE_KEY')
        ),
        body := jsonb_build_object('cron_weekly', true)
    )
    $$
);

-- ============================================================================
-- FIX 3: Unschedule legacy email-automation-engine
-- Replaced by: daily-agency-digest (7 AM daily) + weekly-agency-summary (Mon 8 AM)
-- Function is kept deployed for manual testing but no longer runs on cron.
-- ============================================================================

DO $$
DECLARE
    job_exists INT;
BEGIN
    SELECT COUNT(*) INTO job_exists FROM cron.job WHERE jobname = 'email-automation-engine';
    IF job_exists > 0 THEN
        PERFORM cron.unschedule('email-automation-engine');
    END IF;
END $$;
