# 🚀 PRE-LAUNCH STRATEGIC PLAN
## Agile Care Management - Production Go-Live Preparation

**Date Created**: 2025-11-20  
**Domain**: agilecaremanagement.co.uk (LIVE)  
**Status**: Pre-Launch Audit & Task Grouping  
**Target**: Production-Ready System

---

## 📋 EXECUTIVE SUMMARY

This document organizes all pre-launch tasks into strategic groups that can be handled by specialized AI agent threads. Tasks are grouped by:
1. **Complexity** - Simple vs complex changes
2. **Domain** - Branding, infrastructure, UI/UX, testing
3. **Dependencies** - What must be done first
4. **Risk Level** - Disruptive vs non-disruptive

---

## 🎯 TASK GROUPS OVERVIEW

| Group | Tasks | Complexity | Agent Type | Priority | Est. Time |
|-------|-------|------------|------------|----------|-----------|
| **A** | Domain & Email Migration | Medium | Infrastructure | 🔴 Critical | 2-3 hours |
| **B** | Branding Update | Low | Frontend | 🟡 High | 1-2 hours |
| **C** | Authentication UI Redesign | Medium | Frontend | 🟡 High | 2-3 hours |
| **D** | Staff Portal UX Improvements | Medium | Frontend | 🟢 Medium | 3-4 hours |
| **E** | Notification System Audit | High | Backend | 🟡 High | 4-6 hours |
| **F** | GPS & Mapbox Verification | Medium | Full-Stack | 🟡 High | 2-3 hours |
| **G** | Financial Calculations Fix | Low | Backend | 🔴 Critical | 1 hour |
| **H** | Documentation Updates | Low | Documentation | 🟢 Medium | 1-2 hours |
| **I** | Testing & Verification | High | QA | 🔴 Critical | 4-6 hours |

**Total Estimated Time**: 20-30 hours (can be parallelized with multiple agents)

---

## 📦 GROUP A: DOMAIN & EMAIL MIGRATION
**Priority**: 🔴 CRITICAL  
**Agent Type**: Infrastructure Agent (Single Thread)  
**Complexity**: Medium  
**Risk**: High (affects all email communications)

### Tasks
1. **Change Resend domain from guest-glow.com to agilecaremanagement.co.uk**
2. **Update all email references in code**
3. **Update Supabase Auth SMTP configuration**
4. **Update environment variables**
5. **Update documentation references**

### Files to Modify
- `supabase/functions/send-email/index.ts` (Line 71: RESEND_FROM_DOMAIN)
- `supabase/functions/send-agency-admin-invite/index.ts` (Line 166)
- `scripts/testResend.mjs` (Line 10)
- `tests/test-config.ts` (Line 8)
- `scripts/createDominionAgency.mjs` (Line 48)
- `dominion_doc/EMAIL_SENDER_AUDIT_AND_FIX.md` (Update instructions)
- `.env` files (RESEND_FROM_DOMAIN)
- Netlify environment variables

### Verification Steps
- [ ] Test email sending via send-email function
- [ ] Test password reset email
- [ ] Test signup confirmation email
- [ ] Verify sender shows "Agile Care Management <noreply@agilecaremanagement.co.uk>"

### Rollback Plan
If emails fail, revert to guest-glow.com immediately

---

## 📦 GROUP B: BRANDING UPDATE
**Priority**: 🟡 HIGH  
**Agent Type**: Frontend Agent (Single Thread)  
**Complexity**: Low  
**Risk**: Low (cosmetic changes)

### Tasks
1. **Replace "ACG StaffLink" with "Agile Care Management" or "Agile Care"**
2. **Add company logo to project**
3. **Update all UI references**
4. **Update email templates**
5. **Update documentation**

### Strategy
- **Primary Brand**: "Agile Care Management" (formal, professional)
- **Short Brand**: "Agile Care" (casual, friendly)
- **Usage**:
  - Email headers: "Agile Care Management"
  - UI headers: "Agile Care"
  - Documentation: "Agile Care Management"
  - Staff-facing: "Agile Care"

### Files to Modify (Non-Exhaustive - Full Audit Required)
- `src/components/notifications/EmailTemplates.jsx` (Line 24, 638)
- `src/pages/StakeholderPresentation.jsx` (Multiple references)
- `PROJECT_MASTER_REFERENCE.md`
- `dominion_doc/PRE_ANNOUNCEMENT_DRAFTS.md`
- `dominion_doc/WELCOME_EMAIL_TEMPLATE.html`
- All email templates
- All UI components with branding

### Logo Requirements
- **Format**: SVG (scalable) + PNG (fallback)
- **Sizes**: 
  - Full logo: 200x60px (header)
  - Icon: 48x48px (favicon)
  - Email: 150x45px
- **Location**: `public/logo/` directory
- **Files**:
  - `agile-care-logo.svg`
  - `agile-care-logo.png`
  - `agile-care-icon.png`
  - `favicon.ico`

### Verification Steps
- [ ] No "ACG StaffLink" references in UI
- [ ] Logo displays correctly on all pages
- [ ] Email templates show correct branding
- [ ] Favicon updated in browser

---

## 📦 GROUP C: AUTHENTICATION UI REDESIGN
**Priority**: 🟡 HIGH  
**Agent Type**: Frontend Agent (Single Thread)  
**Complexity**: Medium  
**Risk**: Medium (affects user onboarding)

### Tasks
1. **Remove/replace left-side "enterprise" text on signup**
2. **Redesign signup/signin/forgot password flow**
3. **Make mobile-responsive**
4. **Update to standard pattern: signin with signup/forgot as links**

### Current Issues
- Left side mentions "enterprise" (irrelevant to staff/care homes)
- Tabs UI not standard (should be signin primary, signup/forgot as links)
- Not mobile-optimized
- Text doesn't match target audience (staff & care home managers)

### Proposed Design
**Desktop**:
- Left side: Agile Care branding + benefits for staff/care homes
- Right side: Signin form (primary)
- Bottom links: "Don't have an account? Sign up" | "Forgot password?"

**Mobile**:
- Hide left side completely
- Full-width signin form
- Bottom links for signup/forgot

### Files to Modify
- `src/pages/Login.jsx` (Complete redesign)
- `src/pages/Login_BACKUP.jsx` (Reference only)
- `src/pages/Login_BACKUP_20251115_130323.jsx` (Reference only)

### New Content for Left Side
```
Welcome to Agile Care

For Staff:
✓ View & confirm shifts instantly
✓ Upload timesheets via photo
✓ GPS clock-in/clock-out
✓ Track your earnings
✓ Get paid faster

For Care Homes:
✓ Fill urgent shifts in minutes
✓ GPS-verified staff attendance
✓ Automated invoicing
✓ Real-time shift tracking
✓ Compliance management
```

### Verification Steps
- [ ] Mobile responsive (test on phone)
- [ ] No "enterprise" references
- [ ] Standard signin/signup/forgot flow
- [ ] Left side hidden on mobile
- [ ] Branding matches Agile Care

---

## 📦 GROUP D: STAFF PORTAL UX IMPROVEMENTS
**Priority**: 🟢 MEDIUM
**Agent Type**: Frontend Agent (Single Thread)
**Complexity**: Medium
**Risk**: Low (UX enhancements)

### Tasks
1. **Add "Welcome {staff_name}" bold text at top**
2. **Hide payslip section (especially "generate payslip")**
3. **Create new /shift-calendar page with calendar UI**
4. **Mobile-first design for staff portal**

### Task 1: Welcome Message
**File**: `src/pages/StaffPortal.jsx`
**Change**: Add bold welcome text at top
```jsx
<div className="mb-6">
  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
    Welcome, {staffData?.first_name || 'Staff Member'}!
  </h1>
  <p className="text-gray-600 dark:text-gray-400">
    {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
  </p>
</div>
```

### Task 2: Hide Payslip Section
**File**: `src/pages/StaffPortal.jsx`
**Change**: Comment out or remove payslip-related code
- Find payslip section
- Add `hidden` class or remove completely
- Especially hide "generate payslip" button

### Task 3: Shift Calendar Page
**New File**: `src/pages/StaffShiftCalendar.jsx`
**Route**: `/shift-calendar`
**Design**: Mobile-first calendar UI

**Features**:
- Calendar view showing past, present, future shifts
- Dates with shifts: Circled (different styles for past/present/future)
- Dates without shifts: Not circled
- Click circled date → Show shift details modal
- Shift statuses: completed, cancelled, confirmed, awaiting_verification, etc.
- Color coding:
  - Past completed: Green circle
  - Past cancelled: Red circle
  - Present/future confirmed: Blue circle
  - Present/future pending: Yellow circle

**UI Components Needed**:
- Calendar grid (7 columns for days)
- Date cells with conditional styling
- Shift details modal
- Mobile-responsive layout

### Files to Create/Modify
- `src/pages/StaffShiftCalendar.jsx` (NEW)
- `src/pages/StaffPortal.jsx` (Add sidebar link)
- `src/App.jsx` (Add route)

### Verification Steps
- [ ] Welcome message displays correctly
- [ ] Payslip section hidden
- [ ] /shift-calendar route works
- [ ] Calendar shows correct shifts
- [ ] Mobile responsive
- [ ] Click date shows shift details

---

## 📦 GROUP E: NOTIFICATION SYSTEM AUDIT
**Priority**: 🟡 HIGH
**Agent Type**: Backend Agent (Single Thread)
**Complexity**: High
**Risk**: Medium (affects all notifications)

### Tasks
1. **Audit NOTIFICATION_SYSTEM_COMPLETE_AUDIT.md**
2. **Ensure template consistency (headers, footers, colors)**
3. **Verify dark/light theme compatibility**
4. **Update branding in all templates**
5. **Test email rendering**

### Scope
**File**: `NOTIFICATION_SYSTEM_COMPLETE_AUDIT.md` (1,328 lines)
**Templates to Audit**: 50+ email/SMS/WhatsApp templates

### Consistency Checklist
- [ ] All emails use EmailTemplates.jsx base wrapper
- [ ] Headers show "Agile Care Management" (not ACG StaffLink)
- [ ] Footers consistent across all templates
- [ ] Colors work in dark mode (test with dark background)
- [ ] Colors work in light mode (test with white background)
- [ ] CTA buttons have sufficient contrast
- [ ] Links are visible in both themes
- [ ] Mobile responsive

### Color Standards
**Light Theme**:
- Primary: #2563eb (blue-600)
- Success: #16a34a (green-600)
- Warning: #ea580c (orange-600)
- Danger: #dc2626 (red-600)
- Text: #111827 (gray-900)
- Background: #ffffff

**Dark Theme**:
- Primary: #3b82f6 (blue-500)
- Success: #22c55e (green-500)
- Warning: #f97316 (orange-500)
- Danger: #ef4444 (red-500)
- Text: #f9fafb (gray-50)
- Background: #1f2937 (gray-800)

### Files to Audit
- `src/components/notifications/EmailTemplates.jsx`
- All edge functions sending emails
- All notification templates in audit doc

### Verification Steps
- [ ] Send test email in light mode
- [ ] Send test email in dark mode
- [ ] Verify all templates use consistent styling
- [ ] No "ACG StaffLink" references
- [ ] All CTAs work correctly

---

## 📦 GROUP F: GPS & MAPBOX VERIFICATION
**Priority**: 🟡 HIGH
**Agent Type**: Full-Stack Agent (Single Thread)
**Complexity**: Medium
**Risk**: High (critical feature for compliance)

### Tasks
1. **Test GPS clock-in/clock-out functionality**
2. **Verify Mapbox images are generated**
3. **Verify images saved to database (clock_in_photo field)**
4. **Check VITE_MAPBOX_TOKEN environment variable**
5. **Test geofencing (100m radius validation)**

### Current Implementation
**File**: `src/components/staff/MobileClockIn.jsx`
- Lines 200-216: `generateMapImageUrl()` using Mapbox Static Images API
- Lines 305-313: Saves map URL to `clock_in_photo` field
- Lines 492-493: Generates map for clock-out

### Potential Issues
**File**: `CHECK_MAPBOX_TOKEN.md`
- VITE_MAPBOX_TOKEN may not be set in Netlify environment
- Need to verify token is configured

### Testing Steps
1. **Setup**:
   - Verify VITE_MAPBOX_TOKEN in Netlify env vars
   - Verify VITE_MAPBOX_TOKEN in local .env
   - Check Mapbox account has Static Images API enabled

2. **Test Clock-In**:
   - Navigate to active shift
   - Click "Clock In"
   - Allow GPS location
   - Verify within 100m of shift location
   - Check map image displays
   - Verify database record created with clock_in_photo URL

3. **Test Clock-Out**:
   - Click "Clock Out"
   - Verify map image displays
   - Verify database updated with clock_out_photo URL

4. **Database Verification**:
   - Query timesheets table
   - Check clock_in_photo and clock_out_photo fields
   - Verify URLs are valid Mapbox static image URLs
   - Test URLs in browser (should display map)

### Files to Check
- `src/components/staff/MobileClockIn.jsx`
- `CHECK_MAPBOX_TOKEN.md`
- Netlify environment variables
- Supabase timesheets table schema

### Verification Steps
- [ ] VITE_MAPBOX_TOKEN configured in Netlify
- [ ] GPS location permission works
- [ ] Geofencing validates 100m radius
- [ ] Map images generate correctly
- [ ] clock_in_photo saved to database
- [ ] clock_out_photo saved to database
- [ ] Map URLs are accessible

---

## 📦 GROUP G: FINANCIAL CALCULATIONS FIX
**Priority**: 🔴 CRITICAL
**Agent Type**: Backend Agent (Single Thread)
**Complexity**: Low
**Risk**: High (affects staff earnings)

### Tasks
1. **Fix shift earnings calculation to account for 1-hour break**
2. **Update all references to shift earnings**
3. **Test calculations**

### Current Issue
**Calculation**: `rate * shift.duration`
**Problem**: Doesn't account for 1-hour unpaid break
**Correct**: `rate * (duration - 1)`

**Example**:
- 12-hour shift at £15/hour
- Current: £15 × 12 = £180 ❌
- Correct: £15 × 11 = £165 ✅

### Files to Search & Modify
Need to find all instances of shift earnings calculations:
- Pre-shift earnings display (when staff views available shifts)
- Post-shift earnings display (in staff portal)
- Timesheet calculations
- Invoice generation
- Financial reports

### Search Strategy
```bash
# Search for earnings calculations
grep -r "duration \* rate" src/
grep -r "rate \* duration" src/
grep -r "shift.duration" src/
grep -r "earnings" src/
```

### Verification Steps
- [ ] All earnings calculations use (duration - 1)
- [ ] Pre-shift estimates correct
- [ ] Post-shift totals correct
- [ ] Invoices reflect correct amounts
- [ ] Test with various shift durations

---

## 📦 GROUP H: DOCUMENTATION UPDATES
**Priority**: 🟢 MEDIUM
**Agent Type**: Documentation Agent (Single Thread)
**Complexity**: Low
**Risk**: Low (documentation only)

### Tasks
1. **Update PRE_ANNOUNCEMENT_DRAFTS.md with correct email domains**
2. **Remove "track earnings" reference (not true yet)**
3. **Add GPS clock-in feature to announcements**
4. **Update DOMINION_STAFF_MIGRATION_STRATEGIC_PLAN.md**

### Task 1: Update Email Domains
**File**: `dominion_doc/PRE_ANNOUNCEMENT_DRAFTS.md`
**Change**: Replace all email references with @agilecaremanagement.co.uk

### Task 2: Remove False Claims
**File**: `dominion_doc/PRE_ANNOUNCEMENT_DRAFTS.md`
**Line 29**: "✅ **Track Earnings** - See your earnings in real-time"
**Action**: Remove or change to "View shift history"

### Task 3: Add GPS Feature
**File**: `dominion_doc/PRE_ANNOUNCEMENT_DRAFTS.md`
**Add**:
```
✅ **GPS Clock-In/Clock-Out** - Verify your attendance with GPS location tracking
```

### Task 4: Update Migration Plan
**File**: `dominion_doc/DOMINION_STAFF_MIGRATION_STRATEGIC_PLAN.md`
**Add**: GPS clock-in details for staff onboarding

### Verification Steps
- [ ] All email domains updated
- [ ] No false feature claims
- [ ] GPS feature documented
- [ ] Migration plan updated

---

## 📦 GROUP I: TESTING & VERIFICATION
**Priority**: 🔴 CRITICAL
**Agent Type**: QA Agent (Single Thread)
**Complexity**: High
**Risk**: Critical (production readiness)

### Tasks
1. **Test live timesheet upload from staff portal**
2. **Verify OCR extracts accurate info**
3. **Test complete shift lifecycle**
4. **Verify domain migration**
5. **End-to-end smoke tests**

### Test 1: Timesheet Upload & OCR
**Steps**:
1. Create test shift (confirmed status)
2. Complete shift (mark as completed)
3. Navigate to /timesheet route
4. Upload valid timesheet image
5. Verify OCR extraction
6. Check data accuracy in database

**Expected**:
- OCR extracts: staff name, date, hours, client name
- Data matches timesheet image
- Timesheet record created in database
- Shift status updated

### Test 2: Complete Shift Lifecycle
**Steps**:
1. Create shift (draft)
2. Assign to staff
3. Staff confirms shift
4. GPS clock-in (within geofence)
5. GPS clock-out
6. Upload timesheet
7. Admin verifies
8. Generate invoice

**Expected**:
- All status transitions work
- GPS validation works
- Timesheet upload works
- Invoice generation works

### Test 3: Domain Migration
**Steps**:
1. Test password reset email
2. Test signup confirmation email
3. Test shift notification email
4. Verify sender shows correct domain

**Expected**:
- All emails from @agilecaremanagement.co.uk
- Sender shows "Agile Care Management"
- No guest-glow.com references

### Test 4: Netlify Domain Update
**File**: `netlify.toml`
**Change**: Update domain from agilecaremanagementy.netlify.app to agilecaremanagement.co.uk

**Steps**:
1. Update netlify.toml
2. Configure custom domain in Netlify dashboard
3. Update DNS records
4. Test SSL certificate
5. Verify redirects work

### Verification Steps
- [ ] Timesheet OCR works accurately
- [ ] Complete shift lifecycle works
- [ ] All emails from correct domain
- [ ] agilecaremanagement.co.uk resolves correctly
- [ ] SSL certificate valid
- [ ] No broken links

---

## 🎯 EXECUTION PRIORITY ORDER

### Phase 1: Critical Infrastructure (Do First)
1. **GROUP G**: Financial Calculations Fix (1 hour) - CRITICAL BUG
2. **GROUP A**: Domain & Email Migration (2-3 hours) - BLOCKING
3. **GROUP F**: GPS & Mapbox Verification (2-3 hours) - CRITICAL FEATURE

### Phase 2: User-Facing Changes (Do Second)
4. **GROUP B**: Branding Update (1-2 hours)
5. **GROUP C**: Authentication UI Redesign (2-3 hours)
6. **GROUP D**: Staff Portal UX Improvements (3-4 hours)

### Phase 3: Quality & Polish (Do Third)
7. **GROUP E**: Notification System Audit (4-6 hours)
8. **GROUP H**: Documentation Updates (1-2 hours)

### Phase 4: Final Verification (Do Last)
9. **GROUP I**: Testing & Verification (4-6 hours)

---

## 🚦 RISK ASSESSMENT

### High Risk (Require Extra Caution)
- **GROUP A**: Email domain migration (could break all emails)
- **GROUP F**: GPS verification (critical compliance feature)
- **GROUP G**: Financial calculations (affects staff pay)
- **GROUP I**: Production testing (could expose bugs)

### Medium Risk
- **GROUP C**: Auth UI redesign (affects user onboarding)
- **GROUP E**: Notification audit (affects all communications)

### Low Risk
- **GROUP B**: Branding update (cosmetic)
- **GROUP D**: Staff portal UX (enhancements)
- **GROUP H**: Documentation (no code changes)

---

## 📊 AGENT ASSIGNMENT STRATEGY

### Single-Agent Tasks (Can Work Independently)
- **GROUP B**: Frontend Agent (branding)
- **GROUP C**: Frontend Agent (auth UI)
- **GROUP D**: Frontend Agent (staff portal)
- **GROUP E**: Backend Agent (notifications)
- **GROUP G**: Backend Agent (calculations)
- **GROUP H**: Documentation Agent

### Multi-Agent Tasks (Require Coordination)
- **GROUP A**: Infrastructure Agent + Backend Agent
- **GROUP F**: Frontend Agent + Backend Agent
- **GROUP I**: QA Agent + All Agents

### Parallel Execution Possible
- GROUP B + GROUP G (no overlap)
- GROUP C + GROUP E (no overlap)
- GROUP D + GROUP H (no overlap)

---

## ✅ SUCCESS CRITERIA

### Must Have (Blocking Launch)
- [ ] All emails from @agilecaremanagement.co.uk
- [ ] No "ACG StaffLink" in user-facing UI
- [ ] Financial calculations correct (duration - 1)
- [ ] GPS clock-in/out working and saving to DB
- [ ] Domain agilecaremanagement.co.uk live and working
- [ ] Timesheet upload + OCR working

### Should Have (High Priority)
- [ ] Auth UI redesigned (standard pattern)
- [ ] Staff portal has welcome message
- [ ] Payslip section hidden
- [ ] Notification templates consistent
- [ ] Company logo in all appropriate places

### Nice to Have (Can Defer)
- [ ] Shift calendar page (/shift-calendar)
- [ ] Complete notification system audit
- [ ] All documentation updated

---

## 🔄 ROLLBACK PLANS

### If Email Migration Fails
1. Revert RESEND_FROM_DOMAIN to guest-glow.com
2. Redeploy edge functions
3. Test email sending
4. Investigate Resend domain configuration

### If GPS Fails
1. Check VITE_MAPBOX_TOKEN
2. Verify Mapbox API quota
3. Check geofencing logic
4. Fallback: Allow manual clock-in without GPS

### If Domain Migration Fails
1. Keep Netlify subdomain active
2. Update DNS records
3. Wait for propagation (24-48 hours)
4. Test SSL certificate renewal

---

## 📝 NEXT STEPS

**Immediate Action**: Start with GROUP G (Financial Calculations Fix)
- Lowest complexity
- Highest risk if wrong
- Blocks accurate earnings display
- Can be completed in 1 hour

**After GROUP G**: Proceed to GROUP A (Domain Migration)
- Blocking for all email communications
- Must be done before launch
- Requires careful testing

**Then**: Continue with priority order as listed above

---

**END OF STRATEGIC PLAN**

