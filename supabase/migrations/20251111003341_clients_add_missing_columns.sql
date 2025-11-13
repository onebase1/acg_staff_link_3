-- Migration: Add missing columns to clients
-- Generated: 2025-11-11 00:33:41
-- Missing columns: 8

-- Add missing columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN clients.created_by IS 'User email';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS location_coordinates JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN clients.location_coordinates IS '{latitude, longitude}';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS geofence_enabled BOOLEAN DEFAULT false;
COMMENT ON COLUMN clients.geofence_enabled IS 'Default true';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS cqc_rating TEXT;
COMMENT ON COLUMN clients.cqc_rating IS 'outstanding/good/requires_improvement/inadequate/not_rated';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS bed_capacity NUMERIC;
COMMENT ON COLUMN clients.bed_capacity IS 'Number of beds';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_staff JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN clients.preferred_staff IS 'Preferred staff IDs';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
COMMENT ON COLUMN clients.notes IS 'Internal notes';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_bookings NUMERIC DEFAULT 0;
COMMENT ON COLUMN clients.total_bookings IS 'Booking count';

-- Migration completed
