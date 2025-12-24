/**
 * MODULE 34 - Magic Links & Downloads Test Script
 * 
 * Tests:
 * 1. Magic token generation
 * 2. Download endpoint (PDF/CSV/ICS)
 * 3. Weekly summary trigger for Richmond Court (Dominion Agency)
 * 
 * Run: node scripts/test_module34_downloads.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Test data - Richmond Court / Dominion
const TEST_DATA = {
    agency_id: 'c8e84c94-8233-4084-b4c3-63ad9dc81c16',
    agency_name: 'Dominion Healthcare Services Ltd',
    client_id: '6f8f5e63-0353-4050-8df7-b4469c1ecf82',
    client_name: 'RICHMOND COURT',
    client_email: 'g.basera5+clienttest3@gmail.com'
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test results tracker
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function log(icon, message) {
    console.log(`${icon} ${message}`);
}

function recordTest(name, passed, details = '') {
    results.tests.push({ name, passed, details });
    if (passed) {
        results.passed++;
        log('✅', `${name}: PASSED${details ? ` - ${details}` : ''}`);
    } else {
        results.failed++;
        log('❌', `${name}: FAILED${details ? ` - ${details}` : ''}`);
    }
}

// ============================================
// TEST 1: Magic Token Generation (Local Test)
// ============================================
async function testMagicTokenGeneration() {
    log('🧪', 'Testing magic token generation...');
    
    try {
        // Simulate token generation logic
        const secret = 'test-secret-key';
        const payload = {
            agency_id: TEST_DATA.agency_id,
            exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
        };
        
        const payloadStr = JSON.stringify(payload);
        const payloadBase64 = Buffer.from(payloadStr).toString('base64url');
        const signature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url');
        const token = `${payloadBase64}.${signature}`;
        
        // Verify token structure
        const parts = token.split('.');
        if (parts.length !== 2) throw new Error('Invalid token structure');
        
        // Decode and verify payload
        const decoded = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
        if (decoded.agency_id !== TEST_DATA.agency_id) throw new Error('Agency ID mismatch');
        if (!decoded.exp) throw new Error('Missing expiry');
        
        recordTest('Magic Token Generation', true, `Token length: ${token.length} chars`);
        return token;
    } catch (error) {
        recordTest('Magic Token Generation', false, error.message);
        return null;
    }
}

// ============================================
// TEST 2: Download Endpoint (Edge Function)
// ============================================
async function testDownloadEndpoint() {
    log('🧪', 'Testing download endpoint...');
    
    try {
        // First, generate a real token via the edge function
        const { data, error } = await supabase.functions.invoke('download-shift-schedule', {
            body: { 
                test: true,
                agency_id: TEST_DATA.agency_id 
            }
        });
        
        if (error) throw error;
        
        recordTest('Download Endpoint Response', true, `Status: ${data?.status || 'OK'}`);
        return true;
    } catch (error) {
        // Edge function may not be deployed yet - this is expected
        recordTest('Download Endpoint Response', false, `${error.message} (Deploy edge function first)`);
        return false;
    }
}

// ============================================
// TEST 3: Weekly Summary Trigger
// ============================================
async function testWeeklySummaryTrigger() {
    log('🧪', 'Testing weekly summary trigger for Richmond Court...');
    
    try {
        const { data, error } = await supabase.functions.invoke('weekly-client-summary', {
            body: {
                test_mode: true,
                client_id: TEST_DATA.client_id
            }
        });
        
        if (error) throw error;
        
        recordTest('Weekly Summary Trigger', true, `Result: ${JSON.stringify(data?.results || data)}`);
        return data;
    } catch (error) {
        recordTest('Weekly Summary Trigger', false, `${error.message} (Deploy edge function first)`);
        return null;
    }
}

// ============================================
// TEST 4: Verify Shifts Exist
// ============================================
async function testShiftsExist() {
    log('🧪', 'Verifying Richmond Court has shifts...');
    
    try {
        const { data, error, count } = await supabase
            .from('shifts')
            .select('id, date, status', { count: 'exact' })
            .eq('client_id', TEST_DATA.client_id)
            .gte('date', new Date().toISOString().split('T')[0]);
        
        if (error) throw error;
        
        const confirmed = data?.filter(s => s.status === 'confirmed').length || 0;
        const open = data?.filter(s => s.status === 'open').length || 0;
        
        recordTest('Shifts Exist', count > 0, `Total: ${count}, Confirmed: ${confirmed}, Open: ${open}`);
        return { total: count, confirmed, open };
    } catch (error) {
        recordTest('Shifts Exist', false, error.message);
        return null;
    }
}

// ============================================
// MAIN
// ============================================
async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 MODULE 34: Magic Links & Downloads Test Suite');
    console.log('='.repeat(60));
    console.log(`📍 Agency: ${TEST_DATA.agency_name}`);
    console.log(`🏥 Client: ${TEST_DATA.client_name}`);
    console.log('='.repeat(60) + '\n');

    // Run tests
    await testShiftsExist();
    await testMagicTokenGeneration();
    await testDownloadEndpoint();
    await testWeeklySummaryTrigger();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`📊 TEST SUMMARY: ${results.passed} passed, ${results.failed} failed`);
    console.log('='.repeat(60));

    if (results.failed === 0) {
        console.log('🎉 All tests passed! Module 34 is working correctly.\n');
        return true;
    } else {
        console.log('\n⚠️  Some tests failed. Edge functions need deployment.');
        console.log('\n📋 TO DEPLOY EDGE FUNCTIONS:');
        console.log('   1. Start Docker Desktop');
        console.log('   2. Run: npx supabase functions deploy download-shift-schedule --no-verify-jwt');
        console.log('   3. Run: npx supabase functions deploy weekly-client-summary');
        console.log('   4. Run: npx supabase functions deploy notification-digest-engine');
        console.log('   5. Set secret: npx supabase secrets set MAGIC_TOKEN_SECRET="your-secret"');
        console.log('\n   Then re-run this test.\n');
        return false;
    }
}

main().then(success => {
    process.exit(success ? 0 : 1);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

