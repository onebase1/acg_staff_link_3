-- ============================================================================
-- MODULE 1 & 3: TEST DATA SEED SCRIPT
-- ============================================================================
-- Purpose: Create comprehensive test data for UAT testing
-- Agency: Dominion Healthcare Services Ltd
-- Client: Divine Care Center
-- Staff: Chadaira Basera, Liam Osei
-- 
-- IMPORTANT: Run this script as a Supabase admin or service role
-- ============================================================================

-- Set variables (UPDATE THESE IF NEEDED)
\set AGENCY_ID 'c8e84c94-8233-4084-b4c3-63ad9dc81c16'
\set CLIENT_ID 'f679e93f-97d8-4697-908a-e165f22e322a'
\set STAFF_1_ID 'c487d84c-f77b-4797-9e98-321ee8b49a87'
\set STAFF_2_ID 'ee761f6f-3945-4ad2-a7de-23b119626035'

-- ============================================================================
-- STEP 1: CREATE AUTH USERS FOR CLIENT CONTACTS
-- ============================================================================
-- NOTE: These users need to be created via Supabase Auth UI or Admin API
-- because we cannot set passwords directly via SQL
--
-- Manual Steps (Do this FIRST in Supabase Dashboard):
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" for each email below:
--
-- User 1 (Operations Manager):
--   Email: g.basera5+ops_manager@gmail.com
--   Password: Broadband@123
--   Confirm email: YES
--
-- User 2 (Finance Manager):
--   Email: g.basera5+finance@gmail.com
--   Password: Broadband@123
--   Confirm email: YES
--
-- User 3 (Facility Coordinator):
--   Email: g.basera5+coordinator@gmail.com
--   Password: Broadband@123
--   Confirm email: YES
--
-- User 4 (View-Only Contact):
--   Email: g.basera5+viewonly@gmail.com
--   Password: Broadband@123
--   Confirm email: YES
--
-- AFTER creating auth users, get their UUIDs and update below:
-- ============================================================================

-- Replace these UUIDs with actual auth user IDs from Supabase Auth dashboard
\set OPS_MANAGER_AUTH_ID 'REPLACE_WITH_AUTH_UUID'
\set FINANCE_MANAGER_AUTH_ID 'REPLACE_WITH_AUTH_UUID'
\set COORDINATOR_AUTH_ID 'REPLACE_WITH_AUTH_UUID'
\set VIEWONLY_AUTH_ID 'REPLACE_WITH_AUTH_UUID'

-- ============================================================================
-- STEP 2: CREATE PROFILES (if using email-based login)
-- ============================================================================

-- Insert profiles for client contacts
INSERT INTO profiles (id, role, first_name, last_name, email, client_id, created_at)
VALUES 
  (:'OPS_MANAGER_AUTH_ID', 'client', 'John', 'Operations', 'g.basera5+ops_manager@gmail.com', :'CLIENT_ID', NOW()),
  (:'FINANCE_MANAGER_AUTH_ID', 'client', 'Sarah', 'Finance', 'g.basera5+finance@gmail.com', :'CLIENT_ID', NOW()),
  (:'COORDINATOR_AUTH_ID', 'client', 'Mike', 'Coordinator', 'g.basera5+coordinator@gmail.com', :'CLIENT_ID', NOW()),
  (:'VIEWONLY_AUTH_ID', 'client', 'View', 'Only', 'g.basera5+viewonly@gmail.com', :'CLIENT_ID', NOW())
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  client_id = EXCLUDED.client_id;

-- ============================================================================
-- STEP 3: CREATE CLIENT_CONTACTS (RBAC)
-- ============================================================================

INSERT INTO client_contacts (
  id, client_id, profile_id, role, first_name, last_name, email, phone_number,
  job_title, department, is_primary_contact, is_active, created_by, created_at
)
VALUES 
  -- Operations Manager (Full Access)
  (
    gen_random_uuid(),
    :'CLIENT_ID',
    :'OPS_MANAGER_AUTH_ID',
    'OPERATIONS_MANAGER',
    'John',
    'Operations',
    'g.basera5+ops_manager@gmail.com',
    '+44 7700 900001',
    'Operations Manager',
    'Operations',
    true,
    true,
    'test_seed_script',
    NOW()
  ),
  
  -- Finance Manager (Billing Only)
  (
    gen_random_uuid(),
    :'CLIENT_ID',
    :'FINANCE_MANAGER_AUTH_ID',
    'FINANCE_MANAGER',
    'Sarah',
    'Finance',
    'g.basera5+finance@gmail.com',
    '+44 7700 900002',
    'Finance Manager',
    'Finance',
    false,
    true,
    'test_seed_script',
    NOW()
  ),
  
  -- Facility Coordinator (Assigned Only)
  (
    gen_random_uuid(),
    :'CLIENT_ID',
    :'COORDINATOR_AUTH_ID',
    'FACILITY_COORDINATOR',
    'Mike',
    'Coordinator',
    'g.basera5+coordinator@gmail.com',
    '+44 7700 900003',
    'Facility Coordinator',
    'Operations',
    false,
    true,
    'test_seed_script',
    NOW()
  ),
  
  -- View-Only Contact (Read-Only)
  (
    gen_random_uuid(),
    :'CLIENT_ID',
    :'VIEWONLY_AUTH_ID',
    'VIEW_ONLY_CONTACT',
    'View',
    'Only',
    'g.basera5+viewonly@gmail.com',
    '+44 7700 900004',
    'Observer',
    'Management',
    false,
    true,
    'test_seed_script',
    NOW()
  )
ON CONFLICT (client_id, profile_id) DO UPDATE SET
  role = EXCLUDED.role,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone_number = EXCLUDED.phone_number,
  job_title = EXCLUDED.job_title,
  is_active = true;

-- ============================================================================
-- STEP 4: CREATE TEST SHIFTS
-- ============================================================================

-- Create 10 test shifts (5 completed, 5 upcoming)
DO $$
DECLARE
  shift_date DATE;
  shift_id UUID;
BEGIN
  -- Completed shifts (2-5 days ago)
  FOR i IN 1..5 LOOP
    shift_date := CURRENT_DATE - (i + 1);
    
    INSERT INTO shifts (
      id, agency_id, client_id, date, start_time, end_time,
      role_required, assigned_staff_id, status, rating_status,
      client_created, created_at
    ) VALUES (
      gen_random_uuid(),
      :'AGENCY_ID',
      :'CLIENT_ID',
      shift_date,
      '08:00',
      '20:00',
      'healthcare_assistant',
      CASE WHEN i % 2 = 0 THEN :'STAFF_1_ID' ELSE :'STAFF_2_ID' END,
      'completed',
      CASE WHEN i <= 3 THEN 'awaiting_rating' ELSE 'rated' END,
      true,
      NOW()
    );
  END LOOP;
  
  -- Upcoming shifts (today + next 4 days)
  FOR i IN 0..4 LOOP
    shift_date := CURRENT_DATE + i;
    
    INSERT INTO shifts (
      id, agency_id, client_id, date, start_time, end_time,
      role_required, assigned_staff_id, status, rating_status,
      client_created, created_at
    ) VALUES (
      gen_random_uuid(),
      :'AGENCY_ID',
      :'CLIENT_ID',
      shift_date,
      '08:00',
      '20:00',
      'healthcare_assistant',
      CASE WHEN i % 2 = 0 THEN :'STAFF_1_ID' ELSE :'STAFF_2_ID' END,
      CASE 
        WHEN i = 0 THEN 'in_progress'
        ELSE 'confirmed'
      END,
      'not_required',
      true,
      NOW()
    );
  END LOOP;
END $$;

-- ============================================================================
-- STEP 5: CREATE SAMPLE RATINGS
-- ============================================================================

-- Get IDs of completed shifts
DO $$
DECLARE
  completed_shifts UUID[];
  contact_uuid UUID;
BEGIN
  -- Get completed shifts
  SELECT ARRAY_AGG(id) INTO completed_shifts
  FROM shifts
  WHERE client_id = :'CLIENT_ID'
    AND status = 'completed'
    AND rating_status = 'rated'
  LIMIT 2;
  
  -- Get Operations Manager contact_id
  SELECT id INTO contact_uuid
  FROM client_contacts
  WHERE client_id = :'CLIENT_ID'
    AND role = 'OPERATIONS_MANAGER'
  LIMIT 1;
  
  -- Create ratings for 2 completed shifts
  IF array_length(completed_shifts, 1) >= 1 THEN
    -- High rating for Chadaira (4.5 average)
    INSERT INTO client_ratings (
      id, client_id, staff_id, shift_id, contact_id,
      professionalism_rating, competence_rating,
      communication_rating, reliability_rating,
      comments, anonymized, created_at
    ) VALUES (
      gen_random_uuid(),
      :'CLIENT_ID',
      :'STAFF_1_ID',
      completed_shifts[1],
      contact_uuid,
      5, 4, 5, 4,
      'Excellent performance! Very professional and competent.',
      false,
      NOW()
    );
  END IF;
  
  IF array_length(completed_shifts, 1) >= 2 THEN
    -- Good rating for Liam (4.0 average)
    INSERT INTO client_ratings (
      id, client_id, staff_id, shift_id, contact_id,
      professionalism_rating, competence_rating,
      communication_rating, reliability_rating,
      comments, anonymized, created_at
    ) VALUES (
      gen_random_uuid(),
      :'CLIENT_ID',
      :'STAFF_2_ID',
      completed_shifts[2],
      contact_uuid,
      4, 4, 4, 4,
      'Great work! Reliable and communicative.',
      false,
      NOW()
    );
  END IF;
END $$;

-- ============================================================================
-- STEP 6: CREATE SAMPLE NOTIFICATIONS
-- ============================================================================

-- Get Operations Manager contact_id
DO $$
DECLARE
  contact_uuid UUID;
  shift_uuid UUID;
BEGIN
  SELECT id INTO contact_uuid
  FROM client_contacts
  WHERE client_id = :'CLIENT_ID'
    AND role = 'OPERATIONS_MANAGER'
  LIMIT 1;
  
  SELECT id INTO shift_uuid
  FROM shifts
  WHERE client_id = :'CLIENT_ID'
    AND status = 'completed'
    AND rating_status = 'awaiting_rating'
  LIMIT 1;
  
  -- Create diverse notifications
  INSERT INTO client_notifications (
    id, client_id, contact_id, type, title, message,
    related_entity_id, related_entity_type, priority, channel, created_at
  ) VALUES 
    -- Rating reminder
    (
      gen_random_uuid(),
      :'CLIENT_ID',
      contact_uuid,
      'rating_reminder',
      '⭐ Rate Staff Performance',
      'Your shift from 2 days ago has been completed. Please rate the staff member.',
      shift_uuid,
      'shift',
      'normal',
      'in_app',
      NOW() - INTERVAL '1 hour'
    ),
    
    -- Shift assigned
    (
      gen_random_uuid(),
      :'CLIENT_ID',
      contact_uuid,
      'shift_assigned',
      '📅 New Shift Assigned',
      'A new shift has been scheduled for tomorrow.',
      NULL,
      'shift',
      'normal',
      'in_app',
      NOW() - INTERVAL '3 hours'
    ),
    
    -- Payment due
    (
      gen_random_uuid(),
      :'CLIENT_ID',
      contact_uuid,
      'payment_reminder',
      '💳 Payment Due Soon',
      'Invoice #1234 is due in 3 days. Amount: £1,250.00',
      NULL,
      'invoice',
      'high',
      'in_app',
      NOW() - INTERVAL '1 day'
    ),
    
    -- Compliance warning
    (
      gen_random_uuid(),
      :'CLIENT_ID',
      contact_uuid,
      'compliance_warning',
      '⚠️ Compliance Alert',
      'Staff certification expires in 7 days. Please renew.',
      NULL,
      'compliance',
      'urgent',
      'in_app',
      NOW() - INTERVAL '2 days'
    );
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify seed data was created successfully:

-- Count client contacts by role
SELECT 
  'Client Contacts by Role' as check_name,
  role,
  COUNT(*) as count
FROM client_contacts
WHERE client_id = :'CLIENT_ID'
GROUP BY role
ORDER BY role;

-- Count shifts by status
SELECT 
  'Shifts by Status' as check_name,
  status,
  COUNT(*) as count
FROM shifts
WHERE client_id = :'CLIENT_ID'
GROUP BY status
ORDER BY status;

-- Count ratings
SELECT 
  'Staff Ratings' as check_name,
  staff_id,
  COUNT(*) as rating_count,
  ROUND(AVG(overall_rating), 2) as avg_rating
FROM client_ratings
WHERE client_id = :'CLIENT_ID'
GROUP BY staff_id;

-- Count notifications
SELECT 
  'Notifications by Type' as check_name,
  type,
  COUNT(*) as count
FROM client_notifications
WHERE client_id = :'CLIENT_ID'
GROUP BY type
ORDER BY type;

-- ============================================================================
-- CLEANUP (if needed)
-- ============================================================================
-- Uncomment to delete all test data:

/*
DELETE FROM client_notifications WHERE client_id = :'CLIENT_ID';
DELETE FROM client_ratings WHERE client_id = :'CLIENT_ID';
DELETE FROM shifts WHERE client_id = :'CLIENT_ID' AND client_created = true;
DELETE FROM client_contacts WHERE client_id = :'CLIENT_ID' AND created_by = 'test_seed_script';
DELETE FROM profiles WHERE client_id = :'CLIENT_ID' AND email LIKE '%+%@gmail.com';
*/

-- ============================================================================
-- END OF SEED SCRIPT
-- ============================================================================
