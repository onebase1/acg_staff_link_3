# Phase 2 – Core Entity Parity & Data Integrity

## Scope
- Align Supabase schema with Base44 for agencies, clients, staff, groups, compliance, operational costs.
- Ensure CRUD flows in the UI persist and read from Supabase.
- Seed realistic multi-tenant data for smoke testing.

## Prerequisites
- Phase 1 exit criteria signed off.
- Comprehensive list of Base44 core entities and relationships.
- Supabase SQL migrations tooling ready (`scripts/runSql.mjs`, pg_meta access).

## Workstreams & Steps

### 1. Schema Alignment
- [ ] Build entity-by-entity matrices (field name, type, nullable, default, foreign keys).
- [ ] Update Supabase tables with missing columns and constraints.
- [ ] Ensure enum/domain types mirror Base44 values (e.g., `client_status`, `staff_grade`).
- [ ] Re-run diff to confirm zero drift; store results in `schema-parity.md`.

### 2. Data Migration & Seeding
- [ ] Design seed scripts for sample agencies, staff, clients, compliance docs.
- [ ] Load deterministic datasets (Dominion, sample shifts) for regression tests.
- [ ] Create rollback scripts for reseeding between environments.
- [ ] Document import process for bulk CSV uploads replacing Base44 endpoints.

### 3. API & UI Validation
- [ ] Trace each page that touches these entities (`Clients`, `Staff`, `AgencySettings`, etc.).
- [ ] Verify `base44.entities.*` wrappers map to Supabase tables without legacy calls.
- [ ] Add integration tests (Playwright + Supabase test data) for create/update/delete flows.
- [ ] Capture regression checklist for agency admin journey (onboard client, invite staff, update agency).

### 4. Multi-Tenant Guardrails
- [ ] Confirm RLS filters include agency_id scoping for every core table.
- [ ] Add cross-tenant negative tests (e.g., staff from agency A cannot see agency B clients).
- [ ] Update audit logging tables to include `acting_user_id`, `agency_id`.

## Deliverables
- Updated migrations ensuring schema parity for core entities.
- Seed scripts stored under `scripts/seeds/` with README instructions.
- Playwright scenarios covering agency admin CRUD actions.
- Regression checklist appended to `docs/migration/testing.md`.

## Exit Criteria
- All core entity pages persist & retrieve data solely from Supabase.
- Tenant isolation verified for agencies, staff, clients.
- Seeds enable reproducible demo data in under 5 minutes.
- Schema diff for core entities shows no discrepancies.






