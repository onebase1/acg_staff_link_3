# 🧪 OCR Quick Fixes - Testing Guide

## ✅ **Fixes Implemented**

### **Fix 1: Multi-Row Timesheet Detection**
**File:** `supabase/functions/extract-timesheet-data/index.ts` (Lines 296-316)

**What it does:**
- Detects when extracted hours > 2× expected hours
- Adds warning: "Multi-day timesheet detected"
- Downgrades severity from CRITICAL → MEDIUM
- Prevents false alarms for Dominion-style consecutive shift timesheets

**Test Scenario:**
1. Create shift: 11h expected
2. Upload timesheet with 3 rows (33h total)
3. **Expected Result:**
   - ⚠️ Warning: "Document shows 33h total, but this shift expected only 11h. This appears to be a multi-day timesheet..."
   - Severity: MEDIUM (not critical)
   - Admin sees guidance: "Check if timesheet contains multiple dates"

---

### **Fix 2: Staff Re-Upload Guidance**
**File:** `src/pages/TimesheetDetail.jsx` (Lines 36, 263, 623-667)

**What it does:**
- Tracks last OCR confidence score
- Shows yellow alert if confidence < 60%
- Provides step-by-step guidance to staff
- "Re-Upload Better Photo" button

**Test Scenario:**
1. Upload blurry/unclear photo
2. OCR returns confidence: 45%
3. **Expected Result:**
   - 🟨 Yellow alert appears with:
     - "Low Confidence (45%) - Action Needed"
     - 5 tips to improve photo quality
     - "Re-Upload Better Photo" button
     - "Dismiss" option
   - Click button → Opens file picker
   - Upload clearer photo → Alert disappears if confidence > 60%

---

### **Fix 3: Populate Actual Times from OCR**
**File:** `src/pages/TimesheetDetail.jsx` (Lines 298-321)

**What it does:**
- Extracts start_time, end_time, break_minutes from OCR
- Auto-populates `actual_start_time`, `actual_end_time`, `break_duration_minutes` columns
- Enables accurate invoicing and overtime tracking

**Test Scenario:**
1. Upload timesheet showing:
   - Start: 19:45
   - End: 08:15
   - Break: 60 minutes
2. **Expected Result:**
   - Timesheets table updated with:
     - `actual_start_time`: "19:45"
     - `actual_end_time`: "08:15"
     - `break_duration_minutes`: 60
   - Console logs show: "✅ Set actual_start_time: 19:45"
   - Can use for invoicing/reporting

---

## 🧪 **Test Cases**

### **Test 1: Normal Single-Day Timesheet**
**Setup:**
- Shift scheduled: 20:00-08:00 (11h)
- Upload: Clear timesheet, 1 row, 11h

**Expected:**
- ✅ High confidence (80%+)
- ✅ No multi-row warning
- ✅ Actual times populated
- ✅ No re-upload guidance

---

### **Test 2: Multi-Day Timesheet (Edge Case)**
**Setup:**
- Shift scheduled: Monday 11h
- Upload: Dominion timesheet with Mon/Wed/Sat rows (33h total)

**Expected:**
- ⚠️ Warning: "Multi-day timesheet detected (3.0x expected hours)"
- ⚠️ Severity: MEDIUM (not critical)
- ⚠️ Guidance: "Check if timesheet contains multiple dates"
- Hours mismatch downgraded to medium

---

### **Test 3: Blurry Photo (Low Confidence)**
**Setup:**
- Upload poor quality/blurry image
- OCR confidence: 42%

**Expected:**
- 🟨 Yellow alert appears immediately after upload
- Shows: "Low Confidence (42%) - Action Needed"
- Lists 5 improvement tips
- "Re-Upload Better Photo" button clickable
- Dismiss button hides alert

---

### **Test 4: Re-Upload Workflow**
**Setup:**
- First upload: Blurry (45% confidence)
- Second upload: Clear photo (85% confidence)

**Expected:**
- First upload: Yellow alert shows
- Second upload: Alert disappears (confidence > 60%)
- Toast: "✅ High confidence extraction (85%)"

---

### **Test 5: Actual Times Extraction**
**Setup:**
- Upload timesheet with clear times:
  - Start: 07:30
  - End: 19:30
  - Break: 30 min

**Expected:**
- Database query shows:
  ```sql
  SELECT actual_start_time, actual_end_time, break_duration_minutes
  FROM timesheets WHERE id = '{timesheet_id}';
  ```
  Results:
  - actual_start_time: "07:30"
  - actual_end_time: "19:30"
  - break_duration_minutes: 30

---

### **Test 6: OCR Extraction Failure**
**Setup:**
- Upload completely illegible document
- OCR returns: `success: false`

**Expected:**
- ⚠️ Toast: "Document uploaded, but OCR extraction failed"
- ❌ No actual times populated (columns remain NULL)
- ❌ No re-upload guidance (confidence is null)
- Document still saved in uploaded_documents

---

## 🔍 **Manual Testing Checklist**

### **Pre-Deployment Testing:**

- [ ] **Test Fix 1: Multi-Row Detection**
  - [ ] Upload multi-day timesheet
  - [ ] Verify warning appears in OCR results
  - [ ] Check severity is MEDIUM not CRITICAL
  - [ ] Confirm hours mismatch downgraded

- [ ] **Test Fix 2: Re-Upload Guidance**
  - [ ] Upload blurry photo
  - [ ] Verify yellow alert appears
  - [ ] Click "Re-Upload" button → file picker opens
  - [ ] Upload clear photo → alert disappears
  - [ ] Click "Dismiss" → alert closes

- [ ] **Test Fix 3: Actual Times**
  - [ ] Upload timesheet with visible times
  - [ ] Check database: `SELECT actual_start_time, actual_end_time, break_duration_minutes FROM timesheets WHERE id = ?`
  - [ ] Verify times match document
  - [ ] Check console logs show "✅ Set actual_start_time..."

### **Regression Testing:**

- [ ] **Existing Functionality Still Works**
  - [ ] Normal uploads still work
  - [ ] OCR still extracts staff name, client, date
  - [ ] Validation still flags wrong date/client
  - [ ] Signatures still detected
  - [ ] Confidence scores still shown in UI

### **Edge Cases:**

- [ ] Upload with no times (handwritten unclear)
- [ ] Upload PDF vs. JPG vs. PNG
- [ ] Upload very large file (9.5MB)
- [ ] Upload from mobile vs. desktop
- [ ] Multiple consecutive uploads
- [ ] Upload while previous upload still processing

---

## 🚨 **Rollback Plan**

### **If Something Breaks:**

```bash
# Option 1: Revert to main branch
git checkout main
git branch -D feature/ocr-quick-fixes

# Option 2: Revert specific file
git checkout main -- supabase/functions/extract-timesheet-data/index.ts
git checkout main -- src/pages/TimesheetDetail.jsx
```

### **If OCR Function Breaks:**

```bash
# Redeploy previous version
cd /c/Users/gbase/superbasecli
./supabase.exe functions deploy extract-timesheet-data --no-verify-jwt
```

---

## 📊 **Success Metrics**

### **After 1 Week:**

- [ ] **50%+ reduction in false critical alerts**
  - Track: How many "critical" hours mismatches before vs. after
  - Goal: Multi-row detection catches 70%+ of false positives

- [ ] **30%+ improvement in OCR confidence scores**
  - Track: Average confidence before vs. after re-uploads
  - Goal: Staff respond to guidance and upload better photos

- [ ] **Actual times populated in 80%+ of uploads**
  - Track: `COUNT(*) WHERE actual_start_time IS NOT NULL`
  - Goal: Enable accurate invoicing for majority of shifts

### **After 1 Month:**

- [ ] **Admin manual review time reduced by 40%+**
  - Track: Time spent reviewing timesheets
  - Fewer false alarms = faster processing

- [ ] **Staff satisfaction improved**
  - Track: Feedback on re-upload guidance
  - Goal: Staff know how to fix low confidence vs. feeling helpless

---

## 🐛 **Known Limitations**

### **Fix 1: Multi-Row Detection**
- Only detects if hours > 2× expected
- Won't catch if timesheet has 1.5× hours (e.g., 16h vs 11h expected)
- May miss edge cases with unusual shift patterns

**Workaround:** Admin still manually reviews MEDIUM severity warnings

### **Fix 2: Re-Upload Guidance**
- Only shows for confidence < 60%
- Won't help with confidence 60-79% (medium range)
- Alert can be dismissed (staff might ignore)

**Workaround:** Toast notifications still show for 60-79% confidence

### **Fix 3: Actual Times**
- Requires OCR to successfully extract times
- Handwritten times may not parse correctly
- Doesn't validate if times are reasonable (e.g., 50:00 invalid)

**Workaround:** Admin can manually edit actual times if needed

---

## 📝 **Post-Deployment Actions**

1. **Monitor logs for 48 hours:**
   - Watch for OCR function errors
   - Check Supabase logs for failed mutations
   - Review Netlify deploy logs

2. **Gather feedback from 5-10 staff:**
   - Do they see the re-upload guidance?
   - Is it helpful?
   - Any confusion?

3. **Check database stats after 1 week:**
   ```sql
   -- Multi-row warnings
   SELECT COUNT(*) FROM timesheets
   WHERE uploaded_documents::text LIKE '%multi_row_timesheet%';

   -- Actual times populated
   SELECT COUNT(*) FROM timesheets
   WHERE actual_start_time IS NOT NULL;

   -- Low confidence uploads
   SELECT COUNT(*) FROM timesheets
   WHERE uploaded_documents::text LIKE '%confidence_score":[0-5][0-9]%';
   ```

4. **Iterate based on data:**
   - If multi-row warnings too aggressive → adjust threshold from 2× to 2.5×
   - If re-upload guidance ignored → make more prominent
   - If actual times not populating → debug OCR extraction

---

**Generated:** 2025-11-23
**Branch:** `feature/ocr-quick-fixes`
**Ready for:** Testing & Deployment
