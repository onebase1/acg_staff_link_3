# MODULE 35: Email Template Fixes

## Issues Identified & Fixed

### ✅ 1. Admin Email Now Uses Branded Templates
**Problem:** Admin notification emails used hardcoded HTML without branding
**Solution:** Created `staff_decline_admin.html` template with:
- Header with agency branding
- Dark theme footer (#1e293b background)
- Dynamic `{{agency_email}}` variable
- Professional styling matching existing templates

**File:** `supabase/functions/_shared/templates/staff_decline_admin.html`

### ✅ 2. Edge Function Updated
**Problem:** Edge function had hardcoded HTML for admin email
**Solution:** Updated `staff-decline-shift/index.ts` to:
- Import `loadTemplate` from templateLoader
- Use `staff_decline_admin` template
- Pass all variables dynamically (agency_name, agency_email, etc.)

**Status:** ✅ Deployed

### ⚠️ 3. Wrong Agency Email in Database
**Problem:** Admin email went to `ops@dominion-healthcare.co.uk` (doesn't exist)
**Root Cause:** Email stored in `agencies` table for Dominion Healthcare
**Solution:** Run SQL to update email

**Action Required:**
1. Go to: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/sql/new
2. Run this SQL:
```sql
-- Update to your real admin email
UPDATE agencies
SET email = 'YOUR-REAL-EMAIL@dominion-healthcare.co.uk'
WHERE name ILIKE '%dominion%';

-- Verify
SELECT id, name, email FROM agencies WHERE name ILIKE '%dominion%';
```

**Or use the script:** `scripts/fix-dominion-email.sql`

### ⚠️ 4. Staff Unassignment Notification
**Problem:** Toast says "You will receive confirmation via email" but email not sent
**Possible Causes:**
1. **Preference Check:** Staff may have opted out of "system_update" notifications
2. **Email Validation:** Staff email may be invalid
3. **Silent Failure:** `critical-change-notifier` failed but didn't throw error

**Investigation Steps:**
1. Check Supabase Function Logs:
   - https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/logs/edge-functions
   - Filter for `critical-change-notifier`
   - Look for errors around 12:28 AM on Dec 25

2. Check Staff Email:
```sql
SELECT id, first_name, last_name, email
FROM staff
WHERE id = 'theresa-atomi-id';
```

3. Check Notification Preferences:
```sql
SELECT * FROM notification_preferences
WHERE staff_id = 'theresa-atomi-id'
AND notification_type = 'system_update';
```

**Recommended Fix:**
- For critical notifications like shift unassignment, consider bypassing preference checks
- Or use a different notification type like 'critical_alert' that can't be opted out

---

## Summary of Changes

| Component | Status | Description |
|-----------|--------|-------------|
| Edge Function | ✅ Deployed | Now uses template system |
| Admin Email Template | ✅ Created | Branded HTML with dark theme |
| Template Variables | ✅ Fixed | Uses {{agency_email}} dynamically |
| Database Email | ⚠️ Needs Fix | Update `ops@dominion-healthcare.co.uk` |
| Staff Notification | ⚠️ Needs Investigation | Check logs for failure reason |

---

## Testing Instructions

### Test 1: Admin Email with New Template
1. Login as staff (Theresa Atomi)
2. Go to My Shifts
3. Click "Decline Shift" on any confirmed shift
4. Provide decline reason
5. ✅ **Expected:** Admin receives branded email with:
   - Red warning header
   - Shift details in styled box
   - Decline reason highlighted
   - Dark theme footer with {{agency_email}}

### Test 2: Verify Staff Email
1. Check Supabase Edge Function Logs
2. Search for `[Staff Decline] Sending unassignment notification`
3. ✅ **Expected:** See log entry showing notification sent
4. ⚠️ **If not:** Check for error messages

---

## Next Steps

1. **Fix Agency Email (Required):**
   - Run SQL to update Dominion Healthcare email
   - Test by declining another shift

2. **Investigate Staff Notification (Recommended):**
   - Check edge function logs
   - Verify staff email is valid
   - Check notification preferences
   - Consider bypassing preference check for critical alerts

3. **Deploy RLS Policies (If Not Done):**
   - Run the SQL from earlier to create the 3 RLS policies
   - This enables staff to decline their own shifts

---

## Files Modified/Created

| File | Type | Status |
|------|------|--------|
| `supabase/functions/staff-decline-shift/index.ts` | Modified | ✅ Deployed |
| `supabase/functions/_shared/templates/staff_decline_admin.html` | New | ✅ Created |
| `scripts/fix-dominion-email.sql` | New | ⏳ Needs Running |
| `MODULE_35_EMAIL_FIXES.md` | New | This file |

---

**Last Updated:** 2025-12-25
**Status:** Partial Fix - Admin email template fixed, agency email needs database update
