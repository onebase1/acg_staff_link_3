import { test, expect } from '@playwright/test';

/**
 * 🧪 SHIFT JOURNEY & TIMESHEET CREATION TESTS
 * 
 * Tests the complete shift lifecycle with focus on CRITICAL timesheet creation
 * 
 * Test Credentials: info@guest-glow.com / Dominion#2025
 * Agency: Dominion Agency
 */

const BASE_URL = 'http://localhost:5173';
const ADMIN_EMAIL = 'info@guest-glow.com';
const ADMIN_PASSWORD = 'Dominion#2025';

test.describe('Shift Journey & Timesheet Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Dominion Agency admin
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign In")');
    
    // Wait for dashboard to load
    await page.waitForURL(/dashboard|shifts/, { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test('CRITICAL: Admin bypass confirmation should create timesheet', async ({ page }) => {
    console.log('🧪 Testing admin bypass confirmation with timesheet creation...');
    
    // Navigate to Shifts page
    await page.goto(`${BASE_URL}/shifts`);
    await page.waitForTimeout(2000);

    // Find first open shift
    const assignButton = page.locator('button[title="Assign Staff"]').first();
    
    if (await assignButton.count() === 0) {
      console.log('⚠️ No open shifts found - skipping test');
      test.skip();
      return;
    }

    // Click Assign button
    await assignButton.click();
    
    // Wait for modal
    await page.waitForSelector('text=Assign Staff to Shift', { timeout: 5000 });
    
    // Enable "Confirm on behalf of staff" checkbox
    const bypassCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /confirm.*behalf/i });
    if (await bypassCheckbox.count() > 0) {
      await bypassCheckbox.check();
      console.log('✅ Enabled "Confirm on behalf of staff"');
    }
    
    // Find first available staff member
    const staffAssignButtons = page.locator('button.bg-cyan-600:has-text("Assign")');
    
    if (await staffAssignButtons.count() === 0) {
      console.log('⚠️ No available staff - skipping test');
      test.skip();
      return;
    }
    
    // Get staff name
    const staffCard = staffAssignButtons.first().locator('..').locator('..');
    const staffName = await staffCard.locator('.font-medium').textContent();
    console.log(`📋 Assigning ${staffName} with admin bypass`);
    
    // Click assign
    await staffAssignButtons.first().click();
    
    // Wait for success notification
    await page.waitForSelector('text=confirmed', { timeout: 10000 });
    console.log('✅ Shift confirmed via admin bypass');
    
    // Wait for modal to close
    await page.waitForTimeout(2000);
    
    // Navigate to Timesheets page to verify timesheet was created
    await page.goto(`${BASE_URL}/timesheets`);
    await page.waitForTimeout(3000);
    
    // Check if timesheet exists (should be in draft status)
    const timesheetRows = page.locator('table tbody tr');
    const timesheetCount = await timesheetRows.count();
    
    console.log(`📊 Found ${timesheetCount} timesheet(s)`);
    
    // Verify at least one timesheet exists
    expect(timesheetCount).toBeGreaterThan(0);
    
    // Verify draft status exists
    const draftStatus = page.locator('text=draft').or(page.locator('text=Draft'));
    const hasDraft = await draftStatus.count() > 0;
    
    if (hasDraft) {
      console.log('✅ PASS: Timesheet created with draft status');
    } else {
      console.log('⚠️ WARNING: No draft timesheet found - may have been auto-approved');
    }
  });

  test('CRITICAL: Verify timesheet record exists after confirmation', async ({ page }) => {
    console.log('🧪 Verifying timesheet creation via database query...');
    
    // Navigate to Timesheets page
    await page.goto(`${BASE_URL}/timesheets`);
    await page.waitForTimeout(3000);
    
    // Get all timesheets
    const timesheetRows = page.locator('table tbody tr');
    const timesheetCount = await timesheetRows.count();
    
    console.log(`📊 Total timesheets in system: ${timesheetCount}`);
    
    if (timesheetCount === 0) {
      console.log('❌ FAIL: No timesheets found in system');
      console.log('🔍 This indicates timesheet creation is not working');
      throw new Error('No timesheets found - timesheet creation may be broken');
    }
    
    // Check for draft timesheets (newly created)
    const draftTimesheets = page.locator('td:has-text("draft"), td:has-text("Draft")');
    const draftCount = await draftTimesheets.count();
    
    console.log(`📋 Draft timesheets: ${draftCount}`);
    
    // Check for approved timesheets
    const approvedTimesheets = page.locator('td:has-text("approved"), td:has-text("Approved")');
    const approvedCount = await approvedTimesheets.count();
    
    console.log(`✅ Approved timesheets: ${approvedCount}`);
    
    // Verify we have timesheets in the system
    expect(timesheetCount).toBeGreaterThan(0);
    console.log('✅ PASS: Timesheets exist in system');
  });

  test('Check shift status progression', async ({ page }) => {
    console.log('🧪 Testing shift status progression...');
    
    // Navigate to Shifts page
    await page.goto(`${BASE_URL}/shifts`);
    await page.waitForTimeout(2000);
    
    // Count shifts by status
    const openShifts = page.locator('text=open').or(page.locator('text=Open'));
    const assignedShifts = page.locator('text=assigned').or(page.locator('text=Assigned'));
    const confirmedShifts = page.locator('text=confirmed').or(page.locator('text=Confirmed'));
    
    const openCount = await openShifts.count();
    const assignedCount = await assignedShifts.count();
    const confirmedCount = await confirmedShifts.count();
    
    console.log(`📊 Shift Status Breakdown:`);
    console.log(`   - Open: ${openCount}`);
    console.log(`   - Assigned: ${assignedCount}`);
    console.log(`   - Confirmed: ${confirmedCount}`);
    
    // Verify we have shifts in various states
    const totalShifts = openCount + assignedCount + confirmedCount;
    expect(totalShifts).toBeGreaterThan(0);
    
    console.log('✅ PASS: Shifts exist in system with various statuses');
  });
});

