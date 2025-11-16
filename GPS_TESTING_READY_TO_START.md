# 🚀 GPS Clock-In Testing - Ready to Start!

**Date:** 2025-11-15  
**Status:** ✅ Setup Complete - Ready for Testing

---

## ✅ Pre-Test Setup Completed

### 1. Divine Care Center GPS Configuration ✅
- **Client ID:** `f679e93f-97d8-4697-908a-e165f22e322a`
- **Client Name:** Divine Care Center
- **GPS Coordinates:** `54.719100, -1.353900`
- **Address:** Station Town, Wingate, TS28 5DP
- **Geofence Radius:** 100 meters
- **Geofence Enabled:** ✅ Yes

### 2. Test Shift Assigned ✅
- **Shift ID:** `a26b7648-236e-4ed1-9d87-9de85e844fb3`
- **Date:** 2025-11-15 (TODAY)
- **Time:** 09:00 - 17:00 (8 hours)
- **Status:** Assigned
- **Client:** Divine Care Center
- **Assigned Staff:** Chadaira Basera

### 3. Test Staff Member ✅
- **Staff ID:** `c487d84c-f77b-4797-9e98-321ee8b49a87`
- **Name:** Chadaira Basera
- **Role:** Healthcare Assistant
- **Email:** `g.basera5+chadaira@gmail.com`
- **GPS Consent:** ❌ Not granted yet (will test consent flow)
- **User Type:** staff_member

### 4. Timesheet Status ✅
- **Status:** No timesheet exists yet (clean test)
- **Clock-In:** Not completed
- **Clock-Out:** Not completed

---

## 🧪 Testing Steps - Execute in Order

### **STEP 1: Test GPS Consent Flow** ⏳

**Login Credentials:**
- Email: `g.basera5+chadaira@gmail.com`
- Password: [Your password for this test account]

**Actions:**
1. Open app in browser
2. Log in as Chadaira Basera
3. Navigate to Staff Portal
4. Look for GPS consent prompt
5. Grant GPS consent
6. Verify success message

**Expected Results:**
- ✅ GPS consent prompt appears
- ✅ Consent is saved to database
- ✅ `staff.gps_consent` = true
- ✅ `staff.gps_consent_date` = current timestamp

**Verification Query:**
```sql
SELECT id, first_name, last_name, gps_consent, gps_consent_date 
FROM staff 
WHERE id = 'c487d84c-f77b-4797-9e98-321ee8b49a87';
```

---

### **STEP 2: View Assigned Shift** ⏳

**Actions:**
1. In Staff Portal, locate today's shift
2. Verify shift details are displayed correctly
3. Check that "Clock In" button is visible

**Expected Results:**
- ✅ Shift shows: Divine Care Center
- ✅ Time: 09:00 - 17:00
- ✅ Date: 2025-11-15
- ✅ "Clock In" button is visible
- ✅ Client GPS location is configured (should show indicator)

---

### **STEP 3: Test Geofence Validation - WITHIN Range** ⏳

**Prerequisites:**
- You must be physically within 100 meters of coordinates: `54.719100, -1.353900`
- Or use browser developer tools to spoof GPS location

**Actions:**
1. Click "Clock In" button
2. Grant browser location permission when prompted
3. Wait for GPS capture
4. Observe geofence validation result

**Expected Results:**
- ✅ GPS location captured successfully
- ✅ Distance calculated (should be < 100m)
- ✅ Geofence validation PASSES (green indicator)
- ✅ Success message: "✅ Verified: [X]m from Divine Care Center"
- ✅ "Clock In" button becomes enabled
- ✅ No error messages

**Browser Console Check:**
- Look for: `📏 [Distance Check] Xm from client (limit: 100m) - PASS`

---

### **STEP 4: Complete Clock-In** ⏳

**Actions:**
1. After geofence validation passes, click "Clock In" button
2. Wait for confirmation
3. Verify UI updates

**Expected Results:**
- ✅ Success toast: "Clocked in successfully"
- ✅ Timesheet created in database
- ✅ Shift status changes to "in_progress"
- ✅ UI shows "Clock Out" button instead of "Clock In"
- ✅ Clock-in time displayed

**Verification Query:**
```sql
SELECT 
  id, shift_id, staff_id, 
  clock_in_time, 
  clock_in_location,
  geofence_validated,
  geofence_distance_meters
FROM timesheets 
WHERE shift_id = 'a26b7648-236e-4ed1-9d87-9de85e844fb3';
```

**Expected Data:**
- `clock_in_time`: Current timestamp
- `clock_in_location`: `{"latitude": X, "longitude": Y, "accuracy": Z}`
- `geofence_validated`: `true`
- `geofence_distance_meters`: < 100

---

### **STEP 5: Verify Live Map Tracking** ⏳

**Actions:**
1. Open new browser tab/window
2. Log in as admin (your main account)
3. Navigate to `/live-shift-map`
4. Locate Divine Care Center on map

**Expected Results:**
- ✅ Divine Care Center appears on map
- ✅ GPS marker at coordinates: 54.719100, -1.353900
- ✅ Geofence circle (100m radius) is visible
- ✅ Chadaira Basera's marker appears at clock-in location
- ✅ Marker is GREEN (geofence validated)
- ✅ Marker popup shows:
  - Staff name: Chadaira Basera
  - Clock-in time
  - Distance from site
  - Geofence status: ✅ Validated

---

### **STEP 6: Test Geofence Validation - OUTSIDE Range** ⏳

**Prerequisites:**
- Move to location > 100 meters from Divine Care Center
- Or use browser dev tools to spoof GPS to distant location

**Actions:**
1. Create a NEW test shift for tomorrow (2025-11-16)
2. Assign to Chadaira Basera
3. Log in as Chadaira
4. Attempt to clock in from outside geofence

**Expected Results:**
- ✅ GPS location captured
- ✅ Distance calculated (should be > 100m)
- ✅ Geofence validation FAILS (red/warning indicator)
- ✅ Warning message: "❌ Too far: [X]m from Divine Care Center (limit: 100m)"
- ✅ "Clock In" button remains DISABLED
- ✅ Cannot proceed with clock-in

**Browser Console Check:**
- Look for: `📏 [Distance Check] Xm from client (limit: 100m) - FAIL`

---

### **STEP 7: Test Clock-Out** ⏳

**Actions:**
1. Return to Staff Portal (logged in as Chadaira)
2. Locate active shift (should show "Clock Out" button)
3. Click "Clock Out" button
4. Wait for confirmation

**Expected Results:**
- ✅ Success toast: "Clocked out successfully"
- ✅ Timesheet updated with clock-out time
- ✅ Total hours calculated correctly
- ✅ Hours rounded to 30-minute intervals
- ✅ Shift status changes to "completed"
- ✅ UI no longer shows "Clock Out" button

**Verification Query:**
```sql
SELECT 
  id, 
  clock_in_time, 
  clock_out_time, 
  total_hours,
  status
FROM timesheets 
WHERE shift_id = 'a26b7648-236e-4ed1-9d87-9de85e844fb3';
```

---

## 🔍 RLS Policy Verification

If any step fails, check these RLS policies first:

### Check Staff Can Update GPS Consent
```sql
-- As Chadaira's user (d617ddd7-3103-4d0b-a2e3-35eedec4212a)
UPDATE staff 
SET gps_consent = true, gps_consent_date = NOW()
WHERE id = 'c487d84c-f77b-4797-9e98-321ee8b49a87';
```

### Check Staff Can Insert Timesheet
```sql
-- As Chadaira's user
INSERT INTO timesheets (shift_id, staff_id, clock_in_time, clock_in_location)
VALUES (
  'a26b7648-236e-4ed1-9d87-9de85e844fb3',
  'c487d84c-f77b-4797-9e98-321ee8b49a87',
  NOW(),
  '{"latitude": 54.719100, "longitude": -1.353900}'::jsonb
);
```

### Check Staff Can Read Client GPS Coordinates
```sql
-- As Chadaira's user
SELECT id, name, location_coordinates, geofence_radius_meters
FROM clients
WHERE id = 'f679e93f-97d8-4697-908a-e165f22e322a';
```

---

## 📊 Success Criteria Checklist

- [ ] GPS consent granted successfully
- [ ] Shift visible in Staff Portal
- [ ] Geofence validation works (within range = pass)
- [ ] Geofence validation works (outside range = fail)
- [ ] Clock-in creates timesheet with GPS data
- [ ] Live map shows clocked-in staff location
- [ ] Clock-out updates timesheet and calculates hours
- [ ] All RLS policies allow required operations
- [ ] No console errors during any step

---

## 🐛 Troubleshooting

### Issue: GPS Consent Not Saving
- **Check:** RLS policy on `staff` table allows UPDATE of `gps_consent` field
- **Fix:** Add policy or update existing policy

### Issue: Cannot Read Client GPS Coordinates
- **Check:** RLS policy on `clients` table allows SELECT for staff
- **Fix:** Add policy: `SELECT ON clients FOR staff WHERE true`

### Issue: Cannot Create Timesheet
- **Check:** RLS policy on `timesheets` table allows INSERT for staff
- **Fix:** Add policy: `INSERT ON timesheets FOR staff WHERE staff_id = auth.uid()`

### Issue: Geofence Validator Function Fails
- **Check:** Function logs in Supabase dashboard
- **Check:** Function has correct environment variables
- **Fix:** Redeploy function if needed

---

## 📝 Next Steps After Testing

1. Document any issues found
2. Fix RLS policies if needed
3. Test edge cases (GPS denied, GPS unavailable, etc.)
4. Verify data integrity in database
5. Test with multiple staff members
6. Test with multiple clients
7. Move to next module in testing roadmap

---

**Ready to start testing!** 🎯

Begin with STEP 1 and work through each step in order.

