# 🧪 WhatsApp Integration Test Script

## Pre-Test Setup

### Required Information:
- **n8n Instance URL:** _________________
- **Webhook URL:** _________________
- **Test Staff Phone:** +447557679989 (Chadaira Basera)
- **Test Shift ID:** cdce9c0e-f7a2-46d2-b549-d0858b556517

---

## Test 1: Shift Assignment Notification

### Objective:
Verify that assigning a shift triggers WhatsApp notification

### Steps:

1. **Import Workflow to n8n**
   - [ ] Open n8n instance
   - [ ] Go to Workflows → Import from File
   - [ ] Select `shift-assignment-notification.json`
   - [ ] Click Import

2. **Verify Credentials**
   - [ ] Open imported workflow
   - [ ] Check "Get Shift Details" node → Credentials should show "ACG-Supabase"
   - [ ] Check "Send WhatsApp Template" node → Credentials should show "WhatsApp account"
   - [ ] If missing, configure credentials

3. **Activate Workflow**
   - [ ] Click "Active" toggle in top right
   - [ ] Workflow should show as "Active"

4. **Get Webhook URL**
   - [ ] Click on "Webhook - Shift Assigned" node
   - [ ] Copy the Production URL
   - [ ] Example: `https://n8n.example.com/webhook/shift-assigned`

5. **Test with cURL**
   ```bash
   curl -X POST https://YOUR-N8N-URL/webhook/shift-assigned \
     -H "Content-Type: application/json" \
     -d '{"shift_id": "cdce9c0e-f7a2-46d2-b549-d0858b556517"}'
   ```

6. **Verify Execution**
   - [ ] Go to n8n → Executions
   - [ ] Latest execution should show "Success"
   - [ ] Click on execution to see details
   - [ ] Verify all nodes executed successfully

7. **Check WhatsApp**
   - [ ] Open WhatsApp on +447557679989
   - [ ] Should see message with:
     - Staff name: Chadaira
     - Date: Monday, 18 November 2025
     - Time: 08:00 - 20:00
     - Client: Divine Care Center
     - Address: 72 newholme eastate, Wingate, TS28 5EN
     - Role: HEALTHCARE ASSISTANT
     - Pay: £177.00

8. **Verify Database**
   ```sql
   SELECT * FROM notifications 
   WHERE template_name = 'shiftassignment'
   ORDER BY sent_at DESC 
   LIMIT 1;
   ```
   - [ ] Record exists
   - [ ] `status` = 'sent'
   - [ ] `message_id` is populated
   - [ ] `metadata` contains shift details

### Expected Result:
✅ WhatsApp message received within 3 seconds
✅ Notification logged in database
✅ Webhook returns success response

### If Test Fails:
- Check n8n execution log for errors
- Verify shift ID exists in database
- Check WhatsApp credential is valid
- Verify phone number format (+44...)

---

## Test 2: Daily Shift Reminders

### Objective:
Verify scheduled workflow sends reminders for tomorrow's shifts

### Steps:

1. **Import Workflow**
   - [ ] Import `daily-shift-reminders.json`
   - [ ] Verify credentials
   - [ ] **DO NOT ACTIVATE YET** (will run at 6 PM)

2. **Manual Test Execution**
   - [ ] Open workflow
   - [ ] Click "Execute Workflow" button (top right)
   - [ ] Wait for execution to complete

3. **Verify Execution**
   - [ ] Check execution log
   - [ ] Should show 5 items processed (5 shifts for tomorrow)
   - [ ] Each item should have:
     - Get Tomorrow's Shifts → Success
     - Format Reminders → Success
     - Send Reminder → Success
     - Log Reminder → Success

4. **Check WhatsApp**
   - [ ] Staff should receive 5 reminder messages
   - [ ] Each message should contain:
     - Staff name
     - Tomorrow's date
     - Shift time
     - Client name
     - Client address
     - Portal link

5. **Verify Database**
   ```sql
   SELECT COUNT(*) FROM notifications 
   WHERE template_name = 'shiftreminder'
   AND sent_at > NOW() - INTERVAL '5 minutes';
   ```
   - [ ] Should return 5 (one for each shift)

6. **Activate for Production**
   - [ ] Click "Active" toggle
   - [ ] Workflow will now run daily at 6 PM

### Expected Result:
✅ 5 WhatsApp reminders sent
✅ 5 notifications logged
✅ Workflow scheduled for 6 PM daily

---

## Test 3: Timesheet Reminders

### Objective:
Verify workflow sends reminders for missing timesheets

### Steps:

1. **Create Test Data**
   ```sql
   -- Create a past shift without timesheet
   UPDATE shifts 
   SET 
     date = CURRENT_DATE - INTERVAL '2 days',
     status = 'confirmed',
     timesheet_received = false,
     timesheet_reminder_sent = false
   WHERE id = 'cdce9c0e-f7a2-46d2-b549-d0858b556517';
   ```

2. **Import Workflow**
   - [ ] Import `timesheet-reminders.json`
   - [ ] Verify credentials

3. **Manual Test**
   - [ ] Click "Execute Workflow"
   - [ ] Wait for completion

4. **Verify Execution**
   - [ ] Check execution log
   - [ ] Should process at least 1 shift
   - [ ] All nodes should succeed

5. **Check WhatsApp**
   - [ ] Staff receives timesheet reminder
   - [ ] Message contains:
     - Staff name
     - Shift date
     - Client name
     - Timesheet portal link

6. **Verify Database Updates**
   ```sql
   SELECT 
     timesheet_reminder_sent,
     timesheet_reminder_sent_at
   FROM shifts 
   WHERE id = 'cdce9c0e-f7a2-46d2-b549-d0858b556517';
   ```
   - [ ] `timesheet_reminder_sent` = true
   - [ ] `timesheet_reminder_sent_at` is populated

7. **Verify Notification Log**
   ```sql
   SELECT * FROM notifications 
   WHERE template_name = 'timesheetreminder'
   ORDER BY sent_at DESC 
   LIMIT 1;
   ```
   - [ ] Record exists with correct data

8. **Activate for Production**
   - [ ] Click "Active" toggle
   - [ ] Workflow will run daily at 10 AM

### Expected Result:
✅ Timesheet reminder sent
✅ Shift marked as reminder_sent
✅ Notification logged
✅ Workflow scheduled for 10 AM daily

---

## Test 4: Error Handling

### Objective:
Verify workflows handle errors gracefully

### Test 4a: Invalid Shift ID

```bash
curl -X POST https://YOUR-N8N-URL/webhook/shift-assigned \
  -H "Content-Type: application/json" \
  -d '{"shift_id": "00000000-0000-0000-0000-000000000000"}'
```

**Expected:**
- [ ] Workflow executes but fails at "Get Shift Details"
- [ ] Error logged in n8n
- [ ] No WhatsApp message sent
- [ ] Webhook returns error response

### Test 4b: Invalid Phone Number

1. Update test shift with invalid phone:
   ```sql
   UPDATE staff 
   SET phone = 'invalid'
   WHERE id = 'c487d84c-f77b-4797-9e98-321ee8b49a87';
   ```

2. Trigger workflow

**Expected:**
- [ ] Workflow fails at "Send WhatsApp Template"
- [ ] Error logged
- [ ] Notification logged with status 'failed'

3. Restore valid phone:
   ```sql
   UPDATE staff 
   SET phone = '+447557679989'
   WHERE id = 'c487d84c-f77b-4797-9e98-321ee8b49a87';
   ```

---

## Test 5: Performance Test

### Objective:
Verify workflow can handle multiple notifications

### Steps:

1. **Create 10 Test Shifts**
   ```sql
   -- Script to create 10 shifts for tomorrow
   INSERT INTO shifts (
     agency_id, client_id, assigned_staff_id,
     date, start_time, end_time, duration_hours,
     role_required, pay_rate, charge_rate, status
   )
   SELECT 
     'c8e84c94-8233-4084-b4c3-63ad9dc81c16',
     'f679e93f-97d8-4697-908a-e165f22e322a',
     'c487d84c-f77b-4797-9e98-321ee8b49a87',
     CURRENT_DATE + INTERVAL '1 day',
     (CURRENT_DATE + INTERVAL '1 day' + TIME '08:00:00'),
     (CURRENT_DATE + INTERVAL '1 day' + TIME '20:00:00'),
     12.00,
     'healthcare_assistant',
     14.75,
     19.18,
     'assigned'
   FROM generate_series(1, 10);
   ```

2. **Run Daily Reminders Workflow**
   - [ ] Execute workflow manually
   - [ ] Monitor execution time

3. **Verify Results**
   - [ ] All 10 messages sent
   - [ ] Total execution time < 30 seconds
   - [ ] All notifications logged

**Expected:**
✅ Handles 10 notifications efficiently
✅ No timeouts or failures
✅ All messages delivered

---

## Test Summary Checklist

- [ ] Test 1: Shift Assignment - PASSED
- [ ] Test 2: Daily Reminders - PASSED
- [ ] Test 3: Timesheet Reminders - PASSED
- [ ] Test 4: Error Handling - PASSED
- [ ] Test 5: Performance - PASSED

---

## Production Readiness Checklist

- [ ] All 3 workflows imported
- [ ] All credentials configured
- [ ] All workflows activated
- [ ] Webhook URL added to admin panel
- [ ] Test messages received successfully
- [ ] Database notifications logging correctly
- [ ] Error handling tested
- [ ] Performance acceptable
- [ ] Team trained on monitoring
- [ ] Documentation reviewed

---

## Sign-Off

**Tester Name:** _________________
**Date:** _________________
**Result:** PASS / FAIL
**Notes:** _________________

---

**READY FOR PRODUCTION:** YES / NO

