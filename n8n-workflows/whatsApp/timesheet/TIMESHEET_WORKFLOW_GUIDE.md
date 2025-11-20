# ACG StaffLink - Timesheet Processing Workflow Guide

## Overview
This n8n workflow automates timesheet processing via WhatsApp. Staff upload timesheet images, AI extracts the data, validates it, and updates the Supabase database automatically.

## Workflow Flow

```
WhatsApp Upload → Download Image → AI Analysis → Validation → Database Lookup → 
Supabase Storage → Update Timesheet → Update Shift → Confirmation Message
```

## Required Fields Extracted from Timesheet

Based on ACG StaffLink database schema, the workflow extracts:

### Staff Identification
- `employee_number` - Staff member's employee ID
- `employee_name` - Full name of staff member
- `workplace` - Care home/facility name
- `job_title` - Role (e.g., "Care Assistant")

### Shift Details (Per Entry)
- `date` - Shift date (YYYY-MM-DD)
- `start_time` - Shift start time (HH:MM, 24-hour format)
- `end_time` - Shift end time (HH:MM, 24-hour format)
- `break_minutes` - Break duration in minutes (integer)
- `total_hours` - Calculated hours worked (decimal)
- `is_overnight` - Boolean flag for night shifts

### Metadata
- `weekly_total_hours` - Sum of all shift hours
- `employee_signature_present` - Boolean
- `supervisor_signature_present` - Boolean

## Database Updates

### 1. Timesheets Table
Updates existing timesheet records with:
- `actual_start_time` - Extracted start time (TEXT: "HH:MM")
- `actual_end_time` - Extracted end time (TEXT: "HH:MM")
- `break_duration_minutes` - Break duration (NUMERIC)
- `total_hours` - Calculated hours (NUMERIC)
- `timesheet_image_url` - Supabase storage URL (TEXT)
- `status` - Set to 'pending_approval' (TEXT)
- `updated_date` - Current timestamp (TIMESTAMPTZ)

### 2. Shifts Table
Updates shift status for past-dated shifts:
- `status` - Changed to 'awaiting_admin_closure'
- `timesheet_received` - Set to TRUE
- `timesheet_received_at` - Current timestamp
- `updated_date` - Current timestamp

**Important**: Only shifts where `date < CURRENT_DATE` transition to 'awaiting_admin_closure'

## AI Extraction Prompt

The workflow uses GPT-4o with this prompt:

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
- Round times to nearest 30 minutes
- If end_time < start_time, it's overnight (is_overnight: true)
- Convert breaks to minutes (1 hr = 60, 30 min = 30)
- Calculate total_hours = (end - start - break)
- Use null for missing fields
```

## Example Extraction

For the Dominion Healthcare timesheet shown:

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

## Validation Rules

The workflow validates:

1. **Staff Identification**: Must have employee_number OR employee_name
2. **Shift Entries**: At least one shift entry required
3. **Required Fields**: Each shift must have date, start_time, end_time
4. **Reasonable Hours**: Total hours between 4-16 per shift
5. **Database Match**: Staff member must exist in database
6. **Shift Match**: Shift record must exist for the date

## Setup Instructions

### 1. Environment Variables Required

Add to your n8n environment:

```bash
FACEBOOK_ACCESS_TOKEN=your_whatsapp_business_token
SUPABASE_URL=https://rzzxxkppkiasuouuglaf.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

### 2. Supabase Storage Setup

Create a storage bucket for timesheets:

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('timesheets', 'timesheets', true);

-- Set RLS policy
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'timesheets');
```

### 3. n8n Node Configuration

#### WhatsApp Trigger Node
- **Updates**: Select "messages"
- **Webhook ID**: Auto-generated
- **Credentials**: WhatsApp OAuth account

#### OpenAI Image Analysis Node
- **Model**: gpt-4o (or gpt-4o-mini for cost savings)
- **Input Type**: base64
- **Detail**: high (for better OCR accuracy)
- **Credentials**: OpenAI API account

#### Postgres Nodes (for Supabase)
- **Host**: db.rzzxxkppkiasuouuglaf.supabase.co
- **Port**: 5432
- **Database**: postgres
- **User**: postgres
- **Password**: Your Supabase database password
- **SSL**: Require

#### Supabase Storage Node
- **Bucket**: timesheets
- **Operation**: upload
- **Upsert**: true (overwrites if exists)

### 4. Testing with Spreadsheet First

Before connecting to Supabase, test with Google Sheets:

1. Replace Postgres nodes with Google Sheets nodes
2. Create test sheet with columns:
   - employee_number
   - employee_name
   - shift_date
   - start_time
   - end_time
   - break_minutes
   - total_hours
   - status

3. Test extraction accuracy with sample timesheets
4. Verify JSON output format
5. Once validated, switch to Supabase

## Error Handling

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Staff member not found" | Employee number/name doesn't match database | Check staff table, verify employee_number field |
| "No shift entries found" | AI couldn't extract shift data | Improve image quality, check timesheet format |
| "Unusual hours" | Total hours < 4 or > 16 | Verify break calculation, check overnight logic |
| "No matching shift found" | Shift record doesn't exist for date | Create shift record first, or adjust date matching |
| "Failed to parse AI response" | AI returned non-JSON | Check AI prompt, verify model supports structured output |

## Workflow Outputs

### Success Response (WhatsApp)
```
✅ Timesheet received!

📋 Shifts processed: 3
📅 Dates: 2025-01-13, 2025-01-17, 2025-01-18
⏰ Total hours: 33

Your timesheet is now pending admin approval.
```

### Error Response (WhatsApp)
```
❌ Timesheet validation failed:

Missing employee identification
Shift 2: Unusual hours (18.5)

Please check your timesheet and try again.
```

## Database Query Examples

### Check Timesheet Status
```sql
SELECT
  t.id,
  s.full_name as staff_name,
  t.shift_date,
  t.actual_start_time,
  t.actual_end_time,
  t.total_hours,
  t.status,
  t.timesheet_image_url
FROM timesheets t
JOIN staff s ON t.staff_id = s.id
WHERE t.status = 'pending_approval'
ORDER BY t.shift_date DESC;
```

### Find Shifts Awaiting Closure
```sql
SELECT
  sh.id,
  sh.date,
  s.full_name as staff_name,
  c.name as client_name,
  sh.status,
  sh.timesheet_received
FROM shifts sh
JOIN staff s ON sh.assigned_staff_id = s.id
JOIN clients c ON sh.client_id = c.id
WHERE sh.status = 'awaiting_admin_closure'
  AND sh.date < CURRENT_DATE
ORDER BY sh.date ASC;
```

## Performance Optimization

### For High Volume (100+ timesheets/day)

1. **Batch Processing**: Group multiple shifts per staff member
2. **Caching**: Cache staff lookups to reduce database queries
3. **Async Updates**: Use Supabase Edge Functions for parallel updates
4. **Image Compression**: Compress images before storage (reduce costs)
5. **Model Selection**: Use gpt-4o-mini for 60% cost reduction

### Cost Estimates

- **GPT-4o**: ~$0.01 per timesheet image
- **GPT-4o-mini**: ~$0.004 per timesheet image
- **Supabase Storage**: ~$0.021/GB/month
- **WhatsApp Messages**: Free (Cloud API)

For 500 timesheets/month:
- GPT-4o: $5/month
- GPT-4o-mini: $2/month
- Storage (50MB avg): $0.001/month

**Total**: ~$2-5/month

## Next Steps

1. ✅ Import workflow JSON into n8n
2. ✅ Configure credentials (WhatsApp, OpenAI, Supabase)
3. ✅ Test with sample timesheet image
4. ✅ Verify database updates
5. ✅ Deploy to production
6. ✅ Monitor error rates and accuracy

## Support & Troubleshooting

- Check n8n execution logs for detailed error messages
- Verify Supabase RLS policies allow service role access
- Test AI extraction separately before full workflow
- Use n8n's "Execute Node" feature to debug individual steps

## Related Documentation

- [ACG StaffLink Database Schema](../../../Complete%20Database%20Schema%20Reference.txt)
- [Shift Management Guide](../../../SHIFT_MANAGEMENT_COMPREHENSIVE_ANALYSIS.md)
- [WhatsApp Integration](../../../docs/WHATSAPP_INTEGRATION.md)


