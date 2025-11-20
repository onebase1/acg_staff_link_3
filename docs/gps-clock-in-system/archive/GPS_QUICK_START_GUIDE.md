# ⚡ GPS GEOFENCING QUICK START GUIDE

**Want to test your GPS system in 15 minutes?** Follow this guide.

---

## 🚀 FASTEST PATH TO TESTING (15 Minutes)

### Step 1: Seed Test Data (3 minutes)

1. Open Supabase Dashboard → SQL Editor
2. Copy-paste entire contents of `supabase/seed_gps_test_data.sql`
3. Click "Run"
4. ✅ Verify: You should see "Success" message

---

### Step 2: Create Test Users (5 minutes)

**Option A: Supabase Dashboard (Recommended)**
1. Go to Authentication → Users → Add User
2. Create user:
   - Email: `alice.gps@test.com`
   - Password: `TestGPS123!`
   - Auto Confirm: ✅ Yes
3. Repeat for:
   - Email: `bob.noconsent@test.com`
   - Password: `TestGPS123!`

**Option B: SQL (Faster if you know how)**
```sql
-- After creating users in dashboard, link them to staff:
UPDATE staff 
SET user_id = (SELECT id FROM auth.users WHERE email = 'alice.gps@test.com')
WHERE id = 'test-staff-gps-consent-001';

UPDATE staff 
SET user_id = (SELECT id FROM auth.users WHERE email = 'bob.noconsent@test.com')
WHERE id = 'test-staff-no-consent-001';
```

---

### Step 3: Assign Test Shift (2 minutes)

1. Login to **Admin Portal** (your normal admin account)
2. Navigate to Shifts → Today's Shifts
3. Find "Durham Care Home" shift (created by seed script)
4. Assign to: **Alice GPS-Tester**
5. ✅ Verify: Shift shows as "Assigned"

---

### Step 4: Test GPS Clock-In (5 minutes)

**4.1: Open Chrome DevTools**
1. Open Chrome browser (required for GPS spoofing)
2. Press F12 to open DevTools
3. Click "..." (three dots) → More Tools → Sensors
4. In Sensors tab, find "Location" section

**4.2: Set GPS Location WITHIN Geofence**
```
Location: Custom
Latitude: 54.7755
Longitude: -1.5850
```
(This is ≈22m from Durham Care Home - should PASS)

**4.3: Login as Test Staff**
1. Open new tab → Your Staff Portal URL
2. Login:
   - Email: `alice.gps@test.com`
   - Password: `TestGPS123!`

**4.4: Clock In**
1. You should see "Durham Care Home" shift
2. Click "Clock In" button
3. ✅ **EXPECT:** Success message: "✅ Verified: 22m from Durham Care Home"
4. ✅ **EXPECT:** Button changes to "Clock Out"

**4.5: Test OUTSIDE Geofence**
1. In DevTools Sensors, change location:
   ```
   Latitude: 54.7800
   Longitude: -1.5900
   ```
   (This is ≈550m away - should FAIL)
2. Refresh page
3. Try to clock in again
4. ✅ **EXPECT:** Error: "❌ Too far: 550m from Durham Care Home (limit: 100m)"

---

## ✅ SUCCESS CHECKLIST

If you completed the above and saw the expected results:

- [x] Test data seeded successfully
- [x] Test users created and linked
- [x] Shift assigned to test staff
- [x] Clock-in WITHIN geofence succeeded
- [x] Clock-in OUTSIDE geofence failed
- [x] GPS validation working correctly

**🎉 Congratulations! Your GPS geofencing system is working perfectly.**

---

## 🔍 WHAT TO DO NEXT?

### Option 1: Run Full Test Suite
If quick test passed, run comprehensive tests:
```bash
1. Open GPS_MANUAL_TESTING_CHECKLIST.md
2. Complete all 14 test scenarios
3. Verify 100% pass rate
```

### Option 2: Implement Improvements
If you want to enhance the system:
```bash
1. Open GPS_IMPROVEMENTS_IMPLEMENTATION.md
2. Follow implementation guide
3. Add 5 production-ready improvements
```

### Option 3: Deploy Monitoring
If you want production analytics:
```bash
1. Add GPSAccuracyMonitoring.jsx to your routes
2. Navigate to /gps-monitoring
3. Review GPS accuracy metrics
```

---

## 🐛 TROUBLESHOOTING

### Issue: "Clock-in failed: Client data not loaded"
**Solution:** Refresh page, ensure shift is assigned to staff

### Issue: GPS location not captured
**Solution:** 
1. Check browser permissions (allow location access)
2. Verify Chrome DevTools → Sensors → Location is set
3. Try "Override geolocation" toggle

### Issue: "You have already clocked in"
**Solution:** Delete existing timesheet:
```sql
DELETE FROM timesheets 
WHERE staff_id = 'test-staff-gps-consent-001' 
AND shift_date = CURRENT_DATE;
```

### Issue: User not linked to staff record
**Solution:** Run the UPDATE query from Step 2 Option B

### Issue: Shift not visible in Staff Portal
**Solution:** 
1. Verify shift date is TODAY
2. Verify shift is assigned to test staff
3. Check RLS policies allow staff to see shifts

---

## 🧹 CLEANUP (After Testing)

When you're done testing, remove test data:

```sql
-- Delete test timesheets
DELETE FROM timesheets WHERE staff_id LIKE 'test-staff-%';

-- Delete test bookings
DELETE FROM bookings WHERE staff_id LIKE 'test-staff-%';

-- Delete test shifts
DELETE FROM shifts WHERE agency_id = 'test-agency-gps-001';

-- Delete test staff
DELETE FROM staff WHERE agency_id = 'test-agency-gps-001';

-- Delete test clients
DELETE FROM clients WHERE agency_id = 'test-agency-gps-001';

-- Delete test agency
DELETE FROM agencies WHERE id = 'test-agency-gps-001';

-- Delete test users (optional - do this in Supabase Dashboard → Authentication → Users)
```

---

## 📚 FULL DOCUMENTATION

For comprehensive testing and improvements, see:

1. **GPS_COMPREHENSIVE_TEST_PLAN.md** - Detailed test scenarios
2. **GPS_MANUAL_TESTING_CHECKLIST.md** - Browser-based testing
3. **GPS_IMPROVEMENTS_IMPLEMENTATION.md** - 5 production improvements
4. **GPS_COMPLETE_TESTING_AND_IMPROVEMENT_PACKAGE.md** - Full execution plan

---

## 💡 PRO TIPS

**Tip 1: GPS Spoofing Shortcuts**
Save common locations in Chrome DevTools:
- Durham Care Home: 54.7753, -1.5849
- Newcastle Hospital: 54.9738, -1.6131
- Far away (test failure): 54.7800, -1.5900

**Tip 2: Quick Database Checks**
```sql
-- Check if clock-in succeeded
SELECT * FROM timesheets 
WHERE staff_id = 'test-staff-gps-consent-001' 
ORDER BY created_date DESC LIMIT 1;

-- Check geofence validation
SELECT 
  geofence_validated,
  geofence_distance_meters,
  clock_in_location
FROM timesheets 
WHERE staff_id = 'test-staff-gps-consent-001';
```

**Tip 3: Reset Test Shift**
```sql
-- Reset shift to 'open' status for re-testing
UPDATE shifts 
SET status = 'open', shift_started_at = NULL 
WHERE id = 'test-shift-durham-day-001';
```

---

**Questions?** Check the troubleshooting section or review the full documentation.

**Ready to test?** Start with Step 1 above! ⬆️

