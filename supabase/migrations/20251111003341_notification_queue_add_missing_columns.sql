-- Migration: Add missing columns to notification_queue
-- Generated: 2025-11-11 00:33:41
-- Missing columns: 6

-- Add missing columns to notification_queue table
ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN notification_queue.created_by IS 'User email';

ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS recipient_first_name TEXT;
COMMENT ON COLUMN notification_queue.recipient_first_name IS 'First name';

ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS pending_items JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN notification_queue.pending_items IS 'Queued notification items';

ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS scheduled_send_at TIMESTAMPTZ;
COMMENT ON COLUMN notification_queue.scheduled_send_at IS 'Scheduled send time';

ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS email_message_id TEXT;
COMMENT ON COLUMN notification_queue.email_message_id IS 'Resend message ID';

ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS item_count NUMERIC DEFAULT 0;
COMMENT ON COLUMN notification_queue.item_count IS 'Number of items';

-- Migration completed
