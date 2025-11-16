-- Quick Fix: Enable RLS for Clients Table
-- This allows bulk import to work immediately

-- Helper functions (if not already exist)
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

CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT agency_id FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_agency_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_agency_admin() TO authenticated;

-- Enable RLS on clients table
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "Users can read clients in their agency" ON clients;
DROP POLICY IF EXISTS "Agency admins can insert clients" ON clients;
DROP POLICY IF EXISTS "Agency admins can update clients" ON clients;
DROP POLICY IF EXISTS "Agency admins can delete clients" ON clients;

-- CREATE POLICIES FOR CLIENTS
CREATE POLICY "Users can read clients in their agency"
ON clients FOR SELECT
USING (
  is_super_admin()
  OR agency_id = get_user_agency_id()
  OR id = (SELECT client_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Agency admins can insert clients"
ON clients FOR INSERT
WITH CHECK (
  is_super_admin()
  OR (is_agency_admin() AND agency_id = get_user_agency_id())
);

CREATE POLICY "Agency admins can update clients"
ON clients FOR UPDATE
USING (
  is_super_admin()
  OR (is_agency_admin() AND agency_id = get_user_agency_id())
);

CREATE POLICY "Agency admins can delete clients"
ON clients FOR DELETE
USING (
  is_super_admin()
  OR (is_agency_admin() AND agency_id = get_user_agency_id())
);

-- Verify
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename = 'clients'
ORDER BY policyname;
