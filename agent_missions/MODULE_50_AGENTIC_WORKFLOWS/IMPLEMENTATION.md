# IMPLEMENTATION GUIDE - Module 49

## Phase 1: Database & Edge Function
1. **Create Edge Function:** Create `log-retrospective-shift` in `supabase/functions/`.
2. **Logic Inside Edge Function:**
   - Input: `client_id`, `agency_id`, `staff_id`, `date`, `start_time`, `end_time`, `role_required`.
   - **Insert Shift:** Insert `shifts` record with `status: 'completed'`, `actual_staff_id: staff_id`, `assigned_staff_id: staff_id`.
   - **Insert Booking:** Insert `bookings` record with `status: 'confirmed'`, `confirmation_method: 'admin_retrospective'`.
   - **Trigger Timesheet:** Call `auto-timesheet-creator` directly from this function.
   - **Notification Suppressed:** Ensure NO standard SMS/Email assignment notifications are fired out.

## Phase 2: Frontend UI
1. **Create Component:** Create `src/components/bulk-shifts/LogPastShiftModal.jsx`. 
   - Follow the attached mockup. Use simple inputs: Client, Date, Role, Start Time, End Time, Staff.
   - Remove extra fields (Notes, Urgency, Needs Uniform, etc.) unless requested.
2. **Mount to Shifts Page:**
   - In `src/pages/Shifts.jsx`, add a "Log Past Shift" button next to "Create Shift".
   - Wire the button to open the `LogPastShiftModal`.

## Phase 3: Wiring
1. Connect the `LogPastShiftModal.jsx` submit button to invoke the `log-retrospective-shift` Edge Function via `supabase.functions.invoke`.
2. Upon success, toast "Shift retroactively logged and timesheet generated", close the modal, and invalidate the `shifts` and `timesheets` queries to immediately refresh the dashboard.
