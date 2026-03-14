# Directive: Timesheet Logic Guard

## Goal
To prevent regressions in the critically brittle `/timesheet` implementation, specifically addressing RLS errors, booking dependencies, and OCR extraction reliability.

## Critical Invariants (NEVER BREAK THESE)
1. **RLS Safety**: When querying staff or profiles within `TimesheetCard.jsx`, ALWAYS use `.maybeSingle()` instead of `.single()`. This prevents `PGRST116` crashes if RLS blocks the row.
2. **Booking Dependency**: The `auto-timesheet-creator` REQUIRES a `booking_id`. If creating a timesheet for a retrospectively assigned shift, you MUST create the `booking` record first.
3. **Draft Visibility**: Never show `draft` timesheets in the main admin view for future shifts. Clutter reduction is a core UX requirement.
4. **Validation Windows**: Only surface hour/signature discrepancies AFTER the shift end time. Surface "Advisory" notes for in-progress shifts instead of errors.

## Verification Checklist
- [ ] Test with a staff user who has limited RLS (e.g., cannot see other agency staff).
- [ ] Verify that shifts assigned *after* they ended successfully generate a `booking` and `timesheet`.
- [ ] Check `TimesheetDetail.jsx` for "Robert Brown" incident handling (graceful fallback for missing profiles).

## Tools
- `execution/audit_timesheet_data.py`: Run this to find shifts missing `booking_id` or orphaned timesheets.
