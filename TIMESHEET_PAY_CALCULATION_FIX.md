# 🚨 CRITICAL: Timesheet Pay Calculation & UI Fix

## Date: 2025-11-22
## Priority: CRITICAL - Data Integrity Issue
## Status: Solution Designed - Ready to Implement

---

## 🔴 **THE PROBLEM**

### **Current State (Nov 19 Shift - Chadaira Basera)**

```json
{
  "shift_id": "6d60e401-2c1d-4022-859d-9edcb31fe93a",
  "scheduled": "08:00-20:00 (12h)",
  "actual_worked": "17:42-18:59 (1h 17min = 1.29h)",

  "timesheet": {
    "total_hours": 1.29,           // ✅ CORRECT (GPS calculated)
    "staff_pay_amount": 177,       // ❌ WRONG (should be £19.03)
    "pay_rate": 14.75,             // ✅ CORRECT
    "break_duration_minutes": 60,  // ❌ WRONG (no break for 1.29h shift!)
    "status": "submitted"
  }
}
```

**UI Shows:**
- Staff sees: **£177.00**
- Staff expects: **~£19.03** (14.75 × 1.29)
- **Discrepancy: 831% overpayment displayed!**

---

## 🎯 **ROOT CAUSE**

### **When Pay is Calculated:**

**❌ CURRENT (WRONG):**
```
Shift Created → staff_pay_amount = pay_rate × scheduled_hours
                                   = 14.75 × 12 = £177

GPS Clock Out → total_hours = actual_hours ✅
                staff_pay_amount = UNCHANGED ❌ (still £177!)
```

**✅ SHOULD BE:**
```
Shift Created → staff_pay_amount = pay_rate × scheduled_hours (provisional)

GPS Clock Out → total_hours = actual_hours
                break_minutes = calculate_break(actual_hours)
                billable_hours = actual_hours - (break_minutes / 60)
                staff_pay_amount = pay_rate × billable_hours ✅
```

---

## 📊 **BREAK DEDUCTION STANDARDS**

### **UK Healthcare Industry Standard:**

| Actual Hours Worked | Unpaid Break | Source |
|---------------------|--------------|--------|
| < 4 hours | No break | Working Time Regulations 1998 |
| 4-6 hours | 15-30 minutes | NHS Standard, CQC Guidance |
| 6-8 hours | 30 minutes | NHS Standard |
| 8-12 hours | 60 minutes | NHS Standard, Care Home Practice |

**Applied to Chadaira's Shifts:**

**Nov 19 (Actual: 1.29h):**
- Worked: 1h 17min
- Break: 0 min (too short for break)
- Billable: 1.29h
- Pay: £14.75 × 1.29 = **£19.03**
- Currently showing: **£177** ❌

**Nov 21 (If completed - Actual: 8.42h):**
- Scheduled: 08:00-20:00 (12h)
- Clock in: 11:34 (3.5h late!)
- Clock out: 20:00 (assumed)
- Worked: 8h 26min = 8.42h
- Break: 30 min (6-8h range)
- Billable: 8.42 - 0.5 = 7.92h
- Pay: £14.75 × 7.92 = **£116.82**
- NOT: £177 ❌

---

## 💡 **SOLUTION: 3-Tier Display System**

### **Tier 1: Pre-Shift (Scheduled)**
**Status:** `confirmed`, `assigned`
**UI Shows:**
```
┌────────────────────────────────┐
│ 💰 Estimated Pay (Pre-Tax)    │
│ £177.00                        │
│ Based on 12h scheduled         │
│ ℹ️ Actual pay based on hours  │
│    worked (GPS verified)       │
└────────────────────────────────┘
```

---

### **Tier 2: During Shift (In Progress)**
**Status:** `in_progress`
**UI Shows:**
```
┌────────────────────────────────┐
│ ⏱️ Shift In Progress           │
│ Started: 11:34 AM              │
│ Elapsed: 3h 26min              │
│                                │
│ 💰 Pay calculated at shift end │
│ (GPS clock-out required)       │
└────────────────────────────────┘
```

**DO NOT SHOW:**
- ❌ Estimated pay
- ❌ Scheduled hours as "worked"
- ❌ Final amounts

---

### **Tier 3: After Shift (Completed/Submitted)**
**Status:** `completed`, `submitted`, `approved`
**UI Shows:**
```
┌────────────────────────────────┐
│ ✅ GPS Verified (4m)            │
│ Worked: 1.29h (1h 17min)       │
│ Break: None (shift < 4h)       │
│ Billable: 1.29h                │
│                                │
│ 💰 Gross Pay (Pre-Tax)         │
│ £19.03                         │
│ £14.75/hr × 1.29h              │
│                                │
│ ℹ️ Subject to tax, NI, pension │
└────────────────────────────────┘
```

**FOR PAPER TIMESHEETS:**
```
┌────────────────────────────────┐
│ 📄 Paper Timesheet             │
│ Worked: 8.5h (as recorded)     │
│ Break: 60min                   │
│ Billable: 7.5h                 │
│                                │
│ 💰 Gross Pay (Pre-Tax)         │
│ £110.63                        │
│ £14.75/hr × 7.5h               │
│                                │
│ ⚠️ Pending approval            │
└────────────────────────────────┘
```

---

## 🔧 **IMPLEMENTATION PLAN**

### **Step 1: Fix Pay Calculation Logic**

**File:** `supabase/functions/intelligent-timesheet-validator/index.ts`

**Add to clock-out handler:**
```typescript
// After GPS clock-out, recalculate pay based on actual hours
const calculateActualPay = (clockInTime, clockOutTime, payRate) => {
  // 1. Calculate actual hours worked
  const millisWorked = new Date(clockOutTime) - new Date(clockInTime);
  const hoursWorked = millisWorked / (1000 * 60 * 60);
  const actualHours = parseFloat(hoursWorked.toFixed(2));

  // 2. Determine break duration based on actual hours
  let breakMinutes = 0;
  if (actualHours >= 8) {
    breakMinutes = 60;  // 8-12h shifts
  } else if (actualHours >= 6) {
    breakMinutes = 30;  // 6-8h shifts
  } else if (actualHours >= 4) {
    breakMinutes = 20;  // 4-6h shifts (average)
  } else {
    breakMinutes = 0;   // < 4h no break
  }

  // 3. Calculate billable hours (worked - break)
  const billableHours = actualHours - (breakMinutes / 60);
  const billableHoursRounded = parseFloat(billableHours.toFixed(2));

  // 4. Calculate pay
  const staffPayAmount = parseFloat((payRate * billableHoursRounded).toFixed(2));
  const chargeRate = // get from shift or timesheet
  const clientChargeAmount = parseFloat((chargeRate * billableHoursRounded).toFixed(2));

  return {
    total_hours: actualHours,
    break_duration_minutes: breakMinutes,
    billable_hours: billableHoursRounded,
    staff_pay_amount: staffPayAmount,
    client_charge_amount: clientChargeAmount
  };
};

// Update timesheet on clock-out
const payData = calculateActualPay(
  timesheet.clock_in_time,
  clockOutTime,
  timesheet.pay_rate
);

await supabase
  .from('timesheets')
  .update(payData)
  .eq('id', timesheet.id);
```

---

### **Step 2: Update MobileClockIn.jsx (Clock Out Handler)**

**File:** `src/components/staff/MobileClockIn.jsx`

**Line ~495-507, add after clock-out:**
```typescript
// Calculate actual pay based on GPS clock times
const actualHours = (new Date(clockOutTime) - new Date(existingTimesheet.clock_in_time)) / (1000 * 60 * 60);
const actualHoursRounded = parseFloat(actualHours.toFixed(2));

// Determine break based on actual hours
let breakMinutes = 0;
if (actualHoursRounded >= 8) breakMinutes = 60;
else if (actualHoursRounded >= 6) breakMinutes = 30;
else if (actualHoursRounded >= 4) breakMinutes = 20;

const billableHours = actualHoursRounded - (breakMinutes / 60);
const staffPayAmount = parseFloat((shift.pay_rate * billableHours).toFixed(2));
const clientChargeAmount = parseFloat((shift.charge_rate * billableHours).toFixed(2));

const { error: timesheetUpdateError } = await supabase
  .from('timesheets')
  .update({
    clock_out_time: clockOutTime,
    clock_out_location: capturedLocation,
    clock_out_photo: mapImageUrl,
    clock_out_geofence_validated: clockOutGeofenceValidated,
    clock_out_geofence_distance_meters: clockOutGeofenceDistance,
    total_hours: actualHoursRounded,
    break_duration_minutes: breakMinutes,
    staff_pay_amount: staffPayAmount,  // ← FIX: Recalculate based on actual
    client_charge_amount: clientChargeAmount,  // ← FIX: Recalculate
    status: 'submitted',
  })
  .eq('id', existingTimesheet.id);
```

---

### **Step 3: Create UI Display Component**

**File:** `src/components/timesheets/PayDisplay.jsx`

```jsx
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Info, Clock, CheckCircle, AlertTriangle } from "lucide-react";

export default function PayDisplay({ shift, timesheet }) {
  // Determine display mode based on shift status
  const getDisplayMode = () => {
    if (['created', 'open', 'assigned', 'confirmed'].includes(shift.status)) {
      return 'scheduled';
    } else if (shift.status === 'in_progress') {
      return 'in_progress';
    } else if (['completed', 'submitted', 'approved'].includes(timesheet?.status)) {
      return 'actual';
    } else {
      return 'pending';
    }
  };

  const mode = getDisplayMode();

  // SCHEDULED: Show estimated pay
  if (mode === 'scheduled') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">Estimated Pay (Pre-Tax)</span>
        </div>
        <div className="text-2xl font-bold text-blue-900">
          £{shift.pay_rate * shift.duration_hours}
        </div>
        <div className="text-xs text-blue-700 mt-1">
          Based on {shift.duration_hours}h scheduled
        </div>
        <div className="text-xs text-blue-600 mt-2 flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5" />
          <span>Actual pay calculated at shift end (GPS verified)</span>
        </div>
      </div>
    );
  }

  // IN PROGRESS: Show shift is ongoing
  if (mode === 'in_progress') {
    const startTime = new Date(shift.shift_started_at);
    const elapsed = Math.floor((new Date() - startTime) / (1000 * 60));
    const hours = Math.floor(elapsed / 60);
    const mins = elapsed % 60;

    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-orange-600 animate-pulse" />
          <span className="text-sm font-semibold text-orange-900">Shift In Progress</span>
        </div>
        <div className="text-sm text-orange-700 mb-1">
          Started: {startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-sm text-orange-700">
          Elapsed: {hours}h {mins}min
        </div>
        <div className="text-xs text-orange-600 mt-3 flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5" />
          <span>Pay calculated at shift end (GPS clock-out required)</span>
        </div>
      </div>
    );
  }

  // ACTUAL: Show GPS-verified pay
  if (mode === 'actual') {
    const isGPS = timesheet.clock_in_location && timesheet.clock_out_location;
    const actualHours = timesheet.total_hours || 0;
    const breakMins = timesheet.break_duration_minutes || 0;
    const billableHours = actualHours - (breakMins / 60);
    const pay = timesheet.staff_pay_amount || 0;

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-semibold text-green-900">
            {isGPS ? 'GPS Verified' : 'Paper Timesheet'}
          </span>
          {isGPS && (
            <Badge className="bg-green-600 text-xs">
              {timesheet.geofence_distance_meters}m
            </Badge>
          )}
        </div>

        <div className="space-y-1 text-sm text-green-800 mb-3">
          <div>Worked: {actualHours}h</div>
          {breakMins > 0 && (
            <div>Break: {breakMins}min (unpaid)</div>
          )}
          <div className="font-semibold">Billable: {billableHours.toFixed(2)}h</div>
        </div>

        <div className="border-t border-green-200 pt-3">
          <div className="text-xs text-green-700 mb-1">Gross Pay (Pre-Tax)</div>
          <div className="text-2xl font-bold text-green-900">
            £{pay.toFixed(2)}
          </div>
          <div className="text-xs text-green-600 mt-1">
            £{timesheet.pay_rate}/hr × {billableHours.toFixed(2)}h
          </div>
        </div>

        {timesheet.status !== 'approved' && (
          <div className="text-xs text-green-600 mt-3 flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 mt-0.5" />
            <span>Pending approval - Subject to tax, NI, pension deductions</span>
          </div>
        )}
      </div>
    );
  }

  // PENDING: Awaiting data
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="text-sm text-gray-600">Pay pending timesheet completion</div>
    </div>
  );
}
```

---

## 🧪 **TESTING SCENARIOS**

### **Test 1: GPS Full Shift (Nov 22)**
```
Scheduled: 08:00-20:00 (12h)
Clock in: 08:00
Clock out: 20:00
Expected:
  - Actual: 12h
  - Break: 60min
  - Billable: 11h
  - Pay: £162.25 (14.75 × 11)
```

### **Test 2: GPS Late Start (Nov 19 - Actual)**
```
Scheduled: 08:00-20:00 (12h)
Clock in: 17:42
Clock out: 18:59
Expected:
  - Actual: 1.29h
  - Break: 0min
  - Billable: 1.29h
  - Pay: £19.03 (14.75 × 1.29)
  - Currently showing: £177 ❌
```

### **Test 3: GPS Late Start with Overtime**
```
Scheduled: 08:00-20:00 (12h)
Clock in: 11:34
Clock out: 22:00 (2h overtime)
Expected:
  - Actual: 10.43h
  - Break: 60min
  - Billable: 9.43h
  - Pay: £139.09 (14.75 × 9.43)
```

### **Test 4: Paper Timesheet**
```
Scheduled: 08:00-20:00 (12h)
Manual entry: 8.5h worked, 60min break
Expected:
  - Actual: 8.5h
  - Break: 60min
  - Billable: 7.5h
  - Pay: £110.63 (14.75 × 7.5)
```

---

## 🔐 **PAYROLL LOCK LOGIC**

### **When to Lock Financial Data:**

```typescript
// Lock timesheet when shift completed AND approved
const shouldLockFinancials = (shift, timesheet) => {
  return (
    shift.status === 'completed' &&
    timesheet.status === 'approved' &&
    timesheet.staff_pay_amount > 0 &&
    timesheet.total_hours > 0 &&
    (shift.shift_started_at !== null && shift.shift_ended_at !== null)
  );
};

// When locking, create immutable snapshot
if (shouldLockFinancials(shift, timesheet)) {
  await supabase.from('timesheets').update({
    financial_locked: true,
    financial_locked_at: new Date().toISOString(),
    financial_snapshot: {
      total_hours: timesheet.total_hours,
      break_duration_minutes: timesheet.break_duration_minutes,
      pay_rate: timesheet.pay_rate,
      charge_rate: timesheet.charge_rate,
      staff_pay_amount: timesheet.staff_pay_amount,
      client_charge_amount: timesheet.client_charge_amount,
      locked_at: new Date().toISOString()
    }
  }).eq('id', timesheet.id);
}
```

---

## 📋 **IMPLEMENTATION CHECKLIST**

- [ ] Step 1: Add `calculateActualPay()` function to clock-out handler
- [ ] Step 2: Update `MobileClockIn.jsx` clock-out to recalculate pay
- [ ] Step 3: Create `PayDisplay.jsx` component with 3-tier logic
- [ ] Step 4: Update timesheet UI to use `PayDisplay` component
- [ ] Step 5: Test with all 4 scenarios above
- [ ] Step 6: Add payroll lock logic
- [ ] Step 7: Update `generate-invoice` to use locked financials
- [ ] Step 8: Update `generate-payslip` to use locked financials
- [ ] Step 9: Document break deduction standards for agencies
- [ ] Step 10: Train admins on new pay display system

---

## 🎯 **EXPECTED OUTCOMES**

**Before Fix:**
- Nov 19 shift: Shows £177 for 1.29h worked ❌
- Nov 22 shift: Shows £177 while in_progress ❌
- Confusing for staff
- Disputes inevitable

**After Fix:**
- Nov 19 shift: Shows £19.03 for 1.29h worked ✅
- Nov 22 shift: Shows "Shift in progress" (no pay yet) ✅
- Clear, accurate, trustworthy
- Automated payroll ready

---

## 🚀 **DEPLOYMENT PLAN**

**Priority:** CRITICAL
**Timeline:** Implement ASAP (before next payroll run)
**Risk:** Medium (changes pay calculation - needs thorough testing)
**Testing:** Test environment with 4 scenarios above
**Rollback:** Keep old `staff_pay_amount` as `staff_pay_amount_scheduled` for comparison

---

**Created By**: Claude Code AI
**Date**: 2025-11-22
**Status**: Ready for Implementation
