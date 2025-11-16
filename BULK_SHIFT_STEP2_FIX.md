# 🔧 BULK SHIFT CREATION - FIXES

**Date:** 2025-11-15
**Issues:**
1. App crashing on Step 2 → Step 3 transition ✅ FIXED
2. Invalid pay/charge rates on preview (£0.00) ✅ FIXED

**Status:** ✅ ALL FIXED

---

## 🐛 PROBLEM 1: Step 2 → Step 3 Crash

### Error Message
```
Uncaught TypeError: Cannot read properties of undefined (reading 'split')
  at Step2MultiRoleGrid.jsx:735:37
  at Array.map (<anonymous>)
  at Step2MultiRoleGrid (Step2MultiRoleGrid.jsx:731:40)
```

### Root Cause

**Data Structure Mismatch:**

The new 4-step flow's `RoleSelector` component was passing `activeRoles` as an **array of strings**:
```javascript
['healthcare_assistant_day', 'healthcare_assistant_night']
```

But `Step2MultiRoleGrid` (the grid component) expected `activeRoles` as an **array of objects**:
```javascript
[
  {
    key: 'healthcare_assistant_day',
    label: 'Healthcare Assistant Day',
    role: 'healthcare_assistant',
    shiftType: 'day',
    payRate: 14.00,
    chargeRate: 16.00
  },
  // ...
]
```

### Where It Failed

**File:** `src/components/bulk-shifts/Step2MultiRoleGrid.jsx`  
**Line:** 735

```javascript
{formData.activeRoles?.map(role => (
  <th key={role.key}>
    <span>{role.label.split(' ')[0]}</span>  // ❌ role.label was undefined
  </th>
))}
```

---

## ✅ SOLUTION 1: Fix Data Structure

### File Changed
`src/pages/BulkShiftCreation.jsx` - Line 246

### What Was Changed

Updated `handleRoleSelectorContinue` to build the proper object structure:

**BEFORE:**
```javascript
const handleRoleSelectorContinue = (roleConfigs) => {
  const activeRoles = [];
  roleConfigs.forEach(config => {
    if (config.includeDay) {
      activeRoles.push(`${config.role}_day`);  // ❌ String only
    }
    if (config.includeNight) {
      activeRoles.push(`${config.role}_night`);  // ❌ String only
    }
  });
  
  setFormData(prev => ({ ...prev, activeRoles }));
  setCurrentStep(3);
};
```

**AFTER:**
```javascript
const handleRoleSelectorContinue = (roleConfigs) => {
  const activeRoles = [];
  
  roleConfigs.forEach(config => {
    const rates = formData.ratesByRole?.[config.role] || { pay_rate: 0, charge_rate: 0 };
    
    if (config.includeDay) {
      activeRoles.push({
        key: `${config.role}_day`,
        label: `${config.role.replace(/_/g, ' ')} Day`,
        role: config.role,
        shiftType: 'day',
        payRate: rates.pay_rate,
        chargeRate: rates.charge_rate
      });  // ✅ Full object
    }
    if (config.includeNight) {
      activeRoles.push({
        key: `${config.role}_night`,
        label: `${config.role.replace(/_/g, ' ')} Night`,
        role: config.role,
        shiftType: 'night',
        payRate: rates.pay_rate,
        chargeRate: rates.charge_rate
      });  // ✅ Full object
    }
  });
  
  setFormData(prev => ({ ...prev, activeRoles }));
  setCurrentStep(3);
};
```

---

## 🐛 PROBLEM 2: Invalid Pay/Charge Rates (£0.00)

### Error Message
```
15 Errors Found:
- Shift 1: Invalid pay rate
- Shift 1: Invalid charge rate
- Shift 2: Invalid pay rate
- Shift 2: Invalid charge rate
...
```

All shifts showing £0.00 for both pay_rate and charge_rate.

### Root Cause

**Role Key Mismatch:**

The client's `contract_terms.rates_by_role` object uses the old key `hca`:
```javascript
{
  "hca": { "pay_rate": 14.00, "charge_rate": 18.00 }
}
```

But the code was looking up rates using the normalized role `healthcare_assistant`:
```javascript
const rates = formData.ratesByRole?.['healthcare_assistant']; // ❌ undefined
```

This caused all rates to default to 0.

---

## ✅ SOLUTION 2: Fix Rate Lookup

### Files Changed

**1. `src/pages/BulkShiftCreation.jsx` - Line 246**

Added import for `getClientRates` helper and updated `handleRoleSelectorContinue` to use it:

**BEFORE:**
```javascript
const rates = formData.ratesByRole?.[config.role] || { pay_rate: 0, charge_rate: 0 };

if (config.includeDay) {
  activeRoles.push({
    key: `${config.role}_day`,
    payRate: rates.pay_rate,  // ❌ Always 0
    chargeRate: rates.charge_rate  // ❌ Always 0
  });
}
```

**AFTER:**
```javascript
if (config.includeDay) {
  const dayRates = getClientRates(formData.client, config.role, 'day');
  activeRoles.push({
    key: `${config.role}_day`,
    payRate: dayRates.pay_rate,  // ✅ Correct rate
    chargeRate: dayRates.charge_rate  // ✅ Correct rate
  });
}
```

**2. `src/utils/clientHelpers.js` - Line 97**

Enhanced `getClientRates` to handle role aliases:

**BEFORE:**
```javascript
const simpleRates = client.contract_terms?.rates_by_role?.[normalizedRole];
// ❌ Only checks 'healthcare_assistant', misses 'hca'
```

**AFTER:**
```javascript
// Try normalized role first (e.g., 'healthcare_assistant')
let simpleRates = client.contract_terms?.rates_by_role?.[normalizedRole];

// If not found, try common aliases (e.g., 'hca', 'care_worker')
if (!simpleRates) {
  const ratesByRole = client.contract_terms?.rates_by_role || {};

  if (normalizedRole === 'healthcare_assistant') {
    simpleRates = ratesByRole['hca'] || ratesByRole['care_worker'];  // ✅ Fallback
  }
}
```

---

## 🧪 TESTING

### Manual Test Steps

1. ✅ Navigate to `/bulk-shift-creation`
2. ✅ Select client "Divine Care Center"
3. ✅ Set date range (Next 7 Days)
4. ✅ Click "Next: Build Schedule Grid"
5. ✅ Select "Healthcare Assistant" with Day + Night shifts
6. ✅ Click "Continue to Grid"
7. ✅ **Grid should load without errors**
8. ✅ Fill in some shift quantities
9. ✅ Click "Generate Preview"
10. ✅ Create shifts

### Expected Result
- ✅ No console errors
- ✅ Grid displays with correct role columns
- ✅ Role headers show "Healthcare Assistant" with Day/Night icons
- ✅ All bulk fill features work
- ✅ **Rates display correctly** (e.g., £14.00 pay, £18.00 charge)
- ✅ **No validation errors** about invalid rates
- ✅ **Financial summary shows correct totals**
- ✅ Shifts create successfully

---

## 📝 NOTES

### Why This Happened

When refactoring from 3-step to 4-step flow:
- Created new `RoleSelector` component
- `RoleSelector` returned simple string array
- Forgot to update the data structure to match what `Step2MultiRoleGrid` expected
- Grid component tried to access `.label` property on strings → crash

### Prevention

**For Future Refactoring:**
1. Always check what data structure downstream components expect
2. Use TypeScript or PropTypes to catch these issues
3. Test the complete flow after structural changes
4. Add integration tests for multi-step workflows

---

## ✅ STATUS

**Fixed:** 2025-11-15  
**Tested:** Manual testing confirmed working  
**Deployed:** Ready for production  

**Next Steps:**
- Run Playwright tests to verify automated testing works
- Consider adding PropTypes to catch these issues earlier
- Document expected data structures in component comments

---

**Related Files:**
- `src/pages/BulkShiftCreation.jsx` (Fixed - data structure + rate lookup)
- `src/utils/clientHelpers.js` (Fixed - rate lookup with aliases)
- `src/components/bulk-shifts/Step2MultiRoleGrid.jsx` (Consumer)
- `src/components/bulk-shifts/RoleSelector.jsx` (Producer)
- `src/utils/bulkShifts/shiftGenerator.js` (Uses rates from activeRoles)

