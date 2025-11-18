-- Fix: Link g.basera@yahoo.com profile to agency
-- This will allow RLS policies to work correctly

-- Step 1: Find or create agency for g.basera@yahoo.com
DO $$
DECLARE
  v_agency_id TEXT;
  v_profile_id UUID;
BEGIN
  -- Get profile ID
  SELECT id INTO v_profile_id
  FROM auth.users
  WHERE email = 'g.basera@yahoo.com';

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'User g.basera@yahoo.com not found in auth.users';
  END IF;

  -- Check if agency exists
  SELECT id INTO v_agency_id
  FROM agencies
  WHERE contact_email = 'g.basera@yahoo.com';

  -- If no agency exists, create one
  IF v_agency_id IS NULL THEN
    INSERT INTO agencies (
      id,
      name,
      contact_email,
      contact_phone,
      address,
      status,
      created_date
    )
    VALUES (
      'acg-' || gen_random_uuid()::text,
      'ACG StaffLink Agency',
      'g.basera@yahoo.com',
      '+44 20 1234 5678',
      '123 Main Street, London, UK',
      'active',
      NOW()
    )
    RETURNING id INTO v_agency_id;

    RAISE NOTICE 'Created new agency: %', v_agency_id;
  ELSE
    RAISE NOTICE 'Found existing agency: %', v_agency_id;
  END IF;

  -- Update profile with agency_id and user_type
  UPDATE profiles
  SET 
    agency_id = v_agency_id,
    user_type = 'super_admin',
    client_id = NULL,
    updated_at = NOW()
  WHERE id = v_profile_id;

  RAISE NOTICE 'Updated profile % with agency_id %', v_profile_id, v_agency_id;

  -- Verify the update
  RAISE NOTICE 'Profile updated successfully';
END $$;

-- Verify the fix
SELECT 
  p.id,
  p.email,
  p.user_type,
  p.agency_id,
  a.name as agency_name,
  p.client_id
FROM profiles p
LEFT JOIN agencies a ON p.agency_id = a.id
WHERE p.email = 'g.basera@yahoo.com';

