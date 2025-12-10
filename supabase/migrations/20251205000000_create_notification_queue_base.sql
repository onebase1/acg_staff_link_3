-- ============================================================================
-- CREATE notification_queue TABLE (BASE)
-- ============================================================================
-- Date: 2025-12-05
-- Purpose: Base table for batched notification queue system
--
-- This migration creates the BASE table that was missing.
-- The migration 20251111003341_notification_queue_add_missing_columns.sql
-- added columns but assumed the base table existed.
--
-- IMPORTANT: This table works with notification-digest-engine edge function
-- which processes the queue every 5 minutes.
-- ============================================================================

-- Create notification_queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_queue (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Fields (Original)
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('client', 'staff', 'admin', 'agency')),
  notification_type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),

  -- Timestamps
  created_date TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,

  -- Additional Fields (Added by later migration 20251111003341)
  -- These are included here for completeness, but the ALTER TABLE migration
  -- will add them if they don't exist (using IF NOT EXISTS)
  created_by TEXT,
  recipient_first_name TEXT,
  pending_items JSONB DEFAULT '[]'::jsonb,
  scheduled_send_at TIMESTAMPTZ,
  email_message_id TEXT, -- Resend API message ID
  item_count NUMERIC DEFAULT 0
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Index for finding pending notifications
CREATE INDEX IF NOT EXISTS idx_notification_queue_status
  ON notification_queue(status)
  WHERE status = 'pending';

-- Index for finding notifications by recipient
CREATE INDEX IF NOT EXISTS idx_notification_queue_recipient
  ON notification_queue(recipient_email);

-- Index for finding scheduled notifications
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled
  ON notification_queue(scheduled_send_at)
  WHERE status = 'pending';

-- Index for finding notifications by agency
CREATE INDEX IF NOT EXISTS idx_notification_queue_agency
  ON notification_queue(agency_id);

-- Index for finding notifications by type
CREATE INDEX IF NOT EXISTS idx_notification_queue_type
  ON notification_queue(notification_type);

-- Composite index for digest engine queries
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending_by_recipient
  ON notification_queue(recipient_email, notification_type, status)
  WHERE status = 'pending';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Admins can view all notification queue items
CREATE POLICY "Admins can view all notification queue items"
  ON notification_queue
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin', 'super_admin')
    )
  );

-- Admins can manage notification queue
CREATE POLICY "Admins can manage notification queue"
  ON notification_queue
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin', 'super_admin')
    )
  );

-- Service role has full access (for edge functions)
CREATE POLICY "Service role has full access to notification queue"
  ON notification_queue
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to clean up old sent/failed notifications (housekeeping)
CREATE OR REPLACE FUNCTION cleanup_old_notification_queue()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete notifications older than 30 days that are sent or failed
  DELETE FROM notification_queue
  WHERE created_date < NOW() - INTERVAL '30 days'
    AND status IN ('sent', 'failed', 'cancelled');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Cleaned up % old notification queue items', deleted_count;
  RETURN deleted_count;
END;
$$;

-- Function to get pending notification count by type
CREATE OR REPLACE FUNCTION get_pending_notification_count(
  p_notification_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  notification_type TEXT,
  pending_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_notification_type IS NULL THEN
    -- Return counts for all types
    RETURN QUERY
    SELECT
      nq.notification_type,
      COUNT(*) as pending_count
    FROM notification_queue nq
    WHERE nq.status = 'pending'
    GROUP BY nq.notification_type
    ORDER BY pending_count DESC;
  ELSE
    -- Return count for specific type
    RETURN QUERY
    SELECT
      p_notification_type as notification_type,
      COUNT(*) as pending_count
    FROM notification_queue nq
    WHERE nq.status = 'pending'
      AND nq.notification_type = p_notification_type
    GROUP BY nq.notification_type;
  END IF;
END;
$$;

-- ============================================================================
-- COMMENTS for Documentation
-- ============================================================================

COMMENT ON TABLE notification_queue IS 'Queue for batched notification delivery. Processed by notification-digest-engine every 5 minutes.';
COMMENT ON COLUMN notification_queue.agency_id IS 'Agency that owns this notification';
COMMENT ON COLUMN notification_queue.recipient_email IS 'Email address of recipient';
COMMENT ON COLUMN notification_queue.recipient_type IS 'Type of recipient: client, staff, admin, agency';
COMMENT ON COLUMN notification_queue.notification_type IS 'Type of notification: shift_assigned, shift_confirmed, invoice_generated, etc.';
COMMENT ON COLUMN notification_queue.message IS 'Plain text message (for SMS/fallback)';
COMMENT ON COLUMN notification_queue.status IS 'Queue status: pending (not sent), processing (being sent), sent (delivered), failed (error), cancelled (user action)';
COMMENT ON COLUMN notification_queue.pending_items IS 'JSONB array of notification items to be batched together (e.g., multiple shifts)';
COMMENT ON COLUMN notification_queue.scheduled_send_at IS 'When to send this notification (for delayed sends)';
COMMENT ON COLUMN notification_queue.email_message_id IS 'Message ID from Resend API after successful send';
COMMENT ON COLUMN notification_queue.item_count IS 'Number of items in pending_items array (for quick filtering)';
COMMENT ON COLUMN notification_queue.created_by IS 'Email of user who created the notification (for audit)';
COMMENT ON COLUMN notification_queue.recipient_first_name IS 'Recipient first name for personalization';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_queue') THEN
    RAISE NOTICE '✅ notification_queue table created successfully';

    -- Check if all required indexes exist
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'notification_queue' AND indexname = 'idx_notification_queue_status') THEN
      RAISE NOTICE '✅ Indexes created successfully';
    END IF;

    -- Check if RLS is enabled
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notification_queue' AND rowsecurity = true) THEN
      RAISE NOTICE '✅ Row Level Security enabled';
    END IF;
  ELSE
    RAISE EXCEPTION '❌ notification_queue table creation failed';
  END IF;
END $$;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Add a notification to the queue
-- INSERT INTO notification_queue (
--   agency_id, recipient_email, recipient_type, notification_type,
--   message, recipient_first_name, pending_items, item_count, scheduled_send_at
-- ) VALUES (
--   'agency-uuid', 'client@example.com', 'client', 'shift_assigned',
--   'You have new shift assignments', 'John',
--   '[{"shift_id": "uuid", "shift_date": "2025-12-10"}]'::jsonb,
--   1, NOW()
-- );

-- Example 2: Get all pending notifications for a recipient
-- SELECT * FROM notification_queue
-- WHERE recipient_email = 'client@example.com'
--   AND status = 'pending'
-- ORDER BY created_date ASC;

-- Example 3: Mark notification as sent
-- UPDATE notification_queue
-- SET status = 'sent',
--     sent_at = NOW(),
--     email_message_id = 'resend-message-id'
-- WHERE id = 'notification-uuid';

-- Example 4: Get pending notification counts by type
-- SELECT * FROM get_pending_notification_count();

-- Example 5: Clean up old notifications (run monthly)
-- SELECT cleanup_old_notification_queue();
