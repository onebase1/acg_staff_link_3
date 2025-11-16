# Validation & Business Logic Audit Report
**Date:** 2025-11-14  
**Purpose:** Identify client-side validations that should have database-level enforcement  
**Status:** 🔍 AUDIT IN PROGRESS

---

## Executive Summary

This audit identifies business logic validations that currently exist **only in client-side code** and should be enforced at the **database level** to prevent data integrity issues.

### Validation Categories

1. **✅ Already Enforced at Database Level**
2. **⚠️ Client-Side Only (Needs Database Enforcement)**
3. **📋 Recommended for Future Implementation**

---

## 1. Shift Management Validations

### ✅ Shift Overlap Prevention
**Status:** ENFORCED AT DATABASE LEVEL ✅  
**Implementation:** Database trigger `validate_shift_overlap`  
**Location:** Database trigger on `shifts` table  
**Coverage:** Prevents staff from being assigned to overlapping shifts

**Validation Logic:**
- Checks for time overlap on same date
- Only applies to active shifts (assigned, confirmed, in_progress)
- Raises exception if overlap detected

**Client-Side Implementation:** `src/components/shifts/ShiftAssignmentModal.jsx` (lines 109-183)  
**Database Implementation:** Trigger function `check_shift_overlap()`

---

### ⚠️ Staff Eligibility Validation
**Status:** CLIENT-SIDE ONLY ⚠️  
**Location:** `src/components/shifts/ShiftAssignmentModal.jsx`  
**Function:** `validateStaffEligibility()`

**Current Validations (Client-Side Only):**
1. **Role Match:** Staff role must match shift requirements
2. **NMC PIN:** Required for nursing roles
3. **Training:** Required certifications must be valid
4. **Compliance:** DBS, right to work must be verified
5. **References:** Minimum 2 references required

**Risk:** Admin could bypass UI and assign ineligible staff via API  
**Recommendation:** Create database function to validate eligibility before INSERT/UPDATE

**Proposed Solution:**
```sql
CREATE OR REPLACE FUNCTION validate_staff_eligibility() RETURNS TRIGGER AS $$
BEGIN
  -- Check role match
  -- Check compliance status
  -- Check training requirements
  -- Raise exception if ineligible
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Priority:** HIGH (CQC compliance requirement)

---

### ⚠️ 24-Hour Work Limit
**Status:** CLIENT-SIDE ONLY ⚠️  
**Location:** `src/components/shifts/ShiftAssignmentModal.jsx` (lines 150-165)

**Current Validation:**
- Staff cannot work more than 16 hours in a 24-hour window
- Calculated client-side before assignment

**Risk:** Could be bypassed via direct database INSERT  
**Recommendation:** Add database trigger to enforce 24-hour limit

**Priority:** MEDIUM (Health & Safety requirement)

---

## 2. Timesheet Validations

### ⚠️ Timesheet Time Validation
**Status:** CLIENT-SIDE ONLY ⚠️  
**Location:** `src/pages/Timesheets.jsx`

**Current Validations:**
1. **Actual times must be within shift times** (with tolerance)
2. **Break time cannot exceed total hours**
3. **Total hours = (end - start) - break**

**Risk:** Staff could submit invalid timesheets via API  
**Recommendation:** Add database CHECK constraints or trigger

**Proposed Constraints:**
```sql
ALTER TABLE timesheets ADD CONSTRAINT check_break_time 
  CHECK (break_minutes < (EXTRACT(EPOCH FROM (actual_end_time - actual_start_time)) / 60));

ALTER TABLE timesheets ADD CONSTRAINT check_actual_within_shift
  CHECK (actual_start_time >= scheduled_start_time - INTERVAL '2 hours' 
     AND actual_end_time <= scheduled_end_time + INTERVAL '2 hours');
```

**Priority:** MEDIUM

---

### ⚠️ Timesheet Status Workflow
**Status:** CLIENT-SIDE ONLY ⚠️  
**Location:** Various components

**Current Workflow:**
- draft → submitted → approved/rejected → paid
- Only admins can approve/reject
- Only approved timesheets can be paid

**Risk:** Status could be changed out of order via API  
**Recommendation:** Add database trigger to enforce status transitions

**Proposed Solution:**
```sql
CREATE OR REPLACE FUNCTION validate_timesheet_status_transition() RETURNS TRIGGER AS $$
BEGIN
  -- draft can go to submitted
  -- submitted can go to approved or rejected
  -- approved can go to paid
  -- rejected can go back to draft
  -- paid is final (no changes)
  
  IF OLD.status = 'paid' AND NEW.status != 'paid' THEN
    RAISE EXCEPTION 'Cannot change status of paid timesheet';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Priority:** HIGH (Financial integrity)

---

## 3. Financial Validations

### ⚠️ Rate Consistency Validation
**Status:** CLIENT-SIDE ONLY ⚠️  
**Location:** Various components

**Current Validations:**
1. **Shift charge_rate must match client rate card**
2. **Staff pay_rate must match staff rate card**
3. **Margin = charge_rate - pay_rate must be positive**

**Risk:** Rates could be manually edited to incorrect values  
**Recommendation:** Add database triggers to validate rates

**Priority:** HIGH (Financial integrity)

---

### ⚠️ Invoice Immutability
**Status:** PARTIALLY ENFORCED ⚠️  
**Location:** Backend function `financialDataValidator`

**Current Implementation:**
- Backend function exists but **NOT INTEGRATED**
- Checks for post-invoice tampering
- Validates rate consistency

**Risk:** Function exists but not being called  
**Recommendation:** Integrate into invoice generation workflow

**Priority:** HIGH (Fraud prevention)

---

## 4. Compliance Validations

### ⚠️ Document Expiry Validation
**Status:** CLIENT-SIDE ONLY ⚠️  
**Location:** `src/pages/ComplianceTracker.jsx`

**Current Validations:**
1. **Expiry date must be in the future** (for new documents)
2. **Status auto-updates based on expiry** (client-side)

**Risk:** Expired documents could be marked as verified  
**Recommendation:** Add database trigger to auto-update status

**Proposed Solution:**
```sql
CREATE OR REPLACE FUNCTION update_compliance_status() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date < CURRENT_DATE THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Priority:** MEDIUM (CQC compliance)

---

## 5. User Management Validations

### ⚠️ Profile Completion Validation
**Status:** CLIENT-SIDE ONLY ⚠️  
**Location:** `src/pages/ProfileSetup.jsx`

**Current Validations:**
1. **Required fields:** First name, last name, phone, address
2. **Email format validation**
3. **Phone number format validation**

**Risk:** Incomplete profiles could be created via API  
**Recommendation:** Add database NOT NULL constraints

**Proposed Constraints:**
```sql
ALTER TABLE profiles ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN phone SET NOT NULL;
```

**Priority:** LOW (User experience issue, not critical)

---

## 6. Broadcast & Notification Validations

### ⚠️ Duplicate Broadcast Prevention
**Status:** CLIENT-SIDE ONLY ⚠️  
**Location:** `src/pages/Shifts.jsx` (lines 516-529)

**Current Validation:**
- Warns user if shift was already broadcast
- Shows time since last broadcast
- Requires confirmation to re-broadcast

**Risk:** Could send duplicate broadcasts via API  
**Recommendation:** Add database constraint or rate limiting

**Priority:** LOW (Annoyance, not critical)

---

## Summary of Recommendations

### 🔴 HIGH PRIORITY (Implement Immediately)

1. **Staff Eligibility Validation** - CQC compliance requirement
2. **Timesheet Status Workflow** - Financial integrity
3. **Rate Consistency Validation** - Financial integrity
4. **Invoice Immutability Integration** - Fraud prevention (function exists, needs integration)

### 🟠 MEDIUM PRIORITY (Next Sprint)

1. **24-Hour Work Limit** - Health & Safety
2. **Timesheet Time Validation** - Data integrity
3. **Document Expiry Auto-Update** - CQC compliance

### 🟡 LOW PRIORITY (Backlog)

1. **Profile Completion Constraints** - User experience
2. **Duplicate Broadcast Prevention** - Annoyance prevention

---

## Implementation Plan

### Phase 1: Critical Financial & Compliance (Week 1)
- [ ] Staff eligibility validation trigger
- [ ] Timesheet status workflow trigger
- [ ] Rate consistency validation trigger
- [ ] Integrate financialDataValidator into invoice flow

### Phase 2: Data Integrity (Week 2)
- [ ] 24-hour work limit trigger
- [ ] Timesheet time validation constraints
- [ ] Document expiry auto-update trigger

### Phase 3: Polish (Week 3)
- [ ] Profile completion constraints
- [ ] Duplicate broadcast prevention

---

## Testing Checklist

For each database-level validation:
- [ ] Test valid data (should pass)
- [ ] Test invalid data (should fail with clear error)
- [ ] Test edge cases (boundary conditions)
- [ ] Verify error messages are user-friendly
- [ ] Test performance impact (triggers should be fast)

---

## Conclusion

**Current State:** Most business logic validations are client-side only  
**Risk Level:** MEDIUM-HIGH (Financial and compliance risks)  
**Recommendation:** Implement HIGH priority validations immediately

**Next Steps:**
1. Review and approve implementation plan
2. Create database migration scripts
3. Test thoroughly in development
4. Deploy to production with monitoring

