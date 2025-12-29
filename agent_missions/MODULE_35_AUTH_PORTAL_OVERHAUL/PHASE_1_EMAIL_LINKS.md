# PHASE 1: Email Portal Links Fix

## Objective
Fix broken portal links in all email notifications by implementing dynamic URLs based on recipient type.

## Duration
1-2 hours

## Priority
**CRITICAL - QUICK WIN** - Deploy immediately after implementation

## Problem Statement

### Current Broken Links

| Recipient Type | Email | Current Link | Correct Link | Issue |
|----------------|-------|--------------|--------------|-------|
| **Staff** | Shift Assignment | `/shifts` | `/staffportal` | Page doesn't exist |
| **Staff** | Shift Confirmation | `/shifts` | `/staffportal` | Page doesn't exist |
| **Staff** | Marketplace Digest | `/portal` | `/staffportal` | Generic, not staff-specific |
| **Client** | Daily Digest | `/portal` | `/ClientPortal` | Generic, not client-specific |

### Impact
- **User Frustration:** Staff/clients click email links → land on 404 or wrong page
- **Adoption Loss:** Clients won't use portal if links don't work
- **Support Burden:** Users contacting admin for help navigating

## Solution Design

### 1. Update Branding System

**File:** `supabase/functions/_shared/getBranding.ts`

**Current Structure:**
```typescript
export interface Branding {
  // URLs
  siteUrl: string;
  appUrl: string;
  portalUrl: string;  // Generic - PROBLEM!
  fromDomain: string;
}
```

**New Structure:**
```typescript
export interface Branding {
  // URLs
  siteUrl: string;
  appUrl: string;
  staffPortalUrl: string;      // NEW - for staff members
  clientPortalUrl: string;     // NEW - for client contacts
  adminDashboardUrl: string;   // NEW - for admins
  portalUrl: string;           // DEPRECATED - keep for backward compatibility
  fromDomain: string;
}
```

**Implementation:**
```typescript
// In getBranding() function

// If agency has custom branding
if (agencyBranding) {
  return {
    // ... existing fields
    siteUrl: config.custom_domain || config.site_url || Deno.env.get("SITE_URL") || "https://agilecaremanagement.co.uk",
    appUrl: config.app_url || Deno.env.get("APP_URL") || "https://agilecaremanagement.co.uk",

    // NEW: Role-specific URLs
    staffPortalUrl: config.staff_portal_url || `${config.app_url || Deno.env.get("APP_URL") || "https://agilecaremanagement.co.uk"}/staffportal`,
    clientPortalUrl: config.client_portal_url || `${config.app_url || Deno.env.get("APP_URL") || "https://agilecaremanagement.co.uk"}/ClientPortal`,
    adminDashboardUrl: config.admin_dashboard_url || `${config.app_url || Deno.env.get("APP_URL") || "https://agilecaremanagement.co.uk"}/Dashboard`,

    // DEPRECATED - but keep for backward compatibility
    portalUrl: config.portal_url || Deno.env.get("PORTAL_URL") || "https://agilecaremanagement.co.uk/portal",

    // ... rest of fields
  };
}

// Default branding (no custom agency)
return {
  // ... existing fields
  siteUrl: Deno.env.get("SITE_URL") || "https://agilecaremanagement.co.uk",
  appUrl: Deno.env.get("APP_URL") || "https://agilecaremanagement.co.uk",

  // NEW: Role-specific URLs
  staffPortalUrl: Deno.env.get("STAFF_PORTAL_URL") || "https://agilecaremanagement.co.uk/staffportal",
  clientPortalUrl: Deno.env.get("CLIENT_PORTAL_URL") || "https://agilecaremanagement.co.uk/ClientPortal",
  adminDashboardUrl: Deno.env.get("ADMIN_DASHBOARD_URL") || "https://agilecaremanagement.co.uk/Dashboard",

  // DEPRECATED
  portalUrl: Deno.env.get("PORTAL_URL") || "https://agilecaremanagement.co.uk/portal",

  // ... rest of fields
};
```

### 2. Update Email Templates

#### A. notification-digest-engine (Staff Assignments)

**File:** `supabase/functions/notification-digest-engine/index.ts`

**Line 198** - Shift assignment email (staff-facing):
```typescript
// BEFORE
<a href="${branding.appUrl}/shifts" style="...">
  Confirm Shifts in Staff Portal
</a>

// AFTER
<a href="${branding.staffPortalUrl}" style="...">
  Confirm Shifts in Staff Portal
</a>
```

**Line 205** - Shift confirmation email (staff-facing):
```typescript
// BEFORE
<a href="${branding.appUrl}/shifts" style="...">
  View Shifts in Staff Portal
</a>

// AFTER
<a href="${branding.staffPortalUrl}" style="...">
  View Shifts in Staff Portal
</a>
```

**Line 290** - Shift receipt email (admin-facing):
```typescript
// BEFORE (if exists)
<a href="${branding.appUrl}/shifts" style="...">
  View Shifts
</a>

// AFTER
<a href="${branding.adminDashboardUrl}" style="...">
  View Shifts
</a>
```

**Note:** Verify if line 290 is admin-facing or staff-facing before changing.

#### B. smart-marketplace-digest (Staff Marketplace)

**File:** `supabase/functions/smart-marketplace-digest/index.ts`

**Line 379** - Portal URL variable:
```typescript
// BEFORE
const SITE_URL = Deno.env.get("SITE_URL") || "https://agilecaremanagement.co.uk";
const portalUrl = `${SITE_URL}/portal`;

// AFTER
const branding = await getBranding(supabase, agency_id);
const portalUrl = branding.staffPortalUrl;
```

**Lines 154, 201** - SMS & WhatsApp messages:
```typescript
// Already uses portalUrl variable, so change above will fix these automatically
View & claim shifts now:
👉 ${portalUrl}
```

**Line 287** - Email button:
```typescript
// Already uses portalUrl variable, so change above will fix
<a href="${portalUrl}" style="...">
  View & Claim Shifts Now →
</a>
```

#### C. daily-client-digest (Client Schedules)

**File:** `supabase/functions/daily-client-digest/index.ts`

**Line 130** - Template variables:
```typescript
// BEFORE
portal_url: branding.portalUrl,

// AFTER
portal_url: branding.clientPortalUrl,
```

**Template file** (`_shared/templates/daily_client_digest.html` line 63):
- Already uses `{{portal_url}}` variable
- No change needed to template (just the variable passed in)

### 3. Testing Changes

#### Test Cases

**Test 1: Staff Shift Assignment Email**
```
1. Admin creates shift and assigns to staff
2. Staff receives email
3. Click "Confirm Shifts in Staff Portal" button
4. EXPECTED: Lands on /staffportal page
5. VERIFY: Can see assigned shifts
```

**Test 2: Staff Marketplace Digest**
```
1. Admin posts urgent shift to marketplace
2. Staff receives digest (Email/SMS/WhatsApp)
3. Click link to view shifts
4. EXPECTED: Lands on /staffportal or /ShiftMarketplace
5. VERIFY: Can see marketplace shifts
```

**Test 3: Client Daily Digest**
```
1. Client has shifts scheduled for tomorrow
2. Client receives daily digest email
3. Click "Go to Client Portal" button
4. EXPECTED: Lands on /ClientPortal page
5. VERIFY: Can see tomorrow's schedule
```

**Test 4: Email Client Compatibility**
- Gmail (web)
- Gmail (mobile app)
- Outlook (desktop)
- Outlook (web)
- Apple Mail (iOS)
- Apple Mail (macOS)

**Test 5: URL Parameters Preserved**
```
If email includes: /staffportal?shift_id=123
Then clicking link should preserve ?shift_id=123
```

## Implementation Steps

### Step 1: Update getBranding.ts (5 mins)
1. Add new fields to `Branding` interface
2. Add default URL values in both branches (agency branding + default)
3. Ensure backward compatibility (keep `portalUrl`)

### Step 2: Update notification-digest-engine (10 mins)
1. Replace `${branding.appUrl}/shifts` with `${branding.staffPortalUrl}`
2. Replace admin links with `${branding.adminDashboardUrl}` (if applicable)
3. Test locally with `deno run`

### Step 3: Update smart-marketplace-digest (10 mins)
1. Import `getBranding`
2. Replace hardcoded portal URL with `branding.staffPortalUrl`
3. Test locally

### Step 4: Update daily-client-digest (5 mins)
1. Replace `branding.portalUrl` with `branding.clientPortalUrl`
2. Test locally

### Step 5: Deploy to Staging (10 mins)
1. Deploy all updated edge functions
2. Send test emails to yourself
3. Click all links and verify routing

### Step 6: Production Deployment (5 mins)
1. Deploy to production
2. Monitor error logs for 24h
3. Verify no link-related support tickets

## Rollback Plan

**If issues detected:**
1. Revert `getBranding.ts` to previous version
2. Revert email template changes
3. Redeploy functions

**Risk:** Very low (no database changes)
**Impact:** Links revert to broken state (no worse than before)

## Success Metrics

- ✅ Zero 404 errors from email links
- ✅ Staff portal page views increase (staff clicking links)
- ✅ Client portal page views increase (clients clicking links)
- ✅ Zero support tickets about "link doesn't work"

## Dependencies

**None** - This is a standalone quick win

## Blockers

**None** - Ready to implement immediately

## Notes for Implementing Agent

- Keep changes minimal and focused
- Test each email template independently
- Preserve all existing styling and HTML structure
- Don't modify any other logic in the functions
- Ensure all string replacements are exact
- Use search/replace to avoid missing any instances

## Verification Checklist

Before marking Phase 1 complete:
- [ ] getBranding.ts updated with 3 new URL fields
- [ ] notification-digest-engine uses staffPortalUrl
- [ ] smart-marketplace-digest uses staffPortalUrl
- [ ] daily-client-digest uses clientPortalUrl
- [ ] All functions deployed to staging
- [ ] Test emails sent and links verified
- [ ] All functions deployed to production
- [ ] Error logs checked (no new errors)
- [ ] User testing: Ask 1 staff + 1 client to verify

---

**Ready for implementation!**
