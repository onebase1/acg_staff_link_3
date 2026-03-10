# MODULE_49: Retrospective Shift Logging

## Goal
Build a dedicated, single-click UI for admins to log past shifts seamlessly. This eliminates the error-prone manual UI toggles and ensures atomic booking and timesheet generation.

## Why This Matters
Currently, recording a past shift requires an admin to use the standard "Create Shift" modal, let the system auto-close it to `awaiting_admin_closure`, then reopen the shift, check "Admin Bypass", uncheck "Assign", select the user, and save. This breaks down in production and leads to orphaned draft timesheets or failed booking insertions. 

This module creates a dedicated "Log Past Shift" entry point that guarantees 100% timesheet generation consistency.

## Scope
1. Create a `LogPastShiftModal.jsx` component.
2. Add a Supabase Edge Function `log-retrospective-shift` for atomic database insertion.
3. Update `Shifts.jsx` to mount the modal.
