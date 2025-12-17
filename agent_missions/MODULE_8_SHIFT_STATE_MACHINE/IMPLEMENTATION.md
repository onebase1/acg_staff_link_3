# MODULE 8: Implementation Guide

**For Agent Execution - Follow Step by Step**

---

## PHASE 1: Database Schema (2 hours)

### Step 1.1: Create Migration

**File:** `supabase/migrations/20251217_shift_state_machine.sql`

```sql
-- ============================================================================
-- SHIFT STATE MACHINE
-- Created: 2025-12-17
-- Purpose: Formal state management for shift lifecycle
-- ============================================================================

-- State enum
CREATE TYPE shift_state AS ENUM (
    'created',
    'published',
    'offered',
    'assigned',
    'reminded_24h',
    'reminded_2h',
    'clocked_in',
    'clocked_out',
    'timesheet_pending',
    'timesheet_uploaded',
    'approved',
    'invoiced',
    'invoice_sent',
    'paid',
    'cancelled',
    'no_show'
);

-- Add state to shifts (with default for existing)
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS current_state shift_state DEFAULT 'created';

-- State transition history
CREATE TABLE IF NOT EXISTS shift_state_transitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
    from_state shift_state,
    to_state shift_state NOT NULL,
    transitioned_at TIMESTAMPTZ DEFAULT NOW(),
    triggered_by TEXT, -- 'system', 'user', 'cron', function name
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_state_transitions_shift ON shift_state_transitions(shift_id);

-- Deadline tracking
CREATE TABLE IF NOT EXISTS shift_state_deadlines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
    expected_state shift_state NOT NULL,
    deadline_at TIMESTAMPTZ NOT NULL,
    is_overdue BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_deadlines_overdue ON shift_state_deadlines(is_overdue, deadline_at);

-- Function to transition state
CREATE OR REPLACE FUNCTION transition_shift_state(
    p_shift_id UUID,
    p_new_state shift_state,
    p_triggered_by TEXT DEFAULT 'system'
)
RETURNS void AS $$
DECLARE
    v_current_state shift_state;
BEGIN
    SELECT current_state INTO v_current_state FROM shifts WHERE id = p_shift_id;
    
    -- Log transition
    INSERT INTO shift_state_transitions (shift_id, from_state, to_state, triggered_by)
    VALUES (p_shift_id, v_current_state, p_new_state, p_triggered_by);
    
    -- Update shift
    UPDATE shifts SET current_state = p_new_state WHERE id = p_shift_id;
END;
$$ LANGUAGE plpgsql;

-- View for stuck shifts
CREATE OR REPLACE VIEW stuck_shifts AS
SELECT 
    s.id,
    s.current_state,
    s.date,
    s.start_time,
    sst.transitioned_at as last_transition,
    NOW() - sst.transitioned_at as time_in_state,
    CASE
        WHEN s.current_state = 'assigned' AND NOW() - sst.transitioned_at > INTERVAL '24 hours' THEN 'stuck'
        WHEN s.current_state = 'clocked_out' AND NOW() - sst.transitioned_at > INTERVAL '4 hours' THEN 'stuck'
        WHEN s.current_state = 'timesheet_pending' AND NOW() - sst.transitioned_at > INTERVAL '48 hours' THEN 'stuck'
        ELSE 'ok'
    END as stuck_status
FROM shifts s
LEFT JOIN LATERAL (
    SELECT transitioned_at 
    FROM shift_state_transitions 
    WHERE shift_id = s.id 
    ORDER BY transitioned_at DESC 
    LIMIT 1
) sst ON true
WHERE s.current_state NOT IN ('paid', 'cancelled');
```

---

## PHASE 2: State Machine Logic (3 hours)

### Step 2.1: Create State Machine Utility

**File:** `src/utils/shiftStateMachine.js`

```javascript
// Valid state transitions
const VALID_TRANSITIONS = {
  created: ['published', 'cancelled'],
  published: ['offered', 'assigned', 'cancelled'],
  offered: ['assigned', 'cancelled'],
  assigned: ['reminded_24h', 'clocked_in', 'cancelled', 'no_show'],
  reminded_24h: ['reminded_2h', 'clocked_in', 'cancelled', 'no_show'],
  reminded_2h: ['clocked_in', 'cancelled', 'no_show'],
  clocked_in: ['clocked_out'],
  clocked_out: ['timesheet_pending'],
  timesheet_pending: ['timesheet_uploaded'],
  timesheet_uploaded: ['approved'],
  approved: ['invoiced'],
  invoiced: ['invoice_sent'],
  invoice_sent: ['paid'],
  paid: [], // Terminal state
  cancelled: [], // Terminal state
  no_show: ['cancelled'] // Can be resolved
};

export function canTransition(fromState, toState) {
  return VALID_TRANSITIONS[fromState]?.includes(toState) || false;
}

export function getNextStates(currentState) {
  return VALID_TRANSITIONS[currentState] || [];
}

export function getStateColor(state) {
  const colors = {
    created: 'gray', published: 'blue', offered: 'purple',
    assigned: 'indigo', reminded_24h: 'cyan', reminded_2h: 'teal',
    clocked_in: 'green', clocked_out: 'lime', timesheet_pending: 'yellow',
    timesheet_uploaded: 'amber', approved: 'orange', invoiced: 'pink',
    invoice_sent: 'rose', paid: 'emerald', cancelled: 'red', no_show: 'red'
  };
  return colors[state] || 'gray';
}

export async function transitionShift(supabase, shiftId, newState, triggeredBy = 'system') {
  const { data: shift } = await supabase
    .from('shifts')
    .select('current_state')
    .eq('id', shiftId)
    .single();
    
  if (!canTransition(shift.current_state, newState)) {
    throw new Error(`Invalid transition: ${shift.current_state} → ${newState}`);
  }
  
  await supabase.rpc('transition_shift_state', {
    p_shift_id: shiftId,
    p_new_state: newState,
    p_triggered_by: triggeredBy
  });
}
```

---

## PHASE 3: Auto-Transition Engine (2 hours)

Create Edge Function that runs hourly to:
1. Detect stuck shifts
2. Auto-transition where possible
3. Escalate when human intervention needed

---

## ✅ COMPLETION CHECKLIST

- [ ] Migration applied
- [ ] State machine utility created
- [ ] 5 Edge Functions updated to trigger transitions
- [ ] Engine scheduled on cron
- [ ] Pipeline dashboard created
- [ ] Stuck shifts highlighted

