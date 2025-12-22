-- Add no_show_reminder_sent flag to prevent duplicate SMS
-- This tracks whether we've already sent a "forgot to clock in" reminder

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS no_show_reminder_sent BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN shifts.no_show_reminder_sent IS 'Tracks if no-show reminder SMS was sent to prevent duplicates';

-- Reset any existing shifts (they should not get reminders retroactively)
-- Only affects confirmed/assigned shifts from today that haven't been reminded yet
-- UPDATE shifts SET no_show_reminder_sent = false WHERE no_show_reminder_sent IS NULL;

