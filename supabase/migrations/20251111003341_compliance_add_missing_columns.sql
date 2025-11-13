-- Migration: Add missing columns to compliance
-- Generated: 2025-11-11 00:33:41
-- Missing columns: 10

-- Add missing columns to compliance table
ALTER TABLE compliance ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN compliance.created_by IS 'User email';

ALTER TABLE compliance ADD COLUMN IF NOT EXISTS agency_id TEXT;
COMMENT ON COLUMN compliance.agency_id IS 'Multi-tenant reference';

ALTER TABLE compliance ADD COLUMN IF NOT EXISTS document_url TEXT;
COMMENT ON COLUMN compliance.document_url IS 'Uploaded file URL';

ALTER TABLE compliance ADD COLUMN IF NOT EXISTS notes TEXT;
COMMENT ON COLUMN compliance.notes IS 'Document notes';

ALTER TABLE compliance ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;
COMMENT ON COLUMN compliance.reminder_sent IS 'Reminder flag';

ALTER TABLE compliance ADD COLUMN IF NOT EXISTS issuing_authority TEXT;
COMMENT ON COLUMN compliance.issuing_authority IS 'Issuing authority';

ALTER TABLE compliance ADD COLUMN IF NOT EXISTS reference_number TEXT;
COMMENT ON COLUMN compliance.reference_number IS 'Reference number';

ALTER TABLE compliance ADD COLUMN IF NOT EXISTS reminder_30d_sent BOOLEAN DEFAULT false;
COMMENT ON COLUMN compliance.reminder_30d_sent IS '30-day reminder';

ALTER TABLE compliance ADD COLUMN IF NOT EXISTS reminder_14d_sent BOOLEAN DEFAULT false;
COMMENT ON COLUMN compliance.reminder_14d_sent IS '14-day reminder';

ALTER TABLE compliance ADD COLUMN IF NOT EXISTS reminder_7d_sent BOOLEAN DEFAULT false;
COMMENT ON COLUMN compliance.reminder_7d_sent IS '7-day reminder';

-- Migration completed
