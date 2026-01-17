# QUICK START - Agency Reporting System

**5-Minute Deployment Guide**

---

## STEP 1: Deploy Database (via Supabase Dashboard)

1. Go to https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/sql/new

2. **Run Migration 1** - Copy/paste this file content and execute:
   ```
   supabase/migrations/20260116000001_create_agency_report_functions.sql
   ```

3. **Run Migration 2** - Copy/paste this file content and execute:
   ```
   supabase/migrations/20260116000002_create_daily_agency_metrics_view.sql
   ```

4. **Run Migration 3** - Copy/paste this file content and execute:
   ```
   supabase/migrations/20260116000003_create_agency_report_cron_jobs.sql
   ```

5. **Verify** - Run this query:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name IN ('get_daily_agency_report', 'get_weekly_agency_report');
   -- Should return 2 rows
   ```

---

## STEP 2: Deploy Edge Functions

```bash
cd /c/Users/gbase/superbasecli

# Deploy all 3 functions
./supabase.exe functions deploy daily-agency-digest --project-ref rzzxxkppkiasuouuglaf --workdir c:/Users/gbase/AiAgency/ACG_BASE/agc_latest3
./supabase.exe functions deploy weekly-agency-summary --project-ref rzzxxkppkiasuouuglaf --workdir c:/Users/gbase/AiAgency/ACG_BASE/agc_latest3
./supabase.exe functions deploy agency-critical-alert --project-ref rzzxxkppkiasuouuglaf --workdir c:/Users/gbase/AiAgency/ACG_BASE/agc_latest3
```

---

## STEP 3: Test with Dominion

1. **Get Dominion UUID:**
   ```sql
   SELECT id FROM agencies WHERE name ILIKE '%dominion%';
   ```

2. **Test RPC Function:**
   ```sql
   SELECT get_daily_agency_report('PASTE_UUID_HERE'::UUID, CURRENT_DATE);
   ```

3. **Manual Trigger (Test Mode):**
   ```bash
   curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/daily-agency-digest \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -d '{"agency_id": "DOMINION_UUID", "test_mode": true}'
   ```

4. **Check Logs:**
   ```sql
   SELECT * FROM notification_log
   WHERE agency_id = 'DOMINION_UUID'
   ORDER BY created_at DESC LIMIT 5;
   ```

---

## STEP 4: Enable Cron Jobs

```sql
-- Enable all reporting crons
SELECT enable_agency_reporting_crons();

-- Verify active
SELECT jobname, active, schedule FROM cron.job
WHERE jobname IN ('daily-agency-digest', 'weekly-agency-summary');
```

---

## STEP 5: Monitor

- **Daily Digest:** Sends tomorrow at 7:00 AM
- **Weekly Summary:** Sends next Monday at 8:00 AM

**Check execution:**
```sql
SELECT j.jobname, r.status, r.start_time
FROM cron.job_run_details r
JOIN cron.job j ON r.jobid = j.jobid
WHERE j.jobname IN ('daily-agency-digest', 'weekly-agency-summary')
ORDER BY r.start_time DESC LIMIT 10;
```

---

## TROUBLESHOOTING

**Email not sending?**
```sql
SELECT * FROM notification_log WHERE status = 'failed' ORDER BY created_at DESC LIMIT 5;
```
→ Check RESEND_API_KEY in Supabase dashboard

**Cron not running?**
```sql
SELECT jobname, active FROM cron.job WHERE jobname LIKE '%agency%';
```
→ Run: `SELECT enable_agency_reporting_crons();`

**Wrong data?**
```sql
SELECT * FROM shifts WHERE date = CURRENT_DATE AND client_id IN (
  SELECT id FROM clients WHERE agency_id = 'DOMINION_UUID'
);
```
→ Verify shifts assigned to staff

---

## DONE! 🎉

Your agency reporting system is now live. Agency owners will receive:
- 📧 Daily email at 7 AM with today's shifts
- 📧 Weekly email on Monday at 8 AM with performance summary
- 💬 WhatsApp versions of both
- 🚨 Real-time alerts for critical events (when integrated)

**Full Documentation:** [DEPLOYMENT_GUIDE_AGENCY_REPORTS.md](DEPLOYMENT_GUIDE_AGENCY_REPORTS.md)
