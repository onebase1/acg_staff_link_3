# Testing Checklist: MODULE 35 - Authentication & Portal Routing Overhaul

## Overview

**Purpose:** Comprehensive testing guide for all phases of MODULE 35

**Scope:** Phase 1 (Email Links) → Phase 4 (Database Triggers)

**Test Environments:**
- **Local:** Development machine with Supabase local instance
- **Staging:** `staging.agilecaremanagement.co.uk`
- **Production:** `agilecaremanagement.co.uk`

**Testing Levels:**
1. Unit Tests (individual functions)
2. Integration Tests (component interactions)
3. Security Tests (vulnerability scanning)
4. Performance Tests (load testing)
5. User Acceptance Tests (real-world scenarios)

## Phase 1: Email Portal Links Fix

### Unit Tests

#### Test 1.1: getBranding Returns Correct URLs

**File:** `supabase/functions/_shared/getBranding.ts`

**Test:**
```typescript
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { getBranding, getSaaSDefaults } from "./getBranding.ts";

Deno.test("getBranding includes all portal URLs", () => {
  const branding = getSaaSDefaults();

  assertEquals(typeof branding.staffPortalUrl, "string");
  assertEquals(typeof branding.clientPortalUrl, "string");
  assertEquals(typeof branding.adminDashboardUrl, "string");

  // Verify format
  assert(branding.staffPortalUrl.endsWith("/staffportal"));
  assert(branding.clientPortalUrl.endsWith("/ClientPortal"));
  assert(branding.adminDashboardUrl.endsWith("/Dashboard"));
});

Deno.test("getBranding uses environment variables", () => {
  Deno.env.set("SITE_URL", "https://test.example.com");

  const branding = getSaaSDefaults();

  assertEquals(branding.staffPortalUrl, "https://test.example.com/staffportal");
  assertEquals(branding.clientPortalUrl, "https://test.example.com/ClientPortal");

  Deno.env.delete("SITE_URL");
});
```

**Expected Result:** ✅ All assertions pass

**Run Command:**
```bash
deno test supabase/functions/_shared/getBranding.ts --allow-env
```

#### Test 1.2: Email Templates Use Dynamic URLs

**File:** `supabase/functions/notification-digest-engine/index.ts`

**Manual Verification:**
```typescript
// Read template file
const templateContent = await Deno.readTextFile("supabase/functions/notification-digest-engine/index.ts");

// Verify uses branding.staffPortalUrl
assert(templateContent.includes("branding.staffPortalUrl"));
assert(!templateContent.includes('"/shifts"')); // Old hardcoded URL removed

console.log("✅ notification-digest-engine uses dynamic URLs");
```

**Expected Result:** ✅ Dynamic URLs used, no hardcoded links

#### Test 1.3: Smart Marketplace Digest Imports getBranding

**File:** `supabase/functions/smart-marketplace-digest/index.ts`

**Manual Verification:**
```typescript
const templateContent = await Deno.readTextFile("supabase/functions/smart-marketplace-digest/index.ts");

assert(templateContent.includes('import { getBranding } from "../_shared/all.ts"'));
assert(templateContent.includes("branding.staffPortalUrl"));

console.log("✅ smart-marketplace-digest imports and uses getBranding");
```

**Expected Result:** ✅ Import present, staffPortalUrl used

#### Test 1.4: Daily Client Digest Uses clientPortalUrl

**File:** `supabase/functions/daily-client-digest/index.ts`

**Manual Verification:**
```typescript
const templateContent = await Deno.readTextFile("supabase/functions/daily-client-digest/index.ts");

assert(templateContent.includes("portal_url: branding.clientPortalUrl"));
assert(!templateContent.includes("portal_url: branding.portalUrl")); // Old deprecated field

console.log("✅ daily-client-digest uses clientPortalUrl");
```

**Expected Result:** ✅ clientPortalUrl used, portalUrl removed

### Integration Tests

#### Test 1.5: Staff Email Contains Correct Portal Link

**Prerequisites:**
- Staff user with pending shift assignments
- Daily digest cron job enabled

**Test Steps:**
1. Trigger `notification-digest-engine` manually:
   ```bash
   curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/notification-digest-engine \
     -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
     -d '{"test_mode": true, "test_email": "your-email@example.com"}'
   ```

2. Check email inbox

3. Verify link in email:
   - ✅ Link URL = `https://agilecaremanagement.co.uk/staffportal`
   - ✅ Link text = "Confirm Shifts in Staff Portal" or "View Shifts in Staff Portal"
   - ❌ NOT `/shifts` or `/portal`

**Expected Result:** ✅ Email contains `/staffportal` link

#### Test 1.6: Client Email Contains Correct Portal Link

**Prerequisites:**
- Client contact with shifts scheduled for tomorrow
- Daily digest enabled

**Test Steps:**
1. Trigger `daily-client-digest`:
   ```bash
   curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/daily-client-digest \
     -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
     -d '{"test_mode": true, "test_email": "your-email@example.com"}'
   ```

2. Check email inbox

3. Verify link:
   - ✅ Link URL = `https://agilecaremanagement.co.uk/ClientPortal`
   - ✅ Link text = "View Tomorrow's Schedule"
   - ❌ NOT `/portal` (lowercase)

**Expected Result:** ✅ Email contains `/ClientPortal` link

#### Test 1.7: Marketplace Digest Uses Staff Portal Link

**Prerequisites:**
- Available shifts in marketplace
- Staff user opted into marketplace notifications

**Test Steps:**
1. Trigger `smart-marketplace-digest`:
   ```bash
   curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/smart-marketplace-digest \
     -H "Authorization: Bearer $SERVICE_ROLE_KEY"
   ```

2. Check email/SMS/WhatsApp

3. Verify link:
   - ✅ Email: `https://agilecaremanagement.co.uk/staffportal`
   - ✅ SMS: Same URL
   - ✅ WhatsApp: Same URL

**Expected Result:** ✅ All channels use `/staffportal` link

### User Acceptance Tests

#### Test 1.8: Staff Can Access Portal from Email Link

**Test Steps:**
1. Staff user receives shift assignment email
2. Clicks "Confirm Shifts in Staff Portal" link
3. Browser navigates to `/staffportal`
4. ✅ Staff portal loads successfully (not 404)
5. ✅ User sees their assigned shifts

**Expected Result:** ✅ Navigation successful, shifts visible

#### Test 1.9: Client Can Access Portal from Email Link

**Test Steps:**
1. Client receives daily digest email
2. Clicks "View Tomorrow's Schedule" link
3. Browser navigates to `/ClientPortal`
4. ✅ Client portal loads successfully (not 404)
5. ✅ Tomorrow's shifts visible

**Expected Result:** ✅ Navigation successful, schedule visible

### Regression Tests

#### Test 1.10: Verify No Broken Links in Other Emails

**Scope:** Check all 44 edge functions for hardcoded URLs

**Test:**
```bash
# Search for hardcoded /shifts or /portal links
grep -r '"/shifts"' supabase/functions/
grep -r '"/portal"' supabase/functions/

# Expected: No matches (all should use branding URLs)
```

**Expected Result:** ✅ No hardcoded portal URLs found

---

## Phase 2: Magic Link Authentication for Clients

### Unit Tests

#### Test 2.1: Generate Magic Link Creates Valid Token

**File:** `supabase/functions/generate-client-magic-link/index.ts`

**Test:**
```typescript
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test("generate-client-magic-link creates valid token", async () => {
  const response = await fetch("http://localhost:54321/functions/v1/generate-client-magic-link", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: "test@example.com",
      agency_id: "test-agency-id",
      expires_in_hours: 24
    })
  });

  const data = await response.json();

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertEquals(data.data.token.length, 36); // UUID format
  assert(data.data.url.includes("/auth/magic?token="));
  assert(new Date(data.data.expires_at) > new Date()); // Future timestamp
});
```

**Expected Result:** ✅ Token generated with correct format

#### Test 2.2: Generate Magic Link Validates Email Format

**Test:**
```typescript
Deno.test("generate-client-magic-link rejects invalid email", async () => {
  const response = await fetch("http://localhost:54321/functions/v1/generate-client-magic-link", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: "not-an-email",
      agency_id: "test-agency-id"
    })
  });

  const data = await response.json();

  assertEquals(response.status, 400);
  assert(data.error.includes("Invalid email format"));
});
```

**Expected Result:** ✅ Invalid email rejected

#### Test 2.3: Auth Magic Link Validates Token

**Test:**
```typescript
Deno.test("auth-magic-link validates token expiry", async () => {
  // Create expired token (manual DB insert)
  const expiredToken = crypto.randomUUID();
  await supabase.from("magic_link_tokens").insert({
    token: expiredToken,
    email: "test@example.com",
    agency_id: "test-agency-id",
    expires_at: new Date(Date.now() - 1000).toISOString() // 1 second ago
  });

  // Attempt to authenticate
  const response = await fetch("http://localhost:54321/functions/v1/auth-magic-link", {
    method: "POST",
    body: JSON.stringify({ token: expiredToken })
  });

  const data = await response.json();

  assertEquals(response.status, 401);
  assertEquals(data.success, false);
  assert(data.error.includes("expired"));
});
```

**Expected Result:** ✅ Expired token rejected

#### Test 2.4: Auth Magic Link Enforces Single-Use

**Test:**
```typescript
Deno.test("auth-magic-link enforces single-use", async () => {
  // Generate valid token
  const { data: mlData } = await supabase.functions.invoke("generate-client-magic-link", {
    body: { email: "test@example.com", agency_id: "test-agency-id" }
  });

  const token = mlData.data.token;

  // Use token once
  const response1 = await fetch("http://localhost:54321/functions/v1/auth-magic-link", {
    method: "POST",
    body: JSON.stringify({ token })
  });

  assertEquals(response1.status, 200);

  // Attempt to reuse token
  const response2 = await fetch("http://localhost:54321/functions/v1/auth-magic-link", {
    method: "POST",
    body: JSON.stringify({ token })
  });

  const data2 = await response2.json();

  assertEquals(response2.status, 401);
  assert(data2.error.includes("already been used"));
});
```

**Expected Result:** ✅ Second use rejected

### Integration Tests

#### Test 2.5: End-to-End Magic Link Flow (New User)

**Prerequisites:**
- Fresh database with no auth.users for test email
- Client contact exists in database

**Test Steps:**
```typescript
Deno.test("E2E: Magic link creates new user and session", async () => {
  const testEmail = "newclient@example.com";

  // 1. Create client contact
  const { data: contact } = await supabase.from("client_contacts").insert({
    email: testEmail,
    name: "New Client",
    client_id: "test-client-id",
    agency_id: "test-agency-id",
    role: "OPERATIONS_MANAGER"
  }).select().single();

  // 2. Generate magic link
  const { data: ml } = await supabase.functions.invoke("generate-client-magic-link", {
    body: {
      email: testEmail,
      client_contact_id: contact.id,
      agency_id: contact.agency_id
    }
  });

  assertEquals(ml.success, true);

  // 3. Authenticate with magic link
  const { data: auth } = await supabase.functions.invoke("auth-magic-link", {
    body: { token: ml.data.token }
  });

  assertEquals(auth.success, true);
  assertEquals(auth.data.session.user.email, testEmail);

  // 4. Verify auth.users created
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === testEmail);
  assert(user !== undefined);

  // 5. Verify profile created
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", testEmail)
    .single();

  assertEquals(profile.user_type, "client");

  // 6. Verify client_contact linked
  const { data: updatedContact } = await supabase
    .from("client_contacts")
    .select("user_id")
    .eq("id", contact.id)
    .single();

  assertEquals(updatedContact.user_id, user.id);

  // 7. Verify audit log
  const { data: audit } = await supabase
    .from("auth_link_audit_log")
    .select("*")
    .eq("auth_email", testEmail)
    .single();

  assertEquals(audit.link_status, "success");
  assertEquals(audit.match_method, "email_client");
  assertEquals(audit.linked_to_table, "client_contacts");
});
```

**Expected Result:** ✅ User created, linked, session generated

#### Test 2.6: End-to-End Magic Link Flow (Returning User)

**Prerequisites:**
- Existing auth.users record for test email
- Client contact already linked

**Test Steps:**
```typescript
Deno.test("E2E: Magic link generates session for existing user", async () => {
  const testEmail = "existingclient@example.com";

  // Assume user already exists from previous test
  const { data: users } = await supabase.auth.admin.listUsers();
  const existingUser = users.users.find(u => u.email === testEmail);
  assert(existingUser !== undefined);

  // Generate new magic link
  const { data: ml } = await supabase.functions.invoke("generate-client-magic-link", {
    body: { email: testEmail, agency_id: "test-agency-id" }
  });

  // Authenticate
  const { data: auth } = await supabase.functions.invoke("auth-magic-link", {
    body: { token: ml.data.token }
  });

  assertEquals(auth.success, true);
  assertEquals(auth.data.session.user.id, existingUser.id); // Same user ID

  // Verify NO duplicate profile created
  const { data: profiles, count } = await supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("email", testEmail);

  assertEquals(count, 1); // Still only one profile
});
```

**Expected Result:** ✅ Session generated, no duplicate records

#### Test 2.7: Magic Link in Daily Digest Email

**Prerequisites:**
- Client contact with shifts scheduled tomorrow

**Test Steps:**
1. Trigger daily digest:
   ```bash
   curl -X POST https://staging.example.com/functions/v1/daily-client-digest \
     -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
     -d '{"test_mode": true, "test_email": "your-email@example.com"}'
   ```

2. Check email inbox

3. Verify magic link button present:
   - ✅ Button text: "🔐 View Tomorrow's Schedule (Secure Login)"
   - ✅ URL format: `https://staging.example.com/auth/magic?token=<uuid>`
   - ✅ Expiry notice: "This link expires in 24 hours"

4. Click magic link

5. Verify redirect:
   - ✅ Browser navigates to `/auth/magic?token=...`
   - ✅ Loading spinner displays
   - ✅ Auto-redirect to `/ClientPortal` (after 1-2 seconds)

6. Verify authenticated:
   - ✅ User profile loads in portal
   - ✅ Tomorrow's shifts visible
   - ✅ Session cookie set (check browser DevTools → Application → Cookies)

**Expected Result:** ✅ One-click authentication successful

### Security Tests

#### Test 2.8: Brute Force Protection (Token Guessing)

**Test:**
```typescript
Deno.test("auth-magic-link resists brute force", async () => {
  const attempts = [];

  // Attempt 100 random tokens
  for (let i = 0; i < 100; i++) {
    const randomToken = crypto.randomUUID();
    const response = await fetch("http://localhost:54321/functions/v1/auth-magic-link", {
      method: "POST",
      body: JSON.stringify({ token: randomToken })
    });

    attempts.push(response.status);
  }

  // All should fail (401 Unauthorized)
  assertEquals(attempts.every(status => status === 401), true);

  console.log("✅ 100 random tokens rejected");
});
```

**Expected Result:** ✅ All random tokens rejected

**Manual Test (Rate Limiting):**
```bash
# Send 20 requests in rapid succession
for i in {1..20}; do
  curl -X POST https://staging.example.com/functions/v1/auth-magic-link \
    -d '{"token": "fake-token"}' &
done

# Expected: After 5 attempts, receive 429 Too Many Requests
```

**Expected Result:** ⚠️ Currently fails (no rate limiting). Add in Phase 5.

#### Test 2.9: SQL Injection via Email Parameter

**Test:**
```typescript
Deno.test("generate-client-magic-link resists SQL injection", async () => {
  const maliciousEmail = "test@example.com'; DROP TABLE magic_link_tokens; --";

  const response = await fetch("http://localhost:54321/functions/v1/generate-client-magic-link", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: maliciousEmail,
      agency_id: "test-agency-id"
    })
  });

  // Should reject invalid email format (before SQL execution)
  assertEquals(response.status, 400);

  // Verify table still exists
  const { data: tokens } = await supabase.from("magic_link_tokens").select("*").limit(1);
  assert(tokens !== null, "Table was dropped by SQL injection!");
});
```

**Expected Result:** ✅ SQL injection blocked

#### Test 2.10: XSS in Client Contact Name

**Test:**
```typescript
Deno.test("Email template escapes XSS in client name", async () => {
  const xssName = "<script>alert('XSS')</script>";

  // Create client contact with malicious name
  const { data: contact } = await supabase.from("client_contacts").insert({
    email: "xss-test@example.com",
    name: xssName,
    client_id: "test-client-id",
    agency_id: "test-agency-id",
    role: "OPERATIONS_MANAGER"
  }).select().single();

  // Generate magic link (triggers email send)
  const { data: ml } = await supabase.functions.invoke("generate-client-magic-link", {
    body: { email: contact.email, agency_id: contact.agency_id }
  });

  // Send test email
  await supabase.functions.invoke("daily-client-digest", {
    body: { test_mode: true, test_email: "your-email@example.com" }
  });

  // Manual verification: Check email inbox
  // Expected: Name displayed as plain text "<script>alert('XSS')</script>"
  // NOT executed as JavaScript

  console.log("✅ Manual check: Verify email displays XSS as text (not executed)");
});
```

**Expected Result:** ✅ XSS escaped in email template

### Performance Tests

#### Test 2.11: Magic Link Generation Performance

**Test:**
```typescript
Deno.test("generate-client-magic-link completes in <100ms", async () => {
  const startTime = performance.now();

  await supabase.functions.invoke("generate-client-magic-link", {
    body: { email: "perf-test@example.com", agency_id: "test-agency-id" }
  });

  const duration = performance.now() - startTime;

  console.log(`⏱️ Token generation: ${duration}ms`);
  assert(duration < 100, `Too slow: ${duration}ms`);
});
```

**Expected Result:** ✅ < 100ms

#### Test 2.12: Magic Link Authentication Performance

**Test:**
```typescript
Deno.test("auth-magic-link completes in <500ms (new user)", async () => {
  // Generate token
  const { data: ml } = await supabase.functions.invoke("generate-client-magic-link", {
    body: { email: "perf-new-user@example.com", agency_id: "test-agency-id" }
  });

  const startTime = performance.now();

  // Authenticate (creates new user)
  await supabase.functions.invoke("auth-magic-link", {
    body: { token: ml.data.token }
  });

  const duration = performance.now() - startTime;

  console.log(`⏱️ Auth (new user): ${duration}ms`);
  assert(duration < 500, `Too slow: ${duration}ms`);
});

Deno.test("auth-magic-link completes in <200ms (existing user)", async () => {
  // Assume user already exists
  const { data: ml } = await supabase.functions.invoke("generate-client-magic-link", {
    body: { email: "perf-existing-user@example.com", agency_id: "test-agency-id" }
  });

  const startTime = performance.now();

  // Authenticate (just generates session)
  await supabase.functions.invoke("auth-magic-link", {
    body: { token: ml.data.token }
  });

  const duration = performance.now() - startTime;

  console.log(`⏱️ Auth (existing user): ${duration}ms`);
  assert(duration < 200, `Too slow: ${duration}ms`);
});
```

**Expected Result:** ✅ New user < 500ms, existing user < 200ms

#### Test 2.13: Database Trigger Performance

**Test:**
```sql
-- Create test user and measure trigger execution time
DO $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  execution_ms INTEGER;
BEGIN
  start_time := clock_timestamp();

  -- Simulate auth user creation
  INSERT INTO auth.users (email, raw_user_meta_data)
  VALUES ('trigger-perf-test@example.com', '{"full_name": "Test User"}'::jsonb);

  end_time := clock_timestamp();
  execution_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

  RAISE NOTICE '⏱️ Trigger execution: % ms', execution_ms;

  IF execution_ms > 100 THEN
    RAISE EXCEPTION 'Trigger too slow: % ms', execution_ms;
  END IF;
END $$;
```

**Expected Result:** ✅ < 100ms

**Verify in Audit Log:**
```sql
SELECT execution_time_ms
FROM auth_link_audit_log
WHERE auth_email = 'trigger-perf-test@example.com';

-- Expected: < 100ms
```

### User Acceptance Tests

#### Test 2.14: Client Can Login via Magic Link (Happy Path)

**Scenario:** Care home manager receives daily digest and logs in

**Test Steps:**
1. Admin creates client contact in Dashboard
2. Client receives daily digest email (6 AM UTC next day)
3. Client opens email on mobile device
4. Client clicks "View Tomorrow's Schedule" button
5. ✅ Browser opens `/auth/magic` route
6. ✅ "Verifying Magic Link..." spinner displays
7. ✅ After 1-2 seconds, auto-redirect to `/ClientPortal`
8. ✅ Client sees tomorrow's shifts
9. ✅ No password prompt required

**Expected Result:** ✅ One-click login successful

#### Test 2.15: Client Cannot Reuse Old Magic Link

**Scenario:** Client tries to use yesterday's magic link

**Test Steps:**
1. Client receives Day 1 digest email (contains Token A)
2. Client clicks magic link → successfully authenticated
3. Client logs out
4. Client receives Day 2 digest email (contains Token B)
5. Client accidentally clicks Day 1 email link (Token A)
6. ✅ Error page displays: "This magic link has already been used. Please use the latest link from today's email."
7. Client clicks Day 2 email link (Token B)
8. ✅ Successfully authenticated

**Expected Result:** ✅ Old tokens rejected, new tokens work

#### Test 2.16: Client Cannot Use Expired Magic Link

**Scenario:** Client tries to login 25 hours after email sent

**Test Steps:**
1. Client receives digest email at 6 AM UTC (Token expires 6 AM UTC next day)
2. Client waits 25 hours
3. Client clicks magic link
4. ✅ Error page displays: "This magic link has expired. Check your email for a newer one."
5. ✅ Suggestion: "Need help? Contact support@agilecaremanagement.co.uk"

**Expected Result:** ✅ Expired token rejected with helpful message

---

## Phase 3: Public Pages Architecture

### Unit Tests

#### Test 3.1: PublicLayout Does Not Require Auth

**File:** `src/pages/PublicLayout.jsx`

**Test:**
```jsx
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import PublicLayout from "./PublicLayout";

test("PublicLayout renders without auth check", () => {
  // Mock supabase.auth.getSession to return null (unauthenticated)
  jest.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: null }, error: null });

  const { container } = render(
    <BrowserRouter>
      <PublicLayout />
    </BrowserRouter>
  );

  // Should render successfully (no redirect to /login)
  expect(container).toBeInTheDocument();

  // Should NOT display sidebar or user menu
  expect(container.querySelector("aside")).toBeNull();
});
```

**Expected Result:** ✅ PublicLayout renders without auth

#### Test 3.2: Protected Routes Require Auth

**File:** `src/pages/Layout.jsx`

**Test:**
```jsx
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Layout from "./Layout";

test("Layout redirects to /login if unauthenticated", async () => {
  // Mock unauthenticated session
  jest.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: null }, error: null });

  const mockNavigate = jest.fn();
  jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate
  }));

  render(
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );

  // Wait for auth check
  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
```

**Expected Result:** ✅ Unauthenticated users redirected to /login

### Integration Tests

#### Test 3.3: Landing Page Loads Without Auth

**Prerequisites:** None (public page)

**Test Steps:**
1. Open incognito browser window (no cookies)
2. Navigate to `https://staging.example.com/`
3. ✅ Landing page loads immediately (no loading spinner)
4. ✅ No "blank User" flash
5. ✅ Navigation menu shows: Home, Features, Pricing, Login
6. ✅ NO sidebar or user menu visible

**Expected Result:** ✅ Public landing page accessible without auth

#### Test 3.4: Login Page Accessible Without Auth

**Test Steps:**
1. Open incognito browser
2. Navigate to `https://staging.example.com/login`
3. ✅ Login form displays
4. ✅ No redirect to protected routes
5. ✅ After login → redirect to user's portal (StaffPortal or ClientPortal)

**Expected Result:** ✅ Login page accessible

#### Test 3.5: Privacy/Terms Pages Accessible Without Auth

**Test Steps:**
1. Navigate to `https://staging.example.com/privacy`
2. ✅ Privacy policy page loads
3. Navigate to `https://staging.example.com/terms`
4. ✅ Terms of service page loads
5. ✅ No auth required for either page

**Expected Result:** ✅ Legal pages accessible

#### Test 3.6: Protected Routes Redirect Unauthenticated Users

**Test Steps:**
1. Open incognito browser
2. Navigate to `https://staging.example.com/Dashboard`
3. ✅ Auto-redirect to `/login?redirect=/Dashboard`
4. Login with valid credentials
5. ✅ Auto-redirect back to `/Dashboard`

**Expected Result:** ✅ Auth guard works, preserves redirect URL

### User Acceptance Tests

#### Test 3.7: New Visitor Can Browse Public Site

**Scenario:** First-time visitor exploring ACG StaffLink

**Test Steps:**
1. Visitor types `agilecaremanagement.co.uk` in browser
2. ✅ Landing page loads with hero section
3. ✅ Can scroll through features section
4. ✅ Can click "Contact Us" → navigates to `/contact`
5. ✅ Can click "Login" → navigates to `/login`
6. ✅ No authentication required for any public pages

**Expected Result:** ✅ Public site fully browsable

#### Test 3.8: Authenticated User Can Still Access Public Pages

**Scenario:** Logged-in staff user views privacy policy

**Test Steps:**
1. Staff user logs in (session active)
2. Navigates to `/privacy`
3. ✅ Privacy policy displays
4. ✅ User menu still visible in header (authenticated state preserved)
5. ✅ Can navigate back to `/staffportal`

**Expected Result:** ✅ Authenticated users can access public pages

---

## Phase 4: Database Trigger Enhancements

### Unit Tests

#### Test 4.1: Trigger Links Staff Users

**Test:**
```sql
-- Create test staff
INSERT INTO staff (id, email, first_name, last_name, agency_id)
VALUES ('test-staff-id', 'staff-trigger-test@example.com', 'Test', 'Staff', 'test-agency-id');

-- Simulate auth user creation
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('test-auth-id', 'staff-trigger-test@example.com', '{"full_name": "Test Staff"}'::jsonb);

-- Verify auto-link
SELECT
  au.id AS auth_id,
  p.user_type,
  s.user_id
FROM auth.users au
JOIN profiles p ON au.id = p.id
JOIN staff s ON p.id = s.user_id
WHERE au.email = 'staff-trigger-test@example.com';

-- Expected: 1 row, user_type='staff', staff.user_id=auth_id
```

**Expected Result:** ✅ Staff user auto-linked

#### Test 4.2: Trigger Links Client Contacts

**Test:**
```sql
-- Create test client contact
INSERT INTO client_contacts (id, email, name, client_id, agency_id, role)
VALUES ('test-contact-id', 'client-trigger-test@example.com', 'Test Client', 'test-client-id', 'test-agency-id', 'OPERATIONS_MANAGER');

-- Simulate auth user creation
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('test-auth-id-2', 'client-trigger-test@example.com', '{"full_name": "Test Client"}'::jsonb);

-- Verify auto-link
SELECT
  au.id AS auth_id,
  p.user_type,
  cc.user_id
FROM auth.users au
JOIN profiles p ON au.id = p.id
JOIN client_contacts cc ON p.id = cc.user_id
WHERE au.email = 'client-trigger-test@example.com';

-- Expected: 1 row, user_type='client', client_contacts.user_id=auth_id
```

**Expected Result:** ✅ Client contact auto-linked

#### Test 4.3: Trigger Creates Audit Log Entry

**Test:**
```sql
-- Create test user (trigger executes)
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('test-audit-id', 'audit-test@example.com', '{"full_name": "Audit Test"}'::jsonb);

-- Verify audit log entry
SELECT
  auth_user_id,
  auth_email,
  link_status,
  match_method,
  execution_time_ms
FROM auth_link_audit_log
WHERE auth_email = 'audit-test@example.com';

-- Expected: 1 row, link_status='orphaned' (no matching staff or client_contact)
```

**Expected Result:** ✅ Audit log entry created

#### Test 4.4: Trigger Handles Orphaned Users

**Test:**
```sql
-- Create auth user with NO matching staff or client_contact
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('orphan-test-id', 'orphan@example.com', '{"full_name": "Orphan User"}'::jsonb);

-- Verify NO profile created
SELECT * FROM profiles WHERE email = 'orphan@example.com';
-- Expected: 0 rows

-- Verify audit log shows orphaned status
SELECT link_status, error_message
FROM auth_link_audit_log
WHERE auth_email = 'orphan@example.com';

-- Expected: link_status='orphaned', error_message='No matching staff or client_contact...'
```

**Expected Result:** ✅ Orphaned user logged, not blocked

### Integration Tests

#### Test 4.5: Magic Link + Trigger Flow (New Client)

**Test:**
```typescript
Deno.test("Magic link creates user, trigger auto-links to client_contact", async () => {
  const testEmail = "trigger-integration@example.com";

  // 1. Create client contact
  const { data: contact } = await supabase.from("client_contacts").insert({
    email: testEmail,
    name: "Trigger Test",
    client_id: "test-client-id",
    agency_id: "test-agency-id",
    role: "OPERATIONS_MANAGER"
  }).select().single();

  // 2. Generate magic link
  const { data: ml } = await supabase.functions.invoke("generate-client-magic-link", {
    body: { email: testEmail, client_contact_id: contact.id, agency_id: contact.agency_id }
  });

  // 3. Authenticate (creates auth.users → trigger executes)
  const { data: auth } = await supabase.functions.invoke("auth-magic-link", {
    body: { token: ml.data.token }
  });

  assertEquals(auth.success, true);

  // 4. Wait for trigger (100ms)
  await new Promise(resolve => setTimeout(resolve, 100));

  // 5. Verify client_contact.user_id populated
  const { data: updatedContact } = await supabase
    .from("client_contacts")
    .select("user_id")
    .eq("id", contact.id)
    .single();

  assert(updatedContact.user_id !== null);
  assertEquals(updatedContact.user_id, auth.data.session.user.id);

  // 6. Verify audit log
  const { data: audit } = await supabase
    .from("auth_link_audit_log")
    .select("*")
    .eq("auth_email", testEmail)
    .single();

  assertEquals(audit.link_status, "success");
  assertEquals(audit.match_method, "email_client");
  assertEquals(audit.linked_to_id, contact.id);
});
```

**Expected Result:** ✅ Trigger auto-links client_contact atomically

#### Test 4.6: Orphaned User Detection View

**Test:**
```sql
-- Create orphaned user
INSERT INTO auth.users (email, raw_user_meta_data)
VALUES ('orphan-view-test@example.com', '{"full_name": "Orphan"}'::jsonb);

-- Query orphaned_users view
SELECT * FROM orphaned_users WHERE email = 'orphan-view-test@example.com';

-- Expected: 1 row with:
-- - auth_user_id (not null)
-- - email = 'orphan-view-test@example.com'
-- - profile_id = NULL
-- - error_message = 'No matching staff or client_contact...'
```

**Expected Result:** ✅ Orphaned user appears in view

### Performance Tests

#### Test 4.7: Trigger Execution Time < 100ms

**Test:** See Test 2.13 above

**Expected Result:** ✅ < 100ms (logged in auth_link_audit_log.execution_time_ms)

#### Test 4.8: Concurrent User Signups (Load Test)

**Test:**
```typescript
Deno.test("Trigger handles 100 concurrent signups", async () => {
  const promises = [];

  for (let i = 0; i < 100; i++) {
    const email = `loadtest-${i}@example.com`;

    // Create client contact
    await supabase.from("client_contacts").insert({
      email,
      name: `Load Test ${i}`,
      client_id: "test-client-id",
      agency_id: "test-agency-id",
      role: "OPERATIONS_MANAGER"
    });

    // Generate magic link and authenticate (triggers user creation)
    const promise = (async () => {
      const { data: ml } = await supabase.functions.invoke("generate-client-magic-link", {
        body: { email, agency_id: "test-agency-id" }
      });

      await supabase.functions.invoke("auth-magic-link", {
        body: { token: ml.data.token }
      });
    })();

    promises.push(promise);
  }

  // Wait for all 100 signups
  await Promise.all(promises);

  // Verify all 100 linked successfully
  const { data: audit } = await supabase
    .from("auth_link_audit_log")
    .select("link_status")
    .like("auth_email", "loadtest-%");

  const successCount = audit.filter(a => a.link_status === "success").length;
  assertEquals(successCount, 100);

  console.log("✅ 100 concurrent signups completed successfully");
});
```

**Expected Result:** ✅ All 100 users linked, no deadlocks

---

## Regression Testing

### Test R.1: Existing Staff Signup Flow Still Works

**Test Steps:**
1. Admin invites new staff member (creates staff record)
2. Staff receives invite email
3. Staff clicks "Create Account" link
4. ✅ Staff creates password (traditional signup)
5. ✅ Trigger auto-links to staff record
6. ✅ Profile created with user_type='staff'
7. ✅ Staff can access `/staffportal`

**Expected Result:** ✅ Staff password signup unaffected

### Test R.2: Admin Dashboard Still Accessible

**Test Steps:**
1. Admin user logs in
2. Navigates to `/Dashboard`
3. ✅ Dashboard loads (not redirected to public pages)
4. ✅ All admin features work (create shifts, view reports, etc.)

**Expected Result:** ✅ Admin dashboard unaffected

### Test R.3: All 44 Edge Functions Still Deploy

**Test:**
```bash
# Deploy all edge functions
supabase functions deploy --all

# Check for deployment errors
supabase functions list

# Expected: All 44 functions show status "Active"
```

**Expected Result:** ✅ No deployment failures

---

## Staging Environment Tests

### Test S.1: Full Production Simulation

**Prerequisites:**
- Staging environment with production-like data
- Real email delivery (Resend staging key)

**Test Steps:**
1. Create test client contact in staging database
2. Run daily digest cron job manually
3. Verify email received in real inbox (Gmail/Outlook)
4. Click magic link in email
5. ✅ Authenticate successfully
6. ✅ Access `/ClientPortal` and view shifts
7. ✅ Session persists across page refreshes
8. ✅ Logout works (session cleared)

**Expected Result:** ✅ Full flow works in staging

### Test S.2: Cross-Browser Testing

**Browsers:**
- Chrome (Desktop + Android)
- Firefox (Desktop)
- Safari (Desktop + iOS)
- Edge (Desktop)

**Test:**
1. Open magic link email in each browser
2. Click magic link
3. ✅ All browsers authenticate successfully
4. ✅ Session cookies set correctly
5. ✅ No CORS errors in console

**Expected Result:** ✅ Works in all major browsers

### Test S.3: Email Client Compatibility

**Email Clients:**
- Gmail (web + mobile app)
- Outlook (web + mobile app)
- Apple Mail (macOS + iOS)
- Thunderbird

**Test:**
1. Send daily digest to test accounts in each client
2. Open email in each client
3. ✅ Email renders correctly (formatting intact)
4. ✅ Magic link button clickable
5. ✅ Link URL not broken (no line wrapping)

**Expected Result:** ✅ Email renders correctly in all clients

---

## Production Smoke Tests

### Test P.1: Post-Deployment Health Check

**Run immediately after production deployment:**

```bash
# 1. Verify edge functions deployed
curl https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/generate-client-magic-link -I
# Expected: 200 OK (or 401 if no auth header)

curl https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/auth-magic-link -I
# Expected: 200 OK

# 2. Verify database migrations applied
psql $PRODUCTION_DB_URL -c "SELECT * FROM magic_link_tokens LIMIT 1;"
# Expected: Table exists

psql $PRODUCTION_DB_URL -c "SELECT * FROM auth_link_audit_log LIMIT 1;"
# Expected: Table exists

# 3. Verify RLS enabled
psql $PRODUCTION_DB_URL -c "SELECT rowsecurity FROM pg_tables WHERE tablename = 'magic_link_tokens';"
# Expected: true

# 4. Test magic link generation (dry run)
curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/generate-client-magic-link \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -d '{"email":"test@example.com","agency_id":"test"}' \
  | jq '.success'
# Expected: true
```

**Expected Result:** ✅ All checks pass

### Test P.2: Canary Test (Real User)

**Test Steps:**
1. Identify low-risk test client (internal account)
2. Add to production database
3. Trigger daily digest manually for test client
4. Monitor email delivery (Resend dashboard)
5. Click magic link
6. ✅ Authentication successful
7. ✅ No errors in Supabase logs

**Expected Result:** ✅ Real user flow works

### Test P.3: Monitor for 24 Hours

**Metrics to Track:**
- Magic link generation rate (expect ~50-100/day)
- Authentication success rate (expect >95%)
- Orphaned user count (expect 0)
- Average auth time (expect <200ms)
- Error rate (expect <1%)

**Alerts to Configure:**
- Orphaned user created → Slack notification
- >10 failed auths/min → Email to on-call
- Edge function error rate >5% → PagerDuty

**Expected Result:** ✅ No critical alerts in first 24h

---

## Test Execution Summary

| Phase | Total Tests | Unit | Integration | Security | Performance | UAT |
|-------|-------------|------|-------------|----------|-------------|-----|
| Phase 1 | 10 | 4 | 3 | 0 | 0 | 3 |
| Phase 2 | 16 | 4 | 3 | 3 | 3 | 3 |
| Phase 3 | 8 | 2 | 4 | 0 | 0 | 2 |
| Phase 4 | 8 | 4 | 2 | 0 | 2 | 0 |
| Regression | 3 | 0 | 3 | 0 | 0 | 0 |
| Staging | 3 | 0 | 3 | 0 | 0 | 0 |
| Production | 3 | 0 | 3 | 0 | 0 | 0 |
| **Total** | **51** | **14** | **21** | **3** | **5** | **8** |

**Estimated Testing Time:**
- Automated tests: 2-3 hours
- Manual UAT: 2-3 hours
- Staging verification: 2-3 hours
- Production smoke tests: 1-2 hours
- **Total: 7-11 hours**

---

**Document Status:** ✅ Complete - Comprehensive Testing Guide

**Last Updated:** 2025-12-29

**Next Steps:** Begin implementation with TDD approach (write tests first, then code)
