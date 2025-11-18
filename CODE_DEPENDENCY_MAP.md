---
status: active
last_sync_date: 2025-11-17
code_reference: src/components/, src/pages/, src/utils/, src/api/, supabase/functions/
---

# CODE DEPENDENCY MAP

**Purpose:** Centralized map of all code domains, entry points, dependencies, and immutable zones.
**Last Updated:** 2025-11-17
**Scope:** ACG StaffLink - Supabase Migration

---

## 🏗️ ARCHITECTURE OVERVIEW

### **Core Layers**
1. **Pages** (`src/pages/`) - Entry points, route handlers
2. **Components** (`src/components/`) - Reusable UI components
3. **Utils** (`src/utils/`) - Business logic, helpers
4. **API** (`src/api/`) - Data access layer
5. **Lib** (`src/lib/`) - External integrations
6. **Edge Functions** (`supabase/functions/`) - Serverless backend functions
7. **Contexts** (`src/contexts/`) - React context providers
8. **Hooks** (`src/hooks/`) - Custom React hooks
9. **Styles** (`src/styles/`) - Design system and styling

---

## 📦 DOMAIN 1: SHIFT MANAGEMENT

### **Entry Points**
- `src/pages/Shifts.jsx` - Main shift listing and management
- `src/pages/BulkShiftCreation.jsx` - Bulk shift creation wizard
- `src/pages/PostShiftV2.jsx` - Single shift creation
- `src/pages/ShiftCalendar.jsx` - Calendar view
- `src/pages/NaturalLanguageShiftCreator.jsx` - AI shift creation

### **Components**
- `src/components/shifts/ShiftTable.jsx` - Shift data table
- `src/components/shifts/ShiftAssignmentModal.jsx` - Assign staff to shifts
- `src/components/shifts/ShiftCompletionModal.jsx` - Complete shifts
- `src/components/shifts/ShiftRateDisplay.jsx` - Display rates
- `src/components/shifts/NaturalLanguageShiftRequest.jsx` - AI shift request
- `src/components/bulk-shifts/Step1ClientSetup.jsx` - Bulk: Client setup
- `src/components/bulk-shifts/Step2MultiRoleGrid.jsx` - Bulk: Grid entry
- `src/components/bulk-shifts/Step3PreviewTable.jsx` - Bulk: Preview
- `src/components/bulk-shifts/RoleSelector.jsx` - Bulk: Role selection
- `src/components/bulk-shifts/EditShiftModal.jsx` - Bulk: Edit shift

### **Utilities**
- `src/utils/shiftHelpers.js` - Core shift utilities
  - `determineShiftType(startTime)` - Calculate day/night
  - `extractShiftTypeFromRoleKey(roleKey)` - Parse role keys
  - `getShiftTimes(client, shiftType)` - Get shift times
  - `formatShiftType(shiftType)` - Format for display
  - `getShiftTypeBadge(shiftType)` - Badge styling
- `src/utils/shiftTimeFormatter.js` - Time formatting
  - `getShiftType(startTime)` - Determine shift type
  - `formatTime(timestamp)` - Format time display
  - `formatShiftTimeRange(start, end, options)` - Format time range
- `src/utils/bulkShifts/shiftGenerator.js` - Bulk shift generation
  - `expandGridToShifts(gridData, roles, client, formData, agencyId, user)` - Generate shifts
  - `groupShiftsByDate(shifts)` - Group for preview
  - `calculateFinancialSummary(shifts)` - Calculate costs/revenue
  - `prepareShiftsForInsert(shifts)` - Clean for DB insert
- `src/utils/bulkShifts/validation.js` - Bulk shift validation
  - `validateBulkShifts(shifts)` - Validate shift data
- `src/utils/bulkShifts/pasteParser.js` - Parse pasted data
  - `parsePastedData(text, activeRoles)` - Parse clipboard data
- `src/utils/bulkShifts/csvUploader.js` - CSV upload
  - `parseCSVFile(file, activeRoles)` - Parse CSV files

### **Database Tables**
- `shifts` - Main shift records
  - **Immutable after financial_locked=true**
  - Fields: id, agency_id, client_id, role_required, shift_type, date, start_time, end_time, status

### **Integration Points**
- Supabase: `supabase.from('shifts').select/insert/update`
- Client data: `getClientRates()`, `getEnabledRoles()`
- Staff assignment: `ShiftAssignmentModal`
- Marketplace: `marketplace_visible` flag

### **Immutable Zones**
- ⚠️ **Shifts with `financial_locked=true`** - Cannot modify rates or times
- ⚠️ **Completed shifts** - Only admin can reopen
- ⚠️ **shift_journey_log** - Append-only audit trail

---

## 📦 DOMAIN 2: STAFF MANAGEMENT

### **Entry Points**
- `src/pages/Staff.jsx` - Main staff listing
- `src/pages/StaffProfile.jsx` - Individual staff profile
- `src/pages/StaffPortal.jsx` - Staff member portal
- `src/pages/ProfileSetup.jsx` - Staff onboarding
- `src/pages/StaffAvailability.jsx` - Availability management
- `src/pages/MyAvailability.jsx` - Staff self-service availability

### **Components**
- `src/components/staff/StaffForm.jsx` - Staff creation/edit form
- `src/components/staff/InviteStaffModal.jsx` - Invite staff via email
- `src/components/staff/MandatoryTrainingSection.jsx` - Training tracker
- `src/components/staff/TrainingCertificateModal.jsx` - Certificate upload
- `src/components/staff/MobileClockIn.jsx` - GPS clock-in

### **Utilities**
- `src/constants/staffRoles.js` - Role definitions (assumed)
  - `normalizeRole(role)` - Normalize role names

### **Database Tables**
- `staff` - Staff records
- `profiles` - User authentication profiles
- `compliance` - Training certificates, DBS checks

### **Integration Points**
- Supabase Auth: User creation and linking
- RLS Policies: Staff can only see own data
- Compliance tracking: Certificate expiry monitoring

### **Immutable Zones**
- ⚠️ **DBS check records** - Cannot delete, only archive
- ⚠️ **Training certificates** - Audit trail required

---

## 📦 DOMAIN 3: CLIENT MANAGEMENT

### **Entry Points**
- `src/pages/Clients.jsx` - Main client listing
- `src/pages/ClientPortal.jsx` - Client self-service portal
- `src/pages/OnboardClient.jsx` - Client onboarding wizard

### **Components**
- `src/components/clients/InviteClientModal.jsx` - Invite client via email
- `src/components/clients/ClientGPSSetup.jsx` - GPS geofencing setup

### **Utilities**
- `src/utils/clientHelpers.js` - Client data utilities
  - `getEnabledRoles(client)` - Extract enabled roles
  - `getShiftTimes(client, shiftType)` - Get shift times from config
  - `getClientRates(client, role, shiftType, date)` - Get rates (simple/advanced)
  - `isRoleEnabled(client, role)` - Check if role enabled

### **Database Tables**
- `clients` - Client records
  - Fields: id, agency_id, name, type, enabled_roles, shift_window_type, contract_terms

### **Integration Points**
- Contract rates: `contract_terms.rates_by_role`
- Shift configuration: `shift_window_type` (7_to_7 or 8_to_8)
- Role enablement: `enabled_roles` object

### **Immutable Zones**
- ⚠️ **Contract terms** - Require approval workflow to change
- ⚠️ **Historical rates** - Archived when updated

---

## 📦 DOMAIN 4: TIMESHEET MANAGEMENT

### **Entry Points**
- `src/pages/Timesheets.jsx` - Main timesheet listing
- `src/pages/TimesheetDetail.jsx` - Individual timesheet view
- `src/pages/TimesheetAnalytics.jsx` - Analytics dashboard

### **Components**
- `src/components/timesheets/TimesheetCard.jsx` - Timesheet display card
- `src/components/timesheets/GPSIndicator.jsx` - GPS verification indicator
- `src/components/timesheets/AutoApprovalIndicator.jsx` - Auto-approval status

### **Database Tables**
- `timesheets` - Timesheet records
  - **Immutable after approved=true**
  - Fields: id, shift_id, staff_id, clock_in_time, clock_out_time, gps_verified

### **Integration Points**
- GPS verification: Clock-in/out location tracking
- Auto-approval: Automated approval based on GPS + time rules
- Financial locking: Triggers shift financial_locked=true

### **Immutable Zones**
- ⚠️ **Approved timesheets** - Cannot modify, only dispute
- ⚠️ **GPS coordinates** - Audit trail for compliance

---

## 📦 DOMAIN 5: BOOKING MANAGEMENT

### **Entry Points**
- `src/pages/Bookings.jsx` - Main booking listing

### **Database Tables**
- `bookings` - Booking records
  - Fields: id, shift_id, staff_id, status, confirmation_method

### **Integration Points**
- Shift assignment: Links staff to shifts
- Confirmation workflow: pending → confirmed → completed

### **Immutable Zones**
- ⚠️ **Confirmed bookings** - Require cancellation workflow

---

## 📦 DOMAIN 6: FINANCIAL MANAGEMENT

### **Entry Points**
- `src/pages/Invoices.jsx` - Invoice management
- `src/pages/GenerateInvoices.jsx` - Invoice generation
- `src/pages/Payslips.jsx` - Payslip management
- `src/pages/GeneratePayslips.jsx` - Payslip generation
- `src/pages/CFODashboard.jsx` - Financial analytics

### **Database Tables**
- `invoices` - Client invoices
- `payslips` - Staff payslips
- `operational_costs` - Cost tracking

### **Integration Points**
- Shift data: Aggregates completed shifts
- Timesheet data: Actual hours worked
- Rate calculations: Uses client rates and staff pay rates

### **Immutable Zones**
- ⚠️ **Finalized invoices** - Cannot modify, only amend
- ⚠️ **Paid payslips** - Audit trail required

---

## 📦 DOMAIN 7: AUTHENTICATION & AUTHORIZATION

### **Entry Points**
- `src/pages/Login.jsx` - User login
- `src/pages/ResetPassword.jsx` - Password reset

### **API Layer**
- `src/api/supabaseAuth.js` - Auth wrapper
  - `supabaseAuth.signIn(email, password)`
  - `supabaseAuth.signOut()`
  - `supabaseAuth.getCurrentUser()`
- `src/lib/supabase.js` - Supabase client initialization

### **Database Tables**
- `profiles` - User profiles
  - Fields: id, email, user_type, agency_id, client_id, staff_id

### **Integration Points**
- RLS Policies: Row-level security enforcement
- User types: agency_admin, staff_member, client_user, super_admin

### **Immutable Zones**
- ⚠️ **User audit logs** - Cannot delete
- ⚠️ **RLS policies** - Require database migration to change

---

## 📦 DOMAIN 8: NOTIFICATIONS

### **Entry Points**
- `src/pages/NotificationMonitor.jsx` - Notification debugging

### **Components**
- `src/components/notifications/NotificationCenter.jsx` - Notification UI
- `src/components/notifications/NotificationService.jsx` - Notification logic
- `src/components/notifications/EmailTemplates.jsx` - Email templates

### **Database Tables**
- `notification_queue` - Queued notifications

### **Integration Points**
- Email: Resend API integration
- SMS: Twilio integration (future)
- WhatsApp: n8n integration (future)

---

## 📦 DOMAIN 9: BULK OPERATIONS

### **Entry Points**
- `src/pages/BulkShiftCreation.jsx` - Bulk shift creation
- `src/pages/BulkDataImport.jsx` - CSV import for all entities

### **Utilities**
- `src/utils/bulkShifts/` - Bulk shift utilities (see Domain 1)

### **Integration Points**
- Batch inserts: 50 records per batch
- Validation: Pre-insert validation
- Error handling: Partial success handling

---

## � DOMAIN 10: SUPABASE EDGE FUNCTIONS

### **Communication Functions** (7)
- `supabase/functions/send-email/` - Email via Resend API
- `supabase/functions/send-sms/` - SMS via Twilio API
- `supabase/functions/send-whatsapp/` - WhatsApp via n8n/Twilio
- `supabase/functions/whatsapp-master-router/` - WhatsApp message routing + OpenAI
- `supabase/functions/incoming-sms-handler/` - SMS webhook handler
- `supabase/functions/email-automation-engine/` - Automated email workflows
- `supabase/functions/ai-assistant/` - Generic AI assistant (shift extraction, descriptions, validation)

### **Invoice & Payment Functions** (3)
- `supabase/functions/auto-invoice-generator/` - Generate invoices
- `supabase/functions/send-invoice/` - Send invoice emails
- `supabase/functions/payment-reminder-engine/` - Payment reminders

### **Timesheet Functions** (8)
- `supabase/functions/intelligent-timesheet-validator/` - Auto-approve timesheets
- `supabase/functions/auto-timesheet-creator/` - Create timesheets from shifts
- `supabase/functions/extract-timesheet-data/` - OCR timesheet extraction
- `supabase/functions/scheduled-timesheet-processor/` - Batch processing
- `supabase/functions/post-shift-timesheet-reminder/` - Reminder automation
- `supabase/functions/whatsapp-timesheet-handler/` - WhatsApp timesheet submission
- `supabase/functions/auto-timesheet-approval-engine/` - Approval automation
- `supabase/functions/auto-approval-engine/` - Generic approval engine

### **Shift Functions** (7)
- `supabase/functions/shift-status-automation/` - Auto-update shift statuses
- `supabase/functions/urgent-shift-escalation/` - Escalate unfilled shifts
- `supabase/functions/shift-reminder-engine/` - Shift reminders
- `supabase/functions/ai-shift-matcher/` - AI-powered staff matching
- `supabase/functions/validate-shift-eligibility/` - Eligibility validation
- `supabase/functions/shift-verification-chain/` - Multi-step verification
- `supabase/functions/daily-shift-closure-engine/` - Daily shift closure
- `supabase/functions/no-show-detection-engine/` - No-show detection
- `supabase/functions/generateShiftDescription/` - AI shift descriptions

### **Compliance & Validation Functions** (5)
- `supabase/functions/geofence-validator/` - GPS geofence validation
- `supabase/functions/compliance-monitor/` - Compliance tracking
- `supabase/functions/financial-data-validator/` - Financial validation
- `supabase/functions/validate-bulk-import/` - Bulk import validation
- `supabase/functions/extractDocumentDates/` - Extract expiry dates from docs

### **Automation Engines** (7)
- `supabase/functions/smart-escalation-engine/` - Smart escalation logic
- `supabase/functions/client-communication-automation/` - Client comms
- `supabase/functions/staff-daily-digest-engine/` - Staff daily digest
- `supabase/functions/notification-digest-engine/` - Notification batching
- `supabase/functions/critical-change-notifier/` - Critical alerts
- `supabase/functions/enhanced-whatsapp-offers/` - WhatsApp shift offers
- `supabase/functions/care-home-inbound-email/` - Email parsing

### **Onboarding Functions** (4)
- `supabase/functions/welcome-agency/` - Agency welcome email
- `supabase/functions/new-user-signup-handler/` - User signup handler
- `supabase/functions/incomplete-profile-reminder/` - Profile completion reminder
- `supabase/functions/send-agency-admin-invite/` - Admin invitation email

### **API Wrappers**
- `src/api/supabaseFunctions.js` - Frontend wrapper for Edge Functions
  - `invokeEdgeFunction(name, params)` - Generic invoker
  - Individual function exports (sendEmail, sendSMS, etc.)

### **Integration Points**
- **Resend API**: Email delivery (send-email, send-invoice, etc.)
- **Twilio API**: SMS and WhatsApp (send-sms, send-whatsapp)
- **OpenAI API**: AI processing (whatsapp-master-router, ai-shift-matcher)
- **n8n Workflows**: WhatsApp Business Cloud API (free alternative to Twilio)

### **Immutable Zones**
- ⚠️ **Edge Function signatures** - Breaking changes affect frontend
- ⚠️ **Webhook endpoints** - External services depend on these
- ⚠️ **Cron job schedules** - Defined in migrations

---

## 📦 DOMAIN 11: DESIGN SYSTEM

### **Design Tokens**
- `src/styles/staffPortalDesignSystem.js` - Complete design system
  - Color palette (primary, secondary, status, semantic)
  - Typography system (font sizes, weights, line heights)
  - Spacing system (8px base grid)
  - Component sizes (buttons, inputs, badges, icons, avatars)
  - Shadows, breakpoints, utilities

### **Reusable Components**
- `src/components/ui/DesignSystemComponents.jsx` - Design system components
  - `DSButton` - Button component (primary, secondary, success, warning, outline)
  - `DSBadge` - Badge component (critical, important, success, info)
  - `DSCard` - Card component (default, elevated, outlined)
  - `DSInput` - Input component (small, medium, large)
  - `DSMobileHeader` - Mobile header with avatar and notifications
  - `DSComplianceItem` - Compliance status item
  - `DSEarningsCard` - Earnings display card
  - `DSShiftCard` - Shift display card
  - `DSSectionHeader` - Section header with action button

### **Shadcn UI Components** (`src/components/ui/`)
- Immutable third-party components (don't modify directly)
- Badge, Button, Card, Dialog, Input, Select, Table, Tabs, etc.
- Chart components (Recharts integration)
- Toast/Sonner notifications
- Sidebar, Sheet, Dropdown, Popover, etc.

### **Integration Points**
- Tailwind CSS configuration (`tailwind.config.js`)
- Design system tokens used across all pages
- Mobile-first responsive design (breakpoints: 768px, 1024px, 1280px)

### **Immutable Zones**
- ⚠️ **Shadcn UI components** - Update via CLI, don't modify manually
- ⚠️ **Design tokens** - Changes affect entire app styling

---

## 📦 DOMAIN 12: STATE MANAGEMENT & CONTEXTS

### **React Contexts**
- `src/contexts/AuthContext.jsx` - Authentication context
  - `AuthProvider` - Wraps app with auth state
  - `useAuth()` - Hook to access auth state
  - State: user, profile, loading, isAuthenticated
  - Methods: refreshUser()

### **React Query**
- `src/main.jsx` - QueryClient configuration
  - Configured in main.jsx with QueryClientProvider
  - Settings: refetchOnWindowFocus=false, retry=1, staleTime=5min

### **Custom Hooks**
- `src/hooks/useAuth.jsx` - Re-exports AuthContext hook
- `src/hooks/use-mobile.jsx` - Mobile breakpoint detection
  - `useIsMobile()` - Returns true if viewport < 768px

### **Integration Points**
- AuthContext wraps entire app in main.jsx
- QueryClient manages server state caching
- useAuth hook used across all protected pages

---

## �🔧 SHARED UTILITIES

### **Core Utils**
- `src/lib/utils.js` - Tailwind class merging
  - `cn(...inputs)` - Merge Tailwind classes
- `src/utils/index.ts` - Common utilities
  - `createPageUrl(pageName)` - Generate route URLs
- `src/lib/supabase.js` - Supabase client initialization
  - Configured with auto-refresh, session persistence
  - Environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

### **API Layer**
- `src/api/supabaseEntities.js` - Entity CRUD wrappers
  - `SupabaseEntity` class - Generic entity operations
  - Exports: Agency, Staff, Client, Shift, Booking, Timesheet, Invoice, Payslip, etc.
- `src/api/supabaseAuth.js` - Authentication wrapper
  - `supabaseAuth.signIn()`, `signOut()`, `me()`, `signUp()`
- `src/api/base44Client.js` - Compatibility layer (legacy)
  - Provides Base64-like API using Supabase
  - **DO NOT use for new code** - use Supabase directly
- `src/api/integrations.js` - Integration wrappers
  - `Core.UploadFile()`, `Core.CreateFileSignedUrl()`
  - `Core.InvokeLLM()`, `Core.SendEmail()`
- `src/api/supabaseStorage.js` - File storage operations
  - `uploadFile()`, `createSignedUrl()`, `deleteFile()`
- `src/api/agencyService.js` - Agency-specific operations
  - `createAgencyAdminInvitation()`, `resendInvitation()`
- `src/api/profileService.js` - Profile operations

### **UI Components** (`src/components/ui/`)
- Shadcn UI components (immutable - don't modify directly)
- Badge, Button, Card, Dialog, Input, Select, Table, Tabs, etc.
- Chart components (Recharts integration)
- Toast/Sonner notifications

---

## 🚨 CRITICAL IMMUTABLE ZONES

### **Database Schema**
- ⚠️ RLS policies - Require migration
- ⚠️ Indexes - Performance critical
- ⚠️ Foreign keys - Data integrity
- ⚠️ Cron jobs - Defined in `supabase/migrations/20251111210000_setup_cron_jobs.sql`

### **Financial Data**
- ⚠️ Locked shifts (`financial_locked=true`)
- ⚠️ Approved timesheets
- ⚠️ Finalized invoices/payslips

### **Audit Trails**
- ⚠️ `shift_journey_log` - Append-only
- ⚠️ `change_logs` - Append-only
- ⚠️ Compliance records

### **External Integrations**
- ⚠️ Supabase client config (`src/lib/supabase.js`)
- ⚠️ API keys (environment variables)
- ⚠️ Edge Function signatures - Breaking changes affect frontend
- ⚠️ Webhook endpoints - External services (Twilio, Resend, n8n) depend on these
- ⚠️ n8n workflow webhooks - Configured in n8n-workflows/

### **Third-Party Components**
- ⚠️ Shadcn UI components - Update via CLI only
- ⚠️ Design system tokens - Changes affect entire app

---

## 📋 DEPENDENCY RULES

### **1. Pages → Components**
- Pages can import components
- Components should NOT import pages

### **2. Components → Utils**
- Components can import utils
- Utils should NOT import components

### **3. Utils → API**
- Utils can call API layer
- API layer should be pure data access

### **4. Circular Dependencies**
- ❌ NEVER create circular imports
- ✅ Use dependency injection if needed

### **5. Database Access**
- ✅ Always use Supabase client (`src/lib/supabase.js`)
- ❌ Never bypass RLS policies
- ✅ Always filter by `agency_id` for multi-tenant data

### **6. Edge Functions**
- ✅ Use `src/api/supabaseFunctions.js` wrapper for frontend calls
- ❌ Don't call Edge Functions directly from components
- ✅ Handle errors gracefully (Edge Functions may timeout)

### **7. External APIs**
- ✅ Use Edge Functions as proxy for third-party APIs
- ❌ Never expose API keys in frontend code
- ✅ Resend for email, Twilio for SMS, n8n for WhatsApp, OpenAI for AI

---

## 🔄 MIGRATION STATUS

### **Completed**
- ✅ Shift management (Supabase)
- ✅ Staff management (Supabase)
- ✅ Client management (Supabase)
- ✅ Timesheet management (Supabase)
- ✅ Booking management (Supabase)
- ✅ Authentication (Supabase Auth)
- ✅ File storage (Supabase Storage)
- ✅ Edge Functions (44 functions deployed)
- ✅ Email integration (Resend)
- ✅ SMS integration (Twilio)
- ✅ WhatsApp integration (n8n + WhatsApp Business Cloud API)
- ✅ AI integration (OpenAI GPT-4)
- ✅ Design system (Mobile-first)
- ✅ GPS geofencing (geofence-validator)
- ✅ Timesheet automation (intelligent-timesheet-validator)

### **In Progress**
- 🔄 Notification system (partial - digest engine active)
- 🔄 Financial workflows (partial - invoice/payslip generation)
- 🔄 Compliance tracking (Module 2.5)

### **Pending**
- ⏳ Advanced analytics dashboards
- ⏳ Multi-agency super admin features
- ⏳ Mobile app (React Native)

---

## 📝 NOTES

**When Adding New Features:**
1. Check this map for existing utilities
2. Respect immutable zones
3. Follow dependency rules
4. Update this document
5. Check if Edge Function already exists before creating new one
6. Use design system components instead of custom styling

**When Modifying Existing Code:**
1. Check integration points
2. Verify no breaking changes to dependencies
3. Test RLS policies
4. Update documentation
5. Check if Edge Function signature changes affect frontend
6. Verify external webhooks still work (Twilio, Resend, n8n)

**When Deploying:**
1. Deploy Edge Functions: `supabase functions deploy <function-name>`
2. Run migrations: `supabase db push`
3. Verify RLS policies are active
4. Test external integrations (email, SMS, WhatsApp)
5. Check cron jobs are running

---

## 📚 RELATED DOCUMENTATION

- `PROJECT_MASTER_REFERENCE.md` - Overall project structure
- `WHATSAPP_MASTER_PLAN.md` - WhatsApp integration architecture
- `WHATSAPP_AI_ASSISTANT_COMPLETE.md` - WhatsApp AI assistant details
- `WHATSAPP_N8N_IMPLEMENTATION_SUMMARY.md` - n8n workflow setup
- `MODULE_2.2_GPS_CLOCK_IN_TEST_PLAN.md` - GPS geofencing implementation
- `DESIGN_SYSTEM_GUIDE.md` - Design system documentation
- `DESIGN_SYSTEM_SUMMARY.md` - Design system quick reference
- `Complete Database Schema Reference.txt` - Full database schema
- `deploy-all-functions.sh` - Edge Function deployment script
- `DEPLOY_ALL.bat` - Windows deployment script

---

**End of Document**

