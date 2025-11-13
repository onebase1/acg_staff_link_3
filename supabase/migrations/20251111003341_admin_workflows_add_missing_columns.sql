-- Migration: Add missing columns to admin_workflows
-- Generated: 2025-11-11 00:33:41
-- Missing columns: 11

-- Add missing columns to admin_workflows table
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

-- Migration completed
