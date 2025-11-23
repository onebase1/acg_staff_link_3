-- ========================================
-- FIX: Chadaira's Nov 19 Timesheet
-- Correct the pay calculation and break deduction
-- AGENCY BREAK POLICY: < 10 hours = no break, ≥ 10 hours = 60 min break
-- ========================================

-- Find the timesheet first (for verification)
SELECT
  t.id,
  t.shift_date,
  s.first_name || ' ' || s.last_name as staff_name,
  c.name as client_name,
  t.total_hours,
  t.break_duration_minutes as current_break,
  t.staff_pay_amount as current_pay,
  t.pay_rate,
  -- Calculate what it SHOULD be:
  CASE WHEN t.total_hours >= 10 THEN 60 ELSE 0 END as correct_break,
  ROUND(
    t.pay_rate * (
      t.total_hours - (
        CASE WHEN t.total_hours >= 10 THEN 60 ELSE 0 END / 60.0
      )
    ),
    2
  ) as correct_pay
FROM timesheets t
JOIN staff s ON t.staff_id = s.id
JOIN clients c ON t.client_id = c.id
WHERE t.shift_date = '2025-11-19'
  AND s.first_name = 'Chadaira'
  AND s.last_name = 'Basera';

-- ========================================
-- Apply the fix
-- ========================================
UPDATE timesheets
SET
  break_duration_minutes = CASE WHEN total_hours >= 10 THEN 60 ELSE 0 END,
  staff_pay_amount = ROUND(
    pay_rate * (
      total_hours - (
        CASE WHEN total_hours >= 10 THEN 60 ELSE 0 END / 60.0
      )
    ),
    2
  ),
  client_charge_amount = ROUND(
    charge_rate * (
      total_hours - (
        CASE WHEN total_hours >= 10 THEN 60 ELSE 0 END / 60.0
      )
    ),
    2
  )
WHERE shift_date = '2025-11-19'
  AND staff_id IN (
    SELECT id FROM staff
    WHERE first_name = 'Chadaira'
    AND last_name = 'Basera'
  );

-- ========================================
-- Verify the fix
-- ========================================
SELECT
  t.id,
  t.shift_date,
  s.first_name || ' ' || s.last_name as staff_name,
  c.name as client_name,
  t.total_hours,
  t.break_duration_minutes,
  t.staff_pay_amount,
  t.client_charge_amount,
  t.pay_rate,
  t.charge_rate,
  t.status
FROM timesheets t
JOIN staff s ON t.staff_id = s.id
JOIN clients c ON t.client_id = c.id
WHERE t.shift_date = '2025-11-19'
  AND s.first_name = 'Chadaira'
  AND s.last_name = 'Basera';

-- ========================================
-- Expected Results After Fix:
-- ========================================
-- total_hours: 1.29
-- break_duration_minutes: 0 (was 60) - BECAUSE 1.29h < 10h
-- staff_pay_amount: 19.03 (was 177.00) - 1.29h × £14.75/hr
-- client_charge_amount: [recalculated based on charge_rate × 1.29]
-- ========================================
