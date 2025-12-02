# AGENT INSTRUCTIONS: MODULE 4 (AI CHATBOT)

**Role:** You are the AI Agent responsible for **Module 4: AI Chatbot**.
**Objective:** Implement AI Chatbot (Retell AI + n8n) for Booking & FAQs.
**Inputs:** `SPECIFICATION.md` (in this folder), Codebase access.

---

## MISSION CHECKLIST

### Phase 1: Discovery & Infrastructure
- [ ] **Read `SPECIFICATION.md` Section 1 thoroughly.**
- [ ] **Audit Infrastructure:**
    - Check `.env` for Retell/n8n keys.
    - Check database for `ChatbotFAQ` table.
- [ ] **Create `CHATBOT_READINESS_REPORT.md`** in this folder.

### Phase 2: Implementation
- [ ] **Implement Auth & DB (Section 2):**
    - Create `ClientPhoneVerification` and `ClientConversation` tables.
    - Create `middleware/chatbotAuth.js`.
- [ ] **Implement Webhooks (Section 4.3):**
    - Create `api/retell/webhook.js`.
    - Create `api/chatbot/index.js` (availability, escalate).
- [ ] **Design n8n Workflows (Section 4.2):**
    - Document the JSON structure for `Handle_Shift_Booking` and `Handle_FAQ` workflows (save as `.json` files in this folder if possible, or describe in `IMPLEMENTATION_NOTES.md`).

### Phase 3: Testing & Verification
- [ ] **Run Testing Checklist (Section 7):**
    - Verify unknown numbers are rejected.
    - Verify booking flow creates a shift.
    - Verify escalation triggers admin notification.
- [ ] **Verify Rollback Strategy:**
    - Ensure feature flags `features.chatbot_enabled`, etc., are in place.

### Phase 4: Documentation
- [ ] **Create `IMPLEMENTATION_NOTES.md`** in this folder:
    - Document n8n workflow logic.
    - List any deviations from spec.
    - Provide rollback instructions.

---

## CRITICAL RULES
1. **Do not break existing functionality.** Use feature flags for all new code.
2. **Database changes must be additive.** Use `DEFAULT` values for new columns.
3. **Communicate progress.** Update `task.md` (if you have one) or notify user after each phase.
4. **Follow the file structure** defined in `SPECIFICATION.md`.

**GO! Start with Phase 1.**
