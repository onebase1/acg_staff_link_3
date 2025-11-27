-- Function to securely link a user to their staff record based on email
-- This bypasses RLS to allow a new user to "claim" their staff record
CREATE OR REPLACE FUNCTION link_user_to_staff_by_email()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
  v_user_id uuid;
  v_staff_record staff;
BEGIN
  -- Get current user details
  v_user_id := auth.uid();
  v_user_email := auth.email();

  IF v_user_id IS NULL OR v_user_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find matching staff record
  -- Case-insensitive email match
  SELECT * INTO v_staff_record
  FROM staff
  WHERE lower(email) = lower(v_user_email)
  LIMIT 1;

  IF v_staff_record IS NULL THEN
    RETURN NULL;
  END IF;

  -- If already linked to this user, return it
  IF v_staff_record.user_id = v_user_id THEN
    RETURN to_jsonb(v_staff_record);
  END IF;

  -- If linked to someone else, return error (or null)
  IF v_staff_record.user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Staff record already linked to another user';
  END IF;

  -- Link the record
  UPDATE staff
  SET 
    user_id = v_user_id,
    status = 'active', -- Ensure they are active once linked
    updated_date = now()
  WHERE id = v_staff_record.id;

  -- Fetch updated record
  SELECT * INTO v_staff_record
  FROM staff
  WHERE id = v_staff_record.id;

  RETURN to_jsonb(v_staff_record);
END;
$$;
