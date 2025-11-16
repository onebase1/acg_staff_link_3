# Module 2.2: GPS Clock-In/Out Testing Plan

**Status:** 🔄 In Progress  
**Priority:** 🔴 CRITICAL  
**Test Date:** 2025-11-15  
**Tester:** User  
**Test Client:** Dominion Care Center  

---

## 🎯 Testing Objectives

Verify that the GPS clock-in/out functionality works correctly after migration from Base44 SDK to Supabase, including:
- GPS consent management
- Geofence validation
- Clock-in/out workflow
- Location tracking and storage
- Live map visualization
- RLS policy compliance

---

## 📋 Pre-Test Setup Checklist

### 1. Client Configuration (Dominion Care Center)
- [ ] Navigate to `/clients`
- [ ] Locate "Dominion Care Center" client
- [ ] Click "Setup GPS" or "Edit GPS" button
- [ ] Verify GPS setup modal opens without errors (FIXED: Modal now uses Dialog component)
- [ ] Enter coordinates close to tester's location (e.g., your current GPS coordinates)
- [ ] Set geofence radius (default: 100 meters)
- [ ] Save GPS settings
- [ ] Verify success toast appears
- [ ] Verify client card shows GPS badge/indicator

### 2. Staff Member Setup
- [ ] Ensure test staff member exists in system
- [ ] Verify staff has access to Staff Portal
- [ ] Check staff profile has required fields completed
- [ ] Note staff member ID for tracking

### 3. Shift Creation
- [ ] Navigate to `/shifts` or use Natural Language Shift Creator
- [ ] Create shift for Dominion Care Center
  - Date: Today or tomorrow
  - Time: Within next few hours for testing
  - Role: Match staff member's role
  - Duration: 2-4 hours recommended
- [ ] Verify shift created successfully
- [ ] Note shift ID for tracking

---

## 🧪 Test Scenarios

### **Test 1: GPS Consent Management**

**Objective:** Verify staff can grant/revoke GPS consent

**Steps:**
1. Log in as test staff member
2. Navigate to Staff Portal
3. Check if GPS consent prompt appears
4. Grant GPS consent
5. Verify consent is saved (check `staff.gps_consent` = true)
6. Verify consent date is recorded (`staff.gps_consent_date`)
7. Test consent revocation (if feature exists)

**Expected Results:**
- ✅ Consent prompt appears for staff without consent
- ✅ Consent is saved to database
- ✅ Consent date is recorded
- ✅ Staff can proceed to clock-in after granting consent

**RLS Check:**
- Staff can update their own `gps_consent` field
- Staff can read their own consent status

---

### **Test 2: Shift Assignment**

**Objective:** Assign shift to staff member

**Steps:**
1. Navigate to shift details
2. Click "Assign Staff" button
3. Select test staff member
4. Verify assignment successful
5. Check shift status changes to "assigned"
6. Verify staff can see shift in their portal

**Expected Results:**
- ✅ Shift assignment succeeds
- ✅ Shift status = "assigned"
- ✅ Staff sees shift in their portal
- ✅ Shift shows client GPS location is configured

**RLS Check:**
- Admin can assign shifts
- Staff can read their assigned shifts
- Shift assignment updates are allowed

---

### **Test 3: Geofence Validation - Within Range**

**Objective:** Test clock-in from within geofence radius

**Steps:**
1. Travel to location within 100m of Dominion Care Center GPS coordinates
2. Log in as assigned staff member
3. Navigate to Staff Portal
4. Locate assigned shift
5. Click "Clock In" button
6. Grant browser location permission if prompted
7. Wait for GPS capture
8. Observe geofence validation result

**Expected Results:**
- ✅ GPS location captured successfully
- ✅ Geofence validation passes (green indicator)
- ✅ Distance shown is < 100 meters
- ✅ "Clock In" button becomes enabled
- ✅ Success message: "✅ You are within the geofence radius"

**RLS Check:**
- Staff can read client GPS coordinates for validation
- Geofence validator function executes successfully

---

### **Test 4: Geofence Validation - Outside Range**

**Objective:** Test clock-in from outside geofence radius

**Steps:**
1. Stay at location > 100m from Dominion Care Center
2. Attempt to capture GPS location
3. Observe geofence validation result

**Expected Results:**
- ✅ GPS location captured
- ✅ Geofence validation fails (red/warning indicator)
- ✅ Distance shown is > 100 meters
- ✅ "Clock In" button remains disabled
- ✅ Warning message: "⚠️ You are outside the geofence radius"
- ✅ Cannot proceed with clock-in

---

### **Test 5: Clock-In Workflow**

**Objective:** Complete full clock-in process

**Steps:**
1. Be within geofence radius
2. Capture GPS location (validation passes)
3. Click "Clock In" button
4. Verify timesheet creation
5. Check shift status update
6. Verify location data storage

**Expected Results:**
- ✅ Timesheet created with:
  - `clock_in_time` = current timestamp
  - `clock_in_location` = GPS coordinates
  - `geofence_validated` = true
  - `geofence_distance_meters` = actual distance
- ✅ Shift status changes to "in_progress"
- ✅ `shift.shift_started_at` timestamp recorded
- ✅ Success toast: "Clocked in successfully"
- ✅ UI updates to show "Clock Out" option

**RLS Check:**
- Staff can insert timesheet for their own shift
- Staff can update shift status to "in_progress"
- Timesheet data is properly stored

---

### **Test 6: Live Map Tracking**

**Objective:** Verify clocked-in staff appears on live map

**Steps:**
1. After clocking in, open new browser tab/window
2. Log in as admin user
3. Navigate to `/live-shift-map`
4. Locate Dominion Care Center on map
5. Verify staff marker appears at clock-in location
6. Check geofence circle is displayed
7. Verify staff details in popup/tooltip

**Expected Results:**
- ✅ Dominion Care Center appears on map with GPS marker
- ✅ Geofence circle (100m radius) is visible
- ✅ Clocked-in staff marker appears at correct location
- ✅ Staff marker is within geofence circle
- ✅ Marker shows:
  - Staff name
  - Clock-in time
  - Distance from site
  - Geofence validation status (green checkmark)
- ✅ Map updates in real-time or on refresh

**RLS Check:**
- Admin can read all shifts and timesheets
- Admin can read client GPS coordinates
- Admin can read staff clock-in locations

---

### **Test 7: Clock-Out Workflow**

**Objective:** Complete full clock-out process

**Steps:**
1. While clocked in, navigate to Staff Portal
2. Locate active shift
3. Click "Clock Out" button
4. Capture GPS location (optional for clock-out)
5. Verify timesheet update
6. Check hours calculation

**Expected Results:**
- ✅ Timesheet updated with:
  - `clock_out_time` = current timestamp
  - `clock_out_location` = GPS coordinates (if captured)
  - `total_hours` = calculated duration
  - `status` = "pending_approval" or "completed"
- ✅ Shift status changes to "completed"
- ✅ Hours calculated correctly (rounded to 30-min intervals)
- ✅ Success toast: "Clocked out successfully"
- ✅ Shift no longer shows "Clock Out" option

**RLS Check:**
- Staff can update their own timesheet
- Staff can update shift status to "completed"

---

### **Test 8: Edge Cases & Error Handling**

**Objective:** Test error scenarios and edge cases

**Test Cases:**

#### 8.1: GPS Permission Denied
- Deny browser location permission
- Expected: Error message "Location permission denied"
- Staff cannot proceed with clock-in

#### 8.2: GPS Unavailable
- Disable device GPS
- Expected: Error message "Location unavailable"
- Staff cannot proceed with clock-in

#### 8.3: Clock-In Too Early
- Attempt clock-in > 15 minutes before shift start
- Expected: Error message with countdown timer
- Clock-in button disabled

#### 8.4: Clock-In Without GPS Consent
- Revoke GPS consent
- Attempt to clock in
- Expected: GPS consent prompt appears
- Cannot clock-in until consent granted

#### 8.5: Duplicate Clock-In Prevention
- Clock in successfully
- Attempt to clock in again
- Expected: Error message "Already clocked in"
- Prevents duplicate timesheets

#### 8.6: Client Without GPS Setup
- Create shift for client without GPS coordinates
- Expected: Warning message or GPS setup prompt
- Geofence validation skipped (optional)

---

## 🔍 Database Verification Queries

After testing, verify data integrity using Supabase SQL Editor:

### Check Timesheet Data
```sql
SELECT
  id,
  shift_id,
  staff_id,
  clock_in_time,
  clock_out_time,
  clock_in_location,
  geofence_validated,
  geofence_distance_meters,
  total_hours
FROM timesheets
WHERE shift_id = 'YOUR_SHIFT_ID'
ORDER BY created_at DESC;
```

### Check Shift Status
```sql
SELECT
  id,
  client_id,
  assigned_staff_id,
  status,
  shift_started_at,
  date,
  start_time,
  end_time
FROM shifts
WHERE id = 'YOUR_SHIFT_ID';
```

### Check GPS Consent
```sql
SELECT
  id,
  first_name,
  last_name,
  gps_consent,
  gps_consent_date
FROM staff
WHERE id = 'YOUR_STAFF_ID';
```

### Check Client GPS Configuration
```sql
SELECT
  id,
  name,
  location_coordinates,
  geofence_radius_meters,
  geofence_enabled
FROM clients
WHERE name = 'Dominion Care Center';
```

---

## 🚨 Known Issues & RLS Policy Checks

Based on previous migrations, check these RLS policies:

### Timesheets Table
- [ ] Staff can INSERT timesheets for their own shifts
- [ ] Staff can UPDATE their own timesheets
- [ ] Staff can SELECT their own timesheets
- [ ] Admin can SELECT all timesheets
- [ ] Admin can UPDATE all timesheets

### Shifts Table
- [ ] Staff can SELECT their assigned shifts
- [ ] Staff can UPDATE status of their assigned shifts
- [ ] Admin can SELECT all shifts
- [ ] Admin can UPDATE all shifts
- [ ] Admin can INSERT shifts

### Clients Table
- [ ] Staff can SELECT clients (for GPS validation)
- [ ] Staff can read `location_coordinates` field
- [ ] Admin can UPDATE client GPS settings
- [ ] Admin can SELECT all clients

### Staff Table
- [ ] Staff can UPDATE their own `gps_consent` field
- [ ] Staff can SELECT their own record
- [ ] Admin can SELECT all staff
- [ ] Admin can UPDATE all staff

---

## 📊 Success Criteria Summary

- [ ] **GPS Consent:** Staff can grant/revoke consent ✅
- [ ] **Geofence Validation:** Within range = pass, outside = fail ✅
- [ ] **Clock-In:** Creates timesheet with GPS data ✅
- [ ] **Clock-Out:** Updates timesheet with hours calculation ✅
- [ ] **Live Map:** Shows clocked-in staff locations ✅
- [ ] **RLS Policies:** All database operations succeed ✅
- [ ] **Error Handling:** Graceful errors for edge cases ✅
- [ ] **Data Integrity:** All GPS data stored correctly ✅

---

## 🐛 Issue Tracking

### Fixed Issues
1. ✅ **ClientGPSSetup Modal Error** - Fixed by wrapping in Dialog component and adding map initialization delay

### Pending Issues
- [ ] TBD based on testing results

---

## 📝 Test Execution Log

| Test # | Test Name | Status | Notes | Tester | Date |
|--------|-----------|--------|-------|--------|------|
| 1 | GPS Consent | ⏳ | | | |
| 2 | Shift Assignment | ⏳ | | | |
| 3 | Geofence - Within | ⏳ | | | |
| 4 | Geofence - Outside | ⏳ | | | |
| 5 | Clock-In | ⏳ | | | |
| 6 | Live Map | ⏳ | | | |
| 7 | Clock-Out | ⏳ | | | |
| 8 | Edge Cases | ⏳ | | | |

---

## 🔗 Related Components

### Frontend Components
- `src/components/staff/MobileClockIn.jsx` - Main clock-in component
- `src/components/clients/ClientGPSSetup.jsx` - GPS configuration
- `src/pages/LiveShiftMap.jsx` - Live tracking map
- `src/pages/Clients.jsx` - Client management

### Backend Functions
- `supabase/functions/geofence-validator/index.ts` - Geofence validation logic
- `supabase/functions/intelligent-timesheet-validator/index.ts` - Timesheet validation

### Database Tables
- `clients` - GPS coordinates and geofence settings
- `shifts` - Shift data and status
- `timesheets` - Clock-in/out records
- `staff` - GPS consent tracking

---

## 📞 Next Steps

1. **Fix ClientGPSSetup Error** ✅ COMPLETED
2. **Setup Dominion Care Center GPS** - Awaiting user coordinates
3. **Create Test Shift** - After GPS setup
4. **Execute Test Scenarios** - Follow checklist above
5. **Document Results** - Update test execution log
6. **Fix Any RLS Issues** - Based on test results
7. **Verify Live Map** - Confirm real-time tracking works

---

**Last Updated:** 2025-11-15
**Document Version:** 1.0

