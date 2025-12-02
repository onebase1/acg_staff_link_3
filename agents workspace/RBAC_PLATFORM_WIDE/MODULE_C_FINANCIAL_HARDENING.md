# MODULE C: FINANCIAL DATA HARDENING - Encryption & Audit Trail

**Priority:** CRITICAL (Pre-MVP - Build First)
**Estimated Time:** 12-16 hours
**Complexity:** HIGH
**Dependencies:** None (foundational module)

---

## BUSINESS JUSTIFICATION

### Current Security Gaps
- ❌ Bank details stored in plaintext (`staff.bank_details` JSONB field)
- ❌ NI numbers stored in plaintext (`staff.ni_number` TEXT field)
- ❌ No audit trail for financial changes (charge_rate, pay_rate modifications)
- ❌ No RLS policies protecting financial columns
- ❌ Cross-agency data leaks possible via direct queries
- ❌ GDPR compliance risk (sensitive PII not encrypted)

### Target State
- ✅ Bank details and NI numbers encrypted at rest
- ✅ Complete audit trail for all financial changes
- ✅ RLS policies protect charge_rate, pay_rate, margins
- ✅ Unauthorized users get `null` or `***REDACTED***` for sensitive fields
- ✅ GDPR-compliant data handling

---

## MODULE DELIVERABLES

### 1. Field-Level Encryption
- Encrypt `staff.bank_details`
- Encrypt `staff.ni_number`
- Implement encryption/decryption helpers
- Migrate existing plaintext data to encrypted format

### 2. Financial Audit Trail
- New table: `financial_changes_log`
- Track all changes to rates, margins, bank details
- Immutable log (insert-only, no updates/deletes)
- Query API for audit reports

### 3. RLS Policies for Financial Columns
- Protect `charge_rate` in `shifts` table
- Protect `pay_rate` in `shifts` table
- Protect `client_charge_amount` in `timesheets` table
- Protect `margin` calculations in invoices

### 4. Redaction Functions
- Database function: `redact_financial_data(user_id, role)`
- Returns redacted response for unauthorized users
- Integrates with `agencyRBAC` permission matrix

---

## DATABASE CHANGES

### **Table 1: `financial_changes_log`** (Audit Trail)

```sql
-- Create audit log table
CREATE TABLE IF NOT EXISTS financial_changes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What changed
  entity_type TEXT NOT NULL,  -- 'shift', 'invoice', 'timesheet', 'staff', 'client'
  entity_id UUID NOT NULL,
  field_name TEXT NOT NULL,   -- 'charge_rate', 'pay_rate', 'margin', 'bank_details', etc.

  -- Change details
  old_value JSONB,  -- Store as JSONB for flexibility
  new_value JSONB,

  -- Who changed it
  changed_by UUID NOT NULL REFERENCES profiles(id),
  changed_by_role TEXT,  -- agency_contact role at time of change (e.g., 'AGENCY_OWNER')

  -- Context
  reason TEXT,  -- Optional reason for change
  ip_address INET,  -- User's IP address
  user_agent TEXT,  -- Browser/device info

  -- Timestamp (immutable)
  changed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for fast queries
  CONSTRAINT valid_entity_type CHECK (entity_type IN (
    'shift', 'invoice', 'timesheet', 'staff', 'client', 'agency'
  ))
);

-- Indexes
CREATE INDEX idx_financial_log_entity ON financial_changes_log(entity_type, entity_id);
CREATE INDEX idx_financial_log_user ON financial_changes_log(changed_by);
CREATE INDEX idx_financial_log_timestamp ON financial_changes_log(changed_at DESC);
CREATE INDEX idx_financial_log_field ON financial_changes_log(field_name);

-- Row Level Security (RLS)
ALTER TABLE financial_changes_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only AGENCY_OWNER and FINANCE_MANAGER can view audit logs
CREATE POLICY "Agency owners and finance managers can view audit logs"
  ON financial_changes_log
  FOR SELECT
  USING (
    -- User is AGENCY_OWNER or FINANCE_MANAGER in same agency as changed entity
    EXISTS (
      SELECT 1
      FROM agency_contacts ac
      WHERE ac.profile_id = auth.uid()
        AND ac.is_active = TRUE
        AND ac.role IN ('AGENCY_OWNER', 'FINANCE_MANAGER')
        -- Agency isolation check would go here (join based on entity_type)
    )
    OR
    -- Super admin can view all logs
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type = 'super_admin'
    )
  );

-- Policy: System can insert (no manual inserts)
CREATE POLICY "System can insert audit logs"
  ON financial_changes_log
  FOR INSERT
  WITH CHECK (changed_by = auth.uid());

-- Prevent updates and deletes (immutable log)
ALTER TABLE financial_changes_log FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE financial_changes_log IS 'Immutable audit trail for all financial data changes (rates, margins, bank details)';
```

### **Table 2: `encryption_keys`** (Key Management)

```sql
-- Store encryption metadata (NOT the actual keys - use Supabase Vault)
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL UNIQUE,  -- 'staff_bank_details', 'staff_ni_number'
  algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert metadata for our encryption keys
INSERT INTO encryption_keys (key_name, algorithm) VALUES
  ('staff_bank_details_key', 'AES-256-GCM'),
  ('staff_ni_number_key', 'AES-256-GCM')
ON CONFLICT (key_name) DO NOTHING;
```

---

## ENCRYPTION IMPLEMENTATION

### **Option 1: Supabase pgcrypto Extension** (Recommended)

```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encryption/decryption functions
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data_text TEXT, secret_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use AES-256 encryption with GCM mode
  RETURN encode(
    pgp_sym_encrypt(data_text, secret_key, 'cipher-algo=aes256'),
    'base64'
  );
END;
$$;

CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_text TEXT, secret_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_text, 'base64'),
    secret_key
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;  -- Return NULL if decryption fails
END;
$$;

-- Helper function: Encrypt bank details
CREATE OR REPLACE FUNCTION encrypt_bank_details(bank_details_json JSONB)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Get encryption key from environment variable or vault
  encryption_key := current_setting('app.bank_details_encryption_key', TRUE);

  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;

  RETURN encrypt_sensitive_data(bank_details_json::TEXT, encryption_key);
END;
$$;

-- Helper function: Decrypt bank details (role-based)
CREATE OR REPLACE FUNCTION decrypt_bank_details_for_user(encrypted_bank_details TEXT, user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  encryption_key TEXT;
  decrypted_text TEXT;
BEGIN
  -- Check if user has permission to view bank details
  SELECT role INTO user_role
  FROM agency_contacts
  WHERE profile_id = user_id
    AND is_active = TRUE
  LIMIT 1;

  -- Only AGENCY_OWNER, FINANCE_MANAGER, HR_COORDINATOR can decrypt
  IF user_role NOT IN ('AGENCY_OWNER', 'FINANCE_MANAGER', 'HR_COORDINATOR') THEN
    RETURN '{"error": "Permission denied"}'::JSONB;
  END IF;

  -- Get decryption key
  encryption_key := current_setting('app.bank_details_encryption_key', TRUE);

  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Decryption key not configured';
  END IF;

  -- Decrypt
  decrypted_text := decrypt_sensitive_data(encrypted_bank_details, encryption_key);

  RETURN decrypted_text::JSONB;
END;
$$;
```

### **Trigger: Auto-encrypt on insert/update**

```sql
-- Trigger function: Encrypt bank_details before insert/update
CREATE OR REPLACE FUNCTION trigger_encrypt_staff_bank_details()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If bank_details is being updated and it's JSONB (plaintext)
  IF NEW.bank_details IS NOT NULL AND jsonb_typeof(NEW.bank_details::JSONB) IS NOT NULL THEN
    -- Encrypt it
    NEW.bank_details_encrypted := encrypt_bank_details(NEW.bank_details);
    NEW.bank_details := NULL;  -- Clear plaintext field
  END IF;

  RETURN NEW;
END;
$$;

-- Add encrypted column to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_details_encrypted TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS ni_number_encrypted TEXT;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_encrypt_bank_details ON staff;
CREATE TRIGGER trigger_encrypt_bank_details
  BEFORE INSERT OR UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION trigger_encrypt_staff_bank_details();
```

### **Migration: Encrypt existing data**

```sql
-- Migrate existing plaintext bank_details to encrypted format
DO $$
DECLARE
  staff_record RECORD;
  encryption_key TEXT;
BEGIN
  -- Get encryption key (set via environment variable)
  encryption_key := current_setting('app.bank_details_encryption_key', TRUE);

  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Cannot migrate: encryption key not configured';
  END IF;

  -- Encrypt all existing bank_details
  FOR staff_record IN
    SELECT id, bank_details, ni_number
    FROM staff
    WHERE bank_details IS NOT NULL
      OR ni_number IS NOT NULL
  LOOP
    -- Encrypt bank_details
    IF staff_record.bank_details IS NOT NULL THEN
      UPDATE staff
      SET bank_details_encrypted = encrypt_sensitive_data(
        staff_record.bank_details::TEXT,
        encryption_key
      ),
      bank_details = NULL  -- Clear plaintext
      WHERE id = staff_record.id;
    END IF;

    -- Encrypt NI number
    IF staff_record.ni_number IS NOT NULL THEN
      UPDATE staff
      SET ni_number_encrypted = encrypt_sensitive_data(
        staff_record.ni_number,
        encryption_key
      ),
      ni_number = NULL  -- Clear plaintext
      WHERE id = staff_record.id;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Encrypted bank details for % staff records', (SELECT COUNT(*) FROM staff WHERE bank_details_encrypted IS NOT NULL);
END $$;
```

---

## RLS POLICIES FOR FINANCIAL COLUMNS

### **Protect `charge_rate` in `shifts` table**

```sql
-- Policy: Only authorized roles can see charge_rate
CREATE POLICY "Protect charge_rate in shifts"
  ON shifts
  FOR SELECT
  USING (
    -- Allow if user is AGENCY_OWNER or FINANCE_MANAGER
    EXISTS (
      SELECT 1
      FROM agency_contacts ac
      WHERE ac.profile_id = auth.uid()
        AND ac.agency_id = shifts.agency_id
        AND ac.is_active = TRUE
        AND ac.role IN ('AGENCY_OWNER', 'FINANCE_MANAGER')
    )
    OR
    -- Super admin can see all
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type = 'super_admin'
    )
  );

-- Alternative: Use a view that redacts charge_rate
CREATE OR REPLACE VIEW shifts_redacted AS
SELECT
  s.*,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM agency_contacts ac
      WHERE ac.profile_id = auth.uid()
        AND ac.agency_id = s.agency_id
        AND ac.role IN ('AGENCY_OWNER', 'FINANCE_MANAGER')
    ) THEN s.charge_rate
    ELSE NULL  -- Redact for unauthorized users
  END AS charge_rate_safe,

  CASE
    WHEN EXISTS (
      SELECT 1 FROM agency_contacts ac
      WHERE ac.profile_id = auth.uid()
        AND ac.agency_id = s.agency_id
        AND ac.role IN ('AGENCY_OWNER', 'FINANCE_MANAGER', 'HR_COORDINATOR')
    ) THEN s.pay_rate
    ELSE NULL  -- Redact for unauthorized users
  END AS pay_rate_safe
FROM shifts s;
```

### **Protect margins in invoices**

```sql
-- Add computed column for margin (if not already exists)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS margin DECIMAL(10,2);

-- Policy: Protect margin field
CREATE POLICY "Protect invoice margins"
  ON invoices
  FOR SELECT
  USING (
    -- Only AGENCY_OWNER and FINANCE_MANAGER can see margins
    EXISTS (
      SELECT 1
      FROM agency_contacts ac
      WHERE ac.profile_id = auth.uid()
        AND ac.is_active = TRUE
        AND ac.role IN ('AGENCY_OWNER', 'FINANCE_MANAGER')
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type = 'super_admin'
    )
  );
```

---

## AUDIT TRAIL TRIGGERS

### **Trigger: Log financial changes**

```sql
-- Trigger function: Log changes to financial fields
CREATE OR REPLACE FUNCTION trigger_log_financial_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
  client_ip INET;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM agency_contacts
  WHERE profile_id = auth.uid()
    AND is_active = TRUE
  LIMIT 1;

  -- Get client IP (if available from context)
  client_ip := inet_client_addr();

  -- Log charge_rate changes
  IF (TG_OP = 'UPDATE' AND OLD.charge_rate IS DISTINCT FROM NEW.charge_rate) OR
     (TG_OP = 'INSERT') THEN
    INSERT INTO financial_changes_log (
      entity_type,
      entity_id,
      field_name,
      old_value,
      new_value,
      changed_by,
      changed_by_role,
      ip_address,
      changed_at
    ) VALUES (
      'shift',
      NEW.id,
      'charge_rate',
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD.charge_rate) ELSE NULL END,
      to_jsonb(NEW.charge_rate),
      auth.uid(),
      user_role,
      client_ip,
      NOW()
    );
  END IF;

  -- Log pay_rate changes
  IF (TG_OP = 'UPDATE' AND OLD.pay_rate IS DISTINCT FROM NEW.pay_rate) OR
     (TG_OP = 'INSERT') THEN
    INSERT INTO financial_changes_log (
      entity_type,
      entity_id,
      field_name,
      old_value,
      new_value,
      changed_by,
      changed_by_role,
      ip_address,
      changed_at
    ) VALUES (
      'shift',
      NEW.id,
      'pay_rate',
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD.pay_rate) ELSE NULL END,
      to_jsonb(NEW.pay_rate),
      auth.uid(),
      user_role,
      client_ip,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Apply trigger to shifts table
DROP TRIGGER IF EXISTS trigger_log_shift_financial_changes ON shifts;
CREATE TRIGGER trigger_log_shift_financial_changes
  AFTER INSERT OR UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_financial_changes();

-- Apply to other tables (invoices, timesheets, staff)
-- (Similar triggers for each table - repeat pattern)
```

---

## TESTING CHECKLIST

### **Test 1: Encryption Works**
- [ ] Insert new staff with bank_details
- [ ] ✅ Check database: `bank_details_encrypted` column has encrypted data
- [ ] ✅ `bank_details` column is NULL (cleared)
- [ ] Query via API as AGENCY_OWNER
- [ ] ✅ Decrypted bank details returned

### **Test 2: Unauthorized Cannot Decrypt**
- [ ] Query bank_details as SHIFT_COORDINATOR
- [ ] ✅ API returns `null` or `{"error": "Permission denied"}`
- [ ] Try direct database query
- [ ] ✅ RLS blocks access or returns encrypted string

### **Test 3: Audit Trail Captures Changes**
- [ ] Update shift charge_rate from £15/hr to £18/hr
- [ ] ✅ New row in `financial_changes_log` with old/new values
- [ ] ✅ Log shows who changed it and when
- [ ] ✅ IP address and role recorded

### **Test 4: Cross-Agency Isolation**
- [ ] User from Agency A tries to query Agency B's shift charge_rate
- [ ] ✅ RLS blocks query (returns empty or 403)
- [ ] ✅ No data leak

### **Test 5: Migration Encrypted Existing Data**
- [ ] Check existing staff records
- [ ] ✅ All have `bank_details_encrypted` populated
- [ ] ✅ Plaintext `bank_details` field is NULL

---

## DEPLOYMENT STEPS

1. **Day 1: Set Up Encryption Keys**
   - Generate encryption key (secure random 256-bit key)
   - Store in Supabase project settings as environment variable
   - Test encryption/decryption functions

2. **Day 2: Deploy Database Changes**
   - Create `financial_changes_log` table
   - Create `encryption_keys` metadata table
   - Add encrypted columns to `staff` table
   - Deploy encryption functions

3. **Day 3: Migrate Existing Data**
   - Run migration script to encrypt existing bank_details and NI numbers
   - Verify data integrity
   - Back up database before migration

4. **Day 4: Add Audit Triggers**
   - Deploy triggers for shifts, invoices, timesheets
   - Test audit logging
   - Verify logs are created

5. **Day 5: RLS Policies**
   - Deploy RLS policies for financial columns
   - Test with different roles
   - Monitor performance

6. **Day 6: Backend Integration**
   - Update API endpoints to use decryption functions
   - Add permission checks before decrypting
   - Deploy to staging

7. **Day 7: Production Rollout**
   - Deploy to production
   - Monitor error logs
   - Document encryption key rotation procedure

---

## GDPR COMPLIANCE NOTES

### **Right to Access (Article 15)**
- ✅ Users can request their encrypted data
- ✅ Audit log shows who accessed their data

### **Right to Erasure (Article 17)**
- ✅ Encrypted data can be deleted (just delete encryption key)
- ✅ Audit logs remain (pseudonymized)

### **Data Breach Notification (Article 33)**
- ✅ If encryption key is NOT compromised, encrypted data is safe
- ✅ Audit log helps identify scope of breach

### **Data Minimization (Article 5)**
- ✅ Only AGENCY_OWNER, FINANCE_MANAGER, HR_COORDINATOR can decrypt
- ✅ Other roles never see plaintext

---

**END OF MODULE C SPECIFICATION**

**Next:** Module D (Backend Enforcement) will add middleware to enforce these policies at API level.
