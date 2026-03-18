-- Migration to add the daily cron job for the normal marketplace digest
-- Scheduled to run every day at 4:30 PM UTC (which corresponds to 4:30/5:30 PM UK depending on DST, 
-- but we will use the PG cron string for 16:00 to aim for 4:00 PM)

-- Ensure pg_net is available for edge function calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule if it already exists to be safe
SELECT cron.unschedule('daily-normal-marketplace-digest');

-- Create a helper function to gather normal shifts and invoke the edge function
CREATE OR REPLACE FUNCTION exec_daily_normal_marketplace_digest()
RETURNS void AS $$
DECLARE
    v_url text;
    v_auth_header text;
    v_agency RECORD;
    v_shift_ids uuid[];
BEGIN
    -- Get project URL from vault or use placeholder for local dev. 
    -- In production, the service role key should be stored securely.
    -- Assuming a standard pattern where the edge function is called via net.http_post
    -- We will call the function FOR EACH AGENCY that has normal shifts pending broadcast.

    FOR v_agency IN 
        SELECT DISTINCT s.agency_id 
        FROM shifts s
        WHERE s.marketplace_visible = true 
          AND s.status = 'open' 
          AND s.urgency = 'normal' 
          AND s.broadcast_sent_at IS NULL
    LOOP
        -- Collect the pending shift IDs for this agency
        SELECT array_agg(id) INTO v_shift_ids
        FROM shifts
        WHERE agency_id = v_agency.agency_id
          AND marketplace_visible = true 
          AND status = 'open' 
          AND urgency = 'normal' 
          AND broadcast_sent_at IS NULL;

        IF array_length(v_shift_ids, 1) > 0 THEN
            -- We invoke the normal-marketplace-digest edge function
            -- Passing the specific shift_ids and agency_id
            -- NOTE: In a real production environment, you might use an API gateway or an overarching 'cron-watchdog'
            -- To simplify this migration, we are assuming the overarching 'auto-urgent-digest-broadcaster' pattern, 
            -- where a separate edge function acts as the cron sweeping mechanism.
            -- WAIT, let's create a dedicated edge function 'auto-daily-normal-digest' to perform the sweep,
            -- OR just do the sweep entirely in SQL and call net.http_post.
            -- Let's stick to the edge function sweep pattern for consistency.
            RAISE NOTICE 'Agency % has % pending normal shifts. Creating sweeping edge function is cleaner.', v_agency.agency_id, array_length(v_shift_ids, 1);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Actually, looking at the previous architecture `auto-urgent-digest-broadcaster` is an Edge Function
-- that is invoked by pg_cron. We will create `auto-daily-normal-digest` edge function 
-- and just call THAT once a day at 16:00 (4:00 PM).

SELECT cron.schedule(
  'daily-normal-marketplace-digest',
  '0 16 * * *', -- At 16:00 (4:00 PM) every day
  $$
    SELECT net.http_post(
        url := current_setting('app.settings.edge_function_url', true) || '/auto-daily-normal-digest',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{}'::jsonb
    );
  $$
);
