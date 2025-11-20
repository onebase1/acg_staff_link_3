# 📋 GPS GEOFENCING MANUAL TESTING CHECKLIST

**Date:** 2025-11-18  
**Tester:** _______________  
**Browser:** Chrome (required for GPS spoofing)

---

## ✅ PRE-TEST SETUP

- [ ] Run `supabase/seed_gps_test_data.sql` in Supabase SQL Editor
- [ ] Create test users in Supabase Auth:
  - [ ] alice.gps@test.com (password: TestGPS123!)
  - [ ] bob.noconsent@test.com (password: TestGPS123!)
- [ ] Link users to staff records (see SQL in GPS_COMPREHENSIVE_TEST_PLAN.md)
- [ ] Assign test shifts to staff members via Admin Portal
- [ ] Open Chrome DevTools (F12) → Sensors tab

---

## 🧪 TEST 1: GPS CONSENT FLOW

### Test 1.1: Staff WITHOUT GPS Consent
**User:** bob.noconsent@test.com

- [ ] Login to Staff Portal (`/staff-portal`)
- [ ] **EXPECT:** GPS consent prompt displayed
- [ ] **EXPECT:** Explanation text visible
- [ ] Click "Grant GPS Consent" button
- [ ] **EXPECT:** Consent prompt disappears
- [ ] **EXPECT:** Can now see shifts and clock-in button
- [ ] **VERIFY:** Check database:
  ```sql
  SELECT gps_consent, gps_consent_date FROM staff WHERE email = 'bob.noconsent@test.com';
  ```
- [ ] **EXPECT:** `gps_consent = true`, `gps_consent_date` populated

**✅ PASS** | **❌ FAIL** | **Notes:** _______________

---

### Test 1.2: Staff WITH GPS Consent
**User:** alice.gps@test.com

- [ ] Login to Staff Portal
- [ ] **EXPECT:** NO consent prompt shown
- [ ] **EXPECT:** Immediately see shifts and clock-in button

**✅ PASS** | **❌ FAIL** | **Notes:** _______________

---

## 🧪 TEST 2: GEOFENCE VALIDATION - WITHIN RANGE

### Test 2.1: Clock-In Within 100m Geofence
**User:** alice.gps@test.com  
**Client:** Durham Care Home (54.7753, -1.5849)  
**Geofence:** 100m

**Setup GPS Spoofing:**
1. Chrome DevTools → Sensors → Location
2. Set custom location:
   - Latitude: `54.7755`
   - Longitude: `-1.5850`
   - (This is ≈22m from client)

**Test Steps:**
- [ ] Navigate to Staff Portal
- [ ] Select shift for Durham Care Home
- [ ] Click "Clock In" button
- [ ] **EXPECT:** Loading indicator appears
- [ ] **EXPECT:** Success toast: "✅ Verified: 22m from Durham Care Home"
- [ ] **EXPECT:** Clock-in button changes to "Clock Out"
- [ ] **EXPECT:** Timer starts showing elapsed time
- [ ] **VERIFY:** Check database:
  ```sql
  SELECT 
    clock_in_location,
    geofence_validated,
    geofence_distance_meters
  FROM timesheets
  WHERE staff_id = 'test-staff-gps-consent-001'
    AND shift_date = CURRENT_DATE
  ORDER BY created_date DESC
  LIMIT 1;
  ```
- [ ] **EXPECT:** `geofence_validated = true`
- [ ] **EXPECT:** `geofence_distance_meters ≈ 22`
- [ ] **EXPECT:** `clock_in_location` contains GPS coordinates

**✅ PASS** | **❌ FAIL** | **Notes:** _______________

---

## 🧪 TEST 3: GEOFENCE VALIDATION - OUTSIDE RANGE

### Test 3.1: Clock-In Outside 100m Geofence
**User:** alice.gps@test.com  
**Client:** Durham Care Home

**Setup GPS Spoofing:**
1. Set custom location:
   - Latitude: `54.7800`
   - Longitude: `-1.5900`
   - (This is ≈550m from client)

**Test Steps:**
- [ ] Refresh page (to reset any previous clock-in)
- [ ] Click "Clock In" button
- [ ] **EXPECT:** Loading indicator appears
- [ ] **EXPECT:** Error toast: "❌ Too far: 550m from Durham Care Home (limit: 100m)"
- [ ] **EXPECT:** Clock-in button remains DISABLED
- [ ] **EXPECT:** Error message displayed on screen
- [ ] **VERIFY:** Check database - NO new timesheet created
  ```sql
  SELECT COUNT(*) FROM timesheets 
  WHERE staff_id = 'test-staff-gps-consent-001'
    AND shift_date = CURRENT_DATE;
  ```
- [ ] **EXPECT:** Count should be 0 (or same as before)

**✅ PASS** | **❌ FAIL** | **Notes:** _______________

---

## 🧪 TEST 4: LARGER GEOFENCE (200m)

### Test 4.1: Clock-In Within 200m Geofence
**User:** alice.gps@test.com  
**Client:** Newcastle Hospital Care (54.9738, -1.6131)  
**Geofence:** 200m

**Setup GPS Spoofing:**
1. Set custom location:
   - Latitude: `54.9750`
   - Longitude: `-1.6140`
   - (This is ≈150m from client)

**Test Steps:**
- [ ] Select shift for Newcastle Hospital Care
- [ ] Click "Clock In" button
- [ ] **EXPECT:** Success toast: "✅ Verified: 150m from Newcastle Hospital Care"
- [ ] **EXPECT:** Clock-in succeeds
- [ ] **VERIFY:** `geofence_distance_meters ≈ 150` in database

**✅ PASS** | **❌ FAIL** | **Notes:** _______________

---

## 🧪 TEST 5: NO GPS CONFIGURED

### Test 5.1: Client Without GPS Coordinates
**Client:** Legacy Care Home (No GPS)

**Test Steps:**
- [ ] Select shift for Legacy Care Home
- [ ] Click "Clock In" (any GPS location)
- [ ] **EXPECT:** Warning toast: "Client GPS coordinates not configured - validation skipped"
- [ ] **EXPECT:** Clock-in succeeds (auto-pass)
- [ ] **VERIFY:** Database shows `geofence_validated = true` with violation reason

**✅ PASS** | **❌ FAIL** | **Notes:** _______________

---

## 🧪 TEST 6: GPS DISABLED

### Test 6.1: Client with Geofencing Disabled
**Client:** GPS Disabled Care Home

**Test Steps:**
- [ ] Select shift for GPS Disabled Care Home
- [ ] Click "Clock In" (any GPS location)
- [ ] **EXPECT:** Info toast: "Geofencing is disabled for this client"
- [ ] **EXPECT:** Clock-in succeeds (auto-pass)

**✅ PASS** | **❌ FAIL** | **Notes:** _______________

---

## 🧪 TEST 7: CLOCK-OUT WORKFLOW

### Test 7.1: Normal Clock-Out (After 15+ Minutes)

**Prerequisites:** Already clocked in from Test 2.1

**Option A: Wait 15 minutes**
- [ ] Wait 15 minutes after clock-in

**Option B: Modify database (faster)**
```sql
UPDATE timesheets 
SET clock_in_time = NOW() - INTERVAL '20 minutes'
WHERE staff_id = 'test-staff-gps-consent-001'
  AND shift_date = CURRENT_DATE
  AND clock_out_time IS NULL;
```

**Test Steps:**
- [ ] Click "Clock Out" button
- [ ] **EXPECT:** Confirmation dialog appears
- [ ] **EXPECT:** Dialog shows total hours worked
- [ ] Click "Confirm Clock Out"
- [ ] **EXPECT:** GPS location captured
- [ ] **EXPECT:** Success toast: "Clocked out successfully"
- [ ] **EXPECT:** Button changes back to "Clock In"
- [ ] **VERIFY:** Database:
  ```sql
  SELECT 
    clock_in_time,
    clock_out_time,
    clock_out_location,
    total_hours,
    status
  FROM timesheets
  WHERE staff_id = 'test-staff-gps-consent-001'
    AND shift_date = CURRENT_DATE
  ORDER BY created_date DESC
  LIMIT 1;
  ```
- [ ] **EXPECT:** All fields populated
- [ ] **EXPECT:** `total_hours` calculated correctly
- [ ] **EXPECT:** `status = 'submitted'` or `'approved'`

**✅ PASS** | **❌ FAIL** | **Notes:** _______________

---

### Test 7.2: Clock-Out Too Soon (< 15 Minutes)

**Test Steps:**
- [ ] Clock in
- [ ] Immediately click "Clock Out" (< 15 mins)
- [ ] **EXPECT:** Error toast: "Minimum shift duration not met"
- [ ] **EXPECT:** Description: "You can only clock out after at least 15 minutes..."
- [ ] **EXPECT:** Clock-out blocked

**✅ PASS** | **❌ FAIL** | **Notes:** _______________

---

## 🧪 TEST 8: ANTI-DUPLICATE PROTECTION

### Test 8.1: Rapid Click Prevention

**Test Steps:**
- [ ] Click "Clock In" button
- [ ] Immediately click again (within 2 seconds)
- [ ] **EXPECT:** First click processes
- [ ] **EXPECT:** Second click ignored
- [ ] **EXPECT:** Toast: "Clock-in already in progress..."
- [ ] **VERIFY:** Only ONE timesheet in database

**✅ PASS** | **❌ FAIL** | **Notes:** _______________

---

### Test 8.2: Database Double-Check

**Test Steps:**
- [ ] Clock in successfully
- [ ] Refresh page
- [ ] Try to clock in again
- [ ] **EXPECT:** Error: "You have already clocked in for this shift!"
- [ ] **EXPECT:** NO duplicate timesheet created

**✅ PASS** | **❌ FAIL** | **Notes:** _______________

---

## 🧪 TEST 9: LIVE SHIFT MAP

### Test 9.1: Verify Staff Location on Map

**Test Steps:**
- [ ] Login as admin
- [ ] Navigate to Live Shift Map (`/live-shift-map`)
- [ ] **EXPECT:** Map loads with client locations
- [ ] **EXPECT:** Geofence circles visible (100m, 200m)
- [ ] **EXPECT:** Clocked-in staff shown with markers
- [ ] **EXPECT:** Staff location matches spoofed GPS
- [ ] Click on staff marker
- [ ] **EXPECT:** Popup shows staff name, shift details, distance from client

**✅ PASS** | **❌ FAIL** | **Notes:** _______________

---

## 📊 OVERALL TEST RESULTS

**Total Tests:** 14  
**Passed:** _____ / 14  
**Failed:** _____ / 14  
**Pass Rate:** _____ %

**Critical Issues Found:**
1. _______________
2. _______________
3. _______________

**Minor Issues Found:**
1. _______________
2. _______________

**Recommendations:**
- [ ] Proceed to Phase 3 (Improvements)
- [ ] Fix critical issues first
- [ ] Re-test failed scenarios

**Tester Signature:** _______________  
**Date Completed:** _______________

