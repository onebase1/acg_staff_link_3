-- Migration: Add Performance Indexes for Timesheets
-- Date: 2025-11-23
-- Purpose: Improve query performance for timesheet listing and filtering

-- ============================================================
-- TIMESHEET INDEXES
-- ============================================================

-- Index for ordering/sorting by created_date (most common query)
CREATE INDEX IF NOT EXISTS idx_timesheets_created_date
ON timesheets(created_date DESC);

-- Index for filtering by agency (admin views)
CREATE INDEX IF NOT EXISTS idx_timesheets_agency_id
ON timesheets(agency_id);

-- Index for filtering by staff (staff member views)
CREATE INDEX IF NOT EXISTS idx_timesheets_staff_id
ON timesheets(staff_id);

-- Index for filtering by status (pending, approved, rejected)
CREATE INDEX IF NOT EXISTS idx_timesheets_status
ON timesheets(status);

-- Composite index for most common query pattern: agency + status + date
CREATE INDEX IF NOT EXISTS idx_timesheets_agency_status_date
ON timesheets(agency_id, status, created_date DESC);

-- Composite index for staff + date queries
CREATE INDEX IF NOT EXISTS idx_timesheets_staff_date
ON timesheets(staff_id, created_date DESC);

-- Index for shift/booking lookups
CREATE INDEX IF NOT EXISTS idx_timesheets_booking_id
ON timesheets(booking_id);

-- Index for client lookups (reporting)
CREATE INDEX IF NOT EXISTS idx_timesheets_client_id
ON timesheets(client_id);

-- Index for invoice relationships
CREATE INDEX IF NOT EXISTS idx_timesheets_invoice_id
ON timesheets(invoice_id)
WHERE invoice_id IS NOT NULL;

-- ============================================================
-- RELATED TABLE INDEXES FOR JOIN OPTIMIZATION
-- ============================================================

-- Staff table indexes (if not exists)
CREATE INDEX IF NOT EXISTS idx_staff_agency_id
ON staff(agency_id);

CREATE INDEX IF NOT EXISTS idx_staff_user_id
ON staff(user_id);

-- Shifts/Bookings table indexes (if not exists)
CREATE INDEX IF NOT EXISTS idx_shifts_date
ON shifts(date DESC);

CREATE INDEX IF NOT EXISTS idx_shifts_agency_id
ON shifts(agency_id);

-- Clients table indexes (if not exists)
CREATE INDEX IF NOT EXISTS idx_clients_agency_id
ON clients(agency_id);

-- ============================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================

ANALYZE timesheets;
ANALYZE staff;
ANALYZE shifts;
ANALYZE clients;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON INDEX idx_timesheets_created_date IS 'Optimizes ORDER BY created_date queries';
COMMENT ON INDEX idx_timesheets_agency_status_date IS 'Optimizes admin dashboard queries with status filtering';
COMMENT ON INDEX idx_timesheets_staff_date IS 'Optimizes staff member timesheet views';
