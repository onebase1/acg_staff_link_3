-- ============================================================================
-- MULTI-CHANNEL URGENT BROADCAST: Test Setup Script
-- ============================================================================
-- This script sets up test data for the multi-channel urgent broadcast system
-- Run this in Supabase SQL Editor to prepare for testing
-- ============================================================================

-- 1. Update Agile Care Group agency with default urgent shift notification settings
UPDATE agencies
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
  'urgent_shift_notifications', jsonb_build_object(
    'sms_enabled', true,
    'email_enabled', true,
    'whatsapp_enabled', true,
    'allow_manual_override', true
  )
)
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Verify the settings were applied
SELECT 
  id,
  name,
  settings->'urgent_shift_notifications' as urgent_broadcast_settings
FROM agencies
WHERE id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- Expected Output:
-- ============================================================================
-- {
--   "sms_enabled": true,
--   "email_enabled": true,
--   "whatsapp_enabled": true,
--   "allow_manual_override": true
-- }
-- ============================================================================

-- 3. Check for eligible staff members (for testing)
SELECT 
  id,
  first_name,
  last_name,
  email,
  phone,
  role,
  status,
  whatsapp_opt_in
FROM staff
WHERE 
  agency_id = '00000000-0000-0000-0000-000000000001'
  AND status = 'active'
ORDER BY role, first_name
LIMIT 10;

-- 4. Check for urgent shifts (for testing)
SELECT 
  id,
  client_id,
  role_required,
  date,
  start_time,
  end_time,
  urgency,
  status,
  broadcast_sent_at
FROM shifts
WHERE 
  agency_id = '00000000-0000-0000-0000-000000000001'
  AND urgency IN ('urgent', 'critical')
  AND status = 'open'
ORDER BY date DESC
LIMIT 5;

-- ============================================================================
-- TESTING INSTRUCTIONS:
-- ============================================================================
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify agency settings were updated
-- 3. Note the staff members and their contact info
-- 4. Create an urgent shift if none exist
-- 5. Go to Shifts page in ACG StaffLink
-- 6. Click "Broadcast Urgent Shift" button
-- 7. Verify ChannelSelectorModal appears with all 3 channels
-- 8. Select channels and confirm
-- 9. Check:
--    - Twilio logs for SMS delivery
--    - Email inbox for email delivery
--    - WhatsApp for message delivery
-- 10. Accept shift via Staff Portal
-- 11. Verify other staff get "already gone" response
-- ============================================================================

-- ============================================================================
-- ROLLBACK (if needed):
-- ============================================================================
-- To disable all channels and reset to SMS-only:
/*
UPDATE agencies
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
  'urgent_shift_notifications', jsonb_build_object(
    'sms_enabled', true,
    'email_enabled', false,
    'whatsapp_enabled', false,
    'allow_manual_override', true
  )
)
WHERE id = '00000000-0000-0000-0000-000000000001';
*/
-- ============================================================================

