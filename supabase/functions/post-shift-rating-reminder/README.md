# Post-Shift Rating Reminder Edge Function

## Overview
Automatically sends rating reminders to clients 2 hours after shift completion.

## Configuration

### Environment Variables
- `SUPABASE_URL` - Automatically provided
- `SUPABASE_SERVICE_ROLE_KEY` - Automatically provided

### Scheduling Options

#### Option 1: pg_cron (Recommended for Supabase)
```sql
-- Run every hour
SELECT cron.schedule(
  'post-shift-rating-reminders',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/post-shift-rating-reminder',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

#### Option 2: n8n Workflow (Current Setup)
1. Create new workflow in n8n
2. Add Schedule Trigger (hourly)
3. Add HTTP Request node:
   - Method: POST
   - URL: `https://your-project.supabase.co/functions/v1/post-shift-rating-reminder`
   - Headers: 
     - `Authorization: Bearer YOUR_ANON_KEY`
     - `Content-Type: application/json`

#### Option 3: External Cron (Manually)
```bash
# Add to crontab (run every hour)
0 * * * * curl -X POST https://your-project.supabase.co/functions/v1/post-shift-rating-reminder \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Deployment

```bash
# Deploy the function
npx supabase functions deploy post-shift-rating-reminder

# Test locally
npx supabase functions serve post-shift-rating-reminder

# Test deployed function
curl -X POST https://your-project.supabase.co/functions/v1/post-shift-rating-reminder \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Logic Flow

1. **Query Completed Shifts**
   - Status: 'completed'
   - Date: 2-24 hours ago
   - Rating Status: 'awaiting_rating'
   - Has assigned staff

2. **Filter by Time**
   - Shift end time > 2 hours ago
   - Shift end time < 24 hours ago (prevent spam)

3. **Check for Existing Reminders**
   - Query `client_notifications` for `type='rating_reminder'`
   - Skip if reminder already sent for this shift

4. **Create Notifications**
   - One notification per unrated shift
   - Type: 'rating_reminder'
   - Priority: 'normal'
   - Channel: 'in_app'

5. **Return Results**
   - Count of processed shifts
   - Count of reminders created
   - Shift IDs processed

## Response Format

### Success
```json
{
  "success": true,
  "message": "Processed 3 shifts",
  "processed": 3,
  "reminders_created": 3,
  "shift_ids": ["uuid1", "uuid2", "uuid3"]
}
```

### No Shifts Found
```json
{
  "success": true,
  "message": "No unrated shifts found",
  "processed": 0
}
```

### Error
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Monitoring

### Logs
View logs in Supabase Dashboard:
1. Go to Edge Functions
2. Select "post-shift-rating-reminder"
3. View Logs tab

### Key Metrics to Monitor
- **Execution frequency**: Should run every hour
- **Processed shifts**: How many shifts checked
- **Reminders created**: How many notifications sent
- **Errors**: Any failures in execution

### Expected Performance
- **Execution time**: < 5 seconds for 100 shifts
- **Database queries**: 3-4 (shifts, staff, existing notifications, insert)
- **Success rate**: > 99%

## Troubleshooting

### Issue: No reminders being sent
**Check:**
1. Are there completed shifts from 2-24 hours ago?
2. Is `rating_status` = 'awaiting_rating'?
3. Is staff assigned (`assigned_staff_id` not null)?
4. Check Edge Function logs for errors

### Issue: Duplicate reminders
**Check:**
1. Verify deduplication logic (checks existing notifications)
2. Ensure scheduler not running multiple times
3. Check `client_notifications` table for duplicates

### Issue: Function timeout
**Solution:**
- Reduce time window (currently 2-24 hours)
- Add pagination for large datasets
- Increase function timeout in Supabase settings

## Testing

### Manual Test
```sql
-- Create a test completed shift (2 hours ago)
INSERT INTO shifts (
  client_id, assigned_staff_id, date, start_time, end_time,
  status, rating_status, role_required, agency_id
) VALUES (
  'client-uuid', 'staff-uuid', 
  (NOW() - INTERVAL '3 hours')::date,
  '09:00', '12:00',
  'completed', 'awaiting_rating', 'care_worker',
  'agency-uuid'
);

-- Run the Edge Function
-- (Use curl command from Deployment section)

-- Verify notification created
SELECT * FROM client_notifications 
WHERE type = 'rating_reminder' 
ORDER BY created_at DESC 
LIMIT 5;
```

## Future Enhancements

1. **Escalation Logic**
   - Send second reminder after 24 hours
   - Send urgent reminder after 48 hours

2. **Multi-Channel Delivery**
   - Also send email reminder (integrate with Module 2)
   - SMS for high-priority clients

3. **Personalization**
   - Custom reminder timing per client
   - Respect quiet hours (e.g., no reminders 10pm-8am)

4. **Analytics**
   - Track reminder→rating conversion rate
   - Identify clients who ignore reminders
   - A/B test different reminder messages
