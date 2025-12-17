# MODULE 13: Progress Tracker

**Last Updated:** 2025-12-17
**Status:** 🔴 NOT STARTED
**Completion:** 0%

---

## PHASE 1: Create Shared Component (0%)

- [ ] Analyze Timesheets.jsx upload logic
- [ ] Analyze TimesheetCard.jsx upload logic
- [ ] Identify common patterns
- [ ] Create TimesheetUploader.jsx component
- [ ] Implement file selection
- [ ] Implement upload to Supabase storage
- [ ] Implement OCR trigger
- [ ] Implement progress indicator
- [ ] Implement error handling
- [ ] Add props: shiftId, onSuccess, onError, mode

---

## PHASE 2: Create Service Layer (0%)

- [ ] Create timesheetService.js
- [ ] Implement uploadTimesheet(file, shiftId)
- [ ] Implement triggerOCR(timesheetId)
- [ ] Implement validateExtraction(data)
- [ ] Implement getTimesheetStatus(id)
- [ ] Add error handling
- [ ] Add logging

---

## PHASE 3: Refactor Consumers (0%)

- [ ] Update Timesheets.jsx to use TimesheetUploader
- [ ] Remove duplicated upload logic from Timesheets.jsx
- [ ] Update TimesheetCard.jsx to use TimesheetUploader
- [ ] Remove duplicated upload logic from TimesheetCard.jsx
- [ ] Test upload from Timesheets page
- [ ] Test upload from TimesheetCard
- [ ] Verify OCR triggers in both locations

---

## PHASE 4: Add Monitoring (0%)

- [ ] Add logging to timesheetService
- [ ] Log upload start/complete/error
- [ ] Log OCR trigger
- [ ] Add to edge_function_logs (if applicable)
- [ ] Test logging works

---

## FINAL VALIDATION (0%)

- [ ] Upload works from Timesheets.jsx
- [ ] Upload works from TimesheetCard.jsx
- [ ] OCR triggers correctly
- [ ] Error handling works
- [ ] ~400 lines of duplication removed
- [ ] Build passes
- [ ] No console errors

---

## CODE REDUCTION SUMMARY

| File | Before (LOC) | After (LOC) | Removed |
|------|--------------|-------------|---------|
| Timesheets.jsx | - | - | - |
| TimesheetCard.jsx | - | - | - |
| **Total** | - | - | - |

---

**Next Module:** MODULE_14 (Autonomous Invoice Pipeline)

