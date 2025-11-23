-- Add last_reminder_sent field to staff table for tracking profile completion reminders

ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ;

COMMENT ON COLUMN staff.last_reminder_sent IS 'Last time profile completion reminder was sent';
