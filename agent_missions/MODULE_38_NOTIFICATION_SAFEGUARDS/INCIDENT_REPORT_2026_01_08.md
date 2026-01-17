# Incident Report: Notification Loop (Jan 8th, 2026)

## 🎯 Incident Summary
At approximately 04:00 AM (local time), a notification loop was detected affecting the `notification-digest-engine`. Admins and staff received duplicate emails every 5 minutes for several hours.

## 🔍 Technical Root Cause: The "provider_message_id" Failure
The issue was caused by a **Metadata Desynchronization**.

1. **The Intent**: We introduced `provider_message_id` to the `notification-digest-engine` to track Resend's delivery IDs for better auditing.
2. **The Gap**: The code was deployed to Supabase Edge Functions *before* the corresponding SQL migration was run to add the `provider_message_id` column to the `notification_queue` table.
3. **The Failure Mechanism**: 
   - The engine ran successfully and **sent the email** via Resend.
   - The engine then tried to run `UPDATE notification_queue SET status='sent', provider_message_id='...'`.
   - Postgres rejected the query with a "column does not exist" error.
   - The engine logged the error but **did not mark the record as sent**.
   - The 5-minute cron saw a `pending` record and re-sent it. Repeat.

## 🛡️ Reputation Impact
This "destroyed our reputation" for several hours because:
- **Spamming Patterns**: Sending identical emails every 5 minutes is a primary signal for email providers (Gmail, Outlook) to flag our domain as spam.
- **Trust Erosion**: Admins (`director@...`) and staff saw the system as unstable / broken.
- **Notification Fatigue**: Genuine notifications were buried under the noise.

## 🚀 Strategy for Future (Safeguards)
As requested, we have parked this plan in **MODULE_38**.

### Proposed Safeguards
- **Circuit Breaker**: A max-retry limit (3 attempts) before a notification is automatically quarantined.
- **Volume Alerting**: Instead of "blocking" emails (which risks blocking genuine high-volume days), we will implement **System Alerts** that notify admins when a specific recipient receives > X emails/hour.

## 🏁 Conclusion
The loop is dead. The code is hardened. The database schema is now synced. The plan for automated safeguards is archived for future execution.
