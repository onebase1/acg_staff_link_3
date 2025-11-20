# Dominion Staff Migration - Execution Checklist

**Date Started:** ___________  
**Completed By:** ___________  
**Staff Count:** 46

---

## ✅ PRE-MIGRATION CHECKLIST

### Phase 0: Preparation
- [ ] Read `MIGRATION_EXECUTIVE_SUMMARY.md`
- [ ] Read `DOMINION_STAFF_MIGRATION_STRATEGIC_PLAN.md`
- [ ] Approve hybrid strategy (bulk import + self-service)
- [ ] Get Dominion agency ID from database
- [ ] Install Node.js dependencies: `npm install papaparse`
- [ ] Update `clean_staff_data.js` with actual agency ID

---

## 📋 PHASE 1: DATA CLEANING (1-2 hours)

### Step 1.1: Run Cleaning Script
- [ ] Navigate to project root
- [ ] Run: `node dominion_doc/clean_staff_data.js`
- [ ] Review console output for issues
- [ ] Check `DHCS_CLEANED.csv` created successfully
- [ ] Review `DUPLICATES_REVIEW.txt` (if any)

**Issues Found:**
- Phone numbers fixed: _____
- Missing phone: _____
- Missing email: _____
- Duplicate emails: _____
- Duplicate phones: _____

### Step 1.2: Resolve Duplicates (if any)
- [ ] Contact Dominion to clarify duplicate emails
- [ ] Verify duplicate phones (same person or error?)
- [ ] Manually edit `DHCS_CLEANED.csv` to remove duplicates
- [ ] Document decisions in notes below

**Duplicate Resolution Notes:**
```
Row X: [email] - Decision: ___________
Row Y: [phone] - Decision: ___________
```

### Step 1.3: Validate Cleaned Data
- [ ] Login to ACG StaffLink as admin
- [ ] Navigate to `/bulkdataimport`
- [ ] Select import type: "Staff"
- [ ] Upload `DHCS_CLEANED.csv`
- [ ] Wait for validation report
- [ ] Review validation report

**Validation Results:**
- Clean rows: _____
- Auto-fixable: _____
- Requires review: _____
- Critical errors: _____

### Step 1.4: Fix Critical Errors (if any)
- [ ] Review critical errors in validation report
- [ ] Fix errors in `DHCS_CLEANED.csv`
- [ ] Re-upload and re-validate
- [ ] Repeat until 0 critical errors

---

## 🚀 PHASE 2: BULK IMPORT (30 minutes)

### Step 2.1: Test Import (5 staff)
- [ ] Create test CSV with first 5 staff from `DHCS_CLEANED.csv`
- [ ] Upload test CSV to bulk import
- [ ] Click "Import" button
- [ ] Wait for import to complete
- [ ] Verify success message

**Test Import Results:**
- Staff created: _____
- Errors: _____

### Step 2.2: Verify Test Import
- [ ] Navigate to `/staff` page
- [ ] Verify 5 test staff appear in list
- [ ] Check status = 'active' (NOT 'onboarding')
- [ ] Check phone numbers have +44 prefix
- [ ] Check no emails sent to test staff
- [ ] Verify test staff can login (use "Forgot Password" flow)

**Test Staff Login:**
- Staff 1: [ ] Logged in successfully
- Staff 2: [ ] Logged in successfully
- Staff 3: [ ] Logged in successfully
- Staff 4: [ ] Logged in successfully
- Staff 5: [ ] Logged in successfully

### Step 2.3: Full Import (41 remaining staff)
- [ ] Create CSV with remaining 41 staff
- [ ] Upload to bulk import
- [ ] Review validation report one final time
- [ ] Click "Import" button
- [ ] Wait for import to complete (may take 2-3 minutes)
- [ ] Verify success message

**Full Import Results:**
- Staff created: _____
- Errors: _____

### Step 2.4: Post-Import Verification
- [ ] Run SQL verification queries (see below)
- [ ] Verify all 46 staff in database
- [ ] Verify all have status='active'
- [ ] Verify no emails sent during import

**SQL Verification:**
```sql
-- Total staff count
SELECT COUNT(*) FROM staff WHERE agency_id = '[DOMINION_AGENCY_ID]';
-- Expected: 46

-- Status distribution
SELECT status, COUNT(*) FROM staff 
WHERE agency_id = '[DOMINION_AGENCY_ID]' 
GROUP BY status;
-- Expected: 46 active, 0 onboarding

-- Missing critical fields
SELECT first_name, last_name, email, 
  CASE WHEN phone IS NULL THEN 'Missing Phone' ELSE '' END,
  CASE WHEN date_of_birth IS NULL THEN 'Missing DOB' ELSE '' END
FROM staff 
WHERE agency_id = '[DOMINION_AGENCY_ID]';
```

**Verification Results:**
- Total staff: _____
- Status=active: _____
- Status=onboarding: _____ (should be 0)
- Missing phone: _____
- Missing DOB: _____

---

## 📧 PHASE 3: STAFF NOTIFICATION (1 hour)

### Step 3.1: Prepare Welcome Email
- [ ] Review welcome email template (see strategic plan)
- [ ] Customize with Dominion branding (if needed)
- [ ] Test email with your own email first
- [ ] Verify links work (login page, forgot password)

### Step 3.2: Send Batch Email
- [ ] Export staff emails from database
- [ ] Use Resend batch API or manual send
- [ ] Track delivery status
- [ ] Monitor bounce/failure rates

**Email Delivery:**
- Emails sent: _____
- Delivered: _____
- Bounced: _____
- Failed: _____

### Step 3.3: Monitor Initial Response
- [ ] Check for support emails (first 24 hours)
- [ ] Respond to common questions
- [ ] Document FAQs for future reference

**Common Questions:**
```
Q: ___________
A: ___________

Q: ___________
A: ___________
```

---

## 📊 PHASE 4: MONITORING (Ongoing)

### Day 1: Initial Monitoring
- [ ] Track login activity (see SQL below)
- [ ] Respond to support emails
- [ ] Document issues

**Day 1 Stats:**
- Staff logged in: _____
- Support tickets: _____

### Day 3: First Reminder
- [ ] Identify staff who haven't logged in
- [ ] Send gentle reminder email
- [ ] Track response rate

**Day 3 Stats:**
- Staff logged in: _____
- Reminders sent: _____

### Day 7: Second Reminder
- [ ] Identify staff who still haven't logged in
- [ ] Send second reminder email
- [ ] Consider phone calls for critical staff

**Day 7 Stats:**
- Staff logged in: _____
- Reminders sent: _____

### Day 14: Escalation
- [ ] Identify staff who still haven't logged in
- [ ] Phone call to each staff member
- [ ] Escalate to Dominion admin if needed

**Day 14 Stats:**
- Staff logged in: _____
- Phone calls made: _____
- Escalations: _____

**SQL: Track Login Activity**
```sql
-- Staff who haven't logged in yet (user_id IS NULL)
SELECT first_name, last_name, email, phone
FROM staff 
WHERE agency_id = '[DOMINION_AGENCY_ID]' 
  AND user_id IS NULL
ORDER BY last_name;

-- Staff who have logged in
SELECT first_name, last_name, email, phone
FROM staff 
WHERE agency_id = '[DOMINION_AGENCY_ID]' 
  AND user_id IS NOT NULL
ORDER BY last_name;
```

---

## ✅ SUCCESS CRITERIA

**Migration Complete When:**
- [x] All 46 staff in database with status='active'
- [x] All phone numbers in E.164 format (+44...)
- [x] Zero duplicate emails
- [x] Welcome email sent to all staff
- [ ] 80%+ staff logged in within 7 days (_____ / 46)
- [ ] 60%+ profiles 100% complete within 14 days (_____ / 46)

---

## 🚨 ROLLBACK PLAN (If Issues Arise)

**If migration fails or causes issues:**

```sql
-- Delete all Dominion staff created during migration
DELETE FROM staff 
WHERE agency_id = '[DOMINION_AGENCY_ID]' 
  AND created_date > '[MIGRATION_START_DATE]';

-- Verify deletion
SELECT COUNT(*) FROM staff WHERE agency_id = '[DOMINION_AGENCY_ID]';
-- Expected: 0
```

**Rollback Executed:** [ ] Yes [ ] No  
**Reason:** ___________  
**Date:** ___________

---

## 📝 NOTES & LESSONS LEARNED

**What Went Well:**
```


```

**What Could Be Improved:**
```


```

**Issues Encountered:**
```


```

**Recommendations for Future Migrations:**
```


```

---

**Migration Completed:** [ ] Yes [ ] No  
**Completion Date:** ___________  
**Final Staff Count:** _____  
**Login Rate (7 days):** _____%  
**Profile Completion Rate (14 days):** _____%

