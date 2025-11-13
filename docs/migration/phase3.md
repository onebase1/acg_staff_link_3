# Phase 3 – Workforce Operations & Shift Lifecycle

## Scope
- Reproduce Base44 shift lifecycle (creation → fulfilment → verification → completion/cancellation) on Supabase.
- Migrate bookings, availability, timesheets, disputes, GPS tracking.
- Ensure automation hooks update the shift journey diagram and audit logs.

## Prerequisites
- Phase 2 entity parity completed.
- Supabase functions for notifications stubbed or planned.
- Access to historical Base44 workflow documentation.

## Workstreams & Steps

### 1. Shift & Booking Schema Audit
- [ ] Confirm tables: `shifts`, `shift_journey_log`, `bookings`, `staff_availability`, `shift_watchlist`.
- [ ] Align JSONB columns (`requirements`, `journey_log`) structure with Base44 spec.
- [ ] Validate indexes and foreign keys for performant filtering.
- [ ] Update stored procedures/RPCs (`create_shift_bundle`, `assign_staff_to_shift`) as needed.

### 2. Timesheets & Verification
- [ ] Ensure `timesheets` columns include all Base44 fields (GPS, approvals, rejection reason).
- [ ] Port automated calculations (total hours, adjustments, pay/charge rates).
- [ ] Rebuild post-shift verification flow (`DailyShiftVerification.jsx`, `TimesheetDetail.jsx`).
- [ ] Add Playwright flows for verify/approve/reject timesheets.

### 3. Shift Journey Automation
- [ ] Map UI states in `ShiftJourneyDiagram.jsx` to Supabase status transitions.
- [ ] Implement triggers/functions to append journey events on status change.
- [ ] Guarantee multi-tenant filtering in journey queries.
- [ ] Document event taxonomy (created, published, filled, checked-in, completed, cancelled, disputed).

### 4. Notifications & Escalations
- [ ] Wire Twilio/WhatsApp/SMS alerts for key journey milestones.
- [ ] Configure escalation policies (e.g., unfilled shift reminders).
- [ ] Provide runbooks for override/manual adjustments.

### 5. Analytics & Monitoring
- [ ] Update dashboards (Shift Analytics, Live Shift Map) to query Supabase.
- [ ] Validate KPIs (fill rate, cancellations, lateness) against seeded data.
- [ ] Add materialized views or cached queries if needed for performance.

## Deliverables
- SQL migrations and functions backing end-to-end shift lifecycle.
- Updated compatibility services for shift automation RPCs.
- Test suites covering shift creation thru completion (UI + API).
- Documentation of journey event model & notification triggers.

## Exit Criteria
- Agency admin can create, publish, fill, verify, and close shifts using Supabase only.
- Shift Journey Diagram reflects real-time statuses from Supabase.
- Timesheet approvals update financial ledgers without errors.
- Alerting/notification hooks fire for happy path and failure scenarios.






