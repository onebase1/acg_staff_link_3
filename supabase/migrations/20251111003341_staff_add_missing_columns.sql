-- Migration: Add missing columns to staff
-- Generated: 2025-11-11 00:33:41
-- Missing columns: 27

-- Add missing columns to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN staff.created_by IS 'User email';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS whatsapp_pin TEXT;
COMMENT ON COLUMN staff.whatsapp_pin IS '4-digit PIN for WhatsApp auth';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS whatsapp_number_verified TEXT;
COMMENT ON COLUMN staff.whatsapp_number_verified IS 'Verified WhatsApp number (E.164)';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS whatsapp_linked_at TIMESTAMPTZ;
COMMENT ON COLUMN staff.whatsapp_linked_at IS 'When WhatsApp was linked';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS date_of_birth DATE;
COMMENT ON COLUMN staff.date_of_birth IS 'Date of birth';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
COMMENT ON COLUMN staff.profile_photo_url IS 'Professional headshot URL';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS profile_photo_uploaded_date DATE;
COMMENT ON COLUMN staff.profile_photo_uploaded_date IS 'Photo upload date';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS nmc_pin TEXT;
COMMENT ON COLUMN staff.nmc_pin IS 'NMC registration (nurses)';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS nmc_register_part TEXT;
COMMENT ON COLUMN staff.nmc_register_part IS 'NMC register part';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS medication_trained BOOLEAN DEFAULT false;
COMMENT ON COLUMN staff.medication_trained IS 'Medication training status';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS medication_training_expiry DATE;
COMMENT ON COLUMN staff.medication_training_expiry IS 'Training expiry';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS can_work_as_senior BOOLEAN DEFAULT false;
COMMENT ON COLUMN staff.can_work_as_senior IS 'Calculated field';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS role_hierarchy JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN staff.role_hierarchy IS '{can_work_as: []}';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS driving_license_number TEXT;
COMMENT ON COLUMN staff.driving_license_number IS 'License number';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS driving_license_expiry DATE;
COMMENT ON COLUMN staff.driving_license_expiry IS 'License expiry';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
COMMENT ON COLUMN staff.suspension_reason IS 'Reason if suspended';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS employment_history JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN staff.employment_history IS 'Array of employment records';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS references JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN staff.references IS 'Array of reference records';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS occupational_health JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN staff.occupational_health IS 'Health assessment data';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS mandatory_training JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN staff.mandatory_training IS 'Training certificates data';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN staff.skills IS 'Special skills/certifications';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS groups JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN staff.groups IS 'Group references';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS date_joined DATE;
COMMENT ON COLUMN staff.date_joined IS 'Join date';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS proposed_first_shift_date DATE;
COMMENT ON COLUMN staff.proposed_first_shift_date IS 'For new staff';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS months_of_experience NUMERIC;
COMMENT ON COLUMN staff.months_of_experience IS 'Total experience';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS gps_consent BOOLEAN DEFAULT false;
COMMENT ON COLUMN staff.gps_consent IS 'GPS tracking consent';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_known_location JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN staff.last_known_location IS '{latitude, longitude, timestamp}';

-- Migration completed
