-- ============================================
-- FORCE DELETE ALL SHIFTS, BOOKINGS, TIMESHEETS
-- Run this in Supabase SQL Editor
-- ============================================

-- IMPORTANT: This will delete ALL shifts, bookings, and timesheets
-- Staff and Clients will be preserved
-- Run each section separately if you want to see progress

-- ============================================
-- STEP 1: Delete all AdminWorkflows related to shifts
-- ============================================
DELETE FROM admin_workflows
WHERE related_entity->>'entity_type' = 'shift';

-- ============================================
-- STEP 2: Delete all ChangeLogs related to shifts
-- ============================================
DELETE FROM change_logs
WHERE affected_entity_type IN ('shift', 'timesheet', 'booking');

-- ============================================
-- STEP 3: Delete all Timesheets
-- ============================================
DELETE FROM timesheets;

-- ============================================
-- STEP 4: Delete all Bookings
-- ============================================
DELETE FROM bookings;

-- ============================================
-- STEP 5: Delete all Shifts
-- ============================================
DELETE FROM shifts;

-- ============================================
-- STEP 6: Verify deletion
-- ============================================
SELECT 
  'VERIFICATION' as check_type,
  (SELECT COUNT(*) FROM shifts) as remaining_shifts,
  (SELECT COUNT(*) FROM bookings) as remaining_bookings,
  (SELECT COUNT(*) FROM timesheets) as remaining_timesheets,
  (SELECT COUNT(*) FROM staff) as staff_preserved,
  (SELECT COUNT(*) FROM clients) as clients_preserved;

