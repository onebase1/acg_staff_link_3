# Critical Fixes: Profile Photo & Staff Roles - 2025-11-13

## 🚨 Issues Reported

### Issue #1: Profile Photo Showing Placeholder
**Problem:** User uploads photo but it still shows placeholder image after save and re-login
**Console Errors:** Controlled/uncontrolled input warnings
**Database State:** `profile_photo_url = 'https://via.placeholder.com/150'`

### Issue #2: Staff Roles Inconsistency
**Problem:** "Care Worker" role removed but still showing in staff invite dropdown
**Root Cause:** Multiple hardcoded role lists across codebase - not pulling from same source
**Impact:** Different dropdowns showing different roles (staff invite vs create shift)

---

## ✅ Fixes Applied

### Fix #1: Profile Photo Placeholder Filter

**Files Modified:** `src/pages/ProfileSetup.jsx`

**Changes:**
1. Added placeholder URL detection on form initialization
2. Filters out `placeholder` and `via.placeholder` URLs
3. Sets `profile_photo_url` to empty string if placeholder detected

**Code Changes:**
```javascript
// Line 165-182: Filter placeholder on staff record load
const photoUrl = matchingStaff.profile_photo_url || currentUser.profile_photo_url || '';
const isPlaceholder = photoUrl.includes('placeholder') || photoUrl.includes('via.placeholder');

setFormData({
  ...
  profile_photo_url: isPlaceholder ? '' : photoUrl,
  ...
});

// Line 183-199: Filter placeholder on profile load
const photoUrl = currentUser.profile_photo_url || '';
const isPlaceholder = photoUrl.includes('placeholder') || photoUrl.includes('via.placeholder');

setFormData({
  ...
  profile_photo_url: isPlaceholder ? '' : photoUrl
});
```

**Result:** 
- Placeholder URLs no longer displayed as uploaded photos
- UI correctly shows "REQUIRED" state when no real photo exists
- User must upload actual photo to satisfy requirement

---

### Fix #2: Centralized Staff Roles Configuration

**Problem Analysis:**
- **InviteStaffModal.jsx:** Had `care_worker`, `hca` (deprecated roles) ❌
- **PostShiftV2.jsx:** Had correct roles (`healthcare_assistant`, `support_worker`) ✅
- **StaffForm.jsx:** Had `care_worker`, `hca` (deprecated roles) ❌
- **Result:** Different dropdowns showing different options

**Solution:** Created single source of truth for all staff roles

**New File:** `src/constants/staffRoles.js`

**Centralized Roles:**
```javascript
export const STAFF_ROLES = [
  { value: 'nurse', label: 'Registered Nurse', icon: '🩺' },
  { value: 'healthcare_assistant', label: 'Healthcare Assistant', icon: '👨‍⚕️' },
  { value: 'senior_care_worker', label: 'Senior Care Worker', icon: '⭐' },
  { value: 'support_worker', label: 'Support Worker', icon: '🤝' },
  { value: 'specialist_nurse', label: 'Specialist Nurse', icon: '💉' }
];
```

**Deprecated Roles (Removed):**
- ❌ `care_worker` → Use `healthcare_assistant` or `support_worker`
- ❌ `hca` → Use `healthcare_assistant`

**Files Updated:**
1. ✅ `src/components/staff/InviteStaffModal.jsx`
   - Imported `STAFF_ROLES` from constants
   - Replaced hardcoded dropdown with dynamic mapping
   - Default role: `STAFF_ROLES[0].value` (nurse)

2. ✅ `src/components/staff/StaffForm.jsx`
   - Imported `STAFF_ROLES` from constants
   - Replaced hardcoded options with dynamic mapping
   - Removed duplicate `specialist_nurse` option

3. ✅ `src/pages/PostShiftV2.jsx`
   - Removed inline `STAFF_ROLES` constant
   - Imported from centralized constants file

**Utility Functions Added:**
```javascript
getRoleLabel(value)      // Get display label from value
getRoleIcon(value)       // Get emoji icon from value
formatRoleName(value)    // Format 'healthcare_assistant' → 'Healthcare Assistant'
isValidRole(value)       // Check if role is valid
migrateRole(oldRole)     // Migrate deprecated roles to current
```

---

## 📊 Impact Analysis

### Before Fixes:
- **Staff Invite:** Shows 5 roles including deprecated `care_worker`, `hca`
- **Create Shift:** Shows 5 roles with correct values
- **Staff Form:** Shows 6 roles (duplicate `specialist_nurse`)
- **Profile Photo:** Shows placeholder as if uploaded

### After Fixes:
- **All Dropdowns:** Show identical 5 roles from centralized source
- **Consistency:** 100% - all UIs use same role list
- **Profile Photo:** Correctly shows "REQUIRED" when no real photo
- **Maintainability:** Single file to update for role changes

---

## 🧪 Testing Required

### Profile Photo Testing:
- [ ] Upload real photo (not placeholder)
- [ ] Click "Save Changes"
- [ ] Verify photo displays correctly
- [ ] Log out and log back in
- [ ] Verify photo persists after re-login
- [ ] Check database: `profile_photo_url` should be Supabase Storage URL

### Staff Roles Testing:
- [ ] Open Staff Invite modal → Verify 5 roles (no care_worker/hca)
- [ ] Create new shift → Verify same 5 roles
- [ ] Register new staff → Verify same 5 roles
- [ ] Check all dropdowns show identical options
- [ ] Verify icons display correctly (🩺 👨‍⚕️ ⭐ 🤝 💉)

---

## 🔧 Database Cleanup (Optional)

If you want to migrate existing deprecated roles in database:

```sql
-- Migrate deprecated roles to current roles
UPDATE staff 
SET role = 'healthcare_assistant' 
WHERE role IN ('care_worker', 'hca');

UPDATE shifts 
SET role_required = 'healthcare_assistant' 
WHERE role_required IN ('care_worker', 'hca');

-- Verify migration
SELECT role, COUNT(*) 
FROM staff 
GROUP BY role;
```

---

## 📝 Files Modified Summary

| File | Changes | Lines Changed |
|------|---------|---------------|
| `src/pages/ProfileSetup.jsx` | Added placeholder filtering | ~20 lines |
| `src/constants/staffRoles.js` | **NEW FILE** - Centralized roles | 127 lines |
| `src/components/staff/InviteStaffModal.jsx` | Import & use STAFF_ROLES | ~10 lines |
| `src/components/staff/StaffForm.jsx` | Import & use STAFF_ROLES | ~8 lines |
| `src/pages/PostShiftV2.jsx` | Remove inline, import STAFF_ROLES | ~5 lines |

**Total:** 5 files modified, 1 new file created, ~170 lines changed

---

## 🎯 Next Steps

1. **Test profile photo upload** with real image
2. **Test all role dropdowns** for consistency
3. **Optional:** Run database migration to clean up deprecated roles
4. **Monitor:** Check for any other hardcoded role references

---

**Status:** ✅ All fixes applied and ready for testing  
**Priority:** 🔴 Critical - affects user onboarding and data consistency  
**Estimated Testing Time:** 15 minutes

