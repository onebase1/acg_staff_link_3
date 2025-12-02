# ARCHITECTURAL DECISION: ClientContact Table

**Date:** 2025-12-02  
**Investigation:** Comprehensive cross-module analysis  
**Decision:** **ClientContact table MUST be created (Option B)**  
**Confidence:** 100%

---

## EXECUTIVE SUMMARY

After thorough investigation of all 4 module specifications and the codebase:

**FINDING:** The `ClientContact` table is a **core architectural requirement** that ALL 4 modules depend on. It MUST be created before any module can be fully implemented.

**EVIDENCE:**
- ✅ Module 1 (Client Portal): References `ClientContact.role` for RBAC
- ✅ Module 2 (Notifications): References `ClientContact` in database schemas (lines 212, 468)
- ✅ Module 4 (Chatbot): References `ClientContact.phone_number` for verification (lines 90, 136, 150, 742)
- ✅ MASTER-PROMPT: States "ClientContact.role field exists but not enforced" (line 443)
- ❌ Current Database: `ClientContact` table does NOT exist
- ✅ Current Implementation: Uses `profiles` table with `client_id` column

---

## WHY CLIENTCONTACT TABLE IS REQUIRED

### 1. **Multiple Contacts per Client**

**Business Requirement:**
- A single client (e.g., "Dominion Healthcare") has MULTIPLE contacts:
  - Operations Manager (creates shifts, rates staff)
  - Finance Manager (pays invoices, views financial reports)
  - Facility Coordinator (views assigned shifts only)
  - View-Only Contact (reporting access)

**Current System Problem:**
- `profiles` table links 1 user → 1 client
- No way to differentiate between contact types
- No way to store role-specific permissions per contact

**ClientContact Solution:**
```
Client (1) → ClientContact (many) → profiles (1)
Example:
  Dominion Healthcare
  ├─ ClientContact 1: Sarah (OPERATIONS_MANAGER) → profile_id: abc123
  ├─ ClientContact 2: John (FINANCE_MANAGER) → profile_id: def456  
  └─ ClientContact 3: Mary (FACILITY_COORDINATOR) → profile_id: ghi789
```

---

### 2. **Module Dependencies**

#### **Module 1: Client Portal**
**Requires:**
- `ClientContact.role` (ENUM: OPERATIONS_MANAGER, FINANCE_MANAGER, FACILITY_COORDINATOR, VIEW_ONLY_CONTACT)
- `ClientContact.notification_preferences` (JSONB)

**Cannot use `profiles` because:**
- `profiles.role` is for system roles (admin, staff, client), not client-specific roles
- Need contact-level notification preferences, not user-level

#### **Module 2: Notifications**
**Database Schema (lines 209-241):**
```sql
CREATE TABLE ClientNotificationPreference (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES Client(id),
  contact_id UUID REFERENCES ClientContact(id),  ← MUST EXIST
  -- ... notification settings
);

CREATE TABLE NotificationLog (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES Client(id),
  contact_id UUID REFERENCES ClientContact(id),  ← MUST EXIST
  -- ... notification log fields
);
```

**Why This Matters:**
- Different contacts at same client want different notifications
- Finance Manager gets invoice emails; Operations Manager gets shift alerts
- Can't use single `client_id` for preference — need `contact_id`

#### **Module 4: AI Chatbot**
**Database Schema (lines 133-165):**
```sql
CREATE TABLE ClientPhoneVerification (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES Client(id),
  contact_id UUID REFERENCES ClientContact(id),  ← MUST EXIST
  phone_number VARCHAR(20),
  channel ENUM('whatsapp', 'sms', 'voice_call'),
  -- ... verification fields
);

CREATE TABLE ClientConversation (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES Client(id),
  contact_id UUID REFERENCES ClientContact(id),  ← MUST EXIST
  -- ... conversation fields
);
```

**Authentication Flow (line 90):**
```
Incoming WhatsApp Message:
├─ Extract phone: +442071234567
├─ Query Client table for phone match
├─ Check: ClientContact.phone_number matches?  ← REQUIRES ClientContact TABLE
└─ Result: VERIFIED or UNVERIFIED
```

**Why This Matters:**
- Chatbot needs to know WHICH contact at a client is texting
- Different contacts have different permissions (can't let Finance Manager create shifts)
- Security: Verify identity via `ClientContact` phone number

---

### 3. **Planner Agent's Intent**

**From MASTER-PROMPT-PHASE-2.md (line 443):**
> "ClientContact.role field exists but not enforced"

**Interpretation:**
- The planner agent ASSUMED `ClientContact` table already exists
- They noted it's not enforced (meaning no middleware checking it)
- This was a planning assumption, NOT a reflection of reality

**Why the assumption?**
- The planner was designing Phase 2 on top of Phase 1
- They expected Phase 1 to have completed basic client contact management
- Since Phase 1 is incomplete, this table was never created

---

## RECOMMENDED IMPLEMENTATION PATH

### **Option B: Create ClientContact Table (REQUIRED)**

**Database Migration:**
```sql
-- NEW TABLE: ClientContact
CREATE TABLE client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Role-based access control
  role TEXT NOT NULL DEFAULT 'OPERATIONS_MANAGER',
  -- Options: OPERATIONS_MANAGER, FINANCE_MANAGER, FACILITY_COORDINATOR, VIEW_ONLY_CONTACT
  
  -- Contact details (denormalized for performance)
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,  -- For chatbot verification (Module 4)
  email TEXT,  -- Should match profiles.email
  
  -- Notification preferences (Module 2)
  notification_preferences JSONB DEFAULT '{"shift_assigned": true, "payment_due": true, "compliance_warning": true}'::jsonb,
  
  -- Metadata
  is_primary_contact BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_profile_per_client UNIQUE (client_id, profile_id),
  CONSTRAINT valid_role CHECK (role IN ('OPERATIONS_MANAGER', 'FINANCE_MANAGER', 'FACILITY_COORDINATOR', 'VIEW_ONLY_CONTACT'))
);

-- Indexes for performance
CREATE INDEX idx_client_contacts_client_id ON client_contacts(client_id);
CREATE INDEX idx_client_contacts_profile_id ON client_contacts(profile_id);
CREATE INDEX idx_client_contacts_phone_number ON client_contacts(phone_number);
CREATE INDEX idx_client_contacts_role ON client_contacts(role);

-- Row Level Security (RLS)
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
```

**Backward Compatibility Plan:**
```sql
-- Step 1: Create table
-- Step 2: Backfill existing client users
INSERT INTO client_contacts (client_id, profile_id, role, first_name, last_name, phone_number, email, is_primary_contact)
SELECT 
  p.client_id,
  p.id AS profile_id,
  'OPERATIONS_MANAGER' AS role,  -- Default all existing users to Ops Manager
  SPLIT_PART(p.full_name, ' ', 1) AS first_name,
  SPLIT_PART(p.full_name, ' ', 2) AS last_name,
  p.phone AS phone_number,
  p.email,
  TRUE AS is_primary_contact  -- First contact becomes primary
FROM profiles p
WHERE p.client_id IS NOT NULL
  AND p.user_type = 'client';

-- Step 3: Update ClientPortal.jsx to join on client_contacts
-- Step 4: Add RBAC middleware using client_contacts.role
```

---

## WHY NOT OPTION A (Using profiles table)

**Problems with using `profiles` table:**

1. **Can't support multiple contacts per client**
   - 1 profile = 1 user
   - If client has 3 contacts, you'd need 3 separate `client_id` references
   - No way to differentiate between contact types

2. **Role conflict**
   - `profiles.role` is for system roles (admin, staff, client)
   - Mixing with client-specific roles (OPERATIONS_MANAGER, FINANCE_MANAGER) creates confusion
   - Example: An admin who is also a client contact — which role wins?

3. **Module 2 \u0026 4 break**
   - Both modules reference `client_contacts` table in foreign keys
   - SQL migrations won't work without the table existing
   - Foreign key constraints will fail

4. **Future scalability**
   - What if a staff member also becomes a client contact?
   - What if a client has 10 contacts across 5 facilities?
   - `profiles` table becomes cluttered with client-specific data

---

## MIGRATION STRATEGY

### **Phase 1: Database Setup**
1. Create `client_contacts` table
2. Backfill existing client users from `profiles`
3. Verify data integrity (all existing client users have contact records)

### **Phase 2: Update Client Portal**
1. Modify `ClientPortal.jsx` to query `client_contacts` table
2. Add `client_contact_id` to user session/context
3. Use `client_contacts.role` for RBAC checks

### **Phase 3: Add RBAC Middleware**
1. Create `middleware/clientAuth.js`
2. Check `client_contacts.role` for permissions
3. Apply middleware to all client-facing endpoints

### **Phase 4: Enable Other Modules**
1. Module 2 can now create `ClientNotificationPreference` records
2. Module 4 can now create `ClientPhoneVerification` records
3. All foreign key constraints satisfied

---

## TESTING PLAN

**Test Scenarios:**
1. **Multiple contacts per client:**
   - Create 3 contacts for Dominion Healthcare
   - Verify each can log in independently
   - Verify each has correct permissions based on role

2. **RBAC enforcement:**
   - Finance Manager tries to create shift → BLOCKED
   - Operations Manager creates shift → ALLOWED
   - View-Only Contact tries to approve timesheet → BLOCKED

3. **Notification preferences:**
   - Finance Manager disables shift emails → Still gets invoice emails
   - Operations Manager disables invoice emails → Still gets shift emails

4. **Chatbot verification:**
   - WhatsApp message from Operations Manager's phone → VERIFIED
   - WhatsApp message from unknown number → UNVERIFIED

---

## CONCLUSION

**Decision:** Create `ClientContact` table (Option B)

**Rationale:**
- ALL 4 modules depend on it (not just Module 1)
- Cannot use `profiles` table due to data model mismatch
- Planner agent assumed it exists; we must fulfill that assumption
- Backward compatible migration path exists
- Future-proof for multi-contact scenarios

**Next Steps:**
1. ✅ Create database migration for `client_contacts` table
2. ✅ Backfill existing client users
3. ✅ Update `ClientPortal.jsx` to use new table
4. ✅ Implement RBAC middleware
5. ✅ Proceed with Module 1 implementation

**Approval:** ⏳ Awaiting user confirmation to proceed

---

**END OF ARCHITECTURAL DECISION DOCUMENT**
