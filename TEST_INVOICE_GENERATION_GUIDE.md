# 🧪 Invoice Generation Testing Guide - Divine Care Center

**Date:** 2025-11-24  
**Status:** ✅ DATA SEEDED - READY FOR TESTING  
**Agency:** Dominion Healthcare Services Ltd  
**Test User:** `info@guest-glow.com`

---

## 📊 Test Data Summary

### Data Successfully Seeded:
- ✅ Fixed 5 timesheets with "NaN:00" invalid times
- ✅ Closed 6 past shifts (all now completed)
- ✅ Approved 5 timesheets ready for invoicing
- ✅ Deleted orphaned draft invoice
- ✅ **5 approved timesheets** totaling **£1,317.72**

### Approved Timesheets Ready:
| Timesheet ID | Date | Amount | Hours | Status |
|--------------|------|--------|-------|--------|
| `fb1f0a3c...` | Nov 21 | £230.16 | 12.00 | ✅ approved |
| `4723356a...` | Nov 20 | £257.40 | 12.00 | ✅ approved |
| `edd9a476...` | Nov 19 | £300.00 | 12.00 | ✅ approved |
| `99009fc0...` | Nov 18 | £230.16 | 12.00 | ✅ approved |
| `751baedd...` | Nov 18 | £300.00 | 12.00 | ✅ approved |

**Total Invoice Value:** £1,317.72  
**Client:** Divine Care Center  
**Agency:** Dominion Healthcare Services Ltd (✅ Bank details configured)

---

## 🧪 Test Scenario 1: Happy Path Invoice Generation

### Step 1: Login
- Navigate to your app
- Login as: `info@guest-glow.com`
- Verify agency: "Dominion Healthcare Services Ltd"

### Step 2: Navigate to Generate Invoices
- Click: **Invoices** → **Generate Invoices**
- Expected: 5 approved timesheets shown
- Expected: Grouped under "Divine Care Center"
- Expected: NO red warning banner (bank details configured)

### Step 3: Select Timesheets
- Click "Select All" checkbox
- Expected: 5 timesheets selected
- Expected: Summary shows:
  - **1 Invoice** (single client)
  - **5 Timesheets** selected
  - **60.0 Total Hours**
  - **£1,317.72 Total Value**

### Step 4: Generate Invoice
- Click **"Generate 1 Invoice"** button
- Expected: Loading spinner
- Expected: Success toast notification
- Expected: Navigate to Invoices page automatically

### Step 5: Verify Draft Invoice
- On Invoices page, look for newest invoice
- Expected status: **DRAFT**
- Expected client: Divine Care Center
- Expected total: **£1,317.72**
- Expected: 5 line items (one per timesheet)

### Step 6: Review Invoice Detail
- Click on the draft invoice to open detail view
- Verify:
  - ✅ All 5 timesheets listed as line items
  - ✅ Dates: Nov 18-21
  - ✅ Correct hours and amounts
  - ✅ Bank details shown at bottom
  - ✅ "Send Invoice" button visible

### Step 7: Send Invoice (POINT OF NO RETURN)
- Click **"Send Invoice"** button
- Confirm dialog: "Send this invoice to Divine Care Center?"
- **WARNING:** This will lock timesheets financially
- Click **Confirm**

### Step 8: Verify Financial Lock
- Expected: Invoice status changes from DRAFT → SENT
- Expected: `sent_at` timestamp set
- Navigate to: **Timesheets** page
- Find the 5 timesheets (by date Nov 18-21)
- Verify each:
  - ✅ Status changed: `approved` → `invoiced`
  - ✅ `financial_locked = true`
  - ✅ Cannot edit (lock icon shown)
  - ✅ Linked to invoice ID

### Step 9: Verify Audit Trail
- Check ChangeLog (if you have access)
- Expected: 5 entries for timesheet locks
- Each entry:
  - change_type: 'timesheet_override'
  - risk_level: 'high'
  - reason: "Timesheet financially locked - included in invoice..."

---

## 🧪 Test Scenario 2: Draft Invoice Deletion (Reversibility)

### Step 1: Generate Another Invoice
- Repeat steps 1-4 from Scenario 1
- Generate a DRAFT invoice

### Step 2: Delete Draft Invoice
- On Invoices page, find the DRAFT invoice
- Click delete/cancel
- Confirm deletion

### Step 3: Verify Timesheets Return to Pool
- Navigate to **Generate Invoices** page
- Expected: The 5 timesheets reappear
- Verify:
  - ✅ Still `status = 'approved'`
  - ✅ `invoice_id = NULL`
  - ✅ `financial_locked = false`
  - ✅ Ready to invoice again

**KEY INSIGHT:** Draft invoices are completely reversible!

---

## 🧪 Test Scenario 3: Validation & Error Handling

### Test 3A: Missing Bank Details
1. Create a new agency WITHOUT bank details
2. Approve some timesheets
3. Try to generate invoice
4. **Expected:** Red warning banner, generation blocked
5. Click link to Agency Settings
6. Add bank details
7. Return to Generate Invoices
8. **Expected:** Warning gone, can now generate

### Test 3B: Already Invoiced Timesheets
1. Generate and SEND an invoice (locks timesheets)
2. Try to generate another invoice
3. **Expected:** Those timesheets no longer appear in list
4. **Expected:** Only uninvoiced timesheets shown

### Test 3C: Incomplete Shift Data
1. Try to invoice a timesheet with NULL `client_charge_amount`
2. **Expected:** Validation error shown
3. **Expected:** Specific timesheets that failed listed

---

## 🔍 Database Queries for Verification

### Check Approved Timesheets Ready:
```sql
SELECT 
  t.id,
  t.shift_date,
  t.status,
  t.client_charge_amount,
  t.invoice_id,
  t.financial_locked,
  c.name as client_name
FROM timesheets t
JOIN clients c ON c.id = t.client_id
WHERE t.status = 'approved'
  AND t.invoice_id IS NULL
  AND c.name ILIKE '%Divine Care%';
```

### Check Latest Invoices:
```sql
SELECT 
  i.id,
  i.invoice_number,
  i.status,
  i.total,
  i.sent_at,
  c.name as client_name,
  COUNT(t.id) as timesheet_count
FROM invoices i
LEFT JOIN clients c ON c.id = i.client_id
LEFT JOIN timesheets t ON t.invoice_id::text = i.id::text  -- Note: data type mismatch workaround
WHERE i.agency_id = 'c8e84c94-8233-4084-b4c3-63ad9dc81c16'  -- Dominion
GROUP BY i.id, i.invoice_number, i.status, i.total, i.sent_at, c.name
ORDER BY i.created_date DESC
LIMIT 5;
```

### Check Financial Locks:
```sql
SELECT 
  id,
  shift_date,
  status,
  financial_locked,
  financial_locked_at,
  invoice_id
FROM timesheets
WHERE client_id = 'f679e93f-97d8-4697-908a-e165f22e322a'  -- Divine Care
  AND shift_date >= '2025-11-18'
ORDER BY shift_date DESC;
```

---

## ⚠️ Known Issues & Workarounds

### Issue 1: Data Type Mismatch (CRITICAL)
- **Problem:** `timesheets.invoice_id` is TEXT, `invoices.id` is UUID
- **Impact:** Queries joining tables fail
- **Workaround:** Use `::text` casting in queries
- **Fix:** Run migration: `20251124_fix_timesheet_invoice_id_datatype.sql`

### Issue 2: "NaN:00" in actual_start_time
- **Status:** ✅ FIXED (in today's seeding)
- **Prevention:** Frontend validation added

### Issue 3: NULL invoice_number on drafts
- **Status:** Known issue
- **Impact:** Draft invoices show NULL number, generated on send
- **Workaround:** None needed, expected behavior

---

## ✅ Success Criteria

After testing, you should verify:
- ✅ Invoice generated with correct totals
- ✅ All 5 timesheets linked to invoice
- ✅ Draft invoice is deletable/reversible
- ✅ Sent invoice locks timesheets
- ✅ Locked timesheets cannot be re-invoiced
- ✅ Financial snapshot preserved
- ✅ ChangeLog entries created
- ✅ Email sent to client (check logs)

---

## 🚀 Next Steps After Testing

1. **If successful:** Test payment reminder flow
2. **Run migration:** Fix data type mismatch
3. **Add validations:** Prevent NULL charge_amounts
4. **Configure automation:** Payment reminder schedule
5. **Monitor:** Check for errors in production logs

---

## 📞 Test Accounts

| Email | Password | Agency | Role | Bank Details |
|-------|----------|--------|------|--------------|
| `info@guest-glow.com` | (your password) | Dominion Healthcare | Admin | ✅ Configured |
| `g.basera@yahoo.com` | (your password) | Agile Care Group | Admin | ❌ Not configured |
| `g.basera5+agencyadmin@gmail.com` | (your password) | Guest Glow Healthcare | Admin | ❌ Not configured |

**Use Dominion account for testing - only one with bank details!**

