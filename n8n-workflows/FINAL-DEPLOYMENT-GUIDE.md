# 🚀 FINAL DEPLOYMENT GUIDE - 60 MINUTE PLAN

**Status:** ✅ READY TO DEPLOY  
**Timeline:** 60 minutes  
**Risk:** LOW

---

## ✅ COMPLETED (Already Done)

- [x] Database updated (opt_out_shift_reminders column added)
- [x] Workflows updated with opt-out logic
- [x] Workflows updated with total earnings calculation
- [x] Meta template instructions created

---

## 📋 YOUR TASKS (60 Minutes)

### **TASK 1: Meta Template Changes** (10 min)

#### **Step 1.1: Delete Templates** (5 min)
1. Go to Meta Business Manager
2. Navigate to WhatsApp → Message Templates
3. Delete **paymentprocessed** (ID: 1580093036315178)
4. Delete **newshiftsavailable** (ID: 1907996346803698)

#### **Step 1.2: Amend shiftreminder Template** (5 min)
1. Find **shiftreminder** template (ID: 1552941689046345)
2. Click Edit
3. Update body text to:
```
Shift Reminder

Hi {{1}},

Tomorrow's shift:
Date: {{2}}
Time: {{3}}
Client: {{4}}
Location: {{5}}

Total earnings: £{{6}}

See you there!

Reply STOP to disable reminders.
```
4. Save and submit for approval (should be instant)

**Result:** 5 active templates remaining

---

### **TASK 2: Import Workflows to n8n** (20 min)

#### **Step 2.1: Import Workflow Files** (10 min)
1. Open your n8n instance
2. Go to Workflows → Import from File
3. Import these 3 files:
   - `shift-assignment-notification.json`
   - `daily-shift-reminders.json` (UPDATED with opt-out)
   - `timesheet-reminders.json`

#### **Step 2.2: Verify Credentials** (5 min)
For each workflow, check:
- Supabase nodes → Credential: "ACG-Supabase"
- WhatsApp nodes → Credential: "WhatsApp account"

If missing, configure credentials.

#### **Step 2.3: Activate Workflows** (5 min)
1. Open each workflow
2. Click "Active" toggle (top right)
3. Verify status shows "Active"

---

### **TASK 3: Get Webhook URL** (5 min)

1. Open "Shift Assignment Notification" workflow
2. Click on "Webhook - Shift Assigned" node
3. Copy the **Production URL**
4. Example: `https://n8n.dreampathai.co.uk/webhook/shift-assigned`
5. Save this URL (you'll need it for admin panel)

---

### **TASK 4: Test Workflows** (15 min)

#### **Test 4.1: Shift Assignment** (5 min)
```bash
curl -X POST https://YOUR-N8N-URL/webhook/shift-assigned \
  -H "Content-Type: application/json" \
  -d '{"shift_id": "cdce9c0e-f7a2-46d2-b549-d0858b556517"}'
```

**Expected:**
- WhatsApp message to +447557679989
- Message contains shift details
- Notification logged in database

#### **Test 4.2: Daily Reminders** (5 min)
1. Open "Daily Shift Reminders" workflow
2. Click "Execute Workflow" button (manual test)
3. Check execution log

**Expected:**
- 5 shifts processed
- Staff with opt_out_shift_reminders=false receive messages
- Messages include total earnings (£177.00, etc.)

#### **Test 4.3: Timesheet Reminders** (5 min)
1. Open "Timesheet Reminders" workflow
2. Click "Execute Workflow" button
3. Check execution log

**Expected:**
- Past shifts without timesheets processed
- Reminders sent
- Shifts marked as reminder_sent

---

### **TASK 5: Admin Panel Integration** (10 min)

Add this code to your admin panel shift assignment function:

```javascript
// After successfully assigning shift
const sendShiftNotification = async (shiftId) => {
  try {
    const response = await fetch('https://YOUR-N8N-URL/webhook/shift-assigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shift_id: shiftId })
    });
    
    const result = await response.json();
    console.log('✅ WhatsApp notification sent:', result.message_id);
  } catch (error) {
    console.error('❌ WhatsApp notification failed:', error);
  }
};

// Call after shift assignment
await sendShiftNotification(assignedShift.id);
```

**Replace:** `YOUR-N8N-URL` with actual webhook URL from Task 3

---

## ✅ VERIFICATION CHECKLIST

After deployment, verify:

- [ ] 2 templates deleted from Meta (paymentprocessed, newshiftsavailable)
- [ ] shiftreminder template updated with {{6}} variable
- [ ] 5 templates remain active in Meta
- [ ] 3 workflows imported to n8n
- [ ] All workflows show "Active" status
- [ ] Credentials verified in all workflows
- [ ] Shift assignment test successful
- [ ] Daily reminders test successful
- [ ] Timesheet reminders test successful
- [ ] Webhook URL copied
- [ ] Admin panel code added
- [ ] End-to-end test: Assign shift → WhatsApp received

---

## 📊 WHAT YOU NOW HAVE

### **Active WhatsApp Templates (5)**
1. ✅ shiftassignment (Utility) - Instant notifications
2. ✅ shiftreminder (Marketing) - Daily 6 PM with opt-out
3. ✅ timesheetreminder (Utility) - Daily 10 AM
4. ✅ complianceexpirywarning (Utility) - Phase 2
5. ✅ shiftcancelled (Marketing) - Phase 2

### **Active n8n Workflows (3)**
1. ✅ Shift Assignment Notification (webhook-triggered)
2. ✅ Daily Shift Reminders (6 PM daily, with opt-out check)
3. ✅ Timesheet Reminders (10 AM daily)

### **Database Features**
- ✅ notifications table (logging all messages)
- ✅ opt_out_shift_reminders column (staff preferences)

### **Safety Features**
- ✅ Opt-out mechanism for reminders only
- ✅ Total earnings shown (not hourly rate)
- ✅ All messages logged for analytics

---

## 🎯 WHAT'S NOT INCLUDED (By Design)

### **Urgent Shift Broadcasts**
- **Status:** Keeping Twilio SMS for now
- **Reason:** High ban risk on WhatsApp
- **Future:** Hybrid approach (SMS broadcast → WhatsApp confirmation)

### **Marketplace Notifications**
- **Status:** Using Resend email instead
- **Reason:** Better for browsing/refreshing
- **Future:** May add WhatsApp for high-priority shifts

---

## 📈 MONITORING (Daily)

### **Check Meta Dashboard**
- Quality rating (should be Green)
- Message limits (should not decrease)
- No warnings or errors

### **Check Supabase**
```sql
-- Daily delivery rate
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'sent') / COUNT(*), 2) as rate
FROM notifications
WHERE sent_at >= NOW() - INTERVAL '24 hours';
```

### **Check n8n**
- Execution logs (should show success)
- Error rate (should be 0%)

---

## 🚨 IF SOMETHING GOES WRONG

### **WhatsApp Not Sending**
1. Check workflow is Active
2. Verify WhatsApp credential
3. Check phone number format (+44...)
4. Check Meta template status

### **Opt-Out Not Working**
1. Verify database column exists
2. Check workflow code includes filter
3. Test with staff who opted out

### **Total Earnings Wrong**
1. Check duration_hours and pay_rate in database
2. Verify calculation in workflow code
3. Test with known shift values

---

## 🎉 SUCCESS CRITERIA

**After 24 hours:**
- [ ] >95% delivery rate
- [ ] Zero spam reports
- [ ] Quality rating: Green
- [ ] Staff feedback positive
- [ ] No errors in n8n logs

**After 1 week:**
- [ ] All workflows running smoothly
- [ ] Opt-out mechanism working
- [ ] Total earnings displaying correctly
- [ ] Ready for Phase 2 (compliance, cancellations)

---

## 🚀 YOU'RE READY!

**Total Time:** 60 minutes  
**Risk:** LOW  
**Value:** 90% of WhatsApp integration

**Next Step:** Start with Task 1 (Meta template changes)

---

**GOOD LUCK! 🎯**

