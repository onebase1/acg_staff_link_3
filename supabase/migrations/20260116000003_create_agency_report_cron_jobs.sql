-- =====================================================
-- AGENCY REPORTING CRON JOBS
-- =====================================================
-- Created: 2026-01-16
-- Purpose: Schedule daily and weekly agency reports
-- =====================================================

-- =====================================================
-- 1. REFRESH DAILY AGENCY METRICS (Hourly)
-- =====================================================

SELECT cron.schedule(
    'refresh-daily-agency-metrics',
    '15 * * * *',  -- Every hour at 15 minutes past the hour
    $$SELECT refresh_daily_agency_metrics();$$
);

-- =====================================================
-- 2. DAILY AGENCY DIGEST (7:00 AM Daily)
-- =====================================================

SELECT cron.schedule(
    'daily-agency-digest',
    '0 7 * * *',  -- Every day at 7:00 AM
    $$
    SELECT
        net.http_post(
            url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/daily-agency-digest',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.service_role_key')
            ),
            body := jsonb_build_object(
                'test_mode', false
            )
        ) as request_id;
    $$
);

-- =====================================================
-- 3. WEEKLY AGENCY SUMMARY (Monday 8:00 AM)
-- =====================================================

SELECT cron.schedule(
    'weekly-agency-summary',
    '0 8 * * 1',  -- Every Monday at 8:00 AM
    $$
    SELECT
        net.http_post(
            url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/weekly-agency-summary',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.service_role_key')
            ),
            body := jsonb_build_object(
                'test_mode', false
            )
        ) as request_id;
    $$
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- View all agency reporting cron jobs
SELECT
    jobid,
    jobname,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobid
FROM cron.job
WHERE jobname IN (
    'refresh-daily-agency-metrics',
    'daily-agency-digest',
    'weekly-agency-summary'
)
ORDER BY jobname;

-- View recent executions
SELECT
    runid,
    jobid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobid IN (
    SELECT jobid FROM cron.job
    WHERE jobname IN (
        'refresh-daily-agency-metrics',
        'daily-agency-digest',
        'weekly-agency-summary'
    )
)
ORDER BY start_time DESC
LIMIT 20;

-- =====================================================
-- MANUAL TRIGGER FUNCTIONS (for testing)
-- =====================================================

-- Manually trigger daily digest for a specific agency
CREATE OR REPLACE FUNCTION trigger_daily_digest_for_agency(p_agency_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT
        net.http_post(
            url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/daily-agency-digest',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.service_role_key')
            ),
            body := jsonb_build_object(
                'agency_id', p_agency_id,
                'test_mode', true
            )
        ) INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION trigger_daily_digest_for_agency(UUID) TO service_role;

COMMENT ON FUNCTION trigger_daily_digest_for_agency IS
'Manually trigger daily digest for a specific agency (test mode)';

-- Manually trigger weekly summary for a specific agency
CREATE OR REPLACE FUNCTION trigger_weekly_summary_for_agency(p_agency_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT
        net.http_post(
            url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/weekly-agency-summary',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.service_role_key')
            ),
            body := jsonb_build_object(
                'agency_id', p_agency_id,
                'test_mode', true
            )
        ) INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION trigger_weekly_summary_for_agency(UUID) TO service_role;

COMMENT ON FUNCTION trigger_weekly_summary_for_agency IS
'Manually trigger weekly summary for a specific agency (test mode)';

-- =====================================================
-- DISABLE/ENABLE FUNCTIONS (for maintenance)
-- =====================================================

-- Disable all agency reporting cron jobs
CREATE OR REPLACE FUNCTION disable_agency_reporting_crons()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE cron.job
    SET active = false
    WHERE jobname IN (
        'refresh-daily-agency-metrics',
        'daily-agency-digest',
        'weekly-agency-summary'
    );

    RAISE NOTICE 'Agency reporting cron jobs disabled';
END;
$$;

-- Enable all agency reporting cron jobs
CREATE OR REPLACE FUNCTION enable_agency_reporting_crons()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE cron.job
    SET active = true
    WHERE jobname IN (
        'refresh-daily-agency-metrics',
        'daily-agency-digest',
        'weekly-agency-summary'
    );

    RAISE NOTICE 'Agency reporting cron jobs enabled';
END;
$$;

GRANT EXECUTE ON FUNCTION disable_agency_reporting_crons() TO service_role;
GRANT EXECUTE ON FUNCTION enable_agency_reporting_crons() TO service_role;

-- =====================================================
-- TESTING INSTRUCTIONS
-- =====================================================

/*
-- Test daily digest for Dominion Healthcare
SELECT trigger_daily_digest_for_agency('dominion-agency-uuid-here'::UUID);

-- Test weekly summary for Dominion Healthcare
SELECT trigger_weekly_summary_for_agency('dominion-agency-uuid-here'::UUID);

-- Check cron job status
SELECT jobname, active, schedule FROM cron.job
WHERE jobname LIKE '%agency%';

-- Disable crons during maintenance
SELECT disable_agency_reporting_crons();

-- Re-enable after maintenance
SELECT enable_agency_reporting_crons();

-- View recent cron execution results
SELECT
    j.jobname,
    r.status,
    r.return_message,
    r.start_time,
    r.end_time
FROM cron.job_run_details r
JOIN cron.job j ON r.jobid = j.jobid
WHERE j.jobname IN ('daily-agency-digest', 'weekly-agency-summary')
ORDER BY r.start_time DESC
LIMIT 10;
*/
