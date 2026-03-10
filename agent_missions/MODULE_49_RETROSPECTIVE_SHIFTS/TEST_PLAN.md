# TEST PLAN - Module 49

## Pre-requisites
1. A valid active agency admin account.
2. At least one active client and one active staff member in the database.

## Test 1: UI Rendering
- [ ] Log in as Agency Admin.
- [ ] Navigate to `/shifts`.
- [ ] Verify the "Log Past Shift" button is visible next to "Create Shift".
- [ ] Click "Log Past Shift" and verify the `LogPastShiftModal` opens.
- [ ] Verify the modal ONLY contains fields for Client, Date, Role, Times, and Staff (no Urgency, no Admin Bypass toggles).

## Test 2: Validation
- [ ] Attempt to select a future date in the Date field. Verify the form prevents this or shows an error.
- [ ] Attempt to submit the form without selecting a Client, Date, Role, Times, or Staff. Verify validation errors appear for missing fields.
- [ ] Attempt to set End Time before Start Time without crossing midnight. Verify it shows an error if appropriate for the shift rules.

## Test 3: Happy Path Execution
- [ ] Fill out the form completely with valid past data and a valid staff member.
- [ ] Click "Save & Generate Timesheet".
- [ ] Verify a success toast appears.
- [ ] Verify the modal closes.
- [ ] Verify the Shifts table reloads.

## Test 4: Database Verification (Backend)
- [ ] Open Supabase SQL Editor.
- [ ] **Shifts Table:** Verify the newly created shift has:
  * `status` = 'completed' (or 'awaiting_admin_closure' if that's the preferred end state)
  * `actual_staff_id` = [Selected Staff ID]
  * `assigned_staff_id` = [Selected Staff ID]
- [ ] **Bookings Table:** Verify a booking exists where `shift_id` = [New Shift ID] and `status` = 'confirmed' and `confirmation_method` = 'admin_retrospective'.
- [ ] **Timesheets Table:** Verify a timesheet exists where `shift_id` = [New Shift ID] and `status` = 'draft'.
- [ ] **Notifications Table:** View `notification_log` and verify NO emails or SMS were sent to that staff member regarding shift assignment.
