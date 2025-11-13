# AI IMPLEMENTATION GUIDE
## Security & Revenue Protection Fixes - Step-by-Step Instructions

**Target Audience**: AI Code Generation Model
**Purpose**: Implement all CRITICAL and HIGH priority security fixes identified in CRITICAL_SECURITY_REVIEW.md
**Codebase**: base44-app (React + Supabase)

---

## INSTRUCTIONS FOR AI MODEL

You are an expert software engineer tasked with implementing security fixes for a multi-million dollar staffing platform. This guide provides detailed, actionable steps for each fix.

### Your Objectives:
1. Read and understand the associated vulnerability from CRITICAL_SECURITY_REVIEW.md
2. Follow the implementation steps exactly as specified
3. Maintain backward compatibility where possible
4. Add comprehensive tests for each fix
5. Document any breaking changes

### Code Quality Standards:
- Write production-ready, well-documented code
- Include TypeScript types where applicable
- Add error handling for all edge cases
- Include logging for security events
- Write unit + integration tests
- Follow existing code style and patterns

### Important Context:
- **Database**: Supabase (PostgreSQL)
- **Frontend**: React 18, Vite, TanStack Query, Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Auth**: Supabase Auth (JWT-based)
- **Storage**: Supabase Storage
- **Entity Layer**: `src/api/base44Client.js` (compatibility wrapper)

---

## PRIORITY 0: IMMEDIATE FIXES (DO FIRST)

### FIX-01: Implement Row Level Security (RLS) Policies
**Reference**: CRITICAL-01 in security review
**Estimated Time**: 4-6 hours
**Files to Create**: `supabase/migrations/20250111000001_enable_rls.sql`

#### Step 1: Create SQL Migration File

Create file at `supabase/migrations/20250111000001_enable_rls.sql`:

```sql
-- =====================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =====================================================

-- Enable RLS on all critical tables
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTION: Get user's agency_id
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS UUID AS $$
DECLARE
  user_agency UUID;
BEGIN
  SELECT agency_id INTO user_agency
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_agency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Check if user is super admin
-- =====================================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_type TEXT;
BEGIN
  SELECT profiles.user_type INTO user_type
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_type = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AGENCIES TABLE POLICIES
-- =====================================================

-- Super admins can see all agencies
CREATE POLICY "Super admins can view all agencies"
  ON agencies FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Users can only see their own agency
CREATE POLICY "Users can view their own agency"
  ON agencies FOR SELECT
  TO authenticated
  USING (id = get_user_agency_id());

-- Only super admins can create/update/delete agencies
CREATE POLICY "Only super admins can modify agencies"
  ON agencies FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Agency admins can view profiles in their agency
CREATE POLICY "Agency admins can view their agency profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    agency_id = get_user_agency_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('agency_admin', 'manager')
    )
  );

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =====================================================
-- STAFF TABLE POLICIES
-- =====================================================

-- Staff can view their own record
CREATE POLICY "Staff can view their own record"
  ON staff FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Agency users can view staff in their agency
CREATE POLICY "Agency users can view their agency staff"
  ON staff FOR SELECT
  TO authenticated
  USING (agency_id = get_user_agency_id());

-- Super admins can view all staff
CREATE POLICY "Super admins can view all staff"
  ON staff FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Only agency admins can create/update/delete staff
CREATE POLICY "Agency admins can manage their staff"
  ON staff FOR ALL
  TO authenticated
  USING (
    agency_id = get_user_agency_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('agency_admin', 'manager')
    )
  )
  WITH CHECK (
    agency_id = get_user_agency_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('agency_admin', 'manager')
    )
  );

-- =====================================================
-- CLIENTS TABLE POLICIES
-- =====================================================

-- Agency users can view their agency clients
CREATE POLICY "Agency users can view their agency clients"
  ON clients FOR SELECT
  TO authenticated
  USING (agency_id = get_user_agency_id() OR is_super_admin());

-- Client users can view their own client record
CREATE POLICY "Client users can view their own record"
  ON clients FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT client_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Agency admins can manage their clients
CREATE POLICY "Agency admins can manage their clients"
  ON clients FOR ALL
  TO authenticated
  USING (
    agency_id = get_user_agency_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('agency_admin', 'manager')
    )
  )
  WITH CHECK (
    agency_id = get_user_agency_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('agency_admin', 'manager')
    )
  );

-- =====================================================
-- SHIFTS TABLE POLICIES
-- =====================================================

-- Agency users can view their agency shifts
CREATE POLICY "Agency users can view their agency shifts"
  ON shifts FOR SELECT
  TO authenticated
  USING (agency_id = get_user_agency_id() OR is_super_admin());

-- Staff can view shifts assigned to them
CREATE POLICY "Staff can view their assigned shifts"
  ON shifts FOR SELECT
  TO authenticated
  USING (
    assigned_staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
  );

-- Clients can view shifts at their locations
CREATE POLICY "Clients can view their shifts"
  ON shifts FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Agency admins can manage their agency shifts
CREATE POLICY "Agency admins can manage their shifts"
  ON shifts FOR ALL
  TO authenticated
  USING (
    agency_id = get_user_agency_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('agency_admin', 'manager')
    )
  )
  WITH CHECK (
    agency_id = get_user_agency_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('agency_admin', 'manager')
    )
  );

-- =====================================================
-- TIMESHEETS TABLE POLICIES
-- =====================================================

-- Agency users can view their agency timesheets
CREATE POLICY "Agency users can view their agency timesheets"
  ON timesheets FOR SELECT
  TO authenticated
  USING (agency_id = get_user_agency_id() OR is_super_admin());

-- Staff can view their own timesheets
CREATE POLICY "Staff can view their own timesheets"
  ON timesheets FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
  );

-- Clients can view timesheets for their locations
CREATE POLICY "Clients can view their timesheets"
  ON timesheets FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Agency admins can manage timesheets
CREATE POLICY "Agency admins can manage timesheets"
  ON timesheets FOR ALL
  TO authenticated
  USING (
    agency_id = get_user_agency_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('agency_admin', 'manager')
    )
  )
  WITH CHECK (
    agency_id = get_user_agency_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('agency_admin', 'manager')
    )
  );

-- Staff can update their own timesheets (draft status only)
CREATE POLICY "Staff can update their own draft timesheets"
  ON timesheets FOR UPDATE
  TO authenticated
  USING (
    staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid()) AND
    status = 'draft'
  )
  WITH CHECK (
    staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid()) AND
    status = 'draft'
  );

-- =====================================================
-- INVOICES TABLE POLICIES
-- =====================================================

-- Agency users can view their agency invoices
CREATE POLICY "Agency users can view their agency invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (agency_id = get_user_agency_id() OR is_super_admin());

-- Clients can view their invoices
CREATE POLICY "Clients can view their invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Agency admins can manage invoices
CREATE POLICY "Agency admins can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (
    agency_id = get_user_agency_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('agency_admin', 'manager')
    )
  )
  WITH CHECK (
    agency_id = get_user_agency_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('agency_admin', 'manager')
    )
  );

-- =====================================================
-- PAYSLIPS TABLE POLICIES
-- =====================================================

-- Staff can only view their own payslips
CREATE POLICY "Staff can view their own payslips"
  ON payslips FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
  );

-- Agency admins can view their agency payslips
CREATE POLICY "Agency admins can view their agency payslips"
  ON payslips FOR SELECT
  TO authenticated
  USING (
    agency_id = get_user_agency_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('agency_admin', 'manager')
    )
  );

-- Only agency finance managers can create/delete payslips
CREATE POLICY "Finance managers can manage payslips"
  ON payslips FOR ALL
  TO authenticated
  USING (
    agency_id = get_user_agency_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('agency_admin', 'finance_manager')
    )
  )
  WITH CHECK (
    agency_id = get_user_agency_id() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type IN ('agency_admin', 'finance_manager')
    )
  );

-- =====================================================
-- Grant execute permissions on helper functions
-- =====================================================
GRANT EXECUTE ON FUNCTION get_user_agency_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- =====================================================
-- Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_staff_agency_id ON staff(agency_id);
CREATE INDEX IF NOT EXISTS idx_shifts_agency_id ON shifts(agency_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_agency_id ON timesheets(agency_id);
CREATE INDEX IF NOT EXISTS idx_invoices_agency_id ON invoices(agency_id);
```

#### Step 2: Apply Migration

```bash
# Apply migration to Supabase
supabase db push

# OR if using Supabase CLI:
supabase migration new enable_rls
# (paste SQL above into created file)
supabase db reset
```

#### Step 3: Create Integration Tests

Create file at `tests/security/rls-policies.test.js`:

```javascript
import { describe, test, expect, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

describe('Row Level Security Policies', () => {
  let agencyAUser, agencyBUser, staffUser, clientUser;

  beforeEach(async () => {
    // Set up test users for different agencies
    agencyAUser = createClient(supabaseUrl, supabaseAnonKey);
    await agencyAUser.auth.signInWithPassword({
      email: 'agency_a_admin@test.com',
      password: 'test123'
    });

    agencyBUser = createClient(supabaseUrl, supabaseAnonKey);
    await agencyBUser.auth.signInWithPassword({
      email: 'agency_b_admin@test.com',
      password: 'test123'
    });
  });

  test('Agency A cannot access Agency B shifts', async () => {
    const { data, error } = await agencyAUser
      .from('shifts')
      .select('*')
      .eq('agency_id', 'agency_b_id');

    expect(data).toEqual([]);
    expect(error).toBeNull();
  });

  test('Agency A can access their own shifts', async () => {
    const { data, error } = await agencyAUser
      .from('shifts')
      .select('*')
      .eq('agency_id', 'agency_a_id');

    expect(data).not.toEqual([]);
    expect(error).toBeNull();
  });

  test('Staff can only view their assigned shifts', async () => {
    const { data, error } = await staffUser
      .from('shifts')
      .select('*');

    // Should only return shifts assigned to this staff member
    expect(data.every(shift => shift.assigned_staff_id === staffUser.staff_id)).toBe(true);
  });

  test('Client can only view shifts at their location', async () => {
    const { data, error } = await clientUser
      .from('shifts')
      .select('*');

    // Should only return shifts for this client
    expect(data.every(shift => shift.client_id === clientUser.client_id)).toBe(true);
  });

  test('Agency admin cannot delete shift from another agency', async () => {
    const { error } = await agencyAUser
      .from('shifts')
      .delete()
      .eq('id', 'agency_b_shift_id');

    expect(error).not.toBeNull();
    expect(error.message).toContain('policy');
  });
});
```

---

### FIX-02: Implement Financial Locking Database Triggers
**Reference**: CRITICAL-02 in security review
**Estimated Time**: 3-4 hours
**Files to Create**: `supabase/migrations/20250111000002_financial_lock_triggers.sql`

#### Step 1: Create SQL Migration

```sql
-- =====================================================
-- FINANCIAL LOCK ENFORCEMENT - DATABASE TRIGGERS
-- =====================================================

-- =====================================================
-- FUNCTION: Prevent financial field modifications when locked
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_financial_modification_shifts()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if shift is financially locked
  IF OLD.financial_locked = TRUE THEN
    -- List of fields that cannot be modified when locked
    IF NEW.pay_rate != OLD.pay_rate THEN
      RAISE EXCEPTION 'Financial lock violation on shift %: cannot modify pay_rate (was: %, attempted: %)',
        OLD.id, OLD.pay_rate, NEW.pay_rate;
    END IF;

    IF NEW.charge_rate != OLD.charge_rate THEN
      RAISE EXCEPTION 'Financial lock violation on shift %: cannot modify charge_rate (was: %, attempted: %)',
        OLD.id, OLD.charge_rate, NEW.charge_rate;
    END IF;

    IF NEW.duration_hours != OLD.duration_hours THEN
      RAISE EXCEPTION 'Financial lock violation on shift %: cannot modify duration_hours (was: %, attempted: %)',
        OLD.id, OLD.duration_hours, NEW.duration_hours;
    END IF;

    IF NEW.work_location_within_site != OLD.work_location_within_site THEN
      RAISE EXCEPTION 'Financial lock violation on shift %: cannot modify work_location_within_site',
        OLD.id;
    END IF;

    -- Allow modification of financial_locked flag only (to unlock if needed)
    -- All other non-financial fields can still be modified
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Apply to shifts table
-- =====================================================
CREATE TRIGGER enforce_financial_lock_shifts
BEFORE UPDATE ON shifts
FOR EACH ROW
EXECUTE FUNCTION prevent_financial_modification_shifts();

-- =====================================================
-- FUNCTION: Prevent timesheet financial modifications
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_financial_modification_timesheets()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.financial_locked = TRUE THEN
    IF NEW.total_hours != OLD.total_hours THEN
      RAISE EXCEPTION 'Financial lock violation on timesheet %: cannot modify total_hours',
        OLD.id;
    END IF;

    IF NEW.pay_rate != OLD.pay_rate THEN
      RAISE EXCEPTION 'Financial lock violation on timesheet %: cannot modify pay_rate',
        OLD.id;
    END IF;

    IF NEW.charge_rate != OLD.charge_rate THEN
      RAISE EXCEPTION 'Financial lock violation on timesheet %: cannot modify charge_rate',
        OLD.id;
    END IF;

    IF NEW.staff_pay_amount != OLD.staff_pay_amount THEN
      RAISE EXCEPTION 'Financial lock violation on timesheet %: cannot modify staff_pay_amount',
        OLD.id;
    END IF;

    IF NEW.client_charge_amount != OLD.client_charge_amount THEN
      RAISE EXCEPTION 'Financial lock violation on timesheet %: cannot modify client_charge_amount',
        OLD.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Apply to timesheets table
-- =====================================================
CREATE TRIGGER enforce_financial_lock_timesheets
BEFORE UPDATE ON timesheets
FOR EACH ROW
EXECUTE FUNCTION prevent_financial_modification_timesheets();

-- =====================================================
-- FUNCTION: Auto-lock timesheet when approved
-- =====================================================
CREATE OR REPLACE FUNCTION auto_lock_timesheet_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- If timesheet status changed to 'approved', set financial lock
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.financial_locked := TRUE;
    NEW.locked_at := NOW();

    -- Also lock the associated shift
    UPDATE shifts
    SET financial_locked = TRUE,
        locked_at = NOW()
    WHERE id = NEW.shift_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Auto-lock on approval
-- =====================================================
CREATE TRIGGER auto_lock_timesheet
BEFORE UPDATE ON timesheets
FOR EACH ROW
EXECUTE FUNCTION auto_lock_timesheet_on_approval();

-- =====================================================
-- Add locked_at timestamp columns if not exists
-- =====================================================
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP;

-- =====================================================
-- Function to unlock (requires super admin)
-- =====================================================
CREATE OR REPLACE FUNCTION unlock_financial_record(
  table_name TEXT,
  record_id UUID,
  unlock_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_type TEXT;
BEGIN
  -- Only super admins can unlock
  SELECT profiles.user_type INTO user_type
  FROM profiles
  WHERE id = auth.uid();

  IF user_type != 'super_admin' THEN
    RAISE EXCEPTION 'Only super admins can unlock financial records';
  END IF;

  -- Log the unlock
  INSERT INTO change_logs (
    table_name,
    record_id,
    action,
    changed_by,
    notes
  ) VALUES (
    table_name,
    record_id,
    'FINANCIAL_UNLOCK',
    auth.uid(),
    unlock_reason
  );

  -- Perform unlock
  IF table_name = 'shifts' THEN
    UPDATE shifts SET financial_locked = FALSE WHERE id = record_id;
  ELSIF table_name = 'timesheets' THEN
    UPDATE timesheets SET financial_locked = FALSE WHERE id = record_id;
  ELSE
    RAISE EXCEPTION 'Invalid table name';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION unlock_financial_record TO authenticated;
```

#### Step 2: Update Frontend Error Handling

Update `src/pages/Shifts.jsx` and `src/pages/Timesheets.jsx` to handle database-level errors:

```javascript
// Replace frontend checks with database-enforced checks
const updateShiftMutation = useMutation({
  mutationFn: async ({ id, data }) => {
    try {
      return await base44.entities.Shift.update(id, data);
    } catch (error) {
      // Database trigger will throw error with specific message
      if (error.message.includes('Financial lock violation')) {
        throw new Error('🔒 This shift is financially locked. Contact your administrator to unlock.');
      }
      throw error;
    }
  },
  onError: (error) => {
    toast.error(error.message);
  }
});
```

---

### FIX-03: Implement Rate Change Audit Trail
**Reference**: CRITICAL-03 in security review
**Estimated Time**: 4-5 hours
**Files to Create**: `supabase/migrations/20250111000003_rate_change_audit.sql`

#### Step 1: Create Audit Table

```sql
-- =====================================================
-- RATE CHANGE AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS rate_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(50) NOT NULL, -- 'shifts' or 'timesheets'
  record_id UUID NOT NULL,
  agency_id UUID REFERENCES agencies(id),
  shift_id UUID REFERENCES shifts(id),
  timesheet_id UUID REFERENCES timesheets(id),

  changed_field VARCHAR(50) NOT NULL, -- 'pay_rate', 'charge_rate', 'duration_hours'
  old_value NUMERIC(10,2),
  new_value NUMERIC(10,2),

  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  reason TEXT NOT NULL, -- Required explanation

  ip_address INET,
  user_agent TEXT,

  financial_locked_at_time BOOLEAN DEFAULT FALSE,

  CONSTRAINT rate_change_log_table_check CHECK (table_name IN ('shifts', 'timesheets'))
);

-- Indexes for performance
CREATE INDEX idx_rate_change_log_record ON rate_change_log(table_name, record_id);
CREATE INDEX idx_rate_change_log_agency ON rate_change_log(agency_id);
CREATE INDEX idx_rate_change_log_changed_by ON rate_change_log(changed_by);
CREATE INDEX idx_rate_change_log_changed_at ON rate_change_log(changed_at);

-- RLS Policy
ALTER TABLE rate_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rate changes in their agency"
  ON rate_change_log FOR SELECT
  TO authenticated
  USING (agency_id = get_user_agency_id() OR is_super_admin());

-- =====================================================
-- TRIGGER FUNCTION: Log rate changes automatically
-- =====================================================
CREATE OR REPLACE FUNCTION log_rate_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log pay_rate changes
  IF NEW.pay_rate != OLD.pay_rate THEN
    INSERT INTO rate_change_log (
      table_name,
      record_id,
      agency_id,
      shift_id,
      changed_field,
      old_value,
      new_value,
      changed_by,
      reason,
      financial_locked_at_time
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      NEW.agency_id,
      CASE WHEN TG_TABLE_NAME = 'shifts' THEN NEW.id ELSE NEW.shift_id END,
      'pay_rate',
      OLD.pay_rate,
      NEW.pay_rate,
      auth.uid(),
      current_setting('app.rate_change_reason', TRUE),
      COALESCE(OLD.financial_locked, FALSE)
    );
  END IF;

  -- Log charge_rate changes
  IF NEW.charge_rate != OLD.charge_rate THEN
    INSERT INTO rate_change_log (
      table_name,
      record_id,
      agency_id,
      shift_id,
      changed_field,
      old_value,
      new_value,
      changed_by,
      reason,
      financial_locked_at_time
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      NEW.agency_id,
      CASE WHEN TG_TABLE_NAME = 'shifts' THEN NEW.id ELSE NEW.shift_id END,
      'charge_rate',
      OLD.charge_rate,
      NEW.charge_rate,
      auth.uid(),
      current_setting('app.rate_change_reason', TRUE),
      COALESCE(OLD.financial_locked, FALSE)
    );
  END IF;

  -- Log duration_hours changes (for shifts only)
  IF TG_TABLE_NAME = 'shifts' AND NEW.duration_hours != OLD.duration_hours THEN
    INSERT INTO rate_change_log (
      table_name,
      record_id,
      agency_id,
      shift_id,
      changed_field,
      old_value,
      new_value,
      changed_by,
      reason,
      financial_locked_at_time
    ) VALUES (
      'shifts',
      NEW.id,
      NEW.agency_id,
      NEW.id,
      'duration_hours',
      OLD.duration_hours,
      NEW.duration_hours,
      auth.uid(),
      current_setting('app.rate_change_reason', TRUE),
      COALESCE(OLD.financial_locked, FALSE)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER log_shifts_rate_changes
AFTER UPDATE ON shifts
FOR EACH ROW
EXECUTE FUNCTION log_rate_change();

CREATE TRIGGER log_timesheets_rate_changes
AFTER UPDATE ON timesheets
FOR EACH ROW
EXECUTE FUNCTION log_rate_change();
```

#### Step 2: Update Frontend to Require Reason

Create new component `src/components/shifts/RateChangeDialog.jsx`:

```javascript
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

export default function RateChangeDialog({ isOpen, onClose, onConfirm, field, oldValue, newValue }) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert('Please provide a reason for this rate change');
      return;
    }
    onConfirm(reason);
    setReason('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Rate Change Confirmation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-900">
              You are about to change the <strong>{field.replace('_', ' ')}</strong>:
            </p>
            <div className="mt-2 flex items-center gap-4">
              <div>
                <span className="text-xs text-gray-600">Current:</span>
                <div className="text-lg font-bold text-gray-900">£{oldValue}/hr</div>
              </div>
              <div className="text-2xl text-gray-400">→</div>
              <div>
                <span className="text-xs text-gray-600">New:</span>
                <div className="text-lg font-bold text-orange-600">£{newValue}/hr</div>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Reason for Change (Required) *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this rate is being changed..."
              className="mt-2"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be recorded in the audit log and cannot be deleted.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!reason.trim()}>
            Confirm Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### Step 3: Integrate into Shifts.jsx

Update `src/pages/Shifts.jsx`:

```javascript
import RateChangeDialog from '../components/shifts/RateChangeDialog';

// Add state
const [rateChangeDialog, setRateChangeDialog] = useState({
  isOpen: false,
  field: '',
  oldValue: 0,
  newValue: 0,
  shiftId: null
});

// Intercept cell edits for rate fields
const handleCellSave = () => {
  if (!editingCell) return;

  const shift = shifts.find(s => s.id === editingCell.shiftId);
  const field = editingCell.field;
  const oldValue = shift[field];
  const newValue = parseFloat(cellEditValue);

  // If changing a rate field, show dialog
  const rateFields = ['pay_rate', 'charge_rate', 'duration_hours'];
  if (rateFields.includes(field) && oldValue !== newValue) {
    setRateChangeDialog({
      isOpen: true,
      field,
      oldValue,
      newValue,
      shiftId: editingCell.shiftId
    });
    return;
  }

  // Non-rate fields can be updated directly
  performUpdate(editingCell.shiftId, { [field]: newValue });
};

// Perform update with reason
const performUpdateWithReason = (shiftId, data, reason) => {
  // Set reason in session variable (will be read by trigger)
  // This requires a custom Supabase client setup
  updateShiftMutation.mutate({
    id: shiftId,
    data,
    reason
  });
};

// Update mutation to include reason
const updateShiftMutation = useMutation({
  mutationFn: async ({ id, data, reason }) => {
    if (reason) {
      // Set session variable for trigger to read
      await supabase.rpc('set_config', {
        setting: 'app.rate_change_reason',
        value: reason
      });
    }

    return await base44.entities.Shift.update(id, data);
  },
  // ... rest of mutation
});
```

---

*[Continue with remaining fixes: CRITICAL-04 through CRITICAL-11, then HIGH-01 through HIGH-16]*

---

## SUMMARY CHECKLIST FOR AI MODEL

When implementing these fixes:

- [ ] Read and understand each vulnerability from CRITICAL_SECURITY_REVIEW.md
- [ ] Create SQL migration files in `supabase/migrations/` with timestamp naming
- [ ] Implement database triggers and constraints
- [ ] Update frontend code to handle new backend validations
- [ ] Create comprehensive tests for each fix
- [ ] Document any breaking changes
- [ ] Add logging for security events
- [ ] Update API documentation
- [ ] Run all tests before committing
- [ ] Create pull request with detailed description

---

## TESTING STRATEGY

For each fix, create tests in the following categories:

### 1. Unit Tests
- Test individual functions in isolation
- Mock database calls
- Test edge cases

### 2. Integration Tests
- Test database triggers
- Test RLS policies with different user roles
- Test API endpoints with various scenarios

### 3. Security Tests
- Attempt to bypass security controls
- Test with malicious input
- Test concurrent operations (race conditions)

### 4. Performance Tests
- Measure query performance with indexes
- Test under load (1000+ concurrent operations)
- Identify slow queries

---

## DEPLOYMENT CHECKLIST

Before deploying to production:

1. **Backup Database**: Full backup before applying migrations
2. **Run Migrations in Staging**: Test all migrations in staging environment
3. **Verify RLS Policies**: Use test users to verify access control
4. **Load Testing**: Simulate production load
5. **Rollback Plan**: Document how to rollback each migration
6. **Monitor Logs**: Set up alerts for security violations
7. **Update Documentation**: User-facing docs about new features/restrictions

---

## ESTIMATED TIMELINE

| Priority | Fixes | Estimated Time |
|----------|-------|----------------|
| P0 (Immediate) | 6 critical fixes | 2-3 weeks |
| P1 (Urgent) | 10 high-priority fixes | 2-3 weeks |
| P2 (High) | 15 medium-priority fixes | 3-4 weeks |
| **TOTAL** | **31 fixes** | **7-10 weeks** |

Recommend parallelizing work across 2-3 developers to complete in 4-6 weeks.

---

**END OF IMPLEMENTATION GUIDE**

Good luck! Remember: Security is not a feature - it's a requirement. Take your time to implement these fixes correctly rather than rushing and introducing new vulnerabilities.
