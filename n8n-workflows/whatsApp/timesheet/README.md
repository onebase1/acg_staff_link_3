# ACG StaffLink - WhatsApp Timesheet Automation

## 📋 Overview

Automated timesheet processing via WhatsApp using n8n, OpenAI Vision API, and Supabase. Staff upload timesheet images, AI extracts data, validates it, and updates the database automatically.

## 🎯 What This Solves

**Problem**: Manual timesheet data entry is time-consuming and error-prone.

**Solution**: Staff send timesheet photo via WhatsApp → AI extracts all data → Database auto-updates → Staff gets confirmation.

**Time Saved**: ~5 minutes per timesheet → 500 timesheets/month = **40+ hours saved**

## 📁 Files in This Directory

| File | Purpose |
|------|---------|
| `Timesheet_Processing_Workflow.json` | **Production workflow** - Full Supabase integration |
| `Timesheet_Test_Workflow_GoogleSheets.json` | **Test workflow** - Google Sheets for testing |
| `TIMESHEET_WORKFLOW_GUIDE.md` | Complete setup and configuration guide |
| `AI_EXTRACTION_PROMPT.md` | AI prompt reference and examples |
| `README.md` | This file - quick start guide |

## 🚀 Quick Start

### 1. Test First (Google Sheets)

**Why**: Validate AI extraction accuracy before touching production database.

```bash
# Import test workflow
1. Open n8n
2. Import: Timesheet_Test_Workflow_GoogleSheets.json
3. Create Google Sheet with these columns:
   - employee_number, employee_name, workplace, job_title
   - shift_date, start_time, end_time, break_minutes
   - total_hours, is_overnight, extracted_at
4. Configure credentials (WhatsApp, OpenAI, Google Sheets)
5. Send test timesheet image via WhatsApp
6. Verify data in Google Sheets
```

### 2. Deploy Production (Supabase)

**After** testing is successful:

```bash
# Import production workflow
1. Import: Timesheet_Processing_Workflow.json
2. Configure credentials (WhatsApp, OpenAI, Supabase)
3. Set environment variables (see below)
4. Create Supabase storage bucket
5. Test with real shift data
6. Activate workflow
```

## 🔑 Required Credentials

### Environment Variables

```bash
# WhatsApp Business Cloud API
FACEBOOK_ACCESS_TOKEN=your_whatsapp_token

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Supabase
SUPABASE_URL=https://rzzxxkppkiasuouuglaf.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### n8n Credentials to Configure

1. **WhatsApp OAuth account** (for trigger)
2. **WhatsApp API account** (for sending messages)
3. **OpenAI API account** (for image analysis)
4. **Postgres account** (for Supabase database)
5. **Supabase account** (for storage)

## 📊 Data Flow

```
┌─────────────────┐
│ Staff sends     │
│ timesheet photo │
│ via WhatsApp    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Download image  │
│ from WhatsApp   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AI extracts:    │
│ • Employee info │
│ • Shift dates   │
│ • Times & breaks│
│ • Total hours   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate data:  │
│ • Staff exists? │
│ • Hours valid?  │
│ • Shift exists? │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Upload image to │
│ Supabase storage│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update database:│
│ • Timesheets    │
│ • Shifts status │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send WhatsApp   │
│ confirmation    │
└─────────────────┘
```

## 📝 Extracted Fields

### From Timesheet Image → Database

| Timesheet Field | Database Column | Table |
|----------------|-----------------|-------|
| Employee Number | `staff.employee_number` | staff |
| Employee Name | `staff.full_name` | staff |
| Shift Date | `timesheets.shift_date` | timesheets |
| Start Time | `timesheets.actual_start_time` | timesheets |
| End Time | `timesheets.actual_end_time` | timesheets |
| Break Duration | `timesheets.break_duration_minutes` | timesheets |
| Total Hours | `timesheets.total_hours` | timesheets |
| Image | `timesheets.timesheet_image_url` | timesheets |
| Status | `shifts.status` → 'awaiting_admin_closure' | shifts |

## ✅ Validation Rules

The workflow validates:

1. ✅ Staff member exists in database
2. ✅ Shift record exists for the date
3. ✅ Hours are reasonable (4-16 per shift)
4. ✅ All required fields present
5. ✅ Date format is valid (YYYY-MM-DD)
6. ✅ Time format is valid (HH:MM)

## 💰 Cost Estimate

For **500 timesheets/month**:

| Service | Cost |
|---------|------|
| OpenAI GPT-4o-mini | $2/month |
| Supabase Storage | $0.001/month |
| WhatsApp Messages | Free |
| **Total** | **~$2/month** |

## 🧪 Testing Checklist

Before production deployment:

- [ ] Test with clear timesheet image
- [ ] Test with blurry image
- [ ] Test with handwritten timesheet
- [ ] Test with multiple shifts (3-7 days)
- [ ] Test with day shifts
- [ ] Test with night shifts (overnight)
- [ ] Test with different break durations
- [ ] Verify database updates correctly
- [ ] Verify WhatsApp confirmation sent
- [ ] Test error handling (invalid data)
- [ ] Test with non-existent staff member
- [ ] Test with future-dated shifts

## 📚 Documentation

- **[TIMESHEET_WORKFLOW_GUIDE.md](./TIMESHEET_WORKFLOW_GUIDE.md)** - Complete setup guide
- **[AI_EXTRACTION_PROMPT.md](./AI_EXTRACTION_PROMPT.md)** - AI prompt reference
- **[Database Schema](../../../Complete%20Database%20Schema%20Reference.txt)** - Full schema

## 🐛 Troubleshooting

### Common Issues

**"Staff member not found"**
- Check employee_number matches database
- Verify staff record exists in `staff` table

**"No matching shift found"**
- Ensure shift record exists for the date
- Check shift is assigned to correct staff member

**"Failed to parse AI response"**
- Verify OpenAI API key is valid
- Check image quality (not too blurry)
- Try with gpt-4o instead of gpt-4o-mini

**"Unusual hours detected"**
- Verify break calculation is correct
- Check overnight shift logic (is_overnight flag)

## 🔄 Next Steps

1. ✅ Test with Google Sheets workflow
2. ✅ Validate AI extraction accuracy
3. ✅ Deploy production workflow
4. ✅ Monitor for 1 week
5. ✅ Optimize based on error rates
6. ✅ Add advanced features (OCR confidence, interactive confirmations)

## 📞 Support

For issues or questions:
1. Check n8n execution logs
2. Review [TIMESHEET_WORKFLOW_GUIDE.md](./TIMESHEET_WORKFLOW_GUIDE.md)
3. Test individual nodes using "Execute Node"
4. Verify Supabase RLS policies

