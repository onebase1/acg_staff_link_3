-- ============================================================================
-- FIX: Robust Staff Linking on Signup (Orphaned User Fix)
-- ============================================================================
-- Purpose: Fix issues where users are not linked to staff records if:
--          1. Their staff status is already 'active' (e.g. manually set by admin)
--          2. Their email casing differs (e.g. John@example.com vs john@example.com)
--
-- Solution: Update link_staff_on_signup() to:
--          1. Use case-insensitive email matching
--          2. Remove status = 'onboarding' restriction
--          3. Allow linking to any unlinked staff record
--
-- Created: 2026-01-02
-- ============================================================================

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
  -- CHANGED: Case-insensitive, trimmed, and REMOVED status restriction
  -- We want to link ANY staff record that matches the email and hasn't been claimed yet.
  -- CHANGED: Case-insensitive, trimmed, and REMOVED status restriction
  -- MULTI-TENANT FIX: Added deterministic ordering to handle cases where 
  -- the same email exists in multiple agencies.
  -- Priority:
  -- 1. Most recently invited (active engagement)
  -- 2. Onboarding status (likely the intended target for a new signup)
  -- 3. Most recently created (newest record)
  SELECT id, agency_id, first_name, last_name, role, status
  INTO v_staff_record
  FROM staff
  WHERE lower(email) = lower(trim(NEW.email))
    AND user_id IS NULL
  ORDER BY 
    last_invited_at DESC NULLS LAST,
    (status = 'onboarding') DESC,
    created_date DESC
  LIMIT 1;

  IF FOUND THEN
    -- Staff record exists, link it
    UPDATE staff
    SET user_id = NEW.id,
        -- REMOVED: status = 'active'
        -- REASON: We want to keep them in 'onboarding' (or current status)
        -- until they complete the Profile Setup form.
        -- ProfileSetup.jsx handles the transition to 'active'.
        updated_date = NOW()
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
      created_at,
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
    -- Check if email is agency contact (also case insensitive)
    SELECT id, name
    INTO v_agency_record
    FROM agencies
    WHERE lower(contact_email) = lower(trim(NEW.email))
    LIMIT 1;

    IF FOUND THEN
      -- ✅ SECURITY FIX: Force agency admin type
      INSERT INTO profiles (
        id,
        email,
        user_type,
        agency_id,
        created_at,
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
        created_at,
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
      WHERE lower(email) = 'g.basera@yahoo.com'
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

-- Not necessary to recreate TRIGGER as the function definition is replaced,
-- but good to ensure everything is clean.
-- The trigger calls 'link_staff_on_signup', which we just replaced.

-- Drop existing index manually if needed, but we can add a better index
DROP INDEX IF EXISTS idx_staff_email_unlinked;

-- Create a case-insensitive unique index for unlinked staff to permit fast lookup (functional index)
CREATE INDEX IF NOT EXISTS idx_staff_email_unlinked_ci
  ON staff(lower(email))
  WHERE user_id IS NULL;

-- Log the update
DO $$
BEGIN
  RAISE NOTICE '✅ Staff signup linking logic updated: Case-insensitive & status-agnostic';
END $$;
