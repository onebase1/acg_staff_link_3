-- ============================================
-- Enhanced Delete Shift Data Functions
-- 1. Updated delete_all_shift_data() with complete orphan cleanup
-- 2. New delete_client_shift_data(client_ids) for selective deletion
-- Date: 2025-12-22
-- ============================================

-- Drop existing function to replace it
DROP FUNCTION IF EXISTS delete_all_shift_data();

-- ============================================
-- FUNCTION 1: Delete ALL shift data (enhanced)
-- ============================================
CREATE OR REPLACE FUNCTION delete_all_shift_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_disputes INTEGER := 0;
  deleted_op_costs INTEGER := 0;
  deleted_match_scores INTEGER := 0;
  deleted_client_ratings INTEGER := 0;
  deleted_invoice_amendments INTEGER := 0;
  deleted_timesheets INTEGER := 0;
  deleted_bookings INTEGER := 0;
  deleted_shifts INTEGER := 0;
  deleted_workflows INTEGER := 0;
  deleted_changelogs INTEGER := 0;
  deleted_notifications INTEGER := 0;
  deleted_invoices INTEGER := 0;
BEGIN
  -- 1. Delete disputes referencing shifts
  DELETE FROM disputes WHERE shift_id IS NOT NULL;
  GET DIAGNOSTICS deleted_disputes = ROW_COUNT;

  -- 2. Delete operational_costs referencing shifts (SET NULL would leave orphans with NULL shift_id)
  DELETE FROM operational_costs WHERE shift_id IS NOT NULL;
  GET DIAGNOSTICS deleted_op_costs = ROW_COUNT;

  -- 3. Delete staff_match_scores (has CASCADE but explicit is safer)
  DELETE FROM staff_match_scores WHERE shift_id IS NOT NULL;
  GET DIAGNOSTICS deleted_match_scores = ROW_COUNT;

  -- 4. Delete client_ratings (has CASCADE but explicit is safer)  
  DELETE FROM client_ratings WHERE shift_id IS NOT NULL;
  GET DIAGNOSTICS deleted_client_ratings = ROW_COUNT;

  -- 5. Delete AdminWorkflows related to shifts
  DELETE FROM admin_workflows WHERE related_entity->>'entity_type' = 'shift';
  GET DIAGNOSTICS deleted_workflows = ROW_COUNT;

  -- 6. Delete ChangeLogs related to shifts/timesheets/bookings
  DELETE FROM change_logs WHERE affected_entity_type IN ('shift', 'timesheet', 'booking', 'invoice');
  GET DIAGNOSTICS deleted_changelogs = ROW_COUNT;

  -- 7. Delete notifications related to shifts (best effort)
  DELETE FROM notifications;
  GET DIAGNOSTICS deleted_notifications = ROW_COUNT;

  -- 8. Delete invoice_amendments (before invoices)
  DELETE FROM invoice_amendments;
  GET DIAGNOSTICS deleted_invoice_amendments = ROW_COUNT;

  -- 9. Delete all Timesheets (before invoices since FK may exist)
  DELETE FROM timesheets;
  GET DIAGNOSTICS deleted_timesheets = ROW_COUNT;

  -- 10. Delete all Bookings
  DELETE FROM bookings;
  GET DIAGNOSTICS deleted_bookings = ROW_COUNT;

  -- 11. Delete all Invoices
  DELETE FROM invoices;
  GET DIAGNOSTICS deleted_invoices = ROW_COUNT;

  -- 12. Delete all Shifts (last, after all references removed)
  DELETE FROM shifts;
  GET DIAGNOSTICS deleted_shifts = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'deleted_shifts', deleted_shifts,
    'deleted_bookings', deleted_bookings,
    'deleted_timesheets', deleted_timesheets,
    'deleted_invoices', deleted_invoices,
    'deleted_invoice_amendments', deleted_invoice_amendments,
    'deleted_disputes', deleted_disputes,
    'deleted_operational_costs', deleted_op_costs,
    'deleted_match_scores', deleted_match_scores,
    'deleted_client_ratings', deleted_client_ratings,
    'deleted_notifications', deleted_notifications,
    'deleted_workflows', deleted_workflows,
    'deleted_changelogs', deleted_changelogs,
    'message', 'All shift-related data deleted successfully (no orphans)'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_all_shift_data() TO authenticated;
COMMENT ON FUNCTION delete_all_shift_data() IS 'Deletes ALL shifts and related data with complete orphan cleanup. DESTRUCTIVE - use with caution.';

-- ============================================
-- FUNCTION 2: Delete shift data for SPECIFIC CLIENTS
-- ============================================
CREATE OR REPLACE FUNCTION delete_client_shift_data(target_client_ids uuid[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_disputes INTEGER := 0;
  deleted_op_costs INTEGER := 0;
  deleted_match_scores INTEGER := 0;
  deleted_client_ratings INTEGER := 0;
  deleted_invoice_amendments INTEGER := 0;
  deleted_timesheets INTEGER := 0;
  deleted_bookings INTEGER := 0;
  deleted_shifts INTEGER := 0;
  deleted_workflows INTEGER := 0;
  deleted_changelogs INTEGER := 0;
  deleted_invoices INTEGER := 0;
  shift_ids uuid[];
  timesheet_ids uuid[];
  booking_ids uuid[];
  invoice_ids uuid[];
BEGIN
  -- Validate input
  IF target_client_ids IS NULL OR array_length(target_client_ids, 1) IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No client IDs provided');
  END IF;

  -- Get all shift IDs for target clients
  SELECT array_agg(id) INTO shift_ids FROM shifts WHERE client_id = ANY(target_client_ids);
  
  -- Get all booking IDs for these shifts  
  SELECT array_agg(id) INTO booking_ids FROM bookings WHERE shift_id = ANY(shift_ids);
  
  -- Get all timesheet IDs for these shifts/bookings
  SELECT array_agg(id) INTO timesheet_ids FROM timesheets 
  WHERE shift_id = ANY(shift_ids) OR booking_id = ANY(booking_ids);
  
  -- Get invoice IDs for these clients
  SELECT array_agg(id) INTO invoice_ids FROM invoices WHERE client_id = ANY(target_client_ids);

  -- If no shifts found, return early
  IF shift_ids IS NULL THEN
    RETURN json_build_object(
      'success', true, 'message', 'No shifts found for selected clients',
      'deleted_shifts', 0
    );
  END IF;

  -- 1. Delete disputes referencing these shifts
  DELETE FROM disputes WHERE shift_id = ANY(shift_ids);
  GET DIAGNOSTICS deleted_disputes = ROW_COUNT;

  -- 2. Delete operational_costs referencing these shifts
  DELETE FROM operational_costs WHERE shift_id = ANY(shift_ids);
  GET DIAGNOSTICS deleted_op_costs = ROW_COUNT;

  -- 3. Delete staff_match_scores for these shifts
  DELETE FROM staff_match_scores WHERE shift_id = ANY(shift_ids);
  GET DIAGNOSTICS deleted_match_scores = ROW_COUNT;

  -- 4. Delete client_ratings for these shifts
  DELETE FROM client_ratings WHERE shift_id = ANY(shift_ids);
  GET DIAGNOSTICS deleted_client_ratings = ROW_COUNT;

  -- 5. Delete AdminWorkflows related to these shifts
  DELETE FROM admin_workflows
  WHERE related_entity->>'entity_type' = 'shift'
    AND (related_entity->>'entity_id')::uuid = ANY(shift_ids);
  GET DIAGNOSTICS deleted_workflows = ROW_COUNT;

  -- 6. Delete ChangeLogs for these shifts
  DELETE FROM change_logs
  WHERE affected_entity_type = 'shift'
    AND affected_entity_id::uuid = ANY(shift_ids);
  GET DIAGNOSTICS deleted_changelogs = ROW_COUNT;

  -- 7. Delete invoice_amendments for client invoices
  IF invoice_ids IS NOT NULL THEN
    DELETE FROM invoice_amendments WHERE invoice_id = ANY(invoice_ids);
    GET DIAGNOSTICS deleted_invoice_amendments = ROW_COUNT;
  END IF;

  -- 8. Delete timesheets for these shifts/bookings
  DELETE FROM timesheets
  WHERE shift_id = ANY(shift_ids) OR booking_id = ANY(booking_ids);
  GET DIAGNOSTICS deleted_timesheets = ROW_COUNT;

  -- 9. Delete bookings for these shifts
  DELETE FROM bookings WHERE shift_id = ANY(shift_ids);
  GET DIAGNOSTICS deleted_bookings = ROW_COUNT;

  -- 10. Delete invoices for these clients
  IF invoice_ids IS NOT NULL THEN
    DELETE FROM invoices WHERE id = ANY(invoice_ids);
    GET DIAGNOSTICS deleted_invoices = ROW_COUNT;
  END IF;

  -- 11. Delete shifts for these clients
  DELETE FROM shifts WHERE client_id = ANY(target_client_ids);
  GET DIAGNOSTICS deleted_shifts = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'client_count', array_length(target_client_ids, 1),
    'deleted_shifts', deleted_shifts,
    'deleted_bookings', deleted_bookings,
    'deleted_timesheets', deleted_timesheets,
    'deleted_invoices', deleted_invoices,
    'deleted_invoice_amendments', deleted_invoice_amendments,
    'deleted_disputes', deleted_disputes,
    'deleted_operational_costs', deleted_op_costs,
    'deleted_match_scores', deleted_match_scores,
    'deleted_client_ratings', deleted_client_ratings,
    'deleted_workflows', deleted_workflows,
    'deleted_changelogs', deleted_changelogs,
    'message', 'Client shift data deleted successfully (no orphans)'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_client_shift_data(uuid[]) TO authenticated;
COMMENT ON FUNCTION delete_client_shift_data(uuid[]) IS 'Deletes shifts and related data for specific clients only. Safe for production use with test clients.';

