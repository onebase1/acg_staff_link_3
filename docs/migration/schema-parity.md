# Schema Parity Baseline (Base44 → Supabase)

Last updated: 2025-11-10

This document tracks the alignment between the historical Base44 data model and the Supabase schema. Data below was verified via `information_schema.columns` and spot-checked against UI expectations and seeded records.

## Summary

| Entity Group | Table(s) | Status | Notes / Follow-ups |
| --- | --- | --- | --- |
| Platform | `agencies`, `profiles`, `agency_admin_invitations` | ✅ | Core columns present (bank details JSON, VAT/company numbers, invitation tokens). Need to confirm `profiles` JSON structure vs Base44 once export acquired. |
| People | `staff`, `groups`, `compliance` | ✅ | All referenced columns (GPS consent, assignments) exist. Verify enums (`employment_type`, `status`) to match Base44 canonical values. |
| Clients | `clients` | ✅ | Added `billing_email`, `internal_locations`, `payment_terms`. Column types align with UI (JSONB for nested structures). |
| Workforce Ops | `shifts`, `bookings`, `timesheets` | ✅ | Shift journey fields (`shift_journey_log`, `admin_closure_*`) and timesheet financial fields (`staff_pay_amount`, `client_charge_amount`) present. Need to validate supporting tables (`shift_watchlist`, `availability`) when Base44 export ready. |
| Financials | `invoices`, `invoice_amendments`, `operational_costs`, `payslips` | ✅ | Totals, VAT, metadata JSON fields present. Confirm decimal precision & rounding rules in later phase. |
| Communications | `notification_queue`, `change_logs` | ✅ | Supports audit trail and messaging queue use-cases. |

## Key Checks Performed
- Ran `information_schema.columns` query for all migrated tables (see Supabase SQL history).
- Verified `clients` insert/update via Dominion onboarding flow.
- Confirmed timesheet/pay fields exist to unblock payroll calculations.

## Known Gaps / Next Actions
1. **Profiles Table Mapping** – Need Base44 reference to ensure Supabase `profiles` JSON matches expected shape (`user_type`, `agency_id`, `permissions`).  
2. **Supplementary Tables** – Pending audit for less-frequent entities (e.g., `shift_templates`, `audit_trails`, `calendar_events`) once Base44 dump received.  
3. **Enum Consistency** – Validate textual statuses against Base44 enumerations (e.g., shift `status`, compliance `document_type`). Consider migrating to PostgreSQL enums for integrity.  
4. **Foreign Key Constraints** – Review FK coverage to guarantee cascading behaviour mirrors Base44 (currently many relationships rely on application logic).  
5. **Index Review** – Ensure performance-critical queries (shift filters, analytics) have equivalent indexes.  

Document updates should accompany every schema change to maintain parity visibility.






