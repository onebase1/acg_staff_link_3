# MODULE 21: ADMIN PROFILE PRE-FILL CORE

## 🎯 Mission Objective
Enable admin to edit ALL staff profile fields (40+ fields) before sending invite, ensuring complete pre-population of existing staff data.

## 📊 Priority: P0 - CRITICAL
**Estimated Duration:** 3-4 hours
**Dependencies:** None (foundational module)
**Blocks:** MODULE 22, 26, 28

---

## 🔍 Current State Analysis

### Admin Edit Form (StaffForm.jsx) - CURRENT FIELDS (15)
```
✅ First Name
✅ Last Name
✅ Email
✅ Phone
✅ Date of Birth
✅ Role
✅ NMC PIN (conditional)
✅ Hourly Rate
✅ Employment Type
✅ Medication Trained
✅ Address Line 1
✅ Address City
✅ Address Postcode
✅ Emergency Contact Name
✅ Emergency Contact Relationship
✅ Emergency Contact Phone
✅ Profile Photo
```

### Staff Onboarding (ProfileSetup.jsx) - REQUIRED FIELDS (40+)
```
All above PLUS:
❌ NI Number
❌ Bank Details (account_name, sort_code, account_number, bank_name)
❌ Address Line 2
❌ References (array of objects)
❌ Employment History (array of objects)
❌ Occupational Health (cleared_to_work, restrictions)
❌ Mandatory Training (10 core + additional)
❌ Skills (array)
❌ Groups (array)
❌ Driving License Number
❌ Driving License Expiry
❌ Can Work As Senior (boolean)
❌ Months of Experience
❌ Proposed First Shift Date
```

**GAP:** 25+ fields missing from admin edit form

---

## 🚀 Implementation Steps

### STEP 1: Create Audit Trail Migration (15 minutes)

**File:** `supabase/migrations/20251217_audit_trail_fields.sql`

```sql
-- Add audit trail columns for enterprise compliance
ALTER TABLE staff ADD COLUMN IF NOT EXISTS profile_last_updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE staff ADD COLUMN IF NOT EXISTS profile_last_updated_by UUID REFERENCES auth.users(id);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS profile_update_source TEXT
  CHECK (profile_update_source IN ('admin_portal', 'staff_portal', 'api', 'ai_agent', 'csv_import'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_staff_profile_last_updated
  ON staff(profile_last_updated_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN staff.profile_last_updated_by IS 'User ID who last updated profile (admin, staff, or system)';
COMMENT ON COLUMN staff.profile_update_source IS 'Source of profile update for autonomous AI tracking';
```

**Deploy:**
```bash
cd C:\Users\gbase\superbasecli
./supabase.exe db push --project-ref rzzxxkppkiasuouuglaf
```

**Validation:**
```sql
-- Check columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'staff'
  AND column_name IN ('profile_last_updated_at', 'profile_last_updated_by', 'profile_update_source');
```

---

### STEP 2: Enhance StaffForm.jsx with Missing Fields (2 hours)

**File:** `src/components/staff/StaffForm.jsx`

#### 2.1: Add New State for Complex Fields

**Find the formData state initialization (around line 20-40):**

```jsx
const [formData, setFormData] = useState({
  // ... existing fields ...

  // ⚡ ADD THESE NEW FIELDS:
  ni_number: staff?.ni_number || '',
  bank_details: staff?.bank_details || {
    account_name: '',
    sort_code: '',
    account_number: '',
    bank_name: ''
  },
  address: {
    line1: staff?.address?.line1 || '',
    line2: staff?.address?.line2 || '', // ⚡ NEW - was missing
    city: staff?.address?.city || '',
    postcode: staff?.address?.postcode || ''
  },
  references: staff?.references || [],
  employment_history: staff?.employment_history || [],
  occupational_health: staff?.occupational_health || {
    cleared_to_work: true,
    restrictions: ''
  },
  skills: staff?.skills || [],
  groups: staff?.groups || [],
  driving_license_number: staff?.driving_license_number || '',
  driving_license_expiry: staff?.driving_license_expiry || '',
  can_work_as_senior: staff?.can_work_as_senior || false,
  months_of_experience: staff?.months_of_experience || 0,
  proposed_first_shift_date: staff?.proposed_first_shift_date || ''
});
```

#### 2.2: Add Sensitive Data Masking Helper

**Add BEFORE the return statement:**

```jsx
// Helper to mask sensitive data (show last 4 digits)
const [showFullNI, setShowFullNI] = useState(false);
const [showFullBankAccount, setShowFullBankAccount] = useState(false);

const maskNINumber = (ni) => {
  if (!ni || showFullNI) return ni;
  return ni.slice(0, -4).replace(/./g, '*') + ni.slice(-4);
};

const maskBankAccount = (account) => {
  if (!account || showFullBankAccount) return account;
  return '*'.repeat(Math.max(0, account.length - 4)) + account.slice(-4);
};
```

#### 2.3: Add Collapsible Sections

**After the existing form sections, ADD these new sections:**

```jsx
{/* ========== FINANCIAL INFORMATION (NEW SECTION) ========== */}
<Collapsible>
  <CollapsibleTrigger asChild>
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <Banknote className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-semibold text-gray-900">Financial Information</h3>
      </div>
      <ChevronDown className="w-5 h-5 text-gray-600" />
    </div>
  </CollapsibleTrigger>
  <CollapsibleContent className="space-y-4 p-4 border-l-2 border-emerald-200 ml-2 mt-2">

    {/* NI Number with Masking */}
    <div>
      <Label htmlFor="ni_number">National Insurance Number</Label>
      <div className="flex gap-2">
        <Input
          id="ni_number"
          type="text"
          placeholder="AB123456C"
          value={maskNINumber(formData.ni_number)}
          onChange={(e) => {
            if (showFullNI) {
              setFormData({ ...formData, ni_number: e.target.value.toUpperCase() });
            }
          }}
          disabled={!showFullNI}
          className="uppercase"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowFullNI(!showFullNI)}
        >
          {showFullNI ? '🙈 Hide' : '👁️ Show Full'}
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-1">Format: 2 letters, 6 numbers, 1 letter (e.g., AB123456C)</p>
    </div>

    {/* Bank Details */}
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label htmlFor="bank_account_name">Account Holder Name</Label>
        <Input
          id="bank_account_name"
          type="text"
          placeholder="John Smith"
          value={formData.bank_details?.account_name || ''}
          onChange={(e) => setFormData({
            ...formData,
            bank_details: { ...formData.bank_details, account_name: e.target.value }
          })}
        />
      </div>

      <div>
        <Label htmlFor="bank_sort_code">Sort Code</Label>
        <Input
          id="bank_sort_code"
          type="text"
          placeholder="12-34-56"
          maxLength={8}
          value={formData.bank_details?.sort_code || ''}
          onChange={(e) => {
            let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
            if (value.length > 2) value = value.slice(0, 2) + '-' + value.slice(2);
            if (value.length > 5) value = value.slice(0, 5) + '-' + value.slice(5, 7);
            setFormData({
              ...formData,
              bank_details: { ...formData.bank_details, sort_code: value }
            });
          }}
        />
      </div>

      <div>
        <Label htmlFor="bank_account_number">Account Number</Label>
        <div className="flex gap-2">
          <Input
            id="bank_account_number"
            type="text"
            placeholder="12345678"
            maxLength={8}
            value={showFullBankAccount ? (formData.bank_details?.account_number || '') : maskBankAccount(formData.bank_details?.account_number || '')}
            onChange={(e) => {
              if (showFullBankAccount) {
                const value = e.target.value.replace(/\D/g, ''); // Only digits
                setFormData({
                  ...formData,
                  bank_details: { ...formData.bank_details, account_number: value }
                });
              }
            }}
            disabled={!showFullBankAccount}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowFullBankAccount(!showFullBankAccount)}
          >
            {showFullBankAccount ? '🙈' : '👁️'}
          </Button>
        </div>
      </div>

      <div className="col-span-2">
        <Label htmlFor="bank_name">Bank Name</Label>
        <Input
          id="bank_name"
          type="text"
          placeholder="Barclays, HSBC, Lloyds, etc."
          value={formData.bank_details?.bank_name || ''}
          onChange={(e) => setFormData({
            ...formData,
            bank_details: { ...formData.bank_details, bank_name: e.target.value }
          })}
        />
      </div>
    </div>

  </CollapsibleContent>
</Collapsible>

{/* ========== PROFESSIONAL HISTORY (NEW SECTION) ========== */}
<Collapsible>
  <CollapsibleTrigger asChild>
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <Briefcase className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Professional History</h3>
      </div>
      <ChevronDown className="w-5 h-5 text-gray-600" />
    </div>
  </CollapsibleTrigger>
  <CollapsibleContent className="space-y-4 p-4 border-l-2 border-purple-200 ml-2 mt-2">

    {/* Months of Experience */}
    <div>
      <Label htmlFor="months_of_experience">Months of Experience</Label>
      <Input
        id="months_of_experience"
        type="number"
        min="0"
        placeholder="24"
        value={formData.months_of_experience || ''}
        onChange={(e) => setFormData({ ...formData, months_of_experience: parseInt(e.target.value) || 0 })}
      />
    </div>

    {/* Driving License */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="driving_license_number">Driving License Number (Optional)</Label>
        <Input
          id="driving_license_number"
          type="text"
          placeholder="SMITH061085A99IJ"
          value={formData.driving_license_number || ''}
          onChange={(e) => setFormData({ ...formData, driving_license_number: e.target.value.toUpperCase() })}
          className="uppercase"
        />
      </div>

      <div>
        <Label htmlFor="driving_license_expiry">License Expiry Date</Label>
        <Input
          id="driving_license_expiry"
          type="date"
          value={formData.driving_license_expiry || ''}
          onChange={(e) => setFormData({ ...formData, driving_license_expiry: e.target.value })}
        />
      </div>
    </div>

    {/* Can Work As Senior */}
    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
      <input
        type="checkbox"
        id="can_work_as_senior"
        checked={formData.can_work_as_senior || false}
        onChange={(e) => setFormData({ ...formData, can_work_as_senior: e.target.checked })}
        className="w-4 h-4"
      />
      <Label htmlFor="can_work_as_senior" className="cursor-pointer">
        Can work as Senior Carer (requires medication training)
      </Label>
    </div>

    {/* Proposed First Shift Date */}
    <div>
      <Label htmlFor="proposed_first_shift_date">Proposed First Shift Date</Label>
      <Input
        id="proposed_first_shift_date"
        type="date"
        value={formData.proposed_first_shift_date || ''}
        onChange={(e) => setFormData({ ...formData, proposed_first_shift_date: e.target.value })}
      />
      <p className="text-xs text-gray-500 mt-1">When is this staff member expected to start?</p>
    </div>

    {/* NOTE: References and Employment History are complex arrays */}
    {/* For MVP, show count and "Managed in ProfileSetup" */}
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <p className="text-sm text-amber-900">
        <strong>Note:</strong> References ({formData.references?.length || 0}) and Employment History ({formData.employment_history?.length || 0})
        are managed during staff onboarding in ProfileSetup. Admin can view these in ComplianceTracker after staff completes their profile.
      </p>
    </div>

  </CollapsibleContent>
</Collapsible>

{/* ========== HEALTH & COMPLIANCE (NEW SECTION) ========== */}
<Collapsible>
  <CollapsibleTrigger asChild>
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <Heart className="w-5 h-5 text-red-600" />
        <h3 className="text-lg font-semibold text-gray-900">Health & Compliance</h3>
      </div>
      <ChevronDown className="w-5 h-5 text-gray-600" />
    </div>
  </CollapsibleTrigger>
  <CollapsibleContent className="space-y-4 p-4 border-l-2 border-red-200 ml-2 mt-2">

    {/* Occupational Health */}
    <div>
      <Label>Occupational Health Clearance</Label>
      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg mb-2">
        <input
          type="checkbox"
          id="cleared_to_work"
          checked={formData.occupational_health?.cleared_to_work || false}
          onChange={(e) => setFormData({
            ...formData,
            occupational_health: {
              ...formData.occupational_health,
              cleared_to_work: e.target.checked
            }
          })}
          className="w-4 h-4"
        />
        <Label htmlFor="cleared_to_work" className="cursor-pointer">
          Cleared to work (Occupational Health approved)
        </Label>
      </div>

      <Label htmlFor="health_restrictions">Health Restrictions / Notes</Label>
      <textarea
        id="health_restrictions"
        rows={3}
        placeholder="Any health considerations or restrictions (e.g., cannot lift heavy objects, requires breaks, etc.)"
        value={formData.occupational_health?.restrictions || ''}
        onChange={(e) => setFormData({
          ...formData,
          occupational_health: {
            ...formData.occupational_health,
            restrictions: e.target.value
          }
        })}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500"
      />
    </div>

    {/* Training Records Note */}
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-sm text-blue-900">
        <strong>Training Certificates:</strong> Admin can upload training documents via the
        <a href="/ComplianceTracker" className="text-blue-600 underline ml-1">Compliance Tracker</a>.
        Staff will complete detailed training records during onboarding.
      </p>
    </div>

  </CollapsibleContent>
</Collapsible>

{/* ========== SKILLS & PREFERENCES (NEW SECTION) ========== */}
<Collapsible>
  <CollapsibleTrigger asChild>
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <Star className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">Skills & Preferences</h3>
      </div>
      <ChevronDown className="w-5 h-5 text-gray-600" />
    </div>
  </CollapsibleTrigger>
  <CollapsibleContent className="space-y-4 p-4 border-l-2 border-indigo-200 ml-2 mt-2">

    {/* Skills */}
    <div>
      <Label htmlFor="skills">Skills (comma-separated)</Label>
      <Input
        id="skills"
        type="text"
        placeholder="Care Skills, Manual Handling, First Aid, Dementia Care"
        value={Array.isArray(formData.skills) ? formData.skills.join(', ') : ''}
        onChange={(e) => {
          const skillsArray = e.target.value.split(',').map(s => s.trim()).filter(s => s);
          setFormData({ ...formData, skills: skillsArray });
        }}
      />
    </div>

    {/* Groups */}
    <div>
      <Label htmlFor="groups">Groups / Teams (comma-separated)</Label>
      <Input
        id="groups"
        type="text"
        placeholder="Night Shift Team, Weekend Cover, Medication Trained"
        value={Array.isArray(formData.groups) ? formData.groups.join(', ') : ''}
        onChange={(e) => {
          const groupsArray = e.target.value.split(',').map(g => g.trim()).filter(g => g);
          setFormData({ ...formData, groups: groupsArray });
        }}
      />
      <p className="text-xs text-gray-500 mt-1">Optional tags for organizing staff</p>
    </div>

  </CollapsibleContent>
</Collapsible>
```

#### 2.4: Add Required Imports

**At the top of StaffForm.jsx, add:**

```jsx
import {
  // ... existing imports ...
  Banknote,
  Briefcase,
  Heart,
  Star,
  ChevronDown
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
```

---

### STEP 3: Update Staff.jsx Mutation to Include Audit Trail (30 minutes)

**File:** `src/pages/Staff.jsx`

**Find the updateStaffMutation (around line 150-200):**

```jsx
const updateStaffMutation = useMutation({
  mutationFn: async ({ id, data }) => {
    console.log('🔄 Updating staff:', id, data);

    // ⚡ ADD AUDIT TRAIL
    const { data: { user } } = await supabase.auth.getUser();
    const auditedData = {
      ...data,
      profile_last_updated_at: new Date().toISOString(),
      profile_last_updated_by: user?.id || null,
      profile_update_source: 'admin_portal'
    };

    const { data: updatedStaff, error } = await supabase
      .from('staff')
      .update(auditedData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updatedStaff;
  },
  onSuccess: (updatedStaff) => {
    queryClient.invalidateQueries(['staff']);
    toast.success(`✅ ${updatedStaff.first_name} ${updatedStaff.last_name} updated successfully!`);
    setEditingStaff(null);
  },
  onError: (error) => {
    console.error('❌ Update error:', error);
    toast.error(`Failed to update staff: ${error.message}`);
  }
});
```

---

### STEP 4: Add Profile Completion Calculator Utility (20 minutes)

**File:** `src/utils/profileHelpers.js` (NEW FILE)

```javascript
/**
 * Calculate profile completion percentage
 * Returns: { percentage: 85, missingFields: ['Bank Details', 'Photo'], sections: {...} }
 */
export const calculateProfileCompletion = (staffData) => {
  if (!staffData) return { percentage: 0, missingFields: [], sections: {} };

  const sections = {
    basicInfo: { total: 5, completed: 0, weight: 20 },
    contactInfo: { total: 4, completed: 0, weight: 15 },
    financial: { total: 2, completed: 0, weight: 15 },
    professional: { total: 3, completed: 0, weight: 15 },
    health: { total: 2, completed: 0, weight: 10 },
    documents: { total: 2, completed: 0, weight: 25 }
  };

  const missingFields = [];

  // Basic Info (20%)
  if (staffData.first_name?.trim()) sections.basicInfo.completed++;
  else missingFields.push('First Name');

  if (staffData.last_name?.trim()) sections.basicInfo.completed++;
  else missingFields.push('Last Name');

  if (staffData.email?.trim()) sections.basicInfo.completed++;
  else missingFields.push('Email');

  if (staffData.date_of_birth) sections.basicInfo.completed++;
  else missingFields.push('Date of Birth');

  if (staffData.role) sections.basicInfo.completed++;
  else missingFields.push('Role');

  // Contact Info (15%)
  if (staffData.phone?.trim()) sections.contactInfo.completed++;
  else missingFields.push('Phone');

  if (staffData.address?.line1?.trim()) sections.contactInfo.completed++;
  else missingFields.push('Address');

  if (staffData.address?.postcode?.trim()) sections.contactInfo.completed++;
  else missingFields.push('Postcode');

  if (staffData.emergency_contact?.name?.trim()) sections.contactInfo.completed++;
  else missingFields.push('Emergency Contact');

  // Financial (15%)
  if (staffData.ni_number?.trim()) sections.financial.completed++;
  else missingFields.push('NI Number');

  if (staffData.bank_details?.account_number?.trim() &&
      staffData.bank_details?.sort_code?.trim()) sections.financial.completed++;
  else missingFields.push('Bank Details');

  // Professional (15%)
  if (staffData.months_of_experience >= 0) sections.professional.completed++;
  else missingFields.push('Experience');

  if (staffData.employment_history?.length > 0) sections.professional.completed++;
  else missingFields.push('Employment History');

  if (staffData.references?.length > 0) sections.professional.completed++;
  else missingFields.push('References');

  // Health (10%)
  if (staffData.occupational_health?.cleared_to_work !== undefined) sections.health.completed++;
  else missingFields.push('Health Clearance');

  if (staffData.medication_trained !== undefined) sections.health.completed++;
  else missingFields.push('Medication Training Status');

  // Documents (25%)
  if (staffData.profile_photo_url?.trim()) sections.documents.completed++;
  else missingFields.push('Profile Photo');

  // Check if has any training certificates
  const hasTraining = staffData.mandatory_training &&
    Object.values(staffData.mandatory_training).some(t => t?.completed_date);
  if (hasTraining) sections.documents.completed++;
  else missingFields.push('Training Certificates');

  // Calculate weighted percentage
  let totalPercentage = 0;
  for (const section of Object.values(sections)) {
    const sectionPercent = (section.completed / section.total) * section.weight;
    totalPercentage += sectionPercent;
  }

  return {
    percentage: Math.round(totalPercentage),
    missingFields,
    sections
  };
};

/**
 * Get completion status badge color and text
 */
export const getCompletionBadge = (percentage) => {
  if (percentage >= 80) {
    return { color: 'green', text: 'Ready', icon: '✅' };
  } else if (percentage >= 50) {
    return { color: 'yellow', text: 'In Progress', icon: '⚠️' };
  } else {
    return { color: 'red', text: 'Incomplete', icon: '❌' };
  }
};

/**
 * Format missing fields for user-friendly display
 */
export const formatMissingFields = (missingFields) => {
  if (missingFields.length === 0) return 'Profile complete!';
  if (missingFields.length <= 3) return `Missing: ${missingFields.join(', ')}`;
  return `Missing ${missingFields.length} fields: ${missingFields.slice(0, 3).join(', ')} +${missingFields.length - 3} more`;
};
```

---

## ✅ Validation Checklist

### Pre-Deployment Checks
- [ ] Migration file created and syntax validated
- [ ] StaffForm.jsx compiles without errors
- [ ] All imports added (Collapsible, Banknote, etc.)
- [ ] profileHelpers.js created and exported correctly
- [ ] No TypeScript/ESLint errors

### Post-Deployment Checks
- [ ] Migration deployed successfully to Supabase
- [ ] Can open Staff page without errors
- [ ] Can see new collapsible sections in edit form
- [ ] NI Number masking works (show/hide button)
- [ ] Bank account masking works
- [ ] Sort code auto-formats as XX-XX-XX
- [ ] Can save all new fields successfully
- [ ] Audit trail columns populated correctly
- [ ] Profile completion calculator returns correct %

### Integration Checks
- [ ] Existing staff records still load correctly
- [ ] Can edit staff without breaking existing data
- [ ] No performance degradation (form loads <1 second)
- [ ] Mobile responsive (all sections work on phone)

---

## 🔄 Rollback Procedure

If anything breaks:

### Rollback Migration
```sql
-- File: rollback_audit_trail.sql
ALTER TABLE staff DROP COLUMN IF EXISTS profile_last_updated_at;
ALTER TABLE staff DROP COLUMN IF EXISTS profile_last_updated_by;
ALTER TABLE staff DROP COLUMN IF EXISTS profile_update_source;
DROP INDEX IF EXISTS idx_staff_profile_last_updated;
```

### Rollback Code
```bash
# Restore from git
git checkout HEAD~1 -- src/components/staff/StaffForm.jsx
git checkout HEAD~1 -- src/pages/Staff.jsx
rm src/utils/profileHelpers.js
```

---

## 🔗 Integration Points

### Depends On
- None (foundational module)

### Blocks
- MODULE 22 (needs profileHelpers.js)
- MODULE 26 (needs completion calculator)
- MODULE 28 (needs all fields for testing)

### Integrates With
- MODULE 27 (audit trail used for notifications)
- MODULE 24 (documents section links to ComplianceTracker)

---

## 📝 Testing Commands

```bash
# Test admin can edit staff
1. Go to http://localhost:5173/Staff
2. Click "Edit" on any staff member
3. Expand "Financial Information" section
4. Add NI Number: AB123456C
5. Click "Show Full" - should reveal full number
6. Add Bank Details:
   - Account Name: Test User
   - Sort Code: 12-34-56 (auto-formats)
   - Account Number: 12345678 (masked)
   - Bank Name: Barclays
7. Expand other sections and fill fields
8. Click "Save Staff"
9. Verify data saved correctly
10. Check database for audit trail:
    SELECT profile_last_updated_by, profile_update_source
    FROM staff WHERE id = '[staff_id]'
```

---

## 🎓 Knowledge Transfer

### Key Concepts
1. **Sensitive Data Masking**: Show last 4 digits for security, full access on demand
2. **Collapsible Sections**: Reduce cognitive load, organize 40+ fields
3. **Audit Trail**: Track WHO changed WHAT for autonomous AI operations
4. **Weighted Completion**: Different sections have different importance weights

### Future Enhancements
- Add field-level permissions (who can edit what)
- Add change history viewer (show previous values)
- Add bulk edit capability (edit multiple staff at once)
- Add AI-powered validation (suggest corrections)

---

## 🚨 Common Issues

### Issue 1: "Collapsible is not defined"
**Solution:** Install shadcn collapsible component:
```bash
npx shadcn-ui@latest add collapsible
```

### Issue 2: "Cannot read property 'line2' of undefined"
**Solution:** Add null coalescing in formData initialization:
```jsx
address: {
  line1: staff?.address?.line1 || '',
  line2: staff?.address?.line2 || '', // ← Add this
  ...
}
```

### Issue 3: Migration fails "column already exists"
**Solution:** Use `IF NOT EXISTS` in ALTER TABLE statements (already in migration)

---

## 📞 Success Criteria

✅ Admin can edit all 40+ profile fields
✅ Sensitive data properly masked
✅ Audit trail captures all changes
✅ Form organized in collapsible sections
✅ Mobile responsive
✅ No performance degradation
✅ Profile completion calculator functional
✅ Zero breaking changes to existing workflows

---

**MODULE 21 COMPLETE! Proceed to MODULE 22.**
