# n8n Migration Pre-Flight Checklist

**Date**: 2025-12-31
**Purpose**: Ensure safe migration from Supabase Edge Functions to n8n
**Status**: Pre-Migration Planning

---

## ⚠️ CRITICAL: DO NOT BEGIN MIGRATION UNTIL ALL PREREQUISITES COMPLETE

This checklist ensures you have complete visibility and control over your notification system before migrating to n8n. Skipping these steps risks lost notifications, GDPR violations, and migration failures.

---

## PHASE 0: PREREQUISITES (BLOCKING)

### ✅ 0.1 Notification Inventory Complete

- [x] All 40+ notification functions documented
- [x] Email notifications cataloged (20+ types)
- [x] SMS notifications cataloged (10+ types)
- [x] WhatsApp notifications cataloged (10+ types)
- [x] Cron jobs documented (24 jobs)
- [x] Templates inventory complete
- [x] Infrastructure documented

**Status**: ✅ COMPLETE (this module)

---

### 🚨 0.2 GDPR Compliance - Preference Enforcement

**BLOCKING ISSUE**: Preferences NOT enforced

**Current State**:
- ❌ 0% of functions check user preferences
- ❌ Users cannot opt out (GDPR violation)
- ❌ No preference logging
- ❌ Legal liability risk

**Required Actions**:

- [ ] **A. Create Shared Preference Checker**
  ```javascript
  // File: supabase/functions/_shared/preferenceChecker.ts
  export async function shouldSendNotification(
    userId: string,
    userType: 'staff' | 'client' | 'admin',
    notificationType: string,
    channel: 'email' | 'sms' | 'whatsapp'
  ): Promise<{ allowed: boolean; reason: string; preferenceStatus: string }> {
    // Query user preferences
    // Check opt-out status
    // Return decision with logging
  }
  ```

- [ ] **B. Update ALL 40+ Notification Functions**
  - Add `shouldSendNotification()` call before every send
  - Log preference check result to `notification_log`
  - Skip send if opted out
  - Document skip reason

- [ ] **C. Test Preference Enforcement**
  - Create test user
  - Set email_notifications = false
  - Trigger notification
  - Verify send is skipped
  - Verify logged to notification_log

- [ ] **D. Update Privacy Policy**
  - Document opt-out process
  - Explain preference enforcement
  - GDPR compliance statement

**Effort**: 2-3 days
**Owner**: [ASSIGN]
**Deadline**: [SET - BLOCKING]
**Validation**: Run test with opted-out user, verify no send

---

### 🚨 0.3 Complete Audit Logging

**BLOCKING ISSUE**: Only ~30% of functions log properly

**Current State**:
- ⚠️ Many SMS sends not logged
- ⚠️ Many WhatsApp sends not logged
- ⚠️ Inconsistent logging format
- ⚠️ Missing error messages

**Required Actions**:

- [ ] **A. Audit All Functions**
  Create spreadsheet tracking:
  - Function name
  - Logs to notification_log? (Yes/No)
  - Channel (Email/SMS/WhatsApp)
  - Logging completeness (0-100%)

- [ ] **B. Standardize Logging**
  ```javascript
  // Standard log entry for ALL functions
  await supabase.from('notification_log').insert({
    agency_id,
    recipient_email: recipient,
    recipient_type: 'staff' | 'client' | 'admin',
    notification_type: 'shift_reminder' | 'daily_digest' | etc,
    channel: 'email' | 'sms' | 'whatsapp',
    status: 'sent' | 'failed' | 'skipped',
    delivery_status: 'sent' | 'failed' | 'not_sent',
    source: 'supabase_function',
    preference_checked: true,
    preference_status: 'opted_in' | 'opted_out',
    email_message_id: resendId,
    sms_message_id: twilioId,
    whatsapp_message_id: twilioId,
    error_message: errorMsg,
    skip_reason: skipReason,
    metadata: additionalData,
    created_at: NOW(),
    sent_at: NOW()
  })
  ```

- [ ] **C. Add Logging to Missing Functions**
  Priority order:
  1. High-volume functions (shift reminders, daily digests)
  2. Critical alerts (no-show, escalations)
  3. Low-volume functions

- [ ] **D. Test Logging**
  - Trigger each notification type
  - Verify logged to notification_log
  - Check all required fields populated
  - Validate message IDs present

**Effort**: 2-3 days
**Owner**: [ASSIGN]
**Deadline**: [SET - BLOCKING]
**Validation**: Query notification_log, verify 100% coverage

---

### ⚠️ 0.4 Enhanced Monitoring UI

**ISSUE**: Limited visibility (email queue only)

**Current State**:
- ✅ Email queue visible
- ❌ SMS sends not visible
- ❌ WhatsApp sends not visible
- ❌ Historical data not accessible
- ❌ No analytics dashboard

**Required Actions** (see [ENHANCED_MONITORING_PLAN.md](./ENHANCED_MONITORING_PLAN.md)):

- [ ] **A. Multi-Tab Interface**
  - Email Queue tab (keep existing)
  - Email History tab (new - notification_log)
  - SMS tab (new)
  - WhatsApp tab (new)
  - Analytics dashboard (new)

- [ ] **B. Database RPC Functions**
  - `get_notification_stats()`
  - `get_daily_volume()`
  - `get_notification_trends()`

- [ ] **C. Real-Time Updates**
  - Supabase real-time subscription
  - Auto-refresh stats
  - Toast notifications

- [ ] **D. Export Functionality**
  - CSV export
  - JSON export
  - Date range selection

- [ ] **E. n8n Migration Support**
  - Source filter (Supabase vs n8n)
  - Duplicate detection
  - Match rate calculation

**Effort**: 1 week
**Owner**: [ASSIGN]
**Deadline**: [SET - RECOMMENDED]
**Validation**: View all channels, export data, compare sources

---

### 📊 0.5 Baseline Metrics Collection

**ISSUE**: Don't know current performance

**Required Actions**:

- [ ] **A. Enable Full Logging** (prerequisite: 0.3 complete)
  - Run for 7 days minimum
  - Capture ALL sends across all channels

- [ ] **B. Measure Volumes**
  ```sql
  -- Daily volume by channel
  SELECT
    DATE(created_at) as date,
    channel,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE delivery_status = 'sent') as successful,
    COUNT(*) FILTER (WHERE delivery_status = 'failed') as failed
  FROM notification_log
  WHERE created_at >= NOW() - INTERVAL '7 days'
    AND source = 'supabase_function'
  GROUP BY DATE(created_at), channel
  ORDER BY date DESC, channel;
  ```

- [ ] **C. Document Baseline**
  Create `BASELINE_METRICS.md`:
  - Average daily volume per channel
  - Peak send times
  - Success rates
  - Common error types
  - Top notification types

- [ ] **D. Identify Critical Functions**
  Rank by:
  - Volume (sends/day)
  - Business impact (critical vs nice-to-have)
  - Complexity (simple vs complex)
  - Dependencies (standalone vs interconnected)

**Effort**: 1 week (passive - just collect data)
**Owner**: [ASSIGN]
**Deadline**: [SET - RECOMMENDED]
**Validation**: Have data to answer "What's normal?"

---

## PHASE 1: MIGRATION READINESS

### ☑️ 1.1 n8n Infrastructure Ready

- [ ] **A. n8n Instance Accessible**
  - URL: https://n8n.dreampathai.co.uk/
  - Admin access confirmed
  - Docker/hosting stable

- [ ] **B. Database Credentials Added**
  - PostgreSQL connection configured
  - Connection tested
  - Credentials secured

- [ ] **C. Resend API Key Added**
  - Environment variable set
  - API key tested
  - Rate limits understood

- [ ] **D. Twilio Credentials (if migrating SMS/WhatsApp)**
  - Account SID added
  - Auth token added
  - Phone numbers configured
  - WhatsApp Business approved

---

### ☑️ 1.2 Migration Order Defined

**Recommendation**: Start with client emails (well-documented, low risk)

**Phase 1A: Client Emails** (from [MODULE_N8N_CLIENT_EMAILS](../MODULE_N8N_CLIENT_EMAILS/))
- [ ] 1. Weekly Client Summary (Monday 8 AM)
  - Simplest (single cron, predictable)
  - Low volume (~50-100 emails/week)
  - Easy to validate

- [ ] 2. Daily Client Digest (Daily 10 AM)
  - Medium complexity
  - Medium volume (~100-200 emails/day)
  - Clear validation criteria

- [ ] 3. Batch Shift Confirmations (Every 5 min)
  - Most complex (queue processing)
  - High volume (~300-500 emails/day)
  - Requires careful testing

**Phase 1B: Staff Emails** (after client emails validated)
- [ ] 4. Staff Daily Digest
- [ ] 5. Shift Reminders
- [ ] 6. Marketplace Digest
- [ ] 7. Compliance Reminders
- [ ] 8. Timesheet Reminders

**Phase 1C: Admin Emails**
- [ ] 9. Urgent Escalations
- [ ] 10. No-Show Alerts
- [ ] 11. Internal Admin Notifier

**Phase 2: SMS** (after all emails migrated)
- [ ] 12. Urgent shift offers
- [ ] 13. Clock-out reminders
- [ ] 14. Payment notifications

**Phase 3: WhatsApp** (most complex - last)
- [ ] 15. Enhanced offers
- [ ] 16. Timesheet interactive
- [ ] 17. AI master router (special consideration)

---

### ☑️ 1.3 Test Plan Created

For EACH notification type to migrate:

- [ ] **A. Create Test Checklist**
  - Sample data prepared
  - Expected output documented
  - Validation criteria defined
  - Rollback procedure written

- [ ] **B. Test Scenarios**
  - Happy path (normal send)
  - Opted-out user (should skip)
  - Invalid email/phone (should fail gracefully)
  - Rate limit hit (should retry)
  - Network error (should retry)

- [ ] **C. Comparison Test**
  - Run Supabase function
  - Run n8n workflow
  - Compare outputs (HTML, recipients, timing)
  - Verify 100% match

---

### ☑️ 1.4 Rollback Plan Documented

For EACH migration phase:

- [ ] **A. Pause n8n Workflows**
  - How to deactivate workflows
  - Emergency stop procedure
  - Who has access

- [ ] **B. Re-Enable Supabase Crons**
  ```sql
  -- Example rollback
  SELECT cron.schedule(
    'function-name',
    'cron-expression',
    $$SELECT net.http_post(...)$$
  );
  ```

- [ ] **C. Data Reconciliation**
  - Check for lost notifications
  - Verify no duplicates sent
  - Manual sends if needed

- [ ] **D. Communication Plan**
  - Who to notify of rollback
  - What to communicate to users
  - How to document learnings

---

## PHASE 2: PARALLEL RUNNING

### ☑️ 2.1 Activate Parallel Running

**Goal**: Both Supabase and n8n send same notifications

- [ ] **A. Configure n8n Workflows**
  - All 3 client email workflows created
  - Tested individually
  - Activated with proper crons

- [ ] **B. Keep Supabase Crons Running**
  - Do NOT disable any crons yet
  - Both systems sending

- [ ] **C. Add Source Tracking**
  - Supabase functions log `source = 'supabase_function'`
  - n8n workflows log `source = 'n8n_workflow'`
  - Both write to same `notification_log` table

---

### ☑️ 2.2 Monitor Parallel Running

**Duration**: 2 weeks minimum

**Daily Checks**:

- [ ] **A. Compare Send Counts**
  ```sql
  SELECT
    DATE(created_at) as date,
    notification_type,
    source,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE delivery_status = 'sent') as successful
  FROM notification_log
  WHERE created_at >= CURRENT_DATE
  GROUP BY DATE(created_at), notification_type, source
  ORDER BY date DESC, notification_type, source;
  ```

  **Expected**: Supabase and n8n should have same counts ±5%

- [ ] **B. Detect Duplicates**
  ```sql
  -- Find recipients who got email from both sources
  SELECT
    recipient_email,
    notification_type,
    DATE(created_at) as date,
    COUNT(DISTINCT source) as source_count
  FROM notification_log
  WHERE created_at >= CURRENT_DATE
  GROUP BY recipient_email, notification_type, DATE(created_at)
  HAVING COUNT(DISTINCT source) > 1;
  ```

  **Expected**: 0 duplicates (or very few)

- [ ] **C. Compare Success Rates**
  ```sql
  SELECT
    source,
    notification_type,
    ROUND(100.0 * COUNT(*) FILTER (WHERE delivery_status = 'sent') / COUNT(*), 2) as success_rate
  FROM notification_log
  WHERE created_at >= NOW() - INTERVAL '7 days'
  GROUP BY source, notification_type;
  ```

  **Expected**: Both >98% success rate

- [ ] **D. Check for Gaps**
  ```sql
  -- Notifications sent by Supabase but NOT by n8n
  SELECT nls.*
  FROM notification_log nls
  WHERE nls.source = 'supabase_function'
    AND nls.created_at >= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM notification_log nln
      WHERE nln.source = 'n8n_workflow'
        AND nln.recipient_email = nls.recipient_email
        AND nln.notification_type = nls.notification_type
        AND DATE(nln.created_at) = DATE(nls.created_at)
    );
  ```

  **Expected**: 0 gaps

**Weekly Review**:
- [ ] Summary report to team
- [ ] Decision: Continue parallel or investigate issues

---

### ☑️ 2.3 Validation Criteria

**n8n is READY for cutover when**:

- [ ] **Volume Match**: ±5% of Supabase send counts
- [ ] **Success Rate Match**: Within 1% of Supabase
- [ ] **No Critical Errors**: <1% failure rate
- [ ] **No Duplicates**: <0.5% duplicate sends
- [ ] **No Gaps**: 0 missing sends
- [ ] **Preference Enforcement**: 100% checked
- [ ] **Team Confidence**: Stakeholders approve

**If ANY criteria not met**:
- Investigate root cause
- Fix issue
- Reset parallel running period
- Validate again

---

## PHASE 3: GRADUAL CUTOVER

### ☑️ 3.1 Week 1 - Disable First Supabase Cron

**Target**: Weekly Client Summary (lowest risk)

- [ ] **A. Disable Supabase Cron**
  ```sql
  SELECT cron.unschedule('weekly-client-summary');
  ```

- [ ] **B. Verify n8n Only**
  - Monday 8 AM: Watch n8n workflow execute
  - Check notification_log: Only n8n entries
  - Verify emails received by test clients

- [ ] **C. Monitor for 7 Days**
  - Daily check: Emails sent successfully
  - No client complaints
  - No missed sends

- [ ] **D. Decision Point**
  - ✅ Success → Proceed to Week 2
  - ❌ Issues → Rollback, investigate, retry

---

### ☑️ 3.2 Week 2 - Disable Second Cron

**Target**: Daily Client Digest

- [ ] **A. Disable Supabase Cron**
  ```sql
  SELECT cron.unschedule('daily-client-digest');
  ```

- [ ] **B. Monitor for 7 Days**
  - Daily 10 AM: Verify n8n sends
  - Check client feedback
  - Validate volumes match baseline

---

### ☑️ 3.3 Week 3 - Disable Remaining Client Email Cron

**Target**: Batch Confirmations (highest volume)

- [ ] **A. Disable Supabase Cron**
  ```sql
  SELECT cron.unschedule('notification-digest-engine');
  ```

- [ ] **B. Monitor Closely**
  - Every 5 min: Check n8n execution
  - Validate queue processing
  - Watch for errors

- [ ] **C. Monitor for 7 Days**
  - Ensure no backlog
  - Verify all queued items processed
  - Check batch grouping works correctly

---

### ☑️ 3.4 Full Client Email Migration Complete

**Validation**:

- [ ] All 3 client email types running on n8n only
- [ ] No Supabase crons active for client emails
- [ ] 100% success rate maintained
- [ ] No client complaints
- [ ] Team confident in n8n

**Decision**:
- ✅ Proceed to Staff Emails (Phase 1B)
- ⏸️ Pause and stabilize
- ⚠️ Rollback if critical issues

---

## PHASE 4: POST-MIGRATION

### ☑️ 4.1 Archive Supabase Functions

**Do NOT delete** - keep for emergency rollback

- [ ] **A. Add Archive Comments**
  ```typescript
  // ============================================================================
  // STATUS: ARCHIVED - Migrated to n8n on 2025-XX-XX
  // Kept for emergency rollback only
  // n8n Workflow: "Client Emails - Weekly Summary"
  // ============================================================================
  ```

- [ ] **B. Move to Archive Folder** (optional)
  ```
  supabase/functions/_archive/weekly-client-summary/
  ```

- [ ] **C. Update Deployment Manifests**
  - Exclude from auto-deployment
  - Document archive status

---

### ☑️ 4.2 Update Documentation

- [ ] **A. Update README**
  - Document n8n migration
  - Update architecture diagrams
  - Link to this module

- [ ] **B. Create Runbook**
  - How to monitor n8n workflows
  - How to manually trigger workflows
  - How to troubleshoot failures
  - Emergency rollback procedure

- [ ] **C. Team Training**
  - n8n dashboard overview
  - Execution log review
  - Workflow editing basics
  - When to call for help

---

### ☑️ 4.3 Ongoing Monitoring

**Daily** (first month):
- [ ] Check n8n execution logs
- [ ] Review error rates
- [ ] Validate volumes normal

**Weekly**:
- [ ] Success rate trends
- [ ] Compare to baseline
- [ ] Review user feedback

**Monthly**:
- [ ] Performance optimization
- [ ] Cost analysis
- [ ] Plan next migration phase

---

## EMERGENCY PROCEDURES

### 🚨 If Critical Issue Detected

**Symptoms**:
- n8n workflows failing >5%
- Notifications not sending
- Duplicate sends increasing
- User complaints

**Immediate Actions**:

1. **Pause n8n workflows**
   - Go to each workflow
   - Click "Active" toggle to OFF

2. **Re-enable Supabase crons**
   ```sql
   SELECT cron.schedule(...); -- Use documented rollback queries
   ```

3. **Notify team**
   - Slack/email: "n8n migration rollback initiated"
   - Document issue
   - Schedule post-mortem

4. **Verify Supabase working**
   - Wait for next scheduled send
   - Check notification_log
   - Confirm emails/SMS/WhatsApp sending

5. **Investigate n8n issue**
   - Review execution logs
   - Check database connection
   - Verify API keys valid
   - Test with sample data

6. **Fix and retry**
   - Apply fix
   - Test in n8n
   - Reactivate parallel running
   - Validate for 7 days before cutover

---

## SUCCESS CRITERIA SUMMARY

### Before Starting Migration

- [ ] ✅ Notification inventory complete
- [ ] 🚨 GDPR preference enforcement implemented
- [ ] 🚨 All functions logging to notification_log
- [ ] ⚠️ Enhanced monitoring UI deployed
- [ ] 📊 Baseline metrics collected (7+ days)

### During Parallel Running (2 weeks)

- [ ] ✅ Both systems sending
- [ ] ✅ Source tracking working
- [ ] ✅ Send counts match ±5%
- [ ] ✅ Success rates match ±1%
- [ ] ✅ <0.5% duplicates
- [ ] ✅ 0 missing sends
- [ ] ✅ Team approves cutover

### After Full Migration

- [ ] ✅ All target notifications on n8n
- [ ] ✅ Success rate >98%
- [ ] ✅ No user complaints
- [ ] ✅ Supabase functions archived
- [ ] ✅ Documentation updated
- [ ] ✅ Team trained
- [ ] ✅ Monitoring established

---

## TIMELINE ESTIMATE

| Phase | Duration | Description |
|-------|----------|-------------|
| **Phase 0: Prerequisites** | **3-4 weeks** | Fix GDPR, logging, monitoring |
| - GDPR Compliance | 2-3 days | Implement preference enforcement |
| - Complete Logging | 2-3 days | Add logging to all functions |
| - Enhanced UI | 1 week | Build monitoring dashboard |
| - Baseline Collection | 1 week | Passive data collection |
| **Phase 1: Migration Prep** | **1 week** | n8n setup, test plan |
| **Phase 2: Parallel Running** | **2 weeks** | Validation period |
| **Phase 3: Gradual Cutover** | **3 weeks** | Week-by-week migration |
| **Phase 4: Post-Migration** | **1 week** | Documentation, training |
| **TOTAL** | **10-11 weeks** | Safe, validated migration |

---

## RISK ASSESSMENT

### High Risk - Must Mitigate

| Risk | Impact | Mitigation |
|------|--------|------------|
| **GDPR violation continues** | Legal fines | Fix preference enforcement FIRST |
| **Lost notifications** | User trust | Parallel running + monitoring |
| **Duplicate sends** | Spam complaints | Source tracking + deduplication |
| **n8n downtime** | Service interruption | Keep Supabase as fallback |

### Medium Risk - Monitor

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Performance degradation** | Slow sends | Load testing, optimization |
| **Database overload** | System slowdown | Index optimization, query tuning |
| **Cost increase** | Budget overrun | Monitor API usage, optimize |

### Low Risk - Acceptable

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Learning curve** | Slower operations | Training, documentation |
| **Workflow complexity** | Hard to maintain | Code reviews, documentation |

---

## STAKEHOLDER SIGN-OFF

Before beginning migration, obtain approval from:

- [ ] **Technical Lead**: Architecture approved
- [ ] **Compliance Officer**: GDPR fixes complete
- [ ] **Product Owner**: User impact acceptable
- [ ] **Operations**: Monitoring ready
- [ ] **Finance**: Budget approved

---

## FINAL PRE-FLIGHT CHECK

**Answer these questions**:

1. Can you see ALL notifications (Email + SMS + WhatsApp) in monitoring UI?
   - [ ] Yes → Proceed
   - [ ] No → Fix monitoring first

2. Are user preferences enforced (opt-outs work)?
   - [ ] Yes → Proceed
   - [ ] No → Fix GDPR first

3. Is ALL notification activity logged to notification_log?
   - [ ] Yes → Proceed
   - [ ] No → Fix logging first

4. Do you have 7+ days of baseline metrics?
   - [ ] Yes → Proceed
   - [ ] No → Collect more data

5. Is n8n infrastructure ready and tested?
   - [ ] Yes → Proceed
   - [ ] No → Set up n8n first

6. Does team understand rollback procedure?
   - [ ] Yes → Proceed
   - [ ] No → Train team first

**If ALL Yes**: ✅ Ready to begin n8n migration
**If ANY No**: ⚠️ Complete prerequisite tasks first

---

**DO NOT SKIP PREREQUISITES**

The 3-4 week preparation period is CRITICAL for safe migration. Rushing risks GDPR violations, lost notifications, and migration failures.

---

**Last Updated**: 2025-12-31
**Next Review**: After Phase 0 complete
