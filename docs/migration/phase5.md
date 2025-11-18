# Phase 5 – Financials, Reporting & Compliance

## Scope
- Rebuild financial pipelines (invoices, payslips, billing, payroll) on Supabase.
- Align analytics dashboards, exports, and compliance artefacts with new data sources.
- Maintain audit trails required for agency and regulator reviews.

## Prerequisites
- Shift lifecycle (Phase 3) and automation hooks (Phase 4) operational.
- Access to Base44 financial calculation rules & document templates.
- Connection details for accounting integrations (if any).

## Workstreams & Steps

### 1. Financial Schema & Calculations
- [ ] Verify `invoices`, `invoice_lines`, `payslips`, `payslip_lines`, `operational_costs` schema.
- [ ] Port calculation logic for pay/charge rates, expenses, adjustments.
- [ ] Implement stored procedures or serverless functions for statement generation.
- [ ] Ensure currency, VAT, and regional tax fields match Base44 requirements.

### 2. Document Generation & Delivery
- [ ] Recreate PDF generation pipelines using Supabase Functions or external service.
- [ ] Route document storage to Supabase Storage buckets with appropriate RLS.
- [ ] Configure email/SMS delivery of invoices/payslips with tracking.
- [ ] Support re-generation and versioning workflows.

### 3. Reporting & Analytics
- [ ] Update dashboards (CFODashboard, PerformanceAnalytics, TimesheetAnalytics).
- [ ] Create materialized views for heavy reports if necessary.
- [ ] Validate metrics against Base44 benchmarks using seeded data.
- [ ] Provide CSV/Excel export parity with Base44 bulk export tools.

### 4. Compliance & Audit Trail
- [ ] Verify change logging for financial records (who approved, timestamps).
- [ ] Ensure RLS prevents cross-agency financial data leakage.
- [ ] Document retention policies and data purging routines.
- [ ] Prepare audit packs for regulators (activity logs, approvals, communications).

## Deliverables
- Financial calculation modules & Supabase functions.
- Updated dashboards pulling from Supabase data sources.
- Documentation for reconciliation, month-end close, audit preparation.
- Automated tests comparing sample Base44 vs Supabase financial outputs.

## Exit Criteria
- Agencies can generate invoices/payslips end-to-end on Supabase.
- Reporting surfaces accurate, tenant-scoped metrics.
- Compliance documentation demonstrates auditability.
- Financial exports match Base44 formats and data fidelity.







