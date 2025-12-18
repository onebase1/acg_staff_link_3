# INVESTOR READINESS MODULES (29-31)
## Automated Platform Metrics & KPI Tracking

**Created:** December 18, 2025
**Status:** Ready for Execution
**Priority:** P2 (Execute after MVP stable with Dominion)
**Automation Level:** 🤖 99% Automated

---

## 🎯 Executive Summary

Build a fully automated investor-grade analytics system that tracks:
- **Revenue:** MRR, ARR, growth rates
- **Customers:** Active agencies, churn, retention
- **Profitability:** Gross margin, unit economics
- **Efficiency:** LTV:CAC ratio, burn rate, runway

**Key Innovation:** Zero manual data entry - all metrics auto-logged via database triggers and cron jobs.

---

## 📊 Module Breakdown

### MODULE 29: Usage Metrics Engine (Automated)
**Duration:** 4-6 hours | **Priority:** FOUNDATION

**Purpose:** Auto-log every platform event for KPI calculation

**Auto-Logged Events:**
- Shift posted/filled/cancelled
- Staff invited/activated
- Invoice generated (revenue tracking)
- Timesheet submitted

**Technical Approach:**
```sql
-- Database triggers fire on INSERT/UPDATE
-- Example: Shift posted trigger
CREATE TRIGGER trigger_log_shift_posted
  AFTER INSERT ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION log_shift_posted();
```

**Cron Jobs:**
- Daily aggregation (1 AM UTC)
- Monthly snapshots (2nd of month, 2 AM UTC)

**Zero Manual Work:** ✅ All logging happens automatically when users interact with the platform

**Key Deliverables:**
- `usage_metrics` table (event logging)
- `usage_metrics_summary` table (daily/monthly rollups)
- 5 database triggers (shift_posted, shift_filled, staff_invited, staff_activated, invoice_generated)
- 2 cron jobs (daily aggregation, cost allocation)
- RPC functions for dashboard queries

---

### MODULE 30: Unit Economics Dashboard
**Duration:** 5-7 hours | **Depends on:** MODULE 29

**Purpose:** Calculate per-agency profitability and unit economics

**Metrics Calculated:**
- **CAC (Customer Acquisition Cost):** Marketing + sales costs per agency
- **LTV (Lifetime Value):** Estimated revenue over 3-year period
- **LTV:CAC Ratio:** Target >3:1 for investor attractiveness
- **Gross Margin %:** (Revenue - Costs) / Revenue
- **Break-even Timeline:** Months to recover acquisition costs

**Technical Approach:**
```sql
-- Auto-calculated view (no manual updates)
CREATE VIEW agency_unit_economics AS
SELECT
  agency_id,
  total_revenue,
  total_costs,
  lifetime_profit,
  gross_margin_percent,
  cac,
  estimated_ltv,
  ltv_cac_ratio
FROM ...
```

**Frontend Enhancement:**
- Add "Unit Economics" tab to existing [OperationalCosts.jsx](../src/pages/OperationalCosts.jsx)
- Agency profitability table with health scores
- Platform-wide summary cards

**Key Deliverables:**
- `agency_unit_economics` view (auto-calculated)
- `get_unit_economics()` RPC function
- Cost allocation system (shared costs distributed proportionally)
- Enhanced OperationalCosts dashboard with new tab
- Health score logic (Healthy/Growing/At Risk/New)

---

### MODULE 31: Investor KPI Dashboard
**Duration:** 6-8 hours | **Depends on:** MODULE 29, 30

**Purpose:** Executive one-page dashboard for investor pitches

**6 Core KPIs:**
1. **MRR/ARR** - Monthly/Annual Recurring Revenue
2. **Customer Growth** - Active agencies, new vs churned
3. **Gross Margin %** - Platform profitability
4. **LTV:CAC Ratio** - Unit economics health
5. **Net Retention Rate** - Expansion revenue indicator
6. **Burn Rate & Runway** - Cash management

**Dashboard Features:**
- Real-time KPI cards with trend indicators
- 12-month historical charts (MRR, customers, margin, LTV:CAC)
- Health alerts (margin <20%, runway <6 months)
- Auto-refresh every 5 minutes
- PDF export for investor decks

**Technical Approach:**
```javascript
// React component with auto-refresh
const { data: kpis } = useQuery({
  queryKey: ['investor-kpis'],
  queryFn: async () => {
    return await supabase.rpc('get_investor_kpis', {...});
  },
  refetchInterval: 5 * 60 * 1000 // 5 minutes
});
```

**Key Deliverables:**
- `get_investor_kpis()` RPC function (calculates all KPIs in one query)
- `investor_kpi_snapshots` table (monthly historical data)
- Monthly snapshot cron job
- New page: [src/pages/InvestorKPIDashboard.jsx](../src/pages/InvestorKPIDashboard.jsx)
- Recharts integration for trend visualization
- PDF export capability

---

## 🚀 Execution Timeline

```
Day 1-2: MODULE 29 (Usage Metrics Engine)
  ├── Create tables & triggers
  ├── Set up cron jobs
  ├── Test event logging
  └── Validate data accuracy

Day 3-4: MODULE 30 & 31 (CAN PARALLELIZE)
  ├── [Agent 1] MODULE 30: Unit Economics
  │   ├── Create view & RPC functions
  │   ├── Enhance OperationalCosts.jsx
  │   └── Test profitability calculations
  │
  └── [Agent 2] MODULE 31: Investor KPI Dashboard
      ├── Create KPI functions & snapshots table
      ├── Build InvestorKPIDashboard.jsx
      ├── Add charts with Recharts
      └── Test with real data

Day 5: Integration Testing
  ├── Verify all triggers firing correctly
  ├── Validate KPI calculations
  ├── Test dashboard performance
  └── Review with user for investor pitch readiness
```

**Total Time:** 15-21 hours (can be split across multiple sessions)

---

## 🤖 Automation Summary

| **Activity** | **Automation Method** | **Manual Work** |
|--------------|----------------------|-----------------|
| Event logging | Database triggers | ❌ ZERO |
| Daily aggregation | Cron job (1 AM UTC) | ❌ ZERO |
| Monthly snapshots | Cron job (2nd of month) | ❌ ZERO |
| Revenue tracking | Trigger on invoice creation | ❌ ZERO |
| Cost allocation | Cron job (proportional distribution) | ⚠️ MINIMAL (select cost type in form) |
| KPI calculation | Database views & RPC functions | ❌ ZERO |
| Dashboard refresh | React Query auto-refresh (5 min) | ❌ ZERO |
| Charts generation | Recharts library (auto) | ❌ ZERO |
| Health alerts | Frontend logic (auto) | ❌ ZERO |
| PDF export | Button click | ⚠️ 1 CLICK |

**Result:** 🎉 **99% Automated** - Only PDF export requires user action

---

## 💡 Key Investor Questions This Answers

When pitching to investors, this dashboard provides instant answers to:

1. **"How much revenue do you have?"**
   → MRR: £X,XXX | ARR: £XXX,XXX (with growth %)

2. **"Are you growing?"**
   → Customer chart showing month-over-month growth
   → MRR growth trend (target: >20% MoM)

3. **"Are you profitable?"**
   → Gross margin % (target: >30%)
   → Net profit/loss this month

4. **"Do customers stick around?"**
   → Net retention rate (target: >100% if expansion revenue exists)
   → Churn rate per month

5. **"Is your customer acquisition sustainable?"**
   → LTV:CAC ratio (target: >3:1)
   → Average CAC & LTV per agency

6. **"How long can you operate?"**
   → Monthly burn rate
   → Runway in months (or "Profitable" if positive cash flow)

---

## 🎯 Success Metrics

### Week 1 (Post-Implementation)
- [ ] All database triggers fire correctly (100% event capture)
- [ ] Daily cron jobs run successfully
- [ ] Investor KPI dashboard loads < 3 seconds
- [ ] All 6 core KPIs calculate accurately
- [ ] Historical trend charts display (if data exists)

### Month 1
- [ ] Track 10,000+ platform events across all agencies
- [ ] Calculate accurate MRR/ARR for each agency
- [ ] Identify top 3 most profitable agencies
- [ ] Identify agencies "At Risk" (negative profit after 6 months)
- [ ] Measure platform-wide shift fill rate >70%

### Quarter 1
- [ ] Use dashboard in first investor pitch
- [ ] MRR growth >20% month-over-month
- [ ] Gross margin >30% platform-wide
- [ ] LTV:CAC ratio >3:1 for mature agencies (>12 months)
- [ ] Successfully demonstrate traction to investors
- [ ] Close seed funding round using dashboard data

---

## 🔗 Dependencies

### Technical
- ✅ PostgreSQL database (Supabase)
- ✅ pg_cron extension (already installed)
- ✅ Existing tables: `shifts`, `staff`, `agencies`, `profiles`, `operational_costs`
- ⚠️ Recharts library (install if needed: `npm install recharts`)
- ⚠️ jsPDF library (for PDF export: `npm install jspdf jspdf-autotable`)

### Business
- ⚠️ MODULE 21-28 completed and stable (recommended but not required)
- ⚠️ Real usage data (shifts posted, staff onboarded) for meaningful metrics
- ⚠️ At least 1 month of operational data for trend analysis

---

## ⚠️ Risks & Mitigations

| **Risk** | **Mitigation** |
|----------|----------------|
| Inaccurate revenue data | Verify triggers work correctly; backfill missing data if needed |
| Missing historical data for charts | Backfill `investor_kpi_snapshots` for past 12 months manually |
| LTV calculation too optimistic | Currently assumes 3-year retention; refine based on actual churn data |
| Investor questions data accuracy | Add "Data Sources" section to dashboard explaining calculations |
| Triggers impact performance | Monitor query time; consider async background job if needed |
| Cron jobs fail silently | Add email alerts on failure; check cron logs weekly |

---

## 🚀 Future Enhancements (Post-MVP)

1. **Cohort Analysis** → Track KPIs by agency signup month (Q1 2024 vs Q2 2024)
2. **Forecasting** → ML-based MRR prediction (6-month forecast using historical trends)
3. **Benchmarking** → Compare to SaaS industry standards (Stripe, ChartMogul benchmarks)
4. **Real-time Alerts** → Email/Slack when KPI crosses threshold (e.g., margin <20%)
5. **Investor Portal** → Read-only dashboard for board members with limited access
6. **Automated Weekly Digest** → Email summary to CEO every Monday
7. **A/B Testing Framework** → Track feature adoption and impact on KPIs
8. **Churn Prediction** → ML model to predict agency churn risk 90 days in advance

---

## 📋 Pre-Flight Checklist

Before starting MODULE 29:
- [ ] Modules 21-28 completed (recommended, not required)
- [ ] Database accessible and migrations can be run
- [ ] pg_cron extension verified (`SELECT * FROM cron.job;`)
- [ ] At least some operational data exists (shifts, staff)
- [ ] OperationalCosts.jsx page exists and working
- [ ] Super admin access available for testing

Before starting MODULE 30:
- [ ] MODULE 29 completed successfully
- [ ] `usage_metrics` table populated with events
- [ ] Test revenue data logged (verify with `SELECT * FROM usage_metrics WHERE event_type='invoice_generated';`)

Before starting MODULE 31:
- [ ] MODULE 29 completed successfully
- [ ] MODULE 30 completed (optional but recommended for full KPIs)
- [ ] Recharts library installed
- [ ] Historical data exists for trend charts (or backfill snapshots)

---

## 📞 Quick Start

### For Autonomous Agent Execution:

```bash
# 1. Navigate to project
cd C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3

# 2. Read MODULE 29 instructions
code agent_missions/MODULE_29_USAGE_METRICS_ENGINE/INSTRUCTIONS.md

# 3. Execute in sequence:
#    - MODULE 29 (Foundation)
#    - MODULE 30 & 31 (Can parallelize after M29)

# 4. Verify after each module:
#    - Check migration applied: SELECT * FROM usage_metrics LIMIT 1;
#    - Check cron jobs: SELECT * FROM cron.job;
#    - Test RPC functions: SELECT * FROM get_investor_kpis(...);
```

---

## 🎤 Investor Pitch Talking Points

Use this dashboard to communicate:

1. **"We're growing 20% MoM"**
   → Point to MRR growth trend chart

2. **"Our unit economics are healthy"**
   → Show LTV:CAC ratio >3:1 (industry benchmark for SaaS)

3. **"We're capital efficient"**
   → Point to gross margin >30% (healthy for B2B SaaS)

4. **"Customers love us"**
   → Show net retention >100% (indicates expansion revenue)

5. **"We have 18 months runway"**
   → De-risk investment with strong cash position

6. **"Proven traction"**
   → Show customer growth chart and platform activity

**Pro Tip:** Export dashboard to PDF before pitch, include in investor deck appendix

---

## 🎯 Vision: Autonomous Agency

These modules lay the foundation for:
- **AI-driven insights:** "You should raise prices by 15% based on LTV analysis"
- **Automated investor reporting:** Weekly email digest to stakeholders
- **Predictive analytics:** "Agency X likely to churn in 90 days, trigger retention workflow"
- **Self-optimizing platform:** "CAC increased 30%, recommend pausing Facebook ads"

**Long-term Goal:** Platform makes financial decisions autonomously, human only reviews and approves

---

**Ready to build? Start with MODULE 29! 🚀**

---

## 📄 Document Metadata
- **Version:** 1.0
- **Created:** 2025-12-18
- **Author:** Claude Code (Autonomous Planning Agent)
- **Related Docs:** [ADMIN_PROFILE_PREFILL_MASTER_README.md](ADMIN_PROFILE_PREFILL_MASTER_README.md)
- **Next Steps:** Execute MODULE 29 after MVP stable with Dominion Healthcare
