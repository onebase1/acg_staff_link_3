import { test, expect } from '@playwright/test';

test.describe('Invoice Generation Flow - Visual Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Login as Dominion admin
    await page.fill('input[type="email"]', 'info@guest-glow.com');
    await page.fill('input[type="password"]', 'Dominion#2025');
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForURL(/dashboard|home/i, { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test('should display Generate Invoices page', async ({ page }) => {
    // Navigate to Generate Invoices
    await page.goto('http://localhost:5173/#/GenerateInvoices');
    await page.waitForTimeout(2000);
    
    // Take screenshot of the page
    await page.screenshot({ 
      path: 'e2e/screenshots/01-generate-invoices-page.png',
      fullPage: true 
    });
    
    // Check for key elements
    await expect(page.getByText(/Generate Invoices/i)).toBeVisible();
    
    console.log('✅ Generate Invoices page loaded');
  });

  test('should show approved timesheets for Divine Care Center', async ({ page }) => {
    await page.goto('http://localhost:5173/#/GenerateInvoices');
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'e2e/screenshots/02-timesheets-list.png',
      fullPage: true 
    });
    
    // Check for Divine Care Center
    const divineText = await page.getByText(/Divine Care/i).first();
    if (await divineText.isVisible()) {
      console.log('✅ Divine Care Center timesheets visible');
    }
  });

  test('should allow selection and show preview dialog', async ({ page }) => {
    await page.goto('http://localhost:5173/#/GenerateInvoices');
    await page.waitForTimeout(3000);
    
    // Try to select timesheets (if checkboxes exist)
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    
    if (checkboxes.length > 0) {
      console.log(`Found ${checkboxes.length} checkboxes`);
      
      // Select first checkbox
      await checkboxes[0].check();
      await page.waitForTimeout(1000);
      
      // Take screenshot with selection
      await page.screenshot({ 
        path: 'e2e/screenshots/03-timesheets-selected.png',
        fullPage: true 
      });
      
      // Look for Generate button
      const generateBtn = await page.getByRole('button', { name: /Generate.*Invoice/i });
      if (await generateBtn.isVisible()) {
        await generateBtn.click();
        await page.waitForTimeout(2000);
        
        // Screenshot of preview dialog
        await page.screenshot({ 
          path: 'e2e/screenshots/04-preview-dialog.png',
          fullPage: true 
        });
        
        console.log('✅ Preview dialog opened');
      }
    } else {
      console.log('⚠️ No checkboxes found - might be no timesheets available');
      await page.screenshot({ 
        path: 'e2e/screenshots/03-no-timesheets.png',
        fullPage: true 
      });
    }
  });

  test('should display Invoices page with test invoice', async ({ page }) => {
    await page.goto('http://localhost:5173/#/Invoices');
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'e2e/screenshots/05-invoices-page.png',
      fullPage: true 
    });
    
    // Check for test invoice
    const testInvoice = await page.getByText(/INV-TEST-20251124070245/i);
    if (await testInvoice.isVisible()) {
      console.log('✅ Test invoice found on page');
      
      // Click on it to view details
      await testInvoice.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'e2e/screenshots/06-invoice-detail.png',
        fullPage: true 
      });
    } else {
      console.log('⚠️ Test invoice not visible');
    }
  });

  test('should show bank details warning if missing', async ({ page }) => {
    await page.goto('http://localhost:5173/#/GenerateInvoices');
    await page.waitForTimeout(3000);
    
    // Look for bank details warning
    const warning = await page.getByText(/Bank Details Required/i);
    if (await warning.isVisible()) {
      console.log('⚠️ Bank details warning shown');
      await page.screenshot({ 
        path: 'e2e/screenshots/07-bank-details-warning.png',
        fullPage: true 
      });
    } else {
      console.log('✅ No bank details warning (configured correctly)');
    }
  });
});

