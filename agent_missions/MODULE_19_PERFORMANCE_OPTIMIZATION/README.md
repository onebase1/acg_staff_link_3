# MODULE 19: Performance Optimization

**Status:** 🔴 NOT STARTED
**Priority:** HIGH
**Estimated Time:** 6-8 hours
**Risk Level:** Low
**Dependencies:** None

---

## 🎯 MISSION OBJECTIVE

**Problem:** App performance degrades with scale:
- Large shift lists load slowly
- Dashboard queries are expensive
- No query optimization
- No caching strategy

**Solution:**
Systematic performance optimization across the stack.

**End State:** Sub-second page loads even with 10,000+ records.

---

## 📊 OPTIMIZATION TARGETS

| Area | Current | Target | Method |
|------|---------|--------|--------|
| Dashboard Load | ~3s | <1s | Materialized views |
| Shift List (1000) | ~2s | <500ms | Pagination + indexes |
| Staff Search | ~1s | <200ms | Full-text search |
| Report Generation | ~10s | <3s | Background jobs |

---

## 📦 DELIVERABLES

### Phase 1: Database Optimization (2 hours)
- [ ] Audit existing indexes
- [ ] Add missing indexes on foreign keys
- [ ] Add composite indexes for common queries
- [ ] Create materialized views for dashboards
- [ ] Schedule view refresh

### Phase 2: Query Optimization (2 hours)
- [ ] Identify slow queries (pg_stat_statements)
- [ ] Optimize top 10 slowest queries
- [ ] Add query result caching
- [ ] Implement cursor-based pagination

### Phase 3: Frontend Optimization (2 hours)
- [ ] Implement React Query caching
- [ ] Add stale-while-revalidate
- [ ] Lazy load heavy components
- [ ] Virtualize long lists
- [ ] Optimize bundle size

### Phase 4: Monitoring (2 hours)
- [ ] Add performance logging
- [ ] Create performance dashboard
- [ ] Set up alerts for slow queries
- [ ] Track Core Web Vitals

---

## 📋 KEY INDEXES TO ADD

```sql
-- Shifts table
CREATE INDEX idx_shifts_agency_date ON shifts(agency_id, date);
CREATE INDEX idx_shifts_status_date ON shifts(status, date);
CREATE INDEX idx_shifts_staff_date ON shifts(assigned_staff_id, date);

-- Timesheets table
CREATE INDEX idx_timesheets_shift ON timesheets(shift_id);
CREATE INDEX idx_timesheets_status ON timesheets(status);

-- Staff table
CREATE INDEX idx_staff_agency ON staff(agency_id);
CREATE INDEX idx_staff_search ON staff USING gin(to_tsvector('english', first_name || ' ' || last_name));
```

---

## 📋 MATERIALIZED VIEWS

```sql
-- Dashboard summary (refresh every 5 min)
CREATE MATERIALIZED VIEW dashboard_summary AS
SELECT 
    agency_id,
    COUNT(*) FILTER (WHERE date = CURRENT_DATE) as shifts_today,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_timesheets,
    COUNT(*) FILTER (WHERE status = 'unpaid') as unpaid_invoices
FROM shifts s
LEFT JOIN timesheets t ON s.id = t.shift_id
LEFT JOIN invoices i ON s.id = i.shift_id
GROUP BY agency_id;
```

---

## ✅ SUCCESS CRITERIA

- [ ] Dashboard loads in <1s
- [ ] Shift list loads in <500ms
- [ ] No query takes >1s
- [ ] Bundle size reduced 20%
- [ ] Core Web Vitals green
- [ ] Performance monitoring active

---

## 📞 AGENT HANDOFF

**To Start:** Run EXPLAIN ANALYZE on slow queries
**When Done:** Benchmark before/after
**Next Module:** MODULE_20 (Error Boundary System)

