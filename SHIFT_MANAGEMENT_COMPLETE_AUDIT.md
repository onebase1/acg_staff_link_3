# Shift Management - Complete Audit & Field Permissions
**Date:** 2025-11-16  
**Purpose:** Verify all columns are wired, define immutable vs editable fields, document actual times workflow

---

## ✅ VERIFIED: SCHEDULED TIMES AUTO-POPULATION

### **How It Works:**
1. **Client Contract Defines Shift Windows**
   - `shift_window_type`: '7_to_7' or '8_to_8' (stored in clients table)
   - Day shift: 07:00-19:00 (7-7) or 08:00-20:00 (8-8)
   - Night shift: 19:00-07:00 (7-7) or 20:00-08:00 (8-8)

2. **BulkShiftCreation Auto-Populates Times**
   - **File:** `src/components/bulk-shifts/Step1ClientSetup.jsx` (lines 42-68)
   - **Logic:**
     ```javascript
     const dayTimes = getShiftTimes(client, 'day');
     const nightTimes = getShiftTimes(client, 'night');
     // Returns: { start: '08:00', end: '20:00', hours: 12 }
     ```
   - **Result:** User NEVER manually enters scheduled times

3. **PostShiftV2 Auto-Populates Times**
   - **File:** `src/pages/PostShiftV2.jsx` (lines 175-195)
   - **Logic:** Same as BulkShiftCreation - uses `getShiftTimes(client, 'day')`
   - **Result:** Scheduled times always match client contract

4. **Helper Function**
   - **File:** `src/utils/clientHelpers.js` (lines 47-61)
   - **Function:** `getShiftTimes(client, shiftType)`
   - **Returns:** `{ start: 'HH:MM', end: 'HH:MM', hours: number }`

### **✅ CONFIRMED:**
- ✅ Scheduled times (`start_time`, `end_time`) are ALWAYS auto-populated from client contract
- ✅ Users NEVER manually enter scheduled times during shift creation
- ✅ Scheduled times are based on `shift_window_type` (7-7 or 8-8)
- ✅ Shift creation flow: Client Selection → Auto-load times → Create shift

---

## ✅ VERIFIED: ACTUAL TIMES WORKFLOW (GPS/OCR/Manual)

### **Method 1: GPS Auto-Complete** ⭐ FULLY AUTOMATED
**Files:**
- `src/components/staff/MobileClockIn.jsx` (lines 400-420, 520-560)
- `supabase/functions/intelligent-timesheet-validator/index.ts` (lines 234-260)

**Workflow:**
1. **Staff Clocks In** → GPS location captured
2. **Staff Clocks Out** → GPS location captured
3. **Auto-Populate Actual Times:**
   - `clock_in_time` → rounded to 30-min intervals → `actual_start_time`
   - `clock_out_time` → rounded to 30-min intervals → `actual_end_time`
   - Example: 08:12 → 08:00, 19:47 → 20:00
4. **GPS Validation:**
   - Geofence check (within 100m of client location)
   - If validated → auto-approve timesheet
5. **Auto-Complete Shift:**
   - If GPS validated AND auto-approve enabled
   - Status: `awaiting_admin_closure` → `completed`
   - Populates: `shift_started_at`, `shift_ended_at`
   - **ZERO admin work!**

**Code:**
```javascript
// MobileClockIn.jsx lines 529-543
const roundToHalfHour = (isoTimestamp) => {
  const date = new Date(isoTimestamp);
  const minutes = date.getMinutes();
  const roundedMinutes = minutes < 15 ? 0 : minutes < 45 ? 30 : 0;
  const roundedHours = minutes >= 45 ? hours + 1 : hours;
  return `${String(roundedHours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
};

const actualStartTime = roundToHalfHour(existingTimesheet.clock_in_time);
const actualEndTime = roundToHalfHour(clockOutTime);
```

**✅ CONFIRMED:**
- ✅ GPS auto-populates `shift_started_at` and `shift_ended_at`
- ✅ Times rounded to 30-minute intervals (industry standard)
- ✅ Auto-completes shift if GPS validated (no admin review needed)

---

### **Method 2: OCR Timesheet Parsing** ⭐ SEMI-AUTOMATED
**Files:**
- `supabase/functions/extract-timesheet-data/index.ts` (lines 145-336)
- `src/pages/TimesheetDetail.jsx` (lines 222-232, 690-711)

**Workflow:**
1. **Staff Uploads Timesheet Photo/PDF**
2. **AI OCR Extracts Data:**
   - Start time, end time, total hours
   - Staff name, client name, date
   - Signatures (staff + client)
3. **Confidence Scoring:**
   - **≥80%**: High confidence → Auto-approve
   - **60-79%**: Medium confidence → Manual review
   - **<60%**: Low confidence → Manual review required
4. **Auto-Approval Logic:**
   - If confidence ≥80% AND GPS validated
   - Populates `shift_started_at`, `shift_ended_at`
   - Status: `awaiting_admin_closure` (requires admin final check)

**Code:**
```javascript
// TimesheetDetail.jsx lines 226-232
if (ocrResult.data.confidence_score >= 80) {
  toast.success(`✅ High confidence extraction (${ocrResult.data.confidence_score}%)`);
} else if (ocrResult.data.confidence_score >= 60) {
  toast.warning(`⚠️ Medium confidence - Please review`);
} else {
  toast.error(`❌ Low confidence - Manual review required`);
}
```

**✅ CONFIRMED:**
- ✅ OCR extracts actual times from uploaded timesheets
- ✅ Confidence threshold: 80% for auto-approval (NOT 95% as user mentioned)
- ✅ Lower confidence requires manual admin review
- ✅ Populates `shift_started_at` and `shift_ended_at` if approved

**⚠️ NOTE:** User mentioned 95% confidence threshold, but code shows 80%. Should we increase to 95%?

---

### **Method 3: Manual Admin Entry** ⭐ ALWAYS AVAILABLE
**File:** `src/components/shifts/ShiftCompletionModal.jsx` (lines 39-90)

**Workflow:**
1. **Admin Opens Shift Completion Modal**
2. **Modal Auto-Populates:**
   - `actual_start_time` = `shift.start_time` (scheduled time as default)
   - `actual_end_time` = `shift.end_time` (scheduled time as default)
3. **Admin Can Override:**
   - Edit actual start time (e.g., staff arrived late)
   - Edit actual end time (e.g., staff left early)
   - Add notes explaining adjustments
4. **Validation:**
   - If adjustment >15 minutes → notes required
   - Calculates actual hours worked
   - Shows staff cost and client charge
5. **Completion:**
   - Populates `shift_started_at`, `shift_ended_at`
   - Status: `awaiting_admin_closure` → `completed`

**Code:**
```javascript
// ShiftCompletionModal.jsx lines 39-43
const [actualTimes, setActualTimes] = useState({
  actual_start_time: shift?.start_time || '',  // Default to scheduled
  actual_end_time: shift?.end_time || '',      // Default to scheduled
  notes: ''
});
```

**✅ CONFIRMED:**
- ✅ Admin can manually enter actual times via ShiftCompletionModal
- ✅ Defaults to scheduled times (admin can override)
- ✅ Requires notes if adjustment >15 minutes
- ✅ Calculates actual hours and financial impact

---

## 📊 COMPLETE ACTUAL TIMES WORKFLOW SUMMARY

| Method | Automation Level | Populates | Admin Work | Status After |
|--------|------------------|-----------|------------|--------------|
| **GPS Auto-Complete** | 100% Automated | `shift_started_at`, `shift_ended_at` | ZERO | `completed` |
| **OCR High Confidence (≥80%)** | Semi-Automated | `shift_started_at`, `shift_ended_at` | Final check | `awaiting_admin_closure` |
| **OCR Low Confidence (<80%)** | Manual Review | Admin enters | Full review | `awaiting_admin_closure` |
| **Manual Admin Entry** | Manual | Admin enters | Full entry | `completed` |

**Priority Order:**
1. GPS auto-complete (if available) → Instant completion
2. OCR extraction (if timesheet uploaded) → Semi-automated
3. Manual admin entry (fallback) → Always available

---


