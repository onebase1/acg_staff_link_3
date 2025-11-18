# 🚀 WhatsApp Integration Deployment Guide

## ✅ COMPLETED SETUP

### 1. Database Infrastructure ✅
- **notifications table** created with full schema
- **RLS policies** configured for staff/admin access
- **Indexes** created for performance (staff_id, template_name, status, sent_at)

### 2. Meta WhatsApp Business ✅
- **7 Templates** approved and active
- **Phone Number ID:** 683816761472557
- **Business Account ID:** 244657210968951
- **Language:** en_GB
- **Credential:** ACG-WhatsApp (configured in n8n)

### 3. n8n Workflows Created ✅
Three production-ready workflows:
1. **shift-assignment-notification.json** - Webhook-triggered
2. **daily-shift-reminders.json** - Scheduled 6 PM daily
3. **timesheet-reminders.json** - Scheduled 10 AM daily

---

## 📋 DEPLOYMENT STEPS

### Step 1: Import Workflows to n8n

1. Open your n8n instance
2. Click **Workflows** → **Import from File**
3. Import each workflow:
   - `shift-assignment-notification.json`
   - `daily-shift-reminders.json`
   - `timesheet-reminders.json`

### Step 2: Verify Credentials

Each workflow uses these credentials (should already exist):
- **ACG-Supabase** (ID: Vl1ZMO9tnqpJkJDe)
- **WhatsApp account** (ID: M8TtYksLuUl3SLo4)

If missing, create them:
1. Go to **Credentials** → **New Credential**
2. Search for **Supabase** or **WhatsApp Business Cloud**
3. Enter your credentials

### Step 3: Activate Workflows

1. **Shift Assignment Notification:**
   - Open workflow
   - Copy webhook URL (e.g., `https://your-n8n.com/webhook/shift-assigned`)
   - **IMPORTANT:** Add this webhook to your admin panel shift assignment code
   - Activate workflow

2. **Daily Shift Reminders:**
   - Open workflow
   - Verify cron schedule: `0 18 * * *` (6 PM daily)
   - Activate workflow

3. **Timesheet Reminders:**
   - Open workflow
   - Verify cron schedule: `0 10 * * *` (10 AM daily)
   - Activate workflow

---

## 🔗 INTEGRATION WITH ADMIN PANEL

### Add Webhook Call to Shift Assignment

In your admin panel code (where shifts are assigned to staff), add:

```javascript
// After successfully assigning shift to staff
const notifyStaff = async (shiftId) => {
  try {
    const response = await fetch('https://your-n8n.com/webhook/shift-assigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shift_id: shiftId })
    });
    
    const result = await response.json();
    console.log('WhatsApp notification sent:', result.message_id);
  } catch (error) {
    console.error('Failed to send WhatsApp notification:', error);
    // Don't block shift assignment if notification fails
  }
};

// Call after shift assignment
await notifyStaff(assignedShift.id);
```

---

## 🧪 TESTING

### Test 1: Shift Assignment Notification

1. In admin panel, assign a shift to staff member
2. Check n8n execution log
3. Verify WhatsApp message received
4. Check `notifications` table for logged entry

**Expected Result:**
- Staff receives WhatsApp with shift details
- Notification logged in database with `status: 'sent'`

### Test 2: Daily Shift Reminders

**Option A: Manual Test**
1. In n8n, open "Daily Shift Reminders" workflow
2. Click **Execute Workflow** button
3. Check execution log

**Option B: Wait for Scheduled Run**
- Workflow runs automatically at 6 PM daily
- Check tomorrow morning if staff received reminders

**Expected Result:**
- All staff with shifts tomorrow receive reminder
- Each reminder logged in `notifications` table

### Test 3: Timesheet Reminders

**Option A: Manual Test**
1. Create a past shift with `timesheet_received: false`
2. In n8n, open "Timesheet Reminders" workflow
3. Click **Execute Workflow** button

**Expected Result:**
- Staff receives timesheet reminder
- Shift updated with `timesheet_reminder_sent: true`
- Notification logged

---

## 📊 ANALYTICS QUERIES

### View All Notifications
```sql
SELECT 
  n.*,
  s.first_name || ' ' || s.last_name as staff_name
FROM notifications n
LEFT JOIN staff s ON n.staff_id = s.id
ORDER BY n.sent_at DESC
LIMIT 100;
```

### Notification Success Rate
```sql
SELECT 
  template_name,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE status = 'sent') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'sent') / COUNT(*), 2) as success_rate
FROM notifications
GROUP BY template_name;
```

### Daily Notification Volume
```sql
SELECT 
  DATE(sent_at) as date,
  template_name,
  COUNT(*) as count
FROM notifications
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at), template_name
ORDER BY date DESC, template_name;
```

---

## 🚨 TROUBLESHOOTING

### Issue: Webhook not triggering
**Solution:** 
- Verify webhook URL is correct
- Check n8n workflow is **Active**
- Test webhook with curl:
```bash
curl -X POST https://your-n8n.com/webhook/shift-assigned \
  -H "Content-Type: application/json" \
  -d '{"shift_id": "your-shift-id"}'
```

### Issue: WhatsApp message not sending
**Solution:**
- Verify WhatsApp credential is valid
- Check phone number format (must include country code: +447557679989)
- Verify template name matches exactly (case-sensitive)
- Check Meta Business Manager for template status

### Issue: Scheduled workflows not running
**Solution:**
- Verify workflow is **Active**
- Check n8n server timezone matches expected schedule
- View execution history in n8n

---

## 📈 NEXT STEPS

### Phase 2 Templates (Week 1)
- Compliance Expiry Warning
- Payment Processed

### Phase 3 Templates (Week 2)
- Shift Cancelled
- New Shifts Available

### Future Enhancements
- Delivery status webhooks (track read receipts)
- Staff reply handling (two-way communication)
- Bulk notification batching
- A/B testing different message templates

---

## 🎯 SUCCESS METRICS

Track these KPIs:
- **Notification Delivery Rate:** Target >95%
- **Staff Response Time:** Measure time from notification to shift confirmation
- **Timesheet Submission Rate:** Compare before/after WhatsApp reminders
- **Staff Satisfaction:** Survey staff on communication preferences

---

**DEPLOYMENT STATUS:** ✅ READY FOR PRODUCTION
**ESTIMATED DEPLOYMENT TIME:** 30 minutes
**RISK LEVEL:** LOW (notifications are non-blocking)

