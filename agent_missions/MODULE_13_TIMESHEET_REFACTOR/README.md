# MODULE 13: Timesheet Upload Refactor

**Status:** 🔴 NOT STARTED
**Priority:** MVP CRITICAL
**Estimated Time:** 4-5 hours
**Risk Level:** HIGH (core feature)
**Dependencies:** Uses spec from MODULE_5/TIMESHEET_UPLOAD_SYSTEM.md

---

## 🎯 MISSION OBJECTIVE

**Problem:** Timesheet upload logic is duplicated in 2 files (~400 lines each):
- `src/pages/Timesheets.jsx`
- `src/components/timesheets/TimesheetCard.jsx`

When one is updated, the other breaks. This caused the OCR regression.

**Solution:**
1. Extract to single shared component
2. Create upload service layer
3. Single source of truth

**End State:** One upload component used everywhere, zero duplication.

---

## 📊 CURRENT STATE (BROKEN)

```
┌─────────────────────────┐     ┌─────────────────────────┐
│ Timesheets.jsx          │     │ TimesheetCard.jsx       │
│ - Upload logic (200 LOC)│     │ - Upload logic (200 LOC)│
│ - OCR trigger           │     │ - OCR trigger           │
│ - Modal handling        │     │ - Modal handling        │
│ - Error handling        │     │ - Error handling        │
└─────────────────────────┘     └─────────────────────────┘
         │                               │
         │      DUPLICATED!              │
         └───────────────────────────────┘
```

---

## 📦 DELIVERABLES

### Phase 1: Create Shared Component (2 hours)
- [ ] Create `src/components/timesheets/TimesheetUploader.jsx`
- [ ] Extract all upload logic
- [ ] Extract OCR trigger logic
- [ ] Extract modal handling
- [ ] Props: shiftId, onSuccess, onError

### Phase 2: Create Service Layer (1 hour)
- [ ] Create `src/services/timesheetService.js`
- [ ] `uploadTimesheet(file, shiftId)`
- [ ] `triggerOCR(timesheetId)`
- [ ] `validateExtraction(data)`
- [ ] Error handling centralized

### Phase 3: Refactor Consumers (1-2 hours)
- [ ] Update Timesheets.jsx to use shared component
- [ ] Update TimesheetCard.jsx to use shared component
- [ ] Remove duplicated code (~400 lines)
- [ ] Test both locations work

### Phase 4: Add Monitoring (30 min)
- [ ] Log every upload to edge_function_logs
- [ ] Alert if OCR not triggered
- [ ] Track success/failure rates

---

## 🔧 FILES AFFECTED

### Create:
- `src/components/timesheets/TimesheetUploader.jsx`
- `src/services/timesheetService.js`

### Modify:
- `src/pages/Timesheets.jsx` (remove ~200 lines)
- `src/components/timesheets/TimesheetCard.jsx` (remove ~200 lines)

### No Impact:
- All other files unchanged

---

## 📋 NEW COMPONENT API

```jsx
// TimesheetUploader.jsx
<TimesheetUploader
  shiftId="uuid"
  mode="inline" | "modal"
  onUploadStart={() => {}}
  onUploadComplete={(timesheet) => {}}
  onOCRComplete={(extractedData) => {}}
  onError={(error) => {}}
  showPreview={true}
  allowManualEntry={true}
/>
```

---

## ✅ SUCCESS CRITERIA

- [ ] Single TimesheetUploader component
- [ ] Single timesheetService.js
- [ ] 400 lines of duplication removed
- [ ] Both Timesheets.jsx and TimesheetCard.jsx work
- [ ] OCR always triggers on upload
- [ ] Error handling consistent
- [ ] Logging in place

---

## 🚨 ROLLBACK PLAN

1. Keep backup of original files
2. If issues, restore from backup
3. Component is additive, doesn't break existing

---

## 📞 AGENT HANDOFF

**To Start:** Read MODULE_5/TIMESHEET_UPLOAD_SYSTEM.md first
**When Done:** Test upload from both locations
**Next Module:** MODULE_14 (Autonomous Invoice Pipeline)

