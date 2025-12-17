# MODULE 16: Multi-Tenant Agency Health Dashboard

**Status:** 🔴 NOT STARTED
**Priority:** HIGH
**Estimated Time:** 5-6 hours
**Risk Level:** Low
**Dependencies:** None

---

## 🎯 MISSION OBJECTIVE

**Problem:** No visibility into per-agency health:
- Which agencies are active vs dormant?
- Which agencies have issues?
- Which agencies need attention?
- No early warning for churn

**Solution:**
Build agency health dashboard with key metrics per agency.

**End State:** SuperAdmin can see health of all agencies at a glance.

---

## 📊 AGENCY HEALTH METRICS

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| **Active Shifts (7d)** | >10 | 1-10 | 0 |
| **Staff Utilization** | >70% | 40-70% | <40% |
| **Timesheet Completion** | >90% | 70-90% | <70% |
| **Invoice Payment Rate** | >80% | 60-80% | <60% |
| **Last Login** | <7 days | 7-30 days | >30 days |
| **Compliance Score** | >90% | 70-90% | <70% |

---

## 📦 DELIVERABLES

### Phase 1: Database Schema (1 hour)
- [ ] Create `agency_health_metrics` table
- [ ] Create health calculation function
- [ ] Schedule daily calculation

### Phase 2: Metrics Collector (2 hours)
- [ ] Create `agency-health-collector` Edge Function
- [ ] Calculate all 6 metrics per agency
- [ ] Store daily snapshots
- [ ] Calculate overall health score

### Phase 3: Dashboard UI (2-3 hours)
- [ ] Create `src/pages/AgencyHealth.jsx`
- [ ] List all agencies with health scores
- [ ] Color-coded status badges
- [ ] Click for detailed metrics
- [ ] Historical trends
- [ ] Filter by status

---

## 🔧 DATABASE SCHEMA

```sql
CREATE TABLE agency_health_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID REFERENCES agencies(id),
    recorded_at DATE DEFAULT CURRENT_DATE,
    active_shifts_7d INTEGER,
    staff_utilization DECIMAL(5,2),
    timesheet_completion DECIMAL(5,2),
    invoice_payment_rate DECIMAL(5,2),
    days_since_login INTEGER,
    compliance_score DECIMAL(5,2),
    overall_health_score INTEGER,
    health_status TEXT CHECK (health_status IN ('green', 'yellow', 'red')),
    UNIQUE(agency_id, recorded_at)
);
```

---

## ✅ SUCCESS CRITERIA

- [ ] All agencies have health metrics
- [ ] Dashboard shows all agencies
- [ ] Status colors accurate
- [ ] Can identify at-risk agencies
- [ ] Historical trends visible
- [ ] Daily metrics updating

---

## 📞 AGENT HANDOFF

**To Start:** Query agencies table for count
**When Done:** Test with real agency data
**Next Module:** MODULE_17 (Compliance Automation)

