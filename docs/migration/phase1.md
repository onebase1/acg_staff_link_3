# Phase 1 – Platform Foundation & Access Control

## Scope
- Cut over core platform plumbing from Base44 to Supabase.
- Establish multi-tenant RBAC primitives (super admin, agency admin, staff, clients).
- Baseline the schema by diffing Base44 reference entities against Supabase.

## Prerequisites
- Supabase project with anon + service keys configured.
- Environment variables populated in `.env` / hosting secrets.
- Source of truth for Base44 schema (DDL export or entity docs).

## Workstreams & Steps

### 1. Supabase Project Baseline
- [ ] Confirm project settings (URL, anon key, service key) in secrets management.
- [ ] Enable auth providers needed (email/password, magic links, etc.).
- [ ] Configure custom SMTP (Resend) if using Supabase password resets.
- [ ] Set up auth rate limiting & password policies.

### 2. Authentication & Profiles
- [ ] Verify `profiles` table structure matches Base44 expectations.
- [ ] Ensure trigger/RPC auto-provisions profile rows on new users.
- [ ] Import or map RBAC role claims into `auth.users.app_metadata`.
- [ ] Confirm `supabaseAuth` compatibility layer returns Base44-shaped objects.

### 3. RBAC & RLS Guardrails
- [ ] Audit `SECURITY DEFINER` helpers (`is_super_admin`, `get_user_agency_id`, etc.).
- [ ] Validate RLS policies for `agencies`, `clients`, `staff`, `shifts`, `timesheets`.
- [ ] Add automated tests or SQL assertions for each policy branch.
- [ ] Document required JWT claims for front-end role switching.

### 4. Baseline Schema Diff
- [ ] Generate Base44 schema export (tables, columns, types, defaults, indexes).
- [ ] Run automated diff against Supabase (`scripts/test_pg_tables.mjs` or pg_meta).
- [ ] Catalogue missing tables/columns in `docs/migration/schema-parity.md`.
- [ ] Draft SQL migrations to add/alter Supabase schema to match.

### 5. Observability & Access
- [ ] Configure Supabase logs & alerts (auth errors, RLS violations).
- [ ] Create admin dashboards for key tables (agencies, clients, staff).
- [ ] Provide runbooks for password reset, invitation resend, RBAC escalation.

## Deliverables
- Completed schema parity checklist for foundation entities (`agencies`, `profiles`, `staff`, `clients`).
- Updated RLS helper functions with tests/validation.
- Documented migration SQL for go-forward reference.
- `schema-parity.md` (diff results) linked from this phase file.

## Exit Criteria
- Login, sign-up, reset-password flows succeed for super admin & agency admin.
- Supabase schema matches Base44 for foundational tables.
- RLS policies enforce tenant isolation with verified test cases.
- Observability dashboards/runbooks published.







