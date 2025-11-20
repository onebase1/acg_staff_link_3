-- ============================================================================
-- FIX LIAM OSEI'S ORPHANED ACCOUNT
-- ============================================================================
-- User: Liam Osei (g.basera5+liam@gmail.com)
-- Issue: Account created via password reset, not linked to agency/staff record
-- Solution: Manually link profile to Dominion agency and create/link staff record
-- ============================================================================

-- STEP 1: Find user's auth ID and current profile status
-- ============================================================================
SELECT 
  au.id as auth_user_id,
  au.email,
  au.created_at as auth_created,
  p.user_type,
  p.agency_id,
  p.full_name,
  a.name as agency_name
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN agencies a ON a.id = p.agency_id
WHERE au.email = 'g.basera5+liam@gmail.com';

-- Expected Result:
-- auth_user_id: [some UUID]
-- email: g.basera5+liam@gmail.com
-- user_type: pending (or NULL)
-- agency_id: NULL
-- agency_name: NULL

-- ============================================================================
-- STEP 2: Find Dominion agency ID
-- ============================================================================
SELECT id, name, contact_email, status
FROM agencies
WHERE name ILIKE '%dominion%'
ORDER BY created_date DESC
LIMIT 5;

-- Copy the correct agency ID from results

-- ============================================================================
-- STEP 3: Check if staff record already exists for Liam
-- ============================================================================
SELECT 
  id as staff_id,
  first_name,
  last_name,
  email,
  phone,
  user_id,
  agency_id,
  status,
  role,
  employment_type
FROM staff
WHERE email = 'g.basera5+liam@gmail.com'
   OR phone = '+447901685907'
   OR (first_name ILIKE '%liam%' AND last_name ILIKE '%osei%');

-- ============================================================================
-- STEP 4A: If staff record EXISTS - Link it to user account
-- ============================================================================
-- Replace [AUTH_USER_ID] with the ID from STEP 1
-- Replace [STAFF_ID] with the ID from STEP 3

UPDATE staff
SET 
  user_id = '[AUTH_USER_ID]',  -- e.g., 'a1b2c3d4-...'
  status = 'active',
  updated_date = NOW()
WHERE id = '[STAFF_ID]';

-- ============================================================================
-- STEP 4B: If NO staff record exists - Create one
-- ============================================================================
-- Replace [AUTH_USER_ID] with the ID from STEP 1
-- Replace [DOMINION_AGENCY_ID] with the ID from STEP 2

INSERT INTO staff (
  user_id,
  agency_id,
  first_name,
  last_name,
  email,
  phone,
  status,
  role,
  employment_type,
  created_date,
  updated_date
)
VALUES (
  '[AUTH_USER_ID]',           -- User's auth ID
  '[DOMINION_AGENCY_ID]',     -- Dominion agency ID
  'Liam',
  'Osei',
  'g.basera5+liam@gmail.com',
  '+447901685907',
  'active',
  'healthcare_assistant',     -- Or 'nurse' if Med Trained
  'temporary',
  NOW(),
  NOW()
)
RETURNING id, first_name, last_name, email, status;

-- ============================================================================
-- STEP 5: Update profile to link to agency
-- ============================================================================
-- Replace [AUTH_USER_ID] with the ID from STEP 1
-- Replace [DOMINION_AGENCY_ID] with the ID from STEP 2

UPDATE profiles
SET 
  user_type = 'staff_member',
  agency_id = '[DOMINION_AGENCY_ID]',
  full_name = 'Liam Osei',
  updated_at = NOW()
WHERE id = '[AUTH_USER_ID]';

-- ============================================================================
-- STEP 6: Verify the fix
-- ============================================================================
SELECT 
  au.email,
  p.user_type,
  p.full_name,
  a.name as agency_name,
  s.first_name || ' ' || s.last_name as staff_name,
  s.status as staff_status,
  s.role as staff_role
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN agencies a ON a.id = p.agency_id
LEFT JOIN staff s ON s.user_id = au.id
WHERE au.email = 'g.basera5+liam@gmail.com';

-- Expected Result:
-- ✅ user_type: staff_member
-- ✅ agency_name: Dominion [Agency Name]
-- ✅ staff_name: Liam Osei
-- ✅ staff_status: active
-- ✅ staff_role: healthcare_assistant (or nurse)

-- ============================================================================
-- STEP 7: Check if user has confirmed shifts
-- ============================================================================
SELECT 
  sh.id as shift_id,
  sh.shift_date,
  sh.shift_type,
  sh.status,
  c.name as client_name,
  s.first_name || ' ' || s.last_name as assigned_staff
FROM shifts sh
LEFT JOIN clients c ON c.id = sh.client_id
LEFT JOIN staff s ON s.id = sh.assigned_staff_id
WHERE sh.assigned_staff_id IN (
  SELECT id FROM staff WHERE email = 'g.basera5+liam@gmail.com'
);

-- This will show you Liam's confirmed shifts

