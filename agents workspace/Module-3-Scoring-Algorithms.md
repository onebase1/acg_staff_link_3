# MODULE 3: STRATEGIC SCORING & RATING ALGORITHMS - FOUNDATION ARCHITECTURE

## EXECUTIVE BRIEF
**Current State:** Rough idea of scoring; existing algorithm mentioned (staff scoring/shift matching, status unknown)  
**Target State:** Production-grade scoring systems for staff/clients + matching foundation; destructive DB updates handled with migrations  
**Business Impact:** Automated staff selection (WOW factor) + fair rating system (legal defensibility) + data-driven recommendations  
**Data Model:** All scores/points stored; immutable audit trail; monthly reset logic  
**Risk Mitigation:** Database migrations with rollback; feature flags for each algorithm; validation on scoring rules  

---

## SECTION 1: DISCOVERY & AUDIT

### 1.1 Existing Algorithm Review

**Agent Task:** Locate and analyze existing scoring algorithm

**Files to Search:**
- Search codebase for: "score", "match", "algorithm", "ranking", "rating"
- Check: `functions/`, `services/`, `utils/` for any matching logic
- Database: Look for fields like `score`, `rating`, `match_percentage`, `points`
- Check git history: When was this implemented? Is it commented out?

**Questions to Answer:**
1. **Algorithm exists?**
   - If YES: What does it score? (Staff? Shift matching? Both?)
   - Is it active (used in UI) or inactive (dead code)?
   - What factors does it consider?
   - How is score calculated? (Weighted? AI? Simple average?)
   
2. **Database schema:**
   - Does Staff table have: `score`, `rating`, `match_score`, `points` fields?
   - Does Client table have similar fields?
   - Is there an audit table tracking score changes?

3. **Scoring factors currently:**
   - List every field that impacts staff score (e.g., no-shows, experience, ratings)
   - Are there any hardcoded thresholds? (e.g., "if score > 80 then recommended")

**Output:** Create `ALGORITHM_AUDIT.md` with:
- Current algorithm description (if exists)
- Status (active/inactive/broken)
- Schema analysis
- List of current scoring factors
- Recommendations for enhancement/replacement

---

### 1.2 Industry Best Practices Research

**Context:** This is a UK staffing agency (healthcare/care workers)

**Standard Methodologies:**
1. **Elo Rating System** (chess-inspired, relative scoring)
   - Pro: Considers performance relative to peers
   - Con: Complex, overkill for staffing
   - Use case: Rank staff against each other

2. **Net Promoter Score (NPS)** (feedback-based)
   - Pro: Simple, client feedback drives score
   - Con: Doesn't capture operational metrics
   - Use case: Client satisfaction dimension only

3. **Weighted Scoring** (common in staffing)
   - Pro: Flexible, tunable, transparent
   - Con: Requires careful weight calibration
   - **RECOMMENDATION:** Use this for Module 3
   - Formula: `Score = (W1×F1 + W2×F2 + ... + Wn×Fn) / ΣWeights`

4. **Behavioral Points System** (operations-focused)
   - Pro: Incentivizes good behavior, punishes bad
   - Con: Requires careful rule design
   - **RECOMMENDATION:** Use this alongside weighted scoring
   - Example: +5 points for on-time arrival, -10 points for cancellation

---

## SECTION 2: SCORING MODEL DESIGN

### 2.1 Staff Scoring System

**Goal:** Determine which staff are most reliable/valuable for shift assignments

**Scoring Formula:**
```
STAFF_SCORE = (
  0.25 × Client_Rating_Score +      // Client feedback (25%)
  0.20 × Attendance_Score +          // Punctuality & no-shows (20%)
  0.20 × Compliance_Score +          // Document expiry, status updates (20%)
  0.15 × Availability_Score +        // Quick response to offers (15%)
  0.15 × Experience_Score +          // Years in role, specializations (15%)
  0.05 × Profile_Completeness_Score  // Profile up-to-date (5%)
) × Multiplier
```

**Component 1: Client Rating Score (25%)**
```
Input: Average of client ratings from Module 1
Range: 1-5 stars
Normalization: (Average - 1) / 4 × 100 = 0-100 points
Recency weight: Ratings older than 90 days worth 50%
Formula:
  Recent ratings (< 90 days): Count as 100%
  Old ratings (90-180 days): Count as 50%
  Older (>180 days): Count as 25%
  Average weighted rating = (sum of weighted ratings) / (count of weighted ratings)

Example:
  Rating 5 stars (today) × 1.0 = 5
  Rating 4 stars (60 days ago) × 1.0 = 4
  Rating 3 stars (120 days ago) × 0.5 = 1.5
  Average: (5+4+1.5) / 2.5 = 4.2 stars → 80 points
```

**Component 2: Attendance Score (20%)**
```
Base: 100 points
Deductions per incident (last 12 months):
  - No-show (cancelled < 1h before): -25 points each
  - Late arrival (>15 min): -10 points each
  - Early departure: -15 points
  - On-time arrival: +0 (baseline)
  
Multiplier by frequency:
  - 0 incidents: 100 points
  - 1-2 incidents: 90 points
  - 3-5 incidents: 70 points
  - 6+ incidents: 40 points

Example:
  1 no-show (3 months ago): 100 - 25 = 75 points
  2 late arrivals (recent): 75 - (10+10) = 55 points
  Final: 55 points
```

**Component 3: Compliance Score (20%)**
```
Base: 100 points
Checks (at evaluation time):
  - All documents within expiry: +100
  - 1 document <30 days to expiry: -20
  - 1 document expired: -50
  - 2+ documents expired: -100 (disqualifies staff)
  
Profile completeness:
  - Background check: +15 or -30 if missing
  - References: +10 or -20 if missing
  - DBS certificate: +15 or -30 if expired/missing
  
Example:
  All docs current: 100
  Reference from only 1 person: 100 - 20 = 80
  BG check expiring in 20 days: 80 - 20 = 60 points
  Final: 60 points
```

**Component 4: Availability Score (15%)**
```
Measures: How quickly staff respond to shift offers
Baseline: 100 points

Response time buckets (last 20 offers):
  - <15 min: 100 points (eager)
  - 15-60 min: 90 points (responsive)
  - 1-6 hours: 70 points (reasonable)
  - 6-24 hours: 40 points (slow)
  - >24 hours / no response: 0 points

Average of recent responses: = Availability Score

Decay: Offers older than 60 days not counted

Example:
  Last 10 offers:
  - 5 responded <15 min: 5 × 100 = 500
  - 3 responded 1-6h: 3 × 70 = 210
  - 2 no response: 2 × 0 = 0
  Average: (500 + 210 + 0) / 10 = 71 points
```

**Component 5: Experience Score (15%)**
```
Baseline: 50 points

Years in role:
  - < 6 months: 30 points
  - 6-12 months: 50 points
  - 1-2 years: 70 points
  - 2-5 years: 85 points
  - 5+ years: 100 points

Specializations (additive):
  - Each relevant specialization: +10 points (max 30 for 3 specializations)

Certifications (additive):
  - First Aid: +10
  - Safeguarding: +10
  - NVQ/Diploma relevant: +15
  (max +40 total)

Example:
  3 years in role: 85 points
  + 2 specializations: +20 points
  + First Aid cert: +10 points
  Total: 115 points → capped at 100
  Final: 100 points
```

**Component 6: Profile Completeness Score (5%)**
```
Baseline: 100 points
Deductions:
  - Missing photo: -20
  - No bio/description: -15
  - Incomplete contact info: -10
  - Missing availability calendar: -15
  - No emergency contact: -10
  
Example:
  Photo: ✓ (0 deduction)
  Bio: ✗ (-15)
  Contact: ✓ (0 deduction)
  Availability: ✓ (0 deduction)
  Emergency: ✗ (-10)
  Final: 100 - 15 - 10 = 75 points
```

**Final Score Calculation:**
```
Example staff member:
  Client Rating: 80 points × 0.25 = 20
  Attendance: 55 points × 0.20 = 11
  Compliance: 60 points × 0.20 = 12
  Availability: 71 points × 0.15 = 10.65
  Experience: 100 points × 0.15 = 15
  Profile: 75 points × 0.05 = 3.75
  
  Subtotal: 20 + 11 + 12 + 10.65 + 15 + 3.75 = 72.4 points
  
  Multiplier: 1.0 (no special conditions)
  
  FINAL STAFF SCORE: 72.4 / 100
```

**Score Bands & Actions:**
```
90-100: ELITE
        - Highlighted in staff selection
        - Eligible for premium shifts
        - Recommended first for urgent shifts
        - Notification: "You're in our top 10% performers!"

70-89: RELIABLE
       - Default recommendation
       - Normal shift assignment process
       
50-69: MARGINAL
       - Only assigned if no RELIABLE staff available
       - Monitor closely; flag for remedial action
       - Notification: "Complete your profile to improve your score"
       
<50:   AT RISK
       - Cannot be auto-assigned urgent shifts
       - Admin review required before assignment
       - Notification: "Your profile has issues; contact support"
       - Automatic: Suspend from new shifts until resolved
```

---

### 2.2 Client Scoring System

**Goal:** Determine client reliability (payment history, cancellations, professionalism)

**Scoring Formula:**
```
CLIENT_SCORE = (
  0.30 × Payment_Score +             // Pays on time (30%)
  0.25 × Cancellation_Score +        // Doesn't cancel shifts (25%)
  0.20 × Professionalism_Score +     // Easy to work with (20%)
  0.15 × Volume_Score +              // Consistent bookings (15%)
  0.10 × Compliance_Score            // Provides accurate info (10%)
) × Multiplier
```

**Component 1: Payment Score (30%)**
```
Base: 100 points
Payment history (last 12 months):
  - All invoices paid on time: 100
  - 1 payment 1-7 days late: -10
  - 1 payment 8-14 days late: -20
  - 1 payment 15-30 days late: -30
  - 1 payment 30+ days late: -50
  - Any unpaid invoices: -100

Recency weight:
  - Recent late payments (< 30 days): Count as 200% impact
  - Recent on-time: +5 bonus

Example:
  Base: 100
  1 payment 5 days late (2 months ago): -10 = 90
  5 on-time payments (recent): +5 = 95 points
  Final: 95 points
```

**Component 2: Cancellation Score (25%)**
```
Base: 100 points
Cancellations as % of total shifts (last 12 months):
  - 0%: 100 points
  - 0-2%: 90 points
  - 2-5%: 70 points
  - 5-10%: 40 points
  - 10%+: 0 points

Reason matters:
  - Cancelled >24h in advance: -5 points (less severe)
  - Cancelled <24h in advance: -20 points
  - Cancelled <1h in advance: -50 points

Example:
  3 of 100 shifts cancelled (3%): 70 points
  2 were cancelled >24h in advance: 70 + (2×5) = 80
  1 was cancelled <1h in advance: 80 - 50 = 30 points
  Final: 30 points
```

**Component 3: Professionalism Score (20%)**
```
Base: 100 points
Factors:
  - Staff never complained about them: +20
  - Staff complaints (1): -20
  - Staff complaints (2+): -50
  - Always provides detailed shift specs: +15
  - Often vague or missing info: -25
  - Respectful communication: +10
  - Rude or dismissive: -30

Example:
  Base: 100
  + Detailed specs: +15 = 115
  + Respectful: +10 = 125 → capped at 100
  Final: 100 points (or flag for qualitative review)
```

**Component 4: Volume Score (15%)**
```
Reflects: Consistency = trust
Base: 50 points

Average shifts/month (last 6 months):
  - <1 shift/month: 30 points
  - 1-5 shifts/month: 50 points
  - 5-10 shifts/month: 70 points
  - 10-20 shifts/month: 85 points
  - 20+ shifts/month: 100 points

Trend (growing or shrinking?):
  - Growing volume: +10 bonus
  - Shrinking volume: -20 penalty
  
Example:
  10 shifts/month average: 85 points
  Growing trend: +10 = 95 points
  Final: 95 points
```

**Component 5: Compliance Score (10%)**
```
Base: 100 points
Checks:
  - All supplied docs accurate: 100
  - 1 discrepancy in job description: -20
  - Multiple inconsistencies in data: -50
  - Compliance audit failed: -100

Example:
  No discrepancies found: 100 points
  Final: 100 points
```

**Final Score Calculation:**
```
Example client:
  Payment: 95 points × 0.30 = 28.5
  Cancellation: 30 points × 0.25 = 7.5
  Professionalism: 100 points × 0.20 = 20
  Volume: 95 points × 0.15 = 14.25
  Compliance: 100 points × 0.10 = 10
  
  TOTAL: 28.5 + 7.5 + 20 + 14.25 + 10 = 80.25 / 100
```

**Score Bands & Actions:**
```
90-100: PREMIUM
        - Priority assignment of top staff
        - Dedicated account manager
        - Exclusive features
        - Negotiated rates (better terms possible)

70-89: STANDARD
       - Normal assignment & support
       
50-69: MONITORED
       - Close monitoring of relationship
       - Payment flags enabled
       - Notify if any issues detected
       
<50:   AT RISK
       - Require admin approval before shifts assigned
       - Payment required upfront
       - May suspend account pending resolution
```

---

## SECTION 3: MATCHING ALGORITHM (Foundation for AI)

### 3.1 Shift-Staff Matching (Deterministic)

**Purpose:** Given a shift, rank available staff by suitability

**Matching Formula:**
```
MATCH_SCORE = (
  0.25 × Role_Match +           // Exact role or certified equivalent (25%)
  0.20 × Schedule_Fit +         // No conflicts, enough rest (20%)
  0.20 × Location_Fit +         // Close to shift location (20%)
  0.15 × Staff_Score +          // Overall staff quality (15%)
  0.15 × Specialization_Match +  // Extra skills valued (15%)
  0.05 × Client_Preference      // Client previously booked this staff (5%)
) × URGENCY_MULTIPLIER
```

**Component 1: Role Match (25%)**
```
Exact role: 100 points
Certified equivalent:
  - Senior nurse → can do junior nurse role: 90 points
  - Senior care worker → junior care worker: 90 points
  - 90 points: Different but compatible role
  - 0 points: Wrong role (e.g., gardener for nursing shift)

Example:
  Shift: "Junior Nurse"
  Staff: "Senior Nurse" → 90 points
```

**Component 2: Schedule Fit (20%)**
```
No conflicts: 100 points
Deductions:
  - <15 min rest after previous shift: -50 (fatigue risk)
  - <1 hour rest between shifts: -20 (tight but legal)
  - <8 hours since end of last shift: -10 (minor concern)
  
Availability:
  - Can work: 100
  - Preferred hours but can work: 80
  - Outside preferred hours: 50
  - Marked unavailable: 0

Example:
  No conflicts: 100
  Outside preferred hours: 50
  Final: 50 points
```

**Component 3: Location Fit (20%)**
```
Distance from staff home/last location:
  - <5 miles: 100 points
  - 5-15 miles: 85 points
  - 15-30 miles: 60 points
  - 30-50 miles: 30 points
  - 50+ miles: 0 points (usually decline)

Travel time consideration:
  - Under 30 min by car: +20 bonus
  - 30-60 min by car: no change
  - Over 60 min: -20 penalty

Example:
  10 miles away: 85 points
  30 min travel time: +20 = 105 → capped at 100
  Final: 100 points
```

**Component 4: Staff Score (15%)**
```
Direct use of Module 3 Staff Score (calculated above)
Range: 0-100 (already normalized)

This ensures high-quality staff prioritized
```

**Component 5: Specialization Match (15%)**
```
Shift specializations required:
  - Each required specialization staff has: +30 points
  - Extra specializations staff has (not required): +10 points each (max 20)

Example:
  Shift requires: "Manual Handling"
  Staff has: "Manual Handling" + "Catheter Care"
  Points: 30 (required match) + 10 (extra) = 40 points
```

**Component 6: Client Preference (5%)**
```
Has client hired this staff before?
  - Yes & rated 4+ stars: +50 points
  - Yes & rated 3 stars: +25 points
  - Yes & rated <3 stars: -50 points
  - Never hired: 0 points (neutral)

Example:
  Previous work, rated 5 stars: 50 points
```

**Urgency Multiplier:**
```
Normal shifts (72+ hours notice): 1.0
Urgent shifts (8-72 hours): 1.15 (boost quality requirement)
Critical shifts (<8 hours): 1.3 (get the best available)
Emergency (< 1 hour): 1.5 (any willing candidate)

Example:
  Normal shift, Match Score = 70:
    Urgency multiplier = 1.0 → Final = 70
  
  Urgent shift, Match Score = 70:
    Urgency multiplier = 1.15 → Final = 80.5
```

**Ranking Algorithm:**
```
1. Calculate match score for each available staff
2. Filter out score < 50 (below minimum for any shift)
3. Sort descending by final score
4. Return top 5-10 candidates (show to client/admin)
5. Auto-assign to top candidate if shift marked urgent + auto_assign enabled

Example output:
Shift: Junior Nurse, Monday 08:00, Emergency
Available staff ranked:
  1. Sarah (92 points) ← Auto-recommend
  2. Mike (85 points)
  3. Lisa (78 points)
  4. James (72 points)
  5. Emma (68 points)
```

---

## SECTION 4: DATABASE SCHEMA UPDATES

**Destructive Changes (Require Migrations):**

```sql
-- Add to Staff table
ALTER TABLE Staff ADD COLUMN (
  staff_score DECIMAL(5,2) DEFAULT 50,  -- 0-100
  client_rating_avg DECIMAL(3,2) DEFAULT 3.0,  -- 1-5
  attendance_score DECIMAL(5,2) DEFAULT 50,
  compliance_score DECIMAL(5,2) DEFAULT 50,
  availability_score DECIMAL(5,2) DEFAULT 50,
  experience_score DECIMAL(5,2) DEFAULT 50,
  profile_completeness_score DECIMAL(5,2) DEFAULT 50,
  last_scored_at TIMESTAMP,
  score_updated_by ENUM('automated', 'manual'),
  no_show_count INT DEFAULT 0,
  late_arrival_count INT DEFAULT 0,
  total_shifts_completed INT DEFAULT 0
);

-- Add to Client table
ALTER TABLE Client ADD COLUMN (
  client_score DECIMAL(5,2) DEFAULT 50,  -- 0-100
  payment_score DECIMAL(5,2) DEFAULT 50,
  cancellation_score DECIMAL(5,2) DEFAULT 50,
  professionalism_score DECIMAL(5,2) DEFAULT 50,
  volume_score DECIMAL(5,2) DEFAULT 50,
  compliance_score DECIMAL(5,2) DEFAULT 50,
  last_scored_at TIMESTAMP,
  total_invoices INT DEFAULT 0,
  late_payments INT DEFAULT 0,
  on_time_payments INT DEFAULT 0,
  cancelled_shifts INT DEFAULT 0
);

-- NEW: Scoring Audit Log
CREATE TABLE ScoringAuditLog (
  id UUID PRIMARY KEY,
  entity_type ENUM('staff', 'client') NOT NULL,
  entity_id UUID NOT NULL,
  old_score DECIMAL(5,2),
  new_score DECIMAL(5,2),
  score_components JSON,  -- Store breakdown: {client_rating: 80, attendance: 55, ...}
  reason VARCHAR(500),  -- Why score changed
  triggered_by VARCHAR(100),  -- 'payment_received', 'no_show', 'rating_submitted', etc
  created_at TIMESTAMP,
  created_by VARCHAR(100)  -- 'system' or user_id
);

-- NEW: Matching Algorithm Log
CREATE TABLE MatchingLog (
  id UUID PRIMARY KEY,
  shift_id UUID REFERENCES Shift(id),
  staff_id UUID REFERENCES Staff(id),
  match_score DECIMAL(5,2),
  components JSON,  -- {role_match: 100, schedule_fit: 85, ...}
  rank_position INT,
  was_assigned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP
);

-- Modify Shift table
ALTER TABLE Shift ADD COLUMN (
  auto_match_suggested BOOLEAN DEFAULT FALSE,
  auto_match_top_candidate_id UUID,
  auto_match_score DECIMAL(5,2)
);

-- NEW: Staff Points Ledger (for behavioral system)
CREATE TABLE StaffPointsLedger (
  id UUID PRIMARY KEY,
  staff_id UUID REFERENCES Staff(id),
  points_change INT,  -- +10, -25, etc
  reason ENUM('on_time_arrival', 'no_show', 'late_arrival', 'rating_positive', 'rating_negative', 'profile_update', 'manual_adjustment'),
  related_entity_id UUID,  -- shift_id or rating_id
  created_at TIMESTAMP
);

-- NEW: Client Points Ledger (for behavioral system)
CREATE TABLE ClientPointsLedger (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES Client(id),
  points_change INT,
  reason ENUM('on_time_payment', 'late_payment', 'shift_cancellation', 'rating_submitted', 'manual_adjustment'),
  related_entity_id UUID,  -- invoice_id or shift_id
  created_at TIMESTAMP
);
```

**Migration Safety:**
- Add all fields with DEFAULT values (no data loss)
- Backfill scores: Initial calc on all staff/clients (one-time, ~10 min for 1000 staff)
- Create audit log: Track all score changes (compliance + debugging)
- Rollback plan: Drop new fields + audit tables if issues found

---

## SECTION 5: SCORING UPDATE TRIGGERS

**When Staff Score Updates:**
1. **Shift Completed** → Recalc attendance score
2. **Client Rating Submitted** → Recalc client rating score + overall
3. **Document Expires** → Recalc compliance score
4. **Document Uploaded** → Recalc profile completeness + compliance
5. **Long Time Since Last Shift** → Reduce availability score gradually
6. **Manual Input** → Admin can adjust score (audit logged)

**When Client Score Updates:**
1. **Invoice Paid (on time)** → +points to payment score
2. **Invoice Paid (late)** → -points to payment score
3. **Shift Cancelled** → -points to cancellation score
4. **Month Passes** → Recalc volume trend
5. **Manual Input** → Admin can adjust score (audit logged)

**Scheduling:**
- **Real-time:** Score updates immediately after event (within 5 seconds)
- **Batch nightly:** Recalc all scores at 2am (availability decay, trends)
- **Monthly:** Reset behavioral points on 1st of month (clean slate with historical record)

---

## SECTION 6: API ENDPOINTS

**Scoring Endpoints:**

```
GET    /api/staff/:id/score
       Returns: {overall_score, components: {client_rating, attendance, ...}, score_band, last_updated}
       Auth: ADMIN or STAFF (view own)

GET    /api/client/:id/score
       Returns: {overall_score, components, score_band, last_updated}
       Auth: ADMIN or CLIENT (view own)

POST   /api/staff/:id/recalc-score
       Returns: {old_score, new_score, changes}
       Auth: ADMIN only
       
GET    /api/shift/:id/match-candidates
       Returns: [
         {staff_id, name, match_score, rank, components: {...}},
         ...
       ]
       Auth: CLIENT or ADMIN

POST   /api/shift/:id/assign-top-candidate
       Auto-assigns highest ranked staff
       Auth: ADMIN or CLIENT with OPERATIONS_MANAGER role
       
GET    /api/scoring/audit-log?entity_type=staff&days=30
       Returns: List of all score changes (compliance)
       Auth: ADMIN only
       
GET    /api/staff/:id/points-ledger
       Returns: [
         {date, points_change, reason, shift_id},
         ...
       ]
       Auth: ADMIN or STAFF (view own)
```

---

## SECTION 7: INTEGRATION WITH OTHER MODULES

### 7.1 Module 1 Integration
**When:** Client submits rating (Module 1, Section 2.3)
**Action:** Trigger staff score recalculation
**Data flow:** Rating data → ScoringAuditLog → Staff score updated
**API:** POST to `/api/staff/{staff_id}/recalc-score`

### 7.2 Module 2 Integration
**When:** Notification triggered
**Action:** Include staff score in email (optional)
**Data flow:** Staff score → Email template variables
**Example:** "This staff member has an excellent rating of 4.8/5 ⭐"

### 7.3 Module 4 Integration
**When:** AI chat creates shift
**Action:** Auto-match candidates + suggest top staff
**Data flow:** Shift details → Matching algorithm → Return ranked list
**Endpoint:** GET `/api/shift/{shift_id}/match-candidates`

---

## SECTION 8: FEATURE FLAGS & CONFIGURATION

**Feature Flags:**
```
features.staff_scoring_enabled (default: true)
features.client_scoring_enabled (default: true)
features.auto_matching_enabled (default: false) → Enable after testing
features.behavioral_points_enabled (default: false) → Phase 2
features.scoring_audit_log_enabled (default: true) → Always for compliance
```

**Configurable Thresholds:**
```
scoring.staff_elite_threshold = 90
scoring.staff_reliable_threshold = 70
scoring.staff_marginal_threshold = 50

scoring.client_premium_threshold = 90
scoring.client_standard_threshold = 70
scoring.client_monitored_threshold = 50

scoring.matching_urgency_boost.normal = 1.0
scoring.matching_urgency_boost.urgent = 1.15
scoring.matching_urgency_boost.critical = 1.3
scoring.matching_urgency_boost.emergency = 1.5

scoring.matching_minimum_score = 50  -- Don't recommend below this
```

---

## SECTION 9: TESTING CHECKLIST

**Before Merge:**
- [ ] Staff score calculation: Create 5 test staff with known inputs → verify score correct
- [ ] Client score calculation: Create 5 test clients with known history → verify score correct
- [ ] Score updates trigger correctly (rating submitted → score recalc within 5 sec)
- [ ] Audit log created for every score change
- [ ] Matching algorithm: Create shift, get top 5 candidates, verify ranking logic
- [ ] Auto-match (when enabled): Shift assigned to top candidate automatically
- [ ] Score migration: Existing staff/clients backfilled correctly
- [ ] Performance: Score recalc < 500ms for single entity, < 5 sec for batch 1000
- [ ] Edge cases:
  - Staff with no ratings yet: Score calculated correctly
  - Client with no payment history: Score handled gracefully
  - Staff with expired docs: Score reflects penalty
  - Matching: Staff with 0 availability score should rank lower

---

## SECTION 10: ROLLBACK STRATEGY

**Database Safety:**
- All new fields have DEFAULT values (old queries still work)
- New tables are opt-in via API (don't break old code)
- Migration script: Reversible (drop columns if needed)

**Disabling Safely:**
- Feature flag `staff_scoring_enabled = false` → API returns empty scores
- Feature flag `auto_matching_enabled = false` → Manual matching only
- If issues arise: Disable flag, no code changes needed

---

## SECTION 11: SUCCESS METRICS

**Implementation Success:**
- All staff/client scores calculated correctly (100% test coverage)
- Score updates within 5 seconds of triggering event
- Matching algorithm ranks top staff 95%+ of the time (verified by manual review)
- Zero score calculation errors in audit log

**Business Success:**
- Staff with score > 90 have 15% higher fill rate than score < 70
- Clients with score > 90 have 25% fewer cancellations than score < 70
- Avg shift fill time reduced 10% after auto-matching enabled
- Client NPS +5 points from "We can predict the best staff"

---

## SECTION 12: EXISTING ALGORITHM STATUS

**Agent Action:**
From ALGORITHM_AUDIT.md findings:
- If algorithm exists + active: Document it, integrate with Module 3 (don't replace)
- If algorithm exists + inactive: Decide: replace or restore?
- If no algorithm: Proceed with design above

**Key Question for Discovery:**
"We already have an algorithm built not sure what for but I think its staff scoring and shift matching - are we reusing this?"
→ Must determine exact current state before building

---

## SECTION 13: AGENT EXECUTION CHECKLIST

**Phase 1: Discovery & Audit (1-2 hours)**
- [ ] Search for existing algorithm code
- [ ] Create ALGORITHM_AUDIT.md
- [ ] Decide: Replace, integrate, or restore existing algorithm
- [ ] Validate scoring formula with business owner

**Phase 2: Database Preparation (1 hour)**
- [ ] Create migration scripts
- [ ] Test on dev database
- [ ] Backfill scores for existing staff/clients
- [ ] Create audit log tables

**Phase 3: Scoring Implementation (4-5 hours)**
- [ ] Implement staff score calculation
- [ ] Implement client score calculation
- [ ] Create score update triggers (event-driven)
- [ ] Create nightly batch recalc
- [ ] Implement scoring API endpoints

**Phase 4: Matching Implementation (3-4 hours)**
- [ ] Implement matching algorithm
- [ ] Create matching endpoints
- [ ] Integrate with shift creation (Module 1)
- [ ] Add feature flag for auto-match

**Phase 5: Testing & Integration (2-3 hours)**
- [ ] Run full test suite
- [ ] Integration test with Module 1
- [ ] Verify audit logs created
- [ ] Performance testing

**Total Estimated Time: 11-15 hours**

---

**END OF MODULE 3 BRIEF**