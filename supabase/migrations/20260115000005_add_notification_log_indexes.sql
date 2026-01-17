-- Migration: Add indexes to notification_log for fast context lookup
-- Purpose: Enable fast WhatsApp message context retrieval
-- Author: Kylie AI Implementation
-- Date: 2026-01-15

-- Add indexes for WhatsApp context lookup
CREATE INDEX IF NOT EXISTS idx_notification_log_message_id
  ON notification_log(message_id)
  WHERE message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_log_staff_sent
  ON notification_log(staff_id, sent_at DESC)
  WHERE staff_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_log_channel_sent
  ON notification_log(channel, sent_at DESC)
  WHERE channel = 'whatsapp';

CREATE INDEX IF NOT EXISTS idx_notification_log_template
  ON notification_log(template_name, sent_at DESC)
  WHERE template_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_log_status
  ON notification_log(status, sent_at DESC);

-- Add index for finding recent notifications by phone number
CREATE INDEX IF NOT EXISTS idx_notification_log_phone
  ON notification_log(recipient_phone, sent_at DESC)
  WHERE recipient_phone IS NOT NULL;

-- Comments for existing columns (if they exist)
COMMENT ON COLUMN notification_log.message_id IS 'WhatsApp message ID (from Meta API) - used for threading/context';
COMMENT ON COLUMN notification_log.template_name IS 'Template name used (e.g., shift_reminder, timesheetreminder) - for context-aware replies';
COMMENT ON COLUMN notification_log.metadata IS 'Template variables and context data (shift_id, client_name, etc.)';
COMMENT ON COLUMN notification_log.channel IS 'Delivery channel: email, sms, whatsapp, in_app';

-- Function to get last notification sent to a phone number
CREATE OR REPLACE FUNCTION get_last_notification(
  p_phone_number TEXT,
  p_channel TEXT DEFAULT 'whatsapp'
)
RETURNS TABLE (
  id UUID,
  message_id TEXT,
  template_name TEXT,
  metadata JSONB,
  sent_at TIMESTAMPTZ,
  staff_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nl.id,
    nl.message_id,
    nl.template_name,
    nl.metadata,
    nl.sent_at,
    nl.staff_id
  FROM notification_log nl
  WHERE nl.recipient_phone = p_phone_number
    AND nl.channel = p_channel
    AND nl.status IN ('sent', 'delivered', 'read')
  ORDER BY nl.sent_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get notification by WhatsApp message ID (for quoted replies)
CREATE OR REPLACE FUNCTION get_notification_by_message_id(p_message_id TEXT)
RETURNS TABLE (
  id UUID,
  template_name TEXT,
  metadata JSONB,
  sent_at TIMESTAMPTZ,
  staff_id UUID,
  recipient_phone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nl.id,
    nl.template_name,
    nl.metadata,
    nl.sent_at,
    nl.staff_id,
    nl.recipient_phone
  FROM notification_log nl
  WHERE nl.message_id = p_message_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get WhatsApp quality metrics (for Meta ban prevention monitoring)
CREATE OR REPLACE FUNCTION get_whatsapp_quality_metrics(
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_read BIGINT,
  total_failed BIGINT,
  delivery_rate_pct NUMERIC,
  read_rate_pct NUMERIC,
  failed_rate_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_sent,
    SUM(CASE WHEN status IN ('delivered', 'read') THEN 1 ELSE 0 END) as total_delivered,
    SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as total_read,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as total_failed,
    ROUND(100.0 * SUM(CASE WHEN status IN ('delivered', 'read') THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as delivery_rate_pct,
    ROUND(100.0 * SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN status IN ('delivered', 'read') THEN 1 ELSE 0 END), 0), 2) as read_rate_pct,
    ROUND(100.0 * SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as failed_rate_pct
  FROM notification_log
  WHERE channel = 'whatsapp'
    AND sent_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_last_notification IS 'Get most recent notification sent to a phone number (for context-aware replies)';
COMMENT ON FUNCTION get_notification_by_message_id IS 'Get notification by WhatsApp message ID (when user replies by quoting)';
COMMENT ON FUNCTION get_whatsapp_quality_metrics IS 'Get WhatsApp delivery quality metrics for Meta ban prevention monitoring';
