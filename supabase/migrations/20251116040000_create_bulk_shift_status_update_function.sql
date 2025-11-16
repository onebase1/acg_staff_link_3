-- Create function to bulk update past-dated shifts to awaiting_admin_closure
-- This function disables the overlap trigger temporarily to allow status updates

CREATE OR REPLACE FUNCTION bulk_update_past_shifts_to_awaiting_closure(cutoff_date DATE)
RETURNS TABLE(updated_count BIGINT) AS $$
DECLARE
  row_count BIGINT;
BEGIN
  -- Temporarily disable the overlap validation trigger
  -- (We're only changing status, not assignment/times, so overlap check is not needed)
  ALTER TABLE shifts DISABLE TRIGGER validate_shift_overlap;
  
  -- Update all past-dated shifts that are still in pre-completion statuses
  UPDATE shifts
  SET 
    status = 'awaiting_admin_closure',
    shift_ended_at = NOW(),
    shift_journey_log = COALESCE(shift_journey_log, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'state', 'awaiting_admin_closure',
        'timestamp', NOW(),
        'method', 'automated',
        'notes', 'Auto-transitioned: shift date (' || date || ') passed without completion. Previous status: ' || status
      )
    )
  WHERE date < cutoff_date
    AND status IN ('open', 'assigned', 'confirmed', 'in_progress');
  
  GET DIAGNOSTICS row_count = ROW_COUNT;
  
  -- Re-enable the trigger
  ALTER TABLE shifts ENABLE TRIGGER validate_shift_overlap;
  
  RETURN QUERY SELECT row_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION bulk_update_past_shifts_to_awaiting_closure(DATE) TO service_role;

