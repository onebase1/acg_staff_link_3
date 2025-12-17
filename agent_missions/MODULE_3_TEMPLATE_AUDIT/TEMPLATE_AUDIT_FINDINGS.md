# Template Audit - Comprehensive Findings Report

**Date:** 2025-12-16
**Audit Scope:** Complete codebase (Edge Functions, React Components, Templates)
**Total Files Scanned:** 200+
**Total Issues Found:** 250+

---

## 🚨 CRITICAL ISSUES (Must Fix Immediately)

### 1. Malformed Phone Numbers ⚠️
**Severity:** CRITICAL
**Impact:** Invalid contact information in emails

| Location | Issue | Current | Should Be |
|----------|-------|---------|-----------|
| `src/utils/emailTemplates.js:136` | Double plus prefix | `++447414756101` | `+447414756101` |
| `dominion_doc/WELCOME_EMAIL_TEMPLATE.html:134` | Double plus prefix | `++447414756101` | `+447414756101` |

---

### 2. Typo Domain - User Redirection Failure 🔴
**Severity:** CRITICAL
**Impact:** Users sent to non-existent URL

| Location | Issue | Current | Should Be |
|----------|-------|---------|-----------|
| `supabase/functions/incoming-whatsapp-handler/index.ts:463` | Extra 'e' in domain | `agilecare**e**management.netlify.app` | `agilecaremanagement.netlify.app` |

**Risk:** Staff clicking timesheet links get 404 errors.

---

### 3. Wrong Domain Fallback (Old Project) 🔴
**Severity:** CRITICAL
**Impact:** Users redirected to old project domain (Base44)

| Location | Issue | Context |
|----------|-------|---------|
| `supabase/functions/incomplete-profile-reminder/index.ts` | 4 instances of `app.base44.com` | Should use `APP_URL` env variable |

**Lines:** 283, 338, 396, 455
**Risk:** Onboarding emails send users to wrong platform entirely.

---

### 4. SaaS Name Hard-Coded (150+ instances) 🔴
**Severity:** CRITICAL
**Impact:** Blocks multi-tenant white-label functionality

**Primary Culprits:**
- "ACG StaffLink" (60+ occurrences)
- "Agile Care Management" (40+ occurrences)
- "Agile Care Group" (10+ occurrences)

**Top Violators:**
1. `src/utils/emailTemplates.js` - 7 instances in welcome email
2. `supabase/functions/welcome-agency/index.ts` - 12 instances
3. `supabase/functions/send-profile-reminders/index.ts` - 4 instances
4. `src/pages/Staff.jsx` - 8 instances in invitation emails
5. `src/pages/Login.jsx` - 8 instances in UI

**Business Impact:** Cannot rebrand SaaS without code changes.

---

### 5. Support Email Hard-Coded (20+ instances) 🟡
**Severity:** HIGH
**Impact:** Cannot customize support contact per agency

**Primary Addresses:**
- `support@agilecaremanagement.co.uk` (14 instances)
- `support@acgstafflink.com` (6 instances)

**Top Files:**
- `supabase/functions/critical-change-notifier/index.ts` - 4 instances
- `supabase/functions/notification-digest-engine/index.ts` - 3 instances
- `supabase/functions/welcome-agency/index.ts` - 2 instances

---

## 📊 DETAILED FINDINGS BY CATEGORY

### A. EMAIL ADDRESSES

#### Critical Email Addresses (Production Contact Info)

| Email | Count | Severity | Files |
|-------|-------|----------|-------|
| `support@agilecaremanagement.co.uk` | 14 | 🔴 CRITICAL | critical-change-notifier, notification-digest-engine, handle-unsubscribe, staff-daily-digest-engine, send-agency-admin-invite |
| `support@acgstafflink.com` | 6 | 🔴 CRITICAL | welcome-agency, shift-verification-chain, TroubleshootingGuide |
| `noreply@agilecaremanagement.co.uk` | 2 | 🟡 IMPORTANT | send-email, send-agency-admin-invite |
| `automation@acgstafflink.com` | 1 | 🟢 LOW | shift-verification-chain (audit trail only) |
| `system@base44.com` | 1 | 🟡 IMPORTANT | financial-data-validator (old project reference) |

**Recommendation:**
- Add `SAAS_SUPPORT_EMAIL` environment variable
- Add `SAAS_NOREPLY_EMAIL` environment variable
- Allow agency-specific support emails in database

---

### B. SaaS Product Names & Branding

#### Hard-Coded SaaS Names by Location

**Email Templates (Edge Functions):**

| File | "ACG StaffLink" | "Agile Care Management" | "Agile Care Group" |
|------|-----------------|-------------------------|-------------------|
| `welcome-agency/index.ts` | 12 | 0 | 0 |
| `send-profile-reminders/index.ts` | 4 | 1 | 1 |
| `send-agency-admin-invite/index.ts` | 0 | 8 | 0 |
| `critical-change-notifier/index.ts` | 0 | 5 | 0 |
| `notification-digest-engine/index.ts` | 0 | 4 | 0 |
| `shift-verification-chain/index.ts` | 2 | 0 | 0 |
| `smart-marketplace-digest/index.ts` | 1 | 0 | 0 |
| `post-shift-feedback/index.ts` | 1 | 0 | 0 |
| `daily-client-digest/index.ts` | 1 | 0 | 0 |

**React Components (UI):**

| File | "ACG StaffLink" | "Agile Care Management" | "Agile Care Group" |
|------|-----------------|-------------------------|-------------------|
| `src/utils/emailTemplates.js` | 7 | 0 | 0 |
| `src/pages/Staff.jsx` | 8 | 1 | 0 |
| `src/pages/Login.jsx` | 0 | 8 | 0 |
| `src/pages/SuperAdminAgencyManagement.jsx` | 3 | 1 | 1 |
| `src/pages/StaffProfile.jsx` | 1 | 0 | 2 |
| `src/pages/InvoiceDetail.jsx` | 0 | 0 | 1 |
| `src/pages/Dashboard.jsx` | 1 | 0 | 0 |
| `src/pages/Layout.jsx` | 1 | 1 | 0 |
| `src/components/notifications/EmailTemplates.jsx` | 0 | 3 | 0 |
| `src/components/notifications/NotificationService.jsx` | 0 | 5 | 0 |

**Presentation/Demo Pages:**
- `src/pages/DominionPresentation.jsx` - 15+ instances of "ACG StaffLink"

---

### C. Domain Names & URLs

#### Critical Domain Issues

**Netlify Old Domain (High Priority):**

| File | Line | Hard-Coded URL | Context |
|------|------|----------------|---------|
| `whatsapp-timesheet-upload-handler/index.ts` | 261 | `agilecaremanagement.netlify.app/staff/timesheets` | WhatsApp help message |
| `smart-clock-out-reminders/index.ts` | 243 | `agilecaremanagement.netlify.app/StaffPortal` | Clock-out reminder |

**Issue:** Netlify is old deployment - should use production domain or env variable.

---

**Preference URLs (No Env Variable):**

| File | Line | Hard-Coded URL | Should Use |
|------|------|----------------|------------|
| `notification-digest-engine/index.ts` | 179, 333 | `agilecaremanagement.co.uk/preferences` | `SITE_URL` env variable |
| `email-automation-engine/index.ts` | 374 | `agilecaremanagement.co.uk/preferences` | `SITE_URL` env variable |
| `staff-daily-digest-engine/index.ts` | 196 | `agilecaremanagement.co.uk/preferences` | `SITE_URL` env variable |
| `handle-unsubscribe/index.ts` | 299, 302 | `agilecaremanagement.co.uk/client/*` | `SITE_URL` env variable |

---

**Placeholder URLs (TODO - Not Implemented):**

| File | Line | Placeholder URL | Status |
|------|------|-----------------|--------|
| `auto-timesheet-approval-engine/index.ts` | 418 | `https://your-app-domain.com/approve/timesheet/` | ⚠️ TODO |
| `post-shift-feedback/index.ts` | 71 | `https://your-app-domain.com/feedback` | ⚠️ TODO |
| `post-shift-timesheet-reminder/index.ts` | 207 | `https://your-app-url.com/StaffPortal` | ⚠️ TODO |

**Risk:** Features incomplete - users may receive broken links.

---

**React Component URLs:**

| File | Line | Hard-Coded URL | Context |
|------|------|----------------|---------|
| `src/components/notifications/NotificationService.jsx` | 520, 624, 712 | `agilecaremanagement.co.uk/staff-portal` | Shift view links (3 instances) |
| `src/pages/Login.jsx` | 263, 267 | `agilecaremanagement.co.uk/terms`, `/privacy` | Legal links |

---

### D. Phone Numbers

#### Malformed Numbers (CRITICAL)

| File | Line | Issue | Value |
|------|------|-------|-------|
| `src/utils/emailTemplates.js` | 136 | Double `++` prefix | `++447414756101` |
| `dominion_doc/WELCOME_EMAIL_TEMPLATE.html` | 134 | Double `++` prefix | `++447414756101` |

**Fix:** Remove extra `+` prefix.

---

#### Fallback Phone Numbers (SAFE - Dynamic with Fallback)

| Location | Phone | Usage | Status |
|----------|-------|-------|--------|
| `critical-change-notifier/index.ts:88` | `+44 20 1234 5678` | `agency?.phone \|\| '+44 20 1234 5678'` | ✅ SAFE |
| `notification-digest-engine/index.ts:172` | `+44 20 1234 5678` | `agency?.contact_phone \|\| '...'` | ✅ SAFE |
| `NotificationService.jsx:531,618,707` | `+44 20 1234 5678` | Fallback agency contact | ✅ SAFE |

**Note:** These are dynamic values with safe fallbacks. No hard-coded production numbers found.

---

## 🎯 SUMMARY BY SEVERITY

### 🔴 CRITICAL (Blocks Multi-Tenant/White-Label)
1. ✅ **150+ SaaS name hard-coded instances** - Prevents rebranding
2. ✅ **Typo domain** - Users get 404 errors
3. ✅ **Wrong domain (base44.com)** - Users sent to old project
4. ✅ **Malformed phone numbers** - Invalid contact info in emails

**Total Critical Issues:** 4 categories, 170+ instances

---

### 🟡 HIGH (User Confusion / Bad UX)
1. ✅ **20+ hard-coded support emails** - Cannot customize per agency
2. ✅ **Netlify old domain URLs** - Directs to outdated deployment
3. ✅ **Preference URLs without env variables** - Hard to change domains
4. ✅ **Placeholder "TODO" URLs** - Incomplete features

**Total High Issues:** 4 categories, 35+ instances

---

### 🟢 MEDIUM (Configuration / Best Practice)
1. ✅ **Login page branding** - Shows "Agile Care Management" UI labels
2. ✅ **Loading screens** - Shows "ACG StaffLink" during load
3. ✅ **Document footers** - Hard-coded platform names
4. ✅ **Copyright notices** - Hard-coded company names

**Total Medium Issues:** 4 categories, 40+ instances

---

## 📋 FILES REQUIRING UPDATES

### Top 20 Files by Number of Hard-Coded Values

| # | File | Issues | Categories |
|---|------|--------|------------|
| 1 | `supabase/functions/welcome-agency/index.ts` | 15 | SaaS name, emails, URLs |
| 2 | `supabase/functions/send-agency-admin-invite/index.ts` | 12 | SaaS name, emails, URLs |
| 3 | `src/pages/Login.jsx` | 12 | SaaS name, URLs |
| 4 | `src/utils/emailTemplates.js` | 10 | SaaS name, phone (malformed) |
| 5 | `supabase/functions/critical-change-notifier/index.ts` | 9 | SaaS name, emails |
| 6 | `src/pages/Staff.jsx` | 9 | SaaS name, emails |
| 7 | `supabase/functions/notification-digest-engine/index.ts` | 8 | SaaS name, emails, URLs |
| 8 | `supabase/functions/send-profile-reminders/index.ts` | 6 | SaaS name |
| 9 | `src/components/notifications/NotificationService.jsx` | 8 | SaaS name, URLs |
| 10 | `src/components/notifications/EmailTemplates.jsx` | 4 | SaaS name |
| 11 | `supabase/functions/incomplete-profile-reminder/index.ts` | 4 | URLs (base44.com) |
| 12 | `supabase/functions/shift-verification-chain/index.ts` | 5 | SaaS name, emails |
| 13 | `src/pages/SuperAdminAgencyManagement.jsx` | 5 | SaaS name |
| 14 | `src/pages/StaffProfile.jsx` | 4 | SaaS name |
| 15 | `supabase/functions/handle-unsubscribe/index.ts` | 6 | Emails, URLs |
| 16 | `supabase/functions/email-automation-engine/index.ts` | 3 | Emails, URLs |
| 17 | `supabase/functions/staff-daily-digest-engine/index.ts` | 3 | Emails, URLs |
| 18 | `supabase/functions/incoming-whatsapp-handler/index.ts` | 1 | URL (typo) |
| 19 | `supabase/functions/whatsapp-timesheet-upload-handler/index.ts` | 1 | URL (Netlify) |
| 20 | `supabase/functions/smart-clock-out-reminders/index.ts` | 1 | URL (Netlify) |

---

## 💡 RECOMMENDED SOLUTION ARCHITECTURE

### Environment Variables to Add

```bash
# SaaS Branding
SAAS_NAME="StaffLink Pro"
SAAS_COMPANY_NAME="YourCompany Ltd"
SAAS_SUPPORT_EMAIL="support@stafflinkpro.com"
SAAS_NOREPLY_EMAIL="noreply@stafflinkpro.com"
SAAS_SUPPORT_PHONE="+44 20 7946 0958"

# URLs
SITE_URL="https://stafflinkpro.com"
APP_URL="https://app.stafflinkpro.com"
PORTAL_URL="https://app.stafflinkpro.com/portal"

# Domain Configuration
FROM_DOMAIN="stafflinkpro.com"
```

---

### Database Schema Extension

**Option 1: Add to existing `agencies` table:**

```sql
ALTER TABLE agencies
ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{
  "company_name": null,
  "support_email": null,
  "support_phone": null,
  "logo_url": null,
  "primary_color": "#667eea",
  "secondary_color": "#764ba2",
  "custom_domain": null
}'::jsonb;
```

**Option 2: Create new `saas_configuration` table (Recommended):**

```sql
CREATE TABLE IF NOT EXISTS saas_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,

  -- Branding
  saas_name TEXT DEFAULT 'StaffLink Pro',
  saas_company_name TEXT DEFAULT 'YourCompany Ltd',

  -- Contact Info
  support_email TEXT DEFAULT 'support@stafflinkpro.com',
  support_phone TEXT DEFAULT '+44 20 7946 0958',
  noreply_email TEXT DEFAULT 'noreply@stafflinkpro.com',

  -- URLs
  from_domain TEXT DEFAULT 'stafflinkpro.com',
  custom_domain TEXT,
  portal_url TEXT,

  -- Theme
  logo_url TEXT,
  primary_color TEXT DEFAULT '#667eea',
  secondary_color TEXT DEFAULT '#764ba2',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saas_config_agency ON saas_configuration(agency_id);
```

---

### Helper Function for Email Templates

**Create reusable branding fetcher:**

```typescript
// supabase/functions/_shared/getBranding.ts
export async function getBranding(supabase: any, agencyId: string) {
  // Fetch agency-specific branding
  const { data: config } = await supabase
    .from('saas_configuration')
    .select('*')
    .eq('agency_id', agencyId)
    .single();

  // Fallback to env variables
  return {
    saasName: config?.saas_name || Deno.env.get("SAAS_NAME") || "StaffLink Pro",
    companyName: config?.saas_company_name || Deno.env.get("SAAS_COMPANY_NAME") || "YourCompany Ltd",
    supportEmail: config?.support_email || Deno.env.get("SAAS_SUPPORT_EMAIL") || "support@stafflinkpro.com",
    supportPhone: config?.support_phone || Deno.env.get("SAAS_SUPPORT_PHONE") || "+44 20 7946 0958",
    siteUrl: config?.custom_domain || Deno.env.get("SITE_URL") || "https://stafflinkpro.com",
    portalUrl: config?.portal_url || `${Deno.env.get("APP_URL") || "https://app.stafflinkpro.com"}/portal`,
    primaryColor: config?.primary_color || "#667eea",
    logoUrl: config?.logo_url
  };
}
```

---

## 🔄 MIGRATION PLAN

### Phase 1: Immediate Fixes (30 min)
1. ✅ Fix malformed phone numbers (remove double `++`)
2. ✅ Fix typo domain (`agilecareemanagement` → `agilecaremanagement`)
3. ✅ Fix base44.com fallbacks → Use env variables

### Phase 2: Environment Variables (1 hour)
1. ✅ Add all recommended env variables to `.env` and Supabase secrets
2. ✅ Update all functions to use env variables for URLs
3. ✅ Update all functions to use env variables for support contacts

### Phase 3: Database Schema (1 hour)
1. ✅ Create `saas_configuration` table
2. ✅ Seed with current values for all agencies
3. ✅ Create helper function `getBranding()`

### Phase 4: Template Updates (2-3 hours)
1. ✅ Update all edge functions to use `getBranding()` helper
2. ✅ Update React components to use branding context
3. ✅ Replace all hard-coded SaaS names with dynamic values

### Phase 5: Testing (1 hour)
1. ✅ Test email templates render correctly
2. ✅ Test multi-tenant isolation
3. ✅ Verify URLs work for all agencies

---

## ✅ SUCCESS CRITERIA

- [ ] Zero hard-coded email addresses in templates
- [ ] Zero hard-coded phone numbers (except safe fallbacks)
- [ ] Zero hard-coded SaaS product names
- [ ] Zero hard-coded company names
- [ ] Zero hard-coded URLs (all use env variables)
- [ ] All placeholder "TODO" URLs implemented or removed
- [ ] Multi-tenant branding works per agency
- [ ] Can rebrand entire SaaS by changing env variables only

---

**Next Steps:**
1. Review findings with stakeholders
2. Get approval for database schema design
3. Begin Phase 1 (immediate critical fixes)
4. Proceed with systematic template updates

---

**Audit Completed:** 2025-12-16
**Agent:** Claude Code
**Files Audited:** 200+
**Issues Found:** 250+
**Estimated Fix Time:** 6-8 hours
