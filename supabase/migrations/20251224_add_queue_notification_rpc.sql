-- Migration: Add queue_notification helper function
-- Purpose: Handles atomic batching of notifications into the notification_queue

CREATE OR REPLACE FUNCTION queue_notification(
    p_agency_id UUID,
    p_recipient_email TEXT,
    p_recipient_first_name TEXT,
    p_recipient_type TEXT,
    p_notification_type TEXT,
    p_item JSONB,
    p_scheduled_delay INTERVAL DEFAULT INTERVAL '5 minutes'
)
RETURNS UUID AS $$
DECLARE
    v_queue_id UUID;
BEGIN
    -- 1. Try to find an existing pending queue record for this recipient + type
    SELECT id INTO v_queue_id
    FROM notification_queue
    WHERE agency_id = p_agency_id
      AND recipient_email = p_recipient_email
      AND notification_type = p_notification_type
      AND status = 'pending'
    LIMIT 1;

    IF v_queue_id IS NOT NULL THEN
        -- 2. Update existing record: Append item and increment count
        UPDATE notification_queue
        SET 
            pending_items = pending_items || p_item,
            item_count = item_count + 1,
            recipient_first_name = COALESCE(recipient_first_name, p_recipient_first_name)
        WHERE id = v_queue_id;
    ELSE
        -- 3. Create new record
        INSERT INTO notification_queue (
            agency_id,
            recipient_email,
            recipient_first_name,
            recipient_type,
            notification_type,
            message,
            pending_items,
            item_count,
            scheduled_send_at
        ) VALUES (
            p_agency_id,
            p_recipient_email,
            p_recipient_first_name,
            p_recipient_type,
            p_notification_type,
            'You have new notifications', -- Default message
            jsonb_build_array(p_item),
            1,
            NOW() + p_scheduled_delay
        )
        RETURNING id INTO v_queue_id;
    END IF;

    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION queue_notification(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, INTERVAL) TO service_role;
