-- Migration: Add get_weekly_summary_data RPC function
-- Purpose: Fetches shift and timesheet data for weekly client summaries
-- Returns: Aggregated data with actual hours from timesheets

CREATE OR REPLACE FUNCTION get_weekly_summary_data(
    p_client_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_include_all_statuses BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    shift_id UUID,
    date DATE,
    role TEXT,
    shift_type TEXT,
    staff_id UUID,
    staff_name TEXT,
    duration_hours NUMERIC,
    actual_hours NUMERIC,
    timesheet_status TEXT,
    shift_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id AS shift_id,
        s.date::DATE AS date,
        s.role,
        CASE 
            WHEN s.shift_type = 'day' THEN 'Day'
            WHEN s.shift_type = 'night' THEN 'Night'
            ELSE s.shift_type
        END AS shift_type,
        s.assigned_staff_id AS staff_id,
        COALESCE(u.full_name, 'Unassigned') AS staff_name,
        s.duration_hours,
        -- Calculate actual hours from timesheets
        CASE 
            WHEN t.actual_start_time IS NOT NULL AND t.actual_end_time IS NOT NULL THEN
                EXTRACT(EPOCH FROM (
                    (s.date || ' ' || t.actual_end_time)::TIMESTAMP - 
                    (s.date || ' ' || t.actual_start_time)::TIMESTAMP
                )) / 3600
            ELSE NULL
        END AS actual_hours,
        t.status AS timesheet_status,
        s.status::TEXT AS shift_status
    FROM shifts s
    LEFT JOIN users u ON s.assigned_staff_id = u.id
    LEFT JOIN timesheets t ON t.shift_id = s.id
    WHERE s.client_id = p_client_id
      AND s.date >= p_start_date
      AND s.date <= p_end_date
      AND (
          p_include_all_statuses = TRUE 
          OR s.status IN ('confirmed', 'in_progress', 'completed', 'awaiting_admin_closure')
      )
    ORDER BY s.date, s.role, s.shift_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION get_weekly_summary_data(UUID, DATE, DATE, BOOLEAN) TO service_role;

COMMENT ON FUNCTION get_weekly_summary_data IS 'Fetches shift and timesheet data for weekly client email summaries. Uses actual hours from timesheets when available, falls back to scheduled hours.';
