# Shift Marketplace Filtering Fixes - 2025-11-13

## 🚨 Critical Issues Found

### Issue #1: Role Filtering Not Working
**Problem:** Staff seeing shifts for roles they're not eligible for (e.g., care_worker seeing Senior Care Worker, Nurse shifts)

**Root Cause:** 
```javascript
// OLD LOGIC (BROKEN)
const isAdminApproved = shift.marketplace_visible === true;
const isAutoMatched = shift.role_required === staffProfile.role && /* availability check */;
return isAdminApproved || isAutoMatched; // ❌ Shows ANY role if marketplace_visible=true
```

**Impact:** 
- Staff can see and potentially accept shifts they're not qualified for
- Violates compliance requirements (nurses need NMC PIN, etc.)
- Creates confusion and poor user experience

---

### Issue #2: No Double-Booking Prevention
**Problem:** Staff can see shifts on days they're already working

**Root Cause:** No check for existing assigned shifts on same date

**Impact:**
- Staff could accidentally accept multiple shifts on same day
- Scheduling conflicts
- Potential no-shows

---

## ✅ Fixes Applied

### Fix #1: Strict Role Filtering

**File:** `src/pages/ShiftMarketplace.jsx`

**Changes:**
```javascript
// ✅ NEW LOGIC (FIXED)
// ALWAYS check role matching FIRST
if (shift.role_required !== staffProfile.role) return false;

// THEN check if admin approved OR auto-matched
const isAdminApproved = shift.marketplace_visible === true;
const isAutoMatched = /* availability check */;
return isAdminApproved || isAutoMatched;
```

**Result:**
- Staff ONLY see shifts matching their role
- Even if `marketplace_visible=true`, role must match
- Compliance requirements enforced at UI level

---

### Fix #2: Double-Booking Prevention

**Changes:**
```javascript
// ✅ Get staff's assigned shifts
const assignedShiftDates = allShifts
  .filter(s => s.assigned_staff_id === staffProfile.id && s.status === 'assigned')
  .map(s => s.date);

// ✅ Filter out shifts on days already working
if (assignedShiftDates.includes(shift.date)) {
  console.log(`🚫 Filtering out shift on ${shift.date} - staff already working`);
  return false;
}
```

**Result:**
- Staff cannot see shifts on days they're already assigned
- Prevents accidental double-booking
- Improves scheduling integrity

---

## 📊 Testing Plan

### Test Data Created

**File:** `create_test_shifts_for_filtering.sql`

Creates 4 test shifts:
1. ✅ **care_worker shift** - SHOULD BE VISIBLE (matches role)
2. ❌ **senior_care_worker shift** - SHOULD NOT BE VISIBLE (wrong role)
3. ❌ **nurse shift** - SHOULD NOT BE VISIBLE (wrong role)
4. ✅ **healthcare_assistant with marketplace_visible=true** - SHOULD BE VISIBLE (admin approved + matches role after migration)

### Automated Tests

**File:** `tests/marketplace-filtering.spec.js`

Test Cases:
- **TC1:** User role displayed correctly
- **TC2:** Only role-matching shifts visible
- **TC3:** Marketplace visible flag respects role filtering
- **TC4:** No shifts on days already working

---

## 🔧 Database Updates Required

### Update #1: Migrate Chadaira's Role

**File:** `update_chadaira_role.sql`

```sql
UPDATE staff
SET role = 'healthcare_assistant'
WHERE email = 'g.basera5+chadaira@gmail.com'
  AND role = 'care_worker';
```

**Reason:** Align with centralized STAFF_ROLES (care_worker is deprecated)

---

### Update #2: Create Test Shifts

**File:** `create_test_shifts_for_filtering.sql`

Run this to create test data for Playwright tests.

---

## 🧪 Manual Testing Steps

1. **Update Chadaira's role:**
   ```bash
   # Run SQL in Supabase SQL Editor
   psql -f update_chadaira_role.sql
   ```

2. **Create test shifts:**
   ```bash
   psql -f create_test_shifts_for_filtering.sql
   ```

3. **Login as Chadaira:**
   - Email: `g.basera5+chadaira@gmail.com`
   - Password: `Broadband@123`

4. **Navigate to Shift Marketplace**

5. **Verify:**
   - ✅ Only see `healthcare_assistant` shifts
   - ❌ Do NOT see `nurse`, `senior_care_worker`, `support_worker` shifts
   - ❌ Do NOT see shifts on days already working

6. **Run Playwright tests:**
   ```bash
   npm run test:e2e tests/marketplace-filtering.spec.js
   ```

---

## 📝 Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `src/pages/ShiftMarketplace.jsx` | Role filtering + double-booking prevention | ~30 |
| `tests/marketplace-filtering.spec.js` | **NEW** - Automated tests | 150 |
| `create_test_shifts_for_filtering.sql` | **NEW** - Test data | 150 |
| `update_chadaira_role.sql` | **NEW** - Role migration | 20 |

---

## 🎯 Expected Behavior After Fixes

### Before:
- ❌ Chadaira (care_worker) sees Senior Care Worker shifts
- ❌ Chadaira sees Nurse shifts
- ❌ Chadaira sees shifts on days she's working
- ❌ marketplace_visible=true bypasses role check

### After:
- ✅ Chadaira (healthcare_assistant) ONLY sees healthcare_assistant shifts
- ✅ Role check ALWAYS enforced, even with marketplace_visible=true
- ✅ No shifts shown on days already working
- ✅ Compliance requirements enforced at UI level

---

## 🚀 Next Steps

1. [ ] Run `update_chadaira_role.sql` in Supabase
2. [ ] Run `create_test_shifts_for_filtering.sql` in Supabase
3. [ ] Test manually in browser
4. [ ] Run Playwright tests: `npm run test:e2e tests/marketplace-filtering.spec.js`
5. [ ] Verify all tests pass
6. [ ] Deploy to production

---

**Status:** ✅ All fixes applied and ready for testing  
**Priority:** 🔴 Critical - affects compliance and user experience  
**Estimated Testing Time:** 20 minutes

