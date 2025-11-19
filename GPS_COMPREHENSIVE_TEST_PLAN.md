# 🧪 GPS GEOFENCING COMPREHENSIVE TEST PLAN

**Date:** 2025-11-18  
**Status:** Ready to Execute  
**Purpose:** Validate GPS geofencing system end-to-end with automated test data

---

## 📋 PRE-TEST SETUP

### Step 1: Seed Test Data
```bash
# Run the seeding script in Supabase SQL Editor
# File: supabase/seed_gps_test_data.sql
```

**What it creates:**
- ✅ 1 Test Agency (GPS Test Agency)
- ✅ 4 Test Clients (various GPS configurations)
- ✅ 2 Test Staff (with/without GPS consent)
- ✅ 2 Test Shifts (today's date)

### Step 2: Create Test User Accounts

**Option A: Via Supabase Dashboard**
1. Go to Authentication → Users
2. Create user: `alice.gps@test.com` (password: `TestGPS123!`)
3. Create user: `bob.noconsent@test.com` (password: `TestGPS123!`)

**Option B: Via SQL**
```sql
-- Link test users to staff records
-- (Run after creating auth users in dashboard)

UPDATE staff 
SET user_id = (SELECT id FROM auth.users WHERE email = 'alice.gps@test.com')
WHERE id = 'test-staff-gps-consent-001';

UPDATE staff 
SET user_id = (SELECT id FROM auth.users WHERE email = 'bob.noconsent@test.com')
WHERE id = 'test-staff-no-consent-001';
```

---

## 🧪 TEST SUITE 1: GPS CONSENT FLOW

### Test 1.1: Staff WITHOUT GPS Consent
**User:** bob.noconsent@test.com  
**Expected Behavior:**
1. Login to Staff Portal
2. See GPS consent prompt with explanation
3. Click "Grant GPS Consent"
4. Database updates: `gps_consent = true`, `gps_consent_date = NOW()`
5. Consent prompt disappears
6. Can now proceed to clock in

**Verification Query:**
```sql
SELECT gps_consent, gps_consent_date 
FROM staff 
WHERE email = 'bob.noconsent@test.com';
```

**✅ Pass Criteria:** `gps_consent = true` after granting

---

### Test 1.2: Staff WITH GPS Consent
**User:** alice.gps@test.com  
**Expected Behavior:**
1. Login to Staff Portal
2. NO consent prompt shown
3. Can immediately proceed to clock in

**✅ Pass Criteria:** No consent prompt displayed

---

## 🧪 TEST SUITE 2: GEOFENCE VALIDATION

### Test 2.1: Clock-In WITHIN Geofence (100m)

**Setup:**
- Client: Durham Care Home
- GPS Coordinates: 54.7753, -1.5849
- Geofence Radius: 100m
- Test Location: 54.7755, -1.5850 (≈22m away)

**How to Test:**
1. Use browser dev tools to spoof GPS:
   ```javascript
   // Chrome DevTools → Sensors → Location
   // Latitude: 54.7755
   // Longitude: -1.5850
   ```
2. Login as alice.gps@test.com
3. Navigate to Staff Portal
4. Assign shift to Alice (admin action)
5. Click "Clock In" button
6. Observe geofence validation

**Expected Results:**
- ✅ GPS location captured: `{latitude: 54.7755, longitude: -1.5850}`
- ✅ Distance calculated: ≈22m
- ✅ Geofence validation: PASS
- ✅ Success message: "✅ Verified: 22m from Durham Care Home"
- ✅ Timesheet created with `geofence_validated = true`
- ✅ Shift status → `in_progress`

**Verification Query:**
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

**✅ Pass Criteria:** 
- `geofence_validated = true`
- `geofence_distance_meters ≤ 100`

---

### Test 2.2: Clock-In OUTSIDE Geofence (100m)

**Setup:**
- Client: Durham Care Home
- GPS Coordinates: 54.7753, -1.5849
- Geofence Radius: 100m
- Test Location: 54.7800, -1.5900 (≈550m away)

**How to Test:**
1. Spoof GPS to distant location:
   ```javascript
   // Latitude: 54.7800
   // Longitude: -1.5900
   ```
2. Click "Clock In" button

**Expected Results:**
- ✅ GPS location captured: `{latitude: 54.7800, longitude: -1.5900}`
- ✅ Distance calculated: ≈550m
- ✅ Geofence validation: FAIL
- ✅ Error message: "❌ Too far: 550m from Durham Care Home (limit: 100m)"
- ✅ Clock-in button remains DISABLED
- ✅ NO timesheet created

**✅ Pass Criteria:** Clock-in blocked, error message shown

---

### Test 2.3: Larger Geofence (200m)

**Setup:**
- Client: Newcastle Hospital Care
- GPS Coordinates: 54.9738, -1.6131
- Geofence Radius: 200m
- Test Location: 54.9750, -1.6140 (≈150m away)

**Expected Results:**
- ✅ Distance: ≈150m
- ✅ Validation: PASS (within 200m)
- ✅ Clock-in succeeds

**✅ Pass Criteria:** Clock-in allowed for 150m distance

---

### Test 2.4: Client with NO GPS Configured

**Setup:**
- Client: Legacy Care Home (No GPS)
- GPS Coordinates: NULL
- Geofence Enabled: false

**Expected Results:**
- ✅ Geofence validation: AUTO-PASS
- ✅ Message: "Client GPS coordinates not configured - validation skipped"
- ✅ Warning: "Please set client coordinates in Client settings"
- ✅ Clock-in succeeds
- ✅ Timesheet: `geofence_validated = true`, `geofence_violation_reason = 'Client location not configured'`

**✅ Pass Criteria:** Clock-in allowed despite no GPS

---

### Test 2.5: Client with GPS Disabled

**Setup:**
- Client: GPS Disabled Care Home
- GPS Coordinates: Set but `geofence_enabled = false`

**Expected Results:**
- ✅ Geofence validation: AUTO-PASS
- ✅ Message: "Geofencing is disabled for this client"
- ✅ Clock-in succeeds

**✅ Pass Criteria:** Clock-in allowed when geofencing disabled

---

## 🧪 TEST SUITE 3: CLOCK-OUT WORKFLOW

### Test 3.1: Normal Clock-Out

**Prerequisites:** Already clocked in (Test 2.1 completed)

**How to Test:**
1. Wait 15+ minutes (or modify timesheet `clock_in_time` in DB)
2. Click "Clock Out" button
3. Confirm dialog

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ GPS location captured at clock-out
- ✅ Total hours calculated correctly
- ✅ Timesheet updated: `clock_out_time`, `clock_out_location`, `total_hours`
- ✅ Shift status → `completed`
- ✅ Auto-validation triggered

**Verification Query:**
```sql
SELECT 
  clock_in_time,
  clock_out_time,
  total_hours,
  status
FROM timesheets
WHERE staff_id = 'test-staff-gps-consent-001'
  AND shift_date = CURRENT_DATE
ORDER BY created_date DESC
LIMIT 1;
```

**✅ Pass Criteria:** All fields populated, hours calculated

---

### Test 3.2: Clock-Out Too Soon (< 15 mins)

**How to Test:**
1. Clock in
2. Immediately try to clock out (< 15 mins)

**Expected Results:**
- ✅ Error message: "Minimum shift duration not met"
- ✅ Description: "You can only clock out after at least 15 minutes..."
- ✅ Clock-out blocked

**✅ Pass Criteria:** Clock-out prevented

---

## 🧪 TEST SUITE 4: ANTI-DUPLICATE PROTECTION

### Test 4.1: Rapid Click Prevention

**How to Test:**
1. Click "Clock In" button
2. Immediately click again (within 2 seconds)

**Expected Results:**
- ✅ First click: Processing starts
- ✅ Second click: Ignored (debounced)
- ✅ Toast: "Clock-in already in progress..."
- ✅ Only ONE timesheet created

**✅ Pass Criteria:** Single timesheet in database

---

### Test 4.2: Database Double-Check

**How to Test:**
1. Clock in successfully
2. Manually try to clock in again (refresh page, click button)

**Expected Results:**
- ✅ Database check runs
- ✅ Finds existing timesheet
- ✅ Error: "You have already clocked in for this shift!"
- ✅ NO duplicate timesheet created

**Verification Query:**
```sql
SELECT COUNT(*) as timesheet_count
FROM timesheets
WHERE staff_id = 'test-staff-gps-consent-001'
  AND shift_date = CURRENT_DATE;
```

**✅ Pass Criteria:** `timesheet_count = 1`

---

## 🧪 TEST SUITE 5: RLS POLICY VALIDATION

### Test 5.1: Staff Can Update GPS Consent
```sql
-- Run as staff user (alice.gps@test.com)
UPDATE staff 
SET gps_consent = false
WHERE id = 'test-staff-gps-consent-001';
```
**✅ Pass Criteria:** Update succeeds

---

### Test 5.2: Staff Can Read Client GPS
```sql
-- Run as staff user
SELECT location_coordinates, geofence_radius_meters
FROM clients
WHERE id = 'test-client-durham-001';
```
**✅ Pass Criteria:** Query returns data

---

### Test 5.3: Staff Can Insert Timesheet
```sql
-- Run as staff user
INSERT INTO timesheets (
  agency_id, staff_id, client_id, shift_date, clock_in_time, status
) VALUES (
  'test-agency-gps-001',
  'test-staff-gps-consent-001',
  'test-client-durham-001',
  CURRENT_DATE,
  NOW(),
  'draft'
);
```
**✅ Pass Criteria:** Insert succeeds

---

## 📊 TEST RESULTS TRACKING

| Test ID | Test Name | Status | Notes | Date |
|---------|-----------|--------|-------|------|
| 1.1 | GPS Consent - No Consent | ⏳ | | |
| 1.2 | GPS Consent - Has Consent | ⏳ | | |
| 2.1 | Geofence - Within 100m | ⏳ | | |
| 2.2 | Geofence - Outside 100m | ⏳ | | |
| 2.3 | Geofence - Within 200m | ⏳ | | |
| 2.4 | Geofence - No GPS Config | ⏳ | | |
| 2.5 | Geofence - GPS Disabled | ⏳ | | |
| 3.1 | Clock-Out - Normal | ⏳ | | |
| 3.2 | Clock-Out - Too Soon | ⏳ | | |
| 4.1 | Anti-Duplicate - Rapid Click | ⏳ | | |
| 4.2 | Anti-Duplicate - DB Check | ⏳ | | |
| 5.1 | RLS - Update Consent | ⏳ | | |
| 5.2 | RLS - Read Client GPS | ⏳ | | |
| 5.3 | RLS - Insert Timesheet | ⏳ | | |

---

## 🔧 TROUBLESHOOTING

### Issue: GPS Spoofing Not Working
**Solution:** Use Chrome DevTools → Sensors → Location (not Firefox)

### Issue: RLS Policy Blocks Operation
**Solution:** Check user is linked to staff record via `user_id`

### Issue: Shift Not Visible in Staff Portal
**Solution:** Ensure shift is assigned to staff member first

---

**Next:** After all tests pass, proceed to Phase 3 (Improvements)

