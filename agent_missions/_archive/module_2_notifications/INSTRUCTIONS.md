# AGENT INSTRUCTIONS: MODULE 2 (CLIENT NOTIFICATIONS)

**Role:** You are the AI Agent responsible for **Module 2: Client Notifications**.
**Objective:** Implement the Notification System (Email/SMS/WhatsApp) with Preference Center.
**Inputs:** `SPECIFICATION.md` (in this folder), Codebase access.

---

## MISSION CHECKLIST

### Phase 1: Discovery & Audit
- [ ] **Read `SPECIFICATION.md` Section 1 thoroughly.**
- [ ] **Audit the codebase:**
    - Search for existing notification logic.
    - Check `services/emailService.js` and `services/smsService.js`.
- [ ] **Create `NOTIFICATION_AUDIT.md`** in this folder.
- [ ] **Create `SHIFT_JOURNEY_MERMAID.md`** in this folder (use the template in Spec Section 13).
- [ ] **Create `REDUNDANCY_REPORT.md`** and `BEST_PRACTICES_GAP.md`.

### Phase 2: Implementation
- [ ] **Implement Preference Center (Section 3):**
    - Create `ClientNotificationPreference` table.
    - Create `pages/client/NotificationPreferences.jsx`.
- [ ] **Implement Email Templates (Section 4.2):**
    - Create `templates/emails/` directory and HTML files.
    - **Crucial:** Migrate hardcoded emails from `InviteClientModal.jsx` and `OnboardClient.jsx` to templates (`client-invite.html`, `client-welcome.html`).
    - Create `services/emailTemplates.js`.
- [ ] **Implement Queue System (Section 5):**
    - Create `NotificationQueue` and `NotificationLog` tables.
    - Create `services/notificationQueue.js` and `services/notificationWorker.js`.

### Phase 3: Testing & Verification
- [ ] **Run Testing Checklist (Section 10):**
    - Verify emails send correctly.
    - Verify preferences are respected (disable = no email).
    - Verify unsubscribe link works.
    - Verify rate limiting.
- [ ] **Verify Rollback Strategy:**
    - Ensure feature flags `features.email_notifications_enabled`, etc., are in place.

### Phase 4: Documentation
- [ ] **Create `IMPLEMENTATION_NOTES.md`** in this folder:
    - Document what was built.
    - List any deviations from spec.
    - Provide rollback instructions.

---

## CRITICAL RULES
1. **Do not break existing functionality.** Use feature flags for all new code.
2. **Database changes must be additive.** Use `DEFAULT` values for new columns.
3. **Communicate progress.** Update `task.md` (if you have one) or notify user after each phase.
4. **Follow the file structure** defined in `SPECIFICATION.md`.

**GO! Start with Phase 1.**
