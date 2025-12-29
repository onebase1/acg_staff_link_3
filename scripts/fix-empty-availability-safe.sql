-- ====================================================================
-- SAFE VERSION: Fix empty/null availability in staff table
-- This version avoids the "scalar" error by checking types first
-- ====================================================================

-- STEP 1: Fix NULL availability
UPDATE staff
SET availability = jsonb_build_object(
  'monday', jsonb_build_array('day', 'night'),
  'tuesday', jsonb_build_array('day', 'night'),
  'wednesday', jsonb_build_array('day', 'night'),
  'thursday', jsonb_build_array('day', 'night'),
  'friday', jsonb_build_array('day', 'night'),
  'saturday', jsonb_build_array('day', 'night'),
  'sunday', jsonb_build_array('day', 'night')
)
WHERE availability IS NULL;

-- STEP 2: Fix empty object {}
UPDATE staff
SET availability = jsonb_build_object(
  'monday', jsonb_build_array('day', 'night'),
  'tuesday', jsonb_build_array('day', 'night'),
  'wednesday', jsonb_build_array('day', 'night'),
  'thursday', jsonb_build_array('day', 'night'),
  'friday', jsonb_build_array('day', 'night'),
  'saturday', jsonb_build_array('day', 'night'),
  'sunday', jsonb_build_array('day', 'night')
)
WHERE
  availability IS NOT NULL
  AND availability::text = '{}'::text;

-- STEP 3: Fix availability where all days are empty (safely handles scalars)
UPDATE staff
SET availability = jsonb_build_object(
  'monday', jsonb_build_array('day', 'night'),
  'tuesday', jsonb_build_array('day', 'night'),
  'wednesday', jsonb_build_array('day', 'night'),
  'thursday', jsonb_build_array('day', 'night'),
  'friday', jsonb_build_array('day', 'night'),
  'saturday', jsonb_build_array('day', 'night'),
  'sunday', jsonb_build_array('day', 'night')
)
WHERE
  availability IS NOT NULL
  AND jsonb_typeof(availability) = 'object'
  AND availability::text != '{}'::text
  AND (
    -- Safely check each day using jsonb_typeof first
    (jsonb_typeof(availability->'monday') = 'array' AND jsonb_array_length(availability->'monday') = 0)
    OR (availability->'monday' IS NULL)
  )
  AND (
    (jsonb_typeof(availability->'tuesday') = 'array' AND jsonb_array_length(availability->'tuesday') = 0)
    OR (availability->'tuesday' IS NULL)
  )
  AND (
    (jsonb_typeof(availability->'wednesday') = 'array' AND jsonb_array_length(availability->'wednesday') = 0)
    OR (availability->'wednesday' IS NULL)
  )
  AND (
    (jsonb_typeof(availability->'thursday') = 'array' AND jsonb_array_length(availability->'thursday') = 0)
    OR (availability->'thursday' IS NULL)
  )
  AND (
    (jsonb_typeof(availability->'friday') = 'array' AND jsonb_array_length(availability->'friday') = 0)
    OR (availability->'friday' IS NULL)
  )
  AND (
    (jsonb_typeof(availability->'saturday') = 'array' AND jsonb_array_length(availability->'saturday') = 0)
    OR (availability->'saturday' IS NULL)
  )
  AND (
    (jsonb_typeof(availability->'sunday') = 'array' AND jsonb_array_length(availability->'sunday') = 0)
    OR (availability->'sunday' IS NULL)
  );

-- ====================================================================
-- VERIFICATION: Show all staff and their availability status
-- ====================================================================
SELECT
  id,
  first_name,
  last_name,
  email,
  CASE
    WHEN availability IS NULL THEN '❌ NULL'
    WHEN availability::text = '{}' THEN '⚠️ Empty {}'
    WHEN jsonb_typeof(availability) = 'object' THEN
      CASE
        WHEN (availability->'monday' IS NOT NULL AND jsonb_array_length(availability->'monday') > 0) THEN '✅ Has Availability'
        ELSE '⚠️ Empty Days'
      END
    ELSE '⚠️ Invalid Type'
  END as status,
  availability
FROM staff
ORDER BY created_date DESC;
