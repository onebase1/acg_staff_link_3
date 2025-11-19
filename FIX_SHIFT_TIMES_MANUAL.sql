-- ============================================================================
-- FIX SHIFT TIMES: Remove seconds from HH:MM:SS format
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Check how many shifts have seconds
SELECT 
  COUNT(*) as total_shifts_with_seconds,
  COUNT(CASE WHEN LENGTH(start_time) > 5 THEN 1 END) as start_time_with_seconds,
  COUNT(CASE WHEN LENGTH(end_time) > 5 THEN 1 END) as end_time_with_seconds
FROM shifts
WHERE LENGTH(start_time) > 5 OR LENGTH(end_time) > 5;

-- Step 2: Preview what will be changed (first 10 rows)
SELECT 
  id,
  date,
  start_time as old_start_time,
  SUBSTRING(start_time FROM 1 FOR 5) as new_start_time,
  end_time as old_end_time,
  SUBSTRING(end_time FROM 1 FOR 5) as new_end_time
FROM shifts
WHERE LENGTH(start_time) > 5 OR LENGTH(end_time) > 5
LIMIT 10;

-- Step 3: Apply the fix (UNCOMMENT TO RUN)
-- UPDATE shifts
-- SET 
--   start_time = SUBSTRING(start_time FROM 1 FOR 5),
--   end_time = SUBSTRING(end_time FROM 1 FOR 5)
-- WHERE 
--   LENGTH(start_time) > 5 OR LENGTH(end_time) > 5;

-- Step 4: Verify all shifts now have HH:MM format (UNCOMMENT AFTER STEP 3)
-- SELECT 
--   COUNT(*) as invalid_shifts
-- FROM shifts
-- WHERE start_time !~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
--    OR end_time !~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$';
-- 
-- -- Should return 0 if all fixed

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run Step 1 to see how many shifts need fixing
-- 2. Run Step 2 to preview the changes
-- 3. Uncomment and run Step 3 to apply the fix
-- 4. Uncomment and run Step 4 to verify
-- ============================================================================

