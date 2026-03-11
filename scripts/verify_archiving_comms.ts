
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shouldSendNotification } from "../supabase/functions/_shared/preferenceChecker.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log("🧪 Starting Preference Checker Status Tests...");

  // 1. Create a mock inactive staff member
  const testEmail = `inactive_test_${Date.now()}@example.com`;
  
  const { data: staff, error: createError } = await supabase
    .from('staff')
    .insert({
      first_name: 'Test',
      last_name: 'Inactive',
      email: testEmail,
      status: 'inactive',
      agency_id: '00000000-0000-0000-0000-000000000001' // Assume default agency exists
    })
    .select()
    .single();

  if (createError) {
    console.error("❌ Failed to create test staff:", createError);
    return;
  }

  try {
    // 2. Test shouldSendNotification for various types
    const tests = [
      { type: 'shift_assigned', expected: false },
      { type: 'compliance_expiry', expected: false }, // Should be blocked despite being "critical"
      { type: 'daily_digest', expected: false }
    ];

    for (const test of tests) {
      const result = await shouldSendNotification(supabase, testEmail, test.type, 'email', 'staff');
      console.log(`Test [${test.type}]: Result=${result.allowed}, Reason=${result.reason}`);
      
      if (result.allowed !== test.expected) {
        console.error(`❌ FAILED: Expected ${test.expected} but got ${result.allowed}`);
      } else {
        console.log(`✅ PASSED`);
      }
    }

  } finally {
    // 3. Cleanup
    await supabase.from('staff').delete().eq('id', staff.id);
    console.log("🧹 Cleanup complete.");
  }
}

runTests();
