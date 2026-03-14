# Directive: Urgent Broadcast Protocol

## Goal
Protect the "15-Minute Emergency Fill" guarantee.

## Critical Invariants
1. **Mandatory Bundling**: Never broadcast individual shifts if multiple are urgent. Use `smart-marketplace-digest` (Invoking `auto-urgent-digest-broadcaster`).
2. **Urgency Escalation**: Shifts marked `urgent` or `critical` MUST bypass the standard 24h wait and go straight to broadcast.
3. **Multi-Channel Sweep**: Ensure `whatsapp_enabled`, `sms_enabled`, and `email_enabled` are respected from agency settings.

## Tools
- `tests/multi-channel-broadcast.spec.js`: Run this to verify delivery pipelines.
