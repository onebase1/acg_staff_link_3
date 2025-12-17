# MODULE 7: WEEKLY AVAILABILITY REMINDER

## 🎯 MISSION OBJECTIVE
Send weekly email reminders to all active staff to update their availability for the upcoming week.

---

## 📊 CONTEXT

### Why This Matters
- Staff availability powers the auto-assignment system (MODULE 6)
- Stale availability = bad auto-assignments = admin workload
- Weekly reminder ensures availability is always current

### Current State
| Component | Status |
|-----------|--------|
| MyAvailability page | ✅ `/my-availability` - Staff can set availability |
| Availability stored | ✅ `staff.availability` JSONB column |
| Weekly reminder | ❌ Does NOT exist |

---

## 🎯 DESIRED END STATE

```
Every Sunday 6pm (before work week):
  → Email sent to all active staff
  → "Update your availability for next week"
  → Direct link to /my-availability
  → Shows current availability summary
  → One-click "I'm available same as last week" option
```

---

## 📋 TASKS

### Task 1: Create Edge Function (2-3 hours)
- [ ] Create `supabase/functions/availability-reminder-engine/index.ts`
- [ ] Query all active staff
- [ ] Filter: only send if availability not updated in last 7 days
- [ ] Send email via `send-email` edge function
- [ ] Template: Show current availability, link to update

### Task 2: Setup Cron Job (30 min)
- [ ] Add pg_cron schedule: `0 18 * * 0` (Sunday 6pm)
- [ ] Call edge function

### Task 3: Track Last Updated (1 hour)
- [ ] Add `availability_updated_at` column to staff table
- [ ] Update this when staff saves availability
- [ ] Use in reminder logic (skip if updated recently)

---

## 📧 EMAIL TEMPLATE

**Subject:** 📅 Update your availability for next week

**Body:**
```
Hi {first_name},

Please update your availability for next week so we can match you with shifts!

Your current availability:
✅ Monday: Day, Night
✅ Tuesday: Day
❌ Wednesday: Not available
✅ Thursday: Night
...

[Update Availability] → links to /my-availability

If nothing changed, you're all set!

Best,
{agency_name}
```

---

## 🔧 IMPLEMENTATION REFERENCE

### Existing Email Function
```javascript
await supabase.functions.invoke('send-email', {
  body: {
    to: staff.email,
    subject: '📅 Update your availability',
    html: emailHtml,
    agency_id: staff.agency_id
  }
});
```

### Staff Availability Schema
```json
{
  "monday": ["day", "night"],
  "tuesday": ["day"],
  "wednesday": [],
  ...
}
```

### Cron Setup SQL
```sql
SELECT cron.schedule(
  'weekly-availability-reminder',
  '0 18 * * 0',  -- Sunday 6pm
  $$SELECT net.http_post(
    'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/availability-reminder-engine',
    '{}',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  )$$
);
```

---

## 🧪 TESTING CHECKLIST

- [ ] Edge function deployed successfully
- [ ] Manual trigger sends emails
- [ ] Email contains correct availability data
- [ ] Link to /my-availability works
- [ ] Cron job scheduled (verify in `cron.job` table)
- [ ] Staff who updated recently are skipped

