# 🚀 ACG StaffLink - Complete Production Flow

**Date:** 2025-11-18  
**Status:** PRODUCTION READY  
**System:** WhatsApp Interactive Timesheet Confirmation (Option A)

---

## 📊 **COMPLETE PRODUCTION FLOW**

### **Scenario 1: Staff Uploads Timesheet Photo (High Confidence)**

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: Staff Sends Timesheet Photo                                 │
│ • Staff opens WhatsApp                                               │
│ • Sends photo to: +44 7924 975049                                   │
│ • Photo: Timesheet with hours, breaks, signatures                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: WhatsApp Business Cloud API Receives Message                │
│ • Meta servers receive the image                                    │
│ • Webhook fires to n8n                                              │
│ • Payload includes: sender phone, image ID, timestamp               │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: n8n Workflow Processes Message                              │
│ • WhatsApp Trigger receives webhook                                 │
│ • Check Message Type: Detects IMAGE                                 │
│ • Get Image URL: Calls WhatsApp API to get download URL             │
│ • Route to Upload Handler: Sends to Supabase Edge Function          │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: Supabase Edge Function - whatsapp-timesheet-upload-handler  │
│ • Receives: phone number, image URL, profile name                   │
│ • Validates: Staff exists in database                               │
│ • Downloads: Image from WhatsApp URL                                │
│ • Uploads: To Supabase Storage (documents bucket)                   │
│ • Calls: extract-timesheet-data function (OCR)                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: OCR Extraction (OpenAI Vision API)                          │
│ • Model: gpt-4o-mini                                                │
│ • Extracts:                                                         │
│   - Hours worked: 12h                                               │
│   - Break duration: 30 min                                          │
│   - Staff name: John Doe                                            │
│   - Client name: Care Home ABC                                      │
│   - Date: 2025-11-18                                                │
│   - Signatures: Present ✅                                          │
│ • Confidence Score: 95%                                             │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 6: Create Timesheet Record                                     │
│ • Database: timesheets table                                        │
│ • Status: pending_confirmation (because confidence ≥ 80%)           │
│ • Fields:                                                           │
│   - staff_id: 123                                                   │
│   - shift_id: 456                                                   │
│   - hours_worked: 12                                                │
│   - break_duration_minutes: 30                                      │
│   - image_url: https://supabase.co/storage/...                      │
│   - ocr_confidence_score: 95                                        │
│   - status: pending_confirmation                                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 7: Send Interactive Confirmation to Staff                      │
│ • Function: send-whatsapp                                           │
│ • Message:                                                          │
│   ✅ Timesheet Received!                                            │
│                                                                     │
│   Hi John,                                                          │
│                                                                     │
│   We extracted the following data from your timesheet:             │
│                                                                     │
│   📋 Shift: Care Home ABC                                           │
│   📅 Date: 2025-11-18                                               │
│   ⏱️ Hours: 12h                                                     │
│   ☕ Break: 30 min                                                  │
│   ✅ Signature: Present                                             │
│                                                                     │
│   Is this correct?                                                  │
│                                                                     │
│   Reply YES to confirm                                              │
│   Reply NO if it needs review                                       │
│                                                                     │
│   Confidence: 95%                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 8: Staff Replies "YES"                                         │
│ • Staff types: YES                                                  │
│ • WhatsApp sends message to Meta                                    │
│ • Meta webhook fires to n8n                                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 9: n8n Routes YES Reply                                        │
│ • WhatsApp Trigger receives webhook                                 │
│ • Check Message Type: Detects TEXT                                  │
│ • Route to Text Handler: Sends to incoming-whatsapp-handler         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 10: incoming-whatsapp-handler Processes YES                    │
│ • Detects: YES/NO confirmation reply                                │
│ • Routes to: whatsapp-timesheet-interactive function                │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 11: whatsapp-timesheet-interactive Auto-Approves               │
│ • Finds: Most recent timesheet with status = pending_confirmation   │
│ • Updates:                                                          │
│   - status: submitted                                               │
│   - staff_approved_at: 2025-11-18 08:30:00                          │
│   - notes: "[Staff Confirmed] Data verified by staff via WhatsApp"  │
│ • Triggers: intelligent-timesheet-validator function                │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 12: intelligent-timesheet-validator Validates                  │
│ • Checks:                                                           │
│   - Hours within shift time range? ✅                               │
│   - Break duration reasonable? ✅                                   │
│   - Signature present? ✅                                           │
│   - No duplicate submissions? ✅                                    │
│ • Result: PASS                                                      │
│ • Updates: status = approved                                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 13: Send Final Confirmation to Staff                           │
│ • Function: send-whatsapp                                           │
│ • Message:                                                          │
│   ✅ Perfect! Your timesheet has been submitted for processing.     │
│                                                                     │
│   We'll notify you once it's been approved by the admin.            │
│                                                                     │
│   Thank you! 🎉                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 14: Admin Reviews (Optional)                                   │
│ • Admin Portal: Timesheets → Pending Approval                       │
│ • Admin sees: Timesheet with status = approved                      │
│ • Admin can: View image, edit hours, approve/reject                 │
│ • Final approval: status = finalized                                │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 15: Payroll Processing                                         │
│ • Timesheet locked (cannot be edited)                               │
│ • Hours added to payroll calculation                                │
│ • Staff paid for shift                                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 **SCENARIO 2: Staff Replies "NO" (Needs Review)**

```
STEPS 1-7: Same as Scenario 1
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 8: Staff Replies "NO"                                          │
│ • Staff types: NO                                                   │
│ • WhatsApp sends message to Meta                                    │
│ • Meta webhook fires to n8n                                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 9-10: Same routing as Scenario 1                               │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 11: whatsapp-timesheet-interactive Creates Admin Task          │
│ • Finds: Most recent timesheet with status = pending_confirmation   │
│ • Creates: AdminWorkflow record                                     │
│   - type: timesheet_review                                          │
│   - priority: high                                                  │
│   - description: "Staff requested review of timesheet"              │
│   - timesheet_id: 789                                               │
│ • Updates: timesheet status = requires_review                       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 12: Send Confirmation to Staff                                 │
│ • Function: send-whatsapp                                           │
│ • Message:                                                          │
│   ⚠️ No problem! We've flagged your timesheet for review.           │
│                                                                     │
│   An admin will check it and get back to you shortly.               │
│                                                                     │
│   Thank you for letting us know! 👍                                 │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 13: Admin Reviews Manually                                     │
│ • Admin Portal: Admin Workflows → Timesheet Review                  │
│ • Admin sees: Flagged timesheet                                     │
│ • Admin: Views image, corrects data, approves                       │
│ • Status: approved → finalized                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 **SCENARIO 3: Low Confidence OCR (<80%)**

```
STEPS 1-5: Same as Scenario 1, but OCR confidence = 65%
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 6: Create Timesheet Record                                     │
│ • Status: requires_review (because confidence < 80%)                │
│ • No interactive confirmation sent                                  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 7: Send Simple Confirmation to Staff                           │
│ • Function: send-whatsapp                                           │
│ • Message:                                                          │
│   ✅ Timesheet received!                                            │
│                                                                     │
│   We're processing your timesheet and will notify you once it's     │
│   been reviewed.                                                    │
│                                                                     │
│   Thank you! 🎉                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 8: Admin Reviews Manually                                      │
│ • Admin Portal: Timesheets → Requires Review                        │
│ • Admin sees: Low confidence timesheet                              │
│ • Admin: Views image, enters correct data, approves                 │
│ • Status: approved → finalized                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 **TECHNICAL COMPONENTS**

### **1. WhatsApp Business Cloud API**
- **Provider:** Meta/Facebook (FREE tier)
- **Phone:** +44 7924 975049
- **Phone Number ID:** 683816761472557
- **Webhook:** Points to n8n workflow

### **2. n8n Workflow**
- **Name:** ACG StaffLink - WhatsApp Interactive Timesheet Receiver
- **Trigger:** WhatsApp webhook
- **Nodes:**
  1. WhatsApp Trigger
  2. Check Message Type (Switch)
  3. Get Image URL (WhatsApp API)
  4. Route to Upload Handler (HTTP Request)
  5. Route to Text Handler (HTTP Request)
  6. Unsupported Message Type (WhatsApp send)

### **3. Supabase Edge Functions**
1. **whatsapp-timesheet-upload-handler**
   - Downloads image from WhatsApp
   - Uploads to Supabase Storage
   - Runs OCR extraction
   - Creates timesheet record
   - Sends confirmation

2. **whatsapp-timesheet-interactive**
   - Handles YES/NO replies
   - Auto-approves or creates admin task
   - Sends final confirmation

3. **incoming-whatsapp-handler**
   - Routes YES/NO to interactive handler
   - Routes other text to AI chat

4. **extract-timesheet-data**
   - OpenAI Vision API (gpt-4o-mini)
   - Extracts structured data from image
   - Returns confidence score

5. **intelligent-timesheet-validator**
   - Validates timesheet data
   - Checks for duplicates
   - Verifies hours/breaks/signatures

6. **send-whatsapp**
   - Sends WhatsApp messages via n8n
   - Uses WhatsApp Business Cloud API

### **4. Database Tables**
- **timesheets:** Stores timesheet records
- **shifts:** Links timesheets to shifts
- **staff:** Staff information
- **clients:** Client information
- **AdminWorkflow:** Admin tasks for manual review

---

## ✅ **SUCCESS METRICS**

- ✅ **High Confidence (≥80%):** Interactive confirmation → Auto-approve if YES
- ✅ **Low Confidence (<80%):** Simple confirmation → Admin review
- ✅ **Staff Says NO:** Create admin task → Manual review
- ✅ **Reduced Admin Work:** Only review when necessary
- ✅ **Staff Confidence:** Staff verifies their own data
- ✅ **Audit Trail:** All confirmations logged in database

---

## 🎉 **READY FOR PRODUCTION!**

**All components deployed and ready to test!** 🚀

