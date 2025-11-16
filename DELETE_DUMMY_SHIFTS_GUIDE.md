# 🗑️ DELETE DUMMY SHIFTS - COMPLETE GUIDE

## ❌ Problem
All deletion methods (CleanSlate utility, manual deletion) are failing to delete dummy shifts.

## 🎯 Root Cause
Most likely **RLS (Row Level Security) policies** are blocking deletion. This is the #1 issue in Supabase migrations.

---

## ✅ SOLUTION 1: SQL Direct Deletion (RECOMMENDED - FASTEST)

### Step 1: Go to Supabase SQL Editor
1. Open your Supabase project: https://supabase.com/dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the SQL Script
Copy and paste this entire script:

```sql
-- Delete all shift-related data
-- This bypasses RLS policies

-- Step 1: Delete AdminWorkflows
DELETE FROM admin_workflows
WHERE related_entity->>'entity_type' = 'shift';

-- Step 2: Delete ChangeLogs
DELETE FROM change_logs
WHERE affected_entity_type IN ('shift', 'timesheet', 'booking');

-- Step 3: Delete Timesheets
DELETE FROM timesheets;

-- Step 4: Delete Bookings
DELETE FROM bookings;

-- Step 5: Delete Shifts
DELETE FROM shifts;

-- Verify deletion
SELECT 
  'VERIFICATION' as status,
  (SELECT COUNT(*) FROM shifts) as remaining_shifts,
  (SELECT COUNT(*) FROM bookings) as remaining_bookings,
  (SELECT COUNT(*) FROM timesheets) as remaining_timesheets,
  (SELECT COUNT(*) FROM staff) as staff_preserved,
  (SELECT COUNT(*) FROM clients) as clients_preserved;
```

### Step 3: Click "Run"
- You should see: `remaining_shifts: 0`, `remaining_bookings: 0`, `remaining_timesheets: 0`
- Staff and clients should be preserved

---

## ✅ SOLUTION 2: Create RPC Function (For UI-based deletion)

### Step 1: Create the Function
Run this in Supabase SQL Editor:

```sql
CREATE OR REPLACE FUNCTION delete_all_shift_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_timesheets INTEGER;
  deleted_bookings INTEGER;
  deleted_shifts INTEGER;
BEGIN
  DELETE FROM timesheets;
  GET DIAGNOSTICS deleted_timesheets = ROW_COUNT;

  DELETE FROM bookings;
  GET DIAGNOSTICS deleted_bookings = ROW_COUNT;

  DELETE FROM shifts;
  GET DIAGNOSTICS deleted_shifts = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'deleted_shifts', deleted_shifts,
    'deleted_bookings', deleted_bookings,
    'deleted_timesheets', deleted_timesheets
  );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_all_shift_data() TO authenticated;
```

### Step 2: Use from CleanSlate Page
The CleanSlate page has been updated to use this RPC function automatically.

---

## ✅ SOLUTION 3: Fix RLS Policies (Long-term fix)

If you want deletion to work from the UI without RPC functions, you need to update RLS policies:

### Check Current Policies
```sql
-- See what policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('shifts', 'bookings', 'timesheets')
ORDER BY tablename, policyname;
```

### Add Delete Policies
```sql
-- Allow admins to delete shifts
CREATE POLICY "Admins can delete shifts"
ON shifts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.agency_id = shifts.agency_id
  )
);

-- Repeat for bookings and timesheets
CREATE POLICY "Admins can delete bookings"
ON bookings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.agency_id = bookings.agency_id
  )
);

CREATE POLICY "Admins can delete timesheets"
ON timesheets
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.agency_id = timesheets.agency_id
  )
);
```

---

## 📋 Quick Reference

| Method | Speed | Bypasses RLS | Requires SQL Access |
|--------|-------|--------------|---------------------|
| **SQL Direct** | ⚡ Instant | ✅ Yes | ✅ Yes |
| **RPC Function** | ⚡ Fast | ✅ Yes | ⚠️ One-time setup |
| **CleanSlate UI** | 🐌 Slow | ❌ No | ❌ No |
| **Fix RLS Policies** | ⚡ Fast (after fix) | N/A | ✅ Yes |

---

## 🎯 RECOMMENDED APPROACH

1. **Right now:** Use **SQL Direct Deletion** (Solution 1) - fastest, works immediately
2. **For future:** Create **RPC Function** (Solution 2) - allows UI-based deletion
3. **Long-term:** Fix **RLS Policies** (Solution 3) - proper security setup

---

## ⚠️ Important Notes

- **Staff and Clients are PRESERVED** - only shifts, bookings, and timesheets are deleted
- **All methods are SAFE** - they only delete shift-related data
- **RLS is the #1 issue** in Supabase migrations - always check policies first
- **SQL Editor has full access** - it bypasses RLS policies automatically

---

## 🆘 If Still Failing

1. Check browser console for errors
2. Check Supabase logs: Dashboard → Logs → Postgres Logs
3. Verify you're logged in as admin
4. Check if there are foreign key constraints blocking deletion
5. Try deleting in reverse order: timesheets → bookings → shifts

