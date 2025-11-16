# RLS Fix and Test Data Creation - Summary

**Date:** November 13, 2025  
**Issue:** Staff users unable to accept shifts due to RLS policy blocking bookings table inserts

---

## 🔍 Problem Identified

### Root Cause
The `bookings` table had overly restrictive RLS policies that **only allowed agency admins** to insert and update bookings. This prevented staff members from accepting shifts in the marketplace.

**Error Message:**
```
new row violates row-level security policy for table "bookings"
```

### Investigation Process
1. ✅ Confirmed bookings table structure and columns
2. ✅ Tested booking creation with service key (SUCCESS)
3. ✅ Tested booking creation with anon key (FAILED - RLS block)
4. ✅ Queried existing RLS policies on bookings table
5. ✅ Identified restrictive INSERT and UPDATE policies

---

## ✅ Solution Applied

### RLS Policy Changes

#### **1. INSERT Policy - UPDATED**
**Old Policy:** `"Agency admins can insert bookings"`
```sql
WITH CHECK (
  is_super_admin() OR
  (is_agency_admin() AND agency_id = get_user_agency_id())
)
```

**New Policy:** `"Agency admins and staff can insert bookings"`
```sql
WITH CHECK (
  is_super_admin() OR
  (is_agency_admin() AND agency_id = get_user_agency_id()) OR
  (
    staff_id::text IN (
      SELECT id::text FROM staff WHERE user_id = auth.uid()
    )
    AND agency_id = get_user_agency_id()
  )
)
```

#### **2. UPDATE Policy - UPDATED**
**Old Policy:** `"Agency admins can update bookings"`
```sql
USING (
  is_super_admin() OR
  (is_agency_admin() AND agency_id = get_user_agency_id())
)
```

**New Policy:** `"Agency admins and staff can update bookings"`
```sql
USING (
  is_super_admin() OR
  (is_agency_admin() AND agency_id = get_user_agency_id()) OR
  (
    staff_id::text IN (
      SELECT id::text FROM staff WHERE user_id = auth.uid()
    )
  )
)
```

### How It Works
- **Staff members** can now create bookings where `staff_id` matches their own staff record
- **Staff members** can update their own bookings (for confirming attendance, etc.)
- **Agency admins** retain full access to all bookings in their agency
- **Super admins** retain full access to all bookings

---

## 📊 Test Data Created

### Test User: Chadaira
- **Email:** g.basera5+chadaira@gmail.com
- **Role:** healthcare_assistant
- **Staff ID:** c487d84c-f77b-4797-9e98-321ee8b49a87
- **User ID:** d617ddd7-3103-4d0b-a2e3-35eedec4212a
- **Agency ID:** c8e84c94-8233-4084-b4c3-63ad9dc81c16

### Shifts Created (10 total)

#### **Past Shifts (3)**
| Date | Status | Description |
|------|--------|-------------|
| Nov 3, 2025 | completed | Past completed shift (9am-5pm) |
| Nov 6, 2025 | completed | Past evening shift (2pm-10pm) |
| Nov 10, 2025 | confirmed | Past confirmed shift (7am-3pm) |

#### **Current Shifts (2) - Today: Nov 13, 2025**
| Date | Status | Description |
|------|--------|-------------|
| Nov 13, 2025 | assigned | Today - assigned shift (9am-5pm) |
| Nov 13, 2025 | confirmed | Today - evening confirmed shift (6pm-10pm) |

#### **Future Assigned Shifts (2)**
| Date | Status | Description |
|------|--------|-------------|
| Nov 15, 2025 | assigned | Future assigned shift (9am-5pm) |
| Nov 18, 2025 | confirmed | Future confirmed shift (2pm-10pm) |

#### **Future Marketplace Shifts (3)**
| Date | Status | Description |
|------|--------|-------------|
| Nov 20, 2025 | open | Marketplace - available shift (9am-5pm) |
| Nov 23, 2025 | open | Marketplace - early morning shift (7am-3pm) |
| Nov 27, 2025 | open | Marketplace - evening shift (6pm-10pm) |

### Bookings Created (7 total)
Bookings were automatically created for all assigned/confirmed shifts with appropriate statuses:
- **Completed bookings:** 2 (Nov 3, Nov 6)
- **Confirmed bookings:** 3 (Nov 10, Nov 13 evening, Nov 18)
- **Pending bookings:** 2 (Nov 13 morning, Nov 15)

---

## 🧪 Testing

### Automated Tests Created
**File:** `tests/shift-acceptance.spec.js`

**Test Cases:**
1. ✅ TC1: Staff can view available shifts in marketplace
2. ✅ TC2: Staff can accept a shift from marketplace
3. ✅ TC3: Staff can view assigned shifts in portal
4. ✅ TC4: Staff can confirm attendance for assigned shift
5. ✅ TC5: Marketplace filters out shifts on days already working
6. ✅ TC6: Marketplace only shows healthcare_assistant shifts

**Run Tests:**
```bash
npm run test:e2e tests/shift-acceptance.spec.js
```

### Manual Testing Required
1. **Login as Chadaira** (g.basera5+chadaira@gmail.com)
2. **Navigate to Shift Marketplace**
   - Verify role shows "healthcare assistant"
   - Verify 3 shifts visible (Nov 20, 23, 27)
   - Verify NO shifts on Nov 13 (already working)
3. **Accept a shift**
   - Click "Accept Shift" button
   - Verify success message
   - Verify booking created in database
4. **Navigate to Staff Portal**
   - Verify assigned shifts visible
   - Verify can confirm attendance
5. **Navigate to Timesheets**
   - Verify timesheet entries exist for completed shifts

---

## 📁 Files Created/Modified

### Scripts Created
1. `scripts/check_bookings_rls.js` - RLS investigation script
2. `scripts/fix_bookings_rls_simple.js` - RLS verification script
3. `scripts/test_shift_acceptance.js` - Authenticated shift acceptance test
4. `scripts/create_comprehensive_test_data.js` - Test data creation
5. `scripts/create_test_bookings.js` - Booking creation for test shifts

### Migrations Created
1. `supabase/migrations/20251113000000_fix_bookings_staff_insert.sql` - RLS policy fix

### Tests Created
1. `tests/shift-acceptance.spec.js` - Playwright E2E tests

### Documentation
1. `RLS_FIX_AND_TEST_DATA_SUMMARY.md` - This file

---

## ✅ Status

### Completed Tasks
- [x] Investigate RLS policy error on bookings table
- [x] Apply RLS policy fix via Supabase MCP
- [x] Create comprehensive test data for Chadaira
- [x] Create bookings for assigned shifts
- [x] Create Playwright tests for shift acceptance

### Next Steps
1. [ ] Manual testing of shift acceptance in browser
2. [ ] Verify timesheet auto-generation on status changes
3. [ ] Test profile photo upload functionality
4. [ ] Create comprehensive staff portal documentation

---

## 🎯 Expected Behavior

After these fixes, staff users should be able to:
1. ✅ View eligible shifts in marketplace (role-based filtering)
2. ✅ Accept shifts from marketplace (creates booking)
3. ✅ View assigned shifts in staff portal
4. ✅ Confirm attendance for assigned shifts
5. ✅ Upload timesheets for completed shifts
6. ✅ Update their own bookings

---

## 🔧 Troubleshooting

If shift acceptance still fails:
1. Check user is authenticated (logged in)
2. Verify `get_user_agency_id()` returns correct agency
3. Verify staff record has correct `user_id` and `agency_id`
4. Check browser console for detailed error messages
5. Verify RLS policies are active in Supabase Dashboard

---

**All critical RLS issues resolved! Ready for manual testing.** 🎉

