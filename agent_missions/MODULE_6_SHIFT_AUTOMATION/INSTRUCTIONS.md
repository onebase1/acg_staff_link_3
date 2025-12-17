# MODULE 6: AGENT INSTRUCTIONS

## 🔧 PRE-FLIGHT CHECKLIST
Before starting, verify these exist:
```bash
# Edge Functions
supabase/functions/ai-shift-matcher/index.ts     # Already deployed
supabase/functions/smart-marketplace-digest/     # Already deployed

# Frontend
src/pages/MyAvailability.jsx                     # Staff sets availability
src/pages/BulkShiftCreation.jsx                  # Admin creates shifts
src/pages/PostShiftV2.jsx                        # Single shift creation

# Database
staff.availability (JSONB)                       # {"monday": ["day"], ...}
```

---

## TASK 1.1: Create Auto-Assignment Engine

### Create NEW Edge Function
**Path:** `supabase/functions/auto-shift-assignment-engine/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * AUTO SHIFT ASSIGNMENT ENGINE
 *
 * Automatically assigns staff to shifts based on:
 * 1. Staff availability (from /my-availability)
 * 2. AI scoring (reliability, proximity, experience, etc.)
 *
 * Input: { shift_ids: [...], agency_id: "uuid" }
 * Output: { assigned: [...], overflow: [...] }
 */

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { shift_ids, agency_id } = await req.json();

  const results = { assigned: [], overflow: [], errors: [] };
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

  // Get all shifts
  const { data: shifts } = await supabase
    .from('shifts')
    .select('*')
    .in('id', shift_ids)
    .eq('status', 'open');

  // Get all active staff with availability
  const { data: allStaff } = await supabase
    .from('staff')
    .select('*')
    .eq('agency_id', agency_id)
    .eq('status', 'active');

  for (const shift of shifts) {
    try {
      // 1. Get day of week from shift date
      const shiftDate = new Date(shift.date);
      const dayOfWeek = dayNames[shiftDate.getDay()];
      const isNightShift = shift.start_time >= '20:00' || shift.end_time <= '08:00';
      const shiftType = isNightShift ? 'night' : 'day';

      // 2. Filter staff by availability
      const availableStaff = allStaff.filter(staff => {
        const dayAvail = staff.availability?.[dayOfWeek] || [];
        return dayAvail.includes(shiftType) && staff.role === shift.role_required;
      });

      if (availableStaff.length === 0) {
        // No one available → overflow
        results.overflow.push({ shift_id: shift.id, reason: 'no_available_staff' });
        continue;
      }

      // 3. Call AI Shift Matcher for scoring
      const { data: matchResult } = await supabase.functions.invoke('ai-shift-matcher', {
        body: { shift_id: shift.id, limit: 5 }
      });

      if (!matchResult?.matches?.length) {
        results.overflow.push({ shift_id: shift.id, reason: 'ai_matcher_failed' });
        continue;
      }

      // 4. Get top scorer (must be available AND score >= 60)
      const topMatch = matchResult.matches.find(m =>
        availableStaff.some(s => s.id === m.staff_id) && m.total_score >= 60
      );

      if (!topMatch) {
        results.overflow.push({ shift_id: shift.id, reason: 'no_qualified_match' });
        continue;
      }

      // 5. Auto-assign!
      await supabase.from('shifts').update({
        assigned_staff_id: topMatch.staff_id,
        status: 'assigned',
        assignment_method: 'auto_matched',
        ai_match_score: topMatch.total_score
      }).eq('id', shift.id);

      // 6. Create booking
      await supabase.from('bookings').insert({
        agency_id: shift.agency_id,
        shift_id: shift.id,
        staff_id: topMatch.staff_id,
        client_id: shift.client_id,
        status: 'pending', // Awaiting staff confirmation
        booking_date: new Date().toISOString()
      });

      results.assigned.push({
        shift_id: shift.id,
        staff_id: topMatch.staff_id,
        staff_name: topMatch.staff_name,
        score: topMatch.total_score
      });

    } catch (error) {
      results.errors.push({ shift_id: shift.id, error: error.message });
    }
  }

  // Handle overflow: set marketplace_visible and notify
  if (results.overflow.length > 0) {
    const overflowIds = results.overflow.map(o => o.shift_id);
    await supabase.from('shifts').update({ marketplace_visible: true }).in('id', overflowIds);
  }

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" }
  });
});
```

### Deploy:
```bash
npx supabase functions deploy auto-shift-assignment-engine
```

---

## TASK 1.2: Trigger from Bulk Shift Creation

### File: `src/pages/BulkShiftCreation.jsx`

After successful batch insert (around line 330), add:

```javascript
// After: totalInserted += data.length;

// 🤖 AUTO-ASSIGNMENT: For non-urgent shifts, auto-assign based on availability
const nonUrgentShiftIds = data
  .filter(s => s.urgency !== 'urgent' && s.urgency !== 'critical')
  .map(s => s.id);

if (nonUrgentShiftIds.length > 0) {
  console.log(`🤖 Auto-assigning ${nonUrgentShiftIds.length} non-urgent shifts...`);

  supabase.functions.invoke('auto-shift-assignment-engine', {
    body: { shift_ids: nonUrgentShiftIds, agency_id: agencyId }
  }).then(({ data: result }) => {
    if (result) {
      console.log(`✅ Auto-assigned: ${result.assigned?.length || 0}`);
      console.log(`⚠️ Overflow: ${result.overflow?.length || 0}`);

      if (result.overflow?.length > 0) {
        toast.info(`${result.overflow.length} shifts need manual assignment`);
      }
    }
  }).catch(console.error);
}
```

---

## TASK 2.1: Handle Overflow (Marketplace)

Already handled in the engine above:
- Sets `marketplace_visible: true` for overflow shifts
- Admin sees "Needs manual assignment" badge

### Add to Shifts.jsx - show badge:
```javascript
{shift.assignment_method === 'auto_matched' && (
  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
    🤖 Auto-assigned ({shift.ai_match_score}pts)
  </span>
)}

{shift.status === 'open' && shift.marketplace_visible && (
  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
    ⚠️ Needs attention
  </span>
)}
```

---

## 🧪 TESTING CHECKLIST

### Task 1.1 Tests
- [ ] Create 5 non-urgent shifts via Bulk Creation
- [ ] Check Supabase logs for auto-assignment-engine execution
- [ ] Verify assigned shifts have `assignment_method: 'auto_matched'`
- [ ] Verify overflow shifts have `marketplace_visible: true`

### Task 1.2 Tests
- [ ] Create shift on day staff marked as available → auto-assigned
- [ ] Create shift on day NO staff available → goes to marketplace
- [ ] Create urgent shift → bypasses auto-assignment (existing flow)

---

---

## 🤖 AUTOMATION TRIGGERS (Critical for Fully Autonomous System)

### Why This Matters
The system must run WITHOUT human intervention. Every action should trigger the next automatically:

```
Shift Created → Auto-Assignment Engine runs
       ↓
Staff Assigned → Confirmation SMS sent
       ↓
Shift Completed → Streak updated → Score recalculated → Badge check
       ↓
Client Rates Staff → Score recalculated → Badge check
       ↓
Monthly Cron → Time decay applied → Scores updated
```

### Trigger 1: Auto-Assignment on Shift Insert

**Run in Supabase SQL Editor**:
```sql
-- Trigger auto-assignment when non-urgent shift is created
CREATE OR REPLACE FUNCTION trigger_auto_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for non-urgent, open shifts
  IF NEW.status = 'open' AND NEW.urgency NOT IN ('urgent', 'critical') THEN
    -- Queue for auto-assignment (async via pg_net)
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-shift-assignment-engine',
      body := jsonb_build_object('shift_ids', ARRAY[NEW.id], 'agency_id', NEW.agency_id),
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_shift_auto_assignment
  AFTER INSERT ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_assignment();
```

### Trigger 2: Score Recalculation on Shift Status Change

**Run in Supabase SQL Editor**:
```sql
-- Recalculate score when shift completes, no-shows, or cancels
CREATE OR REPLACE FUNCTION trigger_score_recalc_on_shift()
RETURNS TRIGGER AS $$
BEGIN
  -- Only if status changed and staff was assigned
  IF OLD.status != NEW.status AND NEW.assigned_staff_id IS NOT NULL THEN

    -- Update streak
    IF NEW.status = 'completed' THEN
      PERFORM update_staff_streak(NEW.assigned_staff_id, true);
    ELSIF NEW.status IN ('no_show', 'cancelled_by_staff') THEN
      PERFORM update_staff_streak(NEW.assigned_staff_id, false);
    END IF;

    -- Queue score recalculation
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/recalculate-staff-score',
      body := jsonb_build_object('staff_id', NEW.assigned_staff_id, 'reason', 'Shift ' || NEW.status),
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_shift_status_score_update
  AFTER UPDATE OF status ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_score_recalc_on_shift();
```

### Trigger 3: Score Recalculation on Client Rating

**Run in Supabase SQL Editor**:
```sql
-- Recalculate score when client rates staff
CREATE OR REPLACE FUNCTION trigger_score_recalc_on_rating()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/recalculate-staff-score',
    body := jsonb_build_object('staff_id', NEW.staff_id, 'reason', 'Client rating received'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_rating_score_update
  AFTER INSERT ON client_ratings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_score_recalc_on_rating();
```

### Trigger 4: Badge Award Check (After Score Update)

**Run in Supabase SQL Editor**:
```sql
-- Check badge eligibility after score changes
CREATE OR REPLACE FUNCTION trigger_badge_check()
RETURNS TRIGGER AS $$
DECLARE
  completed_count INT;
  five_star_count INT;
BEGIN
  -- Only if score actually changed
  IF OLD.reliability_score IS DISTINCT FROM NEW.reliability_score THEN

    -- Check "Reliable" badge (10+ shifts)
    SELECT COUNT(*) INTO completed_count
    FROM shifts WHERE assigned_staff_id = NEW.id AND status = 'completed';

    IF completed_count >= 10 THEN
      INSERT INTO staff_badges (staff_id, badge_type, badge_name, badge_icon)
      VALUES (NEW.id, 'reliable', 'Reliable', '🌟')
      ON CONFLICT (staff_id, badge_type) DO NOTHING;
    END IF;

    -- Check "On Fire" badge (5+ streak)
    IF NEW.current_streak >= 5 THEN
      INSERT INTO staff_badges (staff_id, badge_type, badge_name, badge_icon)
      VALUES (NEW.id, 'on_fire', 'On Fire', '🔥')
      ON CONFLICT (staff_id, badge_type) DO NOTHING;
    END IF;

    -- Check "Redeemed" badge (recovered from <50 to 70+)
    IF OLD.reliability_score < 50 AND NEW.reliability_score >= 70 THEN
      INSERT INTO staff_badges (staff_id, badge_type, badge_name, badge_icon)
      VALUES (NEW.id, 'redeemed', 'Redeemed', '💪')
      ON CONFLICT (staff_id, badge_type) DO NOTHING;
    END IF;

    -- Check "Client Favorite" badge (3+ 5-star ratings)
    SELECT COUNT(*) INTO five_star_count
    FROM client_ratings
    WHERE staff_id = NEW.id
    AND (professionalism_rating + competence_rating + communication_rating + reliability_rating) / 4.0 >= 4.5;

    IF five_star_count >= 3 THEN
      INSERT INTO staff_badges (staff_id, badge_type, badge_name, badge_icon)
      VALUES (NEW.id, 'client_favorite', 'Client Favorite', '⭐')
      ON CONFLICT (staff_id, badge_type) DO NOTHING;
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_staff_badge_check
  AFTER UPDATE OF reliability_score ON staff
  FOR EACH ROW
  EXECUTE FUNCTION trigger_badge_check();
```

### Cron Job: Monthly Time Decay

**Run in Supabase SQL Editor**:
```sql
-- Monthly job to apply time decay to old penalties
SELECT cron.schedule(
  'monthly-score-decay',
  '0 3 1 * *',  -- 3am on 1st of each month
  $$
  UPDATE staff
  SET
    score_breakdown = jsonb_set(
      COALESCE(score_breakdown, '{}'::jsonb),
      '{penalty_decay_applied}',
      to_jsonb(NOW())
    )
  WHERE last_incident_date IS NOT NULL
  AND last_incident_date < NOW() - INTERVAL '30 days';

  -- Trigger score recalc for affected staff
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/batch-recalculate-scores',
    body := '{"reason": "Monthly time decay"}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

### Edge Function: Recalculate Staff Score

**Create**: `supabase/functions/recalculate-staff-score/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { staff_id, reason } = await req.json();

  // Fetch staff data
  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', staff_id)
    .single();

  if (!staff) {
    return new Response(JSON.stringify({ error: 'Staff not found' }), { status: 404 });
  }

  // Calculate score (same logic as staffScoring.js)
  let score = 50; // Base
  const breakdown = { base: 50 };

  // Attendance
  const { count: completed } = await supabase
    .from('shifts')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_staff_id', staff_id)
    .eq('status', 'completed');
  breakdown.attendance = Math.min((completed || 0) * 2, 20);
  score += breakdown.attendance;

  // Ratings
  const { data: ratings } = await supabase
    .from('client_ratings')
    .select('professionalism_rating, competence_rating, communication_rating, reliability_rating')
    .eq('staff_id', staff_id);
  const fiveStars = ratings?.filter(r =>
    (r.professionalism_rating + r.competence_rating + r.communication_rating + r.reliability_rating) / 4 >= 4.5
  ).length || 0;
  breakdown.ratings = Math.min(fiveStars * 5, 20);
  score += breakdown.ratings;

  // Loyalty
  const monthsActive = staff.created_at
    ? Math.floor((Date.now() - new Date(staff.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;
  breakdown.loyalty = Math.min(monthsActive, 5);
  score += breakdown.loyalty;

  // Penalties (no-shows)
  const { count: noShows } = await supabase
    .from('shifts')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_staff_id', staff_id)
    .eq('status', 'no_show');
  breakdown.penalties = -((noShows || 0) * 30);

  // Time decay for penalties
  if (staff.last_incident_date && breakdown.penalties < 0) {
    const monthsAgo = Math.floor(
      (Date.now() - new Date(staff.last_incident_date).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    let decay = 1;
    if (monthsAgo >= 12) decay = 0.25;
    else if (monthsAgo >= 6) decay = 0.5;
    else if (monthsAgo >= 1) decay = Math.max(0.5, 1 - monthsAgo * 0.05);
    breakdown.penalties = Math.round(breakdown.penalties * decay);
  }
  score += breakdown.penalties;

  // Streak bonus
  const streak = staff.current_streak || 0;
  breakdown.streak_bonus = streak >= 10 ? 25 : streak >= 5 ? 15 : streak >= 3 ? 10 : 0;
  score += breakdown.streak_bonus;

  // Urgency bonus
  breakdown.urgency_bonus = Math.min((staff.urgent_shifts_covered || 0) * 5, 25);
  score += breakdown.urgency_bonus;

  // Cap
  score = Math.max(0, Math.min(100, score));

  // Update
  await supabase.from('staff').update({
    reliability_score: score,
    score_breakdown: breakdown,
    last_score_update: new Date().toISOString()
  }).eq('id', staff_id);

  // Log history
  await supabase.from('score_history').insert({
    staff_id,
    old_score: staff.reliability_score,
    new_score: score,
    change_reason: reason,
    change_amount: score - (staff.reliability_score || 50)
  });

  return new Response(JSON.stringify({ success: true, score, breakdown }), {
    headers: { "Content-Type": "application/json" }
  });
});
```

**Deploy**:
```bash
npx supabase functions deploy recalculate-staff-score
```

---

## 🔄 AUTONOMOUS FLOW SUMMARY

Once deployed, the system runs itself:

| Event | Automatic Action | No Human Needed |
|-------|-----------------|-----------------|
| Shift created | → Auto-assign to best available staff | ✅ |
| Staff assigned | → SMS confirmation sent | ✅ |
| Shift completed | → Streak updated → Score recalculated → Badges checked | ✅ |
| Staff no-shows | → Streak reset → Score reduced → Incident logged | ✅ |
| Client rates staff | → Score recalculated | ✅ |
| 1st of month | → Time decay applied to old penalties | ✅ |
| Sunday 6pm | → Availability reminder emails sent | ✅ |

---

## PHASE 5A: Staff Score Dashboard (ZERO RISK)

### Task 5A.1: Create MyScore Page

**Create file**: `src/pages/MyScore.jsx`

```jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';

const MyScore = () => {
  const { user } = useAuth();

  const { data: staff, isLoading } = useQuery({
    queryKey: ['my-score', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('reliability_score, score_breakdown, current_streak, badges:staff_badges(*)')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  if (isLoading) return <div className="p-8">Loading...</div>;

  const score = staff?.reliability_score || 50;
  const breakdown = staff?.score_breakdown || {};

  // Calculate improvement tips
  const tips = [];
  if ((staff?.current_streak || 0) < 3) {
    tips.push({ icon: '🔥', text: `Complete ${3 - (staff?.current_streak || 0)} more shifts for streak bonus (+10 pts)` });
  }
  if ((breakdown.ratings || 0) < 20) {
    tips.push({ icon: '⭐', text: `Get more 5-star ratings to earn up to +20 pts` });
  }
  if ((breakdown.penalties || 0) < 0) {
    tips.push({ icon: '⏳', text: `Each month without incident reduces penalties by 5 pts` });
  }

  const getScoreColor = (s) => {
    if (s >= 85) return 'text-yellow-600'; // Gold
    if (s >= 70) return 'text-green-600';
    if (s >= 50) return 'text-orange-500';
    return 'text-red-600';
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">My Reliability Score</h1>

      {/* Main Score */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className={`text-6xl font-bold ${getScoreColor(score)}`}>
              {score}
            </div>
            <div className="text-gray-500 mt-2">out of 100</div>
            <Progress value={score} className="mt-4 h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <Card>
        <CardHeader><CardTitle>📊 Score Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Object.entries({
            'Base Score': { value: breakdown.base || 50, max: 50 },
            'Attendance': { value: breakdown.attendance || 0, max: 20 },
            'Client Ratings': { value: breakdown.ratings || 0, max: 20 },
            'Loyalty': { value: breakdown.loyalty || 0, max: 5 },
            'Streak Bonus': { value: breakdown.streak_bonus || 0, max: 25 },
            'Penalties': { value: breakdown.penalties || 0, max: 0 }
          }).map(([label, { value, max }]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <span className={`font-medium ${value < 0 ? 'text-red-600' : ''}`}>
                {value >= 0 ? '+' : ''}{value}{max > 0 ? `/${max}` : ''}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* How to Improve */}
      {tips.length > 0 && (
        <Card>
          <CardHeader><CardTitle>🎯 How to Improve</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span>{tip.icon}</span>
                  <span>{tip.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Badges */}
      <Card>
        <CardHeader><CardTitle>🏆 Your Badges</CardTitle></CardHeader>
        <CardContent>
          {staff?.badges?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {staff.badges.map((badge) => (
                <span key={badge.id} className="px-3 py-1 bg-yellow-100 rounded-full text-sm">
                  {badge.badge_icon} {badge.badge_name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Complete more shifts to earn badges!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyScore;
```

### Task 5A.2: Add Route

**File**: `src/App.jsx`

Find routes section and add:
```jsx
import MyScore from './pages/MyScore';

// Inside routes:
<Route path="/my-score" element={<MyScore />} />
```

### Task 5A.3: Add Navigation Link

Find staff navigation/sidebar and add:
```jsx
<NavLink to="/my-score" icon={Star} label="My Score" />
```

### Task 5A.4: Run Migration for Badges Table

**Run in Supabase SQL Editor**:
```sql
-- Badges table
CREATE TABLE IF NOT EXISTS staff_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, badge_type)
);

-- RLS
ALTER TABLE staff_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view own badges" ON staff_badges
  FOR SELECT USING (staff_id IN (
    SELECT id FROM staff WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role manages badges" ON staff_badges
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

---

## PHASE 5B: Scoring Algorithm Enhancement

### Task 5B.1: Add Tracking Columns

**Run in Supabase SQL Editor**:
```sql
-- Add streak and tracking columns
ALTER TABLE staff ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS longest_streak INT DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS urgent_shifts_covered INT DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_incident_date TIMESTAMPTZ;
```

### Task 5B.2: Create Streak Update Function

**Run in Supabase SQL Editor**:
```sql
CREATE OR REPLACE FUNCTION update_staff_streak(p_staff_id UUID, p_completed BOOLEAN)
RETURNS void AS $$
BEGIN
  IF p_completed THEN
    UPDATE staff
    SET
      current_streak = COALESCE(current_streak, 0) + 1,
      longest_streak = GREATEST(COALESCE(longest_streak, 0), COALESCE(current_streak, 0) + 1)
    WHERE id = p_staff_id;
  ELSE
    UPDATE staff
    SET
      current_streak = 0,
      last_incident_date = NOW()
    WHERE id = p_staff_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Task 5B.3: Update staffScoring.js

**File**: `src/services/scoring/staffScoring.js`

**FIND** the section after deductions (around line 85-90) and **ADD**:

```javascript
// === REDEMPTION BONUSES ===

// Streak Bonus: +10 for 3+, +15 for 5+, +25 for 10+
const currentStreak = staff.current_streak || 0;
let streakBonus = 0;
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
if (staff.last_incident_date && breakdown.penalties < 0) {
  const lastIncident = new Date(staff.last_incident_date);
  const monthsAgo = Math.floor((Date.now() - lastIncident.getTime()) / (1000 * 60 * 60 * 24 * 30));

  let decayMultiplier = 1;
  if (monthsAgo >= 12) decayMultiplier = 0.25;
  else if (monthsAgo >= 6) decayMultiplier = 0.5;
  else if (monthsAgo >= 1) decayMultiplier = Math.max(0.5, 1 - (monthsAgo * 0.05));

  const originalPenalty = breakdown.penalties;
  breakdown.penalties = Math.round(originalPenalty * decayMultiplier);
  breakdown.penalty_decay = originalPenalty - breakdown.penalties;
  score = score - originalPenalty + breakdown.penalties;
}
```

### Task 5B.4: Trigger Streak Update on Shift Completion

**Find** where shift status changes to 'completed' and add:

```javascript
// Update staff streak
if (newStatus === 'completed') {
  await supabase.rpc('update_staff_streak', {
    p_staff_id: shift.assigned_staff_id,
    p_completed: true
  });
} else if (newStatus === 'no_show' || newStatus === 'cancelled_by_staff') {
  await supabase.rpc('update_staff_streak', {
    p_staff_id: shift.assigned_staff_id,
    p_completed: false
  });
}
```

---

## 🧪 PHASE 5 TESTING

### Phase 5A Tests
- [ ] Navigate to /my-score → page loads
- [ ] Score displays correctly (matches staff.reliability_score)
- [ ] Breakdown shows all categories
- [ ] "How to improve" tips appear
- [ ] Empty badges message shows if no badges

### Phase 5B Tests
- [ ] Complete a shift → current_streak increments
- [ ] Staff with 3+ streak → +10 streak_bonus in breakdown
- [ ] Set last_incident_date to 6 months ago → penalty reduced 50%
- [ ] Score still capped at 0-100

---

## 📚 REFERENCE: Availability Schema

```json
// staff.availability column (JSONB)
{
  "monday": ["day", "night"],
  "tuesday": ["day"],
  "wednesday": [],
  "thursday": ["night"],
  "friday": ["day", "night"],
  "saturday": [],
  "sunday": []
}
```

## 📚 REFERENCE: Shift Types
- `day`: start_time < 20:00 AND end_time > 08:00
- `night`: start_time >= 20:00 OR end_time <= 08:00

