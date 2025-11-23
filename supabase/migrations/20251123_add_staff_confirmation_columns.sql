-- Migration: Add Staff Confirmation Columns for Phase 2
-- Date: 2025-11-23
-- Purpose: Enable staff validation workflow for web timesheet uploads

-- ============================================================
-- STAFF CONFIRMATION COLUMNS
-- ============================================================

-- Add staff_confirmed flag
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS staff_confirmed BOOLEAN DEFAULT false;
COMMENT ON COLUMN timesheets.staff_confirmed IS 'Staff reviewed and confirmed OCR extraction data';

-- Add staff confirmation timestamp
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS staff_confirmed_at TIMESTAMPTZ;
COMMENT ON COLUMN timesheets.staff_confirmed_at IS 'When staff confirmed the timesheet data';

-- Add auto-approval tracking
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT false;
COMMENT ON COLUMN timesheets.auto_approved IS 'Timesheet was auto-approved (high confidence + staff confirmed)';

-- Update approved_by to handle auto-approval
COMMENT ON COLUMN timesheets.approved_by IS 'User ID or "auto_approved_by_staff" for auto-approvals';

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Index for filtering auto-approved timesheets
CREATE INDEX IF NOT EXISTS idx_timesheets_auto_approved
ON timesheets(auto_approved)
WHERE auto_approved = true;

-- Index for staff confirmation queries
CREATE INDEX IF NOT EXISTS idx_timesheets_staff_confirmed
ON timesheets(staff_confirmed, staff_confirmed_at DESC);

-- ============================================================
-- ANALYTICS QUERIES (for monitoring Phase 2 success)
-- ============================================================

-- Example queries for monitoring:

-- Auto-approval rate
-- SELECT
--   COUNT(*) FILTER (WHERE auto_approved = true) as auto_approved,
--   COUNT(*) as total_uploads,
--   ROUND(COUNT(*) FILTER (WHERE auto_approved = true)::numeric / COUNT(*) * 100, 2) as auto_approval_rate_percent
-- FROM timesheets
-- WHERE created_date >= CURRENT_DATE - INTERVAL '7 days';

-- Staff confirmation rate
-- SELECT
--   COUNT(*) FILTER (WHERE staff_confirmed = true) as confirmed_count,
--   COUNT(*) as total_uploads,
--   ROUND(COUNT(*) FILTER (WHERE staff_confirmed = true)::numeric / COUNT(*) * 100, 2) as confirmation_rate_percent
-- FROM timesheets
-- WHERE created_date >= CURRENT_DATE - INTERVAL '7 days';

-- Average time to staff confirmation
-- SELECT
--   AVG(EXTRACT(EPOCH FROM (staff_confirmed_at - created_date))/60) as avg_minutes_to_confirm
-- FROM timesheets
-- WHERE staff_confirmed = true
--   AND created_date >= CURRENT_DATE - INTERVAL '7 days';

COMMENT ON TABLE timesheets IS 'Timesheets with OCR extraction, validation, and staff confirmation workflow (Phase 2)';
