# IMPLEMENTATION PLAN: MODULE 44 - Conversational AI Gateway

## 📖 CONTEXT FOR THE AGENT
As of January 18, 2026, the ACG StaffLink platform has a robust **Outbound** notification system (`notification_log`) and a high-fidelity **AI Voice** interaction log (`ai_interaction_logs`). However, it lacks a unified way to process and log **Inbound** text-based replies (WhatsApp/SMS).

The goal of this module is to bridge that gap, allowing the system to 'listen' and 'reason' about incoming messages.

## 🛠️ DATABASE AUDIT (MANDATORY READ)
Before you start, note the existing tables discovered in the audit by Antigravity:
- **`notification_log`**: Tracks every outbound Email/SMS/WhatsApp. Use this to find the `message_id` or `context` for incoming replies.
- **`ai_interaction_logs`**: Use this as a reference for how to log AI summaries and raw payloads.
- **`notifications`**: Contains external provider message IDs (Meta/Twilio).

## 📅 PHASE 1: Infrastructure (Database)
Create a migration to add the following:

### 1. `public.messages` Table
```sql
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agencies(id),
    staff_id UUID REFERENCES public.staff(id),
    client_id UUID REFERENCES public.clients(id), -- If a client manager replies
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    channel TEXT CHECK (channel IN ('whatsapp', 'sms', 'system')),
    content TEXT,
    attachment_url TEXT,
    provider_id TEXT, -- Meta/Twilio SID
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. `public.conversations` Table (Optional but Recommended)
To group messages into sessions (e.g., "Shift Confirmation Session").

## 🔗 PHASE 2: Inbound Gateway (N8N)
1. **Webhook Security**: Ensure incoming webhooks from Meta/Twilio are verified.
2. **Profile Resolution**:
   - Match incoming phone number to `public.profiles` or `public.staff`.
   - Identify the `agency_id` based on the recipient number or the staff's agency enrollment.
3. **Storage**: Immediately write every inbound message to `public.messages`.

## 🧠 PHASE 3: Conversational Logic (Edge Function)
Create a new Edge Function `conversational-router`:
1. **Pre-processing**: Use LLM to classify the intent of the message.
2. **Action Routing**:
   - If intent = "Confirm Shift" → Call `public.confirm_shift_via_message(staff_id, shift_id)`.
   - If intent = "Decline/Cancel" → Trigger manager alert + update shift status.
   - If intent = "Question" → Log and notify manager or use RAG to answer.

## 📺 PHASE 4: UI Integration
1. **Staff Profile**: Add a "Message History" tab to `Staff.jsx`.
2. **Live Rota**: Show a "💬" icon if there is an unread message related to a shift.

## ⚠️ CRITICAL GOTCHAS
- **Multi-Tenancy**: Always ensure `agency_id` is captured. A single phone number might belong to staff in multiple agencies (though rare, the schema should support it).
- **Rate Limiting**: Meta has strict rules on message windows (24h). Ensure outbound replies are sent within the window or use templates.

---

**Implementation Started By:** Antigravity
**Next Step:** Execute Phase 1 Database Migrations.
