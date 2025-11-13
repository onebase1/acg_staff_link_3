-- Migration: Add missing columns to shifts
-- Generated: 2025-11-11 00:33:41
-- Missing columns: 39

-- Add missing columns to shifts table
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN shifts.created_by IS 'User email';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS booking_id TEXT;
COMMENT ON COLUMN shifts.booking_id IS 'Booking reference';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS timesheet_id TEXT;
COMMENT ON COLUMN shifts.timesheet_id IS 'Timesheet reference';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS timesheet_received BOOLEAN DEFAULT false;
COMMENT ON COLUMN shifts.timesheet_received IS 'Timesheet received flag';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS timesheet_received_at TIMESTAMPTZ;
COMMENT ON COLUMN shifts.timesheet_received_at IS 'When received';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS timesheet_reminder_sent BOOLEAN DEFAULT false;
COMMENT ON COLUMN shifts.timesheet_reminder_sent IS 'Reminder sent flag';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS timesheet_reminder_sent_at TIMESTAMPTZ;
COMMENT ON COLUMN shifts.timesheet_reminder_sent_at IS 'When sent';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS pay_rate_override JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN shifts.pay_rate_override IS 'Override details';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS marketplace_visible BOOLEAN DEFAULT false;
COMMENT ON COLUMN shifts.marketplace_visible IS 'Marketplace flag';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS marketplace_added_at TIMESTAMPTZ;
COMMENT ON COLUMN shifts.marketplace_added_at IS 'When added';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN shifts.requirements IS 'Shift requirements';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS recurring BOOLEAN DEFAULT false;
COMMENT ON COLUMN shifts.recurring IS 'Recurring flag';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT;
COMMENT ON COLUMN shifts.recurrence_pattern IS 'daily/weekly/biweekly/monthly';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS shift_started_at TIMESTAMPTZ;
COMMENT ON COLUMN shifts.shift_started_at IS 'Actual start';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS shift_ended_at TIMESTAMPTZ;
COMMENT ON COLUMN shifts.shift_ended_at IS 'Actual end';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS verification_workflow_id TEXT;
COMMENT ON COLUMN shifts.verification_workflow_id IS 'AdminWorkflow reference';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS actual_staff_id TEXT;
COMMENT ON COLUMN shifts.actual_staff_id IS 'Actual staff worked';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS reassignment_history JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN shifts.reassignment_history IS 'Reassignment records';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
COMMENT ON COLUMN shifts.cancellation_reason IS 'Cancellation reason';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
COMMENT ON COLUMN shifts.cancelled_by IS 'staff/client/agency';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
COMMENT ON COLUMN shifts.cancelled_at IS 'When cancelled';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT false;
COMMENT ON COLUMN shifts.reminder_24h_sent IS '24h reminder flag';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ;
COMMENT ON COLUMN shifts.reminder_24h_sent_at IS 'When sent';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS reminder_2h_sent BOOLEAN DEFAULT false;
COMMENT ON COLUMN shifts.reminder_2h_sent IS '2h reminder flag';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS reminder_2h_sent_at TIMESTAMPTZ;
COMMENT ON COLUMN shifts.reminder_2h_sent_at IS 'When sent';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS approaching_staff_location JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN shifts.approaching_staff_location IS 'GPS data';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS admin_closure_required BOOLEAN DEFAULT false;
COMMENT ON COLUMN shifts.admin_closure_required IS 'Admin closure flag';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS staff_confirmed_completion BOOLEAN DEFAULT false;
COMMENT ON COLUMN shifts.staff_confirmed_completion IS 'Staff confirmation flag';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS staff_confirmation_requested_at TIMESTAMPTZ;
COMMENT ON COLUMN shifts.staff_confirmation_requested_at IS 'When requested';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS staff_confirmed_at TIMESTAMPTZ;
COMMENT ON COLUMN shifts.staff_confirmed_at IS 'When confirmed';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS staff_confirmation_method TEXT;
COMMENT ON COLUMN shifts.staff_confirmation_method IS 'sms_reply/auto_high_confidence/manual_admin';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS staff_confirmation_confidence_score NUMERIC;
COMMENT ON COLUMN shifts.staff_confirmation_confidence_score IS '0-100';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS replaced_shift_id TEXT;
COMMENT ON COLUMN shifts.replaced_shift_id IS 'Replacement reference';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS is_replacement BOOLEAN DEFAULT false;
COMMENT ON COLUMN shifts.is_replacement IS 'Replacement flag';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
COMMENT ON COLUMN shifts.archived IS 'Archive flag';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
COMMENT ON COLUMN shifts.archived_at IS 'When archived';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS financial_locked_at TIMESTAMPTZ;
COMMENT ON COLUMN shifts.financial_locked_at IS 'When locked';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS financial_locked_by TEXT;
COMMENT ON COLUMN shifts.financial_locked_by IS 'User ID';

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS financial_snapshot JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN shifts.financial_snapshot IS 'Immutable financial data';

-- Migration completed
