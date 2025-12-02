# MODULE E: SUPER ADMIN IMPROVEMENTS - Multi-Admin Support & Security

**Priority:** POST-MVP (Operational Hygiene)
**Estimated Time:** 6-8 hours
**Complexity:** LOW-MEDIUM
**Dependencies:** None

---

## BUSINESS JUSTIFICATION

### Current Super Admin System Issues

1. **Hardcoded Email Risk**
   - Super admin determined by: `profiles.email = 'g.basera@yahoo.com'`
   - If email changes or is compromised, platform lockout
   - No fallback mechanism

2. **Single Point of Failure**
   - Only one person can be super admin
   - No delegation or redundancy
   - High operational risk

3. **No Audit Trail**
   - Super admin actions not logged
   - Can't track who did what
   - Compliance risk

### Target State

- ✅ Multiple super admins supported
- ✅ Super admin status stored in database (not hardcoded)
- ✅ Super admin audit log for critical actions
- ✅ Emergency access procedures
- ✅ Role delegation (temporary admin access)

---

## DATABASE SCHEMA

### **Table: `platform_admins`**

```sql
-- Platform administrators (replaces hardcoded email check)
CREATE TABLE IF NOT EXISTS platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- Admin level
  admin_level TEXT NOT NULL DEFAULT 'super_admin',
  -- Options: super_admin, platform_support, read_only_admin

  -- Permissions
  permissions JSONB DEFAULT '{
    "manage_agencies": true,
    "manage_admins": true,
    "access_financial_data": true,
    "modify_rls_policies": false,
    "access_audit_logs": true
  }'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit Trail
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_reason TEXT,

  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES profiles(id),
  revoked_reason TEXT,

  -- Emergency Access
  is_emergency_admin BOOLEAN DEFAULT FALSE,  -- Temporary elevated access
  emergency_expires_at TIMESTAMPTZ,

  -- Notes
  notes TEXT
);

CREATE INDEX idx_platform_admins_profile ON platform_admins(profile_id);
CREATE INDEX idx_platform_admins_is_active ON platform_admins(is_active) WHERE is_active = TRUE;

-- RLS
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Only existing super admins can view/manage platform_admins
CREATE POLICY "Super admins can manage platform admins"
  ON platform_admins
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins pa
      WHERE pa.profile_id = auth.uid()
        AND pa.is_active = TRUE
        AND pa.admin_level = 'super_admin'
    )
  );

-- Initial migration: Add g.basera@yahoo.com as first super admin
INSERT INTO platform_admins (profile_id, admin_level, is_active, granted_reason)
SELECT
  p.id,
  'super_admin',
  TRUE,
  'Initial platform admin - migrated from hardcoded check'
FROM profiles p
WHERE p.email = 'g.basera@yahoo.com'
ON CONFLICT (profile_id) DO NOTHING;
```

### **Table: `super_admin_audit_log`**

```sql
-- Audit log for super admin actions
CREATE TABLE IF NOT EXISTS super_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who
  admin_id UUID NOT NULL REFERENCES profiles(id),

  -- What
  action_type TEXT NOT NULL,  -- 'create_agency', 'assign_admin', 'modify_rls', etc.
  entity_type TEXT,  -- 'agency', 'profile', 'invoice', etc.
  entity_id UUID,

  -- Details
  action_details JSONB,  -- Full details of what changed
  old_value JSONB,
  new_value JSONB,

  -- Context
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_super_admin_audit_admin ON super_admin_audit_log(admin_id);
CREATE INDEX idx_super_admin_audit_timestamp ON super_admin_audit_log(performed_at DESC);
CREATE INDEX idx_super_admin_audit_action ON super_admin_audit_log(action_type);

-- RLS
ALTER TABLE super_admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view audit logs"
  ON super_admin_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins pa
      WHERE pa.profile_id = auth.uid()
        AND pa.is_active = TRUE
    )
  );
```

---

## UPDATED `is_super_admin()` FUNCTION

Replace hardcoded email check with database lookup:

```sql
-- DROP old function
DROP FUNCTION IF EXISTS is_super_admin();

-- NEW: Check platform_admins table instead of hardcoded email
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM platform_admins pa
    WHERE pa.profile_id = auth.uid()
      AND pa.is_active = TRUE
      AND pa.admin_level = 'super_admin'
  ) INTO is_admin;

  RETURN COALESCE(is_admin, FALSE);
END;
$$;

-- Update all RLS policies that use is_super_admin()
-- (They'll automatically use the new function)
```

---

## ADMIN MANAGEMENT UI

### **File: `src/pages/SuperAdminManagement.jsx`**

```jsx
export default function SuperAdminManagement() {
  const [platformAdmins, setPlatformAdmins] = useState([]);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);

  useEffect(() => {
    fetchPlatformAdmins();
  }, []);

  const fetchPlatformAdmins = async () => {
    const { data, error } = await supabase
      .from('platform_admins')
      .select('*, profiles(email, full_name)')
      .order('granted_at', { ascending: false });

    if (!error) {
      setPlatformAdmins(data);
    }
  };

  const grantSuperAdmin = async (profileId, reason) => {
    const { error } = await supabase
      .from('platform_admins')
      .insert({
        profile_id: profileId,
        admin_level: 'super_admin',
        granted_by: currentUser.id,
        granted_reason: reason,
        is_active: true
      });

    if (!error) {
      toast.success('Super admin access granted');
      fetchPlatformAdmins();

      // Log action
      await logSuperAdminAction({
        action_type: 'grant_super_admin',
        entity_type: 'profile',
        entity_id: profileId,
        action_details: { reason }
      });
    }
  };

  const revokeSuperAdmin = async (adminId, reason) => {
    const { error } = await supabase
      .from('platform_admins')
      .update({
        is_active: false,
        revoked_at: new Date(),
        revoked_by: currentUser.id,
        revoked_reason: reason
      })
      .eq('id', adminId);

    if (!error) {
      toast.success('Super admin access revoked');
      fetchPlatformAdmins();

      // Log action
      await logSuperAdminAction({
        action_type: 'revoke_super_admin',
        entity_type: 'platform_admin',
        entity_id: adminId,
        action_details: { reason }
      });
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>🔐 Platform Administrators</CardTitle>
          <Button onClick={() => setShowAddAdminModal(true)}>
            Add Super Admin
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Level</TableHeader>
                <TableHeader>Granted</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {platformAdmins.map(admin => (
                <TableRow key={admin.id}>
                  <TableCell>{admin.profiles.full_name}</TableCell>
                  <TableCell>{admin.profiles.email}</TableCell>
                  <TableCell>
                    <Badge variant={admin.admin_level === 'super_admin' ? 'default' : 'secondary'}>
                      {admin.admin_level}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(admin.granted_at, 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    {admin.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Revoked</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {admin.is_active && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const reason = prompt('Reason for revoking admin access:');
                          if (reason) {
                            revokeSuperAdmin(admin.id, reason);
                          }
                        }}
                      >
                        Revoke Access
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showAddAdminModal && (
        <AddSuperAdminModal
          onGrant={grantSuperAdmin}
          onClose={() => setShowAddAdminModal(false)}
        />
      )}
    </div>
  );
}
```

---

## EMERGENCY ACCESS PROCEDURES

### **Scenario: Super Admin Locked Out**

**Problem:** g.basera@yahoo.com email compromised or inaccessible

**Solution 1: Database Direct Access**
```sql
-- Super admin manually adds new admin via database
INSERT INTO platform_admins (profile_id, admin_level, is_active, granted_reason)
SELECT
  p.id,
  'super_admin',
  TRUE,
  'Emergency access - original admin locked out'
FROM profiles p
WHERE p.email = 'new-emergency-admin@example.com';
```

**Solution 2: Emergency Admin Token**
- Pre-generate emergency admin token
- Store securely offline
- Can be used to grant temporary admin access

---

## TESTING CHECKLIST

- [ ] Add second super admin via UI
- [ ] Verify both admins can access SuperAdminAgencyManagement page
- [ ] Revoke admin access
- [ ] Verify revoked admin loses super admin permissions
- [ ] Check audit log captures grant/revoke actions
- [ ] Test is_super_admin() function with new admins

---

**END OF MODULE E SPECIFICATION**

**Benefit:** Reduces single-point-of-failure risk and improves operational security.
