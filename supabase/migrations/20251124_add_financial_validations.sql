-- Migration: Add Financial Data Validations
-- Created: 2025-11-24
-- Purpose: Prevent financial inconsistencies and data integrity issues

BEGIN;

-- 1. Add CHECK constraint: Approved timesheets must have complete financial data
ALTER TABLE timesheets 
ADD CONSTRAINT check_approved_timesheet_financial_data
CHECK (
  status != 'approved' OR (
    client_charge_amount IS NOT NULL 
    AND client_charge_amount > 0
    AND total_hours IS NOT NULL
    AND total_hours > 0
  )
);

COMMENT ON CONSTRAINT check_approved_timesheet_financial_data ON timesheets IS 
'Ensures approved timesheets have complete financial data (client_charge_amount and total_hours must be present and > 0)';

-- 2. Add CHECK constraint: Sent invoices must have sent_at timestamp
ALTER TABLE invoices
ADD CONSTRAINT check_sent_invoice_has_timestamp
CHECK (
  status != 'sent' OR sent_at IS NOT NULL
);

COMMENT ON CONSTRAINT check_sent_invoice_has_timestamp ON invoices IS
'Ensures sent invoices have sent_at timestamp set';

-- 3. Add CHECK constraint: Invoiced timesheets must be financially locked
ALTER TABLE timesheets
ADD CONSTRAINT check_invoiced_timesheet_locked
CHECK (
  status != 'invoiced' OR financial_locked = true
);

COMMENT ON CONSTRAINT check_invoiced_timesheet_locked ON timesheets IS
'Ensures invoiced timesheets are financially locked';

-- 4. Add CHECK constraint: Prevent "NaN" in actual times
ALTER TABLE timesheets
ADD CONSTRAINT check_actual_times_valid
CHECK (
  (actual_start_time IS NULL OR actual_start_time !~ 'NaN')
  AND (actual_end_time IS NULL OR actual_end_time !~ 'NaN')
);

COMMENT ON CONSTRAINT check_actual_times_valid ON timesheets IS
'Prevents "NaN" values in actual_start_time and actual_end_time fields';

-- 5. Add CHECK constraint: Completed shifts must have charge_rate
ALTER TABLE shifts
ADD CONSTRAINT check_completed_shift_has_rates
CHECK (
  status NOT IN ('completed', 'awaiting_admin_closure') 
  OR (charge_rate IS NOT NULL AND pay_rate IS NOT NULL)
);

COMMENT ON CONSTRAINT check_completed_shift_has_rates ON shifts IS
'Ensures completed/closing shifts have charge_rate and pay_rate set';

COMMIT;

