# MODULE 8: Shift State Machine

**Status:** 🔴 NOT STARTED
**Priority:** MVP CRITICAL
**Estimated Time:** 8-10 hours
**Risk Level:** Medium (touches core shift logic)
**Dependencies:** None (but informs MODULE_14)

---

## 🎯 MISSION OBJECTIVE

**Problem:** Your 12-step shift lifecycle has no formal state machine:
- Shifts get "stuck" in states with no detection
- Manual intervention required to move shifts forward
- No visibility into where shifts are in the pipeline
- Edge cases fall through the cracks

**Solution:**
1. Create formal state machine with defined transitions
2. Track every state change with timestamps
3. Auto-detect stuck shifts and escalate
4. Build pipeline visibility dashboard

**End State:** Every shift moves through pipeline automatically with zero manual intervention.

---

## 📊 SHIFT LIFECYCLE STATES

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHIFT STATE MACHINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CREATED ──► 2. PUBLISHED ──► 3. OFFERED                     │
│                                      │                           │
│                                      ▼                           │
│  12. PAID ◄── 11. INVOICED ◄── 4. ASSIGNED                      │
│       ▲                              │                           │
│       │                              ▼                           │
│  10. INVOICE_SENT           5. REMINDED (24h/2h)                │
│       ▲                              │                           │
│       │                              ▼                           │
│   9. APPROVED ◄── 8. TIMESHEET_UPLOADED ◄── 6. CLOCKED_IN       │
│                          ▲                       │               │
│                          │                       ▼               │
│                    7. CLOCKED_OUT ◄─────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 DELIVERABLES

### Phase 1: Database Schema (2 hours)
- [ ] Create `shift_states` enum type
- [ ] Add `current_state` column to shifts table
- [ ] Create `shift_state_transitions` table
- [ ] Create transition rules table
- [ ] Add deadline tracking

### Phase 2: State Machine Logic (3 hours)
- [ ] Create `src/utils/shiftStateMachine.js`
- [ ] Define valid transitions
- [ ] Create transition functions
- [ ] Implement stuck detection

### Phase 3: Auto-Transition Engine (2 hours)
- [ ] Create Edge Function: `shift-state-engine`
- [ ] Auto-transition based on events
- [ ] Schedule hourly checks for stuck shifts
- [ ] Create escalation logic

### Phase 4: Pipeline Dashboard (2-3 hours)
- [ ] Create `src/pages/ShiftPipeline.jsx`
- [ ] Show shifts in each state (Kanban view)
- [ ] Highlight stuck shifts
- [ ] One-click manual transitions

---

## 🔧 FILES AFFECTED

### Create:
- `supabase/migrations/20251217_shift_state_machine.sql`
- `src/utils/shiftStateMachine.js`
- `supabase/functions/shift-state-engine/index.ts`
- `src/pages/ShiftPipeline.jsx`

### Modify:
- `src/pages/Shifts.jsx` - Show current state
- `src/components/shifts/ShiftTable.jsx` - State column
- Existing shift-related Edge Functions (trigger state changes)

---

## ✅ SUCCESS CRITERIA

- [ ] All shifts have a `current_state`
- [ ] Every state change logged with timestamp
- [ ] Stuck shifts detected within 1 hour
- [ ] Auto-escalation for stuck shifts
- [ ] Pipeline dashboard shows all shifts by state
- [ ] No shifts "fall through cracks"

---

## 🚨 ROLLBACK PLAN

1. Column is additive (no data loss)
2. State engine can be disabled via cron
3. Dashboard can be hidden from nav
4. Existing shift logic unchanged

---

## 📞 AGENT HANDOFF

**To Start:** Read IMPLEMENTATION.md, understand state flow
**When Done:** Test with real shifts, verify transitions work
**Next Module:** MODULE_9 (Orphaned Code Cleanup)

