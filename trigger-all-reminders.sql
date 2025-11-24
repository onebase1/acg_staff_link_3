-- 🚀 AUTOMATED TEST: Trigger All 4 Invoice Reminders Rapidly
-- This script will set up the test invoice to receive all 4 reminders in quick succession
-- Run each step, wait for confirmation, then run the next step

-- ========================================
-- STEP 1: Reset Invoice & Trigger Reminder #1
-- ========================================
UPDATE invoices
SET 
  due_date = (CURRENT_TIMESTAMP - INTERVAL '2 minutes'),
  reminder_sent_count = 0,
  last_reminder_sent = NULL,
  status = 'sent'
WHERE invoice_number = 'INV-TEST-20251124070245';

-- Verify it's ready
SELECT 
  invoice_number,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - due_date))/60 as minutes_overdue,
  reminder_sent_count,
  billing_email
FROM invoices
WHERE invoice_number = 'INV-TEST-20251124070245';

-- NOW INVOKE: payment-reminder-engine function
-- Expected: Email #1 sent to g.basera@yahoo.com

-- ========================================
-- STEP 2: Set to 4 Minutes Overdue → Reminder #2
-- ========================================
-- Wait 10 seconds after Step 1, then run:

UPDATE invoices
SET due_date = (CURRENT_TIMESTAMP - INTERVAL '4 minutes')
WHERE invoice_number = 'INV-TEST-20251124070245';

-- Verify
SELECT 
  invoice_number,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - due_date))/60 as minutes_overdue,
  reminder_sent_count
FROM invoices
WHERE invoice_number = 'INV-TEST-20251124070245';

-- NOW INVOKE: payment-reminder-engine function
-- Expected: Email #2 sent (formal reminder)

-- ========================================
-- STEP 3: Set to 6 Minutes Overdue → Reminder #3
-- ========================================
-- Wait 10 seconds after Step 2, then run:

UPDATE invoices
SET due_date = (CURRENT_TIMESTAMP - INTERVAL '6 minutes')
WHERE invoice_number = 'INV-TEST-20251124070245';

-- Verify
SELECT 
  invoice_number,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - due_date))/60 as minutes_overdue,
  reminder_sent_count
FROM invoices
WHERE invoice_number = 'INV-TEST-20251124070245';

-- NOW INVOKE: payment-reminder-engine function
-- Expected: Email #3 sent (URGENT)

-- ========================================
-- STEP 4: Set to 8 Minutes Overdue → Reminder #4 (Admin Workflow)
-- ========================================
-- Wait 10 seconds after Step 3, then run:

UPDATE invoices
SET due_date = (CURRENT_TIMESTAMP - INTERVAL '8 minutes')
WHERE invoice_number = 'INV-TEST-20251124070245';

-- Verify
SELECT 
  invoice_number,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - due_date))/60 as minutes_overdue,
  reminder_sent_count
FROM invoices
WHERE invoice_number = 'INV-TEST-20251124070245';

-- NOW INVOKE: payment-reminder-engine function
-- Expected: Admin workflow created

-- ========================================
-- STEP 5: Verify All Reminders Sent
-- ========================================
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
  description,
  created_date
FROM admin_workflows
WHERE title LIKE '%INV-TEST-20251124070245%'
ORDER BY created_date DESC
LIMIT 1;

-- ========================================
-- FINAL RESULT
-- ========================================
-- Check your email: g.basera@yahoo.com
-- Expected emails:
-- 1. "Gentle Reminder: Invoice INV-TEST-20251124070245 Payment Due"
-- 2. "🧪 TEST: Payment Reminder #2 - Invoice INV-TEST-20251124070245 (4 mins overdue)"
-- 3. "🚨 URGENT TEST: Reminder #3 - Invoice INV-TEST-20251124070245 - 6 Minutes Overdue"
-- 4. Admin workflow in database (no email)

-- Total time: ~1 minute for all 4 actions! ⚡

