# Directive: Compliance Enforcement Guard

## Goal
Ensure only compliant staff are matched to shifts.

## Critical Invariants
1. **Hard Block**: If a staff member's `compliance_status` is not 'compliant' or has expired critical documents (RTW, DBS), they must be filtered OUT of the `auto_assign_shift` SQL result.
2. **Reminder Integrity**: Reminders (30/14/7 days) must not be suppressed by "Unsubscribe" settings if the document is critical for deployment.
3. **Auto-Suspension**: The `compliance-monitor` must move non-compliant staff to a state that prevents them from seeing the Marketplace.

## Tools
- `mcp_SUPABASE_execute_sql`: `SELECT id FROM staff WHERE compliance_status != 'compliant' AND last_incident_date IS NOT NULL;`
