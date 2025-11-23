-- ========================================
-- FIX ALL TIMESHEETS: Recalculate breaks and pay
-- AGENCY BREAK POLICY: < 10 hours = no break, ≥ 10 hours = 60 min break
-- ========================================

-- STEP 1: Preview timesheets that need fixing
-- ========================================
SELECT
  t.id,
  t.shift_date,
  s.first_name || ' ' || s.last_name as staff_name,
  c.name as client_name,
  t.total_hours,
  t.break_duration_minutes as current_break,
  -- Calculate correct break based on agency policy
  CASE
    WHEN t.total_hours >= 10 THEN 60
    ELSE 0
  END as correct_break,
  t.staff_pay_amount as current_pay,
  -- Calculate correct pay (hours - break) × rate
  ROUND(
    t.pay_rate * (
      t.total_hours - (
        CASE
          WHEN t.total_hours >= 10 THEN 60
          ELSE 0
        END / 60.0
      )
    ),
    2
  ) as correct_pay,
  t.status
FROM timesheets t
JOIN staff s ON t.staff_id = s.id
JOIN clients c ON t.client_id = c.id
WHERE t.total_hours IS NOT NULL
  AND t.total_hours > 0
  AND t.clock_out_time IS NOT NULL  -- Only fix completed timesheets
  -- Only fix if break is incorrect OR pay is incorrect
  AND (
    t.break_duration_minutes != CASE
      WHEN t.total_hours >= 10 THEN 60
      ELSE 0
    END
    OR
    t.staff_pay_amount != ROUND(
      t.pay_rate * (
        t.total_hours - (
          CASE
            WHEN t.total_hours >= 10 THEN 60
            ELSE 0
          END / 60.0
        )
      ),
      2
    )
  )
ORDER BY t.shift_date DESC
LIMIT 50;

-- ========================================
-- STEP 2: Apply the fix (UNCOMMENT TO RUN)
-- ========================================
/*
UPDATE timesheets
SET
  break_duration_minutes = CASE
    WHEN total_hours >= 10 THEN 60
    ELSE 0
  END,
  staff_pay_amount = ROUND(
    pay_rate * (
      total_hours - (
        CASE
          WHEN total_hours >= 10 THEN 60
          ELSE 0
        END / 60.0
      )
    ),
    2
  ),
  client_charge_amount = ROUND(
    charge_rate * (
      total_hours - (
        CASE
          WHEN total_hours >= 10 THEN 60
          ELSE 0
        END / 60.0
      )
    ),
    2
  )
WHERE total_hours IS NOT NULL
  AND total_hours > 0
  AND clock_out_time IS NOT NULL
  AND status NOT IN ('paid', 'approved');  -- Don't modify approved/paid timesheets
*/

-- ========================================
-- STEP 3: Verify the fix
-- ========================================
/*
SELECT
  COUNT(*) as total_fixed,
  COUNT(*) FILTER (WHERE break_duration_minutes = 0) as no_break,
  COUNT(*) FILTER (WHERE break_duration_minutes = 60) as break_60min,
  AVG(total_hours) as avg_hours
FROM timesheets
WHERE total_hours IS NOT NULL
  AND clock_out_time IS NOT NULL;
*/

-- ========================================
-- IMPORTANT NOTES:
-- ========================================
-- 1. AGENCY BREAK POLICY:
--    - Shifts < 10 hours: All hours paid (no break deduction)
--    - Shifts ≥ 10 hours: 60 min unpaid break
--
-- 2. This script does NOT modify approved or paid timesheets
--    (to avoid disrupting finalized payroll)
--
-- 3. For approved/paid timesheets, you need to decide:
--    - Leave them as-is (accept the discrepancy)
--    - Manually review and correct critical errors
--    - Create adjustment entries
--
-- 4. Run STEP 1 first to preview changes
-- 5. Uncomment STEP 2 to apply the fix
-- 6. Run STEP 3 to verify results
-- ========================================
