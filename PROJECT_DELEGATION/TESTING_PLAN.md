# COMPREHENSIVE TESTING PLAN - BULK SHIFT CREATION

**Date:** 2025-11-15
**Project Leader:** Advanced AI Agent
**Status:** Ready for Testing

---

## 🎯 TESTING OBJECTIVES

1. Verify P2.7 - Duplicate Last Week works correctly
2. Integration test all Phase 2 features together
3. Ensure no regressions in existing functionality
4. Validate security (RLS policies)
5. Test edge cases and error scenarios

---

## 📋 MANUAL TESTING CHECKLIST

### P2.7 - Duplicate Last Week

#### Test 1: Happy Path
**Prerequisites:**
- Database has shifts from last week for a test client
- User is logged in as agency admin

**Steps:**
1. Navigate to Bulk Shift Creation
2. Select client with existing shifts
3. Select date range (current week)
4. Click "Duplicate Last Week"
5. Confirm dialog

**Expected:**
- ✅ Loading state shows
- ✅ Grid populates with quantities
- ✅ Success toast shows count
- ✅ Day-of-week alignment maintained

#### Test 2: No Previous Shifts
**Steps:**
1. Select client with NO previous shifts
2. Select date range
3. Click "Duplicate Last Week"

**Expected:**
- ✅ Warning toast: "No shifts found from last week"
- ✅ Grid remains unchanged

#### Test 3: Partial Week Overlap
**Steps:**
1. Create shifts for only Mon-Wed last week
2. Select full week (Mon-Sun) current week
3. Click "Duplicate Last Week"

**Expected:**
- ✅ Only Mon-Wed populated
- ✅ Thu-Sun remain empty
- ✅ Toast shows correct count

#### Test 4: User Cancels Confirmation
**Steps:**
1. Click "Duplicate Last Week"
2. Click "Cancel" on confirmation dialog

**Expected:**
- ✅ No changes to grid
- ✅ No API call made
- ✅ No toast shown

#### Test 5: Button Disabled States
**Steps:**
1. Load page without selecting client
2. Check button state
3. Select client but no date range
4. Check button state

**Expected:**
- ✅ Button disabled when no client
- ✅ Button disabled when no date range
- ✅ Button enabled when both selected

#### Test 6: Loading State
**Steps:**
1. Click "Duplicate Last Week"
2. Observe button during API call

**Expected:**
- ✅ Button text changes to "Loading..."
- ✅ Button disabled during load
- ✅ Button re-enabled after completion

#### Test 7: Mixed Shift Types
**Steps:**
1. Create last week: 2 nurse_day, 3 nurse_night, 2 hca_day
2. Duplicate to current week

**Expected:**
- ✅ All shift types correctly mapped
- ✅ Quantities preserved
- ✅ No data loss

#### Test 8: Overwrite Existing Data
**Steps:**
1. Manually enter 5 shifts for Monday
2. Duplicate last week (has 2 shifts Monday)
3. Confirm overwrite

**Expected:**
- ✅ Monday now shows 2 (not 7)
- ✅ Confirmation dialog warned user
- ✅ Other days unaffected

---

### Integration Testing - All Phase 2 Features

#### Test 9: Duplicate + Edit
**Steps:**
1. Duplicate last week
2. Click "Preview Shifts"
3. Edit individual shift
4. Create shifts

**Expected:**
- ✅ All features work together
- ✅ Edited shift saved correctly
- ✅ Database insert successful

#### Test 10: Duplicate + Bulk Fill
**Steps:**
1. Duplicate last week
2. Click "Fill Weekends" with different quantity
3. Preview and create

**Expected:**
- ✅ Weekends overwritten with new quantity
- ✅ Weekdays retain duplicated values
- ✅ All shifts created correctly

#### Test 11: CSV Upload + Duplicate
**Steps:**
1. Upload CSV with some shifts
2. Click "Duplicate Last Week"
3. Verify merge behavior

**Expected:**
- ✅ Both sources merged correctly
- ✅ Duplicate overwrites matching dates
- ✅ CSV data for non-matching dates preserved

#### Test 12: Keyboard Nav + Duplicate
**Steps:**
1. Duplicate last week
2. Use Tab/Arrow keys to navigate
3. Edit some cells
4. Preview

**Expected:**
- ✅ Keyboard nav works on duplicated data
- ✅ Manual edits override duplicated values
- ✅ All data preserved

---

## 🔒 SECURITY TESTING

### Test 13: RLS Policy Enforcement
**Steps:**
1. Login as Agency A admin
2. Duplicate shifts
3. Verify only Agency A shifts fetched

**Expected:**
- ✅ No cross-agency data leakage
- ✅ RLS policies enforced
- ✅ Query filtered by agency_id

### Test 14: Client Isolation
**Steps:**
1. Select Client A
2. Duplicate last week
3. Verify only Client A shifts fetched

**Expected:**
- ✅ No cross-client data
- ✅ Query filtered by client_id

---

## ⚡ PERFORMANCE TESTING

### Test 15: Large Dataset
**Steps:**
1. Create 500 shifts last week
2. Duplicate to current week
3. Measure response time

**Expected:**
- ✅ Response < 3 seconds
- ✅ No browser freeze
- ✅ Loading indicator shown

---

## 🐛 ERROR SCENARIOS

### Test 16: Network Error
**Steps:**
1. Disconnect internet
2. Click "Duplicate Last Week"

**Expected:**
- ✅ Error toast shown
- ✅ Grid unchanged
- ✅ Button re-enabled

### Test 17: Database Error
**Steps:**
1. Simulate database error (if possible)
2. Click "Duplicate Last Week"

**Expected:**
- ✅ Error toast with message
- ✅ Graceful failure
- ✅ No crash

---

## ✅ ACCEPTANCE CRITERIA

**P2.7 passes when:**
- [ ] All 17 tests pass
- [ ] No console errors
- [ ] No console warnings
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete

**Phase 2 passes when:**
- [ ] All 7 features tested
- [ ] Integration tests pass
- [ ] No regressions
- [ ] User documentation complete
- [ ] Ready for production

---

## 📊 TEST RESULTS

**To be filled after testing:**

| Test | Status | Notes |
|------|--------|-------|
| Test 1 | ⬜ | |
| Test 2 | ⬜ | |
| ... | ⬜ | |

---

**Next:** Execute tests and document results

