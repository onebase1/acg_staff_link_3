# MODULE 23: MULTI-ROLE QUALIFICATION ENGINE

## 🎯 Mission Objective
Implement intelligent multi-role qualification system where staff can work multiple roles based on certifications (e.g., Senior Carers can work HCA shifts, HCAs can work Support Worker shifts).

## 📊 Priority: P1 - HIGH
**Duration:** 3-4 hours
**Dependencies:** None

---

## 🧠 Business Logic

### Role Hierarchy
```
Support Worker
  ↓ Can work as: [support_worker]

HCA (Health Care Assistant)
  ↓ Can work as: [hca, support_worker]

Senior Carer
  ↓ IF medication_trained = true: [senior_carer, hca, support_worker]
  ↓ IF medication_trained = false: [hca, support_worker]

Nurse
  ↓ IF has nmc_pin: [nurse]
  ↓ (Won't work lower roles due to professional pride)
```

---

## 🚀 Implementation Steps

### STEP 1: Create Multi-Role Migration

**File:** `supabase/migrations/20251217_multi_role_system.sql`

```sql
-- Add qualified_roles JSONB column
ALTER TABLE staff ADD COLUMN IF NOT EXISTS qualified_roles JSONB DEFAULT '[]'::JSONB;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_staff_qualified_roles
  ON staff USING GIN (qualified_roles);

-- Function to calculate qualified roles based on primary role and qualifications
CREATE OR REPLACE FUNCTION calculate_qualified_roles(p_staff_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_role TEXT;
  v_medication_trained BOOLEAN;
  v_nmc_pin TEXT;
  v_qualified_roles JSONB;
BEGIN
  -- Fetch staff details
  SELECT role, medication_trained, nmc_pin
  INTO v_role, v_medication_trained, v_nmc_pin
  FROM staff
  WHERE id = p_staff_id;

  -- Calculate qualified roles based on hierarchy
  CASE v_role
    WHEN 'support_worker' THEN
      v_qualified_roles := '["support_worker"]'::JSONB;

    WHEN 'hca', 'care_worker' THEN
      v_qualified_roles := '["hca", "care_worker", "support_worker"]'::JSONB;

    WHEN 'senior_carer' THEN
      IF v_medication_trained = true THEN
        v_qualified_roles := '["senior_carer", "hca", "care_worker", "support_worker"]'::JSONB;
      ELSE
        v_qualified_roles := '["hca", "care_worker", "support_worker"]'::JSONB;
      END IF;

    WHEN 'nurse' THEN
      IF v_nmc_pin IS NOT NULL AND LENGTH(v_nmc_pin) > 0 THEN
        v_qualified_roles := '["nurse"]'::JSONB;
      ELSE
        v_qualified_roles := '[]'::JSONB;
      END IF;

    ELSE
      -- Default: only primary role
      v_qualified_roles := jsonb_build_array(v_role);
  END CASE;

  RETURN v_qualified_roles;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update qualified roles automatically
CREATE OR REPLACE FUNCTION update_qualified_roles()
RETURNS TRIGGER AS $$
BEGIN
  NEW.qualified_roles := calculate_qualified_roles(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update qualified_roles on relevant field changes
DROP TRIGGER IF EXISTS trigger_update_qualified_roles ON staff;
CREATE TRIGGER trigger_update_qualified_roles
  BEFORE INSERT OR UPDATE OF role, medication_trained, nmc_pin
  ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_qualified_roles();

-- Backfill existing staff records
UPDATE staff SET qualified_roles = calculate_qualified_roles(id);

-- Add comment
COMMENT ON COLUMN staff.qualified_roles IS 'Array of role slugs staff is qualified to work based on certifications and training';
```

**Deploy:**
```bash
cd C:\Users\gbase\superbasecli
./supabase.exe db push --project-ref rzzxxkppkiasuouuglaf
```

---

### STEP 2: Update ShiftAssignmentModal to Validate Against Qualified Roles

**File:** `src/components/shifts/ShiftAssignmentModal.jsx`

**Find the staff filtering logic (around line 100-150):**

Replace:
```jsx
// OLD: Only check if role matches exactly
const eligibleStaff = allStaff.filter(s => s.role === shift.role);
```

With:
```jsx
// NEW: Check if shift role is in staff's qualified_roles array
const eligibleStaff = allStaff.filter(s => {
  // If qualified_roles exists, check if shift role is included
  if (s.qualified_roles && Array.isArray(s.qualified_roles)) {
    return s.qualified_roles.includes(shift.role);
  }

  // Fallback: check primary role (backward compatibility)
  return s.role === shift.role;
});
```

---

### STEP 3: Add Qualified Roles Badge to Staff List

**File:** `src/pages/Staff.jsx`

**In the table columns, add qualified roles column:**

```jsx
{/* Add after Role column */}
<TableCell>
  <div className="space-y-1">
    <Badge className="bg-cyan-100 text-cyan-800">
      {staffMember.role.replace('_', ' ')}
    </Badge>
    {staffMember.qualified_roles && staffMember.qualified_roles.length > 1 && (
      <div className="flex flex-wrap gap-1 mt-1">
        <span className="text-xs text-gray-500">Also qualified:</span>
        {staffMember.qualified_roles
          .filter(r => r !== staffMember.role)
          .map(role => (
            <Badge key={role} variant="outline" className="text-xs">
              {role.replace('_', ' ')}
            </Badge>
          ))
        }
      </div>
    )}
  </div>
</TableCell>
```

---

### STEP 4: Add Qualified Roles Info to StaffForm

**File:** `src/components/staff/StaffForm.jsx`

**After the Role select field, add info section:**

```jsx
{/* Show calculated qualified roles */}
{formData.role && (
  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <p className="text-sm font-semibold text-blue-900 mb-2">✨ Qualified Roles</p>
    <p className="text-xs text-blue-700">
      Based on their role
      {formData.role === 'senior_carer' && `, medication training ${formData.medication_trained ? '(✓ trained)' : '(✗ not trained)'}`}
      {formData.role === 'nurse' && `, and NMC registration ${formData.nmc_pin ? '(✓ registered)' : '(✗ not registered)'}`}
      , this staff member can work as:
    </p>
    <div className="flex flex-wrap gap-2 mt-2">
      {(() => {
        let roles = [];
        if (formData.role === 'support_worker') roles = ['support_worker'];
        else if (formData.role === 'hca' || formData.role === 'care_worker') roles = ['hca', 'care_worker', 'support_worker'];
        else if (formData.role === 'senior_carer') {
          roles = formData.medication_trained
            ? ['senior_carer', 'hca', 'care_worker', 'support_worker']
            : ['hca', 'care_worker', 'support_worker'];
        }
        else if (formData.role === 'nurse') roles = formData.nmc_pin ? ['nurse'] : [];

        return roles.map(role => (
          <Badge key={role} className="bg-green-100 text-green-800">
            {role.replace('_', ' ').toUpperCase()}
          </Badge>
        ));
      })()}
    </div>
  </div>
)}
```

---

### STEP 5: Add Qualification Validation Logic

**File:** `src/utils/roleHelpers.js` (NEW)

```javascript
/**
 * Calculate qualified roles for a staff member
 * @param {Object} staff - Staff object with role, medication_trained, nmc_pin
 * @returns {Array<string>} Array of role slugs they're qualified for
 */
export const calculateQualifiedRoles = (staff) => {
  const { role, medication_trained, nmc_pin } = staff;

  switch (role) {
    case 'support_worker':
      return ['support_worker'];

    case 'hca':
    case 'care_worker':
      return ['hca', 'care_worker', 'support_worker'];

    case 'senior_carer':
      if (medication_trained) {
        return ['senior_carer', 'hca', 'care_worker', 'support_worker'];
      }
      return ['hca', 'care_worker', 'support_worker'];

    case 'nurse':
      if (nmc_pin && nmc_pin.trim().length > 0) {
        return ['nurse'];
      }
      return [];

    default:
      return [role]; // Fallback
  }
};

/**
 * Check if staff can work a specific role
 * @param {Object} staff - Staff object
 * @param {string} requiredRole - Role slug to check
 * @returns {boolean}
 */
export const canWorkRole = (staff, requiredRole) => {
  // Use qualified_roles if available (from database)
  if (staff.qualified_roles && Array.isArray(staff.qualified_roles)) {
    return staff.qualified_roles.includes(requiredRole);
  }

  // Fallback: calculate on the fly
  const qualifiedRoles = calculateQualifiedRoles(staff);
  return qualifiedRoles.includes(requiredRole);
};

/**
 * Get role hierarchy display
 * @param {string} role - Primary role
 * @returns {Object} Display info
 */
export const getRoleHierarchy = (role) => {
  const hierarchies = {
    support_worker: {
      level: 1,
      canWorkAs: ['Support Worker'],
      description: 'Entry-level care role'
    },
    hca: {
      level: 2,
      canWorkAs: ['HCA', 'Support Worker'],
      description: 'Healthcare assistant with broader responsibilities'
    },
    care_worker: {
      level: 2,
      canWorkAs: ['Care Worker', 'HCA', 'Support Worker'],
      description: 'General care worker'
    },
    senior_carer: {
      level: 3,
      canWorkAs: ['Senior Carer', 'HCA', 'Support Worker'],
      description: 'Senior care role, may require medication training',
      requiresMedicationTraining: true
    },
    nurse: {
      level: 4,
      canWorkAs: ['Nurse'],
      description: 'Registered nurse with NMC PIN',
      requiresNMC: true
    }
  };

  return hierarchies[role] || {
    level: 0,
    canWorkAs: [role],
    description: 'Unknown role'
  };
};
```

---

## ✅ Validation Checklist

### Database
- [ ] Migration runs without errors
- [ ] qualified_roles column exists
- [ ] Trigger updates qualified_roles on role change
- [ ] Trigger updates qualified_roles on medication_trained change
- [ ] All existing staff have qualified_roles populated

### Frontend
- [ ] ShiftAssignmentModal shows correct eligible staff
- [ ] Senior Carer with medication_trained can be assigned to HCA shifts
- [ ] HCA can be assigned to Support Worker shifts
- [ ] Nurse cannot be assigned to HCA shifts
- [ ] Staff list shows qualified roles badges
- [ ] StaffForm shows calculated qualified roles

### Test Scenarios
```sql
-- Test 1: HCA should have 3 qualified roles
SELECT first_name, role, qualified_roles
FROM staff
WHERE role = 'hca'
LIMIT 1;
-- Expected: ["hca", "care_worker", "support_worker"]

-- Test 2: Senior Carer WITH medication training
SELECT first_name, role, medication_trained, qualified_roles
FROM staff
WHERE role = 'senior_carer' AND medication_trained = true
LIMIT 1;
-- Expected: ["senior_carer", "hca", "care_worker", "support_worker"]

-- Test 3: Senior Carer WITHOUT medication training
SELECT first_name, role, medication_trained, qualified_roles
FROM staff
WHERE role = 'senior_carer' AND medication_trained = false
LIMIT 1;
-- Expected: ["hca", "care_worker", "support_worker"]

-- Test 4: Nurse with NMC
SELECT first_name, role, nmc_pin, qualified_roles
FROM staff
WHERE role = 'nurse' AND nmc_pin IS NOT NULL
LIMIT 1;
-- Expected: ["nurse"]
```

---

## 🔄 Rollback

```sql
-- rollback_multi_role.sql
ALTER TABLE staff DROP COLUMN IF EXISTS qualified_roles;
DROP TRIGGER IF EXISTS trigger_update_qualified_roles ON staff;
DROP FUNCTION IF EXISTS update_qualified_roles();
DROP FUNCTION IF EXISTS calculate_qualified_roles(UUID);
DROP INDEX IF EXISTS idx_staff_qualified_roles;
```

---

## 🎯 Success Criteria

✅ Database trigger auto-calculates qualified_roles
✅ Shift assignment validates against qualified_roles
✅ Senior Carers can work HCA shifts (if medication trained)
✅ HCAs can work Support Worker shifts
✅ Staff list shows all qualified roles
✅ StaffForm previews qualified roles
✅ Backward compatible (falls back to primary role if qualified_roles empty)

**MODULE 23 COMPLETE!**
