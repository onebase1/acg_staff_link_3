-- =====================================================
-- ADMIN UPDATE REMINDER CRON JOBS
-- =====================================================
-- Created: 2026-03-11
-- Purpose: Send twice-daily email to admin group prompting
--          them to update the system (shifts, staff, changes)
-- Times:   9:00 AM UTC and 5:00 PM UTC daily
-- =====================================================

-- Morning reminder: 9:00 AM UTC daily
SELECT cron.schedule(
    'admin-update-reminder-morning',
    '0 9 * * *',
    $$
    SELECT
        net.http_post(
            url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/admin-update-reminder',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.service_role_key')
            ),
            body := '{}'::jsonb
        ) as request_id;
    $$
);

-- Afternoon reminder: 5:00 PM UTC daily
SELECT cron.schedule(
    'admin-update-reminder-afternoon',
    '0 17 * * *',
    $$
    SELECT
        net.http_post(
            url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/admin-update-reminder',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.service_role_key')
            ),
            body := '{}'::jsonb
        ) as request_id;
    $$
);

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT jobname, schedule, active
FROM cron.job
WHERE jobname IN (
    'admin-update-reminder-morning',
    'admin-update-reminder-afternoon'
)
ORDER BY jobname;
