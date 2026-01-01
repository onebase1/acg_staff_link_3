# MODULE: n8n Client Email Automation (Phase 1)

**Status**: In Progress
**Created**: 2025-12-31
**Priority**: High
**Dependencies**: Module 34 (CLIENT_EMAIL_REDESIGN)

## Overview

This module implements n8n workflows to handle the 3 core client email types, running in parallel with existing Supabase Edge Functions for validation before full cutover.

## Objectives

### Primary Goals
1. Migrate client email automation from Supabase Edge Functions to n8n
2. Run in parallel with existing system for validation (zero risk)
3. Maintain full audit trail and compliance requirements
4. Create scalable architecture for future notification types

### Client Email Types Covered
1. **Batch Shift Confirmations** (Event-driven, every 5 min)
   - Triggered when admin books shifts
   - Groups shifts by Date → Time → Role
   - Professional table format (not repetitive cards)

2. **Daily Client Digest** (Scheduled, 10 AM daily)
   - "Who's coming tomorrow" email
   - Shows next day's confirmed shifts
   - Includes staff names with profile links

3. **Weekly Summary** (Scheduled, Monday 8 AM)
   - Aggregated shift summary for past week
   - Invoice-style table format
   - Shows shift counts and hours (no individual staff)

## Architecture

### Current System (Supabase Edge Functions)
```
Database → notification_queue → Edge Functions (cron) → Resend API → notification_log
```

### New System (n8n Workflows)
```
Database → notification_queue → n8n Workflows (cron) → Resend API → notification_log
```

### Parallel Running Strategy
- Both systems process the same data
- Both write to `notification_log` with different `source` values
- Compare outputs for 1-2 weeks before cutover
- Gradual migration (one email type at a time)

## Technical Stack

- **Workflow Engine**: n8n (self-hosted at https://n8n.dreampathai.co.uk/)
- **Database**: Supabase PostgreSQL (direct connection)
- **Email Provider**: Resend API
- **Templates**: HTML with dynamic variable injection
- **Scheduling**: n8n cron triggers

## Workflows Created

### 1. [SHARED] Send Email with Audit Logging
**Type**: Sub-workflow (webhook trigger)
**Purpose**: Reusable component for all email sends

**Features**:
- Fetches agency branding from database
- Checks user opt-out preferences
- Sends via Resend API
- Logs to notification_log (success/failure/skipped)
- Updates notification_queue status

### 2. Client Emails - Batch Confirmations
**Trigger**: Cron `*/5 * * * *` (every 5 minutes)
**Purpose**: Process notification_queue for shift confirmations

**Process**:
1. Query pending batch confirmations
2. Fetch shift details, staff names, client info
3. Group shifts hierarchically (Date → Time → Role)
4. Build HTML email using template
5. Call shared sub-workflow to send

### 3. Client Emails - Daily Digest
**Trigger**: Cron `0 10 * * *` (daily at 10 AM)
**Purpose**: Send "who's coming tomorrow" to all active clients

**Process**:
1. Get all active clients
2. For each client, fetch tomorrow's confirmed shifts
3. Build daily digest HTML
4. Call shared sub-workflow to send

### 4. Client Emails - Weekly Summary
**Trigger**: Cron `0 8 * * 1` (Monday at 8 AM)
**Purpose**: Send aggregated weekly shift summary

**Process**:
1. Calculate date range (last Monday-Sunday)
2. Get all active clients
3. For each client, call `get_weekly_summary_data()` RPC
4. Build weekly summary HTML table
5. Call shared sub-workflow to send

## Database Schema

### Key Tables Used

#### notification_queue
- Stores batched notifications awaiting delivery
- Updated by n8n workflows (status: pending → sent/failed/cancelled)

#### notification_log
- Audit trail for all notification sends
- Written by n8n workflows with `source = 'n8n_workflow'`

#### clients
- Active client list with email addresses

#### shifts
- Shift details for email content

#### staff
- Staff names for shift assignments

#### agencies
- Branding information (logo, name, colors)

### PostgreSQL Connection
- Host: `db.rzzxxkppkiasuouuglaf.supabase.co`
- Port: `5432`
- Database: `postgres`
- SSL: Enabled
- Credentials: Stored in n8n credentials manager

## Compliance & Security

### CQC Compliance
- NO phone numbers in client emails (privacy requirement)
- Magic links for staff profile access (30-day expiry)
- Full audit trail in notification_log

### GDPR Compliance
- User opt-out preferences checked before every send
- Preference status logged for audit
- Skipped sends recorded with reason

### Multi-Tenancy
- All queries filtered by `agency_id`
- Agency branding fetched dynamically
- Isolated data per agency

## Deployment Strategy

### Phase 1: Parallel Running (Weeks 1-2)
- [x] Create n8n workflows
- [ ] Activate all 4 workflows
- [ ] Monitor execution logs
- [ ] Compare with edge function outputs
- [ ] Validate success rates match

### Phase 2: Gradual Cutover (Week 3)
- [ ] Disable `notification-digest-engine` cron
- [ ] Monitor batch confirmations (n8n only)
- [ ] Validate no issues for 7 days

### Phase 3: Full Migration (Week 4)
- [ ] Disable `daily-client-digest` cron
- [ ] Disable `weekly-client-summary` cron
- [ ] n8n handles all 3 email types
- [ ] Edge functions kept as manual backup

### Rollback Plan
- Re-enable Supabase crons in dashboard
- Pause n8n workflows
- No data loss (both systems write to same tables)

## Success Metrics

### Monitored via n8n Execution Logs
- Emails sent per day (compare to edge functions)
- Success rate (target: >99%)
- Average execution time (target: <30s per email)
- Preference check blocks
- Failures and retry attempts

### SQL Query for Comparison
```sql
SELECT
  source,
  notification_type,
  DATE(created_at) as date,
  COUNT(*) as total_sent,
  SUM(CASE WHEN delivery_status = 'sent' THEN 1 ELSE 0 END) as successful
FROM notification_log
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY source, notification_type, DATE(created_at)
ORDER BY date DESC, source;
```

## Future Enhancements (Post-Phase 1)

### Additional Notification Types
- Staff notifications (shift reminders, assignments)
- Admin notifications (critical alerts)
- SMS notifications (Twilio integration)
- WhatsApp notifications (Twilio + OpenAI)

### Advanced Features
- A/B testing email templates
- Send time optimization
- Engagement tracking (opens, clicks)
- Retry logic for failed sends
- Rate limiting for high-volume sends

## Documentation Files

- **README.md** (this file) - Overview and architecture
- **IMPLEMENTATION_PLAN.md** - Detailed implementation plan
- **SQL_QUERIES.md** - All database queries used
- **TEMPLATE_FUNCTIONS.md** - JavaScript code for HTML templates
- **WORKFLOW_SPECS.md** - Technical specifications for each workflow
- **DEPLOYMENT_CHECKLIST.md** - Step-by-step activation guide
- **TESTING_GUIDE.md** - How to validate workflows

## Exported Workflows

JSON exports for backup and version control:
- `[SHARED] Send Email with Audit Logging.json`
- `Client Emails - Batch Confirmations.json`
- `Client Emails - Daily Digest.json`
- `Client Emails - Weekly Summary.json`

## Related Modules

- **MODULE_34_CLIENT_EMAIL_REDESIGN** - Original implementation in Supabase Edge Functions
- Future: MODULE_N8N_STAFF_NOTIFICATIONS (Phase 2)
- Future: MODULE_N8N_ADMIN_ALERTS (Phase 3)

## Team Notes

This module is designed to be **independent from the current system** during parallel running. No changes are made to existing edge functions or database schema. This allows for safe validation and easy rollback if needed.

The architecture is **scalable** - once the 3 client email types are validated, the same patterns can be extended to staff notifications, SMS, WhatsApp, and other channels.

## Support

- n8n Instance: https://n8n.dreampathai.co.uk/
- Documentation: This folder
- Related Issue: notification-digest-v2 naming conflict (not addressed in this module)
