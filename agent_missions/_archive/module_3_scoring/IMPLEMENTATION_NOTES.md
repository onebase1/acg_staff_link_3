# Implementation Notes - Module 3: Scoring & Algorithms

## 1. Formulas Implemented

### Staff Reliability Score (0-100)
- **Base Score:** 50
- **Additions:**
  - Attendance: +2 points per completed shift (Max +20)
  - Ratings: +5 points per 5-star rating (Max +20)
  - Loyalty: +1 point per month active (Max +5)
- **Deductions:**
  - No-Show: -30 points
  - (Other deductions like late cancellation implemented as placeholders or simplified logic)
- **Cap:** Score is clamped between 0 and 100.

### Client Desirability Score (0-100)
- **Base Score:** 70
- **Additions:**
  - Volume: +1 point per shift posted (Max +10)
  - Fill Rate: +10 points if > 90%
- **Deductions:**
  - Cancellations: -10 points per shift cancelled
- **Cap:** Score is clamped between 0 and 100.

### Matching Algorithm
- **Distance (30%):**
  - < 5 miles: 100 pts
  - 5-10 miles: 80 pts
  - 10-20 miles: 40 pts
  - > 20 miles: 0 pts
- **Role Match:** Strict filter (Must match exactly).
- **Reliability (40%):** Uses Staff Reliability Score directly.
- **Client Preference:** +50 pts (Mocked).
- **Fairness:** +10 pts if not worked this week (Mocked).

## 2. Deviations from Spec
- **Distance Calculation:** Used Haversine formula in JS instead of PostGIS for simplicity and portability, as PostGIS availability wasn't confirmed.
- **Triggers:** Implemented as a JS function `onShiftUpdate.js` intended to be called by a webhook, rather than a native SQL trigger, to allow for complex logic and easier maintenance.
- **Metrics:** Some metrics like "Payment Speed" and "Verification" are mocked or simplified due to lack of clear data sources in the current schema audit.

## 3. Rollback Strategy
- **Database:** New columns are nullable or have defaults. They can be ignored or dropped without breaking the app.
- **Code:** Feature flags should be used in the frontend/API to hide scores if needed.
  - `const SHOW_SCORES = false;` (can be set in environment variables).
