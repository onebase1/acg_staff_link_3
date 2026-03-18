-- Migration to add a dedicated toggle for Normal Daily Marketplace Digests
-- This ensures complete isolation from the smart_marketplace_digest settings.

-- Add the new setting to the JSONB automation_settings column.
-- By default turning it ON (true) to ensure the 4:00 PM cron works out of the box.

CREATE OR REPLACE FUNCTION add_daily_marketplace_digest_setting()
RETURNS void AS $$
DECLARE
    agency_record RECORD;
BEGIN
    FOR agency_record IN SELECT id, settings FROM agencies
    LOOP
        -- Ensure automation_settings exists and then insert/update the new key
        UPDATE agencies 
        SET settings = jsonb_set(
            COALESCE(settings, '{}'::jsonb), 
            '{automation_settings}', 
            COALESCE(settings->'automation_settings', '{}'::jsonb) || '{"use_daily_marketplace_digest": true}'::jsonb
        )
        WHERE id = agency_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the backfill function
SELECT add_daily_marketplace_digest_setting();

-- Drop the function after use
DROP FUNCTION add_daily_marketplace_digest_setting();
