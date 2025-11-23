# 📋 OCR Phase 2: Staff Validation Workflow

**Generated:** 2025-11-23
**Status:** In Progress
**Branch:** main
**Phase 1 Commit:** 4e4ff7a

---

## 🎯 **Objective**

Implement WhatsApp-style confirmation workflow for web timesheet uploads to minimize admin workload.

**User Requirement:**
> "I remember adding a staff validation logic to minimise admin workflow i.e. when OCR extracts - it must show user extracted data for user to approve - if confidence high and user approve - auto complete"

---

## 📊 **Current State (Phase 1 Complete)**

✅ **Phase 1 Completed:**
- Multi-row extraction (extracts each row separately)
- Matched row logic (finds correct date from multi-day timesheets)
- Validation uses matched_row_hours (not weekly total)
- Frontend populates actual times from matched row

**Phase 1 Result:**
- Dominion 3-row timesheet: ✅ Extracts 11h (not 33h)
- Validation: ✅ 11h vs 11h expected = PASS
- No more false critical alerts for multi-day timesheets

---

## 🎯 **Phase 2 Goals**

### **1. Staff Confirmation Modal**
Show extracted OCR data to staff immediately after upload:
- Employee name
- Client name
- Date
- Start/End times
- Break duration
- Hours worked
- Confidence score

**Staff Actions:**
- ✅ **Confirm** - Data is correct
- ❌ **Reject** - Data needs review
- 📸 **Re-Upload** - Take better photo

### **2. Auto-Approval Logic**
**IF:**
- Confidence ≥ 80% (high confidence)
- Staff confirms data
- No critical mismatches (name, client, date)

**THEN:**
- Auto-approve timesheet
- Status: `approved` (skip admin review)
- Toast: "✅ Timesheet approved automatically!"

**ELSE:**
- Status: `pending_admin_review`
- Admin reviews in dashboard

### **3. Low Confidence Handling**
**IF confidence < 60%:**
- Show warning in modal
- Recommend re-upload
- Provide guidance (lighting, clarity, etc.)
- Staff can still confirm (but goes to admin review)

### **4. Multi-Row Awareness**
**IF multi-row timesheet detected:**
- Show all rows in modal
- Highlight matched row (green border)
- Show: "This shift uses the **Wed 15/01** row (11h)"
- Other rows greyed out with labels

---

## 🏗️ **Technical Design**

### **Component Structure**

```
src/components/timesheets/
  ├── ConfirmOCRModal.jsx (NEW)
  └── ResponsiveUploadZone.jsx (existing)

src/pages/
  └── TimesheetDetail.jsx (modify upload handler)
```

### **ConfirmOCRModal.jsx**

**Props:**
```javascript
{
  isOpen: boolean,
  onClose: () => void,
  extractedData: {
    employee_name: string,
    client_name: string,
    date: string,
    start_time: string,
    end_time: string,
    break_minutes: number,
    hours_worked: number,
    confidence: { overall: number },
    rows: [{date, hours, ...}], // Multi-row support
    matched_row_info: {date, hours, ...}, // Highlighted row
    validation_status: 'match' | 'mismatch',
    mismatches: [{field, expected, actual, severity}],
    warnings: [...]
  },
  expectedData: {
    staff_name: string,
    client_name: string,
    shift_date: string,
    scheduled_hours: number
  },
  onConfirm: () => void,
  onReject: () => void,
  onReUpload: () => void,
  uploading: boolean
}
```

**UI Layout:**
```
┌─────────────────────────────────────┐
│ 🔍 Review Extracted Data            │
├─────────────────────────────────────┤
│ Confidence: 85% ●●●●○ High          │
├─────────────────────────────────────┤
│ ✅ Employee: John Smith             │
│ ✅ Client: Dominion Healthcare      │
│ ✅ Date: Wednesday 15/01/2025       │
│ ✅ Time: 20:00 - 08:00              │
│ ✅ Break: 60 minutes                │
│ ✅ Hours: 11.0h                     │
├─────────────────────────────────────┤
│ ⚠️ Multi-Row Timesheet Detected     │
│ This timesheet has 3 shifts:        │
│ • Mon 13/01: 11h                    │
│ • ✅ Wed 15/01: 11h (THIS SHIFT)    │
│ • Sat 18/01: 11h                    │
├─────────────────────────────────────┤
│ Is this information correct?        │
│                                     │
│ [❌ No, Review Needed] [✅ Yes, Confirm] │
│ [📸 Re-Upload Better Photo]         │
└─────────────────────────────────────┘
```

### **Workflow States**

```javascript
// After OCR completes
const [showConfirmModal, setShowConfirmModal] = useState(false);
const [pendingOcrData, setPendingOcrData] = useState(null);

// Upload flow:
1. User uploads file
2. OCR extracts data
3. Show ConfirmOCRModal with extracted data
4. Staff reviews:
   a) Confirm → Auto-approve (if high confidence) or admin review
   b) Reject → Status: pending_admin_review
   c) Re-upload → Close modal, open file picker again
```

### **Auto-Approval Logic**

```javascript
const handleConfirm = async () => {
  const canAutoApprove = (
    extractedData.confidence.overall >= 80 &&
    extractedData.validation_status === 'match' &&
    !extractedData.mismatches.some(m => m.severity === 'critical')
  );

  const newStatus = canAutoApprove ? 'approved' : 'pending_admin_review';

  await supabase
    .from('timesheets')
    .update({
      status: newStatus,
      staff_confirmed: true,
      staff_confirmed_at: new Date().toISOString(),
      ...(canAutoApprove && {
        approved_by: 'auto_approved_by_staff',
        approved_at: new Date().toISOString()
      })
    })
    .eq('id', timesheetId);

  if (canAutoApprove) {
    toast.success('✅ Timesheet approved automatically!');
  } else {
    toast.info('⏳ Sent to admin for review');
  }
};
```

---

## 📝 **Implementation Steps**

### **Step 1: Create ConfirmOCRModal Component**
**File:** `src/components/timesheets/ConfirmOCRModal.jsx`

**Features:**
- [ ] Display extracted data in readable format
- [ ] Show confidence score with visual indicator
- [ ] Highlight mismatches in red
- [ ] Show warnings in yellow
- [ ] Multi-row support (show all rows, highlight matched)
- [ ] Three action buttons: Confirm, Reject, Re-Upload
- [ ] Responsive mobile design
- [ ] Loading states for confirm/reject actions

### **Step 2: Update TimesheetDetail Upload Handler**
**File:** `src/pages/TimesheetDetail.jsx`

**Changes:**
- [ ] Add state: `showConfirmModal`, `pendingOcrData`
- [ ] After OCR success, show modal instead of immediate save
- [ ] Pass expected data to modal for comparison display
- [ ] Implement confirm/reject/re-upload handlers
- [ ] Update status based on auto-approval logic

### **Step 3: Database Column Additions**
**File:** New migration or existing columns

**Required columns:**
```sql
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS staff_confirmed BOOLEAN DEFAULT false;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS staff_confirmed_at TIMESTAMPTZ;
```

### **Step 4: Testing**

**Test Case 1: High Confidence + Confirm = Auto-Approve**
- Upload clear timesheet (confidence 85%+)
- Modal shows extracted data
- Click "Confirm"
- Expected: Status = `approved`, Toast: "✅ Approved automatically!"

**Test Case 2: Low Confidence + Confirm = Admin Review**
- Upload blurry timesheet (confidence 45%)
- Modal shows warning
- Click "Confirm"
- Expected: Status = `pending_admin_review`, Toast: "⏳ Sent to admin"

**Test Case 3: Reject**
- Upload any timesheet
- Click "Reject"
- Expected: Status = `pending_admin_review`, Toast: "⏳ Sent to admin for review"

**Test Case 4: Re-Upload**
- Upload blurry timesheet
- Click "Re-Upload Better Photo"
- Expected: Modal closes, file picker opens
- Upload clearer photo → New modal shows

**Test Case 5: Multi-Row Display**
- Upload Dominion 3-row timesheet for Wed shift
- Expected: Modal shows 3 rows, Wed highlighted green

---

## 🎨 **UI/UX Considerations**

### **Confidence Score Visualization**
```javascript
const getConfidenceColor = (score) => {
  if (score >= 80) return 'text-green-600 bg-green-50';
  if (score >= 60) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
};

const getConfidenceLabel = (score) => {
  if (score >= 80) return 'High Confidence';
  if (score >= 60) return 'Medium Confidence';
  return 'Low Confidence - Review Recommended';
};
```

### **Mismatch Display**
```jsx
{mismatches.map(m => (
  <div className="bg-red-50 border-l-4 border-red-500 p-3">
    <p className="font-bold text-red-900">⚠️ {m.field} Mismatch</p>
    <p className="text-sm">Expected: {m.expected}</p>
    <p className="text-sm">Found: {m.actual}</p>
  </div>
))}
```

### **Multi-Row Display**
```jsx
{rows.length > 1 && (
  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
    <p className="font-bold text-blue-900">📋 Multi-Day Timesheet</p>
    <p className="text-sm mb-2">This timesheet has {rows.length} shifts:</p>
    {rows.map(row => (
      <div className={`p-2 rounded ${
        row.date === matched_row_info?.date
          ? 'bg-green-100 border-2 border-green-500'
          : 'bg-gray-100'
      }`}>
        {row.date === matched_row_info?.date && '✅ '}
        {row.date}: {row.hours}h
        {row.date === matched_row_info?.date && ' (THIS SHIFT)'}
      </div>
    ))}
  </div>
)}
```

---

## 🔄 **Comparison with WhatsApp Workflow**

**WhatsApp (existing):**
```
1. Staff sends timesheet photo
2. OCR extracts data
3. Bot sends: "We extracted: ..."
4. Staff replies: YES or NO
5. If YES + high confidence → auto-approve
6. If NO → admin review
```

**Web Portal (Phase 2):**
```
1. Staff uploads timesheet
2. OCR extracts data
3. Modal shows: "Review extracted data"
4. Staff clicks: Confirm or Reject
5. If Confirm + high confidence → auto-approve
6. If Reject → admin review
```

**Key Differences:**
- Web: Interactive modal (richer UI)
- Web: Visual confidence indicators
- Web: Side-by-side comparison (expected vs actual)
- Web: Multi-row visualization
- WhatsApp: Text-based, simpler
- Both: Same auto-approval logic

---

## 📊 **Success Metrics**

### **After 1 Week:**
- [ ] **40%+ of web uploads auto-approved**
  - Track: `COUNT(*) WHERE status='approved' AND approved_by='auto_approved_by_staff'`
  - Goal: High confidence timesheets skip admin queue

- [ ] **Staff confirmation rate ≥ 80%**
  - Track: `COUNT(*) WHERE staff_confirmed=true`
  - Goal: Staff actively review OCR data

- [ ] **Re-upload rate for low confidence**
  - Track: How many staff re-upload after seeing <60% confidence
  - Goal: 30%+ re-upload to improve quality

### **After 1 Month:**
- [ ] **Admin review time reduced by 50%+**
  - Fewer timesheets in pending queue
  - Only edge cases require manual review

- [ ] **Staff satisfaction improved**
  - Immediate feedback on upload quality
  - Clear guidance when confidence low

---

## 🐛 **Edge Cases to Handle**

### **1. Staff Confirms Incorrect Data**
**Scenario:** OCR extracts wrong hours (10h instead of 11h), staff confirms anyway

**Solution:**
- Admin dashboard still shows validation warnings
- Admin can override staff confirmation if suspicious
- Log staff confirmation for audit trail

### **2. Network Failure During Confirm**
**Scenario:** User clicks Confirm, request fails

**Solution:**
- Show error toast: "Failed to save. Please try again."
- Don't close modal
- Retry button

### **3. User Refreshes Page After Upload**
**Scenario:** Upload succeeds, modal shows, user refreshes browser

**Solution:**
- Modal state not persisted (acceptable - document already uploaded)
- Document saved in uploaded_documents array
- Status remains `pending_admin_review` (safe default)
- Admin can still review

### **4. Multiple Consecutive Uploads**
**Scenario:** Staff uploads 3 timesheets in a row

**Solution:**
- Each upload shows confirmation modal sequentially
- First modal must be closed before next upload processed
- OR: Queue modals (show after previous confirmed)

---

## 🚀 **Deployment Plan**

### **Step 1: Deploy to Staging (Test Locally First)**
```bash
# Local testing
npm run dev
# Test with sample timesheets
```

### **Step 2: Commit Changes**
```bash
git add src/components/timesheets/ConfirmOCRModal.jsx
git add src/pages/TimesheetDetail.jsx
git commit -m "feat: Phase 2 - Staff validation workflow for web uploads"
git push origin main
```

### **Step 3: Monitor Production**
- Watch for errors in Netlify logs
- Check Supabase logs for failed mutations
- Gather feedback from 5-10 staff after first day

### **Step 4: Iterate**
- Adjust confidence thresholds if needed
- Improve modal UX based on feedback
- Add analytics tracking

---

## 📚 **Future Enhancements (Phase 3+)**

### **Phase 3: Row-by-Row Duplicate Detection**
**Goal:** Skip already-uploaded rows in multi-day timesheets

**Example:**
- Monday: Upload 3-row timesheet (Mon/Wed/Sat)
  - Saves Mon row only
- Wednesday: Same timesheet uploaded
  - Detects Mon already saved (skip)
  - Saves Wed row only
- Saturday: Same timesheet uploaded again
  - Detects Mon + Wed already saved (skip)
  - Saves Sat row only

**Requirements:**
- Compare `(staff_id, client_id, shift_date, hours)` tuple
- Mark duplicate rows in modal (greyed out)
- Auto-skip duplicates
- Admin warning if hours differ for same date

### **Phase 4: ML Confidence Tuning**
**Goal:** Improve OCR accuracy over time

**Ideas:**
- Track which low-confidence extractions were correct (staff confirmed)
- Adjust confidence thresholds based on historical accuracy
- Fine-tune OpenAI prompt based on common errors

### **Phase 5: Signature Verification**
**Goal:** Validate staff/supervisor signatures

**Ideas:**
- Extract signature images
- Compare with stored signature template
- Flag timesheets with missing signatures
- Auto-reject if signature mismatch

---

## 🔗 **Related Files**

- **Phase 1 Implementation:** [commit 4e4ff7a](https://github.com/onebase1/acg_staff_link_3/commit/4e4ff7a)
- **OCR Function:** [supabase/functions/extract-timesheet-data/index.ts](supabase/functions/extract-timesheet-data/index.ts)
- **Quick Fixes Documentation:** [OCR_QUICK_FIXES_TESTING.md](OCR_QUICK_FIXES_TESTING.md)
- **Validation Analysis:** [OCR_VALIDATION_ANALYSIS.md](OCR_VALIDATION_ANALYSIS.md)
- **WhatsApp Handler:** [supabase/functions/whatsapp-timesheet-upload-handler/index.ts](supabase/functions/whatsapp-timesheet-upload-handler/index.ts:378-414)

---

**Generated with Claude Code**
https://claude.com/claude-code
