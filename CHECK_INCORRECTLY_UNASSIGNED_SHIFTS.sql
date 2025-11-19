-- ============================================================================
-- CHECK FOR INCORRECTLY UNASSIGNED SHIFTS
-- Run this in Supabase SQL Editor to find shifts affected by the bug
-- ============================================================================

-- Find shifts that were assigned and then immediately moved to marketplace
-- (journey log will show 'assigned' followed by 'open' within minutes)
SELECT 
  id,
  date,
  start_time,
  end_time,
  status,
  marketplace_visible,
  shift_journey_log
FROM shifts
WHERE 
  status = 'open'
  AND marketplace_visible = true
  AND shift_journey_log IS NOT NULL
  AND jsonb_array_length(shift_journey_log) >= 2
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(shift_journey_log) AS log_entry
    WHERE log_entry->>'state' = 'assigned'
  )
ORDER BY created_date DESC
LIMIT 20;

-- ============================================================================
-- To manually fix a shift that was incorrectly unassigned:
-- ============================================================================

-- Step 1: Find the staff_id from the journey log
-- SELECT 
--   id,
--   shift_journey_log
-- FROM shifts
-- WHERE id = 'YOUR_SHIFT_ID';

-- Step 2: Re-assign the shift to the staff member
-- UPDATE shifts
-- SET 
--   status = 'assigned',
--   assigned_staff_id = 'STAFF_ID_FROM_JOURNEY_LOG',
--   marketplace_visible = false,
--   marketplace_added_at = NULL,
--   shift_journey_log = shift_journey_log || jsonb_build_array(
--     jsonb_build_object(
--       'state', 'assigned',
--       'timestamp', NOW(),
--       'method', 'manual_fix',
--       'notes', 'Re-assigned after fixing 24h marketplace bug'
--     )
--   )
-- WHERE id = 'YOUR_SHIFT_ID';

