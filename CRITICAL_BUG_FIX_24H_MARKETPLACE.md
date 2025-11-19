# CRITICAL BUG FIX: 24-Hour Marketplace Auto-Unassignment

## 🚨 **Bug Discovered:** 2025-11-19

### **Symptoms:**
1. Admin assigns staff to shift in "Assign Only" mode (checkbox CHECKED)
2. Shift status changes to `'assigned'` ✅ (correct)
3. Email 1 sent: "New Shift Assignment - please confirm" ✅ (correct)
4. **Email 2 sent IMMEDIATELY:** "Shift unassigned - moved to marketplace" ❌ **BUG!**
5. Shift status changes back to `'open'` with `marketplace_visible: true` ❌ **BUG!**

### **Expected Behavior:**
- Email 2 should only be sent **24 hours AFTER** assignment (if staff doesn't confirm)
- Shift should remain `'assigned'` until 24-hour deadline passes

---

## 🔍 **Root Cause Analysis**

### **File:** `supabase/functions/shift-status-automation/index.ts`
### **Line:** 404 (before fix)

```typescript
// ❌ BUGGY CODE:
const assignedAt = new Date(shift.staff_confirmation_requested_at || shift.created_date);
const hoursAssigned = (now.getTime() - assignedAt.getTime()) / (1000 * 60 * 60);
```

### **Why This Failed:**

1. **When admin assigns shift in "Assign Only" mode:**
   - `staff_confirmation_requested_at` is **NULL** (not set until staff confirms)
   - Falls back to `shift.created_date`

2. **Problem with `created_date`:**
   - Shift might have been created **days or weeks ago**
   - Example: Shift created on Nov 15, assigned on Nov 19
   - `hoursAssigned = (Nov 19 - Nov 15) = 96 hours` ❌
   - Immediately triggers 24-hour marketplace logic!

3. **Result:**
   - Automation thinks shift has been assigned for 96+ hours
   - Immediately unassigns staff and moves to marketplace
   - Sends "shift unassigned" email within seconds of assignment

---

## ✅ **The Fix**

### **Solution:** Use `shift_journey_log` timestamp instead of `created_date`

```typescript
// ✅ FIXED CODE:
// Find when shift was assigned from journey log (not created_date!)
type JourneyEntry = { state: string; timestamp: string; [key: string]: unknown };
const journeyLog = (shift.shift_journey_log || []) as JourneyEntry[];
const assignedEntry = journeyLog
    .filter((entry) => entry.state === 'assigned')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

if (!assignedEntry) {
    console.log(`⚠️ Shift has status 'assigned' but no journey log entry - skipping`);
    continue;
}

const assignedAt = new Date(assignedEntry.timestamp);
const hoursAssigned = (now.getTime() - assignedAt.getTime()) / (1000 * 60 * 60);
```

### **Why This Works:**

1. **`shift_journey_log` tracks ALL state changes** with timestamps
2. **When admin assigns shift**, a new entry is added:
   ```json
   {
     "state": "assigned",
     "timestamp": "2025-11-19T14:30:00Z",
     "staff_id": "...",
     "method": "admin_assigned",
     "notes": "Staff assigned - awaiting confirmation"
   }
   ```
3. **We find the MOST RECENT `'assigned'` entry** (in case of reassignments)
4. **Calculate hours from THAT timestamp** (not shift creation date)

---

## 📋 **Files Changed**

### 1. `supabase/functions/shift-status-automation/index.ts`
- **Lines 401-418:** Fixed assignment timestamp logic
- **Deployed:** 2025-11-19 via `npx supabase functions deploy shift-status-automation`

### 2. `src/components/shifts/ShiftAssignmentModal.jsx`
- **Lines 240-271:** Added debug logging (can be removed later)
- **Purpose:** Helps diagnose future issues

---

## 🧪 **Testing Steps**

### **Test 1: Assign Only Mode (24-Hour Confirmation)**

1. **Go to `/shift`**
2. **Click "Confirm Staff" on any future shift**
3. **Select a staff member**
4. **KEEP checkbox CHECKED** ("📋 Assign Only - staff must confirm")
5. **Click "Confirm Staff"**

**Expected Results:**
- ✅ Shift status → `'assigned'`
- ✅ Email 1 sent: "New Shift Assignment - please confirm"
- ✅ **NO Email 2** (should wait 24 hours)
- ✅ Shift remains assigned to staff
- ✅ After 12 hours: Reminder email sent
- ✅ After 24 hours: Auto-unassign + marketplace email

### **Test 2: Bypass Mode (Immediate Confirmation)**

1. **Go to `/shift`**
2. **Click "Confirm Staff" on any future shift**
3. **Select a staff member**
4. **UNCHECK the checkbox** (bypass mode - confirm immediately)
5. **Click "Confirm Staff"**

**Expected Results:**
- ✅ Shift status → `'confirmed'`
- ✅ Email sent: "Shift Confirmed"
- ✅ **NO marketplace automation** (shift is confirmed, not assigned)

---

## 🎯 **How Assign/Confirm/Marketplace Work Together**

### **Flow 1: Assign Only (Checkbox CHECKED)**

```
Admin assigns staff
  ↓
Shift status: 'assigned'
  ↓
Email: "Please confirm shift"
  ↓
[12 hours pass]
  ↓
Email: "⏰ Reminder - confirm within 12h"
  ↓
[12 more hours pass = 24h total]
  ↓
Automation runs:
  - Shift status: 'open'
  - assigned_staff_id: NULL
  - marketplace_visible: TRUE
  ↓
Email: "Shift unassigned - moved to marketplace"
```

### **Flow 2: Bypass Mode (Checkbox UNCHECKED)**

```
Admin confirms staff
  ↓
Shift status: 'confirmed'
  ↓
Email: "Shift confirmed"
  ↓
[No automation - shift is confirmed]
```

---

## 🔗 **Related Documentation**

- **Rollback Plan:** `ROLLBACK_UX_CHANGES.md`
- **Shift Time Fix:** `FIX_SHIFT_TIMES_MANUAL.sql`
- **Shift Management:** `SHIFT_MANAGEMENT_COMPREHENSIVE_ANALYSIS.md`

---

## ✅ **Deployment Checklist**

- [x] Bug identified and root cause analyzed
- [x] Fix implemented in `shift-status-automation/index.ts`
- [x] TypeScript types added (no `any` warnings)
- [x] Function deployed to Supabase
- [x] Debug logging added to assignment modal
- [ ] **PENDING:** Test assign-only mode (wait 24h or manually trigger automation)
- [ ] **PENDING:** Remove debug logging after verification

