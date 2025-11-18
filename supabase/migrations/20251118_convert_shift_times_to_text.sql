-- Migration: Convert shift start_time and end_time from TIMESTAMPTZ to TEXT (HH:MM format)
-- Date: 2025-11-18
-- Reason: Simplified time storage - shifts always use client-specific 12-hour windows
--         stored as HH:MM text (e.g., "08:00", "20:00") rather than full timestamps

-- Step 1: Add new TEXT columns
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS start_time_new TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS end_time_new TEXT;

-- Step 2: Migrate existing data (extract HH:MM from timestamps)
UPDATE shifts
SET
  start_time_new = TO_CHAR(start_time, 'HH24:MI'),
  end_time_new = TO_CHAR(end_time, 'HH24:MI')
WHERE start_time IS NOT NULL;

-- Step 3: Drop old columns and rename new ones
ALTER TABLE shifts DROP COLUMN IF EXISTS start_time;
ALTER TABLE shifts DROP COLUMN IF EXISTS end_time;

ALTER TABLE shifts RENAME COLUMN start_time_new TO start_time;
ALTER TABLE shifts RENAME COLUMN end_time_new TO end_time;

-- Step 4: Add constraints
ALTER TABLE shifts
  ALTER COLUMN start_time SET NOT NULL,
  ALTER COLUMN end_time SET NOT NULL;

-- Add check constraint to ensure HH:MM format
ALTER TABLE shifts ADD CONSTRAINT shifts_start_time_format
  CHECK (start_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$');

ALTER TABLE shifts ADD CONSTRAINT shifts_end_time_format
  CHECK (end_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$');

COMMENT ON COLUMN shifts.start_time IS 'Shift start time in HH:MM format (24-hour). Example: "08:00" for 8am, "20:00" for 8pm';
COMMENT ON COLUMN shifts.end_time IS 'Shift end time in HH:MM format (24-hour). Example: "20:00" for 8pm, "08:00" for 8am (next day for night shifts)';
