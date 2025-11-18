-- ============================================================================
-- ADD NOTIFICATION DIGEST ENGINE CRON JOB
-- ============================================================================
-- This migration adds the notification-digest-engine cron job
-- Runs every 5 minutes to process batched email notifications
--
-- IMPORTANT: This does NOT replace email-automation-engine!
-- Both engines serve different purposes:
-- - email-automation-engine: Daily/weekly digest emails (8am)
-- - notification-digest-engine: Batched shift assignment notifications (every 5 min)
-- ============================================================================

-- First, unschedule if it already exists (idempotent)
SELECT cron.unschedule('notification-digest-engine-5min') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'notification-digest-engine-5min'
);

-- ============================================================================
-- CRON JOB: Notification Digest Engine (Every 5 minutes)
-- ============================================================================
-- Runs: Every 5 minutes
-- Function: notification-digest-engine
-- Purpose: Process batched notification queue and send shift assignment emails
-- ============================================================================

SELECT cron.schedule(
    'notification-digest-engine-5min',        -- Job name
    '*/5 * * * *',                            -- Every 5 minutes
    $$
    SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/notification-digest-engine',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check if the cron job was created successfully
-- Run: SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE '%digest%' OR jobname LIKE '%email%';

