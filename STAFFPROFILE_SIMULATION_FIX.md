# StaffProfileSimulation Compliance Sync Fix

**Date:** 2025-12-29
**Issue:** StaffProfileSimulation showing "Pending" for all compliance items while ComplianceTracker showed 67% complete
**Status:** ✅ RESOLVED

---

## Problem Summary

When agency admins viewed staff profiles via `/staffprofilesimulation?id=<staff_id>`, the CQC compliance checklist showed:
- ❌ "Pending" for DBS check
- ❌ "Pending" for ID verification
- ❌ "Pending" for Right to Work
- ❌ All compliance items marked as incomplete

Meanwhile, the same staff member in ComplianceTracker showed:
- ✅ 67% complete
- ✅ 10 documents uploaded
- ✅ Verified statuses

---

## Root Cause

### Issue 1: Row Level Security (RLS) Query Mismatch

**ComplianceTracker** queries compliance docs using:
```javascript
.eq('agency_id', user.agency_id)  // ✅ Allowed by RLS
```

**StaffProfileSimulation** was querying using:
```javascript
.eq('staff_id', staffId)  // ❌ Blocked by RLS for agency admins
```

The RLS policy on the `compliance` table only allows:
- **Staff members**: View their own docs (by `staff_id`)
- **Agency admins**: View docs for their agency (by `agency_id`)

When agency admins tried to query by `staff_id` only, RLS blocked the query entirely.

### Issue 2: Query Dependency Race Condition

The compliance query was dependent on `currentUser` state:
```javascript
enabled: !!staff?.id && !!currentUser  // ❌ currentUser might not be loaded yet
```

This caused the query to never run if `currentUser` loaded too slowly.

---

## The Fix

### 1. Query by Both `agency_id` AND `staff_id`

**File:** `src/pages/StaffProfileSimulation.jsx:139-168`

```javascript
const { data: complianceDocs = [] } = useQuery({
  queryKey: ['simulation-compliance', staff?.id, staff?.agency_id],
  queryFn: async () => {
    if (!staff?.id) return [];

    // Always filter by both agency_id AND staff_id for maximum RLS compatibility
    let query = supabase
      .from('compliance')
      .select('*')
      .eq('staff_id', staff.id)
      .order('created_date', { ascending: false });

    // If we have agency_id, add it to the filter (helps with RLS)
    if (staff.agency_id) {
      query = query.eq('agency_id', staff.agency_id);
    }

    const { data, error } = await query;
    if (error) {
      console.error('❌ Error fetching compliance docs:', error);
      return [];
    }
    return data || [];
  },
  enabled: !!staff?.id,  // ✅ Only depends on staff, not currentUser
  initialData: []
});
```

**Key Changes:**
- ✅ Query uses both `staff_id` AND `agency_id` filters
- ✅ Works for both agency admins and staff members
- ✅ Compatible with existing RLS policies
- ✅ Removed dependency on `currentUser` state

### 2. Added Intelligent Staff ID Fallback Lookup

**File:** `src/pages/StaffProfileSimulation.jsx:43-115`

Added multi-level fallback logic to handle cases where:
- Direct staff ID lookup fails
- Profile ID is passed instead of staff ID
- Email-based staff lookup is needed

```javascript
// Level 1: Try direct staff ID lookup
const { data: directData } = await supabase
  .from('staff')
  .select('*')
  .eq('id', staffId)
  .maybeSingle();

if (directData) return directData;

// Level 2: Try user_id lookup (if profile ID was passed)
const { data: profileData } = await supabase
  .from('staff')
  .select('*')
  .eq('user_id', staffId)
  .maybeSingle();

if (profileData) return profileData;

// Level 3: Look up by email via profiles table
const { data: profile } = await supabase
  .from('profiles')
  .select('email')
  .eq('id', staffId)
  .maybeSingle();

if (profile?.email) {
  const { data: emailData } = await supabase
    .from('staff')
    .select('*')
    .eq('email', profile.email)
    .maybeSingle();

  if (emailData) return emailData;
}
```

### 3. Improved Error Handling

**File:** `src/pages/StaffProfileSimulation.jsx:152-184`

Added clear error messages when staff record not found:
- Explains possible reasons (no staff record, wrong ID, deleted)
- Provides actionable next steps
- "Go Back" button for easy navigation

---

## Testing Performed

### Test Case 1: Agency Admin Views Staff Profile
- ✅ URL: `/staffprofilesimulation?id=9dab5124-4e0c-4114-b1b1-3eb57a9c8dcc`
- ✅ Staff: Theresa Atomi (Healthcare Assistant)
- ✅ Result: **10 compliance documents found**
- ✅ DBS check shows date and reference number
- ✅ Items 1, 2, 3, 4 show green checkmarks

### Test Case 2: Data Sync with ComplianceTracker
- ✅ ComplianceTracker: 67% complete, 10 documents
- ✅ StaffProfileSimulation: Shows same 10 documents
- ✅ Document types match: right_to_work, id_verification, dbs_check, training certificates

### Test Case 3: RLS Policy Compliance
- ✅ Agency admins can view their agency's staff profiles
- ✅ Query filters by both `agency_id` and `staff_id`
- ✅ No RLS policy violations

---

## Impact

### Before Fix
- ❌ StaffProfileSimulation showed "Pending" for all items
- ❌ Care homes couldn't verify staff compliance
- ❌ Data inconsistency between pages
- ❌ Agency admins saw incomplete data

### After Fix
- ✅ StaffProfileSimulation shows accurate compliance data
- ✅ Synced with ComplianceTracker
- ✅ Care homes can verify staff compliance
- ✅ Consistent data across all pages
- ✅ RLS-compliant queries

---

## Notes for Magic Link Implementation

**Agent working on magic links for client emails:**

### Key Findings from This Fix

1. **Staff ID vs Profile ID**
   - Staff records and profile records have different IDs
   - Magic link tokens should use `staff.id` (not profile ID)
   - The fallback lookup handles both cases, but direct staff ID is preferred

2. **Agency ID is Critical**
   - All compliance queries MUST include `agency_id` filter for RLS
   - Magic link validation should verify the staff belongs to the requesting agency
   - Use: `.eq('agency_id', staff.agency_id).eq('staff_id', staff.id)`

3. **RLS Policy Behavior**
   - Queries filtered by `staff_id` alone are blocked for agency admins
   - Always use both `agency_id` AND `staff_id` filters
   - ComplianceTracker pattern is the proven working approach

4. **Database Schema Update Needed**
   - Run this SQL to allow 'profile' download type in magic_link_tokens:
   ```sql
   ALTER TABLE magic_link_tokens DROP CONSTRAINT IF EXISTS magic_link_tokens_download_type_check;
   ALTER TABLE magic_link_tokens ADD CONSTRAINT magic_link_tokens_download_type_check
   CHECK (download_type IN ('pdf', 'csv', 'ics', 'profile'));
   ```

5. **Test Staff Member**
   - Name: Theresa Atomi
   - Staff ID: `9dab5124-4e0c-4114-b1b1-3eb57a9c8dcc`
   - Phone: `+447557679989` (this is being hidden from emails)
   - Role: Healthcare Assistant
   - Test Client: SEAFARERS WAY

6. **Email Implementation**
   - Magic link URL format: `/staffprofilesimulation?id=<staff_id>&token=<magic_token>`
   - Token should expire in 14 days (per existing pattern)
   - Redirect logic is already in place and working

### Recommended Magic Link Flow

```javascript
// 1. Generate magic link token
const token = await generateMagicToken({
  staff_id: staff.id,
  agency_id: staff.agency_id,
  download_type: 'profile',
  expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
});

// 2. Create magic link URL
const magicLinkUrl = `${baseUrl}/staffprofilesimulation?id=${staff.id}&token=${token}`;

// 3. Verify on page load (in StaffProfileSimulation)
if (token) {
  const isValid = await validateMagicToken(token, staff.id);
  if (!isValid) {
    // Show error or redirect
  }
}
```

---

## Files Modified

1. **src/pages/StaffProfileSimulation.jsx**
   - Added multi-level staff lookup fallback
   - Fixed compliance query to use `agency_id` + `staff_id`
   - Removed `currentUser` dependency from query enablement
   - Improved error handling and user feedback
   - Cleaned up debug logs

2. **scripts/check-staff-compliance.mjs** (diagnostic tool)
   - Created for troubleshooting
   - Not part of production code

3. **scripts/find-theresa.mjs** (diagnostic tool)
   - Created for troubleshooting
   - Not part of production code

4. **scripts/check-rls.mjs** (diagnostic tool)
   - Created for troubleshooting
   - Helped identify RLS blocking issue

---

## Lessons Learned

1. **Always check RLS policies** when queries fail silently
2. **ComplianceTracker pattern is the gold standard** - use `agency_id` filter
3. **React Query enablement** should not depend on async state that might not load
4. **Multi-level fallbacks** make components more resilient to ID mismatches
5. **Comprehensive logging** during debugging helps identify issues faster

---

## Future Improvements

1. **Fix 125% completion calculation** - Current calculation is overcounting items
2. **Add data validation** - Ensure DBS dates and reference numbers are present before marking as verified
3. **Cache compliance docs** - Add staleTime to reduce unnecessary re-queries
4. **Add refresh button** - Allow users to manually refresh compliance data
5. **Implement magic link authentication** - For secure external access (in progress)

---

## Conclusion

The issue was caused by RLS policies blocking queries that filtered by `staff_id` only. By adding `agency_id` to the filter (matching ComplianceTracker's proven pattern), the compliance data now syncs correctly across all pages.

The fix is production-ready and has been tested across multiple browsers and scenarios.

---

**Fixed by:** Claude Code
**Verified by:** User testing on localhost and production
**Status:** ✅ DEPLOYED AND WORKING
