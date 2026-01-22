-- Migration: Refine Compliance Policies for Staff
-- Description: Restricts staff updates to only 'pending' or 'rejected' documents and adds DELETE permissions.

-- 1. Drop existing permissive update policy to replace it
DROP POLICY IF EXISTS "Staff can update own compliance" ON "public"."compliance";

-- 2. Create refined update policy
CREATE POLICY "Staff can update own compliance" ON "public"."compliance"
FOR UPDATE TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = compliance.staff_id
    AND s.user_id = auth.uid()
    AND (compliance.agency_id::uuid = s.agency_id)
  ))
  AND (status = 'pending' OR status = 'rejected')
);

-- 3. Add DELETE policy for staff
-- Staff should be able to delete their own documents if they are not yet verified.
CREATE POLICY "Staff can delete own compliance" ON "public"."compliance"
FOR DELETE TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = compliance.staff_id
    AND s.user_id = auth.uid()
    AND (compliance.agency_id::uuid = s.agency_id)
  ))
  AND (status = 'pending' OR status = 'rejected')
);
