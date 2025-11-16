# Manual Testing Guide - Staff Portal Fixes

**Date:** November 13, 2025  
**Tester:** You  
**Environment:** Development (localhost)

---

## 🎯 Test Credentials

### Staff User (Chadaira)
- **Email:** g.basera5+chadaira@gmail.com
- **Password:** Broadband@123
- **Role:** Healthcare Assistant
- **Agency:** Dominion Agency

### Agency Admin
- **Email:** info@guest-glow.com
- **Password:** Dominion#2025

---

## 🧪 Test Suite

### Test 1: Shift Acceptance ✅

**Objective:** Verify staff can accept shifts and shift status updates correctly

**Steps:**
1. Start dev server: `npm run dev`
2. Login as Chadaira (g.basera5+chadaira@gmail.com / Broadband@123)
3. Navigate to "Shift Marketplace"
4. Find the shift on **November 23, 2025**
5. Click "Accept Shift" button
6. Wait for loading spinner (should only show on that button)

**Expected Results:**
- ✅ Success toast appears: "🎉 Shift Accepted!"
- ✅ Shift disappears from marketplace immediately
- ✅ Only the clicked button shows loading state
- ✅ Other shift buttons remain enabled

**Database Verification:**
```javascript
// Run in browser console or check database directly
const { data } = await supabase
  .from('shifts')
  .select('status, assigned_staff_id')
  .eq('id', '9dee8694-13a3-4d26-bfc2-ae46843c044a')
  .single();

console.log('Status:', data.status); // Should be "assigned"
console.log('Assigned to:', data.assigned_staff_id); // Should be Chadaira's ID
```

**Pass Criteria:**
- [ ] Shift accepted successfully
- [ ] Shift removed from marketplace
- [ ] Database shows status = "assigned"
- [ ] Database shows assigned_staff_id = Chadaira's ID
- [ ] Booking created with status = "pending"

---

### Test 2: Profile Photo Upload ✅

**Objective:** Verify profile photos upload and persist correctly

**Steps:**
1. While logged in as Chadaira, click profile icon → "Profile Settings"
2. Click the camera icon or "Upload Photo" button
3. Select an image file (< 5MB)
4. **BEFORE SAVING:** Check if preview updates immediately
5. Click "Save Changes" button
6. Wait for success toast
7. Refresh the page (F5)
8. Check if photo is still visible

**Expected Results:**
- ✅ Photo preview shows immediately after upload
- ✅ Success toast: "✅ Photo uploaded successfully!"
- ✅ After save: "Profile updated successfully!"
- ✅ Photo persists after page refresh
- ✅ Photo visible in header/navbar

**Database Verification:**
```javascript
// Check both tables
const { data: profile } = await supabase
  .from('profiles')
  .select('profile_photo_url')
  .eq('email', 'g.basera5+chadaira@gmail.com')
  .single();

const { data: staff } = await supabase
  .from('staff')
  .select('profile_photo_url')
  .eq('id', 'c487d84c-f77b-4797-9e98-321ee8b49a87')
  .single();

console.log('Profile URL:', profile.profile_photo_url);
console.log('Staff URL:', staff.profile_photo_url);
// Both should match and NOT be placeholder
```

**Pass Criteria:**
- [ ] Photo preview updates immediately
- [ ] Photo saves successfully
- [ ] Photo persists after refresh
- [ ] Both profiles and staff tables updated
- [ ] No placeholder URLs in database

---

### Test 3: References Persistence ✅

**Objective:** Verify references save and persist correctly

**Steps:**
1. In Profile Settings, scroll to "References" section
2. Click "Add Reference"
3. Fill in reference details:
   - Name: "Dr. Sarah Johnson"
   - Relationship: "Previous Supervisor"
   - Company: "City Hospital"
   - Phone: "+44 20 1234 5678"
   - Email: "sarah.j@cityhospital.nhs.uk"
4. Click "Add Reference" again and add a second reference
5. Click "Save Changes"
6. Wait for success toast
7. Refresh the page (F5)
8. Check if both references are still visible

**Expected Results:**
- ✅ References added to form successfully
- ✅ Success toast: "Profile updated successfully!"
- ✅ References persist after page refresh
- ✅ All reference details intact

**Database Verification:**
```javascript
const { data: staff } = await supabase
  .from('staff')
  .select('references')
  .eq('id', 'c487d84c-f77b-4797-9e98-321ee8b49a87')
  .single();

console.log('References:', staff.references);
// Should be array with 2 objects
```

**Pass Criteria:**
- [ ] References added successfully
- [ ] References save to database
- [ ] References persist after refresh
- [ ] All fields intact (name, phone, email, etc.)

---

### Test 4: Loading States ✅

**Objective:** Verify only the clicked shift shows loading state

**Steps:**
1. Navigate to Shift Marketplace
2. Ensure there are at least 2 available shifts visible
3. Click "Accept Shift" on the FIRST shift
4. Immediately observe ALL shift buttons

**Expected Results:**
- ✅ Only the clicked shift button shows loading spinner
- ✅ Other shift buttons remain enabled and clickable
- ✅ No global loading state affecting all buttons

**Pass Criteria:**
- [ ] Only clicked button shows loading
- [ ] Other buttons remain enabled
- [ ] No UI freezing or global loading

---

## 🐛 Known Issues to Watch For

### Console Warnings
- ⚠️ "No staff record found" - This is expected on first login, ignore if profile loads correctly
- ⚠️ React warnings about keys - These are non-critical, can be ignored for now

### Expected Behavior
- Profile photo upload shows success toast BEFORE clicking save
- Shift acceptance may take 2-3 seconds due to database updates
- Marketplace auto-refreshes every 10 seconds

---

## 📊 Test Results Template

Copy this and fill in after testing:

```
## Test Results - [Your Name] - [Date/Time]

### Test 1: Shift Acceptance
- [ ] PASS / [ ] FAIL
- Notes: 

### Test 2: Profile Photo Upload
- [ ] PASS / [ ] FAIL
- Notes: 

### Test 3: References Persistence
- [ ] PASS / [ ] FAIL
- Notes: 

### Test 4: Loading States
- [ ] PASS / [ ] FAIL
- Notes: 

### Overall Status
- [ ] ALL TESTS PASSED ✅
- [ ] SOME TESTS FAILED ❌

### Issues Found:
1. 
2. 
3. 
```

---

## 🚀 Next Steps After Testing

If all tests pass:
1. ✅ Mark staff portal as complete
2. ✅ Move to agency admin portal testing
3. ✅ Create comprehensive documentation

If tests fail:
1. ❌ Document exact failure scenario
2. ❌ Check browser console for errors
3. ❌ Check database state
4. ❌ Report back with screenshots

---

**Ready to test!** 🎯

