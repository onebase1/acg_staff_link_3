-- ============================================================================
-- GPS GEOFENCING TEST DATA SEEDING SCRIPT
-- ============================================================================
-- Purpose: Create comprehensive test data for GPS geofencing validation
-- Usage: Run this in Supabase SQL Editor
-- ============================================================================

-- STEP 1: Create Test Agency
-- ============================================================================
INSERT INTO agencies (id, name, email, phone, address, status, settings)
VALUES (
  'test-agency-gps-001',
  'GPS Test Agency',
  'gps-test@acgstafflink.com',
  '01234567890',
  '{"line1": "123 Test Street", "city": "Durham", "postcode": "DH1 1AA"}'::jsonb,
  'active',
  '{
    "automation_settings": {
      "auto_timesheet_approval": true,
      "gps_auto_complete_shifts": true
    }
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  settings = EXCLUDED.settings;

-- STEP 2: Create Test Clients with GPS Coordinates
-- ============================================================================

-- Client 1: Durham City Center (GPS Enabled, 100m radius)
INSERT INTO clients (id, agency_id, name, address, location_coordinates, geofence_radius_meters, geofence_enabled, status)
VALUES (
  'test-client-durham-001',
  'test-agency-gps-001',
  'Durham Care Home',
  '{"line1": "Palace Green", "city": "Durham", "postcode": "DH1 3RW"}'::jsonb,
  '{"latitude": 54.7753, "longitude": -1.5849}'::jsonb,
  100,
  true,
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  location_coordinates = EXCLUDED.location_coordinates,
  geofence_radius_meters = EXCLUDED.geofence_radius_meters,
  geofence_enabled = EXCLUDED.geofence_enabled;

-- Client 2: Newcastle City Center (GPS Enabled, 200m radius - larger facility)
INSERT INTO clients (id, agency_id, name, address, location_coordinates, geofence_radius_meters, geofence_enabled, status)
VALUES (
  'test-client-newcastle-001',
  'test-agency-gps-001',
  'Newcastle Hospital Care',
  '{"line1": "Grey Street", "city": "Newcastle", "postcode": "NE1 6EE"}'::jsonb,
  '{"latitude": 54.9738, "longitude": -1.6131}'::jsonb,
  200,
  true,
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  location_coordinates = EXCLUDED.location_coordinates,
  geofence_radius_meters = EXCLUDED.geofence_radius_meters,
  geofence_enabled = EXCLUDED.geofence_enabled;

-- Client 3: No GPS Configured (should auto-pass validation)
INSERT INTO clients (id, agency_id, name, address, location_coordinates, geofence_enabled, status)
VALUES (
  'test-client-no-gps-001',
  'test-agency-gps-001',
  'Legacy Care Home (No GPS)',
  '{"line1": "Test Street", "city": "Durham", "postcode": "DH1 1AA"}'::jsonb,
  NULL,
  false,
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  location_coordinates = NULL,
  geofence_enabled = false;

-- Client 4: GPS Disabled (should auto-pass validation)
INSERT INTO clients (id, agency_id, name, address, location_coordinates, geofence_enabled, status)
VALUES (
  'test-client-gps-disabled-001',
  'test-agency-gps-001',
  'GPS Disabled Care Home',
  '{"line1": "Test Avenue", "city": "Durham", "postcode": "DH1 2BB"}'::jsonb,
  '{"latitude": 54.7700, "longitude": -1.5800}'::jsonb,
  false,
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  geofence_enabled = false;

-- STEP 3: Create Test Staff Members
-- ============================================================================

-- Staff 1: GPS Consent Granted
INSERT INTO staff (id, agency_id, first_name, last_name, email, phone, role, gps_consent, gps_consent_date, status)
VALUES (
  'test-staff-gps-consent-001',
  'test-agency-gps-001',
  'Alice',
  'GPS-Tester',
  'alice.gps@test.com',
  '07700900001',
  'Healthcare Assistant',
  true,
  NOW(),
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  gps_consent = true,
  gps_consent_date = NOW();

-- Staff 2: GPS Consent NOT Granted (should see consent prompt)
INSERT INTO staff (id, agency_id, first_name, last_name, email, phone, role, gps_consent, status)
VALUES (
  'test-staff-no-consent-001',
  'test-agency-gps-001',
  'Bob',
  'No-Consent',
  'bob.noconsent@test.com',
  '07700900002',
  'Healthcare Assistant',
  false,
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  gps_consent = false;

-- STEP 4: Create Test Shifts for Today
-- ============================================================================

-- Shift 1: Durham Care Home - Day Shift (for GPS consent testing)
INSERT INTO shifts (
  id, agency_id, client_id, date, start_time, end_time, 
  duration_hours, role, pay_rate, charge_rate, status
)
VALUES (
  'test-shift-durham-day-001',
  'test-agency-gps-001',
  'test-client-durham-001',
  CURRENT_DATE,
  '08:00:00',
  '20:00:00',
  12,
  'Healthcare Assistant',
  12.50,
  18.00,
  'open'
)
ON CONFLICT (id) DO UPDATE SET
  date = CURRENT_DATE,
  status = 'open';

-- Shift 2: Newcastle Hospital - Night Shift (for larger geofence testing)
INSERT INTO shifts (
  id, agency_id, client_id, date, start_time, end_time,
  duration_hours, role, pay_rate, charge_rate, status
)
VALUES (
  'test-shift-newcastle-night-001',
  'test-agency-gps-001',
  'test-client-newcastle-001',
  CURRENT_DATE,
  '20:00:00',
  '08:00:00',
  12,
  'Healthcare Assistant',
  13.50,
  19.00,
  'open'
)
ON CONFLICT (id) DO UPDATE SET
  date = CURRENT_DATE,
  status = 'open';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify Clients with GPS
SELECT 
  id, 
  name, 
  location_coordinates,
  geofence_radius_meters,
  geofence_enabled
FROM clients
WHERE agency_id = 'test-agency-gps-001'
ORDER BY name;

-- Verify Staff GPS Consent Status
SELECT 
  id,
  first_name,
  last_name,
  gps_consent,
  gps_consent_date
FROM staff
WHERE agency_id = 'test-agency-gps-001'
ORDER BY first_name;

-- Verify Test Shifts
SELECT 
  s.id,
  c.name as client_name,
  s.date,
  s.start_time,
  s.end_time,
  s.status
FROM shifts s
JOIN clients c ON s.client_id = c.id
WHERE s.agency_id = 'test-agency-gps-001'
  AND s.date = CURRENT_DATE
ORDER BY s.start_time;

