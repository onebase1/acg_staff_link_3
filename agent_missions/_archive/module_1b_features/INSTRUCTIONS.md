# AGENT INSTRUCTIONS: MODULE 1B (CLIENT FEATURES)

**Role:** You are the AI Agent responsible for **Module 1B: Client Portal Features**.
**Objective:** Build the Shift Creation, Ratings, and Notification features.
**Prerequisite:** Module 1A must be complete (Auth working).

---

## MISSION CHECKLIST

### Phase 1: Shift Creation
- [ ] **Build `pages/client/ShiftCreation.jsx`:**
    - Form: Date, Time, Role, Quantity.
    - Logic: `POST /api/client/shifts`.
    - Integration: Trigger Module 3 (Matching) to get recommended staff.

### Phase 2: Ratings System
- [ ] **Build `pages/client/ShiftRating.jsx`:**
    - UI: 5-star rating for completed shifts.
    - Logic: `POST /api/client/ratings`.
    - Integration: Trigger Module 3 (Scoring) to update staff score.

### Phase 3: Notifications Hub
- [ ] **Build `pages/client/NotificationCenter.jsx`:**
    - UI: List of notifications (Shift Filled, Invoice Ready).
    - Logic: Fetch from `ClientNotification` table.

### Phase 4: Testing
- [ ] **End-to-End:** Client logs in -> Creates Shift -> Staff accepts -> Shift done -> Client rates staff.

---

**Wait for Module 1A to finish before starting.**
