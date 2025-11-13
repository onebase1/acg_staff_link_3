-- Migration: Add missing columns to operational_costs
-- Generated: 2025-11-11 00:33:41
-- Missing columns: 13

-- Add missing columns to operational_costs table
ALTER TABLE operational_costs ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN operational_costs.created_by IS 'User email';

ALTER TABLE operational_costs ADD COLUMN IF NOT EXISTS service_name TEXT;
COMMENT ON COLUMN operational_costs.service_name IS 'Service name';

ALTER TABLE operational_costs ADD COLUMN IF NOT EXISTS service_category TEXT;
COMMENT ON COLUMN operational_costs.service_category IS 'communication/ai_automation/platform_hosting/payment_processing/compliance_verification/storage/other';

ALTER TABLE operational_costs ADD COLUMN IF NOT EXISTS billing_period DATE;
COMMENT ON COLUMN operational_costs.billing_period IS 'Billing period start';

ALTER TABLE operational_costs ADD COLUMN IF NOT EXISTS currency TEXT;
COMMENT ON COLUMN operational_costs.currency IS 'GBP/USD/EUR';

ALTER TABLE operational_costs ADD COLUMN IF NOT EXISTS usage_metrics JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN operational_costs.usage_metrics IS '{sms_sent, whatsapp_messages, emails_sent, ai_tokens_used, storage_gb, active_users}';

ALTER TABLE operational_costs ADD COLUMN IF NOT EXISTS invoice_url TEXT;
COMMENT ON COLUMN operational_costs.invoice_url IS 'Invoice/receipt URL';

ALTER TABLE operational_costs ADD COLUMN IF NOT EXISTS paid_date DATE;
COMMENT ON COLUMN operational_costs.paid_date IS 'Payment date';

ALTER TABLE operational_costs ADD COLUMN IF NOT EXISTS status TEXT;
COMMENT ON COLUMN operational_costs.status IS 'pending/paid/overdue/cancelled';

ALTER TABLE operational_costs ADD COLUMN IF NOT EXISTS notes TEXT;
COMMENT ON COLUMN operational_costs.notes IS 'Cost notes';

ALTER TABLE operational_costs ADD COLUMN IF NOT EXISTS projected_cost NUMERIC;
COMMENT ON COLUMN operational_costs.projected_cost IS 'Estimated next period';

ALTER TABLE operational_costs ADD COLUMN IF NOT EXISTS cost_per_shift NUMERIC;
COMMENT ON COLUMN operational_costs.cost_per_shift IS 'Calculated per-shift cost';

ALTER TABLE operational_costs ADD COLUMN IF NOT EXISTS roi_impact TEXT;
COMMENT ON COLUMN operational_costs.roi_impact IS 'critical/high/medium/low';

-- Migration completed
