# ROLLBACK PLAN: MODULE 44

## 🚨 EMERGENCY REVERT
If this module causes database locks or notification failures, follow these steps:

### 1. Database (Revert Schema)
If the migrations are run via Supabase UI, run the drop commands:
```sql
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.conversations;
```

### 2. N8N (Disable Inbound)
Disable the Meta/Twilio Webhook trigger in the n8n "Conversational Gateway" workflow.

### 3. Edge Functions
Revert the `conversational-router` edge function to a previous version or delete it if new.

## 📉 DATA INTEGRITY IMPACT
Reverting will remove inbound message history. Ensure that any `shifts` updated via the AI are manually verified if the logic is suspected to be faulty.
