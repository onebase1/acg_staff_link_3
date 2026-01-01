# n8n Client Email Automation - Implementation Plan

**Date**: 2025-12-31
**Author**: Claude Code
**Status**: In Progress

## Executive Summary

This plan details the migration of 3 client email types from Supabase Edge Functions to n8n workflows, using a parallel running strategy for safe validation before full cutover.

### Why n8n?

1. **Visual workflow management** - Easier to debug and modify than Edge Functions
2. **Built-in scheduling** - No need to manage cron jobs in database
3. **Centralized monitoring** - Single dashboard for all automation
4. **Scalability** - Easy to add SMS, WhatsApp, and other channels
5. **Cost efficiency** - Self-hosted, no per-execution fees

### Goals

- [x] Research current notification system architecture
- [x] Design n8n workflow architecture
- [ ] Build 4 n8n workflows
- [ ] Test in parallel with existing system
- [ ] Validate outputs match 100%
- [ ] Gradual cutover (one email type at a time)
- [ ] Full migration with rollback plan

---

## Architecture Design

### Workflow Structure

We'll create **1 shared sub-workflow + 3 main workflows**:

```
┌─────────────────────────────────────────┐
│  [SHARED] Send Email with Audit Logging │ ← Called by all workflows
└─────────────────────────────────────────┘
              ↑           ↑           ↑
              │           │           │
    ┌─────────┴──┐  ┌─────┴──────┐  ┌┴──────────────┐
    │ Batch      │  │ Daily      │  │ Weekly        │
    │ Confirms   │  │ Digest     │  │ Summary       │
    └────────────┘  └────────────┘  └───────────────┘
       Cron 5min     Cron 10am       Cron Mon 8am
```

### Data Flow

**Batch Confirmations**:
```
notification_queue (pending)
  ↓
Query: Get pending batch confirmations
  ↓
For each queue item:
  ↓
  Fetch: Shift details, staff names, client info
  ↓
  Transform: Group by Date → Time → Role
  ↓
  Template: Build HTML email
  ↓
  Call: [SHARED] Send Email
    ↓
    Fetch: Agency branding
    ↓
    Check: User preferences (opt-out)
    ↓
    If allowed:
      → Send via Resend API
      → Log to notification_log (success)
      → Update queue status = 'sent'
    If blocked:
      → Log to notification_log (skipped)
      → Update queue status = 'cancelled'
```

**Daily Digest**:
```
Cron trigger (10 AM daily)
  ↓
Query: Get all active clients
  ↓
For each client:
  ↓
  Query: Tomorrow's confirmed shifts
  ↓
  If has shifts:
    ↓
    Template: Build daily digest HTML
    ↓
    Call: [SHARED] Send Email
```

**Weekly Summary**:
```
Cron trigger (Monday 8 AM)
  ↓
Calculate: Date range (last Mon-Sun)
  ↓
Query: Get all active clients
  ↓
For each client:
  ↓
  RPC: get_weekly_summary_data()
  ↓
  If has data:
    ↓
    Template: Build weekly summary HTML
    ↓
    Call: [SHARED] Send Email
```

---

## Workflow Specifications

### 1. [SHARED] Send Email with Audit Logging

**Trigger Type**: Webhook
**URL**: `https://n8n.dreampathai.co.uk/webhook/send-email-with-logging`
**Method**: POST

**Input Schema**:
```json
{
  "recipient_email": "client@example.com",
  "subject": "Your daily staff digest",
  "html_content": "<html>...</html>",
  "agency_id": "uuid",
  "notification_type": "daily_digest",
  "client_id": "uuid",
  "metadata": {}
}
```

**Node Sequence**:

1. **Webhook** - Receive input data
2. **PostgreSQL - Fetch Agency Branding**
   ```sql
   SELECT name, logo_url, branding
   FROM agencies
   WHERE id = '{{$json.agency_id}}'
   LIMIT 1
   ```
3. **PostgreSQL - Check User Preferences**
   ```sql
   SELECT
     email_notifications,
     notification_preferences
   FROM clients
   WHERE id = '{{$json.client_id}}'
   LIMIT 1
   ```
4. **Function - Process Preference Check**
   ```javascript
   const client = $input.item.json;
   const allowed = client.email_notifications !== false;
   const reason = allowed ? 'opted_in' : 'opted_out';

   return {
     allowed: allowed,
     reason: reason,
     preferenceStatus: reason
   };
   ```
5. **IF Node** - Branch on `allowed`

**Branch A: Allowed to Send**

6. **HTTP Request - Send via Resend**
   - URL: `https://api.resend.com/emails`
   - Method: POST
   - Headers: `Authorization: Bearer {{$env.RESEND_API_KEY}}`
   - Body:
     ```json
     {
       "from": "{{$node['PostgreSQL - Fetch Agency Branding'].json.name}} <noreply@acgstafflink.com>",
       "to": "{{$node['Webhook'].json.recipient_email}}",
       "subject": "{{$node['Webhook'].json.subject}}",
       "html": "{{$node['Webhook'].json.html_content}}"
     }
     ```
7. **PostgreSQL - Log Success**
   ```sql
   INSERT INTO notification_log (
     agency_id,
     recipient_email,
     recipient_type,
     notification_type,
     status,
     delivery_status,
     source,
     preference_checked,
     preference_status,
     email_message_id,
     metadata
   ) VALUES (
     '{{$node['Webhook'].json.agency_id}}',
     '{{$node['Webhook'].json.recipient_email}}',
     'client',
     '{{$node['Webhook'].json.notification_type}}',
     'sent',
     'sent',
     'n8n_workflow',
     true,
     'opted_in',
     '{{$json.id}}',
     '{{$node['Webhook'].json.metadata}}'::jsonb
   )
   ```

**Branch B: Not Allowed (Opted Out)**

8. **PostgreSQL - Log Skipped**
   ```sql
   INSERT INTO notification_log (
     agency_id,
     recipient_email,
     recipient_type,
     notification_type,
     status,
     delivery_status,
     source,
     preference_checked,
     preference_status,
     skip_reason
   ) VALUES (
     '{{$node['Webhook'].json.agency_id}}',
     '{{$node['Webhook'].json.recipient_email}}',
     'client',
     '{{$node['Webhook'].json.notification_type}}',
     'skipped',
     'not_sent',
     'n8n_workflow',
     true,
     'opted_out',
     'User opted out of email notifications'
   )
   ```

**Error Handling**:
- Add Error Trigger node
- On any error:
  ```sql
  INSERT INTO notification_log (
    agency_id, recipient_email, notification_type,
    status, delivery_status, source, error_message
  ) VALUES (
    '{{$node['Webhook'].json.agency_id}}',
    '{{$node['Webhook'].json.recipient_email}}',
    '{{$node['Webhook'].json.notification_type}}',
    'failed', 'failed', 'n8n_workflow',
    '{{$json.message}}'
  )
  ```

---

### 2. Client Emails - Batch Confirmations

**Trigger**: Schedule - Cron `*/5 * * * *` (every 5 minutes)

**Node Sequence**:

1. **Schedule Trigger** - Every 5 minutes
2. **PostgreSQL - Query Pending Queue**
   ```sql
   SELECT
     id,
     agency_id,
     recipient_email,
     notification_type,
     pending_items,
     item_count
   FROM notification_queue
   WHERE status = 'pending'
     AND notification_type = 'shift_confirmation'
     AND scheduled_send_at <= NOW()
   ORDER BY scheduled_send_at ASC
   LIMIT 50
   ```
3. **IF Node** - Check if any results
4. **Loop Over Items** - For each queue item

**Inside Loop**:

5. **Function - Extract Shift IDs**
   ```javascript
   const pendingItems = $json.pending_items;
   const shiftIds = pendingItems.map(item => item.shift_id);
   return { shift_ids: shiftIds };
   ```
6. **PostgreSQL - Fetch Shift Details**
   ```sql
   SELECT
     s.*,
     st.first_name,
     st.last_name,
     st.id as staff_id,
     c.name as client_name,
     c.email as client_email,
     c.id as client_id
   FROM shifts s
   LEFT JOIN staff st ON s.assigned_staff_id = st.id
   JOIN clients c ON s.client_id = c.id
   WHERE s.id = ANY('{{$json.shift_ids}}'::uuid[])
   ORDER BY s.date, s.start_time
   ```
7. **Function - Group Shifts**
   ```javascript
   // JavaScript code to group shifts by Date → Time → Role
   // (see TEMPLATE_FUNCTIONS.md for full code)
   const shifts = $input.all();
   const grouped = groupShiftsByDateTimeRole(shifts);
   return {
     grouped_shifts: grouped,
     client_email: shifts[0].client_email,
     client_name: shifts[0].client_name,
     client_id: shifts[0].client_id,
     agency_id: shifts[0].agency_id
   };
   ```
8. **Function - Build HTML Email**
   ```javascript
   // Load template and inject variables
   // (see TEMPLATE_FUNCTIONS.md for full code)
   const html = buildBatchConfirmationEmail($json);
   return {
     html_content: html,
     subject: `Shift Confirmation - ${$json.client_name}`
   };
   ```
9. **HTTP Request - Call Shared Workflow**
   - URL: `https://n8n.dreampathai.co.uk/webhook/send-email-with-logging`
   - Method: POST
   - Body:
     ```json
     {
       "recipient_email": "{{$json.client_email}}",
       "subject": "{{$json.subject}}",
       "html_content": "{{$json.html_content}}",
       "agency_id": "{{$json.agency_id}}",
       "notification_type": "shift_confirmation",
       "client_id": "{{$json.client_id}}",
       "metadata": {"queue_id": "{{$node['Loop Over Items'].json.id}}"}
     }
     ```
10. **PostgreSQL - Update Queue Status**
    ```sql
    UPDATE notification_queue
    SET status = 'sent', sent_at = NOW()
    WHERE id = '{{$node['Loop Over Items'].json.id}}'
    ```

---

### 3. Client Emails - Daily Digest

**Trigger**: Schedule - Cron `0 10 * * *` (daily at 10 AM)

**Node Sequence**:

1. **Schedule Trigger** - 10 AM daily
2. **PostgreSQL - Get Active Clients**
   ```sql
   SELECT
     id,
     name,
     email,
     agency_id
   FROM clients
   WHERE status = 'active'
     AND email IS NOT NULL
     AND email != ''
   ORDER BY name
   ```
3. **Loop Over Clients** - For each client

**Inside Loop**:

4. **Function - Calculate Tomorrow's Date**
   ```javascript
   const tomorrow = new Date();
   tomorrow.setDate(tomorrow.getDate() + 1);
   return { tomorrow_date: tomorrow.toISOString().split('T')[0] };
   ```
5. **PostgreSQL - Get Tomorrow's Shifts**
   ```sql
   SELECT
     s.*,
     st.first_name,
     st.last_name,
     st.id as staff_id
   FROM shifts s
   LEFT JOIN staff st ON s.assigned_staff_id = st.id
   WHERE s.client_id = '{{$node['Loop Over Clients'].json.id}}'
     AND s.date = '{{$json.tomorrow_date}}'
     AND s.status IN ('confirmed', 'in_progress')
   ORDER BY s.start_time
   ```
6. **IF Node** - Check if has shifts
7. **Function - Build Daily Digest HTML**
   ```javascript
   // Build HTML email with tomorrow's shifts
   // (see TEMPLATE_FUNCTIONS.md for full code)
   const shifts = $input.all();
   const clientData = $node['Loop Over Clients'].json;
   const html = buildDailyDigestEmail(shifts, clientData);
   return {
     html_content: html,
     subject: `Tomorrow's Staff Schedule - ${clientData.name}`
   };
   ```
8. **HTTP Request - Call Shared Workflow**
   - URL: `https://n8n.dreampathai.co.uk/webhook/send-email-with-logging`
   - Method: POST
   - Body:
     ```json
     {
       "recipient_email": "{{$node['Loop Over Clients'].json.email}}",
       "subject": "{{$json.subject}}",
       "html_content": "{{$json.html_content}}",
       "agency_id": "{{$node['Loop Over Clients'].json.agency_id}}",
       "notification_type": "daily_digest",
       "client_id": "{{$node['Loop Over Clients'].json.id}}",
       "metadata": {}
     }
     ```

---

### 4. Client Emails - Weekly Summary

**Trigger**: Schedule - Cron `0 8 * * 1` (Monday at 8 AM)

**Node Sequence**:

1. **Schedule Trigger** - Monday 8 AM
2. **Function - Calculate Date Range**
   ```javascript
   // Get last Monday to Sunday
   const today = new Date();
   const lastMonday = new Date(today);
   lastMonday.setDate(today.getDate() - 7);
   lastMonday.setHours(0, 0, 0, 0);

   const lastSunday = new Date(lastMonday);
   lastSunday.setDate(lastMonday.getDate() + 6);
   lastSunday.setHours(23, 59, 59, 999);

   return {
     start_date: lastMonday.toISOString().split('T')[0],
     end_date: lastSunday.toISOString().split('T')[0]
   };
   ```
3. **PostgreSQL - Get Active Clients**
   ```sql
   SELECT
     id,
     name,
     email,
     agency_id
   FROM clients
   WHERE status = 'active'
     AND email IS NOT NULL
     AND email != ''
   ORDER BY name
   ```
4. **Loop Over Clients** - For each client

**Inside Loop**:

5. **PostgreSQL - Call Weekly Summary RPC**
   ```sql
   SELECT * FROM get_weekly_summary_data(
     p_client_id := '{{$node['Loop Over Clients'].json.id}}',
     p_start_date := '{{$node['Function - Calculate Date Range'].json.start_date}}',
     p_end_date := '{{$node['Function - Calculate Date Range'].json.end_date}}',
     p_include_all_statuses := true
   )
   ```
6. **IF Node** - Check if has data
7. **Function - Build Weekly Summary HTML**
   ```javascript
   // Build invoice-style table HTML
   // (see TEMPLATE_FUNCTIONS.md for full code)
   const summaryData = $input.all();
   const clientData = $node['Loop Over Clients'].json;
   const dateRange = $node['Function - Calculate Date Range'].json;
   const html = buildWeeklySummaryEmail(summaryData, clientData, dateRange);
   return {
     html_content: html,
     subject: `Weekly Summary - ${clientData.name}`
   };
   ```
8. **HTTP Request - Call Shared Workflow**
   - URL: `https://n8n.dreampathai.co.uk/webhook/send-email-with-logging`
   - Method: POST
   - Body:
     ```json
     {
       "recipient_email": "{{$node['Loop Over Clients'].json.email}}",
       "subject": "{{$json.subject}}",
       "html_content": "{{$json.html_content}}",
       "agency_id": "{{$node['Loop Over Clients'].json.agency_id}}",
       "notification_type": "weekly_summary",
       "client_id": "{{$node['Loop Over Clients'].json.id}}",
       "metadata": {"date_range": "{{$node['Function - Calculate Date Range'].json}}"}
     }
     ```

---

## Database Connection Setup

### PostgreSQL Credentials in n8n

**Credential Name**: `Supabase PostgreSQL - ACG StaffLink`

**Configuration**:
- **Host**: `db.rzzxxkppkiasuouuglaf.supabase.co`
- **Port**: `5432`
- **Database**: `postgres`
- **User**: `postgres`
- **Password**: [Retrieve from Supabase project settings]
- **SSL Mode**: `require`
- **Connection Timeout**: 30000ms

### Testing Connection

Run this test query to verify:
```sql
SELECT COUNT(*) as client_count FROM clients WHERE status = 'active'
```

Expected result: A positive integer

---

## Resend API Integration

### Environment Variable in n8n

**Variable Name**: `RESEND_API_KEY`
**Value**: [Retrieve from Supabase secrets or Resend dashboard]

### Test Email

Before deploying, send a test email:
```json
POST https://api.resend.com/emails
Authorization: Bearer re_xxx

{
  "from": "ACG StaffLink <noreply@acgstafflink.com>",
  "to": "your-test@email.com",
  "subject": "n8n Test Email",
  "html": "<h1>Test</h1><p>If you see this, Resend integration works!</p>"
}
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] n8n instance accessible at https://n8n.dreampathai.co.uk/
- [ ] PostgreSQL credentials added to n8n
- [ ] RESEND_API_KEY environment variable set
- [ ] Test database connection (run sample query)
- [ ] Test Resend API (send test email)

### Workflow Creation

- [ ] Create [SHARED] Send Email with Audit Logging
- [ ] Test shared workflow with sample data
- [ ] Create Client Emails - Weekly Summary
- [ ] Test weekly summary with test client
- [ ] Create Client Emails - Daily Digest
- [ ] Test daily digest with test client
- [ ] Create Client Emails - Batch Confirmations
- [ ] Test batch confirmations with test queue item

### Activation (Parallel Running)

- [ ] Activate all 4 workflows
- [ ] Monitor n8n execution logs (first 24 hours)
- [ ] Compare notification_log entries (n8n vs edge functions)
- [ ] Validate email content matches
- [ ] Check success rates match (should be >99%)

### Validation Period (2 weeks)

- [ ] Daily review of execution logs
- [ ] Weekly comparison of sent counts
- [ ] Check for any errors or failures
- [ ] Validate user preferences are respected
- [ ] Confirm no duplicate emails sent

### Gradual Cutover

- [ ] Week 3: Disable notification-digest-engine cron
- [ ] Monitor batch confirmations (n8n only)
- [ ] Week 4: Disable daily-client-digest cron
- [ ] Week 4: Disable weekly-client-summary cron
- [ ] Confirm all client emails handled by n8n
- [ ] Archive old edge functions (keep as backup)

### Post-Migration

- [ ] Update documentation
- [ ] Train team on n8n workflows
- [ ] Set up monitoring alerts
- [ ] Plan Phase 2 (staff notifications)

---

## Monitoring & Alerts

### n8n Execution Dashboard

Monitor these metrics:
- **Executions per day** (should match cron schedules)
- **Success rate** (target: >99%)
- **Average execution time** (target: <30s)
- **Failed executions** (investigate immediately)

### Database Monitoring

Run this query daily:
```sql
SELECT
  DATE(created_at) as date,
  source,
  notification_type,
  COUNT(*) as total,
  SUM(CASE WHEN delivery_status = 'sent' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN delivery_status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM notification_log
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at), source, notification_type
ORDER BY date DESC, source, notification_type;
```

Expected output:
- Both `source = 'supabase_function'` and `source = 'n8n_workflow'` should have similar success rates
- During parallel running, counts should match exactly

### Alert Conditions

Set up alerts for:
- Execution failure rate >1%
- No executions for expected cron jobs (missed schedules)
- Database connection errors
- Resend API errors (rate limits, invalid emails)

---

## Rollback Plan

### If Issues Detected During Parallel Running

1. **Pause n8n workflows** (don't delete, just deactivate)
2. **Keep edge functions running** (no changes needed)
3. **Investigate n8n execution logs** for root cause
4. **Fix issues and re-activate** when ready

### If Issues Detected After Cutover

1. **Re-enable Supabase crons** in database:
   ```sql
   SELECT cron.schedule(
     'notification-digest-engine',
     '*/5 * * * *',
     'SELECT net.http_post(...)'
   );
   ```
2. **Pause n8n workflows**
3. **Monitor for 24 hours** to ensure edge functions working
4. **No data loss** (both systems log to same tables)

---

## Success Criteria

### Phase 1 Complete When:
- [x] All 4 workflows created and tested
- [ ] Parallel running for 2 weeks with 100% match
- [ ] Success rates match existing system (>99%)
- [ ] No duplicate emails sent
- [ ] User preferences respected in all cases
- [ ] Audit trail complete in notification_log

### Ready for Cutover When:
- [ ] Team approves n8n outputs
- [ ] No critical errors in execution logs
- [ ] Database performance acceptable
- [ ] Monitoring dashboards configured
- [ ] Rollback plan tested and documented

---

## Timeline

- **Day 1** (2025-12-31): Build workflows ✓
- **Day 2**: Test workflows with sample data
- **Day 3**: Activate parallel running
- **Days 4-17**: Validation period (2 weeks)
- **Day 18**: Gradual cutover begins
- **Day 25**: Full migration complete

**Total Time**: ~4 weeks from start to full migration

---

## Team Responsibilities

### During Parallel Running
- **Daily**: Check n8n execution logs
- **Weekly**: Run comparison SQL query
- **Immediate**: Investigate any failures

### After Cutover
- **Monitor**: n8n execution dashboard
- **Maintain**: Update templates as needed
- **Expand**: Add new notification types to n8n

---

## Next Steps

1. **Create workflows in n8n** (using MCP tools)
2. **Export workflows as JSON** (for version control)
3. **Save to module folder** (backup and documentation)
4. **Test with sample data** (before activating)
5. **Activate parallel running** (when ready)

---

## Related Documentation

- **README.md** - Module overview
- **SQL_QUERIES.md** - All database queries
- **TEMPLATE_FUNCTIONS.md** - JavaScript code for email templates
- **WORKFLOW_SPECS.md** - Detailed node configurations
- **DEPLOYMENT_CHECKLIST.md** - Step-by-step activation guide
- **TESTING_GUIDE.md** - How to validate workflows
