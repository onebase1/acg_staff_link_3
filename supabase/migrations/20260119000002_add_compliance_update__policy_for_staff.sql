-- Migration: Add Compliance UPDATE policy for Staff
-- Description: Allows authenticated staff to update their own compliance records.
-- Fixes issue where staff couldn't re-upload or edit documents in Profile Setup or Staff Portal.

CREATE POLICY "Staff can update own compliance" ON "public"."compliance"
FOR UPDATE TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = compliance.staff_id
    AND s.user_id = auth.uid()
    AND (compliance.agency_id::uuid = s.agency_id)
  ))
);
