-- Backfill shift_type for existing shifts
-- This script updates all shifts without shift_type
-- Day shift: 06:00-18:00, Night shift: 18:00-06:00

-- Step 1: Update shifts with shift_type based on start_time hour
UPDATE shifts
SET shift_type = CASE
  WHEN EXTRACT(HOUR FROM start_time) >= 6 AND EXTRACT(HOUR FROM start_time) < 18 THEN 'day'
  ELSE 'night'
END
WHERE shift_type IS NULL;

-- Step 2: Verify the update
SELECT 
  shift_type,
  COUNT(*) as count,
  MIN(start_time) as earliest_start,
  MAX(start_time) as latest_start
FROM shifts
GROUP BY shift_type
ORDER BY shift_type;

-- Step 3: Check for any remaining NULL values
SELECT COUNT(*) as null_count
FROM shifts
WHERE shift_type IS NULL;

