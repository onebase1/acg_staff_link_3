-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Purpose: Enable secure multi-tenant data access
-- Created: 2025-11-12
--
-- This migration enables RLS and creates policies for all tables
-- Ensures users can only access data for their agency (except super admin)
-- ============================================================================

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND email = 'g.basera@yahoo.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's agency_id
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT agency_id FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's client_id
CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT client_id FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is agency admin
CREATE OR REPLACE FUNCTION is_agency_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND user_type IN ('agency_admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile, super admin can read all
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_super_admin());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_super_admin());


-- ============================================================================
-- AGENCIES TABLE
-- ============================================================================

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- Agency admins can read their agency, super admin can read all
CREATE POLICY "Agency admins can read their agency"
  ON agencies FOR SELECT
  USING (
    is_super_admin() OR
    id = get_user_agency_id()
  );

-- Super admin can insert agencies
CREATE POLICY "Super admin can insert agencies"
  ON agencies FOR INSERT
  WITH CHECK (is_super_admin());

-- Agency admins can update their agency
CREATE POLICY "Agency admins can update their agency"
  ON agencies FOR UPDATE
  USING (
    is_super_admin() OR
    id = get_user_agency_id()
  );


-- ============================================================================
-- STAFF TABLE
-- ============================================================================

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Staff can read their own record, agency admins can read their agency's staff
CREATE POLICY "Users can read staff in their agency"
  ON staff FOR SELECT
  USING (
    is_super_admin() OR
    agency_id = get_user_agency_id() OR
    id::text = (SELECT id::text FROM profiles WHERE id = auth.uid())
  );

-- Agency admins can insert staff
CREATE POLICY "Agency admins can insert staff"
  ON staff FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );

-- Agency admins can update their staff
CREATE POLICY "Agency admins can update staff"
  ON staff FOR UPDATE
  USING (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );

-- Agency admins can delete their staff
CREATE POLICY "Agency admins can delete staff"
  ON staff FOR DELETE
  USING (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );


-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Agency admins can read their agency's clients
CREATE POLICY "Users can read clients in their agency"
  ON clients FOR SELECT
  USING (
    is_super_admin() OR
    agency_id = get_user_agency_id() OR
    id = get_user_client_id()
  );

-- Agency admins can insert clients
CREATE POLICY "Agency admins can insert clients"
  ON clients FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );

-- Agency admins can update their clients
CREATE POLICY "Agency admins can update clients"
  ON clients FOR UPDATE
  USING (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );

-- Agency admins can delete their clients
CREATE POLICY "Agency admins can delete clients"
  ON clients FOR DELETE
  USING (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );


-- ============================================================================
-- SHIFTS TABLE
-- ============================================================================

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Users can read shifts for their agency
CREATE POLICY "Users can read shifts in their agency"
  ON shifts FOR SELECT
  USING (
    is_super_admin() OR
    agency_id = get_user_agency_id() OR
    assigned_staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid())
  );

-- Agency admins can insert shifts
CREATE POLICY "Agency admins can insert shifts"
  ON shifts FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );

-- Agency admins can update shifts
CREATE POLICY "Agency admins can update shifts"
  ON shifts FOR UPDATE
  USING (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );

-- Agency admins can delete shifts
CREATE POLICY "Agency admins can delete shifts"
  ON shifts FOR DELETE
  USING (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );


-- ============================================================================
-- BOOKINGS TABLE
-- ============================================================================

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users can read bookings for their agency
CREATE POLICY "Users can read bookings in their agency"
  ON bookings FOR SELECT
  USING (
    is_super_admin() OR
    agency_id = get_user_agency_id() OR
    staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid())
  );

-- Agency admins can insert bookings
CREATE POLICY "Agency admins can insert bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );

-- Agency admins can update bookings
CREATE POLICY "Agency admins can update bookings"
  ON bookings FOR UPDATE
  USING (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );


-- ============================================================================
-- TIMESHEETS TABLE
-- ============================================================================

ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

-- Users can read timesheets for their agency or their own timesheets
CREATE POLICY "Users can read timesheets in their agency"
  ON timesheets FOR SELECT
  USING (
    is_super_admin() OR
    agency_id = get_user_agency_id() OR
    staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid())
  );

-- Agency admins and staff can insert timesheets
CREATE POLICY "Users can insert timesheets"
  ON timesheets FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    agency_id = get_user_agency_id() OR
    staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid())
  );

-- Agency admins can update timesheets
CREATE POLICY "Users can update timesheets"
  ON timesheets FOR UPDATE
  USING (
    is_super_admin() OR
    agency_id = get_user_agency_id() OR
    staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid())
  );


-- ============================================================================
-- INVOICES TABLE
-- ============================================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Users can read invoices for their agency
CREATE POLICY "Users can read invoices in their agency"
  ON invoices FOR SELECT
  USING (
    is_super_admin() OR
    agency_id = get_user_agency_id() OR
    client_id = get_user_client_id()
  );

-- Agency admins can insert invoices
CREATE POLICY "Agency admins can insert invoices"
  ON invoices FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );

-- Agency admins can update invoices
CREATE POLICY "Agency admins can update invoices"
  ON invoices FOR UPDATE
  USING (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );


-- ============================================================================
-- PAYSLIPS TABLE
-- ============================================================================

ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

-- Staff can read their own payslips, agency admins can read their agency's payslips
CREATE POLICY "Users can read payslips in their agency"
  ON payslips FOR SELECT
  USING (
    is_super_admin() OR
    agency_id = get_user_agency_id() OR
    staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid())
  );

-- Agency admins can insert payslips
CREATE POLICY "Agency admins can insert payslips"
  ON payslips FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );

-- Agency admins can update payslips
CREATE POLICY "Agency admins can update payslips"
  ON payslips FOR UPDATE
  USING (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );


-- ============================================================================
-- COMPLIANCE TABLE
-- ============================================================================

ALTER TABLE compliance ENABLE ROW LEVEL SECURITY;

-- Users can read compliance records for their agency
CREATE POLICY "Users can read compliance in their agency"
  ON compliance FOR SELECT
  USING (
    is_super_admin() OR
    agency_id = get_user_agency_id() OR
    staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid())
  );

-- Agency admins can insert compliance records
CREATE POLICY "Agency admins can insert compliance"
  ON compliance FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );

-- Agency admins can update compliance records
CREATE POLICY "Agency admins can update compliance"
  ON compliance FOR UPDATE
  USING (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );


-- ============================================================================
-- GROUPS TABLE
-- ============================================================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Users can read groups for their agency
CREATE POLICY "Users can read groups in their agency"
  ON groups FOR SELECT
  USING (
    is_super_admin() OR
    agency_id = get_user_agency_id()
  );

-- Agency admins can insert groups
CREATE POLICY "Agency admins can insert groups"
  ON groups FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );

-- Agency admins can update groups
CREATE POLICY "Agency admins can update groups"
  ON groups FOR UPDATE
  USING (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );

-- Agency admins can delete groups
CREATE POLICY "Agency admins can delete groups"
  ON groups FOR DELETE
  USING (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );


-- ============================================================================
-- ADMIN_WORKFLOWS TABLE
-- ============================================================================

ALTER TABLE admin_workflows ENABLE ROW LEVEL SECURITY;

-- Agency admins can read their agency's workflows
CREATE POLICY "Users can read workflows in their agency"
  ON admin_workflows FOR SELECT
  USING (
    is_super_admin() OR
    agency_id = get_user_agency_id()
  );

-- Agency admins can insert workflows
CREATE POLICY "Agency admins can insert workflows"
  ON admin_workflows FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );

-- Agency admins can update workflows
CREATE POLICY "Agency admins can update workflows"
  ON admin_workflows FOR UPDATE
  USING (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );


-- ============================================================================
-- CHANGE_LOGS TABLE
-- ============================================================================

ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;

-- Agency admins can read their agency's logs
CREATE POLICY "Users can read change logs in their agency"
  ON change_logs FOR SELECT
  USING (
    is_super_admin() OR
    agency_id = get_user_agency_id()
  );

-- Users can insert change logs
CREATE POLICY "Users can insert change logs"
  ON change_logs FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    agency_id = get_user_agency_id()
  );


-- ============================================================================
-- OPERATIONAL_COSTS TABLE
-- ============================================================================

ALTER TABLE operational_costs ENABLE ROW LEVEL SECURITY;

-- Agency admins can read their agency's costs
CREATE POLICY "Agency admins can read costs in their agency"
  ON operational_costs FOR SELECT
  USING (
    is_super_admin() OR
    agency_id = get_user_agency_id()
  );

-- Agency admins can insert costs
CREATE POLICY "Agency admins can insert costs"
  ON operational_costs FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );

-- Agency admins can update costs
CREATE POLICY "Agency admins can update costs"
  ON operational_costs FOR UPDATE
  USING (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );


-- ============================================================================
-- INVOICE_AMENDMENTS TABLE
-- ============================================================================

ALTER TABLE invoice_amendments ENABLE ROW LEVEL SECURITY;

-- Agency admins can read their agency's amendments
CREATE POLICY "Users can read amendments in their agency"
  ON invoice_amendments FOR SELECT
  USING (
    is_super_admin() OR
    agency_id = get_user_agency_id()
  );

-- Agency admins can insert amendments
CREATE POLICY "Agency admins can insert amendments"
  ON invoice_amendments FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    (is_agency_admin() AND agency_id = get_user_agency_id())
  );


-- ============================================================================
-- NOTIFICATION_QUEUE TABLE
-- ============================================================================

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read notifications in their agency"
  ON notification_queue FOR SELECT
  USING (
    is_super_admin() OR
    agency_id = get_user_agency_id()
  );

-- Users can insert notifications
CREATE POLICY "Users can insert notifications"
  ON notification_queue FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    agency_id = get_user_agency_id()
  );

-- Users can update their notifications
CREATE POLICY "Users can update their notifications"
  ON notification_queue FOR UPDATE
  USING (
    is_super_admin() OR
    agency_id = get_user_agency_id()
  );


-- ============================================================================
-- AGENCY_ADMIN_INVITATIONS TABLE
-- ============================================================================

ALTER TABLE agency_admin_invitations ENABLE ROW LEVEL SECURITY;

-- Super admin can read all invitations
CREATE POLICY "Super admin can read all invitations"
  ON agency_admin_invitations FOR SELECT
  USING (is_super_admin());

-- Super admin can insert invitations
CREATE POLICY "Super admin can insert invitations"
  ON agency_admin_invitations FOR INSERT
  WITH CHECK (is_super_admin());

-- Super admin can update invitations
CREATE POLICY "Super admin can update invitations"
  ON agency_admin_invitations FOR UPDATE
  USING (is_super_admin());


-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_agency_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_client_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_agency_admin() TO authenticated;


-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Run these after migration to verify policies are working:
--
-- SELECT * FROM profiles WHERE id = auth.uid();
-- SELECT * FROM agencies WHERE id = get_user_agency_id();
-- SELECT * FROM staff WHERE agency_id = get_user_agency_id();
-- SELECT * FROM shifts WHERE agency_id = get_user_agency_id() LIMIT 5;
