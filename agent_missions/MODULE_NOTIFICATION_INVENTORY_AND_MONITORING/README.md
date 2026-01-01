# MODULE: Notification Inventory & Enhanced Monitoring

**Status**: Complete - Documentation Phase
**Created**: 2025-12-31
**Priority**: CRITICAL (Blocks n8n migration)
**Dependencies**: None

---

## Purpose

This module provides a **comprehensive inventory of ALL notifications** sent by ACG StaffLink and identifies **critical gaps** in the current monitoring infrastructure that must be addressed before migrating to n8n.

---

## Key Findings

### ✅ What We Found

1. **40+ notification functions** sending emails, SMS, and WhatsApp
2. **24 active cron jobs** (17 send notifications)
3. **3 communication channels**: Email, SMS, WhatsApp (with AI)
4. **Existing monitoring UI** but only shows email queue

### 🚨 CRITICAL ISSUES

1. **GDPR VIOLATION**: Preference enforcement NOT implemented
   - Users can set preferences but they're NEVER checked
   - Users cannot actually opt out
   - Legal liability risk

2. **Incomplete Audit Logging**: Only ~30% of functions log properly
   - SMS sends not visible
   - WhatsApp sends not visible
   - Historical data not accessible in UI

3. **Monitoring Blindspots**: Current UI only shows email queue
   - No visibility into SMS or WhatsApp
   - No historical log view
   - No channel breakdown or analytics

---

## Documentation Files

### 1. [CURRENT_NOTIFICATION_INVENTORY.md](./CURRENT_NOTIFICATION_INVENTORY.md)

**Complete catalog of ALL notifications being sent**

**Contents**:
- 40+ notification functions documented
- Breakdown by channel (Email, SMS, WhatsApp)
- Breakdown by recipient (Client, Staff, Admin)
- Scheduled jobs and frequencies
- Templates inventory
- Infrastructure overview

**Key Sections**:
1. Email Notifications (20+ types)
   - Client-facing (5 types)
   - Staff-facing (10 types)
   - Admin-facing (7 types)
   - System/transactional (3 types)

2. SMS Notifications (10+ types)
   - Urgent alerts, reminders, confirmations

3. WhatsApp Notifications (10+ types)
   - AI-powered conversational router
   - Interactive offers and timesheets
   - Rich media messaging

4. Scheduled Jobs (24 cron jobs)
   - Every 5 min (7 jobs)
   - Hourly (3 jobs)
   - Daily (4 jobs)
   - Weekly (1 job)

**Use This For**: Understanding full scope of notification landscape

---

### 2. [MONITORING_UI_GAPS.md](./MONITORING_UI_GAPS.md)

**Analysis of what's working vs what's missing**

**Contents**:
- Current UI capabilities ([NotificationMonitor.jsx](../../src/pages/NotificationMonitor.jsx))
- 10 critical gaps identified
- Data availability analysis
- Impact on n8n migration
- Recommendations and priorities

**Critical Gaps**:
1. SMS notifications not visible
2. WhatsApp messages not visible
3. Historical log not accessible
4. Channel breakdown not shown
5. ⚠️ **GDPR compliance - preferences NOT enforced**
6. Source tracking missing (Supabase vs n8n)
7. Error categorization missing
8. Performance metrics missing
9. Recipient type filtering limited
10. Template usage not tracked

**Use This For**: Understanding what needs to be fixed before n8n migration

---

### 3. [ENHANCED_MONITORING_PLAN.md](./ENHANCED_MONITORING_PLAN.md)

**Detailed plan for upgrading monitoring UI**

**Contents** (to be created):
- Enhanced NotificationMonitor design
- New analytics dashboard design
- Technical specifications
- Component architecture
- Database queries needed
- Implementation timeline

**Use This For**: Building the improved monitoring system

---

### 4. [N8N_MIGRATION_CHECKLIST.md](./N8N_MIGRATION_CHECKLIST.md)

**Pre-flight checklist before n8n migration**

**Contents** (to be created):
- Prerequisites (must fix first)
- Migration order (which notifications to move first)
- Parallel running strategy
- Validation criteria
- Rollback procedures

**Use This For**: Ensuring safe n8n migration

---

## Critical Actions Required

### BEFORE n8n Migration

#### 🚨 Priority 1: Fix GDPR Compliance

**Issue**: Preference enforcement NOT implemented
**Risk**: Legal liability, GDPR fines up to 4% revenue
**Effort**: 2-3 days

**Action Items**:
1. Create `shouldSendNotification()` shared function
2. Add preference check to ALL 40+ notification functions
3. Log preference checks to `notification_log`
4. Update UI to show skipped sends
5. Test with real user opt-out
6. Update privacy policy

**Owner**: [ASSIGN]
**Deadline**: [SET DATE]

---

#### 🚨 Priority 2: Complete Audit Logging

**Issue**: Only ~30% of functions log to `notification_log`
**Risk**: Incomplete audit trail, can't monitor properly
**Effort**: 2-3 days

**Action Items**:
1. Audit all 40+ notification functions
2. Add logging to missing functions
3. Standardize log format across all channels
4. Validate logs for Email, SMS, WhatsApp
5. Test logging in production

**Owner**: [ASSIGN]
**Deadline**: [SET DATE]

---

#### ⚠️ Priority 3: Enhance Monitoring UI

**Issue**: Only email queue visible, no SMS/WhatsApp/historical data
**Risk**: Limited visibility during migration
**Effort**: 1 week

**Action Items**:
1. Add notification_log view to NotificationMonitor
2. Add SMS sends view
3. Add WhatsApp sends view
4. Add channel breakdown dashboard
5. Add source filter (Supabase vs n8n)
6. Add date range picker
7. Add success/failure rate metrics
8. Add export to CSV

**Owner**: [ASSIGN]
**Deadline**: [SET DATE]

---

## Timeline

### Phase 1: Critical Fixes (Week 1)
- [ ] Fix GDPR preference enforcement
- [ ] Complete audit logging
- [ ] Test both fixes thoroughly

### Phase 2: Enhanced Monitoring (Week 2)
- [ ] Upgrade NotificationMonitor UI
- [ ] Add multi-channel support
- [ ] Add historical log view
- [ ] Add analytics dashboard

### Phase 3: Validation (Week 3)
- [ ] Enable full logging for 1 week
- [ ] Measure actual volumes per channel
- [ ] Validate preference enforcement works
- [ ] Document baseline metrics

### Phase 4: n8n Migration Ready (Week 4+)
- [ ] All critical fixes complete
- [ ] Monitoring UI comprehensive
- [ ] Baseline metrics documented
- [ ] Team trained on new UI
- [ ] Ready to begin n8n migration

**Total Time**: 3-4 weeks before n8n migration can safely begin

---

## Related Modules

- **[MODULE_34_CLIENT_EMAIL_REDESIGN](../MODULE_34_CLIENT_EMAIL_REDESIGN/)** - Recent client email improvements
- **[MODULE_N8N_CLIENT_EMAILS](../MODULE_N8N_CLIENT_EMAILS/)** - n8n migration plan for client emails
- **[_archive/module_2_notifications](../_archive/module_2_notifications/)** - Original notification system implementation (where GDPR issue originated)

---

## Notification Functions Summary

### By Channel

| Channel | Functions | Est. Daily Volume | Visibility |
|---------|-----------|-------------------|------------|
| Email | 20+ | 500-1000 | ✅ Partial (queue only) |
| SMS | 10+ | 200-500 | ❌ None |
| WhatsApp | 10+ | 300-700 | ❌ None |
| **Total** | **40+** | **1000-2200** | **30% visible** |

### By Recipient Type

| Recipient | Notification Types | Primary Channel |
|-----------|-------------------|-----------------|
| Clients | 6 types | Email |
| Staff | 10+ types | Email + SMS + WhatsApp |
| Admins | 7 types | Email + SMS |

### By Frequency

| Frequency | Functions | Purpose |
|-----------|-----------|---------|
| Every 5 min | 7 | Critical alerts, queue processing |
| Every 10-15 min | 2 | Urgent digests |
| Hourly | 3 | Batch processing |
| Daily | 4 | Scheduled digests/reminders |
| Weekly | 1 | Summaries |
| Event-driven | 20+ | Real-time notifications |

---

## Database Tables

### notification_queue
- **Purpose**: Batch notifications for 5-minute delivery
- **Coverage**: Email only
- **Visible in UI**: ✅ Yes (NotificationMonitor)
- **Status**: Working well

### notification_log
- **Purpose**: Comprehensive audit trail for ALL channels
- **Coverage**: Email, SMS, WhatsApp (when logged)
- **Visible in UI**: ❌ No
- **Status**: ⚠️ Underutilized (only ~30% of functions write to it)

### client_notifications
- **Purpose**: Client-facing notification center
- **Coverage**: In-app notifications only
- **Visible in UI**: ✅ Yes (separate client portal UI)
- **Status**: Working (not for admin monitoring)

---

## Technical Debt

### Code Issues

1. **NotificationMonitor.jsx Line 55**: References broken `notification-digest-engine` (v2 issue)
2. **40+ functions**: No preference checking
3. **~30 functions**: No audit logging
4. **All SMS functions**: Hardcoded templates (no centralization)
5. **All WhatsApp functions**: Mixed template approach
6. **Email functions**: Only 6 templates (incomplete coverage)

### Infrastructure Issues

1. No centralized template system
2. No error categorization
3. No performance monitoring
4. No cost tracking
5. Inconsistent logging standards

---

## Success Criteria

### Before declaring "Ready for n8n Migration"

- [x] Complete notification inventory documented
- [ ] GDPR preference enforcement implemented
- [ ] All functions logging to `notification_log`
- [ ] Monitoring UI shows all channels
- [ ] Historical data accessible in UI
- [ ] Baseline metrics documented
- [ ] Team trained on new monitoring capabilities

---

## Support & Questions

### Key Files to Review

**Inventory**:
- [CURRENT_NOTIFICATION_INVENTORY.md](./CURRENT_NOTIFICATION_INVENTORY.md) - What we're sending

**Gaps**:
- [MONITORING_UI_GAPS.md](./MONITORING_UI_GAPS.md) - What's broken

**Current UI**:
- [src/pages/NotificationMonitor.jsx](../../src/pages/NotificationMonitor.jsx) - Existing monitoring page
- [src/pages/client/NotificationPreferences.jsx](../../src/pages/client/NotificationPreferences.jsx) - User preferences UI

**Database**:
- [supabase/migrations/20251205000000_create_notification_queue_base.sql](../../supabase/migrations/20251205000000_create_notification_queue_base.sql)
- [supabase/migrations/20251205000001_create_notification_log.sql](../../supabase/migrations/20251205000001_create_notification_log.sql)

---

## Next Steps

1. **Review all documentation** in this module
2. **Assign owners** to Priority 1 & 2 tasks
3. **Fix GDPR compliance** (CRITICAL)
4. **Complete audit logging**
5. **Enhance monitoring UI**
6. **Document baseline metrics**
7. **Then proceed** with n8n migration

---

**Status**: Documentation Complete
**Blockers**: None (documentation phase)
**Blocked By**: None
**Blocks**: n8n migration (until critical fixes complete)

**Last Updated**: 2025-12-31
