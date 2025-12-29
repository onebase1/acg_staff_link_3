-- Fix existing staff with empty/null availability
-- Set them to 24/7 available by default for auto-assign
-- Run this once to fix all existing profiles

-- 🚀 Set default 24/7 availability for staff with null availability
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

-- 🚀 Set default 24/7 availability for staff with empty availability
-- (all days have empty arrays or no data)
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
WHERE availability IS NOT NULL
  AND availability::text = '{}'::text;

-- 🚀 Set default 24/7 availability for staff with all empty day arrays
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
WHERE availability IS NOT NULL
  AND availability::text != '{}'::text
  AND (
    -- Check if all days are empty or missing (safely)
    COALESCE(jsonb_array_length(availability->'monday'), 0) = 0
    AND COALESCE(jsonb_array_length(availability->'tuesday'), 0) = 0
    AND COALESCE(jsonb_array_length(availability->'wednesday'), 0) = 0
    AND COALESCE(jsonb_array_length(availability->'thursday'), 0) = 0
    AND COALESCE(jsonb_array_length(availability->'friday'), 0) = 0
    AND COALESCE(jsonb_array_length(availability->'saturday'), 0) = 0
    AND COALESCE(jsonb_array_length(availability->'sunday'), 0) = 0
  );

-- Show results
SELECT
  id,
  first_name,
  last_name,
  email,
  CASE
    WHEN availability IS NULL THEN 'NULL'
    WHEN availability::text = '{}'::text THEN 'Empty Object {}'
    WHEN COALESCE(jsonb_array_length(availability->'monday'), 0) = 0
      AND COALESCE(jsonb_array_length(availability->'tuesday'), 0) = 0
      AND COALESCE(jsonb_array_length(availability->'wednesday'), 0) = 0
      AND COALESCE(jsonb_array_length(availability->'thursday'), 0) = 0
      AND COALESCE(jsonb_array_length(availability->'friday'), 0) = 0
      AND COALESCE(jsonb_array_length(availability->'saturday'), 0) = 0
      AND COALESCE(jsonb_array_length(availability->'sunday'), 0) = 0
    THEN 'All Days Empty'
    WHEN jsonb_typeof(availability) = 'object' THEN 'Has Availability'
    ELSE 'Unknown'
  END as availability_status,
  availability
FROM staff
ORDER BY created_at DESC
LIMIT 20;
