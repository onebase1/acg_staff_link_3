-- ============================================================================
-- BACKFILL TIMESHEETS FOR EXISTING CONFIRMED BOOKINGS
-- ============================================================================
-- This script creates draft timesheets for all confirmed bookings that don't
-- have timesheets yet. It replicates the logic from auto-timesheet-creator.
--
-- USAGE:
-- Run this in Supabase SQL Editor or via:
-- npx supabase db execute --file scripts/backfill-timesheets.sql
--
-- SAFETY:
-- - Only creates timesheets for bookings that don't already have one
-- - Only processes confirmed bookings with valid shift data
-- - Uses INSERT ... ON CONFLICT DO NOTHING to prevent duplicates
-- ============================================================================

-- Step 1: Create timesheets for all confirmed bookings without timesheets
INSERT INTO timesheets (
    booking_id,
    shift_id,
    staff_id,
    client_id,
    agency_id,
    shift_date,
    pay_rate,
    charge_rate,
    status,
    created_date,
    updated_date
)
SELECT
    b.id as booking_id,
    b.shift_id,
    b.staff_id,
    s.client_id,
    s.agency_id,
    s.date as shift_date,
    s.pay_rate,
    s.charge_rate,
    'draft' as status,
    NOW() as created_date,
    NOW() as updated_date
FROM bookings b
JOIN shifts s ON b.shift_id = s.id
LEFT JOIN timesheets t ON b.id = t.booking_id
WHERE
    -- Only confirmed bookings
    b.status = 'confirmed'
    -- Only shifts that are confirmed, in_progress, awaiting_admin_closure, or completed
    AND s.status IN ('confirmed', 'in_progress', 'awaiting_admin_closure', 'completed')
    -- Only bookings without timesheets
    AND t.id IS NULL
    -- Only valid data
    AND b.shift_id IS NOT NULL
    AND b.staff_id IS NOT NULL
    AND s.client_id IS NOT NULL
    AND s.agency_id IS NOT NULL
    AND s.date IS NOT NULL
ON CONFLICT (booking_id) DO NOTHING;

-- Step 2: Calculate total_hours, staff_pay_amount, and client_charge_amount
-- This updates timesheets that were just created or any existing ones missing these values
UPDATE timesheets t
SET
    total_hours = s.duration_hours,
    staff_pay_amount = s.duration_hours * t.pay_rate,
    client_charge_amount = s.duration_hours * t.charge_rate
FROM shifts s
WHERE
    t.shift_id = s.id
    AND t.booking_id IS NOT NULL
    AND t.total_hours IS NULL;

-- Show results
SELECT
    COUNT(*) as timesheets_with_booking_id,
    SUM(total_hours) as total_hours,
    SUM(staff_pay_amount) as total_staff_pay,
    SUM(client_charge_amount) as total_client_charge,
    MIN(shift_date) as earliest_shift,
    MAX(shift_date) as latest_shift
FROM timesheets
WHERE booking_id IS NOT NULL;

