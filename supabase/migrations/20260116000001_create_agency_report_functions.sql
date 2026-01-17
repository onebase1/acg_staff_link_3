-- =====================================================
-- AGENCY REPORTING SYSTEM - RPC FUNCTIONS
-- =====================================================
-- Created: 2026-01-16
-- Purpose: Data aggregation functions for daily/weekly agency reports
-- Dependencies: agencies, clients, shifts, staff, timesheets, notification_log
-- =====================================================

-- =====================================================
-- FUNCTION: get_daily_agency_report
-- =====================================================
-- Purpose: Aggregates all data needed for daily agency digest email
-- Returns: JSON object with today's shifts, pending actions, stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_daily_agency_report(
    p_agency_id UUID,
    p_report_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_total_shifts INT;
    v_confirmed_shifts INT;
    v_pending_shifts INT;
    v_open_shifts INT;
    v_notifications_sent INT;
    v_staff_count INT;
    v_active_staff INT;
    v_staff_utilization NUMERIC;
BEGIN
    -- Calculate quick stats
    SELECT
        COUNT(*) FILTER (WHERE s.status IN ('confirmed', 'in_progress', 'completed')),
        COUNT(*) FILTER (WHERE s.status = 'confirmed'),
        COUNT(*) FILTER (WHERE s.status = 'open'),
        COUNT(*)
    INTO v_confirmed_shifts, v_pending_shifts, v_open_shifts, v_total_shifts
    FROM shifts s
    JOIN clients c ON s.client_id = c.id
    WHERE c.agency_id = p_agency_id
    AND s.date = p_report_date;

    -- Calculate notifications sent today for this agency
    SELECT COUNT(*)
    INTO v_notifications_sent
    FROM notification_log
    WHERE agency_id = p_agency_id
    AND DATE(created_at) = p_report_date
    AND status IN ('sent', 'delivered', 'opened', 'clicked');

    -- Calculate staff utilization
    SELECT COUNT(DISTINCT id), COUNT(DISTINCT CASE WHEN id IN (
        SELECT DISTINCT assigned_staff_id
        FROM shifts s
        JOIN clients c ON s.client_id = c.id
        WHERE c.agency_id = p_agency_id
        AND s.date = p_report_date
        AND s.assigned_staff_id IS NOT NULL
    ) THEN id END)
    INTO v_staff_count, v_active_staff
    FROM staff
    WHERE agency_id = p_agency_id
    AND status = 'active';

    v_staff_utilization := CASE
        WHEN v_staff_count > 0 THEN ROUND((v_active_staff::NUMERIC / v_staff_count) * 100, 0)
        ELSE 0
    END;

    -- Build comprehensive JSON result
    SELECT json_build_object(
        'reportDate', p_report_date,
        'agencyId', p_agency_id,
        'stats', json_build_object(
            'totalShifts', v_total_shifts,
            'confirmedShifts', v_confirmed_shifts,
            'pendingShifts', v_pending_shifts,
            'openShifts', v_open_shifts,
            'staffUtilization', v_staff_utilization,
            'notificationsSent', v_notifications_sent
        ),
        'actionItems', json_build_object(
            'criticalAlerts', (
                SELECT json_agg(json_build_object(
                    'type', 'urgent_shift_confirmation',
                    'message', 'Shift needs confirmation (starts in ' ||
                        EXTRACT(HOUR FROM ((s.date::text || ' ' || s.start_time)::timestamp - NOW())) || 'h)',
                    'shiftId', s.id,
                    'clientName', c.name,
                    'startTime', s.start_time
                ))
                FROM shifts s
                JOIN clients c ON s.client_id = c.id
                WHERE c.agency_id = p_agency_id
                AND s.date = p_report_date
                AND s.status = 'confirmed'
                AND s.assigned_staff_id IS NOT NULL
                AND (s.date::text || ' ' || s.start_time)::timestamp BETWEEN NOW() AND NOW() + INTERVAL '3 hours'
                AND NOT COALESCE(s.staff_confirmed_completion, FALSE)
            ),
            'warningAlerts', (
                SELECT json_agg(alert)
                FROM (
                    SELECT DISTINCT alert::jsonb as alert
                    FROM (
                        -- Pending timesheets from yesterday
                        SELECT json_build_object(
                            'type', 'pending_timesheets',
                            'message', COUNT(*) || ' timesheets pending approval from yesterday',
                            'count', COUNT(*)
                        ) as alert
                        FROM timesheets t
                        JOIN shifts s ON t.shift_id = s.id
                        JOIN clients c ON s.client_id = c.id
                        WHERE c.agency_id = p_agency_id
                        AND s.date = p_report_date - INTERVAL '1 day'
                        AND t.status = 'pending'
                        HAVING COUNT(*) > 0

                        UNION ALL

                        -- Compliance documents expiring soon
                        SELECT json_build_object(
                            'type', 'compliance_expiring',
                            'message', COUNT(*) || ' compliance documents expire in 7 days',
                            'count', COUNT(*)
                        )
                        FROM compliance comp
                        JOIN staff st ON comp.staff_id = st.id
                        WHERE st.agency_id = p_agency_id
                        AND comp.expiry_date BETWEEN p_report_date AND p_report_date + INTERVAL '7 days'
                        AND comp.status = 'valid'
                        HAVING COUNT(*) > 0
                    ) alerts_raw
                ) alerts_distinct
            )
        ),
        'clients', (
            SELECT json_agg(
                json_build_object(
                    'id', c.id,
                    'name', c.name,
                    'shifts', (
                        SELECT json_agg(
                            json_build_object(
                                'id', s.id,
                                'date', s.date,
                                'startTime', s.start_time,
                                'endTime', s.end_time,
                                'role', s.role,
                                'shiftType', s.shift_type,
                                'staffId', s.assigned_staff_id,
                                'staffName', CASE
                                    WHEN s.assigned_staff_id IS NOT NULL
                                    THEN st.first_name || ' ' || st.last_name
                                    ELSE 'Unassigned'
                                END,
                                'status', s.status,
                                'confirmedByStaff', COALESCE(s.staff_confirmed_completion, FALSE)
                            )
                            ORDER BY s.start_time
                        )
                        FROM shifts s
                        LEFT JOIN staff st ON s.assigned_staff_id = st.id
                        WHERE s.client_id = c.id
                        AND s.date = p_report_date
                    )
                )
            )
            FROM clients c
            WHERE c.agency_id = p_agency_id
            AND EXISTS (
                SELECT 1 FROM shifts s
                WHERE s.client_id = c.id
                AND s.date = p_report_date
            )
        ),
        'pendingTimesheets', (
            SELECT json_agg(
                json_build_object(
                    'id', t.id,
                    'shiftId', s.id,
                    'clientId', c.id,
                    'clientName', c.name,
                    'staffId', st.id,
                    'staffName', st.first_name || ' ' || st.last_name,
                    'shiftDate', s.date,
                    'shiftTime', s.start_time || '-' || s.end_time,
                    'status', t.status,
                    'submittedAt', t.created_at
                )
                ORDER BY s.start_time
            )
            FROM timesheets t
            JOIN shifts s ON t.shift_id = s.id
            JOIN clients c ON s.client_id = c.id
            JOIN staff st ON t.staff_id = st.id
            WHERE c.agency_id = p_agency_id
            AND s.date = p_report_date - INTERVAL '1 day'
            AND t.status = 'pending'
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_daily_agency_report(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_agency_report(UUID, DATE) TO service_role;

COMMENT ON FUNCTION get_daily_agency_report IS
'Aggregates all data for daily agency digest email including shifts, stats, and pending actions';

-- =====================================================
-- FUNCTION: get_weekly_agency_report
-- =====================================================
-- Purpose: Aggregates data for weekly agency summary email
-- Returns: JSON with weekly performance, trends, financials
-- =====================================================

CREATE OR REPLACE FUNCTION get_weekly_agency_report(
    p_agency_id UUID,
    p_week_start_date DATE DEFAULT DATE_TRUNC('week', CURRENT_DATE)::DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_week_end_date DATE;
    v_last_week_start DATE;
    v_last_week_end DATE;
BEGIN
    v_week_end_date := p_week_start_date + INTERVAL '6 days';
    v_last_week_start := p_week_start_date - INTERVAL '7 days';
    v_last_week_end := p_week_start_date - INTERVAL '1 day';

    SELECT json_build_object(
        'weekStartDate', p_week_start_date,
        'weekEndDate', v_week_end_date,
        'agencyId', p_agency_id,

        -- Executive Summary
        'summary', json_build_object(
            'shiftsCompleted', (
                SELECT COUNT(*)
                FROM shifts s
                JOIN clients c ON s.client_id = c.id
                WHERE c.agency_id = p_agency_id
                AND s.date BETWEEN p_week_start_date AND v_week_end_date
                AND s.status = 'completed'
            ),
            'shiftsCompletedLastWeek', (
                SELECT COUNT(*)
                FROM shifts s
                JOIN clients c ON s.client_id = c.id
                WHERE c.agency_id = p_agency_id
                AND s.date BETWEEN v_last_week_start AND v_last_week_end
                AND s.status = 'completed'
            ),
            'totalHours', (
                SELECT EXTRACT(EPOCH FROM COALESCE(SUM(
                    CASE 
                        WHEN t.actual_end_time::time < t.actual_start_time::time 
                        THEN (t.actual_end_time::time - t.actual_start_time::time) + INTERVAL '24 hours' 
                        ELSE (t.actual_end_time::time - t.actual_start_time::time) 
                    END
                ), INTERVAL '0')) / 3600
                FROM timesheets t
                JOIN shifts s ON t.shift_id = s.id
                JOIN clients c ON s.client_id = c.id
                WHERE c.agency_id = p_agency_id
                AND s.date BETWEEN p_week_start_date AND v_week_end_date
                AND t.status IN ('approved', 'pending')
            ),
            'staffUtilization', (
                WITH active_staff AS (
                    SELECT COUNT(DISTINCT id) as total
                    FROM staff
                    WHERE agency_id = p_agency_id
                    AND status = 'active'
                ),
                working_staff AS (
                    SELECT COUNT(DISTINCT s.assigned_staff_id) as working
                    FROM shifts s
                    JOIN clients c ON s.client_id = c.id
                    WHERE c.agency_id = p_agency_id
                    AND s.date BETWEEN p_week_start_date AND v_week_end_date
                    AND s.assigned_staff_id IS NOT NULL
                )
                SELECT ROUND((working::NUMERIC / NULLIF(total, 0)) * 100, 0)
                FROM active_staff, working_staff
            ),
            'fillRate', (
                WITH total_shifts AS (
                    SELECT COUNT(*) as total
                    FROM shifts s
                    JOIN clients c ON s.client_id = c.id
                    WHERE c.agency_id = p_agency_id
                    AND s.date BETWEEN p_week_start_date AND v_week_end_date
                ),
                filled_shifts AS (
                    SELECT COUNT(*) as filled
                    FROM shifts s
                    JOIN clients c ON s.client_id = c.id
                    WHERE c.agency_id = p_agency_id
                    AND s.date BETWEEN p_week_start_date AND v_week_end_date
                    AND s.assigned_staff_id IS NOT NULL
                )
                SELECT ROUND((filled::NUMERIC / NULLIF(total, 0)) * 100, 0)
                FROM total_shifts, filled_shifts
            )
        ),

        -- Financial Overview (placeholder - will be enhanced with actual revenue tracking)
        'financial', json_build_object(
            'totalRevenue', (
                SELECT COALESCE(SUM(
                    (EXTRACT(EPOCH FROM (
                        CASE 
                            WHEN t.actual_end_time::time < t.actual_start_time::time 
                            THEN (t.actual_end_time::time - t.actual_start_time::time) + INTERVAL '24 hours' 
                            ELSE (t.actual_end_time::time - t.actual_start_time::time) 
                        END
                    )) / 3600) *
                    COALESCE(s.pay_rate_override, 20) * 1.3  -- Assuming 30% markup
                ), 0)
                FROM timesheets t
                JOIN shifts s ON t.shift_id = s.id
                JOIN clients c ON s.client_id = c.id
                WHERE c.agency_id = p_agency_id
                AND s.date BETWEEN p_week_start_date AND v_week_end_date
                AND t.status IN ('approved', 'pending')
            ),
            'lastWeekRevenue', (
                SELECT COALESCE(SUM(
                    (EXTRACT(EPOCH FROM (
                        CASE 
                            WHEN t.actual_end_time::time < t.actual_start_time::time 
                            THEN (t.actual_end_time::time - t.actual_start_time::time) + INTERVAL '24 hours' 
                            ELSE (t.actual_end_time::time - t.actual_start_time::time) 
                        END
                    )) / 3600) *
                    COALESCE(s.pay_rate_override, 20) * 1.3
                ), 0)
                FROM timesheets t
                JOIN shifts s ON t.shift_id = s.id
                JOIN clients c ON s.client_id = c.id
                WHERE c.agency_id = p_agency_id
                AND s.date BETWEEN v_last_week_start AND v_last_week_end
                AND t.status IN ('approved', 'pending')
            ),
            'staffCosts', (
                SELECT COALESCE(SUM(
                    (EXTRACT(EPOCH FROM (
                        CASE 
                            WHEN t.actual_end_time::time < t.actual_start_time::time 
                            THEN (t.actual_end_time::time - t.actual_start_time::time) + INTERVAL '24 hours' 
                            ELSE (t.actual_end_time::time - t.actual_start_time::time) 
                        END
                    )) / 3600) *
                    COALESCE(s.pay_rate_override, 20)
                ), 0)
                FROM timesheets t
                JOIN shifts s ON t.shift_id = s.id
                JOIN clients c ON s.client_id = c.id
                WHERE c.agency_id = p_agency_id
                AND s.date BETWEEN p_week_start_date AND v_week_end_date
                AND t.status IN ('approved', 'pending')
            ),
            'platformCosts', (
                SELECT COALESCE(SUM(amount), 0)
                FROM operational_costs
                WHERE cost_date BETWEEN p_week_start_date AND v_week_end_date
                AND service_category IN ('communication', 'platform_hosting')
            )
        ),

        -- Top Performing Staff
        'topStaff', (
            SELECT json_agg(staff_performance ORDER BY shifts_completed DESC, avg_rating DESC)
            FROM (
                SELECT
                    st.id,
                    st.first_name || ' ' || st.last_name as name,
                    COUNT(s.id) as shifts_completed,
                    ROUND(AVG(b.rating), 1) as avg_rating,
                    ROUND((COUNT(*) FILTER (WHERE s.staff_confirmed_completion)::NUMERIC /
                        NULLIF(COUNT(*), 0)) * 100, 0) as on_time_rate
                FROM staff st
                JOIN shifts s ON st.id = s.assigned_staff_id
                JOIN clients c ON s.client_id = c.id
                LEFT JOIN bookings b ON s.id = b.shift_id
                WHERE c.agency_id = p_agency_id
                AND s.date BETWEEN p_week_start_date AND v_week_end_date
                AND s.status = 'completed'
                GROUP BY st.id, st.first_name, st.last_name
                ORDER BY shifts_completed DESC, avg_rating DESC
                LIMIT 5
            ) staff_performance
        ),

        -- Client Breakdown
        'clients', (
            SELECT json_agg(
                json_build_object(
                    'id', c.id,
                    'name', c.name,
                    'shifts', COUNT(s.id),
                    'hours', COALESCE(SUM(
                        EXTRACT(EPOCH FROM (
                            CASE 
                                WHEN t.actual_end_time::time < t.actual_start_time::time 
                                THEN (t.actual_end_time::time - t.actual_start_time::time) + INTERVAL '24 hours' 
                                ELSE (t.actual_end_time::time - t.actual_start_time::time) 
                            END
                        )) / 3600
                    ), 0),
                    'revenue', COALESCE(SUM(
                        (EXTRACT(EPOCH FROM (
                            CASE 
                                WHEN t.actual_end_time::time < t.actual_start_time::time 
                                THEN (t.actual_end_time::time - t.actual_start_time::time) + INTERVAL '24 hours' 
                                ELSE (t.actual_end_time::time - t.actual_start_time::time) 
                            END
                        )) / 3600) *
                        COALESCE(s.pay_rate_override, 20) * 1.3
                    ), 0)
                )
                ORDER BY COUNT(s.id) DESC
            )
            FROM clients c
            LEFT JOIN shifts s ON c.id = s.client_id
                AND s.date BETWEEN p_week_start_date AND v_week_end_date
            LEFT JOIN timesheets t ON s.id = t.shift_id
            WHERE c.agency_id = p_agency_id
            GROUP BY c.id, c.name
            HAVING COUNT(s.id) > 0
        ),

        -- Compliance Alerts
        'complianceAlerts', (
            SELECT json_agg(alert_group)
            FROM (
                SELECT json_build_object(
                    'period', '30 days',
                    'count', COUNT(*),
                    'items', json_agg(
                        st.first_name || ' ' || st.last_name || ' - ' ||
                        comp.document_type || ' (expires ' ||
                        TO_CHAR(comp.expiry_date, 'DD Mon') || ')'
                    )
                ) as alert_group
                FROM compliance comp
                JOIN staff st ON comp.staff_id = st.id
                WHERE st.agency_id = p_agency_id
                AND comp.expiry_date BETWEEN v_week_end_date AND v_week_end_date + INTERVAL '30 days'
                AND comp.status = 'valid'
                HAVING COUNT(*) > 0

                UNION ALL

                SELECT json_build_object(
                    'period', '14 days',
                    'count', COUNT(*),
                    'items', json_agg(
                        st.first_name || ' ' || st.last_name || ' - ' ||
                        comp.document_type || ' (expires ' ||
                        TO_CHAR(comp.expiry_date, 'DD Mon') || ')'
                    )
                )
                FROM compliance comp
                JOIN staff st ON comp.staff_id = st.id
                WHERE st.agency_id = p_agency_id
                AND comp.expiry_date BETWEEN v_week_end_date AND v_week_end_date + INTERVAL '14 days'
                AND comp.status = 'valid'
                HAVING COUNT(*) > 0
            ) alerts
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_weekly_agency_report(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_agency_report(UUID, DATE) TO service_role;

COMMENT ON FUNCTION get_weekly_agency_report IS
'Aggregates weekly performance data for agency summary email including financials, staff, and compliance';

-- =====================================================
-- FUNCTION: get_notification_effectiveness
-- =====================================================
-- Purpose: Calculate notification delivery and engagement metrics
-- Returns: JSON with channel-specific statistics
-- =====================================================

CREATE OR REPLACE FUNCTION get_notification_effectiveness(
    p_agency_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'totalNotifications', COUNT(*),
        'dateRange', json_build_object(
            'start', p_start_date,
            'end', p_end_date
        ),
        'channels', (
            SELECT json_agg(
                json_build_object(
                    'channel', channel,
                    'icon', CASE channel
                        WHEN 'email' THEN '📧'
                        WHEN 'whatsapp' THEN '💬'
                        WHEN 'sms' THEN '📱'
                        ELSE '📨'
                    END,
                    'sent', sent,
                    'delivered', delivered,
                    'opened', opened,
                    'clicked', clicked,
                    'failed', failed,
                    'deliveryRate', ROUND((delivered::NUMERIC / NULLIF(sent, 0)) * 100, 0),
                    'openRate', ROUND((opened::NUMERIC / NULLIF(delivered, 0)) * 100, 0),
                    'clickRate', ROUND((clicked::NUMERIC / NULLIF(opened, 0)) * 100, 0)
                )
                ORDER BY sent DESC
            )
            FROM (
                SELECT 
                    channel,
                    COUNT(*) as sent,
                    COUNT(*) FILTER (WHERE status IN ('delivered', 'opened', 'clicked')) as delivered,
                    COUNT(*) FILTER (WHERE status IN ('opened', 'clicked')) as opened,
                    COUNT(*) FILTER (WHERE status = 'clicked') as clicked,
                    COUNT(*) FILTER (WHERE status IN ('failed', 'bounced')) as failed
                FROM notification_log
                WHERE agency_id = p_agency_id
                AND DATE(created_at) BETWEEN p_start_date AND p_end_date
                GROUP BY channel
            ) channel_stats
        )
    )
    INTO v_result
    FROM notification_log
    WHERE agency_id = p_agency_id
    AND DATE(created_at) BETWEEN p_start_date AND p_end_date;

    RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_notification_effectiveness(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_effectiveness(UUID, DATE, DATE) TO service_role;

COMMENT ON FUNCTION get_notification_effectiveness IS
'Calculates notification channel effectiveness metrics for agency reports';

-- =====================================================
-- TEST QUERIES (Comment out before deployment)
-- =====================================================

-- Test daily report for a specific agency
-- SELECT get_daily_agency_report('agency-uuid-here'::UUID, CURRENT_DATE);

-- Test weekly report
-- SELECT get_weekly_agency_report('agency-uuid-here'::UUID, DATE_TRUNC('week', CURRENT_DATE)::DATE);

-- Test notification effectiveness
-- SELECT get_notification_effectiveness('agency-uuid-here'::UUID, CURRENT_DATE - 7, CURRENT_DATE);
