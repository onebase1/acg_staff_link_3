# 🏥 GPS WORKFLOW - INDUSTRY STANDARD (NHS-Compatible)

**Date:** 2025-11-16  
**Status:** ✅ **IMPLEMENTED** - Ready for UAT Testing  
**Purpose:** Replace paper timesheets with GPS-verified digital timesheets

---

## 🎯 **GOAL: DITCH PAPER TIMESHEETS**

Both agencies and care homes can trust this system because:
- ✅ GPS verification proves staff presence on-site
- ✅ Geofence validation (100m radius)
- ✅ Comprehensive evidence trail for disputes
- ✅ Auto-approval for perfect shifts (zero admin work)
- ✅ Manual review for edge cases (overtime, late arrivals, etc.)
- ✅ Fallback for phone issues (battery dies, forgot to clock in/out)

---

## 📱 **STANDARD WORKFLOW (Happy Path)**

### **Step 1: Staff Grants GPS Consent**
- Staff opens profile → "GPS Consent" toggle
- System records consent date
- Staff can now clock in to GPS-enabled shifts

### **Step 2: Admin Assigns Shift**
- Admin assigns shift to GPS-enabled client
- Admin ticks "Auto-confirm" checkbox
- Shift status: `confirmed`
- Timesheet auto-created (with `booking_id`)

### **Step 3: Staff Arrives On-Site**
- Staff opens StaffPortal → "My Shifts"
- Staff clicks "Clock In" button
- App captures:
  - GPS location (latitude, longitude)
  - Timestamp (e.g., `2025-11-16 08:07:23`)
  - Device info (browser, OS)
  - IP address (optional)
- App validates geofence (within 100m of client location)
- Clock-in recorded

### **Step 4: Staff Completes Shift**
- Staff clicks "Clock Out" button
- App captures:
  - GPS location
  - Timestamp (e.g., `2025-11-16 19:52:14`)
  - Device info
- System automatically:
  - Rounds clock-in to 30-min: `08:00`
  - Rounds clock-out to 30-min: `20:00`
  - Sets `actual_start_time = 08:00`
  - Sets `actual_end_time = 20:00`
  - Calculates `total_hours = 12.0`
  - **Applies 12-hour cap** (if worked >12 hours)
  - Flags overtime for admin review
  - Calculates pay/charge amounts
  - Sets timesheet status = `submitted`

### **Step 5: Auto-Approval Engine**
- Validates:
  - ✅ GPS verified (geofence passed)
  - ✅ Signatures present (if required)
  - ✅ Hours within tolerance (±15 minutes)
  - ✅ No disputes
- Decision: **AUTO-APPROVE**
- Sets timesheet status = `approved`

### **Step 6: GPS Auto-Completion**
- Checks: GPS validated + agency setting enabled
- Sets shift status = `completed`
- Adds journey log entry
- **Shift ready for invoicing - ZERO MANUAL WORK!** ✅

---

## ⏱️ **12-HOUR CAP (Implemented)**

**Scenario:** Staff works 12.5 hours (e.g., 08:00 - 20:30)

**What happens:**
1. GPS clock-in: `08:07:23` → Rounded: `08:00`
2. GPS clock-out: `20:32:14` → Rounded: `20:30`
3. Raw total hours: `12.5`
4. Scheduled hours: `12.0`
5. **System caps at 12.0 hours**
6. Overtime detected: `0.5 hours`
7. Flags for admin review:
   - `overtime_flag = true`
   - `overtime_hours = 0.5`
   - `raw_total_hours = 12.5` (stored for reference)
8. Admin reviews and decides:
   - Approve 12.0 hours (cap applied)
   - OR approve 12.5 hours (pay overtime)

**Staff notification:**
```
⚠️ Overtime detected: 0.5 hours over scheduled shift. 
Flagged for admin review.
```

---

## 🔋 **FALLBACK SCENARIOS**

### **Scenario A: Phone Dies During Shift**

**What happens:**
1. Staff phone dies mid-shift
2. Staff cannot clock out via app
3. Timesheet has clock-in but no clock-out
4. System flags as `incomplete_flag = true` after shift end + 2 hours
5. Admin sees "Incomplete Timesheet" alert
6. Admin manually enters clock-out time:
   - Uses scheduled shift end time (default)
   - OR calls client to verify actual end time
   - OR uses paper timesheet (if available)
7. Admin adds note: "Phone died - clock-out verified by client"
8. Admin approves timesheet

**Evidence stored:**
- ✅ Clock-in GPS (captured before phone died)
- ✅ Admin note explaining manual entry
- ✅ Client confirmation (phone call/email)

---

### **Scenario B: Staff Forgets to Clock In/Out**

**What happens:**
1. Staff forgets to clock in (arrives but doesn't open app)
2. Staff works shift
3. Staff realizes at end of shift
4. Staff reports to admin
5. Admin creates manual timesheet entry:
   - Uses scheduled start/end times
   - Marks as "Manual Entry - No GPS"
   - Requires client signature
   - Flags for extra scrutiny
6. Admin approves after verification

**Evidence stored:**
- ⚠️ No GPS data
- ✅ Client signature (required)
- ✅ Admin note explaining manual entry

---

### **Scenario C: Care Home Requires Phones Off**

**RECOMMENDED SOLUTION:**

**Option 1: Clock In/Out at Entrance** ✅
1. Staff arrives at care home entrance
2. Staff clocks in via app (GPS verified)
3. Staff turns phone off (as per care home policy)
4. Staff works shift (phone off)
5. Staff finishes shift
6. Staff turns phone on at entrance
7. Staff clocks out via app (GPS verified)
8. Timesheet complete - fully automated!

**Why this works:**
- ✅ GPS verified at entrance (within 100m geofence)
- ✅ Complies with care home phone policy
- ✅ No manual admin work needed
- ✅ Full evidence trail for disputes

**Option 2: Paper Timesheet Backup** (if Option 1 not possible)
1. Staff cannot use phone (policy)
2. Staff fills paper timesheet
3. Client signs paper timesheet
4. Staff uploads photo of signed timesheet after shift
5. Admin reviews and approves

---

## 📸 **DISPUTE EVIDENCE TRAIL**

**What evidence is captured:**

| Evidence Type | When | Stored Where | Purpose |
|---------------|------|--------------|---------|
| GPS Coordinates | Clock-in/out | `timesheets.clock_in_location` | Prove on-site |
| Geofence Distance | Clock-in/out | `timesheets.geofence_distance_meters` | Prove within 100m |
| Timestamp | Clock-in/out | `timesheets.clock_in_time` | Prove exact time |
| Device Info | Clock-in/out | `timesheets.device_info` | Verify device used |
| IP Address | Clock-in/out | `timesheets.ip_address` | Additional verification |
| Total Hours | Clock-out | `timesheets.total_hours` | Prove hours worked |
| Overtime Flag | Clock-out | `timesheets.overtime_flag` | Flag for review |
| Client Signature | End of shift | `timesheets.client_signature` | Client confirms |
| Staff Signature | End of shift | `timesheets.staff_signature` | Staff confirms |

**Dispute Examples:**

**Dispute 1: Client claims staff arrived late**
- Show GPS clock-in: `08:05:23`
- Show geofence: `45m from client`
- Show actual start: `08:00` (rounded)

**Dispute 2: Client claims staff left early**
- Show GPS clock-out: `19:55:14`
- Show geofence: `32m from client`
- Show actual end: `20:00` (rounded)

**Dispute 3: Staff claims overtime not paid**
- Show `raw_total_hours = 12.5`
- Show `overtime_hours = 0.5`
- Show admin decision (approved/rejected)

---

## ✅ **IMPLEMENTATION STATUS**

| Feature | Status | Notes |
|---------|--------|-------|
| Manual Clock-In/Out | ✅ Implemented | Industry standard |
| GPS Geofence (100m) | ✅ Implemented | Validated at clock-in/out |
| 30-Min Time Rounding | ✅ Implemented | Industry standard |
| 12-Hour Cap | ✅ Implemented | Flags overtime for review |
| Auto-Populate Actual Times | ✅ Implemented | From GPS timestamps |
| Auto-Approval Engine | ✅ Implemented | GPS + signatures + hours |
| GPS Auto-Completion | ✅ Implemented | Shift auto-completed |
| Overtime Tracking | ✅ Implemented | Flags for admin review |
| Incomplete Timesheet Detection | ✅ Implemented | Phone died/forgot |
| Device Info Capture | ✅ Implemented | For dispute evidence |
| Paper Timesheet Upload | ✅ Implemented | Fallback option |
| Photo/Selfie Capture | ⏳ Post-MVP | Visual proof |

---

## 🚀 **NEXT STEPS**

1. **UAT Testing** - Test complete flow with real shifts
2. **Monitor Overtime Flags** - See how often staff work overtime
3. **Adjust Cap if Needed** - Based on UAT feedback
4. **Add Photo Capture** - Post-MVP for extra verification

**All systems ready for paper-free timesheets!** 🎉

