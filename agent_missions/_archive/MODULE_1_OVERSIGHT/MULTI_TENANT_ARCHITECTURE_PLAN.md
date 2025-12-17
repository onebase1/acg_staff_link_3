# MULTI-TENANT ARCHITECTURE: One Email, Many Roles

**Date:** 2025-12-04
**Context:** Pre-MVP UAT - Safe to Make Strategic Changes
**Problem:** How to handle users belonging to multiple clients/agencies with UNIQUE email constraint
**Solution:** Junction Tables + Role-Based Context Switching

---

## 🎯 THE CORE CHALLENGE

### Current Supabase Constraint
```sql
auth.users.email → UNIQUE (enforced by Supabase, cannot be changed)
```

### Business Reality in Multi-Tenant SaaS
**One person can be:**
- 👥 Staff member for Agency A
- 👔 Admin for Agency B
- 📋 Client contact (Operations Manager) for Care Home X
- 💰 Client contact (Finance Manager) for Care Home Y
- 🏢 Owner of their own staffing agency (Agency C)

**Current Problem:**
If user exists with `jane@email.com`, system blocks them from being invited to a second organization.

---

## ✅ THE SOLUTION: Proven Junction Table Pattern

### Architecture Overview

```
auth.users (Supabase - ONE UNIQUE EMAIL)
    ↓
profiles (1-to-1 with auth.users)
    ↓
    ├─→ agency_contacts (many-to-many: 1 user → many agencies with roles)
    ├─→ client_contacts (many-to-many: 1 user → many clients with roles)
    └─→ staff (many-to-many: 1 user → many agencies as staff)
```

**Key Principle:**
- ONE email = ONE `auth.users` account
- MULTIPLE organizational relationships via junction tables
- Each relationship has its own role/permissions
- User switches context to change which "hat" they're wearing

---

## 📊 DATABASE SCHEMA

### Already Built (Module 1)
```sql
-- ✅ EXISTS: Client contacts (Module 1)
CREATE TABLE client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  role TEXT NOT NULL DEFAULT 'OPERATIONS_MANAGER',
  -- OPERATIONS_MANAGER, FINANCE_MANAGER, FACILITY_COORDINATOR, VIEW_ONLY_CONTACT

  is_primary_contact BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_profile_per_client UNIQUE (client_id, profile_id)
);
```

### Needs to Be Built (Module A - Future)
```sql
-- ⏳ TODO: Agency contacts (Module A)
CREATE TABLE agency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  role TEXT NOT NULL DEFAULT 'SHIFT_COORDINATOR',
  -- AGENCY_OWNER, OPERATIONS_DIRECTOR, FINANCE_MANAGER,
  -- HR_COORDINATOR, SHIFT_COORDINATOR, COMPLIANCE_OFFICER

  pay_rate DECIMAL(10,2),  -- Different rate per agency
  is_primary_agency BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_profile_per_agency UNIQUE (agency_id, profile_id)
);
```

### Already Exists
```sql
-- ✅ EXISTS: Staff records
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  agency_id UUID REFERENCES agencies(id),
  -- Staff can work for multiple agencies via multiple rows
  -- (Currently limited by profiles.agency_id, but will migrate)
);
```

---

## 🔄 INVITATION FLOW: Handling Existing Users

### Scenario 1: Email Already Exists in auth.users

**Example:**
- Jane Smith (jane@email.com) is already a staff member for Agency A
- Agency B admin tries to invite jane@email.com as their Finance Manager

**Current Broken Flow:**
1. Agency B admin enters jane@email.com
2. System tries: `supabaseAuth.signUp(jane@email.com, tempPassword)`
3. ❌ ERROR: "Email already registered"
4. Admin gets error, Jane never gets invitation
5. **BROKEN UX**

**NEW CORRECT FLOW:**

```javascript
async function inviteUserToAgency(email, agencyId, role) {
  // Step 1: Check if email exists in auth.users
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (existingUser) {
    // ✅ USER EXISTS - Add agency relationship
    console.log('✅ User exists, adding new agency relationship');

    // Step 2: Check if they're ALREADY linked to this agency
    const { data: existingContact } = await supabase
      .from('agency_contacts')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('profile_id', existingUser.id)
      .single();

    if (existingContact) {
      // User already has a relationship with this agency
      if (existingContact.is_active) {
        toast.error(`${email} is already a member of your agency as ${existingContact.role}`);
        return { error: 'User already exists in this agency' };
      } else {
        // Reactivate old relationship
        await supabase
          .from('agency_contacts')
          .update({ is_active: true, role, updated_at: new Date() })
          .eq('id', existingContact.id);

        toast.success(`✅ Reactivated ${email} as ${role}`);
        return { success: true, reactivated: true };
      }
    }

    // Step 3: Create new agency relationship (user will now have 2+ agencies)
    const { error: contactError } = await supabase
      .from('agency_contacts')
      .insert({
        agency_id: agencyId,
        profile_id: existingUser.id,
        role: role,
        is_active: true
      });

    if (contactError) throw contactError;

    // Step 4: Send notification email (NOT signup email)
    await sendAddedToAgencyEmail({
      to: email,
      agencyName: currentAgency.name,
      role: role,
      loginUrl: `${window.location.origin}/login`
    });

    toast.success(`✅ ${email} added to your agency as ${role}`);
    return { success: true, existingUser: true };

  } else {
    // ❌ USER DOESN'T EXIST - Create new auth account
    console.log('🆕 New user, creating auth account');

    // Step 5: Create auth.users account
    const tempPassword = generateSecurePassword();
    const { data: newAuthUser, error: signUpError } = await supabaseAuth.signUp(
      email,
      tempPassword
    );

    if (signUpError) throw signUpError;

    // Step 6: Create profile
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newAuthUser.user.id,
        email: email,
        user_type: 'agency_admin',  // Or determine based on role
        agency_id: agencyId,  // Set primary agency
      })
      .select()
      .single();

    if (profileError) throw profileError;

    // Step 7: Create agency relationship
    await supabase
      .from('agency_contacts')
      .insert({
        agency_id: agencyId,
        profile_id: newProfile.id,
        role: role,
        is_primary_agency: true,
        is_active: true
      });

    // Step 8: Send welcome email with password reset link
    await sendWelcomeEmail({
      to: email,
      agencyName: currentAgency.name,
      resetPasswordUrl: `${window.location.origin}/reset-password`
    });

    toast.success(`✅ Invitation sent to ${email}`);
    return { success: true, newUser: true };
  }
}
```

---

## 🎨 USER EXPERIENCE: Context Switching

### Problem: Jane Has 3 Organizational Roles

Jane logs in with `jane@email.com` and password.

**Her relationships:**
1. Staff member for Agency A
2. Finance Manager for Agency B
3. Operations Manager for Care Home X

**UI Solution: Context Switcher**

```jsx
// In navigation header
<ContextSwitcher currentUser={jane}>
  <option value="staff-agency-a">
    🏥 Agency A - Staff Member
  </option>
  <option value="admin-agency-b">
    👔 Agency B - Finance Manager
  </option>
  <option value="client-care-home-x">
    📋 Care Home X - Operations Manager
  </option>
</ContextSwitcher>
```

**Behavior:**
1. Jane selects "Agency B - Finance Manager"
2. `localStorage.setItem('active_context', 'admin-agency-b')`
3. Page refreshes
4. Layout loads → Checks active context → Shows admin navigation
5. All queries filtered by: `agency_id = agency-b`
6. Role badge shows: "FINANCE_MANAGER"
7. Sidebar shows finance-specific links

**When she switches to "Care Home X":**
1. Selects different context
2. Page refreshes
3. Layout shows CLIENT portal navigation
4. Queries filtered by: `client_id = care-home-x`
5. Role badge shows: "OPERATIONS_MANAGER"
6. Sidebar shows client portal links

---

## 👔👷 HYBRID ROLES: Admin Who Also Works Shifts

### Real-World Scenario (Dominion Healthcare)

**Common in healthcare staffing:**
- Agency admin works 3 days/week as admin (scheduling, invoicing)
- SAME person works 3 days/week as care staff (HCA, Senior Carer)
- Needs BOTH admin portal AND staff portal access
- Uses SAME email for both roles

### ❌ What NOT to Do (Overcomplicated)

```
WRONG APPROACH:
- Force admin to use john@dominionhealthcare.com for admin role
- Force same person to use john.personal@gmail.com for staff role
- Two separate auth.users accounts
- Two different logins to remember
- Confusion when switching contexts
```

**Problems:**
- User has to remember which email for which role
- Password reset nightmare (which account?)
- Recruitment agencies DON'T provide emails to temp staff anyway
- Mobile app (GPS clock-in) needs persistent personal email
- When employment ends, agency email is revoked

### ✅ The Correct Solution (Junction Tables)

```sql
-- John Smith exists ONCE in auth.users
auth.users:
  email: john@gmail.com  -- Personal email (persistent)

-- John has BOTH roles for Dominion Healthcare
agency_contacts:
  profile_id: john-id
  agency_id: dominion-id
  role: 'AGENCY_ADMIN'

staff:
  user_id: john-id
  agency_id: dominion-id
  role: 'healthcare_assistant'
```

**UI Experience:**
```jsx
<ContextSwitcher currentUser={john}>
  <option value="admin-dominion">
    👔 Dominion Healthcare - Agency Admin
  </option>
  <option value="staff-dominion">
    👷 Dominion Healthcare - Healthcare Assistant
  </option>
</ContextSwitcher>
```

**What John Sees:**

**When in "Agency Admin" context:**
- Admin dashboard with financials
- Shift scheduling tools
- Invoice generation
- Analytics & reports
- Client management
- Staff management

**When in "Staff Member" context:**
- Staff portal (shift marketplace)
- GPS clock-in/clock-out
- My shifts calendar
- My timesheets
- My compliance documents
- No access to financial data

**Same person, same login, different permissions based on active context.**

---

## 📧 EMAIL POLICY: What You Should (and Shouldn't) Enforce

### What You're Asking:
> "Should we enforce agency domain emails for admins (e.g., admin@dominionhealthcare.com)?"
> "Big GDPR risk if admins use personal emails?"

### The Answer: **DON'T Enforce Email Domain Rules**

#### Reasons:

**1. GDPR is About Access Control, Not Email Domains**

```
GDPR Risk = Wrong person sees sensitive data
✅ SOLVED BY: RBAC roles + RLS policies
❌ NOT SOLVED BY: Email domain requirements

Example:
- john@dominionhealthcare.com with SHIFT_COORDINATOR role
  → CAN'T see financial data (RBAC blocks)

- john@gmail.com with FINANCE_MANAGER role
  → CAN see financial data (RBAC allows)

The EMAIL DOMAIN is irrelevant. The ROLE determines access.
```

**2. Recruitment Reality: Temp Staff Don't Get Agency Emails**

```
✅ Permanent staff at large organizations: name@nhs.uk
❌ Temp recruitment workers: No agency provides emails
✅ Freelance coordinators: Use personal emails
❌ Expecting agency email: Unrealistic for staffing industry
```

**3. Mobile App Requires Persistent Email**

```
Scenario: Sarah works as temp HCA for 3 agencies
- Uses sarah@gmail.com for ACG StaffLink
- Works for Agency A (Jan-Mar)
- Works for Agency B (Apr-Jun)
- Works for Agency C (Jul-Sep)

If she used agency email:
❌ sarah@agencyA.com → Revoked when contract ends
❌ Loses access to her timesheet history
❌ Can't download P60 at tax year end
❌ GPS tracking data lost

With personal email:
✅ sarah@gmail.com → Persistent across all agencies
✅ Full employment history in one account
✅ Can switch between active agencies
✅ Deactivated relationships preserved for records
```

**4. You Shouldn't Tell Agencies How to Run Their Business**

```
Some agencies will:
- Provide domain emails to admins (e.g., large NHS trusts)
- Use personal emails for everyone (e.g., small care homes)
- Mix of both (owner uses domain, coordinators use personal)

Your job: Provide secure platform with RBAC
Not your job: Dictate internal IT policies
```

### What You SHOULD Enforce

**✅ DO Enforce:**
1. **Role-based permissions** (RBAC)
   - Finance Manager can't see data they shouldn't
   - Enforced by database RLS policies

2. **Multi-factor authentication** (Optional - Post-MVP)
   - For users with elevated permissions
   - Regardless of email domain

3. **Audit logging**
   - Who accessed what data when
   - Traceability for GDPR compliance

4. **Strong password requirements**
   - Minimum complexity
   - Regular rotation reminders

**❌ DON'T Enforce:**
1. Email domain rules (unrealistic for staffing industry)
2. Corporate email requirements (not your business)
3. Separate emails for different roles (junction tables solve this)

### Best Practice Recommendations (Not Requirements)

**In your Terms of Service / Onboarding Guide:**

```markdown
## Recommended Email Practices

For agency owners/admins, we recommend:
- ✅ Using a dedicated work email (e.g., admin@youragency.com)
- ✅ Enabling two-factor authentication for sensitive roles
- ✅ Separate accounts for personal vs business use (optional)

For temp staff, you should:
- ✅ Use a personal email you'll have long-term access to
- ✅ Not use agency-provided emails (they may be revoked)
- ✅ Use an email you can access on mobile devices

However, our platform supports:
- ✅ Any valid email address
- ✅ One email, multiple organizational roles
- ✅ Role-based access control regardless of email domain
```

**But don't BLOCK users who don't follow these recommendations.**

---

## 🔍 GDPR Compliance: How We Actually Achieve It

### GDPR Risk Scenarios

**Scenario 1: Finance Manager Leaves Company**
```
❌ WRONG: Delete their auth.users account
  → Breaks audit trail
  → Historical invoices show "Deleted User"
  → GDPR violation (data retention for accounting)

✅ CORRECT: Deactivate relationship
  UPDATE agency_contacts
  SET is_active = FALSE
  WHERE profile_id = 'user-id' AND agency_id = 'agency-id';

  → User can't login to agency portal
  → Historical records intact
  → Audit trail preserved
  → Can reactivate if they return
```

**Scenario 2: User Works for Competitor Agency**
```
Sarah is Finance Manager for Agency A (your client)
Sarah is ALSO Finance Manager for Agency B (competitor)

❌ WRONG: Block her from having both roles
  → Freelance coordinators common in industry
  → Unrealistic restriction

✅ CORRECT: RLS ensures data isolation
  -- Sarah can ONLY see Agency A data when in Agency A context
  -- Sarah can ONLY see Agency B data when in Agency B context
  -- Cross-agency data leakage IMPOSSIBLE due to RLS
```

**Scenario 3: Admin Uses Personal Gmail**
```
John uses john@gmail.com as admin for Dominion

Is this a GDPR risk? NO.

Why?
- RBAC limits what John can see (based on role, not email)
- RLS prevents him seeing other agencies' data
- Audit log tracks all his actions
- If compromised → Deactivate his account
- Email domain is IRRELEVANT to data security

What matters:
✅ Strong password
✅ 2FA enabled (optional but recommended)
✅ Proper role assignment
✅ RLS policies enforced
❌ Email domain (cosmetic, not security)
```

### GDPR Compliance Checklist

**✅ We Handle:**
- Row-Level Security (RLS) prevents cross-agency data access
- Role-Based Access Control (RBAC) limits feature access
- Audit logging tracks all data access
- Right to erasure (deactivate + anonymize on request)
- Data portability (export user's data)
- Consent management (documented in profiles table)

**✅ Agency Handles:**
- Their own internal IT policies
- Email domain choices
- Employee onboarding/offboarding
- Contract terms with staff

**❌ Not Our Responsibility:**
- Dictating which email domains agencies use
- Enforcing corporate IT policies
- Managing agency's internal security posture

---

## 🔐 SECURITY: Row Level Security (RLS)

### Agency Data Protection

```sql
-- ✅ Agency dashboard: User can ONLY see agencies they're linked to
CREATE POLICY agency_contacts_select ON agency_contacts
FOR SELECT USING (
  profile_id = auth.uid()
);

-- ✅ Shifts: User can ONLY see shifts for agencies they're linked to
CREATE POLICY shifts_select ON shifts
FOR SELECT USING (
  agency_id IN (
    SELECT agency_id FROM agency_contacts
    WHERE profile_id = auth.uid() AND is_active = TRUE
  )
);

-- ✅ Financial data: ONLY if user has AGENCY_OWNER or FINANCE_MANAGER role
CREATE POLICY invoices_select ON invoices
FOR SELECT USING (
  agency_id IN (
    SELECT agency_id FROM agency_contacts
    WHERE profile_id = auth.uid()
      AND is_active = TRUE
      AND role IN ('AGENCY_OWNER', 'FINANCE_MANAGER')
  )
);
```

### Client Data Protection

```sql
-- ✅ Client portal: User can ONLY see clients they're linked to
CREATE POLICY client_contacts_select ON client_contacts
FOR SELECT USING (
  profile_id = auth.uid()
);

-- ✅ Timesheets: Only for clients user manages
CREATE POLICY timesheets_select_client ON timesheets
FOR SELECT USING (
  client_id IN (
    SELECT client_id FROM client_contacts
    WHERE profile_id = auth.uid() AND is_active = TRUE
  )
);
```

---

## 📝 PROFILES TABLE: Minimal Changes

### Current Schema
```sql
profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  user_type TEXT,  -- 'staff_member', 'client_user', 'agency_admin'
  agency_id UUID,  -- ⚠️ LEGACY: Keep for backward compatibility
  client_id UUID,  -- ⚠️ LEGACY: Keep for backward compatibility
  ...
)
```

### Recommended Updates
```sql
ALTER TABLE profiles
ADD COLUMN primary_context TEXT;
-- Values: 'staff', 'agency', 'client'
-- Determines default landing page after login

ALTER TABLE profiles
ADD COLUMN active_agency_id UUID REFERENCES agencies(id);
-- Currently selected agency (if in agency context)

ALTER TABLE profiles
ADD COLUMN active_client_id UUID REFERENCES clients(id);
-- Currently selected client (if in client context)
```

**Keep Legacy Columns:**
- `agency_id` → Keep as "primary agency" (for single-agency users)
- `client_id` → Keep as "primary client" (for single-client users)
- Don't break existing code during migration

---

## 🚀 MIGRATION PATH (Pre-MVP Safe)

### Phase 1: Backfill Junction Tables ✅
```sql
-- Backfill client_contacts from existing profiles
INSERT INTO client_contacts (client_id, profile_id, role, is_primary_contact)
SELECT
  p.client_id,
  p.id,
  'OPERATIONS_MANAGER',  -- Default role
  TRUE
FROM profiles p
WHERE p.client_id IS NOT NULL
  AND p.user_type = 'client_user'
  AND NOT EXISTS (
    SELECT 1 FROM client_contacts cc WHERE cc.profile_id = p.id
  );
```

### Phase 2: Update Invitation Logic
- Modify `InviteClientModal.jsx` (already exists)
- Modify future `InviteAgencyAdminModal.jsx` (Module A)
- Add email existence check BEFORE creating auth.users
- If exists → add relationship, send "added to organization" email
- If new → create auth + send welcome email

### Phase 3: Add Context Switcher UI
```jsx
// In Layout.jsx header
{(userAgencies.length > 1 || userClients.length > 1) && (
  <ContextSwitcher
    agencies={userAgencies}
    clients={userClients}
    activeContext={activeContext}
    onSwitch={handleContextSwitch}
  />
)}
```

### Phase 4: Update All Queries
- Replace `WHERE agency_id = user.agency_id`
- With: `WHERE agency_id IN (SELECT agency_id FROM agency_contacts WHERE profile_id = user.id)`

### Phase 5: Test Multi-Tenant Scenarios
- User with 1 agency → No switcher, works like before
- User with 2 agencies → Switcher shows, can toggle
- User with agency + client role → Can switch between portals
- RLS policies prevent data leakage

---

## 🌍 REAL-WORLD EXAMPLE

### Before (Broken)

**Scenario:** Sarah works as staff for Care Agency A.
**Action:** Care Home X tries to invite sarah@email.com as their Operations Manager.
**Result:** ❌ ERROR - "Email already registered"
**Outcome:** Care Home can't invite her. She needs a DIFFERENT email address. Bad UX.

### After (Fixed)

**Scenario:** Sarah works as staff for Care Agency A (sarah@email.com).
**Action:** Care Home X invites sarah@email.com as Operations Manager.

**Flow:**
1. System checks: Email exists? ✅ Yes
2. System checks: Already linked to Care Home X? ❌ No
3. System creates `client_contacts` relationship:
   ```sql
   INSERT INTO client_contacts (client_id, profile_id, role)
   VALUES ('care-home-x', 'sarah-profile-id', 'OPERATIONS_MANAGER');
   ```
4. System sends email:
   ```
   Subject: You've been added to Care Home X

   Hi Sarah,

   You've been added to Care Home X as Operations Manager.

   Login at: https://app.acgstafflink.com/login

   Use your existing email (sarah@email.com) and password.

   After logging in, use the context switcher in the top-right to
   switch between your roles:
   - Staff Member (Care Agency A)
   - Operations Manager (Care Home X)
   ```

5. Sarah logs in → Sees context switcher → Can switch between roles seamlessly

---

## 🎓 BEST PRACTICES FROM MAJOR SAAS PLATFORMS

### How Slack Handles This
- One email = one Slack account
- Can belong to 100+ workspaces
- Workspace switcher in sidebar
- Each workspace has different role (admin, member, guest)

### How GitHub Handles This
- One email = one GitHub account
- Can be owner of Organization A
- Member of Organization B
- Collaborator on 50 repositories
- Context switches via org dropdown

### How Google Workspace Handles This
- One email = one Google account
- Can be admin of Domain A
- User in Domain B
- Editor on shared Drive C
- Permission model: Role-based per resource

**Our Pattern:**
- One email = one ACG StaffLink account
- Can be staff for Agency A
- Admin for Agency B
- Client contact for Care Home X
- Context switcher to toggle between roles

---

## ⚠️ EDGE CASES & SOLUTIONS

### Edge Case 1: User Deactivated Then Re-Invited

**Scenario:** John was Finance Manager at Agency X, got deactivated (left company).
6 months later, Agency X tries to invite him again.

**Solution:**
```javascript
const { data: existingContact } = await supabase
  .from('agency_contacts')
  .select('*')
  .eq('agency_id', agencyId)
  .eq('profile_id', existingUser.id)
  .single();

if (existingContact && !existingContact.is_active) {
  // Reactivate instead of creating new
  await supabase
    .from('agency_contacts')
    .update({ is_active: true, role: newRole })
    .eq('id', existingContact.id);

  toast.success('User reactivated!');
}
```

### Edge Case 2: User Changes Email

**Scenario:** Sarah changes her email from sarah@oldcompany.com → sarah@gmail.com

**Solution:**
```javascript
// Update auth.users.email (Supabase handles this)
await supabase.auth.updateUser({ email: newEmail });

// ✅ Junction tables use profile_id (not email)
// All relationships automatically preserved
// No manual updates needed!
```

### Edge Case 3: User Invited to Same Agency Twice

**Scenario:** Admin accidentally invites jane@email.com twice.

**Solution:**
```sql
-- Database constraint prevents duplicates
CONSTRAINT unique_profile_per_agency UNIQUE (agency_id, profile_id)
```

```javascript
// Code handles gracefully
if (existingContact && existingContact.is_active) {
  toast.error('User is already a member of this agency');
  return;
}
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Immediate (Module 1 - Already Done)
- [x] Create `client_contacts` table
- [x] Backfill from `profiles.client_id`
- [x] Update `InviteClientModal.jsx` to check for existing emails
- [x] Test: Invite existing user to second client

### Short-Term (Next Sprint)
- [ ] Add context switcher component to Layout.jsx
- [ ] Store `active_context` in localStorage
- [ ] Update queries to respect active context
- [ ] Add RLS policies for multi-client access

### Medium-Term (Module A)
- [ ] Create `agency_contacts` table
- [ ] Backfill from `profiles.agency_id`
- [ ] Update agency admin invitation flow
- [ ] Test: User with staff role + admin role

### Long-Term (Post-MVP)
- [ ] Migrate all queries from `profiles.agency_id` to `agency_contacts`
- [ ] Deprecate `profiles.agency_id` (keep as legacy pointer)
- [ ] Build advanced permission matrix (role + resource level)
- [ ] Analytics: Track context switching patterns

---

## 📚 FILES TO CREATE/MODIFY

### New Components
```
src/components/
├── ContextSwitcher.jsx         # Dropdown to switch between roles
└── contexts/
    └── UserContextProvider.jsx # Global state for active context
```

### Modify Existing
```
src/pages/
├── Layout.jsx                  # Add context switcher to header
└── ProfileSetup.jsx            # Handle multi-context users

src/components/clients/
└── InviteClientModal.jsx       # ✅ Already has email check logic

src/api/
└── supabaseEntities.js         # Add UserContext helper methods
```

### Database Migrations
```sql
migrations/
├── 001_create_client_contacts.sql   # ✅ Already applied
├── 002_create_agency_contacts.sql   # TODO: Module A
├── 003_backfill_contacts.sql        # TODO: Migration script
└── 004_add_rls_policies.sql         # TODO: Security
```

---

## 🎯 SUCCESS METRICS

### Technical
- ✅ One email can belong to 10+ organizations
- ✅ Zero duplicate auth.users entries
- ✅ Context switching takes <500ms
- ✅ RLS prevents cross-agency data leakage

### Business
- ✅ User can manage multiple clients from one login
- ✅ Freelance coordinators work for 3+ agencies seamlessly
- ✅ Multi-branch agencies consolidated under one platform
- ✅ No more "use different email" support tickets

### User Experience
- ✅ Clear context indicator in UI
- ✅ One-click context switching
- ✅ Permissions update instantly when switching
- ✅ Breadcrumbs show current organization

---

## 🚨 CRITICAL: What NOT to Do

### ❌ DON'T: Allow Multiple auth.users with Same Email
```javascript
// WRONG - Supabase will block this anyway
await supabase.auth.signUp(email, password);  // If email exists, fails
```

### ❌ DON'T: Use Email as Primary Key
```sql
-- WRONG - Breaks when user changes email
CREATE TABLE agency_contacts (
  user_email TEXT REFERENCES profiles(email)  -- BAD!
);

-- CORRECT - Use immutable user ID
CREATE TABLE agency_contacts (
  profile_id UUID REFERENCES profiles(id)     -- GOOD!
);
```

### ❌ DON'T: Store Context in Database User-Type
```javascript
// WRONG - User can't have multiple types
user.user_type = 'staff_member';  // What if also admin?
user.user_type = 'agency_admin';  // Overwrites previous!

// CORRECT - User can have multiple roles across organizations
user.agency_contacts = [
  { agency: 'A', role: 'STAFF' },
  { agency: 'B', role: 'ADMIN' }
];
```

---

## 📖 FURTHER READING

**Internal Docs:**
- [agents workspace/RBAC_PLATFORM_WIDE/MULTI_AGENCY_SCALABILITY_UPDATE.md](C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3\agents workspace\RBAC_PLATFORM_WIDE\MULTI_AGENCY_SCALABILITY_UPDATE.md)
- [agents workspace/RBAC_PLATFORM_WIDE/MODULE_A_AGENCY_RBAC.md](C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3\agents workspace\RBAC_PLATFORM_WIDE\MODULE_A_AGENCY_RBAC.md)

**External References:**
- Supabase Multi-Tenancy Guide: https://supabase.com/docs/guides/auth/managing-user-data
- Slack's Multi-Workspace Architecture (Case Study)
- GitHub Organizations Permission Model
- AWS IAM Multi-Account Strategy

---

## ✅ CONCLUSION

**The Solution is Simple:**
- ✅ Keep `auth.users.email` UNIQUE (Supabase requirement)
- ✅ Use junction tables for many-to-many relationships
- ✅ Check email existence BEFORE creating auth account
- ✅ If exists → add relationship, send notification
- ✅ If new → create auth + send welcome email
- ✅ Add context switcher UI for multi-role users

**Benefits:**
- ✅ No architectural changes needed (pattern already proven in Module 1)
- ✅ Backward compatible (existing users unaffected)
- ✅ Scales to enterprise (100+ organizations per user)
- ✅ Modern SaaS pattern (Slack, GitHub, Google all do this)

**Ready for Implementation:**
- Module 1 already has this for `client_contacts` ✅
- Module A will replicate for `agency_contacts` ⏳
- Context switcher UI can be built in 2-3 hours

---

## 🌐 URL ROUTING STRATEGIES FOR MULTI-TENANT PORTALS

**Date Added:** 2025-12-19
**Context:** Staff can belong to multiple agencies - how do email links route to correct agency?

### The Problem

When sending email notifications with links to `/staffportal`, how does the system know **which agency context** the staff member should land in?

**Example:**
- Sarah works for Agency A and Agency B
- Agency B sends her an email: "New shift assigned - View in Staff Portal"
- Link: `https://app.acgstafflink.com/staffportal?highlight=shift-123`
- **Question:** Should she see Agency A or Agency B's shifts when she clicks?

### ❌ Approach 1: Agency Subdomain (NOT RECOMMENDED for Your Use Case)

```
https://agency-a.acgstafflink.com/staffportal
https://agency-b.acgstafflink.com/staffportal
https://care-home-x.acgstafflink.com/clientportal
```

**How It Works:**
- Each agency gets their own subdomain
- DNS routes subdomain to same application
- App detects subdomain and sets agency context
- Used by: **Shopify**, **Atlassian**, **Zendesk**

**Pros:**
- ✅ Clean branding (agency sees "their" URL)
- ✅ Agency context is explicit in URL
- ✅ Easy to bookmark specific agency

**Cons:**
- ❌ Requires wildcard SSL certificate (`*.acgstafflink.com`)
- ❌ Complex DNS configuration
- ❌ Hard to switch contexts (different domains)
- ❌ Cookies don't work across subdomains
- ❌ **Breaks multi-agency staff UX** (Sarah has 2 bookmarks, 2 logins?)

**Verdict:** ❌ **Don't use this.** Your staff work for MULTIPLE agencies - subdomains make context switching painful.

---

### ❌ Approach 2: Path-Based Routing (LEGACY PATTERN)

```
https://app.acgstafflink.com/agency-a/staffportal
https://app.acgstafflink.com/agency-b/staffportal
https://app.acgstafflink.com/care-home-x/clientportal
```

**How It Works:**
- Agency name/slug in URL path
- React Router reads path to determine context
- Used by: **GitHub** (github.com/org-name/repo), **Trello** (trello.com/board-id)

**Pros:**
- ✅ Agency context explicit in URL
- ✅ Easy to implement with React Router
- ✅ No DNS complexity
- ✅ Works with standard SSL

**Cons:**
- ❌ Ugly URLs for multi-tenant users
- ❌ User must remember agency slug
- ❌ Context switching requires navigation to different path
- ❌ Hard to share "generic" staff portal link

**Verdict:** ❌ **Outdated pattern.** Modern SaaS uses dynamic context switching instead.

---

### ✅ Approach 3: Query Parameter Context Hint (RECOMMENDED)

```
Email Link (with hint):
https://app.acgstafflink.com/staffportal?agency=agency-b&highlight=shift-123

Generic Link (user chooses):
https://app.acgstafflink.com/staffportal
```

**How It Works:**
1. Email includes `?agency=agency-b` query param
2. StaffPortal component reads query param on load
3. If user has access to Agency B → Auto-switch to that context
4. If user doesn't have access → Ignore hint, use default context
5. User can always manually switch contexts via UI switcher

**Implementation:**

```javascript
// In StaffPortal.jsx
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const requestedAgencyId = urlParams.get('agency');

  if (requestedAgencyId) {
    // Check if user has access to this agency
    const hasAccess = userAgencies.some(a => a.id === requestedAgencyId);

    if (hasAccess && activeContext !== requestedAgencyId) {
      // Auto-switch to requested agency
      setActiveContext(requestedAgencyId);
      localStorage.setItem('active_agency_id', requestedAgencyId);

      toast.info(`Switched to ${agencyName} portal`);
    } else if (!hasAccess) {
      // User doesn't have access - ignore hint
      console.warn('User does not have access to requested agency');
      toast.warning('You do not have access to that agency');
    }
  }
}, [userAgencies, activeContext]);
```

**In NotificationService.jsx:**

```javascript
async notifyShiftAssignment({ staff, shift, client, agency }) {
  const portalUrl = `${window.location.origin}/staffportal?agency=${shift.agency_id}&highlight=${shift.id}`;

  // Email button links to:
  // https://app.acgstafflink.com/staffportal?agency=abc-123&highlight=shift-456

  // When staff clicks → Automatically switches to correct agency context
}
```

**Pros:**
- ✅ **Seamless UX:** Staff clicks email link → lands in correct agency
- ✅ **Graceful degradation:** If query param missing, uses default context
- ✅ **Security:** User must have actual access (checked server-side)
- ✅ **Shareable:** Can copy/paste link to colleague
- ✅ **Works with context switcher:** User can still manually switch
- ✅ **No DNS/SSL complexity**

**Cons:**
- ⚠️ URL hint can be ignored (user must have actual permissions)
- ⚠️ Not as "clean" as subdomain branding (but functionality > cosmetics)

**Verdict:** ✅ **RECOMMENDED.** This is the modern SaaS pattern.

**Used By:**
- **Slack:** `slack.com/app_redirect?channel=C12345&team=T67890`
- **Linear:** `linear.app/acme/issue/ENG-123` (with team context)
- **Notion:** `notion.so/workspace/page-id`

---

### ✅ Approach 4: Smart Context Detection (ADVANCED)

**Combine multiple signals to auto-detect correct context:**

```javascript
// Priority order for context detection:
function determineInitialContext(user, urlParams, localStorage, recentActivity) {
  // 1. URL hint (highest priority - user clicked specific link)
  if (urlParams.get('agency') && userHasAccess(urlParams.get('agency'))) {
    return urlParams.get('agency');
  }

  // 2. Highlighted entity (shift, timesheet, etc)
  if (urlParams.get('highlight')) {
    const entityAgency = await fetchEntityAgency(urlParams.get('highlight'));
    if (userHasAccess(entityAgency)) {
      return entityAgency;
    }
  }

  // 3. Last active context (localStorage)
  const lastActive = localStorage.getItem('active_agency_id');
  if (lastActive && userHasAccess(lastActive)) {
    return lastActive;
  }

  // 4. Primary agency (profiles.agency_id)
  if (user.agency_id && userHasAccess(user.agency_id)) {
    return user.agency_id;
  }

  // 5. First available agency (fallback)
  return userAgencies[0]?.id;
}
```

**Benefits:**
- ✅ Email links always work correctly (via URL hint)
- ✅ User returns to last-used context (via localStorage)
- ✅ Bookmarks remember context (via URL)
- ✅ New users get sensible default (primary agency)

---

### 🎯 RECOMMENDED IMPLEMENTATION FOR ACG STAFFLINK

**Phase 1: Add Query Param Support (Immediate)**

1. Update `NotificationService.jsx`:
```javascript
const portalUrl = `${window.location.origin}/staffportal?agency=${shift.agency_id}&highlight=${shift.id}`;
```

2. Update `StaffPortal.jsx`:
```javascript
// On component mount, read ?agency= param and auto-switch context
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const requestedAgencyId = urlParams.get('agency');

  if (requestedAgencyId && userAgencies.some(a => a.id === requestedAgencyId)) {
    switchContext(requestedAgencyId);
  }
}, []);
```

**Phase 2: Add Context Switcher UI (Short-Term)**

```jsx
// In Layout.jsx header
{userAgencies.length > 1 && (
  <Select
    value={activeAgencyId}
    onValueChange={(agencyId) => {
      switchContext(agencyId);
      // Update URL to reflect new context
      navigate(`/staffportal?agency=${agencyId}`);
    }}
  >
    {userAgencies.map(agency => (
      <SelectItem key={agency.id} value={agency.id}>
        {agency.name}
      </SelectItem>
    ))}
  </Select>
)}
```

**Phase 3: Smart Context Persistence (Medium-Term)**

- Store `active_agency_id` in `localStorage`
- Restore on next visit
- Override with URL `?agency=` param if present
- Track in analytics (see which agencies users switch to most)

---

### 🔒 SECURITY CONSIDERATIONS

**✅ DO:**
1. **Always verify permissions server-side**
   ```javascript
   // RLS policy prevents unauthorized access
   WHERE agency_id IN (
     SELECT agency_id FROM agency_contacts
     WHERE profile_id = auth.uid() AND is_active = TRUE
   )
   ```

2. **Validate agency_id from URL before switching**
   ```javascript
   const hasAccess = await supabase
     .from('agency_contacts')
     .select('id')
     .eq('agency_id', requestedAgencyId)
     .eq('profile_id', user.id)
     .eq('is_active', true)
     .single();

   if (!hasAccess) {
     toast.error('Access denied');
     return;
   }
   ```

3. **Log context switches for audit trail**
   ```javascript
   await supabase.from('audit_log').insert({
     user_id: user.id,
     action: 'context_switch',
     from_agency: oldAgencyId,
     to_agency: newAgencyId,
     timestamp: new Date()
   });
   ```

**❌ DON'T:**
1. **Trust URL params without verification**
   ```javascript
   // WRONG - anyone can edit URL to see other agencies
   const agencyId = urlParams.get('agency');
   fetchAgencyData(agencyId);  // ❌ No permission check!
   ```

2. **Allow cross-agency data leakage**
   ```javascript
   // WRONG - fetches ALL shifts, then filters client-side
   const allShifts = await fetchAllShifts();  // ❌ Leaks data
   const myShifts = allShifts.filter(s => s.agency_id === activeAgency);

   // CORRECT - RLS filters at database level
   const myShifts = await supabase
     .from('shifts')
     .select('*')
     .eq('agency_id', activeAgency);  // ✅ RLS enforces
   ```

---

### 📊 COMPARISON MATRIX

| Approach | Implementation Complexity | User Experience | Security | Multi-Agency Support | Recommendation |
|----------|---------------------------|-----------------|----------|---------------------|----------------|
| **Subdomain** (agency-a.app.com) | 🔴 High (DNS, SSL) | 🟡 Medium (different URLs) | 🟢 Good | 🔴 Poor | ❌ No |
| **Path-Based** (/agency-a/portal) | 🟡 Medium (routing) | 🔴 Poor (ugly URLs) | 🟢 Good | 🟡 Medium | ❌ No |
| **Query Param** (?agency=abc) | 🟢 Low (simple) | 🟢 Excellent | 🟢 Good (with validation) | 🟢 Excellent | ✅ **YES** |
| **Smart Detection** (combined) | 🟡 Medium (logic) | 🟢 Excellent | 🟢 Good | 🟢 Excellent | ✅ **Future** |

---

### ✅ IMPLEMENTATION CHECKLIST

**Immediate (This Sprint):**
- [ ] Update `NotificationService.jsx` to include `?agency=` param in portal links
- [ ] Add query param reader to `StaffPortal.jsx`
- [ ] Test: Multi-agency staff member clicks email link → Auto-switches to correct agency

**Short-Term (Next Sprint):**
- [ ] Build context switcher UI component
- [ ] Store active context in localStorage
- [ ] Add context indicator to page header
- [ ] Update all queries to respect active context

**Medium-Term (Post-MVP):**
- [ ] Implement smart context detection algorithm
- [ ] Add audit logging for context switches
- [ ] Analytics dashboard: Track context switching patterns
- [ ] Add "Set as default agency" feature

---

**Added by:** Claude Code
**Date:** 2025-12-19
**Status:** Recommendation - Awaiting User Approval
**Next Action:** User reviews URL routing strategy and approves implementation approach

---

**Prepared by:** Claude (Oversight Agent)
**Date:** 2025-12-04
**Status:** Ready for Review
**Next Action:** User reviews and approves architectural approach
