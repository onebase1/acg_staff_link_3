# MODULE 32: Custom Shift Time Override
## Allow admins to override default shift start/end times

**Status:** PLANNED
**Priority:** P0 - URGENT
**Linear Project:** [Custom Shift Time Override](https://linear.app/autonoma-staff-link/project/custom-shift-time-override-d7134963763c)
**Created:** 2025-12-18

---

## 🎯 Problem Statement

**Current state:**
- Shifts default to 08:00-20:00 (day) or 20:00-08:00 (night)
- `start_time` and `end_time` are `readOnly` in PostShiftV2
- BulkShiftCreation uses hardcoded times from `shiftGenerator.js`
- Notifications read `shift.start_time` to tell staff when to arrive

**Problem:**
- Care homes sometimes request non-standard times (e.g., 14:00-20:00)
- Current system creates shift with 08:00-20:00
- Staff receives notification: "Arrive at 08:00"
- Staff arrives 6 hours early → **Critical UX failure**

**Frequency:** ~2% of shifts need custom times

---

## 💡 Solution: Toggle-Based Override

### Design Pattern

```
┌──────────────────────────────────────────────────────────────────┐
│ Shift Schedule & Role                                            │
├──────────────────────────────────────────────────────────────────┤
│  Shift Template: [Day Shift (08:00-20:00)]  ▾                   │
│                                                                  │
│  ☐ Custom times (care home requested different hours)           │
│     ↓ (when checked, unlocks time fields)                       │
│                                                                  │
│  Start Time: [14:00]  End Time: [20:00]  Duration: [6 hrs]      │
│  ⚠️ Note: Staff notifications will show these custom times      │
└──────────────────────────────────────────────────────────────────┘
```

### Key Principles
1. **98% unchanged** - Default behavior preserved when toggle is off
2. **Explicit intent** - Toggle signals "this is unusual"
3. **Auto-calculate** - Duration computes from times (prevents errors)
4. **Clear warning** - Admin knows notifications use these times

---

## 📋 Linear Tickets

| Ticket | Title | Status | Effort |
|--------|-------|--------|--------|
| AUT-22 | Add Custom Time Override toggle to PostShiftV2 | Backlog | 3h |
| AUT-23 | Add Custom Time Override to BulkShiftCreation | Backlog | 4h |
| AUT-24 | Add inline time editing on Shifts page | Backlog | 2h |
| AUT-25 | Test notification flows with custom times | Backlog | 1h |

**Total Effort:** 10 hours
**Suggested Order:** AUT-22 → AUT-25 → AUT-23 → AUT-24

---

## 📁 Files Affected

### PostShiftV2 (AUT-22)
```
src/pages/PostShiftV2.jsx
- Add state: customTimesEnabled (boolean)
- Add toggle checkbox in form
- Conditionally remove readOnly from time inputs
- Add warning message
- Auto-calculate duration on time change
```

### BulkShiftCreation (AUT-23)
```
src/pages/BulkShiftCreation.jsx
src/utils/bulkShifts/shiftGenerator.js
src/components/bulk-shifts/Step3PreviewTable.jsx
```

### Shifts Page (AUT-24)
```
src/pages/Shifts.jsx
src/components/bulk-shifts/EditShiftModal.jsx
```

### Notifications (AUT-25 - Testing Only)
```
src/components/notifications/NotificationService.jsx
supabase/functions/send-shift-notifications/index.ts
supabase/functions/notification-digest-engine/index.ts
```

---

## 🔙 Rollback Plan

### If Something Breaks:
```bash
# Revert PostShiftV2 changes
git checkout HEAD~1 -- src/pages/PostShiftV2.jsx

# Revert BulkShiftCreation changes
git checkout HEAD~1 -- src/pages/BulkShiftCreation.jsx src/utils/bulkShifts/shiftGenerator.js

# No database changes required - data is always valid
```

### Data Safety:
- No schema changes required
- All existing shifts remain valid
- Rollback only affects UI, not data

---

## ✅ Acceptance Criteria (Overall)

- [ ] Can create single shift with custom times via PostShiftV2
- [ ] Can create bulk shifts with custom times
- [ ] Can edit times on existing shifts from Shifts page
- [ ] All notifications show correct custom times
- [ ] Duration auto-calculates correctly
- [ ] Default behavior unchanged when override is off
- [ ] No hardcoded 08:00/20:00 in notification paths

---

## 🚀 Quick Start for Agent

```
1. Query Linear for first ticket:
   linear("Get issue AUT-22 full details including description")

2. Read the Task section in ticket

3. Execute steps 1-6 in Task

4. Verify Acceptance Criteria

5. Update Linear:
   linear("Update issue AUT-22 state to Done")
   linear("Add comment to AUT-22: 'Completed. Toggle added, duration auto-calculates.'")
```

