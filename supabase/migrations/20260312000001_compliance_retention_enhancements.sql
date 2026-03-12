-- Migration: Enhance compliance table for 6-year retention and tiered storage
-- Description: Adds tracking for archiving, retention periods, and storage costs.

-- 1. Add columns to compliance table
ALTER TABLE public.compliance 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_reason TEXT,
ADD COLUMN IF NOT EXISTS retention_until DATE,
ADD COLUMN IF NOT EXISTS storage_tier TEXT DEFAULT 'hot' CHECK (storage_tier IN ('hot', 'cold')),
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

-- 2. Add comment for clarity
COMMENT ON COLUMN public.compliance.retention_until IS 'Legal retention date (e.g., 6 years post-employment). Hard deletion blocked before this date.';

-- 3. Create a function to block premature deletion
CREATE OR REPLACE FUNCTION public.check_document_retention()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow super admins or explicit overrides if needed, but default to blocking
    -- Actually, simple check: if retention_until is in the future, block DELETE
    IF OLD.retention_until IS NOT NULL AND OLD.retention_until > CURRENT_DATE THEN
        RAISE EXCEPTION 'Document cannot be deleted. Legal retention required until %', OLD.retention_until;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger
DROP TRIGGER IF EXISTS tr_compliance_retention_guard ON public.compliance;
CREATE TRIGGER tr_compliance_retention_guard
BEFORE DELETE ON public.compliance
FOR EACH ROW
EXECUTE FUNCTION public.check_document_retention();

-- 5. Index for storage usage reporting
CREATE INDEX IF NOT EXISTS idx_compliance_agency_storage ON public.compliance(agency_id, file_size_bytes) WHERE file_size_bytes IS NOT NULL;
