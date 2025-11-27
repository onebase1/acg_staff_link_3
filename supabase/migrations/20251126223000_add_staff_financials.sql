-- Add NI Number and Bank Details to staff table

ALTER TABLE staff
ADD COLUMN IF NOT EXISTS ni_number text,
ADD COLUMN IF NOT EXISTS bank_details jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN staff.ni_number IS 'National Insurance Number';
COMMENT ON COLUMN staff.bank_details IS 'Bank account details (sort code, account number, bank name)';
