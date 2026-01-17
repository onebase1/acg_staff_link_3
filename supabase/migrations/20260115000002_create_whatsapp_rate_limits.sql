-- Migration: Create whatsapp_rate_limits table
-- Purpose: Meta ban prevention through rate limiting
-- Author: Kylie AI Implementation
-- Date: 2026-01-15

-- Create whatsapp_rate_limits table
CREATE TABLE IF NOT EXISTS whatsapp_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL UNIQUE,

  -- Daily limits (reset every 24h)
  daily_count INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 5,
  last_reset_daily TIMESTAMPTZ DEFAULT NOW(),

  -- Weekly limits (reset every 7d)
  weekly_count INTEGER DEFAULT 0,
  weekly_limit INTEGER DEFAULT 20,
  last_reset_weekly TIMESTAMPTZ DEFAULT NOW(),

  -- Temporary blocks
  blocked_until TIMESTAMPTZ,
  block_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_counts CHECK (daily_count >= 0 AND weekly_count >= 0),
  CONSTRAINT positive_limits CHECK (daily_limit > 0 AND weekly_limit > 0),
  CONSTRAINT valid_block_reason CHECK (
    block_reason IS NULL OR
    block_reason IN ('daily_limit_exceeded', 'weekly_limit_exceeded', 'manual_block', 'spam_detected')
  )
);

-- Indexes for fast lookups
CREATE INDEX idx_whatsapp_rate_limits_phone ON whatsapp_rate_limits(phone_number);
CREATE INDEX idx_whatsapp_rate_limits_blocked ON whatsapp_rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;
CREATE INDEX idx_whatsapp_rate_limits_daily_reset ON whatsapp_rate_limits(last_reset_daily);

-- Comments for documentation
COMMENT ON TABLE whatsapp_rate_limits IS 'Rate limiting for WhatsApp messages to prevent Meta ban';
COMMENT ON COLUMN whatsapp_rate_limits.phone_number IS 'Phone number in E.164 format';
COMMENT ON COLUMN whatsapp_rate_limits.daily_count IS 'Number of messages sent today (resets every 24h)';
COMMENT ON COLUMN whatsapp_rate_limits.daily_limit IS 'Maximum messages allowed per day (default: 5)';
COMMENT ON COLUMN whatsapp_rate_limits.weekly_count IS 'Number of messages sent this week (resets every 7d)';
COMMENT ON COLUMN whatsapp_rate_limits.weekly_limit IS 'Maximum messages allowed per week (default: 20)';
COMMENT ON COLUMN whatsapp_rate_limits.blocked_until IS 'If set, user is blocked from receiving messages until this timestamp';
COMMENT ON COLUMN whatsapp_rate_limits.block_reason IS 'Reason for block (if blocked)';

-- Function to check if user is rate limited
CREATE OR REPLACE FUNCTION is_rate_limited(p_phone_number TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_limit RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Get or create rate limit record
  SELECT * INTO v_limit
  FROM whatsapp_rate_limits
  WHERE phone_number = p_phone_number;

  -- If no record, not limited
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if blocked
  IF v_limit.blocked_until IS NOT NULL AND v_limit.blocked_until > v_now THEN
    RETURN TRUE;
  END IF;

  -- Reset daily counter if >24h
  IF (v_now - v_limit.last_reset_daily) > INTERVAL '24 hours' THEN
    UPDATE whatsapp_rate_limits
    SET daily_count = 0,
        last_reset_daily = v_now
    WHERE phone_number = p_phone_number;
    RETURN FALSE;
  END IF;

  -- Reset weekly counter if >7d
  IF (v_now - v_limit.last_reset_weekly) > INTERVAL '7 days' THEN
    UPDATE whatsapp_rate_limits
    SET weekly_count = 0,
        last_reset_weekly = v_now
    WHERE phone_number = p_phone_number;
  END IF;

  -- Check limits
  IF v_limit.daily_count >= v_limit.daily_limit THEN
    RETURN TRUE;
  END IF;

  IF v_limit.weekly_count >= v_limit.weekly_limit THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to increment rate limit counter
CREATE OR REPLACE FUNCTION increment_rate_limit(p_phone_number TEXT)
RETURNS VOID AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO whatsapp_rate_limits (phone_number, daily_count, weekly_count)
  VALUES (p_phone_number, 1, 1)
  ON CONFLICT (phone_number) DO UPDATE
  SET daily_count = whatsapp_rate_limits.daily_count + 1,
      weekly_count = whatsapp_rate_limits.weekly_count + 1;

  -- Auto-block if limit exceeded
  UPDATE whatsapp_rate_limits
  SET blocked_until = CASE
    WHEN daily_count >= daily_limit THEN
      -- Block until tomorrow midnight
      (DATE_TRUNC('day', v_now) + INTERVAL '1 day')
    WHEN weekly_count >= weekly_limit THEN
      -- Block until next week
      (last_reset_weekly + INTERVAL '7 days')
    ELSE NULL
  END,
  block_reason = CASE
    WHEN daily_count >= daily_limit THEN 'daily_limit_exceeded'
    WHEN weekly_count >= weekly_limit THEN 'weekly_limit_exceeded'
    ELSE NULL
  END
  WHERE phone_number = p_phone_number
  AND (daily_count >= daily_limit OR weekly_count >= weekly_limit);
END;
$$ LANGUAGE plpgsql;

-- Function to reset rate limit (for manual unblock)
CREATE OR REPLACE FUNCTION reset_rate_limit(p_phone_number TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE whatsapp_rate_limits
  SET daily_count = 0,
      weekly_count = 0,
      blocked_until = NULL,
      block_reason = NULL,
      last_reset_daily = NOW(),
      last_reset_weekly = NOW()
  WHERE phone_number = p_phone_number;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE whatsapp_rate_limits ENABLE ROW LEVEL SECURITY;

-- Staff can view their own rate limit status
CREATE POLICY whatsapp_rate_limits_select_own
  ON whatsapp_rate_limits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = auth.uid()
      AND staff.whatsapp_number_verified = whatsapp_rate_limits.phone_number
    )
  );

-- Admins can see all rate limits
CREATE POLICY whatsapp_rate_limits_select_admin
  ON whatsapp_rate_limits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = auth.uid()
      AND staff.role IN ('admin', 'super_admin')
    )
  );

-- Service role can insert/update (for n8n workflows)
CREATE POLICY whatsapp_rate_limits_service_role
  ON whatsapp_rate_limits
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
