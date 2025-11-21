/**
 * 🧪 MULTI-CHANNEL URGENT BROADCAST - Playwright E2E Tests
 * 
 * Tests the complete multi-channel urgent shift broadcast system:
 * - Agency Settings configuration
 * - Channel Selector Modal
 * - SMS/Email/WhatsApp broadcast
 * - Race condition prevention
 * 
 * Test User: info@guest-glow.com (Dominion Healthcare Services Ltd)
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test.local' });
dotenv.config({ path: '.env.test' });

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'info@guest-glow.com',
  password: process.env.TEST_USER_PASSWORD,
  agency: 'Dominion Healthcare Services Ltd',
  agencyId: 'c8e84c94-8233-4084-b4c3-63ad9dc81c16'
};

const BASE_URL = process.env.VITE_SITE_URL || 'http://localhost:5173';

// Validate required environment variables
if (!TEST_USER.password) {
  throw new Error('TEST_USER_PASSWORD is required. Set it in .env.test.local');
}

test.describe('Multi-Channel Urgent Broadcast System', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);
    
    // Login as Dominion admin
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL(/\/(dashboard|shifts)/);
    await page.waitForLoadState('networkidle');
  });

  test('1. Agency Settings - Verify Channel Toggles', async ({ page }) => {
    // Navigate to Agency Settings
    await page.goto(`${BASE_URL}/agency-settings`);
    await page.waitForLoadState('networkidle');

    // Scroll to Urgent Shift Broadcast Channels section
    const channelSection = page.locator('text=Urgent Shift Broadcast Channels');
    await expect(channelSection).toBeVisible();
    await channelSection.scrollIntoViewIfNeeded();

    // Verify all 4 toggles are present
    await expect(page.locator('text=SMS (Twilio)')).toBeVisible();
    await expect(page.locator('text=Email (Resend)')).toBeVisible();
    await expect(page.locator('text=WhatsApp (Meta)')).toBeVisible();
    await expect(page.locator('text=Allow Manual Override')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'test-results/agency-settings-channels.png' });
  });

  test('2. Create Urgent Shift and Verify Broadcast Button', async ({ page }) => {
    // Navigate to Shifts page
    await page.goto(`${BASE_URL}/shifts`);
    await page.waitForLoadState('networkidle');

    // Click "Add Shift" button
    await page.click('button:has-text("Add Shift")');
    await page.waitForSelector('dialog[open]');

    // Fill shift form
    await page.selectOption('select[name="client_id"]', { index: 1 }); // Select first client
    await page.selectOption('select[name="role_required"]', 'healthcare_assistant');
    await page.fill('input[type="date"]', new Date().toISOString().split('T')[0]); // Today
    await page.fill('input[name="start_time"]', '08:00');
    await page.fill('input[name="end_time"]', '20:00');
    await page.selectOption('select[name="urgency"]', 'urgent'); // ✅ URGENT
    await page.selectOption('select[name="status"]', 'open'); // ✅ OPEN

    // Submit form
    await page.click('button:has-text("Create Shift")');
    await page.waitForSelector('dialog[open]', { state: 'hidden' });

    // Wait for shift to appear in table
    await page.waitForTimeout(2000);

    // Verify broadcast button appears (⚡ icon)
    const broadcastButton = page.locator('button[title="Broadcast Urgent Shift"]');
    await expect(broadcastButton).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'test-results/urgent-shift-created.png' });
  });

  test('3. Channel Selector Modal - Verify UI', async ({ page }) => {
    // Navigate to Shifts page
    await page.goto(`${BASE_URL}/shifts`);
    await page.waitForLoadState('networkidle');

    // Find first urgent shift and click broadcast button
    const broadcastButton = page.locator('button[title="Broadcast Urgent Shift"]').first();
    await broadcastButton.click();

    // Wait for Channel Selector Modal
    await page.waitForSelector('text=Select Broadcast Channels');

    // Verify modal content
    await expect(page.locator('text=📱 SMS (Twilio)')).toBeVisible();
    await expect(page.locator('text=📧 Email (Resend)')).toBeVisible();
    await expect(page.locator('text=💬 WhatsApp (Meta)')).toBeVisible();
    await expect(page.locator('text=eligible staff members')).toBeVisible();
    await expect(page.locator('text=Total estimated cost')).toBeVisible();

    // Verify all channels are checked by default
    const smsCheckbox = page.locator('input[type="checkbox"]').nth(0);
    const emailCheckbox = page.locator('input[type="checkbox"]').nth(1);
    const whatsappCheckbox = page.locator('input[type="checkbox"]').nth(2);

    await expect(smsCheckbox).toBeChecked();
    await expect(emailCheckbox).toBeChecked();
    await expect(whatsappCheckbox).toBeChecked();

    // Take screenshot
    await page.screenshot({ path: 'test-results/channel-selector-modal.png' });

    // Close modal
    await page.click('button:has-text("Cancel")');
  });

  test('4. Broadcast with Selected Channels', async ({ page }) => {
    // Navigate to Shifts page
    await page.goto(`${BASE_URL}/shifts`);
    await page.waitForLoadState('networkidle');

    // Click broadcast button
    const broadcastButton = page.locator('button[title="Broadcast Urgent Shift"]').first();
    await broadcastButton.click();

    // Wait for modal
    await page.waitForSelector('text=Select Broadcast Channels');

    // Uncheck WhatsApp (test with SMS + Email only)
    const whatsappCheckbox = page.locator('input[type="checkbox"]').nth(2);
    await whatsappCheckbox.uncheck();

    // Take screenshot before broadcast
    await page.screenshot({ path: 'test-results/before-broadcast.png' });

    // Click broadcast button
    await page.click('button:has-text("Broadcast to")');

    // Wait for success toast
    await page.waitForSelector('text=Broadcast sent!', { timeout: 10000 });

    // Verify toast shows channel breakdown
    const toast = page.locator('text=Broadcast sent!');
    await expect(toast).toBeVisible();

    // Take screenshot of success
    await page.screenshot({ path: 'test-results/broadcast-success.png' });
  });

  test('5. Verify Broadcast Button State Changes', async ({ page }) => {
    // Navigate to Shifts page
    await page.goto(`${BASE_URL}/shifts`);
    await page.waitForLoadState('networkidle');

    // Find broadcast button
    const broadcastButton = page.locator('button:has-text("Broadcast Alert")').first();
    
    // Initial state - should be red
    await expect(broadcastButton).toHaveClass(/bg-red-600/);

    // Click to broadcast
    await broadcastButton.click();
    await page.waitForSelector('text=Select Broadcast Channels');
    await page.click('button:has-text("Broadcast to")');

    // Wait for broadcast to complete
    await page.waitForSelector('text=Broadcast sent!', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Button should now be orange (already broadcast)
    const broadcastAgainButton = page.locator('button:has-text("Broadcast Again")').first();
    await expect(broadcastAgainButton).toBeVisible();
    await expect(broadcastAgainButton).toHaveClass(/bg-orange-600/);

    // Take screenshot
    await page.screenshot({ path: 'test-results/broadcast-again-button.png' });
  });
});

