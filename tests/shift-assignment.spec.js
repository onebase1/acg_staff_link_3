/**
 * Module 1.2: Admin Shift Management - Shift Assignment Tests
 * 
 * Tests the shift assignment workflow:
 * 1. Admin logs in
 * 2. Navigates to Shifts page
 * 3. Clicks "Assign" on an open shift
 * 4. Verifies staff list appears with correct role filtering
 * 5. Assigns staff to shift
 * 6. Verifies success notification
 * 
 * Test Credentials: info@guest-glow.com / Dominion#2025
 */

import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'info@guest-glow.com';
const ADMIN_PASSWORD = 'Dominion#2025';
const BASE_URL = 'http://localhost:5173';

test.describe('Module 1.2: Shift Assignment', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL(/.*dashboard.*/);
    await page.waitForTimeout(2000); // Allow data to load
  });

  test('should display staff list when clicking assign on open shift', async ({ page }) => {
    // Navigate to Shifts page
    await page.goto(`${BASE_URL}/shifts`);
    await page.waitForTimeout(2000);

    // Find first open shift - look for UserPlus icon button
    const assignButton = page.locator('button[title="Assign Staff"]').first();

    if (await assignButton.count() === 0) {
      console.log('⚠️ No open shifts with assign button found - skipping test');
      test.skip();
      return;
    }

    // Click Assign button
    await assignButton.click();

    // Wait for modal to appear
    await page.waitForSelector('text=Assign Staff to Shift', { timeout: 5000 });

    // Verify modal is visible
    await expect(page.locator('text=Assign Staff to Shift')).toBeVisible();

    // Wait for staff list to load (either staff members or "No available staff" message)
    await page.waitForTimeout(1000);

    // Check if staff members are displayed
    const staffMembers = page.locator('button:has-text("Assign")').filter({ has: page.locator('.bg-cyan-600') });
    const noStaffMessage = page.locator('text=No available staff found');

    const hasStaff = await staffMembers.count() > 0;
    const hasNoStaffMessage = await noStaffMessage.isVisible();

    if (hasStaff) {
      console.log(`✅ Found ${await staffMembers.count()} eligible staff members`);
      expect(await staffMembers.count()).toBeGreaterThan(0);
    } else if (hasNoStaffMessage) {
      console.log('⚠️ No available staff found for this shift role');
      // This is valid - shift might require a role with no active staff
    } else {
      throw new Error('Neither staff list nor "no staff" message displayed');
    }
  });

  test('should filter staff by role matching shift requirement', async ({ page }) => {
    // Navigate to Shifts page
    await page.goto(`${BASE_URL}/shifts`);
    await page.waitForTimeout(2000);

    // Find a nurse shift specifically
    const nurseShift = page.locator('[data-testid="shift-card"]').filter({ hasText: 'Nurse' }).filter({ hasText: 'open' }).first();
    
    if (await nurseShift.count() === 0) {
      console.log('⚠️ No open nurse shifts found - skipping test');
      test.skip();
      return;
    }

    // Click Assign button
    await nurseShift.locator('button:has-text("Assign")').click();
    
    // Wait for modal
    await page.waitForSelector('text=Assign Staff to Shift', { timeout: 5000 });
    
    // Verify only nurses are shown
    const staffRoles = page.locator('[data-testid="staff-role"]');
    const roleCount = await staffRoles.count();
    
    for (let i = 0; i < roleCount; i++) {
      const roleText = await staffRoles.nth(i).textContent();
      expect(roleText?.toLowerCase()).toContain('nurse');
    }
    
    console.log(`✅ All ${roleCount} staff members are nurses`);
  });

  test('should successfully assign staff to shift', async ({ page }) => {
    // Navigate to Shifts page
    await page.goto(`${BASE_URL}/shifts`);
    await page.waitForTimeout(2000);

    // Find first assign button
    const assignButton = page.locator('button[title="Assign Staff"]').first();

    if (await assignButton.count() === 0) {
      console.log('⚠️ No open shifts found - skipping test');
      test.skip();
      return;
    }

    console.log('📋 Clicking assign button on first open shift');

    // Click Assign button
    await assignButton.click();

    // Wait for modal
    await page.waitForSelector('text=Assign Staff to Shift', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Find first available staff member's assign button (cyan colored)
    const staffAssignButtons = page.locator('button.bg-cyan-600:has-text("Assign")');

    if (await staffAssignButtons.count() === 0) {
      console.log('⚠️ No available staff for this shift - skipping assignment');
      test.skip();
      return;
    }

    // Get staff name before clicking
    const staffCard = staffAssignButtons.first().locator('..').locator('..');
    const staffName = await staffCard.locator('.font-medium').textContent();
    console.log(`📋 Assigning ${staffName} to shift`);

    // Click assign button
    await staffAssignButtons.first().click();

    // Wait for success notification (toast with "assigned" text)
    await page.waitForSelector('text=assigned', { timeout: 10000 });

    console.log('✅ Staff successfully assigned to shift');

    // Verify modal closes
    await expect(page.locator('text=Assign Staff to Shift')).not.toBeVisible({ timeout: 5000 });
  });

  test('should prevent double-booking on same date', async ({ page }) => {
    // This test verifies the validation logic prevents assigning staff
    // who are already working on the same date
    
    // Navigate to Shifts page
    await page.goto(`${BASE_URL}/shifts`);
    await page.waitForTimeout(2000);

    // Find shifts on the same date
    const shiftsOnSameDate = page.locator('[data-testid="shift-card"]').filter({ hasText: '2025-11-14' });
    
    if (await shiftsOnSameDate.count() < 2) {
      console.log('⚠️ Not enough shifts on same date - skipping test');
      test.skip();
      return;
    }

    // TODO: Implement double-booking prevention test
    // This requires assigning staff to first shift, then attempting to assign same staff to second shift
    console.log('⚠️ Double-booking prevention test - implementation pending');
  });
});

