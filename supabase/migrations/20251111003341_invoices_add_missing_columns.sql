-- Migration: Add missing columns to invoices
-- Generated: 2025-11-11 00:33:41
-- Missing columns: 15

-- Add missing columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN invoices.created_by IS 'User email';

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;
COMMENT ON COLUMN invoices.payment_method IS 'bank_transfer/bacs/cheque/card/other';

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_date DATE;
COMMENT ON COLUMN invoices.paid_date IS 'Payment date';

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
COMMENT ON COLUMN invoices.notes IS 'Invoice notes';

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT;
COMMENT ON COLUMN invoices.pdf_url IS 'Generated PDF URL';

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reminder_sent_count NUMERIC DEFAULT 0;
COMMENT ON COLUMN invoices.reminder_sent_count IS 'Reminder count';

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ;
COMMENT ON COLUMN invoices.last_reminder_sent IS 'Last reminder time';

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_amendment BOOLEAN DEFAULT false;
COMMENT ON COLUMN invoices.is_amendment IS 'Amendment flag';

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amendment_version NUMERIC;
COMMENT ON COLUMN invoices.amendment_version IS 'Version number';

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_invoice_id TEXT;
COMMENT ON COLUMN invoices.original_invoice_id IS 'Original reference';

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS superseded_by_invoice_id TEXT;
COMMENT ON COLUMN invoices.superseded_by_invoice_id IS 'Newer version reference';

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amendment_reason TEXT;
COMMENT ON COLUMN invoices.amendment_reason IS 'Amendment reason';

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amended_at TIMESTAMPTZ;
COMMENT ON COLUMN invoices.amended_at IS 'When amended';

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amended_by TEXT;
COMMENT ON COLUMN invoices.amended_by IS 'User ID';

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS immutable_sent_snapshot JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN invoices.immutable_sent_snapshot IS 'Immutable sent data';

-- Migration completed
