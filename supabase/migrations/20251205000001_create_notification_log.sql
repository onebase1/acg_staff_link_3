-- ============================================================================
-- CREATE notification_log TABLE (AUDIT TRAIL)
-- ============================================================================
-- Date: 2025-12-05
-- Purpose: Comprehensive audit trail for ALL notifications sent across all channels
--
-- This table tracks:
-- - Every notification attempt (queued, sent, failed)
-- - Delivery status (sent, opened, clicked, bounced)
-- - Provider message IDs (Resend, Twilio, etc.)
-- - Error messages for debugging
-- - Related entities (shift, invoice, compliance, etc.)
--
-- GDPR/Compliance: This log is essential for proving notification delivery
-- and respecting user preferences.
-- ============================================================================

-- Create notification_log table
CREATE TABLE IF NOT EXISTS notification_log (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient Information
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES client_contacts(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_name TEXT,

  -- Notification Details
  notification_type TEXT NOT NULL,
  -- Types: shift_assigned, shift_confirmed, shift_24h_reminder, shift_2h_reminder,
  --        shift_complete, staff_no_show, invoice_generated, payment_reminder,
  --        compliance_warning, document_expiring, system_update, etc.

  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'in_app', 'voice_call', 'push')),

  subject TEXT, -- For emails
  message_preview TEXT, -- First 200 chars of message
  template_name TEXT, -- Template used (e.g., 'shift_reminder_24h.html')

  -- Related Entity (for cross-referencing)
  related_entity_id UUID,
  related_entity_type TEXT,
  -- Types: shift, invoice, compliance, staff, timesheet, payment

  -- Delivery Status Lifecycle
  status TEXT DEFAULT 'queued' CHECK (status IN (
    'queued',          -- Added to queue, not sent yet
    'sent',            -- Successfully sent to provider
    'delivered',       -- Confirmed delivered by provider
    'failed',          -- Failed to send
    'bounced',         -- Email bounced
    'opened',          -- Email opened by recipient
    'clicked',         -- Link clicked in email
    'unsubscribed',    -- User unsubscribed via this notification
    'spam_reported'    -- User marked as spam
  )),

  -- Provider Integration
  provider TEXT, -- 'resend', 'twilio_sms', 'twilio_whatsapp', 'n8n_whatsapp'
  provider_message_id TEXT, -- Message ID from provider (for tracking)
  provider_response JSONB, -- Full provider response (for debugging)

  -- Error Handling
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  retry_at TIMESTAMPTZ, -- When to retry if failed

  -- Preference Tracking
  preference_checked BOOLEAN DEFAULT false, -- Was user preference checked?
  preference_status TEXT, -- 'opted_in', 'opted_out', 'not_applicable'
  skipped_reason TEXT, -- Why notification was skipped (e.g., 'user_opted_out', 'rate_limited')

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Metadata (flexible storage for additional info)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Batch Information
  batch_id UUID, -- If part of batched notification
  queue_id UUID REFERENCES notification_queue(id) ON DELETE SET NULL
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Index for finding logs by recipient email (common query)
CREATE INDEX IF NOT EXISTS idx_notification_log_recipient_email
  ON notification_log(recipient_email)
  WHERE recipient_email IS NOT NULL;

-- Index for finding logs by recipient phone
CREATE INDEX IF NOT EXISTS idx_notification_log_recipient_phone
  ON notification_log(recipient_phone)
  WHERE recipient_phone IS NOT NULL;

-- Index for finding logs by notification type
CREATE INDEX IF NOT EXISTS idx_notification_log_type
  ON notification_log(notification_type);

-- Index for finding logs by status
CREATE INDEX IF NOT EXISTS idx_notification_log_status
  ON notification_log(status);

-- Index for finding logs by channel
CREATE INDEX IF NOT EXISTS idx_notification_log_channel
  ON notification_log(channel);

-- Index for finding logs by agency
CREATE INDEX IF NOT EXISTS idx_notification_log_agency
  ON notification_log(agency_id)
  WHERE agency_id IS NOT NULL;

-- Index for finding logs by client
CREATE INDEX IF NOT EXISTS idx_notification_log_client
  ON notification_log(client_id)
  WHERE client_id IS NOT NULL;

-- Index for finding logs by staff
CREATE INDEX IF NOT EXISTS idx_notification_log_staff
  ON notification_log(staff_id)
  WHERE staff_id IS NOT NULL;

-- Index for time-based queries (most common)
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at
  ON notification_log(created_at DESC);

-- Index for finding failed notifications that need retry
CREATE INDEX IF NOT EXISTS idx_notification_log_retry
  ON notification_log(status, retry_at)
  WHERE status = 'failed' AND retry_at IS NOT NULL;

-- Index for finding provider message IDs (for webhooks)
CREATE INDEX IF NOT EXISTS idx_notification_log_provider_message_id
  ON notification_log(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

-- Index for related entity lookups
CREATE INDEX IF NOT EXISTS idx_notification_log_related_entity
  ON notification_log(related_entity_type, related_entity_id)
  WHERE related_entity_id IS NOT NULL;

-- Composite index for recipient + type queries
CREATE INDEX IF NOT EXISTS idx_notification_log_recipient_type
  ON notification_log(recipient_email, notification_type, created_at DESC)
  WHERE recipient_email IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all notification logs
CREATE POLICY "Admins can view all notification logs"
  ON notification_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin', 'super_admin')
    )
  );

-- Users can view their own notification logs
CREATE POLICY "Users can view their own notification logs"
  ON notification_log
  FOR SELECT
  USING (
    recipient_email IN (
      SELECT email FROM profiles WHERE id = auth.uid()
    )
    OR contact_id IN (
      SELECT id FROM client_contacts WHERE profile_id = auth.uid()
    )
  );

-- Service role has full access (for edge functions)
CREATE POLICY "Service role has full access to notification log"
  ON notification_log
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get notification stats by date range
CREATE OR REPLACE FUNCTION get_notification_stats(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  notification_type TEXT,
  channel TEXT,
  total_sent BIGINT,
  total_failed BIGINT,
  total_opened BIGINT,
  total_clicked BIGINT,
  open_rate NUMERIC,
  click_rate NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    nl.notification_type,
    nl.channel,
    COUNT(*) FILTER (WHERE nl.status IN ('sent', 'delivered', 'opened', 'clicked')) as total_sent,
    COUNT(*) FILTER (WHERE nl.status = 'failed') as total_failed,
    COUNT(*) FILTER (WHERE nl.status IN ('opened', 'clicked')) as total_opened,
    COUNT(*) FILTER (WHERE nl.status = 'clicked') as total_clicked,
    ROUND(
      COUNT(*) FILTER (WHERE nl.status IN ('opened', 'clicked'))::NUMERIC /
      NULLIF(COUNT(*) FILTER (WHERE nl.status IN ('sent', 'delivered', 'opened', 'clicked')), 0) * 100,
      2
    ) as open_rate,
    ROUND(
      COUNT(*) FILTER (WHERE nl.status = 'clicked')::NUMERIC /
      NULLIF(COUNT(*) FILTER (WHERE nl.status IN ('sent', 'delivered', 'opened', 'clicked')), 0) * 100,
      2
    ) as click_rate
  FROM notification_log nl
  WHERE nl.created_at BETWEEN start_date AND end_date
  GROUP BY nl.notification_type, nl.channel
  ORDER BY total_sent DESC;
END;
$$;

-- Function to get failed notifications for retry
CREATE OR REPLACE FUNCTION get_notifications_for_retry(
  max_retry_count INTEGER DEFAULT 3
)
RETURNS SETOF notification_log
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM notification_log
  WHERE status = 'failed'
    AND retry_count < max_retry_count
    AND (retry_at IS NULL OR retry_at <= NOW())
  ORDER BY created_at ASC
  LIMIT 100; -- Limit to prevent overwhelming the system
END;
$$;

-- Function to clean up old logs (housekeeping)
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs(
  retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete non-critical logs older than retention period
  DELETE FROM notification_log
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
    AND notification_type NOT IN ('compliance_warning', 'payment_reminder', 'invoice_generated')
    AND status IN ('sent', 'delivered', 'opened', 'clicked');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Cleaned up % old notification log entries', deleted_count;
  RETURN deleted_count;
END;
$$;

-- Function to get user notification history
CREATE OR REPLACE FUNCTION get_user_notification_history(
  user_email TEXT,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  sent_date DATE,
  notification_type TEXT,
  channel TEXT,
  status TEXT,
  subject TEXT,
  opened BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(nl.created_at) as sent_date,
    nl.notification_type,
    nl.channel,
    nl.status,
    nl.subject,
    (nl.status IN ('opened', 'clicked')) as opened
  FROM notification_log nl
  WHERE nl.recipient_email = user_email
    AND nl.created_at >= NOW() - (days_back || ' days')::INTERVAL
  ORDER BY nl.created_at DESC;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to automatically set sent_at when status changes to 'sent'
CREATE OR REPLACE FUNCTION set_notification_sent_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'sent' AND OLD.status != 'sent' AND NEW.sent_at IS NULL THEN
    NEW.sent_at = NOW();
  END IF;

  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at = NOW();
  END IF;

  IF NEW.status = 'opened' AND OLD.status != 'opened' AND NEW.opened_at IS NULL THEN
    NEW.opened_at = NOW();
  END IF;

  IF NEW.status = 'clicked' AND OLD.status != 'clicked' AND NEW.clicked_at IS NULL THEN
    NEW.clicked_at = NOW();
  END IF;

  IF NEW.status = 'failed' AND OLD.status != 'failed' AND NEW.failed_at IS NULL THEN
    NEW.failed_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_notification_timestamps
  BEFORE UPDATE ON notification_log
  FOR EACH ROW
  EXECUTE FUNCTION set_notification_sent_timestamp();

-- ============================================================================
-- COMMENTS for Documentation
-- ============================================================================

COMMENT ON TABLE notification_log IS 'Comprehensive audit trail of all notifications sent across all channels. Critical for GDPR compliance and debugging.';
COMMENT ON COLUMN notification_log.notification_type IS 'Type of notification (e.g., shift_assigned, payment_reminder)';
COMMENT ON COLUMN notification_log.channel IS 'Delivery channel: email, sms, whatsapp, in_app, voice_call, push';
COMMENT ON COLUMN notification_log.status IS 'Delivery status lifecycle: queued → sent → delivered → opened → clicked';
COMMENT ON COLUMN notification_log.provider_message_id IS 'Message ID from delivery provider (Resend, Twilio) for tracking and webhooks';
COMMENT ON COLUMN notification_log.preference_checked IS 'Whether user notification preferences were checked before sending';
COMMENT ON COLUMN notification_log.preference_status IS 'User preference status at time of send: opted_in, opted_out, not_applicable';
COMMENT ON COLUMN notification_log.skipped_reason IS 'Why notification was not sent: user_opted_out, rate_limited, invalid_recipient, etc.';
COMMENT ON COLUMN notification_log.retry_count IS 'Number of retry attempts for failed notifications';
COMMENT ON COLUMN notification_log.metadata IS 'Additional tracking data (JSONB): template variables, A/B test variant, campaign ID, etc.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  index_count INTEGER;
  policy_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_log') THEN
    RAISE NOTICE '✅ notification_log table created successfully';

    -- Check indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE tablename = 'notification_log';

    RAISE NOTICE '✅ Created % indexes for performance', index_count;

    -- Check RLS
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notification_log' AND rowsecurity = true) THEN
      RAISE NOTICE '✅ Row Level Security enabled';
    END IF;

    -- Check policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'notification_log';

    RAISE NOTICE '✅ Created % RLS policies', policy_count;

    -- Check functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_notification_stats') THEN
      RAISE NOTICE '✅ Helper functions created successfully';
    END IF;
  ELSE
    RAISE EXCEPTION '❌ notification_log table creation failed';
  END IF;
END $$;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Log a notification send
-- INSERT INTO notification_log (
--   agency_id, recipient_email, notification_type, channel,
--   subject, template_name, related_entity_id, related_entity_type,
--   status, provider, provider_message_id, preference_checked, preference_status
-- ) VALUES (
--   'agency-uuid', 'user@example.com', 'shift_24h_reminder', 'email',
--   'Reminder: Your shift tomorrow', 'shift_reminder_24h.html',
--   'shift-uuid', 'shift',
--   'sent', 'resend', 'resend-msg-id-123', true, 'opted_in'
-- );

-- Example 2: Update status when email is opened (webhook from Resend)
-- UPDATE notification_log
-- SET status = 'opened', opened_at = NOW()
-- WHERE provider_message_id = 'resend-msg-id-123';

-- Example 3: Get notification statistics for last 7 days
-- SELECT * FROM get_notification_stats();

-- Example 4: Get failed notifications that need retry
-- SELECT * FROM get_notifications_for_retry();

-- Example 5: Get user's notification history
-- SELECT * FROM get_user_notification_history('user@example.com', 30);

-- Example 6: Check if user received a specific notification
-- SELECT EXISTS (
--   SELECT 1 FROM notification_log
--   WHERE recipient_email = 'user@example.com'
--     AND notification_type = 'shift_24h_reminder'
--     AND related_entity_id = 'shift-uuid'
--     AND status IN ('sent', 'delivered', 'opened', 'clicked')
-- );

-- Example 7: Clean up old logs (run monthly)
-- SELECT cleanup_old_notification_logs(90);
