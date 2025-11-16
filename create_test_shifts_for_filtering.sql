-- ✅ CREATE TEST SHIFTS FOR MARKETPLACE FILTERING TESTS
-- 
-- Purpose: Create shifts with different roles to test filtering logic
-- Test User: Chadaira Basera (care_worker role)
-- 
-- Expected Behavior:
-- 1. Chadaira should ONLY see care_worker shifts (unless marketplace_visible=true)
-- 2. Should NOT see: nurse, senior_care_worker, healthcare_assistant, etc.
-- 3. Should NOT see shifts on days she's already working

-- Get Chadaira's agency_id and staff_id
DO $$
DECLARE
  v_agency_id UUID;
  v_staff_id UUID;
  v_client_id UUID;
BEGIN
  -- Get Chadaira's details
  SELECT agency_id, id INTO v_agency_id, v_staff_id
  FROM staff
  WHERE email = 'g.basera5+chadaira@gmail.com';
  
  -- Get a test client from same agency
  SELECT id INTO v_client_id
  FROM clients
  WHERE agency_id = v_agency_id
  LIMIT 1;
  
  RAISE NOTICE 'Agency ID: %', v_agency_id;
  RAISE NOTICE 'Staff ID: %', v_staff_id;
  RAISE NOTICE 'Client ID: %', v_client_id;
  
  -- Delete existing test shifts
  DELETE FROM shifts 
  WHERE description LIKE '%FILTERING TEST%';
  
  -- ========================================
  -- TEST SHIFT 1: care_worker (SHOULD SEE)
  -- ========================================
  INSERT INTO shifts (
    agency_id,
    client_id,
    date,
    start_time,
    end_time,
    role_required,
    status,
    assigned_staff_id,
    marketplace_visible,
    pay_rate,
    charge_rate,
    urgency,
    description
  ) VALUES (
    v_agency_id,
    v_client_id,
    CURRENT_DATE + INTERVAL '3 days',
    '09:00',
    '17:00',
    'care_worker',
    'open',
    NULL,
    false, -- Not marketplace visible, but matches role
    15.00,
    22.50,
    'normal',
    'FILTERING TEST - Care Worker Shift (SHOULD BE VISIBLE)'
  );
  
  -- ========================================
  -- TEST SHIFT 2: senior_care_worker (SHOULD NOT SEE)
  -- ========================================
  INSERT INTO shifts (
    agency_id,
    client_id,
    date,
    start_time,
    end_time,
    role_required,
    status,
    assigned_staff_id,
    marketplace_visible,
    pay_rate,
    charge_rate,
    urgency,
    description
  ) VALUES (
    v_agency_id,
    v_client_id,
    CURRENT_DATE + INTERVAL '4 days',
    '09:00',
    '17:00',
    'senior_care_worker',
    'open',
    NULL,
    false, -- Not marketplace visible AND wrong role
    18.00,
    27.00,
    'normal',
    'FILTERING TEST - Senior Care Worker (SHOULD NOT BE VISIBLE)'
  );
  
  -- ========================================
  -- TEST SHIFT 3: nurse (SHOULD NOT SEE)
  -- ========================================
  INSERT INTO shifts (
    agency_id,
    client_id,
    date,
    start_time,
    end_time,
    role_required,
    status,
    assigned_staff_id,
    marketplace_visible,
    pay_rate,
    charge_rate,
    urgency,
    description
  ) VALUES (
    v_agency_id,
    v_client_id,
    CURRENT_DATE + INTERVAL '5 days',
    '09:00',
    '17:00',
    'nurse',
    'open',
    NULL,
    false,
    25.00,
    37.50,
    'normal',
    'FILTERING TEST - Nurse Shift (SHOULD NOT BE VISIBLE)'
  );
  
  -- ========================================
  -- TEST SHIFT 4: healthcare_assistant with marketplace_visible=true (SHOULD SEE)
  -- ========================================
  INSERT INTO shifts (
    agency_id,
    client_id,
    date,
    start_time,
    end_time,
    role_required,
    status,
    assigned_staff_id,
    marketplace_visible,
    pay_rate,
    charge_rate,
    urgency,
    description
  ) VALUES (
    v_agency_id,
    v_client_id,
    CURRENT_DATE + INTERVAL '6 days',
    '09:00',
    '17:00',
    'healthcare_assistant',
    'open',
    NULL,
    true, -- Marketplace visible = admin approved for all roles
    16.00,
    24.00,
    'urgent',
    'FILTERING TEST - HCA Marketplace Visible (SHOULD BE VISIBLE - Admin Approved)'
  );
  
  RAISE NOTICE 'Test shifts created successfully!';
END $$;

-- Verify test shifts
SELECT 
  date,
  role_required,
  marketplace_visible,
  description
FROM shifts
WHERE description LIKE '%FILTERING TEST%'
ORDER BY date;

