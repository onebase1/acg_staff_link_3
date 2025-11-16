-- Debug: Why aren't completed shifts showing up for invoicing?
-- Run this in Supabase SQL Editor to diagnose the issue

-- ============================================
-- STEP 1: Check completed shifts
-- ============================================
SELECT 
  'COMPLETED SHIFTS' as check_type,
  COUNT(*) as total_count
FROM shifts
WHERE status = 'completed';

-- ============================================
-- STEP 2: Check approved timesheets
-- ============================================
SELECT 
  'APPROVED TIMESHEETS' as check_type,
  COUNT(*) as total_count,
  COUNT(CASE WHEN invoice_id IS NULL THEN 1 END) as uninvoiced_count,
  COUNT(CASE WHEN invoice_id IS NOT NULL THEN 1 END) as already_invoiced_count
FROM timesheets
WHERE status = 'approved';

-- ============================================
-- STEP 3: Find the disconnect - completed shifts WITHOUT approved timesheets
-- ============================================
SELECT 
  'COMPLETED SHIFTS WITHOUT APPROVED TIMESHEETS' as issue_type,
  s.id as shift_id,
  s.date as shift_date,
  s.client_id,
  s.staff_id,
  s.status as shift_status,
  t.id as timesheet_id,
  t.status as timesheet_status,
  CASE 
    WHEN t.id IS NULL THEN 'NO TIMESHEET EXISTS'
    WHEN t.status != 'approved' THEN 'TIMESHEET NOT APPROVED (status: ' || t.status || ')'
    WHEN t.invoice_id IS NOT NULL THEN 'ALREADY INVOICED'
    ELSE 'UNKNOWN ISSUE'
  END as blocking_reason
FROM shifts s
LEFT JOIN timesheets t ON (t.shift_id = s.id OR t.booking_id = s.booking_id)
WHERE s.status = 'completed'
  AND (t.id IS NULL OR t.status != 'approved' OR t.invoice_id IS NOT NULL)
ORDER BY s.date DESC
LIMIT 50;

-- ============================================
-- STEP 4: Find VALID shifts (completed + approved timesheet + not invoiced)
-- ============================================
SELECT 
  'VALID FOR INVOICING' as check_type,
  s.id as shift_id,
  s.date as shift_date,
  s.client_id,
  s.staff_id,
  t.id as timesheet_id,
  t.status as timesheet_status,
  t.invoice_id
FROM shifts s
INNER JOIN timesheets t ON (t.shift_id = s.id OR t.booking_id = s.booking_id)
WHERE s.status = 'completed'
  AND t.status = 'approved'
  AND t.invoice_id IS NULL
ORDER BY s.date DESC
LIMIT 20;

-- ============================================
-- STEP 5: Check if timesheets have shift_id or booking_id linkage
-- ============================================
SELECT 
  'TIMESHEET LINKAGE CHECK' as check_type,
  COUNT(*) as total_timesheets,
  COUNT(CASE WHEN shift_id IS NOT NULL THEN 1 END) as has_shift_id,
  COUNT(CASE WHEN booking_id IS NOT NULL THEN 1 END) as has_booking_id,
  COUNT(CASE WHEN shift_id IS NULL AND booking_id IS NULL THEN 1 END) as orphaned_timesheets
FROM timesheets
WHERE status = 'approved';

-- ============================================
-- STEP 6: Summary of the problem
-- ============================================
SELECT 
  'SUMMARY' as report_type,
  (SELECT COUNT(*) FROM shifts WHERE status = 'completed') as completed_shifts,
  (SELECT COUNT(*) FROM timesheets WHERE status = 'approved' AND invoice_id IS NULL) as approved_uninvoiced_timesheets,
  (SELECT COUNT(*) 
   FROM shifts s
   INNER JOIN timesheets t ON (t.shift_id = s.id OR t.booking_id = s.booking_id)
   WHERE s.status = 'completed' 
     AND t.status = 'approved' 
     AND t.invoice_id IS NULL) as valid_for_invoicing;

