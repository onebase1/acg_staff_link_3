# MODULE 8: Progress Tracker

**Last Updated:** 2025-12-17
**Status:** 🔴 NOT STARTED
**Completion:** 0%

---

## PHASE 1: Database Schema (0%)

- [ ] Create migration file
- [ ] Create shift_state enum type
- [ ] Add current_state column to shifts
- [ ] Create shift_state_transitions table
- [ ] Create shift_state_deadlines table
- [ ] Create transition_shift_state function
- [ ] Create stuck_shifts view
- [ ] Apply migration
- [ ] Verify all objects created
- [ ] Backfill current_state for existing shifts

**Phase 1 Notes:**
_Backfill logic: Check status field and set appropriate state_

---

## PHASE 2: State Machine Logic (0%)

- [ ] Create shiftStateMachine.js
- [ ] Define VALID_TRANSITIONS map
- [ ] Implement canTransition function
- [ ] Implement getNextStates function
- [ ] Implement getStateColor function
- [ ] Implement transitionShift function
- [ ] Add to existing shift utilities
- [ ] Test all transitions work

**Phase 2 Notes:**
_Agent notes go here_

---

## PHASE 3: Auto-Transition Engine (0%)

- [ ] Create shift-state-engine Edge Function
- [ ] Implement stuck shift detection
- [ ] Implement auto-transition logic:
  - clocked_out → timesheet_pending (after 30 min)
  - approved → invoiced (when invoice generated)
  - invoice_sent → paid (when payment recorded)
- [ ] Implement escalation for stuck shifts
- [ ] Deploy function
- [ ] Schedule hourly cron job
- [ ] Test with sample shifts

**Phase 3 Notes:**
_Agent notes go here_

---

## PHASE 4: Pipeline Dashboard (0%)

- [ ] Create ShiftPipeline.jsx page
- [ ] Fetch shifts grouped by state
- [ ] Implement Kanban-style columns
- [ ] Add drag-and-drop transitions (optional)
- [ ] Highlight stuck shifts in red
- [ ] Add "time in state" indicator
- [ ] Add manual transition buttons
- [ ] Add route to App.jsx
- [ ] Add navigation link
- [ ] Test all interactions

**Phase 4 Notes:**
_Agent notes go here_

---

## PHASE 5: Integration (0%)

- [ ] Update ShiftAssignmentModal → trigger 'assigned'
- [ ] Update MobileClockIn → trigger 'clocked_in'
- [ ] Update clock-out logic → trigger 'clocked_out'
- [ ] Update timesheet upload → trigger 'timesheet_uploaded'
- [ ] Update approval → trigger 'approved'
- [ ] Update invoice generation → trigger 'invoiced'
- [ ] Update payment recording → trigger 'paid'

---

## FINAL VALIDATION (0%)

- [ ] All shifts have current_state populated
- [ ] Transitions logging correctly
- [ ] Stuck shifts detected
- [ ] Escalations sent
- [ ] Pipeline dashboard working
- [ ] No existing functionality broken

---

## ISSUES ENCOUNTERED

| Issue | Resolution | Status |
|-------|------------|--------|
| - | - | - |

---

**Next Module:** MODULE_9 (Orphaned Code Cleanup)

