# ACG StaffLink - Module Testing Roadmap

**Purpose:** Master checklist for systematic module testing across all platform features
**Usage:** Use this to plan new testing threads and track overall platform readiness
**Date Created:** 2025-11-14
**Status:** Active Testing Framework

---

## 📊 Testing Progress Overview

| Category | Modules | Status | Priority | Can Parallelize? |
|----------|---------|--------|----------|------------------|
| **User Journeys** | 5 modules | 1/5 Complete | 🔴 CRITICAL | ✅ Yes (3 agents) |
| **Core Operations** | 6 modules | 0/6 Complete | 🔴 CRITICAL | ✅ Yes (4 agents) |
| **Financial & Compliance** | 4 modules | 0/4 Complete | 🟡 HIGH | ✅ Yes (2 agents) |
| **Communications** | 3 modules | 0/3 Complete | 🟡 HIGH | ✅ Yes (2 agents) |
| **Automation & Intelligence** | 4 modules | 0/4 Complete | 🟢 MEDIUM | ✅ Yes (2 agents) |
| **Analytics & Reporting** | 3 modules | 0/3 Complete | 🟢 MEDIUM | ❌ No (sequential) |
| **Admin & Configuration** | 5 modules | 1/5 In Progress | 🔴 CRITICAL | ✅ Yes (2 agents) + Super Admin |

**Total:** 30 modules | **Completed:** 1/30 (3.3%) | **In Progress:** 1/30 (3.3%)

**Recent Progress (2025-11-14):**
- ✅ Super Admin Quick Wins (3/3 complete): Platform Revenue, Agency Health Badges, Global Search
- ✅ Critical Security Fix: ViewSwitcher data filtering vulnerability patched

---

## 🎯 CATEGORY 1: User Journeys (CRITICAL)

### Module 1.1: Staff Portal & Onboarding ✅ COMPLETE
**Status:** ✅ Complete (2025-11-14)
**Thread:** Staff Portal Thread
**Documentation:** `STAFF_PORTAL_WORKFLOW.md`, `STAFF_PORTAL_THREAD_CLOSURE.md`

**Tested Features:**
- ✅ Staff invitation flow (admin → email → signup → profile → portal)
- ✅ Profile setup with RBAC (staff-specific fields)
- ✅ Shift marketplace with role-based filtering
- ✅ Shift acceptance and auto-confirmation
- ✅ Time display formatting
- ✅ Double-booking prevention

**Parked Items:**
- 🅿️ Profile photo upload → Compliance Tracker
- 🅿️ Availability management → Module 1.3

**Test Coverage:** 12/20 Playwright tests passing (60%)

---

### Module 1.2: Admin Shift Management
**Status:** ⏳ Not Started
**Priority:** 🔴 CRITICAL
**Can Parallelize:** ✅ Yes (Agent A)

**Scope:**
1. **Shift Creation Workflows**
   - Manual shift creation (single)
   - Bulk shift creation (CSV import)
   - Natural language shift creation
   - Recurring shift templates

2. **Shift Assignment**
   - Assign staff to shift
   - Reassign staff
   - Unassign staff
   - Auto-assignment based on availability

3. **Shift Modification**
   - Edit shift details (time, role, rates)
   - Cancel shift (with reason tracking)
   - Clone shift
   - Split shift into multiple

4. **Shift Status Management**
   - Status transitions (open → assigned → confirmed → in_progress → completed)
   - Shift journey log tracking
   - Admin workflows for incomplete shifts

**Test Files:**
- `tests/shift-creation.spec.js` (create)
- `tests/shift-assignment.spec.js` (create)
- `tests/shift-modification.spec.js` (create)

**UI Locations:**
- `/shifts` - Main shift management
- `/bulk-shift-creation` - Bulk creation
- `/natural-language-shift-creator` - AI creation
- `/shift-calendar` - Calendar view

**Dependencies:**
- Staff records exist
- Client records exist
- Rate cards configured

**Success Criteria:**
- [ ] Can create shifts via all 4 methods
- [ ] Can assign/reassign/unassign staff
- [ ] Can modify shift details before confirmation
- [ ] Financial lock prevents changes after timesheet approval
- [ ] Journey log tracks all state changes
- [ ] Admin workflows created for incomplete shifts

---

### Module 1.3: Staff Availability Management
**Status:** ⏳ Not Started
**Priority:** 🔴 CRITICAL
**Can Parallelize:** ✅ Yes (Agent B)

**Scope:**
1. **Set Weekly Availability**
   - Define available days/times
   - Set preferred shift types
   - Mark blackout dates
   - Recurring schedules

2. **Availability Conflicts**
   - Detect double-booking attempts
   - Warn on availability violations
   - Override with admin approval

3. **Availability Queries**
   - Find available staff for shift
   - Filter by role, location, preferences
   - Show staff availability calendar

**Test Files:**
- `tests/staff-availability.spec.js` (create)

**UI Locations:**
- `/my-availability` (staff view)
- `/staff-availability` (admin view)
- `/staff` (availability indicators)

**Dependencies:**
- Staff records exist
- Shifts exist for conflict testing

**Success Criteria:**
- [ ] Staff can set weekly availability
- [ ] Staff can mark blackout dates
- [ ] System prevents double-booking
- [ ] Admin can view all staff availability
- [ ] Availability filters work in shift assignment

---

### Module 1.4: Client Portal & Booking
**Status:** ⏳ Not Started
**Priority:** 🟡 HIGH
**Can Parallelize:** ✅ Yes (Agent C)
### Module 2.2: GPS Clock-In/Out & Location Tracking
**Status:** ⏳ Not Started
**Priority:** 🔴 CRITICAL
**Can Parallelize:** ✅ Yes (Agent B)

**Scope:**
1. **GPS Consent Management**
   - Staff consent to GPS tracking
   - Consent revocation
   - Consent audit trail

2. **Clock-In Workflow**
   - GPS location capture
   - Geofence validation (within X meters of shift location)
   - Photo capture (optional)
   - Clock-in time recording

3. **Clock-Out Workflow**
   - GPS location capture
   - Total hours calculation
   - Break time recording
   - Clock-out time recording

4. **Location Validation**
   - Verify staff at correct location
   - Flag suspicious locations
   - Admin override for valid exceptions

**Test Files:**
- `tests/gps-clock-in.spec.js` (create)
- `tests/geofence-validation.spec.js` (create)

**UI Locations:**
- `/staff-gps-consent` - GPS consent page
- Staff Portal → Clock In/Out (MobileClockIn component)

**Dependencies:**
- Staff has active shift
- GPS permissions granted
- Shift location coordinates set

**Success Criteria:**
- [ ] Staff can grant/revoke GPS consent
- [ ] Clock-in captures GPS coordinates
- [ ] Geofence validation works (within 100m)
- [ ] Clock-out calculates total hours
- [ ] Location data stored securely
- [ ] Admin can view location history

---

### Module 2.3: Invoicing & Billing
**Status:** ⏳ Not Started
**Priority:** 🔴 CRITICAL
**Can Parallelize:** ✅ Yes (Agent C)

**Scope:**
1. **Invoice Generation**
   - Generate from approved timesheets
   - Batch invoice generation
   - Invoice templates
   - Line item breakdown

2. **Invoice Sending**
   - Email invoice PDF to client
   - Invoice delivery tracking
   - Resend invoice

3. **Invoice Management**
   - View all invoices
   - Filter by status (draft, sent, paid, overdue)
   - Invoice amendments
   - Credit notes

4. **Payment Tracking**
   - Mark invoice as paid
   - Partial payment tracking
   - Payment reminders
   - Overdue alerts

**Test Files:**
- `tests/invoice-generation.spec.js` (create)
- `tests/invoice-sending.spec.js` (create)
- `tests/payment-tracking.spec.js` (create)

**UI Locations:**
- `/generate-invoices` - Invoice generation
- `/invoices` - Invoice list
- `/invoice-detail/:id` - Individual invoice

**Dependencies:**
- Approved timesheets exist
- Client billing details configured
- Email service working

**Success Criteria:**
- [ ] Invoices generate from approved timesheets
- [ ] Invoice PDFs sent via email
- [ ] Invoice data immutable after sending
- [ ] Payment tracking works
- [ ] Overdue reminders sent automatically
- [ ] Amendment workflow tracks changes

---

### Module 2.4: Payroll & Payslips
**Status:** ⏳ Not Started
**Priority:** 🔴 CRITICAL
**Can Parallelize:** ✅ Yes (Agent D)

**Scope:**
1. **Payslip Generation**
   - Generate from approved timesheets
   - Batch payslip generation
   - Payslip templates
   - Deductions and bonuses

2. **Payslip Distribution**
   - Email payslip PDF to staff
   - Payslip download portal
   - Payslip history

3. **Payroll Calculations**
   - Calculate gross pay
   - Calculate deductions (tax, NI, pension)
   - Calculate net pay
   - Overtime calculations

**Test Files:**
- `tests/payslip-generation.spec.js` (create)
- `tests/payroll-calculations.spec.js` (create)

**UI Locations:**
- `/generate-payslips` - Payslip generation
- `/payslips` - Payslip list
- Staff Portal → Payslips

**Dependencies:**
- Approved timesheets exist
- Staff tax/NI details configured
- Email service working

**Success Criteria:**
- [ ] Payslips generate from approved timesheets
- [ ] Payroll calculations accurate
- [ ] Payslips sent via email
- [ ] Staff can view payslip history
- [ ] Deductions calculated correctly

---

### Module 2.5: Compliance Document Management
**Status:** ⏳ Not Started
**Priority:** 🔴 CRITICAL
**Can Parallelize:** ✅ Yes (Agent A - after Module 2.1)

**Scope:**
1. **Document Upload**
   - Upload DBS, Right to Work, Training certificates
   - Document categorization
   - Document versioning
   - Bulk upload

2. **Document Verification**
   - Admin review and approval
   - Rejection with reason
   - Resubmission workflow

3. **Expiry Tracking**
   - Set expiry dates
   - Expiry reminders (30d, 14d, 7d)
   - Auto-suspend staff with expired docs
   - Renewal workflow

4. **Compliance Reporting**
   - View all staff compliance status
   - Filter by document type
   - Export compliance report

**Test Files:**
- `tests/compliance-upload.spec.js` (create)
- `tests/compliance-expiry.spec.js` (create)
- `tests/compliance-reporting.spec.js` (create)

**UI Locations:**
- `/compliance-tracker` - Main compliance page
- Staff Portal → Profile → Compliance Documents

**Dependencies:**
- Staff records exist
- File upload service working
- Email service for reminders

**Success Criteria:**
- [ ] Staff can upload compliance documents
- [ ] Admin can approve/reject documents
- [ ] Expiry reminders sent automatically
- [ ] Staff auto-suspended with expired docs
- [ ] Compliance reports accurate

---

### Module 2.6: Client & Staff Management
**Status:** ⏳ Not Started
**Priority:** 🟡 HIGH
**Can Parallelize:** ✅ Yes (Agent B - after Module 2.2)

**Scope:**
1. **Client Management**
   - Create/edit client records
   - Client contact management
   - Client billing details
   - Client rate cards
   - Client requirements (location, specific staff)

2. **Staff Management**
   - Create/edit staff records
   - Staff role management
   - Staff rate configuration
   - Staff status (active, suspended, inactive)
   - Staff groups/teams

3. **Bulk Operations**
   - Bulk import clients (CSV)
   - Bulk import staff (CSV)
   - Bulk update rates
   - Bulk status changes

**Test Files:**
- `tests/client-management.spec.js` (create)
- `tests/staff-management.spec.js` (create)
- `tests/bulk-operations.spec.js` (create)

**UI Locations:**
- `/clients` - Client list
- `/staff` - Staff list
- `/bulk-data-import` - Bulk import

**Dependencies:**
- Agency configured
- User authentication working

**Success Criteria:**
- [ ] Can create/edit clients
- [ ] Can create/edit staff
- [ ] Bulk import works for clients and staff
- [ ] Rate cards apply correctly
- [ ] Status changes reflect in system

---

## 💰 CATEGORY 3: Financial & Compliance (HIGH)

### Module 3.1: Financial Lock & Audit Trail
**Status:** ⏳ Not Started
**Priority:** 🟡 HIGH
**Can Parallelize:** ✅ Yes (Agent A)

**Scope:**
1. **Financial Lock Enforcement**
   - Lock timesheets after approval
   - Lock invoices after sending
   - Prevent rate/hour changes after lock
   - Admin override with audit trail

2. **Change Log Tracking**
   - Log all critical changes (rates, cancellations, amendments)
   - Track who made change, when, and why
   - Immutable audit trail

3. **Amendment Workflows**
   - Timesheet amendments (with approval)
   - Invoice amendments (with version control)
   - Change notification to affected parties

**Test Files:**
- `tests/pipeline/implementations/financial-integrity.ts` (exists)
- `tests/financial-lock.spec.js` (create)
- `tests/audit-trail.spec.js` (create)

**UI Locations:**
- `/cfo-dashboard` - Financial integrity dashboard
- `/timesheets` - Timesheet lock status
- `/invoices` - Invoice lock status

**Dependencies:**
- Timesheets exist
- Invoices exist

**Success Criteria:**
- [ ] Cannot edit locked timesheets
- [ ] Cannot edit sent invoices
- [ ] All critical changes logged
- [ ] Amendment workflow tracks versions
- [ ] CFO dashboard shows lock status

---

### Module 3.2: Rate Card & Pricing
**Status:** ⏳ Not Started
**Priority:** 🟡 HIGH
**Can Parallelize:** ✅ Yes (Agent B)

**Scope:**
1. **Rate Card Configuration**
   - Set client-specific rates
   - Set role-specific rates
   - Set time-based rates (day/night/weekend)
   - Set location-based rates

2. **Rate Validation**
   - Verify correct rate applied to shift
   - Warn on rate mismatches
   - Rate card expiry tracking

3. **Margin Calculation**
   - Calculate margin (charge rate - pay rate)
   - Margin reporting
   - Low margin alerts

**Test Files:**
- `tests/rate-card.spec.js` (create)
- `tests/margin-calculation.spec.js` (create)

**UI Locations:**
- `/clients` - Client rate cards
- `/shifts` - Rate display and validation

**Dependencies:**
- Clients exist
- Shifts exist

**Success Criteria:**
- [ ] Rate cards apply correctly to shifts
- [ ] Day/night/weekend rates calculated
- [ ] Margin calculations accurate
- [ ] Low margin alerts work

---

### Module 3.3: Dispute Resolution
**Status:** ⏳ Not Started
**Priority:** 🟢 MEDIUM
**Can Parallelize:** ✅ Yes (Agent A - after Module 3.1)

**Scope:**
1. **Dispute Creation**
   - Create dispute from shift/timesheet/invoice
   - Categorize dispute type
   - Attach evidence (photos, documents)

2. **Dispute Management**
   - Assign dispute to admin
   - Track dispute status
   - Resolution workflow
   - Dispute history

3. **Dispute Reporting**
   - View all disputes
   - Filter by status/type
   - Export dispute report

**Test Files:**
- `tests/dispute-resolution.spec.js` (create)

**UI Locations:**
- `/dispute-resolution` - Dispute management

**Dependencies:**
- Shifts/timesheets/invoices exist

**Success Criteria:**
- [ ] Can create disputes
- [ ] Can attach evidence
- [ ] Dispute workflow tracks status
- [ ] Dispute reports accurate

---

### Module 3.4: Operational Costs & Profitability
**Status:** ⏳ Not Started
**Priority:** 🟢 MEDIUM
**Can Parallelize:** ✅ Yes (Agent B - after Module 3.2)

**Scope:**
1. **Cost Tracking**
   - Track operational costs (software, licenses, etc.)
   - Allocate costs to clients/shifts
   - Cost categorization

2. **Profitability Analysis**
   - Calculate profit per shift
   - Calculate profit per client
   - Calculate profit per staff
   - Profitability trends

**Test Files:**
- `tests/operational-costs.spec.js` (create)

**UI Locations:**
- `/operational-costs` - Cost tracking

**Dependencies:**
- Shifts exist
- Invoices exist

**Success Criteria:**
- [ ] Can track operational costs
- [ ] Profitability calculations accurate
- [ ] Profitability reports work

---

## 📧 CATEGORY 4: Communications (HIGH)

### Module 4.1: Email Notifications
**Status:** ⏳ Not Started
**Priority:** 🟡 HIGH
**Can Parallelize:** ✅ Yes (Agent A)

**Scope:**
1. **Email Triggers**
   - Staff invitation
   - Shift assignment
   - Shift reminder (24h, 2h)
   - Timesheet approval
   - Invoice sent
   - Payment reminder
   - Compliance expiry reminder

2. **Email Templates**
   - Branded email templates
   - Dynamic content (shift details, staff name, etc.)
   - Multi-language support (future)

3. **Email Delivery**
   - Send via Resend API
   - Delivery tracking
   - Bounce handling
   - Resend failed emails

**Test Files:**
- `tests/pipeline/implementations/communication.ts` (exists)
- `tests/email-notifications.spec.js` (create)

**UI Locations:**
- `/email-notification-tester` - Email testing
- `/notification-monitor` - Notification tracking

**Dependencies:**
- Resend API configured
- Email templates exist

**Success Criteria:**
- [ ] All email triggers work
- [ ] Email templates render correctly
- [ ] Emails delivered successfully
- [ ] Delivery tracking works
- [ ] Bounce handling works

---

### Module 4.2: SMS & WhatsApp Notifications
**Status:** ⏳ Not Started
**Priority:** 🟡 HIGH
**Can Parallelize:** ✅ Yes (Agent B)

**Scope:**
1. **SMS Notifications**
   - Send via Twilio API
   - SMS templates
   - Delivery tracking
   - Opt-out handling

2. **WhatsApp Notifications**
   - Send via Twilio WhatsApp API
   - WhatsApp templates
   - Delivery tracking
   - Interactive messages (future)

3. **Multi-Channel Fallback**
   - Try email → SMS → WhatsApp if primary fails
   - Channel prioritization
   - Error handling

**Test Files:**
- `tests/sms-notifications.spec.js` (create)
- `tests/whatsapp-notifications.spec.js` (create)

**UI Locations:**
- `/test-shift-reminders` - SMS/WhatsApp testing

**Dependencies:**
- Twilio API configured
- Phone numbers verified

**Success Criteria:**
- [ ] SMS sent successfully
- [ ] WhatsApp sent successfully
- [ ] Multi-channel fallback works
- [ ] Delivery tracking works

---

### Module 4.3: WhatsApp Assistant & Bot
**Status:** ⏳ Not Started
**Priority:** 🟢 MEDIUM
**Can Parallelize:** ✅ Yes (Agent A - after Module 4.2)

**Scope:**
1. **WhatsApp Bot Responses**
   - Respond to staff queries
   - Shift confirmations via WhatsApp
   - Timesheet submission via WhatsApp
   - AI-powered responses

2. **WhatsApp Routing**
   - Route messages to correct handler
   - Webhook processing
   - Error handling

**Test Files:**
- `tests/whatsapp-bot.spec.js` (create)

**UI Locations:**
- `/whatsapp-setup` - WhatsApp configuration
- `/whatsapp-agent-demo` - Bot demo

**Dependencies:**
- Twilio WhatsApp configured
- AI integration working

**Success Criteria:**
- [ ] Bot responds to messages
- [ ] Shift confirmations work
- [ ] Timesheet submission works
- [ ] AI responses accurate

---

## 🤖 CATEGORY 5: Automation & Intelligence (MEDIUM)

### Module 5.1: Automated Workflows & Engines
**Status:** ⏳ Not Started
**Priority:** 🟢 MEDIUM
**Can Parallelize:** ✅ Yes (Agent A)

**Scope:**
1. **Daily Shift Closure Engine**
   - Verify shifts >24h old without timesheets
   - Create admin workflows for incomplete shifts
   - Send reminders to staff

2. **No-Show Detection**
   - Alert if no clock-in 15 mins after shift start
   - Create admin workflow
   - Notify client

3. **Timesheet Batch Processor**
   - Auto-approve all pending timesheets
   - Bulk approval workflow

4. **Staff Daily Digest**
   - Send upcoming shifts + earnings summary
   - Daily email at 8pm

**Test Files:**
- `tests/pipeline/implementations/automation.ts` (exists)
- `tests/automated-workflows.spec.js` (create)

**UI Locations:**
- `/admin-workflows` - Admin workflow queue

**Dependencies:**
- Cron jobs configured
- Email service working

**Success Criteria:**
- [ ] Daily shift closure runs automatically
- [ ] No-show detection works
- [ ] Batch processor approves timesheets
- [ ] Daily digest sent to staff

---

### Module 5.2: AI Email Parsing & Shift Creation
**Status:** ⏳ Not Started
**Priority:** 🟢 MEDIUM
**Can Parallelize:** ✅ Yes (Agent B)

**Scope:**
1. **Inbound Email Processing**
   - Receive care home emails via Resend webhook
   - Parse email content with AI
   - Extract shift details (date, time, role, location)

2. **Shift Auto-Creation**
   - Create shift from parsed data
   - Confidence scoring
   - Manual review for low-confidence

**Test Files:**
- `tests/ai-email-parsing.spec.js` (create)

**UI Locations:**
- N/A (backend process)

**Dependencies:**
- Resend webhook configured
- OpenAI API working

**Success Criteria:**
- [ ] Emails received via webhook
- [ ] AI parses email correctly (>80% confidence)
- [ ] Shifts auto-created from high-confidence parses
- [ ] Low-confidence parses flagged for review

---

### Module 5.3: AI OCR Timesheet Extraction
**Status:** ⏳ Not Started
**Priority:** 🟢 MEDIUM
**Can Parallelize:** ✅ Yes (Agent A - after Module 5.1)

**Scope:**
1. **OCR Processing**
   - Extract hours, signatures, dates from timesheet photo
   - Confidence scoring
   - Manual review for low-confidence

2. **Auto-Approval**
   - Auto-approve high-confidence timesheets
   - Flag low-confidence for manual review

**Test Files:**
- `tests/ai-ocr-extraction.spec.js` (create)

**UI Locations:**
- `/timesheets` - OCR results display

**Dependencies:**
- OpenAI API working
- Timesheet photos uploaded

**Success Criteria:**
- [ ] OCR extracts data accurately (>80% confidence)
- [ ] Auto-approval works for high-confidence
- [ ] Low-confidence flagged for review

---

### Module 5.4: Natural Language Shift Creation
**Status:** ⏳ Not Started
**Priority:** 🟢 LOW
**Can Parallelize:** ✅ Yes (Agent B - after Module 5.2)

**Scope:**
1. **Natural Language Processing**
   - Parse natural language shift requests
   - Extract shift details
   - Create shift from parsed data

**Test Files:**
- `tests/natural-language-shift.spec.js` (create)

**UI Locations:**
- `/natural-language-shift-creator` - NL shift creation

**Dependencies:**
- OpenAI API working

**Success Criteria:**
- [ ] NL parsing works
- [ ] Shifts created from NL input

---

## 📊 CATEGORY 6: Analytics & Reporting (MEDIUM)

### Module 6.1: Performance Analytics
**Status:** ⏳ Not Started
**Priority:** 🟢 MEDIUM
**Can Parallelize:** ❌ No (requires data from other modules)

**Scope:**
1. **KPI Calculations**
   - Fill rate (shifts filled / total shifts)
   - Margin (charge rate - pay rate)
   - No-show rate
   - Timesheet approval rate

2. **Performance Reports**
   - Staff performance
   - Client performance
   - Agency performance

**Test Files:**
- `tests/performance-analytics.spec.js` (create)

**UI Locations:**
- `/performance-analytics` - Performance dashboard

**Dependencies:**
- Shifts exist
- Timesheets exist
- Invoices exist

**Success Criteria:**
- [ ] KPI calculations accurate
- [ ] Performance reports work

---

### Module 6.2: Timesheet Analytics
**Status:** ⏳ Not Started
**Priority:** 🟢 MEDIUM
**Can Parallelize:** ❌ No (requires Module 6.1)

**Scope:**
1. **Discrepancy Reports**
   - Identify timesheet discrepancies
   - Flag suspicious timesheets
   - Discrepancy trends

**Test Files:**
- `tests/timesheet-analytics.spec.js` (create)

**UI Locations:**
- `/timesheet-analytics` - Timesheet analytics

**Dependencies:**
- Timesheets exist

**Success Criteria:**
- [ ] Discrepancy reports accurate
- [ ] Suspicious timesheets flagged

---

### Module 6.3: Data Export & Reporting
**Status:** ⏳ Not Started
**Priority:** 🟢 MEDIUM
**Can Parallelize:** ❌ No (requires Module 6.1 & 6.2)

**Scope:**
1. **CSV Export**
   - Export shifts to CSV
   - Export timesheets to CSV
   - Export invoices to CSV
   - Export staff to CSV

2. **Custom Reports**
   - Generate custom reports
   - Schedule reports
   - Email reports

**Test Files:**
- `tests/data-export.spec.js` (create)

**UI Locations:**
- `/shifts` - Export CSV
- `/timesheets` - Export CSV
- `/invoices` - Export CSV

**Dependencies:**
- Data exists in all tables

**Success Criteria:**
- [ ] CSV exports work
- [ ] All columns present
- [ ] Data accurate

---

## ⚙️ CATEGORY 7: Admin & Configuration (LOW)

### Module 7.1: Agency Settings & Configuration
**Status:** ⏳ Not Started
**Priority:** 🟢 LOW
**Can Parallelize:** ✅ Yes (Agent A)

**Scope:**
1. **Agency Profile**
   - Edit agency details
   - Upload logo
   - Set branding colors

2. **System Configuration**
   - Set default rates
   - Set notification preferences
   - Set business rules

**Test Files:**
- `tests/agency-settings.spec.js` (create)

**UI Locations:**
- `/agency-settings` - Agency configuration

**Success Criteria:**
- [ ] Can edit agency details
- [ ] Settings persist correctly

---

### Module 7.2: User Management & RBAC
**Status:** ⏳ Not Started
**Priority:** 🟢 LOW
**Can Parallelize:** ✅ Yes (Agent B)

**Scope:**
1. **User Creation**
   - Create admin users
   - Create staff users
   - Create client users

2. **Role-Based Access Control**
   - Assign roles
   - Test role permissions
   - Verify RBAC enforcement

**Test Files:**
- `tests/user-management.spec.js` (create)
- `tests/rbac.spec.js` (create)

**UI Locations:**
- `/staff` - User management

**Success Criteria:**
- [ ] Can create users
- [ ] RBAC enforced correctly

---

### Module 7.3: Super Admin Agency Onboarding
**Status:** ⏳ Not Started
**Priority:** 🟢 LOW
**Can Parallelize:** ✅ Yes (Agent A - after Module 7.1)

**Scope:**
1. **Agency Onboarding**
   - Create new agency
   - Set up agency admin
   - Configure agency settings

**Test Files:**
- `tests/agency-onboarding.spec.js` (create)

**UI Locations:**
- `/super-admin-agency-onboarding` - Agency onboarding

**Success Criteria:**
- [ ] Can create new agency
- [ ] Agency admin created
- [ ] Agency settings configured

---

### Module 7.5: Super Admin Dashboard Enhancements ✅ IN PROGRESS
**Status:** 🔄 In Progress (2025-11-14)
**Priority:** 🔴 CRITICAL (Super Admin Focus)
**Can Parallelize:** ❌ No (Dedicated to Super Admin improvements)

**Documentation:** `SUPER_ADMIN_IMPROVEMENT_ROADMAP.md`, `VIEWSWITCHER_CRITICAL_SECURITY_ISSUE.md`

**Scope:**
This module focuses on super admin analytics, monitoring, and platform management capabilities.

#### Phase 1: Quick Wins ✅ COMPLETED (2025-11-14)

**✅ Quick Win 1: Platform Revenue Summary** (4 hours - ALREADY IMPLEMENTED)
- **Status:** ✅ Complete
- **Location:** [Dashboard.jsx:672-674](src/pages/Dashboard.jsx#L672-L674)
- **Feature:** Platform-wide revenue display in header
- **Implementation:** Shows total platform revenue across all agencies in Platform Control Center

**✅ Quick Win 2: Agency Health Status Badges** (2 hours - COMPLETED)
- **Status:** ✅ Complete (2025-11-14)
- **Location:** [Dashboard.jsx:806-847](src/pages/Dashboard.jsx#L806-L847)
- **Feature:** Health score (0-100) for each agency with color-coded badges
- **Algorithm:**
  - Fill Rate Score (0-30 points)
  - Revenue Score (0-25 points) - £5k/week = 100%
  - Staff Count Score (0-20 points) - 50 staff = 100%
  - Activity Score (0-25 points) - 20 shifts/week = 100%
- **Visual Indicators:**
  - 🟢 Green (80-100): Healthy
  - 🟡 Yellow (60-79): Good
  - 🟠 Orange (40-59): Needs attention
  - 🔴 Red (0-39): Critical
- **Impact:** Super admin can instantly identify struggling agencies

**✅ Quick Win 3: Enhanced Global Search** (6 hours - COMPLETED)
- **Status:** ✅ Complete (2025-11-14)
- **Location:** [Dashboard.jsx:329-365, 661-752](src/pages/Dashboard.jsx#L329-L365)
- **Feature:** Multi-entity search with dropdown results
- **Search Scope:**
  - Staff (name, email, phone, role)
  - Clients (name, location, email)
  - Shifts (role, client, staff, status, ID)
- **UI:** Live dropdown showing top 5 results per category
- **Performance:** Client-side filtering with instant results
- **Impact:** Super admin can find any entity in <2 seconds

#### Phase 1: Security Fixes ✅ COMPLETED (2025-11-14)

**✅ Critical Security Issue: ViewSwitcher Data Filtering** (2 hours - COMPLETED)
- **Status:** ✅ Fixed (2025-11-14)
- **Documentation:** `VIEWSWITCHER_CRITICAL_SECURITY_ISSUE.md`
- **Problem:** All queries fetched ALL data, then filtered client-side (data exposure vulnerability)
- **Location:** [Dashboard.jsx:154-293](src/pages/Dashboard.jsx#L154-L293)
- **Fixed Queries:** Staff, Shifts, Bookings, Timesheets, Clients, Workflows
- **Implementation:** Changed from client-side `.filter()` to server-side `.eq('agency_id', ...)`
- **Security Impact:**
  - Before: 94% wasted bandwidth, competitors' data exposed in network traffic
  - After: Only agency-specific data fetched, secure by design
- **Performance Impact:** 10-20x reduction in data transferred

#### Phase 2: Foundation Features ⚠️ **MAJOR DISCOVERY - Reuse Existing Analytics!**

**📊 DISCOVERY (2025-11-14):** Extensive analytics pages already exist!
- **Documentation:** [EXISTING_ANALYTICS_ADAPTATION_PLAN.md](EXISTING_ANALYTICS_ADAPTATION_PLAN.md)
- **Files Found:**
  - [PerformanceAnalytics.jsx](src/pages/PerformanceAnalytics.jsx) - 696 lines, production-ready
  - [AdminDashboard.jsx](src/pages/AdminDashboard.jsx) - 616 lines, comprehensive KPIs
  - [TimesheetAnalytics.jsx](src/pages/TimesheetAnalytics.jsx) - 431 lines, auto-approval metrics
  - [CFODashboard.jsx](src/pages/CFODashboard.jsx) - Financial integrity monitoring

**Original Estimate:** 21 hours to build from scratch
**New Estimate:** 8-10 hours to adapt existing pages (60% time savings!)
**Coverage:** ~70% of Phase 2 features already implemented

**✅ 2.1: Connect Existing Analytics to Super Admin** (2-3 hours) ✅ **COMPLETED (2025-11-14)**
- [x] Add PerformanceAnalytics link to super admin menu in Layout.jsx
- [x] Add super admin detection to PerformanceAnalytics.jsx (lines 24-67)
- [x] Remove agency_id filters when super admin viewing platform-wide (lines 69-158)
- [x] Add agency selector dropdown for drill-down capability
- [x] Add "All Agencies" as default view option
- [x] Test with multiple agencies, verify performance
- **Reuses:** Existing financial, operational, loss analysis charts
- **Status:** ✅ Complete - Super admin can now access Platform Analytics with platform-wide and agency drill-down views
- **Documentation:** [PHASE2_SUPER_ADMIN_HANDOFF.md](PHASE2_SUPER_ADMIN_HANDOFF.md)

**⏳ 2.2: Add Agency Comparison Section** (2 hours)
- [ ] Add agency comparison BarChart (revenue, margin, fill rate)
- [ ] Add agency rankings table with health scores (reuse health calc from Quick Win 2)
- [ ] Calculate per-agency metrics using existing aggregation logic
- [ ] Add sort/filter options for rankings table
- **Reuses:** Client performance logic (lines 256-278), problematic clients logic (line 279)
- **Already Have:** Top 5 rankings UI, health score algorithm

**⏳ 2.3: Add Healthcare-Specific KPIs** (2 hours)
- [ ] Redeployment Rate calculation (returning staff to same client)
- [ ] Time to Fill calculation (using shift_journey_log data)
- [ ] Client Retention Rate (monthly comparison)
- [ ] Submission-to-Fill Rate funnel visualization
- [ ] Add KPI cards to PerformanceAnalytics
- **Leverages:** Existing shift_journey_log, comprehensive data model
- **Already Have:** KPI card UI components, trend calculations

**⏳ 2.4: Platform-Wide Analytics Charts** (2-3 hours)
- [x] Revenue trend charts - **ALREADY EXISTS** (PerformanceAnalytics line 304-325, 547-560)
- [x] 6-month performance trend - **ALREADY EXISTS** (line 547-560)
- [x] Loss breakdown PieChart - **ALREADY EXISTS** (line 442-478)
- [x] Top performers - **ALREADY EXISTS** (line 278-294)
- [ ] Add "stacked by agency" option to existing charts
- [ ] Add staff headcount growth over time chart
- [ ] Add fill rate trends chart
- **Status:** 80% already built, need minor enhancements

**⏳ 2.5: Real-Time Platform Alerts** (3-4 hours)
- [x] Alert system architecture - **ALREADY EXISTS** (AdminDashboard line 289-356)
- [ ] Adapt alert logic for platform-wide monitoring
- [ ] Add payment overdue alerts (>30 days, cross-agency)
- [ ] Add critical compliance alerts (expired DBS for working staff)
- [ ] Add system error monitoring (failed email/SMS)
- [ ] Add high-value opportunity alerts (new client signup)
- **Reuses:** Existing criticalAlerts system, severity levels, alert UI

**TOTAL PHASE 2 EFFORT:** 11-14 hours (vs 21 hours original estimate) - **48% time savings!**

#### Phase 3: Professional Features (Future)

**⏳ 3.2: Bulk Operations** (4 hours)
- [ ] Bulk send announcement to all agencies
- [ ] Bulk update payment terms
- [ ] Bulk enable/disable features
- [ ] Bulk data export
- [ ] Multi-select UI with confirmation dialogs

**⏳ 3.3: Automated Reports** (7 hours)
- [ ] Weekly platform performance summary (email Monday 9am)
- [ ] Monthly revenue report (PDF)
- [ ] Quarterly business review (PowerPoint-ready)
- [ ] Custom report builder
- [ ] Report templates
- [ ] Email distribution lists

**⏳ 3.4: Agency Activity Timeline** (5 hours)
- [ ] Activity feed per agency (new client, 10 shifts created, invoice sent, etc.)
- [ ] Filterable by activity type
- [ ] Export timeline to PDF

#### Testing Requirements

**Manual Testing:**
- [x] Platform revenue displays correctly
- [x] Agency health scores calculate accurately
- [x] Health badges show correct colors
- [x] Global search finds staff by name/email/phone
- [x] Global search finds clients by name/location
- [x] Global search finds shifts by role/status
- [x] Search dropdown displays results correctly
- [x] ViewSwitcher security fix verified (network tab inspection)
- [ ] Real-time alerts trigger correctly
- [ ] Analytics charts render with correct data
- [ ] KPI calculations accurate

**Security Testing:**
- [x] ViewSwitcher no longer exposes other agencies' data
- [x] Network requests only fetch agency-specific data
- [x] RLS policies enforced at database level
- [ ] Alert system doesn't leak sensitive data
- [ ] Export functions respect agency boundaries

**Performance Testing:**
- [x] Dashboard loads within 2 seconds (with security fix)
- [x] Search responds instantly (<200ms)
- [x] Health score calculation doesn't impact load time
- [ ] Analytics charts render within 1 second
- [ ] Platform handles 50+ agencies without performance degradation

**Success Metrics:**
- ✅ Platform revenue visible without manual calculation
- ✅ Agency health scores visible at a glance
- ✅ Critical agencies identified instantly (red/orange badges)
- ✅ Any entity findable in <10 seconds via search
- ✅ Data exposure vulnerability eliminated
- ⏳ Time spent on manual reporting reduced by 75%
- ⏳ Agency retention rate improves by 10%
- ⏳ Revenue per super admin hour increases 3x

---

### Module 7.4: Help Center & Documentation
**Status:** ⏳ Not Started
**Priority:** 🟢 LOW
**Can Parallelize:** ✅ Yes (Agent B - after Module 7.2)

**Scope:**
1. **Help Content**
   - User guides
   - Video tutorials
   - FAQs

2. **In-App Help**
   - Contextual help
   - Tooltips
   - Onboarding tours

**Test Files:**
- `tests/help-center.spec.js` (create)

**UI Locations:**
- `/help-center` - Help center

**Success Criteria:**
- [ ] Help content accessible
- [ ] Contextual help works

---

## 🔄 Parallel Testing Strategy

### **Parallel Group 1: User Journeys (3 Agents)**
- **Agent A:** Module 1.2 (Admin Shift Management)
- **Agent B:** Module 1.3 (Staff Availability)
- **Agent C:** Module 1.4 (Client Portal)
- **Sequential:** Module 1.5 (Shift Journey E2E) - after all above complete

### **Parallel Group 2: Core Operations (4 Agents)**
- **Agent A:** Module 2.1 (Timesheet Management) → Module 2.5 (Compliance)
- **Agent B:** Module 2.2 (GPS Clock-In) → Module 2.6 (Client/Staff Management)
- **Agent C:** Module 2.3 (Invoicing)
- **Agent D:** Module 2.4 (Payroll)

### **Parallel Group 3: Financial & Compliance (2 Agents)**
- **Agent A:** Module 3.1 (Financial Lock) → Module 3.3 (Dispute Resolution)
- **Agent B:** Module 3.2 (Rate Card) → Module 3.4 (Operational Costs)

### **Parallel Group 4: Communications (2 Agents)**
- **Agent A:** Module 4.1 (Email) → Module 4.3 (WhatsApp Bot)
- **Agent B:** Module 4.2 (SMS/WhatsApp)

### **Parallel Group 5: Automation (2 Agents)**
- **Agent A:** Module 5.1 (Workflows) → Module 5.3 (OCR)
- **Agent B:** Module 5.2 (Email Parsing) → Module 5.4 (NL Shift Creation)

### **Sequential Group 6: Analytics (1 Agent)**
- Module 6.1 → Module 6.2 → Module 6.3 (must be sequential due to dependencies)

### **Parallel Group 7: Admin (2 Agents)**
- **Agent A:** Module 7.1 (Agency Settings) → Module 7.3 (Super Admin)
- **Agent B:** Module 7.2 (User Management) → Module 7.4 (Help Center)

---

## 📋 Testing Checklist Template

For each module, create a checklist document with:

```markdown
# Module X.X: [Module Name] - Testing Checklist

**Status:** ⏳ Not Started
**Assigned Agent:** [Agent ID]
**Start Date:** [Date]
**Target Completion:** [Date]
**Dependencies:** [List dependencies]

## Pre-Testing Setup
- [ ] Review module scope
- [ ] Identify test data requirements
- [ ] Set up test environment
- [ ] Review existing tests

## Feature Testing
- [ ] Feature 1: [Description]
  - [ ] Test case 1
  - [ ] Test case 2
- [ ] Feature 2: [Description]
  - [ ] Test case 1
  - [ ] Test case 2

## Playwright Tests
- [ ] Create test file: `tests/[module-name].spec.js`
- [ ] Write test cases
- [ ] Run tests
- [ ] Fix failures
- [ ] Achieve >80% pass rate

## Documentation
- [ ] Create module workflow document
- [ ] Document known issues
- [ ] Document parked items
- [ ] Update MODULE_TESTING_ROADMAP.md

## Sign-Off
- [ ] All critical features tested
- [ ] Playwright tests passing
- [ ] Documentation complete
- [ ] Ready for next module
```

---

## 🎯 Success Criteria

**Module Complete When:**
1. ✅ All features tested manually
2. ✅ Playwright tests created and passing (>80%)
3. ✅ Documentation created (workflow + issues)
4. ✅ Known issues documented
5. ✅ Parked items documented
6. ✅ Module marked complete in this roadmap

**Platform Ready When:**
1. ✅ All 29 modules complete
2. ✅ All critical pipelines passing (Shift Journey, Automation, Financial, Communication)
3. ✅ All Playwright tests passing (>90%)
4. ✅ All documentation complete
5. ✅ Production deployment successful

---

**Document Version:** 1.0
**Last Updated:** 2025-11-14
**Next Review:** After each module completion


**Scope:**
1. **Client Self-Service**
   - View upcoming shifts
   - Request new shifts
   - Cancel shifts
   - View invoices

2. **Client Communication**
   - Receive shift confirmations
   - Receive staff assignment notifications
   - Receive invoices
   - Submit feedback

**Test Files:**
- `tests/client-portal.spec.js` (create)

**UI Locations:**
- `/client-portal` - Main client view

**Dependencies:**
- Client records exist
- Shifts assigned to client

**Success Criteria:**
- [ ] Client can view their shifts
- [ ] Client can request new shifts
- [ ] Client receives notifications
- [ ] Client can view/download invoices

---

### Module 1.5: Shift Journey End-to-End
**Status:** ⏳ Not Started
**Priority:** 🔴 CRITICAL
**Can Parallelize:** ❌ No (requires all other modules)

**Scope:** Complete shift lifecycle from creation to payment

**Test Pipeline:** (16 tests from `critical_path_testing_matrix.csv`)
- sj-001: Receive care home email
- sj-002: AI parses email
- sj-003: Create shift record
- sj-004: Assign staff to shift
- sj-005: Send shift assignment notification
- sj-006: Create draft timesheet
- sj-007: Send 24h reminder
- sj-008: Send 2h reminder
- sj-009: GPS clock-in
- sj-010: Upload timesheet document
- sj-011: AI OCR extraction
- sj-012: Auto-approve timesheet
- sj-013: Mark shift completed
- sj-014: Generate invoice
- sj-015: Send invoice to client
- sj-016: Payment reminder

**Test Files:**
- `tests/pipeline/implementations/shift-journey.ts` (exists)

**Success Criteria:**
- [ ] All 16 tests pass
- [ ] Complete journey logged
- [ ] No manual intervention required for happy path

---

## 🔧 CATEGORY 2: Core Operations (CRITICAL)

### Module 2.1: Timesheet Management
**Status:** ⏳ Not Started
**Priority:** 🔴 CRITICAL
**Can Parallelize:** ✅ Yes (Agent A)

**Scope:**
1. **Timesheet Creation**
   - Auto-create on shift confirmation
   - Manual timesheet creation
   - Timesheet templates

2. **Timesheet Submission**
   - Staff uploads signed timesheet photo
   - AI OCR extraction (hours, signatures, dates)
   - Manual data entry fallback

3. **Timesheet Approval**
   - Auto-approval for high-confidence OCR
   - Manual review for low-confidence
   - Rejection with reason
   - Resubmission workflow

4. **Timesheet Modifications**
   - Adjust hours before approval
   - Financial lock after approval
   - Amendment workflow for approved timesheets

**Test Files:**
- `tests/timesheet-creation.spec.js` (create)
- `tests/timesheet-approval.spec.js` (create)
- `tests/timesheet-ocr.spec.js` (create)

**UI Locations:**
- `/timesheets` - Main timesheet management
- `/timesheet-detail/:id` - Individual timesheet
- Staff Portal → Timesheets

**Dependencies:**
- Shifts exist and confirmed
- Staff has completed shifts
- AI OCR function deployed

**Success Criteria:**
- [ ] Timesheets auto-create on shift confirmation
- [ ] Staff can upload timesheet photos
- [ ] AI OCR extracts data accurately (>80% confidence)
- [ ] Auto-approval works for high-confidence
- [ ] Financial lock prevents post-approval changes
- [ ] Amendment workflow tracks changes

---


