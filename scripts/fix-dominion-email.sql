-- ============================================================================
-- FIX DOMINION HEALTHCARE EMAIL
-- ============================================================================
-- Problem: ops@dominion-healthcare.co.uk doesn't exist
-- Solution: Update to a valid email address
--
-- Run this SQL in Supabase Dashboard:
-- https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/sql/new
-- ============================================================================

-- Option 1: Update to a real ops email if you have one
-- UPDATE agencies
-- SET email = 'your-real-ops-email@dominion-healthcare.co.uk'
-- WHERE name ILIKE '%dominion%';

-- Option 2: Use a generic agency email
-- UPDATE agencies
-- SET email = 'admin@dominion-healthcare.co.uk'
-- WHERE name ILIKE '%dominion%';

-- Option 3: If this is a test agency, use a test email
UPDATE agencies
SET email = 'test-admin@example.com'
WHERE name ILIKE '%dominion%';

-- Verify the change
SELECT id, name, email, contact_email, admin_email
FROM agencies
WHERE name ILIKE '%dominion%';
