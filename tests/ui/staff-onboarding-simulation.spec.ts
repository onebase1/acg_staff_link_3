import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { TEST_CONFIG } from '../test-config';
import * as fs from 'fs';

const FIXTURE_PATH = 'tests/fixtures/compliance-test.pdf';
const FIXTURE_BUFFER = fs.readFileSync(FIXTURE_PATH);

const RUN_ID = Date.now().toString();
const MANUAL_CERT_FILENAME = `manual-handling-${RUN_ID}.pdf`;
const COSHH_CERT_FILENAME = `coshh-training-${RUN_ID}.pdf`;

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

const TRAINING_NAMES = [
  'Manual Handling & Moving People',
  'Safeguarding Children',
  'Safeguarding of Vulnerable Adults',
  'Preventing Radicalisation (PREVENT)',
  'Fire Safety',
  'Food Hygiene',
  'Health Safety & Welfare',
  'Infection Control',
  'Person Centred Care & Consent',
  'Dementia Awareness',
];

const TRAINING_COMPLETED = '2024-01-15';
const TRAINING_EXPIRY = '2027-01-15';

async function completeProfileSetupAsStaff(page: Page) {
  await page.goto(`${TEST_CONFIG.app.baseUrl}/ProfileSetup`);
  await page.waitForLoadState('networkidle');

  // Basic info
  await page.getByLabel(/full name/i).fill('Chadaira Test Worker');
  await page.getByLabel(/phone \*/i).fill('+447700900123');
  await page.getByLabel(/date of birth \*/i).fill('1990-05-15');

  // Address
  await page.getByLabel(/address line 1 \*/i).fill('1 Test Street');
  await page.getByLabel(/address line 2/i).fill('Flat 2B');
  await page.getByLabel(/city \*/i).fill('London');
  await page.getByLabel(/postcode \*/i).fill('SE1 1AA');

  // Emergency contact
  await page.getByLabel(/contact name \*/i).fill('Test Next of Kin');
  await page.getByLabel(/contact phone \*/i).fill('+447700900456');
  await page.getByLabel(/relationship \*/i).fill('Spouse');

  // References - add two
  const addReferenceButton = page.getByRole('button', { name: /add reference/i });
  await addReferenceButton.click();
  await addReferenceButton.click();

  const refCards = page.locator('div').filter({ hasText: 'Reference 1' }).locator('..');
  await page.getByPlaceholder('Referee Name').nth(0).fill('Manager One');
  await page.getByPlaceholder('Position/Job Title').nth(0).fill('Home Manager');
  await page.getByPlaceholder('Company').nth(0).fill('Care Home A');
  await page.getByPlaceholder('Email').nth(0).fill('manager.one@example.com');
  await page.getByPlaceholder('Phone').nth(0).fill('+447700900001');

  await page.getByPlaceholder('Referee Name').nth(1).fill('Manager Two');
  await page.getByPlaceholder('Position/Job Title').nth(1).fill('Senior Nurse');
  await page.getByPlaceholder('Company').nth(1).fill('Care Home B');
  await page.getByPlaceholder('Email').nth(1).fill('manager.two@example.com');
  await page.getByPlaceholder('Phone').nth(1).fill('+447700900002');

  // Employment history - add one job
  const addEmploymentButton = page.getByRole('button', { name: /add employment/i });
  await addEmploymentButton.click();

  await page.getByPlaceholder('Employer Name *').nth(0).fill('Sunrise Care Home');
  await page.getByPlaceholder('Position/Job Title *').nth(0).fill('Healthcare Assistant');

  const employmentCard = page.getByText('Job 1').locator('..');
  await employmentCard.locator('input[type="date"]').nth(0).fill('2020-01-01');
  await employmentCard.locator('input[type="date"]').nth(1).fill('2024-01-01');
  await page.getByPlaceholder('Key Responsibilities').fill('Personal care, record keeping, medication prompts.');

  // Occupational health
  await page.getByLabel(/cleared to work\?/i).check();
  await page.getByLabel(/any restrictions\?/i).fill('No restrictions. Fit for all duties.');

  // Mandatory training (CQC core)
  for (const name of TRAINING_NAMES) {
    const row = page.getByRole('row', { name: new RegExp(name, 'i') });
    await row.locator('input[type="date"]').nth(0).fill(TRAINING_COMPLETED);
    await row.locator('input[type="date"]').nth(1).fill(TRAINING_EXPIRY);
    await row.locator('input[type="text"]').fill(`REF-${name.slice(0, 3).toUpperCase()}-001`);
  }

  // Attach certificate for one core item (Manual Handling)
  const manualRow = page.getByRole('row', { name: /Manual Handling & Moving People/i });
  await manualRow.getByRole('button', { name: /add \/ attach|edit \/ attach/i }).click();

  // Upload training certificate PDF in modal
  const manualFileInput = page.locator('input[type="file"][accept=".pdf,.jpg,.jpeg,.png"]').first();
  await manualFileInput.setInputFiles({
    name: MANUAL_CERT_FILENAME,
    mimeType: 'application/pdf',
    buffer: FIXTURE_BUFFER,
  });

  await expect(page.getByText('✅ Certificate Uploaded')).toBeVisible();

  // Save training & certificate (dates and ref come from table values)
  await page.getByRole('button', { name: /save training & certificate/i }).click();

  // Add an extra training/qualification (COSHH)
  await page.getByRole('button', { name: /add other training \/ qualification/i }).click();
  await expect(page.getByRole('heading', { name: /add training \/ qualification/i })).toBeVisible();

  const additionalFileInput = page.locator('input[type="file"][accept=".pdf,.jpg,.jpeg,.png"]').first();
  await additionalFileInput.setInputFiles({
    name: COSHH_CERT_FILENAME,
    mimeType: 'application/pdf',
    buffer: FIXTURE_BUFFER,
  });

  await expect(page.getByText('✅ Certificate Uploaded')).toBeVisible();

  await page.getByLabel(/training \/ qualification \*/i).fill('COSHH Training');
  await page.getByLabel(/training provider/i).fill('NHS e-Learning');
  await page.getByLabel(/date completed \*/i).fill('2024-02-01');
  await page.getByLabel(/^expiry date$/i).fill('2027-02-01');
  await page.getByLabel(/certificate reference/i).fill('CERT-COSHH-001');

  await page.getByRole('button', { name: /save training & certificate/i }).click();

  // New training should appear in summary section
  await expect(page.getByText(/COSHH Training/i)).toBeVisible();

  // Save profile
  await page.getByRole('button', { name: /complete setup|save changes/i }).click();

  // Toast + redirect to StaffPortal
  await expect(page.getByText('✅ Profile updated successfully!')).toBeVisible();
  await page.waitForURL(/StaffPortal/i, { timeout: TEST_CONFIG.timeouts.long });
}

async function openCqcProfileAsAdmin(page: Page) {
  await loginAsAdmin(page);
  await page.goto(`${TEST_CONFIG.app.baseUrl}/Staff`);
  await page.waitForLoadState('networkidle');

  const staffCard = page.locator('div').filter({ hasText: TEST_CONFIG.staff.email }).first();
  await expect(staffCard).toBeVisible();

  await staffCard.getByRole('button', { name: /cqc profile/i }).click();
  await page.waitForURL(/StaffProfileSimulation/i, { timeout: TEST_CONFIG.timeouts.long });
  await expect(page.getByText('Staff Profile for Care Home')).toBeVisible();
}

// Module 2.5: Staff onboarding 6 CQC simulation alignment

test.describe('Staff onboarding 6 StaffProfileSimulation alignment (Chadaira)', () => {
  test('Onboarding data flows into CQC profile simulation', async ({ page }) => {
    attachConsoleLogger(page);

    // 1) Staff completes full ProfileSetup including training certificates
    await loginAsStaff(page);
    await completeProfileSetupAsStaff(page);

    // 2) Admin opens CQC profile for same staff member
    await openCqcProfileAsAdmin(page);

    // 3) Verify key fields visible in CQC profile
    await expect(page.getByText('Chadaira Test Worker')).toBeVisible();
    await expect(page.getByText('15/05/1990')).toBeVisible();

    const manualHandlingRow = page.getByRole('row', { name: /Manual Handling & Moving People/i });
    await expect(manualHandlingRow).toContainText('15/01/2024');
    await expect(manualHandlingRow).toContainText('15/01/2027');
    await expect(manualHandlingRow).toContainText(/REF-MAN-001/i);

    // 4) Verify additional training appears in simulation
    await expect(page.getByText(/Other Training & Qualifications/i)).toBeVisible();
    await expect(page.getByText(/COSHH Training/i)).toBeVisible();

    // 5) Verify training certificates exist in compliance table (Supabase)
    const adminClient = createClient(TEST_CONFIG.supabase.url, TEST_CONFIG.supabase.serviceKey);
    const { data: staff, error: staffError } = await adminClient
      .from('staff')
      .select('id')
      .eq('email', TEST_CONFIG.staff.email.toLowerCase())
      .maybeSingle();

    expect(staffError).toBeFalsy();
    expect(staff).toBeTruthy();

    const { data: complianceRows, error: complianceError } = await adminClient
      .from('compliance')
      .select('id, document_type, document_name, document_url')
      .eq('staff_id', staff!.id)
      .eq('document_type', 'training_certificate');

    expect(complianceError).toBeFalsy();
    expect(complianceRows && complianceRows.length).toBeTruthy();

    const hasManualDoc = !!complianceRows?.find(
      (row) => row.document_url && row.document_url.includes(MANUAL_CERT_FILENAME)
    );
    const hasCoshhDoc = !!complianceRows?.find(
      (row) => row.document_url && row.document_url.includes(COSHH_CERT_FILENAME)
    );

    expect(hasManualDoc, 'Expected Manual Handling training certificate in compliance table').toBeTruthy();
    expect(hasCoshhDoc, 'Expected COSHH training certificate in compliance table').toBeTruthy();
  });
});

