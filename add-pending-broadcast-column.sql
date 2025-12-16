-- Add pending_broadcast column to shifts table for automated broadcasting
-- This column flags shifts that should be auto-broadcast by the cron job

-- Add column
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS pending_broadcast BOOLEAN DEFAULT FALSE;

-- Create index for fast lookup by cron job
CREATE INDEX IF NOT EXISTS idx_shifts_pending_broadcast
ON shifts(pending_broadcast, broadcast_sent_at, agency_id)
WHERE pending_broadcast = true AND broadcast_sent_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN shifts.pending_broadcast IS 'Flag for urgent shifts awaiting automated broadcast via cron job';

-- Verify column added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'shifts' AND column_name = 'pending_broadcast';
