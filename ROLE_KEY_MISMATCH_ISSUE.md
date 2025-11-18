# Role Key Mismatch Issue - PostShiftV2 Dropdown

**Date:** 2025-11-18  
**Issue:** PostShiftV2 dropdown shows "Support Worker" but client has "Care Worker" configured  
**Root Cause:** Clients.jsx uses deprecated role keys, PostShiftV2 uses standard STAFF_ROLES keys

---

## 🐛 THE PROBLEM

### **What You See:**
- Client configuration shows: **Nurse, Care Worker, HCA, Senior Care Worker** ✅
- PostShiftV2 dropdown shows: **Nurse, Healthcare Assistant** ❌
- Missing: **Care Worker, HCA, Senior Care Worker**
- Extra: **Support Worker** (not configured)

### **Why This Happens:**

**Clients.jsx saves rates with DEPRECATED keys:**
```javascript
rates_by_role: {
  nurse: { pay_rate: 22, charge_rate: 25 },
  care_worker: { pay_rate: 14.75, charge_rate: 19.18 },  // ❌ DEPRECATED
  hca: { pay_rate: 14, charge_rate: 16 },                // ❌ DEPRECATED
  senior_care_worker: { pay_rate: 16.50, charge_rate: 21.45 }
}
```

**PostShiftV2 reads rates using STANDARD keys:**
```javascript
// From STAFF_ROLES constant
STAFF_ROLES = [
  { value: 'nurse', ... },                    // ✅ MATCHES
  { value: 'healthcare_assistant', ... },     // ❌ NO MATCH (client has 'care_worker' and 'hca')
  { value: 'senior_care_worker', ... },       // ✅ MATCHES
  { value: 'support_worker', ... },           // ❌ NO MATCH (client doesn't have this)
  { value: 'specialist_nurse', ... }          // ❌ NO MATCH
]
```

**Result:**
- ✅ `nurse` → Found in client rates → Shows in dropdown
- ❌ `healthcare_assistant` → NOT found (client has `care_worker` and `hca`) → Not shown
- ✅ `senior_care_worker` → Found in client rates → Shows in dropdown
- ❌ `support_worker` → NOT found in client rates → Not shown (but appears in console logs?)

---

## 🔍 DIAGNOSIS STEPS

### **Step 1: Check What Keys Are Actually in Database**
Run `check_client_role_keys.sql` in Supabase SQL Editor.

**Expected Output (Current State):**
```
role_key
---------
care_worker      ← DEPRECATED
hca              ← DEPRECATED
nurse            ← STANDARD
senior_care_worker ← STANDARD
```

**Desired Output (After Fix):**
```
role_key
---------
healthcare_assistant  ← STANDARD
nurse                 ← STANDARD
senior_care_worker    ← STANDARD
support_worker        ← STANDARD (if needed)
specialist_nurse      ← STANDARD (if needed)
```

---

## ✅ THE FIX

### **Option 1: Migrate Client Data (Recommended)**
Update existing client records to use standard role keys.

**SQL Migration:**
```sql
-- Migrate care_worker → healthcare_assistant
UPDATE clients
SET contract_terms = jsonb_set(
  jsonb_set(
    contract_terms,
    '{rates_by_role,healthcare_assistant}',
    contract_terms->'rates_by_role'->'care_worker'
  ),
  '{rates_by_role}',
  (contract_terms->'rates_by_role') - 'care_worker'
)
WHERE contract_terms->'rates_by_role' ? 'care_worker';

-- Migrate hca → healthcare_assistant (merge if both exist)
UPDATE clients
SET contract_terms = jsonb_set(
  contract_terms,
  '{rates_by_role}',
  (contract_terms->'rates_by_role') - 'hca'
)
WHERE contract_terms->'rates_by_role' ? 'hca'
  AND contract_terms->'rates_by_role' ? 'healthcare_assistant';
```

**Result:**
- ✅ All clients use standard role keys
- ✅ PostShiftV2 dropdown shows correct roles
- ✅ No code changes needed

---

### **Option 2: Update Clients.jsx to Use Standard Keys**
Change Clients.jsx to save rates with standard keys instead of deprecated ones.

**Changes Needed:**
1. Replace `care_worker` → `healthcare_assistant`
2. Replace `hca` → `healthcare_assistant` (or remove if duplicate)
3. Add `support_worker` if needed
4. Add `specialist_nurse` if needed

**Files to Update:**
- `src/pages/Clients.jsx` (lines 1453-1570)

**Result:**
- ✅ New clients use standard keys
- ❌ Existing clients still have deprecated keys (need migration)

---

### **Option 3: Add Alias Support to PostShiftV2**
Make PostShiftV2 check for both standard and deprecated keys.

**Code Change:**
```javascript
// In getAvailableRoles function
STAFF_ROLES.forEach((roleData) => {
  let rates = ratesByRole[roleData.value];
  
  // ✅ Check aliases if primary key not found
  if (!rates && roleData.aliases) {
    for (const alias of roleData.aliases) {
      rates = ratesByRole[alias];
      if (rates) break;
    }
  }
  
  if (rates && rates.charge_rate > 0) {
    availableRoles.push({ ...roleData, ...rates });
  }
});
```

**Result:**
- ✅ Works with both standard and deprecated keys
- ✅ No database migration needed
- ❌ Perpetuates use of deprecated keys

---

## 🎯 RECOMMENDED SOLUTION

**Hybrid Approach:**
1. ✅ **Add alias support to PostShiftV2** (quick fix, works immediately)
2. ✅ **Migrate existing client data** (clean up database)
3. ✅ **Update Clients.jsx** (prevent new deprecated keys)

**Timeline:**
- **Now:** Add alias support → Dropdown works immediately
- **Next:** Run migration → Clean up database
- **Future:** Update Clients.jsx → Prevent new issues

---

## 📋 FILES PROVIDED

1. **`check_client_role_keys.sql`** - Diagnostic queries
2. **`ROLE_KEY_MISMATCH_ISSUE.md`** - This document
3. **`fix_role_key_mismatch.sql`** - Migration script (to be created)

---

## 🚀 NEXT STEPS

1. **Run diagnostic:** `check_client_role_keys.sql`
2. **Confirm issue:** Check if `care_worker` and `hca` appear
3. **Choose fix:** Option 1 (migrate), Option 2 (update UI), or Option 3 (add aliases)
4. **Apply fix:** Run migration or update code
5. **Verify:** Refresh PostShiftV2 → Dropdown should show all 4 roles

