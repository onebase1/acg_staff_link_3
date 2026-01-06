-- ============================================================================
-- MODULE 35 ERROR FIX: Infinite Recursion Breaker
-- Purpose: Move Client-Staff check to SECURITY DEFINER function to avoid RLS loop.
-- ============================================================================

-- 1. Create Helper Function (SECURITY DEFINER)
-- This function runs as the owner (bypassing RLS on 'shifts' table), 
-- breaking the Staff -> Shifts -> Staff RLS cycle.
CREATE OR REPLACE FUNCTION public.client_can_view_staff(target_staff_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user (client) has any shift with this staff member
  RETURN EXISTS (
    SELECT 1 
    FROM shifts
    WHERE shifts.assigned_staff_id = target_staff_id
      AND shifts.client_id::text = (auth.jwt() ->> 'client_id')
      AND shifts.agency_id::text = (auth.jwt() ->> 'agency_id')
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.client_can_view_staff(UUID) TO authenticated;


-- 2. Update 'staff' Policy for Clients
DROP POLICY IF EXISTS "Clients can read assigned staff" ON public.staff;

CREATE POLICY "Clients can read assigned staff" ON public.staff
    FOR SELECT
    USING (
        (auth.jwt() ->> 'user_type' = 'client_user')
        AND
        public.client_can_view_staff(id)
    );


-- 3. Update 'compliance' Policy for Clients
DROP POLICY IF EXISTS "Clients can read compliance for assigned staff" ON public.compliance;

CREATE POLICY "Clients can read compliance for assigned staff" ON public.compliance
    FOR SELECT
    USING (
        (auth.jwt() ->> 'user_type' = 'client_user')
        AND
        public.client_can_view_staff(staff_id)
    );
