# ADMIN PROFILE PRE-FILL & MULTI-ROLE SYSTEM
## Master Implementation Guide

**Created:** December 17, 2025
**Status:** Ready for Execution
**Priority:** P0 - PRODUCTION CRITICAL
**Client:** Dominion Healthcare Services Ltd

---

## 🎯 Executive Summary

Transform ACG StaffLink to enable admin pre-population of 100% of staff profile fields before onboarding, implement intelligent multi-role qualification system, and import 45 existing Dominion staff with full data.

### Key Deliverables
1. ✅ Admin can edit all 40+ profile fields (vs current 15)
2. ✅ Smart staff onboarding with pre-fill detection & progress tracking
3. ✅ Multi-role system (Senior Carers can work HCA shifts)
4. ✅ Bulk document upload for admin
5. ✅ Import 45 Dominion staff from CSV
6. ✅ Notification gating (no spam before account activation)
7. ✅ Enterprise audit trail for autonomous AI operations

---

## 📊 Module Overview

### Core Admin Pre-Fill Modules (21-28)
| Module | Name | Priority | Duration | Dependencies |
|--------|------|----------|----------|--------------|
| **21** | Admin Profile Pre-Fill Core | P0 | 3-4h | None |
| **22** | Smart Profile Pre-Fill Engine | P0 | 2-3h | M21 |
| **23** | Multi-Role Qualification Engine | P1 | 3-4h | None |
| **24** | Document Bulk Upload | P1 | 2-3h | None |
| **25** | CSV Import Dominion Staff | P0 | 2h | M21 |
| **26** | Admin Preflight UX | P2 | 1-2h | M21 |
| **27** | Notification Engine | P1 | 1h | M22 |
| **28** | Integration Testing | P1 | 2h | All |

**Subtotal:** 12-15 hours (can parallelize)

### Investor Readiness Modules (29-31) 🆕
| Module | Name | Priority | Duration | Dependencies |
|--------|------|----------|----------|--------------|
| **29** | Usage Metrics Engine (Automated) | P2 | 4-6h | Database |
| **30** | Unit Economics Dashboard | P2 | 5-7h | M29 |
| **31** | Investor KPI Dashboard | P2 | 6-8h | M29, M30 |

**Subtotal:** 15-21 hours (M29 required first, M30+M31 can parallelize)

**Grand Total:** 27-36 hours (can parallelize phases)

---

## 🚀 Execution Strategy

### Phase 1: Foundation (CRITICAL PATH)
**Duration:** 4-5 hours | **Can parallelize**

Execute in parallel:
- **Agent 1:** MODULE 21 (Admin Pre-Fill Core)
- **Agent 2:** MODULE 23 (Multi-Role Engine)
- **Agent 3:** MODULE 25 (CSV Import)

**Deliverable:** Admin can edit all fields, multi-role working, 45 staff imported

---

### Phase 2: Intelligence & UX
**Duration:** 3-4 hours | **Sequential after Phase 1**

Execute in order:
1. MODULE 22 (Smart Pre-Fill) - depends on M21
2. MODULE 27 (Notification Engine) - depends on M22
3. MODULE 24 (Document Upload) - independent
4. MODULE 26 (Admin UX) - depends on M21

**Deliverable:** Full smart onboarding, notifications gated, documents uploadable

---

### Phase 3: Testing & Rollout
**Duration:** 2 hours | **Sequential after Phase 2**

1. MODULE 28 (Integration Testing)
2. Production deployment
3. Dominion admin handoff

**Deliverable:** Production-ready system, Dominion admin trained

---

### Phase 4: Investor Readiness (AUTOMATED) 🆕
**Duration:** 15-21 hours | **Independent of Phases 1-3**
**Priority:** P2 (Execute after MVP stable with Dominion)

Execute in sequence:
1. **MODULE 29** (Usage Metrics Engine) - Database triggers for auto-logging
2. **MODULE 30 & 31** (can parallelize) - Unit Economics + Investor KPI Dashboards

**Key Feature:** 🤖 **100% Automated** - Zero manual data entry, all metrics auto-logged via triggers

**Deliverable:** Real-time investor dashboard with MRR, ARR, LTV:CAC, retention, burn rate

**Use Case:** Investor pitches, board meetings, fundraising preparation

---

## 📁 Module File Structure

```
agent_missions/
├── ADMIN_PROFILE_PREFILL_MASTER_README.md (THIS FILE)
│
├── MODULE_21_ADMIN_PROFILE_PREFILL_CORE/
│   └── INSTRUCTIONS.md (⭐ 51KB - Comprehensive)
│
├── MODULE_22_SMART_PROFILE_PREFILL_ENGINE/
│   └── INSTRUCTIONS.md (16KB - With edge function)
│
├── MODULE_23_MULTI_ROLE_QUALIFICATION_ENGINE/
│   └── INSTRUCTIONS.md (21KB - Database triggers)
│
├── MODULE_24_DOCUMENT_BULK_UPLOAD_ADMIN/
│   └── INSTRUCTIONS.md (7KB - Quick implementation)
│
├── MODULE_25_CSV_IMPORT_DOMINION_STAFF/
│   └── INSTRUCTIONS.md (18KB - Import + validation)
│
├── MODULE_26_ADMIN_PREFLIGHT_UX_ENHANCEMENTS/
│   └── INSTRUCTIONS.md (6KB - UX polish)
│
├── MODULE_27_NOTIFICATION_ENGINE_ENHANCEMENT/
│   └── INSTRUCTIONS.md (3KB - Integration)
│
├── MODULE_28_INTEGRATION_TESTING_CHECKLIST/
│   └── INSTRUCTIONS.md (12KB - Test scenarios)
│
├── MODULE_29_USAGE_METRICS_ENGINE/ 🆕
│   └── INSTRUCTIONS.md (⭐ 23KB - 100% Automated tracking)
│
├── MODULE_30_UNIT_ECONOMICS_DASHBOARD/ 🆕
│   └── INSTRUCTIONS.md (19KB - Per-agency profitability)
│
└── MODULE_31_INVESTOR_KPI_DASHBOARD/ 🆕
    └── INSTRUCTIONS.md (⭐ 27KB - Executive summary)
```

---

## 🎯 Key Technical Decisions

### 1. Sensitive Data Handling
- **Decision:** Mask NI Number and Bank Account (show last 4 digits)
- **Rationale:** Security best practice, GDPR compliance
- **Implementation:** Toggle button to show/hide full data

### 2. Multi-Role Architecture
- **Decision:** Use `qualified_roles[]` JSONB array + database trigger
- **Rationale:** Automatic calculation, backward compatible
- **Hierarchy:**
  ```
  Support Worker → [support_worker]
  HCA → [hca, support_worker]
  Senior Carer → [senior_carer, hca, support_worker] IF medication_trained
  Nurse → [nurse] (won't work lower roles)
  ```

### 3. Notification Gating
- **Decision:** Only send "profile changed" email if user_id NOT NULL AND status='active'
- **Rationale:** Prevent spam before account activation
- **Implementation:** Edge function checks conditions before sending

### 4. Audit Trail
- **Decision:** Add `profile_last_updated_by`, `profile_last_updated_at`, `profile_update_source`
- **Rationale:** Enterprise compliance + autonomous AI tracking
- **Future:** Enables AI agents to know who changed what

### 5. Import Strategy
- **Decision:** Set all imports to status='onboarding', admin reviews before inviting
- **Rationale:** Quality control, prevents sending invites to incorrect data
- **Process:** Import → Admin edits → Admin sends invite → Staff onboards

### 6. Investor Readiness (MODULE 29-31) 🆕
- **Decision:** 100% automated metrics collection via database triggers
- **Rationale:** Zero manual work, real-time accuracy, prepares for investor pitches
- **Architecture:**
  ```
  usage_metrics table (auto-logged by triggers)
  ↓
  Daily aggregation (cron job)
  ↓
  agency_unit_economics view (auto-calculated)
  ↓
  Investor KPI Dashboard (real-time)
  ```
- **Key Metrics:** MRR, ARR, LTV:CAC, Gross Margin, Retention, Burn Rate
- **Automation Level:** 🤖 99% (only PDF export manual)

---

## ⚠️ Critical Dependencies

### Database
- Supabase PostgreSQL 15+
- RLS policies enabled
- Service role key available

### Edge Functions
- Deno runtime
- Resend API key configured
- FRONTEND_URL environment variable set

### Frontend
- React 18+ with hooks
- TanStack Query for mutations
- Shadcn UI components (collapsible, tooltip)
- Lucide React icons

### Data
- `dominion_doc/DHCS_CLEANED.csv` exists
- CSV has 45 records with required fields
- Dominion agency_id: `c8e84c94-8233-4084-b4c3-63ad9dc81c16`

---

## 🧪 Testing Protocol

### Unit Tests (Per Module)
Each module has validation checklist in INSTRUCTIONS.md

### Integration Tests (MODULE 28)
4 comprehensive scenarios:
1. Admin pre-fills 100% → Staff reviews & confirms
2. Multi-role assignment (HCA → Support Worker shift)
3. Notification gating (before/after activation)
4. Document bulk upload → Staff sees & verifies

### User Acceptance Testing
Dominion admin will test with real staff:
- Edit profiles
- Upload documents
- Send invites
- Monitor staff onboarding

---

## 🔄 Rollback Strategy

Each module has rollback instructions. Global rollback:

```bash
# 1. Rollback database
cd C:\Users\gbase\superbasecli
./supabase.exe db reset

# 2. Rollback code
cd C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3
git revert [commit_hash]

# 3. Delete edge functions
./supabase.exe functions delete profile-change-notifier

# 4. Delete imported staff (if needed)
# Run SQL in rollback section of MODULE 25
```

---

## 📊 Success Metrics

### Technical Success
- [ ] All 8 modules implemented without errors
- [ ] All tests passing (unit + integration)
- [ ] Zero breaking changes to existing workflows
- [ ] Database migrations deployed successfully
- [ ] Edge functions operational

### Business Success
- [ ] 45 Dominion staff imported
- [ ] Admin can edit all 40+ fields
- [ ] Multi-role assignments working
- [ ] Document uploads successful
- [ ] Staff onboarding completion rate >80% (Week 1)
- [ ] Dominion admin feedback: Positive

### Autonomous AI Readiness
- [ ] Audit trail capturing all changes
- [ ] Profile update source tracked
- [ ] Notification system respects automation flags
- [ ] Multi-role logic supports AI shift matching
- [ ] Foundation for conversational AI agents

---

## 🚨 Known Issues & Mitigations

### Issue 1: Collapsible Component Missing
**Mitigation:** Run `npx shadcn-ui@latest add collapsible` before MODULE 21

### Issue 2: CSV Import Duplicates
**Mitigation:** Script checks email uniqueness, skips duplicates, logs in report

### Issue 3: Notification Spam During Testing
**Mitigation:** Use test agency, not production. Check notification gating in MODULE 27

### Issue 4: Token Budget for Large Edits
**Mitigation:** Modular approach allows multiple agent sessions

---

## 📞 Support & Escalation

### Implementation Issues
- Check module-specific INSTRUCTIONS.md
- Review rollback procedures
- Git commit history for reference

### Database Issues
- Check Supabase dashboard logs
- Validate RLS policies
- Ensure service role key is correct

### Edge Function Issues
- Check Supabase function logs
- Verify environment variables
- Test with curl commands

### Production Issues
- Immediate rollback if critical
- Check MODULE 28 rollback plan
- Monitor Sentry/error tracking

---

## 🎓 Knowledge Transfer

### For Future Agents
Each module contains:
- Step-by-step implementation
- Validation checklists
- Rollback procedures
- Integration points
- Common issues & solutions

### For Human Developers
- Code is self-documenting with comments
- Database migrations have comments
- Edge functions have JSDoc
- Component props are typed

### For Dominion Admin
- Quick reference guide in MODULE 28
- Video walkthrough (TBD)
- Support contact information
- FAQ document (TBD)

---

## 💰 Investor Readiness Success Metrics (MODULE 29-31) 🆕

### Immediate (Week 1)
- [ ] All database triggers fire correctly (100% event capture)
- [ ] Daily cron jobs run successfully
- [ ] Investor KPI dashboard loads < 3 seconds
- [ ] All 6 core KPIs calculate accurately

### Short-term (Month 1)
- [ ] Track 10,000+ platform events
- [ ] Calculate accurate MRR/ARR for all agencies
- [ ] Identify top 3 most profitable agencies
- [ ] Measure shift fill rate >70%
- [ ] LTV:CAC ratio calculated for each agency

### Long-term (Quarter 1)
- [ ] Use dashboard in first investor pitch
- [ ] MRR growth >20% month-over-month
- [ ] Gross margin >30% platform-wide
- [ ] LTV:CAC ratio >3:1 for mature agencies
- [ ] Successfully demonstrate traction to investors

### Automation Validation
- [ ] Zero manual data entry required
- [ ] Metrics auto-update every 5 minutes
- [ ] Historical trends available (12 months)
- [ ] Health alerts trigger correctly
- [ ] PDF export works for investor decks

---

## 🎉 Post-Implementation

### Week 1 Follow-Up
- [ ] Monitor staff onboarding completion rate
- [ ] Collect admin feedback
- [ ] Check for errors in logs
- [ ] Review notification delivery rate
- [ ] Measure time saved vs manual entry

### Month 1 Review
- [ ] Measure multi-role usage
- [ ] Analyze document upload patterns
- [ ] Staff satisfaction survey
- [ ] Identify enhancement opportunities
- [ ] Plan Phase 2 features

### Future Enhancements
- AI-powered profile completion suggestions
- Bulk edit capability (multiple staff at once)
- Change history viewer with diff
- Automated data quality checks
- Integration with e-verify for right-to-work

---

## 📌 Quick Start Commands

### For Agent Starting Module 21
```bash
cd C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3
code agent_missions/MODULE_21_ADMIN_PROFILE_PREFILL_CORE/INSTRUCTIONS.md
# Follow step-by-step instructions
```

### For Agent Starting Module 23
```bash
cd C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3
code agent_missions/MODULE_23_MULTI_ROLE_QUALIFICATION_ENGINE/INSTRUCTIONS.md
# Independent of other modules, can run in parallel
```

### For Agent Starting Module 25
```bash
cd C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3
code agent_missions/MODULE_25_CSV_IMPORT_DOMINION_STAFF/INSTRUCTIONS.md
# Ensure DHCS_CLEANED.csv exists in dominion_doc/
```

### For Agent Starting Module 29 (Investor Readiness) 🆕
```bash
cd C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3
code agent_missions/MODULE_29_USAGE_METRICS_ENGINE/INSTRUCTIONS.md
# Run AFTER Modules 21-28 complete and MVP stable
# Creates automated metrics collection system
```

### For Agent Starting Module 30-31 (Can Parallelize) 🆕
```bash
# Terminal 1
cd C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3
code agent_missions/MODULE_30_UNIT_ECONOMICS_DASHBOARD/INSTRUCTIONS.md

# Terminal 2 (parallel execution)
code agent_missions/MODULE_31_INVESTOR_KPI_DASHBOARD/INSTRUCTIONS.md

# Both require MODULE 29 completed first
```

---

## ✅ Pre-Flight Checklist

Before starting implementation:
- [ ] All 8 module folders exist
- [ ] All INSTRUCTIONS.md files are readable
- [ ] Git is on clean branch (or feature branch created)
- [ ] Database backup completed
- [ ] Service role key available
- [ ] Resend API key configured
- [ ] dominion_doc/DHCS_CLEANED.csv exists
- [ ] Supabase project accessible
- [ ] Node.js and npm installed
- [ ] Shadcn UI components available

---

## 🎯 Success Definition

**This project is successful when:**
1. Dominion admin can pre-fill 100% of staff profiles
2. All 45 Dominion staff imported and ready for invites
3. Multi-role system allows flexible shift assignments
4. Staff onboarding shows pre-filled data with progress tracking
5. No notification spam complaints
6. Zero disruption to existing workflows
7. System ready for autonomous AI agent integration
8. Dominion admin says: "This saves us hours every day!"

---

**Ready to execute? Start with Phase 1 modules. Good luck! 🚀**

---

## 📄 Document Version
- **Version:** 2.0 (Added MODULE 29-31: Investor Readiness)
- **Last Updated:** 2025-12-18
- **Author:** Claude Code (Autonomous Planning Agent)
- **Approved By:** User (Plan Mode Confirmed)
- **Next Review:** After MODULE 31 completion
- **Changelog:**
  - v1.0 (2025-12-17): Initial release with MODULE 21-28
  - v2.0 (2025-12-18): Added MODULE 29-31 (Investor Readiness Tracking)
