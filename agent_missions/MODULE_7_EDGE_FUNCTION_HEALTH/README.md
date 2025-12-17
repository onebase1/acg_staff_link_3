# MODULE 7: Edge Function Health Monitor

**Status:** 🔴 NOT STARTED
**Priority:** MVP CRITICAL
**Estimated Time:** 6-8 hours
**Risk Level:** Low
**Dependencies:** None (but pairs well with MODULE_6)

---

## 🎯 MISSION OBJECTIVE

**Problem:** 64 Edge Functions deployed with ZERO visibility into health. You don't know:
- Which functions are failing
- Which haven't run in weeks (orphaned)
- Average execution times
- Error rates

**Solution:**
1. Create centralized logging table for all Edge Function invocations
2. Add logging wrapper to all Edge Functions
3. Build health dashboard showing real-time status
4. Configure alerts for failures

**End State:** Real-time visibility into all 64 Edge Functions with automated alerting.

---

## 📊 ARCHITECTURE

```
┌─────────────────────┐
│   Edge Function     │
│  (any of 64)        │
└─────────┬───────────┘
          │ Log on start/end
          ▼
┌─────────────────────┐
│ edge_function_logs  │ ◄── Database Table
│ - function_name     │
│ - started_at        │
│ - completed_at      │
│ - status (ok/error) │
│ - error_message     │
│ - execution_ms      │
└─────────┬───────────┘
          │ Aggregated by
          ▼
┌─────────────────────┐
│ edge_function_health│ ◄── Materialized View
│ - function_name     │
│ - last_success      │
│ - last_failure      │
│ - success_rate_24h  │
│ - avg_execution_ms  │
│ - health_status     │
└─────────┬───────────┘
          │ Displayed in
          ▼
┌─────────────────────┐
│ /admin/edge-health  │ ◄── React Dashboard
└─────────────────────┘
```

---

## 📦 DELIVERABLES

### Phase 1: Database Schema (1 hour)
- [ ] Create `edge_function_logs` table
- [ ] Create `edge_function_health` materialized view
- [ ] Create refresh function for view
- [ ] Schedule view refresh every 5 minutes

### Phase 2: Logging Utility (2 hours)
- [ ] Create shared logging utility in `supabase/functions/_shared/`
- [ ] Update 10 critical Edge Functions with logging
- [ ] Test logging works correctly

### Phase 3: Health Dashboard UI (3-4 hours)
- [ ] Create `src/pages/EdgeFunctionHealth.jsx`
- [ ] Show all 64 functions with health status
- [ ] Color coding: Green (healthy), Yellow (warning), Red (failing)
- [ ] Click to see execution history
- [ ] Filter by status, search by name

### Phase 4: Alerting (1 hour)
- [ ] Create alert rules in database
- [ ] Send email on Red status
- [ ] Send daily health summary

---

## 🔧 FILES AFFECTED

### Create:
- `supabase/migrations/20251217_edge_function_health.sql`
- `supabase/functions/_shared/logger.ts`
- `src/pages/EdgeFunctionHealth.jsx`

### Modify:
- 10 critical Edge Functions (add logging calls)
- `src/App.jsx` - Add route
- `src/pages/Layout.jsx` - Add navigation

### No Impact:
- All other files remain untouched

---

## ✅ SUCCESS CRITERIA

- [ ] `edge_function_logs` table created
- [ ] `edge_function_health` view created and refreshing
- [ ] 10+ Edge Functions logging executions
- [ ] Dashboard shows all 64 functions
- [ ] Health status colors correct
- [ ] Execution history viewable
- [ ] Alerts configured for failures

---

## 📞 AGENT HANDOFF

**To Start:** Read IMPLEMENTATION.md, begin with Phase 1
**When Done:** Update PROGRESS.md, note any patterns discovered
**Next Module:** MODULE_8 (Shift State Machine)

