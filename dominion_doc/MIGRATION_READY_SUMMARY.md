# Dominion Migration - Ready to Execute Summary

**Date:** 2025-11-20 (2am - Holding emails until Dominion pre-announcement)  
**Status:** ✅ READY TO EXECUTE (pending your approval)  
**Staff Count:** 46

---

## 🎯 WHAT'S READY

### ✅ **Strategic Plan Complete**
- [x] Comprehensive audit of onboarding flow
- [x] Notification trigger analysis (bulk import is SAFE)
- [x] Data quality issues identified
- [x] Migration strategy approved: **Option B (Welcome Email + Pre-filled Data)**
- [x] Timeline: 1 day active work, 14 days monitoring

### ✅ **Documentation Created**
- [x] `README.md` - Documentation index
- [x] `MIGRATION_EXECUTIVE_SUMMARY.md` - High-level overview
- [x] `DOMINION_STAFF_MIGRATION_STRATEGIC_PLAN.md` - Complete 462-line plan
- [x] `MIGRATION_CHECKLIST.md` - Print-and-execute checklist
- [x] `PRE_ANNOUNCEMENT_DRAFTS.md` - Email + WhatsApp drafts for Dominion ⭐ NEW
- [x] `EMAIL_SENDER_AUDIT_AND_FIX.md` - Supabase Auth email fix ⭐ NEW
- [x] `clean_staff_data.js` - Data cleaning script
- [x] `WELCOME_EMAIL_TEMPLATE.html` - Professional HTML template

### ✅ **Tools Ready**
- [x] Data cleaning script (Node.js)
- [x] Bulk import utility (tested in codebase)
- [x] Welcome email template (HTML)
- [x] Validation queries (SQL)

---

## 📋 EXECUTION SEQUENCE (UPDATED)

### **Phase 0: Pre-Announcement (Dominion sends FIRST)** ⭐ NEW

**Timing:** 24-48 hours BEFORE ACG sends welcome emails

**What Dominion Sends:**

1. **Email Announcement** (Draft in `PRE_ANNOUNCEMENT_DRAFTS.md`)
   - From: Dominion domain (admin@dominionhealthcare.co.uk)
   - To: All 46 staff
   - Subject: "Important: New Shift Management System - ACG StaffLink"
   - Content: Explains partnership, what to expect, watch for ACG email

2. **WhatsApp Message** (Draft in `PRE_ANNOUNCEMENT_DRAFTS.md`)
   - From: Dominion admin (via staff WhatsApp group)
   - To: All staff in group
   - Content: Short version of email announcement

**Why This Matters:**
- ✅ Staff expect ACG email (not surprised)
- ✅ Less likely to mark as spam
- ✅ Builds trust (Dominion endorses ACG)
- ✅ Reduces confusion and support burden

**Action Required:**
- [ ] Review email draft (customize if needed)
- [ ] Review WhatsApp draft (customize if needed)
- [ ] Dominion sends both announcements
- [ ] Dominion confirms to ACG: "Announcements sent, ready for welcome emails"

---

### **Phase 1: Data Preparation (ACG does this)**

**Timing:** After Dominion sends pre-announcement, before welcome emails

**Tasks:**
1. Run data cleaning script
2. Fix duplicate emails/phones (manual review)
3. Upload to bulk validator
4. Review validation report
5. Test import with 5 staff

**Duration:** 1-2 hours

---

### **Phase 2: Bulk Import (ACG does this)**

**Timing:** After test import succeeds

**Tasks:**
1. Import remaining 41 staff
2. Verify all 46 in database
3. Verify status='active' (not 'onboarding')
4. Verify no emails sent during import

**Duration:** 30 minutes

---

### **Phase 3: Welcome Emails (ACG sends 24-48 hours after Dominion announcement)**

**Timing:** After Dominion confirms pre-announcement sent

**Tasks:**
1. Send batch welcome email to all 46 staff
2. Monitor delivery (bounces, failures)
3. Track initial responses

**Duration:** 1 hour

**Email Content:**
- From: ACG StaffLink <noreply@guest-glow.com>
- Subject: "Welcome to ACG StaffLink - Your Dominion Account is Ready"
- Button: "Set Your Password & Login" → Links to `/forgot-password`
- Content: Account ready, data pre-filled, just set password

---

### **Phase 4: Monitoring (Ongoing)**

**Timing:** Days 1-14 after welcome emails

**Tasks:**
- Track login activity
- Send reminders (Day 3, Day 7)
- Provide support
- Escalate stragglers (Day 14)

**Duration:** 14 days (passive monitoring)

---

## 🚨 EMAIL SENDER ISSUE (NEEDS DECISION)

### **The Problem:**

**Application Emails (Working):**
- ✅ Show "ACG StaffLink <noreply@guest-glow.com>"
- ✅ Professional, trustworthy

**Supabase Auth Emails (Issue):**
- ⚠️ Show "Supabase Auth <noreply@mail.app.supabase.io>"
- ⚠️ Confusing, may be marked as spam

**Which Emails Are Affected:**
- Password reset (when staff click "Set Password" in welcome email) ⭐ **CRITICAL FOR MIGRATION**
- Email confirmation (if enabled)
- Magic link login (if used)

### **The Solution:**

**Option 1: Configure Custom SMTP (10 minutes)** ⭐ RECOMMENDED
- Configure Supabase to use Resend SMTP
- All emails show "ACG StaffLink"
- Professional, consistent branding
- See: `EMAIL_SENDER_AUDIT_AND_FIX.md` for step-by-step

**Option 2: Leave As-Is**
- Accept "Supabase Auth" sender
- Risk of confusion/spam
- Can fix later if issues arise

### **Decision Required:**

- [ ] **Option 1:** Configure custom SMTP before migration (10 minutes)
- [ ] **Option 2:** Leave as-is for now

**My Recommendation:** Option 1 (10 minutes well spent for professional appearance)

---

## ✅ FINAL CHECKLIST BEFORE MIGRATION

### **Pre-Migration (Do These First)**

- [ ] **Dominion sends pre-announcement** (email + WhatsApp)
- [ ] **Wait 24-48 hours** for staff to see announcement
- [ ] **Dominion confirms:** "Staff have been notified, ready for ACG emails"
- [ ] **Fix email sender issue** (optional but recommended - 10 minutes)
- [ ] **Get Dominion agency ID** from database
- [ ] **Update cleaning script** with agency ID
- [ ] **Review duplicate emails** (2 found in CSV)

### **Migration Day**

- [ ] **Run cleaning script** (fix phone numbers, dates)
- [ ] **Upload to bulk validator** (review report)
- [ ] **Test import** (5 staff)
- [ ] **Verify test results** (no emails sent, staff can login)
- [ ] **Full import** (41 staff)
- [ ] **Verify all 46 in database** (SQL queries)
- [ ] **Send welcome emails** (batch via Resend)
- [ ] **Monitor delivery** (track bounces, failures)

### **Post-Migration (Days 1-14)**

- [ ] **Track login activity** (SQL queries)
- [ ] **Send reminders** (Day 3, Day 7)
- [ ] **Provide support** (respond to questions)
- [ ] **Escalate stragglers** (Day 14 phone calls)
- [ ] **Document lessons learned** (for future migrations)

---

## 📞 COORDINATION PLAN

### **Dominion's Responsibilities:**

1. **Send pre-announcement** (email + WhatsApp)
2. **Notify ACG** when announcements sent
3. **Provide support** to staff who have questions
4. **Escalate** to ACG if technical issues

### **ACG's Responsibilities:**

1. **Wait for Dominion confirmation** before sending welcome emails
2. **Run migration** (data cleaning, bulk import)
3. **Send welcome emails** 24-48 hours after Dominion announcement
4. **Monitor login activity** and send reminders
5. **Provide technical support** to staff

### **Communication:**

- **Dominion → ACG:** "Announcements sent, ready for welcome emails"
- **ACG → Dominion:** "Welcome emails sent, monitoring login activity"
- **Daily updates:** Login stats, support tickets, issues

---

## 🎯 SUCCESS CRITERIA

**Migration Complete When:**
- ✅ All 46 staff in database with status='active'
- ✅ All phone numbers in E.164 format (+44...)
- ✅ Zero duplicate emails
- ✅ Dominion pre-announcement sent
- ✅ ACG welcome emails sent
- ✅ 80%+ staff logged in within 7 days
- ✅ 60%+ profiles 100% complete within 14 days

---

## 📄 DOCUMENTS TO REVIEW

**For You (ACG):**
1. `PRE_ANNOUNCEMENT_DRAFTS.md` ⭐ **Review email/WhatsApp drafts**
2. `EMAIL_SENDER_AUDIT_AND_FIX.md` ⭐ **Decide on Supabase SMTP fix**
3. `MIGRATION_EXECUTIVE_SUMMARY.md` - High-level overview
4. `MIGRATION_CHECKLIST.md` - Print this for execution day

**For Dominion:**
1. `PRE_ANNOUNCEMENT_DRAFTS.md` - Email + WhatsApp drafts to send

---

## 🚀 NEXT STEPS (IMMEDIATE)

### **Step 1: Review Pre-Announcement Drafts**
- [ ] Open `PRE_ANNOUNCEMENT_DRAFTS.md`
- [ ] Review email draft (customize if needed)
- [ ] Review WhatsApp draft (customize if needed)
- [ ] Approve or request changes

### **Step 2: Decide on Email Sender Fix**
- [ ] Open `EMAIL_SENDER_AUDIT_AND_FIX.md`
- [ ] Decide: Configure custom SMTP or leave as-is?
- [ ] If configuring: Follow step-by-step guide (10 minutes)

### **Step 3: Coordinate with Dominion**
- [ ] Send pre-announcement drafts to Dominion
- [ ] Confirm timing: When will they send announcements?
- [ ] Agree on coordination: When will ACG send welcome emails?

### **Step 4: Prepare for Migration**
- [ ] Get Dominion agency ID from database
- [ ] Update `clean_staff_data.js` with agency ID
- [ ] Install Node.js dependencies: `npm install papaparse`
- [ ] Review duplicate emails (manual resolution needed)

---

## ⏰ TIMELINE (UPDATED)

| Day | Who | What |
|-----|-----|------|
| **Day 0 (Today)** | ACG | Review drafts, decide on email fix, prepare scripts |
| **Day 1 (Tomorrow)** | Dominion | Send pre-announcement (email + WhatsApp) |
| **Day 2-3** | Staff | Read announcement, expect ACG email |
| **Day 3** | Dominion | Confirm to ACG: "Announcements sent" |
| **Day 3** | ACG | Run migration (clean data, bulk import) |
| **Day 3** | ACG | Send welcome emails to all 46 staff |
| **Day 4-10** | Staff | Set passwords, login, complete profiles |
| **Day 6** | ACG | Send reminder to staff who haven't logged in |
| **Day 10** | ACG | Send second reminder |
| **Day 17** | ACG | Phone call escalation for stragglers |

**Total Calendar Time:** 17 days  
**Total Active Work:** 4-6 hours

---

## 🎯 YOUR DECISION POINTS

**Immediate Decisions:**
1. [ ] Approve pre-announcement drafts (or request changes)
2. [ ] Decide on email sender fix (configure SMTP or leave as-is)
3. [ ] Confirm timing with Dominion (when will they send announcements?)

**Can Decide Later:**
1. [ ] Customize welcome email template (optional)
2. [ ] Customize Supabase Auth email templates (optional)

---

**Ready to proceed?** Let me know your decisions and I'll help execute! 🚀

