# MISSION: IMPLEMENT NOTIFICATION SAFEGUARDS (AUT-38)

## Context
A Jan 8th incident caused a notification loop due to a schema mismatch and silent database update failure in the `notification-digest-engine`. Single emails were sent repeatedly every 5 minutes because the status update failed.

## Task
1. **Circuit Breaker**: Add a `processing_attempts` column (integer, default 0) to `notification_queue`.
2. **Backoff Logic**: Update `notification-digest-engine` to increment `processing_attempts` on every run attempt.
3. **Quarantine**: If `processing_attempts > 3`, the engine must mark the record as `failed` with error "CIRCUIT_BREAKER: Max retries exceeded".
4. **Volume Alerting**: Implement a threshold check: if any recipient receives > 10 emails of the same type in 1 hour, log a critical warning to a new `system_alerts` table.

## Files
- `supabase/functions/notification-digest-engine/index.ts` - Main implementation of safeguards.
- `supabase/migrations/xxxx_add_notification_safeguards.sql` - Database changes for attempts and alerts.

## Acceptance Criteria
- [ ] No notification can be processed more than 3 times without status change.
- [ ] Records that hit 3 attempts are automatically moved out of `pending`.
- [ ] System alerts are generated when volume thresholds are breached.
- [ ] Tests pass for "silent update failure" simulation.

## Reference
- Post-Mortem: `agent_missions/MODULE_38_NOTIFICATION_SAFEGUARDS/INCIDENT_REPORT_2026_01_08.md`
- Original Incident: [Walkthrough](file:///c:/Users/gbase/.gemini/antigravity/brain/4e6f9c45-94e5-498e-a937-87710b2dd29d/walkthrough.md)

## Rollback Plan
1. Delete column: `ALTER TABLE notification_queue DROP COLUMN processing_attempts;`
2. Revert code: `git checkout HEAD~1 -- supabase/functions/notification-digest-engine/index.ts`
3. Redeploy: `supabase functions deploy notification-digest-engine`

## Estimated Effort
- **Hours:** 4
- **Complexity:** Medium
- **Risk:** Medium (Risk of blocking genuine emails if thresholds are too low).
