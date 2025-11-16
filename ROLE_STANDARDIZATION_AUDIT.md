# Role Standardization Audit - 2025-11-14

## 🎯 Purpose
Ensure all role dropdowns use the centralized `STAFF_ROLES` constant to prevent data inconsistencies.

---

## ✅ Components Using STAFF_ROLES Correctly

### 1. **PostShiftV2.jsx** ✅
**Location:** `src/pages/PostShiftV2.jsx` (Lines 19, 423-427)

```javascript
import { STAFF_ROLES } from "@/constants/staffRoles";

// Role dropdown
<SelectContent>
  {STAFF_ROLES.map(role => (
    <SelectItem key={role.value} value={role.value}>
      {role.icon} {role.label}
    </SelectItem>
  ))}
</SelectContent>
```

**Status:** ✅ **CORRECT** - Uses centralized constants

---

### 2. **InviteStaffModal.jsx** ✅
**Location:** `src/components/staff/InviteStaffModal.jsx` (Lines 9, 119-123)

```javascript
import { STAFF_ROLES } from "@/constants/staffRoles";

// Role dropdown
<SelectContent>
  {STAFF_ROLES.map(role => (
    <SelectItem key={role.value} value={role.value}>
      {role.icon} {role.label}
    </SelectItem>
  ))}
</SelectContent>
```

**Status:** ✅ **CORRECT** - Uses centralized constants

---

## ❌ Components with Hardcoded Roles

### 1. **ClientPortal.jsx** ❌
**Location:** `src/pages/ClientPortal.jsx` (Lines 880-891)

```javascript
// ❌ HARDCODED ROLES - NEEDS FIX
<select
  id="role"
  value={shiftRequest.role_required}
  onChange={(e) => setShiftRequest({ ...shiftRequest, role_required: e.target.value })}
>
  <option value="care_worker">Care Worker</option>
  <option value="nurse">Nurse</option>
  <option value="hca">Healthcare Assistant</option>
  <option value="senior_care_worker">Senior Care Worker</option>
  <option value="specialist_nurse">Specialist Nurse</option>
</select>
```

**Issues:**
1. ❌ Uses deprecated `care_worker` (should be `healthcare_assistant` or `support_worker`)
2. ❌ Uses deprecated `hca` (should be `healthcare_assistant`)
3. ❌ Hardcoded values don't match STAFF_ROLES
4. ❌ No icons displayed
5. ❌ Not using shadcn Select component

**Recommended Fix:**
```javascript
import { STAFF_ROLES } from "@/constants/staffRoles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Replace hardcoded select with:
<Select
  value={shiftRequest.role_required}
  onValueChange={(value) => setShiftRequest({ ...shiftRequest, role_required: value })}
>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {STAFF_ROLES.map(role => (
      <SelectItem key={role.value} value={role.value}>
        {role.icon} {role.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## 📊 Summary

| Component | Status | Uses STAFF_ROLES | Issues |
|-----------|--------|------------------|--------|
| PostShiftV2.jsx | ✅ | Yes | None |
| InviteStaffModal.jsx | ✅ | Yes | None |
| ClientPortal.jsx | ❌ | No | Hardcoded + deprecated roles |

---

## 🔧 Action Items

- [ ] Fix ClientPortal.jsx to use STAFF_ROLES constant
- [ ] Remove deprecated role values (`care_worker`, `hca`)
- [ ] Update to use shadcn Select component for consistency
- [ ] Test client shift request flow after fix

---

## 📝 STAFF_ROLES Reference

**File:** `src/constants/staffRoles.js`

**Valid Roles:**
1. `nurse` - Registered Nurse 🩺
2. `healthcare_assistant` - Healthcare Assistant 👨‍⚕️
3. `senior_care_worker` - Senior Care Worker ⭐
4. `support_worker` - Support Worker 🤝
5. `specialist_nurse` - Specialist Nurse 💉

**Deprecated Roles (DO NOT USE):**
- ❌ `care_worker` → Use `healthcare_assistant` or `support_worker`
- ❌ `hca` → Use `healthcare_assistant`

---

## ✅ Validation Functions Available

```javascript
import { isValidRole, getRoleLabel, getRoleIcon, formatRoleName } from "@/constants/staffRoles";

// Check if role is valid
isValidRole('nurse'); // true
isValidRole('care_worker'); // false (deprecated)

// Get role label
getRoleLabel('nurse'); // "Registered Nurse"

// Get role icon
getRoleIcon('healthcare_assistant'); // "👨‍⚕️"

// Format role for display
formatRoleName('senior_care_worker'); // "Senior Care Worker"
```

---

**Status:** 🟡 **1 component needs fixing**  
**Priority:** 🔴 **HIGH** - Prevents data inconsistencies

