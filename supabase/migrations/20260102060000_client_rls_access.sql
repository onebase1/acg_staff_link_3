-- ============================================================================
-- MODULE 35 PHASE 5: Client RLS Access
-- Purpose: Grant strictly scoped read access to Client Users for their own data.
-- ============================================================================

-- 1. Shifts: Clients can see shifts for their client_id
CREATE POLICY "Clients can view their own shifts" ON public.shifts
    FOR SELECT
    USING (
        (auth.jwt() ->> 'user_type' = 'client_user')
        AND
        (client_id::text = (auth.jwt() ->> 'client_id'))
        AND
        (agency_id::text = (auth.jwt() ->> 'agency_id'))
    );

-- 2. Timesheets: Clients can see timesheets for their client_id
CREATE POLICY "Clients can view their own timesheets" ON public.timesheets
    FOR SELECT
    USING (
        (auth.jwt() ->> 'user_type' = 'client_user')
        AND
        (client_id::text = (auth.jwt() ->> 'client_id'))
        AND
        (agency_id::text = (auth.jwt() ->> 'agency_id'))
    );

-- 3. Bookings: Clients can see bookings for their client_id
CREATE POLICY "Clients can view their own bookings" ON public.bookings
    FOR SELECT
    USING (
        (auth.jwt() ->> 'user_type' = 'client_user')
        AND
        (client_id::text = (auth.jwt() ->> 'client_id'))
        AND
        (agency_id::text = (auth.jwt() ->> 'agency_id'))
    );

-- 4. Client Contacts: Clients can view their own profile/contact info (Self-Access)
-- Existing policy might cover this, but ensuring explicit access for the JWT based match is safer.
-- "Users can view their client contacts" existing policy uses: (client_id IN (SELECT profiles.client_id ...))
-- That requires "profiles" lookup which is heavy. Let's add a fast JWT one.
CREATE POLICY "Clients can view their own contact record (Fast)" ON public.client_contacts
    FOR SELECT
    USING (
        (auth.jwt() ->> 'user_type' = 'client_user')
        AND
        (client_id::text = (auth.jwt() ->> 'client_id'))
        AND
        (email = (auth.jwt() ->> 'email')) 
    );
