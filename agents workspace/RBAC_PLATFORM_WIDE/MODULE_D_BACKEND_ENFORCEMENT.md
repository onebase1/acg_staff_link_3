# MODULE D: BACKEND PERMISSION ENFORCEMENT - API Security Layer

**Priority:** CRITICAL (Pre-MVP - Build After Module C)
**Estimated Time:** 8-12 hours
**Complexity:** MEDIUM-HIGH
**Dependencies:** Module A (Agency RBAC), Module C (Financial Hardening)

---

## BUSINESS JUSTIFICATION

### The Problem
**Current State:**
- ✅ RLS policies protect database (good)
- ✅ Frontend UI hides buttons based on roles (good)
- ❌ **Backend APIs don't validate permissions** (critical gap)
- ❌ Direct API calls bypass frontend checks
- ❌ Malicious users can call protected endpoints via curl/Postman

**Example Attack:**
```bash
# SHIFT_COORDINATOR calls protected endpoint directly
curl -X POST https://api.yourapp.com/api/invoices/generate \
  -H "Authorization: Bearer <valid-token>" \
  -d '{"client_id": "...", "period": "2025-12"}'

# Currently: API generates invoice (SHOULD FAIL!)
# Should: Return 403 Forbidden
```

**Target State:**
- ✅ Backend validates permissions BEFORE executing logic
- ✅ All API endpoints have role-based guards
- ✅ Automated permission test suite
- ✅ Clear 403 error messages for debugging

---

## MODULE DELIVERABLES

### 1. Permission Middleware
- Express/Supabase Edge Function middleware
- `requireAgencyRole(['AGENCY_OWNER', 'FINANCE_MANAGER'])`
- Integration with `agencyRBAC.js` service

### 2. API Endpoint Audit
- Document: `API_PERMISSION_MATRIX.md`
- Map every endpoint to required role(s)
- Identify unprotected endpoints

### 3. Automated Test Suite
- Permission tests for all protected endpoints
- Test matrix: (All roles × All endpoints)
- CI/CD integration

### 4. Error Handling
- Standardized 403 Forbidden responses
- Helpful error messages
- Security audit logging

---

## MIDDLEWARE IMPLEMENTATION

### **File: `src/middleware/agencyPermissions.js`**

```javascript
/**
 * Backend Permission Middleware
 * Validates agency role before executing protected API logic
 *
 * Usage:
 *   app.post('/api/invoices/generate',
 *     requireAgencyPermission('financial', 'generate_invoice'),
 *     generateInvoiceHandler
 *   );
 */

import { supabase } from '@/lib/supabase';
import agencyRBAC from '@/services/agencyRBAC';

/**
 * Middleware: Require specific agency role permission
 * @param {string} resource - Resource name (e.g., 'financial', 'shifts')
 * @param {string} action - Action name (e.g., 'generate_invoice', 'create')
 * @returns {Function} Express middleware
 */
export function requireAgencyPermission(resource, action) {
  return async (req, res, next) => {
    try {
      // Get authenticated user from request
      const user = req.user;  // Assume auth middleware already ran
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      // Get user's agency contact role
      const agencyContact = await agencyRBAC.getUserAgencyContact(
        supabase,
        user.id
      );

      if (!agencyContact) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'No agency contact found. Contact your administrator.',
          required_permission: `${resource}.${action}`
        });
      }

      // Check permission
      const hasAccess = agencyRBAC.hasPermission(
        agencyContact.role,
        resource,
        action
      );

      if (!hasAccess) {
        // Log permission denial for security audit
        await logPermissionDenial({
          user_id: user.id,
          role: agencyContact.role,
          resource,
          action,
          endpoint: req.path,
          ip_address: req.ip,
          timestamp: new Date()
        });

        return res.status(403).json({
          error: 'Forbidden',
          message: `Permission denied: Your role (${agencyContact.role}) cannot ${action} ${resource}.`,
          your_role: agencyContact.role,
          required_permission: `${resource}.${action}`,
          contact_support: 'If you believe this is an error, contact your agency owner.'
        });
      }

      // Permission granted - attach agency contact to request for downstream use
      req.agencyContact = agencyContact;
      req.agencyRole = agencyContact.role;

      next();
    } catch (error) {
      console.error('[agencyPermissions] Middleware error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to validate permissions'
      });
    }
  };
}

/**
 * Middleware: Require minimum agency role level
 * @param {string} minimumRole - Minimum required role
 * @returns {Function} Express middleware
 */
export function requireMinimumRole(minimumRole) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      const agencyContact = await agencyRBAC.getUserAgencyContact(
        supabase,
        user.id
      );

      if (!agencyContact) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'No agency contact found'
        });
      }

      const hasMinimum = agencyRBAC.hasMinimumRole(
        agencyContact.role,
        minimumRole
      );

      if (!hasMinimum) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `This action requires at least ${minimumRole} role. Your role: ${agencyContact.role}`,
          your_role: agencyContact.role,
          required_role: minimumRole
        });
      }

      req.agencyContact = agencyContact;
      req.agencyRole = agencyContact.role;

      next();
    } catch (error) {
      console.error('[agencyPermissions] Middleware error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to validate role'
      });
    }
  };
}

/**
 * Middleware: Agency owner only
 */
export function requireAgencyOwner() {
  return requireMinimumRole('AGENCY_OWNER');
}

/**
 * Log permission denial for security audit
 */
async function logPermissionDenial(data) {
  try {
    await supabase
      .from('permission_denials_log')
      .insert({
        user_id: data.user_id,
        role: data.role,
        resource: data.resource,
        action: data.action,
        endpoint: data.endpoint,
        ip_address: data.ip_address,
        timestamp: data.timestamp
      });
  } catch (error) {
    console.error('[agencyPermissions] Failed to log denial:', error);
    // Don't throw - logging failure shouldn't break request
  }
}

export default {
  requireAgencyPermission,
  requireMinimumRole,
  requireAgencyOwner
};
```

---

## SUPABASE EDGE FUNCTION GUARDS

### **For Supabase Edge Functions** (if using)

```typescript
// File: supabase/functions/_shared/agencyPermissions.ts

import { createClient } from '@supabase/supabase-js';

/**
 * Check if authenticated user has permission
 * @returns {object} { allowed: boolean, role: string, error?: string }
 */
export async function checkAgencyPermission(
  supabase: any,
  userId: string,
  resource: string,
  action: string
): Promise<{ allowed: boolean; role?: string; error?: string }> {
  try {
    // Get user's agency contact
    const { data: agencyContact, error } = await supabase
      .from('agency_contacts')
      .select('role, is_active, agency_id')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !agencyContact) {
      return {
        allowed: false,
        error: 'No agency contact found'
      };
    }

    // Check permission using role matrix
    const hasPermission = checkPermissionMatrix(
      agencyContact.role,
      resource,
      action
    );

    return {
      allowed: hasPermission,
      role: agencyContact.role,
      error: hasPermission ? undefined : `Permission denied: ${agencyContact.role} cannot ${action} ${resource}`
    };
  } catch (err) {
    console.error('[checkAgencyPermission] Error:', err);
    return {
      allowed: false,
      error: 'Failed to check permission'
    };
  }
}

/**
 * Permission matrix (mirrors agencyRBAC.js)
 */
function checkPermissionMatrix(
  role: string,
  resource: string,
  action: string
): boolean {
  // Import ROLE_PERMISSIONS matrix (share across frontend/backend)
  const ROLE_PERMISSIONS = {
    AGENCY_OWNER: { /* full permissions */ },
    FINANCE_MANAGER: { /* finance permissions */ },
    // ... etc.
  };

  const permission = ROLE_PERMISSIONS[role]?.[resource]?.[action];
  return permission === true;
}

/**
 * Middleware wrapper for Edge Functions
 */
export async function requirePermission(
  req: Request,
  supabase: any,
  userId: string,
  resource: string,
  action: string
): Promise<Response | null> {
  const { allowed, role, error } = await checkAgencyPermission(
    supabase,
    userId,
    resource,
    action
  );

  if (!allowed) {
    return new Response(
      JSON.stringify({
        error: 'Forbidden',
        message: error || 'Permission denied',
        your_role: role,
        required_permission: `${resource}.${action}`
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return null;  // Permission granted, continue
}
```

### **Usage in Edge Function:**

```typescript
// supabase/functions/generate-invoice/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { requirePermission } from '../_shared/agencyPermissions.ts';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get authenticated user
  const authHeader = req.headers.get('Authorization');
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader?.replace('Bearer ', '')
  );

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401 }
    );
  }

  // Check permission
  const permissionError = await requirePermission(
    req,
    supabase,
    user.id,
    'financial',
    'generate_invoice'
  );

  if (permissionError) {
    return permissionError;  // Return 403 Forbidden
  }

  // Permission granted - proceed with invoice generation
  try {
    const { invoiceData } = await req.json();

    // Generate invoice logic...
    const invoice = await generateInvoice(supabase, invoiceData);

    return new Response(
      JSON.stringify({ success: true, invoice }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
```

---

## API PERMISSION MATRIX

### **File: `API_PERMISSION_MATRIX.md`**

```markdown
# API Permission Matrix

| Endpoint | Method | Resource | Action | Required Roles | Status |
|----------|--------|----------|--------|----------------|--------|
| `/api/shifts` | GET | shifts | view | ALL | ✅ Protected |
| `/api/shifts` | POST | shifts | create | AGENCY_OWNER, OPERATIONS_DIRECTOR, SHIFT_COORDINATOR | ✅ Protected |
| `/api/shifts/:id` | PUT | shifts | edit | AGENCY_OWNER, OPERATIONS_DIRECTOR, SHIFT_COORDINATOR | ✅ Protected |
| `/api/shifts/:id` | DELETE | shifts | cancel | AGENCY_OWNER, OPERATIONS_DIRECTOR | ✅ Protected |
| `/api/invoices` | GET | invoices | view | AGENCY_OWNER, FINANCE_MANAGER, OPERATIONS_DIRECTOR | ✅ Protected |
| `/api/invoices` | POST | financial | generate_invoice | AGENCY_OWNER, FINANCE_MANAGER | ✅ Protected |
| `/api/invoices/:id` | PUT | invoices | edit | AGENCY_OWNER, FINANCE_MANAGER | ✅ Protected |
| `/api/payslips` | POST | financial | generate_payslip | AGENCY_OWNER, FINANCE_MANAGER | ✅ Protected |
| `/api/staff` | GET | staff | view | ALL (except REPORTING_ANALYST) | ✅ Protected |
| `/api/staff` | POST | staff | create | AGENCY_OWNER, HR_COORDINATOR | ✅ Protected |
| `/api/staff/:id` | PUT | staff | edit | AGENCY_OWNER, HR_COORDINATOR | ✅ Protected |
| `/api/staff/:id/bank-details` | GET | financial | view_bank_details | AGENCY_OWNER, FINANCE_MANAGER, HR_COORDINATOR | ✅ Protected |
| `/api/timesheets/:id/approve` | POST | timesheets | approve | AGENCY_OWNER, OPERATIONS_DIRECTOR, SHIFT_COORDINATOR | ✅ Protected |
| `/api/dashboards/cfo` | GET | dashboards | cfo_dashboard | AGENCY_OWNER, FINANCE_MANAGER | ✅ Protected |
| `/api/settings/agency` | PUT | settings | manage_agency | AGENCY_OWNER | ✅ Protected |
| `/api/agency/assign-role` | POST | settings | assign_roles | AGENCY_OWNER | ✅ Protected |
```

---

## AUTOMATED TEST SUITE

### **File: `tests/permissions/agencyRBAC.test.js`**

```javascript
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import agencyRBAC from '@/services/agencyRBAC';

describe('Agency RBAC Permission Tests', () => {
  const roles = [
    'AGENCY_OWNER',
    'OPERATIONS_DIRECTOR',
    'FINANCE_MANAGER',
    'HR_COORDINATOR',
    'SHIFT_COORDINATOR',
    'REPORTING_ANALYST'
  ];

  // Test matrix: Each role × Each permission
  describe('Financial Permissions', () => {
    it('AGENCY_OWNER can view charge_rate', () => {
      expect(
        agencyRBAC.hasPermission('AGENCY_OWNER', 'financial', 'view_charge_rate')
      ).toBe(true);
    });

    it('OPERATIONS_DIRECTOR cannot view charge_rate', () => {
      expect(
        agencyRBAC.hasPermission('OPERATIONS_DIRECTOR', 'financial', 'view_charge_rate')
      ).toBe(false);
    });

    it('FINANCE_MANAGER can view charge_rate', () => {
      expect(
        agencyRBAC.hasPermission('FINANCE_MANAGER', 'financial', 'view_charge_rate')
      ).toBe(true);
    });

    it('SHIFT_COORDINATOR cannot view charge_rate', () => {
      expect(
        agencyRBAC.hasPermission('SHIFT_COORDINATOR', 'financial', 'view_charge_rate')
      ).toBe(false);
    });

    it('SHIFT_COORDINATOR cannot generate_invoice', () => {
      expect(
        agencyRBAC.hasPermission('SHIFT_COORDINATOR', 'financial', 'generate_invoice')
      ).toBe(false);
    });

    it('FINANCE_MANAGER can generate_invoice', () => {
      expect(
        agencyRBAC.hasPermission('FINANCE_MANAGER', 'financial', 'generate_invoice')
      ).toBe(true);
    });
  });

  describe('Shift Permissions', () => {
    it('SHIFT_COORDINATOR can create shifts', () => {
      expect(
        agencyRBAC.hasPermission('SHIFT_COORDINATOR', 'shifts', 'create')
      ).toBe(true);
    });

    it('FINANCE_MANAGER cannot create shifts', () => {
      expect(
        agencyRBAC.hasPermission('FINANCE_MANAGER', 'shifts', 'create')
      ).toBe(false);
    });

    it('REPORTING_ANALYST cannot create shifts', () => {
      expect(
        agencyRBAC.hasPermission('REPORTING_ANALYST', 'shifts', 'create')
      ).toBe(false);
    });
  });

  describe('Dashboard Permissions', () => {
    it('FINANCE_MANAGER can access CFO dashboard', () => {
      expect(
        agencyRBAC.hasPermission('FINANCE_MANAGER', 'dashboards', 'cfo_dashboard')
      ).toBe(true);
    });

    it('OPERATIONS_DIRECTOR cannot access CFO dashboard', () => {
      expect(
        agencyRBAC.hasPermission('OPERATIONS_DIRECTOR', 'dashboards', 'cfo_dashboard')
      ).toBe(false);
    });
  });
});

describe('Backend API Permission Tests', () => {
  // Integration tests with actual API calls
  const API_BASE_URL = 'http://localhost:3000';

  describe('POST /api/invoices (Generate Invoice)', () => {
    it('AGENCY_OWNER can generate invoice', async () => {
      const response = await fetch(`${API_BASE_URL}/api/invoices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AGENCY_OWNER_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ client_id: 'test-client', period: '2025-12' })
      });

      expect(response.status).toBe(200);
    });

    it('SHIFT_COORDINATOR cannot generate invoice (403 Forbidden)', async () => {
      const response = await fetch(`${API_BASE_URL}/api/invoices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SHIFT_COORDINATOR_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ client_id: 'test-client', period: '2025-12' })
      });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Forbidden');
      expect(body.required_permission).toBe('financial.generate_invoice');
    });
  });

  describe('GET /api/dashboards/cfo', () => {
    it('FINANCE_MANAGER can access CFO dashboard', async () => {
      const response = await fetch(`${API_BASE_URL}/api/dashboards/cfo`, {
        headers: { 'Authorization': `Bearer ${FINANCE_MANAGER_TOKEN}` }
      });

      expect(response.status).toBe(200);
    });

    it('OPERATIONS_DIRECTOR cannot access CFO dashboard', async () => {
      const response = await fetch(`${API_BASE_URL}/api/dashboards/cfo`, {
        headers: { 'Authorization': `Bearer ${OPERATIONS_DIRECTOR_TOKEN}` }
      });

      expect(response.status).toBe(403);
    });
  });
});
```

---

## SECURITY AUDIT LOGGING

### **New Table: `permission_denials_log`**

```sql
-- Track permission denials for security monitoring
CREATE TABLE IF NOT EXISTS permission_denials_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who tried
  user_id UUID NOT NULL REFERENCES profiles(id),
  role TEXT,  -- agency_contact role

  -- What they tried
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  endpoint TEXT,  -- API endpoint path

  -- Context
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_permission_denials_user ON permission_denials_log(user_id);
CREATE INDEX idx_permission_denials_timestamp ON permission_denials_log(timestamp DESC);
CREATE INDEX idx_permission_denials_resource ON permission_denials_log(resource, action);

-- RLS: Only super admin can view denials
ALTER TABLE permission_denials_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can view permission denials"
  ON permission_denials_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type = 'super_admin'
    )
  );
```

---

## DEPLOYMENT CHECKLIST

### **Week 1: Middleware Setup**
- [ ] Create `agencyPermissions.js` middleware
- [ ] Create shared Edge Function guard (`_shared/agencyPermissions.ts`)
- [ ] Deploy `permission_denials_log` table
- [ ] Test locally with all roles

### **Week 2: API Endpoint Audit**
- [ ] Document all API endpoints in `API_PERMISSION_MATRIX.md`
- [ ] Identify unprotected endpoints
- [ ] Add permission guards to critical endpoints (invoices, payslips, bank details)
- [ ] Deploy to staging

### **Week 3: Automated Tests**
- [ ] Write permission test suite (`agencyRBAC.test.js`)
- [ ] Add integration tests for API endpoints
- [ ] Run full test matrix (all roles × all endpoints)
- [ ] Integrate into CI/CD pipeline

### **Week 4: Production Rollout**
- [ ] Deploy middleware to production
- [ ] Monitor permission denial logs
- [ ] Set up alerts for repeated denials (potential attack)
- [ ] Document API permission changes for developers

---

## MONITORING & ALERTS

### **Alert Scenarios:**

1. **Repeated Permission Denials**
   - If same user is denied >10 times in 10 minutes → Alert (possible attack)

2. **Financial Endpoint Access**
   - Log all access to `/api/invoices`, `/api/payslips`, `/bank-details`
   - Alert if SHIFT_COORDINATOR somehow accesses these

3. **RLS Policy Bypass Attempts**
   - Monitor direct database queries that bypass API
   - Alert on suspicious patterns

---

**END OF MODULE D SPECIFICATION**

**All critical pre-MVP modules now complete!**
- ✅ Module A: Agency RBAC
- ✅ Module C: Financial Hardening
- ✅ Module D: Backend Enforcement

**Next:** Module B (Staff Portal RBAC) and Module E (Super Admin Improvements) are post-MVP enhancements.
