# ROLLBACK PLAN - Module 49

If the retrospective shift logging feature exhibits critical bugs, follow these steps to securely reverse all changes and restore functionality.

## Frontend Rollback
1. Revert `src/pages/Shifts.jsx` to remove the "Log Past Shift" button and import statement for the modal.
2. Delete `src/components/bulk-shifts/LogPastShiftModal.jsx`.

## Backend Rollback
1. Run `supabase functions delete log-retrospective-shift`.
2. Delete the `supabase/functions/log-retrospective-shift/` directory locally.

## Data Scrubbing (If necessary)
Identify shifts created by this module by filtering for specific values.
```sql
-- Find shifts created by the module (assuming confirmation_method equals 'admin_retrospective' on the booking)
SELECT s.id, b.id as booking_id, t.id as timesheet_id
FROM shifts s
JOIN bookings b ON b.shift_id = s.id
LEFT JOIN timesheets t ON t.shift_id = s.id
WHERE b.confirmation_method = 'admin_retrospective' 
-- AND s.created_at > 'YYYY-MM-DD HH:MM:SS';

-- Delete timesheets
DELETE FROM timesheets WHERE shift_id IN (...);

-- Delete bookings
DELETE FROM bookings WHERE shift_id IN (...);

-- Delete shifts
DELETE FROM shifts WHERE id IN (...);
```

## Post-Rollback Verification
1. Open the `/shifts` page.
2. Verify the "Log Past Shift" option is fully removed.
3. Verify that standard `Create Shift` modal behavior remains uninterrupted.
