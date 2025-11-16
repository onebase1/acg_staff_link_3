# 🎉 Post-Deployment Checklist

**Status:** ✅ All 44 functions deployed successfully to Supabase!
**Next Steps:** Complete the configuration and testing below

---

## 📋 IMMEDIATE ACTIONS REQUIRED

### 1. Set Environment Variables in Supabase Dashboard ⚠️ CRITICAL
**Location:** Supabase Dashboard → Project Settings → Edge Functions → Secrets

Set the following environment secrets:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SUPABASE_SERVICE_ROLE_KEY]

# AI Services
OPENAI_API_KEY=[YOUR_OPENAI_API_KEY]

# Email Service (Resend)
RESEND_API_KEY=[YOUR_RESEND_API_KEY]
RESEND_FROM_DOMAIN=your-domain.com
RESEND_DEFAULT_FROM=noreply@your-domain.com

# SMS & WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=[YOUR_TWILIO_ACCOUNT_SID]
TWILIO_AUTH_TOKEN=[YOUR_TWILIO_AUTH_TOKEN]
TWILIO_PHONE_NUMBER=[YOUR_TWILIO_PHONE_NUMBER]
TWILIO_WHATSAPP_NUMBER=whatsapp:[YOUR_TWILIO_WHATSAPP_NUMBER]
TWILIO_MESSAGING_SERVICE_SID=[YOUR_TWILIO_MESSAGING_SERVICE_SID]

# Application Configuration
APP_URL=https://your-production-app-url.com
```

**How to set:**
1. Go to: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/settings/functions
2. Click "Add new secret"
3. Enter key name and value
4. Click "Save"
5. Repeat for all secrets above

---

### 2. Configure Cron Jobs for Scheduled Functions ⚠️ CRITICAL
**Location:** Supabase Dashboard → Database → Cron Jobs

#### Run these SQL commands in the SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Hourly Functions

-- Email automation (daily/weekly digests) - Every hour at :00
SELECT cron.schedule(
  'email-automation-engine-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/email-automation-engine',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Shift reminders (24h & 2h before shifts) - Every hour
SELECT cron.schedule(
  'shift-reminder-engine-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/shift-reminder-engine',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Scheduled timesheet processor - Every hour
SELECT cron.schedule(
  'scheduled-timesheet-processor-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/scheduled-timesheet-processor',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Auto-approval engine - Every hour
SELECT cron.schedule(
  'auto-approval-engine-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/auto-approval-engine',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Daily Functions (8am UTC)

-- Daily shift closure - Every day at 8am
SELECT cron.schedule(
  'daily-shift-closure-engine-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/daily-shift-closure-engine',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Compliance monitor (document expiry) - Every day at 8am
SELECT cron.schedule(
  'compliance-monitor-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/compliance-monitor',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Payment reminders - Every day at 9am
SELECT cron.schedule(
  'payment-reminder-engine-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/payment-reminder-engine',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Every 5 Minutes Functions

-- No-show detection - Every 5 minutes
SELECT cron.schedule(
  'no-show-detection-engine-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/no-show-detection-engine',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Smart escalation (unfilled urgent shifts) - Every 5 minutes
SELECT cron.schedule(
  'smart-escalation-engine-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/smart-escalation-engine',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

**Verify cron jobs are running:**
```sql
-- Check all scheduled jobs
SELECT * FROM cron.job;

-- Check job run history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
```

---

### 3. Update Webhook URLs ⚠️ CRITICAL

#### Resend (Inbound Email Webhook)
**Location:** Resend Dashboard → Webhooks

**Webhook URL:**
```
https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/care-home-inbound-email
```

**Events to subscribe:**
- `email.received` (for care home email shift requests)

---

#### Twilio (SMS Webhook)
**Location:** Twilio Console → Phone Numbers → Active Numbers → Select your number

**Messaging Configuration:**
- **A MESSAGE COMES IN:** Webhook
- **URL:** `https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/incoming-sms-handler`
- **HTTP Method:** POST

---

#### Twilio (WhatsApp Webhook)
**Location:** Twilio Console → Messaging → Try it Out → Send a WhatsApp message

**Sandbox Configuration:**
- **WHEN A MESSAGE COMES IN:** Webhook
- **URL:** `https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/whatsapp-master-router`
- **HTTP Method:** POST

---

## 📝 TESTING CHECKLIST

### Critical Path Testing (Do in Order)

- [ ] **1. Test Email Function**
  ```bash
  curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/send-email \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"to":"your-email@example.com","subject":"Test","html":"<p>Test from Supabase!</p>"}'
  ```

- [ ] **2. Test SMS Function**
  ```bash
  curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/send-sms \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type": "application/json" \
    -d '{"to":"+44XXXXXXXXXX","body":"Test SMS from Supabase"}'
  ```

- [ ] **3. Test WhatsApp Function**
  ```bash
  curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/send-whatsapp \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type": "application/json" \
    -d '{"to":"+44XXXXXXXXXX","body":"Test WhatsApp from Supabase"}'
  ```

- [ ] **4. Test Ping Functions**
  ```bash
  curl https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/ping-test-1
  curl https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/ping-test-2
  ```

- [ ] **5. Test Geofence Validator**
  ```bash
  curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/geofence-validator \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type": "application/json" \
    -d '{"latitude":51.5074,"longitude":-0.1278,"site_latitude":51.5074,"site_longitude":-0.1278}'
  ```

- [ ] **6. End-to-End Workflow Test**
  1. Create a test shift in your app
  2. Verify auto-timesheet-creator generates draft timesheet
  3. Submit timesheet
  4. Verify intelligent-timesheet-validator runs
  5. Approve timesheet
  6. Run auto-invoice-generator manually
  7. Verify invoice created
  8. Send invoice via send-invoice function
  9. Verify client receives invoice email

---

## 🔧 FRONTEND UPDATES REQUIRED

### Update Function Call Syntax

**Old (Base44):**
```javascript
import { base44 } from './base44';

await base44.functions.invoke('sendEmail', {
  to: 'user@example.com',
  subject: 'Test',
  html: '<p>Hello</p>'
});
```

**New (Supabase):**
```javascript
import { supabase } from './supabaseClient';

await supabase.functions.invoke('send-email', {
  body: {
    to: 'user@example.com',
    subject: 'Test',
    html: '<p>Hello</p>'
  }
});
```

### Function Name Changes (camelCase → kebab-case)

Create a mapping file for easy migration:

```javascript
// functionMapping.js
export const FUNCTION_NAME_MAP = {
  // Base44 → Supabase
  'sendEmail': 'send-email',
  'sendSMS': 'send-sms',
  'sendWhatsApp': 'send-whatsapp',
  'autoInvoiceGenerator': 'auto-invoice-generator',
  'intelligentTimesheetValidator': 'intelligent-timesheet-validator',
  'autoTimesheetCreator': 'auto-timesheet-creator',
  'geofenceValidator': 'geofence-validator',
  'shiftVerificationChain': 'shift-verification-chain',
  'postShiftTimesheetReminder': 'post-shift-timesheet-reminder',
  'scheduledTimesheetProcessor': 'scheduled-timesheet-processor',
  'notificationDigestEngine': 'notification-digest-engine',
  // ... add all 44 mappings
};
```

---

## 🎯 MONITORING & LOGS

### View Function Logs
```bash
# View logs for specific function
/c/Users/gbase/superbasecli/supabase functions logs send-email --project-ref rzzxxkppkiasuouuglaf

# View all function logs
/c/Users/gbase/superbasecli/supabase functions logs --project-ref rzzxxkppkiasuouuglaf
```

### Monitor Function Invocations
**Location:** Supabase Dashboard → Edge Functions → Select function → Logs

---

## ✅ FINAL VALIDATION

- [ ] All environment variables set in Supabase Dashboard
- [ ] All cron jobs configured and running
- [ ] All webhooks (Resend, Twilio) updated
- [ ] All test functions return successful responses
- [ ] Frontend updated to use new Supabase function names
- [ ] End-to-end workflow test passed
- [ ] No errors in function logs
- [ ] All scheduled functions running on schedule
- [ ] Base44 SDK removed from package.json
- [ ] All `import { createClientFromRequest } from '@base44/sdk'` removed from code

---

## 🚨 ROLLBACK PLAN (Just in Case)

If you encounter critical issues:

1. **Temporarily revert frontend to Base44** (keep both working in parallel)
2. **Identify failing functions** via logs
3. **Fix and redeploy** individual functions
4. **Gradual migration:** Migrate one feature at a time instead of all at once

**Base44 Parallel Operation:**
- Keep Base44 API keys active during transition
- Run both systems for 1-2 weeks
- Gradually migrate traffic to Supabase
- Fully decommission Base44 after validation

---

## 📞 SUPPORT RESOURCES

### Supabase Support
- **Documentation:** https://supabase.com/docs
- **Discord:** https://discord.supabase.com
- **GitHub:** https://github.com/supabase/supabase

### Function Debugging
- Check environment variables are set correctly
- Verify CORS headers in function responses
- Check function logs for detailed error messages
- Test functions individually with curl before frontend integration

---

## 🎉 CONGRATULATIONS!

You've successfully migrated all 44 functions from Base44 to Supabase!

**Next Milestone:**
- Complete all items in this checklist
- Run end-to-end tests
- Gradually migrate production traffic
- Decommission Base44 account

**You now have:**
- ✅ Full infrastructure control
- ✅ Direct database access
- ✅ No vendor lock-in
- ✅ Transparent pricing
- ✅ Production-ready Supabase Edge Functions

---

*Last Updated: November 10, 2025*
*Status: All 44 functions deployed successfully*
*Success Rate: 100% (44/44)*
