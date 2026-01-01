# Deployment Checklist - n8n Client Email Workflows

**Date**: 2025-12-31
**Target**: https://n8n.dreampathai.co.uk/

---

## Pre-Deployment Setup

### 1. Database Credentials ✓

**Action**: Add PostgreSQL credentials to n8n

1. In n8n, go to **Settings** → **Credentials**
2. Click **Add Credential** → **Postgres**
3. Configure:
   - **Name**: `Supabase PostgreSQL - ACG StaffLink`
   - **Host**: `db.rzzxxkppkiasuouuglaf.supabase.co`
   - **Port**: `5432`
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: [Get from Supabase Project Settings → Database → Connection String]
   - **SSL Mode**: `require`
   - **Connection Timeout**: `30000`

4. **Test Connection**:
   - Create a test workflow
   - Add PostgreSQL node
   - Run query: `SELECT COUNT(*) FROM clients`
   - Should return a number

**Status**: [ ] Complete

---

### 2. Resend API Key ✓

**Action**: Add Resend API key as environment variable or credential

**Option A: Environment Variable** (Recommended)
1. In your n8n deployment, add environment variable:
   ```bash
   N8N_ENV_RESEND_API_KEY=re_your_api_key_here
   ```
2. Restart n8n
3. Access in workflows via: `{{$env.RESEND_API_KEY}}`

**Option B: n8n Credential**
1. Go to **Settings** → **Credentials**
2. Click **Add Credential** → **Header Auth**
3. Configure:
   - **Name**: `Resend API Key`
   - **Name**: `Authorization`
   - **Value**: `Bearer re_your_api_key_here`

**Get Resend API Key**:
- Option 1: Supabase → Project Settings → Edge Functions → Secrets → `RESEND_API_KEY`
- Option 2: Login to Resend.com → API Keys

**Test Resend**:
```bash
curl https://api.resend.com/emails \
  -H "Authorization: Bearer re_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@acgstafflink.com",
    "to": "your-test-email@example.com",
    "subject": "n8n Test",
    "html": "<h1>Test</h1>"
  }'
```

**Status**: [ ] Complete

---

### 3. Test Data Preparation ✓

**Action**: Identify test clients and shifts for validation

1. **Find Test Client**:
   ```sql
   SELECT id, name, email, agency_id
   FROM clients
   WHERE status = 'active'
     AND (email LIKE '%test%' OR name LIKE '%Test%')
   LIMIT 1;
   ```

   **Test Client ID**: _________________
   **Test Client Email**: _________________

2. **Find Recent Shifts**:
   ```sql
   SELECT id, client_id, date, start_time, role_required
   FROM shifts
   WHERE status = 'confirmed'
     AND date >= CURRENT_DATE
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. **Create Test Queue Item** (for Batch Confirmations):
   ```sql
   INSERT INTO notification_queue (
     agency_id,
     recipient_email,
     recipient_type,
     notification_type,
     status,
     pending_items,
     item_count,
     scheduled_send_at
   )
   VALUES (
     'YOUR_AGENCY_ID',
     'YOUR_TEST_EMAIL',
     'client',
     'shift_confirmation',
     'pending',
     '[{"shift_id": "YOUR_SHIFT_ID"}]'::jsonb,
     1,
     NOW()
   )
   RETURNING id;
   ```

**Status**: [ ] Complete

---

## Workflow Creation

### 4. Create [SHARED] Send Email with Audit Logging ✓

**Type**: Sub-workflow (called by other workflows)

**Steps**:
1. In n8n, click **+ Create New Workflow**
2. Name: `[SHARED] Send Email with Audit Logging`
3. Add nodes in order:
   - Webhook (trigger)
   - PostgreSQL (fetch agency branding)
   - PostgreSQL (check user preferences)
   - Function (process preference check)
   - IF (branch on allowed)
   - HTTP Request (send via Resend) - True branch
   - PostgreSQL (log success) - True branch
   - PostgreSQL (log skipped) - False branch
4. Add Error Trigger workflow
5. Configure webhook URL: `/webhook/send-email-with-logging`
6. **Test with curl**:
   ```bash
   curl -X POST https://n8n.dreampathai.co.uk/webhook/send-email-with-logging \
     -H "Content-Type: application/json" \
     -d '{
       "recipient_email": "test@example.com",
       "subject": "Test Email",
       "html_content": "<h1>Test</h1>",
       "agency_id": "your-agency-id",
       "notification_type": "test",
       "client_id": "test-client-id",
       "metadata": {}
     }'
   ```

**Detailed Specs**: See [WORKFLOW_SPECS.md](#) (create this file)

**Status**: [ ] Created [ ] Tested [ ] Activated

---

### 5. Create Client Emails - Weekly Summary ✓

**Why Start Here**: Simplest workflow, tests foundation

**Steps**:
1. Create new workflow: `Client Emails - Weekly Summary`
2. Add Schedule Trigger: Cron `0 8 * * 1` (Monday 8 AM)
3. Add Function node: Calculate date range (last Mon-Sun)
4. Add PostgreSQL node: Get active clients
5. Add Loop Over Items
6. Inside loop:
   - PostgreSQL: Call `get_weekly_summary_data()` RPC
   - IF: Check if has data
   - Function: Build HTML email (use code from TEMPLATE_FUNCTIONS.md)
   - HTTP Request: Call shared workflow webhook
7. **Test manually** before scheduling:
   - Click "Execute Workflow"
   - Use test client data
   - Verify email received
   - Check notification_log for entry

**Status**: [ ] Created [ ] Tested [ ] Activated

---

### 6. Create Client Emails - Daily Digest ✓

**Steps**:
1. Create new workflow: `Client Emails - Daily Digest`
2. Add Schedule Trigger: Cron `0 10 * * *` (Daily 10 AM)
3. Add PostgreSQL node: Get active clients
4. Add Loop Over Items
5. Inside loop:
   - Function: Calculate tomorrow's date
   - PostgreSQL: Get tomorrow's confirmed shifts
   - IF: Check if has shifts
   - Function: Build daily digest HTML
   - HTTP Request: Call shared workflow webhook
7. **Test manually**:
   - Set trigger to "Execute" instead of schedule
   - Run for test client only
   - Verify email looks correct

**Status**: [ ] Created [ ] Tested [ ] Activated

---

### 7. Create Client Emails - Batch Confirmations ✓

**Why Last**: Most complex, has loop and grouping logic

**Steps**:
1. Create new workflow: `Client Emails - Batch Confirmations`
2. Add Schedule Trigger: Cron `*/5 * * * *` (Every 5 minutes)
3. Add PostgreSQL node: Query pending queue (LIMIT 50)
4. Add IF: Check if any results
5. Add Loop Over Items
6. Inside loop:
   - Function: Extract shift IDs from pending_items
   - PostgreSQL: Fetch shift details
   - Function: Group shifts (complex - see TEMPLATE_FUNCTIONS.md)
   - Function: Build HTML email
   - HTTP Request: Call shared workflow webhook
   - PostgreSQL: Update queue status to 'sent'
7. Add error handling for failed sends
8. **Test with test queue item**:
   - Create test queue item (see step 3)
   - Run workflow manually
   - Verify email sent
   - Check queue status updated

**Status**: [ ] Created [ ] Tested [ ] Activated

---

## Parallel Running Activation

### 8. Activate All Workflows ✓

**Action**: Turn on all 4 workflows

1. For each workflow:
   - Click "Active" toggle in top right
   - Verify cron schedule is correct
   - Check that webhook URLs are accessible

2. **Monitor First 24 Hours**:
   - Check n8n execution logs every 2 hours
   - Look for any errors or failures
   - Verify emails are being sent

**Activation Checklist**:
- [ ] [SHARED] Send Email with Audit Logging - Active (webhook)
- [ ] Client Emails - Weekly Summary - Active (cron Mon 8 AM)
- [ ] Client Emails - Daily Digest - Active (cron daily 10 AM)
- [ ] Client Emails - Batch Confirmations - Active (cron every 5 min)

**Status**: [ ] All Active

---

### 9. Validate Parallel Running ✓

**Action**: Compare n8n outputs with Supabase Edge Functions

**Daily Check (for 2 weeks)**:

```sql
-- Compare sent counts by source
SELECT
  DATE(created_at) as date,
  source,
  notification_type,
  COUNT(*) as total_sent,
  SUM(CASE WHEN delivery_status = 'sent' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN delivery_status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM notification_log
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND notification_type IN ('shift_confirmation', 'daily_digest', 'weekly_summary')
GROUP BY DATE(created_at), source, notification_type
ORDER BY date DESC, source;
```

**Expected Results**:
- Both `supabase_function` and `n8n_workflow` should have similar counts
- Success rates should be >99% for both
- No significant difference in totals

**Validation Criteria**:
- [ ] Daily counts match within 5%
- [ ] Success rates >99%
- [ ] No duplicate emails reported by clients
- [ ] All preference checks respected
- [ ] No critical errors in n8n logs

**Status**: [ ] Week 1 Complete [ ] Week 2 Complete

---

## Gradual Cutover

### 10. Disable Batch Confirmations Cron (Week 3) ✓

**Action**: Disable `notification-digest-engine` edge function cron

**Steps**:
1. Connect to Supabase database:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'notification-digest-engine';
   ```

2. Unschedule the cron:
   ```sql
   SELECT cron.unschedule('notification-digest-engine');
   ```

3. **Monitor for 7 days**:
   - Only n8n should be processing batch confirmations
   - Check notification_log for only `source = 'n8n_workflow'`
   - Verify no processing gaps

4. **Rollback Plan** (if issues):
   ```sql
   SELECT cron.schedule(
     'notification-digest-engine',
     '*/5 * * * *',
     $$SELECT net.http_post(
       url:='https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/notification-digest-engine',
       headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY"}'::jsonb,
       body:='{"scheduled": true}'::jsonb
     )$$
   );
   ```

**Status**: [ ] Cron Disabled [ ] 7 Days Validated [ ] No Issues

---

### 11. Disable Daily Digest Cron (Week 4) ✓

**Action**: Disable `daily-client-digest` edge function cron

**Steps**:
1. Check if cron exists:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'daily-client-digest';
   ```

2. If exists, unschedule:
   ```sql
   SELECT cron.unschedule('daily-client-digest');
   ```

3. **Monitor for 7 days**

**Status**: [ ] Cron Disabled [ ] 7 Days Validated

---

### 12. Disable Weekly Summary Cron (Week 4) ✓

**Action**: Disable `weekly-client-summary` edge function cron

**Steps**:
1. Check if cron exists:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'weekly-client-summary';
   ```

2. If exists, unschedule:
   ```sql
   SELECT cron.unschedule('weekly-client-summary');
   ```

3. **Monitor for 7 days**

**Status**: [ ] Cron Disabled [ ] 7 Days Validated

---

## Post-Migration

### 13. Archive Old Edge Functions ✓

**Action**: Keep functions but disable auto-deployment

1. Add comment to function files:
   ```typescript
   // ============================================================================
   // STATUS: ARCHIVED - Replaced by n8n workflow on 2025-01-XX
   // Kept for emergency rollback only
   // ============================================================================
   ```

2. Update `FUNCTIONS_DEPLOY_MANIFEST.md` to exclude these functions

3. **Do NOT delete** - keep for emergency rollback

**Functions to Archive**:
- [ ] `notification-digest-engine`
- [ ] `daily-client-digest`
- [ ] `weekly-client-summary`

**Status**: [ ] Complete

---

### 14. Update Documentation ✓

**Action**: Update project documentation

1. **Update README** in project root:
   - Document that client emails now use n8n
   - Add link to this module folder
   - Update architecture diagrams

2. **Create RUNBOOK** for team:
   - How to monitor n8n workflows
   - How to manually trigger workflows
   - How to troubleshoot failures
   - Emergency rollback procedure

3. **Team Training**:
   - Schedule session to show n8n dashboard
   - Demonstrate how to check execution logs
   - Show how to edit workflows

**Status**: [ ] README Updated [ ] Runbook Created [ ] Team Trained

---

### 15. Set Up Monitoring Alerts ✓

**Action**: Configure alerts for workflow failures

**Option A: n8n Built-in Alerts**
1. In n8n, go to workflow settings
2. Enable "Error Workflow"
3. Create error notification workflow:
   - Trigger: On workflow error
   - Action: Send email/Slack to team

**Option B: External Monitoring**
1. Set up daily cron to check notification_log
2. Alert if:
   - Success rate <95% in last 24 hours
   - No sends for expected workflows
   - Database connection errors

**Monitoring Queries**:
```sql
-- Daily health check
SELECT
  notification_type,
  COUNT(*) as total,
  SUM(CASE WHEN delivery_status = 'sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN delivery_status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM notification_log
WHERE source = 'n8n_workflow'
  AND created_at >= CURRENT_DATE
GROUP BY notification_type;
```

**Status**: [ ] Alerts Configured [ ] Tested

---

## Success Criteria

### Final Validation ✓

**Checklist**:
- [ ] All 4 workflows created and active
- [ ] 2 weeks parallel running with 100% match
- [ ] Gradual cutover complete (all crons disabled)
- [ ] Success rate >99% for n8n workflows
- [ ] No duplicate emails reported
- [ ] User preferences respected 100%
- [ ] Full audit trail in notification_log
- [ ] Team trained on n8n management
- [ ] Documentation updated
- [ ] Monitoring alerts active

**Sign-Off**:
- Project Manager: _________________ Date: _______
- Technical Lead: _________________ Date: _______

---

## Rollback Procedure

### Emergency Rollback

If critical issues occur at any stage:

1. **Pause n8n workflows**:
   - Go to each workflow
   - Click "Active" toggle to deactivate

2. **Re-enable Supabase crons**:
   ```sql
   -- notification-digest-engine
   SELECT cron.schedule(
     'notification-digest-engine',
     '*/5 * * * *',
     $$SELECT net.http_post(...)$$
   );

   -- Add others as needed
   ```

3. **Monitor for 24 hours**:
   - Verify edge functions are sending
   - Check notification_log for `source = 'supabase_function'`

4. **Investigate n8n issues**:
   - Check execution logs for errors
   - Review database connection
   - Verify Resend API key is valid

5. **Fix and retry when ready**

**No Data Loss**: Both systems write to same notification_log, so rollback is safe

---

## Timeline

- **Day 1** (2025-12-31): Setup credentials, create workflows ✓
- **Day 2-3**: Test all workflows with sample data
- **Day 4**: Activate parallel running
- **Days 5-18**: Validation period (2 weeks)
- **Day 19-25**: Gradual cutover (week 3-4)
- **Day 26+**: Full migration, monitor and optimize

**Total Time**: ~4 weeks from start to completion

---

## Support Contacts

- **n8n Instance**: https://n8n.dreampathai.co.uk/
- **Supabase Project**: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf
- **Documentation**: This folder (agent_missions/MODULE_N8N_CLIENT_EMAILS/)

---

## Notes

- Keep this checklist updated as you complete each step
- Mark completion dates for audit trail
- Document any issues encountered in separate ISSUES.md file
- Take screenshots of n8n workflows for documentation
