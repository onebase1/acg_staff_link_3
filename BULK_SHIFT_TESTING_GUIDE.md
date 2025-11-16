# 🧪 BULK SHIFT CREATION - TESTING GUIDE

**Created:** 2025-11-15  
**Purpose:** End-to-end testing of the 4-step bulk shift creation workflow  

---

## 📋 TEST OVERVIEW

### What's Being Tested

The complete bulk shift creation workflow from client selection to database insertion:

1. **Step 1:** Select Client & Date Range
2. **Step 2:** Select Roles (Day/Night shifts)
3. **Step 3:** Fill Grid with shift quantities
4. **Step 4:** Preview and Create shifts

### Test Files

- **Test Spec:** `tests/bulk-shift-creation.spec.js`
- **Run Script:** `run-bulk-shift-test.bat`

---

## 🚀 HOW TO RUN THE TEST

### Prerequisites

1. **Dev Server Running:**
   ```bash
   npm run dev
   ```
   Server must be accessible at `http://localhost:5173`

2. **Database Accessible:**
   - Supabase project must be running
   - Test data must exist (clients, staff)

3. **Test User Exists:**
   - Email: `info@guest-glow.com`
   - Password: `Dominion#2025`
   - User must be an admin with access to bulk shift creation

### Run the Test

**Option 1: Using the batch file (Windows)**
```bash
run-bulk-shift-test.bat
```

**Option 2: Using npm/npx directly**
```bash
# Headed mode (see browser)
npx playwright test tests/bulk-shift-creation.spec.js --headed --project=chromium

# Headless mode (faster)
npx playwright test tests/bulk-shift-creation.spec.js

# With debug mode
npx playwright test tests/bulk-shift-creation.spec.js --debug
```

---

## 🧪 TEST SCENARIOS

### Test 1: Complete Workflow
**File:** `tests/bulk-shift-creation.spec.js` - Line 48

**Steps:**
1. Login as admin
2. Navigate to Bulk Shift Creation
3. Select first client from dropdown
4. Set date range to "Next 7 Days"
5. Select Healthcare Assistant (Day & Night shifts)
6. Fill grid using "Weekdays" bulk fill
7. Generate preview
8. Create all shifts
9. Verify shifts appear in database

**Expected Result:**
- ✅ All steps complete without errors
- ✅ Shifts created in database
- ✅ Success message displayed
- ✅ Shifts visible on /shifts page

---

### Test 2: Duplicate Last Week
**File:** `tests/bulk-shift-creation.spec.js` - Line 196

**Steps:**
1. Login as admin
2. Navigate to Bulk Shift Creation
3. Select client and date range
4. Select roles
5. Click "Duplicate Last Week" button
6. Verify grid is populated with previous week's data

**Expected Result:**
- ✅ Grid auto-fills with shift quantities from 7 days ago
- ⚠️ If no historical data, button may not populate grid (expected)

---

## 🔍 TROUBLESHOOTING

### Issue: "Cannot read properties of undefined (reading 'split')"

**Cause:** UI changed from 3-step to 4-step workflow, old component props don't match

**Solution:** 
- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache
- Restart dev server

### Issue: "Client dropdown not found"

**Cause:** Radix UI Select component uses different selectors

**Solution:**
- Test uses `button#client-select` to open dropdown
- Then clicks `[role="option"]` to select
- If still failing, check actual HTML structure

### Issue: "No shifts created"

**Possible Causes:**
1. RLS policies blocking insertion
2. Client has no enabled roles
3. Validation errors in shift data
4. Database connection issues

**Debug Steps:**
1. Check browser console for errors
2. Check Supabase logs
3. Verify client has `enabled_roles` configured
4. Check `shift_window_type` is set

### Issue: "Duplicate Last Week doesn't populate"

**Expected Behavior:**
- Only populates if shifts exist from 7 days ago
- If no historical data, grid remains empty (not a failure)

---

## 📊 TEST RESULTS INTERPRETATION

### Success Indicators

```
✅ Logged in successfully
✅ Bulk Shift Creation page loaded
✅ STEP 1 Complete
✅ Client selected
✅ Date range set to next 7 days
✅ STEP 2 Complete
✅ Selected HCA Day shifts
✅ STEP 3 Complete
✅ Filled weekdays with 2 HCA day shifts each
✅ STEP 4 Complete - Shifts created successfully
✅ TEST COMPLETE: X shifts found in database
```

### Failure Indicators

```
❌ Authentication failed
❌ Profile not found
❌ Client dropdown not found
❌ Role checkboxes not found
❌ Preview table not visible
❌ Shifts not created
```

---

## 🛠️ MANUAL TESTING CHECKLIST

If automated tests fail, perform manual testing:

### Step 1: Client Setup
- [ ] Client dropdown loads all clients
- [ ] Selecting client populates shift times
- [ ] Date pickers work correctly
- [ ] "Next 7 Days" preset works
- [ ] "This Week" preset works
- [ ] "Next Week" preset works
- [ ] Validation prevents invalid date ranges

### Step 2: Role Selection
- [ ] Only enabled roles appear for selected client
- [ ] Day/Night checkboxes work
- [ ] "Select All" works
- [ ] "Clear All" works
- [ ] Summary shows selected roles
- [ ] Continue button disabled until role selected

### Step 3: Grid
- [ ] Grid shows correct date range
- [ ] Grid shows only selected roles
- [ ] Number inputs accept values
- [ ] "Weekdays" bulk fill works
- [ ] "Weekends" bulk fill works
- [ ] "Clear All" works
- [ ] "Duplicate Last Week" works (if historical data exists)
- [ ] Keyboard navigation works (Tab, Arrow keys)
- [ ] Smart paste works
- [ ] CSV upload works

### Step 4: Preview
- [ ] Preview table shows all shifts
- [ ] Shift details are correct (date, time, role, type)
- [ ] Edit modal works
- [ ] Delete shift works
- [ ] "Create All Shifts" button works
- [ ] Progress bar shows during creation
- [ ] Success message appears
- [ ] Shifts appear in database

---

## 📝 NOTES FOR DEVELOPERS

### Key Changes from 3-Step to 4-Step

**Old Flow:**
1. Setup → Grid → Preview

**New Flow:**
1. Setup → **Roles** → Grid → Preview

**Impact on Tests:**
- Step numbers shifted (+1)
- New RoleSelector component between Setup and Grid
- Grid now receives `activeRoles` from RoleSelector
- Navigation handlers updated

### Selectors Used

```javascript
// Client dropdown (Radix UI)
'button#client-select'
'[role="option"]'

// Date presets
'button:has-text("Next 7 Days")'

// Role checkboxes
'input[type="checkbox"]'

// Bulk fill buttons
'button:has-text("Weekdays")'

// Navigation
'button:has-text("Next:")'
'button:has-text("Continue")'
'button:has-text("Generate Preview")'
'button:has-text("Create")'
```

---

## ✅ COMPLETION CHECKLIST

- [x] Test file created: `tests/bulk-shift-creation.spec.js`
- [x] Run script created: `run-bulk-shift-test.bat`
- [x] Documentation created: `BULK_SHIFT_TESTING_GUIDE.md`
- [ ] Test executed successfully
- [ ] Results documented
- [ ] Bugs fixed (if any found)

---

**Status:** ✅ READY FOR TESTING  
**Next Step:** Run `run-bulk-shift-test.bat` and verify all tests pass

