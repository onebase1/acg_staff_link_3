# Test Scenarios - Shift Automation & Business Rules

## ✅ TEST SCENARIO 1: 24-Hour Assignment Block

**Setup:**
1. Create a shift for tomorrow at 10:00 AM
2. Wait until 11:00 AM today (23 hours before shift)
3. Try to assign staff via admin panel

**Expected Result:**
- ❌ Assignment blocked
- Error message: "⚠️ Cannot assign staff to shifts starting within 24 hours. Please add this shift to the marketplace instead (23 hours until shift starts)."

**Verification:**
```sql
-- Check shift is still 'open' and unassigned
SELECT id, status, assigned_staff_id, marketplace_visible 
FROM shifts 
WHERE date = CURRENT_DATE + INTERVAL '1 day';
```

---

## ✅ TEST SCENARIO 2: 12-Hour Confirmation Reminder

**Setup:**
1. Create shift for 3 days from now
2. Assign staff (bypass = false)
3. Manually set `staff_confirmation_requested_at` to 13 hours ago:
```sql
UPDATE shifts 
SET staff_confirmation_requested_at = NOW() - INTERVAL '13 hours',
    confirmation_reminder_sent = false
WHERE id = 'YOUR_SHIFT_ID';
```
4. Wait for cron (or manually trigger automation)

**Expected Result:**
- ✅ Reminder email sent to staff
- ✅ `confirmation_reminder_sent` = true
- ✅ Email subject: "⏰ Reminder: Please confirm your shift on [DATE]"

**Verification:**
```sql
SELECT id, confirmation_reminder_sent, staff_confirmation_requested_at 
FROM shifts 
WHERE id = 'YOUR_SHIFT_ID';
```

---

## ✅ TEST SCENARIO 3: 24-Hour Auto-Marketplace

**Setup:**
1. Create shift for 3 days from now
2. Assign staff (bypass = false)
3. Manually set `staff_confirmation_requested_at` to 25 hours ago:
```sql
UPDATE shifts 
SET staff_confirmation_requested_at = NOW() - INTERVAL '25 hours',
    confirmation_reminder_sent = true
WHERE id = 'YOUR_SHIFT_ID';
```
4. Wait for cron (or manually trigger automation)

**Expected Result:**
- ✅ Shift status changed to 'open'
- ✅ `assigned_staff_id` = NULL
- ✅ `marketplace_visible` = true
- ✅ `marketplace_added_at` = current timestamp
- ✅ Email sent to original staff: "Shift Unassigned - [DATE]"
- ✅ Journey log updated with reason

**Verification:**
```sql
SELECT id, status, assigned_staff_id, marketplace_visible, marketplace_added_at, shift_journey_log 
FROM shifts 
WHERE id = 'YOUR_SHIFT_ID';
```

---

## ✅ TEST SCENARIO 4: Admin Bypass Confirmation

**Setup:**
1. Create shift for tomorrow
2. Assign staff with "Admin Bypass" checkbox enabled

**Expected Result:**
- ✅ Shift status = 'confirmed' (not 'assigned')
- ✅ `staff_confirmed_at` = current timestamp
- ✅ `staff_confirmation_method` = 'admin_bypass'
- ✅ No confirmation email sent to staff
- ✅ No timestamp errors

**Verification:**
```sql
SELECT id, status, staff_confirmed_at, staff_confirmation_method 
FROM shifts 
WHERE id = 'YOUR_SHIFT_ID';
```

---

## ✅ TEST SCENARIO 5: Timestamp Field Consistency

**Setup:**
1. Create shift via admin panel
2. Assign staff (bypass = true)
3. Check all timestamp fields

**Expected Result:**
- ✅ `start_time` = TEXT (e.g., "08:00")
- ✅ `end_time` = TEXT (e.g., "20:00")
- ✅ `created_date` = TIMESTAMPTZ (e.g., "2025-11-18T10:30:00+00")
- ✅ `staff_confirmed_at` = TIMESTAMPTZ
- ✅ No "NaN" or invalid timestamps

**Verification:**
```sql
SELECT start_time, end_time, created_date, staff_confirmed_at 
FROM shifts 
WHERE id = 'YOUR_SHIFT_ID';
```

---

## 🧪 MANUAL TESTING CHECKLIST

- [ ] Test 1: 24-hour assignment block works
- [ ] Test 2: 12-hour reminder sent correctly
- [ ] Test 3: 24-hour auto-marketplace works
- [ ] Test 4: Admin bypass sets timestamps correctly
- [ ] Test 5: All timestamp fields have correct types
- [ ] Test 6: Email notifications sent successfully
- [ ] Test 7: Journey log updated correctly
- [ ] Test 8: Cron job runs every 5 minutes

---

## 🚀 QUICK TEST COMMAND

```bash
# Manually trigger automation
curl -X POST "https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/shift-status-automation" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**All scenarios verified via code review. Ready for production testing.**

