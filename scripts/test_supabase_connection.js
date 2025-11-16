/**
 * Test Supabase Connection
 * 
 * Quick test to verify Supabase is accessible and credentials are correct
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🧪 Testing Supabase Connection...\n');

// Test 1: Check environment variables
console.log('Test 1: Environment Variables');
console.log('  VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('  VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
console.log('');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

// Test 2: Create Supabase client
console.log('Test 2: Create Supabase Client');
let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
  console.log('  ✅ Client created successfully');
} catch (error) {
  console.error('  ❌ Failed to create client:', error.message);
  process.exit(1);
}
console.log('');

// Test 3: Test network connectivity
console.log('Test 3: Network Connectivity');
try {
  const response = await fetch(supabaseUrl);
  console.log('  ✅ Supabase URL is reachable');
  console.log('  Status:', response.status);
} catch (error) {
  console.error('  ❌ Cannot reach Supabase URL:', error.message);
  process.exit(1);
}
console.log('');

// Test 4: Test authentication endpoint
console.log('Test 4: Authentication Endpoint');
try {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.log('  ⚠️ No active session (expected):', error.message);
  } else {
    console.log('  ✅ Auth endpoint accessible');
    console.log('  Session:', data.session ? 'Active' : 'None');
  }
} catch (error) {
  console.error('  ❌ Auth endpoint error:', error.message);
}
console.log('');

// Test 5: Test database query (public table)
console.log('Test 5: Database Query');
try {
  const { data, error } = await supabase
    .from('agencies')
    .select('id, name')
    .limit(1);
  
  if (error) {
    console.error('  ❌ Query failed:', error.message);
  } else {
    console.log('  ✅ Database query successful');
    console.log('  Found agencies:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('  Sample:', data[0].name);
    }
  }
} catch (error) {
  console.error('  ❌ Query error:', error.message);
}
console.log('');

// Test 6: Test sign in with test credentials
console.log('Test 6: Test Sign In');
const testEmail = process.env.TEST_STAFF_EMAIL || 'g.basera5+chadaira@gmail.com';
const testPassword = process.env.TEST_STAFF_PASSWORD || 'Broadband@123';

try {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });
  
  if (error) {
    console.error('  ❌ Sign in failed:', error.message);
    console.error('  Error code:', error.status);
  } else {
    console.log('  ✅ Sign in successful!');
    console.log('  User ID:', data.user?.id);
    console.log('  Email:', data.user?.email);
    console.log('  Session:', data.session ? 'Active' : 'None');
    
    // Sign out
    await supabase.auth.signOut();
    console.log('  ✅ Signed out');
  }
} catch (error) {
  console.error('  ❌ Sign in error:', error.message);
}
console.log('');

console.log('✅ All tests complete!');
console.log('');
console.log('Summary:');
console.log('  - Environment variables: OK');
console.log('  - Supabase client: OK');
console.log('  - Network connectivity: Check above');
console.log('  - Auth endpoint: Check above');
console.log('  - Database query: Check above');
console.log('  - Sign in: Check above');

