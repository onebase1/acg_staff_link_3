-- ============================================
-- CLEANUP ORPHANED DATA
-- Remove any orphaned records after shift deletion
-- Run this AFTER deleting shifts to clean up references
-- ============================================

-- ============================================
-- STEP 1: Delete orphaned timesheets
-- (timesheets without a valid shift or booking)
-- ============================================
DELETE FROM timesheets
WHERE NOT EXISTS (SELECT 1 FROM shifts s WHERE s.id = timesheets.shift_id)
  AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = timesheets.booking_id);

-- ============================================
-- STEP 2: Delete orphaned AdminWorkflows
-- (workflows referencing deleted shifts)
-- ============================================
DELETE FROM admin_workflows
WHERE related_entity->>'entity_type' = 'shift'
  AND NOT EXISTS (
    SELECT 1 FROM shifts 
    WHERE shifts.id::text = admin_workflows.related_entity->>'entity_id'
  );

-- ============================================
-- STEP 3: Delete orphaned ChangeLogs
-- (change logs referencing deleted shifts/timesheets/bookings)
-- ============================================
DELETE FROM change_logs
WHERE affected_entity_type = 'shift'
  AND NOT EXISTS (
    SELECT 1 FROM shifts 
    WHERE shifts.id::text = change_logs.affected_entity_id
  );

DELETE FROM change_logs
WHERE affected_entity_type = 'timesheet'
  AND NOT EXISTS (
    SELECT 1 FROM timesheets 
    WHERE timesheets.id::text = change_logs.affected_entity_id
  );

DELETE FROM change_logs
WHERE affected_entity_type = 'booking'
  AND NOT EXISTS (
    SELECT 1 FROM bookings 
    WHERE bookings.id::text = change_logs.affected_entity_id
  );

-- ============================================
-- STEP 4: Delete orphaned invoice line items
-- (invoices referencing deleted timesheets)
-- ============================================
-- Note: This updates invoices to remove references to deleted timesheets
-- You may want to delete entire invoices instead if they're test data

UPDATE invoices
SET line_items = (
  SELECT jsonb_agg(item)
  FROM jsonb_array_elements(line_items) AS item
  WHERE EXISTS (
    SELECT 1 FROM timesheets 
    WHERE timesheets.id::text = item->>'timesheet_id'
  )
)
WHERE line_items IS NOT NULL;

-- Delete invoices with no line items left
DELETE FROM invoices
WHERE line_items IS NULL 
   OR jsonb_array_length(line_items) = 0;

-- ============================================
-- STEP 5: Verify cleanup
-- ============================================
SELECT 
  'CLEANUP VERIFICATION' as status,
  (SELECT COUNT(*) FROM shifts) as shifts,
  (SELECT COUNT(*) FROM bookings) as bookings,
  (SELECT COUNT(*) FROM timesheets) as timesheets,
  (SELECT COUNT(*) FROM invoices) as invoices,
  (SELECT COUNT(*) FROM admin_workflows WHERE related_entity->>'entity_type' = 'shift') as shift_workflows,
  (SELECT COUNT(*) FROM change_logs WHERE affected_entity_type IN ('shift', 'timesheet', 'booking')) as shift_changelogs;

