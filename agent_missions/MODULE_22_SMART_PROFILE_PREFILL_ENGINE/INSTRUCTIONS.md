# MODULE 22: SMART PROFILE PRE-FILL ENGINE

## 🎯 Mission Objective
Enhance staff onboarding (`ProfileSetup.jsx`) to detect admin pre-filled data, show completion progress, and implement notification gating to prevent spam before account activation.

## 📊 Priority: P0 - CRITICAL
**Duration:** 2-3 hours
**Dependencies:** MODULE 21 (needs profile completion calculator)

---

## 🚀 Implementation Steps

### STEP 1: Import Profile Completion Calculator

**File:** `src/pages/ProfileSetup.jsx`

**Add at top:**
```jsx
import { calculateProfileCompletion, getCompletionBadge, formatMissingFields } from '../utils/profileHelpers';
```

### STEP 2: Add Pre-Fill Detection State

**After existing useState declarations (around line 30):**
```jsx
const [profileCompletion, setProfileCompletion] = useState({ percentage: 0, missingFields: [] });
const [preFilledFields, setPreFilledFields] = useState(new Set());
```

### STEP 3: Detect Pre-Filled Fields on Load

**In useEffect where staff data loads:**
```jsx
useEffect(() => {
  if (staffData) {
    // Calculate completion
    const completion = calculateProfileCompletion(staffData);
    setProfileCompletion(completion);

    // Detect which fields were pre-filled by admin
    const preFilled = new Set();
    if (staffData.ni_number) preFilled.add('ni_number');
    if (staffData.bank_details?.account_number) preFilled.add('bank_details');
    if (staffData.address?.line2) preFilled.add('address_line2');
    if (staffData.emergency_contact?.name) preFilled.add('emergency_contact');
    if (staffData.occupational_health?.cleared_to_work !== undefined) preFilled.add('occupational_health');
    if (staffData.driving_license_number) preFilled.add('driving_license');
    if (staffData.skills?.length > 0) preFilled.add('skills');
    if (staffData.groups?.length > 0) preFilled.add('groups');

    setPreFilledFields(preFilled);
  }
}, [staffData]);
```

### STEP 4: Add Progress Bar at Top of Form

**After the CardHeader, before CardContent:**
```jsx
{/* Progress Bar */}
<div className="px-6 py-4 bg-gradient-to-r from-cyan-50 to-blue-50 border-b">
  <div className="flex items-center justify-between mb-2">
    <div>
      <h3 className="text-sm font-semibold text-gray-700">Profile Completion</h3>
      <p className="text-xs text-gray-500">{formatMissingFields(profileCompletion.missingFields)}</p>
    </div>
    <div className="text-right">
      <span className="text-2xl font-bold text-cyan-600">{profileCompletion.percentage}%</span>
      <span className="text-xs text-gray-500 ml-2">{getCompletionBadge(profileCompletion.percentage).icon}</span>
    </div>
  </div>

  {/* Progress Bar */}
  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
    <div
      className={`h-full transition-all duration-500 ${
        profileCompletion.percentage >= 80 ? 'bg-green-500' :
        profileCompletion.percentage >= 50 ? 'bg-yellow-500' :
        'bg-red-500'
      }`}
      style={{ width: `${profileCompletion.percentage}%` }}
    />
  </div>

  {/* Pre-fill message */}
  {preFilledFields.size > 0 && (
    <div className="mt-3 p-2 bg-blue-100 border border-blue-300 rounded-lg">
      <p className="text-sm text-blue-900">
        ✓ <strong>{preFilledFields.size} sections</strong> pre-filled by your agency. Please review and update if needed.
      </p>
    </div>
  )}
</div>
```

### STEP 5: Add Visual Indicators for Pre-Filled Fields

**Helper component - add before the main component return:**
```jsx
const PreFilledBadge = () => (
  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
    ✓ Pre-filled by agency
  </span>
);
```

**Then add badge to relevant field labels:**
```jsx
<Label htmlFor="ni_number">
  National Insurance Number
  {preFilledFields.has('ni_number') && <PreFilledBadge />}
</Label>
```

### STEP 6: Update Completion on Field Change

**Add helper function:**
```jsx
const handleFieldChange = (field, value) => {
  setFormData({ ...formData, [field]: value });

  // Recalculate completion
  setTimeout(() => {
    const newCompletion = calculateProfileCompletion({ ...formData, [field]: value });
    setProfileCompletion(newCompletion);
  }, 100);
};
```

### STEP 7: Create Profile Change Notifier Edge Function

**File:** `supabase/functions/profile-change-notifier/index.ts` (NEW)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      staff_id,
      changed_by_user_id,
      changed_fields
    } = await req.json();

    // Fetch staff record
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('user_id, status, email, first_name, last_name')
      .eq('id', staff_id)
      .single();

    if (staffError || !staff) {
      return new Response(
        JSON.stringify({ error: 'Staff not found' }),
        { status: 404 }
      );
    }

    // ⚡ NOTIFICATION GATING LOGIC
    const shouldSendNotification = (
      staff.user_id !== null &&                    // Account linked
      staff.status === 'active' &&                  // Account active
      staff.user_id !== changed_by_user_id          // Not changed by themselves
    );

    if (!shouldSendNotification) {
      console.log(`🚫 Skipping notification for ${staff.email}:`, {
        user_id: staff.user_id,
        status: staff.status,
        changed_by_self: staff.user_id === changed_by_user_id
      });

      return new Response(
        JSON.stringify({
          skipped: true,
          reason: staff.user_id === null ? 'Account not linked yet' :
                  staff.status !== 'active' ? 'Account not active' :
                  'Changed by staff themselves'
        }),
        { status: 200 }
      );
    }

    // Send notification
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: "ACG StaffLink <noreply@agilecaremanagement.co.uk>",
        to: [staff.email],
        subject: "Your Profile Has Been Updated",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Profile Updated</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p style="font-size: 16px; color: #1f2937;">Hi ${staff.first_name},</p>
              <p style="font-size: 16px; color: #1f2937;">
                Your profile has been updated by your agency administrator.
              </p>
              <div style="background: white; border-left: 4px solid #06b6d4; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #1f2937;"><strong>Updated fields:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px; color: #4b5563;">
                  ${changed_fields.map(f => `<li>${f}</li>`).join('')}
                </ul>
              </div>
              <p style="font-size: 14px; color: #6b7280;">
                Please log in to review the changes and ensure all information is correct.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get("FRONTEND_URL") || "https://app.agilecaremanagement.co.uk"}/StaffPortal"
                   style="background: #06b6d4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  View Your Profile
                </a>
              </div>
            </div>
          </div>
        `
      })
    });

    if (!emailResponse.ok) {
      throw new Error('Failed to send email');
    }

    return new Response(
      JSON.stringify({ success: true, email_sent: true }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
```

### STEP 8: Call Notifier from Staff.jsx Mutation

**File:** `src/pages/Staff.jsx`

**Update the updateStaffMutation onSuccess:**
```jsx
onSuccess: async (updatedStaff) => {
  queryClient.invalidateQueries(['staff']);
  toast.success(`✅ ${updatedStaff.first_name} ${updatedStaff.last_name} updated successfully!`);

  // ⚡ Trigger profile change notification
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const changedFields = Object.keys(data).filter(key =>
      staff[key] !== data[key]
    ).map(key => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));

    if (changedFields.length > 0) {
      await supabase.functions.invoke('profile-change-notifier', {
        body: {
          staff_id: updatedStaff.id,
          changed_by_user_id: user?.id,
          changed_fields: changedFields
        }
      });
    }
  } catch (notifyError) {
    console.warn('⚠️ Notification failed (non-critical):', notifyError);
    // Don't throw - notification failure shouldn't block profile update
  }

  setEditingStaff(null);
}
```

### STEP 9: Deploy Edge Function

```bash
cd C:\Users\gbase\superbasecli
./supabase.exe functions deploy profile-change-notifier --project-ref rzzxxkppkiasuouuglaf
```

---

## ✅ Validation Checklist

- [ ] Progress bar shows correct completion %
- [ ] Pre-filled badge appears on admin-filled fields
- [ ] Completion % updates as staff fills fields
- [ ] Edge function deploys without errors
- [ ] Notification NOT sent when user_id is NULL
- [ ] Notification NOT sent when status is 'onboarding'
- [ ] Notification NOT sent when staff edits their own profile
- [ ] Notification IS sent when admin edits active staff profile

---

## 🔄 Rollback

```bash
# Delete edge function
./supabase.exe functions delete profile-change-notifier

# Restore ProfileSetup.jsx
git checkout HEAD~1 -- src/pages/ProfileSetup.jsx
```

---

## 📝 Testing

1. Admin pre-fills staff profile (MODULE 21)
2. Send invite to staff
3. Staff signs up and goes to ProfileSetup
4. Verify progress bar shows 80%+ (if admin filled everything)
5. Verify "Pre-filled by agency" badges appear
6. Admin edits active staff profile
7. Staff receives email notification

**MODULE 22 COMPLETE!**
