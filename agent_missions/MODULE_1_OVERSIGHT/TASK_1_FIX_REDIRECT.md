# TASK MODULE 1: Fix Client User Redirect After Profile Save

**Priority:** 🔴 **CRITICAL BLOCKER**
**Estimated Time:** 5 minutes
**Assigned To:** Implementation Agent
**Verification Required:** Yes (by user)

---

## PROBLEM STATEMENT

After client users complete their profile setup and click "Save Changes", they are incorrectly redirected to `/Dashboard` instead of `/ClientPortal`. This causes either:
1. 404 error (Dashboard doesn't exist for client users)
2. Permission denied
3. Redirect loop to signin page

---

## ROOT CAUSE

**File:** `src/pages/ProfileSetup.jsx`
**Lines:** 477-491

The `onSuccess` callback in the `updateMutation` has no case for `user_type === 'client_user'`.

**Current code:**
```javascript
onSuccess: () => {
  toast.success('✅ Profile updated successfully!');

  setTimeout(() => {
    if (isSuperAdmin) {
      navigate(createPageUrl('Dashboard'));
    } else if (formData.user_type === 'staff_member') {
      navigate(createPageUrl('StaffPortal'));
    } else {
      navigate(createPageUrl('Dashboard'));  // ❌ CLIENT USERS LAND HERE
    }

    window.location.reload();
  }, 1500);
},
```

Client users fall through to the `else` block and incorrectly navigate to Dashboard.

---

## SOLUTION

Add explicit case for `client_user` type to redirect to `/ClientPortal`.

---

## IMPLEMENTATION INSTRUCTIONS

### Step 1: Open File
```
File: src/pages/ProfileSetup.jsx
Lines: 477-491
```

### Step 2: Locate the onSuccess Callback

Find this code block:
```javascript
onSuccess: () => {
  toast.success('✅ Profile updated successfully!');

  setTimeout(() => {
    if (isSuperAdmin) {
      navigate(createPageUrl('Dashboard'));
    } else if (formData.user_type === 'staff_member') {
      navigate(createPageUrl('StaffPortal'));
    } else {
      navigate(createPageUrl('Dashboard'));
    }

    window.location.reload();
  }, 1500);
},
```

### Step 3: Apply Fix

Replace with:
```javascript
onSuccess: () => {
  toast.success('✅ Profile updated successfully!');

  setTimeout(() => {
    if (isSuperAdmin) {
      navigate(createPageUrl('Dashboard'));
    } else if (formData.user_type === 'staff_member') {
      navigate(createPageUrl('StaffPortal'));
    } else if (formData.user_type === 'client_user') {
      // ✅ FIX: Redirect client users to their portal
      navigate(createPageUrl('ClientPortal'));
    } else {
      // Fallback for other user types (agency_admin, etc.)
      navigate(createPageUrl('Dashboard'));
    }

    window.location.reload();
  }, 1500);
},
```

### Step 4: Save File

---

## VERIFICATION STEPS

**User must verify this fix:**

1. Login as client user with OPERATIONS_MANAGER role
   - Email: (previously created ops_manager@divinecare.com or similar)
   - Or use existing finance user switched to OPERATIONS_MANAGER role

2. Navigate to `/ProfileSetup` manually (or click profile settings)

3. Make a minor change:
   - Update phone number
   - Or change any non-critical field

4. Click "Save Changes" button

5. **Expected Result:**
   - Toast message: "✅ Profile updated successfully!"
   - After 1.5 seconds → redirect to `/ClientPortal`
   - Page shows: "Divine Care Center" header with dashboard

6. **Failure Indicators:**
   - Redirects to `/Dashboard` instead ❌
   - Shows 404 error ❌
   - Redirects to signin page ❌
   - Console errors ❌

---

## ROLLBACK PLAN

If this fix causes issues:

1. Revert lines 477-491 to original code
2. Client users will have broken redirect (current state)
3. Investigate alternative routing solution

---

## RELATED FILES

- **Modified:** `src/pages/ProfileSetup.jsx` (lines 477-491)
- **Referenced:** `src/pages/Home.jsx` (client_user routing logic)
- **Referenced:** `src/pages/ClientPortal.jsx` (destination page)

---

## ADDITIONAL CONTEXT

**Why this was missed:**
- Original implementation agent focused on staff and admin user flows
- Client portal was added later (Module 1)
- ProfileSetup pre-dates client_user type
- Testing didn't cover client user profile save flow

**Why it matters:**
- Without this fix, client users cannot use the portal after profile setup
- Module 1 is effectively broken for new client users
- Existing client users may have encountered this and given up

---

## SUCCESS CRITERIA

- [x] Code modified in `ProfileSetup.jsx`
- [ ] File saved without syntax errors
- [ ] User verifies redirect to `/ClientPortal` works
- [ ] No console errors during redirect
- [ ] Page loads correctly after redirect

---

**Status:** ⏳ Awaiting implementation
**Verification:** ⏳ Awaiting user confirmation after implementation
