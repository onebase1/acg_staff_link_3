-- ✅ UPDATE CHADAIRA'S ROLE FROM DEPRECATED TO CURRENT
-- 
-- Change: care_worker → healthcare_assistant
-- Reason: Align with centralized STAFF_ROLES constants

-- Update staff table
UPDATE staff
SET role = 'healthcare_assistant'
WHERE email = 'g.basera5+chadaira@gmail.com'
  AND role = 'care_worker';

-- Verify update
SELECT 
  id,
  first_name,
  last_name,
  email,
  role,
  status
FROM staff
WHERE email = 'g.basera5+chadaira@gmail.com';

