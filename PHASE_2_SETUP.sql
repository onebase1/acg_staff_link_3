-- ========================================
-- PHASE 2 SETUP: Smart Reminder System
-- Run this in Supabase Dashboard → SQL Editor
-- ========================================

-- Step 1: Add reminder tracking columns to shifts table
-- ========================================
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS reminder_15min_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_1hour_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_urgent_sent BOOLEAN DEFAULT FALSE;

-- Add helpful comments for documentation
COMMENT ON COLUMN shifts.reminder_15min_sent IS 'Tracks if 15-minute post-shift reminder was sent';
COMMENT ON COLUMN shifts.reminder_1hour_sent IS 'Tracks if 1-hour post-shift reminder was sent';
COMMENT ON COLUMN shifts.reminder_urgent_sent IS 'Tracks if urgent (1h45m) final reminder was sent';

-- Create index for efficient querying of shifts needing reminders
CREATE INDEX IF NOT EXISTS idx_shifts_reminder_tracking
  ON shifts(date, status, reminder_15min_sent, reminder_1hour_sent, reminder_urgent_sent)
  WHERE status = 'in_progress';

-- ========================================
-- Step 2: Configure Cron Job for Smart Reminders
-- Runs every 5 minutes
-- ========================================

-- First, check if cron job already exists and remove it if needed
SELECT cron.unschedule('smart-clock-out-reminders');

-- Create the cron job
SELECT cron.schedule(
  'smart-clock-out-reminders',           -- Job name
  '*/5 * * * *',                         -- Every 5 minutes
  $$
    SELECT
      net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/smart-clock-out-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
        ),
        body := '{}'::jsonb
      ) as request_id;
  $$
);

-- ========================================
-- Step 3: Verify Setup
-- ========================================

-- Check columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'shifts'
  AND column_name IN ('reminder_15min_sent', 'reminder_1hour_sent', 'reminder_urgent_sent');

-- Check cron job was created
SELECT jobid, schedule, command, nodename, nodeport, database, username, active, jobname
FROM cron.job
WHERE jobname = 'smart-clock-out-reminders';

-- ========================================
-- SUCCESS! Phase 2 is now configured
-- ========================================
-- The smart reminder system will now:
-- 1. Run every 5 minutes
-- 2. Check for shifts that ended but staff haven't clocked out
-- 3. Send automatic reminders at 15min, 1h, and 1h45m
-- 4. Skip reminders if staff already clocked out
-- ========================================
