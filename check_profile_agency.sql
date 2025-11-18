-- Check current user's profile and agency linkage
-- Run this in Supabase SQL Editor

-- 1. Check your profile
SELECT 
  id,
  email,
  user_type,
  agency_id,
  client_id,
  full_name,
  created_at
FROM profiles
WHERE email = 'g.basera@yahoo.com';

-- 2. Check if agency exists
SELECT 
  id,
  name,
  contact_email,
  created_date
FROM agencies
WHERE contact_email = 'g.basera@yahoo.com';

-- 3. Check if clients exist for your agency
SELECT 
  c.id,
  c.name,
  c.agency_id,
  a.name as agency_name
FROM clients c
LEFT JOIN agencies a ON c.agency_id = a.id
WHERE c.agency_id IN (
  SELECT agency_id FROM profiles WHERE email = 'g.basera@yahoo.com'
);

-- 4. Test RLS helper functions
SELECT 
  is_super_admin() as is_super_admin,
  get_user_agency_id() as user_agency_id,
  is_agency_admin() as is_agency_admin;

