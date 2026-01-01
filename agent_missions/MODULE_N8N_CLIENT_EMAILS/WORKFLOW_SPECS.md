# n8n Workflow Specifications - Node-by-Node Details

This document provides exact specifications for each node in all 4 n8n workflows.

---

## Table of Contents

1. [[SHARED] Send Email with Audit Logging](#1-shared-send-email-with-audit-logging)
2. [Client Emails - Batch Confirmations](#2-client-emails---batch-confirmations)
3. [Client Emails - Daily Digest](#3-client-emails---daily-digest)
4. [Client Emails - Weekly Summary](#4-client-emails---weekly-summary)

---

## 1. [SHARED] Send Email with Audit Logging

**Type**: Sub-workflow (Webhook trigger)
**Purpose**: Reusable email sending + audit logging
**URL**: `/webhook/send-email-with-logging`

### Node 1: Webhook (Trigger)

**Node Type**: Webhook
**Settings**:
- **HTTP Method**: POST
- **Path**: `send-email-with-logging`
- **Authentication**: None (called internally)
- **Response Mode**: Last Node

**Expected Input**:
```json
{
  "recipient_email": "client@example.com",
  "subject": "Email Subject",
  "html_content": "<html>...</html>",
  "agency_id": "uuid",
  "notification_type": "shift_confirmation|daily_digest|weekly_summary",
  "client_id": "uuid",
  "metadata": {}
}
```

---

### Node 2: PostgreSQL - Fetch Agency Branding

**Node Type**: Postgres
**Credential**: Supabase PostgreSQL - ACG StaffLink
**Operation**: Execute Query

**Query**:
```sql
SELECT
  id,
  name,
  logo_url,
  branding,
  contact_email,
  contact_phone
FROM agencies
WHERE id = '{{$json["agency_id"]}}'
LIMIT 1;
```

**Output**: Single row with agency details

---

### Node 3: PostgreSQL - Check User Preferences

**Node Type**: Postgres
**Credential**: Supabase PostgreSQL - ACG StaffLink
**Operation**: Execute Query

**Query**:
```sql
SELECT
  id,
  email,
  email_notifications,
  notification_preferences
FROM clients
WHERE id = '{{$json["client_id"]}}'
LIMIT 1;
```

**Output**: Client notification preferences

---

### Node 4: Function - Process Preference Check

**Node Type**: Function
**Purpose**: Determine if allowed to send email

**Code**:
```javascript
const webhook = $node["Webhook"].json;
const client = $input.first().json;

// Check if email notifications are enabled (default to true if not set)
const emailNotifications = client.email_notifications !== false;

return {
  json: {
    allowed: emailNotifications,
    reason: emailNotifications ? 'opted_in' : 'opted_out',
    preferenceStatus: emailNotifications ? 'opted_in' : 'opted_out',
    webhook_data: webhook,
    client_data: client
  }
};
```

---

### Node 5: IF - Check If Allowed

**Node Type**: IF
**Condition**: `{{$json["allowed"]}}` equals `true`

**Output**:
- **True**: Proceed to send email
- **False**: Log as skipped

---

### Branch TRUE: Send Email

### Node 6: HTTP Request - Send via Resend

**Node Type**: HTTP Request
**Method**: POST
**URL**: `https://api.resend.com/emails`

**Headers**:
```json
{
  "Authorization": "Bearer {{$env.RESEND_API_KEY}}",
  "Content-Type": "application/json"
}
```

**Body** (JSON):
```json
{
  "from": "{{$node['PostgreSQL - Fetch Agency Branding'].json.name}} <noreply@acgstafflink.com>",
  "to": "{{$node['Webhook'].json.recipient_email}}",
  "subject": "{{$node['Webhook'].json.subject}}",
  "html": "{{$node['Webhook'].json.html_content}}"
}
```

**Response**: Returns Resend message object with `id` field

---

### Node 7: PostgreSQL - Log Success

**Node Type**: Postgres
**Credential**: Supabase PostgreSQL - ACG StaffLink
**Operation**: Execute Query

**Query**:
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
  metadata,
  created_at
)
VALUES (
  '{{$node["Webhook"].json.agency_id}}',
  '{{$node["Webhook"].json.recipient_email}}',
  'client',
  '{{$node["Webhook"].json.notification_type}}',
  'sent',
  'sent',
  'n8n_workflow',
  true,
  'opted_in',
  '{{$node["HTTP Request - Send via Resend"].json.id}}',
  '{{$node["Webhook"].json.metadata}}'::jsonb,
  NOW()
)
RETURNING id;
```

---

### Branch FALSE: Skip Email

### Node 8: PostgreSQL - Log Skipped

**Node Type**: Postgres
**Credential**: Supabase PostgreSQL - ACG StaffLink
**Operation**: Execute Query

**Query**:
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
  skip_reason,
  created_at
)
VALUES (
  '{{$node["Webhook"].json.agency_id}}',
  '{{$node["Webhook"].json.recipient_email}}',
  'client',
  '{{$node["Webhook"].json.notification_type}}',
  'skipped',
  'not_sent',
  'n8n_workflow',
  true,
  'opted_out',
  'User opted out of email notifications',
  NOW()
)
RETURNING id;
```

---

### Error Workflow

### Node 9: Error Trigger (Separate workflow tab)

**Node Type**: Error Trigger
**Purpose**: Catch any errors from main workflow

**Connected to**: PostgreSQL - Log Failure

**Query**:
```sql
INSERT INTO notification_log (
  agency_id,
  recipient_email,
  recipient_type,
  notification_type,
  status,
  delivery_status,
  source,
  error_message,
  created_at
)
VALUES (
  '{{$node["Webhook"].json.agency_id}}',
  '{{$node["Webhook"].json.recipient_email}}',
  'client',
  '{{$node["Webhook"].json.notification_type}}',
  'failed',
  'failed',
  'n8n_workflow',
  '{{$json["error"]["message"]}}',
  NOW()
)
RETURNING id;
```

---

## 2. Client Emails - Batch Confirmations

**Type**: Scheduled (Cron)
**Schedule**: `*/5 * * * *` (Every 5 minutes)
**Purpose**: Process notification_queue for shift confirmations

### Node 1: Schedule Trigger

**Node Type**: Schedule Trigger
**Trigger Interval**: Cron Expression
**Cron**: `*/5 * * * *`

---

### Node 2: PostgreSQL - Query Pending Queue

**Node Type**: Postgres
**Credential**: Supabase PostgreSQL - ACG StaffLink
**Operation**: Execute Query

**Query**:
```sql
SELECT
  id,
  agency_id,
  recipient_email,
  recipient_type,
  notification_type,
  pending_items,
  item_count
FROM notification_queue
WHERE status = 'pending'
  AND notification_type = 'shift_confirmation'
  AND scheduled_send_at <= NOW()
ORDER BY scheduled_send_at ASC
LIMIT 50;
```

**Return All**: Yes (checked)

---

### Node 3: IF - Check If Any Results

**Node Type**: IF
**Condition**: `{{$json["id"]}}` is not empty

**Output**:
- **True**: Process queue items
- **False**: Stop (no items to process)

---

### Node 4: Loop Over Items (SplitInBatches)

**Node Type**: SplitInBatches
**Batch Size**: 1
**Purpose**: Process each queue item one at a time

---

### Node 5: Function - Extract Shift IDs

**Node Type**: Function

**Code**:
```javascript
const queueItem = $input.first().json;
const pendingItems = queueItem.pending_items;

// Extract shift IDs from pending_items array
const shiftIds = pendingItems.map(item => item.shift_id);

return {
  json: {
    queue_id: queueItem.id,
    agency_id: queueItem.agency_id,
    recipient_email: queueItem.recipient_email,
    shift_ids: shiftIds
  }
};
```

---

### Node 6: PostgreSQL - Fetch Shift Details

**Node Type**: Postgres
**Credential**: Supabase PostgreSQL - ACG StaffLink
**Operation**: Execute Query

**Query**:
```sql
SELECT
  s.id,
  s.date,
  s.start_time,
  s.end_time,
  s.duration_hours,
  s.role_required,
  s.shift_type,
  s.status,
  s.client_id,
  s.assigned_staff_id,
  s.agency_id,
  st.first_name,
  st.last_name,
  st.id as staff_id,
  c.name as client_name,
  c.email as client_email,
  c.id as client_id,
  a.name as agency_name,
  a.contact_email as agency_email
FROM shifts s
LEFT JOIN staff st ON s.assigned_staff_id = st.id
JOIN clients c ON s.client_id = c.id
JOIN agencies a ON s.agency_id = a.id
WHERE s.id = ANY(ARRAY['{{$json["shift_ids"].join("','")}}']::uuid[])
ORDER BY s.date, s.start_time;
```

**Return All**: Yes (checked)

---

### Node 7: Function - Group Shifts and Build HTML

**Node Type**: Function
**Purpose**: Group shifts hierarchically and generate email HTML

**Code**: Copy entire Batch Confirmation function from TEMPLATE_FUNCTIONS.md

**Key Points**:
- Input: `$input.all()` (all shift records)
- Output: `{ html_content, subject, client_email, client_name, client_id, agency_id }`

---

### Node 8: HTTP Request - Call Shared Workflow

**Node Type**: HTTP Request
**Method**: POST
**URL**: `https://n8n.dreampathai.co.uk/webhook/send-email-with-logging`

**Headers**:
```json
{
  "Content-Type": "application/json"
}
```

**Body** (JSON):
```json
{
  "recipient_email": "{{$json['client_email']}}",
  "subject": "{{$json['subject']}}",
  "html_content": "{{$json['html_content']}}",
  "agency_id": "{{$json['agency_id']}}",
  "notification_type": "shift_confirmation",
  "client_id": "{{$json['client_id']}}",
  "metadata": {
    "queue_id": "{{$node['Function - Extract Shift IDs'].json.queue_id}}"
  }
}
```

---

### Node 9: PostgreSQL - Update Queue Status

**Node Type**: Postgres
**Credential**: Supabase PostgreSQL - ACG StaffLink
**Operation**: Execute Query

**Query**:
```sql
UPDATE notification_queue
SET
  status = 'sent',
  sent_at = NOW(),
  updated_at = NOW()
WHERE id = '{{$node["Function - Extract Shift IDs"].json.queue_id}}'
RETURNING id, status;
```

---

### Node 10: Loop Back (Connect to SplitInBatches)

**Connection**: Node 9 → Node 4 (SplitInBatches)
**Purpose**: Process next queue item

---

## 3. Client Emails - Daily Digest

**Type**: Scheduled (Cron)
**Schedule**: `0 10 * * *` (Daily at 10 AM)
**Purpose**: Send "tomorrow's schedule" to all active clients

### Node 1: Schedule Trigger

**Node Type**: Schedule Trigger
**Trigger Interval**: Cron Expression
**Cron**: `0 10 * * *`

---

### Node 2: PostgreSQL - Get Active Clients

**Node Type**: Postgres
**Credential**: Supabase PostgreSQL - ACG StaffLink
**Operation**: Execute Query

**Query**:
```sql
SELECT
  c.id,
  c.name,
  c.email,
  c.agency_id,
  a.name as agency_name,
  a.contact_email as agency_email,
  a.contact_phone as agency_phone
FROM clients c
JOIN agencies a ON c.agency_id = a.id
WHERE c.status = 'active'
  AND c.email IS NOT NULL
  AND c.email != ''
ORDER BY c.name ASC;
```

**Return All**: Yes (checked)

---

### Node 3: Loop Over Clients (SplitInBatches)

**Node Type**: SplitInBatches
**Batch Size**: 1

---

### Node 4: Function - Calculate Tomorrow's Date

**Node Type**: Function

**Code**:
```javascript
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowDate = tomorrow.toISOString().split('T')[0];

const client = $input.first().json;

return {
  json: {
    tomorrow_date: tomorrowDate,
    client: client
  }
};
```

---

### Node 5: PostgreSQL - Get Tomorrow's Shifts

**Node Type**: Postgres
**Credential**: Supabase PostgreSQL - ACG StaffLink
**Operation**: Execute Query

**Query**:
```sql
SELECT
  s.id,
  s.date,
  s.start_time,
  s.end_time,
  s.duration_hours,
  s.role_required,
  s.shift_type,
  s.status,
  s.client_id,
  s.assigned_staff_id,
  st.first_name,
  st.last_name,
  st.id as staff_id
FROM shifts s
LEFT JOIN staff st ON s.assigned_staff_id = st.id
WHERE s.client_id = '{{$node["Function - Calculate Tomorrow's Date"].json.client.id}}'
  AND s.date = '{{$node["Function - Calculate Tomorrow's Date"].json.tomorrow_date}}'
  AND s.status IN ('confirmed', 'in_progress')
ORDER BY s.start_time ASC;
```

**Return All**: Yes (checked)

---

### Node 6: IF - Check If Has Shifts

**Node Type**: IF
**Condition**: `{{$json["id"]}}` is not empty

**Output**:
- **True**: Build and send email
- **False**: Skip this client (no shifts tomorrow)

---

### Node 7: Function - Build Daily Digest HTML

**Node Type**: Function

**Code**: Copy entire Daily Digest function from TEMPLATE_FUNCTIONS.md

**Access Client Data**: Use `$node['Function - Calculate Tomorrow's Date'].json.client`

---

### Node 8: HTTP Request - Call Shared Workflow

**Node Type**: HTTP Request
**Method**: POST
**URL**: `https://n8n.dreampathai.co.uk/webhook/send-email-with-logging`

**Body** (JSON):
```json
{
  "recipient_email": "{{$json['client_email']}}",
  "subject": "{{$json['subject']}}",
  "html_content": "{{$json['html_content']}}",
  "agency_id": "{{$json['agency_id']}}",
  "notification_type": "daily_digest",
  "client_id": "{{$json['client_id']}}",
  "metadata": {}
}
```

---

### Node 9: Loop Back

**Connection**: Node 8 (or IF False branch) → Node 3 (SplitInBatches)

---

## 4. Client Emails - Weekly Summary

**Type**: Scheduled (Cron)
**Schedule**: `0 8 * * 1` (Monday at 8 AM)
**Purpose**: Send aggregated weekly summary to all active clients

### Node 1: Schedule Trigger

**Node Type**: Schedule Trigger
**Trigger Interval**: Cron Expression
**Cron**: `0 8 * * 1`

---

### Node 2: Function - Calculate Date Range

**Node Type**: Function

**Code**:
```javascript
const today = new Date();

// Get last Monday
const lastMonday = new Date(today);
lastMonday.setDate(today.getDate() - 7);
lastMonday.setHours(0, 0, 0, 0);

// Get last Sunday
const lastSunday = new Date(lastMonday);
lastSunday.setDate(lastMonday.getDate() + 6);
lastSunday.setHours(23, 59, 59, 999);

return {
  json: {
    start_date: lastMonday.toISOString().split('T')[0],
    end_date: lastSunday.toISOString().split('T')[0]
  }
};
```

---

### Node 3: PostgreSQL - Get Active Clients

**Node Type**: Postgres
**Credential**: Supabase PostgreSQL - ACG StaffLink
**Operation**: Execute Query

**Query**:
```sql
SELECT
  c.id,
  c.name,
  c.email,
  c.agency_id,
  a.name as agency_name,
  a.contact_email as agency_email,
  a.contact_phone as agency_phone
FROM clients c
JOIN agencies a ON c.agency_id = a.id
WHERE c.status = 'active'
  AND c.email IS NOT NULL
  AND c.email != ''
ORDER BY c.name ASC;
```

**Return All**: Yes (checked)

---

### Node 4: Loop Over Clients (SplitInBatches)

**Node Type**: SplitInBatches
**Batch Size**: 1

---

### Node 5: PostgreSQL - Call Weekly Summary RPC

**Node Type**: Postgres
**Credential**: Supabase PostgreSQL - ACG StaffLink
**Operation**: Execute Query

**Query**:
```sql
SELECT * FROM get_weekly_summary_data(
  p_client_id := '{{$input.first().json.id}}'::uuid,
  p_start_date := '{{$node["Function - Calculate Date Range"].json.start_date}}'::date,
  p_end_date := '{{$node["Function - Calculate Date Range"].json.end_date}}'::date,
  p_include_all_statuses := true
);
```

**Return All**: Yes (checked)

---

### Node 6: IF - Check If Has Data

**Node Type**: IF
**Condition**: `{{$json["shift_date"]}}` is not empty

**Output**:
- **True**: Build and send email
- **False**: Skip this client (no shifts this week)

---

### Node 7: Function - Build Weekly Summary HTML

**Node Type**: Function

**Code**: Copy entire Weekly Summary function from TEMPLATE_FUNCTIONS.md

**Access Data**:
- Summary data: `$input.all()`
- Client: `$node['Loop Over Clients'].json`
- Date range: `$node['Function - Calculate Date Range'].json`

---

### Node 8: HTTP Request - Call Shared Workflow

**Node Type**: HTTP Request
**Method**: POST
**URL**: `https://n8n.dreampathai.co.uk/webhook/send-email-with-logging`

**Body** (JSON):
```json
{
  "recipient_email": "{{$json['client_email']}}",
  "subject": "{{$json['subject']}}",
  "html_content": "{{$json['html_content']}}",
  "agency_id": "{{$json['agency_id']}}",
  "notification_type": "weekly_summary",
  "client_id": "{{$json['client_id']}}",
  "metadata": {
    "date_range": "{{$node['Function - Calculate Date Range'].json}}"
  }
}
```

---

### Node 9: Loop Back

**Connection**: Node 8 (or IF False branch) → Node 4 (SplitInBatches)

---

## Node Positioning Tips

For clean, readable workflows in n8n:

1. **Vertical Layout**: Arrange nodes top to bottom
2. **Branch Alignment**: Keep IF branches horizontally aligned
3. **Loop Spacing**: Add space around loop structures
4. **Naming**: Use descriptive node names
5. **Colors**: Use n8n's color coding for different node types

## Testing Each Workflow

### Test [SHARED] Workflow
```bash
curl -X POST https://n8n.dreampathai.co.uk/webhook/send-email-with-logging \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_email": "your-test@email.com",
    "subject": "Test Email",
    "html_content": "<h1>Test</h1><p>This is a test email from n8n</p>",
    "agency_id": "your-agency-id",
    "notification_type": "test",
    "client_id": "test-client-id",
    "metadata": {}
  }'
```

### Test Other Workflows
1. Click "Execute Workflow" button in n8n
2. Check execution log for success/errors
3. Verify email received
4. Check `notification_log` table for entry

## Common Issues

### Issue 1: PostgreSQL Connection Timeout
**Solution**: Increase timeout to 30000ms in credential settings

### Issue 2: Resend API 401 Unauthorized
**Solution**: Verify RESEND_API_KEY is correct and has `re_` prefix

### Issue 3: Empty shift_ids Array
**Solution**: Check pending_items JSON structure in queue table

### Issue 4: Date Formatting Errors
**Solution**: Ensure dates are in YYYY-MM-DD format for PostgreSQL

### Issue 5: Webhook Not Accessible
**Solution**: Check n8n deployment allows webhook access

## Optimization Tips

1. **Batch Processing**: Use LIMIT in PostgreSQL queries
2. **Error Handling**: Add Try-Catch nodes around critical operations
3. **Logging**: Use n8n's built-in logging (enable in settings)
4. **Monitoring**: Set up execution alerts for failures
5. **Performance**: Monitor execution times, optimize slow queries

---

## Export Workflows

After creating workflows:

1. Click workflow name → "..." menu → "Download"
2. Save as JSON to this folder:
   - `[SHARED] Send Email with Audit Logging.json`
   - `Client Emails - Batch Confirmations.json`
   - `Client Emails - Daily Digest.json`
   - `Client Emails - Weekly Summary.json`

3. Commit to version control for backup

---

## Version Notes

- **v1.0** (2025-12-31): Initial workflow specifications
- Based on Module 34 Supabase Edge Functions
- Designed for n8n instance at https://n8n.dreampathai.co.uk/
