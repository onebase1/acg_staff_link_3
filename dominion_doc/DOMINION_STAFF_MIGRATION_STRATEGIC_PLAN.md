# Dominion Agency Staff Migration - Strategic Plan

**Date:** 2025-11-20  
**Status:** PLANNING PHASE  
**Staff Count:** 46 staff members  
**Source:** `dominion_doc/DHCS - STAFF NAME SORTED.csv`

---

## 🎯 EXECUTIVE SUMMARY

**Challenge:** Migrate 46 existing Dominion staff without forcing them through redundant onboarding or triggering unwanted notification spam.

**Recommended Approach:** **HYBRID STRATEGY** - Bulk import with pre-activation + optional self-service profile completion

**Key Decision:** Do NOT send signup invitations to existing staff. Instead, bulk import them as "active" with existing data, then send a single "Welcome to Agile Care Management" email with login instructions.

---

## 📊 CURRENT SYSTEM AUDIT

### ✅ What Works (Existing Infrastructure)

1. **Bulk Import Utility** (`/bulkdataimport`)
   - ✅ Validates staff data (email, phone, dates)
   - ✅ Auto-fixes common issues (email typos, date formats)
   - ✅ Supports UK date conversion (DD/MM/YYYY → ISO)
   - ✅ Creates staff records in database
   - ⚠️ **NOT TESTED** - needs validation before production use

2. **Onboarding Flow** (Natural signup)
   - ✅ User creates account → ProfileSetup → Staff Portal
   - ✅ Database trigger `link_staff_on_signup()` auto-links email to staff record
   - ✅ Changes status from 'onboarding' → 'active'
   - ✅ Creates profile with correct agency_id

3. **Notification System**
   - ✅ Staff invitation emails (when admin invites via UI)
   - ✅ Role change notifications (when admin updates role)
   - ✅ Incomplete profile reminders (Days 1, 3, 7, 14 for status='onboarding')
   - ⚠️ **RISK:** Bulk import may trigger unwanted emails

### ⚠️ NOTIFICATION TRIGGERS (Critical to Understand)

| Trigger Event | Notification Sent | Recipient | Code Location |
|---------------|-------------------|-----------|---------------|
| **Staff record created with status='onboarding'** | ❌ None immediately | - | - |
| **Incomplete profile (Days 1,3,7,14)** | ✅ Email reminder | Staff | `incomplete-profile-reminder/index.ts` |
| **Role changed via UI** | ✅ Email notification | Staff | `src/pages/Staff.jsx:171-195` |
| **Admin invites staff via UI** | ✅ Invitation email | Staff | `src/pages/Staff.jsx:298-340` |
| **Bulk import (current code)** | ❌ None (no email logic) | - | `src/pages/BulkDataImport.jsx` |

**KEY FINDING:** Bulk import does NOT trigger emails directly, BUT:
- If staff status = 'onboarding', daily cron will send incomplete profile reminders
- If admin later updates role via UI, staff will get "role changed" email

---

## 🚨 RISKS & MITIGATION

### Risk #1: Unwanted Email Spam
**Scenario:** Bulk import 46 staff with status='onboarding' → Daily cron sends 46 reminder emails

**Mitigation:**
- ✅ Import staff with status='active' (not 'onboarding')
- ✅ Set `created_date` to today (prevents Day 1/3/7/14 triggers)
- ✅ Send ONE custom "Welcome to Agile Care Management" email after import

### Risk #2: Missing Data Quality
**Scenario:** CSV has incomplete/incorrect data (missing phone +44, wrong dates, etc.)

**Mitigation:**
- ✅ Use bulk validator (`validate-bulk-import` Edge Function)
- ✅ Clean data BEFORE import (see Data Cleaning Plan below)
- ✅ Admin reviews validation report before confirming import

### Risk #3: Staff Confusion
**Scenario:** Staff receive login credentials but don't know what Agile Care Management is

**Mitigation:**
- ✅ Send clear onboarding email explaining the transition
- ✅ Include GPS clock-in/clock-out feature in onboarding materials
- ✅ Include video tutorial or quick-start guide
- ✅ Provide support contact for questions

---

## 📋 DATA CLEANING REQUIREMENTS

### Issues Found in CSV

1. **Phone Numbers Missing +44**
   - Example: `7546250462` should be `+447546250462`
   - **Fix:** Prepend `+44` to all 10-digit numbers starting with `7`

2. **UK Date Format (DD/MM/YYYY)**
   - Example: `25/01/1994` needs conversion to `1994-01-25`
   - **Fix:** Bulk validator auto-converts UK dates

3. **Missing Bank Details**
   - Some staff have empty `Bank Name`, `bank_sort_code`, `bank_account_number`
   - **Fix:** Import as-is, staff can complete via portal later

4. **Missing Personal Info**
   - Some staff missing `date_of_birth`, `address`, `N.I`
   - **Fix:** Import as-is, mark as "profile incomplete" for staff to update

5. **Duplicate Emails**
   - Row 4 & 22: `otuburejoice@gmail.com` (different names)
   - Row 7 & 4: `7577728070` (same phone, different emails)
   - **Fix:** Manual review required - contact Dominion to clarify

### Data Cleaning Script (Pre-Import)

```javascript
// Clean phone numbers
if (phone && phone.length === 10 && phone.startsWith('7')) {
  phone = '+44' + phone;
}

// Normalize role
const roleMap = {
  'Care Worker': 'care_worker',
  'Care worker': 'care_worker'
};
role = roleMap[role] || 'care_worker';

// Set defaults
status = 'active'; // NOT 'onboarding'
employment_type = 'Temporary' → 'temporary';
created_date = new Date().toISOString();
```

---

## 🎯 RECOMMENDED MIGRATION STRATEGY

### **OPTION A: BULK IMPORT + SILENT ACTIVATION** ⭐ RECOMMENDED

**Process:**
1. Clean CSV data (phone numbers, dates, duplicates)
2. Bulk import staff with status='active' (NOT 'onboarding')
3. Do NOT send individual signup invitations
4. Send ONE batch email: "Welcome to Agile Care Management - Your account is ready"
5. Staff login with email + create password (first-time login flow)
6. Staff complete missing profile fields at their own pace

**Pros:**
- ✅ No redundant data entry (staff info already in system)
- ✅ No notification spam (status='active' skips reminders)
- ✅ Staff can login immediately
- ✅ Admin can track who hasn't logged in yet

**Cons:**
- ⚠️ Staff records won't have `user_id` until first login
- ⚠️ Staff can't access portal until they create password

**Implementation:**
- Use existing bulk import utility with modifications
- Add custom "Welcome Email" template (not invitation)
- Staff use "Forgot Password" flow to set initial password

---

### **OPTION B: ADMIN-ASSISTED PROFILE COMPLETION**

**Process:**
1. Bulk import staff with status='active'
2. Admin manually reviews each profile
3. Admin fills in missing compliance/documents
4. Admin sends individual invitations when profile is 100% complete

**Pros:**
- ✅ Profiles are 100% complete before staff access
- ✅ No staff confusion about missing data

**Cons:**
- ❌ Time-consuming for admin (46 staff × 10 min = 7.6 hours)
- ❌ Delays staff access to portal
- ❌ Not scalable for future migrations

**Verdict:** NOT RECOMMENDED (too slow)

---

### **OPTION C: HYBRID - BULK IMPORT + SELF-SERVICE COMPLETION** ⭐⭐ BEST BALANCE

**Process:**
1. Clean CSV data thoroughly
2. Bulk import staff with status='active' + existing data
3. Send custom "Welcome to Agile Care Management" email with:
   - Login instructions
   - GPS clock-in/clock-out feature explanation
   - List of missing profile fields (if any)
   - Deadline to complete profile (e.g., 7 days)
4. Staff login → ProfileSetup shows completion % → Staff fills gaps
5. Admin monitors completion via dashboard

**Pros:**
- ✅ Fast migration (bulk import in minutes)
- ✅ Staff own their profile completion
- ✅ Admin only intervenes for stragglers
- ✅ Scalable for future migrations

**Cons:**
- ⚠️ Some staff may delay profile completion
- ⚠️ Requires clear communication

**Verdict:** ⭐⭐ RECOMMENDED - Best balance of speed + data quality

---

## 🛠️ IMPLEMENTATION PLAN (OPTION C)

### Phase 1: Data Preparation (1-2 hours)

**Step 1.1: Export & Clean CSV**
```bash
# Create cleaned version
cp "dominion_doc/DHCS - STAFF NAME  SORTED.csv" dominion_doc/DHCS_CLEANED.csv
```

**Step 1.2: Run Data Cleaning Script**
- Fix phone numbers (+44 prefix)
- Normalize roles (Care Worker → care_worker)
- Convert UK dates (DD/MM/YYYY → YYYY-MM-DD)
- Identify duplicates (manual review)
- Set status='active', created_date=today

**Step 1.3: Validate Cleaned Data**
- Upload to bulk import validator
- Review validation report
- Fix critical errors
- Accept auto-fixes

---

### Phase 2: Bulk Import (30 minutes)

**Step 2.1: Test Import (5 staff)**
- Import 5 staff as test batch
- Verify database records created correctly
- Check no unwanted emails sent
- Verify staff can login

**Step 2.2: Full Import (41 remaining staff)**
- Import all remaining staff
- Monitor for errors
- Verify all records created

**Step 2.3: Post-Import Verification**
```sql
-- Verify all staff imported
SELECT COUNT(*) FROM staff WHERE agency_id = '[DOMINION_AGENCY_ID]';
-- Expected: 46

-- Check status distribution
SELECT status, COUNT(*) FROM staff
WHERE agency_id = '[DOMINION_AGENCY_ID]'
GROUP BY status;
-- Expected: 46 active, 0 onboarding

-- Check for missing critical fields
SELECT first_name, last_name, email,
  CASE WHEN phone IS NULL THEN 'Missing Phone' ELSE '' END,
  CASE WHEN date_of_birth IS NULL THEN 'Missing DOB' ELSE '' END
FROM staff
WHERE agency_id = '[DOMINION_AGENCY_ID]';
```

---

### Phase 3: Staff Notification (1 hour)

**Step 3.1: Create Welcome Email Template**

**Subject:** Welcome to Agile Care Management - Your Dominion Account is Ready

**Body:**
```
Hi [First Name],

Great news! Dominion Health Care Services has partnered with Agile Care Management
to streamline shift management, timesheets, and payments.

Your account is ready:
📧 Email: [email]
🔐 Password: Click "Forgot Password" to set your password

What's Next?
1. Visit: https://agilecaremanagement.co.uk
2. Click "Forgot Password" and enter your email
3. Set your password
4. Complete your profile (we've pre-filled what we have)
5. Start viewing and confirming shifts!

New Features:
✅ GPS clock-in/clock-out for verified attendance
✅ Upload timesheets via photo
✅ View shift history
✅ Mobile access to everything

Need Help?
Contact: support@agilecaremanagement.co.uk

Welcome aboard!
Agile Care Management Team
```

**Step 3.2: Send Batch Email**
- Use Resend batch API (not individual invitations)
- Track delivery status
- Monitor bounce/failure rates

---

### Phase 4: Monitoring & Support (Ongoing)

**Step 4.1: Track Login Activity**
```sql
-- Staff who haven't logged in yet (user_id IS NULL)
SELECT first_name, last_name, email, phone
FROM staff
WHERE agency_id = '[DOMINION_AGENCY_ID]'
  AND user_id IS NULL
ORDER BY last_name;
```

**Step 4.2: Profile Completion Dashboard**
- Admin views staff completion %
- Sends gentle reminders to stragglers (Day 3, Day 7)
- Escalates to phone call if no response after 14 days

**Step 4.3: Support Tickets**
- Monitor support emails
- Common issues: password reset, missing data, confusion
- Document FAQs for future migrations

---

## 📊 DATA CLEANING SCRIPT

### Pre-Import Transformation

```javascript
// dominion_doc/clean_staff_data.js

const fs = require('fs');
const Papa = require('papaparse');

// Read CSV
const csvData = fs.readFileSync('dominion_doc/DHCS - STAFF NAME  SORTED.csv', 'utf8');
const parsed = Papa.parse(csvData, { header: true });

// Clean each row
const cleaned = parsed.data.map(row => {
  // Fix phone numbers
  let phone = row.phone?.trim();
  if (phone && phone.length === 10 && phone.startsWith('7')) {
    phone = '+44' + phone;
  }

  // Normalize role
  const roleMap = {
    'Care Worker': 'care_worker',
    'Care worker': 'care_worker'
  };
  const role = roleMap[row.role] || 'care_worker';

  // Normalize employment type
  const employment_type = row.employment_type?.toLowerCase() || 'temporary';

  // Set status to active (NOT onboarding)
  const status = 'active';

  // Set created_date to today
  const created_date = new Date().toISOString();

  return {
    first_name: row['First Name']?.trim(),
    last_name: row['Last name']?.trim(),
    email: row.email?.toLowerCase().trim(),
    phone: phone,
    role: role,
    date_of_birth: row.date_of_birth, // Validator will convert UK dates
    address: row.address?.trim(),
    postcode: row.postcode?.trim(),
    national_insurance: row['N.I']?.trim(),
    bank_name: row['Bank Name']?.trim(),
    bank_sort_code: row.bank_sort_code?.trim(),
    bank_account_number: row.bank_account_number?.trim(),
    status: status,
    hourly_rate: parseFloat(row['Hourly Rate']) || 12.21,
    employment_type: employment_type,
    emergency_contact_name: row.emergency_contact_name?.trim(),
    emergency_contact_phone: row.emergency_contact_phone?.trim(),
    emergency_contact_relationship: row.emergency_contact_relationship?.trim(),
    created_date: created_date,
    updated_date: created_date
  };
});

// Write cleaned CSV
const cleanedCsv = Papa.unparse(cleaned);
fs.writeFileSync('dominion_doc/DHCS_CLEANED.csv', cleanedCsv);

console.log(`✅ Cleaned ${cleaned.length} staff records`);
console.log(`📄 Output: dominion_doc/DHCS_CLEANED.csv`);
```

---

## ✅ SUCCESS CRITERIA

### Migration Complete When:
- ✅ All 46 staff records in database with status='active'
- ✅ All phone numbers in E.164 format (+44...)
- ✅ All UK dates converted to ISO format
- ✅ Zero duplicate email addresses
- ✅ Welcome email sent to all staff
- ✅ At least 80% of staff logged in within 7 days
- ✅ At least 60% of profiles 100% complete within 14 days

### Rollback Plan (If Issues Arise)
```sql
-- Delete all Dominion staff (if migration fails)
DELETE FROM staff WHERE agency_id = '[DOMINION_AGENCY_ID]' AND created_date > '[MIGRATION_START_DATE]';
```

---

## 🎯 NEXT STEPS

1. **User Decision Required:**
   - Approve Option C (Hybrid Strategy)?
   - Review data cleaning requirements?
   - Approve welcome email template?

2. **Technical Preparation:**
   - Test bulk import utility with 5 sample staff
   - Create data cleaning script
   - Set up welcome email template in Resend

3. **Execution:**
   - Clean CSV data
   - Run test import (5 staff)
   - Verify test results
   - Run full import (41 staff)
   - Send welcome emails
   - Monitor login activity

**Estimated Timeline:** 1 day (4-6 hours active work)

---

## 📞 SUPPORT & ESCALATION

**Migration Lead:** [Your Name]
**Technical Support:** support@agilecaremanagement.co.uk
**Dominion Contact:** [Dominion Admin Name/Email]

**Escalation Path:**
1. Staff can't login → Password reset flow
2. Missing data → Staff completes via portal
3. Technical issues → Support ticket
4. No response after 14 days → Phone call from admin

---

**END OF STRATEGIC PLAN**

