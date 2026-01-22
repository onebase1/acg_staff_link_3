-- Migration: Add compliance rejection trigger
-- Purpose: Automatically queue a notification when a document is rejected

CREATE OR REPLACE FUNCTION handle_compliance_rejection()
RETURNS TRIGGER AS $$
DECLARE
    v_staff_email TEXT;
    v_staff_name TEXT;
    v_item JSONB;
BEGIN
    -- Only trigger if status changes to 'rejected'
    IF (NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected')) THEN
        
        -- Get staff details
        SELECT email, first_name INTO v_staff_email, v_staff_name
        FROM staff
        WHERE id = NEW.staff_id;

        IF v_staff_email IS NOT NULL THEN
            -- Prepare notification item
            v_item := jsonb_build_object(
                'document_name', NEW.document_name,
                'rejection_reason', NEW.notes,
                'rejected_at', NOW()
            );

            -- Queue notification with 5-minute batching (default p_scheduled_delay)
            PERFORM queue_notification(
                NEW.agency_id::UUID,
                v_staff_email,
                v_staff_name,
                'staff',
                'compliance_rejection',
                v_item
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_compliance_rejected ON compliance;
CREATE TRIGGER on_compliance_rejected
    AFTER UPDATE ON compliance
    FOR EACH ROW
    EXECUTE FUNCTION handle_compliance_rejection();

-- Grant permissions if needed
GRANT ALL ON TABLE compliance TO service_role;
