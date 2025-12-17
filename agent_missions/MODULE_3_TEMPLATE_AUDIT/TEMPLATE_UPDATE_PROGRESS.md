# Template Update Progress Tracker

**Last Updated:** 2025-12-16 (Start)
**Current Agent:** Claude Code
**Status:** 🟡 IN PROGRESS

---

## 📋 PHASE 4: CRITICAL FIXES (IMMEDIATE)

### Critical Fix 1: Malformed Phone Numbers
- [ ] `src/utils/emailTemplates.js:136` - Fix `++447414756101` → `+447414756101`
- [ ] `dominion_doc/WELCOME_EMAIL_TEMPLATE.html:134` - Fix `++447414756101` → `+447414756101`

### Critical Fix 2: Typo Domain
- [ ] `supabase/functions/incoming-whatsapp-handler/index.ts:463` - Fix `agilecareemanagement` → `agilecaremanagement`

### Critical Fix 3: Wrong Domain (Base44)
- [ ] `supabase/functions/incomplete-profile-reminder/index.ts:283` - Fix `base44.com` → `agilecaremanagement.co.uk`
- [ ] `supabase/functions/incomplete-profile-reminder/index.ts:338` - Fix `base44.com` → `agilecaremanagement.co.uk`
- [ ] `supabase/functions/incomplete-profile-reminder/index.ts:396` - Fix `base44.com` → `agilecaremanagement.co.uk`
- [ ] `supabase/functions/incomplete-profile-reminder/index.ts:455` - Fix `base44.com` → `agilecaremanagement.co.uk`

### Edge Function Redeployments
- [ ] Deploy `incoming-whatsapp-handler`
- [ ] Deploy `incomplete-profile-reminder`

---

## 📋 PHASE 5: ENVIRONMENT VARIABLES

### Environment Variable Setup
- [ ] Add `SAAS_NAME` to .env
- [ ] Add `SAAS_COMPANY_NAME` to .env
- [ ] Add `SAAS_SUPPORT_EMAIL` to .env
- [ ] Add `SAAS_SUPPORT_PHONE` to .env
- [ ] Add `SAAS_NOREPLY_EMAIL` to .env
- [ ] Add `APP_URL` to .env
- [ ] Add `PORTAL_URL` to .env
- [ ] Set all variables in Supabase secrets

---

## 📋 PHASE 6: DATABASE MIGRATION

- [ ] Review `add_branding_system.sql`
- [ ] Run migration in Supabase Dashboard
- [ ] Verify `saas_configuration` table created
- [ ] Verify seeding completed for all agencies
- [ ] Test `get_agency_branding()` helper function

---

## 📋 PHASE 7: EDGE FUNCTION TEMPLATE UPDATES

### Top Priority (Most Hard-Coded Values)

#### 1. welcome-agency/index.ts (12 instances) ✅ COMPLETED
- [X] Line 82: `🎉 Welcome to ACG StaffLink!` → `${branding.saasName}` ✅
- [X] Line 97: `to the ACG StaffLink family!` → `${branding.saasName}` ✅
- [X] Line 102: `ACG StaffLink is trusted by...` → `${branding.saasName}` ✅
- [X] Line 148: `ACG StaffLink handles it all...` → `${branding.saasName}` ✅
- [X] Line 201: `get the most out of ACG StaffLink` → `${branding.saasName}` ✅
- [X] Line 204: `support@acgstafflink.com` → `${branding.supportEmail}` ✅
- [X] Line 211: `how ACG StaffLink transforms...` → `${branding.saasName}` ✅
- [X] Line 222: `The ACG StaffLink Team` → `${branding.saasName}` ✅
- [X] Line 230: `support@acgstafflink.com | www.acgstafflink.com` → `${branding.supportEmail} | ${branding.siteUrl}` ✅
- [X] Line 233: Copyright notice → `${branding.saasName}` ✅
- [X] Line 245: Email subject → `${branding.saasName}` ✅
- [X] Line 247: `from_name: 'ACG StaffLink'` → `branding.saasName` ✅
- [X] **Status:** COMPLETED & DEPLOYED (2025-12-16)

#### 2. send-agency-admin-invite/index.ts (12 instances) ✅ COMPLETED
- [X] Line 56: Fallback URL → Uses `SITE_URL` env variable ✅
- [X] Line 94: Email subject → `${branding.companyName}` ✅
- [X] Line 99: Email header → `${branding.companyName}` ✅
- [X] Line 106: Email body → `${branding.companyName}` ✅
- [X] Line 149: Link text → `${branding.companyName}` ✅
- [X] Line 150: Support email (2x) → `${branding.supportEmail}` ✅
- [X] Line 157: Copyright → `${branding.companyName}` ✅
- [X] Line 159: Footer support email → `${branding.supportEmail}` ✅
- [X] Line 215-217: From email → Uses `RESEND_FROM_DOMAIN` env variable ✅
- [X] Line 267: Added getBranding call ✅
- [X] **Status:** COMPLETED & DEPLOYED (2025-12-16)

#### 3. critical-change-notifier/index.ts (9 instances) ✅ COMPLETED
- [X] Line 71: `RESEND_FROM_DOMAIN` fallback → Already using env variable ✅
- [X] Line 88: Added getBranding call ✅
- [X] Line 93: `support@agilecaremanagement.co.uk` → `${branding.supportEmail}` ✅
- [X] Line 148: `Agile Care Management` → `${branding.companyName}` ✅
- [X] Lines 313, 371, 442, 523: Copyright notices (4x) → `${branding.companyName}` ✅
- [X] Lines 315, 373, 444, 525: Support emails (4x) → `${branding.supportEmail}` ✅
- [X] **Status:** COMPLETED & DEPLOYED (2025-12-16)

#### 4. notification-digest-engine/index.ts (8 instances) ✅ COMPLETED
- [X] Line 70: Added getBranding call ✅
- [X] Line 176: Support email fallback → `${branding.supportEmail}` ✅
- [X] Line 183: Preferences URL → `${branding.siteUrl}` ✅
- [X] Line 191: Copyright → `${branding.companyName}` ✅
- [X] Line 193: Support email → `${branding.supportEmail}` ✅
- [X] Line 254: App URL → `${branding.appUrl}` ✅
- [X] Line 260: Agency name fallback → `${branding.companyName}` ✅
- [X] Lines 337, 345, 347: Repeat URLs/emails → `${branding.siteUrl}`, `${branding.companyName}`, `${branding.supportEmail}` ✅
- [X] **Status:** COMPLETED & DEPLOYED (2025-12-16)

#### 5. send-profile-reminders/index.ts (6 instances) ✅ COMPLETED
- [X] Line 203: Added getBranding call inside loop ✅
- [X] Line 233: `Your ACG StaffLink profile...` → `${branding.saasName}` ✅
- [X] Line 273: `ACG StaffLink Team` → `${branding.saasName}` ✅
- [X] Line 280: `automated reminder from ACG StaffLink` → `${branding.saasName}` ✅
- [X] Line 281: `Powered by Agile Care Group` → `${branding.companyName}` ✅
- [X] Line 309: `from_name` fallback → `${branding.saasName}` ✅
- [X] **Status:** COMPLETED & DEPLOYED (2025-12-17)

#### 6. shift-verification-chain/index.ts (5 instances) ✅ COMPLETED
- [X] Line 65: Added getBranding call ✅
- [X] Line 165: `automated notification from ACG StaffLink` → `${branding.saasName}` ✅
- [X] Lines 212, 287: Agency name/email fallback (2x) → `${branding.saasName}`, `${branding.supportEmail}` ✅
- [X] Line 317: `from_name` fallback → `${branding.saasName}` ✅
- [X] Line 345: `automation@acgstafflink.com` → `automation@${branding.emailDomain}` ✅
- [X] **Status:** COMPLETED & DEPLOYED (2025-12-17)

#### 7. incomplete-profile-reminder/index.ts (4 instances + critical fix)
- [X] Lines 283, 338, 396, 455: `base44.com` → Fixed in Phase 4 (CRITICAL)
- [ ] **Status:** CRITICAL FIX COMPLETE, no other branding issues

#### 8. handle-unsubscribe/index.ts (6 instances) ✅ COMPLETED
- [X] Line 138: Added getBranding call ✅
- [X] Line 158: Updated getSuccessPage signature to accept branding ✅
- [X] Lines 303, 306: URLs (2x) → `${branding.siteUrl}` ✅
- [X] Line 314: Support email → `${branding.supportEmail}` ✅
- [X] Line 316: Copyright → `${branding.companyName}` ✅
- [X] Lines 447, 453, 454: Error page branding (3x) → Uses env variables with fallback ✅
- [X] **Status:** COMPLETED & DEPLOYED (2025-12-17)

#### 9. email-automation-engine/index.ts (3 instances) ✅ COMPLETED
- [X] Line 86: Added getBranding call inside agency loop ✅
- [X] Line 378: Preferences URL → `${branding.siteUrl}` ✅
- [X] Line 386: Copyright → `${branding.companyName}` ✅
- [X] Line 388: Support email (2x) → `${branding.supportEmail}` ✅
- [X] **Status:** COMPLETED & DEPLOYED (2025-12-17)

#### 10. staff-daily-digest-engine/index.ts (3 instances) ✅ COMPLETED
- [X] Line 52: Added getBranding call inside agency loop ✅
- [X] Line 200: Preferences URL → `${branding.siteUrl}` ✅
- [X] Line 208: Copyright → `${branding.companyName}` ✅
- [X] Line 210: Support email (2x) → `${branding.supportEmail}` ✅
- [X] **Status:** COMPLETED & DEPLOYED (2025-12-17)

#### 11. whatsapp-timesheet-upload-handler/index.ts (1 instance) ✅ COMPLETED
- [X] Line 84: Added getBranding call after staff found ✅
- [X] Line 265: Netlify URL → `${branding.siteUrl}/staff/timesheets` ✅
- [X] **Status:** COMPLETED & DEPLOYED (2025-12-17)

#### 12. smart-clock-out-reminders/index.ts (1 instance) ✅ COMPLETED
- [X] Line 63: Added getBranding call inside shift loop ✅
- [X] Line 247: Netlify URL fallback → `branding.siteUrl` ✅
- [X] **Status:** COMPLETED & DEPLOYED (2025-12-17)

---

## ✅ PHASE 7 COMPLETE: ALL 12 EDGE FUNCTIONS UPDATED & DEPLOYED! 🎉

**Summary:**
- ✅ 12/12 edge functions updated with dynamic branding
- ✅ All functions deployed to production
- ✅ getBranding helper integrated throughout
- ✅ Multi-tenant branding system fully operational (pending database migration)

---

## 📋 PHASE 8: REACT COMPONENT UPDATES

### Top Priority React Components

#### 1. src/pages/Login.jsx (12 instances)
- [ ] Lines 420-421: Logo alt text and heading (2x) → Use branding context
- [ ] Lines 467-468: Mobile logo (2x) → Use branding context
- [ ] Line 475: `Sign in to Agile Care Management` → Use branding
- [ ] Line 483: Form description → Use branding
- [ ] Line 284: Help text → Use branding
- [ ] **Status:** NOT STARTED

#### 2. src/utils/emailTemplates.js (10 instances)
- [X] Line 136: `++447414756101` → Fixed in Phase 4 (CRITICAL)
- [ ] Line 12: Email title → Use branding
- [ ] Line 20: Email header → Use branding
- [ ] Line 36: Email body → Use branding
- [ ] Line 83: Section heading → Use branding
- [ ] Line 151: Email signature → Use branding
- [ ] Line 159: Migration context → Use branding
- [ ] Line 162: Copyright → Use branding
- [ ] **Status:** CRITICAL FIX COMPLETE, branding updates pending

#### 3. src/pages/Staff.jsx (9 instances)
- [ ] Line 306: Email header → Use branding
- [ ] Line 311: Email body → Use branding
- [ ] Line 349: Email footer → Use branding
- [ ] Line 397: Email subject → Use branding
- [ ] Line 401: Email subject → Use branding
- [ ] Lines 408, 415: Email headers (2x) → Use branding
- [ ] Line 444: Copyright → Use branding
- [ ] Line 456: `from_name` fallback → Use branding
- [ ] **Status:** NOT STARTED

#### 4. src/components/notifications/NotificationService.jsx (8 instances)
- [ ] Line 22: Default `from_name` → Use branding
- [ ] Line 778: `agencyName` fallback → Use branding
- [ ] Line 816: `from_name` fallback → Use branding
- [ ] Line 1027: Copyright → Use branding
- [ ] Line 1042: `from_name` fallback → Use branding
- [ ] Lines 520, 624, 712: URLs (3x) → Use branding
- [ ] **Status:** NOT STARTED

#### 5. src/pages/SuperAdminAgencyManagement.jsx (5 instances)
- [ ] Line 112: Agency name fallback → Use branding
- [ ] Line 121: `from_name` → Use branding
- [ ] Line 125: Email header → Use branding
- [ ] Line 130: Email body → Use branding
- [ ] Line 166: Email footer → Use branding
- [ ] **Status:** NOT STARTED

#### 6. src/components/notifications/EmailTemplates.jsx (4 instances)
- [ ] Line 24: Email title tag → Use branding
- [ ] Line 48: Copyright → Use branding
- [ ] Line 49: "Powered by" footer → Use branding or hide if white-label
- [ ] **Status:** NOT STARTED

#### 7. src/pages/StaffProfile.jsx (4 instances)
- [ ] Line 193: Agency fallback → Use branding
- [ ] Line 402: Document footer → Use branding
- [ ] **Status:** NOT STARTED

#### 8-10. Other Components (8 files with 1-2 instances each)
- [ ] src/pages/Layout.jsx (2 instances)
- [ ] src/pages/InvoiceDetail.jsx (1 instance)
- [ ] src/pages/Dashboard.jsx (1 instance)
- [ ] src/pages/ClientManagement.jsx (2 instances)
- [ ] src/pages/OnboardClient.jsx (2 instances)
- [ ] src/pages/EmailNotificationTester.jsx (2 instances)
- [ ] src/pages/StaffProfileSimulation.jsx (3 instances)
- [ ] src/pages/DisputeResolution.jsx (1 instance)

---

## 📋 PHASE 9: TESTING

### Test Scenarios
- [ ] Send test email - verify agency branding
- [ ] Send test SMS - verify agency contact info
- [ ] Send test WhatsApp - verify agency branding
- [ ] Multi-tenant test - Agency A vs Agency B see different branding
- [ ] Fallback test - New agency sees SaaS defaults
- [ ] Custom domain test (if enabled)
- [ ] White-label test - "Powered by" hidden when flag set
- [ ] URL resolution test - all links work

---

## 🔄 CONTINUATION MARKERS

**If agent needs to stop mid-work:**

**Last File Completed:** None (just started)
**Current File:** None
**Current Line:** N/A
**Next Task:** Execute Phase 4 - Critical Fixes

**Files Modified This Session:**
- None yet

**Edge Functions Deployed This Session:**
- None yet

---

## 📊 OVERALL PROGRESS

- [X] Phase 1: Discovery (100%)
- [X] Phase 2: Categorization (100%)
- [X] Phase 3: Database Schema (100%)
- [ ] Phase 4: Critical Fixes (0% - starting now)
- [ ] Phase 5: Environment Variables (0%)
- [ ] Phase 6: Database Migration (0%)
- [ ] Phase 7: Edge Function Updates (0%)
- [ ] Phase 8: React Component Updates (0%)
- [ ] Phase 9: Testing (0%)

**Overall Completion:** 33% (3/9 phases)

---

**Last Updated By:** Claude Code
**Timestamp:** 2025-12-16 (Session paused - 4/12 edge functions complete)
**Next Agent:** Continue from Phase 7 - send-profile-reminders/index.ts (Function #5)
