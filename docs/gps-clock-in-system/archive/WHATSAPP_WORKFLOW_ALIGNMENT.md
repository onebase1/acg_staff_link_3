# 📋 WhatsApp Timesheet Upload - Complete Workflow Alignment

**Date:** 2025-11-18  
**Status:** ⏸️ AWAITING APPROVAL - Do Not Deploy Until Aligned

---

## 🎯 Your Request

> "Don't start building until we align on your full workflow steps. Tell me exactly how your new WhatsApp workflow will work, include how it will be triggered, how it will merge with current process, and guardrails to ensure right shift and when it will be sent out (e.g., after a shift completes)."

---

## ✅ STEP-BY-STEP WORKFLOW (Complete Flow)

### **PHASE 1: Shift Lifecycle (EXISTING - UNCHANGED)**

**Step 1: Shift Created**
- Status: `OPEN`
- Admin creates shift in system

**Step 2: Staff Assigned**
- Status: `ASSIGNED`
- Admin assigns staff OR staff accepts from marketplace

**Step 3: Staff Confirms**
- Status: `CONFIRMED`
- Staff confirms via portal OR admin bypass
- **Trigger:** `auto-timesheet-creator` creates draft timesheet

**Step 4: Shift Starts (AUTOMATED)**
- Status: `IN_PROGRESS`
- **Trigger:** `shift-status-automation` runs every 5 min
- **Condition:** Current time >= shift start time

**Step 5: Shift Ends (AUTOMATED)**
- Status: `AWAITING_ADMIN_CLOSURE`
- **Trigger:** `shift-status-automation` runs every 5 min
- **Condition:** Current time >= shift end time
- **Creates:** AdminWorkflow for verification
- **Sends:** Timesheet reminder (WhatsApp + Email)

**Step 6: Admin Verifies**
- Status: `COMPLETED` (or `CANCELLED`, `NO_SHOW`, `DISPUTED`)
- Admin reviews timesheet and marks final status

---

### **PHASE 2: Timesheet Reminder Sent (EXISTING - UNCHANGED)**

**Trigger:** When shift status changes to `awaiting_admin_closure`

**What Happens:**
```
shift-status-automation runs
   ↓
Status: in_progress → awaiting_admin_closure
   ↓
post-shift-timesheet-reminder Edge Function runs
   ↓
Sends WhatsApp message:
"📋 Please submit your timesheet for today's shift at [CLIENT_NAME]..."
   ↓
Sends Email with portal link
   ↓
Updates: timesheet_reminder_sent = true
```

**File:** `supabase/functions/post-shift-timesheet-reminder/index.ts`

**Message Template (EXISTING):**
```
📋 TIMESHEET REMINDER

Hi [STAFF_NAME],

Please submit your timesheet for:
📅 [DATE]
🏥 [CLIENT_NAME]

Upload via:
1. Staff Portal: https://agilecaremanagement.netlify.app/staff
2. Reply to this message with a photo (NEW)

Thank you!
```

---

### **PHASE 3: Staff Submits Timesheet (3 OPTIONS)**

**Option A: Portal Upload (EXISTING - UNCHANGED)**
```
Staff logs into portal
   ↓
Goes to /timesheets
   ↓
Drag-and-drop uploads image
   ↓
File uploaded to Supabase Storage (documents bucket)
   ↓
OCR extraction (extract-timesheet-data)
   ↓
Validation (intelligent-timesheet-validator)
   ↓
If confidence ≥80% → Auto-approve
   ↓
If confidence <80% → Manual review
```

**File:** `src/pages/TimesheetDetail.jsx`

---

**Option B: GPS Clock-Out (EXISTING - UNCHANGED)**
```
Staff clocks out with GPS
   ↓
GPS validated (within geofence)
   ↓
Auto-creates timesheet with GPS data
   ↓
Validation (intelligent-timesheet-validator)
   ↓
If GPS validated → Auto-approve
```

**File:** `src/components/staff/MobileClockIn.jsx`

---

**Option C: WhatsApp Upload (NEW - ADDITIVE)**
```
Staff sends photo via WhatsApp
   ↓
WhatsApp Business API → n8n webhook
   ↓
n8n detects image message
   ↓
Calls whatsapp-timesheet-upload-handler Edge Function
   ↓
GUARDRAIL 1: Find staff by phone number
   ↓ (If not found → "Staff Profile Not Found" message)
GUARDRAIL 2: Find recent shift (status = awaiting_admin_closure, within 7 days)
   ↓ (If not found → "No Recent Shifts Found" message)
GUARDRAIL 3: Download image from WhatsApp
   ↓
GUARDRAIL 4: Upload to Supabase Storage (SAME documents bucket)
   ↓
OCR extraction (SAME extract-timesheet-data function)
   ↓
Validation (SAME intelligent-timesheet-validator function)
   ↓
Creates/updates timesheet (SAME timesheets table)
   ↓
Updates shift.timesheet_received = true
   ↓
Sends WhatsApp confirmation:
"✅ Timesheet Submitted! Hours: [X]h, You'll earn: £[Y]"
```

**File:** `supabase/functions/whatsapp-timesheet-upload-handler/index.ts` (NEW)

---

## 🛡️ GUARDRAILS (WhatsApp Upload Only)

### **Guardrail 1: Staff Verification**

**Check:** Staff exists in database and matched by phone number

**Code:**
```typescript
const { data: staff } = await supabase
  .from("staff")
  .select("*")
  .or(`phone.eq.${normalizedPhone},whatsapp_number_verified.eq.${normalizedPhone}`)
  .single();

if (!staff) {
  return sendWhatsAppError("Staff Profile Not Found");
}
```

**Error Message:**
```
❌ Staff Profile Not Found

We couldn't find your profile in our system. Please contact your agency admin.
```

---

### **Guardrail 2: Shift Validation**

**Check:** Recent shift exists with correct status and within time window

**Code:**
```typescript
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const { data: recentShifts } = await supabase
  .from("shifts")
  .select("*, client:clients(*)")
  .eq("assigned_staff_id", staff.id)
  .in("status", ["awaiting_admin_closure", "completed"])
  .gte("date", sevenDaysAgo.toISOString().split('T')[0])
  .order("date", { ascending: false })
  .limit(1);

if (!recentShifts || recentShifts.length === 0) {
  return sendWhatsAppError("No Recent Shifts Found");
}
```

**Conditions:**
- ✅ Shift assigned to this staff member
- ✅ Shift status = `awaiting_admin_closure` OR `completed`
- ✅ Shift date within last 7 days
- ✅ Most recent shift selected

**Error Message:**
```
❌ No Recent Shifts Found

We couldn't find any recent shifts that need a timesheet. 

Timesheets can only be submitted:
- After shift ends (status: awaiting closure)
- Within 7 days of shift date

Please contact your agency if you believe this is an error.
```

---

### **Guardrail 3: Image Download**

**Check:** Image successfully downloaded from WhatsApp

**Code:**
```typescript
const imageResponse = await fetch(imageUrl, {
  headers: {
    'Authorization': `Bearer ${whatsappAccessToken}`
  }
});

if (!imageResponse.ok) {
  return sendWhatsAppError("Failed to Download Image");
}
```

**Error Message:**
```
❌ Failed to Download Image

We couldn't download your timesheet image. Please try again or upload via the Staff Portal.
```

---

### **Guardrail 4: OCR Validation**

**Check:** OCR extraction successful and confidence score acceptable

**Code:**
```typescript
const { data: ocrResult } = await supabase.functions.invoke('extract-timesheet-data', {
  body: {
    file_url: storageUrl,
    expected_staff_name: `${staff.first_name} ${staff.last_name}`,
    expected_client_name: targetShift.client?.name,
    expected_date: targetShift.date,
    expected_hours: targetShift.total_hours
  }
});

if (ocrResult.status === 'failed') {
  return sendWhatsAppError("OCR Processing Failed");
}
```

**Confidence Thresholds:**
- ✅ ≥80% → Auto-approve
- ⚠️ 60-79% → Manual review (AdminWorkflow created)
- ❌ <60% → Manual review required

**Error Message (if OCR fails):**
```
⚠️ OCR Processing Failed

We couldn't read your timesheet clearly. Please:
1. Ensure the image is clear and well-lit
2. All text is readable
3. Try uploading via Staff Portal instead

Or contact your agency for assistance.
```

---

## 📊 How It Merges With Current Process

### **Shared Components (No Changes):**

| Component | Portal | WhatsApp | GPS | Status |
|-----------|--------|----------|-----|--------|
| **Supabase Storage** | ✅ `documents` | ✅ `documents` | N/A | ✅ Same |
| **OCR Function** | ✅ `extract-timesheet-data` | ✅ `extract-timesheet-data` | N/A | ✅ Same |
| **Validation** | ✅ `intelligent-timesheet-validator` | ✅ `intelligent-timesheet-validator` | ✅ `intelligent-timesheet-validator` | ✅ Same |
| **Database Table** | ✅ `timesheets` | ✅ `timesheets` | ✅ `timesheets` | ✅ Same |
| **Confidence Threshold** | ✅ ≥80% | ✅ ≥80% | ✅ GPS validated | ✅ Same |

**Result:** WhatsApp uses the EXACT SAME backend pipeline as portal upload.

---

### **Trigger Points:**

**Portal Upload:**
- ✅ Staff can upload anytime after shift assigned
- ✅ Can upload multiple documents
- ✅ Can upload before, during, or after shift

**WhatsApp Upload:**
- ✅ Only after shift ends (status = `awaiting_admin_closure`)
- ✅ Only within 7 days of shift date
- ✅ Only for staff's own shifts (matched by phone)
- ✅ Finds most recent completed shift

**GPS Clock-Out:**
- ✅ Only during shift (geofence validation)
- ✅ Requires GPS location within client premises
- ✅ Auto-creates timesheet on clock-out

---

## 🎯 When WhatsApp Reminder Sent

### **Trigger:** Shift status changes to `awaiting_admin_closure`

**Automated Transition:**
```
Shift end time reached (e.g., 8:00 PM)
   ↓ (5 minutes later)
shift-status-automation runs (8:05 PM)
   ↓
Status: in_progress → awaiting_admin_closure
   ↓
post-shift-timesheet-reminder runs
   ↓
Sends WhatsApp: "📋 Please submit your timesheet..."
   ↓
Sends Email with portal link
   ↓
Updates: timesheet_reminder_sent = true
```

**File:** `supabase/functions/shift-status-automation/index.ts` (lines 148-204)

---

### **Manual Transition (Admin Override):**

Admin can manually mark shift as `awaiting_admin_closure` anytime:
```
Admin opens ShiftCompletionModal
   ↓
Clicks "Mark as Awaiting Closure"
   ↓
Status: [any] → awaiting_admin_closure
   ↓
post-shift-timesheet-reminder runs
   ↓
Sends WhatsApp + Email
```

---

## ✅ Final Workflow Summary

### **Complete Flow (End-to-End):**

```
1. Shift Created (OPEN)
   ↓
2. Staff Assigned (ASSIGNED)
   ↓
3. Staff Confirms (CONFIRMED)
   ↓ (Automated: shift-status-automation)
4. Shift Starts (IN_PROGRESS)
   ↓ (Automated: shift-status-automation)
5. Shift Ends (AWAITING_ADMIN_CLOSURE)
   ↓ (Automated: post-shift-timesheet-reminder)
6. WhatsApp Reminder Sent: "📋 Please submit your timesheet..."
   ↓
7. Staff Chooses Upload Method:
   ├─ Option A: Portal Upload (EXISTING)
   ├─ Option B: GPS Clock-Out (EXISTING)
   └─ Option C: WhatsApp Upload (NEW)
   ↓
8. OCR Extraction (SAME for all methods)
   ↓
9. Validation (SAME for all methods)
   ↓
10. If confidence ≥80% → Auto-approve
    If confidence <80% → Manual review
   ↓
11. Admin Reviews (if needed)
   ↓
12. Shift Marked as COMPLETED
```

---

## 🚀 Deployment Checklist (When Approved)

### **Step 1: Deploy Edge Functions**
```bash
supabase functions deploy whatsapp-timesheet-upload-handler
supabase functions deploy incoming-whatsapp-handler
```

### **Step 2: Create Meta Template**
- Template Name: `timesheetconfirmation`
- Category: Utility
- Language: English (UK)
- Variables: 6 (staff_name, client_name, date, hours, break_minutes, pay_amount)

### **Step 3: Import n8n Workflow**
- Import `whatsapp-timesheet-upload-integration.json`
- Configure Supabase credentials
- Activate workflow

### **Step 4: Test End-to-End**
1. Create test shift
2. Mark as `awaiting_admin_closure`
3. Send timesheet photo via WhatsApp
4. Verify OCR extraction
5. Verify WhatsApp confirmation

---

## ✅ Approval Required

**Before deployment, please confirm:**

- ✅ Workflow steps are correct
- ✅ Guardrails are sufficient
- ✅ Trigger points are appropriate
- ✅ Integration with existing process is clear
- ✅ No disruption to portal or GPS uploads

**Once approved, I will proceed with deployment.**

