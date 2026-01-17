# DEPLOYMENT GUIDE - Agency Reporting System

**Created:** 2026-01-16
**Modules:** 41 (Daily), 42 (Weekly), 43 (Alerts)
**Status:** Ready for Deployment

---

## PRE-DEPLOYMENT CHECKLIST

### 1. Environment Variables

Verify these are set in Supabase Edge Functions settings:

```bash
RESEND_API_KEY=re_...                    # Resend API for emails
SUPABASE_URL=https://rzzxxkppkiasuouuglaf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...        # Service role key
TWILIO_ACCOUNT_SID=AC...                 # For WhatsApp (if using Twilio)
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 2. Database Access

Ensure you have:
- Supabase project ref: `rzzxxkppkiasuouuglaf`
- Database password access
- Supabase CLI installed

---

## DEPLOYMENT STEPS

### STEP 1: Deploy Database Migrations

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/sql/new
2. Copy and paste each migration file SQL:
   - `20260116000001_create_agency_report_functions.sql`
   - `20260116000002_create_daily_agency_metrics_view.sql`
   - `20260116000003_create_agency_report_cron_jobs.sql`
3. Execute each one in order
4. Verify success (no errors)

**Option B: Via Supabase CLI**

```bash
cd c:/Users/gbase/AiAgency/ACG_BASE/agc_latest3

# If not linked, link project first
/c/Users/gbase/superbasecli/supabase.exe link --project-ref rzzxxkppkiasuouuglaf

# Push migrations
/c/Users/gbase/superbasecli/supabase.exe db push
```

**Verification:**

```sql
-- Check RPC functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
    'get_daily_agency_report',
    'get_weekly_agency_report',
    'get_notification_effectiveness',
    'refresh_daily_agency_metrics'
);
-- Should return 4 rows

-- Check materialized view exists
SELECT matviewname FROM pg_matviews
WHERE matviewname = 'daily_agency_metrics';
-- Should return 1 row

-- Check cron jobs created
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname IN (
    'refresh-daily-agency-metrics',
    'daily-agency-digest',
    'weekly-agency-summary'
);
-- Should return 3 rows
```

---

### STEP 2: Deploy Edge Functions

```bash
cd /c/Users/gbase/superbasecli

# Deploy daily digest
./supabase.exe functions deploy daily-agency-digest \
  --project-ref rzzxxkppkiasuouuglaf \
  --workdir c:/Users/gbase/AiAgency/ACG_BASE/agc_latest3

# Deploy weekly summary
./supabase.exe functions deploy weekly-agency-summary \
  --project-ref rzzxxkppkiasuouuglaf \
  --workdir c:/Users/gbase/AiAgency/ACG_BASE/agc_latest3

# Deploy critical alert
./supabase.exe functions deploy agency-critical-alert \
  --project-ref rzzxxkppkiasuouuglaf \
  --workdir c:/Users/gbase/AiAgency/ACG_BASE/agc_latest3
```

**Expected Output:**
```
✓ daily-agency-digest deployed successfully
✓ weekly-agency-summary deployed successfully
✓ agency-critical-alert deployed successfully
```

**Verification:**

```bash
# List all functions
./supabase.exe functions list --project-ref rzzxxkppkiasuouuglaf

# Should see:
# - daily-agency-digest
# - weekly-agency-summary
# - agency-critical-alert
```

---

### STEP 3: Initial Refresh of Materialized View

```sql
-- Refresh the materialized view immediately
SELECT refresh_daily_agency_metrics();

-- Verify data populated
SELECT * FROM daily_agency_metrics LIMIT 5;
```

---

### STEP 4: Test with Dominion Healthcare

#### 4.1 Get Dominion Agency UUID

```sql
SELECT id, name, contact_email, phone, email_notifications, whatsapp_global_notifications
FROM agencies
WHERE name ILIKE '%dominion%';

-- Copy the UUID for testing
```

#### 4.2 Test RPC Functions

```sql
-- Test daily report
SELECT get_daily_agency_report(
    'PASTE_DOMINION_UUID_HERE'::UUID,
    CURRENT_DATE
);
-- Should return JSON with shifts, stats, action items

-- Test weekly report
SELECT get_weekly_agency_report(
    'PASTE_DOMINION_UUID_HERE'::UUID,
    DATE_TRUNC('week', CURRENT_DATE)::DATE
);
-- Should return JSON with financial data, top staff, clients

-- Test notification effectiveness
SELECT get_notification_effectiveness(
    'PASTE_DOMINION_UUID_HERE'::UUID,
    CURRENT_DATE - 7,
    CURRENT_DATE
);
-- Should return JSON with channel stats
```

#### 4.3 Manual Trigger (Test Mode)

```bash
# Test daily digest (will send to test addresses)
curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/daily-agency-digest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{
    "agency_id": "DOMINION_UUID",
    "test_mode": true,
    "report_date": "2026-01-16"
  }'

# Expected response:
# {
#   "message": "Daily agency digest sent",
#   "processed": 1,
#   "results": [{"agency": "Dominion Healthcare", "status": "success"}]
# }

# Test weekly summary
curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/weekly-agency-summary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{
    "agency_id": "DOMINION_UUID",
    "test_mode": true
  }'
```

#### 4.4 Check Notification Logs

```sql
SELECT
    notification_type,
    channel,
    status,
    recipient_email,
    recipient_phone,
    created_at,
    sent_at,
    provider_message_id
FROM notification_log
WHERE agency_id = 'DOMINION_UUID'
AND notification_type IN ('daily_agency_digest', 'weekly_agency_summary')
ORDER BY created_at DESC
LIMIT 10;

-- Verify status = 'sent' or 'delivered'
```

#### 4.5 Test Email Received

1. Check your email inbox (or test address if test_mode=true)
2. Verify:
   - Subject line: "☀️ Daily Digest - [Date]" or "📊 Weekly Summary - [Week Range]"
   - Sender: "Dominion Healthcare <noreply@agilecaremanagement.co.uk>"
   - Email renders correctly (no broken images, colors correct)
   - CTA buttons work
   - Data is accurate (matches production shifts)

#### 4.6 Test WhatsApp Received

1. Check WhatsApp on test phone number
2. Verify:
   - Message received
   - Formatting preserved
   - Deep link clickable
   - Emoji display correctly
   - Under 1024 characters

---

### STEP 5: Enable Production Cron Jobs

#### 5.1 Verify Cron Jobs

```sql
-- Check cron jobs are created but may be inactive
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname IN (
    'refresh-daily-agency-metrics',
    'daily-agency-digest',
    'weekly-agency-summary'
);
```

#### 5.2 Enable Crons (if needed)

```sql
-- Enable all agency reporting crons
SELECT enable_agency_reporting_crons();

-- Verify they're active
SELECT jobname, active FROM cron.job
WHERE jobname IN (
    'refresh-daily-agency-metrics',
    'daily-agency-digest',
    'weekly-agency-summary'
);
-- All should show active = true
```

#### 5.3 Wait for First Automated Send

- **Daily Digest:** Next day at 7:00 AM
- **Weekly Summary:** Next Monday at 8:00 AM
- **Metrics Refresh:** Every hour at :15 (e.g., 1:15 PM, 2:15 PM)

#### 5.4 Monitor First Execution

```sql
-- Check cron execution history
SELECT
    j.jobname,
    r.status,
    r.return_message,
    r.start_time,
    r.end_time,
    EXTRACT(EPOCH FROM (r.end_time - r.start_time)) as duration_seconds
FROM cron.job_run_details r
JOIN cron.job j ON r.jobid = j.jobid
WHERE j.jobname IN (
    'refresh-daily-agency-metrics',
    'daily-agency-digest',
    'weekly-agency-summary'
)
ORDER BY r.start_time DESC
LIMIT 10;

-- Successful executions should show status = 'succeeded'
```

---

### STEP 6: Monitor & Verify

#### 6.1 Check Notification Logs Daily

```sql
-- Daily summary of notifications sent
SELECT
    DATE(created_at) as date,
    notification_type,
    channel,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'sent') as sent,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
    COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM notification_log
WHERE notification_type IN ('daily_agency_digest', 'weekly_agency_summary')
AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at), notification_type, channel
ORDER BY date DESC, notification_type;
```

#### 6.2 Monitor Open Rates (after 24 hours)

```sql
-- Email open rates
SELECT
    notification_type,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE status IN ('opened', 'clicked')) as opened,
    ROUND(
        (COUNT(*) FILTER (WHERE status IN ('opened', 'clicked'))::NUMERIC / COUNT(*)) * 100,
        2
    ) as open_rate_percent
FROM notification_log
WHERE notification_type IN ('daily_agency_digest', 'weekly_agency_summary')
AND channel = 'email'
AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY notification_type;

-- Target: > 40% for daily, > 45% for weekly
```

#### 6.3 Check for Errors

```sql
-- Failed notifications
SELECT
    agency_id,
    notification_type,
    channel,
    recipient_email,
    recipient_phone,
    error_message,
    created_at
FROM notification_log
WHERE status = 'failed'
AND notification_type IN ('daily_agency_digest', 'weekly_agency_summary')
AND created_at >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Investigate and fix any failures
```

---

## TROUBLESHOOTING

### Issue: Email not sending

**Check:**
```sql
SELECT * FROM notification_log
WHERE notification_type = 'daily_agency_digest'
AND channel = 'email'
AND status = 'failed'
ORDER BY created_at DESC
LIMIT 5;
```

**Common Causes:**
- Invalid Resend API key → Check environment variables
- Email address not verified → Verify in Resend dashboard
- Template rendering error → Check function logs
- Missing `from` address → Check agency branding setup

**Fix:**
1. Verify RESEND_API_KEY in Supabase dashboard → Settings → Edge Functions
2. Test Resend API directly with curl
3. Check edge function logs in Supabase dashboard

### Issue: WhatsApp not sending

**Check:**
```sql
SELECT * FROM whatsapp_rate_limits
WHERE phone_number IN (SELECT phone FROM agencies WHERE name ILIKE '%dominion%');
```

**Common Causes:**
- Rate limit exceeded (5/day, 20/week)
- Phone number not verified
- Twilio credentials invalid
- send-whatsapp function error

**Fix:**
1. Reset rate limit: `SELECT reset_rate_limit('+1234567890', 'daily');`
2. Verify Twilio credentials
3. Test send-whatsapp function independently

### Issue: Cron not executing

**Check:**
```sql
SELECT * FROM cron.job WHERE jobname = 'daily-agency-digest';
```

**Common Causes:**
- Cron job disabled (active = false)
- Invalid schedule syntax
- Database permissions
- Edge function URL incorrect

**Fix:**
1. Enable: `SELECT enable_agency_reporting_crons();`
2. Check schedule: `SELECT jobname, schedule FROM cron.job;`
3. Manually trigger to test: `SELECT trigger_daily_digest_for_agency('uuid');`

### Issue: Wrong data in reports

**Check:**
```sql
-- Verify shifts data
SELECT s.*, c.name as client_name, st.first_name || ' ' || st.last_name as staff_name
FROM shifts s
JOIN clients c ON s.client_id = c.id
LEFT JOIN staff st ON s.assigned_staff_id = st.id
WHERE c.agency_id = 'DOMINION_UUID'
AND s.date = CURRENT_DATE;
```

**Common Causes:**
- Timezone mismatch (UTC vs local)
- Shifts not assigned to staff
- Client not linked to correct agency
- Incorrect date filtering in RPC function

**Fix:**
1. Verify timezone settings in Supabase
2. Check shift assignments
3. Re-run RPC function with debug logging

---

## ROLLBACK PLAN

If critical issues occur:

### 1. Disable Cron Jobs Immediately

```sql
SELECT disable_agency_reporting_crons();
```

### 2. Verify Crons Stopped

```sql
SELECT jobname, active FROM cron.job
WHERE jobname IN ('daily-agency-digest', 'weekly-agency-summary');
-- All should show active = false
```

### 3. Remove Edge Functions (if needed)

```bash
# Delete edge functions via Supabase dashboard
# Settings → Edge Functions → Delete
```

### 4. Drop RPC Functions (if needed)

```sql
DROP FUNCTION IF EXISTS get_daily_agency_report(UUID, DATE);
DROP FUNCTION IF EXISTS get_weekly_agency_report(UUID, DATE);
DROP FUNCTION IF EXISTS get_notification_effectiveness(UUID, DATE, DATE);
```

### 5. Communicate to Users

- Send email to agency owners explaining temporary pause
- Provide ETA for fix
- Resume manual reporting if needed

---

## SUCCESS METRICS (Week 1)

Track these metrics after 7 days:

```sql
-- Week 1 Performance Report
WITH stats AS (
    SELECT
        COUNT(DISTINCT agency_id) as agencies_served,
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE channel = 'email') as emails_sent,
        COUNT(*) FILTER (WHERE channel = 'whatsapp') as whatsapp_sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failures,
        COUNT(*) FILTER (WHERE status IN ('opened', 'clicked') AND channel = 'email') as emails_opened
    FROM notification_log
    WHERE notification_type IN ('daily_agency_digest', 'weekly_agency_summary')
    AND created_at >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT
    agencies_served,
    total_notifications,
    emails_sent,
    whatsapp_sent,
    failures,
    ROUND((failures::NUMERIC / total_notifications) * 100, 2) as failure_rate_percent,
    emails_opened,
    ROUND((emails_opened::NUMERIC / NULLIF(emails_sent, 0)) * 100, 2) as email_open_rate_percent
FROM stats;
```

**Targets:**
- ✅ Agencies Served: All agencies with email_notifications=true
- ✅ Failure Rate: < 1%
- ✅ Email Open Rate: > 40%
- ✅ WhatsApp Delivery Rate: > 95%
- ✅ No complaints from agency owners
- ✅ Cron jobs execute on time (7 AM daily, 8 AM Monday weekly)

---

## NEXT STEPS

After successful deployment:

1. **Monitor for 1 week** - Check metrics daily
2. **Gather feedback** - Survey agency owners
3. **Iterate on content** - Adjust based on feedback
4. **Expand features:**
   - Add PDF export links
   - Add charts/graphs to emails
   - Implement n8n WhatsApp Meta templates
   - Add predictive analytics
5. **Build UI Dashboard** - Admin interface to view reporting status
6. **Implement MODULE_43 triggers** - Real-time critical alerts

---

**Deployment Owner:** [Your Name]
**Date:** 2026-01-16
**Version:** 1.0
**Status:** Ready for Production
