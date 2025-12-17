# MODULE 4: AI CHATBOT - 24/7 AUTONOMOUS BOOKING

## EXECUTIVE BRIEF
**Current State:** No chatbot; manual booking via phone/email  
**Target State:** 24/7 AI assistant on WhatsApp/Web capable of booking shifts and answering FAQs  
**Business Impact:** Capture urgent bookings outside office hours + reduce admin call volume by 40%  
**Risk Mitigation:** "Human Handoff" protocol if AI is confused; strict verification before booking  

---

## SECTION 1: DISCOVERY & INFRASTRUCTURE AUDIT

### 1.1 Infrastructure Check

**Agent Task:** Verify readiness of external tools

**Checklist:**
1. **Retell AI:** Do we have an account? API Key? (Check .env)
2. **n8n:** Is n8n deployed? URL accessible? (Check .env `N8N_WEBHOOK_URL`)
3. **WhatsApp/Twilio:** Is a sender number configured?
4. **Knowledge Base:** Do we have a list of FAQs? (See `ChatbotFAQ` table)

**Output:** Create `CHATBOT_READINESS_REPORT.md`

---

## SECTION 2: AUTHENTICATION & SECURITY

### 2.1 The "Trusted Phone" Strategy

**Problem:** How do we know it's really the client booking a shift via WhatsApp?

**Solution:**
1. **Allowlist:** Only accept messages from phone numbers in `ClientContact` table.
2. **Verification:**
   - If phone matches: "Hi [Name], how can I help?"
   - If phone unknown: "I don't recognize this number. Please log in to the portal to update your profile."
3. **2FA (High Value Actions):**
   - If booking > £500 or urgent: Send OTP to email on file. "Please reply with code 1234."

### 2.2 Implementation

**Database Schema:**
```sql
CREATE TABLE ClientPhoneVerification (
  id UUID PRIMARY KEY,
  phone_number VARCHAR(20),
  client_id UUID REFERENCES Client(id),
  verified_at TIMESTAMP,
  trust_score INT DEFAULT 0, -- Increases with successful bookings
  created_at TIMESTAMP
);

CREATE TABLE ClientConversation (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES Client(id),
  channel ENUM('whatsapp', 'web'),
  status ENUM('active', 'ended', 'escalated'),
  transcript JSON,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Files to Create:**
- `middleware/chatbotAuth.js` - Verify incoming webhook signature
- `services/chatbot/verificationService.js` - Check phone number against DB

---

## SECTION 3: CONVERSATION FLOWS

### 3.1 Flow 1: Urgent Shift Booking (The "Money" Flow)

**User:** "I need a nurse for tonight at 8pm."
**AI:** "I can help. Checking availability for a Nurse at [Default Location] for tonight 20:00. How long is the shift?"
**User:** "12 hours."
**AI:** "Got it. 12 hours. I have 3 staff available. Shall I post this to them now?"
**User:** "Yes."
**AI:** "Done. Shift #1234 created. I've notified 3 staff. I'll let you know when someone accepts."

**Logic:**
1. Extract Intent: `BOOK_SHIFT`
2. Extract Slots: `Role=Nurse`, `Date=Today`, `Time=20:00`, `Duration=12h`
3. Validate: Check Module 1 rules (no overlap)
4. Action: Call `POST /api/client/shifts`
5. Confirm: Send success message

### 3.2 Flow 2: FAQ / Policy (The "Support" Flow)

**User:** "What are your cancellation fees?"
**AI:** "If you cancel more than 24 hours in advance, there is no fee. Within 24 hours, it's 50%. Within 4 hours, it's 100%."

**Logic:**
1. Extract Intent: `FAQ_QUERY`
2. Search: Vector DB or Keyword match in `ChatbotFAQ` table
3. Response: Return answer
4. Follow-up: "Does that help?"

### 3.3 Flow 3: Human Handoff (The "Safety" Flow)

**User:** "I'm not happy with the nurse you sent."
**AI:** "I'm sorry to hear that. I'm connecting you with a human manager now. They will call you shortly."

**Logic:**
1. Extract Intent: `COMPLAINT` or `ESCALATE`
2. Action: Create Admin Task (Urgent)
3. Action: Send SMS to On-Call Manager
4. Response: "Manager notified."

---

## SECTION 4: ARCHITECTURE (Retell AI + n8n)

### 4.1 The Stack

1. **Retell AI:** Handles Voice/Text input, Intent Recognition (LLM), and Speech-to-Text.
2. **n8n:** Orchestration layer. Receives Retell webhook -> Calls Backend API -> Returns response to Retell.
3. **Backend API:** Our Node.js app. Exposes endpoints for n8n.

### 4.2 n8n Workflows

**Workflow A: Handle_Shift_Booking**
- Trigger: Webhook from Retell (Intent: BOOK_SHIFT)
- Step 1: Call `GET /api/client/validate-request`
- Step 2: If valid, Call `POST /api/client/shifts`
- Step 3: Return success message to Retell

**Workflow B: Handle_FAQ**
- Trigger: Webhook from Retell (Intent: FAQ)
- Step 1: Call `GET /api/chatbot/faq?q=...`
- Step 2: Return answer to Retell

### 4.3 API Endpoints (For n8n)

```
POST   /api/retell/webhook
       Payload: {event, transcript, intent, slots}
       Auth: API Key (in header)

GET    /api/chatbot/availability
       Query: {role, date, time}
       Returns: {available_count: 3}

POST   /api/chatbot/escalate
       Payload: {conversation_id, reason}
       Returns: {status: 'escalated'}
```

**Files to Create:**
- `api/retell/webhook.js`
- `api/chatbot/index.js`

---

## SECTION 5: IMPLEMENTATION PLAN

### 5.1 Phase 1: Text-Only (WhatsApp)
- Focus on WhatsApp integration via Twilio/Retell
- Implement Flows 1, 2, 3
- No voice capability yet

### 5.2 Phase 2: Voice (Phone)
- Enable phone number for inbound calls
- Use Retell's voice capabilities
- Same backend logic (n8n workflows reused)

---

## SECTION 6: INTEGRATION WITH OTHER MODULES

### 6.1 Module 1 Integration
- Chatbot creates shifts using Module 1 API
- Chatbot checks RBAC (is this user allowed to book?)

### 6.2 Module 3 Integration
- When checking availability, Chatbot queries Module 3 Match Engine
- "I have 3 *highly rated* staff available"

---

## SECTION 7: TESTING CHECKLIST

**Before Merge:**
- [ ] Auth: Message from unknown number -> Rejected
- [ ] Booking: Complete flow (Intent -> Slot Filling -> API Call -> Success)
- [ ] FAQ: Ask "cancel fee" -> Get correct answer
- [ ] Escalation: Say "I want a human" -> Admin notified
- [ ] Security: Try to book shift for past date -> Rejected
- [ ] Performance: Response time < 3 seconds

---

## SECTION 8: ROLLBACK STRATEGY

**Feature Flags:**
- `features.chatbot_enabled` - If false, webhook returns 503 (Service Unavailable)
- `features.chatbot_booking_enabled` - If false, AI says "Please use the portal to book."

**Kill Switch:**
- Stop the n8n workflow
- Revoke Retell API key

---

## SECTION 9: AGENT EXECUTION CHECKLIST

**Phase 1: Setup (1-2 hours)**
- [ ] Check Retell/n8n access
- [ ] Create DB tables
- [ ] Create API endpoints

**Phase 2: n8n Workflows (3-4 hours)**
- [ ] Build Booking Workflow
- [ ] Build FAQ Workflow
- [ ] Test with Postman

**Phase 3: Integration (2 hours)**
- [ ] Connect Retell to n8n
- [ ] Connect n8n to Backend API

**Phase 4: Testing (2 hours)**
- [ ] End-to-end test via WhatsApp
- [ ] Verify database records

**Total Estimated Time: 8-10 hours**

---

**END OF MODULE 4 BRIEF**
