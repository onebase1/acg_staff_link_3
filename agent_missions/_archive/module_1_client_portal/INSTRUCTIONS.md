# AGENT INSTRUCTIONS: MODULE 1 (CLIENT PORTAL)

**Role:** You are the AI Agent responsible for **Module 1: Client Portal**.
**Objective:** Implement the Client Portal with RBAC, Shift Creation, Ratings, and Notifications.
**Inputs:** `SPECIFICATION.md` (in this folder), Codebase access.

---

## MISSION CHECKLIST

### Phase 1: Discovery & Audit
- [ ] **Read `SPECIFICATION.md` Section 1 thoroughly.**
- [ ] **Audit the codebase:**
    - Check `pages/client/` for existing pages.
    - Check `middleware/clientAuth.js` for RBAC.
    - Check database schema for `ClientContact` roles.
- [ ] **Create `DISCOVERY_REPORT.md`** in this folder containing:
    - Current state of RBAC.
    - Missing features vs target state.
    - Database schema gaps.
    - Any blockers.

### Phase 2: Implementation
- [ ] **Implement RBAC (Section 2.1):**
    - Add `role` to `ClientContact` table.
    - Create/Update `middleware/clientAuth.js`.
- [ ] **Implement Shift Creation (Section 2.2):**
    - Create `pages/client/ShiftCreation.jsx`.
    - Create `api/client/shifts.js`.
- [ ] **Implement Ratings (Section 2.3):**
    - Create `ClientRating` table.
    - Create `pages/client/ShiftRating.jsx`.
- [ ] **Implement Notifications Hub (Section 2.4):**
    - Create `ClientNotification` table.
    - Create `pages/client/NotificationCenter.jsx`.

### Phase 3: Testing & Verification
- [ ] **Run Testing Checklist (Section 7):**
    - Verify RBAC roles restrict access correctly.
    - Verify shift creation works and triggers notifications.
    - Verify ratings are saved and trigger scoring (mock if needed).
- [ ] **Verify Rollback Strategy:**
    - Ensure feature flags `features.client_portal_rbac_enabled`, etc., are in place.

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
