-- ============================================================================
-- ADD INTELLIGENT TIMESHEET VALIDATOR COLUMNS
-- ============================================================================
-- Purpose: Support intelligent-timesheet-validator Edge Function
-- Date: 2025-11-19
-- Required for: Auto-approval logic, GPS-based shift completion
-- ============================================================================

-- Add validation tracking columns to timesheets table
ALTER TABLE timesheets 
ADD COLUMN IF NOT EXISTS validation_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS validation_decision TEXT,
ADD COLUMN IF NOT EXISTS validation_issues JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS validation_warnings JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN timesheets.validation_completed_at IS 
'Timestamp when intelligent-timesheet-validator completed analysis';

COMMENT ON COLUMN timesheets.validation_decision IS 
'Validator decision: auto_approve | auto_approve_with_notes | flag_for_review | escalate_to_admin';

COMMENT ON COLUMN timesheets.validation_issues IS 
'Array of validation issues: [{severity: "critical|high|medium|low", type: string, message: string}]';

COMMENT ON COLUMN timesheets.validation_warnings IS 
'Array of validation warnings: [{severity: "low|medium", type: string, message: string}]';

COMMENT ON COLUMN timesheets.auto_approved IS 
'True if timesheet was auto-approved by intelligent validator (no admin review needed)';

COMMENT ON COLUMN timesheets.approval_notes IS 
'Auto-generated notes explaining approval decision (e.g., "Auto-approved with minor warnings: 0.25h variance")';

-- Create index for querying auto-approved timesheets
CREATE INDEX IF NOT EXISTS idx_timesheets_auto_approved 
ON timesheets(auto_approved) 
WHERE auto_approved = true;

-- Create index for querying validation decisions
CREATE INDEX IF NOT EXISTS idx_timesheets_validation_decision 
ON timesheets(validation_decision) 
WHERE validation_decision IS NOT NULL;

-- Migration completed

