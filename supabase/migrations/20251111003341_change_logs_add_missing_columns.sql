-- Migration: Add missing columns to change_logs
-- Generated: 2025-11-11 00:33:41
-- Missing columns: 12

-- Add missing columns to change_logs table
ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN change_logs.created_by IS 'User email';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS old_value TEXT;
COMMENT ON COLUMN change_logs.old_value IS 'Previous value';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS new_value TEXT;
COMMENT ON COLUMN change_logs.new_value IS 'New value';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS reason TEXT;
COMMENT ON COLUMN change_logs.reason IS 'Change reason';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS changed_by_email TEXT;
COMMENT ON COLUMN change_logs.changed_by_email IS 'User email';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS notifications_sent NUMERIC;
COMMENT ON COLUMN change_logs.notifications_sent IS 'Notification count';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
COMMENT ON COLUMN change_logs.ip_address IS 'User IP';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS risk_level TEXT;
COMMENT ON COLUMN change_logs.risk_level IS 'low/medium/high/critical';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS reviewed BOOLEAN DEFAULT false;
COMMENT ON COLUMN change_logs.reviewed IS 'Review flag';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
COMMENT ON COLUMN change_logs.reviewed_by IS 'Reviewer user ID';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
COMMENT ON COLUMN change_logs.reviewed_at IS 'Review time';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN DEFAULT false;
COMMENT ON COLUMN change_logs.flagged_for_review IS 'Flag for review';

-- Migration completed
