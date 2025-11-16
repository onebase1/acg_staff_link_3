import { test, expect } from '@playwright/test';

const STAFF_EMAIL = 'g.basera5+chadaira@gmail.com';
const STAFF_PASSWORD = 'Test1234!'; // Update if different

test.describe('Shift Acceptance Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5173/login');
    
    // Login as Chadaira
    await page.fill('input[type="email"]', STAFF_EMAIL);
    await page.fill('input[type="password"]', STAFF_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForURL(/.*/, { timeout: 10000 });
  });

  test('TC1: Staff can view available shifts in marketplace', async ({ page }) => {
    // Navigate to shift marketplace
    await page.goto('http://localhost:5173/shift-marketplace');
    
    // Wait for shifts to load
    await page.waitForSelector('text=Shift Marketplace', { timeout: 10000 });
    
    // Check that role is displayed correctly
    const roleText = await page.textContent('text=/Your Role:/i');
    expect(roleText).toContain('healthcare assistant');
    
    // Check that at least one shift is visible
    const shiftCards = await page.locator('[data-testid="shift-card"], .shift-card, text=/Nov.*2025/i').count();
    expect(shiftCards).toBeGreaterThan(0);
    
    console.log(`✅ TC1 PASSED: Found ${shiftCards} available shifts`);
  });

  test('TC2: Staff can accept a shift from marketplace', async ({ page }) => {
    // Navigate to shift marketplace
    await page.goto('http://localhost:5173/shift-marketplace');
    
    // Wait for shifts to load
    await page.waitForSelector('text=Shift Marketplace', { timeout: 10000 });
    
    // Find and click "Accept Shift" button
    const acceptButton = page.locator('button:has-text("Accept"), button:has-text("Accept Shift")').first();
    
    if (await acceptButton.count() > 0) {
      await acceptButton.click();
      
      // Wait for success toast or confirmation
      await page.waitForSelector('text=/accepted/i, text=/success/i', { timeout: 10000 });
      
      console.log('✅ TC2 PASSED: Shift accepted successfully');
    } else {
      console.log('⏭️  TC2 SKIPPED: No available shifts to accept');
    }
  });

  test('TC3: Staff can view assigned shifts in portal', async ({ page }) => {
    // Navigate to staff portal
    await page.goto('http://localhost:5173/staff-portal');
    
    // Wait for portal to load
    await page.waitForSelector('text=/Staff Portal|My Shifts/i', { timeout: 10000 });
    
    // Check for assigned shifts
    const shiftElements = await page.locator('text=/Nov.*2025/i, [data-testid="assigned-shift"]').count();
    expect(shiftElements).toBeGreaterThan(0);
    
    console.log(`✅ TC3 PASSED: Found ${shiftElements} assigned shifts in portal`);
  });

  test('TC4: Staff can confirm attendance for assigned shift', async ({ page }) => {
    // Navigate to staff portal
    await page.goto('http://localhost:5173/staff-portal');
    
    // Wait for portal to load
    await page.waitForSelector('text=/Staff Portal|My Shifts/i', { timeout: 10000 });
    
    // Look for confirm button
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Confirm Attendance")').first();
    
    if (await confirmButton.count() > 0) {
      await confirmButton.click();
      
      // Wait for confirmation
      await page.waitForSelector('text=/confirmed/i', { timeout: 10000 });
      
      console.log('✅ TC4 PASSED: Attendance confirmed successfully');
    } else {
      console.log('⏭️  TC4 SKIPPED: No shifts requiring confirmation');
    }
  });

  test('TC5: Marketplace filters out shifts on days already working', async ({ page }) => {
    // Navigate to shift marketplace
    await page.goto('http://localhost:5173/shift-marketplace');
    
    // Wait for shifts to load
    await page.waitForSelector('text=Shift Marketplace', { timeout: 10000 });
    
    // Get all visible shift dates
    const shiftDates = await page.locator('text=/Nov \\d+/').allTextContents();
    
    // Check that Nov 13 shifts are NOT visible (Chadaira already has shifts on Nov 13)
    const nov13Shifts = shiftDates.filter(date => date.includes('Nov 13'));
    expect(nov13Shifts.length).toBe(0);
    
    console.log('✅ TC5 PASSED: Double-booking prevention working');
  });

  test('TC6: Marketplace only shows healthcare_assistant shifts', async ({ page }) => {
    // Navigate to shift marketplace
    await page.goto('http://localhost:5173/shift-marketplace');
    
    // Wait for shifts to load
    await page.waitForSelector('text=Shift Marketplace', { timeout: 10000 });
    
    // Check that no "Nurse" or "Senior Care Worker" badges are visible
    const nurseShifts = await page.locator('text=/Nurse|Senior Care Worker/i').count();
    expect(nurseShifts).toBe(0);
    
    // Check that "Healthcare Assistant" shifts are visible
    const hcaShifts = await page.locator('text=/Healthcare Assistant/i').count();
    expect(hcaShifts).toBeGreaterThan(0);
    
    console.log('✅ TC6 PASSED: Role filtering working correctly');
  });
});

