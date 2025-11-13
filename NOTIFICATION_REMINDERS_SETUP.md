# Shift Notification & Reminder System - Setup Guide

## Status: ✅ Functions Deployed & Working

All notification functions are **deployed and working correctly**. They just need to be **triggered automatically** via cron jobs.

---

## 📋 Available Reminder Functions

### 1. **Pre-Shift Reminders** (shift-reminder-engine)
**Status:** ✅ Deployed (v2) & Working
**What it does:**
- Sends reminders **24 hours** before shift (Email + SMS + WhatsApp)
- Sends reminders **2 hours** before shift (SMS + WhatsApp only)
- Prevents duplicate reminders with atomic flag setting

**Trigger:** Should run **every hour** via cron

**Test manually:**
```bash
curl -X POST "https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/shift-reminder-engine" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{}"
```

**Last Test Result:** ✅ Checked 1000 shifts successfully

---

### 2. **Post-Shift Timesheet Reminders** (post-shift-timesheet-reminder)
**Status:** ✅ Deployed (v6) & Working
**What it does:**
- Sends WhatsApp + Email reminders to staff **after shift ends**
- Asks them to upload their signed timesheet
- Creates draft timesheet if doesn't exist
- Includes link to Staff Portal

**Trigger:** Should run **every hour** via cron (checks shifts that ended in last hour)

**Test manually:**
```bash
curl -X POST "https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/post-shift-timesheet-reminder" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{}"
```

**Last Test Result:** ✅ Function working (processed 0 shifts - none ended recently)

**Test specific shift:**
```bash
curl -X POST "https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/post-shift-timesheet-reminder" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"shift_id\": \"YOUR_SHIFT_ID\"}"
```

---

## 🔧 Setting Up Automated Cron Jobs

### Option 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf

2. **Navigate to:** Database → Cron Jobs (or use pg_cron extension)

3. **Create these cron jobs:**

   **Pre-Shift Reminders (every hour):**
   ```sql
   SELECT cron.schedule(
     'shift-reminder-engine-hourly',
     '0 * * * *',  -- Every hour
     $$
     SELECT net.http_post(
       url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/shift-reminder-engine',
       headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
       body := '{}'::jsonb
     ) AS request_id;
     $$
   );
   ```

   **Post-Shift Timesheet Reminders (every hour):**
   ```sql
   SELECT cron.schedule(
     'post-shift-timesheet-reminder-hourly',
     '0 * * * *',  -- Every hour
     $$
     SELECT net.http_post(
       url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/post-shift-timesheet-reminder',
       headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
       body := '{}'::jsonb
     ) AS request_id;
     $$
   );
   ```

---

### Option 2: External Cron Service (e.g., cron-job.org, EasyCron)

1. **Create account** at https://cron-job.org (free)

2. **Add two cron jobs:**

   **Job 1: Pre-Shift Reminders**
   - URL: `https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/shift-reminder-engine`
   - Method: POST
   - Schedule: Every hour (0 * * * *)
   - Headers:
     ```
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo
     Content-Type: application/json
     ```
   - Body: `{}`

   **Job 2: Post-Shift Timesheet Reminders**
   - URL: `https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/post-shift-timesheet-reminder`
   - Method: POST
   - Schedule: Every hour (0 * * * *)
   - Headers: (same as above)
   - Body: `{}`

---

### Option 3: GitHub Actions (if you have repo)

Create `.github/workflows/shift-reminders.yml`:
```yaml
name: Shift Reminders

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Allow manual trigger

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Pre-Shift Reminders
        run: |
          curl -X POST "https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/shift-reminder-engine" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d "{}"

      - name: Post-Shift Timesheet Reminders
        run: |
          curl -X POST "https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/post-shift-timesheet-reminder" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d "{}"
```

---

## 🧪 Testing the System

### Test Pre-Shift Reminder (Manual Trigger)

1. Create a test shift that starts in **24 hours** from now
2. Run the function manually (see curl command above)
3. Check staff email/SMS/WhatsApp for reminder
4. Verify shift has `reminder_24h_sent = true` in database

### Test Post-Shift Reminder (Manual Trigger)

1. Create a test shift that **ended 30 minutes ago**
2. Set shift status to `awaiting_admin_closure`
3. Run the function with specific shift_id:
   ```bash
   curl -X POST "https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/post-shift-timesheet-reminder" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d "{\"shift_id\": \"YOUR_SHIFT_ID\"}"
   ```
4. Check staff email/WhatsApp for timesheet reminder
5. Verify shift has `timesheet_reminder_sent = true` in database

---

## 📊 Monitoring

### Check Function Logs

In Supabase Dashboard:
1. Go to **Functions** → **Logs**
2. Select `shift-reminder-engine` or `post-shift-timesheet-reminder`
3. View execution history and results

### Expected Output

**shift-reminder-engine:**
```json
{
  "success": true,
  "results": {
    "checked": 1000,
    "reminders_24h_sent": 5,
    "reminders_2h_sent": 3,
    "errors": [],
    "skipped_already_sent": 12
  }
}
```

**post-shift-timesheet-reminder:**
```json
{
  "success": true,
  "shifts_processed": 8,
  "reminders_sent": 8,
  "errors": []
}
```

---

## 🐛 Troubleshooting

### No reminders being sent

**Check:**
1. Are there shifts that meet the criteria?
   - 24h reminder: shifts starting in 23-25 hours
   - 2h reminder: shifts starting in 1.5-2.5 hours
   - Post-shift: shifts that ended in last hour
2. Have reminders already been sent? (check `reminder_24h_sent` flags)
3. Is staff phone number valid?
4. Are Twilio/Resend API keys set in Supabase secrets?

### Reminders sent multiple times

**Cause:** Race condition or missing flag
**Fix:** The functions use atomic flag setting to prevent this

### No cron jobs running

**Solution:** Set up one of the cron options above

---

## 🎯 Next Steps

1. **Choose a cron solution** (Option 1, 2, or 3)
2. **Set up the cron jobs** to run hourly
3. **Monitor for 24 hours** to ensure they're working
4. **Verify reminders** are being sent to staff

---

## 📞 Support

If reminders still aren't working after setup:
1. Check Supabase function logs
2. Verify cron jobs are running (check cron service logs)
3. Test functions manually with curl commands above
4. Check environment variables are set in Supabase
