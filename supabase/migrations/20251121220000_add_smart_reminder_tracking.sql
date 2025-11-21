-- Add reminder tracking columns to shifts table for Phase 2 smart reminders
-- These track which reminder stages have been sent during the 2-hour grace period

-- Add columns if they don't exist
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS reminder_15min_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_1hour_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_urgent_sent BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN shifts.reminder_15min_sent IS 'Tracks if 15-minute post-shift reminder was sent';
COMMENT ON COLUMN shifts.reminder_1hour_sent IS 'Tracks if 1-hour post-shift reminder was sent';
COMMENT ON COLUMN shifts.reminder_urgent_sent IS 'Tracks if urgent (1h45m) final reminder was sent';

-- Create index for efficient querying of shifts needing reminders
CREATE INDEX IF NOT EXISTS idx_shifts_reminder_tracking
  ON shifts(date, status, reminder_15min_sent, reminder_1hour_sent, reminder_urgent_sent)
  WHERE status = 'in_progress';
