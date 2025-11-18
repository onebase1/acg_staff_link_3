# Scheduling Automated Edge Functions

This document provides the necessary commands to schedule the automated edge functions that run on a timer (cron).

## 1. Daily Client Digest ("Ready for Tomorrow" Email)

This function sends a daily summary email to clients with their confirmed shifts for the next day.

- **Function to Schedule:** `daily-client-digest`
- **Recommended Schedule:** Once per day at 10:00 AM.
- **Cron Expression:** `0 10 * * *`

### Supabase CLI Command

Use the following command to deploy and schedule the function. Run this command from the root of your project directory.

```bash
supabase functions deploy daily-client-digest --schedule "0 10 * * *"
```

---

## 2. Shift Status Automation

This function automatically updates shift statuses (e.g., starts shifts, moves them to awaiting closure) and sends the "Shifts Awaiting Closure" admin digest.

- **Function to Schedule:** `shift-status-automation`
- **Recommended Schedule:** Every 15 minutes.
- **Cron Expression:** `*/15 * * * *`

### Supabase CLI Command

```bash
supabase functions deploy shift-status-automation --schedule "*/15 * * * *"
```

## 3. Post-Shift Feedback Engine

This function sends a "How did we do?" feedback and gratitude email to clients 24-48 hours after a shift has been completed.

- **Function to Schedule:** `post-shift-feedback`
- **Recommended Schedule:** Once per day at 11:00 AM.
- **Cron Expression:** `0 11 * * *`

### Supabase CLI Command

```bash
supabase functions deploy post-shift-feedback --schedule "0 11 * * *"
```

---
### Important Notes:

- **Run from Project Root:** Ensure you are in the `C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3` directory when running these commands.
- **Supabase CLI:** You must have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and be logged in (`supabase login`).
- **One-Time Setup:** This is a one-time setup. Once the function is deployed with the `--schedule` flag, Supabase will automatically invoke it based on the cron expression.
