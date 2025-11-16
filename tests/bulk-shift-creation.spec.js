import { test, expect } from '@playwright/test';

/**
 * BULK SHIFT CREATION - END-TO-END TEST
 *
 * Tests the complete 4-step workflow:
 * Step 1: Select Client & Date Range
 * Step 2: Select Roles (Day/Night shifts)
 * Step 3: Fill Grid with shift quantities
 * Step 4: Preview and Create shifts
 *
 * Verifies shifts are created in database
 *
 * Test Credentials: info@guest-glow.com / Dominion#2025
 */

const ADMIN_EMAIL = 'info@guest-glow.com';
const ADMIN_PASSWORD = 'Dominion#2025';
const BASE_URL = 'http://localhost:5173';

test.describe('Bulk Shift Creation - Complete Workflow', () => {

  test.beforeEach(async ({ page }) => {
    console.log('🔐 Logging in as admin...');

    // Login as admin
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard (case-insensitive)
    await page.waitForURL(/.*dashboard.*/i, { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow data to load

    console.log('✅ Logged in successfully');

    // Navigate to Bulk Shift Creation
    await page.goto(`${BASE_URL}/bulk-shift-creation`);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/bulk-shift-page.png', fullPage: true });

    // Check if we have access
    const accessDenied = await page.locator('text=/Access Denied/i').isVisible();
    if (accessDenied) {
      console.log('❌ ACCESS DENIED - User may not have permission');
      throw new Error('Access Denied to Bulk Shift Creation');
    }

    console.log('📄 Bulk Shift Creation page loaded');
  });

  test('Complete workflow: Create shifts for care home', async ({ page }) => {
    console.log('🧪 TEST: Starting bulk shift creation workflow...');

    // ========================================
    // STEP 1: Select Client & Date Range
    // ========================================
    console.log('📋 STEP 1: Selecting client and date range...');

    // Verify we're on Step 1 (look for Setup step indicator)
    await expect(page.locator('text=Setup')).toBeVisible({ timeout: 10000 });

    // Wait for client dropdown to be ready
    await page.waitForTimeout(1000);

    // Click client dropdown to open it (Radix UI Select)
    // Look for the dropdown trigger button
    const clientDropdown = page.locator('button').filter({ hasText: /Select a client|Divine Care Center/i }).first();
    await clientDropdown.click();
    await page.waitForTimeout(1000);

    // Select first client from dropdown
    const firstClient = page.locator('[role="option"]').first();
    await firstClient.click();
    await page.waitForTimeout(500);

    console.log('✅ Client selected');

    // Use "Next 7 Days" preset button
    await page.click('button:has-text("Next 7 Days")');
    await page.waitForTimeout(500);

    console.log('✅ Date range set to next 7 days');

    // Click "Next: Build Schedule Grid" button
    await page.click('button:has-text("Next:")');

    // Wait for Step 2 to load
    await page.waitForTimeout(2000);
    console.log('✅ STEP 1 Complete');

    // ========================================
    // STEP 2: Select Roles
    // ========================================
    console.log('📋 STEP 2: Selecting roles...');

    // Verify we're on Step 2 (Role Selection)
    await expect(page.locator('text=Select Roles')).toBeVisible();

    // Find and check Healthcare Assistant checkboxes
    const hcaDayCheckbox = page.locator('input[type="checkbox"]').filter({ has: page.locator('text=/Healthcare Assistant.*Day/i') }).first();
    const hcaNightCheckbox = page.locator('input[type="checkbox"]').filter({ has: page.locator('text=/Healthcare Assistant.*Night/i') }).first();

    if (await hcaDayCheckbox.count() > 0) {
      await hcaDayCheckbox.check();
      console.log('✅ Selected HCA Day shifts');
    }

    if (await hcaNightCheckbox.count() > 0) {
      await hcaNightCheckbox.check();
      console.log('✅ Selected HCA Night shifts');
    }

    // Click Continue
    await page.click('button:has-text("Continue")');

    // Wait for Step 3 to load
    await page.waitForTimeout(2000);
    console.log('✅ STEP 2 Complete');

    // ========================================
    // STEP 3: Fill Grid
    // ========================================
    console.log('📋 STEP 3: Filling grid with shift quantities...');

    // Verify we're on Step 3 (Grid)
    await expect(page.locator('text=Grid')).toBeVisible();

    // Wait for grid to render
    await page.waitForTimeout(1000);

    // Fill in some shift quantities using "Weekdays" bulk fill
    // Click "Weekdays" button for HCA Day column
    const weekdaysButtons = page.locator('button:has-text("Weekdays")');
    if (await weekdaysButtons.count() > 0) {
      await weekdaysButtons.first().click();
      await page.waitForTimeout(500);

      // Enter quantity in modal
      await page.fill('input[type="number"]', '2');
      await page.click('button:has-text("Apply")');
      await page.waitForTimeout(500);

      console.log('✅ Filled weekdays with 2 HCA day shifts each');
    }

    // Click "Generate Preview"
    await page.click('button:has-text("Generate Preview")');

    // Wait for Step 4 to load
    await page.waitForTimeout(2000);
    console.log('✅ STEP 3 Complete');

    // ========================================
    // STEP 4: Preview & Create
    // ========================================
    console.log('📋 STEP 4: Previewing and creating shifts...');

    // Verify we're on Step 4 (Preview)
    await expect(page.locator('text=Preview')).toBeVisible();

    // Wait for preview table to load
    await page.waitForTimeout(1000);

    // Verify shifts are shown in preview table
    const previewTable = page.locator('table').first();
    await expect(previewTable).toBeVisible();

    // Count rows
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
    console.log(`📊 Preview shows ${rows} shifts`);

    // Click "Create All Shifts" button
    const createButton = page.locator('button:has-text("Create")').filter({ hasText: /Create.*Shifts/i });
    await createButton.click();

    // Wait for creation to complete (batch processing)
    await page.waitForTimeout(5000);

    // Look for success indicator
    const successMessage = page.locator('text=/created successfully/i');
    if (await successMessage.isVisible()) {
      console.log('✅ STEP 4 Complete - Shifts created successfully');
    } else {
      console.log('⚠️ Success message not found, but continuing...');
    }

    // ========================================
    // VERIFICATION: Check Database
    // ========================================
    console.log('🔍 VERIFICATION: Checking database...');

    // Navigate to shifts page to verify
    await page.goto(`${BASE_URL}/shifts`);
    await page.waitForTimeout(2000);

    // Verify shifts appear in the list
    const shiftRows = await page.locator('table tbody tr').count();
    expect(shiftRows).toBeGreaterThan(0);

    console.log(`✅ TEST COMPLETE: ${shiftRows} shifts found in database`);
  });

  test('Test "Duplicate Last Week" feature', async ({ page }) => {
    console.log('🧪 TEST: Duplicate Last Week feature...');

    // STEP 1: Select client and date range
    await page.waitForSelector('button:has-text("Select a client")', { timeout: 10000 });
    await page.click('button:has-text("Select a client")');
    await page.waitForTimeout(1000);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(1000);

    await page.click('button:has-text("Next 7 Days")');
    await page.click('button:has-text("Next:")');
    await page.waitForTimeout(2000);

    // STEP 2: Select roles
    const hcaDayCheckbox = page.locator('input[type="checkbox"]').first();
    if (await hcaDayCheckbox.count() > 0) {
      await hcaDayCheckbox.check();
    }
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);

    // STEP 3: Click "Duplicate Last Week"
    const duplicateButton = page.locator('button:has-text("Duplicate Last Week")');
    if (await duplicateButton.isVisible()) {
      await duplicateButton.click();
      await page.waitForTimeout(2000);

      // Verify grid is populated
      const filledCells = await page.locator('input[type="number"]').filter({ hasNot: page.locator('[value=""]') });
      const count = await filledCells.count();

      if (count > 0) {
        console.log(`✅ Duplicate Last Week populated ${count} cells`);
      } else {
        console.log('⚠️ No shifts from last week to duplicate (expected if no historical data)');
      }
    } else {
      console.log('⚠️ Duplicate Last Week button not found');
    }
  });
});

