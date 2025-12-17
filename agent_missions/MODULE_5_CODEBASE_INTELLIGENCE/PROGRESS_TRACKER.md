# Module 5: Codebase Intelligence - Progress Tracker

**Last Updated:** 2025-12-16 (Initial)
**Status:** 🔴 NOT STARTED
**Current Phase:** Phase 1 (Discovery)
**Overall Completion:** 0%

---

## 📊 PHASE 1: COMPREHENSIVE DISCOVERY (0% Complete)

### Sub-Phase 1.1: Frontend Inventory (0/4 agents complete)

#### Agent A: React Pages Inventory
- [ ] Scan all files in `src/pages/**/*.jsx`
- [ ] Catalog page name, route, purpose
- [ ] Identify manual actions (buttons requiring clicks)
- [ ] List edge function calls
- [ ] List database queries
- [ ] Output: `data/REACT_PAGES_INVENTORY.json`
- **Status:** NOT STARTED
- **Estimated Time:** 15 minutes

#### Agent B: React Components Inventory
- [ ] Scan all files in `src/components/**/*.jsx`
- [ ] Catalog component name, purpose, props
- [ ] Identify edge function calls
- [ ] List database queries
- [ ] Check if used (imported) anywhere
- [ ] Output: `data/REACT_COMPONENTS_INVENTORY.json`
- **Status:** NOT STARTED
- **Estimated Time:** 15 minutes

#### Agent C: SuperAdmin Pages Special Audit
- [ ] Focus on `src/pages/*Admin*.jsx` files
- [ ] List admin-only features
- [ ] Identify manual triggers/tools
- [ ] Find training/documentation pages
- [ ] Catalog forgotten features
- [ ] Output: `data/SUPERADMIN_FEATURES_INVENTORY.json`
- **Status:** NOT STARTED
- **Estimated Time:** 15 minutes

#### Agent D: Routes & Navigation Inventory
- [ ] Scan routing configuration (App.jsx, router files)
- [ ] Map all accessible URLs
- [ ] Identify protected routes (role-based)
- [ ] Find orphaned pages (no route to them)
- [ ] Output: `data/ROUTES_INVENTORY.json`
- **Status:** NOT STARTED
- **Estimated Time:** 10 minutes

**Sub-Phase 1.1 Total:** 0/4 agents, 0/55 minutes

---

### Sub-Phase 1.2: Backend Inventory (0/4 agents complete)

#### Agent E: Edge Functions Inventory
- [ ] Scan `supabase/functions/**/index.ts` (60+ functions)
- [ ] Catalog function name, purpose, description
- [ ] Classify trigger type: Manual, Cron, Webhook, API, Database Trigger
- [ ] List dependencies (calls to other functions)
- [ ] Check last deployment date
- [ ] Output: `data/EDGE_FUNCTIONS_INVENTORY.json`
- **Status:** NOT STARTED
- **Estimated Time:** 20 minutes

#### Agent F: Database Schema Inventory
- [ ] Query `information_schema.tables` for all tables
- [ ] Query `information_schema.columns` for all columns
- [ ] List column types, constraints, defaults
- [ ] Identify JSONB columns and document schemas
- [ ] List all indexes, primary keys, foreign keys
- [ ] List RLS policies
- [ ] Output: `data/DATABASE_SCHEMA_INVENTORY.json`
- **Status:** NOT STARTED
- **Estimated Time:** 15 minutes

#### Agent G: pg_cron Jobs Inventory
- [ ] Query `cron.job` table for all scheduled jobs
- [ ] Get job schedule (cron expression)
- [ ] Check execution history (`cron.job_run_details`)
- [ ] Identify last run time, success/failure
- [ ] Flag inactive jobs (not run in 7 days)
- [ ] Output: `data/CRON_JOBS_INVENTORY.json`
- **Status:** NOT STARTED
- **Estimated Time:** 10 minutes

#### Agent H: Database Functions & Triggers Inventory
- [ ] Query `pg_proc` for all stored procedures
- [ ] List database triggers (`pg_trigger`)
- [ ] Identify unused functions (never called)
- [ ] Check trigger usage (which tables)
- [ ] Output: `data/DB_FUNCTIONS_TRIGGERS_INVENTORY.json`
- **Status:** NOT STARTED
- **Estimated Time:** 10 minutes

**Sub-Phase 1.2 Total:** 0/4 agents, 0/55 minutes

---

### Sub-Phase 1.3: Integration & Configuration Inventory (0/2 agents complete)

#### Agent I: External Services Inventory
- [ ] Scan for Twilio usage (search codebase for "TWILIO")
- [ ] Scan for Resend usage (search for "RESEND")
- [ ] Scan for OpenAI usage (search for "OPENAI")
- [ ] Scan for n8n webhooks (search for "n8n")
- [ ] List all external API endpoints
- [ ] Output: `data/EXTERNAL_SERVICES_INVENTORY.json`
- **Status:** NOT STARTED
- **Estimated Time:** 10 minutes

#### Agent J: Environment Variables Inventory
- [ ] Scan codebase for `Deno.env.get()` calls
- [ ] Scan codebase for `process.env` calls
- [ ] List all env variables used
- [ ] Check Supabase secrets (which are set)
- [ ] Identify unused env variables
- [ ] Output: `data/ENV_VARIABLES_INVENTORY.json`
- **Status:** NOT STARTED
- **Estimated Time:** 10 minutes

**Sub-Phase 1.3 Total:** 0/2 agents, 0/20 minutes

---

## 📊 PHASE 2: RELATIONSHIP MAPPING (0% Complete)

### Sub-Phase 2.1: Call Graph Analysis (0/3 agents complete)

#### Agent K: Page → Function Mapping
- [ ] For each React page, extract `supabase.functions.invoke()` calls
- [ ] Map page name → edge function names
- [ ] Identify direct database queries (supabase.from())
- [ ] Create visual call graph
- [ ] Output: `data/PAGE_FUNCTION_MAP.json`
- **Status:** NOT STARTED
- **Dependencies:** Needs Agent A & E complete
- **Estimated Time:** 20 minutes

#### Agent L: Function → Database Mapping
- [ ] For each edge function, extract database queries
- [ ] Map function name → tables accessed
- [ ] Classify as READ, WRITE, or BOTH
- [ ] Count queries per function
- [ ] Output: `data/FUNCTION_DATABASE_MAP.json`
- **Status:** NOT STARTED
- **Dependencies:** Needs Agent E & F complete
- **Estimated Time:** 20 minutes

#### Agent M: Dependency Graph
- [ ] Map which functions call other functions
- [ ] Create dependency tree
- [ ] Identify circular dependencies
- [ ] Find dead-end functions (never called)
- [ ] Output: `data/FUNCTION_DEPENDENCY_GRAPH.json`
- **Status:** NOT STARTED
- **Dependencies:** Needs Agent E complete
- **Estimated Time:** 15 minutes

**Sub-Phase 2.1 Total:** 0/3 agents, 0/55 minutes

---

### Sub-Phase 2.2: Orphaned Code Detection (0/3 agents complete)

#### Agent N: Unused Functions Detector
- [ ] Cross-reference edge functions with PAGE_FUNCTION_MAP
- [ ] Cross-reference with CRON_JOBS_INVENTORY
- [ ] Cross-reference with FUNCTION_DEPENDENCY_GRAPH
- [ ] Flag functions never called anywhere
- [ ] Estimate: Which can be safely deleted?
- [ ] Output: `data/ORPHANED_FUNCTIONS.json`
- **Status:** NOT STARTED
- **Dependencies:** Needs Phase 2.1 complete
- **Estimated Time:** 15 minutes

#### Agent O: Unused Database Columns Detector
- [ ] Cross-reference columns with FUNCTION_DATABASE_MAP
- [ ] Cross-reference with React component queries
- [ ] Cross-reference with migration files (check if recently added)
- [ ] Flag columns never read or written
- [ ] Output: `data/ORPHANED_DATABASE_COLUMNS.json`
- **Status:** NOT STARTED
- **Dependencies:** Needs Agent F & L complete
- **Estimated Time:** 20 minutes

#### Agent P: Unused React Components Detector
- [ ] Cross-reference components with page imports
- [ ] Cross-reference with other component imports
- [ ] Search codebase for component usage
- [ ] Flag components never imported
- [ ] Output: `data/ORPHANED_REACT_COMPONENTS.json`
- **Status:** NOT STARTED
- **Dependencies:** Needs Agent A & B complete
- **Estimated Time:** 15 minutes

**Sub-Phase 2.2 Total:** 0/3 agents, 0/50 minutes

---

## 📊 PHASE 3: AUTOMATION GAP ANALYSIS (0% Complete)

### Sub-Phase 3.1: Manual vs Should-Be-Automated (0/3 agents complete)

#### Agent Q: Manual Trigger Audit
- [ ] Scan React pages for button `onClick` handlers
- [ ] Identify admin-only manual actions
- [ ] Classify automation potential:
  - 🔴 High: Should run on schedule (daily, hourly)
  - 🟡 Medium: Could be event-driven (database trigger)
  - 🟢 Low: Legitimately manual (requires human judgment)
- [ ] Output: `data/MANUAL_TRIGGERS_AUDIT.json`
- **Status:** NOT STARTED
- **Dependencies:** Needs Agent A & C complete
- **Estimated Time:** 25 minutes

#### Agent R: Missing Cron Jobs Detector
- [ ] List edge functions with automation-suggesting names:
  - *-reminder, *-engine, *-monitor, *-automation, *-processor
- [ ] Cross-reference with CRON_JOBS_INVENTORY
- [ ] Flag functions that should be scheduled but aren't
- [ ] Suggest cron schedules based on function name/purpose
- [ ] Output: `data/MISSING_CRON_JOBS.json`
- **Status:** NOT STARTED
- **Dependencies:** Needs Agent E & G complete
- **Estimated Time:** 15 minutes

#### Agent S: Event-Driven Opportunities
- [ ] Identify operations that should trigger on database events
- [ ] Check for missing database triggers
- [ ] Suggest webhook opportunities (e.g., Twilio, Resend)
- [ ] Map event → action pairs
- [ ] Output: `data/EVENT_DRIVEN_OPPORTUNITIES.json`
- **Status:** NOT STARTED
- **Dependencies:** Needs Agent E & H complete
- **Estimated Time:** 20 minutes

**Sub-Phase 3.1 Total:** 0/3 agents, 0/60 minutes

---

### Sub-Phase 3.2: Business Process Automation Analysis (0/2 agents complete)

#### Agent T: Healthcare Workflow Analyzer
- [ ] Map complete shift lifecycle:
  1. Shift created
  2. Staff notified
  3. Staff accepts
  4. Pre-shift reminder
  5. Clock-in
  6. Clock-out reminder
  7. Clock-out
  8. Timesheet created
  9. Timesheet approved
  10. Invoice generated
  11. Invoice sent
  12. Payment received
- [ ] For each step, identify: Manual or Automated?
- [ ] Flag manual steps that should be automated
- [ ] Suggest automation implementation
- [ ] Output: `data/SHIFT_WORKFLOW_AUTOMATION.json`
- **Status:** NOT STARTED
- **Dependencies:** Needs Phase 1 & 2 complete
- **Estimated Time:** 30 minutes

#### Agent U: Notification Automation Analyzer
- [ ] List all notification types (email, SMS, WhatsApp)
- [ ] Classify: Manual trigger vs Automated
- [ ] Identify missing notification triggers:
  - Staff forgot to clock out → Reminder
  - Invoice overdue → Payment reminder
  - Document expiring soon → Renewal reminder
- [ ] Suggest automation rules
- [ ] Output: `data/NOTIFICATION_AUTOMATION_ANALYSIS.json`
- **Status:** NOT STARTED
- **Dependencies:** Needs Agent E complete
- **Estimated Time:** 25 minutes

**Sub-Phase 3.2 Total:** 0/2 agents, 0/55 minutes

---

## 📊 PHASE 4: INTELLIGENCE DASHBOARD CREATION (0% Complete)

### Sub-Phase 4.1: Inventory Dashboard (0% complete)

#### Create: src/pages/SuperAdminCodebaseIntelligence.jsx
- [ ] Create React component with tabs
- [ ] Tab 1: Overview (health score, metrics)
- [ ] Tab 2: Edge Functions (list, trigger types, deploy buttons)
- [ ] Tab 3: Cron Jobs (schedules, status, history)
- [ ] Tab 4: Database (tables, columns, health)
- [ ] Tab 5: Orphaned Code (unused functions/components/columns)
- [ ] Tab 6: Automation Gaps (manual triggers, missing crons)
- [ ] Tab 7: Business Workflows (shift lifecycle map)
- [ ] Add to routing configuration
- [ ] Test dashboard functionality
- **Status:** NOT STARTED
- **Dependencies:** Needs all Phase 1-3 JSON files
- **Estimated Time:** 2 hours

**Sub-Phase 4.1 Total:** 0% complete, 0/2 hours

---

### Sub-Phase 4.2: Real-Time Monitoring (0% complete)

#### Create: supabase/functions/codebase-intelligence-monitor/index.ts
- [ ] Create edge function
- [ ] Query database for tables/columns/row counts
- [ ] Check cron job execution history
- [ ] Monitor edge function deployment status
- [ ] Update usage statistics
- [ ] Flag new orphaned code
- [ ] Store results in `codebase_intelligence` table
- [ ] Deploy function
- [ ] Schedule cron job (hourly)
- **Status:** NOT STARTED
- **Dependencies:** Needs Phase 1-3 complete
- **Estimated Time:** 1 hour

**Sub-Phase 4.2 Total:** 0% complete, 0/1 hour

---

## 📊 PHASE 5: AUTOMATION IMPLEMENTATION (0% Complete)

### Sub-Phase 5.1: Priority Automations (0% complete)

#### Create Missing Cron Jobs
- [ ] Based on `MISSING_CRON_JOBS.json`, create cron jobs for:
  - [ ] Post-shift timesheet creation automation
  - [ ] Shift completion automation
  - [ ] Staff rating reminders
  - [ ] Document expiry checks
  - [ ] License renewal reminders
  - [ ] Invoice generation automation
  - [ ] Payment matching automation
  - [ ] Daily metrics calculation
  - [ ] Weekly reports generation
- [ ] Deploy each cron job
- [ ] Test execution
- **Status:** NOT STARTED
- **Dependencies:** Needs Agent R complete
- **Estimated Time:** 2 hours

**Sub-Phase 5.1 Total:** 0% complete, 0/2 hours

---

### Sub-Phase 5.2: Database Cleanup (0% complete)

#### Archive Unused Columns
- [ ] Based on `ORPHANED_DATABASE_COLUMNS.json`:
- [ ] Create migration to rename unused columns (add `archived_` prefix)
- [ ] Add comments explaining why archived
- [ ] Run migration
- [ ] Verify no breakage
- **Status:** NOT STARTED
- **Dependencies:** Needs Agent O complete
- **Estimated Time:** 30 minutes

#### Delete Orphaned Functions
- [ ] Based on `ORPHANED_FUNCTIONS.json`:
- [ ] Review list with user for confirmation
- [ ] Delete confirmed unused edge functions
- [ ] Remove from deployment scripts
- [ ] Verify no breakage
- **Status:** NOT STARTED
- **Dependencies:** Needs Agent N complete
- **Estimated Time:** 30 minutes

**Sub-Phase 5.2 Total:** 0% complete, 0/1 hour

---

## 📊 PHASE 6: SELF-MAINTAINING SYSTEM (0% Complete)

#### Create: supabase/functions/codebase-intelligence-updater/index.ts
- [ ] Create edge function
- [ ] Re-scan all files for changes
- [ ] Update inventory JSONs
- [ ] Flag new orphaned code
- [ ] Alert if automation gaps introduced
- [ ] Send daily summary email to admin
- [ ] Deploy function
- [ ] Schedule cron job (daily)
- **Status:** NOT STARTED
- **Dependencies:** Needs all previous phases
- **Estimated Time:** 1 hour

#### Configure Alert Rules
- [ ] New edge function without cron → Alert
- [ ] New manual trigger → Suggest automation
- [ ] Column unused 30 days → Flag for review
- [ ] Function fails 3x → Alert
- **Status:** NOT STARTED
- **Estimated Time:** 30 minutes

**Phase 6 Total:** 0% complete, 0/1.5 hours

---

## 📊 OVERALL PROGRESS

| Phase | Status | Agents | Time Est. | Time Spent | Progress |
|-------|--------|--------|-----------|------------|----------|
| Phase 1 | 🔴 Not Started | 0/10 | 2 hours | 0 | 0% |
| Phase 2 | 🔴 Not Started | 0/6 | 2 hours | 0 | 0% |
| Phase 3 | 🔴 Not Started | 0/5 | 2 hours | 0 | 0% |
| Phase 4 | 🔴 Not Started | 0/2 | 3 hours | 0 | 0% |
| Phase 5 | 🔴 Not Started | N/A | 3 hours | 0 | 0% |
| Phase 6 | 🔴 Not Started | N/A | 1.5 hours | 0 | 0% |
| **TOTAL** | **0%** | **0/23** | **13.5 hours** | **0** | **0%** |

---

## 🔄 CONTINUATION MARKERS

**Last Agent Completed:** None (not started)
**Current Agent:** N/A
**Next Task:** Phase 1, Agent A (React Pages Inventory)

**Files Modified This Session:**
- None yet

**JSON Files Created:**
- None yet

---

**Last Updated By:** Claude Code (Initial Setup)
**Timestamp:** 2025-12-16
**Next Agent:** Start with Phase 1, Agent A
