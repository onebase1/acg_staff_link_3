# 📧 Payment Reminder System - Rapid Testing Guide

**Date:** 2025-11-24  
**Mode:** SUPER FAST TESTING (2-minute intervals)  
**Test Email:** g.basera@yahoo.com

---

## 🎯 What This System Does

The Payment Reminder Engine automatically sends **4 follow-up emails** for overdue invoices:

### **Production Mode (Normal Operation):**
```
Invoice Due Date
    ↓
    7 days ──→ Reminder #1: Gentle email
    ↓
    14 days ──→ Reminder #2: Formal email
    ↓
    21 days ──→ Reminder #3: URGENT email + SMS
    ↓
    28 days ──→ Reminder #4: Admin escalation (collections)
```

### **RAPID Test Mode (What We Just Configured):**
```
Invoice Due Date
    ↓
    2 minutes ──→ Reminder #1: Gentle email
    ↓
    4 minutes ──→ Reminder #2: Formal email
    ↓
    6 minutes ──→ Reminder #3: URGENT email + SMS
    ↓
    8 minutes ──→ Reminder #4: Admin escalation
```

**Total Time:** All 4 reminders in **8 minutes**! ⚡

---

## 📋 Step-by-Step Testing Instructions

### **Step 1: Enable Testing Mode**
```bash
# Set environment variable in Supabase
# Go to: Project Settings → Edge Functions → Environment Variables
# Add:
PAYMENT_REMINDER_TESTING_MODE=true
```

Or run this SQL:
```sql
-- Enable testing mode (this sets it for the function)
-- Note: You may need to set this as an environment variable in Supabase dashboard
```

### **Step 2: Make Test Invoice Overdue**
```sql
-- Set the test invoice to be overdue NOW
UPDATE invoices
SET 
  due_date = (CURRENT_TIMESTAMP - INTERVAL '2 minutes'),
  reminder_sent_count = 0,
  last_reminder_sent = NULL
WHERE invoice_number = 'INV-TEST-20251124070245';

-- Verify it's overdue
SELECT 
  invoice_number,
  due_date,
  status,
  reminder_sent_count,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - due_date))/60 as minutes_overdue
FROM invoices
WHERE invoice_number = 'INV-TEST-20251124070245';
```

### **Step 3: Deploy Updated Function**
```bash
cd C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3

# Deploy the updated payment reminder engine
npx supabase functions deploy payment-reminder-engine
```

### **Step 4: Trigger Reminder #1 (2 minutes overdue)**
```bash
# Manually invoke the function
curl -X POST \
  https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/payment-reminder-engine \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json"
```

**Or via Supabase Dashboard:**
1. Go to: Edge Functions → payment-reminder-engine
2. Click: "Invoke Function"
3. Click: "Invoke"

**Expected:** Email #1 sent to g.basera@yahoo.com  
**Subject:** "Gentle Reminder: Invoice INV-TEST-20251124070245 Payment Due"

### **Step 5: Wait 2 Minutes & Trigger Reminder #2**

```sql
-- Update invoice to be 4+ minutes overdue
UPDATE invoices
SET due_date = (CURRENT_TIMESTAMP - INTERVAL '4 minutes')
WHERE invoice_number = 'INV-TEST-20251124070245';
```

Then invoke function again.

**Expected:** Email #2 sent  
**Subject:** "🧪 TEST: Payment Reminder #2 - Invoice INV-TEST-20251124070245 (4 mins overdue)"

### **Step 6: Wait 2 Minutes & Trigger Reminder #3**

```sql
-- Update invoice to be 6+ minutes overdue
UPDATE invoices
SET due_date = (CURRENT_TIMESTAMP - INTERVAL '6 minutes')
WHERE invoice_number = 'INV-TEST-20251124070245';
```

Then invoke function again.

**Expected:** Email #3 sent + SMS (if phone configured)  
**Subject:** "🚨 URGENT TEST: Reminder #3 - Invoice INV-TEST-20251124070245 - 6 Minutes Overdue"

### **Step 7: Wait 2 Minutes & Trigger Reminder #4**

```sql
-- Update invoice to be 8+ minutes overdue
UPDATE invoices
SET due_date = (CURRENT_TIMESTAMP - INTERVAL '8 minutes')
WHERE invoice_number = 'INV-TEST-20251124070245';
```

Then invoke function again.

**Expected:** Admin workflow created (no email to client)  
**Check:** Admin Workflows page for new critical task

---

## 🚀 AUTOMATED TEST (All 4 at Once)

Want to receive all 4 emails immediately? Run this:

```sql
-- Set invoice to 2 minutes overdue
UPDATE invoices
SET 
  due_date = (CURRENT_TIMESTAMP - INTERVAL '2 minutes'),
  reminder_sent_count = 0
WHERE invoice_number = 'INV-TEST-20251124070245';

-- Invoke function (Reminder #1 sent)

-- Wait 10 seconds, then:
UPDATE invoices
SET due_date = (CURRENT_TIMESTAMP - INTERVAL '4 minutes')
WHERE invoice_number = 'INV-TEST-20251124070245';

-- Invoke function (Reminder #2 sent)

-- Wait 10 seconds, then:
UPDATE invoices
SET due_date = (CURRENT_TIMESTAMP - INTERVAL '6 minutes')
WHERE invoice_number = 'INV-TEST-20251124070245';

-- Invoke function (Reminder #3 sent)

-- Wait 10 seconds, then:
UPDATE invoices
SET due_date = (CURRENT_TIMESTAMP - INTERVAL '8 minutes')
WHERE invoice_number = 'INV-TEST-20251124070245';

-- Invoke function (Reminder #4 = admin workflow created)
```

**Result:** All 4 actions in under 1 minute!

---

## ✅ Verification Checklist

### In Your Email (g.basera@yahoo.com):
- [ ] Email #1: Gentle reminder (simple, friendly)
- [ ] Email #2: Formal reminder (orange theme, professional)
- [ ] Email #3: URGENT reminder (red theme, bold text)
- [ ] (Optional) SMS #3: Text message with urgent warning

### In Database:
```sql
SELECT 
  invoice_number,
  reminder_sent_count,
  last_reminder_sent,
  status
FROM invoices
WHERE invoice_number = 'INV-TEST-20251124070245';
```

**Expected:**
- `reminder_sent_count`: 4
- `last_reminder_sent`: Recent timestamp
- `status`: 'overdue'

### In Admin Workflows:
```sql
SELECT 
  title,
  priority,
  status,
  description
FROM admin_workflows
WHERE title LIKE '%INV-TEST-20251124070245%'
ORDER BY created_date DESC
LIMIT 1;
```

**Expected:**
- Title: "🧪 TEST: CRITICAL - Reminder #4 - Invoice INV-TEST-20251124070245 - 8 Minutes Overdue"
- Priority: 'critical'
- Status: 'pending'

---

## 📊 Email Preview

### **Email #1 (2 min) - Gentle Reminder**
```
Subject: Gentle Reminder: Invoice INV-TEST-20251124070245 Payment Due

Dear Divine Care Center,

This is a gentle reminder that Invoice INV-TEST-20251124070245 
for £1,317.72 was due and remains unpaid.

If you've already processed this payment, please disregard this message.

Thank you,
Dominion Healthcare Services Ltd
```

### **Email #2 (4 min) - Formal Reminder**
```
Subject: 🧪 TEST: Payment Reminder #2 - Invoice INV-TEST-20251124070245

⚠️ Payment Reminder #2 (TEST)

Dear Finance Team,

This is TEST reminder #2 that invoice INV-TEST-20251124070245 
is now 4 minutes overdue.

Invoice Number: INV-TEST-20251124070245
Amount Due: £1,317.72
Test Mode: 4 minutes overdue (14 days in production)
```

### **Email #3 (6 min) - URGENT**
```
Subject: 🚨 URGENT TEST: Reminder #3 - Invoice INV-TEST-20251124070245 - 6 Minutes Overdue

🚨 URGENT PAYMENT REQUEST #3 (TEST)

URGENT TEST REMINDER #3: Invoice INV-TEST-20251124070245 
is now 6 minutes overdue.

Amount Due: £1,317.72
Test Mode: 6 minutes overdue (21 days in production)

⚠️ TEST FINAL NOTICE: In production (21 days overdue), 
failure to pay within 7 days would result in service suspension.
```

### **Action #4 (8 min) - Admin Escalation**
No email to client. Instead, creates admin workflow:
```
Title: 🧪 TEST: CRITICAL - Reminder #4 - Invoice INV-TEST-20251124070245 - 8 Minutes Overdue - £1,317.72
Priority: Critical
Description: [TEST MODE] Invoice is critically overdue (8 minutes in test, would be 28 days in production). 
All 3 automatic reminders sent. Manual intervention required.
```

---

## 🔄 Reset for Another Test

```sql
-- Reset the invoice to test again
UPDATE invoices
SET 
  reminder_sent_count = 0,
  last_reminder_sent = NULL,
  status = 'sent'
WHERE invoice_number = 'INV-TEST-20251124070245';

-- Set it overdue again
UPDATE invoices
SET due_date = (CURRENT_TIMESTAMP - INTERVAL '2 minutes')
WHERE invoice_number = 'INV-TEST-20251124070245';

-- Trigger the function again!
```

---

## ⚠️ IMPORTANT: Revert to Production After Testing

Once testing is complete, **DISABLE** testing mode:

```bash
# In Supabase Dashboard:
# Project Settings → Edge Functions → Environment Variables
# Set:
PAYMENT_REMINDER_TESTING_MODE=false

# Or remove the variable entirely
```

This will revert to production intervals:
- 7 days, 14 days, 21 days, 28 days

---

## 📞 Test Credentials

- **Test Invoice:** INV-TEST-20251124070245
- **Test Email:** g.basera@yahoo.com
- **Client:** Divine Care Center
- **Amount:** £1,317.72
- **Agency:** Dominion Healthcare Services Ltd

---

## 🎉 Success Indicators

You'll know it's working when:
- ✅ All 4 emails arrive in g.basera@yahoo.com within 10 minutes
- ✅ Each email has different urgency levels (gentle → formal → URGENT)
- ✅ Email #3 includes red theme and bold warnings
- ✅ Admin workflow appears in database after 8 minutes
- ✅ `reminder_sent_count` increases from 0 → 1 → 2 → 3 → 4

**Ready to test! Deploy the function and start the countdown!** ⏱️

