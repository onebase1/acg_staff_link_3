# Shift Journey Testing Plan - Module 1.2

**Date:** 2025-11-14  
**Status:** 🔴 **CRITICAL BUG FOUND** - Timesheet creation missing in staff confirmation  
**Test Credentials:** info@guest-glow.com / Dominion#2025

---

## 🚨 CRITICAL FINDING

### **Timesheet Creation Bug**

**Problem:** Staff-confirmed shifts do NOT create timesheets, breaking the entire workflow.

| Confirmation Method | Creates Timesheet? | Status |
|---------------------|-------------------|--------|
| Admin Bypass (Shifts.jsx) | ✅ YES | Working |
| Staff Portal (StaffPortal.jsx) | ❌ NO | **BROKEN** |
| SMS Confirmation | ❓ Unknown | Needs testing |

**Impact:** 🔴 **BLOCKING** - Staff cannot upload timesheets, GPS tracking fails, invoicing broken

**Fix Required:** Add `auto-timesheet-creator` call to StaffPortal.jsx (Line ~398)

---

## 📋 Shift Journey Flow

### **Expected Journey:**

```
1. CREATE SHIFT
   ↓ Status: open
   
2. ASSIGN STAFF
   ↓ Status: assigned
   ↓ Booking created
   
3. STAFF CONFIRMS ⚠️ CRITICAL STEP
   ↓ Status: confirmed
   ↓ Booking updated to confirmed
   ↓ ❌ TIMESHEET SHOULD BE CREATED HERE (CURRENTLY MISSING)
   
4. SHIFT STARTS (automated)
   ↓ Status: in_progress
   ↓ shift_started_at timestamp set
   
5. SHIFT ENDS (automated)
   ↓ Status: awaiting_admin_closure
   ↓ shift_ended_at timestamp set
   ↓ Admin workflow created
   
6. ADMIN COMPLETES SHIFT
   ↓ Status: completed
   ↓ Timesheet updated with actual hours
   ↓ Ready for approval
```

---

## 🧪 Test Scenarios

### **Scenario 1: Admin Bypass Confirmation** ✅

**Steps:**
1. Login as admin (info@guest-glow.com)
2. Navigate to /shifts
3. Click "Assign" on open shift
4. Check "Confirm on behalf of staff"
5. Select staff member
6. Click "Assign"

**Expected Results:**
- ✅ Shift status = `confirmed`
- ✅ Booking created with status = `confirmed`
- ✅ **Timesheet created** (draft status)
- ✅ Success notification appears

**Actual Results:** ✅ **WORKING** - Timesheet created successfully

**Code Location:** `src/pages/Shifts.jsx` (Lines 410-427)

---

### **Scenario 2: Staff Portal Confirmation** ❌

**Steps:**
1. Admin assigns shift to staff (status = `assigned`)
2. Staff logs into Staff Portal
3. Navigate to "My Shifts"
4. Click "Confirm" on assigned shift

**Expected Results:**
- ✅ Shift status = `confirmed`
- ✅ Booking updated to `confirmed`
- ❌ **Timesheet created** (draft status) - **CURRENTLY FAILS**

**Actual Results:** ❌ **BROKEN** - No timesheet created

**Code Location:** `src/pages/StaffPortal.jsx` (Lines 335-400)

**Fix Needed:** YES - Add timesheet creation logic

---

### **Scenario 3: Shift Status Automation**

**Steps:**
1. Create shift for today with start time in past
2. Wait for automation cron (runs every 5 minutes)
3. Verify shift status changes

**Expected Results:**
- Shift status changes from `confirmed` → `in_progress` at start time
- Shift status changes from `in_progress` → `awaiting_admin_closure` at end time
- Admin workflow created for verification

**Automation:** `supabase/functions/shift-status-automation/index.ts`

---

### **Scenario 4: Timesheet Verification**

**Steps:**
1. After shift confirmed, navigate to /timesheets
2. Verify timesheet exists
3. Check timesheet status and details

**Expected Results:**
- Timesheet exists with status = `draft`
- Timesheet linked to correct shift, staff, client
- Pay rate and charge rate populated
- Total hours = shift duration

**Current Status:** ❌ Only works for admin bypass, not staff confirmation

---

## 🔧 Required Fixes

### **Fix 1: StaffPortal.jsx Timesheet Creation** 🔴 CRITICAL

**File:** `src/pages/StaffPortal.jsx`  
**Location:** After booking creation/update (Line ~398)

**Add this code:**

```javascript
// ✅ FIX: Create timesheet when staff confirms shift
let timesheetId = null;
try {
  const bookingId = existingBooking?.id || (await supabase
    .from('bookings')
    .select('id')
    .eq('shift_id', shiftId)
    .eq('staff_id', staffRecord.id)
    .single()).data?.id;

  if (bookingId) {
    const { data: timesheetResponse, error: timesheetError } = await supabase.functions.invoke('auto-timesheet-creator', {
      body: {
        booking_id: bookingId,
        shift_id: shiftId,
        staff_id: staffRecord.id,
        client_id: shift.client_id,
        agency_id: shift.agency_id
      }
    });
    
    if (timesheetError) {
      console.error('❌ Timesheet creation failed:', timesheetError);
    } else if (timesheetResponse.data?.success) {
      timesheetId = timesheetResponse.data.timesheet_id;
      console.log('✅ Timesheet created:', timesheetId);
    }
  }
} catch (timesheetError) {
  console.error('❌ Timesheet creation error:', timesheetError);
  // Don't fail the confirmation if timesheet creation fails
}

return { shiftId, timesheetId };
```

---

## 🧪 Playwright Tests Created

### **File:** `tests/shift-journey.spec.js`

**Test Cases:**
1. ✅ Admin bypass confirmation creates timesheet
2. ❌ Verify timesheet exists after confirmation (will pass after fix)
3. ✅ Check shift status progression

**Running Tests:**

```bash
# Start dev server first
npm run dev

# In another terminal, run tests
npx playwright test shift-journey.spec.js

# Run with UI
npx playwright test shift-journey.spec.js --ui

# Run specific test
npx playwright test shift-journey.spec.js -g "Admin bypass"
```

---

## 📊 Testing Checklist

### **Pre-Test Setup**
- [ ] Dev server running (`npm run dev`)
- [ ] Login credentials verified
- [ ] Dominion Agency has active staff
- [ ] Open shifts exist for testing

### **Manual Testing**
- [ ] Test admin bypass confirmation → verify timesheet created
- [ ] Test staff portal confirmation → verify timesheet created (after fix)
- [ ] Test shift status automation → verify status changes
- [ ] Test timesheet appears in /timesheets page
- [ ] Test timesheet has correct data (rates, hours, dates)

### **Automated Testing**
- [ ] Run Playwright tests
- [ ] All tests passing
- [ ] Screenshots captured for failures

---

## 📝 Related Files

1. **src/pages/StaffPortal.jsx** - ❌ Needs fix
2. **src/pages/Shifts.jsx** - ✅ Working reference
3. **supabase/functions/auto-timesheet-creator/index.ts** - Timesheet creation logic
4. **supabase/functions/shift-status-automation/index.ts** - Status automation
5. **tests/shift-journey.spec.js** - Playwright tests
6. **CRITICAL_BUG_TIMESHEET_CREATION.md** - Detailed bug analysis

---

## ✅ Success Criteria

- [ ] Staff confirmation creates timesheet
- [ ] Admin bypass confirmation creates timesheet
- [ ] Shift status automation working
- [ ] All Playwright tests passing
- [ ] Manual testing complete
- [ ] Bug fix deployed and verified

---

**Status:** 🔴 **BLOCKED** - Critical bug must be fixed before production  
**Priority:** 🔴 **HIGHEST** - Breaks core workflow  
**Estimated Fix Time:** 15 minutes  
**Testing Time:** 30 minutes

