-- ============================================================================
-- MODULE 35: Client Linking & Magic Link Auditing
-- ============================================================================

-- 1. Create Audit Log Table for Magic Links
CREATE TABLE IF NOT EXISTS public.magic_link_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID, -- Optional foreign key, logic-level link
    action TEXT NOT NULL, -- e.g. 'generated', 'authenticated_success', 'authenticated_failure'
    email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.magic_link_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view logs
CREATE POLICY "Admins can view audit logs" ON public.magic_link_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.user_type IN ('agency_admin', 'super_admin')
        )
    );

-- Policy: Service role can insert (for Edge Functions)
CREATE POLICY "Service role can insert audit logs" ON public.magic_link_audit_logs
    FOR INSERT
    WITH CHECK (true); -- Ideally restrict to service role, but typically explicit GRANT is used. RLS applies to all. 
    -- Actually for service_role, it bypasses RLS. So this policy is for potential authenticated users?
    -- Let's just allow INSERT for authenticated users to be safe if we call it from client? No, edge function uses service role.
    -- We can skip INSERT policy if we trust service role bypass.

-- Grant permissions
GRANT SELECT, INSERT ON public.magic_link_audit_logs TO service_role;
GRANT SELECT ON public.magic_link_audit_logs TO authenticated;


-- 2. Update `link_staff_on_signup` to handle Client Contacts
CREATE OR REPLACE FUNCTION link_staff_on_signup()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_record RECORD;
  v_client_contact_record RECORD; -- NEW
  v_agency_record RECORD;
  v_super_admin_agency_id UUID;
  v_workflow_title TEXT;
BEGIN
  -- Bypass RLS for this function
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  RAISE LOG 'link_staff_on_signup triggered for user: %', NEW.email;

  -- --------------------------------------------------------------------------
  -- A. CHECK STAFF
  -- --------------------------------------------------------------------------
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
        updated_date = NOW()
    WHERE id = v_staff_record.id;

    RAISE LOG 'Staff record linked: staff_id=%, user_id=%, agency_id=%',
      v_staff_record.id, NEW.id, v_staff_record.agency_id;

    -- Update Profile
    INSERT INTO profiles (
      id, email, user_type, agency_id, full_name, created_at, updated_at
    )
    VALUES (
      NEW.id, NEW.email, 'staff_member', v_staff_record.agency_id,
      v_staff_record.first_name || ' ' || v_staff_record.last_name,
      NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET user_type = 'staff_member',
        agency_id = v_staff_record.agency_id,
        client_id = NULL,
        full_name = COALESCE(NULLIF(profiles.full_name, ''), v_staff_record.first_name || ' ' || v_staff_record.last_name),
        updated_at = NOW();

    RAISE LOG 'Profile created/updated for staff user: %', NEW.id;

  ELSE
    -- --------------------------------------------------------------------------
    -- B. NEW: CHECK CLIENT CONTACTS
    -- --------------------------------------------------------------------------
    SELECT cc.id, cc.client_id, cc.role, cc.first_name, cc.last_name, c.agency_id
    INTO v_client_contact_record
    FROM client_contacts cc
    JOIN clients c ON c.id = cc.client_id
    WHERE lower(cc.email) = lower(trim(NEW.email))
      AND cc.profile_id IS NULL
    LIMIT 1;

    IF FOUND THEN
      -- Link Contact
      UPDATE client_contacts
      SET profile_id = NEW.id,
          updated_at = NOW()
      WHERE id = v_client_contact_record.id;

      RAISE LOG 'Client contact linked: contact_id=%, user_id=%, client_id=%',
         v_client_contact_record.id, NEW.id, v_client_contact_record.client_id;
      
      -- Update Profile
      INSERT INTO profiles (
        id, email, user_type, agency_id, full_name, created_at, updated_at
      )
      VALUES (
        NEW.id, NEW.email, 'client_user', v_client_contact_record.agency_id,
        v_client_contact_record.first_name || ' ' || v_client_contact_record.last_name,
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET user_type = 'client_user',
          agency_id = v_client_contact_record.agency_id,
          client_id = v_client_contact_record.client_id, -- Link to specific client
          -- role = v_client_contact_record.role, -- Profile doesn't have 'role' col? Typically handled in metadata or restricted pages.
          -- Wait, profiles might not have 'role' column? existing function used 'role' in previous version?
          -- Checking previous file... it did NOT update 'role' on profiles, only user_type.
          -- Ah, v_staff_record.role was selected but not used in INSERT.
          -- Wait, line 68-85 of previous file ... INSERT ... VALUES ... no 'role' column.
          -- Line 87 ON CONFLICT DO UPDATE SET user_type='staff_member'... no role.
          -- So profiles table likely doesn't have role. It's on staff/client_contact table.
          full_name = COALESCE(NULLIF(profiles.full_name, ''), v_client_contact_record.first_name || ' ' || v_client_contact_record.last_name),
          updated_at = NOW();
      
      -- Also update app_metadata for RLS
      UPDATE auth.users
      SET raw_app_meta_data = 
        coalesce(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
          'agency_id', v_client_contact_record.agency_id, 
          'client_id', v_client_contact_record.client_id,
          'role', v_client_contact_record.role,
          'user_type', 'client_user'
        )
      WHERE id = NEW.id;

      RAISE LOG 'Profile & Metadata updated for client user: %', NEW.id;

    ELSE
       -- --------------------------------------------------------------------------
       -- C. CHECK AGENCY ADMIN (Existing)
       -- --------------------------------------------------------------------------
       SELECT id, name
       INTO v_agency_record
       FROM agencies
       WHERE lower(contact_email) = lower(trim(NEW.email))
       LIMIT 1;

       IF FOUND THEN
          INSERT INTO profiles (
            id, email, user_type, agency_id, created_at, updated_at
          )
          VALUES (
            NEW.id, NEW.email, 'agency_admin', v_agency_record.id, NOW(), NOW()
          )
          ON CONFLICT (id) DO UPDATE
          SET user_type = 'agency_admin',
              agency_id = v_agency_record.id,
              client_id = NULL,
              updated_at = NOW();

          RAISE LOG 'Agency admin profile created: user_id=%, agency_id=%',
            NEW.id, v_agency_record.id;
       ELSE
          -- --------------------------------------------------------------------------
          -- D. UNLINKED -> PENDING
          -- --------------------------------------------------------------------------
          INSERT INTO profiles (
            id, email, user_type, created_at, updated_at
          )
          VALUES (
            NEW.id, NEW.email, 'pending', NOW(), NOW()
          )
          ON CONFLICT (id) DO UPDATE
          SET user_type = 'pending',
              agency_id = NULL,
              client_id = NULL,
              updated_at = NOW();

          RAISE LOG 'Pending approval profile for: %', NEW.email;
          
          -- Workflow creation logic (Super Admin Notification)
          SELECT agency_id INTO v_super_admin_agency_id
          FROM profiles
          WHERE lower(email) = 'g.basera@yahoo.com'
          LIMIT 1;

          IF v_super_admin_agency_id IS NOT NULL THEN
             v_workflow_title := 'New User Signup: ' || COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
             INSERT INTO admin_workflows (
               agency_id, name, type, priority, status, title, description, related_entity, auto_created, created_by, created_date, updated_date
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
               '**Status:** Pending approval' || E'\n' ||
               '**User Type:** pending',
               jsonb_build_object('entity_type', 'profile', 'entity_id', NEW.id, 'email', NEW.email),
               true, 'system', NOW(), NOW()
             );
          END IF;
       END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
