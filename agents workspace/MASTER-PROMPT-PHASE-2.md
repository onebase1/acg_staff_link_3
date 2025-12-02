# MASTER PROMPT OPTIMIZATION SUMMARY
## Phase 2 Autonomous Agency Operations - Module Architecture

**Last Updated:** December 2, 2025  
**Project:** ACG StaffLink - Agency Staffing Platform  
**Phase:** 2 (Autonomous Operations Build)  
**Status:** Ready for Agent Execution

---

## QUICK REFERENCE: MODULE OVERVIEW

### Module 1: Client Portal
**File:** `Module-1-Client-Portal.md`  
**Time:** 11-13 hours  
**Complexity:** Medium  
**Impact:** HIGH (client experience)  

**Deliverables:**
- RBAC system (4 roles: Ops Manager, Finance Manager, Facility Coordinator, View-Only)
- Shift creation form + bulk upload
- 5-star rating system (4 dimensions)
- Real-time notification hub + preferences
- Dashboard analytics
- Integration with Module 3 scoring

**Key Files to Create/Modify:**
- `middleware/clientAuth.js` (RBAC)
- `pages/client/ShiftCreation.jsx`
- `pages/client/ShiftRating.jsx`
- `pages/client/NotificationCenter.jsx`
- `api/client/*.js` (all endpoints)
- Database migrations (ClientRating, ClientNotification tables)

**Success Metric:** Clients rate portal experience 9+/10; 60% rating completion rate

---

### Module 2: Client Notifications
**File:** `Module-2-Notifications.md`  
**Time:** 12-14 hours  
**Complexity:** Medium-High  
**Impact:** HIGH (engagement + non-spam strategy)  

**Deliverables:**
- Audit of all existing notifications → `NOTIFICATION_AUDIT.md`
- Mermaid shift journey diagram → `SHIFT_JOURNEY_MERMAID.md`
- Preference center (client controls what they receive)
- Email templates (8+ types)
- SMS/WhatsApp integration (Twilio)
- Notification queue system (reliability)
- Best practices gap analysis

**Key Files to Create/Modify:**
- `services/emailTemplates.js` (all templates)
- `services/emailResend.js` (Resend integration)
- `services/smsService.js` (Twilio)
- `services/notificationQueue.js` (event-driven)
- `services/notificationWorker.js` (consumer/sender)
- `pages/client/NotificationPreferences.jsx`
- Database migrations (ClientNotificationPreference, NotificationLog, NotificationQueue)

**Success Metric:** 70% open rate on critical notifications; 0 spam complaints

---

### Module 3: Scoring & Algorithms
**File:** `Module-3-Scoring-Algorithms.md`  
**Time:** 11-15 hours  
**Complexity:** HIGH  
**Impact:** CRITICAL (business logic foundation)  

**Deliverables:**
- Staff scoring system (6 components, weighted 0-100)
- Client scoring system (5 components, weighted 0-100)
- Shift-staff matching algorithm (deterministic)
- Scoring audit log (immutable, GDPR-compliant)
- Integration with Module 1 ratings & Module 2 notifications
- Database migrations + backfill strategy

**Key Files to Create/Modify:**
- `services/staffScoringService.js`
- `services/clientScoringService.js`
- `services/shiftMatchingService.js`
- `api/scoring/*.js` (all endpoints)
- Database migrations (Staff score fields, Client score fields, ScoringAuditLog, MatchingLog, StaffPointsLedger, ClientPointsLedger)
- Constants: `constants/scoringWeights.js`, `constants/scoringThresholds.js`

**Success Metric:** Staff score 90+ have 15% higher fill rate; zero calculation errors; < 500ms per entity

---

### Module 4: AI Chatbot (Phase 1: MVP Text-Only)
**File:** `Module-4-AI-Chatbot.md`  
**Time:** 11-15 hours  
**Complexity:** HIGH  
**Impact:** VERY HIGH (24/7 shift booking = "wow" feature)  

**Deliverables:**
- Client verification system (phone-based, security questions)
- Retell AI integration (WhatsApp text)
- n8n workflows (Handle_Shift_Booking, Handle_FAQ, Escalate_To_Human)
- Webhook handlers (Retell → Backend API)
- Conversation logging (GDPR-compliant)
- FAQ database + chatbot system prompt

**Key Files to Create/Modify:**
- `services/retellAuth.js` (phone verification)
- `api/retell/webhook/*.js` (4 webhook endpoints)
- `db/migrations/clientPhoneVerification.js`
- `db/migrations/clientConversation.js`
- n8n workflows (JSON definition files)
- `constants/retellPrompt.js` (system prompt)

**Success Metric:** 50% of urgent shift inquiries booked via chatbot; 85%+ intent recognition accuracy

---

## PRIORITY & SEQUENCING

**Recommended Build Order:**

```
TIER 1 - BUILD FIRST (Foundation)
├─ Module 3: Scoring Algorithms (11-15 hrs)
│  └─ Reason: Other modules depend on scoring data
│  └─ Create staff_score, client_score fields
│  └─ Set up feature flags
│  └─ Manual scoring for now (no automation)
│
├─ Module 1: Client Portal (11-13 hrs)
│  └─ Reason: Provides UI for ratings (feeds Module 3)
│  └─ Shift creation form
│  └─ Rating system (triggers scoring)
│  └─ Notification hub
│
└─ Module 2: Notifications (12-14 hrs)
   └─ Reason: Uses data from Modules 1 & 3
   └─ Email templates
   └─ Preference system
   └─ Queue infrastructure

TIER 2 - BUILD NEXT (Advanced)
└─ Module 4: AI Chatbot (11-15 hrs)
   └─ Reason: Uses shift creation (Module 1) + scoring (Module 3)
   └─ Retell integration
   └─ n8n workflows
   └─ Conversation logging

TOTAL SEQUENTIAL TIME: 45-57 hours
PARALLEL OPPORTUNITY: Modules 1 & 2 can build simultaneously after Module 3
COMPRESSED TIME: 25-35 hours if 2 agents working in parallel
```

---

## CROSS-MODULE DEPENDENCIES

```
Module 1 (Client Portal)
├─ Depends on: Database schema exists
├─ Feeds: Module 2 (notification events), Module 3 (rating data)
└─ Input from: Module 4 (urgent shifts via chatbot)

Module 2 (Notifications)
├─ Depends on: Module 1 (rating/shift events)
├─ Feeds: Module 4 (sends confirmations via chat)
└─ Uses: Resend, Twilio (already configured ✓)

Module 3 (Scoring)
├─ Depends on: No other modules
├─ Feeds: Module 1 (display scores), Module 4 (matching)
└─ Input from: Module 1 (ratings), Module 2 (notification sends)

Module 4 (Chatbot)
├─ Depends on: Module 1 (shift creation API), Module 3 (matching)
├─ Feeds: Module 2 (send confirmations)
└─ Uses: n8n (needs setup), Retell AI (configured ✓)
```

---

## FILE STRUCTURE (RECOMMENDED)

```
/project-root
├── /agents_workspace/
│   ├── Module-1-Client-Portal.md ✓ CREATED
│   ├── Module-2-Notifications.md ✓ CREATED
│   ├── Module-3-Scoring-Algorithms.md ✓ CREATED
│   ├── Module-4-AI-Chatbot.md ✓ CREATED
│   ├── MASTER_PROMPT.md (THIS FILE)
│   │
│   ├── /Module-1-Artifacts/
│   │   ├── DISCOVERY_REPORT.md (generated by agent)
│   │   ├── RBAC_MATRIX.md
│   │   └── IMPLEMENTATION_NOTES.md
│   │
│   ├── /Module-2-Artifacts/
│   │   ├── NOTIFICATION_AUDIT.md (generated by agent)
│   │   ├── SHIFT_JOURNEY_MERMAID.md (generated by agent)
│   │   ├── REDUNDANCY_REPORT.md
│   │   ├── BEST_PRACTICES_GAP.md
│   │   └── IMPLEMENTATION_NOTES.md
│   │
│   ├── /Module-3-Artifacts/
│   │   ├── ALGORITHM_AUDIT.md (generated by agent)
│   │   ├── SCORING_FORMULA_BREAKDOWN.md
│   │   ├── MATCHING_ALGORITHM_TESTS.md
│   │   └── IMPLEMENTATION_NOTES.md
│   │
│   └── /Module-4-Artifacts/
│       ├── CHATBOT_READINESS_REPORT.md (generated by agent)
│       ├── RETELL_SYSTEM_PROMPT.txt
│       ├── N8N_WORKFLOW_DEFINITIONS.json
│       └── IMPLEMENTATION_NOTES.md
│
├── /src/api/
│   ├── /client/
│   │   ├── shifts.js (Module 1)
│   │   ├── ratings.js (Module 1)
│   │   ├── notifications.js (Module 2)
│   │   └── notification-preferences.js (Module 2)
│   │
│   ├── /scoring/
│   │   ├── staff.js (Module 3)
│   │   ├── client.js (Module 3)
│   │   └── matching.js (Module 3)
│   │
│   └── /retell/
│       ├── webhook/conversation-started.js (Module 4)
│       ├── webhook/message.js (Module 4)
│       ├── webhook/conversation-ended.js (Module 4)
│       └── webhook/escalate.js (Module 4)
│
├── /src/services/
│   ├── emailTemplates.js (Module 2)
│   ├── emailResend.js (Module 2)
│   ├── smsService.js (Module 2)
│   ├── notificationQueue.js (Module 2)
│   ├── notificationWorker.js (Module 2)
│   ├── staffScoringService.js (Module 3)
│   ├── clientScoringService.js (Module 3)
│   ├── shiftMatchingService.js (Module 3)
│   └── retellAuth.js (Module 4)
│
├── /src/pages/client/
│   ├── ShiftCreation.jsx (Module 1)
│   ├── ShiftRating.jsx (Module 1)
│   ├── NotificationCenter.jsx (Module 1 & 2)
│   └── NotificationPreferences.jsx (Module 2)
│
├── /src/components/
│   ├── RatingStars.jsx (Module 1)
│   └── NotificationPreferenceItem.jsx (Module 2)
│
├── /src/middleware/
│   ├── clientAuth.js (RBAC - Module 1)
│   └── retellAuth.js (Auth - Module 4)
│
├── /src/constants/
│   ├── scoringWeights.js (Module 3)
│   ├── scoringThresholds.js (Module 3)
│   ├── smsTemplates.js (Module 2)
│   └── retellPrompt.js (Module 4)
│
├── /db/migrations/
│   ├── 001_module1_client_portal.sql
│   ├── 002_module2_notifications.sql
│   ├── 003_module3_scoring.sql
│   └── 004_module4_chatbot.sql
│
└── /n8n/workflows/
    ├── Handle_Shift_Booking.json (Module 4)
    ├── Handle_FAQ.json (Module 4)
    └── Escalate_To_Human.json (Module 4)
```

---

## KEY DECISION POINTS (For Your Team)

**Before Agent Starts:**

1. **Module 3 Scoring Formula**
   - ✅ APPROVED: Weighted scoring with audit log
   - Weights can be tuned post-launch
   - Existing algorithm: Review if it exists

2. **Module 1 Client Portal**
   - ✅ APPROVED: 4 roles RBAC system
   - ✅ APPROVED: 5-star rating system
   - Need decision: Should clients see all staff, or only staff they've hired?

3. **Module 2 Notifications**
   - ✅ APPROVED: Multi-channel (email, SMS, WhatsApp)
   - ✅ APPROVED: Preference center
   - Need decision: Max notifications per day? (default: unlimited)

4. **Module 4 Chatbot (Phase 1)**
   - ✅ APPROVED: Text-only (WhatsApp) MVP
   - ✅ APPROVED: Phone calls deferred to Phase 2
   - Need decision: Allow auto-booking or require manual confirmation?
   - Need decision: How many verification attempts before escalation? (default: 3)

---

## TESTING & QUALITY GATES

**Before Code Merge (Each Module):**

```
Module 1:
- [ ] All 4 RBAC roles tested (permission matrix 100% coverage)
- [ ] Shift creation: Success + error cases
- [ ] Rating: 1-5 stars all valid
- [ ] Notifications: Appear in hub correctly
- [ ] Database: New tables created + migrations reversible
- [ ] Performance: Dashboard loads < 2 seconds

Module 2:
- [ ] Each notification type sends correctly (≥10 tests)
- [ ] Preferences work: Disable → no email sent
- [ ] Unsubscribe link works
- [ ] Rate limiting enforced (max 5/day)
- [ ] Quiet hours respected
- [ ] Retry logic: 3 attempts + alert created

Module 3:
- [ ] Staff score calculation: 5 test cases
- [ ] Client score calculation: 5 test cases
- [ ] Score updates within 5 seconds
- [ ] Audit log created for every change
- [ ] Matching algorithm: Top candidate verified
- [ ] Performance: Score recalc < 500ms

Module 4:
- [ ] Client verification: All 3 methods tested
- [ ] Shift booking flow: Happy path + error path
- [ ] FAQ lookup: Confidence scoring
- [ ] Escalation: Workflow triggers correctly
- [ ] Conversation logged with transcript
- [ ] Webhook URLs reachable
```

---

## ROLLBACK STRATEGY (UNIVERSAL)

**For Each Module:**
1. **Feature Flag** - Disable without redeploying code
2. **Database** - All migrations reversible (no data loss)
3. **Kill Switch** - API returns neutral response if flag disabled
4. **Audit Log** - Never delete logs; supports compliance

**Example:**
```
Feature disabled: features.module1_client_portal_enabled = false
→ Client portal page returns "Feature not available"
→ API endpoints return 503 Service Unavailable
→ No data loss, can re-enable instantly
```

---

## MONITORING & ALERTS (Post-Launch)

**Critical Metrics to Track:**

```
Module 1:
- Portal login rate (should +40% week 1)
- Rating completion rate (target: >60%)
- Shift creation time (target: <2 min)
- Permission errors (should be 0)

Module 2:
- Email open rate (target: >70%)
- SMS delivery rate (target: >95%)
- Bounce rate (target: <5%)
- Unsubscribe rate (target: <2%)

Module 3:
- Score calculation latency (target: <500ms)
- Audit log errors (should be 0)
- Matching algorithm accuracy (target: >95%)
- Staff score variance (track monthly)

Module 4:
- Chatbot availability (target: 99.9%)
- Intent recognition accuracy (target: >85%)
- Resolution rate (target: >70% auto-resolved)
- Escalation rate (target: <30%)
- Conversation duration (target: <5 min)
```

---

## AGENT RESPONSIBILITIES

**For Each Module Assigned:**

1. **Discovery Phase**
   - Review existing code
   - Create audit/discovery document
   - Flag blockers or dependencies
   - Estimate time accurately

2. **Implementation Phase**
   - Code according to specifications
   - No external dependencies until specified
   - Feature flags on all new features
   - Audit logging on sensitive operations

3. **Testing Phase**
   - Run provided test checklists
   - Document edge cases
   - Performance testing (if applicable)

4. **Documentation Phase**
   - Create IMPLEMENTATION_NOTES.md
   - Update API docs
   - List any manual setup needed
   - Provide rollback instructions

---

## COMMUNICATION PROTOCOL

**Agent → Project Owner:**

After each phase of module work:
- ✅ What worked
- ❌ What didn't (and why)
- 🚀 Ready to proceed to next phase? (Yes/No/Blocked)
- ⏱️ Estimated time for next phase
- 🔒 Any security/compliance questions

**Example Report:**
```
Module 1 - Discovery Complete ✓
- Client portal exists; basic RBAC already partially implemented
- Database: ClientContact.role field exists but not enforced
- Missing: NotificationCenter page, RatingSystem table
- Blocker: None identified
- Next Phase: RBAC middleware + rating system
- ETA: 8 hours (revised down from 11 - existing foundation found)
- Ready to proceed: YES
```

---

## SUCCESS CRITERIA (Phase 2 Complete)

**Technical:**
- All 4 modules deployed to production
- Zero critical bugs (P0) in first 2 weeks
- All security audits passed
- 100% of test cases passing
- Database migrations completed successfully

**Operational:**
- Module 1: Clients rating experience 4.5+/5
- Module 2: 70%+ open rates on critical notifications
- Module 3: Staff score correlates with actual fill rate (+15% for score 90+)
- Module 4: 50% of urgent shift inquiries via chatbot

**Business:**
- Client retention improved +10%
- Shift fill time reduced 10%
- NPS improved +5 points
- Investor pitch: "Platform now 100% autonomous for shift bookings"

---

## NEXT STEPS (Executive Summary)

### For Project Owner:
1. ✅ Review all 4 module briefs (this summary + individual files)
2. ✅ Confirm/adjust prioritization of build order
3. ✅ Provide answers to "Need Decision" items (see Key Decision Points)
4. ✅ Assign agents to modules (recommended: 1-2 agents per module max)
5. ✅ Set up n8n account (if not done) for Module 4
6. ✅ Verify Retell API key is in .env for Module 4
7. ✅ Approve build to start

### For AI Agents:
1. Read your assigned module brief thoroughly
2. Complete the discovery phase (2 hours max)
3. Report findings + blockers
4. Proceed with implementation (if approved)
5. Follow testing checklist rigorously
6. Provide implementation notes + rollback procedure
7. Ready for next module or maintenance

### Timeline (Aggressive):
- **Week 1:** Module 3 (Scoring - foundation)
- **Week 2:** Modules 1 & 2 in parallel (Portal + Notifications)
- **Week 3:** Module 4 (Chatbot)
- **Week 4:** Testing, bug fixes, documentation
- **Total: 4 weeks to Phase 2 Complete**

---

## REVISION HISTORY

| Date | Version | Changes |
|------|---------|---------|
| Dec 2, 2025 | 1.0 | Initial master prompt created; 4 modules documented |

---

**END OF MASTER PROMPT**

*This document is the definitive source for Phase 2 module development. Reference this for decision-making, prioritization, and success criteria. All module briefs (Module-1-4) contain detailed specifications and must be read by assigned agents.*