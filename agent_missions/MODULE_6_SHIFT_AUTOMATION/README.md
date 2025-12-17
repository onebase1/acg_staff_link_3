# MODULE 6: SHIFT AUTOMATION & AI MATCHING

## 🤖 FULLY AUTONOMOUS SYSTEM
**Once built, this system runs ITSELF with ZERO human intervention.**

### The End State:
```
AUTOMATED FLOW (No clicks needed):

Admin bulk-creates shifts (only human action)
        ↓ [DATABASE TRIGGER]
Auto-Assignment Engine runs for each shift
        ↓ [EDGE FUNCTION]
Best available staff auto-assigned based on:
  • Their availability (from /my-availability)
  • AI scoring (reliability, ratings, experience)
        ↓ [DATABASE TRIGGER]
Staff receives SMS confirmation
        ↓ [STAFF CONFIRMS OR 4H PASSES]
If no confirm → auto-reassign to #2 scorer
        ↓ [SHIFT COMPLETES]
Streak updated → Score recalculated → Badges awarded
        ↓ [CLIENT RATES STAFF]
Score recalculated automatically
        ↓ [1ST OF EACH MONTH - CRON]
Time decay applied to old penalties
        ↓ [EVERY SUNDAY 6PM - CRON]
Availability reminder emails sent
```

**Admin only handles:**
- Overflow shifts (rare - when no one available)
- Edge cases and disputes

---

## 🎯 MISSION OBJECTIVE
Complete the Uber-style shift automation system: When admin creates non-urgent shifts, system auto-assigns staff based on their availability + AI scoring. Staff can see their scores, earn redemption points, and know exactly how to improve. No manual work needed.

---

## 🧠 THE KEY INSIGHT

**Staff already tell us when they're available** via `/my-availability`:
```json
{
  "monday": ["day", "night"],
  "tuesday": ["day"],
  "wednesday": [],
  ...
}
```

**We already have AI scoring** (`ai-shift-matcher`):
- Reliability (30pts), Proximity (20pts), Experience (20pts), Freshness (15pts), Rating (15pts)

**So WHY is admin manually assigning non-urgent shifts?**
→ The system should auto-assign based on availability + AI score!

---

## 📊 CURRENT STATE (What Exists)

### ✅ FULLY DEPLOYED
| Component | Location | Status |
|-----------|----------|--------|
| Staff Availability | `staff.availability` JSONB column | ✅ Working |
| Availability UI | `src/pages/MyAvailability.jsx` | ✅ Staff can set days/shifts |
| AI Shift Matcher | `supabase/functions/ai-shift-matcher/` | ✅ Deployed |
| Smart Digest | `supabase/functions/smart-marketplace-digest/` | ✅ Deployed |
| Bulk Shift Creation | `src/pages/BulkShiftCreation.jsx` | ✅ Working |

### ❌ MISSING PIECE: Auto-Assignment Trigger
When shifts are created, NO automatic matching happens. Admin must:
1. Go to Shifts page
2. Click each shift
3. Open assignment modal
4. Pick staff manually
5. Confirm

---

## 🎯 DESIRED END STATE

```
NON-URGENT SHIFTS (Automated - Default ON):

Admin bulk creates shifts (week+ out)
        ↓
System triggers auto-match for each shift:
  1. Get day-of-week from shift date
  2. Find staff AVAILABLE on that day (from staff.availability)
  3. Filter by role match
  4. Run AI scorer on available staff
  5. Auto-assign TOP scorer
  6. Auto-confirm (or send confirmation SMS)
        ↓
RESULT: Shifts auto-filled, zero admin work

OVERFLOW (Rare - only when no available staff):
  → Move to marketplace
  → Send email digest to all eligible staff
  → First to apply gets assigned

URGENT SHIFTS (Keep existing flow):
  → Broadcast immediately via SMS/Email
  → First responder wins
```

---

## 📋 TASKS

### PHASE 1: Auto-Assignment Engine (4-6 hours)
- [ ] **Task 1.1**: Create `auto-shift-assignment-engine` edge function
  - Input: `{ shift_ids: [...] }` (batch of shifts)
  - For each shift:
    1. Get shift date → day of week
    2. Query staff with `availability[day].includes(shift_type)`
    3. Filter by `role = shift.role_required`
    4. Call AI Shift Matcher to score
    5. Assign top scorer (score > 60)
    6. Create booking with `status: 'pending'` (awaiting staff confirm)
  - Output: `{ assigned: [...], overflow: [...] }`

- [ ] **Task 1.2**: Trigger on shift creation
  - Modify `BulkShiftCreation.jsx` to call engine after insert
  - Modify `PostShiftV2.jsx` for single shifts
  - Only for non-urgent shifts

- [ ] **Task 1.3**: Agency setting
  - `automation_settings.auto_assignment_enabled: true | false`
  - Default: `true`

### PHASE 2: Overflow → Marketplace (2-3 hours)
- [ ] **Task 2.1**: Handle unmatched shifts
  - If no staff available OR all scores < 60 → `marketplace_visible: true`
  - Send email digest (not SMS) for overflow only
  - Admin workflow: "X shifts need manual assignment"

### PHASE 3: UI Enhancements (2-3 hours)
- [ ] **Task 3.1**: Show AI scores in ShiftAssignmentModal (for overflow)
- [ ] **Task 3.2**: Show assignment status in Shifts page
  - "Auto-assigned to Emma (92pts)" badge
  - "Overflow - needs attention" badge

### PHASE 4: Confirmation Flow (2-3 hours)
- [ ] **Task 4.1**: Auto-assigned staff gets SMS
  - "You've been assigned: [Client] on [Date]. Reply YES to confirm."
- [ ] **Task 4.2**: If no confirm in 4h → reassign to #2 scorer
- [ ] **Task 4.3**: If all fail → move to marketplace


---

## 🎮 PHASE 5: GAMIFICATION & TRANSPARENCY (6-8 hours)

> **EXECUTION ORDER**: Phase 5A first (zero risk), then 5B (low risk with testing)

### 🎯 Phase 5A: Transparency & Visibility (ZERO RISK - Do First)
These are NEW components, no existing code modified.

#### Task 5A.1: Create Staff Score Dashboard Page
**File to create**: `src/pages/MyScore.jsx`

```jsx
// STRUCTURE (agent implements full version):
// 1. Fetch staff.reliability_score, staff.score_breakdown from Supabase
// 2. Display score as circular progress (0-100)
// 3. Show breakdown as horizontal bars
// 4. Show "How to Improve" tips (calculated from breakdown)
// 5. Show earned badges
```

**Route to add** in `src/App.jsx`:
```jsx
<Route path="/my-score" element={<MyScore />} />
```

**Navigation**: Add to staff sidebar/menu

**TEST**:
- Navigate to /my-score as staff user
- Verify score displays correctly
- Verify breakdown matches database

#### Task 5A.2: Create Badge System
**Migration SQL** (run in Supabase):
```sql
-- New table for badges
CREATE TABLE IF NOT EXISTS staff_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, badge_type)
);

-- Badge definitions (constants)
COMMENT ON TABLE staff_badges IS 'Badge types:
  reliable (10+ shifts),
  on_fire (5+ streak),
  redeemed (recovered from <50 to 70+),
  client_favorite (3+ 5-star ratings),
  urgency_hero (3+ urgent shifts covered),
  rising_star (20+ pts increase in 30 days)';

-- RLS
ALTER TABLE staff_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view own badges" ON staff_badges
  FOR SELECT USING (staff_id = auth.uid());
CREATE POLICY "System can insert badges" ON staff_badges
  FOR INSERT WITH CHECK (true);
```

**TEST**:
- Insert test badge manually
- Verify it appears on MyScore page

#### Task 5A.3: "How to Improve" Calculator
**File to create**: `src/services/scoring/improvementCalculator.js`

```javascript
// Calculate personalized tips based on current breakdown
export const calculateImprovementTips = (breakdown, currentStreak) => {
  const tips = [];

  // Streak tip
  if (currentStreak < 3) {
    tips.push({
      action: `Complete ${3 - currentStreak} more shifts without issues`,
      points: 10,
      icon: '🔥'
    });
  }

  // Rating tip (if ratings < 20)
  if (breakdown.ratings < 20) {
    const needed = Math.ceil((20 - breakdown.ratings) / 5);
    tips.push({
      action: `Get ${needed} more 5-star ratings`,
      points: needed * 5,
      icon: '⭐'
    });
  }

  // Penalty decay tip
  if (breakdown.penalties < 0) {
    tips.push({
      action: 'Each month without incident reduces penalties by 5 pts',
      points: 5,
      icon: '⏳'
    });
  }

  return tips.slice(0, 3); // Max 3 tips
};
```

**TEST**:
- Call with sample breakdown
- Verify tips are relevant and accurate

---

### 🔧 Phase 5B: Scoring Algorithm Enhancement (LOW RISK - Test First)
These MODIFY existing code. Apply carefully with testing.

#### Task 5B.1: Add Columns for Tracking
**Migration SQL**:
```sql
-- Add streak tracking
ALTER TABLE staff ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS longest_streak INT DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS urgent_shifts_covered INT DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_incident_date TIMESTAMPTZ;

COMMENT ON COLUMN staff.current_streak IS 'Consecutive completed shifts without incident';
COMMENT ON COLUMN staff.last_incident_date IS 'Last no-show or cancellation date for time decay';
```

#### Task 5B.2: Update staffScoring.js with Redemption Logic
**File**: `src/services/scoring/staffScoring.js`

**BACKUP FIRST**: Copy existing function before modifying

**ADD these calculation blocks** (do not remove existing):

```javascript
// === REDEMPTION BONUSES (Add after existing additions) ===

// Streak Bonus: +10 for 3+, +15 for 5+, +25 for 10+
let streakBonus = 0;
const currentStreak = staff.current_streak || 0;
if (currentStreak >= 10) streakBonus = 25;
else if (currentStreak >= 5) streakBonus = 15;
else if (currentStreak >= 3) streakBonus = 10;
score += streakBonus;
breakdown.streak_bonus = streakBonus;

// Urgency Hero: +5 per urgent shift covered (max +25)
const urgentCovered = staff.urgent_shifts_covered || 0;
const urgencyBonus = Math.min(urgentCovered * 5, 25);
score += urgencyBonus;
breakdown.urgency_bonus = urgencyBonus;

// === TIME DECAY FOR PENALTIES ===
// Reduce penalty impact based on time since incident
if (staff.last_incident_date && breakdown.penalties < 0) {
  const monthsSinceIncident = Math.floor(
    (new Date() - new Date(staff.last_incident_date)) / (1000 * 60 * 60 * 24 * 30)
  );

  let decayMultiplier = 1;
  if (monthsSinceIncident >= 12) decayMultiplier = 0.25; // 75% reduction
  else if (monthsSinceIncident >= 6) decayMultiplier = 0.5; // 50% reduction
  else if (monthsSinceIncident >= 1) decayMultiplier = 1 - (monthsSinceIncident * 0.05); // 5% per month

  const originalPenalty = breakdown.penalties;
  breakdown.penalties = Math.round(originalPenalty * decayMultiplier);
  breakdown.penalty_decay = originalPenalty - breakdown.penalties;

  // Recalculate score with decayed penalty
  score = score - originalPenalty + breakdown.penalties;
}
```

**TEST** (Critical):
```javascript
// Test cases to run manually:
// 1. Staff with 0 shifts → score should be base (50)
// 2. Staff with 5 streak → should get +15 bonus
// 3. Staff with old no-show (6+ months) → penalty should be reduced 50%
// 4. Staff with recent no-show → full penalty
// 5. Verify scores never go below 0 or above 100
```

#### Task 5B.3: Update Streak on Shift Completion
**File**: Find where shift status changes to 'completed'

**ADD** after shift marked complete:
```javascript
// Update streak counter
await supabase.rpc('update_staff_streak', {
  p_staff_id: shift.assigned_staff_id,
  p_completed: true
});
```

**Create RPC function**:
```sql
CREATE OR REPLACE FUNCTION update_staff_streak(p_staff_id UUID, p_completed BOOLEAN)
RETURNS void AS $$
BEGIN
  IF p_completed THEN
    UPDATE staff
    SET
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1)
    WHERE id = p_staff_id;
  ELSE
    -- Reset streak on no-show/cancellation
    UPDATE staff
    SET
      current_streak = 0,
      last_incident_date = NOW()
    WHERE id = p_staff_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Task 5B.4: Badge Award Trigger
**Create edge function**: `supabase/functions/check-badge-eligibility/index.ts`

Called after each shift completion, checks if staff earned new badge:
```typescript
// Pseudo-logic:
// 1. Count completed shifts → if >= 10 and no 'reliable' badge → award it
// 2. Check current_streak → if >= 5 and no 'on_fire' badge → award it
// 3. Check score history → if recovered from <50 to 70+ → award 'redeemed'
// 4. Count 5-star ratings → if >= 3 consecutive → award 'client_favorite'
```

---

### ✅ Phase 5 Verification Checklist

**Before moving on, agent MUST verify:**
- [ ] `/my-score` page loads without errors
- [ ] Score breakdown displays correctly
- [ ] "How to improve" tips appear
- [ ] Badges appear when earned
- [ ] Streak counter increments on shift completion
- [ ] Old penalties decay correctly (test with 6-month-old data)
- [ ] No existing tests broken
- [ ] Score still capped at 0-100

**ROLLBACK** (if something breaks):
```sql
-- Revert streak columns (if needed)
ALTER TABLE staff DROP COLUMN IF EXISTS current_streak;
ALTER TABLE staff DROP COLUMN IF EXISTS longest_streak;
ALTER TABLE staff DROP COLUMN IF EXISTS urgent_shifts_covered;
ALTER TABLE staff DROP COLUMN IF EXISTS last_incident_date;
```

For `staffScoring.js`: Restore from git or backup copy made before changes.

---

## ⚠️ AUTONOMOUS EXECUTION RULES

### EXECUTION ORDER (Mandatory)
1. **Phase 5A first** - Zero risk, creates new components
2. **Test Phase 5A** - Verify dashboard works
3. **Phase 5B second** - Low risk, modifies scoring
4. **Test Phase 5B** - Run all test cases listed
5. **Verify no regressions** - Check existing scoring still works

### DO NOT:
1. **Rebuild scoring from scratch** - `staffScoring.js` exists, ENHANCE it
2. **Skip testing** - Each phase has explicit test steps
3. **Combine phases** - Do 5A completely, test, THEN do 5B
4. **Ignore edge cases** - Staff with 0 shifts, staff with only penalties

### EXISTING CODE TO PRESERVE:
| File | Status |
|------|--------|
| `src/services/scoring/staffScoring.js` | ENHANCE, don't replace |
| `src/services/scoring/clientScoring.js` | DO NOT TOUCH |
| `src/pages/client/ShiftRating.jsx` | DO NOT TOUCH |
| `client_ratings` table | DO NOT MODIFY |

### DEPENDENCIES:
- MODULE 7 (Availability Reminder) → Ensures availability data is fresh
- MODULE 6 Phases 1-4 → Auto-assignment uses scores
- Client Rating System → Already built, feeds into scores

---

## 📊 SUCCESS METRICS

| Metric | Current | Target | How to Verify |
|--------|---------|--------|---------------|
| Admin time per shift | 2-3 min | < 30 sec | Time bulk creation + auto-assign |
| Staff score visibility | 0% | 100% | Check /my-score page loads |
| Redemption path clarity | 0% | 100% | Tips appear on dashboard |
| Streak tracking | None | Active | Check current_streak column |
| Badge awards | None | Working | Test badge trigger |

---

## 🚀 FINAL DEPLOYMENT CHECKLIST

After all phases complete:
- [ ] All migrations applied to production
- [ ] All edge functions deployed
- [ ] All new routes added
- [ ] Navigation updated for /my-score
- [ ] Tested with real staff data
- [ ] No console errors
- [ ] Score history still logging
- [ ] Badges displaying correctly
