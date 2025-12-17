# MODULE 4: Resend Inbound Email Integration

**Status:** 📋 PLANNING
**Priority:** HIGH (Strategic)
**Estimated Duration:** Full project (phased implementation)
**Agent:** TBD
**Started:** Not started

---

## 🎯 Mission Objective

Implement Resend inbound email capabilities to enable two-way communication with staff and clients, replacing `noreply@` addresses with interactive email workflows.

**Strategic Value:**
- ✅ Enable email replies from staff/clients
- ✅ Reduce friction in communication
- ✅ Support multi-tenant architecture (each agency gets replies)
- ✅ Foundation for future custom domain support (charge premium)
- ✅ AI-powered email parsing and routing

---

## 📊 Phase 1: Email Notification Inventory

### Task 1.1: List ALL Current Email Notifications

**Search Commands:**
```bash
# Find all send-email invocations
grep -r "send-email" supabase/functions/ src/

# Find all email templates
grep -r "subject:" supabase/functions/ | grep -i email

# Find all email-related edge functions
ls supabase/functions/ | grep -i email
```

**Expected Categories:**
1. **Shift Notifications**
   - Urgent shift broadcast (smart-marketplace-digest)
   - Shift reminders (pre-shift, 24h/2h before)
   - Shift assignment confirmations
   - Shift cancellations

2. **Timesheet Notifications**
   - Post-shift timesheet reminders
   - Timesheet approval notifications
   - Timesheet rejection notifications

3. **Invoice Notifications**
   - Invoice sent to client
   - Payment reminders (7d, 14d, 21d, 28d)
   - Payment received confirmations

4. **Compliance Notifications**
   - Document expiry warnings
   - Compliance violations
   - Renewal reminders

5. **Onboarding Notifications**
   - Welcome emails (staff, clients, agencies)
   - Incomplete profile reminders
   - Invitation emails

6. **Administrative Notifications**
   - Daily digests
   - Weekly summaries
   - System alerts

### Task 1.2: Categorize Reply-Friendly vs One-Way

**Reply-Friendly (High Priority for Inbound):**
- ❓ Shift offers → Staff replies "YES" or "NO" (Currently using SMS)
- ❓ Timesheet reminders → Staff replies "DONE" or uploads timesheet
- ❓ Payment reminders → Client replies with payment confirmation
- ❓ Compliance reminders → Staff replies "UPLOADED" after document upload
- ❓ Support queries → Any notification could prompt support question

**One-Way (Low Priority):**
- ✅ System alerts
- ✅ Automated daily digests
- ✅ Confirmation receipts (already completed actions)

### Task 1.3: Create Inventory Spreadsheet

**Output:** `EMAIL_NOTIFICATION_INVENTORY.md`

| Notification Type | Current Function | Recipient | Reply-Friendly? | Priority | Proposed Reply Action |
|---|---|---|---|---|---|
| Urgent Shift Broadcast | smart-marketplace-digest | Staff | ✅ YES | HIGH | "I'm interested in [shift]" → Trigger claim flow |
| Shift Reminder (24h) | shift-reminder-engine | Staff | 🤔 MAYBE | MEDIUM | "Can't make it" → Trigger cancellation |
| Timesheet Reminder | post-shift-timesheet-reminder | Staff | ✅ YES | HIGH | "Submitted" → Mark as actioned |
| Invoice Sent | send-invoice | Client | ✅ YES | HIGH | "Paid" → Trigger payment flow |
| Payment Reminder | payment-reminder-engine | Client | ✅ YES | HIGH | Payment confirmation or dispute |
| Welcome Email | new-user-signup-handler | Staff/Client | 🤔 MAYBE | LOW | Questions → Support ticket |
| ... | ... | ... | ... | ... | ... |

---

## 🏗️ Phase 2: Resend Webhook Architecture

### Task 2.1: Understand Resend Inbound Email

**Resend Inbound Email Features:**
- Custom email addresses (e.g., `shifts@agilecaremanagement.co.uk`)
- Webhook payload on incoming email
- Supports multi-tenant routing via subdomain or email prefix
- Parses email content, subject, attachments

**Webhook Payload Example:**
```json
{
  "from": "staff@example.com",
  "to": "shifts@agilecaremanagement.co.uk",
  "subject": "RE: 2 New Shifts Matched For You",
  "text": "I'm interested in the Divine Care Center shift on Dec 25",
  "html": "<p>I'm interested in the Divine Care Center shift on Dec 25</p>",
  "headers": {...},
  "attachments": [...]
}
```

### Task 2.2: Design Multi-Tenant Routing

**Option A: Email Prefix Routing**
```
shifts@agilecaremanagement.co.uk → Shift-related replies
timesheets@agilecaremanagement.co.uk → Timesheet-related replies
invoices@agilecaremanagement.co.uk → Invoice-related replies
support@agilecaremanagement.co.uk → General support
```

**Option B: Subdomain Routing (Future)**
```
shifts@dominion.stafflinkpro.com → Dominion Healthcare
shifts@guestglow.stafflinkpro.com → Guest Glow Healthcare
```

**Option C: Reply-To Header Tracking (Recommended for MVP)**
```
Reply-To: shifts+shift_abc123@agilecaremanagement.co.uk
          ^      ^
          |      |
          |      └─ Shift ID embedded
          └─ Category
```

Parse incoming email `To:` field to extract context:
- `shifts+shift_abc123@...` → Route to shift claim handler
- `timesheets+timesheet_xyz789@...` → Route to timesheet handler
- `invoices+invoice_def456@...` → Route to payment handler

### Task 2.3: Create Webhook Edge Function

**File:** `supabase/functions/resend-inbound-email-handler/index.ts`

**Responsibilities:**
1. Receive webhook from Resend
2. Verify webhook signature (security)
3. Parse email content
4. Extract context from `To:` field or subject
5. Route to appropriate handler based on category
6. Send to AI parser if needed
7. Trigger appropriate action (claim shift, update timesheet, etc.)
8. Send confirmation reply to user
C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3\agent_missions\MODULE_6_SHIFT_AUTOMATION
**Routing Logic:**
```typescript
const emailCategory = parseEmailCategory(payload.to); // "shifts", "timesheets", "invoices", "support"

switch (emailCategory) {
  case 'shifts':
    await handleShiftReply(payload);
    break;
  case 'timesheets':
    await handleTimesheetReply(payload);
    break;
  case 'invoices':
    await handleInvoiceReply(payload);
    break;
  case 'support':
    await handleSupportReply(payload);
    break;
  default:
    await handleUnknownReply(payload);
}
```

---

## 🤖 Phase 3: AI Email Parsing (n8n Integration)

### Task 3.1: Design AI Parser Workflow

**Goal:** Parse natural language email replies into structured actions.

**Example Scenarios:**

**Scenario 1: Shift Interest**
```
From: theresa@example.com
To: shifts+shift_abc123@agilecaremanagement.co.uk
Subject: RE: 2 New Shifts Matched For You

Hi, I'm interested in the Divine Care Center shift on Dec 25.
Please book me in.

Thanks,
Theresa
```

**AI Parser Output:**
```json
{
  "intent": "claim_shift",
  "shift_id": "shift_abc123",
  "staff_email": "theresa@example.com",
  "confidence": 0.95,
  "message": "I'm interested in the Divine Care Center shift on Dec 25. Please book me in."
}
```

**Scenario 2: Can't Make It**
```
From: john@example.com
To: shifts+shift_xyz789@agilecaremanagement.co.uk
Subject: RE: Shift Reminder - Tomorrow at 08:00

Sorry, I can't make this shift. Family emergency.

John
```

**AI Parser Output:**
```json
{
  "intent": "cancel_shift",
  "shift_id": "shift_xyz789",
  "staff_email": "john@example.com",
  "reason": "Family emergency",
  "confidence": 0.92
}
```

**Scenario 3: Payment Confirmation**
```
From: client@carehome.com
To: invoices+invoice_def456@agilecaremanagement.co.uk
Subject: RE: Payment Reminder - Invoice #INV-2025-001

We have processed payment via bank transfer.
Reference: PAY123456

Thanks
```

**AI Parser Output:**
```json
{
  "intent": "payment_confirmation",
  "invoice_id": "invoice_def456",
  "payment_method": "bank_transfer",
  "reference": "PAY123456",
  "confidence": 0.88
}
```

### Task 3.2: n8n Workflow Design

**Workflow:** `Inbound Email AI Parser`

**Steps:**
1. **Webhook Trigger** (from resend-inbound-email-handler)
2. **OpenAI GPT-4o** - Parse email intent
   - Prompt: "Parse this email reply and extract intent, action, and confidence"
   - Return structured JSON
3. **Switch Node** - Route based on intent
4. **Action Handlers:**
   - Claim shift → Call Supabase function `claim-shift-via-email`
   - Cancel shift → Call Supabase function `cancel-shift-via-email`
   - Payment confirmation → Call Supabase function `record-payment-via-email`
5. **Send Confirmation** - Reply to user via send-email

### Task 3.3: Low Confidence Handling

**If AI confidence < 0.80:**
- Send to support queue
- Notify agency admin
- Reply to user: "We received your email but need clarification. An admin will respond shortly."

---

## 📋 Phase 4: Implementation Roadmap

### Sprint 1: Foundation (Week 1)
- [ ] Complete email notification inventory
- [ ] Design webhook architecture
- [ ] Create `resend-inbound-email-handler` edge function
- [ ] Setup Resend inbound email routing
- [ ] Test webhook reception

### Sprint 2: Basic Reply Handlers (Week 2)
- [ ] Implement shift claim handler
- [ ] Implement shift cancel handler
- [ ] Implement timesheet reminder handler
- [ ] Add reply-to headers to existing email templates
- [ ] Test end-to-end flow

### Sprint 3: AI Parser (Week 3)
- [ ] Design n8n workflow
- [ ] Implement OpenAI intent parser
- [ ] Add confidence scoring
- [ ] Handle low confidence cases
- [ ] Test with real email samples

### Sprint 4: Advanced Features (Week 4)
- [ ] Invoice payment confirmation handler
- [ ] Compliance document upload handler
- [ ] Support ticket creation from emails
- [ ] Multi-tenant subdomain routing (future)
- [ ] Custom domain support (future premium feature)

---

## 🎯 Success Criteria

- ✅ All outbound emails have reply-to addresses (no more `noreply@`)
- ✅ Staff can claim shifts via email reply
- ✅ Staff can cancel shifts via email reply
- ✅ Clients can confirm payments via email reply
- ✅ AI parser achieves >80% accuracy on intent detection
- ✅ Multi-tenant isolation maintained (replies routed to correct agency)
- ✅ Graceful handling of unrecognized emails (support queue)
- ✅ Foundation for future custom domain support

---

## 🚨 Technical Considerations

### Security:
- ✅ Verify Resend webhook signatures
- ✅ Validate sender email matches staff/client in database
- ✅ Rate limiting on email replies (prevent spam)
- ✅ Sanitize email content before processing

### Multi-Tenant:
- ✅ Extract agency context from reply-to address or subject
- ✅ Verify sender belongs to agency
- ✅ Isolate data access by agency_id

### Performance:
- ✅ Async email processing (don't block webhook)
- ✅ Queue for AI parsing (use n8n for async)
- ✅ Batch processing if needed

### User Experience:
- ✅ Send confirmation replies immediately
- ✅ Clear error messages if action fails
- ✅ Fallback to support queue for edge cases

---

## 📁 Output Files

### Required Deliverables:
1. `EMAIL_NOTIFICATION_INVENTORY.md` - Complete inventory
2. `RESEND_INBOUND_ARCHITECTURE.md` - Technical design
3. `supabase/functions/resend-inbound-email-handler/index.ts` - Webhook handler
4. `n8n_workflows/inbound_email_ai_parser.json` - n8n workflow export
5. `INBOUND_EMAIL_TESTING_GUIDE.md` - How to test
6. `MIGRATION_PLAN.md` - How to update existing email templates

---

## 🔄 Continuation Instructions

**Current Status:** Not started (planning only)

**Next Steps:**
1. Complete Phase 1 (Email Notification Inventory)
2. Review with user for prioritization
3. Begin Phase 2 (Webhook setup)

---

## 📞 Context for Next Agent

**Current Email Flow:**
- All emails sent via `send-email` edge function
- Uses Resend API with `noreply@agilecaremanagement.co.uk`
- `from_name` is dynamic (agency name)
- No inbound email handling currently

**Related Modules:**
- MODULE_2_NOTIFICATIONS - Multi-channel notification system
- MODULE_3_TEMPLATE_AUDIT - Ensure no hard-coded values

**User Requirements:**
- Multi-tenant (each agency isolated)
- SaaS name changing (must be dynamic)
- Future: Custom domains for premium agencies
- Future: Charge extra for white-label email

---

**Last Updated:** 2025-12-16
**Next Review:** After Phase 1 inventory complete
