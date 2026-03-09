-- 1. Create a robust validation function that handles midnight crossings and 11-hour rest rule
CREATE OR REPLACE FUNCTION check_staff_shift_conflict(
    p_staff_id UUID,
    p_shift_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
) RETURNS TEXT AS $$
DECLARE
    new_start_ts TIMESTAMP;
    new_end_ts TIMESTAMP;
    conflict_shift_id UUID;
    conflict_details TEXT;
BEGIN
    -- Construct full timestamps for the new shift (handling midnight crossing)
    new_start_ts := p_date + p_start_time;
    IF p_end_time < p_start_time THEN
        new_end_ts := p_date + interval '1 day' + p_end_time;
    ELSE
        new_end_ts := p_date + p_end_time;
    END IF;

    -- Check for conflicts with existing shifts
    -- A conflict exists if another shift's [start - 11h, end + 11h] window overlaps with this shift
    SELECT 
        id, 
        'Conflict with shift on ' || date || ' (' || start_time || '-' || end_time || '). Must have 11 hours rest.'
    INTO conflict_shift_id, conflict_details
    FROM public.shifts
    WHERE assigned_staff_id = p_staff_id
    AND id != COALESCE(p_shift_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND status IN ('assigned', 'confirmed', 'in_progress')
    AND (
        (new_start_ts < (CASE WHEN end_time::TIME < start_time::TIME THEN date + interval '1 day' + end_time::TIME ELSE date + end_time::TIME END) + interval '11 hours')
        AND
        (new_end_ts > (date + start_time::TIME) - interval '11 hours')
    )
    LIMIT 1;

    IF conflict_shift_id IS NOT NULL THEN
        RETURN conflict_details;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Update the trigger function to use the new robust check
CREATE OR REPLACE FUNCTION check_shift_overlap() 
RETURNS TRIGGER AS $$
DECLARE
    conflict_msg TEXT;
BEGIN
    -- If no staff is assigned, no conflict
    IF NEW.assigned_staff_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Call the centralized validation function
    -- Explicitly cast text to time for the parameters
    conflict_msg := check_staff_shift_conflict(
        NEW.assigned_staff_id,
        NEW.id,
        NEW.date,
        NEW.start_time::TIME,
        NEW.end_time::TIME
    );

    IF conflict_msg IS NOT NULL THEN
        RAISE EXCEPTION '%', conflict_msg;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Update auto_assign_shift to use the centralized validation
-- (Note: We need to inject the check into the Tier 1, 2, and 3 search queries)
-- This is handled by modifying the prosrc which we'll do in a separate step or by re-defining the whole function.
-- For now, the trigger alone will block invalid assignments from ANY engine, 
-- but it's better if the engine knows to skip them.
