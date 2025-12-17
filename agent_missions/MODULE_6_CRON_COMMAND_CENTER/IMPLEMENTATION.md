# MODULE 6: Implementation Guide

**For Agent Execution - Follow Step by Step**

---

## PHASE 1: Audit & Classify (1 hour)

### Step 1.1: Scan Edge Functions
```bash
# List all Edge Function folders
ls supabase/functions/
```

### Step 1.2: For Each Function, Determine Type

**Read each function's `index.ts` and classify:**

| Type | Criteria | Scheduling |
|------|----------|------------|
| **Cron** | Processes batches, reminders, monitors | ✅ Schedule it |
| **API** | Called by frontend on demand | ❌ No cron |
| **Webhook** | Receives external callbacks (Twilio, Stripe) | ❌ No cron |
| **Event** | Triggered by database changes | ❌ No cron |

### Step 1.3: Create Classification JSON

Save to: `agent_missions/MODULE_6_CRON_COMMAND_CENTER/EDGE_FUNCTIONS_CLASSIFICATION.json`

```json
{
  "total_functions": 64,
  "classification": {
    "cron_scheduled_existing": ["shift-reminder-engine", "..."],
    "cron_needs_scheduling": [
      {
        "name": "auto-invoice-generator",
        "recommended_schedule": "0 0 * * 0",
        "description": "Weekly invoice generation",
        "priority": "high"
      }
    ],
    "api_manual": ["send-email", "send-sms", "..."],
    "webhook": ["incoming-sms-handler", "..."],
    "event_driven": ["..."]
  }
}
```

---

## PHASE 2: Create Cron Jobs (2 hours)

### Step 2.1: Create Migration File

**File:** `supabase/migrations/20251217_cron_jobs_expansion.sql`

```sql
-- ============================================================================
-- CRON JOBS EXPANSION - Phase 2
-- Created: 2025-12-17
-- Purpose: Schedule remaining automation functions
-- ============================================================================

-- FINANCIAL AUTOMATION
SELECT cron.schedule(
    'auto-invoice-generator-weekly',
    '0 0 * * 0',  -- Every Sunday at midnight
    $$
    SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/auto-invoice-generator',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer YOUR_SERVICE_KEY'
        ),
        body := '{}'::jsonb
    );
    $$
);

SELECT cron.schedule(
    'payment-reminder-engine-daily',
    '0 9 * * *',  -- Daily at 9am
    $$
    SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/payment-reminder-engine',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer YOUR_SERVICE_KEY'
        ),
        body := '{}'::jsonb
    );
    $$
);

-- SHIFT AUTOMATION
SELECT cron.schedule(
    'no-show-detection-engine-hourly',
    '30 * * * *',  -- Every hour at :30
    $$
    SELECT net.http_post(
        url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/no-show-detection-engine',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer YOUR_SERVICE_KEY'
        ),
        body := '{}'::jsonb
    );
    $$
);

-- Add remaining jobs following same pattern...
```

### Step 2.2: Apply Migration
```bash
supabase db push
```

---

## PHASE 3: Build Command Center UI (2-3 hours)

### Step 3.1: Create Page Component

**File:** `src/pages/CronCommandCenter.jsx`

See FILES_AFFECTED.md for component template.

### Step 3.2: Add Route

**File:** `src/App.jsx` - Add to routes:
```jsx
<Route path="/admin/cron-command-center" element={<CronCommandCenter />} />
```

### Step 3.3: Add Navigation

**File:** `src/pages/Layout.jsx` - Add to SuperAdmin menu

---

## ✅ COMPLETION CHECKLIST

- [ ] Phase 1: Classification JSON created
- [ ] Phase 2: Migration file created and applied
- [ ] Phase 3: UI page created and routed
- [ ] Tested: Can view all cron jobs
- [ ] Tested: Can toggle job status
- [ ] Tested: Can manually trigger job
- [ ] Update PROGRESS.md to 100%

