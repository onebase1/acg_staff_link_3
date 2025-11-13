-- Migration: Add missing columns to timesheets
-- Generated: 2025-11-11 00:33:41
-- Missing columns: 16

-- Add missing columns to timesheets table
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN timesheets.created_by IS 'User email';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS actual_start_time TEXT;
COMMENT ON COLUMN timesheets.actual_start_time IS 'Actual start (HH:MM)';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS actual_end_time TEXT;
COMMENT ON COLUMN timesheets.actual_end_time IS 'Actual end (HH:MM)';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS clock_in_location JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN timesheets.clock_in_location IS '{latitude, longitude, accuracy, timestamp}';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS clock_out_location JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN timesheets.clock_out_location IS '{latitude, longitude, accuracy, timestamp}';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS geofence_distance_meters NUMERIC;
COMMENT ON COLUMN timesheets.geofence_distance_meters IS 'Distance from site';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS geofence_violation_reason TEXT;
COMMENT ON COLUMN timesheets.geofence_violation_reason IS 'Violation reason';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS break_duration_minutes NUMERIC;
COMMENT ON COLUMN timesheets.break_duration_minutes IS 'Break duration';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS client_signature TEXT;
COMMENT ON COLUMN timesheets.client_signature IS 'Digital signature';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS staff_approved_at TIMESTAMPTZ;
COMMENT ON COLUMN timesheets.staff_approved_at IS 'Staff approval time';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS invoice_id TEXT;
COMMENT ON COLUMN timesheets.invoice_id IS 'Invoice reference';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT false;
COMMENT ON COLUMN timesheets.location_verified IS 'GPS verified';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS uploaded_documents JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN timesheets.uploaded_documents IS 'Uploaded documents';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS financial_locked_at TIMESTAMPTZ;
COMMENT ON COLUMN timesheets.financial_locked_at IS 'When locked';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS financial_locked_by TEXT;
COMMENT ON COLUMN timesheets.financial_locked_by IS 'User ID';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS financial_snapshot JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN timesheets.financial_snapshot IS 'Immutable financial data';

-- Migration completed
