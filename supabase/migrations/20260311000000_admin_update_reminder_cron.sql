-- =====================================================
-- ADMIN UPDATE REMINDER CRON JOBS
-- =====================================================
-- Created: 2026-03-11
-- Purpose: Send twice-daily email to admin group prompting
--          them to update the system (shifts, staff, changes)
--
-- Send times (UK local):
--   Morning:   11:00am (10:00 UTC — works for both GMT and BST)
--   Afternoon:  2:00pm (13:00 UTC — works for both GMT and BST)
--
-- From: "Kylie from ACG" to avoid spam filters
-- =====================================================

-- Drop existing jobs if re-running this migration
SELECT cron.unschedule('admin-update-reminder-morning')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'admin-update-reminder-morning'
);

SELECT cron.unschedule('admin-update-reminder-afternoon')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'admin-update-reminder-afternoon'
);

-- Morning reminder: 10:00 UTC (= 11:00am GMT / 11:00am BST)
SELECT cron.schedule(
    'admin-update-reminder-morning',
    '0 10 * * 1-5',  -- Weekdays only, 10:00 UTC
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

-- Afternoon reminder: 13:00 UTC (= 2:00pm GMT / 2:00pm BST)
SELECT cron.schedule(
    'admin-update-reminder-afternoon',
    '0 13 * * 1-5',  -- Weekdays only, 13:00 UTC
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
