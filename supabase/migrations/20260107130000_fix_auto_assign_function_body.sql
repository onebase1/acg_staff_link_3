CREATE OR REPLACE FUNCTION public.auto_assign_shift(p_shift_id uuid, p_agency_id uuid, exclude_staff_ids uuid[] DEFAULT ARRAY[]::uuid[])
 RETURNS TABLE(new_status text, assigned_staff_id uuid, log_message text)
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
    v_client_name TEXT;
    v_client_address TEXT;

    -- Urgency Ladder Variables
    v_hours_until_start FLOAT;
    v_confirmation_window_hours INTEGER;
    v_deadline_dt TIMESTAMP;
    
    v_calculated_exclusions UUID[];
BEGIN
    -- 1. Get Shift Data
    SELECT * INTO target_shift FROM public.shifts WHERE id = p_shift_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'error'::text, NULL::uuid, 'Invalid shift'::text;
        RETURN;
    END IF;

    -- 2. Check Agency Settings (FIX: Query public.agencies, NOT public.agency_settings)
    SELECT settings, name INTO agency_record FROM public.agencies WHERE id = p_agency_id;
    
    -- Handle case where agency is not found
    IF agency_record IS NULL THEN
         RETURN QUERY SELECT 'error'::text, NULL::uuid, 'Agency not found'::text;
         RETURN;
    END IF;

    agency_settings := agency_record.settings->'automation_settings';
    
    is_enabled := COALESCE((agency_settings->>'auto_assign_enabled')::boolean, FALSE);
    v_auto_confirm := COALESCE((agency_settings->>'auto_confirm_mode')::boolean, FALSE);

    IF NOT is_enabled THEN
        RETURN QUERY SELECT 'disabled'::text, NULL::uuid, 'Auto-assignment disabled'::text;
        RETURN;
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

    -- SMART EXCLUSION: Extract everyone who has declined
    SELECT ARRAY_AGG(DISTINCT (elem->>'staff_id')::uuid) INTO v_calculated_exclusions
    FROM jsonb_array_elements(COALESCE(target_shift.shift_journey_log, '[]'::jsonb)) AS elem
    WHERE elem->>'method' = 'staff_self_decline' AND elem->>'staff_id' IS NOT NULL;

    v_calculated_exclusions := COALESCE(v_calculated_exclusions, '{}'::uuid[]) || exclude_staff_ids;

    -- 4. SEARCH TIERS (Preferred > History > Qualified)
    
    -- TIER 1: Preferred Staff
    SELECT cps.staff_id, 'preferred' 
    INTO found_staff_id, match_reason
    FROM public.client_preferred_staff cps
    JOIN public.staff s ON cps.staff_id = s.id
    WHERE cps.client_id = target_shift.client_id
      AND s.auto_assign_allowed = TRUE
      AND s.status = 'active'
      AND (
          (jsonb_typeof(s.availability->day_name) = 'boolean' AND (s.availability->>day_name)::boolean = TRUE)
          OR
          (jsonb_typeof(s.availability->day_name) = 'array' AND (s.availability->day_name) @> jsonb_build_array(shift_band))
          OR
          (jsonb_typeof(s.availability->day_name) = 'array' AND (s.availability->day_name) @> jsonb_build_array('both'))
          OR
          (jsonb_typeof(s.availability->day_name) = 'string' AND (s.availability->>day_name) IN (shift_band, 'both', 'true'))
      )
      AND s.id NOT IN (SELECT unnest(v_calculated_exclusions))
      AND s.id NOT IN (
          SELECT assigned_staff_id FROM public.shifts 
          WHERE date = target_shift.date 
          AND status IN ('confirmed', 'assigned')
          AND assigned_staff_id IS NOT NULL
      )
    ORDER BY cps.created_at ASC
    LIMIT 1;

    -- TIER 2: Historical Staff
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
          AND (
              (jsonb_typeof(s.availability->day_name) = 'boolean' AND (s.availability->>day_name)::boolean = TRUE)
              OR
              (jsonb_typeof(s.availability->day_name) = 'array' AND (s.availability->day_name) @> jsonb_build_array(shift_band))
              OR
              (jsonb_typeof(s.availability->day_name) = 'array' AND (s.availability->day_name) @> jsonb_build_array('both'))
              OR
              (jsonb_typeof(s.availability->day_name) = 'string' AND (s.availability->>day_name) IN (shift_band, 'both', 'true'))
          )
          AND s.id NOT IN (SELECT unnest(v_calculated_exclusions))
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
          AND (
              (jsonb_typeof(s.availability->day_name) = 'boolean' AND (s.availability->>day_name)::boolean = TRUE)
              OR
              (jsonb_typeof(s.availability->day_name) = 'array' AND (s.availability->day_name) @> jsonb_build_array(shift_band))
              OR
              (jsonb_typeof(s.availability->day_name) = 'array' AND (s.availability->day_name) @> jsonb_build_array('both'))
              OR
              (jsonb_typeof(s.availability->day_name) = 'string' AND (s.availability->>day_name) IN (shift_band, 'both', 'true'))
          )
          AND s.id NOT IN (SELECT unnest(v_calculated_exclusions))
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
            status = 'open',
            assigned_staff_id = NULL,
            shift_journey_log = COALESCE(shift_journey_log, '[]'::jsonb) || jsonb_build_object(
                'state', 'marketplace',
                'timestamp', now(),
                'method', 'auto_assignment_system',
                'notes', 'No available qualified staff found for auto-assignment'
            )
        WHERE id = target_shift.id;
        
        RETURN QUERY SELECT 'marketplace'::text, NULL::uuid, 'No qualified staff found'::text;
        RETURN;
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
    WHERE id = target_shift.id;

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
    v_client_name := client_record.name;
    -- Fallback address
    IF target_shift.location IS NULL OR target_shift.location = '' THEN
        v_client_address := COALESCE(client_record.address_line_1, '') || ', ' || COALESCE(client_record.postcode, '');
    ELSE
        v_client_address := target_shift.location;
    END IF;

    INSERT INTO public.notification_queue (
        agency_id, recipient_email, recipient_type, recipient_first_name, 
        notification_type, pending_items, item_count, status, scheduled_send_at, message
    ) VALUES (
        target_shift.agency_id, v_recipient_email, 'staff', v_recipient_f_name, 
        'shift_assignment', 
        jsonb_build_array(jsonb_build_object(
            'shift_id', target_shift.id, 
            'client_name', v_client_name, 
            'date', target_shift.date,
            'start_time', target_shift.start_time,
            'end_time', target_shift.end_time,
            'status', v_target_status,
            'location', v_client_address,
            'role', target_shift.role_required,
            'pay_rate', target_shift.pay_rate,
            'urgency', target_shift.urgency
        )), 1, 'pending', now(), 
        CASE WHEN v_target_status = 'confirmed' THEN 'Shift confirmed: ' ELSE 'New shift assignment: ' END || v_client_name
    );

    RETURN QUERY SELECT v_target_status, found_staff_id, 'Successfully assigned to ' || v_recipient_f_name;
END;
$function$;
