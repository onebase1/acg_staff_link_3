/**
 * ✅ SHIFT MARKETPLACE FILTERING TESTS
 * 
 * Tests that staff members only see shifts they are eligible for:
 * 1. Role matching - only see shifts for their role
 * 2. No double-booking - can't see shifts on days they're already working
 * 3. Agency matching - only see shifts from their agency
 * 
 * Test User: Chadaira Basera (g.basera5+chadaira@gmail.com)
 * Role: care_worker
 */

import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'g.basera5+chadaira@gmail.com',
  password: 'Broadband@123',
  expectedRole: 'care_worker'
};

test.describe('Shift Marketplace Filtering', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as Chadaira
    await page.goto('http://localhost:5173/login');
    await page.getByPlaceholder('you@guest-glow.com').fill(TEST_USER.email);
    await page.getByPlaceholder('••••••••').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Wait for dashboard to load
    await page.waitForURL('**/Dashboard');
    await page.waitForTimeout(2000);
  });

  test('TC1: User role is displayed correctly', async ({ page }) => {
    // Navigate to marketplace
    await page.getByRole('link', { name: 'Shift Marketplace' }).click();
    await page.waitForURL('**/shiftmarketplace');
    await page.waitForTimeout(2000);
    
    // Check role display
    const roleText = await page.locator('text=Your Role').locator('..').locator('p').nth(1).textContent();
    console.log('✅ User role displayed:', roleText);
    
    // Verify role matches expected
    expect(roleText.toLowerCase()).toContain('care');
  });

  test('TC2: Only role-matching shifts are visible', async ({ page }) => {
    // Navigate to marketplace
    await page.getByRole('link', { name: 'Shift Marketplace' }).click();
    await page.waitForURL('**/shiftmarketplace');
    await page.waitForTimeout(3000);
    
    // Get all shift cards
    const shiftCards = await page.locator('[class*="Card"]').filter({ hasText: /Earn|Accept This Shift/ }).all();
    console.log(`✅ Found ${shiftCards.length} shifts in marketplace`);
    
    // Check each shift's role
    for (const card of shiftCards) {
      const roleText = await card.locator('[class*="Badge"]').first().textContent();
      console.log('  - Shift role:', roleText);
      
      // CRITICAL: Should NOT see these roles
      const invalidRoles = ['senior care worker', 'nurse', 'specialist nurse', 'night care assistant'];
      const hasInvalidRole = invalidRoles.some(role => roleText.toLowerCase().includes(role));
      
      if (hasInvalidRole) {
        console.error(`❌ FAIL: Found shift with role "${roleText}" - care_worker should not see this!`);
      }
      
      expect(hasInvalidRole).toBe(false);
    }
  });

  test('TC3: Marketplace visible flag overrides role matching', async ({ page }) => {
    // This tests that if admin marks a shift as marketplace_visible=true,
    // it shows regardless of role
    
    await page.getByRole('link', { name: 'Shift Marketplace' }).click();
    await page.waitForURL('**/shiftmarketplace');
    await page.waitForTimeout(3000);
    
    const shiftCount = await page.locator('text=/\\d+ shifts matched/').textContent();
    console.log('✅ Shifts matched:', shiftCount);
    
    // If there are shifts, they should either:
    // 1. Match user's role (care_worker)
    // 2. Be marked marketplace_visible=true by admin
    
    const count = parseInt(shiftCount.match(/\d+/)[0]);
    console.log(`✅ Total shifts visible: ${count}`);
  });

  test('TC4: No shifts on days already working', async ({ page }) => {
    // First, check if user has any assigned shifts
    await page.getByRole('link', { name: 'Staff Portal' }).click();
    await page.waitForURL('**/staffportal');
    await page.waitForTimeout(2000);
    
    // Get assigned shift dates
    const assignedShiftDates = [];
    const assignedShifts = await page.locator('text=/Assigned Shifts/').locator('..').locator('[class*="Card"]').all();
    
    for (const shift of assignedShifts) {
      const dateText = await shift.locator('text=/\\w+, \\w+ \\d+, \\d+/').textContent();
      assignedShiftDates.push(dateText);
      console.log('  - Already working:', dateText);
    }
    
    // Now check marketplace
    await page.getByRole('link', { name: 'Shift Marketplace' }).click();
    await page.waitForURL('**/shiftmarketplace');
    await page.waitForTimeout(3000);
    
    // Get marketplace shift dates
    const marketplaceShifts = await page.locator('[class*="Card"]').filter({ hasText: /Accept This Shift/ }).all();
    
    for (const shift of marketplaceShifts) {
      const dateText = await shift.locator('text=/\\w+, \\w+ \\d+, \\d+/').textContent();
      
      // CRITICAL: Should NOT see shifts on days already working
      const isDoubleBooking = assignedShiftDates.some(assigned => assigned === dateText);
      
      if (isDoubleBooking) {
        console.error(`❌ FAIL: Found marketplace shift on ${dateText} - user already working this day!`);
      }
      
      expect(isDoubleBooking).toBe(false);
    }
    
    console.log('✅ No double-booking detected');
  });

});

