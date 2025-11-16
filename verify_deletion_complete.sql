-- ============================================
-- VERIFY DELETION IS COMPLETE
-- Check for any remaining shift-related data or orphans
-- ============================================

-- ============================================
-- STEP 1: Check main tables are empty
-- ============================================
SELECT 
  'MAIN TABLES' as check_type,
  (SELECT COUNT(*) FROM shifts) as shifts_count,
  (SELECT COUNT(*) FROM bookings) as bookings_count,
  (SELECT COUNT(*) FROM timesheets) as timesheets_count,
  (SELECT COUNT(*) FROM invoices) as invoices_count;

-- ============================================
-- STEP 2: Check for orphaned timesheets
-- (timesheets without a valid shift or booking)
-- ============================================
SELECT 
  'ORPHANED TIMESHEETS' as check_type,
  COUNT(*) as orphan_count
FROM timesheets t
WHERE NOT EXISTS (SELECT 1 FROM shifts s WHERE s.id = t.shift_id)
  AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = t.booking_id);

-- ============================================
-- STEP 3: Check for orphaned AdminWorkflows
-- (workflows referencing deleted shifts)
-- ============================================
SELECT 
  'ORPHANED ADMIN WORKFLOWS' as check_type,
  COUNT(*) as orphan_count
FROM admin_workflows
WHERE related_entity->>'entity_type' = 'shift'
  AND NOT EXISTS (
    SELECT 1 FROM shifts 
    WHERE shifts.id::text = admin_workflows.related_entity->>'entity_id'
  );

-- ============================================
-- STEP 4: Check for orphaned ChangeLogs
-- (change logs referencing deleted entities)
-- ============================================
SELECT 
  'ORPHANED CHANGE LOGS' as check_type,
  COUNT(*) as orphan_count
FROM change_logs
WHERE affected_entity_type = 'shift'
  AND NOT EXISTS (
    SELECT 1 FROM shifts 
    WHERE shifts.id::text = change_logs.affected_entity_id
  );

-- ============================================
-- STEP 5: Check staff and clients are preserved
-- ============================================
SELECT 
  'PRESERVED DATA' as check_type,
  (SELECT COUNT(*) FROM staff) as staff_count,
  (SELECT COUNT(*) FROM clients) as clients_count,
  (SELECT COUNT(*) FROM profiles) as profiles_count;

-- ============================================
-- STEP 6: Summary - Ready for fresh data?
-- ============================================
SELECT 
  'READY FOR FRESH DATA?' as status,
  CASE 
    WHEN (SELECT COUNT(*) FROM shifts) = 0 
     AND (SELECT COUNT(*) FROM bookings) = 0 
     AND (SELECT COUNT(*) FROM timesheets) = 0 
    THEN '✅ YES - All shift data deleted, ready for testing!'
    ELSE '❌ NO - Some data remains, check above'
  END as result;

