-- Migration: Add missing columns to agencies
-- Generated: 2025-11-11 00:33:41
-- Missing columns: 16

-- Add missing columns to agencies table
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN agencies.created_by IS 'User email';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS registration_number TEXT;
COMMENT ON COLUMN agencies.registration_number IS 'Companies House number';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS contact_email TEXT;
COMMENT ON COLUMN agencies.contact_email IS 'Contact email';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS contact_phone TEXT;
COMMENT ON COLUMN agencies.contact_phone IS 'Phone number';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS subscription_tier TEXT;
COMMENT ON COLUMN agencies.subscription_tier IS 'starter/professional/enterprise';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS dbs_check_expiry_alerts BOOLEAN DEFAULT false;
COMMENT ON COLUMN agencies.dbs_check_expiry_alerts IS 'Notification setting';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS mandatory_training_reminders BOOLEAN DEFAULT false;
COMMENT ON COLUMN agencies.mandatory_training_reminders IS 'Notification setting';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS document_expiry_warnings BOOLEAN DEFAULT false;
COMMENT ON COLUMN agencies.document_expiry_warnings IS 'Notification setting';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS auto_approve_timesheets BOOLEAN DEFAULT false;
COMMENT ON COLUMN agencies.auto_approve_timesheets IS 'Automation setting';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS sms_shift_confirmations BOOLEAN DEFAULT false;
COMMENT ON COLUMN agencies.sms_shift_confirmations IS 'Communication setting';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS whatsapp_notifications BOOLEAN DEFAULT false;
COMMENT ON COLUMN agencies.whatsapp_notifications IS 'Communication setting';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS auto_generate_invoices BOOLEAN DEFAULT false;
COMMENT ON COLUMN agencies.auto_generate_invoices IS 'Automation setting';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS send_payment_reminders BOOLEAN DEFAULT false;
COMMENT ON COLUMN agencies.send_payment_reminders IS 'Automation setting';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT false;
COMMENT ON COLUMN agencies.email_notifications IS 'Notification setting';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT false;
COMMENT ON COLUMN agencies.sms_notifications IS 'Notification setting';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS whatsapp_global_notifications BOOLEAN DEFAULT false;
COMMENT ON COLUMN agencies.whatsapp_global_notifications IS 'Notification setting';

-- Migration completed
