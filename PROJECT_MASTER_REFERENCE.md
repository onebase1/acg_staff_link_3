# ACG Staff Link - Master Reference Document

**Last Updated:** 2025-11-13  
**Project Status:** Refactored - Base64 SDK → Supabase Migration Complete  
**Current Phase:** Testing & Validation

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Migration Context](#migration-context)
3. [Architecture](#architecture)
4. [Critical User Journeys](#critical-user-journeys)
5. [Testing Strategy](#testing-strategy)
6. [Reference Information](#reference-information)
7. [Current Testing Focus](#current-testing-focus)

---

## 🎯 Project Overview

### What This Project Is
ACG Staff Link is a **multi-tenant healthcare staffing management platform** that manages the complete lifecycle of shift-based healthcare work:
- **Shift Creation** → **Staff Assignment** → **Completion** → **Invoicing** → **Payment**

### Primary Goal of This Refactor
**Migrate from Base64 SDK to Supabase** for authentication and database operations while maintaining all existing functionality.

### Test Agency
- **Name:** Dominion Healthcare Services Ltd
- **Admin Email:** info@guest-glow.com
- **Admin Password:** Dominion#2025
- **Purpose:** Primary testing environment for all workflows

---

## 🔄 Migration Context

### Sister Project (Reference Implementation)
- **Location:** `C:\Users\gbase\AiAgency\ACG_BASE\acg_latest3copy`
- **Status:** Functioning Base64 SDK implementation
- **Use Case:** Reference for troubleshooting and comparing behavior

### Legacy Archive
- **Location:** `/legacy_archive` folder in current project
- **Contents:** Old Base64-dependent code and documentation
- **Purpose:** Historical reference only - DO NOT USE

### Migration Status
✅ **COMPLETE** - All Base64 dependencies removed  
✅ All functions mapped to Supabase database  
✅ Authentication migrated to Supabase Auth  
✅ Multi-tenant architecture preserved  

---

## 🏗️ Architecture

### Tech Stack
- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Auth:** Supabase Auth (replaces Base64 SDK)
- **Database:** PostgreSQL via Supabase
- **Testing:** Playwright + Custom Hybrid Test Suite

### Key Architectural Patterns

#### 1. Compatibility Layer
**File:** `src/api/base44Client.js`
- Provides Base64-like API using Supabase entities
- Allows gradual migration without breaking existing code
- **DO NOT** use for new code - use Supabase directly

#### 2. Supabase Entities
**File:** `src/api/supabaseEntities.js`
- Wrapper classes for database tables
- Provides CRUD operations with RLS enforcement
- Main entities: Agency, Staff, Client, Shift, Booking, Timesheet, Invoice, Payslip

#### 3. Authentication
**File:** `src/api/supabaseAuth.js`
- Supabase Auth wrapper with Base64-compatible API
- Handles signup, signin, password reset
- Manages user profiles and multi-tenant access

### Database Schema
**Reference:** `Complete Database Schema Reference.txt`
- 20+ tables covering full staffing lifecycle
- Row Level Security (RLS) enforced on all tables
- Multi-tenant isolation via `agency_id`

---

## 🎯 Critical User Journeys

### Journey 1: Shift Creation → Completion → Invoicing
**Reference:** `critical_path_testing_matrix.csv` (Shift Journey Pipeline)

**Steps:**
1. **Receive Care Home Email** → AI parses shift request
2. **Create Shift Record** → Admin creates shift in system
3. **Assign Staff** → Staff assigned and notified
4. **Send Reminders** → 24h and 2h before shift
5. **GPS Clock-In** → Staff clocks in with location validation
6. **Upload Timesheet** → Staff uploads signed timesheet
7. **AI OCR Extraction** → Extract hours/signatures automatically
8. **Auto-Approve** → High-confidence timesheets approved
9. **Mark Completed** → Admin closes shift
10. **Generate Invoice** → Invoice created from approved timesheets
11. **Send to Client** → Email invoice PDF to client
12. **Payment Tracking** → Reminders for overdue invoices

**Status:** ✅ Complete journey working (see `SHIFT_JOURNEY_COMPLETE.md`)

### Journey 2: Staff Invitation → Signup → Portal Access
**Reference:** `STAFF_INVITATION_FLOW.md`

**Steps:**
1. **Admin Invites Staff** → Send invitation email
2. **Staff Receives Email** → Click signup link with pre-filled email
3. **Simplified Signup** → Only password fields (email pre-filled)
4. **Auto-Linking** → Staff record linked to auth user
5. **ProfileSetup** → Complete onboarding (photo, references, etc.)
6. **Portal Access** → Redirect to StaffPortal, ready to accept shifts

**Status:** 🔄 Currently being tested (see task list)

---

## 🧪 Testing Strategy

### Test Framework: Hybrid Approach
**Reference:** `tests/README.md`, `QUICKSTART.md`

**Components:**
1. **Playwright (20%)** - UI critical paths only
2. **Direct Supabase Queries (50%)** - Data validation
3. **Edge Function Invocation (20%)** - Notification system
4. **Monitoring Script (10%)** - Orchestration

**Advantages:**
- ⚡ Fast: 4-5 minutes vs 30+ minutes (pure Playwright)
- 🎯 Reliable: No timing issues or flaky waits
- 📊 Comprehensive: Tests all layers (UI, DB, Functions)

### Test Execution
```bash
# Run all tests
npm run test:hybrid

# Individual test suites
npm run test:data          # Data validation (10s)
npm run test:journey       # Shift journey (30s)
npm run test:notifications # Notifications (45s)
npm run test:analytics     # Analytics (20s)
npm run test:ui            # Playwright UI (3 min)
```

### Critical Test Matrix
**File:** `critical_path_testing_matrix.csv`
- 46 test cases across 6 pipelines
- Covers: Shift Journey, Automation, Financial Integrity, Communication, Data & Analytics, External Integrations

---

## 📚 Reference Information

### Important Files
- **Master Reference:** This file (`PROJECT_MASTER_REFERENCE.md`)
- **Test Matrix:** `critical_path_testing_matrix.csv`
- **Test Guide:** `tests/README.md`, `QUICKSTART.md`
- **Staff Invitation:** `STAFF_INVITATION_FLOW.md`
- **Shift Journey:** `SHIFT_JOURNEY_COMPLETE.md`
- **System Summary:** `COMPLETE_SYSTEM_SUMMARY.md`

### Supabase Configuration
- **Project URL:** https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf
- **Database:** PostgreSQL with RLS enabled
- **Edge Functions:** 15+ deployed functions for automation
- **Storage:** File uploads for timesheets, compliance docs

### Environment Variables
```bash
VITE_SUPABASE_URL=https://rzzxxkppkiasuouuglaf.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_KEY=[your-service-key]  # Optional for tests
```

---

## 🔍 Current Testing Focus

### Active: Staff Invitation Flow Testing
**Document:** `STAFF_INVITATION_FLOW.md`

**Test Stages:**
- [ ] Admin sends invitation
- [ ] Email received with correct link
- [ ] Signup page pre-fills email
- [ ] Simplified form (3 fields only)
- [ ] Account creation without confirmation
- [ ] Database linking (staff.user_id)
- [ ] Auto-redirect to ProfileSetup
- [ ] Complete onboarding
- [ ] Status update to 'active'
- [ ] Access StaffPortal

**Next:** Complete end-to-end testing, then move to next critical journey

---

## 🚨 Known Issues & Considerations

### Supabase Email Confirmation
- **Setting:** Email confirmation can be disabled in Supabase Dashboard
- **Location:** Authentication → Providers → Email → Toggle OFF "Confirm email"
- **Impact:** Invited users can sign in immediately without email confirmation

### Documentation Cleanup Needed
- **Issue:** 70+ .md files in project root (many migration-related)
- **Action:** Archive outdated migration docs to `/archive` folder
- **Keep:** Current operational docs, test guides, reference materials

---

## 📞 Support & Troubleshooting

### For AI Assistants Working on This Project
1. **Always read this file first** to understand context
2. **Check sister project** (`acg_latest3copy`) for reference behavior
3. **Use test matrix** (`critical_path_testing_matrix.csv`) for test coverage
4. **Follow test strategy** (hybrid approach, not pure Playwright)
5. **Respect multi-tenancy** - always filter by `agency_id`

### Common Pitfalls
- ❌ Don't use Base64 SDK code (it's removed)
- ❌ Don't create new files without explicit request
- ❌ Don't skip RLS checks (security critical)
- ✅ Do use Supabase directly for new code
- ✅ Do test with Dominion Agency
- ✅ Do validate multi-tenant isolation

---

**End of Master Reference Document**

