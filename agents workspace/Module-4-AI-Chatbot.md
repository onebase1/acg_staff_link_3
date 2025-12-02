# MODULE 4: CLIENT CONVERSATIONAL AI CHATBOT - STRATEGIC PLANNING

## EXECUTIVE BRIEF
**Current State:** Not yet implemented; Retell AI selected as vendor (voice + text capable)  
**Target State:** Multi-channel AI agent (WhatsApp, web chat, voice calls) handling urgent shift bookings + FAQs; client-only access  
**Business Impact:** 24/7 shift booking (no humans needed); "Wow" feature for investor pitch  
**Architecture:** Event-driven; Retell AI orchestrates; n8n workflows handle integrations; database tracks conversations  
**Risk Mitigation:** Staged rollout (chatbot → phone in phase 2); conversation logging for compliance; fallback to human  

---

## SECTION 1: DISCOVERY & REQUIREMENTS ANALYSIS

### 1.1 Existing Infrastructure Audit

**Agent Task:** Review current system capabilities

**Files to Analyze:**
- `services/retellAiService.js` or similar (does Retell integration exist?)
- `api/` directory: Search for chatbot endpoints
- `functions/` directory: Any existing chatbot functions?
- `.env`: Check for `RETELL_API_KEY`, `RETELL_PHONE_NUMBER`
- Documentation: Any existing AI plans?

**Questions to Answer:**
1. Is Retell API key already configured?
2. Do we have existing webhook handlers ready?
3. What's the current auth system for clients?
4. Can we identify which "client" is making a call/chat?
5. Is there SMS/WhatsApp integration ready (Module 2)?
6. Is n8n environment ready to spin up workflows?

**Output:** Create `CHATBOT_READINESS_REPORT.md` with:
- Current infrastructure status
- Missing dependencies
- Auth strategy recommendation
- Recommended phase 1 scope

---

### 1.2 Business Requirements Clarification

**Primary Use Case:**
```
SCENARIO: Client has urgent shift need (within 2 hours)
1. Client texts to WhatsApp: "I need 2 nurses tomorrow 2pm"
2. AI responds: "I found 3 available nurses. Reply YES to book, or say NO"
3. Client replies: "YES"
4. AI: "Great! Sending confirmation. Your shifts are booked. A team member will confirm."
5. System: Creates shifts in database + sends notifications (Module 2)
6. Admin: Receives alert for manual verification (optional)
```

**Secondary Use Cases:**
```
CASE 2: Client asks FAQ question
"What's your cancellation policy?"
AI responds with documented answer + provides contact option

CASE 3: Client calls during hours
"I need staff urgently"
Voice AI: Understands intent → Creates shift OR escalates to human
Human: Takes over call naturally

CASE 4: System can't handle request
"I need 50 staff for next month"
AI: "That's complex. Let me connect you to our team. One moment..."
Routes to human agent queue
```

---

## SECTION 2: AUTHENTICATION & CLIENT VERIFICATION STRATEGY

### 2.1 Challenge: Multi-Channel Auth

**Problem:** 
- WhatsApp: Only have phone number (could be anyone answering client's phone)
- Voice Call: Only have caller ID (spoofable)
- Web Chat: Can use session cookies (best option)

**Solution Architecture:**

**Layer 1: Phone Number Matching**
```
Incoming WhatsApp Message:
├─ Extract phone: +442071234567
├─ Query Client table for phone match
├─ Find: "Dominion Healthcare" (main contact)
├─ Check: ClientContact.phone_number matches?
└─ Result: VERIFIED or UNVERIFIED

If UNVERIFIED:
├─ Message: "Hi! I'm ACG StaffLink. Before I help, I need to verify you're authorized."
├─ Options: (A) Enter last 4 digits of latest invoice (security Q)
│          (B) Check your email for verification link
│          (C) Call our support team
└─ On success: Mark contact as VERIFIED for this channel
```

**Layer 2: Conversation Context**
```
After first verification:
├─ Store: {phone_number, client_id, contact_id, last_verified: timestamp}
├─ Assume: Next message from same number = same person
└─ If: No message for 30 days → Re-verify next time

Expire verification:
├─ After 24 hours of inactivity: Re-verify next time
└─ Rationale: Another person might pick up phone
```

**Layer 3: High-Risk Verification**
```
If AI detects high-risk request (e.g., "change billing address"):
├─ Require additional verification
├─ Ask: "For security, please verify: What was last shift date?"
└─ Match against recent shift history
```

**Implementation Files:**
- `services/retellAuth.js` - Phone verification logic
- `api/retell/verify-contact.js` - Verification endpoint
- `middleware/retellAuth.js` - Middleware to check verified status
- `db/ClientPhoneVerification` table (tracks verified contacts)

---

### 2.2 Database Schema for Auth

```sql
-- NEW: ClientPhoneVerification
CREATE TABLE ClientPhoneVerification (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES Client(id),
  contact_id UUID REFERENCES ClientContact(id),
  phone_number VARCHAR(20),  -- International format: +442071234567
  channel ENUM('whatsapp', 'sms', 'voice_call'),
  verified_at TIMESTAMP,
  expires_at TIMESTAMP,  -- 24 hours from verification
  verification_method ENUM('security_question', 'email_link', 'manual'),
  ip_address VARCHAR(20),  -- For fraud detection
  created_at TIMESTAMP
);

-- NEW: ClientConversation (Store all chat history for compliance)
CREATE TABLE ClientConversation (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES Client(id),
  contact_id UUID REFERENCES ClientContact(id),
  channel ENUM('whatsapp', 'voice_call', 'web_chat'),
  conversation_type ENUM('shift_booking', 'faq', 'support_escalation'),
  summary TEXT,  -- AI-generated summary of conversation
  related_shifts_created INT DEFAULT 0,  -- Count of shifts created from this chat
  related_shift_ids JSON,  -- Array of shift IDs created
  ai_confidence_score DECIMAL(3,2),  -- How confident AI was in understanding
  transcript TEXT,  -- Full chat/call transcript (for compliance)
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  escalated_to_human BOOLEAN DEFAULT FALSE,
  human_agent_id UUID,  -- If escalated
  customer_satisfaction_rating INT (1-5),  -- Post-chat survey
  created_at TIMESTAMP
);
```

---

## SECTION 3: CHATBOT CAPABILITIES DESIGN

### 3.1 Intent Recognition & Routing

**Retell AI Will Understand These Intents:**

```
PRIMARY INTENTS:

1. SHIFT_BOOKING
   Examples:
   - "I need 2 nurses tomorrow at 2pm"
   - "Can you send someone for care support Tuesday morning?"
   - "Urgent: we have 1 staff member down"
   Actions:
   - Extract: role, date, time, count, location, notes
   - Clarify: "Is this recurring or one-time?"
   - Confirm: "Shall I book these 2 nurses?"
   - Execute: Create shifts → Send notifications
   - Response: "Confirmed! I've created 2 nurse shifts for tomorrow 2-10pm"

2. SHIFT_CANCELLATION
   Examples:
   - "Can you cancel tomorrow's 2pm shift?"
   - "We don't need the nurses anymore"
   Actions:
   - Clarify: "Which shift? [list options]"
   - Confirm: "This will cancel 2 nurse shifts. Okay?"
   - Execute: Cancel shifts → Notify staff + client
   - Response: "Cancelled. Your staff have been notified."

3. SHIFT_MODIFICATION
   Examples:
   - "Can we change the time to 4pm instead?"
   - "We need 3 nurses instead of 2"
   Actions:
   - Clarify: What's changing? (time, count, role, etc)
   - Confirm: "Changing from 2 to 3 nurses. Okay?"
   - Execute: Modify shifts → Notify affected parties
   - Response: "Updated. Your staff will be adjusted."

4. BILLING_INQUIRY
   Examples:
   - "What's my invoice status?"
   - "When is payment due?"
   - "Can I see my invoice?"
   Actions:
   - Query: Recent invoices
   - Response: "Your latest invoice for £5,000 is due on Dec 20. [Link to view]"

5. STAFF_INQUIRY
   Examples:
   - "How did the nurses perform last week?"
   - "Give me staff ratings"
   Actions:
   - Query: Staff performance (Module 3 scores)
   - Response: "Your top performer was Sarah (4.9 ⭐). [Details]"

6. COMPLIANCE_INQUIRY
   Examples:
   - "When do my staff documents expire?"
   - "What are our compliance status?"
   Actions:
   - Query: Staff compliance status
   - Response: "All documents current. Next expiry: [Staff name] on Dec 25"

7. FAQ_GENERAL
   Examples:
   - "What's your cancellation policy?"
   - "How do I set up a recurring shift?"
   - "What payment methods do you accept?"
   Actions:
   - Lookup: FAQ database
   - Response: "Our policy is..." + Offer: "Do you need anything else?"

8. URGENT_SUPPORT
   Examples:
   - "A staff member didn't show up!"
   - "There's an emergency"
   Actions:
   - Escalate: "I'm connecting you to our support team immediately"
   - Route: To human agent (urgent queue)

SECONDARY INTENTS:

9. PREFERENCE_UPDATE
   - "Change my notification settings"
   - "Update my contact details"
   → Update preferences (Module 1)

10. ACCOUNT_INQUIRY
    - "How many shifts have I booked?"
    - "What's my account balance?"
    → Return metrics
```

---

### 3.2 Conversation Flow Diagrams

**Flow 1: Urgent Shift Booking (Ideal Path)**

```
Client: "I need 2 nurses tomorrow 2pm"
  ↓
AI: Understands intent = SHIFT_BOOKING
  ↓
AI Extraction: 
  role: "nurse"
  count: 2
  date: "tomorrow"
  time: "14:00"
  location: [INFERRED from client profile or asked]
  ↓
[If missing info]
AI: "Where do you need the nurses?"
Client: "Manchester facility"
  ↓
[Ready to book]
AI: "I found 3 available nurses for tomorrow 2-10pm. 
    Booking fee £45/hr. Shall I proceed?"
  ↓
Client: "Yes"
  ↓
[System creates shifts]
AI: "Confirmed! I've created 2 shifts. 
    You'll get confirmations via email. 
    Is there anything else?"
  ↓
Client: "No thanks"
  ↓
AI: "Great! Thanks for using ACG StaffLink. 
    We'll follow up with your team shortly."
  ↓
[Conversation ends, logged]
[Module 2 sends notifications]
[Admin receives alert for verification]
```

**Flow 2: Escalation (When AI Can't Help)**

```
Client: "I need 50 staff for a new contract starting next month"
  ↓
AI: [Intent = SHIFT_BOOKING but complexity > threshold]
AI: "That's a large request. Let me connect you to our sales team. 
    Please hold for a moment..."
  ↓
[n8n workflow triggers]
n8n: Looks up available human agents
n8n: Creates support ticket
n8n: Routes to appropriate sales rep
n8n: Notifies sales rep via email/Slack
  ↓
Sales Rep: Calls client directly
  ↓
[Conversation logged with escalation note]
```

**Flow 3: FAQ Path**

```
Client: "What's your cancellation policy?"
  ↓
AI: Recognizes intent = FAQ_GENERAL
AI: Searches FAQ database
  ↓
AI: "We allow free cancellation up to 24 hours before shift.
    Within 24 hours, a 50% fee applies.
    Is there anything else I can help with?"
  ↓
Client: "Yes, how do I add recurring shifts?"
  ↓
AI: [Searches FAQ]
AI: "You can set up recurring shifts via the client portal.
    Or I can help you book them now via chat.
    Which would you prefer?"
```

---

## SECTION 4: IMPLEMENTATION ARCHITECTURE

### 4.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT CHANNELS                          │
├─────────────────────────────────────────────────────────────┤
│  WhatsApp              Voice Call          Web Chat          │
│  (Twilio)             (Retell AI)         (Browser)          │
└──────┬──────────────────┬────────────────────┬───────────────┘
       │                  │                    │
       ▼                  ▼                    ▼
┌──────────────────────────────────────────────────────────────┐
│         RETELL AI - Natural Language Processing              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Intent Recognition:                                    │  │
│  │ Input: "I need 2 nurses tomorrow 2pm"                 │  │
│  │ Output: {                                              │  │
│  │   intent: "SHIFT_BOOKING",                            │  │
│  │   entities: {                                          │  │
│  │     role: "nurse",                                    │  │
│  │     count: 2,                                         │  │
│  │     date: "tomorrow",                                 │  │
│  │     time: "14:00"                                     │  │
│  │   },                                                   │  │
│  │   confidence: 0.98                                    │  │
│  │ }                                                      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  AUTH VERIFICATION LAYER                                     │
│  • Verify phone/caller is known contact                      │
│  • Check verification status                                 │
│  • Re-verify if needed                                       │
│  • Log all verification attempts                             │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  n8n WORKFLOW ORCHESTRATION                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Workflow: Handle_Shift_Booking                         │  │
│  │ ┌────────────────────────────────────────────────────┐ │  │
│  │ │ 1. Extract shift details from intent               │ │  │
│  │ │ 2. Validate against client profile                 │ │  │
│  │ │ 3. Query available staff (Module 3 matching)       │ │  │
│  │ │ 4. Confirm with client (if needed)                 │ │  │
│  │ │ 5. Create shifts in database (API call)            │ │  │
│  │ │ 6. Send notifications (Module 2)                   │ │  │
│  │ │ 7. Create escalation workflow (admin review)       │ │  │
│  │ │ 8. Log conversation                                │ │  │
│  │ │ 9. Return confirmation to AI                       │ │  │
│  │ └────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  BACKEND API                                                 │
│  • Create shifts                                             │
│  • Get staff availability                                    │
│  • Query client info                                         │
│  • Access Module 2/3 data                                    │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  DATABASE                                                    │
│  Shift, Staff, Client, ClientConversation, etc               │
└──────────────────────────────────────────────────────────────┘
```

---

### 4.2 Retell AI Configuration

**Retell Account Setup:**
```
[Requires manual setup - not code]

1. Create Retell AI account (retell.ai)
2. Create Agent:
   - Name: "ACG StaffLink Client Assistant"
   - Language: English (UK)
   - Personality: Professional, helpful, direct
   - Knowledge base: Upload FAQ docs
   - Instructions (system prompt - see Section 4.3)

3. Configure Channels:
   - WhatsApp: Connect Twilio
   - Phone: Assign phone number (or use Twilio)
   - Web: Get embed code

4. Webhooks:
   - Conversation started: POST to /api/retell/webhook/conversation-started
   - Message received: POST to /api/retell/webhook/message
   - Conversation ended: POST to /api/retell/webhook/conversation-ended
   - Transfer to human: POST to /api/retell/webhook/escalate

5. API Key: Store in .env as RETELL_API_KEY
```

---

### 4.3 Retell AI System Prompt

**Agent Task:** Create comprehensive system prompt for Retell AI

**Prompt Template:**

```
You are ACG StaffLink, an AI assistant for staffing agencies.
Your role: Help clients book urgent shifts, answer FAQs, and escalate complex requests.

PERSONALITY:
- Professional but friendly
- Direct and efficient (clients are usually in a hurry)
- Humble: admit when you don't know something
- Helpful: always offer next steps

YOUR CAPABILITIES:
1. Book urgent shifts (< 72 hours)
2. Answer FAQs about policies, pricing, procedures
3. Provide staff performance data
4. Update billing/contact info
5. Transfer to human agent if needed

YOUR LIMITS:
- Cannot negotiate custom contracts
- Cannot access detailed financial reports
- Cannot override compliance restrictions
- Cannot make promises about staff availability (only suggestions)

SHIFT BOOKING PROCESS:
When a client mentions needing staff:
1. Extract: Role, date, time, count, location
2. Clarify missing info: "What date did you need them?"
3. Confirm understanding: "So, 2 nurses tomorrow 2-10pm at Manchester facility?"
4. Get approval: "I can book these. Shall I proceed?"
5. Execute: "Confirmed! I've created your shifts."
6. Next steps: "You'll get confirmations via email. Is there anything else?"

KEY INFORMATION ABOUT CLIENT:
- Name: {{client_name}}
- Contact: {{contact_name}}
- Location: {{client_location}}
- Recent invoices: {{recent_invoices}}
- Most common roles booked: {{common_roles}}
- Current staff performance: {{top_performers}}

COMPLIANCE RULES:
- Never share other clients' data
- Never override cancellation fees without management approval
- Always verify client identity before booking
- Log all conversations (required for audit trail)
- If compliance question arises, escalate to human

ESCALATION TRIGGERS:
- Client seems upset or frustrated
- Request is outside your authority (e.g., custom pricing)
- Client asks for something you can't handle
- Session > 10 minutes and not resolved
- System error or API failure

ESCALATION SCRIPT:
"I understand this needs special attention. Let me connect you to our team. 
One moment please..."
[Trigger n8n workflow to assign human agent]

FAQ TOPICS YOU SHOULD KNOW:
[Load from database at runtime]
- Cancellation policy
- Payment methods & terms
- How to set up recurring shifts
- Staff performance rating system
- Compliance requirements
- Contractor rates & pricing
- Working hours limits
- Shift confirmation timeline

AFTER EVERY CONVERSATION:
- Summarize what happened
- Rate your confidence in the outcome
- Suggest improvements for next interaction
- If client satisfaction = 1-3, flag for human review

IMPORTANT:
- Never promise things you can't guarantee
- If uncertain, ask for clarification or escalate
- Always be respectful of shift worker welfare & regulations
- Remember: You're representing the agency brand
```

---

## SECTION 5: n8n WORKFLOW DESIGN

### 5.1 Core Workflows

**Workflow 1: Handle_Shift_Booking**
```
Trigger: Retell webhook "intent=SHIFT_BOOKING"
  ↓
Step 1: Extract entities from Retell payload
  Input: {role, date, time, count, location, notes}
  ↓
Step 2: Validate entities
  Check: Is date in future? Is time valid? Is role recognized?
  If error → Return error message to AI
  ↓
Step 3: Query client profile
  API call: GET /api/clients/{{client_id}}
  Get: Location, preferred roles, rate limits
  ↓
Step 4: Check availability (Module 3 matching)
  API call: GET /api/shifts/match-candidates
  Payload: {shift_details, count_needed}
  Response: Ranked list of available staff
  ↓
Step 5: Decision point
  Is staff_count_available >= count_requested?
  If NO: Return "I only found X staff, not Y"
  If YES: Continue
  ↓
Step 6: Create shifts (if client confirmed)
  API call: POST /api/shifts (create multiple)
  Payload: {shift_details × count}
  Response: [shift_ids]
  ↓
Step 7: Send notifications (Module 2)
  API call: POST /api/notifications/queue
  For: Staff (offer), Client (confirmation)
  ↓
Step 8: Create admin workflow
  API call: POST /api/workflows (escalation)
  Type: "SHIFT_CREATED_VIA_AI"
  For: Manual verification
  ↓
Step 9: Log conversation
  API call: POST /api/conversations
  Payload: {client_id, transcript, shifts_created, status}
  ↓
Return: Confirmation message to Retell AI
```

**Workflow 2: Handle_FAQ**
```
Trigger: Retell webhook "intent=FAQ_GENERAL"
  ↓
Step 1: Extract question
  Input: Question text
  ↓
Step 2: Query FAQ database
  Search: Similar FAQ matches
  Response: FAQ answer + confidence score
  ↓
Decision: confidence > 0.8?
  If YES: Return FAQ answer
  If NO: Escalate to human (uncertain answer)
  ↓
Return: Answer to Retell AI
```

**Workflow 3: Escalate_To_Human**
```
Trigger: Retell webhook "escalation_requested"
  ↓
Step 1: Create support ticket
  Payload: {client_id, reason, transcript_url}
  ↓
Step 2: Find available agent
  Query: Support staff (from admin pool)
  Filter: Free agents, appropriate specialization
  ↓
Step 3: Notify agent
  Send: Slack message + email with ticket details
  Include: Client info, conversation summary, context
  ↓
Step 4: Provide wait time to customer
  Message: "An agent will be with you shortly"
  ↓
Step 5: Monitor timeout
  If wait > 5 min: Offer callback scheduling
  ↓
Return: Agent assignment to Retell
```

---

## SECTION 6: API ENDPOINTS REQUIRED

```
[All endpoints called by n8n workflows or Retell webhook]

POST   /api/retell/webhook/conversation-started
       Payload: {client_id, channel, phone_number}
       Action: Log conversation start
       Auth: Retell API key validation

POST   /api/retell/webhook/message
       Payload: {conversation_id, message, intent, entities}
       Action: Route to appropriate workflow
       Auth: Retell API key validation

POST   /api/retell/webhook/conversation-ended
       Payload: {conversation_id, duration, satisfaction_rating}
       Action: Log conversation end
       Auth: Retell API key validation

POST   /api/retell/webhook/escalate
       Payload: {conversation_id, reason}
       Action: Trigger human escalation workflow
       Auth: Retell API key validation

GET    /api/clients/{{client_id}}
       Returns: {name, location, preferred_roles, recent_invoices}
       Auth: Internal (n8n)

POST   /api/shifts (create multiple)
       Payload: [{date, time, role, location, client_id}, ...]
       Returns: [shift_ids]
       Auth: Internal (n8n)

GET    /api/shifts/match-candidates
       Payload: {shift_details, count_needed}
       Returns: [staff_ranked]
       Auth: Internal (n8n)

POST   /api/conversations
       Payload: {client_id, transcript, shifts_created, status}
       Returns: {conversation_id}
       Auth: Internal (n8n)

POST   /api/notifications/queue
       Payload: {event_type, recipients, template_variables}
       Auth: Internal (n8n)

POST   /api/workflows (escalation)
       Payload: {type, client_id, reason}
       Returns: {workflow_id}
       Auth: Internal (n8n)
```

---

## SECTION 7: PHASE 1 vs PHASE 2 ROADMAP

**PHASE 1 (MVP - This Sprint): Text-Based Only**
```
✅ WhatsApp text chat via Retell
✅ Shift booking (text intent)
✅ FAQ answers (text)
✅ Client verification (security Q)
✅ Logging & audit trail
✅ Escalation to human (messaging)
❌ Phone call handling (defer to Phase 2)
❌ Sentiment analysis (defer to Phase 2)
❌ Multi-language support (defer to Phase 2)
❌ Advanced ML intent (use Retell's built-in)
```

**PHASE 2 (Enhanced - Q1 2026): Voice + Intelligence**
```
✅ Inbound phone calls → Retell voice AI
✅ Outbound calls: "I found staff for you, confirm?"
✅ Voice sentiment analysis
✅ Call recording + transcription
✅ Natural handoff to human agent (warm transfer)
✅ Multi-language support
❌ Geo-location matching in voice (Phase 3)
```

---

## SECTION 8: SECURITY & COMPLIANCE

### 8.1 Data Protection

**Conversation Logging:**
- Store all transcripts in `ClientConversation` table
- GDPR compliant: Delete old conversations (>1 year)
- Encryption: PII fields encrypted at rest

**Authentication:**
- Phone verification required before booking
- Verification expires after 24h of inactivity
- Repeat verification if switching devices

**Authorization:**
- Only verify against known ClientContact records
- Cannot create shifts for unknown clients
- Cannot access other clients' data

### 8.2 Compliance Requirements

**FCA / CMA / ICO Regulations:**
- Disclosure: Clearly state "You're chatting with an AI"
- Option to escalate: Always offer human alternative
- Record keeping: All conversations logged
- Consent: Client opts into chatbot (no surprise calls)
- Accuracy: Don't make promises AI can't keep

**Shift Worker Protections:**
- Cannot override rest period rules
- Cannot assign staff that would violate working hours
- Cannot cancel shifts without fee (unless system error)

**Audit Trail:**
- Every conversation logged with transcript
- All shifts created via AI flagged for review
- Admin can see: Intent, confidence, action, outcome

---

## SECTION 9: ERROR HANDLING & FALLBACK

**Scenario 1: Retell AI Doesn't Understand**
```
AI confidence < 50%
→ Ask for clarification: "I'm not sure I understand. Can you rephrase?"
→ If still unclear (3 attempts): "Let me connect you to our team"
→ Escalate to human
```

**Scenario 2: Database API Call Fails**
```
n8n workflow fails (e.g., can't create shift)
→ Log error with full context
→ Return to AI: "I'm having trouble right now. Let me get a human to help."
→ Escalate to human immediately
→ Create alert for admin
```

**Scenario 3: Client Unverified**
```
Phone number doesn't match any client contact
→ Offer 3 verification methods:
  (A) Security question
  (B) Email verification link
  (C) Callback from support team
→ If all fail: "Please contact support directly"
→ Provide support number
```

**Scenario 4: Rate Limiting**
```
Same client makes 10 shift bookings in 5 minutes
→ Flag as suspicious
→ Require manual confirmation for 11th
→ Log all attempts
```

---

## SECTION 10: DATABASE SCHEMA

```sql
-- NEW: ClientConversation (see Section 2.2)
-- NEW: ClientPhoneVerification (see Section 2.2)

CREATE TABLE RetellWebhookLog (
  id UUID PRIMARY KEY,
  event_type ENUM('conversation_started', 'message', 'conversation_ended', 'escalate'),
  payload JSON,  -- Full webhook payload
  processing_status ENUM('received', 'processed', 'failed'),
  error_message TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP
);

CREATE TABLE ChatbotFAQ (
  id UUID PRIMARY KEY,
  question TEXT,
  answer TEXT,
  category VARCHAR(100),
  keyword_tags JSON,  -- ["cancellation", "policy"]
  usage_count INT DEFAULT 0,
  last_used TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Modify ClientConversation
ALTER TABLE ClientConversation ADD COLUMN (
  retell_conversation_id VARCHAR(100),  -- Retell's ID
  n8n_execution_ids JSON,  -- Array of n8n workflow executions
  error_logs TEXT  -- Any errors during handling
);
```

---

## SECTION 11: TESTING STRATEGY

**Phase 1 Testing (MVP):**
```
❌ Live testing on real clients (not yet)

✅ Sandbox testing:
- Mock Retell webhook responses
- Mock database calls (n8n dry-run)
- Manual testing: Send WhatsApp messages to test number
- Security: Try unverified phone → confirm rejected
- Happy path: Book 1 shift successfully
- Error path: Simulate API failure → confirm escalation

✅ Integration testing:
- Retell → n8n → Backend API → Database
- Verify conversation logged
- Verify shifts created
- Verify notifications sent (Module 2)

❌ Load testing (Phase 2)
❌ Voice testing (Phase 2)
```

---

## SECTION 12: MONITORING & ANALYTICS

**Metrics to Track:**
```
Chat metrics:
- Daily active conversations
- Avg conversation length
- Resolution rate (% issues resolved by AI vs escalated)
- Booking success rate (% intent→actual shift created)

Quality metrics:
- Intent recognition accuracy (% correct intent identified)
- Confidence scores (avg. AI confidence in its answers)
- Escalation rate (% chats requiring human intervention)
- Customer satisfaction (1-5 rating post-chat)

Business metrics:
- Shifts booked via AI (count)
- Revenue via AI bookings
- Support cost saved (fewer phone calls)
- Time to booking (avg. minutes from initial message to confirmation)

Error metrics:
- Failed API calls
- Verification failures
- Unhandled intents
- Webhook timeouts
```

---

## SECTION 13: ROLLOUT & RISK MITIGATION

**Phase 1 Rollout (Staged):**
```
Week 1-2: Internal testing (team only)
- Test on staging environment
- Verify all workflows
- Security audit

Week 3: Beta (5 test clients)
- Enable chatbot for 5 friendly clients
- Monitor closely
- Gather feedback
- Fix critical bugs

Week 4: Controlled launch (20% of clients)
- Gradual rollout
- Monitor error rates
- Scale if stable

Week 5+: Full launch (100% of clients)
- Make available to all clients
- Monitor ongoing
```

**Kill Switches:**
```
If chatbot causing issues:
1. Disable chatbot: Feature flag `features.chatbot_enabled = false`
2. Stop Retell: Pause conversations
3. Keep logs: Don't delete conversation data
4. Analysis: Determine cause
5. Fix: Code or configuration change
6. Re-enable: If safe
```

---

## SECTION 14: AGENT EXECUTION CHECKLIST

**Phase 1: Setup & Discovery (1-2 hours)**
- [ ] Verify Retell API key in .env
- [ ] Check existing n8n environment status
- [ ] Create CHATBOT_READINESS_REPORT.md
- [ ] Validate database schema changes

**Phase 2: Database & Auth (1-2 hours)**
- [ ] Create ClientPhoneVerification table
- [ ] Create ClientConversation table
- [ ] Create verification logic service
- [ ] Implement security question handler

**Phase 3: Webhook Handlers (2 hours)**
- [ ] Create POST /api/retell/webhook/conversation-started
- [ ] Create POST /api/retell/webhook/message
- [ ] Create POST /api/retell/webhook/conversation-ended
- [ ] Verify Retell can reach endpoints

**Phase 4: n8n Workflows (3-4 hours)**
- [ ] Build Handle_Shift_Booking workflow
- [ ] Build Handle_FAQ workflow
- [ ] Build Escalate_To_Human workflow
- [ ] Test each workflow (dry-run + sandbox)

**Phase 5: Retell Configuration (2 hours)**
- [ ] Create Retell AI agent
- [ ] Upload system prompt
- [ ] Configure WhatsApp channel
- [ ] Set up webhook URLs
- [ ] Test conversation (manual)

**Phase 6: Testing & Docs (2-3 hours)**
- [ ] Run integration tests
- [ ] Test verification flow
- [ ] Test happy path booking
- [ ] Test error scenarios
- [ ] Create IMPLEMENTATION_NOTES.md

**Total Estimated Time: 11-15 hours for Phase 1**

---

**END OF MODULE 4 BRIEF**