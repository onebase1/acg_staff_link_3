#!/usr/bin/env tsx

/**
 * 🤖 AI SHIFT CREATOR TEST RUNNER
 * 
 * Runs the AI shift creator tests in isolation
 * Tests the complete flow from natural language → database
 */

import { TestContext } from './pipeline/types';
import * as AIShiftCreator from './pipeline/implementations/ai-shift-creator';

async function runAIShiftTests() {
  console.log('🤖 AI SHIFT CREATOR TEST SUITE');
  console.log('================================\n');

  // Initialize test context
  const context = new TestContext();

  // Authenticate
  console.log('🔐 Authenticating...');
  await context.authenticate();
  console.log('✅ Authenticated\n');

  const results = [];

  // Test 1: AI Shift Extraction
  console.log('📝 Test 1: AI Shift Extraction from Natural Language');
  console.log('─────────────────────────────────────────────────────');
  const test1 = await AIShiftCreator.testAIShiftExtraction(context);
  results.push(test1);
  console.log(`${test1.passed ? '✅' : '❌'} ${test1.action}`);
  console.log(`   Duration: ${test1.duration.toFixed(2)}s`);
  if (test1.details) {
    console.log(`   Input: "${test1.details.input}"`);
    console.log(`   Shifts Extracted: ${test1.details.shiftsExtracted}/${test1.details.expectedShifts}`);
    console.log(`   Complete: ${test1.details.complete}`);
  }
  if (test1.error) {
    console.log(`   ❌ Error: ${test1.error}`);
  }
  console.log('');

  // Test 2: AI Shift Creation in Database
  console.log('📝 Test 2: AI Shift Creation in Database');
  console.log('─────────────────────────────────────────');
  const test2 = await AIShiftCreator.testAIShiftCreationInDatabase(context);
  results.push(test2);
  console.log(`${test2.passed ? '✅' : '❌'} ${test2.action}`);
  console.log(`   Duration: ${test2.duration.toFixed(2)}s`);
  if (test2.details) {
    console.log(`   Input: "${test2.details.input}"`);
    console.log(`   Shifts Extracted: ${test2.details.shiftsExtracted}`);
    console.log(`   Shifts Created: ${test2.details.shiftsCreated}`);
    console.log(`   Shifts Verified: ${test2.details.shiftsVerified}`);
    console.log(`   All Open: ${test2.details.allOpen}`);
    if (test2.details.shiftIds && test2.details.shiftIds.length > 0) {
      console.log(`   Shift IDs: ${test2.details.shiftIds.join(', ')}`);
    }
  }
  if (test2.error) {
    console.log(`   ❌ Error: ${test2.error}`);
  }
  console.log('');

  // Test 3: AI Shift Creation with Validation (Overnight Shifts)
  console.log('📝 Test 3: AI Handles Overnight Shifts & Validation');
  console.log('────────────────────────────────────────────────────');
  const test3 = await AIShiftCreator.testAIShiftCreationWithValidation(context);
  results.push(test3);
  console.log(`${test3.passed ? '✅' : '❌'} ${test3.action}`);
  console.log(`   Duration: ${test3.duration.toFixed(2)}s`);
  if (test3.details) {
    console.log(`   Input: "${test3.details.input}"`);
    if (test3.details.validations) {
      console.log(`   Overnight Shift: ${test3.details.validations.overnightShift ? '✅' : '❌'}`);
      console.log(`   Correct Role: ${test3.details.validations.correctRole ? '✅' : '❌'}`);
      console.log(`   Has Location: ${test3.details.validations.hasLocation ? '✅' : '❌'}`);
    }
  }
  if (test3.error) {
    console.log(`   ❌ Error: ${test3.error}`);
  }
  console.log('');

  // Test 4: Bulk Multi-Day Shift Creation
  console.log('📝 Test 4: AI Handles Bulk Multi-Day Shift Creation');
  console.log('────────────────────────────────────────────────────');
  const test4 = await AIShiftCreator.testAIBulkMultiDayShiftCreation(context);
  results.push(test4);
  console.log(`${test4.passed ? '✅' : '❌'} ${test4.action}`);
  console.log(`   Duration: ${test4.duration.toFixed(2)}s`);
  if (test4.details) {
    console.log(`   Input: "${test4.details.input}"`);
    console.log(`   Total Shifts Extracted: ${test4.details.totalShiftsExtracted}/${test4.details.expectedShifts}`);
    console.log(`   Day Shifts: ${test4.details.dayShifts}`);
    console.log(`   Night Shifts: ${test4.details.nightShifts}`);
    console.log(`   Dates Covered: ${test4.details.datesCount}/7`);
    console.log(`   Date Range: ${test4.details.datesCovered.join(', ')}`);
  }
  if (test4.error) {
    console.log(`   ❌ Error: ${test4.error}`);
  }
  console.log('');

  // Summary
  console.log('================================');
  console.log('📊 TEST SUMMARY');
  console.log('================================');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Pass Rate: ${passRate}%`);
  console.log('');

  if (failed > 0) {
    console.log('❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.testId}: ${r.action}`);
      console.log(`     Error: ${r.error}`);
    });

    // Cleanup
    await context.cleanup();
    process.exit(1);
  } else {
    console.log('✅ ALL TESTS PASSED!');

    // Cleanup
    await context.cleanup();
    process.exit(0);
  }
}

// Run tests
runAIShiftTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

