-- Migration: Add shift_type column to shifts table
-- Date: 2025-11-15
-- Purpose: Explicitly store shift type (day/night) instead of calculating from start_time

-- Add shift_type column with CHECK constraint
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS shift_type TEXT 
CHECK (shift_type IN ('day', 'night'));

-- Add comment
COMMENT ON COLUMN shifts.shift_type IS 'Shift type: day or night (12-hour shifts)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_shifts_shift_type ON shifts(shift_type);

-- Backfill existing shifts with shift_type based on start_time
-- Day shift: 06:00-18:00, Night shift: 18:00-06:00
UPDATE shifts
SET shift_type = CASE
  WHEN EXTRACT(HOUR FROM start_time) >= 6 AND EXTRACT(HOUR FROM start_time) < 18 THEN 'day'
  ELSE 'night'
END
WHERE shift_type IS NULL;

-- Make shift_type NOT NULL after backfill
ALTER TABLE shifts 
ALTER COLUMN shift_type SET NOT NULL;

-- Add default value for future inserts (will be overridden by application logic)
ALTER TABLE shifts 
ALTER COLUMN shift_type SET DEFAULT 'day';

-- Migration completed
-- All existing shifts now have shift_type populated
-- All new shifts must specify shift_type explicitly

