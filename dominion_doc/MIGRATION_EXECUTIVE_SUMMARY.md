# Dominion Staff Migration - Executive Summary

**Date:** 2025-11-20  
**Decision Required:** Approve migration strategy  
**Timeline:** 1 day (4-6 hours)  
**Staff Count:** 46 staff members

---

## 🎯 THE PROBLEM

You have 46 existing Dominion staff in a CSV file. You need to migrate them to ACG StaffLink without:
- ❌ Forcing them to re-enter data they already provided
- ❌ Spamming them with 46 individual invitation emails
- ❌ Triggering automated "incomplete profile" reminder emails
- ❌ Creating a massive admin workload

---

## ✅ THE SOLUTION: HYBRID STRATEGY

**Approach:** Bulk import staff as "active" (not "onboarding") + send ONE welcome email + staff complete missing fields themselves

### Why This Works:

1. **No Redundant Data Entry**
   - Bulk import pre-fills: name, email, phone, role, bank details, address, etc.
   - Staff only fill in what's missing (if anything)

2. **No Email Spam**
   - Status='active' (not 'onboarding') → skips automated reminder emails
   - ONE custom "Welcome to ACG StaffLink" email (not 46 invitations)
   - Staff use "Forgot Password" to set their password

3. **No Admin Burden**
   - Bulk import takes 30 minutes (not 7.6 hours of manual entry)
   - Admin only intervenes for stragglers who don't login

4. **Scalable**
   - Same process works for future agency migrations
   - Documented, repeatable, automated

---

## 📊 WHAT I FOUND (COMPREHENSIVE AUDIT)

### ✅ Good News: Bulk Import Won't Trigger Email Spam

**Tested Code Paths:**
- ✅ Bulk import utility (`/bulkdataimport`) does NOT send emails
- ✅ Database trigger `link_staff_on_signup()` only fires when users sign up (not bulk import)
- ✅ Role change emails only fire when admin manually updates role via UI
- ✅ Incomplete profile reminders only fire for status='onboarding' (we'll use 'active')

**Conclusion:** Bulk import is SAFE if we set status='active'

### ⚠️ Data Quality Issues Found

| Issue | Count | Fix |
|-------|-------|-----|
| Phone numbers missing +44 | ~46 | Prepend +44 to 10-digit numbers |
| UK dates (DD/MM/YYYY) | ~46 | Auto-converted by validator |
| Missing bank details | ~10 | Import as-is, staff completes later |
| Missing DOB/address | ~5 | Import as-is, staff completes later |
| Duplicate emails | 2 | Manual review required |

### 🔧 Existing Infrastructure (Ready to Use)

1. **Bulk Import Validator** (`validate-bulk-import` Edge Function)
   - ✅ Validates emails, phones, dates
   - ✅ Auto-fixes common issues
   - ✅ Converts UK dates to ISO format
   - ✅ Provides detailed validation report

2. **Bulk Import Utility** (`/bulkdataimport` page)
   - ✅ CSV upload interface
   - ✅ Preview data before import
   - ✅ Creates staff records in database
   - ⚠️ NOT TESTED in production (needs test run)

3. **Onboarding Flow** (For staff who login)
   - ✅ ProfileSetup shows completion %
   - ✅ Staff can fill missing fields
   - ✅ Database trigger auto-links email to staff record

---

## 🚀 IMPLEMENTATION PLAN (3 PHASES)

### Phase 1: Data Preparation (1-2 hours)
1. Run data cleaning script (fix phone numbers, dates, roles)
2. Upload to bulk validator
3. Review validation report
4. Fix critical errors (duplicates, invalid emails)

### Phase 2: Bulk Import (30 minutes)
1. Test import with 5 staff
2. Verify no emails sent
3. Verify staff can login
4. Import remaining 41 staff
5. Verify all 46 records created

### Phase 3: Staff Notification (1 hour)
1. Send ONE batch "Welcome to ACG StaffLink" email
2. Include login instructions + "Forgot Password" link
3. Monitor login activity
4. Send gentle reminders to stragglers (Day 3, Day 7)

---

## 📋 DECISION POINTS

### ✅ APPROVE:
- [ ] Hybrid strategy (bulk import + self-service completion)
- [ ] Welcome email template (see full plan)
- [ ] Data cleaning requirements (phone +44, UK dates)
- [ ] Timeline: 1 day migration

### ⚠️ REVIEW:
- [ ] Duplicate emails (2 found) - contact Dominion to clarify
- [ ] Missing bank details (~10 staff) - acceptable to import as-is?
- [ ] Test import with 5 staff first - acceptable approach?

### ❌ REJECT (Alternative Options):
- [ ] Option A: Bulk import + silent activation (staff can't login until they create password)
- [ ] Option B: Admin manually completes all 46 profiles (7.6 hours)

---

## 🎯 SUCCESS CRITERIA

**Migration Complete When:**
- ✅ All 46 staff in database with status='active'
- ✅ All phone numbers in E.164 format (+44...)
- ✅ Zero duplicate emails
- ✅ Welcome email sent to all staff
- ✅ 80%+ staff logged in within 7 days
- ✅ 60%+ profiles 100% complete within 14 days

**Rollback Plan:**
```sql
-- If migration fails, delete all Dominion staff
DELETE FROM staff WHERE agency_id = '[DOMINION_AGENCY_ID]' 
  AND created_date > '[MIGRATION_START_DATE]';
```

---

## 📞 NEXT STEPS

**Immediate Actions:**
1. **You decide:** Approve hybrid strategy?
2. **I prepare:** Data cleaning script + test import
3. **We execute:** Test with 5 staff → Full import → Welcome emails

**Timeline:**
- Today: Approve strategy + prepare scripts
- Tomorrow: Test import (5 staff)
- Day 3: Full import (41 staff) + send welcome emails
- Week 1: Monitor login activity + support stragglers

---

## 🔍 DETAILED DOCUMENTATION

**Full Strategic Plan:** `dominion_doc/DOMINION_STAFF_MIGRATION_STRATEGIC_PLAN.md`
- Complete audit findings
- All 3 migration options compared
- Step-by-step implementation guide
- Data cleaning script
- SQL verification queries
- Welcome email template
- Support & escalation procedures

---

**Questions? Concerns? Alternative Ideas?**

I've challenged the "just bulk import and send invites" approach because:
1. It would force staff to re-enter data they already provided
2. It might trigger unwanted automated emails
3. It creates unnecessary admin burden

The hybrid strategy is faster, cleaner, and more scalable. But I'm open to your feedback!

**Your call.** 🎯

