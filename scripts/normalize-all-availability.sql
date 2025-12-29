-- ====================================================================
-- NORMALIZE ALL AVAILABILITY: Convert variants to standard array format
-- Then set defaults for any empty values
-- ====================================================================

-- STEP 1: Normalize boolean/scalar weekday values to arrays
-- Transform: true -> ["day","night"], false -> [], string -> [string]
UPDATE staff
SET availability = jsonb_build_object(
  'monday',
  CASE
    WHEN jsonb_typeof(availability->'monday') = 'boolean' THEN
      CASE WHEN (availability->>'monday')::boolean THEN jsonb_build_array('day', 'night') ELSE jsonb_build_array() END
    WHEN jsonb_typeof(availability->'monday') = 'string' THEN jsonb_build_array(availability->>'monday')
    WHEN jsonb_typeof(availability->'monday') = 'array' THEN availability->'monday'
    ELSE jsonb_build_array('day', 'night')
  END,
  'tuesday',
  CASE
    WHEN jsonb_typeof(availability->'tuesday') = 'boolean' THEN
      CASE WHEN (availability->>'tuesday')::boolean THEN jsonb_build_array('day', 'night') ELSE jsonb_build_array() END
    WHEN jsonb_typeof(availability->'tuesday') = 'string' THEN jsonb_build_array(availability->>'tuesday')
    WHEN jsonb_typeof(availability->'tuesday') = 'array' THEN availability->'tuesday'
    ELSE jsonb_build_array('day', 'night')
  END,
  'wednesday',
  CASE
    WHEN jsonb_typeof(availability->'wednesday') = 'boolean' THEN
      CASE WHEN (availability->>'wednesday')::boolean THEN jsonb_build_array('day', 'night') ELSE jsonb_build_array() END
    WHEN jsonb_typeof(availability->'wednesday') = 'string' THEN jsonb_build_array(availability->>'wednesday')
    WHEN jsonb_typeof(availability->'wednesday') = 'array' THEN availability->'wednesday'
    ELSE jsonb_build_array('day', 'night')
  END,
  'thursday',
  CASE
    WHEN jsonb_typeof(availability->'thursday') = 'boolean' THEN
      CASE WHEN (availability->>'thursday')::boolean THEN jsonb_build_array('day', 'night') ELSE jsonb_build_array() END
    WHEN jsonb_typeof(availability->'thursday') = 'string' THEN jsonb_build_array(availability->>'thursday')
    WHEN jsonb_typeof(availability->'thursday') = 'array' THEN availability->'thursday'
    ELSE jsonb_build_array('day', 'night')
  END,
  'friday',
  CASE
    WHEN jsonb_typeof(availability->'friday') = 'boolean' THEN
      CASE WHEN (availability->>'friday')::boolean THEN jsonb_build_array('day', 'night') ELSE jsonb_build_array() END
    WHEN jsonb_typeof(availability->'friday') = 'string' THEN jsonb_build_array(availability->>'friday')
    WHEN jsonb_typeof(availability->'friday') = 'array' THEN availability->'friday'
    ELSE jsonb_build_array('day', 'night')
  END,
  'saturday',
  CASE
    WHEN jsonb_typeof(availability->'saturday') = 'boolean' THEN
      CASE WHEN (availability->>'saturday')::boolean THEN jsonb_build_array('day', 'night') ELSE jsonb_build_array() END
    WHEN jsonb_typeof(availability->'saturday') = 'string' THEN jsonb_build_array(availability->>'saturday')
    WHEN jsonb_typeof(availability->'saturday') = 'array' THEN availability->'saturday'
    ELSE jsonb_build_array('day', 'night')
  END,
  'sunday',
  CASE
    WHEN jsonb_typeof(availability->'sunday') = 'boolean' THEN
      CASE WHEN (availability->>'sunday')::boolean THEN jsonb_build_array('day', 'night') ELSE jsonb_build_array() END
    WHEN jsonb_typeof(availability->'sunday') = 'string' THEN jsonb_build_array(availability->>'sunday')
    WHEN jsonb_typeof(availability->'sunday') = 'array' THEN availability->'sunday'
    ELSE jsonb_build_array('day', 'night')
  END
)
WHERE availability IS NOT NULL
  AND jsonb_typeof(availability) = 'object'
  AND (
    jsonb_typeof(availability->'monday') NOT IN ('array', 'null')
    OR jsonb_typeof(availability->'tuesday') NOT IN ('array', 'null')
    OR jsonb_typeof(availability->'wednesday') NOT IN ('array', 'null')
    OR jsonb_typeof(availability->'thursday') NOT IN ('array', 'null')
    OR jsonb_typeof(availability->'friday') NOT IN ('array', 'null')
    OR jsonb_typeof(availability->'saturday') NOT IN ('array', 'null')
    OR jsonb_typeof(availability->'sunday') NOT IN ('array', 'null')
  );

-- STEP 2: Fix any remaining empty arrays to default 24/7
UPDATE staff
SET availability = jsonb_build_object(
  'monday',
  CASE WHEN jsonb_array_length(availability->'monday') = 0 THEN jsonb_build_array('day', 'night') ELSE availability->'monday' END,
  'tuesday',
  CASE WHEN jsonb_array_length(availability->'tuesday') = 0 THEN jsonb_build_array('day', 'night') ELSE availability->'tuesday' END,
  'wednesday',
  CASE WHEN jsonb_array_length(availability->'wednesday') = 0 THEN jsonb_build_array('day', 'night') ELSE availability->'wednesday' END,
  'thursday',
  CASE WHEN jsonb_array_length(availability->'thursday') = 0 THEN jsonb_build_array('day', 'night') ELSE availability->'thursday' END,
  'friday',
  CASE WHEN jsonb_array_length(availability->'friday') = 0 THEN jsonb_build_array('day', 'night') ELSE availability->'friday' END,
  'saturday',
  CASE WHEN jsonb_array_length(availability->'saturday') = 0 THEN jsonb_build_array('day', 'night') ELSE availability->'saturday' END,
  'sunday',
  CASE WHEN jsonb_array_length(availability->'sunday') = 0 THEN jsonb_build_array('day', 'night') ELSE availability->'sunday' END
)
WHERE availability IS NOT NULL
  AND jsonb_typeof(availability) = 'object'
  AND (
    jsonb_array_length(availability->'monday') = 0
    OR jsonb_array_length(availability->'tuesday') = 0
    OR jsonb_array_length(availability->'wednesday') = 0
    OR jsonb_array_length(availability->'thursday') = 0
    OR jsonb_array_length(availability->'friday') = 0
    OR jsonb_array_length(availability->'saturday') = 0
    OR jsonb_array_length(availability->'sunday') = 0
  );

-- STEP 3: Remove any extra fields (notes, days) and keep only weekday keys
UPDATE staff
SET availability = jsonb_build_object(
  'monday', COALESCE(availability->'monday', jsonb_build_array('day', 'night')),
  'tuesday', COALESCE(availability->'tuesday', jsonb_build_array('day', 'night')),
  'wednesday', COALESCE(availability->'wednesday', jsonb_build_array('day', 'night')),
  'thursday', COALESCE(availability->'thursday', jsonb_build_array('day', 'night')),
  'friday', COALESCE(availability->'friday', jsonb_build_array('day', 'night')),
  'saturday', COALESCE(availability->'saturday', jsonb_build_array('day', 'night')),
  'sunday', COALESCE(availability->'sunday', jsonb_build_array('day', 'night'))
)
WHERE availability IS NOT NULL
  AND jsonb_typeof(availability) = 'object'
  AND (
    availability ? 'notes'
    OR availability ? 'days'
    OR jsonb_object_keys(availability::jsonb) NOT IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
  );

-- ====================================================================
-- FINAL VERIFICATION: Show all staff availability status
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
        WHEN (
          jsonb_typeof(availability->'monday') = 'array' AND jsonb_array_length(availability->'monday') > 0
          AND jsonb_typeof(availability->'tuesday') = 'array'
          AND jsonb_typeof(availability->'wednesday') = 'array'
          AND jsonb_typeof(availability->'thursday') = 'array'
          AND jsonb_typeof(availability->'friday') = 'array'
          AND jsonb_typeof(availability->'saturday') = 'array'
          AND jsonb_typeof(availability->'sunday') = 'array'
        ) THEN '✅ Normalized 24/7'
        ELSE '⚠️ Still Has Issues'
      END
    ELSE '⚠️ Invalid Type'
  END as status,
  availability
FROM staff
ORDER BY created_date DESC;

-- ====================================================================
-- SUMMARY: Count of statuses
-- ====================================================================
SELECT
  CASE
    WHEN availability IS NULL THEN '❌ NULL'
    WHEN availability::text = '{}' THEN '⚠️ Empty {}'
    WHEN jsonb_typeof(availability) = 'object' THEN
      CASE
        WHEN (
          jsonb_typeof(availability->'monday') = 'array' AND jsonb_array_length(availability->'monday') > 0
          AND jsonb_typeof(availability->'tuesday') = 'array'
          AND jsonb_typeof(availability->'wednesday') = 'array'
          AND jsonb_typeof(availability->'thursday') = 'array'
          AND jsonb_typeof(availability->'friday') = 'array'
          AND jsonb_typeof(availability->'saturday') = 'array'
          AND jsonb_typeof(availability->'sunday') = 'array'
        ) THEN '✅ Normalized 24/7'
        ELSE '⚠️ Still Has Issues'
      END
    ELSE '⚠️ Invalid Type'
  END as status,
  COUNT(*) as count
FROM staff
GROUP BY status
ORDER BY status;
