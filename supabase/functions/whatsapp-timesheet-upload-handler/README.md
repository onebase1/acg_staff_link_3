# 📸 WhatsApp Timesheet Upload Handler

## Overview

This Edge Function handles timesheet image uploads from staff via WhatsApp. It provides a seamless way for staff to submit timesheets by simply sending a photo of their signed timesheet document.

---

## Features

✅ **Automatic Image Processing**
- Downloads images from WhatsApp Business Cloud API
- Uploads to Supabase Storage (`documents` bucket)
- Runs OCR extraction using OpenAI Vision API

✅ **Smart Timesheet Matching**
- Finds recent completed shifts for the staff member
- Matches timesheet to the most recent shift
- Creates or updates timesheet records

✅ **OCR Data Extraction**
- Extracts hours worked, break duration, signatures
- Validates against expected shift data
- Flags discrepancies for manual review

✅ **Instant Confirmation**
- Sends WhatsApp confirmation to staff
- Includes extracted hours and earnings
- Notifies if manual review is required

---

## Input Format

Expected from n8n WhatsApp receiver workflow:

```json
{
  "from": "+447557679989",
  "message_type": "image",
  "image_url": "https://lookaside.fbsbx.com/whatsapp_business/attachments/...",
  "image_id": "1234567890",
  "caption": "My timesheet for today",
  "profileName": "John Doe"
}
```

---

## Workflow

```
1. Staff sends timesheet photo via WhatsApp
   ↓
2. n8n receives message and calls this function
   ↓
3. Function downloads image from WhatsApp
   ↓
4. Image uploaded to Supabase Storage
   ↓
5. OCR extraction via extract-timesheet-data
   ↓
6. Find recent completed shift for staff
   ↓
7. Create/update timesheet record
   ↓
8. Update shift with timesheet_received flag
   ↓
9. Send WhatsApp confirmation to staff
```

---

## Response Examples

### Success Response
```json
{
  "success": true,
  "timesheet_id": "abc-123-def",
  "shift_id": "shift-456",
  "hours_worked": 12,
  "is_update": false,
  "requires_review": false
}
```

### Staff Not Found
```json
{
  "success": false,
  "error": "Staff not found"
}
```

### No Recent Shifts
```json
{
  "success": false,
  "error": "No recent shifts found"
}
```

---

## WhatsApp Confirmation Messages

### Successful Upload
```
✅ *Timesheet Submitted!*

📋 Shift: Divine Care Center
📅 Date: 2025-11-18
⏱️ Hours: 12h (30 min break)
💰 You'll earn: £264.00

Your timesheet is now awaiting client approval.

We'll notify you when it's approved!

_Thank you!_ 🎉
```

### Manual Review Required
```
✅ *Timesheet Submitted!*

📋 Shift: Divine Care Center
📅 Date: 2025-11-18
⏱️ Hours: 12h (30 min break)
💰 You'll earn: £264.00

⚠️ *Manual Review Required*
Some data couldn't be verified automatically. Your agency will review and confirm.

We'll notify you when it's approved!

_Thank you!_ 🎉
```

### No Recent Shifts
```
ℹ️ *No Recent Shifts Found*

We couldn't find any recent shifts needing a timesheet.

If you just completed a shift, please wait a few minutes and try again.

Or contact your agency if you believe this is an error.
```

---

## Integration with n8n

### n8n Workflow Setup

1. **WhatsApp Trigger Node** - Receives incoming messages
2. **Filter Node** - Check if `message.type === 'image'`
3. **HTTP Request Node** - Call this Edge Function
   - URL: `https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/whatsapp-timesheet-upload-handler`
   - Method: POST
   - Headers: `Authorization: Bearer [SUPABASE_ANON_KEY]`
   - Body:
     ```json
     {
       "from": "={{ $json.from }}",
       "message_type": "image",
       "image_url": "={{ $json.image.url }}",
       "image_id": "={{ $json.image.id }}",
       "caption": "={{ $json.image.caption }}",
       "profileName": "={{ $json.profile.name }}"
     }
     ```

---

## Database Updates

### Timesheets Table
- Creates new timesheet if none exists for the shift
- Updates existing timesheet with new document
- Sets `status` to `'submitted'`
- Adds document to `uploaded_documents` JSONB array
- Updates `total_hours`, `break_duration_minutes`
- Calculates `staff_pay_amount`, `client_charge_amount`

### Shifts Table
- Sets `timesheet_id` to link shift to timesheet
- Sets `timesheet_received` to `true`
- Sets `timesheet_received_at` to current timestamp

---

## Dependencies

- **Supabase Storage**: `documents` bucket must exist
- **Edge Function**: `extract-timesheet-data` for OCR
- **Edge Function**: `send-whatsapp` for confirmations
- **OpenAI API**: For OCR extraction (via extract-timesheet-data)

---

## Error Handling

| Error | Response | WhatsApp Message |
|-------|----------|------------------|
| Staff not found | 404 | "Staff Profile Not Found" |
| No recent shifts | 200 | "No Recent Shifts Found" |
| OCR failed | 200 | "OCR Processing Failed" + retry instructions |
| Upload failed | 500 | Error message |

---

## Testing

### Manual Test (curl)
```bash
curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/whatsapp-timesheet-upload-handler \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+447557679989",
    "message_type": "image",
    "image_url": "https://example.com/timesheet.jpg",
    "caption": "My timesheet",
    "profileName": "Test User"
  }'
```

---

## Deployment

```bash
supabase functions deploy whatsapp-timesheet-upload-handler
```

---

## Future Enhancements

- [ ] Support multiple image formats (PDF, PNG)
- [ ] Batch upload (multiple timesheets at once)
- [ ] Real-time validation feedback
- [ ] Integration with auto-approval engine
- [ ] Support for voice notes (hours dictation)

