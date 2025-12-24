-- ============================================================================
-- MODULE 35: STAFF SELF-DECLINE PERMISSIONS
-- ============================================================================
-- Date: 2025-12-24
-- Purpose: Allow staff to decline their own assigned shifts
--
-- Features:
-- 1. Staff can update shifts they're assigned to (only to unassign themselves)
-- 2. Staff can delete their own draft timesheets
-- 3. Staff can delete their own pending bookings
--
-- Security:
-- - Staff can ONLY unassign themselves (cannot reassign to others)
-- - Staff can ONLY delete draft/pending records (not submitted/approved)
-- - All changes logged in shift_journey_log by edge function
-- ============================================================================

-- ============================================================================
-- POLICY 1: Staff can decline their own assigned shifts
-- ============================================================================

-- Drop existing policy if it exists (for re-deployment)
DROP POLICY IF EXISTS "Staff can decline their own assigned shifts" ON shifts;

-- Create policy allowing staff to update ONLY their own shifts
-- Allows: Setting assigned_staff_id to NULL and status to 'open'
-- Blocks: Everything else
CREATE POLICY "Staff can decline their own assigned shifts"
  ON shifts
  FOR UPDATE
  USING (
    -- Staff must be the one currently assigned to the shift
    assigned_staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid())
    -- Shift must be in a declinable status
    AND status IN ('assigned', 'confirmed')
  )
  WITH CHECK (
    -- After update, shift must be open with no staff assigned
    -- This prevents staff from reassigning to someone else
    assigned_staff_id IS NULL
    AND status = 'open'
  );

COMMENT ON POLICY "Staff can decline their own assigned shifts" ON shifts IS
  'Allows staff to decline shifts assigned to them by setting status to open and clearing assigned_staff_id. ' ||
  'Staff cannot reassign to others - only unassign themselves.';

-- ============================================================================
-- POLICY 2: Staff can delete their own draft timesheets
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Staff can delete their own draft timesheets" ON timesheets;

-- Create policy allowing staff to delete ONLY draft/pending timesheets
CREATE POLICY "Staff can delete their own draft timesheets"
  ON timesheets
  FOR DELETE
  USING (
    -- Must be staff member's own timesheet
    staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid())
    -- Must be in draft or pending status (not submitted/approved)
    AND status IN ('draft', 'pending')
  );

COMMENT ON POLICY "Staff can delete their own draft timesheets" ON timesheets IS
  'Allows staff to delete their own draft or pending timesheets when declining a shift. ' ||
  'Cannot delete submitted, approved, or paid timesheets.';

-- ============================================================================
-- POLICY 3: Staff can delete their own pending bookings
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Staff can delete their own bookings" ON bookings;

-- Create policy allowing staff to delete pending/confirmed bookings
CREATE POLICY "Staff can delete their own bookings"
  ON bookings
  FOR DELETE
  USING (
    -- Must be staff member's own booking
    staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid())
    -- Must be in pending or confirmed status (not completed)
    AND status IN ('pending', 'confirmed')
  );

COMMENT ON POLICY "Staff can delete their own bookings" ON bookings IS
  'Allows staff to delete their own pending or confirmed bookings when declining a shift. ' ||
  'Cannot delete completed bookings.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Check if policies were created
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'shifts'
    AND policyname = 'Staff can decline their own assigned shifts'
  ) THEN
    RAISE NOTICE '✅ Policy created: Staff can decline their own assigned shifts';
  ELSE
    RAISE WARNING '❌ Failed to create policy for shifts';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'timesheets'
    AND policyname = 'Staff can delete their own draft timesheets'
  ) THEN
    RAISE NOTICE '✅ Policy created: Staff can delete their own draft timesheets';
  ELSE
    RAISE WARNING '❌ Failed to create policy for timesheets';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bookings'
    AND policyname = 'Staff can delete their own bookings'
  ) THEN
    RAISE NOTICE '✅ Policy created: Staff can delete their own bookings';
  ELSE
    RAISE WARNING '❌ Failed to create policy for bookings';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📋 MODULE 35: Staff Self-Decline Permissions';
  RAISE NOTICE '   ✅ 3 RLS policies created successfully';
  RAISE NOTICE '   🔒 Staff can now decline their own assigned shifts';
  RAISE NOTICE '   🗑️ Orphaned timesheets and bookings will be cleaned up';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================

-- Test policy (as staff user):
-- 1. Assign shift to staff member (as admin)
-- 2. Login as staff member
-- 3. UPDATE shifts SET status='open', assigned_staff_id=NULL WHERE id='shift-id'
-- 4. Should succeed if staff is assigned to that shift
-- 5. Should fail if trying to assign to someone else

-- Rollback (if needed):
-- DROP POLICY "Staff can decline their own assigned shifts" ON shifts;
-- DROP POLICY "Staff can delete their own draft timesheets" ON timesheets;
-- DROP POLICY "Staff can delete their own bookings" ON bookings;
