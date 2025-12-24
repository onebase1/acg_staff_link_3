# Full Automation Strategy for Client Emails

## Vision
**Zero human intervention** - The system autonomously sends the right emails at the right time to the right people, forever.

---

## Automated Components

### 1. Batch Shift Confirmations
**File:** `notification-digest-engine/index.ts`

**Trigger:** Automatic (every 5 minutes)
```typescript
// Cron: */5 * * * * (every 5 min)
// Processes notification_queue table
```

**Flow:**
1. Admin books shifts → Queued in `notification_queue`
2. Every 5 minutes: Engine wakes up
3. Groups by `recipient_email + notification_type`
4. Generates email HTML with template variables
5. Creates magic download links (PDF/CSV/Calendar)
6. Sends via Resend (using agency branding)
7. Logs success/failure
8. Marks queue items as processed

**No manual intervention needed** ✅

---

### 2. Weekly Summary Emails
**File:** `weekly-client-summary/index.ts` (NEW)

**Trigger:** Automatic cron
```typescript
// Cron: 0 8 * * 1 (Every Monday 8 AM)
```

**Flow:**
1. Monday 8 AM: Function triggers
2. Queries all clients with active shifts
3. For each client:
   - Fetch last week's COMPLETED shifts
   - Group by date/role/shift_type
   - Calculate total hours worked
   - Fetch this week's CONFIRMED shifts
   - Group by date/role/shift_type
   - Calculate total hours scheduled
4. Generate invoice-style HTML table
5. Create magic download links
6. Send email (using agency branding)
7. Log success/failure

**No manual intervention needed** ✅

---

### 3. Magic Link Downloads
**File:** `download-shift-schedule/index.ts` (NEW)

**Trigger:** User clicks link (on-demand)

**Flow:**
1. Client clicks PDF/CSV/Calendar button in email
2. URL contains signed token: `/download-schedule/{token}`
3. Edge Function validates token:
   - Checks signature (cryptographically secure)
   - Checks expiry (30 days)
   - Extracts queue_id or summary_id
4. Fetches shift data from database
5. Generates file (PDF/CSV/.ics) on-the-fly
6. Returns file to browser
7. Logs download event

**No manual intervention needed** ✅

---

## Data Sources (Fully Automated)

### For Batch Confirmations
```sql
-- Automatic: notification_queue populated when shifts assigned
SELECT * FROM notification_queue 
WHERE status = 'pending' 
  AND notification_type = 'shift_confirmation'
  AND scheduled_send_at <= NOW()
GROUP BY recipient_email, notification_type
```

### For Weekly Summaries
```sql
-- Last week's completed shifts
SELECT 
  date, role_required, 
  start_time, end_time,
  COUNT(*) as staff_count,
  SUM(EXTRACT(EPOCH FROM (end_time::time - start_time::time))/3600) as hours
FROM shifts
WHERE client_id = ?
  AND date >= (CURRENT_DATE - INTERVAL '7 days')
  AND date < CURRENT_DATE
  AND status IN ('completed', 'awaiting_admin_closure')
GROUP BY date, role_required, start_time, end_time
ORDER BY date, start_time, role_required;

-- This week's confirmed shifts
SELECT 
  date, role_required,
  start_time, end_time,
  COUNT(*) as staff_count,
  SUM(EXTRACT(EPOCH FROM (end_time::time - start_time::time))/3600) as hours
FROM shifts
WHERE client_id = ?
  AND date >= CURRENT_DATE
  AND date < (CURRENT_DATE + INTERVAL '7 days')
  AND status IN ('confirmed', 'in_progress')
GROUP BY date, role_required, start_time, end_time
ORDER BY date, start_time, role_required;
```

---

## Preference System (Automated Checking)

### Before Sending ANY Email
```typescript
const preferenceCheck = await shouldSendNotification(
  supabase,
  client.contact_person.email,
  'shift_confirmation', // or 'weekly_digest'
  'email',
  'client'
);

if (!preferenceCheck.allowed) {
  // Log skip reason, don't send
  await logNotificationSkipped(...);
  continue;
}

// Proceed with send
```

**Preferences stored in:** `client_contacts.notification_preferences` (JSONB)
**UI for clients:** `/client/notification-preferences`
**Defaults:** All emails ON except promotional

**No manual intervention needed** ✅

---

## White-labeling (Automated)

### Agency Branding Auto-Fetched
```typescript
const { data: agency } = await supabase
  .from('agencies')
  .select('name, branding')
  .eq('id', client.agency_id)
  .single();

const agencyName = agency.name;
const agencyEmail = agency.branding?.support_email 
  || Deno.env.get("SAAS_SUPPORT_EMAIL")
  || "noreply@agilecaremanagement.co.uk";
```

**Fallback chain ensures emails always send** ✅

---

## Error Handling (Fully Automated)

### Automatic Retry Logic
```typescript
try {
  await sendEmail(...);
  await logNotificationSent(...);
} catch (error) {
  // Log failure
  await logNotificationFailed(supabase, {
    recipientEmail,
    notificationType,
    errorMessage: error.message,
    errorCode: 'send_failed'
  });
  
  // Schedule retry (automatic)
  await scheduleRetry(supabase, {
    notificationType,
    recipientEmail,
    recipientId,
    agencyId,
    channel: 'email',
    metadata: { queueId }
  });
}
```

**Retry worker runs every 15 minutes** ✅
**No manual intervention needed** ✅

---

## Monitoring (Automated Logging)

### All Events Logged to `notification_log`
- ✅ Every send (success/failure)
- ✅ Every preference check
- ✅ Every skip (with reason)
- ✅ Every retry attempt
- ✅ Provider message IDs (for tracking)

### Analytics Queries (Self-Service)
```sql
-- Email success rate
SELECT 
  notification_type,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'sent') / COUNT(*), 2) as success_rate
FROM notification_log
WHERE channel = 'email'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY notification_type;

-- Opt-out trends
SELECT 
  date_trunc('week', created_at) as week,
  notification_type,
  COUNT(*) as opt_outs
FROM notification_log
WHERE status = 'skipped'
  AND skipped_reason = 'user_opted_out'
GROUP BY week, notification_type
ORDER BY week DESC;
```

**No manual monitoring needed** ✅

---

## Deployment Strategy

### One-Time Setup
1. Deploy `notification-digest-engine` updates
2. Deploy new `weekly-client-summary` Edge Function
3. Deploy new `download-shift-schedule` Edge Function
4. Set cron schedule for weekly summary
5. Add env vars (`SAAS_SUPPORT_EMAIL`, `SAAS_NAME`)

### Then: Zero Maintenance
- ✅ Batch emails send automatically when shifts booked
- ✅ Weekly summaries send every Monday 8 AM
- ✅ Download links work on-demand
- ✅ Preferences respected automatically
- ✅ Retries happen automatically
- ✅ White-labeling applied automatically

---

## Success Criteria

### System is fully automated when:
- [x] Emails send without manual triggers
- [x] Preferences checked before every send
- [x] Failures logged and auto-retried
- [x] White-labeling applied from database
- [x] Download links work for 30 days
- [x] Cron jobs run on schedule
- [x] No hardcoded values (all dynamic)
- [x] Multi-tenant isolation works

### Human intervention ONLY for:
- Adding new notification types (rare)
- Debugging edge cases (rare)
- Reviewing analytics dashboards (optional)

**Everything else: 100% autonomous** ✅

---

## Future Enhancements (Still Automated)

### Phase 2 (Optional)
- [ ] Add monthly billing preview email (cron: 25th of month)
- [ ] Add client onboarding email series (triggered by new client)
- [ ] Add shift cancellation digest (triggered by cancellations)
- [ ] Add compliance expiry warnings (cron: daily check)

**All would be fully automated using same pattern** ✅
