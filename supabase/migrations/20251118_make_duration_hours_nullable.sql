-- Migration: Make duration_hours nullable and remove any problematic constraints
-- Date: 2025-11-18
-- Reason: duration_hours is static display data, not used for invoicing
--         Actual times are in actual_start_time/actual_end_time
--         The column was causing ROUND() type errors on insert

-- Make duration_hours nullable
ALTER TABLE shifts
ALTER COLUMN duration_hours DROP NOT NULL;

-- Set a simple default (12 hours) for when it's not provided
ALTER TABLE shifts
ALTER COLUMN duration_hours SET DEFAULT 12;

-- Add comment explaining this is display-only data
COMMENT ON COLUMN shifts.duration_hours IS 'Static display field (12 hours). NOT used for invoicing - use actual_start_time/actual_end_time instead.';

-- Drop any problematic CHECK constraints on duration_hours if they exist
-- (Safe to run even if constraint doesn't exist)
DO $$
BEGIN
    -- Try to drop any check constraints on duration_hours
    EXECUTE 'ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_duration_hours_check';
    EXECUTE 'ALTER TABLE shifts DROP CONSTRAINT IF EXISTS check_duration_hours';
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if constraints don't exist
        NULL;
END $$;
