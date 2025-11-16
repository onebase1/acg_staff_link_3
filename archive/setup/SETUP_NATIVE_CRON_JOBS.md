# 🚀 Setup Native pg_cron Jobs - Supabase

## Why pg_cron?
You moved from Base44 to Supabase specifically for this! Native database cron jobs eliminate the need for external services like cronjob.org.

---

## ✅ Quick Setup (5 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/sql/new
2. You should see the SQL editor

### Step 2: Run the Migration SQL

Copy and paste this entire script into the SQL editor and click **RUN**:

```sql
-- ============================================================================
-- SUPABASE NATIVE CRON JOBS SETUP
-- ============================================================================
-- This migration sets up pg_cron for automated shift notifications
-- No more external cron services needed!
-- ============================================================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension (for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ============================================================================
-- CRON JOB 1: Pre-Shift Reminders (24h & 2h before)
-- ============================================================================

SELECT cron.schedule(
    'shift-reminder-engine-hourly',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/shift-reminder-engine',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);

-- ============================================================================
-- CRON JOB 2: Post-Shift Timesheet Reminders
-- ============================================================================

SELECT cron.schedule(
    'post-shift-timesheet-reminder-hourly',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/post-shift-timesheet-reminder',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);

-- ============================================================================
-- CRON JOB 3: Compliance Monitor (Daily at 8am)
-- ============================================================================

SELECT cron.schedule(
    'compliance-monitor-daily',
    '0 8 * * *',
    $$
    SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/compliance-monitor',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);

-- ============================================================================
-- CRON JOB 4: Email Automation Engine (Every 5 minutes)
-- ============================================================================

SELECT cron.schedule(
    'email-automation-engine-5min',
    '*/5 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/email-automation-engine',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);

-- ============================================================================
-- MONITORING VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW cron_job_status AS
SELECT
    jobid,
    jobname,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job
ORDER BY jobname;

CREATE OR REPLACE VIEW cron_job_runs AS
SELECT
    r.jobid,
    j.jobname,
    r.runid,
    r.job_pid,
    r.database,
    r.username,
    r.command,
    r.status,
    r.return_message,
    r.start_time,
    r.end_time
FROM cron.job_run_details r
LEFT JOIN cron.job j ON r.jobid = j.jobid
ORDER BY r.start_time DESC
LIMIT 100;

GRANT SELECT ON cron_job_status TO postgres, authenticated;
GRANT SELECT ON cron_job_runs TO postgres, authenticated;
```

### Step 3: Verify Cron Jobs Are Scheduled

After running the script, execute this query to see your cron jobs:

```sql
SELECT * FROM cron_job_status;
```

You should see **4 cron jobs**:
- `shift-reminder-engine-hourly` - Runs every hour
- `post-shift-timesheet-reminder-hourly` - Runs every hour
- `compliance-monitor-daily` - Runs daily at 8am
- `email-automation-engine-5min` - Runs every 5 minutes

---

## 📊 Monitoring Your Cron Jobs

### View Recent Executions

```sql
SELECT
    jobname,
    status,
    return_message,
    start_time,
    end_time
FROM cron_job_runs
WHERE start_time > NOW() - INTERVAL '24 hours'
ORDER BY start_time DESC;
```

### Check if Jobs Are Active

```sql
SELECT jobname, active, schedule
FROM cron_job_status;
```

---

## 🧪 Testing

### Manually Trigger a Job (for testing)

```sql
-- Test shift reminders
SELECT net.http_post(
    url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/shift-reminder-engine',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
    ),
    body := '{}'::jsonb
);
```

---

## 🔧 Management Commands

### Unschedule a Job

```sql
SELECT cron.unschedule('shift-reminder-engine-hourly');
```

### Reschedule a Job (change frequency)

```sql
-- Unschedule first
SELECT cron.unschedule('shift-reminder-engine-hourly');

-- Then reschedule with new frequency
SELECT cron.schedule(
    'shift-reminder-engine-hourly',
    '*/30 * * * *',  -- Now every 30 minutes instead of every hour
    $$ [same command as before] $$
);
```

### View All Scheduled Jobs

```sql
SELECT * FROM cron.job;
```

---

## 📅 Cron Schedule Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**Examples:**
- `0 * * * *` - Every hour at minute 0
- `*/5 * * * *` - Every 5 minutes
- `0 8 * * *` - Every day at 8am
- `0 9 * * 1` - Every Monday at 9am
- `0 0 1 * *` - First day of every month at midnight

---

## 🎉 What This Achieves

✅ **No more cronjob.org** - Everything runs natively in your database

✅ **Pre-shift reminders** - Automatically sent 24h and 2h before shifts

✅ **Post-shift reminders** - Staff reminded to upload timesheets after shifts end

✅ **Compliance monitoring** - Daily checks for expiring documents

✅ **Batched emails** - Queue processed every 5 minutes

✅ **Full visibility** - Monitor all jobs via SQL queries

---

## 🐛 Troubleshooting

### Jobs not running?

1. Check pg_cron extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Check pg_net extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

3. View recent job errors:
   ```sql
   SELECT * FROM cron_job_runs
   WHERE status = 'failed'
   ORDER BY start_time DESC;
   ```

### Functions returning errors?

Check Edge Function logs in Supabase Dashboard:
https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/functions

---

## 🚀 You're Done!

Once you run the SQL script above, your cron jobs will start running automatically:
- ⏰ Next pre-shift check: Top of the hour
- 📋 Next post-shift check: Top of the hour
- 🛡️ Next compliance check: Tomorrow at 8am
- 📧 Next email batch: Within 5 minutes

**No more manual triggers needed!** This is what you moved to Supabase for! 🎯
