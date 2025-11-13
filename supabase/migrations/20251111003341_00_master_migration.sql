-- MASTER MIGRATION FILE
-- Generated: 2025-11-11 00:33:41
-- Total missing columns: 214
-- Total tables: 15

-- This file combines all individual table migrations
-- You can run this file directly or run individual table migrations


-- ============================================================================
-- TABLE: agencies (16 columns)
-- ============================================================================

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


-- ============================================================================
-- TABLE: profiles (2 columns)
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ;
COMMENT ON COLUMN profiles.created_date IS 'Auto-generated';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT;
COMMENT ON COLUMN profiles.role IS 'admin/user';


-- ============================================================================
-- TABLE: staff (27 columns)
-- ============================================================================

ALTER TABLE staff ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN staff.created_by IS 'User email';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS whatsapp_pin TEXT;
COMMENT ON COLUMN staff.whatsapp_pin IS '4-digit PIN for WhatsApp auth';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS whatsapp_number_verified TEXT;
COMMENT ON COLUMN staff.whatsapp_number_verified IS 'Verified WhatsApp number (E.164)';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS whatsapp_linked_at TIMESTAMPTZ;
COMMENT ON COLUMN staff.whatsapp_linked_at IS 'When WhatsApp was linked';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS date_of_birth DATE;
COMMENT ON COLUMN staff.date_of_birth IS 'Date of birth';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
COMMENT ON COLUMN staff.profile_photo_url IS 'Professional headshot URL';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS profile_photo_uploaded_date DATE;
COMMENT ON COLUMN staff.profile_photo_uploaded_date IS 'Photo upload date';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS nmc_pin TEXT;
COMMENT ON COLUMN staff.nmc_pin IS 'NMC registration (nurses)';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS nmc_register_part TEXT;
COMMENT ON COLUMN staff.nmc_register_part IS 'NMC register part';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS medication_trained BOOLEAN DEFAULT false;
COMMENT ON COLUMN staff.medication_trained IS 'Medication training status';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS medication_training_expiry DATE;
COMMENT ON COLUMN staff.medication_training_expiry IS 'Training expiry';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS can_work_as_senior BOOLEAN DEFAULT false;
COMMENT ON COLUMN staff.can_work_as_senior IS 'Calculated field';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS role_hierarchy JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN staff.role_hierarchy IS '{can_work_as: []}';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS driving_license_number TEXT;
COMMENT ON COLUMN staff.driving_license_number IS 'License number';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS driving_license_expiry DATE;
COMMENT ON COLUMN staff.driving_license_expiry IS 'License expiry';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
COMMENT ON COLUMN staff.suspension_reason IS 'Reason if suspended';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS employment_history JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN staff.employment_history IS 'Array of employment records';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS references JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN staff.references IS 'Array of reference records';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS occupational_health JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN staff.occupational_health IS 'Health assessment data';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS mandatory_training JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN staff.mandatory_training IS 'Training certificates data';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN staff.skills IS 'Special skills/certifications';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS groups JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN staff.groups IS 'Group references';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS date_joined DATE;
COMMENT ON COLUMN staff.date_joined IS 'Join date';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS proposed_first_shift_date DATE;
COMMENT ON COLUMN staff.proposed_first_shift_date IS 'For new staff';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS months_of_experience NUMERIC;
COMMENT ON COLUMN staff.months_of_experience IS 'Total experience';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS gps_consent BOOLEAN DEFAULT false;
COMMENT ON COLUMN staff.gps_consent IS 'GPS tracking consent';

ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_known_location JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN staff.last_known_location IS '{latitude, longitude, timestamp}';


-- ============================================================================
-- TABLE: clients (8 columns)
-- ============================================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN clients.created_by IS 'User email';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS location_coordinates JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN clients.location_coordinates IS '{latitude, longitude}';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS geofence_enabled BOOLEAN DEFAULT false;
COMMENT ON COLUMN clients.geofence_enabled IS 'Default true';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS cqc_rating TEXT;
COMMENT ON COLUMN clients.cqc_rating IS 'outstanding/good/requires_improvement/inadequate/not_rated';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS bed_capacity NUMERIC;
COMMENT ON COLUMN clients.bed_capacity IS 'Number of beds';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_staff JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN clients.preferred_staff IS 'Preferred staff IDs';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
COMMENT ON COLUMN clients.notes IS 'Internal notes';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_bookings NUMERIC DEFAULT 0;
COMMENT ON COLUMN clients.total_bookings IS 'Booking count';


-- ============================================================================
-- TABLE: shifts (39 columns)
-- ============================================================================

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


-- ============================================================================
-- TABLE: bookings (13 columns)
-- ============================================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN bookings.created_by IS 'User email';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_id TEXT;
COMMENT ON COLUMN bookings.client_id IS 'Client reference';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmed_by_staff_at TIMESTAMPTZ;
COMMENT ON COLUMN bookings.confirmed_by_staff_at IS 'Staff confirmation time';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmed_by_client_at TIMESTAMPTZ;
COMMENT ON COLUMN bookings.confirmed_by_client_at IS 'Client confirmation time';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
COMMENT ON COLUMN bookings.cancellation_reason IS 'Cancellation reason';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
COMMENT ON COLUMN bookings.cancelled_by IS 'staff/client/agency';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
COMMENT ON COLUMN bookings.cancelled_at IS 'When cancelled';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT;
COMMENT ON COLUMN bookings.notes IS 'Booking notes';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS timesheet_id TEXT;
COMMENT ON COLUMN bookings.timesheet_id IS 'Timesheet reference';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rating_by_client NUMERIC;
COMMENT ON COLUMN bookings.rating_by_client IS '1-5 rating';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rating_by_staff NUMERIC;
COMMENT ON COLUMN bookings.rating_by_staff IS '1-5 rating';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS feedback_from_client TEXT;
COMMENT ON COLUMN bookings.feedback_from_client IS 'Client feedback';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS feedback_from_staff TEXT;
COMMENT ON COLUMN bookings.feedback_from_staff IS 'Staff feedback';


-- ============================================================================
-- TABLE: timesheets (16 columns)
-- ============================================================================

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN timesheets.created_by IS 'User email';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS actual_start_time TEXT;
COMMENT ON COLUMN timesheets.actual_start_time IS 'Actual start (HH:MM)';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS actual_end_time TEXT;
COMMENT ON COLUMN timesheets.actual_end_time IS 'Actual end (HH:MM)';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS clock_in_location JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN timesheets.clock_in_location IS '{latitude, longitude, accuracy, timestamp}';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS clock_out_location JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN timesheets.clock_out_location IS '{latitude, longitude, accuracy, timestamp}';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS geofence_distance_meters NUMERIC;
COMMENT ON COLUMN timesheets.geofence_distance_meters IS 'Distance from site';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS geofence_violation_reason TEXT;
COMMENT ON COLUMN timesheets.geofence_violation_reason IS 'Violation reason';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS break_duration_minutes NUMERIC;
COMMENT ON COLUMN timesheets.break_duration_minutes IS 'Break duration';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS client_signature TEXT;
COMMENT ON COLUMN timesheets.client_signature IS 'Digital signature';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS staff_approved_at TIMESTAMPTZ;
COMMENT ON COLUMN timesheets.staff_approved_at IS 'Staff approval time';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS invoice_id TEXT;
COMMENT ON COLUMN timesheets.invoice_id IS 'Invoice reference';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT false;
COMMENT ON COLUMN timesheets.location_verified IS 'GPS verified';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS uploaded_documents JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN timesheets.uploaded_documents IS 'Uploaded documents';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS financial_locked_at TIMESTAMPTZ;
COMMENT ON COLUMN timesheets.financial_locked_at IS 'When locked';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS financial_locked_by TEXT;
COMMENT ON COLUMN timesheets.financial_locked_by IS 'User ID';

ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS financial_snapshot JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN timesheets.financial_snapshot IS 'Immutable financial data';


-- ============================================================================
-- TABLE: invoices (15 columns)
-- ============================================================================

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


-- ============================================================================
-- TABLE: payslips (4 columns)
-- ============================================================================

ALTER TABLE payslips ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN payslips.created_by IS 'User email';

ALTER TABLE payslips ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN payslips.bank_details IS '{account_name, sort_code, account_number}';

ALTER TABLE payslips ADD COLUMN IF NOT EXISTS pdf_url TEXT;
COMMENT ON COLUMN payslips.pdf_url IS 'Generated PDF URL';

ALTER TABLE payslips ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
COMMENT ON COLUMN payslips.paid_at IS 'Payment timestamp';


-- ============================================================================
-- TABLE: compliance (10 columns)
-- ============================================================================

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


-- ============================================================================
-- TABLE: admin_workflows (11 columns)
-- ============================================================================

ALTER TABLE admin_workflows ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN admin_workflows.created_by IS 'User email';

ALTER TABLE admin_workflows ADD COLUMN IF NOT EXISTS type TEXT;
COMMENT ON COLUMN admin_workflows.type IS 'unfilled_urgent_shift/expired_compliance_document/expiring_compliance_document/timesheet_discrepancy/missing_staff_information/payment_issue/client_complaint/staff_no_show/shift_cancellation/other';

ALTER TABLE admin_workflows ADD COLUMN IF NOT EXISTS priority TEXT;
COMMENT ON COLUMN admin_workflows.priority IS 'low/medium/high/critical';

ALTER TABLE admin_workflows ADD COLUMN IF NOT EXISTS title TEXT;
COMMENT ON COLUMN admin_workflows.title IS 'Workflow title';

ALTER TABLE admin_workflows ADD COLUMN IF NOT EXISTS related_entity JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN admin_workflows.related_entity IS '{entity_type, entity_id}';

ALTER TABLE admin_workflows ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
COMMENT ON COLUMN admin_workflows.deadline IS 'Resolution deadline';

ALTER TABLE admin_workflows ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
COMMENT ON COLUMN admin_workflows.resolution_notes IS 'Resolution notes';

ALTER TABLE admin_workflows ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
COMMENT ON COLUMN admin_workflows.resolved_at IS 'Resolution time';

ALTER TABLE admin_workflows ADD COLUMN IF NOT EXISTS resolved_by TEXT;
COMMENT ON COLUMN admin_workflows.resolved_by IS 'Resolver user ID';

ALTER TABLE admin_workflows ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT false;
COMMENT ON COLUMN admin_workflows.auto_created IS 'Auto-created flag';

ALTER TABLE admin_workflows ADD COLUMN IF NOT EXISTS escalation_count NUMERIC DEFAULT 0;
COMMENT ON COLUMN admin_workflows.escalation_count IS 'Escalation count';


-- ============================================================================
-- TABLE: change_logs (12 columns)
-- ============================================================================

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN change_logs.created_by IS 'User email';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS old_value TEXT;
COMMENT ON COLUMN change_logs.old_value IS 'Previous value';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS new_value TEXT;
COMMENT ON COLUMN change_logs.new_value IS 'New value';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS reason TEXT;
COMMENT ON COLUMN change_logs.reason IS 'Change reason';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS changed_by_email TEXT;
COMMENT ON COLUMN change_logs.changed_by_email IS 'User email';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS notifications_sent NUMERIC;
COMMENT ON COLUMN change_logs.notifications_sent IS 'Notification count';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
COMMENT ON COLUMN change_logs.ip_address IS 'User IP';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS risk_level TEXT;
COMMENT ON COLUMN change_logs.risk_level IS 'low/medium/high/critical';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS reviewed BOOLEAN DEFAULT false;
COMMENT ON COLUMN change_logs.reviewed IS 'Review flag';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
COMMENT ON COLUMN change_logs.reviewed_by IS 'Reviewer user ID';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
COMMENT ON COLUMN change_logs.reviewed_at IS 'Review time';

ALTER TABLE change_logs ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN DEFAULT false;
COMMENT ON COLUMN change_logs.flagged_for_review IS 'Flag for review';


-- ============================================================================
-- TABLE: operational_costs (13 columns)
-- ============================================================================

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


-- ============================================================================
-- TABLE: invoice_amendments (22 columns)
-- ============================================================================

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


-- ============================================================================
-- TABLE: notification_queue (6 columns)
-- ============================================================================

ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN notification_queue.created_by IS 'User email';

ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS recipient_first_name TEXT;
COMMENT ON COLUMN notification_queue.recipient_first_name IS 'First name';

ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS pending_items JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN notification_queue.pending_items IS 'Queued notification items';

ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS scheduled_send_at TIMESTAMPTZ;
COMMENT ON COLUMN notification_queue.scheduled_send_at IS 'Scheduled send time';

ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS email_message_id TEXT;
COMMENT ON COLUMN notification_queue.email_message_id IS 'Resend message ID';

ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS item_count NUMERIC DEFAULT 0;
COMMENT ON COLUMN notification_queue.item_count IS 'Number of items';

