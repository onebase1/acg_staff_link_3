-- Migration: Fix bookings RLS to allow staff to create their own bookings
-- Generated: 2025-11-13
-- Issue: Staff members cannot accept shifts because they can't insert into bookings table

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Agency admins can insert bookings" ON bookings;

-- Create new policy that allows both agency admins AND staff to insert bookings
CREATE POLICY "Agency admins and staff can insert bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id()) OR
    -- Staff can create bookings for themselves
    (
      staff_id::text IN (
        SELECT id::text FROM staff WHERE user_id = auth.uid()
      )
      AND agency_id = get_user_agency_id()
    )
  );

-- Also allow staff to update their own bookings (for confirmation, etc.)
DROP POLICY IF EXISTS "Agency admins can update bookings" ON bookings;

CREATE POLICY "Agency admins and staff can update bookings"
  ON bookings FOR UPDATE
  USING (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id()) OR
    -- Staff can update their own bookings
    (
      staff_id::text IN (
        SELECT id::text FROM staff WHERE user_id = auth.uid()
      )
    )
  );

COMMENT ON POLICY "Agency admins and staff can insert bookings" ON bookings IS 
  'Allows agency admins to create bookings for any staff, and staff members to create bookings for themselves when accepting shifts';

COMMENT ON POLICY "Agency admins and staff can update bookings" ON bookings IS 
  'Allows agency admins to update any bookings in their agency, and staff members to update their own bookings (e.g., confirming attendance)';

