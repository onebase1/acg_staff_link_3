-- migration_name: add_staff_auto_assign_allowed_and_enforce_availability
-- description: Adds auto_assign_allowed flag to staff and ensures availability checks are applied to all matching tiers.

-- 1. Add the column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'auto_assign_allowed') THEN
        ALTER TABLE public.staff ADD COLUMN auto_assign_allowed BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 2. Update the auto_assign_shift function
CREATE OR REPLACE FUNCTION public.auto_assign_shift(target_shift_id uuid, exclude_staff_ids uuid[] DEFAULT ARRAY[]::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    target_shift RECORD;
    found_staff_id UUID;
    day_name TEXT;
    shift_band TEXT;
    match_reason TEXT;
    target_role TEXT;
    agency_settings JSONB;
    is_enabled BOOLEAN;
    v_auto_confirm BOOLEAN;
    client_record RECORD;
    agency_record RECORD;
    v_target_status TEXT;
    v_booking_status TEXT;
    
    -- Recipient Details
    v_recipient_email TEXT;
    v_recipient_f_name TEXT;
    v_recipient_l_name TEXT;

    -- Urgency Ladder Variables
    v_hours_until_start FLOAT;
    v_confirmation_window_hours INTEGER;
    v_deadline_dt TIMESTAMP;
BEGIN
    -- 1. Get Shift Data
    SELECT * INTO target_shift FROM public.shifts WHERE id = target_shift_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid shift');
    END IF;

    -- 2. Check Agency Settings
    SELECT settings, name INTO agency_record FROM public.agencies WHERE id = target_shift.agency_id;
    agency_settings := agency_record.settings->'automation_settings';
    
    is_enabled := COALESCE((agency_settings->>'auto_assign_enabled')::boolean, FALSE);
    v_auto_confirm := COALESCE((agency_settings->>'auto_confirm_mode')::boolean, FALSE);

    IF NOT is_enabled THEN
        RETURN jsonb_build_object('success', false, 'error', 'Auto-assignment disabled');
    END IF;

    -- 3. Preparation
    target_role := target_shift.role_required;
    day_name := trim(lower(to_char(target_shift.date, 'day')));
    
    BEGIN
        IF (split_part(target_shift.start_time::text, ':', 1)::int >= 18 OR split_part(target_shift.start_time::text, ':', 1)::int < 6) THEN
            shift_band := 'night';
        ELSE
            shift_band := 'day';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        shift_band := 'day';
    END;

    -- 4. SEARCH TIERS (Preferred > History > Qualified)
    
    -- TIER 1: Preferred Staff (MUST respect availability and allowed flag)
    SELECT cps.staff_id, 'preferred' 
    INTO found_staff_id, match_reason
    FROM public.client_preferred_staff cps
    JOIN public.staff s ON cps.staff_id = s.id
    WHERE cps.client_id = target_shift.client_id
      AND s.auto_assign_allowed = TRUE
      AND s.status = 'active'
      -- Availability Check
      AND (
          (jsonb_typeof(s.availability->day_name) = 'boolean' AND (s.availability->>day_name)::boolean = TRUE)
          OR
          (jsonb_typeof(s.availability->day_name) = 'array' AND (s.availability->day_name) @> jsonb_build_array(shift_band))
          OR
          (jsonb_typeof(s.availability->day_name) = 'array' AND (s.availability->day_name) @> jsonb_build_array('both'))
          OR
          (jsonb_typeof(s.availability->day_name) = 'string' AND (s.availability->>day_name) IN (shift_band, 'both', 'true'))
      )
      AND s.id NOT IN (SELECT unnest(exclude_staff_ids))
      AND s.id NOT IN (
          SELECT assigned_staff_id FROM public.shifts 
          WHERE date = target_shift.date 
          AND status IN ('confirmed', 'assigned')
          AND assigned_staff_id IS NOT NULL
      )
    ORDER BY cps.created_at ASC
    LIMIT 1;

    -- TIER 2: Historical Staff (MUST respect availability and allowed flag)
    IF found_staff_id IS NULL THEN
        SELECT s.id, 'history'
        INTO found_staff_id, match_reason
        FROM public.staff s
        JOIN public.shifts sh ON s.id = sh.assigned_staff_id
        WHERE sh.client_id = target_shift.client_id
          AND sh.role_required = target_role
          AND sh.status IN ('completed', 'verified')
          AND s.auto_assign_allowed = TRUE
          AND s.status = 'active'
          -- Availability Check
          AND (
              (jsonb_typeof(s.availability->day_name) = 'boolean' AND (s.availability->>day_name)::boolean = TRUE)
              OR
              (jsonb_typeof(s.availability->day_name) = 'array' AND (s.availability->day_name) @> jsonb_build_array(shift_band))
              OR
              (jsonb_typeof(s.availability->day_name) = 'array' AND (s.availability->day_name) @> jsonb_build_array('both'))
              OR
              (jsonb_typeof(s.availability->day_name) = 'string' AND (s.availability->>day_name) IN (shift_band, 'both', 'true'))
          )
          AND s.id NOT IN (SELECT unnest(exclude_staff_ids))
          AND s.id NOT IN (
              SELECT assigned_staff_id FROM public.shifts 
              WHERE date = target_shift.date 
              AND status IN ('confirmed', 'assigned')
              AND assigned_staff_id IS NOT NULL
          )
        GROUP BY s.id
        ORDER BY count(sh.id) DESC
        LIMIT 1;
    END IF;

    -- TIER 3: Qualified Pool
    IF found_staff_id IS NULL THEN
        SELECT s.id, 'qualified'
        INTO found_staff_id, match_reason
        FROM public.staff s
        WHERE s.agency_id = target_shift.agency_id
          AND s.role = target_role
          AND s.status = 'active'
          AND s.auto_assign_allowed = TRUE
          -- Availability Check
          AND (
              (jsonb_typeof(s.availability->day_name) = 'boolean' AND (s.availability->>day_name)::boolean = TRUE)
              OR
              (jsonb_typeof(s.availability->day_name) = 'array' AND (s.availability->day_name) @> jsonb_build_array(shift_band))
              OR
              (jsonb_typeof(s.availability->day_name) = 'array' AND (s.availability->day_name) @> jsonb_build_array('both'))
              OR
              (jsonb_typeof(s.availability->day_name) = 'string' AND (s.availability->>day_name) IN (shift_band, 'both', 'true'))
          )
          AND s.id NOT IN (SELECT unnest(exclude_staff_ids))
          AND s.id NOT IN (
              SELECT assigned_staff_id FROM public.shifts 
              WHERE date = target_shift.date 
              AND status IN ('confirmed', 'assigned')
              AND assigned_staff_id IS NOT NULL
          )
        ORDER BY COALESCE(s.reliability_score, 0) DESC, random()
        LIMIT 1;
    END IF;

    -- 5. ASSIGNMENT EXECUTION
    IF found_staff_id IS NULL THEN
        UPDATE public.shifts 
        SET marketplace_visible = TRUE, 
            marketplace_added_at = now(),
            shift_journey_log = COALESCE(shift_journey_log, '[]'::jsonb) || jsonb_build_object(
                'state', 'marketplace',
                'timestamp', now(),
                'method', 'auto_assignment_system',
                'notes', 'No available qualified staff found for auto-assignment'
            )
        WHERE id = target_shift_id;
        
        RETURN jsonb_build_object('success', false, 'error', 'No qualified staff found');
    END IF;

    -- Determine statuses
    IF v_auto_confirm THEN
        v_target_status := 'confirmed';
        v_booking_status := 'confirmed';
    ELSE
        v_target_status := 'assigned';
        v_booking_status := 'pending';
    END IF;

    -- Update Shift
    UPDATE public.shifts 
    SET assigned_staff_id = found_staff_id,
        status = v_target_status,
        updated_date = now(),
        shift_journey_log = COALESCE(shift_journey_log, '[]'::jsonb) || jsonb_build_object(
            'state', v_target_status,
            'timestamp', now(),
            'method', 'auto_assignment_system',
            'match_tier', match_reason,
            'auto_confirm', v_auto_confirm
        )
    WHERE id = target_shift_id;

    -- Create/Update Booking
    INSERT INTO public.bookings (
        shift_id, 
        agency_id, 
        client_id, 
        staff_id, 
        date, 
        status, 
        created_date,
        start_time,
        end_time,
        booking_date
    ) VALUES (
        target_shift.id,
        target_shift.agency_id,
        target_shift.client_id,
        found_staff_id,
        target_shift.date,
        v_booking_status,
        now(),
        LEFT(target_shift.start_time::text, 5),
        LEFT(target_shift.end_time::text, 5),
        now()
    );

    -- 6. NOTIFICATIONS
    SELECT email, first_name, last_name INTO v_recipient_email, v_recipient_f_name, v_recipient_l_name
    FROM public.staff WHERE id = found_staff_id;
    
    SELECT * INTO client_record FROM public.clients WHERE id = target_shift.client_id;
    
    INSERT INTO public.notification_queue (
        agency_id, recipient_email, recipient_type, recipient_first_name, 
        notification_type, pending_items, item_count, status, scheduled_send_at, message
    ) VALUES (
        target_shift.agency_id, v_recipient_email, 'staff', v_recipient_f_name, 
        'shift_assignment', 
        jsonb_build_array(jsonb_build_object(
            'shift_id', target_shift.id, 
            'client_name', client_record.name, 
            'date', target_shift.date,
            'start_time', target_shift.start_time,
            'end_time', target_shift.end_time,
            'status', v_target_status
        )), 1, 'pending', now(), 
        CASE WHEN v_target_status = 'confirmed' THEN 'Shift confirmed: ' ELSE 'New shift assignment: ' END || client_record.name
    );

    RETURN jsonb_build_object(
        'success', true, 
        'staff_id', found_staff_id, 
        'status', v_target_status,
        'mode', CASE WHEN v_auto_confirm THEN 'auto-confirm' ELSE 'auto-assign' END,
        'match_tier', match_reason
    );
END;
$function$;
