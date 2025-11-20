# Timesheet Extraction Validation Checklist

## ✅ Dominion Healthcare Timesheet - Validation Results

### Image Analysis Output (From Your Test)

```
The image shows a time sheet from Dominion Healthcare Services Ltd. It includes:

- **Employer Name:** Theresa Atomi
- **Employer Number:** 0426065951
- **Title:** (Unspecified, possibly related to the job)
- **Week Beginning:** (Date not specified)
- **Job Title:** Care Assistant
- **Workplace:** Hampton Manor

The time sheet records shifts for several dates in January 2025, detailing:

- **Dates of Work:** 13th, 17th, and 18th January
- **Start and End Times:** Starting at 20:00 and ending at 08:00 (next day)
- **Breaks:** 1 hour each
- **Total Hours Worked:** 33 hours for the week

There are spaces for employee and supervisor signatures, along with contact information for the company.
```

### ✅ Accuracy Check

| Field | Extracted | Correct? | Notes |
|-------|-----------|----------|-------|
| Employee Name | Theresa Atomi | ✅ | Correct |
| Employee Number | 0426065951 | ✅ | Correct (NOT "Employer Number") |
| Job Title | Care Assistant | ✅ | Correct |
| Workplace | Hampton Manor | ✅ | Correct |
| Shift Dates | 13, 17, 18 Jan 2025 | ✅ | Correct |
| Start Time | 20:00 | ✅ | Correct |
| End Time | 08:00 | ✅ | Correct (next day) |
| Break Duration | 1 hour | ✅ | Correct (60 minutes) |
| Total Hours per Shift | 11 hours | ✅ | Correct (12 - 1 break) |
| Weekly Total | 33 hours | ✅ | Correct (3 × 11) |
| Week Beginning | Not specified | ⚠️ | Should infer from first date |

### 🔧 Corrections Needed

1. **"Employer Number" → "Employee Number"**
   - This is the staff member's ID, not employer's
   - Database field: `staff.employee_number`

2. **Week Beginning**
   - Should infer: "2025-01-13" (Monday of that week)
   - Or use first shift date if week start unclear

3. **Overnight Flag**
   - Should detect: `is_overnight: true` (20:00 → 08:00)
   - Critical for correct datetime calculation

## 📊 Expected JSON Output (Corrected)

```json
{
  "employee_number": "0426065951",
  "employee_name": "Theresa Atomi",
  "workplace": "Hampton Manor",
  "job_title": "Care Assistant",
  "week_beginning": "2025-01-13",
  "shift_entries": [
    {
      "date": "2025-01-13",
      "start_time": "20:00",
      "end_time": "08:00",
      "break_minutes": 60,
      "total_hours": 11.0,
      "is_overnight": true
    },
    {
      "date": "2025-01-17",
      "start_time": "20:00",
      "end_time": "08:00",
      "break_minutes": 60,
      "total_hours": 11.0,
      "is_overnight": true
    },
    {
      "date": "2025-01-18",
      "start_time": "20:00",
      "end_time": "08:00",
      "break_minutes": 60,
      "total_hours": 11.0,
      "is_overnight": true
    }
  ],
  "weekly_total_hours": 33.0,
  "employee_signature_present": true,
  "supervisor_signature_present": true
}
```

## 🗄️ Database Updates Required

### For Each Shift Entry

#### 1. Find Matching Shift Record

```sql
SELECT id, shift_id 
FROM shifts 
WHERE assigned_staff_id = (
  SELECT id FROM staff WHERE employee_number = '0426065951'
)
AND date = '2025-01-13'
LIMIT 1;
```

#### 2. Update Timesheet Record

```sql
UPDATE timesheets 
SET 
  actual_start_time = '20:00',                    -- TEXT format
  actual_end_time = '08:00',                      -- TEXT format
  break_duration_minutes = 60,                    -- NUMERIC
  total_hours = 11.0,                             -- NUMERIC
  timesheet_image_url = 'https://...',            -- Supabase storage URL
  status = 'pending_approval',                    -- TEXT
  updated_date = NOW()                            -- TIMESTAMPTZ
WHERE shift_id = '{{ matched_shift_id }}';
```

#### 3. Update Shift Status

```sql
UPDATE shifts 
SET 
  status = 'awaiting_admin_closure',              -- Only if date < today
  timesheet_received = true,                      -- BOOLEAN
  timesheet_received_at = NOW(),                  -- TIMESTAMPTZ
  updated_date = NOW()                            -- TIMESTAMPTZ
WHERE id = '{{ shift_id }}'
  AND date < CURRENT_DATE;                        -- Critical: only past shifts
```

## 🎯 Field-by-Field Mapping

### Staff Identification

| Timesheet | JSON Field | Database Query | Database Column |
|-----------|------------|----------------|-----------------|
| 0426065951 | `employee_number` | `WHERE employee_number = '0426065951'` | `staff.employee_number` |
| Theresa Atomi | `employee_name` | `OR full_name ILIKE '%Theresa Atomi%'` | `staff.full_name` |

### Shift Data (Per Entry)

| Timesheet | JSON Field | Database Column | Data Type |
|-----------|------------|-----------------|-----------|
| 13/01/25 | `shift_entries[0].date` | `timesheets.shift_date` | DATE |
| 20:00 | `shift_entries[0].start_time` | `timesheets.actual_start_time` | TEXT |
| 08:00 | `shift_entries[0].end_time` | `timesheets.actual_end_time` | TEXT |
| 1 hr | `shift_entries[0].break_minutes` | `timesheets.break_duration_minutes` | NUMERIC |
| 11 | `shift_entries[0].total_hours` | `timesheets.total_hours` | NUMERIC |
| (calculated) | `shift_entries[0].is_overnight` | (not stored, used for datetime calc) | - |

### Metadata

| Timesheet | JSON Field | Database Column | Data Type |
|-----------|------------|-----------------|-----------|
| Image file | (uploaded) | `timesheets.timesheet_image_url` | TEXT |
| - | (auto-set) | `timesheets.status` | TEXT ('pending_approval') |
| - | (auto-set) | `shifts.timesheet_received` | BOOLEAN (true) |
| - | NOW() | `shifts.timesheet_received_at` | TIMESTAMPTZ |

## 🔍 Validation Checklist (Before Database Update)

### Pre-Flight Checks

- [ ] **Staff Exists**: Query returns 1 record from `staff` table
- [ ] **Shift Exists**: Query returns 1 record from `shifts` table for each date
- [ ] **Shift Assigned**: `shifts.assigned_staff_id` matches found staff ID
- [ ] **Shift Not Locked**: `shifts.financial_locked = false`
- [ ] **Timesheet Not Locked**: `timesheets.financial_locked_at IS NULL`

### Data Quality Checks

- [ ] **Hours Reasonable**: 4 ≤ total_hours ≤ 16 per shift
- [ ] **Break Reasonable**: 0 ≤ break_minutes ≤ 120
- [ ] **Date Valid**: Date is in past (not future)
- [ ] **Time Format**: HH:MM (24-hour)
- [ ] **Overnight Logic**: If end < start, is_overnight = true

### Business Logic Checks

- [ ] **No Duplicate**: No existing timesheet with same shift_id and status='approved'
- [ ] **Shift Status**: Current status allows timesheet submission
- [ ] **Agency Match**: Staff and shift belong to same agency_id

## ⚠️ Edge Cases to Handle

### Case 1: Multiple Shifts Same Day
```json
// If staff worked 2 shifts on same date
{
  "shift_entries": [
    {
      "date": "2025-01-13",
      "start_time": "08:00",
      "end_time": "14:00",
      "break_minutes": 30,
      "total_hours": 5.5,
      "is_overnight": false
    },
    {
      "date": "2025-01-13",
      "start_time": "20:00",
      "end_time": "08:00",
      "break_minutes": 60,
      "total_hours": 11.0,
      "is_overnight": true
    }
  ]
}
```
**Solution**: Match by date + start_time, not just date

### Case 2: Week Spanning Month Boundary
```json
{
  "week_beginning": "2025-01-27",
  "shift_entries": [
    { "date": "2025-01-27", ... },
    { "date": "2025-01-31", ... },
    { "date": "2025-02-01", ... },
    { "date": "2025-02-02", ... }
  ]
}
```
**Solution**: Process each shift independently, don't assume same month

### Case 3: Handwritten Times (Unclear)
```
Start: 20:15 (handwritten, unclear if 20:15 or 20:45)
```
**Solution**: Round to nearest 30 minutes → 20:00 or 20:30

## 📈 Success Metrics

After processing 100 timesheets, measure:

- **Extraction Accuracy**: % of fields correctly extracted
- **Auto-Match Rate**: % of shifts auto-matched to database
- **Error Rate**: % requiring manual intervention
- **Time Saved**: Minutes saved vs manual entry

**Target**: 95%+ accuracy, 90%+ auto-match rate

