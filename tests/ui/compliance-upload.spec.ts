import { test, expect, Page } from '@playwright/test';
import { TEST_CONFIG } from '../test-config';

const TEST_FILE_PATH = 'tests/fixtures/compliance-test.pdf';

function attachConsoleLogger(page: Page) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[browser][error] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    console.log(`[browser][pageerror] ${err}`);
  });
}

async function loginAsStaff(page: Page) {
  await page.goto(`${TEST_CONFIG.app.baseUrl}/login`);
  await page.getByLabel(/work email/i).fill(TEST_CONFIG.staff.email);
  await page.getByLabel(/password/i).fill(TEST_CONFIG.staff.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForTimeout(2000);
}

async function loginAsAdmin(page: Page) {
  await page.goto(`${TEST_CONFIG.app.baseUrl}/login`);
  await page.getByLabel(/work email/i).fill(TEST_CONFIG.dominion.email);
  await page.getByLabel(/password/i).fill(TEST_CONFIG.dominion.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/i, { timeout: TEST_CONFIG.timeouts.medium });
}

function pastDateString(daysAgo = 1): string {
  const now = new Date();
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return past.toISOString().slice(0, 10);
}

// Module 2.5: Compliance - UI coverage for upload, verification, filters & badges

test.describe('Module 2.5 - Compliance Upload & Verification', () => {
  test('Staff can upload expired compliance document and see Expired badge + filters', async ({ page }) => {
    attachConsoleLogger(page);
    await loginAsStaff(page);

    await page.goto(`${TEST_CONFIG.app.baseUrl}/ComplianceTracker`);
    await page.waitForLoadState('networkidle');
    console.log('Staff - current URL after navigating to ComplianceTracker:', page.url());
    await expect(page.getByRole('heading', { name: /my documents|compliance tracker/i })).toBeVisible();

    // Open upload modal
    await page.getByRole('button', { name: /upload document/i }).click();
    await expect(page.getByRole('heading', { name: /upload document/i })).toBeVisible();

    // Upload a dummy PDF file from fixtures
    const fileInput = page.locator('input[type="file"][accept=".pdf,.jpg,.jpeg,.png"]').first();
    await fileInput.setInputFiles(TEST_FILE_PATH);

    await expect(page.getByText('\u2705 File Uploaded', { exact: true })).toBeVisible();

    const uniqueSuffix = Date.now();
    const docName = `Playwright Compliance Test ${uniqueSuffix}`;

    await page.getByLabel(/document name/i).fill(docName);
    await page.getByLabel(/expiry date/i).fill(pastDateString(1));

    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page.getByRole('heading', { name: /upload document/i })).toBeHidden();

    // Verify document appears in list
    await expect(page.getByRole('heading', { name: docName })).toBeVisible();

    const docCard = page.locator('div').filter({
      has: page.getByRole('heading', { name: docName }),
    }).first();

    // Expiry badge should show "Expired" for past date
    await expect(docCard.getByText(/expired/i)).toBeVisible();

    // Search filter: non-matching term hides card
    const searchInput = page.getByPlaceholder(/search documents/i);
    await searchInput.fill('non-existent-term');
    await expect(page.getByText(/no documents match your filters/i)).toBeVisible();

    // Search back by document name shows card again
    await searchInput.fill(docName);
    await expect(page.getByRole('heading', { name: docName })).toBeVisible();

    // Type filter: select DBS Check (default type) and ensure card visible
    const typeFilterTrigger = page.getByRole('button', { name: /all types/i });
    await typeFilterTrigger.click();
    await page.getByRole('option', { name: /dbs check/i }).click();
    await expect(page.getByRole('heading', { name: docName })).toBeVisible();
  });

  test('Admin can upload and verify compliance document for a staff member', async ({ page }) => {
    attachConsoleLogger(page);
    await loginAsAdmin(page);

    await page.goto(`${TEST_CONFIG.app.baseUrl}/ComplianceTracker`);
    await page.waitForLoadState('networkidle');
    console.log('Admin - current URL after navigating to ComplianceTracker:', page.url());
    await expect(page.getByRole('heading', { name: /compliance tracker/i })).toBeVisible();

    // Create a new pending document for a staff member
    await page.getByRole('button', { name: /upload document/i }).first().click();
    await expect(page.getByRole('heading', { name: /upload document/i })).toBeVisible();

    const fileInput = page.locator('input[type="file"][accept=".pdf,.jpg,.jpeg,.png"]').first();
    await fileInput.setInputFiles(TEST_FILE_PATH);

    await expect(page.getByText('\u2705 File Uploaded', { exact: true })).toBeVisible();

    const uniqueSuffix = Date.now();
    const docName = `Admin Compliance Verify ${uniqueSuffix}`;
    await page.getByLabel(/document name/i).fill(docName);

    // Select first staff member in dropdown
    const staffTrigger = page.getByLabel(/staff member/i);
    await staffTrigger.click();
    const firstOption = page.getByRole('option').first();
    await firstOption.click();

    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page.getByRole('heading', { name: /upload document/i })).toBeHidden();

    // Filter by Pending status and search by document name
    const statusFilterTrigger = page.getByRole('button', { name: /all status/i });
    await statusFilterTrigger.click();
    await page.getByRole('option', { name: /pending/i }).click();

    const searchInput = page.getByPlaceholder(/search documents/i);
    await searchInput.fill(docName);

    const docCard = page.locator('div').filter({
      has: page.getByRole('heading', { name: docName }),
    }).first();
    await expect(docCard).toBeVisible();

    // Open Edit modal and change status to Verified
    await docCard.getByRole('button', { name: /edit/i }).click();
    await expect(page.getByRole('heading', { name: /edit document/i })).toBeVisible();

    const statusSelectTrigger = page.getByRole('button', { name: /pending review/i });
    await statusSelectTrigger.click();
    await page.getByRole('option', { name: /verified/i }).click();

    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByRole('heading', { name: /edit document/i })).toBeHidden();

    // Document should now show Verified badge
    await searchInput.fill(docName);
    const verifiedCard = page.locator('div').filter({
      has: page.getByRole('heading', { name: docName }),
    }).first();

    await expect(verifiedCard.getByText(/verified/i)).toBeVisible();
  });
});

