# GROUP A: Domain & Email Migration - Complete Analysis

**Date**: 2025-11-20  
**Priority**: 🔴 CRITICAL  
**Status**: In Progress

---

## 📋 COMPLETE FILE INVENTORY

### Code Files Requiring Changes (6 files)
1. ✅ `supabase/functions/send-email/index.ts` - Line 71
2. ✅ `supabase/functions/send-agency-admin-invite/index.ts` - Line 55
3. ✅ `supabase/functions/critical-change-notifier/index.ts` - Line 62
4. ✅ `scripts/testResend.mjs` - Line 10
5. ✅ `scripts/createDominionAgency.mjs` - Line 48
6. ✅ `tests/test-config.ts` - Line 8

### Documentation Files Requiring Updates (3 files)
7. ✅ `dominion_doc/EMAIL_SENDER_AUDIT_AND_FIX.md` - Multiple references
8. ✅ `final-golive-actions/PRE_LAUNCH_STRATEGIC_PLAN.md` - Multiple references
9. ✅ `NETLIFY_DEPLOYMENT_GUIDE.md` - Example references

### Archive Files (Reference Only - NO CHANGES)
- `archive/migration/FRONTEND_MIGRATION_REQUIRED.md` - Line 46, 89
- `archive/migration/FUNCTION_COMPARISON_REPORT.md` - Line 124
- `archive/fixes/SIMPLE_FIX_GUIDE.md` - Line 183, 199
- `dominion_doc/MIGRATION_READY_SUMMARY.md` - Reference only

---

## 🎯 MIGRATION STRATEGY

### Phase 1: Update Code Files ✅
Change all hardcoded `guest-glow.com` references to `agilecaremanagement.co.uk`

### Phase 2: Update Documentation ✅
Update all documentation to reflect new domain

### Phase 3: Configure Supabase Auth SMTP ⚠️
**CRITICAL**: Update Supabase dashboard SMTP settings
- Sender Email: `noreply@agilecaremanagement.co.uk`
- Sender Name: `Agile Care Management`

### Phase 4: Update Environment Variables ⚠️
**Netlify Dashboard**: Update `RESEND_FROM_DOMAIN`

### Phase 5: Verify Resend Domain ⚠️
**Resend Dashboard**: Ensure `agilecaremanagement.co.uk` is verified

### Phase 6: Deploy & Test ⚠️
- Deploy edge functions
- Test email sending
- Verify sender shows correctly

---

## 📝 DETAILED CHANGES

### File 1: `supabase/functions/send-email/index.ts`
**Line 71**: 
```typescript
// BEFORE
const RESEND_FROM_DOMAIN = Deno.env.get("RESEND_FROM_DOMAIN") || "guest-glow.com";

// AFTER
const RESEND_FROM_DOMAIN = Deno.env.get("RESEND_FROM_DOMAIN") || "agilecaremanagement.co.uk";
```

### File 2: `supabase/functions/send-agency-admin-invite/index.ts`
**Line 55**:
```typescript
// BEFORE
return "https://guest-glow.com";

// AFTER
return "https://agilecaremanagement.co.uk";
```

### File 3: `supabase/functions/critical-change-notifier/index.ts`
**Line 62**:
```typescript
// BEFORE
const RESEND_FROM_DOMAIN = Deno.env.get("RESEND_FROM_DOMAIN") || "guest-glow.com";

// AFTER
const RESEND_FROM_DOMAIN = Deno.env.get("RESEND_FROM_DOMAIN") || "agilecaremanagement.co.uk";
```

### File 4: `scripts/testResend.mjs`
**Line 10**:
```javascript
// BEFORE
const fromEmail = process.env.RESEND_DEFAULT_FROM || "noreply@guest-glow.com";

// AFTER
const fromEmail = process.env.RESEND_DEFAULT_FROM || "noreply@agilecaremanagement.co.uk";
```

### File 5: `scripts/createDominionAgency.mjs`
**Line 48**:
```javascript
// BEFORE
email: "info@guest-glow.com",

// AFTER
email: "info@agilecaremanagement.co.uk",
```

### File 6: `tests/test-config.ts`
**Line 8**:
```typescript
// BEFORE
email: 'info@guest-glow.com',

// AFTER
email: 'info@agilecaremanagement.co.uk',
```

---

## ⚠️ MANUAL STEPS REQUIRED

### Step 1: Verify Domain in Resend
1. Login to Resend: https://resend.com/domains
2. Check if `agilecaremanagement.co.uk` is verified
3. If not verified:
   - Add domain
   - Add DNS records (SPF, DKIM, DMARC)
   - Wait for verification

### Step 2: Configure Supabase Auth SMTP
1. Go to: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf
2. Navigate to: **Authentication** → **Email Templates** → **SMTP Settings**
3. Enable Custom SMTP
4. Enter configuration:
   ```
   SMTP Host: smtp.resend.com
   SMTP Port: 587
   SMTP Username: resend
   SMTP Password: re_hzPF7CWV_CTkBHMxuNM2rfAKUwEdJ6GB2
   
   Sender Email: noreply@agilecaremanagement.co.uk
   Sender Name: Agile Care Management
   ```
5. Save and test

### Step 3: Update Netlify Environment Variables
1. Go to Netlify dashboard
2. Navigate to: Site settings → Environment variables
3. Update or add:
   ```
   RESEND_FROM_DOMAIN=agilecaremanagement.co.uk
   RESEND_DEFAULT_FROM=noreply@agilecaremanagement.co.uk
   ```
4. Trigger redeploy

---

## 🧪 TESTING CHECKLIST

- [ ] Send test email via send-email function
- [ ] Test password reset email (Supabase Auth)
- [ ] Test signup confirmation email (Supabase Auth)
- [ ] Verify sender shows "Agile Care Management <noreply@agilecaremanagement.co.uk>"
- [ ] Test shift notification emails
- [ ] Test timesheet reminder emails
- [ ] Check spam score (mail-tester.com)

---

## 🔄 ROLLBACK PLAN

If emails fail after migration:
1. Revert all code changes to `guest-glow.com`
2. Redeploy edge functions
3. Update Supabase SMTP back to `guest-glow.com`
4. Update Netlify env vars back to `guest-glow.com`
5. Test email sending
6. Investigate Resend domain configuration

---

**Status**: Code changes complete, awaiting manual configuration steps

