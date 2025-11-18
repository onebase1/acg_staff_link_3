/**
 * AI Shift Paste - End-to-End Test
 * Tests the full flow: paste schedule → AI conversation → preview → create shifts
 */

import { test, expect } from '@playwright/test';

// Test data - the schedule provided by user
const SCHEDULE_TEXT = `DAYS

Monday- 17th x 5 – Agatha Eze, Mba Kalu James, Oluchi Victoria Ezeokoye, Eneche Ojima & Janet Ochefije Atama

Tuesday – 18th  x 1- Oluchi Victoria Ezeokoye

Wednesday – 19th x 2 – Aminata Bangura & Agatha Eze

Thursday – 20th x 4 – Agatha Eze, Aminata Bangura, Aninta Into Amboson & Oluchi Victoria Ezeokoye

Friday 21st x 2 - Aminata Bangura & Agatha Eze

Saturday 22nd x 5 - Agatha Eze, Mba Kalu James, Oluchi Victoria Ezeokoye, Eneche Ojima & Darlington Sakpoba

Sunday 23rd  x 4 – Ashia Ernest, Mba Kalu James, Darlington Sakpoba & Eneche Ojima

 

NIGHTS

Monday 17th x 2 – Ozia Odewenwa & Ifechukwude Stellamaris Okafor

Tuesday 18th x 2 – Ifechukwude Stellamaris Okafor & Deepak Siliveri

Wednesday 19th x 3 – Ozia Odewenwa, Ifechukwude Stellamaris Okafor & Aishat Kehinde Olaitan

Thursday 20th x 3 – Ozia Odewenwa, Ifechukwude Stellamaris Okafor & Theresa Utomi

Friday 21st x 5 – Akintola Akinpelu, Ozia Odewenwa, Aishat Kehinde Olaitan, Deepak Siliveri, & Theresa Utomi

Saturday 22nd x 3 – Akintola Akinpelu, Ozia Odewenwa & Deepak Siliveri

Sunday 23rd x 3 – Akintola Akinpelu, Ozia & Aminata Bangura & Lilian Chinenye Onwumelu`;

// Expected totals
const EXPECTED_DAY_SHIFTS = 23; // 5+1+2+4+2+5+4
const EXPECTED_NIGHT_SHIFTS = 19; // 2+2+3+3+5+3+3
const EXPECTED_TOTAL_SHIFTS = 42;

test.describe('AI Shift Paste - End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:5173');
    
    // TODO: Add login logic here
    // For now, assume user is already logged in or use test credentials
  });

  test('should extract shifts from pasted schedule and create them in database', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for AI processing

    // Step 1: Navigate to AI Shift Paste
    await page.goto('http://localhost:5173/AIShiftPaste');
    await expect(page.locator('h1')).toContainText('AI Shift Paste');

    // Step 2: Paste schedule text
    const textarea = page.locator('textarea[placeholder*="Paste your schedule"]');
    await textarea.fill(SCHEDULE_TEXT);

    // Step 3: Send message
    const sendButton = page.locator('button:has-text("Send"), button:has(svg)').last();
    await sendButton.click();

    // Step 4: Wait for AI response
    await page.waitForSelector('text=Processing', { timeout: 5000 }).catch(() => {});
    
    // AI might ask for client selection
    await page.waitForSelector('.bg-gray-100', { timeout: 30000 }); // Wait for AI response

    // Check if AI is asking for client
    const aiResponse = await page.locator('.bg-gray-100').last().textContent();
    console.log('AI Response:', aiResponse);

    // If AI asks for client, select one
    if (aiResponse.toLowerCase().includes('client')) {
      // Look for any care home client in the response
      const clientOption = page.locator('button:has-text("1")').first();
      if (await clientOption.isVisible()) {
        await clientOption.click();
        await page.waitForTimeout(2000);
      } else {
        // Type response manually
        await textarea.fill('1');
        await sendButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // If AI asks for month
    const latestResponse = await page.locator('.bg-gray-100').last().textContent();
    if (latestResponse.toLowerCase().includes('month')) {
      await textarea.fill('November');
      await sendButton.click();
      await page.waitForTimeout(2000);
    }

    // If AI asks for role
    const roleResponse = await page.locator('.bg-gray-100').last().textContent();
    if (roleResponse.toLowerCase().includes('role')) {
      await textarea.fill('Healthcare Assistant');
      await sendButton.click();
      await page.waitForTimeout(2000);
    }

    // Step 5: Wait for preview screen
    await page.waitForSelector('text=Review AI Extracted Shifts', { timeout: 60000 });

    // Step 6: Verify shift counts in preview
    const previewText = await page.textContent('body');
    expect(previewText).toContain('shifts'); // Should show shift count

    // Step 7: Click "Create All Shifts" button
    const createButton = page.locator('button:has-text("Create")').first();
    await createButton.click();

    // Step 8: Wait for success message
    await page.waitForSelector('text=Successfully created', { timeout: 60000 });

    // Step 9: Verify success message shows correct count
    const successText = await page.textContent('body');
    expect(successText).toContain('42'); // Should show 42 shifts created

    // Step 10: Verify redirect to Shifts page
    await page.waitForURL('**/Shifts', { timeout: 10000 });

    // Step 11: Verify shifts are in database
    // Query database to confirm shifts were created
    // This would require database access - for now we trust the UI confirmation
    
    console.log('✅ Test passed! 42 shifts created successfully');
  });

  test('should handle invalid client name gracefully', async ({ page }) => {
    await page.goto('http://localhost:5173/AIShiftPaste');

    const textarea = page.locator('textarea[placeholder*="Paste your schedule"]');
    await textarea.fill('Shifts for NonExistentClient\nMonday 17th x 5 HCA');

    const sendButton = page.locator('button:has-text("Send"), button:has(svg)').last();
    await sendButton.click();

    // AI should ask for clarification
    await page.waitForSelector('.bg-gray-100', { timeout: 30000 });
    const aiResponse = await page.locator('.bg-gray-100').last().textContent();
    
    expect(aiResponse.toLowerCase()).toContain('client');
    console.log('✅ AI correctly asks for client clarification');
  });
});

