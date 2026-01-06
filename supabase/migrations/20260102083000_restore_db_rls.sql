-- ============================================================================
-- MODULE 35 ERROR FIX: Restore DB-Backed Privileges
-- Purpose: JWT claims are missing for existing staff/admins. 
--          Revert to DB-lookup functions to ensure they aren't locked out.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FIX 'STAFF' TABLE ACCESS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Agency admins and staff can read staff in their agency" ON public.staff;

CREATE POLICY "Agency admins and staff can read staff in their agency" ON public.staff
    FOR SELECT
    USING (
        is_super_admin() 
        OR 
        (
            (is_agency_admin() OR is_staff_member()) 
            AND 
            (agency_id::text = (get_user_agency_id())::text)
        )
    );

-- ----------------------------------------------------------------------------
-- 2. FIX 'COMPLIANCE' TABLE ACCESS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Agency admins and staff can read compliance in their agency" ON public.compliance;

CREATE POLICY "Agency admins and staff can read compliance in their agency" ON public.compliance
    FOR SELECT
    USING (
        is_super_admin() 
        OR 
        (
            (is_agency_admin() OR is_staff_member()) 
            AND 
            (agency_id::text = (get_user_agency_id())::text)
        )
    );

-- (Client policies remain untouched as they use the new helper function and are correct)
