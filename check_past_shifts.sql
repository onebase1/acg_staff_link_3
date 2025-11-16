-- Check what past shifts exist in the database
-- Run this in Supabase SQL Editor to see what you have

-- 1. Count total shifts
SELECT 
  'Total Shifts' as metric,
  COUNT(*) as count
FROM shifts;

-- 2. Count past shifts (before today)
SELECT 
  'Past Shifts (before today)' as metric,
  COUNT(*) as count
FROM shifts
WHERE date < CURRENT_DATE;

-- 3. Breakdown by status
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM shifts
WHERE date < CURRENT_DATE
GROUP BY status
ORDER BY count DESC;

-- 4. Date range of past shifts
SELECT 
  'Date Range' as metric,
  MIN(date) as earliest_shift,
  MAX(date) as latest_shift,
  COUNT(*) as total_past_shifts
FROM shifts
WHERE date < CURRENT_DATE;

-- 5. Sample of past shifts (first 10)
SELECT 
  id,
  date,
  status,
  role_required,
  assigned_staff_id IS NOT NULL as has_staff,
  client_id
FROM shifts
WHERE date < CURRENT_DATE
ORDER BY date DESC
LIMIT 10;

