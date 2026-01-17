CREATE OR REPLACE FUNCTION create_bulk_shifts(shifts_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_shifts jsonb;
BEGIN
  WITH inserted AS (
    INSERT INTO shifts (
      client_id, agency_id, date, start_time, end_time, 
      role_required, shift_type, status, urgency, notes, 
      work_location_within_site, location, pay_rate, charge_rate, 
      created_by, created_date, on_duty_contact
    )
    SELECT
      (x->>'client_id')::uuid,
      (x->>'agency_id')::uuid,
      (x->>'date')::date,
      (x->>'start_time')::time,
      (x->>'end_time')::time,
      (x->>'role_required')::text,
      (x->>'shift_type')::text,
      (x->>'status')::text,
      (x->>'urgency')::text,
      (x->>'notes')::text,
      (x->>'work_location_within_site')::text,
      (x->>'location')::text,
      (x->>'pay_rate')::numeric,
      (x->>'charge_rate')::numeric,
      (x->>'created_by')::text,
      COALESCE((x->>'created_date')::timestamptz, NOW()),
      (x->'on_duty_contact')::jsonb
    FROM jsonb_array_elements(shifts_data) AS x
    RETURNING *
  )
  SELECT jsonb_agg(inserted) INTO inserted_shifts FROM inserted;

  RETURN inserted_shifts;
END;
$$;
