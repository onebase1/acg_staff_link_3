# Staff Onboarding Flow - Critical Issues Found

**Date:** 2025-11-13  
**Tester:** AI Agent  
**Test User:** Chadaira Basera (g.basera5+chadaira@gmail.com)  
**Status:** 🔴 CRITICAL ISSUES FOUND

---

## 🔍 Test Results - Stage 1: Login & Initial State

### ✅ What Worked
- User can login successfully
- Redirects to ProfileSetup page
- Profile form loads correctly
- No JavaScript errors on page load

### ❌ Critical Issues Found

#### Issue #1: User Type is "pending" Instead of "staff_member"
**Severity:** 🔴 CRITICAL  
**Impact:** User sees "Account Under Review" banner and cannot submit profile

**Database State:**
```json
{
  "id": "d617ddd7-3103-4d0b-a2e3-35eedec4212a",
  "email": "g.basera5+chadaira@gmail.com",
  "full_name": "Chadaira Basera",
  "user_type": "pending",  // ❌ WRONG - should be "staff_member"
  "agency_id": null,        // ❌ WRONG - should be Dominion agency ID
  "phone": "",
  "profile_photo_url": null
}
```

**Root Cause:**
- User signed up WITHOUT using the invitation link
- OR invitation link didn't include email parameter
- OR `checkInvitedUser()` function didn't detect the staff record
- OR staff record was never created by admin

**Expected State:**
```json
{
  "user_type": "staff_member",
  "agency_id": "<dominion_agency_id>"
}
```

---

#### Issue #2: No Staff Record Found
**Severity:** 🔴 CRITICAL  
**Impact:** User is not linked to any staff record, cannot be assigned shifts

**Console Warning:**
```
⚠️ [ProfileSetup] No staff record found for email: g.basera5+chadaira@gmail.com
```

**Database Query Result:**
```javascript
// Query: SELECT * FROM staff WHERE email = 'g.basera5+chadaira@gmail.com'
// Result: null (no record found)
```

**Possible Causes:**
1. Admin never sent invitation (staff record never created)
2. Staff record was deleted
3. Email mismatch (typo in invitation vs signup)
4. Staff record exists but with different email format

---

#### Issue #3: "Awaiting Approval" Banner Showing Incorrectly
**Severity:** 🟡 MEDIUM  
**Impact:** Confusing UX - invited staff shouldn't see this banner

**Current Logic:** `src/pages/ProfileSetup.jsx` line 108
```javascript
const isPendingUser = user?.user_type === 'pending';
```

**Banner Display:** Lines 486-494
```javascript
{isPendingUser && !isSuperAdmin && (
  <Alert className="border-orange-300 bg-orange-50">
    <AlertDescription>
      <strong>⏳ Account Under Review</strong>
      <p>Your account is awaiting approval from an agency administrator.</p>
    </AlertDescription>
  </Alert>
)}
```

**Expected Behavior:**
- Invited staff (with staff record) should NOT see this banner
- Only self-signup users (no staff record) should see "Awaiting Approval"

**Fix Required:**
```javascript
// Should check if user is linked to staff record
const isPendingUser = user?.user_type === 'pending' && !linkedStaff;
```

---

#### Issue #4: Submit Button Disabled
**Severity:** 🔴 CRITICAL  
**Impact:** User cannot complete profile setup

**Current State:** Line 997
```javascript
<Button 
  disabled={updateMutation.isPending || isPendingUser}
>
  {isPendingUser ? '⏳ Awaiting Approval' : 'Complete Setup'}
</Button>
```

**Why Disabled:**
- `isPendingUser === true` because `user_type === 'pending'`

**Fix Required:**
- Change user_type to 'staff_member'
- OR update logic to allow pending users with linked staff records to submit

---

## 🎯 Root Cause Analysis

### Scenario 1: User Signed Up Directly (Most Likely)
**What Happened:**
1. User went to `/login?view=sign-up` WITHOUT email parameter
2. Filled out full signup form (all fields visible)
3. Created account with `user_type: 'pending'` (default)
4. No staff record was linked

**Evidence:**
- `user_type: 'pending'` (default for non-invited users)
- `agency_id: null`
- No staff record found

**Solution:**
- Admin must send proper invitation first
- Invitation email must include link: `/login?view=sign-up&email=g.basera5+chadaira@gmail.com`
- User must click that link to trigger `checkInvitedUser()`

---

### Scenario 2: Invitation Was Sent But Link Was Wrong
**What Happened:**
1. Admin sent invitation
2. Email link was missing `&email=` parameter
3. User clicked link, went to signup page
4. `checkInvitedUser()` never ran
5. User saw full signup form, created "pending" account

**Evidence:**
- Would need to check invitation email template
- Check if `resendInvitation` function includes email parameter

**Solution:**
- Verify invitation email template includes correct link format
- Test resend invitation feature

---

## 🔧 Immediate Fixes Required

### Fix #1: Update Chadaira's Profile (Database Fix)
```sql
-- Update user_type and agency_id
UPDATE profiles
SET 
  user_type = 'staff_member',
  agency_id = (SELECT id FROM agencies WHERE name ILIKE '%dominion%' LIMIT 1)
WHERE email = 'g.basera5+chadaira@gmail.com';
```

### Fix #2: Create Staff Record for Chadaira
```sql
-- Create staff record
INSERT INTO staff (
  first_name, last_name, email, user_id, agency_id, 
  status, role, employment_type
)
VALUES (
  'Chadaira', 'Basera', 'g.basera5+chadaira@gmail.com',
  'd617ddd7-3103-4d0b-a2e3-35eedec4212a',
  (SELECT id FROM agencies WHERE name ILIKE '%dominion%' LIMIT 1),
  'onboarding', 'care_worker', 'temporary'
);
```

### Fix #3: Update ProfileSetup Logic
**File:** `src/pages/ProfileSetup.jsx`

**Change Line 108:**
```javascript
// BEFORE
const isPendingUser = user?.user_type === 'pending';

// AFTER
const isPendingUser = user?.user_type === 'pending' && !linkedStaff;
```

**Rationale:**
- If user has linked staff record, they're NOT pending (admin invited them)
- Only show "Awaiting Approval" for self-signup users without staff record

---

## 📋 Testing Plan - Corrected Flow

### Test 1: Fix Current User (Chadaira)
- [ ] Update profile: user_type = 'staff_member', agency_id = Dominion
- [ ] Create staff record linked to user
- [ ] Refresh page, verify banner gone
- [ ] Verify submit button enabled
- [ ] Complete profile setup
- [ ] Verify status changes to 'active'

### Test 2: Test Proper Invitation Flow (New User)
- [ ] Login as Dominion admin
- [ ] Send invitation to new test email
- [ ] Verify invitation email received
- [ ] Verify email link includes `&email=` parameter
- [ ] Click link, verify signup form shows only 3 fields
- [ ] Complete signup
- [ ] Verify user_type = 'staff_member'
- [ ] Verify agency_id set correctly
- [ ] Verify staff record linked
- [ ] Complete profile setup

---

## 🚨 Action Items

### Immediate (Now)
1. ✅ Document issues found
2. ⏳ Fix Chadaira's profile in database
3. ⏳ Update ProfileSetup.jsx logic
4. ⏳ Test profile completion with fixed data

### Short Term (Today)
1. ⏳ Test complete invitation flow with new user
2. ⏳ Verify invitation email template
3. ⏳ Test resend invitation feature
4. ⏳ Create automated test for invitation flow

### Medium Term (This Week)
1. ⏳ Add better error messages for mismatched states
2. ⏳ Add admin tool to fix orphaned profiles
3. ⏳ Add validation to prevent direct signup without invitation
4. ⏳ Improve onboarding UX for edge cases

---

**Next Steps:**
1. Fix database records for Chadaira
2. Update ProfileSetup.jsx logic
3. Continue testing profile completion
4. Document all findings in comprehensive report

---

**Last Updated:** 2025-11-13 (Stage 1 Testing Complete)

