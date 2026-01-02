-- ============================================================================
-- MODULE 35 PHASE 6: Safe Client Access to Staff Profiles
-- Purpose: Grant clients access ONLY to staff assigned to them.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SECURING THE 'STAFF' TABLE
-- ----------------------------------------------------------------------------

-- Drop the overly permissive policy (access to all in agency)
DROP POLICY IF EXISTS "Users can read staff in their agency" ON public.staff;

-- Re-create stricter policy for INTERNAL users (Admins & Staff Members)
CREATE POLICY "Agency admins and staff can read staff in their agency" ON public.staff
    FOR SELECT
    USING (
        (auth.jwt() ->> 'user_type' IN ('agency_admin', 'staff_member', 'super_admin'))
        AND
        (agency_id::text = (auth.jwt() ->> 'agency_id'))
    );
-- Note: 'super_admin' might need broader access, but for now this matches agency tenant.
-- Adding specific super_admin bypass if needed: OR is_super_admin() is handled by standard functions usually?
-- Let's stick to the JWT for speed and safety.

-- Create NEW policy for CLIENT users (Read ONLY assigned staff)
CREATE POLICY "Clients can read assigned staff" ON public.staff
    FOR SELECT
    USING (
        (auth.jwt() ->> 'user_type' = 'client_user')
        AND
        EXISTS (
            SELECT 1 FROM shifts
            WHERE shifts.assigned_staff_id = staff.id
              AND shifts.client_id::text = (auth.jwt() ->> 'client_id')
              -- Optimization: filter by agency too to hit indexes if composite
              AND shifts.agency_id::text = (auth.jwt() ->> 'agency_id')
        )
    );


-- ----------------------------------------------------------------------------
-- 2. SECURING THE 'COMPLIANCE' TABLE
-- ----------------------------------------------------------------------------

-- Drop permissive policy
DROP POLICY IF EXISTS "Users can read compliance in their agency" ON public.compliance;

-- Re-create stricter policy for INTERNAL users
CREATE POLICY "Agency admins and staff can read compliance in their agency" ON public.compliance
    FOR SELECT
    USING (
        (auth.jwt() ->> 'user_type' IN ('agency_admin', 'staff_member'))
        AND
        (agency_id::text = (auth.jwt() ->> 'agency_id'))
    );

-- Create NEW policy for CLIENT users (Read ONLY for assigned staff)
-- Logic matches the 'staff' policy above: if I have a shift with this staff, I can see their compliance.
CREATE POLICY "Clients can read compliance for assigned staff" ON public.compliance
    FOR SELECT
    USING (
        (auth.jwt() ->> 'user_type' = 'client_user')
        AND
        EXISTS (
            SELECT 1 FROM shifts
            WHERE shifts.assigned_staff_id = compliance.staff_id
              AND shifts.client_id::text = (auth.jwt() ->> 'client_id')
              AND shifts.agency_id::text = (auth.jwt() ->> 'agency_id')
        )
    );
