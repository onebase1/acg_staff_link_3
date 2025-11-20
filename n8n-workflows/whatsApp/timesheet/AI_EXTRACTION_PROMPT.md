# AI Timesheet Extraction Prompt - Quick Reference

## Complete Prompt for OpenAI Vision API

```
Extract timesheet data from this image. Return ONLY valid JSON with this exact structure:

{
  "employee_number": "string",
  "employee_name": "string",
  "workplace": "string",
  "job_title": "string",
  "week_beginning": "YYYY-MM-DD or null",
  "shift_entries": [
    {
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "break_minutes": integer,
      "total_hours": decimal,
      "is_overnight": boolean
    }
  ],
  "weekly_total_hours": decimal,
  "employee_signature_present": boolean,
  "supervisor_signature_present": boolean
}

RULES:
- Round times to nearest 30 minutes (e.g., 20:15 → 20:00, 20:45 → 21:00)
- If end_time < start_time, it's overnight shift (is_overnight: true)
- Convert breaks to minutes: "1 hr" = 60, "30 min" = 30, "1.5 hr" = 90
- Calculate total_hours = (end - start - break) as decimal
- Use null for missing/unclear fields
- Return ONLY JSON, no explanations
```

## Field Mapping Guide

### From Timesheet → JSON Output

| Timesheet Field | JSON Field | Format | Example |
|----------------|------------|--------|---------|
| Employee Number / Staff ID | `employee_number` | String | "0426065951" |
| Employee Name / Staff Name | `employee_name` | String | "Theresa Atomi" |
| Place of Work / Site | `workplace` | String | "Hampton Manor" |
| Job Title / Role | `job_title` | String | "Care Assistant" |
| Week Beginning | `week_beginning` | YYYY-MM-DD | "2025-01-13" |
| Date column | `shift_entries[].date` | YYYY-MM-DD | "2025-01-13" |
| Start Time | `shift_entries[].start_time` | HH:MM | "20:00" |
| End Time | `shift_entries[].end_time` | HH:MM | "08:00" |
| Break | `shift_entries[].break_minutes` | Integer | 60 |
| Total Hours | `shift_entries[].total_hours` | Decimal | 11.0 |
| Weekly Total | `weekly_total_hours` | Decimal | 33.0 |
| Employee Signature | `employee_signature_present` | Boolean | true |
| Supervisor Signature | `supervisor_signature_present` | Boolean | true |

## Example Input/Output

### Input: Dominion Healthcare Timesheet

**Visible Data:**
- Employee: Theresa Atomi (0426065951)
- Workplace: Hampton Manor
- Job Title: Care Assistant
- Shifts:
  - 13/01/25: 20:00 - 08:00, 1 hr break, 11 hrs
  - 17/01/25: 20:00 - 08:00, 1 hr break, 11 hrs
  - 18/01/25: 20:00 - 08:00, 1 hr break, 11 hrs
- Weekly Total: 33 hours

### Expected Output:

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

## Common Extraction Scenarios

### Scenario 1: Day Shift (8am - 8pm)
```json
{
  "date": "2025-01-20",
  "start_time": "08:00",
  "end_time": "20:00",
  "break_minutes": 60,
  "total_hours": 11.0,
  "is_overnight": false
}
```

### Scenario 2: Night Shift (8pm - 8am)
```json
{
  "date": "2025-01-20",
  "start_time": "20:00",
  "end_time": "08:00",
  "break_minutes": 60,
  "total_hours": 11.0,
  "is_overnight": true
}
```

### Scenario 3: Split Shift (6am - 2pm)
```json
{
  "date": "2025-01-20",
  "start_time": "06:00",
  "end_time": "14:00",
  "break_minutes": 30,
  "total_hours": 7.5,
  "is_overnight": false
}
```

### Scenario 4: Long Shift (7am - 10pm)
```json
{
  "date": "2025-01-20",
  "start_time": "07:00",
  "end_time": "22:00",
  "break_minutes": 90,
  "total_hours": 13.5,
  "is_overnight": false
}
```

## Validation Checks (Post-Extraction)

After AI extraction, validate:

1. ✅ **Employee Identification**: Has employee_number OR employee_name
2. ✅ **Shift Entries**: At least 1 shift entry exists
3. ✅ **Required Fields**: Each shift has date, start_time, end_time
4. ✅ **Reasonable Hours**: 4 ≤ total_hours ≤ 16 per shift
5. ✅ **Date Format**: YYYY-MM-DD (ISO 8601)
6. ✅ **Time Format**: HH:MM (24-hour)
7. ✅ **Break Range**: 0 ≤ break_minutes ≤ 120
8. ✅ **Overnight Logic**: If end < start, is_overnight = true

## Error Handling

### If AI Returns Non-JSON

```javascript
// Extraction logic
const aiResponse = $json[0].content[0].text;
const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
const data = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
```

### If Field is Missing

```json
{
  "employee_number": null,  // ← Use null, not empty string
  "week_beginning": null,   // ← Acceptable for unclear dates
  "shift_entries": []       // ← Empty array if no shifts found
}
```

## Database Mapping (ACG StaffLink)

### Timesheets Table Update

```sql
UPDATE timesheets 
SET 
  actual_start_time = '{{ shift.start_time }}',           -- "20:00"
  actual_end_time = '{{ shift.end_time }}',               -- "08:00"
  break_duration_minutes = {{ shift.break_minutes }},     -- 60
  total_hours = {{ shift.total_hours }},                  -- 11.0
  timesheet_image_url = '{{ storage_url }}',              -- Supabase URL
  status = 'pending_approval',
  updated_date = NOW()
WHERE shift_id = '{{ matched_shift_id }}';
```

### Shifts Table Update

```sql
UPDATE shifts 
SET 
  status = 'awaiting_admin_closure',
  timesheet_received = true,
  timesheet_received_at = NOW(),
  updated_date = NOW()
WHERE id = '{{ shift_id }}' 
  AND date < CURRENT_DATE;  -- Only past shifts
```

## Testing Checklist

- [ ] Test with clear, high-quality image
- [ ] Test with blurry/low-quality image
- [ ] Test with handwritten timesheet
- [ ] Test with printed timesheet
- [ ] Test with multiple shifts (1, 3, 5, 7 days)
- [ ] Test with day shifts only
- [ ] Test with night shifts only
- [ ] Test with mixed day/night shifts
- [ ] Test with different break durations (30 min, 1 hr, 1.5 hr)
- [ ] Test with missing signatures
- [ ] Test with missing employee number
- [ ] Verify overnight detection (end < start)
- [ ] Verify time rounding (to nearest 30 min)
- [ ] Verify total hours calculation

