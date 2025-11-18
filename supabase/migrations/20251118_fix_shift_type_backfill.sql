-- Migration: Fix shift_type backfill to work with TEXT start_time (HH:MM format)
-- Date: 2025-11-18
-- Reason: Previous migration used EXTRACT(HOUR FROM start_time) which only works with TIMESTAMPTZ
--         Now that start_time is TEXT in HH:MM format, we need to parse it differently

-- Backfill existing shifts with shift_type based on start_time (HH:MM TEXT format)
-- Day shift: 06:00-17:59, Night shift: 18:00-05:59
UPDATE shifts
SET shift_type = CASE
  -- Extract hour from HH:MM text format (e.g., "08:00" -> 8, "20:00" -> 20)
  WHEN CAST(SPLIT_PART(start_time, ':', 1) AS INTEGER) >= 6
   AND CAST(SPLIT_PART(start_time, ':', 1) AS INTEGER) < 18 THEN 'day'
  ELSE 'night'
END
WHERE shift_type IS NULL OR shift_type = '';

-- Add comment
COMMENT ON COLUMN shifts.shift_type IS 'Shift type: day (06:00-17:59) or night (18:00-05:59). Determined from start_time.';
