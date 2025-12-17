# Module 2 Notifications - User Guide

## 🎯 What Is This? (Explain Like I'm 5)

Imagine you have a telephone system in your healthcare staffing agency. Before Module 2, every time someone needed to make a call (send a notification), they would:
- Just dial without checking if the person wants calls
- Not write down that they called
- Give up immediately if the line was busy
- Send the same message over and over (spam!)

**Module 2 Notifications is like hiring a smart receptionist** who:
- ✅ Checks if the person wants to receive calls before dialing
- ✅ Writes down every call attempt in a logbook
- ✅ Tries again later if the line is busy
- ✅ Prevents spam by limiting how many calls one person gets
- ✅ Sends messages via the person's preferred method (email, SMS, or WhatsApp)

---

## 🎁 What Benefits Does This Give You?

### For Your Business:
1. **Legal Protection**: Complete audit trail of every notification sent (GDPR compliance)
2. **Cost Savings**: Stop paying for unwanted SMS/emails that people ignore
3. **Better Delivery**: If email fails, system auto-retries instead of giving up
4. **Professional Image**: No more spam complaints from staff/clients
5. **Transparency**: See exactly what notifications went out and why

### For Staff Members:
1. **Control**: Choose what notifications they want to receive
2. **No Spam**: Won't get bombarded with unwanted messages
3. **Reliability**: Important shift reminders will retry if they fail first time
4. **Multi-Channel**: Can receive via email, SMS, or WhatsApp (their choice)

### For Clients:
1. **Quiet Mode**: Can turn off non-critical updates
2. **Important Alerts Only**: Critical stuff (invoices, compliance) always gets through
3. **Professional Service**: Fewer annoying notifications

### For Admins:
1. **Visibility**: Dashboard showing all notification activity
2. **Control**: Can enable/disable different notification types
3. **Troubleshooting**: See why a notification failed or was skipped
4. **Compliance**: Proof that you sent required notifications

---

## 🏗️ How Does It Work? (The Simple Version)

### Before Sending ANY Notification:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PREFERENCE CHECK                                         │
│    "Does this person want to receive this type of message?" │
│    ├─ YES → Continue to step 2                              │
│    └─ NO  → Skip & log why (respects their choice)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. RATE LIMIT CHECK                                         │
│    "Have we sent too many messages recently?"               │
│    ├─ NO  → Continue to step 3                              │
│    └─ YES → Skip & log (prevent spam)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SEND THE MESSAGE                                         │
│    Try to send via Email/SMS/WhatsApp                       │
│    ├─ SUCCESS → Log success with message ID                 │
│    └─ FAILURE → Go to step 4                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. RETRY LOGIC (If failed)                                  │
│    Schedule automatic retries:                              │
│    ├─ Retry 1: In 5 minutes                                 │
│    ├─ Retry 2: In 10 minutes                                │
│    ├─ Retry 3: In 20 minutes                                │
│    └─ If all fail: Alert admin                              │
└─────────────────────────────────────────────────────────────┘
```

### Critical Notifications (Special Rules):
- **Invoices**: Always sent (bypass preferences)
- **Compliance Warnings**: Always sent (legal requirement)
- **Legal Notices**: Always sent (regulatory)

---

## 📱 Where Is This In The Frontend?

### For Staff Members:
**Location**: Profile → Notification Preferences

**What They See**:
```
┌─────────────────────────────────────────────────┐
│ 📧 Notification Preferences                     │
├─────────────────────────────────────────────────┤
│                                                 │
│ [ ] Shift Reminders (email/SMS)                 │
│     Get reminded 24h and 2h before shifts       │
│                                                 │
│ [x] Timesheet Reminders (email)                 │
│     Reminder to submit timesheet after shift    │
│                                                 │
│ [ ] Daily Digest (email)                        │
│     Summary of upcoming shifts each morning     │
│                                                 │
│ [x] Payment Updates (email/SMS)                 │
│     When your payment is processed              │
│                                                 │
│ [x] System Updates (email)                      │
│     Important account/profile updates           │
│                                                 │
│ ⚠️ Note: Critical notifications (invoices,      │
│    compliance warnings) cannot be disabled      │
│                                                 │
│         [Save Preferences]                      │
└─────────────────────────────────────────────────┘
```

**How to Access**:
1. Staff logs in to their portal
2. Clicks "My Profile" or "Settings"
3. Sees "Notification Preferences" tab
4. Toggles checkboxes on/off
5. Clicks "Save"

### For Clients:
**Location**: Client Portal → Settings → Notifications

**What They See**:
```
┌─────────────────────────────────────────────────┐
│ 📧 Notification Settings                        │
├─────────────────────────────────────────────────┤
│                                                 │
│ [x] Shift Confirmations (email)                 │
│     When staff are assigned to your shifts      │
│                                                 │
│ [ ] Daily Digest (email)                        │
│     Daily summary of shift activity             │
│                                                 │
│ [x] Timesheet Approvals (email)                 │
│     When timesheets need your approval          │
│                                                 │
│ [ ] Marketing Updates (email)                   │
│     New services and special offers             │
│                                                 │
│ ⚠️ Invoices and compliance notices cannot       │
│    be disabled (legal requirement)              │
│                                                 │
│         [Save Settings]                         │
└─────────────────────────────────────────────────┘
```

### For Admins:
**Location**: Admin Dashboard → Notifications → Activity Log

**What They See**:
```
┌──────────────────────────────────────────────────────────────┐
│ 📊 Notification Activity (Last 24 Hours)                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ Sent:     847 notifications                              │
│  ⏭️  Skipped:  123 (user preferences)                        │
│  ❌ Failed:    12 (4 retrying, 8 permanent)                  │
│  📈 Retry Queue: 15 pending                                  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Type            Channel   Sent  Failed  Skipped    │     │
│  ├────────────────────────────────────────────────────┤     │
│  │ Shift Reminders  SMS      234   2       45         │     │
│  │ Shift Reminders  Email    189   0       67         │     │
│  │ Timesheets      Email     156   3       8          │     │
│  │ Daily Digest    Email     98    1       3          │     │
│  │ Compliance      Email/SMS 47    2       0 (critical)│    │
│  │ Invoices        Email     123   4       0 (critical)│    │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  Recent Failures:                                            │
│  └─ 14:23 - Failed to send shift reminder to John Smith     │
│     Reason: Twilio API timeout                               │
│     Status: Retry scheduled in 5 minutes                     │
│                                                              │
│  └─ 14:15 - Failed to send invoice to Acme Hospital         │
│     Reason: Invalid email address                            │
│     Status: Admin workflow created for manual follow-up      │
│                                                              │
│            [View Full Activity Log]  [Export CSV]            │
└──────────────────────────────────────────────────────────────┘
```

**Admin Can Also**:
- View individual notification logs (who, what, when, why)
- See retry queue status
- Filter by date range, notification type, or recipient
- Export logs for compliance audits
- View user preference settings (but not change them)

---

## ⚙️ What Can Be Enabled/Disabled?

### System-Wide Feature Flags (Admin Only)

These are set in Supabase environment variables:

```
┌─────────────────────────────────────────────────────────────┐
│ FEATURE FLAG                    │ What It Does              │
├─────────────────────────────────────────────────────────────┤
│ ENABLE_PREFERENCE_CHECKING=true │ Respect user preferences  │
│ ENABLE_NOTIFICATION_LOGGING=true│ Log all notifications     │
│ ENABLE_RATE_LIMITING=true       │ Prevent spam              │
│ ENABLE_RETRY_LOGIC=true         │ Auto-retry failures       │
└─────────────────────────────────────────────────────────────┘
```

**Where to Set These**:
1. Go to Supabase Dashboard
2. Select your project: `rzzxxkppkiasuouuglaf`
3. Settings → Edge Functions → Environment Variables
4. Add/Edit these variables
5. Restart affected functions

### Per-Agency Settings (Coming Soon)

In the `agencies` table → `settings` JSONB field:

```json
{
  "notification_settings": {
    "enabled": true,
    "channels": ["email", "sms", "whatsapp"],
    "daily_digest_time": "08:00",
    "reminder_timing": {
      "shift_reminder_24h": true,
      "shift_reminder_2h": true,
      "post_shift_timesheet": true
    }
  }
}
```

### Per-User Settings (Staff/Client)

Stored in `notification_preferences` table:

```sql
SELECT * FROM notification_preferences WHERE user_email = 'john@example.com';
```

Returns:
```
notification_type     | enabled | channels
--------------------  | ------- | -----------
shift_reminder        | true    | sms,email
daily_digest          | false   | -
timesheet_reminder    | true    | email
payment_update        | true    | email,sms
marketing             | false   | -
```

---

## 🚀 What To Deploy

### Step 1: Database Tables (Already Done)

These tables store all the data:

```
notification_preferences  → User opt-in/opt-out settings
notification_log         → Audit trail of all notifications
notification_queue       → Retry queue for failed notifications
```

### Step 2: Edge Functions to Deploy

**Required Core Functions**:
```bash
# These handle actual sending
supabase functions deploy send-email
supabase functions deploy send-sms
supabase functions deploy send-whatsapp
```

**Required Support Functions**:
```bash
# Handles retries
supabase functions deploy retry-worker

# Handles unsubscribe links
supabase functions deploy handle-unsubscribe
```

**All 20 Notification Engines** (these trigger the notifications):
```bash
# Pilot engines
supabase functions deploy notification-digest-engine
supabase functions deploy shift-reminder-engine
supabase functions deploy payment-reminder-engine

# Batch 1 - High Priority
supabase functions deploy email-automation-engine
supabase functions deploy daily-client-digest
supabase functions deploy staff-daily-digest-engine
supabase functions deploy post-shift-rating-reminder
supabase functions deploy post-shift-timesheet-reminder

# Batch 2 - Medium Priority
supabase functions deploy incomplete-profile-reminder
supabase functions deploy send-profile-reminders
supabase functions deploy smart-clock-out-reminders
supabase functions deploy critical-change-notifier
supabase functions deploy internal-admin-notifier
supabase functions deploy client-communication-automation

# Batch 3 - Final
supabase functions deploy auto-approval-engine
supabase functions deploy auto-timesheet-approval-engine
supabase functions deploy compliance-monitor
supabase functions deploy no-show-detection-engine
supabase functions deploy urgent-shift-escalation
supabase functions deploy enhanced-whatsapp-offers
```

**Quick Deploy All** (if you have a deploy script):
```bash
./deploy-all-notification-engines.sh
```

### Step 3: Set Up Cron Jobs

**Retry Worker** (runs every 5 minutes to process retry queue):
```sql
SELECT cron.schedule(
  'retry-worker-job',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
      url:='https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/retry-worker',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

**Daily Digests** (runs at 8am every day):
```sql
SELECT cron.schedule(
  'daily-staff-digest-job',
  '0 8 * * *',
  $$
  SELECT net.http_post(
      url:='https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/staff-daily-digest-engine',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

**Compliance Monitor** (runs daily at midnight):
```sql
SELECT cron.schedule(
  'compliance-monitor-job',
  '0 0 * * *',
  $$
  SELECT net.http_post(
      url:='https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/compliance-monitor',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

---

## 🎮 What Can Each User Type Do?

### 👤 Staff Members Can:
1. **Set Preferences**: Choose which notifications to receive
2. **Choose Channels**: Email, SMS, or WhatsApp (per notification type)
3. **View History**: See past notifications sent to them (if you build this UI)
4. **Unsubscribe**: Click unsubscribe links in emails
5. **Cannot Disable**: Invoices, compliance warnings, legal notices

### 🏥 Clients Can:
1. **Set Preferences**: Choose which updates to receive
2. **Choose Channels**: Email or SMS (most client comms are email)
3. **View History**: See communication log (if you build this UI)
4. **Unsubscribe**: From marketing emails only
5. **Cannot Disable**: Invoices, timesheet approval requests, compliance notices

### 👨‍💼 Admins Can:
1. **View Activity Log**: See all notifications sent/failed/skipped
2. **Troubleshoot**: See why a notification failed
3. **Monitor Queue**: See retry queue status
4. **Export Logs**: Download CSV for compliance audits
5. **Override**: Manually resend failed notifications (if you build this)
6. **View User Preferences**: See what each user has opted into
7. **System Settings**: Enable/disable entire notification types
8. **Cannot**: Change user preferences on their behalf (users control their own)

### 🔧 Developers/Ops Can:
1. **Enable/Disable Features**: Via environment variables
2. **Monitor Performance**: Database queries showing volume
3. **Debug**: Read notification_log table directly
4. **Configure**: Retry delays, rate limits
5. **Deploy**: New notification engines

---

## 📊 What To Look For (Success Indicators)

### Week 1: Logging Only
```sql
-- Check if notifications are being logged
SELECT
    DATE(created_at) as date,
    COUNT(*) as total_notifications
FROM notification_log
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Expected**: You should see hundreds/thousands of entries per day

### Week 2: Preferences Enabled
```sql
-- Check skip rate
SELECT
    notification_type,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped,
    ROUND(COUNT(CASE WHEN status = 'skipped' THEN 1 END)::numeric / COUNT(*) * 100, 2) as skip_rate
FROM notification_log
GROUP BY notification_type;
```

**Expected**:
- Marketing: 40-60% skip rate (many opt-out)
- System updates: 5-15% skip rate
- Critical: 0% skip rate (bypasses preferences)

### Week 3: Rate Limiting Enabled
```sql
-- Check if rate limiting is working
SELECT
    recipient_email,
    DATE(created_at) as date,
    COUNT(*) as notifications_sent
FROM notification_log
WHERE status = 'sent'
  AND created_at >= NOW() - INTERVAL '1 day'
GROUP BY recipient_email, DATE(created_at)
HAVING COUNT(*) > 15
ORDER BY notifications_sent DESC;
```

**Expected**: No one should receive more than 15 non-critical notifications in an hour

### Week 4: Retry Logic Active
```sql
-- Check retry queue processing
SELECT
    status,
    COUNT(*) as count,
    AVG(retry_count) as avg_retries
FROM notification_queue
GROUP BY status;
```

**Expected**:
- `sent`: Most retries eventually succeed
- `queued`: Small number waiting (< 50)
- `failed_permanently`: Very few (< 1% of failed)

---

## 🆘 Troubleshooting Guide

### "User says they didn't get a notification"

**Check this**:
```sql
SELECT * FROM notification_log
WHERE recipient_email = 'user@example.com'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

**Possible Reasons**:
1. `status = 'skipped'` → User has opted out
2. `status = 'failed'` → Sending failed (check `error_message`)
3. `status = 'sent'` → We sent it, check their spam folder
4. No record → Engine didn't trigger (check cron jobs)

### "Too many notifications being sent"

**Check this**:
```sql
SELECT
    recipient_email,
    notification_type,
    COUNT(*) as count
FROM notification_log
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY recipient_email, notification_type
HAVING COUNT(*) > 5
ORDER BY count DESC;
```

**Fix**:
- Check if rate limiting is enabled
- Verify cron jobs aren't running too frequently
- Check for duplicate triggers

### "Retry queue is growing"

**Check this**:
```sql
SELECT * FROM notification_queue
WHERE status = 'queued'
  AND scheduled_for < NOW()
ORDER BY scheduled_for;
```

**Fix**:
- Verify `retry-worker` cron job is running
- Check API credentials (Twilio, Resend)
- Manually invoke retry-worker to clear backlog

### "Cannot disable a notification type"

**Check this**:
```typescript
// In preferenceChecker.ts, these types bypass preferences:
const criticalTypes = [
  'invoice',
  'compliance_warning',
  'legal_notice',
  'payment_failed'
];
```

**Fix**: This is by design for legal/compliance reasons. Document why it's required.

---

## 📈 Performance Expectations

### Database Size Growth:
- **notification_log**: ~10,000 rows per day for 100 active staff
- **notification_queue**: Usually < 100 rows (retries clear quickly)
- **notification_preferences**: Static (only grows when users join)

### Function Execution:
- **send-email**: ~200-500ms per email
- **send-sms**: ~100-300ms per SMS
- **retry-worker**: Processes ~50 notifications per minute

### Costs (Estimates):
- **Supabase Function Invocations**: Free tier = 500K/month (you'll likely stay under)
- **Twilio SMS**: $0.0075 per SMS (100 SMS = $0.75)
- **Resend Email**: $20/month for 50K emails
- **Database Storage**: ~$0.25/GB/month (notification logs are tiny)

---

## 🎯 Quick Start Deployment Checklist

```
□ Database tables created (notification_preferences, notification_log, notification_queue)
□ Environment variables set (RESEND_API_KEY, TWILIO_ACCOUNT_SID, etc.)
□ Feature flags configured (start with ENABLE_NOTIFICATION_LOGGING=true only)
□ Deploy send-email, send-sms, send-whatsapp functions
□ Deploy retry-worker function
□ Set up retry-worker cron job (every 5 minutes)
□ Deploy notification engines (start with 3 pilot engines)
□ Test with a real user:
  □ Send them a shift reminder
  □ Check notification_log for entry
  □ Verify they received it
□ Enable ENABLE_PREFERENCE_CHECKING=true
□ Build frontend UI for user preferences
□ Deploy remaining 17 notification engines
□ Enable ENABLE_RATE_LIMITING=true
□ Enable ENABLE_RETRY_LOGIC=true
□ Monitor for 1 week
□ Review metrics and adjust
```

---

## 📞 Support & Documentation

**Files to Read**:
- [Batch 1 Approval](BATCH_1_COMPLETE_APPROVED.md)
- [Batch 2 Approval](BATCH_2_COMPLETE_APPROVED.md)
- [Quick Reference](MODULE_2_QUICK_REFERENCE.md)

**Technical Diagrams**: See `rollout_guide.md` for detailed architecture

**Questions?** Check the notification_log table first - it tells you everything.

---

**Last Updated**: 2025-12-06
**Version**: 1.0 (Module 2 Complete - 20/20 engines)
**Status**: ✅ Production Ready
