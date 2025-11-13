# Phase 4 – Communications & Automation Services

## Scope
- Replace Base44 function suite with Supabase Edge Functions for messaging, reminders, LLM helpers, bulk processing.
- Ensure every outbound channel (email, SMS, WhatsApp) and webhook respects tenant boundaries.
- Centralise configuration for third-party providers (Resend, Twilio, OpenAI).

## Prerequisites
- Phase 1–3 signed off.
- Secrets stored in Supabase config / environment vaults.
- Deployment pipeline for Supabase Edge Functions in place.

## Workstreams & Steps

### 1. Function Inventory & Prioritisation
- [ ] Catalogue Base44 cloud functions and their triggers.
- [ ] Define Supabase replacements with input/output contracts.
- [ ] Identify cron/scheduled tasks vs event-driven hooks.

### 2. Edge Function Implementation
- [ ] Create function scaffolds (`send-email`, `auto-invoice-generator`, etc.).
- [ ] Add shared utility module for auth checks, logging, tenant scoping.
- [ ] Implement retries, idempotency keys, and structured logging.
- [ ] Deploy via `supabase functions deploy` with environment-specific configs.

### 3. Messaging Channels
- [ ] Validate Resend integration (from addresses, templates, sandbox vs production).
- [ ] Confirm Twilio SMS & WhatsApp numbers, messaging service IDs, throttling rules.
- [ ] Implement opt-out / compliance handling.
- [ ] Add monitoring dashboards for delivery success/failure.

### 4. Automation Workflows
- [ ] Port Base44 automations (shift reminders, invoice generation, timesheet nudges).
- [ ] Integrate with Supabase cron for scheduled runs.
- [ ] Log outcomes to `notification_queue` / `change_logs`.
- [ ] Expose manual trigger endpoints for super admin overrides.

### 5. Security & Observability
- [ ] Enforce JWT validation and RBAC checks inside every function.
- [ ] Capture structured logs to Supabase log drains / external SIEM.
- [ ] Configure alerting on error rates, latency spikes.
- [ ] Document secret rotation procedures.

## Deliverables
- Edge function code with deployment scripts.
- Provider configuration guide (`docs/migration/integrations.md`).
- Monitoring/alerting dashboards (Grafana, Supabase logs).
- Playwright/API tests covering key communication flows.

## Exit Criteria
- All messaging and automation routines run via Supabase Edge Functions.
- Tenant-specific notifications respect agency scoping.
- Operators have dashboards & runbooks for troubleshooting failures.
- No remaining references to Base44 cloud functions.






