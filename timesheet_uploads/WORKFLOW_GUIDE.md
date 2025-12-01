# Timesheet Upload Workflow Guide

## 📁 Files Created

### Data Files (CSV)
1. **EXTRACTED_TIMESHEETS.csv** - Output from OCR + LLM extraction
2. **EXPECTED_SHIFTS.csv** - Shifts from database to validate against
3. **VALIDATION_COMBINED.csv** - Side-by-side comparison template
4. **VALID_CLIENTS.csv** - Master client list for fuzzy matching

### Implementation Files
5. **LLM_SYSTEM_PROMPT.txt** - Prompt for your LLM extraction step
6. **GoogleSheetsValidation.js** - Apps Script for Google Sheets automation
7. **README.md** - Detailed documentation
8. **WORKFLOW_GUIDE.md** - This file

---

## 🔄 Complete Workflow

### Phase 1: Image Upload & OCR (Current)

```
┌─────────────────┐
│ Staff uploads   │
│ paper timesheet │
│ (photo/scan)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ OCR Reader      │
│ (Mistral/OpenAI)│
│ Extract text    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Extracted Text  │
│ (raw OCR output)│
└─────────────────┘
```

**Your current setup:**
- Upload node ✓
- OCR reader ✓
- Extracted text output ✓

---

### Phase 2: LLM Structuring (Next Step)

```
┌─────────────────┐
│ Extracted Text  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ LLM (GPT-4o-mini)               │
│ + System Prompt                 │
│ + Valid Clients List            │
│ → Parse & Structure             │
│ → Fuzzy match client names      │
│ → Calculate hours               │
│ → Flag issues                   │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Structured JSON │
│ {metadata,      │
│  shifts: [...]} │
└─────────────────┘
```

**Setup:**
1. Add LLM node after OCR
2. Use **LLM_SYSTEM_PROMPT.txt** as system message
3. Replace `{CLIENT_LIST_PLACEHOLDER}` with actual client names from VALID_CLIENTS.csv
4. Input: Raw OCR text
5. Output: Structured JSON

---

### Phase 3: CSV Export (Testing)

```
┌─────────────────┐
│ Structured JSON │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parse JSON      │
│ Create CSV rows │
│ (1 row per shift)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Append to       │
│ Google Sheet    │
└─────────────────┘
```

**CSV Row Format:**
```
timesheet_id,upload_timestamp,staff_name_raw,staff_title,employer_number,job_title_raw,client_name_raw,client_name_matched,client_match_confidence,week_beginning,row_number,shift_date,shift_date_parsed,start_time,end_time,break_minutes,hours_calculated,hours_claimed,hours_discrepancy,overtime_hours,employee_signature,supervisor_signature_present,supervisor_signature_date,validation_status,needs_review,validation_notes,original_document_url
```

---

### Phase 4: Validation in Google Sheets

```
┌──────────────────┐     ┌──────────────────┐
│ Extracted        │     │ Expected Shifts  │
│ Timesheets       │     │ (from database)  │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         └───────────┬────────────┘
                     │
                     ▼
         ┌──────────────────────┐
         │ Apps Script          │
         │ → Match by date +    │
         │   employer_number    │
         │ → Validate times     │
         │ → Check client       │
         │ → Flag issues        │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Validation Results   │
         │ ✓ APPROVED           │
         │ ⚠ NEEDS_REVIEW       │
         │ ❌ NO_MATCH          │
         └──────────────────────┘
```

**Setup:**
1. Create Google Sheet with 4 tabs (Extracted, Expected, Validation, Clients)
2. Import CSV templates
3. Add **GoogleSheetsValidation.js** script
4. Run validation functions from custom menu

---

### Phase 5: Database Integration (Future)

```
┌──────────────────┐
│ Approved         │
│ Timesheets       │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│ Supabase Edge Function       │
│ → Insert into timesheets     │
│ → Update shifts              │
│   (timesheet_received=true)  │
│ → Link to invoices           │
│ → Trigger notifications      │
└──────────┬───────────────────┘
         │
         ▼
┌──────────────────┐
│ Database Updated │
│ → timesheets     │
│ → shifts         │
│ → invoices       │
└──────────────────┘
```

---

## 🧪 Testing Checklist

### Test Case 1: Perfect Timesheet
- ✓ All fields filled correctly
- ✓ Client name exact match
- ✓ Hours calculated correctly
- ✓ Supervisor signature present
- ✓ Shifts exist in database

**Expected:** `APPROVED` status, no review needed

---

### Test Case 2: Messy Handwriting
- ⚠ Client name: "Hamton Mnr" (misspelled)
- ✓ Everything else correct

**Expected:**
- LLM fuzzy matches to "Hampton Manor"
- Confidence: 75-85%
- Status: `NEEDS_REVIEW` if confidence <70%, otherwise `APPROVED`

---

### Test Case 3: Calculation Error
- ✓ Start: 20:00, End: 08:00, Break: 1hr
- ❌ Staff wrote: 12 hours (incorrect)
- ✓ Actual: 11 hours

**Expected:**
- `hoursCalculated`: 11
- `hoursClaimed`: 12
- `hoursDiscrepancy`: -1
- `needsReview`: TRUE
- Status: `NEEDS_REVIEW`
- Note: "Staff miscalculated hours: claimed 12 but actually 11"

---

### Test Case 4: Fraud Detection
- Staff submits timesheet for shift they weren't assigned
- Date exists but employer_number doesn't match

**Expected:**
- Status: `❌ NO_MATCH`
- `needsReview`: TRUE
- Note: "No matching shift found in database - possible fraud or incorrect date"

---

### Test Case 5: Duplicate Shifts
- Staff submits 2 timesheets for same date
- Trying to claim hours at 2 places same day

**Expected:**
- Apps Script detects duplicate
- Alert: "FRAUD ALERT: Same staff, same date"
- Both rows flagged

---

## 📊 Google Sheets Setup

### 1. Create Sheet Structure

**Tab 1: Extracted**
- Import: EXTRACTED_TIMESHEETS.csv
- This tab grows as you process timesheets

**Tab 2: Expected**
- Import: EXPECTED_SHIFTS.csv
- Query this from your database weekly
- Shows all shifts needing timesheets

**Tab 3: Validation**
- Import: VALIDATION_COMBINED.csv (template)
- Auto-populated by Apps Script
- Color-coded results

**Tab 4: Clients**
- Import: VALID_CLIENTS.csv
- Master list for reference

---

### 2. Add Apps Script

1. Extensions > Apps Script
2. Paste **GoogleSheetsValidation.js**
3. Save as "Timesheet Validator"
4. Run `onOpen` function
5. Refresh sheet - new menu appears

---

### 3. Custom Menu

After setup, you'll see:
```
Timesheet Validation ▼
  ├─ Validate All Timesheets
  ├─ Match Against Expected Shifts
  ├─ Flag Issues
  └─ Export Approved Timesheets
```

---

### 4. Conditional Formatting

**Automatic formatting:**
- 🟢 Green: `APPROVED` status
- 🟡 Yellow: `NEEDS_REVIEW` = TRUE
- 🔴 Red: `NO_MATCH` status

**Manual formatting (optional):**
- Confidence <70%: Orange background
- Hours discrepancy >0.5: Yellow text
- No supervisor signature: Red text

---

## 🔍 Validation Logic

### Date Matching
```javascript
// Must match exactly
extractedRow.shift_date_parsed === expectedShift.shift_date_parsed
extractedRow.employer_number === expectedShift.employer_number
```

### Time Validation (±15 min tolerance)
```javascript
const tolerance = 15; // minutes
startTimeDiff = abs(actual - expected)
if (startTimeDiff <= tolerance) ✓
```

### Client Validation
```javascript
if (clientMatched === expectedClient && confidence >= 70) ✓
else ⚠
```

### Hours Validation (±0.5 hr tolerance)
```javascript
hoursDiff = abs(hoursCalculated - expectedDuration)
if (hoursDiff <= 0.5) ✓
```

---

## 📈 Example Workflow Run

### Input: Paper Timesheet
- Staff: Theresa Atomi
- Client: "Hamton Mnr" (handwritten)
- 3 shifts: Jan 13, 17, 18
- All 11 hours each

### Step 1: OCR
```
EMPLOYER NAME: Theresa Atomi
JOB TITLE: Care Assistant
PLACE OF WORK: Hamton Mnr
...
```

### Step 2: LLM Extraction
```json
{
  "timesheetMetadata": {
    "employerName": "Theresa Atomi",
    "employerNumber": "0426065951",
    "placeOfWorkRaw": "Hamton Mnr",
    "placeOfWorkMatched": "Hampton Manor",
    "clientMatchConfidence": 85
  },
  "shifts": [
    { "rowNumber": 1, "shiftDate": "13/01/25", ... },
    { "rowNumber": 2, "shiftDate": "17/01/25", ... },
    { "rowNumber": 3, "shiftDate": "18/01/25", ... }
  ]
}
```

### Step 3: CSV Export
3 rows added to Google Sheet

### Step 4: Validation Script
```
Checking shift 1... ✓ MATCH FOUND
Checking shift 2... ✓ MATCH FOUND
Checking shift 3... ✓ MATCH FOUND

All validations passed!
Client fuzzy matched: 85% confidence
Status: NEEDS_REVIEW (due to confidence <90%)
```

### Step 5: Manual Review
Admin checks row in sheet:
- Client match looks correct ✓
- Hours match expected ✓
- Approve manually

### Step 6: Export
Click "Export Approved Timesheets"
→ Creates "Approved_For_Database" tab
→ Ready to import to Supabase

---

## 🚀 Next Steps

### Immediate (Google Sheets Testing):
1. ✅ Upload test timesheet
2. ✅ Get OCR output
3. ✅ Run through LLM with prompt
4. ✅ Parse JSON to CSV format
5. ✅ Import to Google Sheets
6. ✅ Run validation script
7. ✅ Verify matching works

### Short-term (Automation):
1. Connect workflow directly to Google Sheets API
2. Auto-append new extractions
3. Auto-fetch expected shifts from Supabase
4. Email alerts for fraud/issues

### Long-term (Full Integration):
1. Create Supabase Edge Function
2. Direct database insertion
3. Auto-update shift statuses
4. Trigger invoice generation
5. Send confirmation to staff

---

## 🛠️ Troubleshooting

### LLM returns invalid JSON
- Check for markdown code blocks in output
- Add "Return ONLY valid JSON" to prompt
- Use `.replace(/```json\n?/g, '').replace(/```\n?/g, '')` to clean

### Client matching always low confidence
- Add more variations to VALID_CLIENTS.csv
- Include common misspellings
- Lower threshold to 60% for testing

### Hours calculation wrong
- Check if shift crosses midnight (end < start)
- Verify break conversion (1 hr = 60 min)
- Test edge cases (23:00 to 07:00, etc.)

### No matches found
- Verify employer_number format matches
- Check date parsing (DD/MM/YY vs YYYY-MM-DD)
- Ensure expected shifts date range includes test dates

---

## 📞 Support

Issues? Questions? Check:
1. README.md for detailed docs
2. Console logs in Apps Script
3. Sample data in CSV templates
4. Validation notes column for specific errors

---

**Ready to test?** Start with uploading a single timesheet image and follow the workflow! 🎉
