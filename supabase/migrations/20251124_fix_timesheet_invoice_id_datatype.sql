-- Migration: Fix timesheets.invoice_id data type mismatch
-- Created: 2025-11-24
-- Issue: timesheets.invoice_id is TEXT but invoices.id is UUID
-- Impact: Cannot join timesheets to invoices, queries fail with "operator does not exist: text = uuid"

-- CRITICAL: This migration changes invoice_id from TEXT to UUID
-- Requires careful handling of existing data

BEGIN;

-- Step 1: Check if there are any timesheets with non-UUID invoice_id values
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM timesheets
    WHERE invoice_id IS NOT NULL
      AND invoice_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    IF invalid_count > 0 THEN
        RAISE NOTICE 'WARNING: Found % timesheets with non-UUID invoice_id values', invalid_count;
        RAISE NOTICE 'These will be set to NULL during migration';
    END IF;
END $$;

-- Step 2: Create temporary column for UUID data
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS invoice_id_uuid UUID;

-- Step 3: Copy valid UUID values from TEXT column to UUID column
UPDATE timesheets
SET invoice_id_uuid = invoice_id::UUID
WHERE invoice_id IS NOT NULL
  AND invoice_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 4: Drop old TEXT column
ALTER TABLE timesheets DROP COLUMN invoice_id;

-- Step 5: Rename UUID column to invoice_id
ALTER TABLE timesheets RENAME COLUMN invoice_id_uuid TO invoice_id;

-- Step 6: Add foreign key constraint (optional but recommended)
ALTER TABLE timesheets
ADD CONSTRAINT fk_timesheets_invoice
FOREIGN KEY (invoice_id) REFERENCES invoices(id)
ON DELETE SET NULL;

-- Step 7: Create index for performance
CREATE INDEX IF NOT EXISTS idx_timesheets_invoice_id ON timesheets(invoice_id);

-- Step 8: Add comment
COMMENT ON COLUMN timesheets.invoice_id IS 'Foreign key to invoices.id (UUID). Links timesheet to generated invoice.';

COMMIT;

-- Verification query (run after migration)
-- SELECT COUNT(*) as timesheets_with_invalid_invoice_links
-- FROM timesheets t
-- LEFT JOIN invoices i ON i.id = t.invoice_id
-- WHERE t.invoice_id IS NOT NULL AND i.id IS NULL;

