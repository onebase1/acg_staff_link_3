-- ============================================
-- Create RPC function to delete all shift-related data
-- This bypasses RLS policies for bulk deletion
-- ============================================

CREATE OR REPLACE FUNCTION delete_all_shift_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to bypass RLS
AS $$
DECLARE
  deleted_timesheets INTEGER;
  deleted_bookings INTEGER;
  deleted_shifts INTEGER;
  deleted_workflows INTEGER;
  deleted_changelogs INTEGER;
BEGIN
  -- Delete AdminWorkflows related to shifts
  DELETE FROM admin_workflows
  WHERE related_entity->>'entity_type' = 'shift';
  GET DIAGNOSTICS deleted_workflows = ROW_COUNT;

  -- Delete ChangeLogs related to shifts/timesheets/bookings
  DELETE FROM change_logs
  WHERE affected_entity_type IN ('shift', 'timesheet', 'booking');
  GET DIAGNOSTICS deleted_changelogs = ROW_COUNT;

  -- Delete all Timesheets
  DELETE FROM timesheets;
  GET DIAGNOSTICS deleted_timesheets = ROW_COUNT;

  -- Delete all Bookings
  DELETE FROM bookings;
  GET DIAGNOSTICS deleted_bookings = ROW_COUNT;

  -- Delete all Shifts
  DELETE FROM shifts;
  GET DIAGNOSTICS deleted_shifts = ROW_COUNT;

  -- Return summary
  RETURN json_build_object(
    'success', true,
    'deleted_shifts', deleted_shifts,
    'deleted_bookings', deleted_bookings,
    'deleted_timesheets', deleted_timesheets,
    'deleted_workflows', deleted_workflows,
    'deleted_changelogs', deleted_changelogs,
    'message', 'All shift-related data deleted successfully'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_all_shift_data() TO authenticated;

COMMENT ON FUNCTION delete_all_shift_data() IS 'Deletes all shifts, bookings, timesheets, and related data. Use with caution - this is for testing/cleanup only.';

