# Algorithm Audit

## 1. Existing Formulas
- **Current Logic:** None found. The codebase does not contain `services/matchingService.js`, `utils/scoring.js`, or `functions/calculateScore.js`.
- **Database:**
    - `Staff` table has a `rating` column (numeric).
    - `Client` table has a `rating` column (numeric).
    - No `reliability_score`, `desirability_score`, or `match_score` columns exist.

## 2. Data Availability
- **Attendance Records:** Assumed available via `Shifts` table (completed shifts).
- **Cancellation History:** Assumed available via `Shifts` table (cancelled status).
- **Distance:** Addresses are likely stored, but need to confirm if lat/long are available for distance calculation.
- **Ratings:** Basic rating data exists.

## 3. Performance
- **Current:** N/A (No matching engine).
- **Projected:**
    - Scoring 1000 staff should be fast if indexed correctly.
    - Distance calculation might be the bottleneck. Using PostGIS or efficient Haversine formula is recommended.

## 4. Recommendations
- Implement the scoring system from scratch as per `SPECIFICATION.md`.
- Ensure `Staff` and `Client` tables are updated with new columns.
- Create the `ScoreHistory` table to track changes.
