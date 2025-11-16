/**
 * TIMESHEET WORKFLOW TESTS
 * 
 * Test 1: Shift Confirmation Creates Timesheet
 * - Create shift → Confirm shift → Verify timesheet created
 * 
 * Test 2: Actual Times Calculation
 * - Complete shift → Edit actual times (2hrs late) → Verify total hours calculated correctly
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5177';
const ADMIN_EMAIL = 'info@guest-glow.com';
const ADMIN_PASSWORD = 'Dominion#2025';

test.describe('Timesheet Workflow Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign In")');

    // Wait for navigation to complete (case-insensitive)
    await page.waitForURL(/dashboard|shifts/i, { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test('Test 1: Shift confirmation creates timesheet entry', async ({ page }) => {
    console.log('\n🧪 TEST 1: Shift Confirmation Creates Timesheet\n');
    
    // Step 1: Create a new shift
    console.log('📝 Step 1: Creating new shift...');
    await page.goto(`${BASE_URL}/post-shift`);
    await page.waitForTimeout(2000);
    
    // Select client
    await page.click('[role="combobox"]'); // Client dropdown
    await page.waitForTimeout(500);
    await page.click('text=Divine Care Center'); // Select first client
    await page.waitForTimeout(1000);
    
    // Select shift template (should auto-fill after client selection)
    const shiftTemplateDropdown = page.locator('select, [role="combobox"]').filter({ hasText: /Day Shift|Night Shift/ }).first();
    if (await shiftTemplateDropdown.isVisible()) {
      await shiftTemplateDropdown.click();
      await page.waitForTimeout(500);
      await page.click('text=Day Shift');
      await page.waitForTimeout(500);
    }
    
    // Set date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateString);
    
    // Select role
    await page.click('text=Healthcare Assistant');
    
    // Submit shift
    await page.click('button:has-text("Create Shift")');
    await page.waitForTimeout(3000);
    
    console.log('✅ Shift created');
    
    // Step 2: Navigate to shifts page and find the shift
    console.log('📝 Step 2: Finding created shift...');
    await page.goto(`${BASE_URL}/shifts`);
    await page.waitForTimeout(2000);
    
    // Find the shift we just created (should be first in list with status "open")
    const shiftRow = page.locator('tr').filter({ hasText: 'open' }).first();
    await expect(shiftRow).toBeVisible();
    
    // Get shift ID from the row
    const shiftText = await shiftRow.textContent();
    console.log('Found shift:', shiftText);
    
    // Step 3: Confirm the shift (bypass assign, go straight to confirmed)
    console.log('📝 Step 3: Confirming shift...');
    
    // Click on the shift row to open details/actions
    await shiftRow.click();
    await page.waitForTimeout(1000);
    
    // Look for "Bypass & Confirm" or similar button
    const bypassButton = page.locator('button:has-text("Bypass"), button:has-text("Confirm")').first();
    if (await bypassButton.isVisible()) {
      await bypassButton.click();
      await page.waitForTimeout(2000);
      
      // Confirm in modal if needed
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    console.log('✅ Shift confirmed');
    
    // Step 4: Check /timesheets for entry
    console.log('📝 Step 4: Checking /timesheets for entry...');
    await page.goto(`${BASE_URL}/timesheets`);
    await page.waitForTimeout(3000);
    
    // Look for timesheet with status "draft"
    const timesheetRow = page.locator('tr').filter({ hasText: 'draft' }).first();
    
    if (await timesheetRow.isVisible()) {
      console.log('✅ TEST 1 PASSED: Timesheet entry found!');
      const timesheetText = await timesheetRow.textContent();
      console.log('Timesheet details:', timesheetText);
    } else {
      console.log('❌ TEST 1 FAILED: No timesheet entry found');
      throw new Error('Timesheet not created after shift confirmation');
    }
  });

  test('Test 2: Actual times calculation with late arrival', async ({ page }) => {
    console.log('\n🧪 TEST 2: Actual Times Calculation\n');
    
    // Step 1: Find or create a shift with timesheet
    console.log('📝 Step 1: Finding shift with timesheet...');
    await page.goto(`${BASE_URL}/timesheets`);
    await page.waitForTimeout(2000);
    
    // Find a draft timesheet
    const timesheetRow = page.locator('tr').filter({ hasText: 'draft' }).first();
    
    if (!(await timesheetRow.isVisible())) {
      console.log('⚠️ No draft timesheet found. Creating one first...');
      // Run Test 1 logic to create a timesheet
      // (Simplified - in real scenario, call Test 1 or create shift manually)
      throw new Error('No draft timesheet available for testing. Run Test 1 first.');
    }
    
    // Get timesheet details
    const timesheetText = await timesheetRow.textContent();
    console.log('Found timesheet:', timesheetText);
    
    // Click to open timesheet details
    await timesheetRow.click();
    await page.waitForTimeout(1000);
    
    // Step 2: Complete the shift (change status to completed)
    console.log('📝 Step 2: Completing shift...');
    
    // Navigate to shifts page
    await page.goto(`${BASE_URL}/shifts`);
    await page.waitForTimeout(2000);
    
    // Find shift with status "confirmed" or "in_progress"
    const shiftRow = page.locator('tr').filter({ hasText: /confirmed|in_progress/ }).first();
    await shiftRow.click();
    await page.waitForTimeout(1000);
    
    // Complete shift button
    const completeButton = page.locator('button:has-text("Complete"), button:has-text("Mark Complete")').first();
    if (await completeButton.isVisible()) {
      await completeButton.click();
      await page.waitForTimeout(2000);
    }
    
    console.log('✅ Shift marked as completed');
    
    // Step 3: Edit actual times (mark user 2 hours late)
    console.log('📝 Step 3: Editing actual times (2 hours late)...');
    
    // Go back to timesheets
    await page.goto(`${BASE_URL}/timesheets`);
    await page.waitForTimeout(2000);
    
    // Find the timesheet and click to edit
    const editTimesheetRow = page.locator('tr').first();
    await editTimesheetRow.click();
    await page.waitForTimeout(1000);
    
    // Look for actual start time input
    const actualStartInput = page.locator('input[type="time"]').filter({ hasText: /actual.*start|start.*time/i }).first();
    
    // If scheduled start was 08:00, make actual start 10:00 (2 hours late)
    await actualStartInput.fill('10:00');
    await page.waitForTimeout(500);
    
    // Actual end time should remain the same (20:00)
    const actualEndInput = page.locator('input[type="time"]').filter({ hasText: /actual.*end|end.*time/i }).first();
    await actualEndInput.fill('20:00');
    await page.waitForTimeout(500);
    
    // Save changes
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').first();
    await saveButton.click();
    await page.waitForTimeout(2000);
    
    console.log('✅ Actual times updated (10:00 - 20:00)');
    
    // Step 4: Verify total hours calculated correctly
    console.log('📝 Step 4: Verifying total hours calculation...');
    
    // Expected: 20:00 - 10:00 = 10 hours
    const expectedHours = 10;
    
    // Find total hours display
    const totalHoursElement = page.locator('text=/total.*hours|hours.*worked/i').first();
    const totalHoursText = await totalHoursElement.textContent();
    
    if (totalHoursText.includes(expectedHours.toString())) {
      console.log(`✅ TEST 2 PASSED: Total hours correctly calculated as ${expectedHours} hours`);
    } else {
      console.log(`❌ TEST 2 FAILED: Total hours incorrect. Expected ${expectedHours}, got: ${totalHoursText}`);
      throw new Error(`Total hours calculation incorrect. Expected ${expectedHours} hours`);
    }
  });
});

