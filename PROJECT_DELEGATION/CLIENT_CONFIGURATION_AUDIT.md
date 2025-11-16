# 🔍 CLIENT CONFIGURATION AUDIT & ACTION PLAN

**Date:** 2025-11-15  
**Status:** 🚧 IN PROGRESS  
**Priority:** 🔴 CRITICAL - Blocks bulk shift creation workflow  

---

## 🎯 PROBLEMS IDENTIFIED

### 1. **Onboarding vs Edit Client Discrepancy** ❌
**Problem:** OnboardClient has advanced rate configuration, Edit Client modal does not.

**Current State:**
- ✅ OnboardClient (`src/pages/OnboardClient.jsx`): Has simple + advanced rate models
- ❌ Edit Client (`src/pages/Clients.jsx` lines 1002-1300): Only shows basic fields, NO rate editing

**Impact:** Admins cannot edit rates after client creation without database access.

---

### 2. **Missing Shift Window Configuration** ❌
**Problem:** No way to declare if client uses 7-7 or 8-8 shift windows.

**Current State:**
- Database has `day_shift_start`, `day_shift_end`, `night_shift_start`, `night_shift_end`
- But no explicit `shift_window_type` field
- 99% use 8-8 (08:00-20:00 / 20:00-08:00)
- 1% use 7-7 (07:00-19:00 / 19:00-07:00)

**Solution Implemented:**
- ✅ Added `shift_window_type` column to clients table (7_to_7 or 8_to_8)
- ✅ Default: 8_to_8
- ✅ Migration: `supabase/migrations/20251115_client_configuration_enhancements.sql`

---

### 3. **Role Configuration Not Tracked** ❌
**Problem:** No way to know which roles are configured/enabled for a client.

**Current State:**
- Rates stored in `contract_terms.rates_by_role` or `advanced_rate_card`
- No explicit tracking of which roles are available
- Bulk shift creation shows ALL roles, even if client has no rates configured

**Solution Implemented:**
- ✅ Added `enabled_roles` JSONB column to clients table
- ✅ Format: `{ "nurse": true, "healthcare_assistant": true, "senior_care_worker": false }`
- ✅ Auto-derived from existing rates (charge_rate > 0 = enabled)

---

### 4. **Role Name Aliases Not Standardized** ❌
**Problem:** Healthcare Assistant = HCA = Care Worker = Care Assistant (all mean same role).

**Current State:**
- Database has: `nurse`, `care_worker`, `hca`, `healthcare_assistant`
- UI shows different names in different places
- No normalization function

**Solution Implemented:**
- ✅ Updated `STAFF_ROLES` constant with aliases
- ✅ Created `normalizeRole()` function to convert aliases to canonical values
- ✅ Migration map: `hca` → `healthcare_assistant`, `care_worker` → `healthcare_assistant`

---

### 5. **Bulk Shift UI Shows All Roles** ❌
**Problem:** Current UI shows all roles regardless of client configuration.

**Current State:**
- Grid shows: Nurse Day, Nurse Night, HCA Day, HCA Night, etc.
- Even if client has no rates for some roles
- Cluttered and confusing

**Target State (per screenshot):**
- Checkbox list showing only enabled roles for selected client
- Clean, simple selection
- Grouped by role with day/night options

---

### 6. **Data Flow Broken** ❌
**Problem:** Client defaults not properly pre-filling bulk shift creation.

**Current Issues:**
- Shift times not pre-filled from client.day_shift_start/end
- Rates not pre-filled from client.contract_terms
- Break duration not pre-filled
- Location requirements not pre-filled

---

## ✅ COMPLETED TASKS

### Database Schema ✅
1. ✅ Added `shift_window_type` column (TEXT, CHECK: '7_to_7' or '8_to_8', DEFAULT: '8_to_8')
2. ✅ Added `enabled_roles` JSONB column (tracks which roles are configured)
3. ✅ Created indexes for performance
4. ✅ Backfilled existing clients with defaults

### Role Standardization ✅
1. ✅ Updated `STAFF_ROLES` constant with aliases
2. ✅ Created `normalizeRole()` function
3. ✅ Created `getAllRoleVariants()` function
4. ✅ Updated migration map for deprecated roles

---

## 🚧 PENDING TASKS

### Task 1: Update OnboardClient to Include Shift Window
**File:** `src/pages/OnboardClient.jsx`
**Location:** Step 3 (Contract Terms)
**Add:**
```jsx
<div>
  <Label>Shift Window Configuration</Label>
  <Select
    value={formData.shift_window_type}
    onValueChange={(value) => setFormData({...formData, shift_window_type: value})}
  >
    <SelectItem value="8_to_8">8-8 Window (08:00-20:00 / 20:00-08:00) - Standard</SelectItem>
    <SelectItem value="7_to_7">7-7 Window (07:00-19:00 / 19:00-07:00)</SelectItem>
  </Select>
</div>
```

### Task 2: Update Edit Client Modal - Add Rate Configuration
**File:** `src/pages/Clients.jsx`
**Location:** Lines 1002-1300 (Edit Client Modal)
**Add:**
- Rate configuration section (simple + advanced)
- Shift window configuration
- Enabled roles display/edit

### Task 3: Create Helper Function - Get Client Enabled Roles
**File:** `src/utils/clientHelpers.js` (NEW)
**Purpose:** Extract enabled roles from client object
```javascript
export function getEnabledRoles(client) {
  if (!client) return [];
  
  // Check enabled_roles field first
  if (client.enabled_roles) {
    return Object.keys(client.enabled_roles).filter(role => client.enabled_roles[role]);
  }
  
  // Fallback: derive from rates_by_role
  const rates = client.contract_terms?.rates_by_role || {};
  return Object.keys(rates).filter(role => rates[role]?.charge_rate > 0);
}
```

### Task 4: Update Bulk Shift Creation - Filter Roles by Client
**File:** `src/pages/BulkShiftCreation.jsx`
**Changes:**
1. Fetch selected client's enabled_roles
2. Filter activeRoles to only show enabled roles
3. Update UI to show cleaner role selection (checkbox list)

### Task 5: Create Role Selection Component
**File:** `src/components/bulk-shifts/RoleSelector.jsx` (NEW)
**Purpose:** Clean checkbox-based role selection (per screenshot)
**Features:**
- Only shows enabled roles for selected client
- Checkbox for each role
- "Select All" option
- Continue button

### Task 6: Update Shift Generator - Use Client Shift Windows
**File:** `src/utils/bulkShifts/shiftGenerator.js`
**Changes:**
- Use client.shift_window_type to determine shift times
- If 8_to_8: Day 08:00-20:00, Night 20:00-08:00
- If 7_to_7: Day 07:00-19:00, Night 19:00-07:00

---

## 📊 DATABASE SCHEMA

```sql
-- clients table additions
shift_window_type TEXT DEFAULT '8_to_8' CHECK (shift_window_type IN ('7_to_7', '8_to_8'))
enabled_roles JSONB DEFAULT '{}'::jsonb

-- Example enabled_roles value:
{
  "nurse": true,
  "healthcare_assistant": true,
  "senior_care_worker": false,
  "support_worker": false
}
```

---

## 🎯 NEXT IMMEDIATE STEPS

1. ✅ Update OnboardClient to include shift_window_type selector
2. ✅ Update Edit Client modal to match OnboardClient fields
3. ✅ Create clientHelpers.js with getEnabledRoles()
4. ✅ Update BulkShiftCreation to filter roles by client
5. ✅ Create RoleSelector component (clean UI per screenshot)
6. ✅ Test end-to-end: Onboard client → Create bulk shifts → Verify pre-filled data

---

**Status:** Database schema complete, UI updates pending.

