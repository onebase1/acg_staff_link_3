-- Migration: Update magic_link_tokens for staff profile support
-- Purpose: Add staff_id and update download_type check

ALTER TABLE magic_link_tokens 
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id) ON DELETE CASCADE;

-- Drop existing check constraint if it exists and recreate with 'profile'
DO $$ 
BEGIN 
    ALTER TABLE magic_link_tokens DROP CONSTRAINT IF EXISTS magic_link_tokens_download_type_check;
    ALTER TABLE magic_link_tokens ADD CONSTRAINT magic_link_tokens_download_type_check 
    CHECK (download_type IN ('pdf', 'csv', 'ics', 'profile'));
END $$;

-- Update the monthly summary cron job to be weekly (Every Monday at 08:30 AM)
-- First, find and unschedule if it exists to avoid duplicates
DO $$
DECLARE
    job_id_to_unschedule INT;
BEGIN
    SELECT jobid INTO job_id_to_unschedule FROM cron.job WHERE jobname = 'monthly-client-summary-automation';
    IF job_id_to_unschedule IS NOT NULL THEN
        PERFORM cron.unschedule('monthly-client-summary-automation');
    END IF;
END $$;

-- Re-schedule with weekly frequency
SELECT cron.schedule(
    'monthly-client-summary-automation', -- job name
    '30 8 * * 1',                       -- 08:30 AM every Monday (1)
    $$ 
    SELECT net.http_post(
        url := (SELECT value FROM settings WHERE key = 'supabase_functions_url') || '/weekly-client-summary',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'service_role_key')
        ),
        body := jsonb_build_object('cron_weekly', true)
    )
    $$
);

COMMENT ON COLUMN magic_link_tokens.staff_id IS 'Associated staff member for profile access.';
