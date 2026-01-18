# Module 5: Quick Start - 75 Minutes to Clarity

**Goal:** Get immediate high-value insights into your codebase in just 75 minutes

**Strategy:** Run the 3 most impactful agents first, skip the rest for now

---

## 🎯 WHY THESE 3 TASKS?

**Problem:** You have 60+ edge functions and can't remember what they all do or which need automation.

**Solution:** These 3 tasks give you:
1. Complete list of all edge functions (know what you have)
2. Which ones are automated vs manual (find gaps)
3. Top 5 automations to implement immediately (quick wins)

**Time:** 75 minutes total
**Value:** Massive clarity + actionable automation list

---

## ⏱️ TASK 1: Edge Functions Inventory (30 minutes)

### What You'll Get:
- List of all 60+ edge functions
- What each one does
- Trigger type (Manual, Cron, Webhook, API)
- Last deployment date

### How to Run:

1. **Use Task Agent to scan edge functions:**

```prompt
Scan all edge function folders in supabase/functions/ and create a comprehensive inventory.

For each function folder, extract:
1. Function name (folder name)
2. Purpose (from comments in index.ts)
3. Trigger type: Manual, Cron, Webhook, API, or Database Trigger
4. Dependencies (calls to other functions via supabase.functions.invoke)
5. Last deployment date (if available from git or deployment logs)

Output format (JSON):
{
  "functions": [
    {
      "name": "send-email",
      "purpose": "Send emails via Resend API",
      "trigger_type": "Manual API",
      "dependencies": [],
      "last_deployed": "2025-12-16",
      "file_path": "supabase/functions/send-email/index.ts"
    },
    ...
  ],
  "total_count": 60,
  "by_trigger_type": {
    "Manual": 25,
    "Cron": 15,
    "Webhook": 10,
    "API": 10
  }
}

Save to: agent_missions/MODULE_5_CODEBASE_INTELLIGENCE/data/EDGE_FUNCTIONS_INVENTORY.json
```

### What to Look For:
- Functions with `-reminder`, `-engine`, `-automation` in name → Should be on cron
- Functions with `Manual` trigger type → Candidates for automation
- Functions you don't recognize → Forgotten features!

---

## ⏱️ TASK 2: Cron Jobs Audit (15 minutes)

### What You'll Get:
- List of all scheduled cron jobs
- Schedule (every 5 min, hourly, daily)
- Last execution time
- Success/failure status

### How to Run:

**Create and run this script:**

**File:** `c:\Users\gbase\AiAgency\ACG_BASE\agc_latest3\check-cron-jobs.mjs`

```javascript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzzxxkppkiasuouuglaf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SUPABASE_JWT_TOKEN';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function auditCronJobs() {
  console.log('🔍 Auditing pg_cron Jobs\n');

  // Note: This requires running SQL directly in Supabase Dashboard
  console.log('⚠️  Run this query in Supabase Dashboard → SQL Editor:\n');

  const query = `
-- Get all cron jobs
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active,
  database
FROM cron.job
ORDER BY jobname;

-- Get execution history (last 10 runs per job)
WITH recent_runs AS (
  SELECT
    jobid,
    runid,
    status,
    return_message,
    start_time,
    end_time,
    ROW_NUMBER() OVER (PARTITION BY jobid ORDER BY start_time DESC) as rn
  FROM cron.job_run_details
)
SELECT
  j.jobname,
  j.schedule,
  j.active,
  r.status,
  r.start_time,
  r.end_time,
  r.return_message
FROM cron.job j
LEFT JOIN recent_runs r ON j.jobid = r.jobid AND r.rn <= 5
ORDER BY j.jobname, r.start_time DESC;
  `;

  console.log(query);
  console.log('\n📋 Copy the results and save to:');
  console.log('agent_missions/MODULE_5_CODEBASE_INTELLIGENCE/data/CRON_JOBS_AUDIT.txt\n');
}

auditCronJobs();
```

**Run:**
```bash
node check-cron-jobs.mjs
```

**Then:** Copy query, run in Supabase Dashboard, save results.

### What to Look For:
- Jobs with `active=false` → Why disabled?
- Jobs with failed status → Need fixing
- Jobs not run in 7+ days → Inactive or broken?

---

## ⏱️ TASK 3: Missing Automations (30 minutes)

### What You'll Get:
- List of functions that should be scheduled but aren't
- Recommended cron schedules
- Top 5 to implement immediately

### How to Run:

**Use Task Agent to cross-reference:**

```prompt
Compare EDGE_FUNCTIONS_INVENTORY.json with the cron jobs audit results.

Find edge functions that:
1. Have automation-suggesting names: *-reminder, *-engine, *-monitor, *-automation, *-processor, *-notifier
2. Are NOT currently scheduled in cron jobs
3. Should be running automatically

For each missing automation:
- Function name
- Purpose
- Why it should be automated
- Recommended cron schedule (hourly, daily, weekly, etc.)
- Priority (High, Medium, Low)

Output format (JSON):
{
  "missing_automations": [
    {
      "function_name": "post-shift-feedback",
      "purpose": "Collect feedback after shift completion",
      "why_automate": "Should run automatically 24h after shift ends",
      "recommended_schedule": "0 * * * * (hourly to check for eligible shifts)",
      "priority": "High",
      "estimated_impact": "Increases feedback collection by 80%"
    },
    ...
  ],
  "total_missing": 15,
  "high_priority": 5,
  "quick_wins": [
    "Top 5 automations that would have biggest impact with least effort"
  ]
}

Save to: agent_missions/MODULE_5_CODEBASE_INTELLIGENCE/data/MISSING_AUTOMATIONS.json
```

### What to Look For:
- High priority + easy to implement → Do these first!
- Functions you forgot existed → Add to cron immediately
- Workflows that should be automatic → Big wins

---

## 📊 AFTER 75 MINUTES, YOU'LL HAVE:

1. ✅ **Complete edge function inventory** (60+ functions documented)
2. ✅ **Cron job health report** (what's automated, what's broken)
3. ✅ **Top 5 automations to implement** (actionable list)

**Estimated Value:**
- 5-10 new automations identified
- 2-3 broken cron jobs discovered
- 15-20 forgotten features rediscovered

---

## 🚀 IMMEDIATE NEXT STEPS

### Based on Results:

#### If you found 10+ missing automations:
**Action:** Implement top 5 this week
- Create cron jobs for highest priority
- Test each automation
- Monitor for failures

#### If you found broken cron jobs:
**Action:** Fix immediately
- Check edge function logs
- Fix the code issue
- Re-enable cron job

#### If you rediscovered forgotten features:
**Action:** Document in SuperAdmin
- Add to training materials
- Create shortcuts/bookmarks
- Schedule regular review

---

## 📋 OUTPUT FILES

After completing these 3 tasks, you'll have:

```
agent_missions/MODULE_5_CODEBASE_INTELLIGENCE/data/
├── EDGE_FUNCTIONS_INVENTORY.json (Complete function list)
├── CRON_JOBS_AUDIT.txt (Cron job health report)
└── MISSING_AUTOMATIONS.json (Top automation opportunities)
```

**Total Time:** 75 minutes
**Files Created:** 3
**Value:** Priceless clarity on your codebase

---

## 🎯 EXAMPLE OUTPUT (What You'll See)

### EDGE_FUNCTIONS_INVENTORY.json (Sample):
```json
{
  "functions": [
    {
      "name": "shift-reminder-engine",
      "purpose": "Send shift reminders 24h and 2h before shift",
      "trigger_type": "Cron",
      "schedule": "*/5 * * * * (every 5 minutes)",
      "last_deployed": "2025-11-16",
      "status": "✅ Automated"
    },
    {
      "name": "post-shift-feedback",
      "purpose": "Collect feedback after shift completion",
      "trigger_type": "Manual",
      "last_deployed": "2025-11-10",
      "status": "⚠️ Should be automated"
    },
    {
      "name": "send-email",
      "purpose": "Send emails via Resend API",
      "trigger_type": "API",
      "last_deployed": "2025-11-20",
      "status": "✅ Correctly manual (utility function)"
    }
  ],
  "total_count": 60,
  "automated_count": 15,
  "should_be_automated_count": 12,
  "manual_utilities_count": 33
}
```

### MISSING_AUTOMATIONS.json (Sample):
```json
{
  "missing_automations": [
    {
      "function_name": "post-shift-feedback",
      "priority": "High",
      "recommended_schedule": "0 * * * * (hourly)",
      "estimated_impact": "80% more feedback collected",
      "implementation_time": "10 minutes (just add cron job)"
    },
    {
      "function_name": "document-expiry-monitor",
      "priority": "High",
      "recommended_schedule": "0 0 * * * (daily at midnight)",
      "estimated_impact": "Prevent compliance violations",
      "implementation_time": "5 minutes"
    },
    {
      "function_name": "weekly-staff-digest",
      "priority": "Medium",
      "recommended_schedule": "0 0 * * 1 (weekly on Monday)",
      "estimated_impact": "Keep staff engaged",
      "implementation_time": "5 minutes"
    }
  ],
  "quick_wins": [
    "post-shift-feedback: Just add cron job, function already complete",
    "document-expiry-monitor: Already built, just needs scheduling",
    "weekly-staff-digest: 5-minute cron job setup"
  ]
}
```

---

## ✅ SUCCESS CRITERIA (After 75 Minutes)

- [X] I know exactly what functions I have (complete inventory)
- [X] I know what's automated vs manual (automation coverage)
- [X] I have a prioritized list of automations to implement
- [X] I rediscovered forgotten features
- [X] I identified broken cron jobs
- [X] I have actionable next steps

**If you achieve all 6:** You've gained more clarity in 75 minutes than most founders get in months.

---

## 🔄 OPTIONAL: Quick Implementation (Extra 30 Minutes)

**If you have extra time, implement the #1 missing automation:**

### Example: Add post-shift-feedback to cron

**File:** Run in Supabase Dashboard → SQL Editor

```sql
-- Add post-shift-feedback to cron (runs hourly)
SELECT cron.schedule(
  'post-shift-feedback-hourly',
  '0 * * * *',  -- Every hour
  $$
  SELECT net.http_post(
    url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/post-shift-feedback',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verify it was created
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'post-shift-feedback-hourly';
```

**Result:** One more process automated! 🎉

---

## 📞 NEXT STEPS AFTER QUICK START

**Option A:** Continue with full Module 5 (remaining phases)
- Get even deeper insights
- Build dashboard
- Automate everything

**Option B:** Implement top 5 automations from your findings
- Quick wins
- Immediate value

**Option C:** Proceed with Module 3 (Template Audit continuation)
- As originally planned

**Recommendation:** Do Option B first (implement top 5 automations from findings), then continue with other modules. This ensures you get immediate ROI from the intelligence work.

---

**Created:** 2025-12-16
**Time Required:** 75 minutes
**ROI:** Massive (complete codebase visibility)
**Next:** Implement findings or continue full audit
