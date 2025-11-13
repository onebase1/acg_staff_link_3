import { test, expect } from '@playwright/test';

test('loads login and shows form', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  await expect(page.getByLabel(/work email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('http://localhost:5173/Dashboard');
  await expect(page.getByLabel(/work email/i)).toBeVisible();
});

test('super admin can onboard a new agency', async ({ page }) => {
  page.on('console', (msg) => console.log(`[browser console] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', (err) => console.error(`[page error] ${err}`));

  const uniqueSuffix = Date.now();
  const agencyName = `Dominion QA ${uniqueSuffix}`;
  const adminEmail = `qa+${uniqueSuffix}@guest-glow.com`;

  const mockAgencyId = `00000000-0000-4000-${(uniqueSuffix % 10000)
    .toString()
    .padStart(4, '0')}-000000000000`;
  const mockInvitationId = `11111111-1111-4111-${(uniqueSuffix % 10000)
    .toString()
    .padStart(4, '0')}-111111111111`;
  const mockCreatedAt = new Date().toISOString();

  let rpcCalled = false;

  await page.route('**/rest/v1/rpc/create_agency_with_admin', async (route) => {
    if (route.request().method() === 'POST') {
      rpcCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          agency_id: mockAgencyId,
          invitation_id: mockInvitationId,
          invite_token: 'mock-token',
          admin_email: adminEmail,
          admin_name: 'QA Admin',
        }]),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/rest/v1/agency_admin_invitations*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: mockInvitationId,
        agency_id: mockAgencyId,
        email: adminEmail,
        status: 'pending',
        admin_name: 'QA Admin',
        created_at: mockCreatedAt,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }]),
    });
  });

  await page.route('**/rest/v1/agencies**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: mockAgencyId,
        name: agencyName,
        email: `ops+${uniqueSuffix}@guest-glow.com`,
        billing_email: `billing+${uniqueSuffix}@guest-glow.com`,
        created_date: mockCreatedAt,
        status: 'active',
      }]),
    });
  });

  await page.route('**/functions/v1/send-agency-admin-invite', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route('**/auth/v1/token?grant_type=password', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'test-refresh-token',
          user: {
            id: '00000000-0000-4000-0000-000000000000',
            email: 'g.basera@yahoo.com',
            app_metadata: {
              provider: 'email',
              providers: ['email'],
              role: 'super_admin',
            },
            user_metadata: {
              full_name: 'Super Admin',
            },
          },
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '00000000-0000-4000-0000-000000000000',
        email: 'g.basera@yahoo.com',
        app_metadata: {
          provider: 'email',
          providers: ['email'],
          role: 'super_admin',
        },
        user_metadata: {
          full_name: 'Super Admin',
        },
      }),
    });
  });

  await page.goto('http://localhost:5173/login');
  await page.getByLabel(/work email/i).fill('g.basera@yahoo.com');
  await page.getByLabel(/password/i).fill('Supabase#2025');
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForTimeout(1000);

  await page.goto('http://localhost:5173/SuperAdminAgencyOnboarding');
  await expect(page.getByRole('heading', { name: /agency onboarding control center/i })).toBeVisible();

  await page.getByRole('textbox', { name: /agency name/i }).fill(agencyName);
  await page.getByRole('textbox', { name: /contact email/i }).fill(`ops+${uniqueSuffix}@guest-glow.com`);
  await page.getByRole('textbox', { name: /billing email/i }).fill(`billing+${uniqueSuffix}@guest-glow.com`);
  await page.getByRole('textbox', { name: /admin full name/i }).fill('QA Admin');
  await page.getByRole('textbox', { name: /admin email/i }).fill(adminEmail);
  await page.getByRole('textbox', { name: /account holder/i }).fill('QA Automation Ltd');
  await page.getByRole('textbox', { name: /bank name/i }).fill('Test Bank');
  await page.getByRole('textbox', { name: /account number/i }).fill('12345678');
  await page.getByRole('textbox', { name: /sort code/i }).fill('12-34-56');
  await page.getByRole('spinbutton', { name: /payment terms/i }).fill('21');

  await page.getByRole('button', { name: /create agency & invite admin/i }).click();

  await expect.poll(() => rpcCalled, { timeout: 2000 }).toBeTruthy();

  await expect(page.getByText(agencyName, { exact: false })).toBeVisible({ timeout: 10000 });
});

