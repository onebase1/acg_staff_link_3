# ⚡ Setup Native Cron Jobs NOW - 3 Easy Options

## 🎯 FASTEST: Option 1 - Copy & Paste (30 seconds)

### Step 1: Open Supabase SQL Editor
**Click here:** https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/sql/new

### Step 2: Copy This SQL
Open file: `CRON_SETUP_COPY_PASTE.sql` (in this folder)

OR copy from here:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

SELECT cron.schedule('shift-reminder-engine-hourly', '0 * * * *',
  $$SELECT net.http_post(url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/shift-reminder-engine',
  headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'),
  body := '{}'::jsonb) AS request_id;$$);

SELECT cron.schedule('post-shift-timesheet-reminder-hourly', '0 * * * *',
  $$SELECT net.http_post(url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/post-shift-timesheet-reminder',
  headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'),
  body := '{}'::jsonb) AS request_id;$$);

SELECT cron.schedule('compliance-monitor-daily', '0 8 * * *',
  $$SELECT net.http_post(url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/compliance-monitor',
  headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'),
  body := '{}'::jsonb) AS request_id;$$);

SELECT cron.schedule('email-automation-engine-5min', '*/5 * * * *',
  $$SELECT net.http_post(url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/email-automation-engine',
  headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'),
  body := '{}'::jsonb) AS request_id;$$);

CREATE OR REPLACE VIEW cron_job_status AS
  SELECT jobid, jobname, schedule, command, active FROM cron.job ORDER BY jobname;

CREATE OR REPLACE VIEW cron_job_runs AS
  SELECT r.jobid, j.jobname, r.status, r.return_message, r.start_time, r.end_time
  FROM cron.job_run_details r LEFT JOIN cron.job j ON r.jobid = j.jobid
  ORDER BY r.start_time DESC LIMIT 100;

GRANT SELECT ON cron_job_status TO postgres, authenticated;
GRANT SELECT ON cron_job_runs TO postgres, authenticated;
```

### Step 3: Paste into SQL Editor and Click RUN ▶️

### Step 4: Verify
Run this query to see your cron jobs:
```sql
SELECT * FROM cron_job_status;
```

You should see 4 jobs listed!

---

## 💻 Option 2 - Using psql (if you have DB password)

```bash
cd /c/Users/gbase/AiAgency/ACG_BASE/agc_latest3

# Execute the SQL file
psql "postgresql://postgres.rzzxxkppkiasuouuglaf:[YOUR_DB_PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  -f CRON_SETUP_COPY_PASTE.sql
```

Get your DB password from: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/settings/database

---

## 🔧 Option 3 - Using Supabase CLI

```bash
cd /c/Users/gbase/AiAgency/ACG_BASE/agc_latest3

# Link the project (if not already linked)
/c/Users/gbase/superbasecli/supabase link --project-ref rzzxxkppkiasuouuglaf

# Push the migration
/c/Users/gbase/superbasecli/supabase db push

# You'll be prompted for your database password
```

---

## ✅ After Setup - Verify It's Working

### Check Scheduled Jobs
```sql
SELECT jobname, schedule, active FROM cron_job_status;
```

Expected output:
```
compliance-monitor-daily          | 0 8 * * *   | t
email-automation-engine-5min      | */5 * * * * | t
post-shift-timesheet-reminder-... | 0 * * * *   | t
shift-reminder-engine-hourly      | 0 * * * *   | t
```

### Monitor Job Executions (wait 5-60 minutes)
```sql
SELECT jobname, status, start_time, return_message
FROM cron_job_runs
WHERE start_time > NOW() - INTERVAL '1 hour'
ORDER BY start_time DESC;
```

---

## 🎉 What You Get

Once setup:
- ⏰ Pre-shift reminders sent automatically every hour
- 📋 Post-shift timesheet reminders sent every hour
- 🛡️ Compliance checks run daily at 8am
- 📧 Email queue processed every 5 minutes

**No more cronjob.org!** Everything runs natively in your database! 🚀

---

## 🐛 Troubleshooting

### "permission denied for schema cron"
Run this first:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;
```

### "extension pg_cron does not exist"
Contact Supabase support - pg_cron should be available on all hosted projects

### Jobs not running
Check the logs:
```sql
SELECT * FROM cron_job_runs ORDER BY start_time DESC LIMIT 10;
```

---

## 🎯 Recommendation

**Use Option 1** - it's the fastest and doesn't require any local setup. Just:
1. Click the dashboard link
2. Copy the SQL from `CRON_SETUP_COPY_PASTE.sql`
3. Paste and run

Takes 30 seconds! ⚡
