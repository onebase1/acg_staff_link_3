-- Migration: Add missing columns to payslips
-- Generated: 2025-11-11 00:33:41
-- Missing columns: 4

-- Add missing columns to payslips table
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN payslips.created_by IS 'User email';

ALTER TABLE payslips ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN payslips.bank_details IS '{account_name, sort_code, account_number}';

ALTER TABLE payslips ADD COLUMN IF NOT EXISTS pdf_url TEXT;
COMMENT ON COLUMN payslips.pdf_url IS 'Generated PDF URL';

ALTER TABLE payslips ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
COMMENT ON COLUMN payslips.paid_at IS 'Payment timestamp';

-- Migration completed
