# 🚀 Payment Reminder System - READY FOR RAPID TESTING

**Status:** ✅ DEPLOYED & CONFIGURED  
**Test Email:** g.basera@yahoo.com  
**Test Invoice:** INV-TEST-20251124070245  
**Mode:** 2-minute intervals (2min, 4min, 6min, 8min)

---

## ✅ What's Been Done

1. ✅ **Payment Reminder Engine Updated** - 2-minute intervals instead of days
2. ✅ **Function Deployed** - Live on Supabase
3. ✅ **Test Invoice Prepared** - INV-TEST-20251124070245 is 2 minutes overdue
4. ✅ **Email Confirmed** - g.basera@yahoo.com ready to receive

---

## 📧 The 4 Reminder Emails You'll Receive

### **Email #1 - Gentle Reminder** (@ 2 minutes overdue)
```
Subject: Gentle Reminder: Invoice INV-TEST-20251124070245 Payment Due

Dear Divine Care Center,

This is a gentle reminder that Invoice INV-TEST-20251124070245 
for £1,317.72 remains unpaid.

Thank you,
Dominion Healthcare Services Ltd
```

### **Email #2 - Formal Reminder** (@ 4 minutes overdue)
```
Subject: 🧪 TEST: Payment Reminder #2 - Invoice INV-TEST-20251124070245 (4 mins overdue)

⚠️ Payment Reminder #2 (TEST)

Dear Finance Team,

This is TEST reminder #2 that invoice INV-TEST-20251124070245 
is now 4 minutes overdue.

Amount Due: £1,317.72
Test Mode: 4 minutes overdue (14 days in production)
```

### **Email #3 - URGENT Reminder** (@ 6 minutes overdue)
```
Subject: 🚨 URGENT TEST: Reminder #3 - Invoice INV-TEST-20251124070245 - 6 Minutes Overdue

🚨 URGENT PAYMENT REQUEST #3 (TEST)

URGENT TEST REMINDER #3: Invoice INV-TEST-20251124070245 
is now 6 minutes overdue.

Amount Due: £1,317.72
Test Mode: 6 minutes overdue (21 days in production)
```

### **Action #4 - Admin Escalation** (@ 8 minutes overdue)
No email to client. Instead, creates a critical admin workflow in database.

---

## 🎬 How to Trigger All 4 Reminders

### **Method 1: Automated (Recommended)**

Run these SQL commands in sequence (wait 10-15 seconds between each):

```sql
-- 1️⃣ REMINDER #1 (2 minutes overdue)
UPDATE invoices SET due_date = (CURRENT_TIMESTAMP - INTERVAL '2 minutes') WHERE invoice_number = 'INV-TEST-20251124070245';
-- Then invoke: https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/payment-reminder-engine

-- Wait 10 seconds...

-- 2️⃣ REMINDER #2 (4 minutes overdue)
UPDATE invoices SET due_date = (CURRENT_TIMESTAMP - INTERVAL '4 minutes') WHERE invoice_number = 'INV-TEST-20251124070245';
-- Then invoke function again

-- Wait 10 seconds...

-- 3️⃣ REMINDER #3 (6 minutes overdue)
UPDATE invoices SET due_date = (CURRENT_TIMESTAMP - INTERVAL '6 minutes') WHERE invoice_number = 'INV-TEST-20251124070245';
-- Then invoke function again

-- Wait 10 seconds...

-- 4️⃣ REMINDER #4 (8 minutes overdue - admin workflow)
UPDATE invoices SET due_date = (CURRENT_TIMESTAMP - INTERVAL '8 minutes') WHERE invoice_number = 'INV-TEST-20251124070245';
-- Then invoke function again
```

### **Method 2: Via Supabase Dashboard**

1. **Go to:** Supabase Dashboard → SQL Editor
2. **Run Step 1 SQL** (set to 2 minutes overdue)
3. **Go to:** Edge Functions → payment-reminder-engine → Invoke
4. **Click:** Invoke (no body needed)
5. **Wait 10 seconds**
6. **Repeat steps 2-5** for 4 min, 6 min, 8 min

### **Method 3: Using curl**

```bash
# Reminder #1
curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/payment-reminder-engine \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo"

# Wait 10 seconds, update invoice to 4 min overdue, then:
curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/payment-reminder-engine \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo"

# Repeat for 6 min and 8 min...
```

---

## ⏱️ Timeline (What to Expect)

```
T+0s:   Run SQL to set invoice 2 min overdue
T+1s:   Invoke function → Email #1 sent
T+10s:  Update invoice to 4 min overdue
T+11s:  Invoke function → Email #2 sent
T+20s:  Update invoice to 6 min overdue
T+21s:  Invoke function → Email #3 sent
T+30s:  Update invoice to 8 min overdue
T+31s:  Invoke function → Admin workflow created

Total: ~40 seconds for all 4 actions! ⚡
```

---

## 🔍 Verification

### Check Email Inbox
**Go to:** g.basera@yahoo.com  
**Expected:** 3 emails (reminders #1, #2, #3)

### Check Database
```sql
-- Verify all reminders sent
SELECT 
  invoice_number,
  reminder_sent_count,
  last_reminder_sent,
  status
FROM invoices
WHERE invoice_number = 'INV-TEST-20251124070245';
-- Expected: reminder_sent_count = 4

-- Check admin workflow created
SELECT 
  title,
  priority,
  status,
  description
FROM admin_workflows
WHERE title LIKE '%INV-TEST-20251124070245%'
ORDER BY created_date DESC;
-- Expected: 1 critical workflow
```

---

## 🎯 What Each Reminder Tests

1. **Reminder #1** - Basic email sending, gentle tone
2. **Reminder #2** - HTML formatting, orange theme, escalation language
3. **Reminder #3** - Urgent styling, red theme, SMS capability (if configured)
4. **Reminder #4** - Admin workflow creation, no client email

---

## 🔄 Complete Flow Diagram

```mermaid
sequenceDiagram
    participant Admin as You (Admin)
    participant DB as Database
    participant Engine as Payment Reminder Engine
    participant Email as Resend Email Service
    participant Client as g.basera@yahoo.com

    Admin->>DB: Set invoice 2 min overdue
    Admin->>Engine: Invoke function
    Engine->>DB: Check overdue invoices
    DB-->>Engine: INV-TEST... is 2 min overdue
    Engine->>Email: Send gentle reminder
    Email->>Client: Email #1 delivered
    Engine->>DB: Set reminder_sent_count = 1

    Note over Admin: Wait 10 seconds

    Admin->>DB: Set invoice 4 min overdue
    Admin->>Engine: Invoke function
    Engine->>DB: Check overdue invoices
    DB-->>Engine: INV-TEST... is 4 min overdue, count=1
    Engine->>Email: Send formal reminder
    Email->>Client: Email #2 delivered
    Engine->>DB: Set reminder_sent_count = 2

    Note over Admin: Wait 10 seconds

    Admin->>DB: Set invoice 6 min overdue
    Admin->>Engine: Invoke function
    Engine->>DB: Check overdue invoices
    DB-->>Engine: INV-TEST... is 6 min overdue, count=2
    Engine->>Email: Send URGENT reminder
    Email->>Client: Email #3 delivered
    Engine->>DB: Set reminder_sent_count = 3

    Note over Admin: Wait 10 seconds

    Admin->>DB: Set invoice 8 min overdue
    Admin->>Engine: Invoke function
    Engine->>DB: Check overdue invoices
    DB-->>Engine: INV-TEST... is 8 min overdue, count=3
    Engine->>DB: Create admin_workflow
    Engine->>DB: Set reminder_sent_count = 4
```

---

## 🚨 Important Notes

1. **Testing Mode is ACTIVE** - Intervals are 2min, 4min, 6min, 8min
2. **Must invoke function manually** - No cron job for instant testing
3. **Each reminder needs the previous one** - Reminder #2 only sends if count=1
4. **Admin workflow instead of email #4** - No client email for final escalation
5. **Remember to disable testing mode** - Set `PAYMENT_REMINDER_TESTING_MODE=false` after testing

---

## 📞 Quick Reference

- **Test Invoice:** INV-TEST-20251124070245
- **Amount:** £1,317.72
- **Client:** Divine Care Center
- **Email:** g.basera@yahoo.com
- **Function URL:** https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/payment-reminder-engine

---

## ✅ Success Checklist

- [ ] Email #1 received (gentle reminder)
- [ ] Email #2 received (formal, orange theme)
- [ ] Email #3 received (urgent, red theme)
- [ ] Admin workflow created in database
- [ ] `reminder_sent_count` = 4
- [ ] All emails have correct invoice number
- [ ] All emails show test mode indicators

---

## 🎉 Ready to Test!

**Everything is configured and ready.** Simply:
1. Use the SQL commands above to set due dates
2. Invoke the function after each update
3. Check g.basera@yahoo.com for emails
4. Verify database updates

**Total time: Under 1 minute for all 4 actions!** ⚡

See `PAYMENT_REMINDER_TEST_GUIDE.md` for detailed step-by-step instructions.

