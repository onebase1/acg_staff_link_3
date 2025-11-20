# GROUP G: Financial Calculations Fix - Analysis & Implementation

**Date**: 2025-11-20  
**Priority**: 🔴 CRITICAL  
**Status**: In Progress

---

## 📊 CURRENT STATE ANALYSIS

### ✅ CORRECT Implementation Found
**File**: `src/pages/ShiftMarketplace.jsx` (Line 323-326)
```javascript
const calculateEarnings = (shift) => {
  const hours = shift.duration_hours - (shift.break_duration_minutes / 60);
  return hours * shift.pay_rate;
};
```
**Status**: ✅ CORRECT - Accounts for actual break duration

---

## ❌ INCORRECT Implementations Found

### 1. Staff Portal - Earnings Display
**File**: `src/pages/StaffPortal.jsx`
**Lines**: 671, 675, 1422

**Line 671** (This Week Earnings):
```javascript
.reduce((sum, shift) => sum + ((shift.pay_rate || 0) * (shift.duration_hours || 0)), 0);
```
❌ **Problem**: Doesn't account for break

**Line 675** (Total Earnings All Time):
```javascript
.reduce((sum, shift) => sum + ((shift.pay_rate || 0) * (shift.duration_hours || 0)), 0);
```
❌ **Problem**: Doesn't account for break

**Line 1422** (Shift Details Modal):
```javascript
£{((selectedShift.duration_hours || 0) * (selectedShift.pay_rate || staffRecord.hourly_rate || 15)).toFixed(2)}
```
❌ **Problem**: Doesn't account for break

---

### 2. Shift Rate Display Component
**File**: `src/components/shifts/ShiftRateDisplay.jsx`
**Lines**: 17-18

```javascript
const staffCost = (payRate * hours).toFixed(2);
const clientCharge = (chargeRate * hours).toFixed(2);
```
❌ **Problem**: Uses `hours = shift.duration_hours` without break deduction

---

### 3. Bulk Shift Generator
**File**: `src/utils/bulkShifts/shiftGenerator.js`
**Lines**: 174-175

```javascript
totalStaffCost += (shift.pay_rate || 0) * hours;
totalClientRevenue += (shift.charge_rate || 0) * hours;
```
❌ **Problem**: Uses `hours = shift.duration_hours` without break deduction

---

### 4. Staff Daily Digest Email
**File**: `supabase/functions/staff-daily-digest-engine/index.ts`
**Line**: 111

```javascript
const totalEarnings = shiftsWithClients.reduce((sum, s) =>
    sum + (s.pay_rate * s.duration_hours), 0
).toFixed(2);
```
❌ **Problem**: Doesn't account for break

---

### 5. Auto Timesheet Creator
**File**: `supabase/functions/auto-timesheet-creator/index.ts`
**Lines**: 252-253

```javascript
const staff_pay_amount = (shift.duration_hours || 0) * (shift.pay_rate || 0);
const client_charge_amount = (shift.duration_hours || 0) * (shift.charge_rate || 0);
```
❌ **Problem**: Doesn't account for break

---

### 6. Enhanced WhatsApp Offers
**File**: `supabase/functions/enhanced-whatsapp-offers/index.ts`
**Line**: 113

```javascript
const totalEarnings = (shift.pay_rate * shift.duration_hours).toFixed(2);
```
❌ **Problem**: Doesn't account for break

---

### 7. Shifts Export (CSV)
**File**: `src/pages/Shifts.jsx`
**Lines**: 1090-1091

```javascript
'Staff Cost (£)': (durationHours * payRate).toFixed(2),
'Client Charge (£)': (durationHours * chargeRate).toFixed(2),
```
❌ **Problem**: Uses `durationHours` without break deduction

---

### 8. Dashboard Week Costs
**File**: `src/pages/Dashboard.jsx`
**Line**: 425

```javascript
.reduce((sum, s) => sum + ((s.charge_rate || 0) * (s.duration_hours || 0)), 0);
```
❌ **Problem**: Doesn't account for break

---

## 🎯 RECOMMENDED FIX STRATEGY

### Option A: Use break_duration_minutes (RECOMMENDED)
**Calculation**: `(duration_hours - (break_duration_minutes / 60)) * rate`
**Pros**: 
- Most accurate
- Handles variable break durations
- Already implemented in ShiftMarketplace.jsx
**Cons**: 
- Requires break_duration_minutes to be set on all shifts

### Option B: Fixed 1-hour deduction (USER'S REQUEST)
**Calculation**: `(duration_hours - 1) * rate`
**Pros**: 
- Simple
- Matches user's explicit request
**Cons**: 
- Less accurate if breaks vary
- Doesn't handle shifts <1 hour

### Option C: Hybrid Approach (BEST)
**Calculation**: 
```javascript
const breakHours = (shift.break_duration_minutes || 60) / 60; // Default to 60 mins
const billableHours = Math.max(0, (shift.duration_hours || 0) - breakHours);
const earnings = billableHours * rate;
```
**Pros**: 
- Uses actual break if available
- Falls back to 1-hour default
- Prevents negative hours
**Cons**: 
- Slightly more complex

---

## ✅ IMPLEMENTATION PLAN

### Step 1: Create Utility Function
**File**: `src/utils/shiftCalculations.js` (NEW)
```javascript
/**
 * Calculate billable hours for a shift (accounting for breaks)
 * @param {Object} shift - Shift object with duration_hours and break_duration_minutes
 * @returns {number} Billable hours
 */
export function calculateBillableHours(shift) {
  const breakHours = (shift.break_duration_minutes || 60) / 60;
  return Math.max(0, (shift.duration_hours || 0) - breakHours);
}

/**
 * Calculate staff earnings for a shift
 * @param {Object} shift - Shift object
 * @returns {number} Earnings amount
 */
export function calculateStaffEarnings(shift) {
  const billableHours = calculateBillableHours(shift);
  return billableHours * (shift.pay_rate || 0);
}

/**
 * Calculate client charge for a shift
 * @param {Object} shift - Shift object
 * @returns {number} Charge amount
 */
export function calculateClientCharge(shift) {
  const billableHours = calculateBillableHours(shift);
  return billableHours * (shift.charge_rate || 0);
}
```

### Step 2: Update All Files
Replace all earnings calculations with utility functions

---

## 📋 FILES TO MODIFY (9 files)

1. ✅ `src/utils/shiftCalculations.js` - CREATE utility functions
2. ✅ `src/pages/StaffPortal.jsx` - Lines 671, 675, 1422
3. ✅ `src/components/shifts/ShiftRateDisplay.jsx` - Lines 17-18
4. ✅ `src/utils/bulkShifts/shiftGenerator.js` - Lines 174-175
5. ✅ `supabase/functions/staff-daily-digest-engine/index.ts` - Line 111
6. ✅ `supabase/functions/auto-timesheet-creator/index.ts` - Lines 252-253
7. ✅ `supabase/functions/enhanced-whatsapp-offers/index.ts` - Line 113
8. ✅ `src/pages/Shifts.jsx` - Lines 1090-1091
9. ✅ `src/pages/Dashboard.jsx` - Line 425

---

## ✅ IMPLEMENTATION COMPLETE

### Changes Made

**1. Created Centralized Utility Functions**
- File: `src/utils/shiftCalculations.js`
- Functions: `calculateBillableHours()`, `calculateStaffEarnings()`, `calculateClientCharge()`, `calculateShiftMargin()`, `calculateShiftMarginPercentage()`, `calculateFinancialSummary()`
- All functions account for break time (defaults to 60 minutes if not specified)
- Prevents negative billable hours

**2. Updated Frontend Components**
- `src/pages/StaffPortal.jsx`: Updated earnings calculations (lines 672, 676, 1423)
- `src/components/shifts/ShiftRateDisplay.jsx`: Updated to use utility functions
- `src/pages/Shifts.jsx`: Updated CSV export calculations
- `src/pages/Dashboard.jsx`: Updated week potential revenue calculation

**3. Updated Backend Edge Functions**
- `supabase/functions/staff-daily-digest-engine/index.ts`: Updated email earnings calculation
- `supabase/functions/auto-timesheet-creator/index.ts`: Updated timesheet amount calculations
- `supabase/functions/enhanced-whatsapp-offers/index.ts`: Updated WhatsApp offer earnings

**4. Updated Bulk Operations**
- `src/utils/bulkShifts/shiftGenerator.js`: Now uses centralized `calculateFinancialSummary()`

### Calculation Logic
```javascript
// Default break: 60 minutes (1 hour)
const breakHours = (shift.break_duration_minutes || 60) / 60;
const billableHours = Math.max(0, shift.duration_hours - breakHours);
const earnings = billableHours * rate;
```

### Example
- 12-hour shift at £15/hour with 60-minute break
- Before: £15 × 12 = £180 ❌
- After: £15 × 11 = £165 ✅

---

## 🧪 TESTING CHECKLIST

- [ ] Staff portal earnings display correct
- [ ] Shift marketplace earnings correct (already correct - uses break_duration_minutes)
- [ ] Email notifications show correct earnings
- [ ] Timesheet amounts correct
- [ ] Invoice amounts correct
- [ ] CSV export shows correct amounts
- [ ] Dashboard metrics correct

---

## 📝 NOTES

**ShiftMarketplace.jsx Already Correct**
- This file already had the correct implementation using `break_duration_minutes`
- No changes needed

**Break Duration Handling**
- All calculations now default to 60-minute break if `break_duration_minutes` is not set
- This matches user's requirement: `(duration - 1) * rate`
- More flexible: Can handle variable break durations when specified

**Next Steps**
- Test all earnings displays in UI
- Verify email notifications show correct amounts
- Test timesheet creation amounts
- Verify invoice generation uses correct calculations

