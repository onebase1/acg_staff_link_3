-- ============================================================================
-- DATABASE DIAGNOSTIC SCRIPT
-- ============================================================================
-- Purpose: Check if data exists and identify the root cause of empty dashboard
-- Run this in Supabase Dashboard SQL Editor
-- ============================================================================

-- 1. Check if RLS is enabled on key tables
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('agencies', 'staff', 'shifts', 'clients', 'timesheets', 'profiles')
ORDER BY tablename;

-- 2. Check total row counts (bypasses RLS using postgres role)
SELECT
  'agencies' as table_name,
  COUNT(*) as total_rows
FROM agencies
UNION ALL
SELECT
  'staff' as table_name,
  COUNT(*) as total_rows
FROM staff
UNION ALL
SELECT
  'shifts' as table_name,
  COUNT(*) as total_rows
FROM shifts
UNION ALL
SELECT
  'clients' as table_name,
  COUNT(*) as total_rows
FROM clients
UNION ALL
SELECT
  'timesheets' as table_name,
  COUNT(*) as total_rows
FROM timesheets
UNION ALL
SELECT
  'profiles' as table_name,
  COUNT(*) as total_rows
FROM profiles;

-- 3. Check if the Dominion admin user profile exists
SELECT
  id,
  email,
  user_type,
  agency_id,
  client_id,
  full_name,
  created_at
FROM profiles
WHERE email = 'info@guest-glow.com';

-- 4. Check if Dominion agency exists
SELECT
  id,
  name,
  subscription_tier,
  contact_email,
  created_at
FROM agencies
WHERE name ILIKE '%Dominion%' OR contact_email = 'info@guest-glow.com';

-- 5. Check if there's staff for Dominion agency
-- (Replace <agency_id> with the ID from query #4)
-- SELECT
--   id,
--   first_name,
--   last_name,
--   status,
--   agency_id
-- FROM staff
-- WHERE agency_id = '<agency_id>'
-- LIMIT 5;

-- 6. Check existing RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. Test if current authenticated user can read data (if logged in)
-- This will show what the authenticated user can actually see
-- Run this AFTER logging into your app:
--
-- SELECT auth.uid() as current_user_id;
-- SELECT * FROM profiles WHERE id = auth.uid();
-- SELECT * FROM agencies WHERE id IN (SELECT agency_id FROM profiles WHERE id = auth.uid());
-- SELECT COUNT(*) FROM staff WHERE agency_id IN (SELECT agency_id FROM profiles WHERE id = auth.uid());

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
--
-- Query #1: Should show RLS status for each table
--   - If rls_enabled = true, RLS is active (likely blocking queries)
--   - If rls_enabled = false, RLS is disabled (data should flow)
--
-- Query #2: Should show non-zero counts if data exists
--   - If all counts = 0, database is empty (need to import data)
--   - If counts > 0, data exists (RLS or user profile issue)
--
-- Query #3: Should return 1 row for info@guest-glow.com
--   - Check if agency_id is set (should not be null)
--   - Check if user_type is 'agency_admin'
--
-- Query #4: Should return 1 row for Dominion agency
--   - Note the agency ID for use in query #5
--
-- Query #5: Should show staff records for Dominion
--   - If empty but Query #2 shows staff exist, it's an agency_id mismatch
--
-- Query #6: Should list all RLS policies
--   - If empty, no policies exist (need to apply migration)
--   - If populated, policies exist (may need adjustment)
--
-- ============================================================================
-- TROUBLESHOOTING GUIDE
-- ============================================================================
--
-- SCENARIO A: RLS enabled = true, policies count = 0
--   SOLUTION: Apply RLS policies migration (20251112000000_enable_rls_policies.sql)
--
-- SCENARIO B: RLS enabled = false, data counts > 0, but dashboard shows zeros
--   SOLUTION: Check user profile agency_id matches agency in database
--
-- SCENARIO C: RLS enabled = true, policies exist, but dashboard shows zeros
--   SOLUTION: Check if user's agency_id in profiles matches data in tables
--
-- SCENARIO D: All data counts = 0
--   SOLUTION: Import data from Base44 or seed database
--
-- SCENARIO E: User profile doesn't exist for info@guest-glow.com
--   SOLUTION: Create profile with correct agency_id
--
-- ============================================================================
