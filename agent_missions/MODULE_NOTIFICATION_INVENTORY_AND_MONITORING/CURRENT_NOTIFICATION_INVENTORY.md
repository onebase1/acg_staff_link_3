# Complete Notification Inventory - ACG StaffLink

**Date**: 2025-12-31
**Purpose**: Comprehensive inventory of ALL notifications sent by the platform
**Context**: Pre-n8n migration audit

---

## Executive Summary

### Current State

**Total Edge Functions Deployed**: 58+ functions
**Notification-Related Functions**: 40+ functions
**Active Cron Jobs**: 24 scheduled jobs (17 send notifications)
**Channels**: Email, SMS, WhatsApp
**Database Tables**: `notification_queue`, `notification_log`, `client_notifications`

### Notification Breakdown

| Channel | Function Count | Frequency | Primary Use |
|---------|---------------|-----------|-------------|
| **Email** | 20+ | Real-time + Scheduled | Client updates, Staff assignments, Admin alerts |
| **SMS** | 10+ | Real-time + Scheduled | Urgent alerts, Shift reminders, Quick confirmations |
| **WhatsApp** | 10+ | Real-time + AI-powered | Shift offers, Timesheets, Conversational AI |

---

## 1. EMAIL NOTIFICATIONS

### 1.1 Client-Facing Emails

#### **A. Shift Confirmations** (Event-Driven)
- **Function**: `notification-digest-engine`
- **Trigger**: When admin books shifts
- **Frequency**: Every 5 minutes (batched)
- **Template**: `batch_confirmation.html`
- **Recipients**: Care home managers, client contacts
- **Content**:
  - Grouped shifts by Date → Time → Role
  - Staff names with profile links (NO phone numbers for CQC compliance)
  - Role summaries and total hours
  - Professional table format
- **Queue**: Uses `notification_queue` table for 5-minute batching

#### **B. Daily Client Digest** (Scheduled)
- **Function**: `daily-client-digest`
- **Trigger**: Daily at 10:00 AM
- **Cron**: `0 10 * * *`
- **Template**: `daily_client_digest.html`
- **Recipients**: All active clients
- **Content**:
  - "Who's coming tomorrow" schedule
  - Tomorrow's confirmed shifts
  - Staff names and roles
  - Arrival time reminders
- **Status**: ACTIVE

#### **C. Weekly Summary** (Scheduled)
- **Function**: `weekly-client-summary`
- **Trigger**: Every Monday at 8:00 AM
- **Cron**: `0 8 * * 1` (Mondays)
- **Template**: `weekly_summary.html`
- **Recipients**: All active clients
- **Content**:
  - Aggregated weekly shift data
  - Invoice-style table format
  - Shift counts and hours (NOT individual staff)
  - NO costs/pricing included
  - Month-to-date summary
- **Status**: ACTIVE

#### **D. Critical Change Notifications** (Real-Time)
- **Function**: `critical-change-notifier`
- **Trigger**: Profile/compliance changes
- **Frequency**: Every 5 minutes
- **Recipients**: Clients affected by changes
- **Content**:
  - Staff profile updates
  - Compliance status changes
  - Assignment modifications
- **Status**: ACTIVE

#### **E. Client Communication Automation** (Hourly)
- **Function**: `client-communication-automation`
- **Trigger**: Hourly
- **Recipients**: Clients based on triggered events
- **Content**: Various automated client communications
- **Status**: ACTIVE

---

### 1.2 Staff-Facing Emails

#### **A. Shift Assignment Notifications** (Real-Time)
- **Function**: `notification-digest-engine` (via queue)
- **Trigger**: When assigned to shift
- **Content**:
  - Shift details (date, time, location)
  - Client information
  - Role requirements
  - Accept/decline links
- **Status**: ACTIVE

#### **B. Shift Reminders** (Scheduled)
- **Function**: `shift-reminder-engine`
- **Trigger**:
  - 24 hours before shift: `reminder_24h_sent`
  - 2 hours before shift: `reminder_2h_sent`
- **Recipients**: Staff with upcoming confirmed shifts
- **Content**:
  - Shift details confirmation
  - Client location and contact
  - Clock-in instructions
  - What to bring (PPE, uniform)
- **Status**: ACTIVE

#### **C. Staff Daily Digest** (Scheduled)
- **Function**: `staff-daily-digest-engine`
- **Trigger**: Daily at 8:00 AM
- **Cron**: `0 8 * * *`
- **Recipients**: All active staff
- **Content**:
  - Today's confirmed shifts
  - Upcoming shifts this week
  - Pending assignments needing response
  - Available marketplace shifts
  - Compliance expiry warnings
- **Status**: ACTIVE

#### **D. Smart Marketplace Digest** (Scheduled)
- **Function**: `smart-marketplace-digest`
- **Trigger**: Based on staff preferences and availability
- **Recipients**: Staff who opted into marketplace alerts
- **Content**:
  - Relevant open shifts matching preferences
  - Location-based offers (geofencing)
  - Role-matched opportunities
  - Urgency indicators
- **Status**: ACTIVE

#### **E. Incomplete Profile Reminders** (Daily)
- **Function**: `incomplete-profile-reminder`
- **Trigger**: Daily at 9:00 AM
- **Cron**: `0 9 * * *`
- **Recipients**: Staff with incomplete profiles
- **Content**:
  - Missing documents list
  - Compliance items needed
  - Profile completion percentage
  - Direct links to upload documents
- **Status**: ACTIVE

#### **F. Post-Shift Timesheet Reminders** (Hourly)
- **Function**: `post-shift-timesheet-reminder`
- **Trigger**: After shift completion (hourly check)
- **Recipients**: Staff who completed shifts without submitting timesheets
- **Content**:
  - Shift worked details
  - Request to submit timesheet
  - Upload instructions
  - Deadline warnings
- **Status**: ACTIVE

#### **G. Smart Clock-Out Reminders** (Every 5 min)
- **Function**: `smart-clock-out-reminders`
- **Trigger**: Every 5 minutes during active shifts
- **Recipients**: Staff who clocked in but haven't clocked out (past shift end time)
- **Content**:
  - Reminder to clock out
  - Current shift duration
  - Clock-out instructions
- **Status**: ACTIVE

#### **H. Post-Shift Rating Reminder** (Hourly)
- **Function**: `post-shift-rating-reminder`
- **Trigger**: Hourly after shift completion
- **Recipients**: Staff who completed shifts without rating
- **Content**:
  - Request to rate shift/client
  - Rating link
  - Importance of feedback
- **Status**: ACTIVE

#### **I. Payment Reminders** (Daily)
- **Function**: `payment-reminder-engine`
- **Trigger**: Daily at 9:00 AM
- **Cron**: `0 9 * * *`
- **Recipients**: Staff with pending payments/invoices
- **Content**:
  - Outstanding payment status
  - Expected payment dates
  - Payment method updates
- **Status**: ACTIVE

#### **J. Profile Document Reminders** (Daily)
- **Function**: `send-profile-reminders`
- **Trigger**: Scheduled (daily)
- **Recipients**: Staff with expiring documents
- **Content**:
  - List of expiring documents
  - Expiry dates
  - Upload instructions
  - Compliance warnings
- **Status**: ACTIVE

---

### 1.3 Admin-Facing Emails

#### **A. Internal Admin Notifier** (Every 15 min)
- **Function**: `internal-admin-notifier`
- **Trigger**: Every 15 minutes
- **Recipients**: Agency admins
- **Content**:
  - Critical system alerts
  - Pending approvals
  - Failed automations
  - System health metrics
- **Status**: ACTIVE

#### **B. Urgent Shift Escalation** (Every 5 min)
- **Function**: `urgent-shift-escalation`
- **Trigger**: Every 5 minutes
- **Recipients**: Agency admins
- **Content**:
  - Unfilled urgent shifts
  - Shifts approaching deadline
  - Escalation levels
  - Recommended actions
- **Status**: ACTIVE

#### **C. No-Show Detection Alerts** (Every 5 min)
- **Function**: `no-show-detection-engine`
- **Trigger**: Every 5 minutes
- **Recipients**: Admins + affected clients
- **Content**:
  - Staff no-show detected
  - Shift details
  - Replacement options
  - Client notification status
- **Status**: ACTIVE

#### **D. Smart Escalation Alerts** (Every 5 min)
- **Function**: `smart-escalation-engine`
- **Trigger**: Every 5 minutes
- **Recipients**: Agency admins
- **Content**:
  - Shifts requiring attention
  - Escalation reasons
  - Auto-assignment attempts
  - Manual intervention needed
- **Status**: ACTIVE

#### **E. Staff Decline Notifications**
- **Function**: `staff-decline-shift` (triggers email)
- **Template**: `staff_decline_admin.html`
- **Trigger**: When staff declines shift
- **Recipients**: Agency admin
- **Content**:
  - Staff name who declined
  - Shift details
  - Decline reason
  - Shift status (back to marketplace)
- **Status**: ACTIVE

#### **F. Auto-Urgent Digest Broadcaster** (Every 10 min)
- **Function**: `auto-urgent-digest-broadcaster`
- **Trigger**: Every 10 minutes
- **Recipients**: Admins + relevant staff
- **Content**:
  - Urgent shifts needing coverage
  - Batch of high-priority alerts
  - Actionable items
- **Status**: ACTIVE

---

### 1.4 System/Transactional Emails

#### **A. Agency Admin Invitations**
- **Function**: `send-agency-admin-invite`
- **Trigger**: Manual invitation by super admin
- **Recipients**: New agency admins being onboarded
- **Content**:
  - Welcome message
  - Invitation link
  - Initial setup instructions
  - Credentials
- **Status**: ACTIVE

#### **B. Invoice Emails**
- **Function**: `send-invoice`
- **Trigger**: Invoice generation events
- **Recipients**: Clients, staff, admins (depends on invoice type)
- **Content**:
  - PDF invoice attachment
  - Payment details
  - Due dates
  - Payment methods
- **Status**: ACTIVE

#### **C. Generic Email Service**
- **Function**: `send-email`
- **Trigger**: Called by other functions
- **Recipients**: Variable (used by all other functions)
- **Content**: Variable (templated)
- **Provider**: Resend API
- **Status**: ACTIVE (foundational service)

#### **D. Care Home Inbound Email Handler**
- **Function**: `care-home-inbound-email`
- **Trigger**: Email received at designated address
- **Purpose**: Process inbound emails from clients
- **Content**: Parses and routes client email requests
- **Status**: ACTIVE

---

### 1.5 Deprecated/Archived Email Functions

#### **Email Automation Engine** (BROKEN)
- **Function**: `email-automation-engine`
- **Status**: ⚠️ **15 TypeScript errors - NOT FUNCTIONAL**
- **Replacement**: `notification-digest-engine` + new automation functions
- **Action Needed**: Should be removed or fixed

---

## 2. SMS NOTIFICATIONS

### 2.1 Core SMS Service

#### **Generic SMS Service**
- **Function**: `send-sms`
- **Provider**: Twilio
- **Trigger**: Called by other functions
- **Recipients**: Variable
- **Content**: Variable (templated)
- **Status**: ACTIVE (foundational service)

---

### 2.2 SMS Use Cases

#### **A. Shift Reminders** (Urgent)
- **Trigger**: From `shift-reminder-engine`
- **Content**: "Reminder: Your shift at [Client] starts in 2 hours at [Time]"
- **Delivery**: Real-time + scheduled
- **Status**: ACTIVE

#### **B. Clock-Out Reminders**
- **Trigger**: From `smart-clock-out-reminders`
- **Content**: "Don't forget to clock out of your shift"
- **Delivery**: Real-time
- **Status**: ACTIVE

#### **C. Urgent Shift Offers**
- **Trigger**: From `urgent-shift-escalation`
- **Content**: "Urgent shift available: [Role] at [Location] starting [Time]"
- **Delivery**: Real-time
- **Status**: ACTIVE

#### **D. No-Show Alerts**
- **Trigger**: From `no-show-detection-engine`
- **Recipients**: Admins
- **Content**: "ALERT: [Staff] did not show for shift at [Client]"
- **Delivery**: Real-time
- **Status**: ACTIVE

#### **E. Payment Notifications**
- **Trigger**: From `payment-reminder-engine`
- **Content**: "Your payment of £[amount] has been processed"
- **Delivery**: Scheduled
- **Status**: ACTIVE

#### **F. Compliance Expiry Alerts**
- **Trigger**: From `send-profile-reminders`
- **Content**: "Your [Document] expires in [Days] days. Please upload renewal"
- **Delivery**: Scheduled
- **Status**: ACTIVE

---

### 2.3 Incoming SMS Handler

#### **SMS Webhook Receiver**
- **Function**: `incoming-sms-handler`
- **Purpose**: Process inbound SMS from staff/clients
- **Provider**: Twilio webhook
- **Actions**:
  - Parse SMS commands (e.g., "ACCEPT [ShiftID]", "DECLINE [ShiftID]")
  - Route to appropriate handlers
  - Send confirmation replies
- **Status**: ACTIVE

---

## 3. WHATSAPP NOTIFICATIONS

### 3.1 Core WhatsApp Service

#### **Generic WhatsApp Service**
- **Function**: `send-whatsapp`
- **Provider**: Twilio WhatsApp Business API
- **Trigger**: Called by other functions
- **Recipients**: Variable
- **Content**: Variable (templated + interactive)
- **Status**: ACTIVE (foundational service)

---

### 3.2 WhatsApp AI Assistant

#### **Master Router** (AI-Powered)
- **Function**: `whatsapp-master-router`
- **AI Model**: OpenAI GPT-4o-mini
- **Purpose**: Conversational AI for staff queries
- **Features**:
  - Natural language understanding
  - PIN-based authentication
  - Context-aware responses
  - Intent detection
  - Entity queries (shifts, timesheets, compliance)
- **Trigger**: Incoming WhatsApp messages
- **Status**: ACTIVE

#### **Incoming WhatsApp Handler**
- **Function**: `incoming-whatsapp-handler`
- **Purpose**: Webhook receiver for Twilio
- **Actions**:
  - Route to `whatsapp-master-router`
  - Handle media uploads
  - Process interactive button responses
- **Status**: ACTIVE

---

### 3.3 WhatsApp Use Cases

#### **A. Enhanced Shift Offers** (AI-Powered)
- **Function**: `enhanced-whatsapp-offers`
- **Trigger**: When shift becomes available
- **Recipients**: Relevant staff (location + role matched)
- **Content**:
  - Shift details with formatting
  - Interactive buttons (ACCEPT / DECLINE / MORE INFO)
  - Rich media (location map, client logo)
  - AI-generated personalized message
- **Status**: ACTIVE

#### **B. Timesheet Interactive Messages**
- **Function**: `whatsapp-timesheet-interactive`
- **Trigger**: Post-shift
- **Recipients**: Staff who completed shift
- **Content**:
  - Interactive timesheet submission
  - Pre-filled shift data
  - Buttons for clock-in/out confirmation
  - Upload photo option
- **Status**: ACTIVE

#### **C. Timesheet Upload Handler**
- **Function**: `whatsapp-timesheet-upload-handler`
- **Purpose**: Process timesheet photos sent via WhatsApp
- **Actions**:
  - Receive photo/document
  - OCR processing (if configured)
  - Save to staff record
  - Send confirmation
- **Status**: ACTIVE

#### **D. Shift Reminders**
- **Trigger**: From `shift-reminder-engine`
- **Content**: Same as SMS but richer formatting + interactive
- **Delivery**: Scheduled + Real-time
- **Status**: ACTIVE

#### **E. Marketplace Digest**
- **Trigger**: From `smart-marketplace-digest`
- **Content**:
  - List of available shifts
  - Interactive buttons for each shift
  - Personalized recommendations
- **Delivery**: Scheduled
- **Status**: ACTIVE

#### **F. Compliance Reminders**
- **Trigger**: From `send-profile-reminders`
- **Content**:
  - Document expiry warnings
  - Upload links/buttons
  - Document checklist
- **Delivery**: Scheduled
- **Status**: ACTIVE

---

## 4. NOTIFICATION INFRASTRUCTURE

### 4.1 Queue System

#### **notification_queue Table**
- **Purpose**: Batch notifications for 5-minute delivery
- **Columns**:
  - `id`, `agency_id`, `recipient_email`, `recipient_type`
  - `notification_type`, `status`, `pending_items` (JSONB)
  - `item_count`, `scheduled_send_at`, `sent_at`
- **Processing**: `notification-digest-engine` (every 5 min)
- **Benefits**:
  - Reduces email spam
  - Groups related notifications
  - Batch processing efficiency

#### **queue_notification() RPC Function**
- **Purpose**: Atomically batch notifications
- **Actions**:
  - Find or create queue item
  - Append to pending_items array
  - Schedule 5-minute delay
  - Increment count

---

### 4.2 Audit Logging

#### **notification_log Table**
- **Purpose**: Comprehensive audit trail for ALL notifications
- **Columns**:
  - `id`, `agency_id`, `recipient_email`, `recipient_type`
  - `notification_type`, `status`, `delivery_status`
  - `source` (supabase_function vs n8n_workflow)
  - `preference_checked`, `preference_status`
  - `email_message_id`, `sms_message_id`, `whatsapp_message_id`
  - `error_message`, `skip_reason`, `metadata` (JSONB)
  - `created_at`, `sent_at`
- **Status**: ⚠️ **PARTIALLY USED**
  - Some functions write to it
  - Many functions DON'T log properly
  - Inconsistent usage across codebase

---

### 4.3 Retry Logic

#### **Retry Worker**
- **Function**: `retry-worker`
- **Trigger**: Every 5 minutes
- **Purpose**: Retry failed notification sends
- **Actions**:
  - Query failed notifications
  - Retry with exponential backoff
  - Log retry attempts
  - Mark as permanently failed after X attempts
- **Status**: ACTIVE

---

## 5. SCHEDULED JOBS (CRON)

### 5.1 Every 5 Minutes (Critical)

| Function | Purpose | Notification Type |
|----------|---------|-------------------|
| `no-show-detection-engine` | Detect staff no-shows | Email + SMS to admins |
| `smart-escalation-engine` | Escalate unfilled shifts | Email to admins |
| `urgent-shift-escalation` | Alert urgent unfilled shifts | Email + SMS + WhatsApp |
| `smart-clock-out-reminders` | Remind to clock out | SMS + WhatsApp |
| `notification-digest-engine` | Process email queue | Email (batched) |
| `retry-worker` | Retry failed sends | All channels |
| `critical-change-notifier` | Profile/compliance changes | Email to clients |

---

### 5.2 Every 10-15 Minutes

| Function | Purpose | Notification Type |
|----------|---------|-------------------|
| `auto-urgent-digest-broadcaster` | Urgent shift digest | Email + WhatsApp |
| `internal-admin-notifier` | Admin alerts | Email |

---

### 5.3 Hourly

| Function | Purpose | Notification Type |
|----------|---------|-------------------|
| `auto-approval-engine` | Auto-approve timesheets | Email confirmations |
| `post-shift-rating-reminder` | Request shift ratings | Email + WhatsApp |
| `client-communication-automation` | Various client comms | Email |

---

### 5.4 Daily

| Function | Schedule | Purpose | Notification Type |
|----------|----------|---------|-------------------|
| `staff-daily-digest-engine` | 8:00 AM | Staff daily summary | Email + WhatsApp |
| `payment-reminder-engine` | 9:00 AM | Payment reminders | Email + SMS |
| `incomplete-profile-reminder` | 9:00 AM | Profile completion | Email + WhatsApp |
| `daily-client-digest` | 10:00 AM | Tomorrow's schedule | Email |

---

### 5.5 Weekly

| Function | Schedule | Purpose | Notification Type |
|----------|----------|---------|-------------------|
| `weekly-client-summary` | Mon 8:00 AM | Weekly shift summary | Email |

---

## 6. NOTIFICATION TEMPLATES

### 6.1 Email Templates (HTML)

Located in: `supabase/functions/_shared/templates/`

| Template | Used By | Purpose |
|----------|---------|---------|
| `batch_confirmation.html` | notification-digest-engine | Grouped shift confirmations |
| `batch_confirmation_full.html` | ARCHIVED | Old version with download buttons |
| `daily_client_digest.html` | daily-client-digest | Tomorrow's staff schedule |
| `weekly_summary.html` | weekly-client-summary | Weekly aggregated shifts |
| `weekly_summary_invoice_style.html` | ARCHIVED | Old version with pricing |
| `staff_decline_admin.html` | staff-decline-shift | Admin alert for declined shifts |

**Gap**: Many functions use inline templates or no templates at all

---

### 6.2 SMS Templates

**Format**: Plain text, 160 characters max
**Status**: ⚠️ **NO CENTRALIZED TEMPLATE SYSTEM**
- SMS messages hardcoded in individual functions
- No consistency across functions
- Difficult to update messaging

---

### 6.3 WhatsApp Templates

**Format**: Twilio WhatsApp Business API templates
**Status**: ⚠️ **MIXED APPROACH**
- Some use Twilio approved templates
- Some use freeform messages (24-hour window)
- Interactive buttons defined per function
- No centralized template management

---

## 7. CRITICAL GAPS & ISSUES

### 7.1 Preference Enforcement (GDPR VIOLATION)

**From Module 2 Readiness Report**:
> ⚠️ **"Preference Enforcement NOT IMPLEMENTED"**

**Issue**:
- Users can set notification preferences in UI (`NotificationPreferences.jsx`)
- Preferences stored in database
- **BUT**: Delivery engines NEVER check these preferences
- **Result**: Users cannot actually opt out of notifications
- **Risk**: GDPR non-compliance, spam complaints, legal liability

**Affected Functions**: ALL 40+ notification functions

**Fix Required**: Add preference checking to every send function

---

### 7.2 Audit Logging Incomplete

**Issue**:
- `notification_log` table exists
- **Only ~30% of functions actually write to it**
- No consistency in what's logged
- Difficult to track what was sent and why

**Missing**:
- SMS send logging (many functions)
- WhatsApp send logging (many functions)
- Failed send reasons
- Preference check results

---

### 7.3 No Centralized Template System

**Issue**:
- Email templates in `_shared/templates/` (6 templates)
- SMS messages hardcoded in functions
- WhatsApp messages hardcoded in functions
- Difficult to update messaging
- No A/B testing capability
- No localization support

---

### 7.4 Monitoring Visibility

**Current**: `NotificationMonitor.jsx` shows:
- ✅ Email queue (`notification_queue`)
- ❌ SMS sends (not visible)
- ❌ WhatsApp sends (not visible)
- ❌ Historical logs (`notification_log`)
- ❌ Success/failure rates
- ❌ Channel breakdown

---

### 7.5 Error Handling Inconsistency

**Issue**:
- Some functions use try-catch properly
- Some fail silently
- Error messages not standardized
- No centralized error tracking
- Difficult to debug failed sends

---

## 8. SUMMARY BY CHANNEL

### Email Notifications

**Total Functions**: 20+
**Volume**: ~500-1000 emails/day (estimated)
**Success Rate**: Unknown (no comprehensive logging)
**Provider**: Resend API
**Templates**: 6 HTML templates (incomplete)

**Categories**:
1. Client communications (6 types)
2. Staff updates (10 types)
3. Admin alerts (7 types)
4. System transactional (3 types)

---

### SMS Notifications

**Total Functions**: 10+
**Volume**: ~200-500 SMS/day (estimated)
**Success Rate**: Unknown
**Provider**: Twilio
**Templates**: None (hardcoded)

**Categories**:
1. Urgent alerts (5 types)
2. Reminders (3 types)
3. Confirmations (2 types)

---

### WhatsApp Notifications

**Total Functions**: 10+
**Volume**: ~300-700 messages/day (estimated)
**Success Rate**: Unknown
**Provider**: Twilio WhatsApp Business API
**AI**: OpenAI GPT-4o-mini (conversational router)
**Templates**: Mixed (Twilio + freeform)

**Categories**:
1. AI conversational (1 master router)
2. Interactive offers (2 types)
3. Timesheet submissions (2 types)
4. Reminders (3 types)
5. Marketplace updates (2 types)

---

## 9. NEXT ACTIONS FOR N8N MIGRATION

### Priority 1: Fix Critical Gaps

1. **Implement preference enforcement** (GDPR compliance)
2. **Standardize audit logging** (all channels)
3. **Create centralized template system**
4. **Build comprehensive monitoring UI**

### Priority 2: Inventory Validation

1. **Enable full logging** for 1 week
2. **Measure actual volumes** per channel
3. **Identify most critical notifications**
4. **Map dependencies** between functions

### Priority 3: Migration Planning

1. **Start with client emails** (already documented in MODULE_N8N_CLIENT_EMAILS)
2. **Then staff emails** (high volume, well-defined)
3. **Then SMS** (simpler than email)
4. **Finally WhatsApp** (most complex, AI integration)

---

## 10. FILE REFERENCES

### Edge Functions (40+ relevant to notifications)

**Email Functions**:
```
supabase/functions/send-email/
supabase/functions/notification-digest-engine/
supabase/functions/daily-client-digest/
supabase/functions/weekly-client-summary/
supabase/functions/staff-daily-digest-engine/
supabase/functions/smart-marketplace-digest/
supabase/functions/shift-reminder-engine/
supabase/functions/incomplete-profile-reminder/
supabase/functions/post-shift-timesheet-reminder/
supabase/functions/smart-clock-out-reminders/
supabase/functions/post-shift-rating-reminder/
supabase/functions/payment-reminder-engine/
supabase/functions/send-profile-reminders/
supabase/functions/internal-admin-notifier/
supabase/functions/urgent-shift-escalation/
supabase/functions/no-show-detection-engine/
supabase/functions/smart-escalation-engine/
supabase/functions/staff-decline-shift/
supabase/functions/auto-urgent-digest-broadcaster/
supabase/functions/send-agency-admin-invite/
supabase/functions/send-invoice/
supabase/functions/client-communication-automation/
supabase/functions/critical-change-notifier/
supabase/functions/email-automation-engine/ (BROKEN)
```

**SMS Functions**:
```
supabase/functions/send-sms/
supabase/functions/incoming-sms-handler/
```

**WhatsApp Functions**:
```
supabase/functions/send-whatsapp/
supabase/functions/whatsapp-master-router/
supabase/functions/incoming-whatsapp-handler/
supabase/functions/enhanced-whatsapp-offers/
supabase/functions/whatsapp-timesheet-interactive/
supabase/functions/whatsapp-timesheet-upload-handler/
```

**Infrastructure**:
```
supabase/functions/retry-worker/
```

### Database Schema

```
supabase/migrations/20251205000000_create_notification_queue_base.sql
supabase/migrations/20251205000001_create_notification_log.sql
supabase/migrations/20251224_add_queue_notification_rpc.sql
supabase/migrations/20251217_cron_jobs_expansion.sql
```

### UI Components

```
src/pages/NotificationMonitor.jsx
src/pages/_archive/EmailNotificationTester.jsx
src/pages/client/NotificationCenter.jsx
src/pages/client/NotificationPreferences.jsx
src/components/notifications/NotificationService.jsx
```

---

**End of Inventory**

**Last Updated**: 2025-12-31
**Next Review**: Before n8n migration Phase 1
