# Rollback Plan: UX Changes (Confirm Staff Button + Inverted Checkbox)

## What Was Changed (2025-11-19)

### Files Modified:
1. `src/pages/Shifts.jsx`
2. `src/components/shifts/ShiftAssignmentModal.jsx`
3. `src/pages/Dashboard.jsx`

### Changes Made:
- Button label: "Assign Staff" → "Confirm Staff"
- Modal title: "Assign Staff to Shift" → "Confirm Staff for Shift"
- Checkbox logic: INVERTED (checked = assign only, unchecked = confirm immediately)
- Checkbox label: "⚡ Admin Bypass" → "📋 Assign Only (staff must confirm)"
- Color scheme: Blue → Amber
- Dashboard.jsx: Added bypass mode support

---

## 🚨 ROLLBACK INSTRUCTIONS

### Option 1: Git Revert (Recommended)

```bash
# Find the commit hash
git log --oneline -5

# Revert the UX changes commit (replace COMMIT_HASH with actual hash)
git revert COMMIT_HASH

# Push the revert
git push origin main
```

### Option 2: Manual Rollback

Run these commands to restore previous versions:

```bash
# Restore from last commit before UX changes
git checkout HEAD~1 -- src/pages/Shifts.jsx
git checkout HEAD~1 -- src/components/shifts/ShiftAssignmentModal.jsx
git checkout HEAD~1 -- src/pages/Dashboard.jsx

# Commit the rollback
git add src/pages/Shifts.jsx src/components/shifts/ShiftAssignmentModal.jsx src/pages/Dashboard.jsx
git commit -m "Rollback: Revert UX changes (Confirm Staff button + inverted checkbox)"
git push origin main
```

### Option 3: Keep Changes, Fix Database Issue Only

If the UX changes are good but there's a database issue:

1. **Don't rollback the UX changes**
2. **Fix the database constraint error** (see below)

---

## 🔍 DATABASE CONSTRAINT ERROR

### Error Message:
```
Failed to assign staff: new row for relation "bookings" violates check constraint "bookings_end_time_format"
```

### Root Cause:
The `bookings` table expects `start_time` and `end_time` in **HH:MM format** (e.g., "08:00", "20:00").

The constraint is:
```sql
CHECK (end_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$')
```

### Possible Causes:
1. **Shift data has invalid time format** (e.g., "8:00" instead of "08:00", or "20:00:00" with seconds)
2. **Shift data is NULL or empty**
3. **Shift data is in wrong format** (e.g., full timestamp instead of HH:MM)

### How to Debug:

1. **Check the shift data in console:**
   - Open browser DevTools → Console
   - Look for the error details
   - Check what `shift.start_time` and `shift.end_time` values are

2. **Query the database:**
   ```sql
   SELECT id, start_time, end_time, date
   FROM shifts
   WHERE date = '2025-11-29'  -- Replace with the shift date from error
   LIMIT 10;
   ```

3. **Check for invalid formats:**
   ```sql
   SELECT id, start_time, end_time
   FROM shifts
   WHERE start_time !~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
      OR end_time !~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$';
   ```

### How to Fix:

**If times are in wrong format (e.g., "8:00" instead of "08:00"):**
```sql
UPDATE shifts
SET 
  start_time = LPAD(start_time, 5, '0'),
  end_time = LPAD(end_time, 5, '0')
WHERE LENGTH(start_time) < 5 OR LENGTH(end_time) < 5;
```

**If times have seconds (e.g., "20:00:00"):**
```sql
UPDATE shifts
SET 
  start_time = SUBSTRING(start_time FROM 1 FOR 5),
  end_time = SUBSTRING(end_time FROM 1 FOR 5)
WHERE LENGTH(start_time) > 5 OR LENGTH(end_time) > 5;
```

---

## ✅ VERIFICATION AFTER ROLLBACK

1. **Hard refresh browser:** `Ctrl + Shift + R`
2. **Check button label:** Should say "Assign Staff" (not "Confirm Staff")
3. **Check checkbox:** Should say "⚡ Admin Bypass" (not "📋 Assign Only")
4. **Check checkbox default:** Should be UNCHECKED by default (bypass enabled)
5. **Test assignment:** Should work without database errors

---

## 📊 DECISION MATRIX

| Scenario | Action |
|----------|--------|
| UX changes are confusing users | **Rollback Option 1 or 2** |
| Database error only, UX is good | **Keep UX, fix database (Option 3)** |
| Both UX and database issues | **Rollback first, then fix database** |

---

## 🔗 Related Files
- Original commit: (to be added after commit)
- Migration: `supabase/migrations/20251118_convert_booking_times_to_text.sql`
- Schema: `expected_schema.json`
- Documentation: `BOOKING_TIME_MIGRATION_FIX.md`

