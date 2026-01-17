# MODULE 42: WEEKLY AGENCY REPORTS

**Status:** ✅ COMPLETE - Ready for Testing
**Priority:** MVP CRITICAL
**Estimated Time:** 6-8 hours
**Risk Level:** Medium
**Dependencies:** MODULE_41 (shares infrastructure)

---

## MISSION OBJECTIVE

Send comprehensive weekly performance summaries to agency owners every Monday at 8:00 AM via email + WhatsApp.

**Includes:**
- Executive summary (revenue, profit margin, trends)
- Financial breakdown (this week vs last week)
- Top performing staff (rankings with metrics)
- Client breakdown (shifts, hours, revenue per client)
- Notification effectiveness (channel performance)
- Compliance alerts (expiring documents)
- AI-generated insights (growth opportunities, warnings)

---

## DELIVERABLES

### 1. Database Functions ✅
- **File:** `supabase/migrations/20260116000001_create_agency_report_functions.sql`
- **Function:** `get_weekly_agency_report(agency_id, week_start_date)`
- **Function:** `get_notification_effectiveness(agency_id, start_date, end_date)`

### 2. Edge Function ✅
- **File:** `supabase/functions/weekly-agency-summary/index.ts`
- **Schedule:** Mondays at 8:00 AM (`0 8 * * 1`)
- **Features:** Week-over-week comparisons, trend indicators, insights generation

### 3. Email Template ✅
- **File:** `supabase/functions/_shared/templates/weekly_agency_summary.html`
- **Design:** Professional charts/tables, financial overview, compliance section

### 4. WhatsApp Message ✅
**Format:** (~420 chars)
```
📊 Weekly Summary (6-12 Jan):

✅ 42 shifts completed (↑ 12% vs last week)
💷 Revenue: £8,400 | Costs: £6,200
📈 Profit: £2,170 (26% margin, ↑ 3%)

⭐ Top performers:
• Sarah Jones - 100% on-time, 5.0★
• Mike Smith - 98% on-time, 4.9★

📱 Communication:
• WhatsApp: 87% open rate
• Email: 42% open rate

⚠️ 2 compliance docs expiring in 30 days

📧 Full report in your email
```

### 5. Cron Job ✅
- **Schedule:** `0 8 * * 1` (Every Monday 8 AM)
- **Migration:** `20260116000003_create_agency_report_cron_jobs.sql`

---

## KEY FEATURES

### Financial Analytics
- Revenue, costs, profit calculation
- Week-over-week trend arrows (↑↓→)
- Profit margin percentage
- Estimated calculations (actual revenue tracking in MODULE 29)

### AI-Generated Insights
```typescript
generateInsights(reportData, notificationData) {
  // Analyzes:
  // - Revenue growth > 10% → "Strong Week" insight
  // - Revenue drop > 10% → "Review Needed" insight
  // - WhatsApp vs Email engagement → Channel recommendation
  // - Staff utilization < 70% → "Underutilized" warning
}
```

### Notification Effectiveness
- Channel comparison (Email, WhatsApp, SMS)
- Delivery rates, open rates, click rates
- Sent/Delivered/Opened/Clicked breakdown

### Top Staff Rankings
- Top 5 performers by shifts completed
- On-time rate percentage
- Average rating
- Sorted by performance

---

## TESTING

```sql
-- Test RPC function
SELECT get_weekly_agency_report(
    'agency-uuid'::UUID,
    DATE_TRUNC('week', CURRENT_DATE)::DATE
);

-- Manual trigger
SELECT trigger_weekly_summary_for_agency('agency-uuid'::UUID);
```

**Deployment:**
```bash
./supabase.exe functions deploy weekly-agency-summary --project-ref rzzxxkppkiasuouuglaf
```

---

## SUCCESS CRITERIA
- [ ] Weekly email sent every Monday at 8 AM
- [ ] Financial data accurate (revenue, costs, profit)
- [ ] Week-over-week trends calculated correctly
- [ ] Top 5 staff ranked by performance
- [ ] Notification effectiveness metrics displayed
- [ ] Compliance alerts shown (30/14-day warnings)
- [ ] AI insights relevant and actionable
- [ ] Email open rate > 45%
- [ ] WhatsApp open rate > 85%

---

**Next Module:** MODULE_43_REALTIME_AGENCY_ALERTS
**Status:** ✅ Complete, Ready for Deployment
