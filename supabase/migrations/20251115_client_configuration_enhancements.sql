-- Migration: Client Configuration Enhancements
-- Date: 2025-11-15
-- Purpose: Add shift window configuration and enabled roles tracking

-- ============================================================================
-- 1. Add shift_window_type to clients table
-- ============================================================================
-- Determines if 12-hour shifts use 7-7 or 8-8 windows
-- 99% of clients use 8-8, but some use 7-7

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS shift_window_type TEXT DEFAULT '8_to_8' CHECK (shift_window_type IN ('7_to_7', '8_to_8'));

COMMENT ON COLUMN clients.shift_window_type IS 'Shift window configuration: 7_to_7 (07:00-19:00/19:00-07:00) or 8_to_8 (08:00-20:00/20:00-08:00). Default: 8_to_8';

-- ============================================================================
-- 2. Add enabled_roles to clients table
-- ============================================================================
-- Tracks which roles are configured and available for this client
-- Only roles with charge_rate > 0 should be enabled
-- Format: { "nurse": true, "healthcare_assistant": true, "senior_care_worker": false }

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS enabled_roles JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN clients.enabled_roles IS 'Roles enabled for this client with configured rates. Only enabled roles can be used for shift creation.';

-- ============================================================================
-- 3. Update existing clients with default values
-- ============================================================================

-- Set shift_window_type to 8_to_8 for all existing clients (99% use this)
UPDATE clients 
SET shift_window_type = '8_to_8' 
WHERE shift_window_type IS NULL;

-- Derive enabled_roles from existing rates_by_role
-- A role is enabled if it has a charge_rate > 0
UPDATE clients
SET enabled_roles = (
  SELECT jsonb_object_agg(
    role_key,
    CASE 
      WHEN (role_value->>'charge_rate')::numeric > 0 THEN true
      ELSE false
    END
  )
  FROM jsonb_each(contract_terms->'rates_by_role') AS rates(role_key, role_value)
)
WHERE contract_terms->'rates_by_role' IS NOT NULL
  AND jsonb_typeof(contract_terms->'rates_by_role') = 'object';

-- For clients with advanced_rate_card, check if any rate type has charge_rate > 0
UPDATE clients
SET enabled_roles = (
  SELECT jsonb_object_agg(
    role_key,
    CASE 
      WHEN EXISTS (
        SELECT 1 
        FROM jsonb_each(role_value) AS rate_types(rate_type_key, rate_type_value)
        WHERE (rate_type_value->>'charge_rate')::numeric > 0
      ) THEN true
      ELSE false
    END
  )
  FROM jsonb_each(contract_terms->'advanced_rate_card'->'rate_structure') AS rates(role_key, role_value)
)
WHERE contract_terms->'advanced_rate_card'->>'enabled' = 'true'
  AND contract_terms->'advanced_rate_card'->'rate_structure' IS NOT NULL;

-- ============================================================================
-- 4. Create index for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_clients_shift_window_type ON clients(shift_window_type);
CREATE INDEX IF NOT EXISTS idx_clients_enabled_roles ON clients USING GIN(enabled_roles);

-- ============================================================================
-- 5. Verification queries
-- ============================================================================

-- Check shift window distribution
-- SELECT shift_window_type, COUNT(*) as count FROM clients GROUP BY shift_window_type;

-- Check enabled roles
-- SELECT name, enabled_roles FROM clients WHERE enabled_roles IS NOT NULL;

-- Migration complete

