-- Migration: Create RPC to link user to client contact by email
-- Date: 2025-12-03
-- Purpose: Fix "Orphaned User" issue where direct signups aren't linked to client profiles

CREATE OR REPLACE FUNCTION link_user_to_client_contact_by_email()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
  v_user_id uuid;
  v_contact_record client_contacts%ROWTYPE;
  v_client_agency_id uuid;
BEGIN
  -- Get current user details
  v_user_id := auth.uid();
  v_user_email := auth.email();

  IF v_user_id IS NULL OR v_user_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find matching client contact record
  -- Case-insensitive email match
  SELECT * INTO v_contact_record
  FROM client_contacts
  WHERE lower(email) = lower(v_user_email)
  LIMIT 1;

  IF v_contact_record IS NULL THEN
    RETURN NULL;
  END IF;

  -- If already linked to this user, return it
  IF v_contact_record.profile_id = v_user_id THEN
    RETURN to_jsonb(v_contact_record);
  END IF;

  -- If linked to someone else, return error (or null)
  -- Note: In some cases, we might want to allow re-linking, but for security, let's block hijacking.
  -- However, the previous migration backfilled profile_id, so we need to check if that profile_id matches the current user.
  -- If the contact has a profile_id but it's NOT the current user, that's a conflict.
  IF v_contact_record.profile_id IS NOT NULL AND v_contact_record.profile_id != v_user_id THEN
     -- Check if the linked profile actually exists in auth.users. If not, maybe it's a stale link?
     -- For now, fail safe.
    RAISE EXCEPTION 'Client contact already linked to another user profile';
  END IF;

  -- Link the record in client_contacts
  UPDATE client_contacts
  SET 
    profile_id = v_user_id,
    is_active = TRUE,
    updated_at = now()
  WHERE id = v_contact_record.id;

  -- Also update the PROFILES table to match
  -- We need to get the agency_id from the client table to populate profile correctly
  SELECT agency_id INTO v_client_agency_id
  FROM clients
  WHERE id = v_contact_record.client_id;

  UPDATE profiles
  SET
    client_id = v_contact_record.client_id,
    user_type = 'client_user',
    role = v_contact_record.role,
    agency_id = v_client_agency_id, -- Populate agency_id so RLS works if needed
    full_name = COALESCE(full_name, v_contact_record.first_name || ' ' || v_contact_record.last_name),
    phone = COALESCE(phone, v_contact_record.phone_number)
  WHERE id = v_user_id;

  -- Fetch updated record
  SELECT * INTO v_contact_record
  FROM client_contacts
  WHERE id = v_contact_record.id;

  RETURN to_jsonb(v_contact_record);
END;
$$;
