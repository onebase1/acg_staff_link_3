# Weekly Summary Hours Calculation Strategy

## Goal
Help clients catch billing discrepancies BEFORE monthly invoice is generated.

---

## Data Sources

### For PAST Shifts (Last Week - Worked)
**Source of Truth:** `shifts` table + `timesheets` table

**SQL Query:**
```sql
SELECT 
  s.date,
  s.role_required,
  s.start_time as scheduled_start,
  s.end_time as scheduled_end,
  
  -- ACTUAL hours from timesheet
  t.actual_start_time,
  t.actual_end_time,
  
  -- Calculate ACTUAL hours worked
  CASE 
    WHEN t.actual_start_time IS NOT NULL AND t.actual_end_time IS NOT NULL THEN
      EXTRACT(EPOCH FROM (t.actual_end_time - t.actual_start_time)) / 3600
    ELSE NULL
  END as actual_hours,
  
  -- Fallback to scheduled if no timesheet
  EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600 as scheduled_hours,
  
  -- Status tracking
  t.id as timesheet_id,
  s.status as shift_status,
  t.status as timesheet_status
  
FROM shifts s
LEFT JOIN timesheets t ON t.shift_id = s.id
WHERE s.client_id = ?
  AND s.date >= (CURRENT_DATE - INTERVAL '7 days')
  AND s.date < CURRENT_DATE
  AND s.status NOT IN ('cancelled', 'client_rejected')
ORDER BY s.date, s.start_time, s.role_required;
```

---

## Hours Logic (INTELLIGENT)

### Scenario 1: Timesheet Submitted ✅
- **Use:** `actual_start_time` - `actual_end_time`
- **Display:** Actual hours (e.g., "11.5h" if staff arrived late)
- **Include in Total:** YES

### Scenario 2: Timesheet Pending ⏳
- **Use:** NULL (don't assume)
- **Display:** "Pending" badge
- **Include in Total:** NO (show separately)
- **Alert:** Flag in email for client to follow up

### Scenario 3: Shift Cancelled ❌
- **Use:** N/A
- **Display:** Don't show in email at all
- **Include in Total:** NO

---

## Email Display Strategy

### Table Format (Day/Night as COLUMNS)

```
Date       | Role                | Day Staff | Day Hours | Night Staff | Night Hours
-----------|---------------------|-----------|-----------|-------------|------------
Mon 15 Dec | Healthcare Asst     | 3         | 36h       | 2           | 24h
           | Registered Nurse    | 2         | 24h       | 1           | 12h
Tue 16 Dec | Healthcare Asst     | 3         | 35.5h*    | 2           | Pending
           | Registered Nurse    | 2         | 24h       | 1           | 12h
...

* Staff arrived 30 min late
```

**Benefits:**
- ✅ 50% fewer rows (Day/Night on same row)
- ✅ Easier to scan
- ✅ "Pending" stands out immediately
- ✅ Actual vs scheduled hours visible

---

## Totals Section

### Last Week (Worked)
```
┌─────────────────────────────────────────────┐
│ Total Staff Worked: 32                       │
│ Total Hours Confirmed: 380h                  │
│ Pending Timesheets: 4 shifts (24h estimated)│
│ Completion: 88%                              │
└─────────────────────────────────────────────┘
```

**Calculation:**
- `Total Staff Worked` = COUNT(DISTINCT shifts with timesheets)
- `Total Hours Confirmed` = SUM(actual_hours WHERE timesheet_id IS NOT NULL)
- `Pending Timesheets` = COUNT(shifts WHERE timesheet_id IS NULL)
- `Completion` = (Confirmed / Total) * 100

---

## Alert Logic

### If Pending Timesheets > 0
Show warning box:
```
⚠️ ATTENTION REQUIRED
4 timesheets are still pending from last week.
These shifts will not appear on your invoice until timesheets are submitted.
Please contact staff or the agency to complete timesheets.
```

### If Actual Hours ≠ Scheduled Hours
Show informational note:
```
ℹ️ HOURS ADJUSTED
Some actual hours differ from scheduled (marked with *).
This is normal for late arrivals/early departures.
Your invoice will reflect actual hours worked.
```

---

## SQL for Aggregation

### Group by Date + Role + Shift Type (Day/Night)
```sql
WITH shift_hours AS (
  SELECT 
    s.date,
    s.role_required,
    CASE 
      WHEN EXTRACT(HOUR FROM s.start_time::time) < 12 THEN 'Day'
      ELSE 'Night'
    END as shift_type,
    
    -- Count staff
    COUNT(*) as staff_count,
    
    -- Sum ACTUAL hours (only confirmed timesheets)
    SUM(
      CASE 
        WHEN t.actual_start_time IS NOT NULL AND t.actual_end_time IS NOT NULL THEN
          EXTRACT(EPOCH FROM (t.actual_end_time - t.actual_start_time)) / 3600
        ELSE NULL
      END
    ) as confirmed_hours,
    
    -- Count pending
    COUNT(CASE WHEN t.id IS NULL THEN 1 END) as pending_count,
    
    -- Estimated hours for pending (fallback)
    SUM(
      CASE 
        WHEN t.id IS NULL THEN
          EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600
        ELSE 0
      END
    ) as pending_hours_estimate
    
  FROM shifts s
  LEFT JOIN timesheets t ON t.shift_id = s.id
  WHERE s.client_id = ?
    AND s.date >= (CURRENT_DATE - INTERVAL '7 days')
    AND s.date < CURRENT_DATE
    AND s.status NOT IN ('cancelled', 'client_rejected')
  GROUP BY s.date, s.role_required, shift_type
  ORDER BY s.date, s.role_required, shift_type
)
SELECT 
  date,
  role_required,
  MAX(CASE WHEN shift_type = 'Day' THEN staff_count END) as day_staff,
  MAX(CASE WHEN shift_type = 'Day' THEN confirmed_hours END) as day_hours,
  MAX(CASE WHEN shift_type = 'Day' THEN pending_count END) as day_pending,
  MAX(CASE WHEN shift_type = 'Night' THEN staff_count END) as night_staff,
  MAX(CASE WHEN shift_type = 'Night' THEN confirmed_hours END) as night_hours,
  MAX(CASE WHEN shift_type = 'Night' THEN pending_count END) as night_pending
FROM shift_hours
GROUP BY date, role_required
ORDER BY date, role_required;
```

---

## For FUTURE Shifts (This Week - Scheduled)

**Source:** `shifts` table only (no timesheets yet)

**Logic:**
- Use `scheduled` start/end times
- Show estimated hours
- Label clearly: "Estimated Hours"

**SQL:**
```sql
SELECT 
  s.date,
  s.role_required,
  CASE 
    WHEN EXTRACT(HOUR FROM s.start_time::time) < 12 THEN 'Day'
    ELSE 'Night'
  END as shift_type,
  COUNT(*) as staff_count,
  SUM(EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600) as estimated_hours
FROM shifts s
WHERE s.client_id = ?
  AND s.date >= CURRENT_DATE
  AND s.date < (CURRENT_DATE + INTERVAL '7 days')
  AND s.status IN ('confirmed', 'in_progress')
GROUP BY s.date, s.role_required, shift_type
ORDER BY s.date, s.role_required, shift_type;
```

---

## Benefits of This Approach

### For Client
- ✅ See ACTUAL billed hours (not estimates)
- ✅ Immediately spot missing timesheets
- ✅ Catch discrepancies early (before invoice)
- ✅ Understand late arrivals/early departures
- ✅ Clear distinction: Confirmed vs Pending vs Estimated

### For Agency
- ✅ Reduces billing disputes
- ✅ Encourages timely timesheet submission
- ✅ Transparent billing (builds trust)
- ✅ Automated - no manual hours tracking

### For System
- ✅ Single source of truth (timesheets.actual_* fields)
- ✅ Matches invoice generation logic
- ✅ No data duplication
- ✅ Audit trail maintained

---

## Edge Cases Handled

### Case 1: Staff worked longer than scheduled
- **Example:** Scheduled 12h, actual 13.5h (stayed for handover)
- **Display:** "13.5h" (show actual)
- **Note:** Client pays for actual time

### Case 2: Staff left early
- **Example:** Scheduled 12h, actual 10h (emergency)
- **Display:** "10h*" (mark with asterisk)
- **Note:** Explain in email footer

### Case 3: Multiple staff same role/time
- **Example:** 3 HCA Day shifts, 2 timesheets pending
- **Display:** "3 staff | 24h + Pending (2)"
- **Breakdown:** Shows confirmed + pending separately

### Case 4: Shift completed but no timesheet after 48h
- **Email trigger:** Special reminder
- **Display:** "⚠️ Overdue" instead of "Pending"
- **Action:** Auto-escalation to agency

---

## Implementation Checklist

- [ ] Update weekly summary SQL to use `actual_start_time/actual_end_time`
- [ ] Add LEFT JOIN to timesheets table
- [ ] Implement pending timesheet counter
- [ ] Add "Pending" badge to email template
- [ ] Add warning box for missing timesheets
- [ ] Update totals to show staff count + hours
- [ ] Implement Day/Night column layout
- [ ] Test with real data (completed + pending shifts)
- [ ] Verify hours match invoice generation logic

---

## Future Enhancement: Timesheet Reminder

If weekly summary shows pending timesheets, auto-send reminders:
```
Subject: Timesheet Reminder - Week of Dec 15-21

Dear [Staff Name],

Your weekly summary shows 2 pending timesheets:
- Mon 15 Dec - HCA Night (12h)
- Tue 16 Dec - HCA Day (12h)

Please submit timesheets within 48h to ensure timely payment.

[Submit Timesheet Button]
```

**Trigger:** If pending_count > 0 AND shift.date < (CURRENT_DATE - 2 days)
