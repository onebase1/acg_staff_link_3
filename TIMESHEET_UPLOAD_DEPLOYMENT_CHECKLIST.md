# ✅ WhatsApp Timesheet Upload - Deployment Checklist

**Task:** Deploy WhatsApp Timesheet Upload Handler  
**Date:** 2025-11-18

---

## 📋 Pre-Deployment Checklist

### 1. Verify Prerequisites

- [ ] **Supabase Project** is accessible
- [ ] **Supabase CLI** is installed and authenticated
- [ ] **n8n Instance** is running at https://n8n.dreampathai.co.uk
- [ ] **WhatsApp Business Account** is configured
- [ ] **OpenAI API Key** is set in Supabase secrets
- [ ] **Supabase Storage** `documents` bucket exists

### 2. Verify Existing Functions

- [ ] `extract-timesheet-data` Edge Function is deployed
- [ ] `send-whatsapp` Edge Function is deployed
- [ ] `incoming-whatsapp-handler` Edge Function exists (will be updated)

### 3. Review Code

- [ ] Review `supabase/functions/whatsapp-timesheet-upload-handler/index.ts`
- [ ] Review updated `supabase/functions/incoming-whatsapp-handler/index.ts`
- [ ] Review `n8n-workflows/whatsapp-timesheet-upload-integration.json`

---

## 🚀 Deployment Steps

### Step 1: Deploy Edge Functions

```powershell
# Option A: Use automated script
.\deploy-timesheet-handler.ps1

# Option B: Manual deployment
supabase functions deploy whatsapp-timesheet-upload-handler
supabase functions deploy incoming-whatsapp-handler
```

**Verification:**
- [ ] Both functions appear in `supabase functions list`
- [ ] No deployment errors in console
- [ ] Functions show as "deployed" status

---

### Step 2: Configure Supabase Storage

**Check if `documents` bucket exists:**

```sql
-- Run in Supabase SQL Editor
SELECT * FROM storage.buckets WHERE id = 'documents';
```

**If bucket doesn't exist, create it:**

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `documents`
4. Public: `false` (private)
5. File size limit: `10MB`
6. Allowed MIME types: `image/jpeg, image/png, application/pdf`

**Verification:**
- [ ] `documents` bucket exists
- [ ] Bucket is private (not public)
- [ ] File size limit is set

---

### Step 3: Configure Storage RLS Policies

```sql
-- Allow staff to upload their own timesheets
CREATE POLICY "Staff can upload timesheets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'timesheets' AND
  (storage.foldername(name))[2] IN (
    SELECT id::text FROM staff WHERE user_id = auth.uid()
  )
);

-- Allow staff to read their own timesheets
CREATE POLICY "Staff can read their timesheets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'timesheets' AND
  (storage.foldername(name))[2] IN (
    SELECT id::text FROM staff WHERE user_id = auth.uid()
  )
);

-- Allow agency admins to read all timesheets in their agency
CREATE POLICY "Agency admins can read agency timesheets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'timesheets' AND
  (storage.foldername(name))[2] IN (
    SELECT id::text FROM staff WHERE agency_id = get_user_agency_id()
  )
);
```

**Verification:**
- [ ] All 3 RLS policies created successfully
- [ ] No SQL errors

---

### Step 4: Import n8n Workflow

1. Open n8n: https://n8n.dreampathai.co.uk
2. Click **"+"** → **"Import from File"**
3. Upload: `n8n-workflows/whatsapp-timesheet-upload-integration.json`
4. Configure credentials:
   - **Supabase Authorization** (HTTP Header Auth)
     - Header Name: `Authorization`
     - Header Value: `Bearer YOUR_SUPABASE_ANON_KEY`
5. Click **"Save"**
6. Click **"Activate"** to enable the workflow

**Verification:**
- [ ] Workflow imported successfully
- [ ] Credentials configured
- [ ] Workflow is active (toggle is ON)
- [ ] Webhook URL is visible

---

### Step 5: Configure WhatsApp Webhook (Optional)

**If using WhatsApp Business Cloud API directly:**

1. Go to Meta Business Manager → WhatsApp → Configuration
2. Set Webhook URL: `https://n8n.dreampathai.co.uk/webhook/whatsapp-incoming`
3. Set Verify Token: (your configured token)
4. Subscribe to: `messages`
5. Save configuration

**Verification:**
- [ ] Webhook URL configured
- [ ] Verify token set
- [ ] Subscribed to `messages` event

---

## 🧪 Testing Checklist

### Test 1: Manual API Test

```bash
curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/whatsapp-timesheet-upload-handler \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+447557679989",
    "message_type": "image",
    "image_url": "https://example.com/sample-timesheet.jpg",
    "caption": "Test timesheet",
    "profileName": "Test User"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "timesheet_id": "...",
  "shift_id": "...",
  "hours_worked": 12,
  "is_update": false,
  "requires_review": false
}
```

**Verification:**
- [ ] API returns 200 status
- [ ] Response includes `timesheet_id`
- [ ] No errors in response

---

### Test 2: End-to-End WhatsApp Test

1. **As a staff member**, send a photo of a timesheet to your agency's WhatsApp number
2. **Wait for confirmation message**

**Expected Results:**
- [ ] Image is received by n8n
- [ ] n8n routes to timesheet upload handler
- [ ] Image is uploaded to Supabase Storage
- [ ] OCR extraction runs
- [ ] Timesheet record created
- [ ] Shift updated with `timesheet_received = true`
- [ ] WhatsApp confirmation received

---

### Test 3: Database Verification

```sql
-- Check timesheet was created
SELECT * FROM timesheets 
WHERE staff_id = 'YOUR_STAFF_ID' 
ORDER BY created_date DESC 
LIMIT 1;

-- Check shift was updated
SELECT id, timesheet_id, timesheet_received, timesheet_received_at 
FROM shifts 
WHERE assigned_staff_id = 'YOUR_STAFF_ID' 
ORDER BY date DESC 
LIMIT 1;

-- Check uploaded document
SELECT 
  id,
  uploaded_documents,
  total_hours,
  break_duration_minutes,
  status
FROM timesheets 
WHERE id = 'YOUR_TIMESHEET_ID';

-- Check storage file
SELECT * FROM storage.objects 
WHERE bucket_id = 'documents' 
AND name LIKE 'timesheets/%'
ORDER BY created_at DESC 
LIMIT 1;
```

**Verification:**
- [ ] Timesheet record exists
- [ ] `uploaded_documents` contains image metadata
- [ ] Shift has `timesheet_id` set
- [ ] Shift has `timesheet_received = true`
- [ ] Storage object exists in `documents` bucket

---

### Test 4: Error Handling Tests

**Test 4a: Staff Not Found**
- [ ] Send image from unknown phone number
- [ ] Verify error message received

**Test 4b: No Recent Shifts**
- [ ] Send image from staff with no recent shifts
- [ ] Verify "No Recent Shifts Found" message

**Test 4c: Invalid Image**
- [ ] Send corrupted or invalid image
- [ ] Verify OCR error handling

---

## 📊 Monitoring Checklist

### Check Edge Function Logs

```bash
# View timesheet upload handler logs
supabase functions logs whatsapp-timesheet-upload-handler --tail

# View incoming handler logs
supabase functions logs incoming-whatsapp-handler --tail
```

**Look for:**
- [ ] `📸 [Timesheet Upload] From: ...` - Message received
- [ ] `✅ [Timesheet Upload] Staff found: ...` - Staff identified
- [ ] `✅ [Timesheet Upload] Image downloaded` - Image retrieved
- [ ] `✅ [Timesheet Upload] File uploaded: ...` - Storage upload success
- [ ] `📊 [Timesheet Upload] OCR Result: ...` - OCR extraction complete
- [ ] `✅ [Timesheet Upload] Timesheet created: ...` - Database update success

---

## ✅ Post-Deployment Checklist

- [ ] All Edge Functions deployed successfully
- [ ] n8n workflow imported and active
- [ ] Storage bucket and RLS policies configured
- [ ] Manual API test passed
- [ ] End-to-end WhatsApp test passed
- [ ] Database verification passed
- [ ] Error handling tests passed
- [ ] Logs show successful processing
- [ ] Documentation reviewed
- [ ] Team notified of new feature

---

## 🎉 Success Criteria

**Deployment is successful when:**

✅ Staff can send timesheet image via WhatsApp  
✅ Image is uploaded to Supabase Storage  
✅ OCR extraction runs automatically  
✅ Timesheet record is created/updated  
✅ Shift is linked to timesheet  
✅ Staff receives WhatsApp confirmation  
✅ No errors in Edge Function logs  
✅ Admin can view timesheet in portal  

---

## 📞 Support

**If issues occur:**

1. Check Edge Function logs
2. Verify Supabase Storage permissions
3. Test OCR function independently
4. Review n8n workflow execution logs
5. Check WhatsApp webhook configuration

**Documentation:**
- `TIMESHEET_UPLOAD_HANDLER_IMPLEMENTATION.md`
- `TIMESHEET_UPLOAD_FLOW_DIAGRAM.md`
- `supabase/functions/whatsapp-timesheet-upload-handler/README.md`

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Verified By:** _____________  
**Status:** ⬜ Pending | ⬜ In Progress | ⬜ Complete

