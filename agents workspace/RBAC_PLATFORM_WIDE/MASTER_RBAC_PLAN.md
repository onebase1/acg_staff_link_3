# MASTER RBAC PLAN - Platform-Wide Role-Based Access Control

**Date:** 2025-12-02
**Priority:** HIGH (Pre-MVP / MVP Phase)
**Business Driver:** Dominion Agency & others demand financial data protection
**Inspiration:** Module 1 Client Portal RBAC (4 granular roles)

---

## EXECUTIVE SUMMARY

### The Problem

**Current State:**
- ✅ Basic role system exists: `super_admin`, `agency_admin`, `manager`, `staff_member`, `client_user`
- ❌ **No granular permissions** - All agency admins see ALL financial data
- ❌ **No staff role differentiation** - Drivers, nurses, coordinators all see same portal
- ❌ **Financial data exposed** - Charge rates, margins, profits visible to wrong people

**Business Impact:**
> "Dominion agency owner is not happy that admin can see certain financial information about charge rates, generating invoices margins profits all dashboards etc"

**What Module 1 Proved:**
- Client portal RBAC works brilliantly with 4 roles (OPERATIONS_MANAGER, FINANCE_MANAGER, FACILITY_COORDINATOR, VIEW_ONLY_CONTACT)
- Permission matrix enforces granular access
- Each contact sees ONLY what they need

### The Solution

**Apply Module 1's RBAC pattern to:**
1. **Agency Roles** (6 new roles replacing single `agency_admin`)
2. **Staff Portal Roles** (4 new roles for different job functions)
3. **Financial Data Protection** (field-level RLS + masking)
4. **Backend Permission Middleware** (not just frontend checks)

---

## PROPOSED ROLE HIERARCHY

### **AGENCY ROLES** (New `agency_contacts` table)

Replaces single `agency_admin` with granular roles:

| Role | Access Level | Financial Data | Use Case |
|------|-------------|----------------|----------|
| **AGENCY_OWNER** | Full platform access | All financial data | Agency principal/director |
| **OPERATIONS_DIRECTOR** | Ops + limited finance | No margins/profits | COO, manages shifts/staff |
| **FINANCE_MANAGER** | Finance only | All financial data | CFO, accountant |
| **HR_COORDINATOR** | Staff management | Staff pay rates only | HR manager, recruitment |
| **SHIFT_COORDINATOR** | Shift ops only | No financial data | Scheduler, coordinator |
| **REPORTING_ANALYST** | Read-only dashboards | Anonymized financials | Analytics, reporting |

### **STAFF PORTAL ROLES** (New `staff_portal_roles` table)

Different staff types see different features:

| Role | Portal Features | Use Case |
|------|----------------|----------|
| **FIELD_WORKER** | Standard portal (shifts, timesheets, compliance) | Nurses, HCAs, care workers |
| **DRIVER** | Routes, pickups, drop-offs, mileage tracking | Transport staff |
| **COORDINATOR** | View team schedules, submit group timesheets | Senior staff, team leads |
| **COMPLIANCE_OFFICER** | Training records, document verification | Compliance team |

### **CLIENT PORTAL ROLES** (Already exists - Module 1)

| Role | Access Level |
|------|-------------|
| **OPERATIONS_MANAGER** | Full client portal access |
| **FINANCE_MANAGER** | Billing & payments only |
| **FACILITY_COORDINATOR** | Assigned shifts only |
| **VIEW_ONLY_CONTACT** | Read-only access |

---

## FINANCIAL DATA PROTECTION MATRIX

### **Data Classification**

| Data Type | Sensitivity | Current Exposure | Protection Needed |
|-----------|-------------|------------------|-------------------|
| **Charge Rate** (client billed) | HIGH | ❌ All admins | ✅ AGENCY_OWNER, FINANCE_MANAGER only |
| **Pay Rate** (staff paid) | MEDIUM | ❌ All admins | ✅ AGENCY_OWNER, FINANCE_MANAGER, HR_COORDINATOR |
| **Margin/Profit** | CRITICAL | ❌ All admins, visible in invoices | ✅ AGENCY_OWNER, FINANCE_MANAGER only |
| **Invoice Totals** | MEDIUM | ❌ All admins | ✅ AGENCY_OWNER, FINANCE_MANAGER, OPERATIONS_DIRECTOR |
| **Staff Bank Details** | CRITICAL | ❌ Plaintext storage | ✅ Encrypted, AGENCY_OWNER, HR_COORDINATOR |
| **Client Payment Status** | MEDIUM | ❌ All admins | ✅ AGENCY_OWNER, FINANCE_MANAGER only |

### **Permission Matrix - Agency Roles**

| Resource | OWNER | OPS_DIRECTOR | FINANCE_MGR | HR_COORD | SHIFT_COORD | ANALYST |
|----------|-------|--------------|-------------|----------|-------------|---------|
| **View Shifts** | ✅ All | ✅ All | ✅ Own agency | ✅ Own agency | ✅ Own agency | ✅ Summary |
| **Create Shifts** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **View Charge Rates** | ✅ | ❌ Hidden | ✅ | ❌ Hidden | ❌ Hidden | ❌ Hidden |
| **View Pay Rates** | ✅ | ❌ Hidden | ✅ | ✅ | ❌ Hidden | ❌ Hidden |
| **View Margins/Profit** | ✅ | ❌ Hidden | ✅ | ❌ Hidden | ❌ Hidden | ❌ Anonymized |
| **Generate Invoices** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Invoice Details** | ✅ Full | ✅ No rates | ✅ Full | ❌ | ❌ | ✅ Summary |
| **Pay Staff (Payslips)** | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Approve Timesheets** | ✅ | ✅ | ✅ Verify only | ❌ | ✅ | ❌ |
| **Manage Staff** | ✅ | ✅ | ❌ | ✅ | ❌ View only | ❌ View only |
| **View Compliance** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Access CFO Dashboard** | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ Redacted |
| **Platform Settings** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### **Permission Matrix - Staff Portal Roles**

| Feature | FIELD_WORKER | DRIVER | COORDINATOR | COMPLIANCE_OFFICER |
|---------|--------------|--------|-------------|-------------------|
| **View My Shifts** | ✅ | ✅ | ✅ + Team shifts | ✅ |
| **Clock In/Out** | ✅ GPS | ✅ GPS + Mileage | ✅ GPS | ❌ |
| **Submit Timesheets** | ✅ Own | ✅ Own | ✅ Own + Team | ❌ |
| **View Team Schedules** | ❌ | ❌ | ✅ | ❌ |
| **Route Planning** | ❌ | ✅ Pickups/Dropoffs | ❌ | ❌ |
| **Mileage Tracking** | ❌ | ✅ | ❌ | ❌ |
| **Upload Compliance Docs** | ✅ Own | ✅ Own | ✅ Own | ✅ All staff |
| **Verify Compliance** | ❌ | ❌ | ❌ | ✅ |
| **View Pay Rate** | ✅ Own only | ✅ Own only | ✅ Own only | ❌ |
| **View Availability** | ✅ Own | ✅ Own | ✅ Team view | ❌ |

---

## MODULE BREAKDOWN

### **Module A: Agency RBAC (High Priority - Pre-MVP)**

**Estimated Time:** 14-18 hours
**Complexity:** HIGH
**Business Justification:** Dominion won't go live without financial data protection

**Deliverables:**
1. New `agency_contacts` table (similar to `client_contacts`)
2. 6 agency roles with permission matrix
3. Field-level RLS policies for financial data
4. Backend permission middleware (`middleware/agencyAuth.js`)
5. UI role badges and indicators
6. Migration strategy (backfill existing `agency_admin` users)
7. Admin UI for role assignment

**Success Criteria:**
- ✅ OPERATIONS_DIRECTOR cannot see charge rates or margins
- ✅ SHIFT_COORDINATOR cannot access financial dashboards
- ✅ HR_COORDINATOR sees pay rates but not client billing
- ✅ Backend API returns 403 for unauthorized financial queries

---

### **Module B: Staff Portal RBAC (Post-MVP - Strategic)**

**Estimated Time:** 10-14 hours
**Complexity:** MEDIUM
**Business Justification:** Future-proofing for driver roles, coordinators

**Deliverables:**
1. New `staff_portal_roles` table
2. 4 staff portal roles with permission matrix
3. Driver-specific portal features (routes, mileage)
4. Coordinator team view features
5. Conditional UI rendering based on role
6. Staff role assignment UI (admin can assign)

**Success Criteria:**
- ✅ Drivers see route planning, not standard shift list
- ✅ Coordinators see team schedules
- ✅ Field workers see standard portal
- ✅ Compliance officers see verification dashboard

---

### **Module C: Financial Data Hardening (High Priority - Pre-MVP)**

**Estimated Time:** 12-16 hours
**Complexity:** HIGH
**Business Justification:** CRITICAL security gap, regulatory risk

**Deliverables:**
1. Field-level encryption for `bank_details`, `ni_number`
2. RLS policies for `charge_rate`, `pay_rate`, margin calculations
3. Financial audit trail (`financial_changes_log` table)
4. Redacted field responses (return `***REDACTED***` for unauthorized users)
5. Backend validation for all financial mutations
6. Migration to encrypt existing sensitive data

**Success Criteria:**
- ✅ Bank details encrypted at rest
- ✅ Unauthorized users get `null` or `***REDACTED***` for charge_rate
- ✅ All financial changes logged (who, what, when, old value, new value)
- ✅ RLS prevents cross-agency financial data leaks

---

### **Module D: Backend Permission Enforcement (Critical - Pre-MVP)**

**Estimated Time:** 8-12 hours
**Complexity:** MEDIUM-HIGH
**Business Justification:** Frontend checks can be bypassed - must validate server-side

**Deliverables:**
1. Express middleware: `requireAgencyRole(['AGENCY_OWNER', 'FINANCE_MANAGER'])`
2. Supabase Edge Function guards (before returning data)
3. RLS policy enforcement verification
4. API endpoint permission audit (`API_PERMISSION_MATRIX.md`)
5. Automated permission test suite
6. Error handling (403 Forbidden with clear messages)

**Success Criteria:**
- ✅ Direct API calls fail if user lacks permission (not just UI hide)
- ✅ Test suite validates all protected endpoints
- ✅ Clear audit trail shows permission denials

---

### **Module E: Super Admin Improvements (Post-MVP - Operational)**

**Estimated Time:** 6-8 hours
**Complexity:** LOW-MEDIUM
**Business Justification:** Current super admin system is fragile (hardcoded email)

**Deliverables:**
1. New `platform_admins` table (replaces hardcoded email check)
2. Multiple super admins support
3. Super admin role assignment UI
4. Super admin audit log (critical actions)
5. Emergency access procedures (password reset, account recovery)

**Success Criteria:**
- ✅ Multiple people can be super admin
- ✅ Super admin status stored in database, not hardcoded
- ✅ Audit log tracks super admin actions

---

## IMPLEMENTATION PRIORITY

### **TIER 1: CRITICAL (Build Before MVP Launch)**

**Must-have for Dominion and production readiness:**

```
Week 1-2: Module C - Financial Data Hardening (12-16 hrs)
├─ Encrypt bank details, ni_number
├─ Add RLS policies for charge_rate, pay_rate
├─ Create financial audit trail
└─ Test cross-agency data isolation

Week 2-3: Module A - Agency RBAC (14-18 hrs)
├─ Create agency_contacts table
├─ Implement 6 agency roles
├─ Build permission middleware
├─ Migrate existing agency_admin users
└─ Add role assignment UI

Week 3-4: Module D - Backend Permission Enforcement (8-12 hrs)
├─ Add API middleware guards
├─ Audit all endpoints
├─ Write permission test suite
└─ Deploy with monitoring

TOTAL TIER 1: 34-46 hours (4-6 weeks @ 8-10 hrs/week)
```

### **TIER 2: STRATEGIC (Post-MVP - Growth Features)**

**Nice-to-have for scaling and advanced features:**

```
Month 2: Module B - Staff Portal RBAC (10-14 hrs)
├─ Create staff_portal_roles table
├─ Build driver-specific features
├─ Build coordinator team view
└─ Test with real drivers

Month 3: Module E - Super Admin Improvements (6-8 hrs)
├─ Create platform_admins table
├─ Remove hardcoded email checks
├─ Build admin management UI
└─ Document emergency procedures

TOTAL TIER 2: 16-22 hours (2-3 weeks)
```

---

## DATABASE SCHEMA CHANGES

### **New Tables**

#### **`agency_contacts`** (Similar to `client_contacts`)
```sql
CREATE TABLE agency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- RBAC role
  role TEXT NOT NULL DEFAULT 'SHIFT_COORDINATOR',
  -- Options: AGENCY_OWNER, OPERATIONS_DIRECTOR, FINANCE_MANAGER,
  --          HR_COORDINATOR, SHIFT_COORDINATOR, REPORTING_ANALYST

  -- Contact details
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  job_title TEXT,

  -- Permissions metadata
  custom_permissions JSONB DEFAULT '{}'::jsonb,  -- Override matrix

  -- Status
  is_primary_contact BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  CONSTRAINT unique_profile_per_agency UNIQUE (agency_id, profile_id),
  CONSTRAINT valid_agency_role CHECK (role IN (
    'AGENCY_OWNER', 'OPERATIONS_DIRECTOR', 'FINANCE_MANAGER',
    'HR_COORDINATOR', 'SHIFT_COORDINATOR', 'REPORTING_ANALYST'
  ))
);
```

#### **`staff_portal_roles`**
```sql
CREATE TABLE staff_portal_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Portal role
  portal_role TEXT NOT NULL DEFAULT 'FIELD_WORKER',
  -- Options: FIELD_WORKER, DRIVER, COORDINATOR, COMPLIANCE_OFFICER

  -- Role-specific settings
  role_settings JSONB DEFAULT '{}'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_staff_portal_role UNIQUE (staff_id, profile_id),
  CONSTRAINT valid_portal_role CHECK (portal_role IN (
    'FIELD_WORKER', 'DRIVER', 'COORDINATOR', 'COMPLIANCE_OFFICER'
  ))
);
```

#### **`financial_changes_log`** (Audit Trail)
```sql
CREATE TABLE financial_changes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What changed
  entity_type TEXT NOT NULL,  -- 'shift', 'invoice', 'timesheet', 'staff'
  entity_id UUID NOT NULL,
  field_name TEXT NOT NULL,   -- 'charge_rate', 'pay_rate', 'margin', etc.

  -- Change details
  old_value JSONB,
  new_value JSONB,

  -- Who changed it
  changed_by UUID NOT NULL REFERENCES profiles(id),
  changed_by_role TEXT,  -- Role at time of change

  -- Context
  reason TEXT,
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  changed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for queries
  CONSTRAINT valid_entity_type CHECK (entity_type IN (
    'shift', 'invoice', 'timesheet', 'staff', 'client', 'agency'
  ))
);

CREATE INDEX idx_financial_log_entity ON financial_changes_log(entity_type, entity_id);
CREATE INDEX idx_financial_log_user ON financial_changes_log(changed_by);
CREATE INDEX idx_financial_log_timestamp ON financial_changes_log(changed_at DESC);
```

#### **`platform_admins`** (Replaces Hardcoded Super Admin)
```sql
CREATE TABLE platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- Admin level
  admin_level TEXT NOT NULL DEFAULT 'super_admin',
  -- Options: super_admin, platform_support, read_only_admin

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES profiles(id),

  -- Notes
  notes TEXT
);
```

---

## MIGRATION STRATEGY

### **Backfill Existing Users**

#### **Step 1: Agency Admins → Agency Contacts**
```sql
-- Default all existing agency_admin to AGENCY_OWNER
INSERT INTO agency_contacts (
  agency_id, profile_id, role, first_name, last_name, email,
  job_title, is_primary_contact
)
SELECT
  p.agency_id,
  p.id,
  'AGENCY_OWNER' AS role,  -- Safe default: full access
  SPLIT_PART(p.full_name, ' ', 1),
  COALESCE(NULLIF(SPLIT_PART(p.full_name, ' ', 2), ''), 'Admin'),
  p.email,
  'Agency Owner',
  TRUE  -- First admin becomes primary contact
FROM profiles p
WHERE p.user_type IN ('agency_admin', 'manager')
  AND p.agency_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM agency_contacts ac WHERE ac.profile_id = p.id
  );
```

#### **Step 2: Staff → Staff Portal Roles**
```sql
-- Default all staff to FIELD_WORKER
INSERT INTO staff_portal_roles (
  staff_id, profile_id, portal_role
)
SELECT
  s.id,
  s.user_id,
  'FIELD_WORKER' AS portal_role  -- Safe default
FROM staff s
WHERE s.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM staff_portal_roles spr WHERE spr.staff_id = s.id
  );
```

#### **Step 3: Create Initial Platform Admin**
```sql
-- Add g.basera@yahoo.com as platform admin
INSERT INTO platform_admins (profile_id, admin_level, is_active, notes)
SELECT
  p.id,
  'super_admin',
  TRUE,
  'Initial platform admin - migrated from hardcoded check'
FROM profiles p
WHERE p.email = 'g.basera@yahoo.com'
ON CONFLICT (profile_id) DO NOTHING;
```

---

## TESTING STRATEGY

### **Test Scenarios for Module A (Agency RBAC)**

1. **OPERATIONS_DIRECTOR Cannot See Charge Rates**
   - Log in as OPERATIONS_DIRECTOR
   - Navigate to shift detail page
   - ✅ Charge rate field shows `***REDACTED***` or is hidden
   - ✅ API response excludes charge_rate field

2. **HR_COORDINATOR Can See Pay Rates But Not Margins**
   - Log in as HR_COORDINATOR
   - View staff pay rate: ✅ Visible
   - View invoice margin: ❌ Hidden or redacted

3. **SHIFT_COORDINATOR Cannot Access CFO Dashboard**
   - Log in as SHIFT_COORDINATOR
   - Try to navigate to `/CFODashboard`
   - ✅ Blocked with "Permission Denied" message
   - ✅ API returns 403 Forbidden

4. **Cross-Agency Data Isolation**
   - Log in as Agency A's FINANCE_MANAGER
   - Try to query Agency B's invoices via API
   - ✅ RLS blocks query (returns empty or 403)

### **Test Scenarios for Module C (Financial Hardening)**

1. **Bank Details Encrypted**
   - Query database directly: `SELECT bank_details FROM staff WHERE id = '...'`
   - ✅ Returns encrypted string, not plaintext

2. **Financial Audit Trail**
   - Update a shift charge_rate
   - ✅ New row in `financial_changes_log` with old/new values
   - ✅ Log shows who changed it and when

3. **Unauthorized Financial Query**
   - User without FINANCE_MANAGER role queries invoice details
   - ✅ Backend returns redacted response or 403
   - ✅ RLS prevents data leak

---

## UI/UX CHANGES

### **Agency Role Badge (Top Navigation)**
```jsx
// Show user's agency role prominently
<Badge variant="outline" className="border-purple-500 text-purple-700">
  {agencyContact?.role === 'AGENCY_OWNER' && '👑 Agency Owner'}
  {agencyContact?.role === 'FINANCE_MANAGER' && '💰 Finance Manager'}
  {agencyContact?.role === 'OPERATIONS_DIRECTOR' && '⚙️ Operations Director'}
  {agencyContact?.role === 'SHIFT_COORDINATOR' && '📅 Shift Coordinator'}
</Badge>
```

### **Financial Data Masking (Invoice/Shift Pages)**
```jsx
// Conditional rendering based on permission
{hasPermission(userRole, 'invoices', 'view_charge_rate') ? (
  <div>Charge Rate: £{shift.charge_rate}/hr</div>
) : (
  <div className="text-gray-400">Charge Rate: ***REDACTED***</div>
)}

{hasPermission(userRole, 'invoices', 'view_margin') ? (
  <div>Margin: {calculateMargin(shift)}%</div>
) : null /* Hide entirely */
}
```

### **Staff Portal Role Selector (Admin Settings)**
```jsx
// Admin can assign staff portal roles
<Select value={staffPortalRole} onValueChange={setStaffPortalRole}>
  <SelectItem value="FIELD_WORKER">Field Worker (Standard Portal)</SelectItem>
  <SelectItem value="DRIVER">Driver (Routes & Mileage)</SelectItem>
  <SelectItem value="COORDINATOR">Coordinator (Team View)</SelectItem>
  <SelectItem value="COMPLIANCE_OFFICER">Compliance Officer</SelectItem>
</Select>
```

---

## ROLLOUT PLAN

### **Phase 1: Silent Deployment (Week 1)**
- ✅ Deploy tables with feature flags OFF
- ✅ Backfill existing users with safe defaults (AGENCY_OWNER, FIELD_WORKER)
- ✅ No user-facing changes yet
- ✅ Monitor database performance

### **Phase 2: Backend Enforcement (Week 2-3)**
- ✅ Enable RLS policies for financial data
- ✅ Add backend permission middleware
- ✅ Test with staging environment
- ✅ Audit API responses

### **Phase 3: UI Updates (Week 3-4)**
- ✅ Add role badges to navigation
- ✅ Implement field masking for financial data
- ✅ Update dashboards to respect permissions
- ✅ Test with Dominion agency (beta testers)

### **Phase 4: Admin Tools (Week 4-5)**
- ✅ Build role assignment UI (super admin assigns agency roles)
- ✅ Build self-service role request (users request role change)
- ✅ Documentation and training materials

### **Phase 5: Go Live (Week 5-6)**
- ✅ Enable for all agencies with granular default roles
- ✅ Send announcement email explaining new roles
- ✅ Monitor support requests
- ✅ Iterate based on feedback

---

## SUCCESS METRICS

### **Security Metrics**
- ✅ 0 cross-agency data leaks (monitor RLS policy denials)
- ✅ 100% of financial fields encrypted or protected by RLS
- ✅ Financial audit log captures 100% of changes

### **Adoption Metrics**
- ✅ 90%+ of agencies assign granular roles within 30 days
- ✅ <5% support requests related to permission confusion
- ✅ Dominion agency confirms satisfaction with financial data protection

### **Performance Metrics**
- ✅ Permission checks add <50ms to API response time
- ✅ RLS queries execute in <200ms p95
- ✅ Database size increase <10% from new audit tables

---

## DEPENDENCIES & RISKS

### **Dependencies**
1. Module 1 Client Portal RBAC (already built - can copy pattern)
2. Supabase RLS policies (already enabled)
3. Existing `profiles`, `agencies`, `staff` tables

### **Risks & Mitigations**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Existing admins lose access to critical features | HIGH | MEDIUM | Default to AGENCY_OWNER role (full access) during migration |
| Performance degradation from RLS checks | MEDIUM | MEDIUM | Index optimization, RLS query caching |
| Staff portal role assignment too complex | LOW | MEDIUM | Simple defaults (99% are FIELD_WORKER), admin can override |
| Agencies resist role granularity | MEDIUM | LOW | Make it optional (AGENCY_OWNER bypasses all restrictions) |
| Migration breaks production | HIGH | LOW | Staged rollout, feature flags, rollback plan |

---

## OPEN QUESTIONS (For User Validation)

1. **Agency Roles:**
   - Are 6 roles enough or too many? (Suggest: Start with 4 core roles)
   - Should we combine OPERATIONS_DIRECTOR + SHIFT_COORDINATOR?
   - Do we need separate SALES_MANAGER role?

2. **Staff Portal Roles:**
   - When do you expect to onboard drivers? (Prioritize Module B accordingly)
   - What other staff types need custom portals? (Night shift supervisors? Remote trainers?)

3. **Financial Data:**
   - What margin/profit threshold triggers "highly sensitive"? (Hide if margin >20%?)
   - Should invoices show REDACTED totals or hide entirely for unauthorized users?

4. **Migration:**
   - Can we assign all existing admins to AGENCY_OWNER temporarily? (Safest but least granular)
   - Or should we do manual role assignment for Dominion first (pilot)?

---

## NEXT STEPS

**Immediate Actions (This Week):**
1. ✅ User reviews this plan and provides feedback
2. ✅ User prioritizes modules (recommend: Modules C + A + D for MVP)
3. ✅ Create detailed implementation specs for each module (separate .md files)
4. ✅ Assign to AI agent for autonomous build

**Week 1-2 (Tier 1 Modules):**
1. Agent builds Module C (Financial Hardening)
2. Agent builds Module A (Agency RBAC)
3. Agent builds Module D (Backend Enforcement)

**Week 3-4 (Testing & Rollout):**
1. QA tests all permission scenarios
2. Dominion agency pilot test
3. Production deployment with monitoring

---

**END OF MASTER RBAC PLAN**

**Next Files to Create:**
- `MODULE_A_AGENCY_RBAC.md` (Detailed spec)
- `MODULE_B_STAFF_PORTAL_RBAC.md` (Detailed spec)
- `MODULE_C_FINANCIAL_HARDENING.md` (Detailed spec)
- `MODULE_D_BACKEND_ENFORCEMENT.md` (Detailed spec)
- `MODULE_E_SUPER_ADMIN_IMPROVEMENTS.md` (Detailed spec)
