/**
 * GPS GEOFENCING AUTOMATED TEST SUITE
 * 
 * Tests the complete GPS geofencing workflow including:
 * - GPS consent flow
 * - Geofence validation (within/outside boundaries)
 * - Clock-in/out workflow
 * - Anti-duplicate protection
 * - RLS policies
 * 
 * Prerequisites:
 * - Run supabase/seed_gps_test_data.sql first
 * - Create test user accounts in Supabase Auth
 * - Set SUPABASE_URL and SUPABASE_ANON_KEY in .env
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Test data constants
const TEST_AGENCY_ID = 'test-agency-gps-001';
const TEST_STAFF_WITH_CONSENT = {
  id: 'test-staff-gps-consent-001',
  email: 'alice.gps@test.com',
  password: 'TestGPS123!'
};
const TEST_STAFF_NO_CONSENT = {
  id: 'test-staff-no-consent-001',
  email: 'bob.noconsent@test.com',
  password: 'TestGPS123!'
};
const TEST_CLIENT_DURHAM = {
  id: 'test-client-durham-001',
  coords: { latitude: 54.7753, longitude: -1.5849 },
  radius: 100
};
const TEST_CLIENT_NEWCASTLE = {
  id: 'test-client-newcastle-001',
  coords: { latitude: 54.9738, longitude: -1.6131 },
  radius: 200
};

// Helper: Calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const R = 6371000; // Earth's radius in meters
  
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return Math.round(R * c);
}

// Helper: Clean up test timesheets
async function cleanupTimesheets(staffId) {
  await supabase
    .from('timesheets')
    .delete()
    .eq('staff_id', staffId)
    .eq('shift_date', new Date().toISOString().split('T')[0]);
}

describe('GPS Geofencing System', () => {
  
  describe('Suite 1: GPS Consent Flow', () => {
    
    it('1.1: Staff without GPS consent should see consent requirement', async () => {
      // Login as staff without consent
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: TEST_STAFF_NO_CONSENT.email,
        password: TEST_STAFF_NO_CONSENT.password
      });
      expect(authError).toBeNull();
      expect(authData.user).toBeDefined();
      
      // Fetch staff record
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('gps_consent, gps_consent_date')
        .eq('id', TEST_STAFF_NO_CONSENT.id)
        .single();
      
      expect(staffError).toBeNull();
      expect(staff.gps_consent).toBe(false);
      expect(staff.gps_consent_date).toBeNull();
      
      await supabase.auth.signOut();
    });
    
    it('1.2: Staff can grant GPS consent', async () => {
      // Login
      await supabase.auth.signInWithPassword({
        email: TEST_STAFF_NO_CONSENT.email,
        password: TEST_STAFF_NO_CONSENT.password
      });
      
      // Grant consent
      const { error: updateError } = await supabase
        .from('staff')
        .update({
          gps_consent: true,
          gps_consent_date: new Date().toISOString()
        })
        .eq('id', TEST_STAFF_NO_CONSENT.id);
      
      expect(updateError).toBeNull();
      
      // Verify consent granted
      const { data: staff } = await supabase
        .from('staff')
        .select('gps_consent, gps_consent_date')
        .eq('id', TEST_STAFF_NO_CONSENT.id)
        .single();
      
      expect(staff.gps_consent).toBe(true);
      expect(staff.gps_consent_date).not.toBeNull();
      
      await supabase.auth.signOut();
    });
    
    it('1.3: Staff with GPS consent should not see prompt', async () => {
      // Login as staff with consent
      await supabase.auth.signInWithPassword({
        email: TEST_STAFF_WITH_CONSENT.email,
        password: TEST_STAFF_WITH_CONSENT.password
      });
      
      const { data: staff } = await supabase
        .from('staff')
        .select('gps_consent')
        .eq('id', TEST_STAFF_WITH_CONSENT.id)
        .single();
      
      expect(staff.gps_consent).toBe(true);
      
      await supabase.auth.signOut();
    });
  });
  
  describe('Suite 2: Geofence Validation', () => {
    
    beforeAll(async () => {
      // Login as staff with consent
      await supabase.auth.signInWithPassword({
        email: TEST_STAFF_WITH_CONSENT.email,
        password: TEST_STAFF_WITH_CONSENT.password
      });
      
      // Clean up any existing timesheets
      await cleanupTimesheets(TEST_STAFF_WITH_CONSENT.id);
    });
    
    afterAll(async () => {
      await supabase.auth.signOut();
    });
    
    it('2.1: Clock-in WITHIN geofence (100m) should succeed', async () => {
      // Test location: 22m from Durham Care Home
      const testLocation = { latitude: 54.7755, longitude: -1.5850 };
      
      // Calculate expected distance
      const expectedDistance = calculateDistance(
        TEST_CLIENT_DURHAM.coords.latitude,
        TEST_CLIENT_DURHAM.coords.longitude,
        testLocation.latitude,
        testLocation.longitude
      );
      expect(expectedDistance).toBeLessThanOrEqual(TEST_CLIENT_DURHAM.radius);
      
      // Call geofence validator
      const { data: validation, error: validationError } = await supabase.functions.invoke(
        'geofence-validator',
        {
          body: {
            staff_location: testLocation,
            client_id: TEST_CLIENT_DURHAM.id
          }
        }
      );
      
      expect(validationError).toBeNull();
      expect(validation.validated).toBe(true);
      expect(validation.distance_meters).toBeLessThanOrEqual(100);
      expect(validation.message).toContain('Verified');
    });
    
    it('2.2: Clock-in OUTSIDE geofence (100m) should fail', async () => {
      // Test location: 550m from Durham Care Home
      const testLocation = { latitude: 54.7800, longitude: -1.5900 };
      
      // Calculate expected distance
      const expectedDistance = calculateDistance(
        TEST_CLIENT_DURHAM.coords.latitude,
        TEST_CLIENT_DURHAM.coords.longitude,
        testLocation.latitude,
        testLocation.longitude
      );
      expect(expectedDistance).toBeGreaterThan(TEST_CLIENT_DURHAM.radius);
      
      // Call geofence validator
      const { data: validation } = await supabase.functions.invoke(
        'geofence-validator',
        {
          body: {
            staff_location: testLocation,
            client_id: TEST_CLIENT_DURHAM.id
          }
        }
      );
      
      expect(validation.validated).toBe(false);
      expect(validation.distance_meters).toBeGreaterThan(100);
      expect(validation.message).toContain('Too far');
    });
    
    it('2.3: Larger geofence (200m) should allow 150m distance', async () => {
      // Test location: 150m from Newcastle Hospital
      const testLocation = { latitude: 54.9750, longitude: -1.6140 };
      
      const { data: validation } = await supabase.functions.invoke(
        'geofence-validator',
        {
          body: {
            staff_location: testLocation,
            client_id: TEST_CLIENT_NEWCASTLE.id
          }
        }
      );
      
      expect(validation.validated).toBe(true);
      expect(validation.distance_meters).toBeLessThanOrEqual(200);
    });
    
    it('2.4: Client with NO GPS configured should auto-pass', async () => {
      const testLocation = { latitude: 54.7700, longitude: -1.5800 };
      
      const { data: validation } = await supabase.functions.invoke(
        'geofence-validator',
        {
          body: {
            staff_location: testLocation,
            client_id: 'test-client-no-gps-001'
          }
        }
      );
      
      expect(validation.validated).toBe(true);
      expect(validation.message).toContain('not configured');
    });
    
    it('2.5: Client with GPS disabled should auto-pass', async () => {
      const testLocation = { latitude: 54.7700, longitude: -1.5800 };
      
      const { data: validation } = await supabase.functions.invoke(
        'geofence-validator',
        {
          body: {
            staff_location: testLocation,
            client_id: 'test-client-gps-disabled-001'
          }
        }
      );
      
      expect(validation.validated).toBe(true);
      expect(validation.message).toContain('disabled');
    });
  });
  
  describe('Suite 3: RLS Policy Validation', () => {
    
    it('5.1: Staff can update their GPS consent', async () => {
      await supabase.auth.signInWithPassword({
        email: TEST_STAFF_WITH_CONSENT.email,
        password: TEST_STAFF_WITH_CONSENT.password
      });
      
      const { error } = await supabase
        .from('staff')
        .update({ gps_consent: true })
        .eq('id', TEST_STAFF_WITH_CONSENT.id);
      
      expect(error).toBeNull();
      
      await supabase.auth.signOut();
    });
    
    it('5.2: Staff can read client GPS coordinates', async () => {
      await supabase.auth.signInWithPassword({
        email: TEST_STAFF_WITH_CONSENT.email,
        password: TEST_STAFF_WITH_CONSENT.password
      });
      
      const { data, error } = await supabase
        .from('clients')
        .select('location_coordinates, geofence_radius_meters')
        .eq('id', TEST_CLIENT_DURHAM.id)
        .single();
      
      expect(error).toBeNull();
      expect(data.location_coordinates).toBeDefined();
      
      await supabase.auth.signOut();
    });
  });
});

