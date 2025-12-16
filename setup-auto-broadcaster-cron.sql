-- ============================================================
-- PHASE 2 AUTOMATION: Auto Urgent Digest Broadcaster Cron Job
-- ============================================================
--
-- This cron job runs every 5 minutes and automatically broadcasts
-- all pending urgent shifts using smart-marketplace-digest
--
-- Zero human intervention required!
--
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 📝 STEP 1: Ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 📝 STEP 2: Set service role key for HTTP requests (if not already set)
-- NOTE: Replace with your actual service role key if different
ALTER DATABASE postgres SET app.settings.service_role_key TO 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo';

-- 📝 STEP 3: Delete any existing cron job with this name (for clean reinstall)
SELECT cron.unschedule('auto-urgent-digest-broadcaster');

-- 📝 STEP 4: Create cron job to run every 5 minutes
SELECT cron.schedule(
  'auto-urgent-digest-broadcaster',          -- Job name
  '*/5 * * * *',                              -- Every 5 minutes (can change to */3 for 3min, */10 for 10min, etc.)
  $$
  SELECT
    net.http_post(
      url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/auto-urgent-digest-broadcaster',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type',
        'application/json'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- 📝 STEP 5: Verify cron job was created successfully
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname = 'auto-urgent-digest-broadcaster';

-- 📝 STEP 6: Check cron job execution history (after a few minutes)
-- Run this query after 5-10 minutes to see if the job has run:
SELECT
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-urgent-digest-broadcaster')
ORDER BY start_time DESC
LIMIT 5;

-- ============================================================
-- ✅ DONE! The cron job is now active and will run every 5 minutes
-- ============================================================
--
-- What happens now:
-- 1. Admin creates urgent shift in PostShiftV2
--    → Shift flagged with pending_broadcast=true
-- 2. Cron job runs every 5 minutes
--    → Finds all pending_broadcast=true shifts
--    → Groups by agency
--    → Calls smart-marketplace-digest for each agency
--    → Staff get ONE email with all eligible shifts
--    → Updates shifts: broadcast_sent_at set, pending_broadcast=false
--
-- To disable automation (rollback to manual):
-- SELECT cron.unschedule('auto-urgent-digest-broadcaster');
--
-- ============================================================
