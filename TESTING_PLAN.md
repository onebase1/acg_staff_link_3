# Comprehensive Testing Plan - ACG Staff Link

**Date:** 2025-11-13  
**Status:** In Progress  
**Current Focus:** Staff Invitation Flow

---

## 📋 Overview

This document outlines the complete testing strategy for the ACG Staff Link platform after migration from Base64 SDK to Supabase.

**Test Coverage:** 46 test cases across 6 pipelines  
**Reference:** `critical_path_testing_matrix.csv`  
**Test Framework:** Hybrid (Playwright + Supabase Queries + Edge Functions)

---

## 🎯 Testing Priorities

### Priority 1: CRITICAL - User Journeys (Currently Testing)
1. **Staff Invitation Flow** (10 stages) - IN PROGRESS ✅
2. **Shift Journey Pipeline** (16 test cases) - PENDING
3. **Communication Pipeline** (6 test cases) - PENDING

### Priority 2: HIGH - Financial & Automation
4. **Financial Integrity Pipeline** (6 test cases) - PENDING
5. **Automation Pipeline** (6 test cases) - PENDING

### Priority 3: MEDIUM - Analytics & Integrations
6. **Data & Analytics Pipeline** (5 test cases) - PENDING
7. **External Integrations** (5 test cases) - PENDING

---

## 🔄 Current Focus: Staff Invitation Flow

### Test Stages (10 Total)

#### Stage 1: Admin Sends Invitation
**Test ID:** staff-invite-001  
**Action:** Admin navigates to Staff page, clicks "Invite Staff", fills form  
**Expected:** Invitation email sent successfully  
**Status:** ⏳ Pending

#### Stage 2: Email Received
**Test ID:** staff-invite-002  
**Action:** Check staff email inbox  
**Expected:** Email with subject "You're Invited to Join [Agency]" received  
**Verify:** Link includes `?view=sign-up&email=[email]`  
**Status:** ⏳ Pending

#### Stage 3: Email Pre-fill & Detection
**Test ID:** staff-invite-003  
**Action:** Click invitation link  
**Expected:** Signup page loads with email pre-filled, green banner shows  
**Verify:** "✅ Welcome back, [Name]! We found your invitation."  
**Status:** ⏳ Pending

#### Stage 4: Simplified Form Display
**Test ID:** staff-invite-004  
**Action:** Observe signup form  
**Expected:** Only 3 fields visible (Email, Password, Confirm Password)  
**Verify:** No name/phone/agency fields shown  
**Status:** ⏳ Pending

#### Stage 5: Account Creation
**Test ID:** staff-invite-005  
**Action:** Enter password, confirm, accept terms, submit  
**Expected:** Account created immediately without confirmation email  
**Verify:** No "Check your email" message  
**Status:** ⏳ Pending

#### Stage 6: Database Linking
**Test ID:** staff-invite-006  
**Action:** Query database after signup  
**Expected:** `staff.user_id` set to auth user ID  
**Verify:** `profiles.user_type = 'staff_member'`, `profiles.agency_id` set  
**Status:** ⏳ Pending

#### Stage 7: Redirect to ProfileSetup
**Test ID:** staff-invite-007  
**Action:** After signup completion  
**Expected:** Auto-redirect to `/profile-setup`  
**Verify:** ProfileSetup page loads  
**Status:** ⏳ Pending

#### Stage 8: Complete Onboarding
**Test ID:** staff-invite-008  
**Action:** Fill all ProfileSetup fields  
**Required:** Photo upload, 2+ references, employment history, emergency contact  
**Expected:** Form submits successfully  
**Status:** ⏳ Pending

#### Stage 9: Status Update to Active
**Test ID:** staff-invite-009  
**Action:** Query database after ProfileSetup  
**Expected:** `staff.status = 'active'`  
**Verify:** Profile photo URL populated  
**Status:** ⏳ Pending

#### Stage 10: StaffPortal Access
**Test ID:** staff-invite-010  
**Action:** After ProfileSetup completion  
**Expected:** Auto-redirect to `/staff-portal`  
**Verify:** Can browse and accept shifts  
**Status:** ⏳ Pending

---

## 📊 Test Pipelines Overview

### Pipeline 1: Shift Journey (16 tests)
**Reference:** `critical_path_testing_matrix.csv` rows 2-17  
**Coverage:** Email receipt → Shift creation → Assignment → Completion → Invoicing  
**Status:** ⏳ Pending

**Key Tests:**
- sj-001: Receive care home email
- sj-003: Create shift record
- sj-004: Assign staff to shift
- sj-006: Create draft timesheet
- sj-009: GPS clock-in
- sj-011: AI OCR extraction
- sj-014: Generate invoice
- sj-016: Payment reminder

### Pipeline 2: Automation (6 tests)
**Reference:** `critical_path_testing_matrix.csv` rows 18-23  
**Coverage:** Automated workflows and reminders  
**Status:** ⏳ Pending

**Key Tests:**
- auto-001: Daily shift closure engine
- auto-002: No-show detection
- auto-003: Compliance expiry reminders
- auto-005: Timesheet batch processor

### Pipeline 3: Financial Integrity (6 tests)
**Reference:** `critical_path_testing_matrix.csv` rows 24-29  
**Coverage:** Financial locks, audit trails, rate validation  
**Status:** ⏳ Pending

**Key Tests:**
- fin-001: Financial lock enforcement
- fin-002: Immutable invoice snapshot
- fin-003: Change log creation
- fin-005: Rate card validation

### Pipeline 4: Communication (6 tests)
**Reference:** `critical_path_testing_matrix.csv` rows 30-35  
**Coverage:** Email, SMS, WhatsApp delivery  
**Status:** ⏳ Pending

**Key Tests:**
- comm-001: Send email (Resend)
- comm-002: Send SMS (Twilio)
- comm-003: Send WhatsApp (Twilio)
- comm-004: WhatsApp bot response

### Pipeline 5: Data & Analytics (5 tests)
**Reference:** `critical_path_testing_matrix.csv` rows 36-40  
**Coverage:** Reporting, metrics, exports  
**Status:** ⏳ Pending

**Key Tests:**
- data-001: Shift journey log
- data-002: Performance metrics
- data-004: CSV export

### Pipeline 6: External Integrations (5 tests)
**Reference:** `critical_path_testing_matrix.csv` rows 41-45  
**Coverage:** OpenAI, Resend, Twilio, File storage  
**Status:** ⏳ Pending

**Key Tests:**
- int-001: OpenAI API (InvokeLLM)
- int-002: Resend API (Email)
- int-003: Twilio API (SMS/WhatsApp)
- int-005: Resend webhook (Inbound email)

---

## 🧪 Test Execution Strategy

### Manual Testing (User)
- Staff Invitation Flow (all 10 stages)
- Critical UI workflows
- End-to-end user journeys

### Automated Testing (AI/Scripts)
- Playwright tests for UI flows
- Direct Supabase queries for data validation
- Edge Function invocation for notifications
- Pipeline tests from CSV matrix

### Hybrid Approach
```bash
# Run all automated tests
npm run test:hybrid

# Run specific pipeline
npm run test:pipeline:shift-journey
npm run test:pipeline:automation
```

---

## 📈 Success Criteria

### Staff Invitation Flow
✅ All 10 stages pass without errors  
✅ Database records correctly linked  
✅ No manual intervention required  
✅ Staff can access portal and accept shifts

### Overall Testing
✅ 90%+ test pass rate across all pipelines  
✅ All CRITICAL tests pass (shift journey, communication)  
✅ No blocking issues for production deployment  
✅ Performance within acceptable limits

---

## 🚨 Known Issues to Validate

1. **Email Confirmation** - Verify Supabase setting disabled for invited users
2. **Post-Shift Reminders** - Was broken in Base64, verify working in Supabase
3. **GPS Validation** - Ensure geofence validation works
4. **AI OCR** - Verify timesheet extraction accuracy

---

## 📝 Test Reporting

### After Each Test Session
1. Update test status in this document
2. Log issues in separate issue tracker
3. Update `TEST_REPORT.md` with results
4. Mark tasks complete in task list

### Test Report Format
- **Test ID:** Unique identifier
- **Status:** Pass/Fail/Pending
- **Issues:** Any problems encountered
- **Notes:** Additional observations

---

## 🔗 Related Documentation

- **Master Reference:** `PROJECT_MASTER_REFERENCE.md`
- **Test Matrix:** `critical_path_testing_matrix.csv`
- **Test Suite:** `tests/README.md`
- **Quick Start:** `QUICKSTART.md`
- **Staff Flow:** `STAFF_INVITATION_FLOW.md`

---

**Next Steps:**
1. Complete Staff Invitation Flow testing (manual + automated)
2. Create Playwright test for Staff Invitation Flow
3. Execute Shift Journey Pipeline tests
4. Execute remaining pipeline tests
5. Generate comprehensive test report

---

**Last Updated:** 2025-11-13

