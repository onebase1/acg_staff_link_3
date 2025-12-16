# 🔄 Rollback Instructions - Phase 2 Automation

## Quick Rollback (Disable Automation, Keep Manual)

If Phase 2 automation causes issues, you can instantly disable it while keeping Phase 1 manual multi-select:

### Option 1: Disable Cron Only (Recommended)

**Run in Supabase Dashboard → SQL Editor:**

```sql
-- Disable auto-broadcaster cron job
SELECT cron.unschedule('auto-urgent-digest-broadcaster');

-- Verify it's disabled
SELECT * FROM cron.job WHERE jobname = 'auto-urgent-digest-broadcaster';
-- Should return 0 rows
```

**Result:**
- ✅ Automation stops immediately
- ✅ Shifts still get `pending_broadcast=true` flag (harmless)
- ✅ Manual "Broadcast Selected" button still works perfectly
- ✅ Can re-enable later by running setup-auto-broadcaster-cron.sql again

---

## Full Rollback (Remove All Phase 2 Changes)

If you want to completely remove all Phase 2 automation:

### Step 1: Disable Cron Job

```sql
SELECT cron.unschedule('auto-urgent-digest-broadcaster');
```

### Step 2: Remove Database Column (Optional)

```sql
-- Drop pending_broadcast column
ALTER TABLE shifts DROP COLUMN IF EXISTS pending_broadcast;

-- Drop index
DROP INDEX IF EXISTS idx_shifts_pending_broadcast;
```

### Step 3: Restore Original PostShiftV2.jsx

```bash
# Restore from git (if committed)
cd /c/Users/gbase/AiAgency/ACG_BASE/agc_latest3
git checkout src/pages/PostShiftV2.jsx

# OR manually remove these lines from PostShiftV2.jsx (lines 353-355):
# pending_broadcast: shiftData.urgency === 'urgent' || shiftData.urgency === 'critical',
# marketplace_visible: true,
```

### Step 4: Restore Original Shifts.jsx (Optional)

If you want to remove multi-select checkboxes:

```bash
# Restore from backup
cd /c/Users/gbase/AiAgency/ACG_BASE/agc_latest3/src/pages
cp Shifts.jsx.backup-20251216-035851 Shifts.jsx
```

**Result:** Complete rollback to pre-Phase 1 state

---

## Backup Files Created

All modifications have backup files for instant rollback:

| Original File | Backup Location | Purpose |
|---|---|---|
| `Shifts.jsx` | `Shifts.jsx.backup-20251216-035851` | Manual multi-select checkboxes |
| `PostShiftV2.jsx` | Git history | Auto-flagging urgent shifts |

---

## Testing Rollback

After rollback, verify:

1. **Cron disabled:**
```sql
SELECT * FROM cron.job WHERE jobname = 'auto-urgent-digest-broadcaster';
-- Should return 0 rows
```

2. **Manual broadcast still works:**
- Go to Shifts page
- Check boxes next to urgent shifts
- Click "Broadcast Selected"
- Verify staff receive digest email

3. **New shifts work:**
- Create urgent shift in PostShiftV2
- Verify it's created successfully
- If `pending_broadcast` column removed: no errors
- If column still exists: shifts get `pending_broadcast=false` (harmless)

---

## Re-Enable Automation

To turn automation back on after rollback:

```bash
# 1. Re-run cron setup
# In Supabase Dashboard → SQL Editor:
# Paste contents of setup-auto-broadcaster-cron.sql

# 2. Verify cron is active
SELECT * FROM cron.job WHERE jobname = 'auto-urgent-digest-broadcaster';
```

---

## Emergency Contacts

If rollback doesn't work:

1. **Check cron jobs:**
```sql
SELECT * FROM cron.job;
```

2. **Check edge functions:**
```bash
supabase functions list --project-ref rzzxxkppkiasuouuglaf
```

3. **Manual database fix:**
```sql
-- Clear all pending_broadcast flags
UPDATE shifts SET pending_broadcast = false WHERE pending_broadcast = true;
```

---

## What to Report

If you need to rollback and report issues, please provide:

1. **Error messages** from browser console
2. **Edge function logs:**
```bash
supabase functions logs auto-urgent-digest-broadcaster --project-ref rzzxxkppkiasuouuglaf
```
3. **Cron execution history:**
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-urgent-digest-broadcaster')
ORDER BY start_time DESC LIMIT 10;
```
4. **Description** of what went wrong

---

## Files to Keep/Delete After Rollback

**Keep These (for documentation):**
- `PHASE_2_AUTOMATION_PLAN.md` - Future reference
- `ROLLBACK_INSTRUCTIONS.md` - This file
- `setup-auto-broadcaster-cron.sql` - If you want to re-enable later

**Safe to Delete:**
- `add-pending-broadcast-column.sql` - One-time use
- `add-pending-broadcast.mjs` - One-time use
- `auto-urgent-digest-broadcaster/` - If you never want automation
- `Shifts.jsx.backup-*` - After confirming manual mode works

---

## Rollback Decision Tree

```
Is automation causing issues?
│
├─ YES, but I like multi-select manual broadcast
│  └─ Disable cron only (Option 1)
│     ✅ Manual "Broadcast Selected" still works
│
├─ YES, and I want original individual broadcast
│  └─ Full rollback (Steps 1-4)
│     ✅ Back to one-shift-at-a-time notifications
│
└─ NO, automation works great!
   └─ Do nothing, enjoy zero-intervention broadcasting! 🎉
```

---

**Last Updated:** 2025-12-16
**Backup Created:** 2025-12-16 03:58:51
**Tested:** ✅ Rollback procedures verified
