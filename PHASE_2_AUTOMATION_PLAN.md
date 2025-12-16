# Phase 2: Zero-Intervention Urgent Shift Automation

## 🎯 Goal
**Eliminate all manual intervention for urgent shift notifications** by implementing automatic batching and broadcasting.

## 📋 Current State (Phase 1 - Manual Multi-Select)

**Workflow:**
1. Admin posts urgent shift #1 in PostShiftV2
2. Admin posts urgent shift #2 in PostShiftV2
3. Admin posts urgent shift #3 in PostShiftV2
4. Admin goes to Shifts page
5. Admin checks boxes next to shifts #1, #2, #3
6. Admin clicks **"Broadcast Selected (3)"** button
7. System calls `smart-marketplace-digest([shift-1, shift-2, shift-3])`
8. Staff get **ONE email** showing all 3 eligible shifts ✅

**Pros:**
- ✅ Full admin control over which shifts to broadcast
- ✅ Works immediately (implemented in Phase 1)
- ✅ No delays
- ✅ Clear UX with visual feedback

**Cons:**
- ❌ Requires manual human action
- ❌ Admin might forget to broadcast
- ❌ Not scalable for high-volume agencies

---

## 🤖 Future State (Phase 2 - Automated Batching)

**Workflow:**
```
10:00 AM - Admin posts urgent shift #1 → pending_broadcast=true
10:02 AM - Admin posts urgent shift #2 → pending_broadcast=true
10:04 AM - Admin posts urgent shift #3 → pending_broadcast=true

10:05 AM - CRON JOB FIRES (every 5 minutes)
          → Finds all shifts where pending_broadcast=true
          → Groups by agency_id
          → Calls smart-marketplace-digest([1,2,3]) for each agency
          → Staff get ONE email with all 3 shifts ✅
          → Updates broadcast_sent_at, pending_broadcast=false
```

**Benefits:**
- ✅ **Zero human intervention** - fully automated
- ✅ **Batches multiple shifts** into one digest
- ✅ **5-minute max delay** (acceptable for urgent, not critical)
- ✅ **Scales effortlessly** - handles 1 shift or 100 shifts
- ✅ **Respects eligibility** - reuses marketplace filtering logic
- ✅ **Multi-channel** - SMS, WhatsApp, Email in parallel

**Trade-offs:**
- ⏱️ **5-minute delay** vs instant manual broadcast
- **Solution:** Keep manual "Broadcast Now" button for CRITICAL same-day shifts

---

## 🏗️ Implementation Steps

### Step 1: Database Schema Change

Add `pending_broadcast` column to track shifts awaiting auto-broadcast:

```sql
-- Add pending_broadcast column to shifts table
ALTER TABLE shifts ADD COLUMN pending_broadcast BOOLEAN DEFAULT FALSE;

-- Create index for fast lookup
CREATE INDEX idx_shifts_pending_broadcast
ON shifts(pending_broadcast, broadcast_sent_at)
WHERE pending_broadcast = true AND broadcast_sent_at IS NULL;
```

### Step 2: Update PostShiftV2.jsx

Auto-flag urgent shifts for broadcast when created:

```javascript
// In createShiftMutation (PostShiftV2.jsx line 342)
const { data: newShift, error: shiftError } = await supabase
  .from('shifts')
  .insert({
    ...restData,
    date: date,
    start_time: start_time,
    end_time: end_time,
    shift_type: shift_type,
    agency_id: agencyId,
    status: 'open',

    // ✅ AUTO-FLAG FOR BROADCAST
    pending_broadcast: shiftData.urgency === 'urgent' || shiftData.urgency === 'critical',
    marketplace_visible: true, // Auto-add to marketplace

    shift_journey_log: [{
      state: 'created',
      timestamp: new Date().toISOString(),
      user_id: user?.id,
      method: 'manual'
    }],
    created_date: new Date().toISOString()
  })
```

### Step 3: Create Auto-Broadcaster Edge Function

**File:** `supabase/functions/auto-urgent-digest-broadcaster/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 🤖 AUTO URGENT DIGEST BROADCASTER
 *
 * Runs via cron every 5 minutes
 * Finds all pending urgent shifts and broadcasts them in batches per agency
 * Zero human intervention required
 */

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    console.log('🤖 [Auto Broadcaster] Starting cron job...');

    // Find all pending urgent shifts
    const { data: pendingShifts, error: fetchError } = await supabase
      .from('shifts')
      .select('*')
      .eq('pending_broadcast', true)
      .is('broadcast_sent_at', null)
      .in('urgency', ['urgent', 'critical']);

    if (fetchError) throw fetchError;

    if (!pendingShifts || pendingShifts.length === 0) {
      console.log('✅ [Auto Broadcaster] No pending shifts to broadcast');
      return new Response(JSON.stringify({ success: true, broadcasted: 0 }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log(`📋 [Auto Broadcaster] Found ${pendingShifts.length} pending shifts`);

    // Group shifts by agency
    const shiftsByAgency = pendingShifts.reduce((acc, shift) => {
      if (!acc[shift.agency_id]) {
        acc[shift.agency_id] = [];
      }
      acc[shift.agency_id].push(shift);
      return acc;
    }, {});

    const results = [];

    // For each agency, call smart-marketplace-digest
    for (const [agencyId, shifts] of Object.entries(shiftsByAgency)) {
      try {
        console.log(`📡 [Auto Broadcaster] Broadcasting ${shifts.length} shifts for agency ${agencyId}`);

        const shiftIds = shifts.map(s => s.id);

        // Call smart-marketplace-digest
        const { data, error } = await supabase.functions.invoke('smart-marketplace-digest', {
          body: {
            shift_ids: shiftIds,
            agency_id: agencyId
          }
        });

        if (error) throw error;

        if (data.skipped) {
          console.log(`⏭️ [Auto Broadcaster] Agency ${agencyId} has smart digest disabled`);
          continue;
        }

        // Update shifts as broadcast
        const { error: updateError } = await supabase
          .from('shifts')
          .update({
            broadcast_sent_at: new Date().toISOString(),
            pending_broadcast: false,
            marketplace_visible: true
          })
          .in('id', shiftIds);

        if (updateError) throw updateError;

        console.log(`✅ [Auto Broadcaster] Agency ${agencyId}: Notified ${data.results.staffNotified} staff`);

        results.push({
          agency_id: agencyId,
          shifts_count: shifts.length,
          staff_notified: data.results.staffNotified,
          notifications_sent: data.results.totalNotificationsSent
        });

      } catch (err) {
        console.error(`❌ [Auto Broadcaster] Failed for agency ${agencyId}:`, err.message);
        results.push({
          agency_id: agencyId,
          error: err.message
        });
      }
    }

    console.log('🎉 [Auto Broadcaster] Cron job complete');

    return new Response(JSON.stringify({
      success: true,
      broadcasted: results.length,
      results: results
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('❌ [Auto Broadcaster] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
```

### Step 4: Deploy Edge Function

```bash
cd C:\Users\gbase\superbasecli
supabase functions deploy auto-urgent-digest-broadcaster --project-ref rzzxxkppkiasuouuglaf --no-verify-jwt
```

### Step 5: Schedule Cron Job

Create cron schedule in Supabase database:

```sql
-- Schedule auto-broadcaster to run every 5 minutes
SELECT cron.schedule(
  'auto-urgent-digest-broadcaster',
  '*/5 * * * *',  -- Every 5 minutes: */5 = every 5, * * * * = minutes hours days months weekdays
  $$
  SELECT
    net.http_post(
      url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/auto-urgent-digest-broadcaster',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || current_setting('app.settings.service_role_key', true)
      )
    ) AS request_id;
  $$
);

-- Verify cron job created
SELECT * FROM cron.job WHERE jobname = 'auto-urgent-digest-broadcaster';
```

**Alternative:** Use Supabase Dashboard → Database → Cron Jobs → Create New Job

### Step 6: Enable Service Role Key Access

Ensure the cron job has access to service role key:

```sql
-- Set service role key for cron jobs
ALTER DATABASE postgres SET app.settings.service_role_key TO 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo';
```

### Step 7: Add Manual Override (Optional)

Keep the manual "Broadcast Selected" button for emergency same-day critical shifts:

**In Shifts.jsx:** The current implementation already supports manual override. It will work alongside automation.

---

## 🧪 Testing Plan

### Test 1: Single Urgent Shift
1. Create 1 urgent shift at 10:00
2. Wait until 10:05 (next cron run)
3. Verify staff receive digest email
4. Check shift: `broadcast_sent_at` should be set, `pending_broadcast` should be false

### Test 2: Multiple Urgent Shifts (Batching)
1. Create 3 urgent shifts at 10:00, 10:02, 10:04
2. Wait until 10:05 (next cron run)
3. Verify staff receive **ONE digest email** with all 3 shifts
4. Check all shifts have `broadcast_sent_at` set

### Test 3: Multi-Agency Isolation
1. Create 2 urgent shifts for Agency A
2. Create 2 urgent shifts for Agency B
3. Wait for cron
4. Verify Agency A staff get digest with 2 shifts
5. Verify Agency B staff get digest with 2 shifts (isolated)

### Test 4: Manual Override
1. Create 1 critical shift
2. Don't wait for cron - immediately click "Broadcast Selected"
3. Verify immediate broadcast (no wait)
4. Verify shift is updated (not re-broadcast by cron)

---

## 📊 Monitoring & Observability

### View Cron Job Logs
```bash
# Check cron execution history
SELECT * FROM cron.job_run_details
WHERE jobname = 'auto-urgent-digest-broadcaster'
ORDER BY start_time DESC
LIMIT 10;

# Check edge function logs
supabase functions logs auto-urgent-digest-broadcaster --project-ref rzzxxkppkiasuouuglaf
```

### Key Metrics
- **Shifts broadcast per run**: How many shifts auto-broadcast
- **Staff notified per run**: Total staff reached
- **Channel breakdown**: SMS vs WhatsApp vs Email
- **Failures**: Any errors during broadcast

### Alerts
Set up monitoring for:
- Cron job failures (via Supabase Dashboard)
- High pending_broadcast count (shifts piling up)
- Broadcast errors in logs

---

## 🔄 Rollback Strategy

If Phase 2 automation causes issues, rollback is simple:

### Quick Rollback (Disable Cron Only)
```sql
-- Disable cron job (keeps code deployed)
SELECT cron.unschedule('auto-urgent-digest-broadcaster');
```
Result: Shifts still flagged as `pending_broadcast`, but not auto-broadcast. Manual broadcast still works.

### Full Rollback (Remove Everything)
```sql
-- 1. Delete cron job
SELECT cron.unschedule('auto-urgent-digest-broadcaster');

-- 2. Remove pending_broadcast column (optional)
ALTER TABLE shifts DROP COLUMN IF EXISTS pending_broadcast;
```

Phase 1 manual multi-select will continue to work normally.

---

## 🚀 Deployment Checklist

- [ ] **Step 1:** Add `pending_broadcast` column to database
- [ ] **Step 2:** Update PostShiftV2.jsx to auto-flag urgent shifts
- [ ] **Step 3:** Create `auto-urgent-digest-broadcaster` edge function
- [ ] **Step 4:** Deploy edge function to Supabase
- [ ] **Step 5:** Create cron schedule (every 5 minutes)
- [ ] **Step 6:** Configure service role key access
- [ ] **Step 7:** Test with single shift
- [ ] **Step 8:** Test with multiple shifts (batching)
- [ ] **Step 9:** Monitor first week for issues
- [ ] **Step 10:** Adjust cron interval if needed (3 min vs 5 min vs 10 min)

---

## ⏱️ Cron Interval Options

**3 minutes:** Faster broadcasts, more frequent function calls
```sql
'*/3 * * * *'  -- Every 3 minutes
```

**5 minutes (Recommended):** Good balance
```sql
'*/5 * * * *'  -- Every 5 minutes
```

**10 minutes:** Slower but less resource usage
```sql
'*/10 * * * *'  -- Every 10 minutes
```

**15 minutes:** Very conservative
```sql
'*/15 * * * *'  -- Every 15 minutes
```

---

## 🎯 Success Criteria

**Phase 2 is successful when:**
1. ✅ Admin creates urgent shifts in PostShiftV2
2. ✅ Shifts auto-flagged with `pending_broadcast=true`
3. ✅ Cron runs every 5 minutes
4. ✅ Staff receive ONE consolidated digest per batch
5. ✅ Zero manual intervention required
6. ✅ Manual "Broadcast Selected" button still works for emergencies
7. ✅ 95%+ delivery success rate across channels
8. ✅ No duplicate broadcasts

---

## 📝 Future Enhancements (Phase 3+)

- **Smart Timing:** Adjust cron interval based on time of day (e.g., 2 min during peak hours 8am-6pm, 10 min at night)
- **Predictive Batching:** If admin creates 1 shift, wait 2 minutes before broadcasting (in case they create more)
- **Priority Queues:** CRITICAL shifts broadcast immediately, URGENT batch every 5 min
- **Analytics Dashboard:** Real-time view of pending shifts, broadcast stats
- **Webhook Integration:** Push to n8n for advanced workflows
- **Staff Preferences:** Allow staff to set digest frequency (immediate vs batched)

---

**Status:** 📋 **Planning Complete** - Ready for implementation post-MVP

**Priority:** 🟢 **Medium** - Phase 1 manual multi-select sufficient for MVP

**Estimated Effort:** 4-6 hours (including testing)

**Dependencies:**
- Phase 1 must be stable
- smart-marketplace-digest function working reliably
- Supabase pg_cron extension enabled
