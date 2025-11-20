-- Create function to bulk update past-dated shifts to awaiting_admin_closure
-- ✅ FIXED: Uses scheduled end_time + 48h grace period (not just shift date)
-- ✅ FIXED: Handles overnight shifts (end_time < start_time means next day)

CREATE OR REPLACE FUNCTION bulk_update_past_shifts_to_awaiting_closure(cutoff_date DATE)
RETURNS TABLE(updated_count BIGINT) AS $$
DECLARE
  row_count BIGINT;
BEGIN
  -- Temporarily disable the overlap validation trigger
  -- (We're only changing status, not assignment/times, so overlap check is not needed)
  ALTER TABLE shifts DISABLE TRIGGER validate_shift_overlap;

  -- Update shifts that have passed their scheduled end time + 48-hour grace period
  -- ✅ FIX: Calculate actual end datetime (handles overnight shifts)
  -- ✅ FIX: Add 48-hour grace period to allow natural completion via GPS/timesheets
  UPDATE shifts
  SET
    status = 'awaiting_admin_closure',
    shift_ended_at = NOW(),
    shift_journey_log = COALESCE(shift_journey_log, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'state', 'awaiting_admin_closure',
        'timestamp', NOW(),
        'method', 'automated',
        'notes', 'Auto-transitioned: shift ended 48+ hours ago without completion. Previous status: ' || status
      )
    )
  WHERE
    -- Calculate scheduled end datetime (handles overnight shifts)
    (CASE
      WHEN end_time < start_time THEN
        -- Overnight shift: end time is next day
        (date + INTERVAL '1 day')::timestamp + end_time::time
      ELSE
        -- Same-day shift
        date::timestamp + end_time::time
    END) < (NOW() - INTERVAL '48 hours')  -- 48-hour grace period after scheduled end
    AND status IN ('open', 'assigned', 'confirmed', 'in_progress');

  GET DIAGNOSTICS row_count = ROW_COUNT;

  -- Re-enable the trigger
  ALTER TABLE shifts ENABLE TRIGGER validate_shift_overlap;

  RETURN QUERY SELECT row_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION bulk_update_past_shifts_to_awaiting_closure(DATE) TO service_role;

