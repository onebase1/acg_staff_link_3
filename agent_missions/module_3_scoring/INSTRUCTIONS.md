# AGENT INSTRUCTIONS: MODULE 3 (SCORING & ALGORITHMS)

**Role:** You are the AI Agent responsible for **Module 3: Scoring & Algorithms**.
**Objective:** Implement Staff/Client Scoring and Matching Algorithm.
**Inputs:** `SPECIFICATION.md` (in this folder), Codebase access.

---

## MISSION CHECKLIST

### Phase 1: Discovery & Audit
- [ ] **Read `SPECIFICATION.md` Section 1 thoroughly.**
- [ ] **Audit the codebase:**
    - Search for `services/matchingService.js`, `utils/scoring.js`.
    - Check database for existing score columns.
- [ ] **Create `ALGORITHM_AUDIT.md`** in this folder.

### Phase 2: Implementation
- [ ] **Implement Staff Scoring (Section 2):**
    - Add columns to `Staff` table (`reliability_score`, etc.).
    - Create `ScoreHistory` table.
    - Create `services/scoring/staffScoring.js`.
- [ ] **Implement Client Scoring (Section 3):**
    - Add columns to `Client` table.
    - Create `services/scoring/clientScoring.js`.
- [ ] **Implement Matching Engine (Section 4):**
    - Create `services/matching/matchEngine.js`.
    - Implement distance calculation (PostGIS or Haversine).
- [ ] **Implement Triggers (Section 5):**
    - Create `functions/triggers/onShiftUpdate.js`.

### Phase 3: Testing & Verification
- [ ] **Run Testing Checklist (Section 10):**
    - Verify score calculation logic.
    - Verify matching logic (distance, role, score).
    - Verify triggers update scores automatically.
- [ ] **Verify Rollback Strategy:**
    - Ensure feature flags `features.staff_scoring_enabled`, etc., are in place.

### Phase 4: Documentation
- [ ] **Create `IMPLEMENTATION_NOTES.md`** in this folder:
    - Document formulas used.
    - List any deviations from spec.
    - Provide rollback instructions.

---

## CRITICAL RULES
1. **Do not break existing functionality.** Use feature flags for all new code.
2. **Database changes must be additive.** Use `DEFAULT` values for new columns.
3. **Communicate progress.** Update `task.md` (if you have one) or notify user after each phase.
4. **Follow the file structure** defined in `SPECIFICATION.md`.

**GO! Start with Phase 1.**
