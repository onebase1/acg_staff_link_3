# Immediate Critical Fixes - Module 3

**Priority:** 🔴 CRITICAL
**Estimated Time:** 30 minutes
**Status:** ✅ FIXES VERIFIED (2025-12-18)

---

## ✅ VERIFIED FIXES (Already Applied)

### 1. ✅ Phone Numbers - FIXED
**Original Issue:** Double `++` prefix renders phone numbers invalid
**Status:** VERIFIED CORRECT on 2025-12-18

**Files Checked:**
- `src/utils/emailTemplates.js:136` → Now shows `+447414756101` ✅
- `dominion_doc/WELCOME_EMAIL_TEMPLATE.html:134` → Now shows `+447414756101` ✅

---

### 2. ✅ Domain Typo - FIXED
**Original Issue:** Extra 'e' in domain name (`agilecareemanagement`)
**Status:** VERIFIED CORRECT on 2025-12-18

**File Checked:**
- `supabase/functions/incoming-whatsapp-handler/index.ts:463` → Now shows `agilecaremanagement.netlify.app` ✅

---

### 3. ✅ Base44 Domain - FIXED
**Original Issue:** Links pointed to old Base44 project domain
**Status:** VERIFIED CORRECT on 2025-12-18

**File Checked:**
- `supabase/functions/incomplete-profile-reminder/index.ts` (Lines: 283, 338, 396, 455)
- All now use: `Deno.env.get('APP_URL') || 'https://agilecaremanagement.co.uk'` ✅

---

### 4. ✅ SQL Branding File - FIXED
**Original Issue:** Invalid subdomain `app.agilecaremanagement.co.uk` in fallback defaults
**Status:** FIXED on 2025-12-18

**File Fixed:**
- `agent_missions/MODULE_3_TEMPLATE_AUDIT/add_branding_system.sql:175`
- Changed from: `https://app.agilecaremanagement.co.uk`
- Changed to: `https://agilecaremanagement.co.uk` ✅

---

## ⚠️ REMAINING ACTIONS

### Environment Variable Verification Needed
Ensure `APP_URL` is set in Supabase secrets:
```bash
APP_URL=https://agilecaremanagement.co.uk
```

---

## 📝 Execution Checklist

### Phase 1: Fix Files (15 min)

- [ ] **Fix 1:** `src/utils/emailTemplates.js:136`
  - Find: `++447414756101`
  - Replace: `+447414756101`

- [ ] **Fix 2:** `dominion_doc/WELCOME_EMAIL_TEMPLATE.html:134`
  - Find: `++447414756101`
  - Replace: `+447414756101`

- [ ] **Fix 3:** `supabase/functions/incoming-whatsapp-handler/index.ts:463`
  - Find: `agilecareemanagement.netlify.app`
  - Replace: `agilecaremanagement.netlify.app`

- [ ] **Fix 4:** `supabase/functions/incomplete-profile-reminder/index.ts` (4 instances)
  - Lines: 283, 338, 396, 455
  - Find: `https://app.base44.com/ProfileSetup`
  - Replace: `https://agilecaremanagement.co.uk/ProfileSetup`

  OR better (use env variable):
  ```typescript
  const appUrl = Deno.env.get("APP_URL") || Deno.env.get("SITE_URL") || "https://agilecaremanagement.co.uk";
  const profileSetupUrl = `${appUrl}/ProfileSetup`;
  ```

---

### Phase 2: Deploy Edge Functions (10 min)

After fixing files, redeploy affected edge functions:

```bash
# Deploy incoming-whatsapp-handler
/c/Users/gbase/superbasecli/supabase.exe functions deploy incoming-whatsapp-handler --project-ref rzzxxkppkiasuouuglaf

# Deploy incomplete-profile-reminder
/c/Users/gbase/superbasecli/supabase.exe functions deploy incomplete-profile-reminder --project-ref rzzxxkppkiasuouuglaf
```

---

### Phase 3: Verify Environment Variables (5 min)

Ensure these environment variables are set in Supabase:

```bash
# Check current values
/c/Users/gbase/superbasecli/supabase.exe secrets list --project-ref rzzxxkppkiasuouuglaf

# Set APP_URL if not already set
/c/Users/gbase/superbasecli/supabase.exe secrets set APP_URL=https://agilecaremanagement.co.uk --project-ref rzzxxkppkiasuouuglaf
```

---

### Phase 4: Test Fixes (5 min)

**Test 1: Phone Number Rendering**
- Send test email using `src/utils/emailTemplates.js`
- Verify phone link works: `tel:+447414756101`

**Test 2: WhatsApp Link**
- Trigger incoming-whatsapp-handler
- Verify timesheet link points to: `https://agilecaremanagement.netlify.app/staff/timesheets`

**Test 3: Profile Setup Link**
- Trigger incomplete-profile-reminder
- Verify profile setup link points to correct domain

---

## ✅ Success Criteria

After fixes:
- [ ] All phone numbers have single `+` prefix
- [ ] No typos in domain names
- [ ] No links to `base44.com` domain
- [ ] All links functional (no 404 errors)
- [ ] Edge functions redeployed successfully
- [ ] Environment variables verified

---

## 🔄 Rollback Plan

If fixes cause issues:
1. Revert file changes via git: `git checkout HEAD -- <file-path>`
2. Redeploy previous version of edge functions
3. Restore environment variables to previous values

**Files Modified (for rollback reference):**
1. `src/utils/emailTemplates.js`
2. `dominion_doc/WELCOME_EMAIL_TEMPLATE.html`
3. `supabase/functions/incoming-whatsapp-handler/index.ts`
4. `supabase/functions/incomplete-profile-reminder/index.ts`

---

**Status:** READY FOR EXECUTION
**Next Phase:** Environment variable consolidation + database schema deployment
