-- Migration: Add missing columns to bookings
-- Generated: 2025-11-11 00:33:41
-- Missing columns: 13

-- Add missing columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN bookings.created_by IS 'User email';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_id TEXT;
COMMENT ON COLUMN bookings.client_id IS 'Client reference';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmed_by_staff_at TIMESTAMPTZ;
COMMENT ON COLUMN bookings.confirmed_by_staff_at IS 'Staff confirmation time';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmed_by_client_at TIMESTAMPTZ;
COMMENT ON COLUMN bookings.confirmed_by_client_at IS 'Client confirmation time';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
COMMENT ON COLUMN bookings.cancellation_reason IS 'Cancellation reason';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
COMMENT ON COLUMN bookings.cancelled_by IS 'staff/client/agency';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
COMMENT ON COLUMN bookings.cancelled_at IS 'When cancelled';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT;
COMMENT ON COLUMN bookings.notes IS 'Booking notes';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS timesheet_id TEXT;
COMMENT ON COLUMN bookings.timesheet_id IS 'Timesheet reference';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rating_by_client NUMERIC;
COMMENT ON COLUMN bookings.rating_by_client IS '1-5 rating';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rating_by_staff NUMERIC;
COMMENT ON COLUMN bookings.rating_by_staff IS '1-5 rating';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS feedback_from_client TEXT;
COMMENT ON COLUMN bookings.feedback_from_client IS 'Client feedback';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS feedback_from_staff TEXT;
COMMENT ON COLUMN bookings.feedback_from_staff IS 'Staff feedback';

-- Migration completed
