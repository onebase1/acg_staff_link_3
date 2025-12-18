-- Migration: Add audit trail columns for profile updates
-- Module 21: Admin Profile Pre-Fill Core
-- Generated: 2025-12-17

-- Add audit trail columns for enterprise compliance
ALTER TABLE staff ADD COLUMN IF NOT EXISTS profile_last_updated_at TIMESTAMPTZ DEFAULT NOW();
COMMENT ON COLUMN staff.profile_last_updated_at IS 'Timestamp of last profile update';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS profile_last_updated_by UUID;
COMMENT ON COLUMN staff.profile_last_updated_by IS 'User ID who last updated profile (admin, staff, or system)';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS profile_update_source TEXT
  CHECK (profile_update_source IS NULL OR profile_update_source IN ('admin_portal', 'staff_portal', 'api', 'ai_agent', 'csv_import'));
COMMENT ON COLUMN staff.profile_update_source IS 'Source of profile update for autonomous AI tracking';

-- Add index for performance on audit trail queries
CREATE INDEX IF NOT EXISTS idx_staff_profile_last_updated
  ON staff(profile_last_updated_at DESC);

-- Migration completed

