-- Migration: Convert bookings start_time and end_time from TIMESTAMPTZ to TEXT (HH:MM format)
-- Generated: 2025-11-18
-- Reason: Align with shifts table schema change - times are reference/display only, not used for invoicing

-- Step 1: Add temporary TEXT columns
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_time_text TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_time_text TEXT;

-- Step 2: Extract HH:MM from existing TIMESTAMPTZ values
UPDATE bookings
SET 
  start_time_text = TO_CHAR(start_time, 'HH24:MI'),
  end_time_text = TO_CHAR(end_time, 'HH24:MI')
WHERE start_time IS NOT NULL AND end_time IS NOT NULL;

-- Step 3: Drop old TIMESTAMPTZ columns
ALTER TABLE bookings DROP COLUMN IF EXISTS start_time;
ALTER TABLE bookings DROP COLUMN IF EXISTS end_time;

-- Step 4: Rename TEXT columns to original names
ALTER TABLE bookings RENAME COLUMN start_time_text TO start_time;
ALTER TABLE bookings RENAME COLUMN end_time_text TO end_time;

-- Step 5: Add format validation constraints (HH:MM format)
ALTER TABLE bookings ADD CONSTRAINT bookings_start_time_format 
  CHECK (start_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$');

ALTER TABLE bookings ADD CONSTRAINT bookings_end_time_format 
  CHECK (end_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$');

-- Step 6: Add comments
COMMENT ON COLUMN bookings.start_time IS 'Reference start time (HH:MM format) - display only, not used for invoicing';
COMMENT ON COLUMN bookings.end_time IS 'Reference end time (HH:MM format) - display only, not used for invoicing';

-- Migration completed
-- Note: Actual financial times come from timesheets.actual_start_time and timesheets.actual_end_time

