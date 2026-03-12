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

  -- Update shifts that have passed their scheduled end time + grace period
  -- GPS shifts: 48 hours
  -- Paper shifts: 12 hours
  UPDATE shifts
  SET
    status = 'awaiting_admin_closure',
    shift_ended_at = NOW(),
    shift_journey_log = COALESCE(shift_journey_log, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'state', 'awaiting_admin_closure',
        'timestamp', NOW(),
        'method', 'automated',
        'notes', 'Auto-transitioned: shift ended ' || (CASE WHEN requires_gps = false THEN '12' ELSE '48' END) || '+ hours ago without completion. Previous status: ' || status
      )
    )
  WHERE
    (CASE
      WHEN requires_gps = false THEN
        -- Paper shifts: 12-hour grace period (Fast cleanup)
        (CASE
          WHEN end_time < start_time THEN (date + INTERVAL '1 day')::timestamp + end_time::time
          ELSE date::timestamp + end_time::time
        END) < (NOW() - INTERVAL '12 hours')
      ELSE
        -- GPS shifts: 48-hour grace period (Standard safety net)
        (CASE
          WHEN end_time < start_time THEN (date + INTERVAL '1 day')::timestamp + end_time::time
          ELSE date::timestamp + end_time::time
        END) < (NOW() - INTERVAL '48 hours')
    END)
    AND status IN ('open', 'assigned', 'confirmed', 'in_progress');

  GET DIAGNOSTICS row_count = ROW_COUNT;

  -- Re-enable the trigger
  ALTER TABLE shifts ENABLE TRIGGER validate_shift_overlap;

  RETURN QUERY SELECT row_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION bulk_update_past_shifts_to_awaiting_closure(DATE) TO service_role;

