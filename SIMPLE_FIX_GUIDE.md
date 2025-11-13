# FIX DASHBOARD - 5 SIMPLE STEPS

## THE PROBLEM
Dashboard shows all zeros because Row Level Security (RLS) policies are missing.

## THE SOLUTION (5 minutes)

### STEP 1: Click this link
👉 https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/sql

### STEP 2: Click "+ New query" button (top left)

### STEP 3: Copy ALL the code below (scroll to end!)

```sql
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

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id OR is_super_admin());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id OR is_super_admin());

-- AGENCIES
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency admins can read their agency" ON agencies FOR SELECT USING (is_super_admin() OR id = get_user_agency_id());
CREATE POLICY "Super admin can insert agencies" ON agencies FOR INSERT WITH CHECK (is_super_admin());
CREATE POLICY "Agency admins can update their agency" ON agencies FOR UPDATE USING (is_super_admin() OR id = get_user_agency_id());

-- STAFF
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read staff in their agency" ON staff FOR SELECT USING (is_super_admin() OR agency_id = get_user_agency_id() OR id::text = (SELECT id::text FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Agency admins can insert staff" ON staff FOR INSERT WITH CHECK (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));
CREATE POLICY "Agency admins can update staff" ON staff FOR UPDATE USING (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));
CREATE POLICY "Agency admins can delete staff" ON staff FOR DELETE USING (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));

-- CLIENTS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read clients in their agency" ON clients FOR SELECT USING (is_super_admin() OR agency_id = get_user_agency_id() OR id = get_user_client_id());
CREATE POLICY "Agency admins can insert clients" ON clients FOR INSERT WITH CHECK (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));
CREATE POLICY "Agency admins can update clients" ON clients FOR UPDATE USING (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));
CREATE POLICY "Agency admins can delete clients" ON clients FOR DELETE USING (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));

-- SHIFTS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read shifts in their agency" ON shifts FOR SELECT USING (is_super_admin() OR agency_id = get_user_agency_id() OR assigned_staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Agency admins can insert shifts" ON shifts FOR INSERT WITH CHECK (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));
CREATE POLICY "Agency admins can update shifts" ON shifts FOR UPDATE USING (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));
CREATE POLICY "Agency admins can delete shifts" ON shifts FOR DELETE USING (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));

-- BOOKINGS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read bookings in their agency" ON bookings FOR SELECT USING (is_super_admin() OR agency_id = get_user_agency_id() OR staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Agency admins can insert bookings" ON bookings FOR INSERT WITH CHECK (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));
CREATE POLICY "Agency admins can update bookings" ON bookings FOR UPDATE USING (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));

-- TIMESHEETS
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read timesheets in their agency" ON timesheets FOR SELECT USING (is_super_admin() OR agency_id = get_user_agency_id() OR staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert timesheets" ON timesheets FOR INSERT WITH CHECK (is_super_admin() OR agency_id = get_user_agency_id() OR staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update timesheets" ON timesheets FOR UPDATE USING (is_super_admin() OR agency_id = get_user_agency_id() OR staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid()));

-- INVOICES
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read invoices in their agency" ON invoices FOR SELECT USING (is_super_admin() OR agency_id = get_user_agency_id() OR client_id = get_user_client_id());
CREATE POLICY "Agency admins can insert invoices" ON invoices FOR INSERT WITH CHECK (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));
CREATE POLICY "Agency admins can update invoices" ON invoices FOR UPDATE USING (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));

-- PAYSLIPS
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read payslips in their agency" ON payslips FOR SELECT USING (is_super_admin() OR agency_id = get_user_agency_id() OR staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Agency admins can insert payslips" ON payslips FOR INSERT WITH CHECK (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));
CREATE POLICY "Agency admins can update payslips" ON payslips FOR UPDATE USING (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));

-- COMPLIANCE
ALTER TABLE compliance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read compliance in their agency" ON compliance FOR SELECT USING (is_super_admin() OR agency_id = get_user_agency_id() OR staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Agency admins can insert compliance" ON compliance FOR INSERT WITH CHECK (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));
CREATE POLICY "Agency admins can update compliance" ON compliance FOR UPDATE USING (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));

-- GROUPS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read groups in their agency" ON groups FOR SELECT USING (is_super_admin() OR agency_id = get_user_agency_id());
CREATE POLICY "Agency admins can insert groups" ON groups FOR INSERT WITH CHECK (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));
CREATE POLICY "Agency admins can update groups" ON groups FOR UPDATE USING (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));
CREATE POLICY "Agency admins can delete groups" ON groups FOR DELETE USING (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));

-- ADMIN_WORKFLOWS
ALTER TABLE admin_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read workflows in their agency" ON admin_workflows FOR SELECT USING (is_super_admin() OR agency_id = get_user_agency_id());
CREATE POLICY "Agency admins can insert workflows" ON admin_workflows FOR INSERT WITH CHECK (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));
CREATE POLICY "Agency admins can update workflows" ON admin_workflows FOR UPDATE USING (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));

-- CHANGE_LOGS
ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read change logs in their agency" ON change_logs FOR SELECT USING (is_super_admin() OR agency_id = get_user_agency_id());
CREATE POLICY "Users can insert change logs" ON change_logs FOR INSERT WITH CHECK (is_super_admin() OR agency_id = get_user_agency_id());

-- OPERATIONAL_COSTS
ALTER TABLE operational_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency admins can read costs in their agency" ON operational_costs FOR SELECT USING (is_super_admin() OR agency_id = get_user_agency_id());
CREATE POLICY "Agency admins can insert costs" ON operational_costs FOR INSERT WITH CHECK (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));
CREATE POLICY "Agency admins can update costs" ON operational_costs FOR UPDATE USING (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));

-- INVOICE_AMENDMENTS
ALTER TABLE invoice_amendments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read amendments in their agency" ON invoice_amendments FOR SELECT USING (is_super_admin() OR agency_id = get_user_agency_id());
CREATE POLICY "Agency admins can insert amendments" ON invoice_amendments FOR INSERT WITH CHECK (is_super_admin() OR (is_agency_admin() AND agency_id = get_user_agency_id()));

-- NOTIFICATION_QUEUE
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read notifications in their agency" ON notification_queue FOR SELECT USING (is_super_admin() OR agency_id = get_user_agency_id());
CREATE POLICY "Users can insert notifications" ON notification_queue FOR INSERT WITH CHECK (is_super_admin() OR agency_id = get_user_agency_id());
CREATE POLICY "Users can update their notifications" ON notification_queue FOR UPDATE USING (is_super_admin() OR agency_id = get_user_agency_id());

-- AGENCY_ADMIN_INVITATIONS
ALTER TABLE agency_admin_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin can read all invitations" ON agency_admin_invitations FOR SELECT USING (is_super_admin());
CREATE POLICY "Super admin can insert invitations" ON agency_admin_invitations FOR INSERT WITH CHECK (is_super_admin());
CREATE POLICY "Super admin can update invitations" ON agency_admin_invitations FOR UPDATE USING (is_super_admin());

-- GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_agency_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_client_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_agency_admin() TO authenticated;
```

### STEP 4: Paste into Supabase SQL Editor

### STEP 5: Click "RUN" button (or press Ctrl+Enter)

Wait 30 seconds for "Success" message.

---

## DONE! Now test:

1. Go to: http://localhost:5173
2. Log in: info@guest-glow.com
3. Password: Dominion#2025
4. Dashboard should show DATA!

---

## If you see errors about "already exists":

That's GOOD! It means some policies were already there. Ignore those errors.

## Still shows zeros?

Run this diagnostic SQL in Supabase:

```sql
-- Check your profile
SELECT id, email, user_type, agency_id FROM profiles WHERE email = 'info@guest-glow.com';

-- Check if data exists
SELECT
  (SELECT COUNT(*) FROM staff) as staff_count,
  (SELECT COUNT(*) FROM shifts) as shifts_count,
  (SELECT COUNT(*) FROM agencies) as agencies_count;

-- Check policies were created
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
```

Share the results and I'll help further!
