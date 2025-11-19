-- ============================================================================
-- ADD CLOCK-OUT GEOFENCE VALIDATION COLUMNS
-- ============================================================================
-- Purpose: Track geofence validation at clock-out (not just clock-in)
-- Date: 2025-11-18
-- Part of: GPS Improvements Phase 3
-- ============================================================================

-- Add columns to timesheets table
ALTER TABLE timesheets 
ADD COLUMN IF NOT EXISTS clock_out_geofence_validated BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS clock_out_geofence_distance_meters INTEGER DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN timesheets.clock_out_geofence_validated IS 
'Whether staff was within geofence when clocking out. NULL if geofencing disabled or not checked.';

COMMENT ON COLUMN timesheets.clock_out_geofence_distance_meters IS 
'Distance in meters from client location at clock-out time. NULL if geofencing disabled.';

-- Create index for querying clock-out validation failures
CREATE INDEX IF NOT EXISTS idx_timesheets_clock_out_geofence_failed 
ON timesheets(clock_out_geofence_validated) 
WHERE clock_out_geofence_validated = false;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify columns were added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'timesheets' 
--   AND column_name LIKE '%clock_out_geofence%';

