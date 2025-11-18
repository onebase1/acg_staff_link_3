# ✅ Shift Assignment Notifications - FIXED

**Date**: 2025-11-18  
**Issue**: Emails not sending after 5-minute queue delay  
**Status**: ✅ RESOLVED

---

## 📋 Expected Notifications When Shift is Assigned

When a staff member is assigned to a shift via `/shift` page, the following notifications should trigger:

### 1. ✅ WhatsApp (INSTANT)
- **Status**: ✅ Working
- **Delivery**: Immediate
- **Content**: Shift details with pay calculation
- **Example**: "📅 NEW SHIFT [Dominion Healthcare]: Divine Care Centre at Room 3 on Sat, 23 Nov, 08:00-20:00. £15/hr = £180.00. Reply to confirm."

### 2. ⚠️ SMS (INSTANT)
- **Status**: ⚠️ Not working (expected - Twilio not funded)
- **Delivery**: Immediate
- **Content**: Same as WhatsApp
- **Note**: Will work once Twilio account is funded

### 3. ✅ Email (BATCHED - 5 minute delay)
- **Status**: ✅ NOW WORKING (was failing)
- **Delivery**: Batched every 5 minutes via cron job
- **Content**: Professional HTML template with shift details
- **Sender**: Agency name (e.g., "Dominion Healthcare")

---

## 🐛 Root Cause Analysis

### The Problem
Emails were being queued correctly but **failing to send** after the 5-minute delay.

### Error Message
```
Edge Function returned a non-2xx status code
```

### Technical Root Cause
The `send-email` Edge Function had **authentication logic** that only accepted **user tokens**, but the cron job uses **service role key**.

**Flow**:
1. Shift assigned → `notifyShiftAssignment()` called with `useBatching: true` ✅
2. Email queued in `notification_queue` table ✅
3. Cron job `notification-digest-engine-5min` runs every 5 minutes ✅
4. Digest engine fetches pending queues ✅
5. Digest engine invokes `send-email` with **service role key** ✅
6. **`send-email` tried to validate service role key as user token** ❌
7. **Authentication failed → 401 Unauthorized** ❌
8. Queue marked as `failed` ❌

---

## ✅ Solution Applied

### File Modified
`supabase/functions/send-email/index.ts` (Lines 30-57)

### Change
Updated authentication logic to **accept both service role key AND user tokens**:

```typescript
// ✅ FIX: Allow service role key (for cron jobs) OR valid user token
const isServiceRole = token === SERVICE_ROLE_KEY;

if (!isServiceRole) {
    // Only validate user token if not service role
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
}
```

### Deployment
```bash
npx supabase functions deploy send-email
```

**Result**: ✅ Deployed successfully (Version 12)

---

## 🧪 Testing & Verification

### Test 1: Reset Failed Queue
```sql
UPDATE notification_queue 
SET status = 'pending', error_message = NULL 
WHERE status = 'failed';
```
**Result**: 1 queue reset ✅

### Test 2: Manual Trigger
```bash
curl -X POST "https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/notification-digest-engine" \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d "{}"
```

**Response**:
```json
{
  "success": true,
  "timestamp": "2025-11-18T09:23:17.931Z",
  "results": {
    "processed": 1,
    "sent": 1,
    "failed": 0,
    "errors": []
  }
}
```
✅ **Email sent successfully!**

### Test 3: Verify Queue Status
```sql
SELECT status, sent_at, email_message_id, error_message 
FROM notification_queue 
WHERE id = '16fccf82-8e53-4c8e-af89-5767e3408b5b';
```

**Result**:
- Status: `sent` ✅
- Sent at: `2025-11-18 09:23:17.931+00` ✅
- Message ID: `1d78b3d9-3b6c-4b83-ad97-61219833cfea` ✅
- Error: `null` ✅

---

## 🔄 Cron Job Status

### Active Cron Jobs
```sql
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname LIKE '%notification%' OR jobname LIKE '%email%';
```

**Results**:
1. ✅ `notification-digest-engine-5min` - Every 5 minutes (`*/5 * * * *`)
2. ✅ `email-automation-engine-hourly` - Every hour (`0 * * * *`)

Both jobs are **active** and **running correctly**.

---

## 📊 Summary

| Notification Type | Status | Delivery Time | Notes |
|-------------------|--------|---------------|-------|
| WhatsApp | ✅ Working | Instant | Sent immediately on assignment |
| SMS | ⚠️ Not working | Instant | Twilio not funded (expected) |
| Email | ✅ FIXED | 5-minute batch | Now working after auth fix |

---

## 🎯 Next Steps

1. **Test in production**: Assign a new shift and verify all 3 channels
2. **Monitor cron logs**: Check that emails continue to send every 5 minutes
3. **Fund Twilio** (optional): Enable SMS notifications when ready

---

## 🔍 How to Debug Future Issues

### Check Pending Queues
```sql
SELECT * FROM notification_queue WHERE status = 'pending';
```

### Check Failed Queues
```sql
SELECT id, recipient_email, error_message 
FROM notification_queue 
WHERE status = 'failed' 
ORDER BY created_date DESC;
```

### Manually Trigger Digest Engine
```bash
curl -X POST "https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/notification-digest-engine" \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -d "{}"
```

### Check Cron Job Status
```sql
SELECT * FROM cron.job WHERE jobname LIKE '%notification%';
```

