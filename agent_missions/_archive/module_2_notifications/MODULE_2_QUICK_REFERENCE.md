# Module 2 Notifications - Quick Reference Card

## 🎯 One-Sentence Summary

**Module 2 adds a smart notification system that checks user preferences, logs everything, automatically retries failures, and prevents spam.**

---

## 📊 The 20 Notification Engines (What Triggers What)

### Daily Automated (Run by Cron)
```
┌─────────────────────────────────────────────────────────┐
│ 08:00 AM Daily → staff-daily-digest-engine             │
│              → Sends "Today's Shifts" email to staff    │
│                                                         │
│ 08:00 AM Daily → daily-client-digest                   │
│              → Sends "Today's Coverage" email to client │
│                                                         │
│ 12:00 AM Daily → compliance-monitor                    │
│              → Checks expiring documents, sends alerts  │
│                                                         │
│ Every 5 min    → retry-worker                          │
│              → Processes failed notifications           │
└─────────────────────────────────────────────────────────┘
```

### Event-Triggered (When Something Happens)
```
┌─────────────────────────────────────────────────────────┐
│ SHIFT CREATED      → enhanced-whatsapp-offers          │
│                   → Sends shift offer via WhatsApp      │
│                                                         │
│ 24H BEFORE SHIFT   → shift-reminder-engine             │
│                   → "Don't forget your shift tomorrow!" │
│                                                         │
│ 2H BEFORE SHIFT    → shift-reminder-engine             │
│                   → "Your shift starts in 2 hours"      │
│                                                         │
│ SHIFT ENDS         → post-shift-timesheet-reminder     │
│                   → "Please submit your timesheet"      │
│                                                         │
│ SHIFT ENDS         → post-shift-rating-reminder        │
│                   → "Rate your experience"              │
│                                                         │
│ FORGOT CLOCK-OUT   → smart-clock-out-reminders         │
│                   → "Did you forget to clock out?"      │
│                                                         │
│ NO CLOCK-IN        → no-show-detection-engine          │
│                   → "Where are you? Clock in now!"      │
│                                                         │
│ TIMESHEET SUBMITTED→ auto-timesheet-approval-engine    │
│                   → Auto-approves clean timesheets      │
│                                                         │
│ PAYMENT DUE        → payment-reminder-engine           │
│                   → "Invoice due in X days"             │
│                                                         │
│ PROFILE INCOMPLETE → incomplete-profile-reminder       │
│                   → "Complete your profile" (Day 1,3,7) │
│                                                         │
│ CRITICAL CHANGE    → critical-change-notifier          │
│                   → "Your rate/shift was changed"       │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 The Preference System (Who Controls What)

### User Can Disable (Opt-Out Allowed)
```
✓ Shift reminders
✓ Daily digest emails
✓ Timesheet reminders
✓ Rating requests
✓ Profile completion nudges
✓ Marketing emails
```

### User CANNOT Disable (Critical)
```
✗ Invoices
✗ Compliance warnings
✗ Document expiry alerts
✗ Legal notices
✗ Payment failed alerts
```

---

## 📍 Database Tables (Where Data Lives)

```
notification_preferences
├─ user_email: "john@example.com"
├─ notification_type: "shift_reminder"
├─ enabled: true
└─ channels: ["email", "sms"]

notification_log (THE AUDIT TRAIL)
├─ recipient_email: "john@example.com"
├─ notification_type: "shift_reminder"
├─ channel: "sms"
├─ status: "sent" | "failed" | "skipped"
├─ provider_message_id: "SM123abc..."
├─ error_message: (if failed)
├─ skip_reason: (if skipped)
└─ created_at: 2025-12-06 14:30:00

notification_queue (THE RETRY QUEUE)
├─ notification_type: "shift_reminder"
├─ recipient_email: "john@example.com"
├─ channel: "sms"
├─ retry_count: 1
├─ scheduled_for: 2025-12-06 14:35:00 (5 min later)
├─ status: "queued" | "sent" | "failed_permanently"
└─ content: "{message: '...'}"
```

---

## 🚀 Deployment Commands

### Deploy Everything (One-Shot)
```bash
cd C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3

# Deploy core sending functions
/c/Users/gbase/superbasecli/supabase.exe functions deploy send-email --project-ref rzzxxkppkiasuouuglaf
/c/Users/gbase/superbasecli/supabase.exe functions deploy send-sms --project-ref rzzxxkppkiasuouuglaf
/c/Users/gbase/superbasecli/supabase.exe functions deploy send-whatsapp --project-ref rzzxxkppkiasuouuglaf

# Deploy retry worker
/c/Users/gbase/superbasecli/supabase.exe functions deploy retry-worker --project-ref rzzxxkppkiasuouuglaf

# Deploy all 20 notification engines (do this in one go)
for func in \
  shift-reminder-engine \
  payment-reminder-engine \
  notification-digest-engine \
  email-automation-engine \
  daily-client-digest \
  staff-daily-digest-engine \
  post-shift-rating-reminder \
  post-shift-timesheet-reminder \
  incomplete-profile-reminder \
  send-profile-reminders \
  smart-clock-out-reminders \
  critical-change-notifier \
  internal-admin-notifier \
  client-communication-automation \
  auto-approval-engine \
  auto-timesheet-approval-engine \
  compliance-monitor \
  no-show-detection-engine \
  urgent-shift-escalation \
  enhanced-whatsapp-offers
do
  /c/Users/gbase/superbasecli/supabase.exe functions deploy $func --project-ref rzzxxkppkiasuouuglaf
done
```

### Set Environment Variables
```bash
# Go to Supabase Dashboard → Settings → Edge Functions → Secrets

ENABLE_PREFERENCE_CHECKING=true
ENABLE_NOTIFICATION_LOGGING=true
ENABLE_RATE_LIMITING=true
ENABLE_RETRY_LOGIC=true

RESEND_API_KEY=re_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
OPENAI_API_KEY=sk-...
```

---

## 🧪 Testing Commands

### Test Notification Flow
```bash
# Test sending an email
curl -X POST \
  "https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/send-email" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your.email@example.com",
    "subject": "Test Notification",
    "body": "This is a test"
  }'

# Check if it was logged
SELECT * FROM notification_log
WHERE recipient_email = 'your.email@example.com'
ORDER BY created_at DESC
LIMIT 5;
```

### Test Preference Checking
```sql
-- Insert a preference (user opts out of shift reminders)
INSERT INTO notification_preferences (user_email, notification_type, enabled)
VALUES ('test@example.com', 'shift_reminder', false);

-- Now try to send a shift reminder to them
-- It should be skipped with reason "user_opted_out"
```

### Test Retry Logic
```bash
# Manually queue a notification for retry
INSERT INTO notification_queue (
  notification_type,
  recipient_email,
  channel,
  retry_count,
  scheduled_for,
  content
) VALUES (
  'shift_reminder',
  'test@example.com',
  'sms',
  0,
  NOW() + INTERVAL '1 minute',
  '{"message": "Test retry message"}'::jsonb
);

-- Wait 1 minute, then trigger retry worker
curl -X POST \
  "https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/retry-worker" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

-- Check if it was processed
SELECT * FROM notification_queue WHERE recipient_email = 'test@example.com';
```

---

## 📊 Monitoring Queries

### Daily Notification Summary
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped,
  ROUND(COUNT(CASE WHEN status = 'sent' THEN 1 END)::numeric / COUNT(*) * 100, 1) as success_rate
FROM notification_log
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Top Skip Reasons
```sql
SELECT
  skip_reason,
  COUNT(*) as count
FROM notification_log
WHERE status = 'skipped'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY skip_reason
ORDER BY count DESC;
```

### Retry Queue Health
```sql
SELECT
  status,
  COUNT(*) as count,
  MIN(scheduled_for) as oldest_retry,
  MAX(retry_count) as max_retries
FROM notification_queue
GROUP BY status;
```

### Failed Notifications (Need Attention)
```sql
SELECT
  recipient_email,
  notification_type,
  channel,
  error_message,
  created_at
FROM notification_log
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🎨 Frontend UI Components Needed

### Staff Profile Page
```typescript
// Component: NotificationPreferences.jsx

import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function NotificationPreferences({ userEmail }) {
  const [preferences, setPreferences] = useState([]);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_email', userEmail);
    setPreferences(data);
  }

  async function togglePreference(type, enabled) {
    await supabase
      .from('notification_preferences')
      .upsert({
        user_email: userEmail,
        notification_type: type,
        enabled: enabled
      });
    loadPreferences();
  }

  return (
    <div className="notification-preferences">
      <h3>Notification Preferences</h3>
      {preferences.map(pref => (
        <div key={pref.notification_type}>
          <label>
            <input
              type="checkbox"
              checked={pref.enabled}
              onChange={(e) => togglePreference(pref.notification_type, e.target.checked)}
            />
            {pref.notification_type.replace('_', ' ').toUpperCase()}
          </label>
        </div>
      ))}
    </div>
  );
}
```

### Admin Dashboard
```typescript
// Component: NotificationActivityLog.jsx

function NotificationActivityLog() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    loadStats();
    loadRecentLogs();
  }, []);

  async function loadStats() {
    const { data } = await supabase.rpc('get_notification_stats_24h');
    setStats(data);
  }

  async function loadRecentLogs() {
    const { data } = await supabase
      .from('notification_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setLogs(data);
  }

  return (
    <div className="notification-dashboard">
      <div className="stats">
        <div className="stat-card">
          <h4>Sent (24h)</h4>
          <p>{stats.sent}</p>
        </div>
        <div className="stat-card">
          <h4>Failed (24h)</h4>
          <p>{stats.failed}</p>
        </div>
        <div className="stat-card">
          <h4>Skipped (24h)</h4>
          <p>{stats.skipped}</p>
        </div>
      </div>

      <table className="activity-log">
        <thead>
          <tr>
            <th>Time</th>
            <th>Recipient</th>
            <th>Type</th>
            <th>Channel</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>{new Date(log.created_at).toLocaleString()}</td>
              <td>{log.recipient_email}</td>
              <td>{log.notification_type}</td>
              <td>{log.channel}</td>
              <td className={`status-${log.status}`}>{log.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## ⚡ Performance Tips

### Index Your Tables
```sql
-- Make queries faster
CREATE INDEX idx_notif_log_recipient ON notification_log(recipient_email);
CREATE INDEX idx_notif_log_created ON notification_log(created_at);
CREATE INDEX idx_notif_log_status ON notification_log(status);
CREATE INDEX idx_notif_queue_scheduled ON notification_queue(scheduled_for);
```

### Archive Old Logs (Monthly Cleanup)
```sql
-- Move logs older than 90 days to archive table
CREATE TABLE notification_log_archive AS
SELECT * FROM notification_log WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM notification_log WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## 🆘 Common Issues & Fixes

| Problem | Check This | Fix |
|---------|-----------|-----|
| No notifications sent | `SELECT COUNT(*) FROM notification_log;` | Verify engines are deployed |
| All notifications skipped | `SELECT * FROM notification_preferences;` | Users opted out - expected |
| Notifications not retrying | Check retry-worker cron job | Re-create cron schedule |
| Duplicate notifications | Check cron job frequency | Ensure jobs run once per schedule |
| High failure rate | `SELECT error_message FROM notification_log WHERE status='failed';` | Check API credentials |

---

## 📞 Quick Help

**Where is the audit trail?** → `notification_log` table
**Where are user preferences?** → `notification_preferences` table
**Where is the retry queue?** → `notification_queue` table
**How to test?** → Send to your own email/phone first
**How to debug?** → Query `notification_log` for that recipient
**How to disable a feature?** → Set environment variable to `false`

---

**File Location**: `C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3\agent_missions\module_2_notifications\MODULE_2_QUICK_REFERENCE.md`
**Last Updated**: 2025-12-06
**Status**: ✅ Production Ready (20/20 engines deployed)
