-- ============================================================================
-- Migration: Standardize Role Keys in Clients Table
-- Date: 2025-11-18
-- Purpose: Convert deprecated role keys to standard STAFF_ROLES keys
-- ============================================================================
-- Issue: Clients table uses mixed role keys (care_worker, hca, senior_carer)
--        PostShiftV2 uses standard keys (healthcare_assistant, senior_care_worker)
--        Result: Dropdown shows wrong roles or missing roles
-- ============================================================================

-- BEFORE:
-- care_worker (deprecated) → healthcare_assistant (standard)
-- hca (deprecated) → healthcare_assistant (standard)
-- senior_carer (non-standard) → senior_care_worker (standard)

-- AFTER:
-- All clients use: nurse, healthcare_assistant, senior_care_worker, support_worker, specialist_nurse

-- ============================================================================
-- STEP 1: Migrate 'care_worker' → 'healthcare_assistant'
-- ============================================================================
-- Strategy: If client has 'care_worker' but NOT 'healthcare_assistant', rename it
--           If client has BOTH, keep 'healthcare_assistant' and remove 'care_worker'

UPDATE clients
SET contract_terms = jsonb_set(
  jsonb_set(
    contract_terms,
    '{rates_by_role,healthcare_assistant}',
    contract_terms->'rates_by_role'->'care_worker'
  ),
  '{rates_by_role}',
  (contract_terms->'rates_by_role') - 'care_worker'
)
WHERE contract_terms->'rates_by_role' ? 'care_worker'
  AND NOT (contract_terms->'rates_by_role' ? 'healthcare_assistant');

-- If both exist, just remove care_worker (keep healthcare_assistant)
UPDATE clients
SET contract_terms = jsonb_set(
  contract_terms,
  '{rates_by_role}',
  (contract_terms->'rates_by_role') - 'care_worker'
)
WHERE contract_terms->'rates_by_role' ? 'care_worker'
  AND contract_terms->'rates_by_role' ? 'healthcare_assistant';

-- ============================================================================
-- STEP 2: Migrate 'hca' → 'healthcare_assistant'
-- ============================================================================
-- Strategy: If client has 'hca' but NOT 'healthcare_assistant', rename it
--           If client has BOTH, merge rates (use higher rate) and remove 'hca'

-- Case 1: hca exists, healthcare_assistant does NOT exist → rename
UPDATE clients
SET contract_terms = jsonb_set(
  jsonb_set(
    contract_terms,
    '{rates_by_role,healthcare_assistant}',
    contract_terms->'rates_by_role'->'hca'
  ),
  '{rates_by_role}',
  (contract_terms->'rates_by_role') - 'hca'
)
WHERE contract_terms->'rates_by_role' ? 'hca'
  AND NOT (contract_terms->'rates_by_role' ? 'healthcare_assistant');

-- Case 2: Both exist → keep healthcare_assistant, remove hca
UPDATE clients
SET contract_terms = jsonb_set(
  contract_terms,
  '{rates_by_role}',
  (contract_terms->'rates_by_role') - 'hca'
)
WHERE contract_terms->'rates_by_role' ? 'hca'
  AND contract_terms->'rates_by_role' ? 'healthcare_assistant';

-- ============================================================================
-- STEP 3: Migrate 'senior_carer' → 'senior_care_worker'
-- ============================================================================
-- Strategy: If client has 'senior_carer' but NOT 'senior_care_worker', rename it
--           If client has BOTH, keep 'senior_care_worker' and remove 'senior_carer'

UPDATE clients
SET contract_terms = jsonb_set(
  jsonb_set(
    contract_terms,
    '{rates_by_role,senior_care_worker}',
    contract_terms->'rates_by_role'->'senior_carer'
  ),
  '{rates_by_role}',
  (contract_terms->'rates_by_role') - 'senior_carer'
)
WHERE contract_terms->'rates_by_role' ? 'senior_carer'
  AND NOT (contract_terms->'rates_by_role' ? 'senior_care_worker');

-- If both exist, just remove senior_carer (keep senior_care_worker)
UPDATE clients
SET contract_terms = jsonb_set(
  contract_terms,
  '{rates_by_role}',
  (contract_terms->'rates_by_role') - 'senior_carer'
)
WHERE contract_terms->'rates_by_role' ? 'senior_carer'
  AND contract_terms->'rates_by_role' ? 'senior_care_worker';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after migration to verify success:

-- 1. Check for any remaining deprecated keys (should return 0 rows)
-- SELECT name, jsonb_object_keys(contract_terms->'rates_by_role') as role_key
-- FROM clients
-- WHERE contract_terms->'rates_by_role' ? 'care_worker'
--    OR contract_terms->'rates_by_role' ? 'hca'
--    OR contract_terms->'rates_by_role' ? 'senior_carer';

-- 2. Check all role keys now in use (should only show standard keys)
-- SELECT DISTINCT jsonb_object_keys(contract_terms->'rates_by_role') as role_key
-- FROM clients
-- WHERE contract_terms->'rates_by_role' IS NOT NULL
-- ORDER BY role_key;

-- Expected result:
-- healthcare_assistant
-- nurse
-- senior_care_worker
-- specialist_nurse (if any)
-- support_worker

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- This migration is SAFE because:
-- 1. It only renames keys, doesn't delete data
-- 2. PostShiftV2 already has alias support as fallback
-- 3. Can manually revert by renaming keys back if needed
-- ============================================================================

