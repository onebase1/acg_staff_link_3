# MODULE 6: Cron Jobs Command Center

**Status:** 🔴 NOT STARTED
**Priority:** MVP CRITICAL
**Estimated Time:** 4-6 hours
**Risk Level:** Low
**Dependencies:** None (can start immediately)

---

## 🎯 MISSION OBJECTIVE

**Problem:** Only 4 of 64 Edge Functions are scheduled on cron (6% automation). The remaining 58 functions require manual triggers.

**Solution:** 
1. Audit all 64 Edge Functions to identify which need scheduling
2. Create cron jobs for all automation-worthy functions
3. Build admin UI to monitor and control cron jobs

**End State:** 80%+ of Edge Functions running autonomously on schedule.

---

## 📊 CURRENT STATE

### Scheduled (4 functions):
1. `shift-reminder-engine` - Hourly
2. `post-shift-timesheet-reminder` - Hourly  
3. `compliance-monitor` - Daily 8am
4. `email-automation-engine` - Every 5 min

### NOT Scheduled (58+ functions):
- `auto-invoice-generator` - Should run weekly
- `payment-reminder-engine` - Should run daily
- `no-show-detection-engine` - Should run hourly
- `daily-shift-closure-engine` - Should run daily midnight
- `staff-daily-digest-engine` - Should run daily 7am
- `notification-digest-engine` - Should run every 15 min
- `smart-escalation-engine` - Should run hourly
- `intelligent-timesheet-validator` - Should run hourly
- `auto-timesheet-creator` - Should run hourly
- ...and 49 more

---

## 📦 DELIVERABLES

### Phase 1: Audit & Classify (1 hour)
- [ ] Scan all 64 Edge Functions in `supabase/functions/`
- [ ] Classify each as: Cron, Manual, Webhook, API, Event-Driven
- [ ] Create `EDGE_FUNCTIONS_CLASSIFICATION.json`

### Phase 2: Create Cron Jobs (2 hours)
- [ ] Create migration file with all new cron jobs
- [ ] File: `supabase/migrations/YYYYMMDD_add_cron_jobs_phase2.sql`
- [ ] Include at least 20 high-priority functions

### Phase 3: Build Command Center UI (2-3 hours)
- [ ] Create `src/pages/CronCommandCenter.jsx`
- [ ] Add to SuperAdmin navigation
- [ ] Features:
  - View all cron jobs with status
  - Enable/disable with one click
  - View last 10 executions per job
  - Manual trigger button for testing
  - Failure alerts

---

## 🔧 FILES AFFECTED

### Create:
- `supabase/migrations/20251217_cron_jobs_expansion.sql`
- `src/pages/CronCommandCenter.jsx`
- `agent_missions/MODULE_6_CRON_COMMAND_CENTER/EDGE_FUNCTIONS_CLASSIFICATION.json`

### Modify:
- `src/App.jsx` - Add route
- `src/pages/Layout.jsx` - Add navigation (SuperAdmin only)

### No Impact:
- All other files remain untouched

---

## 🔙 ROLLBACK PLAN

If issues occur:
1. Run: `SELECT cron.unschedule('job-name');` for each new job
2. Remove route from App.jsx
3. Delete CronCommandCenter.jsx
4. Revert migration (jobs are additive, removal is safe)

---

## ✅ SUCCESS CRITERIA

- [ ] 25+ Edge Functions scheduled on cron
- [ ] Command Center UI accessible at `/admin/cron-command-center`
- [ ] Can view all jobs with status
- [ ] Can enable/disable jobs
- [ ] Can manually trigger any job
- [ ] No existing functionality broken

---

## 📞 AGENT HANDOFF

**To Start:** Read IMPLEMENTATION.md, follow step-by-step
**When Done:** Update PROGRESS.md to 100%, note any issues
**Next Module:** MODULE_7 (Edge Function Health Monitor)

