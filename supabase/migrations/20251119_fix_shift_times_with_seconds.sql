-- Migration: Fix shift times that have seconds (HH:MM:SS → HH:MM)
-- Generated: 2025-11-19
-- Reason: Old shifts created before HH:MM format enforcement have seconds

-- Step 1: Identify shifts with seconds (length > 5)
-- These are shifts created before the HH:MM format was enforced

-- Step 2: Strip seconds from start_time and end_time
UPDATE shifts
SET 
  start_time = SUBSTRING(start_time FROM 1 FOR 5),
  end_time = SUBSTRING(end_time FROM 1 FOR 5)
WHERE 
  LENGTH(start_time) > 5 OR LENGTH(end_time) > 5;

-- Step 3: Verify all shifts now have HH:MM format
-- This should return 0 rows after the fix
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM shifts
  WHERE start_time !~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
     OR end_time !~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$';
  
  IF invalid_count > 0 THEN
    RAISE NOTICE 'WARNING: % shifts still have invalid time format', invalid_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All shifts now have HH:MM format';
  END IF;
END $$;

-- Migration completed

