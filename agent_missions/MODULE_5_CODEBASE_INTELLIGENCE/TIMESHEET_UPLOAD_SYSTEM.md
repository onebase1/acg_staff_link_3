# Timesheet Upload System - Complete Architecture Documentation

**Last Updated:** 2025-12-17
**Status:** 🟡 WORKING BUT FRAGILE (Code Duplication Issue)
**Priority:** 🔴 CRITICAL - Single most important feature that can make or break entire project
**Owner Note:** "timesheet upload is single most important that can make or break entire project"

---

## 🚨 CRITICAL ISSUE: CODE DUPLICATION

**Problem:** Timesheet upload logic exists in **TWO** places, causing silent feature breakage.

### Current State (After 2025-12-17 Fix)
```
Upload Entry Points:
├── [src/pages/Timesheets.jsx](../../src/pages/Timesheets.jsx:339-515)
│   ✅ NOW HAS: Full OCR upload with AI extraction
│   📍 USED BY: Staff Portal → Timesheets link
│   📝 FIXED: 2025-12-17 - Ported OCR logic from TimesheetDetail.jsx
│
├── [src/pages/TimesheetDetail.jsx](../../src/pages/TimesheetDetail.jsx:231-389)
│   ✅ ALWAYS HAD: Full OCR upload with AI extraction
│   📍 USED BY: Direct timesheet detail view
│
└── [supabase/functions/whatsapp-timesheet-upload-handler](../../supabase/functions/whatsapp-timesheet-upload-handler/index.ts)
    ✅ WORKING: WhatsApp upload with OCR
    📍 USED BY: WhatsApp chat uploads
```

### What Broke (Before Fix)
- **Symptom:** Staff uploaded timesheets, got "File uploaded successfully", but NO OCR, NO confidence score, NO modal
- **Root Cause:** `Timesheets.jsx` had basic upload only, staff used this page (not detail page)
- **Why:** Code duplication - OCR logic only in `TimesheetDetail.jsx`, not synced to `Timesheets.jsx`
- **Impact:** 100% of staff uploads bypassed AI extraction features

---

## 📊 Complete System Architecture

### Upload Flow Diagram
```
┌─────────────────────────────────────────────────────────────┐
│ ENTRY POINTS (3)                                            │
├─────────────────────────────────────────────────────────────┤
│ 1. Timesheets.jsx (Staff Portal → Timesheets)              │
│ 2. TimesheetDetail.jsx (Direct detail view)                │
│ 3. WhatsApp (n8n → whatsapp-timesheet-upload-handler)      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ STORAGE UPLOAD                                              │
├─────────────────────────────────────────────────────────────┤
│ • Upload to Supabase Storage: documents bucket              │
│ • Path: timesheets/{timestamp}-{filename}                   │
│ • Get public URL                                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ OCR EXTRACTION (Edge Function)                              │
├─────────────────────────────────────────────────────────────┤
│ Function: extract-timesheet-data                            │
│ Model: OpenAI GPT-4o-mini                                   │
│ Extracts:                                                   │
│   • Employee name                                           │
│   • Client/Facility name                                    │
│   • Date worked                                             │
│   • Start time, End time                                    │
│   • Break duration                                          │
│   • Total hours worked                                      │
│   • Scheduled hours (from document)                         │
│   • Staff signature (yes/no)                                │
│   • Supervisor signature (yes/no)                           │
│   • Confidence scores per field                             │
│   • Overall confidence (0-100%)                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ VALIDATION & FUZZY MATCHING                                 │
├─────────────────────────────────────────────────────────────┤
│ Compare extracted vs expected:                              │
│   • Staff name (fuzzy: tolerates typos, "Liam" vs "Liem")  │
│   • Client name (substring matching)                        │
│   • Date (exact match)                                      │
│   • Hours (tolerance: ±30 min)                              │
│                                                             │
│ Generate mismatches array:                                  │
│   • Field name                                              │
│   • Expected value                                          │
│   • Actual value                                            │
│   • Severity: critical / high / medium / low                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ CONFIRMATION MODAL (UI Component)                           │
├─────────────────────────────────────────────────────────────┤
│ Component: ConfirmOCRModal.jsx                              │
│ Shows:                                                      │
│   • Extracted data                                          │
│   • Expected data                                           │
│   • Confidence score with visual indicator                  │
│   • Mismatches highlighted in red                           │
│   • Multi-row timesheet selection (if applicable)           │
│                                                             │
│ Actions:                                                    │
│   • [Approve] → Auto-approve if high confidence             │
│   • [Send to Admin] → Manual review                         │
│   • [Re-Upload] → Try again with better photo               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ AUTO-APPROVAL LOGIC                                         │
├─────────────────────────────────────────────────────────────┤
│ IF:                                                         │
│   • Confidence ≥ 80%                                        │
│   • Validation status = "match"                             │
│   • No critical mismatches                                  │
│ THEN:                                                       │
│   • Status → "approved"                                     │
│   • approved_by → "auto_approved_by_staff"                  │
│   • Populate hours, times, signatures                       │
│                                                             │
│ ELSE:                                                       │
│   • Status → "pending_admin_review"                         │
│   • Flag for manual review                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ DATABASE UPDATE                                             │
├─────────────────────────────────────────────────────────────┤
│ Table: timesheets                                           │
│ Updates:                                                    │
│   • uploaded_documents (JSONB array)                        │
│   • status (approved / pending_admin_review)                │
│   • actual_start_time, actual_end_time                      │
│   • break_duration_minutes                                  │
│   • hours_worked, total_hours                               │
│   • staff_signature, client_signature                       │
│   • staff_confirmed, staff_confirmed_at                     │
│                                                             │
│ Table: shifts                                               │
│ Updates:                                                    │
│   • timesheet_id (link to timesheet)                        │
│   • timesheet_received = true                               │
│   • timesheet_received_at                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Core Components & Files

### Frontend Components

| File | Purpose | Lines | Critical? | Notes |
|------|---------|-------|-----------|-------|
| [src/pages/Timesheets.jsx](../../src/pages/Timesheets.jsx) | List page with upload | 339-758 | 🔴 YES | Fixed 2025-12-17 |
| [src/pages/TimesheetDetail.jsx](../../src/pages/TimesheetDetail.jsx) | Detail page with upload | 231-651 | 🔴 YES | Original OCR impl |
| [src/components/timesheets/ConfirmOCRModal.jsx](../../src/components/timesheets/ConfirmOCRModal.jsx) | Confirmation UI | Full file | 🔴 YES | Shared by both |
| [src/components/timesheets/ResponsiveUploadZone.jsx](../../src/components/timesheets/ResponsiveUploadZone.jsx) | Upload UI widget | Full file | 🟡 MEDIUM | Desktop drag-drop |
| [src/utils/shiftCalculations.js](../../src/utils/shiftCalculations.js) | Hour calculations | Full file | 🔴 YES | calculateBillableHoursWithRule |

### Backend Edge Functions

| Function | Purpose | Model | Critical? | Deployed? |
|----------|---------|-------|-----------|-----------|
| `extract-timesheet-data` | OCR extraction | GPT-4o-mini | 🔴 YES | ✅ YES |
| `whatsapp-timesheet-upload-handler` | WhatsApp uploads | GPT-4o-mini | 🟡 MEDIUM | ✅ YES |
| `auto-timesheet-approval-engine` | Batch auto-approval | N/A | 🟢 LOW | ✅ YES |
| `intelligent-timesheet-validator` | Validation logic | N/A | 🟢 LOW | ✅ YES |

### Database Tables

| Table | Columns Used | Purpose |
|-------|--------------|---------|
| `timesheets` | `uploaded_documents` (JSONB) | Store uploaded files + OCR data |
| `timesheets` | `status` | Track approval state |
| `timesheets` | `actual_start_time`, `actual_end_time` | Times from OCR |
| `timesheets` | `hours_worked`, `total_hours` | Hours from OCR |
| `timesheets` | `staff_confirmed`, `staff_confirmed_at` | Staff approval tracking |
| `timesheets` | `staff_signature`, `client_signature` | Signature verification |
| `shifts` | `timesheet_id`, `timesheet_received` | Link timesheet to shift |

---

## 🚨 Known Issues & Technical Debt

### Issue #1: CODE DUPLICATION (CRITICAL)
**Status:** 🟡 Temporarily Fixed (2025-12-17)
**Risk:** HIGH - Changes to one file don't affect the other

**Duplicate Code:**
- `Timesheets.jsx` lines 339-758 (upload + OCR handlers)
- `TimesheetDetail.jsx` lines 231-651 (upload + OCR handlers)
- ~400 lines of duplicated logic

**Impact:**
- Future updates must be applied to BOTH files
- High risk of regression (forgetting to update one)
- No single source of truth

**Solution Required:**
1. Create `src/components/timesheets/TimesheetUploader.jsx` shared component
2. Extract upload logic to `src/services/timesheetUploadService.js`
3. Update both pages to use shared implementation
4. Delete duplicate code

**Estimated Effort:** 2-4 hours

---

### Issue #2: NO UPLOAD MONITORING
**Status:** 🔴 Missing
**Risk:** MEDIUM - Silent failures not detected

**Problem:**
- No tracking of upload success/failure rates
- No alerts when OCR not triggered
- No dashboard to see OCR confidence trends

**Solution Required:**
1. Create `timesheet_upload_logs` table
2. Log every upload attempt with outcome
3. Create admin dashboard: `/admin/timesheet-upload-monitor`
4. Add alerts for low OCR confidence rates

**Estimated Effort:** 3-4 hours

---

### Issue #3: NO INTEGRATION TESTS
**Status:** 🔴 Missing
**Risk:** HIGH - Regression detection relies on manual testing

**Problem:**
- Upload flow has no automated tests
- OCR integration not tested
- Modal behavior not tested

**Solution Required:**
1. Add Playwright tests for upload flow
2. Mock OCR Edge Function responses
3. Test all branches (high confidence, low confidence, failures)

**Estimated Effort:** 4-6 hours

---

## 🎯 Recommended Refactoring Plan

### Phase 1: IMMEDIATE (Prevent Further Breakage)
**Time:** 30 minutes

1. **Add validation checks**
   ```javascript
   // After upload, verify OCR was called
   if (!uploadResult.extracted_data) {
     console.error('🚨 CRITICAL: OCR not triggered!', { timesheetId, page });
     logToSupabase('timesheet_upload_error', { error: 'OCR_NOT_TRIGGERED' });
   }
   ```

2. **Add comment warnings**
   ```javascript
   // Timesheets.jsx line 339
   // ⚠️ WARNING: This code is DUPLICATED in TimesheetDetail.jsx
   // TODO: Refactor to shared TimesheetUploader component
   // See: agent_missions/MODULE_5_CODEBASE_INTELLIGENCE/TIMESHEET_UPLOAD_SYSTEM.md
   ```

---

### Phase 2: REFACTOR TO SHARED COMPONENT
**Time:** 2-4 hours

1. **Create shared component**
   ```
   src/components/timesheets/TimesheetUploader.jsx

   Props:
   - timesheetId: string
   - timesheet: object (optional, will fetch if not provided)
   - onSuccess: callback
   - onError: callback
   ```

2. **Update pages to use it**
   ```jsx
   // Timesheets.jsx
   <TimesheetUploader
     timesheetId={timesheetId}
     onSuccess={() => queryClient.invalidateQueries(['timesheets'])}
   />

   // TimesheetDetail.jsx
   <TimesheetUploader
     timesheetId={timesheetId}
     timesheet={timesheet}
     onSuccess={() => queryClient.invalidateQueries(['timesheet', timesheetId])}
   />
   ```

3. **Delete duplicate code**

---

### Phase 3: EXTRACT TO SERVICE LAYER
**Time:** 2-3 hours

1. **Create upload service**
   ```
   src/services/timesheetUploadService.js

   Functions:
   - uploadTimesheetWithOCR({ file, timesheetId, context })
   - validateOCRResult(ocrResult, expectedData)
   - autoApproveIfEligible(extractedData, timesheetId)
   - logUploadAttempt(result)
   ```

2. **Update component to use service**
   ```javascript
   const result = await uploadTimesheetWithOCR({
     file,
     timesheetId,
     context: { staff, client, shift }
   });
   ```

---

### Phase 4: ADD MONITORING & ALERTS
**Time:** 3-4 hours

1. **Create logging table**
   ```sql
   CREATE TABLE timesheet_upload_logs (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     timesheet_id UUID REFERENCES timesheets(id),
     uploaded_by UUID REFERENCES profiles(id),
     file_url TEXT,
     ocr_triggered BOOLEAN,
     ocr_confidence NUMERIC,
     ocr_success BOOLEAN,
     auto_approved BOOLEAN,
     errors JSONB,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Create admin dashboard**
   ```
   src/pages/admin/TimesheetUploadMonitor.jsx

   Shows:
   - Upload success rate (last 7 days)
   - Average OCR confidence
   - Auto-approval rate
   - Failed uploads (with retry button)
   - OCR confidence distribution chart
   ```

3. **Add daily alert**
   ```
   Edge Function: daily-upload-monitor
   Schedule: 0 9 * * * (9am daily)

   If:
   - Upload success rate < 90%
   - Average confidence < 70%
   - Failed uploads > 5

   Then:
   - Send email to admin
   - Create system alert
   ```

---

### Phase 5: ADD INTEGRATION TESTS
**Time:** 4-6 hours

1. **Install Playwright**
   ```bash
   npm install -D @playwright/test
   ```

2. **Create test suite**
   ```
   tests/timesheet-upload.spec.js

   Tests:
   - Upload timesheet → OCR extracts → Modal shows → Approve
   - Upload timesheet → Low confidence → Send to admin
   - Upload timesheet → OCR fails → Fallback saves file
   - Multi-row timesheet → Select correct row → Approve
   ```

---

## 📋 Dependencies & Integration Points

### Upstream Dependencies (What Upload Needs)
```
Timesheet Upload depends on:
├── Supabase Storage (documents bucket)
├── OpenAI API (GPT-4o-mini for OCR)
├── Edge Function: extract-timesheet-data
├── Database: timesheets table
├── Database: shifts table
└── Authentication (user context)
```

### Downstream Dependencies (What Depends on Upload)
```
These features depend on timesheet upload:
├── Payroll generation (needs approved timesheets)
├── Invoice generation (needs approved timesheets)
├── Compliance tracking (needs signature verification)
├── Staff pay calculation (needs hours from OCR)
├── Client billing (needs hours from OCR)
└── Analytics dashboards (timesheet completion rates)
```

---

## 🔍 For Future MODULE_5 Agents

### When Building UI Pages for Codebase Intelligence

**Include this upload system in:**

1. **Critical Features Registry** (`/admin/critical-features`)
   ```javascript
   {
     feature: 'timesheet_ocr_upload',
     priority: 'CRITICAL',
     status: 'working_but_fragile',
     health: 'yellow',
     issues: [
       { type: 'code_duplication', severity: 'high', files: 2 },
       { type: 'no_monitoring', severity: 'medium' },
       { type: 'no_tests', severity: 'high' }
     ],
     dependencies: ['OpenAI API', 'extract-timesheet-data', 'Supabase Storage'],
     dependents: ['payroll', 'invoices', 'compliance'],
     last_incident: '2025-12-17',
     incident_details: 'Staff uploads bypassed OCR due to code duplication'
   }
   ```

2. **Code Duplication Audit** (`/admin/code-duplication`)
   ```javascript
   {
     pattern: 'Timesheet Upload Logic',
     files: [
       'src/pages/Timesheets.jsx:339-758',
       'src/pages/TimesheetDetail.jsx:231-651'
     ],
     lines_duplicated: 400,
     risk: 'HIGH',
     recommended_action: 'Extract to TimesheetUploader.jsx',
     estimated_effort: '2-4 hours'
   }
   ```

3. **Edge Function Registry** (`/admin/edge-functions`)
   ```javascript
   {
     function: 'extract-timesheet-data',
     purpose: 'OCR extraction from timesheet images',
     model: 'gpt-4o-mini',
     critical: true,
     used_by: [
       'Timesheets.jsx',
       'TimesheetDetail.jsx',
       'whatsapp-timesheet-upload-handler'
     ],
     average_confidence: 85, // Query from logs
     success_rate: 94, // Query from logs
     cost_per_call: 0.003 // Estimate
   }
   ```

4. **Automation Opportunities** (`/admin/automation-gaps`)
   ```javascript
   {
     opportunity: 'Upload Monitoring',
     current: 'Manual - owner must check uploads work',
     proposed: 'Automated daily alert if success rate < 90%',
     effort: '3-4 hours',
     impact: 'HIGH - Catch breakage within 24h'
   }
   ```

---

## 📊 Success Metrics

**How to measure if upload system is healthy:**

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Upload success rate | >95% | Unknown | 🔴 Not tracked |
| Average OCR confidence | >80% | Unknown | 🔴 Not tracked |
| Auto-approval rate | 70-80% | Unknown | 🔴 Not tracked |
| Staff re-upload rate | <10% | Unknown | 🔴 Not tracked |
| Time to approval | <5 min | Unknown | 🔴 Not tracked |

**What to track in database:**
```sql
-- Add to timesheet_upload_logs table
SELECT
  COUNT(*) FILTER (WHERE ocr_success = true)::FLOAT / COUNT(*) * 100 AS success_rate,
  AVG(ocr_confidence) AS avg_confidence,
  COUNT(*) FILTER (WHERE auto_approved = true)::FLOAT / COUNT(*) * 100 AS auto_approval_rate
FROM timesheet_upload_logs
WHERE created_at >= NOW() - INTERVAL '7 days';
```

---

## 🆘 Troubleshooting Guide

### Issue: "File uploaded successfully" but no modal appears

**Cause:** OCR not triggered (basic upload used instead of OCR upload)

**Check:**
1. Console logs - Should see "🔍 Extracting timesheet data with OCR..."
2. Network tab - Should see call to `extract-timesheet-data` function
3. Database - Check `uploaded_documents[0].extracted_data` is populated

**Fix:**
- Ensure using correct upload function (OCR-enabled version)
- Check Edge Function is deployed
- Verify OpenAI API key is set

---

### Issue: OCR confidence always low (<60%)

**Possible Causes:**
1. Poor image quality (blurry, dark, rotated)
2. Handwriting too messy
3. Document format not recognized

**Fix:**
1. Add image quality pre-check
2. Guide user to take better photo (lighting, angle)
3. Add re-upload prompt with tips

---

### Issue: Auto-approval not working

**Check:**
1. Confidence score >= 80%?
2. Validation status = "match"?
3. No critical mismatches?

**Debug:**
```javascript
console.log('Auto-approval check:', {
  confidence: extracted.confidence?.overall,
  validation: extracted.validation_status,
  criticalMismatches: extracted.mismatches?.filter(m => m.severity === 'critical')
});
```

---

## 🔐 Security Considerations

1. **File Upload Validation**
   - ✅ Max file size: 10MB
   - ✅ Allowed types: .pdf, .jpg, .jpeg, .png
   - ⚠️ TODO: Add virus scanning
   - ⚠️ TODO: Add image validation (not corrupt)

2. **OCR Data Validation**
   - ✅ Fuzzy matching prevents injection
   - ✅ Data sanitized before database insert
   - ⚠️ TODO: Rate limiting on OCR calls

3. **Access Control**
   - ✅ RLS policies on timesheets table
   - ✅ Staff can only upload own timesheets
   - ✅ Admins can upload for any staff

---

## 📚 Related Documentation

- [OCR Edge Function README](../../supabase/functions/extract-timesheet-data/README.md)
- [WhatsApp Upload Handler](../../supabase/functions/whatsapp-timesheet-upload-handler/README.md)
- [Timesheet Upload Flow Diagram](../../docs/gps-clock-in-system/archive/TIMESHEET_UPLOAD_FLOW_DIAGRAM.md)
- [Low Confidence Flow](../../docs/gps-clock-in-system/archive/LOW_CONFIDENCE_TIMESHEET_FLOW.md)

---

## 🔄 Change Log

| Date | Change | Author | Impact |
|------|--------|--------|--------|
| 2025-12-17 | Fixed OCR upload on Timesheets.jsx | Claude Code | 🟢 Staff uploads now work |
| 2025-12-17 | Documented architecture | Claude Code | 📝 First comprehensive docs |
| 2025-11-18 | Added WhatsApp upload | Previous | 🟢 WhatsApp uploads work |
| 2025-11-XX | Built OCR on TimesheetDetail | Previous | 🟢 Detail page works |

---

**END OF DOCUMENT**
