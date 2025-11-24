-- ============================================================================
-- AUTOMATED INVOICE GENERATION (INDUSTRY STANDARD PATTERN)
-- ============================================================================
-- Pattern: Weekly healthcare staffing billing (Monday 6am)
-- Matches: Stripe recurring billing, Xero auto-invoicing, QuickBooks Online
-- ============================================================================

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- CRON JOB: Weekly Invoice Generation
-- ============================================================================
-- Schedule: Every Monday at 6:00 AM
-- Function: auto-invoice-generator
-- Mode: AUTO (scans all approved timesheets from past 7 days)
-- ============================================================================

SELECT cron.schedule(
    'auto-invoice-generator-weekly',          -- Job name
    '0 6 * * 1',                               -- Every Monday at 6am (healthcare standard)
    $$
    SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/auto-invoice-generator',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
        ),
        body := jsonb_build_object(
            'auto_mode', true,
            'period_start', (CURRENT_DATE - INTERVAL '7 days')::text,
            'period_end', CURRENT_DATE::text
        )
    ) AS request_id;
    $$
);

-- ============================================================================
-- ALTERNATIVE: Monthly Invoice Generation (Commented Out)
-- ============================================================================
-- Uncomment this if you prefer monthly billing instead of weekly
-- Schedule: 1st of every month at 6:00 AM
-- ============================================================================

/*
SELECT cron.schedule(
    'auto-invoice-generator-monthly',
    '0 6 1 * *',                               -- 1st day of month at 6am
    $$
    SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/auto-invoice-generator',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo'
        ),
        body := jsonb_build_object(
            'auto_mode', true,
            'period_start', (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::text,
            'period_end', (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::text
        )
    ) AS request_id;
    $$
);
*/

-- ============================================================================
-- MONITORING QUERIES
-- ============================================================================

-- View invoice automation status
COMMENT ON SCHEMA cron IS 'To check if invoice automation is running: SELECT * FROM cron_job_status WHERE jobname LIKE ''%invoice%'';';

-- View recent invoice automation runs
COMMENT ON EXTENSION pg_cron IS 'To see recent invoice generation runs: SELECT * FROM cron_job_runs WHERE jobname LIKE ''%invoice%'' AND start_time > NOW() - INTERVAL ''7 days'';';

-- Manually trigger invoice generation (testing)
COMMENT ON FUNCTION net.http_post IS 'To manually test invoice generation, copy the command from cron.job table and execute it directly.';

-- ============================================================================
-- PRODUCTION NOTES
-- ============================================================================
-- 1. Weekly is standard for healthcare staffing agencies (faster cash flow)
-- 2. Monthly is standard for SaaS/subscription businesses
-- 3. To switch: Unschedule weekly, uncomment and run monthly
-- 4. To unschedule: SELECT cron.unschedule('auto-invoice-generator-weekly');
-- 5. Payment reminders already configured (payment-reminder-engine runs daily)
-- ============================================================================

