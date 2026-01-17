-- =====================================================
-- DAILY AGENCY METRICS - MATERIALIZED VIEW
-- =====================================================
-- Created: 2026-01-16
-- Purpose: Pre-aggregated metrics for fast report generation
-- Refresh: Hourly via cron (15 minutes past the hour)
-- =====================================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS daily_agency_metrics;

-- Create materialized view
CREATE MATERIALIZED VIEW daily_agency_metrics AS
SELECT
    a.id as agency_id,
    a.name as agency_name,
    CURRENT_DATE as metric_date,

    -- Shift metrics
    COUNT(DISTINCT s.id) FILTER (WHERE s.date = CURRENT_DATE) as shifts_today,
    COUNT(DISTINCT s.id) FILTER (WHERE s.date = CURRENT_DATE AND s.status = 'confirmed') as shifts_confirmed,
    COUNT(DISTINCT s.id) FILTER (WHERE s.date = CURRENT_DATE AND s.status = 'open') as shifts_open,
    COUNT(DISTINCT s.id) FILTER (WHERE s.date = CURRENT_DATE AND s.status = 'completed') as shifts_completed,

    -- Staff metrics
    COUNT(DISTINCT st.id) FILTER (WHERE st.status = 'active') as total_active_staff,
    COUNT(DISTINCT s.assigned_staff_id) FILTER (WHERE s.date = CURRENT_DATE) as staff_working_today,

    -- Utilization percentage
    ROUND(
        (COUNT(DISTINCT s.assigned_staff_id) FILTER (WHERE s.date = CURRENT_DATE)::NUMERIC /
        NULLIF(COUNT(DISTINCT st.id) FILTER (WHERE st.status = 'active'), 0)) * 100, 0
    ) as staff_utilization_pct,

    -- Notification metrics (today)
    COUNT(DISTINCT nl.id) FILTER (WHERE DATE(nl.created_at) = CURRENT_DATE) as notifications_sent_today,
    COUNT(DISTINCT nl.id) FILTER (
        WHERE DATE(nl.created_at) = CURRENT_DATE AND nl.channel = 'email'
    ) as email_sent_today,
    COUNT(DISTINCT nl.id) FILTER (
        WHERE DATE(nl.created_at) = CURRENT_DATE AND nl.channel = 'whatsapp'
    ) as whatsapp_sent_today,
    COUNT(DISTINCT nl.id) FILTER (
        WHERE DATE(nl.created_at) = CURRENT_DATE AND nl.channel = 'sms'
    ) as sms_sent_today,

    -- Pending actions
    COUNT(DISTINCT t.id) FILTER (
        WHERE s.date = CURRENT_DATE - INTERVAL '1 day' AND t.status = 'pending'
    ) as pending_timesheets_yesterday,

    COUNT(DISTINCT comp.id) FILTER (
        WHERE comp.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        AND comp.status = 'valid'
    ) as compliance_expiring_7days,

    -- Last updated timestamp
    NOW() as last_refreshed

FROM agencies a
LEFT JOIN clients c ON c.agency_id = a.id
LEFT JOIN shifts s ON s.client_id = c.id
LEFT JOIN staff st ON st.agency_id = a.id
LEFT JOIN timesheets t ON t.shift_id = s.id
LEFT JOIN notification_log nl ON nl.agency_id = a.id
LEFT JOIN compliance comp ON comp.staff_id = st.id

GROUP BY a.id, a.name;

-- Create indexes for fast lookups
CREATE UNIQUE INDEX idx_daily_agency_metrics_agency_date
    ON daily_agency_metrics(agency_id, metric_date);

CREATE INDEX idx_daily_agency_metrics_date
    ON daily_agency_metrics(metric_date);

-- Grant select permissions
GRANT SELECT ON daily_agency_metrics TO authenticated;
GRANT SELECT ON daily_agency_metrics TO service_role;

COMMENT ON MATERIALIZED VIEW daily_agency_metrics IS
'Pre-aggregated daily metrics for fast agency report generation. Refreshed hourly.';

-- =====================================================
-- REFRESH FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_daily_agency_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_agency_metrics;

    -- Log the refresh (optional)
    RAISE NOTICE 'daily_agency_metrics refreshed at %', NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_daily_agency_metrics() TO service_role;

COMMENT ON FUNCTION refresh_daily_agency_metrics IS
'Refreshes the daily_agency_metrics materialized view. Called hourly by cron.';

-- =====================================================
-- CRON JOB: Refresh hourly (15 minutes past the hour)
-- =====================================================

-- Note: This will be created separately via cron job migration
-- Schedule: Every hour at 15 minutes past (e.g., 00:15, 01:15, 02:15...)

-- Example cron job creation (to be added to cron migration):
/*
SELECT cron.schedule(
    'refresh-daily-agency-metrics',
    '15 * * * *',  -- Every hour at 15 minutes past
    $$SELECT refresh_daily_agency_metrics();$$
);
*/
