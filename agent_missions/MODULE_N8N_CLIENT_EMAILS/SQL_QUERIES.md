# SQL Queries for n8n Client Email Workflows

This document contains all SQL queries used in the n8n workflows for easy reference and testing.

---

## Shared Workflow Queries

### Get Agency Branding
```sql
SELECT
  id,
  name,
  logo_url,
  branding,
  contact_email,
  contact_phone
FROM agencies
WHERE id = '{{$json.agency_id}}'
LIMIT 1;
```

**Returns**: Single row with agency details for email branding

---

### Check User Email Preferences
```sql
SELECT
  id,
  email,
  email_notifications,
  notification_preferences
FROM clients
WHERE id = '{{$json.client_id}}'
LIMIT 1;
```

**Returns**: Client notification preferences (opt-in/opt-out status)

---

### Log Notification Success
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
  '{{$json.id}}', -- Resend message ID
  '{{$node["Webhook"].json.metadata}}'::jsonb,
  NOW()
)
RETURNING id;
```

**Purpose**: Audit trail for successful email sends

---

### Log Notification Skip (Opted Out)
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

**Purpose**: Audit trail for skipped sends (preference-based)

---

### Log Notification Failure
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
  '{{$json.message}}',
  NOW()
)
RETURNING id;
```

**Purpose**: Audit trail for failed email sends

---

## Batch Confirmations Queries

### Get Pending Queue Items
```sql
SELECT
  id,
  agency_id,
  recipient_email,
  recipient_type,
  notification_type,
  pending_items,
  item_count,
  scheduled_send_at,
  created_at
FROM notification_queue
WHERE status = 'pending'
  AND notification_type = 'shift_confirmation'
  AND scheduled_send_at <= NOW()
ORDER BY scheduled_send_at ASC
LIMIT 50;
```

**Purpose**: Fetch batched shift confirmations ready to send
**Returns**: Up to 50 queue items with pending_items JSONB array

---

### Get Shift Details for Batch
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
  s.requirements,
  s.client_id,
  s.assigned_staff_id,
  s.agency_id,
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
ORDER BY s.date, s.start_time;
```

**Purpose**: Get full details for all shifts in a batch
**Input**: `shift_ids` array from pending_items
**Returns**: Shift details with staff names and client info

---

### Update Queue Item to Sent
```sql
UPDATE notification_queue
SET
  status = 'sent',
  sent_at = NOW(),
  updated_at = NOW()
WHERE id = '{{$node["Loop Over Items"].json.id}}'
RETURNING id, status;
```

**Purpose**: Mark queue item as processed after successful send

---

### Update Queue Item to Failed
```sql
UPDATE notification_queue
SET
  status = 'failed',
  updated_at = NOW()
WHERE id = '{{$node["Loop Over Items"].json.id}}'
RETURNING id, status;
```

**Purpose**: Mark queue item as failed if error occurs

---

## Daily Digest Queries

### Get All Active Clients
```sql
SELECT
  id,
  name,
  email,
  contact_person,
  agency_id,
  status
FROM clients
WHERE status = 'active'
  AND email IS NOT NULL
  AND email != ''
ORDER BY name ASC;
```

**Purpose**: Get list of clients to send daily digest
**Returns**: All active clients with email addresses

---

### Get Tomorrow's Confirmed Shifts for Client
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
WHERE s.client_id = '{{$node["Loop Over Clients"].json.id}}'
  AND s.date = CURRENT_DATE + INTERVAL '1 day'
  AND s.status IN ('confirmed', 'in_progress')
ORDER BY s.start_time ASC;
```

**Purpose**: Get tomorrow's schedule for a specific client
**Returns**: List of shifts with staff assignments

**Alternative (using variable)**:
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
WHERE s.client_id = '{{$node["Loop Over Clients"].json.id}}'
  AND s.date = '{{$json.tomorrow_date}}'
  AND s.status IN ('confirmed', 'in_progress')
ORDER BY s.start_time ASC;
```

---

## Weekly Summary Queries

### Get Active Clients (Same as Daily Digest)
```sql
SELECT
  id,
  name,
  email,
  contact_person,
  agency_id,
  status
FROM clients
WHERE status = 'active'
  AND email IS NOT NULL
  AND email != ''
ORDER BY name ASC;
```

---

### Get Weekly Summary Data (RPC Call)
```sql
SELECT * FROM get_weekly_summary_data(
  p_client_id := '{{$node["Loop Over Clients"].json.id}}'::uuid,
  p_start_date := '{{$node["Function - Calculate Date Range"].json.start_date}}'::date,
  p_end_date := '{{$node["Function - Calculate Date Range"].json.end_date}}'::date,
  p_include_all_statuses := true
);
```

**Purpose**: Call stored function to get aggregated weekly data
**Input**: client_id, start_date, end_date
**Returns**: Aggregated shift data by date/time/role with counts and hours

**Expected Output Schema**:
```json
[
  {
    "shift_date": "2025-12-23",
    "time_slot": "07:00 - 19:00",
    "role": "Healthcare Assistant",
    "shift_count": 5,
    "total_hours": 60.0,
    "status_breakdown": {"confirmed": 4, "completed": 1}
  }
]
```

---

## Monitoring Queries

### Compare n8n vs Edge Function Sends
```sql
SELECT
  DATE(created_at) as date,
  source,
  notification_type,
  COUNT(*) as total_sent,
  SUM(CASE WHEN delivery_status = 'sent' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN delivery_status = 'not_sent' THEN 1 ELSE 0 END) as skipped,
  ROUND(100.0 * SUM(CASE WHEN delivery_status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM notification_log
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND notification_type IN ('shift_confirmation', 'daily_digest', 'weekly_summary')
GROUP BY DATE(created_at), source, notification_type
ORDER BY date DESC, source, notification_type;
```

**Purpose**: Daily monitoring to compare outputs
**Expected**: Both sources should have similar success rates during parallel running

---

### Daily Execution Summary
```sql
SELECT
  notification_type,
  source,
  COUNT(*) as total,
  SUM(CASE WHEN delivery_status = 'sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN delivery_status = 'not_sent' AND skip_reason IS NOT NULL THEN 1 ELSE 0 END) as skipped_opted_out
FROM notification_log
WHERE DATE(created_at) = CURRENT_DATE
  AND source = 'n8n_workflow'
GROUP BY notification_type, source;
```

**Purpose**: Quick daily check of n8n workflow performance

---

### Recent Failures for Investigation
```sql
SELECT
  created_at,
  notification_type,
  recipient_email,
  error_message,
  metadata
FROM notification_log
WHERE source = 'n8n_workflow'
  AND delivery_status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

**Purpose**: Investigate recent failures

---

### Preference Check Audit
```sql
SELECT
  DATE(created_at) as date,
  notification_type,
  preference_status,
  COUNT(*) as count
FROM notification_log
WHERE source = 'n8n_workflow'
  AND preference_checked = true
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at), notification_type, preference_status
ORDER BY date DESC, notification_type, preference_status;
```

**Purpose**: Verify preference checking is working correctly

---

## Testing Queries

### Get Test Client for Manual Testing
```sql
SELECT
  id,
  name,
  email,
  agency_id
FROM clients
WHERE status = 'active'
  AND email LIKE '%test%'
  OR name LIKE '%Test%'
LIMIT 1;
```

**Purpose**: Find test client for workflow testing

---

### Create Test Queue Item
```sql
INSERT INTO notification_queue (
  agency_id,
  recipient_email,
  recipient_type,
  notification_type,
  status,
  pending_items,
  item_count,
  scheduled_send_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with agency_id
  'test@example.com',
  'client',
  'shift_confirmation',
  'pending',
  '[{"shift_id": "00000000-0000-0000-0000-000000000000"}]'::jsonb,
  1,
  NOW()
)
RETURNING id;
```

**Purpose**: Create test queue item for batch confirmations workflow

---

### Get Recent Shift for Testing
```sql
SELECT
  id,
  client_id,
  date,
  start_time,
  role_required
FROM shifts
WHERE status = 'confirmed'
  AND date >= CURRENT_DATE
ORDER BY created_at DESC
LIMIT 5;
```

**Purpose**: Find recent shifts to use in test data

---

## Cleanup Queries (Use with Caution)

### Delete Test Logs
```sql
DELETE FROM notification_log
WHERE source = 'n8n_workflow'
  AND recipient_email LIKE '%test%'
  AND created_at >= CURRENT_DATE;
```

**⚠️ Warning**: Only use for test data cleanup

---

### Reset Queue Item to Pending
```sql
UPDATE notification_queue
SET
  status = 'pending',
  sent_at = NULL,
  updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000000';
```

**Purpose**: Re-test a queue item

---

## Performance Optimization

### Index Check for notification_queue
```sql
EXPLAIN ANALYZE
SELECT * FROM notification_queue
WHERE status = 'pending'
  AND notification_type = 'shift_confirmation'
  AND scheduled_send_at <= NOW()
ORDER BY scheduled_send_at ASC
LIMIT 50;
```

**Purpose**: Verify query uses indexes efficiently

---

### Index Check for notification_log
```sql
EXPLAIN ANALYZE
SELECT *
FROM notification_log
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND source = 'n8n_workflow';
```

**Purpose**: Verify monitoring queries are fast

---

## Notes

### Parameter Placeholders

In n8n, SQL queries use expressions to insert values:
- `'{{$json.field_name}}'` - From current node's JSON output
- `'{{$node["Node Name"].json.field}}'` - From specific node
- `NOW()` - Current timestamp (PostgreSQL function)
- `CURRENT_DATE` - Current date (PostgreSQL function)

### Data Types

When passing parameters, ensure correct type casting:
- UUID: `'{{$json.id}}'::uuid`
- Date: `'{{$json.date}}'::date`
- Timestamp: `'{{$json.timestamp}}'::timestamptz`
- JSONB: `'{{$json.data}}'::jsonb`
- Array: `'{{$json.ids}}'::uuid[]`

### Testing in psql

To test queries outside n8n, replace placeholders:
```sql
-- Example: Replace {{$json.client_id}} with actual UUID
SELECT * FROM clients WHERE id = 'actual-uuid-here';
```

### Best Practices

1. **Always use parameterized queries** to prevent SQL injection
2. **Test queries in database first** before adding to n8n
3. **Use LIMIT** for queries that might return large datasets
4. **Add ORDER BY** for consistent results
5. **Use EXPLAIN ANALYZE** to check query performance
6. **Log all operations** to notification_log for audit trail
