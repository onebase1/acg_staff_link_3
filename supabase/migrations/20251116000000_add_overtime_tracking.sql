-- Migration: Add overtime tracking and device info to timesheets
-- Date: 2025-11-16
-- Purpose: Support 12-hour cap, overtime flagging, and dispute evidence

-- Add overtime tracking columns
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC;
COMMENT ON COLUMN timesheets.overtime_hours IS 'Hours worked beyond scheduled shift duration';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS overtime_flag BOOLEAN DEFAULT false;
COMMENT ON COLUMN timesheets.overtime_flag IS 'True if overtime detected (requires admin review)';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS raw_total_hours NUMERIC;
COMMENT ON COLUMN timesheets.raw_total_hours IS 'Uncapped total hours (before 12-hour cap applied)';

-- Add device/evidence tracking columns for dispute resolution
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN timesheets.device_info IS 'Device info: {browser, os, userAgent, platform}';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS ip_address TEXT;
COMMENT ON COLUMN timesheets.ip_address IS 'IP address at clock-in/out (for dispute evidence)';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS clock_in_photo TEXT;
COMMENT ON COLUMN timesheets.clock_in_photo IS 'Photo/selfie URL at clock-in (post-MVP)';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS clock_out_photo TEXT;
COMMENT ON COLUMN timesheets.clock_out_photo IS 'Photo/selfie URL at clock-out (post-MVP)';

-- Add incomplete timesheet detection
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS incomplete_flag BOOLEAN DEFAULT false;
COMMENT ON COLUMN timesheets.incomplete_flag IS 'True if clock-in exists but no clock-out (phone died/forgot)';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS incomplete_reason TEXT;
COMMENT ON COLUMN timesheets.incomplete_reason IS 'Reason for incomplete timesheet (e.g., "Phone died", "Forgot to clock out")';

-- Migration completed

