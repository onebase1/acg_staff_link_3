# MODULE 3: SCORING & ALGORITHMS - STRATEGIC INTELLIGENCE

## EXECUTIVE BRIEF
**Current State:** Basic data exists but no intelligence; manual matching required  
**Target State:** Automated scoring for staff/clients; deterministic matching algorithm; predictive fill rates  
**Business Impact:** 30% reduction in admin time (auto-matching) + higher client satisfaction (better staff)  
**Risk Mitigation:** Parallel run mode (algorithm suggests, human confirms) before full auto-pilot  

---

## SECTION 1: DISCOVERY & AUDIT

### 1.1 Algorithm Audit Task

**Agent Task:** Search for any existing scoring logic

**Files to Search:**
- `services/matchingService.js`
- `utils/scoring.js`
- `functions/calculateScore.js`
- Database: `Staff.score`, `Client.rating`, `Shift.match_score`

**Extraction Requirements:**
Create `ALGORITHM_AUDIT.md` with:
1. **Existing Formulas:** Is there any current logic? (e.g., "If 5 stars, +10 points")
2. **Data Availability:** Do we have the data needed? (Attendance records, cancellation history, distance)
3. **Performance:** How fast are current queries? (If we score 1000 staff, will it crash?)

---

## SECTION 2: STAFF SCORING SYSTEM (The "Reliability Score")

### 2.1 The Formula (0-100 Scale)

**Base Score:** 50 points (New staff start here)

**Additions (Max +50):**
- **Attendance:** +2 points per completed shift (Max +20)
- **Ratings:** +5 points per 5-star rating (Max +20)
- **Loyalty:** +1 point per month active (Max +5)
- **Verification:** +5 points for full document compliance

**Deductions (No Limit - can go negative):**
- **No-Show:** -30 points (Immediate drop)
- **Late Cancellation (<24h):** -15 points
- **Late Arrival:** -5 points
- **Low Rating (<3 stars):** -10 points
- **Compliance Expired:** -20 points (Auto-suspend if < 0)

**Score Bands:**
- **Elite (90-100):** First access to shifts, higher pay rates (optional)
- **Reliable (70-89):** Standard access
- **New/Average (50-69):** Last access
- **At Risk (<50):** Requires manual approval for booking
- **Suspended (<0):** Account locked

### 2.2 Implementation

**Database Schema:**
```sql
ALTER TABLE Staff ADD COLUMN reliability_score INT DEFAULT 50;
ALTER TABLE Staff ADD COLUMN score_breakdown JSON; -- {"attendance": 20, "ratings": 15, "penalties": -10}
ALTER TABLE Staff ADD COLUMN last_score_update TIMESTAMP;

CREATE TABLE ScoreHistory (
  id UUID PRIMARY KEY,
  staff_id UUID REFERENCES Staff(id),
  old_score INT,
  new_score INT,
  change_reason STRING, -- "Completed shift #123"
  change_amount INT,
  created_at TIMESTAMP
);
```

**Files to Create:**
- `services/scoring/staffScoring.js` - The calculation engine
- `services/scoring/triggers.js` - Event listeners (ShiftComplete -> Recalc)
- `api/admin/scoring/staff/:id` - GET score details (for admin view)

---

## SECTION 3: CLIENT SCORING SYSTEM (The "Desirability Score")

### 3.1 The Formula (0-100 Scale)

**Base Score:** 70 points

**Additions:**
- **Volume:** +1 point per shift posted (Max +10)
- **Fill Rate:** +10 points if >90% shifts filled
- **Payment Speed:** +10 points if paid < 7 days

**Deductions:**
- **Cancellations:** -10 points per shift cancelled by client
- **Low Pay:** -5 points if rate < market avg
- **Staff Complaints:** -15 points per valid complaint
- **Late Payment:** -5 points per overdue invoice

**Usage:**
- High score clients get priority matching (best staff see their shifts first)
- Low score clients may require "hard-to-fill" bonus rates

### 3.2 Implementation

**Database Schema:**
```sql
ALTER TABLE Client ADD COLUMN desirability_score INT DEFAULT 70;
ALTER TABLE Client ADD COLUMN score_breakdown JSON;
```

**Files to Create:**
- `services/scoring/clientScoring.js`
- `api/admin/scoring/client/:id`

---

## SECTION 4: MATCHING ALGORITHM (The "Match Score")

### 4.1 The Formula

When a shift is posted, calculate `MatchScore` for every eligible staff member.

**Criteria:**
1. **Distance (30%):** Closer = Higher score
   - < 5 miles: 100 pts
   - 5-10 miles: 80 pts
   - > 20 miles: 0 pts
2. **Role Match (Critical):** Must match exactly (Binary 1 or 0)
3. **Staff Reliability (40%):** Use Staff Score (0-100)
4. **Client Preference (20%):**
   - "Favorite" staff: +50 pts
   - "Blocked" staff: -1000 pts (Exclude)
5. **Fairness (10%):**
   - Hasn't worked this week: +10 pts (Spread the work)

**Result:** Sorted list of staff to notify.

### 4.2 Implementation

**Database Schema:**
```sql
-- No new tables, this is a query/calculation
```

**Files to Create:**
- `services/matching/matchEngine.js`
- `api/shifts/:id/matches` - GET sorted list of staff

**Optimization:**
- Use PostGIS for distance calculation (if available)
- Or use Haversine formula in SQL/JS

---

## SECTION 5: AUTOMATION & TRIGGERS

### 5.1 Triggers

**Event: Shift Completed**
- Action: Recalculate Staff Score (+2 attendance)
- Action: Recalculate Client Score (Fill rate update)

**Event: Rating Submitted**
- Action: Recalculate Staff Score (+/- based on stars)

**Event: No-Show Recorded**
- Action: Recalculate Staff Score (-30)
- Action: If score < 0, set status = 'suspended'

### 5.2 Batch Processing
- Nightly job: Recalculate all scores (to account for time-based factors like "Loyalty")

**Files to Create:**
- `functions/triggers/onShiftUpdate.js`
- `functions/cron/nightlyScoring.js`

---

## SECTION 6: INTEGRATION WITH OTHER MODULES

### 6.1 Module 1 Integration
- Client Portal shows "Recommended Staff" using Match Engine
- Client Portal shows "Staff Rating" using Staff Score

### 6.2 Module 2 Integration
- Notification Engine uses Match Score to decide who to SMS first
- "Top 10 matches get SMS immediately, next 20 get Email"

### 6.3 Module 4 Integration
- Chatbot uses Match Engine to find staff for urgent bookings

---

## SECTION 7: DATABASE SCHEMA CHANGES

**Summary:**
- `Staff`: +reliability_score, +score_breakdown, +last_score_update
- `Client`: +desirability_score, +score_breakdown
- `ScoreHistory`: New table

---

## SECTION 8: API ENDPOINTS

```
GET    /api/scoring/staff/:id
       Returns: {score, breakdown, history}
       Auth: ADMIN only

GET    /api/scoring/client/:id
       Returns: {score, breakdown}
       Auth: ADMIN only

POST   /api/scoring/recalc/:type/:id
       Payload: {force: true}
       Returns: {new_score}
       Auth: ADMIN only

GET    /api/matches/shift/:id
       Returns: [{staff_id, match_score, distance, reliability}, ...]
       Auth: ADMIN or CLIENT (limited view)
```

---

## SECTION 9: ROLLBACK STRATEGY

**Feature Flags:**
- `features.staff_scoring_enabled` - If false, return null for scores
- `features.auto_matching_enabled` - If false, return random/alphabetical list

**Database Safety:**
- Columns are nullable/defaulted
- Can drop columns if needed (destructive but safe for app logic)

---

## SECTION 10: TESTING CHECKLIST

**Before Merge:**
- [ ] Staff Score: Create shift -> Complete it -> Verify score increases
- [ ] Staff Score: Add rating -> Verify score changes
- [ ] No-Show: Mark no-show -> Verify score drops 30 pts
- [ ] Matching: Create shift -> Verify closest staff is #1
- [ ] Matching: Verify blocked staff are excluded
- [ ] Performance: Match against 1000 staff < 500ms
- [ ] History: Verify ScoreHistory table is populated

---

## SECTION 11: AGENT EXECUTION CHECKLIST

**Phase 1: Discovery (1-2 hours)**
- [ ] Audit existing scoring logic
- [ ] Create ALGORITHM_AUDIT.md
- [ ] Check database for existing score columns

**Phase 2: Implementation (4-6 hours)**
- [ ] Add database columns (Staff, Client, ScoreHistory)
- [ ] Implement Staff Scoring Service
- [ ] Implement Client Scoring Service
- [ ] Implement Match Engine (Distance + Score)
- [ ] Create Triggers (Shift Complete, Rating)

**Phase 3: Testing (2 hours)**
- [ ] Run test suite (unit tests for formulas)
- [ ] Verify database updates
- [ ] Test performance

**Phase 4: Documentation (1 hour)**
- [ ] Create IMPLEMENTATION_NOTES.md

**Total Estimated Time: 8-11 hours**

---

**END OF MODULE 3 BRIEF**
