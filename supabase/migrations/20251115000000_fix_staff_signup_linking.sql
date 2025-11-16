-- ============================================================================
-- FIX: Automatic Staff Record Linking on Signup
-- ============================================================================
-- Purpose: Automatically link staff records when users sign up
-- Issue: Client-side state failures cause staff.user_id to remain null
-- Solution: Server-side trigger ensures linking happens regardless
--
-- Created: 2025-11-15
-- Reference: SIGNUP_PROCESS_ANALYSIS.md
-- ============================================================================

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS link_staff_on_signup();

-- Create trigger function to link staff records
CREATE OR REPLACE FUNCTION link_staff_on_signup()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_record RECORD;
  v_agency_record RECORD;
  v_super_admin_agency_id UUID;
  v_workflow_title TEXT;
BEGIN
  -- Bypass RLS for this function
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  RAISE LOG 'link_staff_on_signup triggered for user: %', NEW.email;

  -- Check if new auth user's email matches any staff record
  SELECT id, agency_id, first_name, last_name, role, status
  INTO v_staff_record
  FROM staff
  WHERE email = NEW.email
    AND user_id IS NULL
    AND status = 'onboarding'
  LIMIT 1;

  IF FOUND THEN
    -- Staff record exists, link it
    UPDATE staff
    SET user_id = NEW.id,
        status = 'active',
        updated_date = NOW()  -- Note: updated_date not updated_at
    WHERE id = v_staff_record.id;

    RAISE LOG 'Staff record linked: staff_id=%, user_id=%, agency_id=%',
      v_staff_record.id, NEW.id, v_staff_record.agency_id;

    -- ✅ SECURITY FIX: Force correct profile type (override any client-side values)
    INSERT INTO profiles (
      id,
      email,
      user_type,
      agency_id,
      full_name,
      created_at,  -- Note: created_at not created_date
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      'staff_member',
      v_staff_record.agency_id,
      v_staff_record.first_name || ' ' || v_staff_record.last_name,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET user_type = 'staff_member',  -- ⚠️ Force staff_member (ignore client-side value)
        agency_id = v_staff_record.agency_id,  -- ⚠️ Force correct agency
        client_id = NULL,  -- ⚠️ Clear any client_id
        full_name = COALESCE(NULLIF(profiles.full_name, ''), v_staff_record.first_name || ' ' || v_staff_record.last_name),
        updated_at = NOW();

    RAISE LOG 'Profile created/updated for staff user: %', NEW.id;

  ELSE
    -- Check if email is agency contact
    SELECT id, name
    INTO v_agency_record
    FROM agencies
    WHERE contact_email = NEW.email
    LIMIT 1;

    IF FOUND THEN
      -- ✅ SECURITY FIX: Force agency admin type
      INSERT INTO profiles (
        id,
        email,
        user_type,
        agency_id,
        created_at,  -- Note: created_at not created_date
        updated_at
      )
      VALUES (
        NEW.id,
        NEW.email,
        'agency_admin',
        v_agency_record.id,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET user_type = 'agency_admin',  -- ⚠️ Force agency_admin
          agency_id = v_agency_record.id,  -- ⚠️ Force correct agency
          client_id = NULL,  -- ⚠️ Clear any client_id
          updated_at = NOW();

      RAISE LOG 'Agency admin profile created: user_id=%, agency_id=%',
        NEW.id, v_agency_record.id;

    ELSE
      -- ⚠️ SECURITY CRITICAL: Uninvited user - FORCE pending status
      -- This prevents users from self-assigning admin/staff roles
      INSERT INTO profiles (
        id,
        email,
        user_type,
        created_at,  -- Note: created_at not created_date
        updated_at
      )
      VALUES (
        NEW.id,
        NEW.email,
        'pending',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET user_type = 'pending',  -- ⚠️ FORCE pending (override client-side role selection)
          agency_id = NULL,        -- ⚠️ NO agency access for uninvited users
          client_id = NULL,        -- ⚠️ NO client access for uninvited users
          updated_at = NOW();

      RAISE LOG 'Pending approval profile created (or forced to pending) for: %', NEW.email;

      -- Get super admin's agency_id (g.basera@yahoo.com)
      SELECT agency_id INTO v_super_admin_agency_id
      FROM profiles
      WHERE email = 'g.basera@yahoo.com'
      LIMIT 1;

      -- Create admin workflow for super admin
      IF v_super_admin_agency_id IS NOT NULL THEN
        v_workflow_title := 'New User Signup: ' || COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

        INSERT INTO admin_workflows (
          agency_id,
          name,
          type,
          priority,
          status,
          title,
          description,
          related_entity,
          auto_created,
          created_by,
          created_date,
          updated_date
        ) VALUES (
          v_super_admin_agency_id,
          v_workflow_title,
          'other',
          'medium',
          'pending',
          v_workflow_title,
          '**New User Registration**' || E'\n\n' ||
          '**Email:** ' || NEW.email || E'\n' ||
          '**Name:** ' || COALESCE(NEW.raw_user_meta_data->>'full_name', 'Not provided') || E'\n' ||
          '**Registered:** ' || NOW()::text || E'\n\n' ||
          '**Status:** Pending approval' || E'\n' ||
          '**User Type:** pending' || E'\n\n' ||
          '**Next Steps:**' || E'\n' ||
          '1. Review user details' || E'\n' ||
          '2. Determine appropriate agency and role' || E'\n' ||
          '3. Update profile with agency_id and user_type' || E'\n' ||
          '4. Notify user of approval',
          jsonb_build_object(
            'entity_type', 'profile',
            'entity_id', NEW.id,
            'email', NEW.email
          ),
          true,
          'system',
          NOW(),
          NOW()
        );

        RAISE LOG 'Admin workflow created for super admin agency: %', v_super_admin_agency_id;
      ELSE
        RAISE WARNING 'Super admin profile not found (g.basera@yahoo.com)';
      END IF;

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_staff_on_signup();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_email_unlinked
  ON staff(email)
  WHERE user_id IS NULL AND status = 'onboarding';

-- Add column for invite token (Phase 3 enhancement)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS invite_token TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS invite_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_staff_invite_token
  ON staff(invite_token)
  WHERE invite_token IS NOT NULL;

-- Comment the changes
COMMENT ON FUNCTION link_staff_on_signup IS 'Automatically links staff records and creates profiles when new auth users sign up';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Calls link_staff_on_signup after user creation';
COMMENT ON COLUMN staff.invite_token IS 'One-time use token for secure invitations (Phase 3)';
COMMENT ON COLUMN staff.invite_expires IS 'Token expiry timestamp (Phase 3)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Staff signup linking trigger installed successfully';
  RAISE NOTICE '✅ This will automatically link staff records when users sign up';
  RAISE NOTICE '✅ Resolves client-side state management issues';
END $$;
