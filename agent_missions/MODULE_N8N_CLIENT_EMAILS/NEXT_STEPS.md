# Next Steps - n8n Client Email Automation

**Date**: 2025-12-31
**Status**: Documentation Complete, Ready for Implementation

---

## What's Been Completed ✓

1. **Comprehensive Research**
   - Analyzed Module 34 (CLIENT_EMAIL_REDESIGN) implementation
   - Documented current notification system architecture
   - Identified 3 client email types to migrate
   - Mapped database schema and requirements

2. **Complete Documentation Created**
   - [README.md](./README.md) - Module overview and architecture
   - [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Detailed implementation strategy
   - [SQL_QUERIES.md](./SQL_QUERIES.md) - All database queries with examples
   - [TEMPLATE_FUNCTIONS.md](./TEMPLATE_FUNCTIONS.md) - JavaScript code for HTML email generation
   - [WORKFLOW_SPECS.md](./WORKFLOW_SPECS.md) - Node-by-node n8n workflow specifications
   - [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Step-by-step deployment guide
   - [NEXT_STEPS.md](./NEXT_STEPS.md) - This file

3. **Architecture Designed**
   - 1 shared sub-workflow for email sending + audit logging
   - 3 main workflows (Batch Confirmations, Daily Digest, Weekly Summary)
   - Parallel running strategy for safe validation
   - Gradual cutover plan with rollback procedures

---

## What Cannot Be Done (MCP Limitation)

**Issue**: The n8n MCP server tools are not accessible in this Claude Code session.

**Impact**: I cannot programmatically create workflows in your n8n instance.

**Solution**: You'll need to manually create the workflows using the detailed specifications provided.

---

## What You Need to Do Next

### Step 1: Get Supabase Database Credentials

**Action**: Retrieve PostgreSQL connection details

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf
2. Navigate to: **Project Settings** → **Database**
3. Find **Connection String** section
4. Note down:
   - **Host**: `db.rzzxxkppkiasuouuglaf.supabase.co`
   - **Port**: `5432`
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: [Click "Show" to reveal]

**Save these credentials** - you'll need them for n8n setup.

---

### Step 2: Get Resend API Key

**Action**: Retrieve Resend API key for sending emails

**Option A - From Supabase Secrets**:
1. Supabase Dashboard → **Edge Functions** → **Environment Variables**
2. Find `RESEND_API_KEY`
3. Copy the value (starts with `re_`)

**Option B - From Resend Dashboard**:
1. Login to https://resend.com
2. Go to **API Keys**
3. Copy your API key

---

### Step 3: Configure n8n Credentials

**Action**: Add database and email credentials to n8n

1. Open n8n: https://n8n.dreampathai.co.uk/
2. Go to **Settings** → **Credentials**

**Add PostgreSQL Credential**:
   - Click **Add Credential** → **Postgres**
   - **Name**: `Supabase PostgreSQL - ACG StaffLink`
   - **Host**: (from Step 1)
   - **Port**: `5432`
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: (from Step 1)
   - **SSL Mode**: `require`
   - **Connection Timeout**: `30000`
   - Click **Save** and **Test Connection**

**Add Resend API Key** (as environment variable or credential):
   - If using env var: Set `N8N_ENV_RESEND_API_KEY=re_your_key`
   - If using credential: Add as Header Auth with `Authorization: Bearer re_your_key`

---

### Step 4: Create n8n Workflows

**Action**: Build 4 workflows using detailed specifications

**Order of Creation** (start with simplest):

1. **[SHARED] Send Email with Audit Logging** (Foundation)
   - Open [WORKFLOW_SPECS.md](./WORKFLOW_SPECS.md#1-shared-send-email-with-audit-logging)
   - Follow node-by-node instructions
   - Test with curl command provided
   - Ensure webhook accessible

2. **Client Emails - Weekly Summary** (Simplest main workflow)
   - Open [WORKFLOW_SPECS.md](./WORKFLOW_SPECS.md#4-client-emails---weekly-summary)
   - Copy JavaScript code from [TEMPLATE_FUNCTIONS.md](./TEMPLATE_FUNCTIONS.md#weekly-summary-email)
   - Test manually before scheduling

3. **Client Emails - Daily Digest** (Medium complexity)
   - Open [WORKFLOW_SPECS.md](./WORKFLOW_SPECS.md#3-client-emails---daily-digest)
   - Copy JavaScript code from [TEMPLATE_FUNCTIONS.md](./TEMPLATE_FUNCTIONS.md#daily-digest-email)
   - Test manually before scheduling

4. **Client Emails - Batch Confirmations** (Most complex)
   - Open [WORKFLOW_SPECS.md](./WORKFLOW_SPECS.md#2-client-emails---batch-confirmations)
   - Copy JavaScript code from [TEMPLATE_FUNCTIONS.md](./TEMPLATE_FUNCTIONS.md#batch-confirmation-email)
   - Test with test queue item (create via SQL)

**Time Estimate**: 2-3 hours for all 4 workflows

---

### Step 5: Test Each Workflow

**Action**: Validate workflows work correctly before activating

**Testing Strategy**:

1. **Manual Execution**:
   - Click "Execute Workflow" in n8n
   - Check execution log for errors
   - Verify email received in your test inbox

2. **Database Validation**:
   ```sql
   -- Check notification_log for test sends
   SELECT *
   FROM notification_log
   WHERE source = 'n8n_workflow'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

3. **Test Data**:
   - Use test client email (your own email)
   - Create test queue item for batch confirmations
   - Check tomorrow has shifts for daily digest

**See**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for detailed testing procedures

---

### Step 6: Activate Parallel Running

**Action**: Turn on all workflows to run alongside existing system

1. **Activate All Workflows**:
   - [SHARED] Send Email with Audit Logging (webhook - always on)
   - Client Emails - Weekly Summary (Cron: `0 8 * * 1`)
   - Client Emails - Daily Digest (Cron: `0 10 * * *`)
   - Client Emails - Batch Confirmations (Cron: `*/5 * * * *`)

2. **Monitor for 24 Hours**:
   - Check n8n execution logs every 2-4 hours
   - Look for any failures or errors
   - Verify emails are being sent

3. **Compare Outputs** (Daily for 2 weeks):
   ```sql
   -- Compare n8n vs Supabase Edge Functions
   SELECT
     DATE(created_at) as date,
     source,
     notification_type,
     COUNT(*) as total,
     SUM(CASE WHEN delivery_status = 'sent' THEN 1 ELSE 0 END) as successful
   FROM notification_log
   WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
   GROUP BY DATE(created_at), source, notification_type
   ORDER BY date DESC, source;
   ```

**Expected**: Both `supabase_function` and `n8n_workflow` should have similar counts

---

### Step 7: Gradual Cutover (After 2 Weeks)

**Action**: Disable Supabase Edge Function crons one by one

**Week 3**: Disable Batch Confirmations
```sql
SELECT cron.unschedule('notification-digest-engine');
```

**Week 4**: Disable Daily and Weekly
```sql
SELECT cron.unschedule('daily-client-digest');
SELECT cron.unschedule('weekly-client-summary');
```

**Monitor** each cutover for 7 days before proceeding to next

**See**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md#gradual-cutover) for detailed steps

---

## Important Notes

### DO NOT Skip Parallel Running

**Why**: This is critical for validation
- Ensures n8n workflows produce identical outputs
- Allows safe rollback if issues detected
- Prevents lost emails during transition

### Keep Edge Functions as Backup

**Why**: Rollback plan requires them
- Do NOT delete edge function code
- Only disable cron jobs
- Archive with comments, don't remove

### Monitor notification_log Daily

**Why**: Early detection of issues
- Compare sent counts (n8n vs edge functions)
- Check for failures or errors
- Validate preference checking works

---

## Timeline

| Week | Activity | Action Required |
|------|----------|-----------------|
| **Week 1** | Setup & Testing | Configure credentials, create workflows, test manually |
| **Week 2** | Parallel Running | Activate all workflows, monitor daily, compare outputs |
| **Week 3** | First Cutover | Disable batch confirmations cron, monitor n8n only |
| **Week 4** | Full Migration | Disable remaining crons, 100% on n8n |
| **Week 5+** | Monitoring | Daily health checks, optimize performance |

**Total**: 4 weeks from start to full migration

---

## Support Resources

### Documentation
- **Full Module Folder**: `C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3\agent_missions\MODULE_N8N_CLIENT_EMAILS\`
- **Related Module**: `agent_missions\MODULE_34_CLIENT_EMAIL_REDESIGN\` (original implementation)

### External Links
- **n8n Instance**: https://n8n.dreampathai.co.uk/
- **Supabase Dashboard**: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf
- **Resend Dashboard**: https://resend.com/
- **n8n Documentation**: https://docs.n8n.io/

### Database Access
```bash
# psql connection string
psql "postgresql://postgres:[PASSWORD]@db.rzzxxkppkiasuouuglaf.supabase.co:5432/postgres"
```

---

## Troubleshooting

### If You Get Stuck

**Problem**: Can't create workflow nodes correctly
**Solution**: Reference [WORKFLOW_SPECS.md](./WORKFLOW_SPECS.md) for exact node configurations

**Problem**: PostgreSQL connection fails
**Solution**: Check SSL mode is set to "require" and timeout is 30000ms

**Problem**: Resend API returns 401
**Solution**: Verify API key starts with `re_` and is correct

**Problem**: JavaScript function errors
**Solution**: Copy code exactly from [TEMPLATE_FUNCTIONS.md](./TEMPLATE_FUNCTIONS.md)

**Problem**: Emails not sending
**Solution**: Check n8n execution logs, verify shared webhook is accessible

---

## Success Criteria

You'll know you're successful when:

- [ ] All 4 workflows created and active
- [ ] Test emails received successfully
- [ ] notification_log shows `source = 'n8n_workflow'` entries
- [ ] Parallel running for 2 weeks with matching counts
- [ ] Gradual cutover complete (all crons disabled)
- [ ] Success rate >99% for n8n workflows
- [ ] No duplicate emails reported by clients

---

## Next Actions (Priority Order)

1. **[HIGH]** Get Supabase database password (Step 1)
2. **[HIGH]** Get Resend API key (Step 2)
3. **[HIGH]** Configure n8n credentials (Step 3)
4. **[MEDIUM]** Create [SHARED] workflow and test (Step 4.1)
5. **[MEDIUM]** Create Weekly Summary workflow (Step 4.2)
6. **[MEDIUM]** Create Daily Digest workflow (Step 4.3)
7. **[MEDIUM]** Create Batch Confirmations workflow (Step 4.4)
8. **[LOW]** Activate parallel running (Step 6)
9. **[LOW]** Monitor for 2 weeks (Step 6)
10. **[LOW]** Gradual cutover (Step 7)

---

## Questions?

If you need help with:
- **Workflow creation**: Reference WORKFLOW_SPECS.md
- **JavaScript functions**: Reference TEMPLATE_FUNCTIONS.md
- **SQL queries**: Reference SQL_QUERIES.md
- **Deployment steps**: Reference DEPLOYMENT_CHECKLIST.md
- **Overall strategy**: Reference IMPLEMENTATION_PLAN.md

All documentation is in: `agent_missions/MODULE_N8N_CLIENT_EMAILS/`

---

## Alternative: Let Me Help You Create Workflows

If you prefer, you can:

1. **Screen share your n8n instance** - I can guide you through creating workflows
2. **Give me temporary access** - If n8n supports API key creation, I could build workflows via API
3. **Work together iteratively** - You create basic structure, I provide code/corrections

Just let me know how you'd like to proceed!

---

**Ready to Start?**

Begin with Steps 1-3 (credentials), then let me know when you're ready to create workflows. I can provide additional guidance, clarifications, or alternative approaches as needed.

Good luck! This is a solid, well-designed migration path. 🚀
