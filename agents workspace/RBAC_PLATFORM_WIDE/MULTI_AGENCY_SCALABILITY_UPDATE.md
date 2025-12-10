# 🌐 Multi-Agency Scalability - Documentation Update

**Date:** 2025-12-02
**Updated By:** AI Assistant (Module 1 testing session)
**Context:** User asked about scalability for staff/clients belonging to multiple agencies

---

## 📄 WHAT WAS UPDATED

### 1. **MODULE_A_AGENCY_RBAC.md**

**Added new section:** "MULTI-AGENCY ARCHITECTURE (TRUE MULTI-TENANCY)"

**Location:** After "BUSINESS JUSTIFICATION", before "ROLE DEFINITIONS"

**Content:**
- Explains why multi-agency support matters for scalability
- 3 real-world use cases (freelance coordinator, multi-branch agency, shared staff pool)
- Migration path from `profiles.agency_id` → `agency_contacts` table
- References Module 1's `client_contacts` as the proven pattern
- Benefits comparison table
- Backfill SQL for migrating existing users

**Key points for future agents:**
- `agency_contacts` table enables many-to-many relationships
- Users can have different roles per agency
- Different pay rates per agency relationship
- Keep `profiles.agency_id` for backward compatibility during migration
- UI should show agency switcher for multi-agency users

---

### 2. **README.md**

**Added new section:** "KEY SCALABILITY FEATURE: MULTI-AGENCY SUPPORT"

**Location:** At the top, before "FOLDER STRUCTURE"

**Purpose:** Highlight this as a major architectural feature for agents to understand upfront

**Updated checklist:**
- Week 2-3 renamed to "Agency RBAC + Multi-Agency Support"
- Added task: Update all code to query `agency_contacts` instead of `profiles.agency_id`
- Added task: Add agency switcher UI
- Added task: Test multi-agency user scenarios

---

## 🎯 WHY THIS MATTERS

### Current Architecture Problem

**Before Module A:**
```sql
-- profiles table (current)
profiles.agency_id UUID  -- Single value = 1 user → 1 agency ONLY
```

**Limitations:**
- ❌ Staff can't work for multiple agencies
- ❌ Agency admin can't manage multiple branches
- ❌ No freelance coordinator model
- ❌ Not true multi-tenant SaaS

### After Module A Implementation

**New architecture:**
```sql
-- agency_contacts table (new)
agency_contacts (
  agency_id UUID,        -- Which agency
  profile_id UUID,       -- Which user
  role TEXT,             -- Role for THIS agency
  -- One user can have multiple rows = multiple agencies
  CONSTRAINT unique_profile_per_agency UNIQUE (agency_id, profile_id)
)
```

**Benefits:**
- ✅ 1 user → Many agencies
- ✅ Different role per agency
- ✅ Different pay rate per agency
- ✅ True multi-tenant SaaS model
- ✅ Freelance workers fully supported

---

## 📚 REFERENCE: MODULE 1 ALREADY PROVED THIS WORKS

**Module 1 Client Portal** (created Dec 2, 2025):
- Built `client_contacts` table with exact same pattern
- Enables client users to manage multiple facilities with different roles
- Successfully tested during Module 1 UAT
- Bug found and fixed: ProfileSetup validation didn't account for client_user data model

**Lessons learned from Module 1:**
1. Different user types = different data models
2. Validation logic must be user_type-aware
3. Null values have meaning (e.g., `agency_id = null` for client users is correct)
4. Many-to-many pattern scales better than single-valued foreign keys

---

## 🔄 MIGRATION STRATEGY

### Phase 1: Create New Table (No Breaking Changes)
```sql
CREATE TABLE agency_contacts (
  -- See MODULE_A_AGENCY_RBAC.md for full schema
);
```

### Phase 2: Backfill from profiles.agency_id
```sql
INSERT INTO agency_contacts (agency_id, profile_id, role)
SELECT agency_id, id, 'AGENCY_OWNER'
FROM profiles
WHERE agency_id IS NOT NULL;
```

### Phase 3: Dual-Write Period
- New code writes to both `profiles.agency_id` AND `agency_contacts`
- Old code still reads from `profiles.agency_id`
- Gradual migration of queries

### Phase 4: Code Migration
- Update all queries to use `agency_contacts` join
- Add agency switcher UI
- Test multi-agency scenarios

### Phase 5: Deprecation (Optional, Future)
- Mark `profiles.agency_id` as deprecated
- Eventually drop column after 6+ months
- Or keep as "primary agency" pointer for quick lookups

---

## 🎨 UI/UX CONSIDERATIONS

### Agency Switcher Component

**For users belonging to multiple agencies:**

```jsx
// Example UI in navigation
<AgencySwitcher>
  <option value="agency-1">
    ABC Healthcare (AGENCY_OWNER)
  </option>
  <option value="agency-2">
    XYZ Staffing (SHIFT_COORDINATOR)
  </option>
  <option value="agency-3">
    DEF Care (FINANCE_MANAGER)
  </option>
</AgencySwitcher>
```

**Behavior:**
- Shows current active agency in header
- Dropdown allows switching
- Page refreshes with new agency context
- Role badge updates based on selected agency
- Navigation items show/hide based on role in THAT agency

---

## 🧪 TESTING SCENARIOS

### Test Case 1: Single Agency User (Legacy)
- User has only one agency relationship
- No switcher shown (default behavior)
- Works exactly like current system

### Test Case 2: Multi-Agency Owner
- User is AGENCY_OWNER for 3 agencies
- Switcher shown with 3 options
- Full access to all data within selected agency
- Switching agency changes entire dashboard context

### Test Case 3: Multi-Agency with Different Roles
- User is AGENCY_OWNER for Agency A
- User is SHIFT_COORDINATOR for Agency B
- Navigation changes based on active agency
- Financial data visible in Agency A, hidden in Agency B

### Test Case 4: Freelance Coordinator
- User is SHIFT_COORDINATOR for 5 different agencies
- Different hourly rate for each
- Timesheet shows separate rates per agency
- Payslip aggregates across all agencies

---

## 📊 DATABASE DESIGN COMPARISON

### OLD: Single-Agency Model

```
profiles table:
+------------+--------------+
| id         | agency_id    |
+------------+--------------+
| user-1     | agency-A     |  ← User 1 works ONLY for Agency A
| user-2     | agency-B     |  ← User 2 works ONLY for Agency B
+------------+--------------+

Problem: Can't represent user working for both A and B
```

### NEW: Multi-Agency Model

```
profiles table:
+------------+--------------+
| id         | agency_id    |  ← Keep for backward compatibility
+------------+--------------+
| user-1     | agency-A     |  ← Primary agency (optional)
| user-2     | agency-B     |
+------------+--------------+

agency_contacts table:
+------------+--------------+----------------------+
| profile_id | agency_id    | role                 |
+------------+--------------+----------------------+
| user-1     | agency-A     | AGENCY_OWNER         |
| user-1     | agency-B     | SHIFT_COORDINATOR    |  ← User 1 works for BOTH!
| user-1     | agency-C     | FINANCE_MANAGER      |
| user-2     | agency-B     | AGENCY_OWNER         |
+------------+--------------+----------------------+

Solution: Many-to-many relationship fully supported
```

---

## 💡 AGENT IMPLEMENTATION GUIDANCE

**When building Module A, remember:**

1. **Don't break existing code immediately**
   - Create `agency_contacts` table alongside `profiles.agency_id`
   - Backfill data from existing relationships
   - Dual-write during transition period

2. **Query pattern changes**
   ```javascript
   // OLD (single agency)
   const agency = await getUserAgency(userId);

   // NEW (multi-agency)
   const agencies = await getUserAgencies(userId);
   const currentAgency = agencies.find(a => a.id === activeAgencyId);
   const role = currentAgency.role;
   ```

3. **Permission checks now require agency context**
   ```javascript
   // OLD
   hasPermission(user, 'view_financials')

   // NEW
   hasPermission(user, agency, 'view_financials')
   // User might be owner of Agency A but coordinator of Agency B
   ```

4. **UI state management**
   - Store active agency ID in session/context
   - All queries filtered by active agency
   - Agency switcher component in header
   - Breadcrumbs show current agency

5. **Test thoroughly**
   - Create test users with 1, 2, 3, and 5 agencies
   - Verify role badges update when switching
   - Check RLS policies respect agency context
   - Ensure no data leakage between agencies

---

## ✅ SUMMARY

**What changed:**
- MODULE_A_AGENCY_RBAC.md now documents multi-agency architecture
- README.md highlights this as key scalability feature
- Implementation checklist updated with migration steps

**Why it matters:**
- Enables true SaaS multi-tenancy
- Supports freelance workforce model
- Scales to enterprise customers with multiple branches
- Proven pattern (Module 1 client_contacts already working)

**Next steps:**
- Future agents building Module A will see this documentation
- Clear migration path from legacy single-agency model
- Testing scenarios defined
- No breaking changes to existing code

---

**Last updated:** 2025-12-02
**Review:** Before implementing Module A
**Questions:** Ask about Module 1's client_contacts implementation for reference
