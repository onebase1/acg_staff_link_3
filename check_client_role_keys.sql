-- ============================================================================
-- Check Client Role Keys Diagnostic
-- ============================================================================
-- Purpose: Find out what role keys are actually stored in the clients table
-- Issue: PostShiftV2 shows "Support Worker" but client has "Care Worker" configured
-- ============================================================================

-- 1. Check what role keys exist in Divine Care Center's rates
SELECT 
  name,
  jsonb_object_keys(contract_terms->'rates_by_role') as role_key
FROM clients
WHERE name ILIKE '%divine%'
ORDER BY name;

-- 2. Check all role keys across ALL clients
SELECT DISTINCT
  jsonb_object_keys(contract_terms->'rates_by_role') as role_key
FROM clients
WHERE contract_terms->'rates_by_role' IS NOT NULL
ORDER BY role_key;

-- 3. Check Divine Care Center's full rates structure
SELECT 
  name,
  contract_terms->'rates_by_role' as rates_by_role
FROM clients
WHERE name ILIKE '%divine%';

-- 4. Check which roles have charge_rate > 0 (should appear in dropdown)
SELECT 
  name,
  jsonb_object_keys(contract_terms->'rates_by_role') as role_key,
  (contract_terms->'rates_by_role'->jsonb_object_keys(contract_terms->'rates_by_role')->>'charge_rate')::numeric as charge_rate
FROM clients
WHERE name ILIKE '%divine%'
  AND (contract_terms->'rates_by_role'->jsonb_object_keys(contract_terms->'rates_by_role')->>'charge_rate')::numeric > 0
ORDER BY role_key;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- If using DEPRECATED keys (care_worker, hca):
--   role_key
--   ----------
--   care_worker
--   hca
--   nurse
--   senior_care_worker
--
-- If using STANDARD keys (from STAFF_ROLES constant):
--   role_key
--   ----------
--   healthcare_assistant
--   nurse
--   senior_care_worker
--   support_worker
--   specialist_nurse
--
-- ============================================================================
-- DIAGNOSIS
-- ============================================================================
-- If you see "care_worker" or "hca" → Client table uses DEPRECATED keys
-- If you see "healthcare_assistant" → Client table uses STANDARD keys
-- 
-- MISMATCH CAUSES:
-- - Clients.jsx saves rates with deprecated keys (care_worker, hca)
-- - PostShiftV2 reads rates using standard keys (healthcare_assistant, support_worker)
-- - Result: Dropdown shows wrong roles or no roles
-- ============================================================================

