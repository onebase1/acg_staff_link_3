# MODULE A: AGENCY RBAC - Granular Role-Based Access Control for Agency Admins

**Priority:** CRITICAL (Pre-MVP)
**Estimated Time:** 14-18 hours
**Complexity:** HIGH
**Dependencies:** Module C (Financial Hardening) should be built first

---

## BUSINESS JUSTIFICATION

### The Problem
> "Dominion agency owner is not happy that admin can see certain financial information about charge rates, generating invoices margins profits all dashboards etc"

**Current State:**
- All users with `user_type = 'agency_admin'` see EVERYTHING
- No distinction between agency owner, finance manager, shift coordinator
- Financial data (charge_rate, margins, profits) exposed to operations staff
- Security risk: One compromised admin account = full agency data breach

**Target State:**
- 6 granular agency roles with specific permissions
- Financial data visible only to AGENCY_OWNER and FINANCE_MANAGER
- Operations staff see shift data but NOT financial margins
- Field-level access control enforced by database RLS + backend middleware

---

## ROLE DEFINITIONS

### 1. AGENCY_OWNER
**Persona:** Agency principal, director, founder
**Access:** Full unrestricted access to everything
**Financial Data:** All (charge rates, pay rates, margins, profits, bank details)
**Count per Agency:** Typically 1-2

**Permissions:**
- ✅ View/edit all shifts
- ✅ View/edit all financial data
- ✅ Generate invoices and payslips
- ✅ Access CFO Dashboard (all metrics)
- ✅ Manage agency settings
- ✅ Assign roles to other users
- ✅ View all analytics

---

### 2. OPERATIONS_DIRECTOR
**Persona:** COO, operations manager, senior coordinator
**Access:** Full operations access, LIMITED financial visibility
**Financial Data:** Can see totals but NOT margins/profits or charge rates
**Count per Agency:** 1-3

**Permissions:**
- ✅ View/edit all shifts
- ✅ Approve timesheets
- ✅ Manage staff assignments
- ✅ View operational analytics (fill rates, shift counts)
- ✅ Generate operational reports
- ❌ **Cannot see:** Charge rates (shows ***REDACTED***)
- ❌ **Cannot see:** Margins/profit percentages
- ❌ **Cannot see:** CFO Dashboard financial KPIs
- ❌ **Cannot see:** Staff bank details

**Use Case:**
- Manages day-to-day operations
- Doesn't need to know agency profit margins
- Focuses on service delivery, not finance

---

### 3. FINANCE_MANAGER
**Persona:** CFO, accountant, finance director
**Access:** Full financial access, LIMITED operations visibility
**Financial Data:** All financial data visible
**Count per Agency:** 1-2

**Permissions:**
- ✅ View all invoices (full details, rates, margins)
- ✅ Generate invoices and payslips
- ✅ Access CFO Dashboard (full financial KPIs)
- ✅ View/export financial reports
- ✅ Manage payment processing
- ✅ View charge rates and pay rates
- ✅ See profit margins and analytics
- ✅ View staff bank details (for payroll)
- ❌ **Cannot:** Create or edit shifts
- ❌ **Cannot:** Manage staff assignments
- ❌ **Cannot:** Approve timesheets (can view for billing)

**Use Case:**
- Handles invoicing, payments, financial reporting
- Needs full visibility into rates and margins
- Doesn't manage operations

---

### 4. HR_COORDINATOR
**Persona:** HR manager, recruitment lead, compliance officer
**Access:** Staff management and compliance, LIMITED financial access
**Financial Data:** Can see staff pay rates (for recruitment), NOT client charge rates
**Count per Agency:** 1-2

**Permissions:**
- ✅ Manage staff profiles (onboarding, offboarding)
- ✅ View/upload compliance documents
- ✅ Track training and certifications
- ✅ View staff pay rates (for recruitment offers)
- ✅ View staff bank details (for payroll setup)
- ✅ Access HR analytics (staff turnover, compliance %)
- ❌ **Cannot see:** Charge rates
- ❌ **Cannot see:** Margins/profits
- ❌ **Cannot see:** Client invoices
- ❌ **Cannot:** Create/edit shifts
- ❌ **Cannot:** Generate invoices

**Use Case:**
- Recruits and onboards new staff
- Manages compliance (DBS, training certificates)
- Needs pay rates to make job offers
- Doesn't need client billing info

---

### 5. SHIFT_COORDINATOR
**Persona:** Scheduler, booking coordinator, operations assistant
**Access:** Shift operations only, NO financial data
**Financial Data:** None (sees shift details but NOT rates)
**Count per Agency:** 2-5

**Permissions:**
- ✅ Create/edit shifts
- ✅ Assign staff to shifts
- ✅ View shift calendar and availability
- ✅ Approve timesheets (operational verification)
- ✅ Send shift notifications
- ✅ View basic analytics (fill rate, shift counts)
- ❌ **Cannot see:** Charge rates (hidden)
- ❌ **Cannot see:** Pay rates (hidden)
- ❌ **Cannot see:** Margins/profits
- ❌ **Cannot see:** Invoices or payslips
- ❌ **Cannot:** Access CFO Dashboard
- ❌ **Cannot:** Manage agency settings

**Use Case:**
- Handles day-to-day shift booking and scheduling
- Doesn't need financial info to do their job
- Most common role for junior staff

---

### 6. REPORTING_ANALYST
**Persona:** Data analyst, business intelligence, reporting specialist
**Access:** Read-only dashboards with ANONYMIZED financial data
**Financial Data:** Summary metrics only (no individual rates/margins)
**Count per Agency:** 0-1

**Permissions:**
- ✅ View all analytics dashboards (redacted mode)
- ✅ Export reports (anonymized data)
- ✅ View operational metrics (fill rates, shift counts, staff hours)
- ✅ See aggregated financial trends (no individual rates)
- ❌ **Cannot see:** Individual charge rates, pay rates
- ❌ **Cannot see:** Specific margins per shift/invoice
- ❌ **Cannot see:** Staff bank details
- ❌ **Cannot:** Edit anything (fully read-only)
- ❌ **Cannot:** Access raw financial data

**Use Case:**
- Creates reports for leadership team
- Analyzes trends and patterns
- Doesn't need granular financial access
- (Optional role - may not be used by all agencies)

---

## DATABASE SCHEMA

### **New Table: `agency_contacts`**

```sql
-- Create agency_contacts table
CREATE TABLE IF NOT EXISTS agency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- RBAC Role
  role TEXT NOT NULL DEFAULT 'SHIFT_COORDINATOR',
  -- Valid values: AGENCY_OWNER, OPERATIONS_DIRECTOR, FINANCE_MANAGER,
  --               HR_COORDINATOR, SHIFT_COORDINATOR, REPORTING_ANALYST

  -- Contact Information (denormalized for performance)
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  job_title TEXT,
  department TEXT,

  -- Custom Permissions Override (JSONB for flexibility)
  custom_permissions JSONB DEFAULT '{}'::jsonb,
  -- Example: {"can_generate_invoices": true, "can_view_charge_rates": false}
  -- Overrides default role permissions if needed

  -- Notification Preferences
  notification_preferences JSONB DEFAULT '{
    "shift_created": true,
    "timesheet_pending": true,
    "invoice_generated": true,
    "payment_received": true,
    "low_staff_alert": true,
    "compliance_expiry": true
  }'::jsonb,

  -- Status
  is_primary_contact BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID REFERENCES profiles(id),

  -- Constraints
  CONSTRAINT unique_profile_per_agency UNIQUE (agency_id, profile_id),
  CONSTRAINT valid_agency_role CHECK (role IN (
    'AGENCY_OWNER',
    'OPERATIONS_DIRECTOR',
    'FINANCE_MANAGER',
    'HR_COORDINATOR',
    'SHIFT_COORDINATOR',
    'REPORTING_ANALYST'
  ))
);

-- Indexes for performance
CREATE INDEX idx_agency_contacts_agency_id ON agency_contacts(agency_id);
CREATE INDEX idx_agency_contacts_profile_id ON agency_contacts(profile_id);
CREATE INDEX idx_agency_contacts_role ON agency_contacts(role);
CREATE INDEX idx_agency_contacts_is_active ON agency_contacts(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_agency_contacts_email ON agency_contacts(email) WHERE email IS NOT NULL;

-- Row Level Security (RLS)
ALTER TABLE agency_contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view contacts for their own agency
CREATE POLICY "Users can view their agency contacts"
  ON agency_contacts
  FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id
      FROM profiles
      WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type = 'super_admin'
    )
  );

-- Policy: Users can update their own contact record (notification prefs)
CREATE POLICY "Users can update their own contact"
  ON agency_contacts
  FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Policy: AGENCY_OWNER can manage all contacts in their agency
CREATE POLICY "Agency owners can manage contacts"
  ON agency_contacts
  FOR ALL
  USING (
    agency_id IN (
      SELECT ac.agency_id
      FROM agency_contacts ac
      WHERE ac.profile_id = auth.uid()
        AND ac.role = 'AGENCY_OWNER'
        AND ac.is_active = TRUE
    )
  );

-- Policy: Super admin can manage all contacts
CREATE POLICY "Super admin can manage all contacts"
  ON agency_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type = 'super_admin'
    )
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_agency_contacts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_agency_contacts_timestamp
  BEFORE UPDATE ON agency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_agency_contacts_updated_at();

-- Comments for documentation
COMMENT ON TABLE agency_contacts IS 'Agency contact records with RBAC roles for granular permissions (inspired by Module 1 client_contacts)';
COMMENT ON COLUMN agency_contacts.role IS 'RBAC role: AGENCY_OWNER (full access), OPERATIONS_DIRECTOR (ops only), FINANCE_MANAGER (finance only), HR_COORDINATOR (staff mgmt), SHIFT_COORDINATOR (shifts only), REPORTING_ANALYST (read-only)';
COMMENT ON COLUMN agency_contacts.custom_permissions IS 'Optional JSONB override for default role permissions';
```

### **Backfill Migration**

```sql
-- Backfill existing agency_admin and manager users
-- Default to AGENCY_OWNER for safety (full access)

INSERT INTO agency_contacts (
  agency_id,
  profile_id,
  role,
  first_name,
  last_name,
  email,
  phone,
  job_title,
  is_primary_contact,
  created_by
)
SELECT
  p.agency_id,
  p.id AS profile_id,
  'AGENCY_OWNER' AS role,  -- Safe default: full access
  SPLIT_PART(p.full_name, ' ', 1) AS first_name,
  COALESCE(NULLIF(SPLIT_PART(p.full_name, ' ', 2), ''), SPLIT_PART(p.full_name, ' ', 1)) AS last_name,
  p.email,
  p.phone,
  CASE
    WHEN p.user_type = 'agency_admin' THEN 'Agency Administrator'
    WHEN p.user_type = 'manager' THEN 'Manager'
    ELSE 'Staff'
  END AS job_title,
  TRUE AS is_primary_contact,  -- First admin becomes primary
  NULL AS created_by
FROM profiles p
WHERE p.user_type IN ('agency_admin', 'manager')
  AND p.agency_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM agency_contacts ac
    WHERE ac.profile_id = p.id
  )
ORDER BY p.created_at ASC;  -- Oldest user becomes primary

-- Verification query
DO $$
DECLARE
  backfill_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backfill_count
  FROM agency_contacts
  WHERE role = 'AGENCY_OWNER';

  RAISE NOTICE '✅ Backfilled % agency contacts as AGENCY_OWNER', backfill_count;
END $$;
```

---

## PERMISSION MATRIX SERVICE

### **New File: `src/services/agencyRBAC.js`**

```javascript
/**
 * Agency RBAC Service
 * Provides role-based access control for agency portal users
 * Inspired by Module 1's clientRBAC.js
 *
 * Roles:
 * - AGENCY_OWNER: Full access (highest authority)
 * - OPERATIONS_DIRECTOR: Operations + limited finance
 * - FINANCE_MANAGER: Finance + limited operations
 * - HR_COORDINATOR: Staff management + compliance
 * - SHIFT_COORDINATOR: Shift operations only
 * - REPORTING_ANALYST: Read-only dashboards (anonymized)
 */

// Permission matrix for agency roles
const ROLE_PERMISSIONS = {
  AGENCY_OWNER: {
    shifts: {
      view: true,
      create: true,
      edit: true,
      cancel: true,
      assign_staff: true,
    },
    financial: {
      view_charge_rate: true,
      view_pay_rate: true,
      view_margin: true,
      view_profit: true,
      generate_invoice: true,
      generate_payslip: true,
      view_bank_details: true,
    },
    staff: {
      view: true,
      create: true,
      edit: true,
      deactivate: true,
      view_pay_rate: true,
      view_bank_details: true,
    },
    timesheets: {
      view: true,
      approve: true,
      reject: true,
      edit: true,
    },
    invoices: {
      view: true,
      create: true,
      edit: true,
      send: true,
      view_full_details: true,
    },
    dashboards: {
      cfo_dashboard: true,
      analytics_dashboard: true,
      operational_dashboard: true,
    },
    settings: {
      manage_agency: true,
      assign_roles: true,
      manage_integrations: true,
    },
  },

  OPERATIONS_DIRECTOR: {
    shifts: {
      view: true,
      create: true,
      edit: true,
      cancel: true,
      assign_staff: true,
    },
    financial: {
      view_charge_rate: false,  // REDACTED
      view_pay_rate: false,      // REDACTED
      view_margin: false,        // REDACTED
      view_profit: false,        // REDACTED
      generate_invoice: true,    // Can generate, but rates hidden
      generate_payslip: false,
      view_bank_details: false,
    },
    staff: {
      view: true,
      create: false,
      edit: true,  // Operational edits (availability, etc.)
      deactivate: false,
      view_pay_rate: false,
      view_bank_details: false,
    },
    timesheets: {
      view: true,
      approve: true,
      reject: true,
      edit: false,
    },
    invoices: {
      view: true,
      create: false,
      edit: false,
      send: false,
      view_full_details: false,  // Sees totals, NOT rates/margins
    },
    dashboards: {
      cfo_dashboard: false,
      analytics_dashboard: true,  // Operational metrics only
      operational_dashboard: true,
    },
    settings: {
      manage_agency: false,
      assign_roles: false,
      manage_integrations: false,
    },
  },

  FINANCE_MANAGER: {
    shifts: {
      view: true,  // For context
      create: false,
      edit: false,
      cancel: false,
      assign_staff: false,
    },
    financial: {
      view_charge_rate: true,
      view_pay_rate: true,
      view_margin: true,
      view_profit: true,
      generate_invoice: true,
      generate_payslip: true,
      view_bank_details: true,  // For payroll
    },
    staff: {
      view: true,
      create: false,
      edit: false,
      deactivate: false,
      view_pay_rate: true,
      view_bank_details: true,
    },
    timesheets: {
      view: true,
      approve: false,  // Can view, not approve
      reject: false,
      edit: false,
    },
    invoices: {
      view: true,
      create: true,
      edit: true,
      send: true,
      view_full_details: true,
    },
    dashboards: {
      cfo_dashboard: true,
      analytics_dashboard: true,  // Financial analytics
      operational_dashboard: false,
    },
    settings: {
      manage_agency: false,
      assign_roles: false,
      manage_integrations: false,
    },
  },

  HR_COORDINATOR: {
    shifts: {
      view: true,  // For context
      create: false,
      edit: false,
      cancel: false,
      assign_staff: false,
    },
    financial: {
      view_charge_rate: false,
      view_pay_rate: true,  // For recruitment offers
      view_margin: false,
      view_profit: false,
      generate_invoice: false,
      generate_payslip: false,
      view_bank_details: true,  // For payroll setup
    },
    staff: {
      view: true,
      create: true,  // Onboard new staff
      edit: true,
      deactivate: true,
      view_pay_rate: true,
      view_bank_details: true,
    },
    timesheets: {
      view: true,
      approve: false,
      reject: false,
      edit: false,
    },
    invoices: {
      view: false,
      create: false,
      edit: false,
      send: false,
      view_full_details: false,
    },
    dashboards: {
      cfo_dashboard: false,
      analytics_dashboard: false,
      operational_dashboard: false,
    },
    settings: {
      manage_agency: false,
      assign_roles: false,
      manage_integrations: false,
    },
  },

  SHIFT_COORDINATOR: {
    shifts: {
      view: true,
      create: true,
      edit: true,
      cancel: true,
      assign_staff: true,
    },
    financial: {
      view_charge_rate: false,  // REDACTED
      view_pay_rate: false,      // REDACTED
      view_margin: false,
      view_profit: false,
      generate_invoice: false,
      generate_payslip: false,
      view_bank_details: false,
    },
    staff: {
      view: true,
      create: false,
      edit: false,
      deactivate: false,
      view_pay_rate: false,
      view_bank_details: false,
    },
    timesheets: {
      view: true,
      approve: true,  // Operational approval
      reject: true,
      edit: false,
    },
    invoices: {
      view: false,
      create: false,
      edit: false,
      send: false,
      view_full_details: false,
    },
    dashboards: {
      cfo_dashboard: false,
      analytics_dashboard: false,
      operational_dashboard: true,  // Basic metrics
    },
    settings: {
      manage_agency: false,
      assign_roles: false,
      manage_integrations: false,
    },
  },

  REPORTING_ANALYST: {
    shifts: {
      view: true,
      create: false,
      edit: false,
      cancel: false,
      assign_staff: false,
    },
    financial: {
      view_charge_rate: false,
      view_pay_rate: false,
      view_margin: false,
      view_profit: false,
      generate_invoice: false,
      generate_payslip: false,
      view_bank_details: false,
    },
    staff: {
      view: true,  // Anonymized
      create: false,
      edit: false,
      deactivate: false,
      view_pay_rate: false,
      view_bank_details: false,
    },
    timesheets: {
      view: true,  // Summary only
      approve: false,
      reject: false,
      edit: false,
    },
    invoices: {
      view: true,  // Aggregated only
      create: false,
      edit: false,
      send: false,
      view_full_details: false,
    },
    dashboards: {
      cfo_dashboard: true,  // Redacted mode
      analytics_dashboard: true,
      operational_dashboard: true,
    },
    settings: {
      manage_agency: false,
      assign_roles: false,
      manage_integrations: false,
    },
  },
};

/**
 * Check if a user has a specific permission
 * @param {string} role - User's agency role
 * @param {string} resource - Resource name (e.g., 'shifts', 'financial')
 * @param {string} action - Action name (e.g., 'view', 'create')
 * @returns {boolean} - true if permitted
 */
export function hasPermission(role, resource, action) {
  if (!role || !ROLE_PERMISSIONS[role]) {
    console.warn(`[agencyRBAC] Invalid role: ${role}`);
    return false;
  }

  const permission = ROLE_PERMISSIONS[role][resource]?.[action];
  return permission === true;
}

/**
 * Get all permissions for a role
 * @param {string} role - User's agency role
 * @returns {object} - Permission object
 */
export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || {};
}

/**
 * Check if role can perform action on resource (throws error if denied)
 * @param {string} role - User's agency role
 * @param {string} resource - Resource name
 * @param {string} action - Action name
 * @throws {Error} - If permission denied
 */
export function requirePermission(role, resource, action) {
  const hasAccess = hasPermission(role, resource, action);

  if (!hasAccess) {
    throw new Error(
      `Permission denied: ${role} cannot ${action} ${resource}. ` +
      `Required permission: ${resource}.${action}`
    );
  }
}

/**
 * Get user's agency contact role from database
 * @param {object} supabase - Supabase client
 * @param {string} userId - Auth user ID
 * @returns {Promise<string|null>} - Role name or null
 */
export async function getUserAgencyRole(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from('agency_contacts')
      .select('role, is_active')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.warn('[agencyRBAC] No agency contact found for user:', userId);
      return null;
    }

    return data.role;
  } catch (error) {
    console.error('[agencyRBAC] Error fetching user role:', error);
    return null;
  }
}

/**
 * Get full agency contact record for user
 * @param {object} supabase - Supabase client
 * @param {string} userId - Auth user ID
 * @returns {Promise<object|null>} - Contact record or null
 */
export async function getUserAgencyContact(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from('agency_contacts')
      .select('*, agencies(id, name)')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('[agencyRBAC] Error fetching agency contact:', error);
    return null;
  }
}

/**
 * Role hierarchy for inheritance (higher number = more access)
 */
const ROLE_HIERARCHY = {
  AGENCY_OWNER: 6,
  FINANCE_MANAGER: 5,
  OPERATIONS_DIRECTOR: 4,
  HR_COORDINATOR: 3,
  SHIFT_COORDINATOR: 2,
  REPORTING_ANALYST: 1,
};

/**
 * Check if user's role is at least the required role
 * @param {string} userRole - User's current role
 * @param {string} requiredRole - Minimum required role
 * @returns {boolean} - true if user role >= required role
 */
export function hasMinimumRole(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Redact financial fields based on user role
 * @param {object} data - Data object with financial fields
 * @param {string} role - User's agency role
 * @returns {object} - Data with redacted fields if unauthorized
 */
export function redactFinancialData(data, role) {
  if (!data) return data;

  const redacted = { ...data };
  const REDACTED_VALUE = '***REDACTED***';

  // Check charge_rate permission
  if (!hasPermission(role, 'financial', 'view_charge_rate')) {
    if (redacted.charge_rate !== undefined) {
      redacted.charge_rate = REDACTED_VALUE;
    }
    if (redacted.client_charge_amount !== undefined) {
      redacted.client_charge_amount = REDACTED_VALUE;
    }
  }

  // Check pay_rate permission
  if (!hasPermission(role, 'financial', 'view_pay_rate')) {
    if (redacted.pay_rate !== undefined) {
      redacted.pay_rate = REDACTED_VALUE;
    }
    if (redacted.staff_pay_amount !== undefined) {
      redacted.staff_pay_amount = REDACTED_VALUE;
    }
  }

  // Check margin permission
  if (!hasPermission(role, 'financial', 'view_margin')) {
    if (redacted.margin !== undefined) {
      redacted.margin = REDACTED_VALUE;
    }
    if (redacted.margin_percentage !== undefined) {
      redacted.margin_percentage = REDACTED_VALUE;
    }
    if (redacted.profit !== undefined) {
      redacted.profit = REDACTED_VALUE;
    }
  }

  // Check bank details permission
  if (!hasPermission(role, 'financial', 'view_bank_details')) {
    if (redacted.bank_details !== undefined) {
      redacted.bank_details = REDACTED_VALUE;
    }
  }

  return redacted;
}

export default {
  hasPermission,
  getRolePermissions,
  requirePermission,
  getUserAgencyRole,
  getUserAgencyContact,
  hasMinimumRole,
  redactFinancialData,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
};
```

---

## UI COMPONENTS

### **Agency Role Badge** (Update `Layout.jsx`)

```jsx
// Show agency role badge in navigation
import { getUserAgencyContact } from '@/services/agencyRBAC';

// In Layout component
const [agencyContact, setAgencyContact] = useState(null);

useEffect(() => {
  const fetchAgencyRole = async () => {
    if (!user?.id) return;
    const contact = await getUserAgencyContact(supabase, user.id);
    setAgencyContact(contact);
  };
  fetchAgencyRole();
}, [user]);

// Role badge component
{agencyContact && (
  <Badge variant="outline" className="ml-2 border-purple-500 text-purple-700">
    {agencyContact.role === 'AGENCY_OWNER' && '👑 Owner'}
    {agencyContact.role === 'FINANCE_MANAGER' && '💰 Finance'}
    {agencyContact.role === 'OPERATIONS_DIRECTOR' && '⚙️ Operations'}
    {agencyContact.role === 'HR_COORDINATOR' && '👥 HR'}
    {agencyContact.role === 'SHIFT_COORDINATOR' && '📅 Shifts'}
    {agencyContact.role === 'REPORTING_ANALYST' && '📊 Analyst'}
  </Badge>
)}
```

### **Field Redaction Example** (Update financial pages)

```jsx
// In ShiftDetail.jsx, InvoiceDetail.jsx, etc.
import agencyRBAC from '@/services/agencyRBAC';

// Get user role
const userRole = agencyContact?.role;

// Conditional rendering
{agencyRBAC.hasPermission(userRole, 'financial', 'view_charge_rate') ? (
  <div className="flex justify-between">
    <span>Charge Rate:</span>
    <span className="font-bold">£{shift.charge_rate}/hr</span>
  </div>
) : (
  <div className="flex justify-between">
    <span>Charge Rate:</span>
    <span className="text-gray-400 italic">***REDACTED***</span>
  </div>
)}

{agencyRBAC.hasPermission(userRole, 'financial', 'view_margin') ? (
  <div className="flex justify-between">
    <span>Margin:</span>
    <span className="font-bold text-green-600">{calculateMargin(shift)}%</span>
  </div>
) : null /* Hide entirely for unauthorized users */
}
```

---

## TESTING CHECKLIST

### **Test Case 1: OPERATIONS_DIRECTOR Cannot See Charge Rates**
- [ ] Log in as OPERATIONS_DIRECTOR role
- [ ] Navigate to Shift Detail page
- [ ] ✅ Charge rate field shows `***REDACTED***` or is hidden
- [ ] Try to query shift data via API directly
- [ ] ✅ API response excludes charge_rate field (RLS blocks it)

### **Test Case 2: FINANCE_MANAGER Can See All Financial Data**
- [ ] Log in as FINANCE_MANAGER role
- [ ] View invoice details
- [ ] ✅ Charge rates visible
- [ ] ✅ Pay rates visible
- [ ] ✅ Margins visible
- [ ] ✅ CFO Dashboard accessible

### **Test Case 3: SHIFT_COORDINATOR Cannot Access CFO Dashboard**
- [ ] Log in as SHIFT_COORDINATOR role
- [ ] Try to navigate to `/CFODashboard`
- [ ] ✅ Navigation link hidden
- [ ] Try direct URL access
- [ ] ✅ Blocked with "Permission Denied" message

### **Test Case 4: HR_COORDINATOR Can See Pay Rates But Not Charge Rates**
- [ ] Log in as HR_COORDINATOR role
- [ ] View staff pay rate: ✅ Visible
- [ ] View shift charge rate: ❌ Redacted
- [ ] View invoice margin: ❌ Hidden

### **Test Case 5: Role Assignment (AGENCY_OWNER)**
- [ ] Log in as AGENCY_OWNER
- [ ] Navigate to team management
- [ ] ✅ Can see "Assign Role" dropdown
- [ ] Assign FINANCE_MANAGER role to another user
- [ ] ✅ User immediately gets updated permissions

---

## DEPLOYMENT STEPS

1. **Week 1: Database Setup**
   - Deploy `agency_contacts` table migration
   - Run backfill script (all existing admins → AGENCY_OWNER)
   - Verify RLS policies

2. **Week 2: Backend Service**
   - Deploy `agencyRBAC.js` service
   - Add permission checks to API endpoints
   - Test with staging data

3. **Week 3: Frontend Integration**
   - Add role badge to navigation
   - Implement field redaction in financial pages
   - Hide navigation items based on permissions
   - Deploy to staging

4. **Week 4: User Testing**
   - Test with Dominion agency (pilot)
   - Assign granular roles to real users
   - Gather feedback
   - Fix issues

5. **Week 5: Production Rollout**
   - Deploy to all agencies with default AGENCY_OWNER role
   - Send announcement email explaining new roles
   - Provide documentation
   - Monitor support requests

---

**END OF MODULE A SPECIFICATION**
