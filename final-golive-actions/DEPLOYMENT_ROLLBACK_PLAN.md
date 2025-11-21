# 🚨 DEPLOYMENT ROLLBACK PLAN - TASK 5 & 6

**Date**: 2025-11-20  
**Deployment**: Task 5 (Notification Fixes) + Task 6 (UI Fixes)  
**Risk Level**: 🟢 LOW (UI and text changes only, no logic changes)  
**Rollback Time**: < 10 minutes

---

## 📦 WHAT'S BEING DEPLOYED

### Task 5: Notification System Fixes (10 issues fixed)
**Files Modified** (6 files):
1. `src/components/notifications/NotificationService.jsx`
2. `supabase/functions/critical-change-notifier/index.ts`
3. `supabase/functions/email-automation-engine/index.ts`
4. `supabase/functions/notification-digest-engine/index.ts`
5. `supabase/functions/send-agency-admin-invite/index.ts`
6. `supabase/functions/staff-daily-digest-engine/index.ts`

**Changes**: Email template text only (agency contact info, branding, footers)

### Task 6: Signin/Signup UI Fixes (15 changes)
**Files Modified** (1 file):
1. `src/pages/Login.jsx`

**Files Added** (1 file):
1. `public/ACGTransLogo.png`

**Changes**: UI text, logo, branding, email placeholders

---

## 🔄 ROLLBACK METHODS

### Method 1: Git Revert (RECOMMENDED - Fastest)

**Use when**: Deployment succeeds but you want to undo changes

**Steps** (< 5 minutes):
```bash
# Step 1: Get the commit hash of the deployment
git log --oneline -5
# Note the commit hash (e.g., a3f5e8d)

# Step 2: Revert the commit
git revert <commit-hash> --no-edit

# Step 3: Push to GitHub (triggers auto-deploy)
git push origin main

# Step 4: Wait for Netlify to deploy (2-5 minutes)
# Netlify will automatically build and deploy the reverted version
```

**Result**: 
- ✅ Changes are undone
- ✅ Git history preserved (shows revert)
- ✅ Netlify auto-deploys old version
- ✅ Users see old UI/emails in 2-5 minutes

---

### Method 2: Restore Backup Files (Manual)

**Use when**: You want to manually restore specific files

**Steps** (< 10 minutes):
```bash
# Step 1: Restore Login.jsx from backup
cp src/pages/Login_BACKUP_20251120_TASK6.jsx src/pages/Login.jsx

# Step 2: Restore notification files from Git
git checkout HEAD~1 src/components/notifications/NotificationService.jsx
git checkout HEAD~1 supabase/functions/critical-change-notifier/index.ts
git checkout HEAD~1 supabase/functions/email-automation-engine/index.ts
git checkout HEAD~1 supabase/functions/notification-digest-engine/index.ts
git checkout HEAD~1 supabase/functions/send-agency-admin-invite/index.ts
git checkout HEAD~1 supabase/functions/staff-daily-digest-engine/index.ts

# Step 3: Remove new logo (optional)
rm public/ACGTransLogo.png

# Step 4: Commit and push
git add .
git commit -m "ROLLBACK: Revert Task 5 & 6 changes"
git push origin main

# Step 5: Wait for Netlify to deploy
```

**Result**:
- ✅ All files restored to previous state
- ✅ Netlify auto-deploys old version
- ✅ Users see old UI/emails in 2-5 minutes

---

### Method 3: Netlify Rollback (Instant)

**Use when**: You need IMMEDIATE rollback (emergency)

**Steps** (< 2 minutes):
1. Go to Netlify dashboard: https://app.netlify.com
2. Click on your site
3. Go to "Deploys" tab
4. Find the previous successful deploy (before today)
5. Click "..." menu → "Publish deploy"
6. Confirm

**Result**:
- ✅ **INSTANT rollback** (no build needed)
- ✅ Users see old version immediately
- ⚠️ Your Git repo still has new code (need to revert later)

---

## 🎯 ROLLBACK DECISION TREE

```
Issue detected?
│
├─ YES → What type of issue?
│   │
│   ├─ CRITICAL (site broken, auth fails)
│   │   └─ Use Method 3 (Netlify Rollback) - INSTANT
│   │
│   ├─ HIGH (UI broken, emails not sending)
│   │   └─ Use Method 1 (Git Revert) - 5 minutes
│   │
│   └─ LOW (typo, minor visual issue)
│       └─ Fix forward (make new commit) - 10 minutes
│
└─ NO → Monitor for 24 hours
    └─ If no issues → Deployment successful ✅
```

---

## 🚨 ROLLBACK TRIGGERS

### Immediate Rollback Required (Use Method 3)
- ❌ Users cannot sign in
- ❌ Users cannot sign up
- ❌ Site shows white screen / error page
- ❌ Mobile layout completely broken
- ❌ Critical functionality broken

### Standard Rollback (Use Method 1)
- ⚠️ Logo not displaying correctly
- ⚠️ Email templates have errors
- ⚠️ Branding looks unprofessional
- ⚠️ Links broken (Terms/Privacy)
- ⚠️ User reports confusion

### Fix Forward (No Rollback)
- ℹ️ Minor typo in text
- ℹ️ Small visual adjustment needed
- ℹ️ Non-critical improvement identified

---

## 📋 POST-ROLLBACK CHECKLIST

After rollback, verify:

### Frontend (Login Page)
- [ ] Visit `/login` page
- [ ] Verify old UI is restored
- [ ] Test signin with existing account
- [ ] Test signup with new account
- [ ] Test forgot password flow
- [ ] Check mobile layout

### Backend (Emails)
- [ ] Trigger a test email (e.g., password reset)
- [ ] Verify email has old template
- [ ] Check email footer/branding
- [ ] Verify links work

### Netlify
- [ ] Check Netlify deploy logs (no errors)
- [ ] Verify correct deploy is published
- [ ] Check build time (should be recent)

---

## 🔍 MONITORING PLAN (AFTER DEPLOYMENT)

### First 30 Minutes (Active Monitoring)
- [ ] Visit live site `/login` page
- [ ] Test signin flow
- [ ] Test signup flow
- [ ] Check logo displays correctly
- [ ] Verify no console errors (F12 → Console)
- [ ] Test on mobile device

### First 2 Hours (Passive Monitoring)
- [ ] Check Netlify analytics (any 404s or errors?)
- [ ] Monitor email delivery (any bounces?)
- [ ] Watch for user reports

### First 24 Hours (Ongoing Monitoring)
- [ ] Check error logs daily
- [ ] Monitor user feedback
- [ ] Verify no increase in support tickets

---

## 📞 EMERGENCY CONTACTS

**If rollback is needed**:
1. **Netlify Dashboard**: https://app.netlify.com
2. **GitHub Repository**: https://github.com/onebase1/acg_staff_link_3
3. **Backup Files**: `src/pages/Login_BACKUP_20251120_TASK6.jsx`

---

## ✅ PRE-DEPLOYMENT VERIFICATION

Before deploying, confirm:
- [x] Backup created: `Login_BACKUP_20251120_TASK6.jsx`
- [x] Self-test passed: 100/100 (Task 5 & 6)
- [x] No syntax errors: Verified with diagnostics
- [x] Rollback plan documented: This file
- [x] Git status clean: All changes tracked
- [ ] Build succeeds: Will verify next
- [ ] User approved: Awaiting confirmation

---

## 🎯 DEPLOYMENT COMMIT MESSAGE

```
feat: Task 5 & 6 - Fix notifications and signin UI

Task 5: Notification System Fixes
- Replace hardcoded placeholders with agency contact info
- Update branding from "ACG StaffLink" to "Agile Care Management"
- Add professional footers to all email templates
- Fix missing CTA links and help sections
- 10 issues fixed across 6 files

Task 6: Signin/Signup UI Fixes
- Replace enterprise jargon with care home benefits
- Implement actual company logo (ACGTransLogo.png)
- Update all email placeholders to agilecaremanagement.co.uk
- Fix external links (Terms/Privacy)
- 15 changes across 1 file

Changes: UI and text only, zero functionality changes
Risk: LOW (easy rollback available)
Rollback: See DEPLOYMENT_ROLLBACK_PLAN.md
```

---

**Rollback Plan Status**: ✅ COMPLETE  
**Ready for Deployment**: ⏳ PENDING USER APPROVAL  
**Estimated Rollback Time**: < 10 minutes (any method)

