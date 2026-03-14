# Directive: Self-Healing Logic Guard

## Goal
Protect the #1 Sell of ACG StaffLink: Automated recovery of declined or unconfirmed shifts.

## Critical Invariants
1. **The 24h Threshold**: 
    - If a shift is declined/released < 24h before start, set `urgency = 'high'` and trigger `auto-urgent-digest-broadcaster`.
    - If > 24h, trigger `auto-shift-assignment-engine`.
2. **Orphan Cleanup**: ALWAYS delete `bookings` and `draft` timesheets when a shift is unassigned. Leaving them causes schedule collisions.
3. **Smart Loop Prevention**: Ensure the unassigned `staff_id` is passed to the next matcher run as an exclusion. Check `shift_journey_log` for previous declines before assigning.
4. **Relief Valve**: If a shift has been declined by 3 unique staff members, move it to the **Marketplace** immediately.

## Verification
- Run `mcp_SUPABASE_get_logs` for `staff-decline-shift` to verify penalty logging.
- Check `notification_queue` for bundling correctness during urgent broadcasts.
