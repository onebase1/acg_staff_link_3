# Storage Upload Pattern - Fixed & Best Practices

## Problem Identified

**Root Cause:** Code was uploading files to the wrong storage buckets, causing RLS policy failures.

### What Was Broken

Profile photos and agency logos were being uploaded to the **private** `documents` bucket instead of the **public** `profile-photos` bucket, causing authentication and permission errors.

## Storage Buckets Available

| Bucket Name | Visibility | Purpose | Current Status |
|------------|-----------|---------|----------------|
| `profile-photos` | **PUBLIC** | Staff profile photos, agency logos | ✅ FIXED |
| `documents` | Private | Generic documents (legacy) | ⚠️ Not recommended |
| `compliance-docs` | Private | DBS, Right to Work, Training certs | ⚠️ Needs migration |
| `timesheet-docs` | Private | Timesheet attachments, receipts | ⚠️ Needs migration |

## Files Fixed (Profile Photos)

### ✅ 1. ProfileSetup.jsx (Lines 349-358)
**What:** Super admin & staff profile photo uploads
**Fixed:** Changed from `documents` to `profile-photos` bucket
**Impact:** Super admin can now upload profile photos

```javascript
// BEFORE (BROKEN)
const fileName = `profile-photos/${Date.now()}-${file.name}`;
await supabase.storage.from('documents').upload(fileName, file);

// AFTER (FIXED)
const fileName = `${Date.now()}-${file.name}`;
await supabase.storage.from('profile-photos').upload(fileName, file);
```

### ✅ 2. StaffForm.jsx (Lines 119-128)
**What:** Admin creates staff with profile photo
**Fixed:** Changed from `documents` to `profile-photos` bucket
**Impact:** Agency admins can upload staff photos when creating new staff

### ✅ 3. AgencySettings.jsx (Lines 204-213)
**What:** Agency logo uploads
**Fixed:** Changed from `documents` to `profile-photos` bucket
**Impact:** Agencies can upload their logos

## Files That Need Similar Fixes

### ⚠️ 4. ComplianceTracker.jsx (Lines 249-259)
**Current:** Uploads to `documents` bucket with path `compliance/...`
**Recommended:** Should use `compliance-docs` bucket
**Why:** Better organization, separate RLS policies for compliance docs

```javascript
// CURRENT (WORKS BUT NOT IDEAL)
const fileName = `compliance/${Date.now()}-${file.name}`;
await supabase.storage.from('documents').upload(fileName, file);

// RECOMMENDED
const fileName = `${Date.now()}-${file.name}`;
await supabase.storage.from('compliance-docs').upload(fileName, file);
```

### ⚠️ 5. Timesheets.jsx (Lines 312-321)
**Current:** Uploads to `documents` bucket with path `timesheets/...`
**Recommended:** Should use `timesheet-docs` bucket
**Why:** Better organization, separate RLS policies for timesheet docs

```javascript
// CURRENT (WORKS BUT NOT IDEAL)
const fileName = `timesheets/${timesheetId}/${Date.now()}-${file.name}`;
await supabase.storage.from('documents').upload(fileName, file);

// RECOMMENDED
const fileName = `${timesheetId}/${Date.now()}-${file.name}`;
await supabase.storage.from('timesheet-docs').upload(fileName, file);
```

### ⚠️ 6. TimesheetDetail.jsx (Lines 195-204)
**Current:** Uploads to `documents` bucket
**Recommended:** Should use `timesheet-docs` bucket

## Best Practices Pattern

### 1. Profile Photos & Public Images
```javascript
const handlePhotoUpload = async (file) => {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('Please upload an image file');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    // Upload to PUBLIC bucket
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('profile-photos')  // ✅ Use profile-photos for public images
      .upload(fileName, file);

    if (error) throw error;

    // Get public URL (no auth required)
    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

### 2. Compliance Documents (Private)
```javascript
const handleComplianceUpload = async (file, documentType) => {
  try {
    // Validate file
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only PDF and images allowed');
    }

    // Upload to PRIVATE bucket
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('compliance-docs')  // ✅ Use compliance-docs bucket
      .upload(fileName, file);

    if (error) throw error;

    // Get public URL (requires RLS check)
    const { data: { publicUrl } } = supabase.storage
      .from('compliance-docs')
      .getPublicUrl(fileName);

    // Create compliance record
    const { error: dbError } = await supabase
      .from('compliance')
      .insert({
        staff_id: staffId,
        document_type: documentType,
        document_url: publicUrl,
        issue_date: issueDate,
        expiry_date: expiryDate
      });

    if (dbError) throw dbError;

    return publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

### 3. Timesheet Documents (Private)
```javascript
const handleTimesheetDocUpload = async (file, timesheetId) => {
  try {
    // Upload to PRIVATE bucket with organized path
    const fileName = `${timesheetId}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('timesheet-docs')  // ✅ Use timesheet-docs bucket
      .upload(fileName, file);

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('timesheet-docs')
      .getPublicUrl(fileName);

    // Create document record
    const { error: dbError } = await supabase
      .from('timesheet_documents')
      .insert({
        timesheet_id: timesheetId,
        file_url: publicUrl,
        uploaded_at: new Date().toISOString()
      });

    if (dbError) throw dbError;

    return publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

## RLS Policy Requirements

### For Public Buckets (profile-photos)
- **SELECT:** Allow public (anyone can view)
- **INSERT:** Require authenticated (only logged-in users can upload)
- **DELETE:** Restrict to owner or admin

### For Private Buckets (compliance-docs, timesheet-docs)
- **SELECT:** Allow authenticated users (with additional checks for ownership)
- **INSERT:** Require authenticated (only logged-in users can upload)
- **DELETE:** Restrict to owner or admin

## Migration Checklist

- [x] Fix ProfileSetup.jsx - profile photos
- [x] Fix StaffForm.jsx - staff photos
- [x] Fix AgencySettings.jsx - agency logos
- [ ] Migrate ComplianceTracker.jsx to `compliance-docs` bucket
- [ ] Migrate Timesheets.jsx to `timesheet-docs` bucket
- [ ] Migrate TimesheetDetail.jsx to `timesheet-docs` bucket
- [ ] Update supabaseStorage.js to use correct bucket constants
- [ ] Verify RLS policies for all buckets
- [ ] Test all upload scenarios

## Testing Checklist

### Profile Photos (FIXED - Ready to Test)
- [ ] Super admin uploads profile photo in ProfileSetup
- [ ] Staff member uploads profile photo during onboarding
- [ ] Agency admin uploads staff photo when creating staff
- [ ] Agency uploads logo in settings
- [ ] Verify photos are publicly accessible (no auth required)

### Compliance Docs (After Migration)
- [ ] Staff uploads DBS certificate
- [ ] Staff uploads Right to Work document
- [ ] Staff uploads Training certificates
- [ ] Verify only authorized users can view compliance docs

### Timesheet Docs (After Migration)
- [ ] Staff uploads timesheet attachment
- [ ] Admin uploads timesheet document
- [ ] Verify only authorized users can view timesheet docs

## Supabase AI Recommendations Summary

Based on the Supabase AI analysis, the likely causes were:
1. ✅ **Using wrong bucket** - FIXED by using `profile-photos` instead of `documents`
2. ✅ **RLS policy mismatch** - FIXED by matching bucket to policy
3. ⚠️ **Missing authentication context** - Ensure client always uses authenticated session
4. ⚠️ **Bucket visibility** - Profile photos need PUBLIC bucket, not PRIVATE

## Key Takeaways

1. **Match bucket to purpose:**
   - Public images → `profile-photos`
   - Compliance docs → `compliance-docs`
   - Timesheet docs → `timesheet-docs`

2. **Don't use generic `documents` bucket** - It's a legacy bucket without clear RLS policies

3. **Always validate files** before uploading (type, size)

4. **Always handle errors** and show user-friendly messages

5. **Ensure authenticated session** before allowing uploads

6. **Use consistent naming** for uploaded files (timestamp + original name)

---

**Status:** Profile photo uploads FIXED ✅
**Next:** Migrate compliance and timesheet uploads to dedicated buckets
