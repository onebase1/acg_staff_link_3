# Dashboard Data Loading Issue - RLS Fix Instructions

## Problem Identified

Your dashboard shows all zeros because **Row Level Security (RLS) policies are missing** on your Supabase database tables. Without RLS policies, authenticated users cannot read any data, even though the data exists in the database.

## About base44 References

The `import { base44 } from '@/api/base44Client'` references you see are **CORRECT and EXPECTED**. This is a compatibility layer that routes all calls to Supabase. You do NOT need to change these imports.

---

## Solution: Apply RLS Policies

### Option 1: Quick Test (Verify RLS is the issue)

1. Go to: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/editor
2. Click "SQL Editor" in the left menu
3. Run this SQL to temporarily disable RLS on key tables:

```sql
-- TEMPORARY: Disable RLS for testing
ALTER TABLE agencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
```

4. Refresh your dashboard - if data shows up, RLS was the issue
5. **IMPORTANT**: Don't leave RLS disabled! Continue to Option 2 to secure your data

---

### Option 2: Apply RLS Policies (Recommended)

1. Go to: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/editor
2. Click "SQL Editor" in the left menu
3. Click "New Query"
4. Copy the ENTIRE contents of this file:
   ```
   supabase/migrations/20251112000000_enable_rls_policies.sql
   ```
5. Paste into the SQL Editor
6. Click "Run" (or press Ctrl+Enter)
7. Wait for "Success" message (may take 30-60 seconds)
8. Refresh your dashboard

---

### Option 3: Using CLI (If you have database password)

1. Open terminal in project directory
2. Run:
   ```bash
   cd /c/Users/gbase/AiAgency/ACG_BASE/agc_latest3
   /c/Users/gbase/superbasecli/supabase db push
   ```
3. Enter your database password when prompted
4. Wait for migration to complete
5. Refresh your dashboard

---

## Verify the Fix

After applying RLS policies, verify your dashboard:

1. Log in as: **info@guest-glow.com** (password: Dominion#2025)
2. Dashboard should now show:
   - Active Staff count
   - Shifts for Dominion Healthcare Services Ltd
   - Fill rate percentage
   - Revenue data

3. If you still see zeros, run this diagnostic SQL:

```sql
-- Check if your user profile exists and has agency_id
SELECT
  id,
  email,
  user_type,
  agency_id,
  client_id
FROM profiles
WHERE email = 'info@guest-glow.com';

-- Check if Dominion agency exists
SELECT
  id,
  name,
  subscription_tier
FROM agencies
WHERE name ILIKE '%Dominion%';

-- Check if there's data in the database
SELECT
  (SELECT COUNT(*) FROM staff) as staff_count,
  (SELECT COUNT(*) FROM shifts) as shifts_count,
  (SELECT COUNT(*) FROM agencies) as agencies_count;
```

---

## What the RLS Policies Do

The policies ensure:

1. **Multi-tenant security**: Each agency can only see their own data
2. **Staff privacy**: Staff can only see their own records + their agency's shifts
3. **Super admin access**: g.basera@yahoo.com can see all data across agencies
4. **Role-based access**: Agency admins can create/update, staff can only read

---

## Need Help?

If you're still seeing issues after applying RLS policies:

1. Check if the user profile has the correct `agency_id` set
2. Verify the agency exists in the `agencies` table
3. Check browser console for specific error messages
4. Run the diagnostic SQL above and share results

---

## Technical Details

The RLS policies use these helper functions:

- `is_super_admin()` - Checks if email is g.basera@yahoo.com
- `get_user_agency_id()` - Returns the current user's agency_id
- `is_agency_admin()` - Checks if user_type is agency_admin or super_admin

All queries are automatically filtered by agency_id, ensuring data isolation between agencies.
