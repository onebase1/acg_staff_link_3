-- Migration: Add missing columns to invoice_amendments
-- Generated: 2025-11-11 00:33:41
-- Missing columns: 22

-- Add missing columns to invoice_amendments table
ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN invoice_amendments.created_by IS 'User email';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS original_invoice_id TEXT;
COMMENT ON COLUMN invoice_amendments.original_invoice_id IS 'Original invoice reference';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS amended_invoice_id TEXT;
COMMENT ON COLUMN invoice_amendments.amended_invoice_id IS 'New invoice reference';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS amendment_version NUMERIC;
COMMENT ON COLUMN invoice_amendments.amendment_version IS 'Version number';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS amendment_reason TEXT;
COMMENT ON COLUMN invoice_amendments.amendment_reason IS 'Amendment reason';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS changes_made JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN invoice_amendments.changes_made IS 'Detailed change list';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS original_total NUMERIC DEFAULT 0;
COMMENT ON COLUMN invoice_amendments.original_total IS 'Original amount';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS amended_total NUMERIC DEFAULT 0;
COMMENT ON COLUMN invoice_amendments.amended_total IS 'New amount';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS total_difference NUMERIC DEFAULT 0;
COMMENT ON COLUMN invoice_amendments.total_difference IS 'Difference';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS requires_client_approval BOOLEAN DEFAULT false;
COMMENT ON COLUMN invoice_amendments.requires_client_approval IS 'Approval flag';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS client_notified_at TIMESTAMPTZ;
COMMENT ON COLUMN invoice_amendments.client_notified_at IS 'Notification time';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS client_approved_at TIMESTAMPTZ;
COMMENT ON COLUMN invoice_amendments.client_approved_at IS 'Approval time';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS client_dispute_reason TEXT;
COMMENT ON COLUMN invoice_amendments.client_dispute_reason IS 'Dispute reason';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS amended_by TEXT;
COMMENT ON COLUMN invoice_amendments.amended_by IS 'User ID';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
COMMENT ON COLUMN invoice_amendments.sent_at IS 'Send time';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS pdf_url TEXT;
COMMENT ON COLUMN invoice_amendments.pdf_url IS 'Amended invoice PDF';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS email_trail JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN invoice_amendments.email_trail IS 'Email audit trail';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN invoice_amendments.audit_trail IS 'Complete audit trail';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS risk_level TEXT;
COMMENT ON COLUMN invoice_amendments.risk_level IS 'low/medium/high/critical';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS payment_already_received BOOLEAN DEFAULT false;
COMMENT ON COLUMN invoice_amendments.payment_already_received IS 'Payment received flag';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS credit_note_required BOOLEAN DEFAULT false;
COMMENT ON COLUMN invoice_amendments.credit_note_required IS 'Credit note flag';

ALTER TABLE invoice_amendments ADD COLUMN IF NOT EXISTS credit_note_id TEXT;
COMMENT ON COLUMN invoice_amendments.credit_note_id IS 'Credit note reference';

-- Migration completed
