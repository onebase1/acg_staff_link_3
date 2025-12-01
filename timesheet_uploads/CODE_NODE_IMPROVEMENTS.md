# Code Node Improvements - What Changed

## 🎯 Key Improvements

### 1. **Handles Multiple Input Structures**
```javascript
// OLD: Assumed specific structure
const rawText = $input.first().json['0'].content[0].text;

// NEW: Checks multiple possible structures
if (item.json?.['0']?.content?.[0]?.text) {
  rawText = item.json['0'].content[0].text;
} else if (item.json?.content?.[0]?.text) {
  rawText = item.json.content[0].text;
} else if (item.json?.text) {
  rawText = item.json.text;
} else if (typeof item.json === 'string') {
  rawText = item.json;
}
```

### 2. **Better JSON Cleaning**
```javascript
// Removes:
- ```json code blocks
- Everything before first {
- Everything after last }
- Newlines, tabs, extra spaces
- Invalid characters
```

### 3. **Proper Error Handling**
```javascript
// Instead of crashing, returns detailed error objects:
{
  error: true,
  error_type: 'JSON_PARSE_FAILED',
  error_message: 'Unexpected token...',
  raw_text_preview: 'First 200 chars...',
  cleaned_text_preview: 'Cleaned JSON preview...'
}
```

### 4. **Validates Data Structure**
```javascript
// Checks:
✓ timesheetMetadata exists
✓ shifts is an array
✓ Required fields present

// If invalid, returns helpful error
```

### 5. **Flattened Output Format**
```javascript
// OLD: Nested structure hard to map
{
  metadata: { name: "...", ... },
  shift: { date: "...", ... }
}

// NEW: Flat structure easy to drag-and-drop
{
  timesheet_id: "TS_123",
  staff_name_raw: "John Doe",
  shift_date: "13/01/25",
  hours_calculated: 11,
  ...all fields at root level
}
```

### 6. **Automatic Validation**
```javascript
// Auto-calculates needs_review flag
needs_review: Boolean(
  clientMatchConfidence < 70 ||      // Low confidence
  Math.abs(hoursDiscrepancy) > 0.5 || // Hours mismatch
  !supervisorSignaturePresent        // Missing signature
)

// Auto-generates validation notes
validation_notes: "Low confidence: 65%; Missing supervisor signature"
```

---

## 📊 Output Format Comparison

### OLD Output (Hard to Use)
```javascript
{
  json: {
    timesheetMetadata: {
      employerName: "John",
      clientMatchConfidence: 85,
      // ... nested
    },
    shifts: [{
      rowNumber: 1,
      shiftDate: "13/01/25",
      // ... nested
    }]
  }
}
```

**Problem:** You'd have to write expressions like:
```
={{ $json.timesheetMetadata.employerName }}
={{ $json.shifts[0].shiftDate }}
```

---

### NEW Output (Easy to Use)
```javascript
[
  {
    json: {
      timesheet_id: "TS_1733054400_abc12",
      upload_timestamp: "2025-12-01T10:30:00.000Z",
      staff_name_raw: "John Doe",
      staff_title: "Mr",
      employer_number: "123456",
      client_name_raw: "Hampton Manor",
      client_name_matched: "Hampton Manor",
      client_match_confidence: 85,
      row_number: 1,
      shift_date: "13/01/25",
      shift_date_parsed: "2025-01-13",
      start_time: "20:00",
      end_time: "08:00",
      hours_calculated: 11,
      hours_claimed: 11,
      validation_status: "PENDING",
      needs_review: false,
      validation_notes: ""
    }
  },
  {
    json: {
      timesheet_id: "TS_1733054400_abc12",  // Same ID
      upload_timestamp: "2025-12-01T10:30:00.000Z",
      staff_name_raw: "John Doe",
      // ... row 2 data
      row_number: 2,
      shift_date: "17/01/25",
      // ...
    }
  },
  {
    json: {
      // ... row 3 data
      row_number: 3,
      shift_date: "18/01/25",
      // ...
    }
  }
]
```

**Benefit:** Simple drag-and-drop in Google Sheets:
```
={{ $json.staff_name_raw }}
={{ $json.shift_date }}
={{ $json.hours_calculated }}
```

---

## 🔧 How to Use This Code

### Step 1: Copy the Code
Open: [IMPROVED_CODE_NODE.js](IMPROVED_CODE_NODE.js)

### Step 2: Update Your Workflow
1. In n8n, open your workflow
2. Click on **"3. Parse & Split Rows"** node
3. Delete all existing code
4. Paste the improved code
5. Save

### Step 3: Update Google Sheets Node
The output is now flat, so mapping is easier:

**Change to "Map Automatically"** or use these simple expressions:

```
timesheet_id          → ={{ $json.timesheet_id }}
staff_name_raw        → ={{ $json.staff_name_raw }}
shift_date_parsed     → ={{ $json.shift_date_parsed }}
hours_calculated      → ={{ $json.hours_calculated }}
```

No more nested access needed!

---

## 🐛 Error Output Examples

### Error Type 1: JSON Parse Failed
```json
{
  "error": true,
  "error_type": "JSON_PARSE_FAILED",
  "error_message": "Unexpected token } in JSON at position 245",
  "raw_text_preview": "The image shows a timesheet from Dominion...",
  "cleaned_text_preview": "{\"timesheetMetadata\":{\"employerName\":..."
}
```

**Action:** Check the `cleaned_text_preview` to see what JSON looked like before parsing failed.

---

### Error Type 2: Invalid Structure
```json
{
  "error": true,
  "error_type": "INVALID_STRUCTURE",
  "error_message": "Missing timesheetMetadata",
  "received_keys": "data, shifts, metadata",
  "data_preview": "{\"data\":{...},\"shifts\":[...]}"
}
```

**Action:** OCR returned wrong structure. Update OCR prompt to match expected format.

---

### Error Type 3: Missing Shifts Array
```json
{
  "error": true,
  "error_type": "INVALID_STRUCTURE",
  "error_message": "Missing or invalid shifts array",
  "received_shifts": "{\"rowNumber\":1,\"date\":\"13/01/25\"}"
}
```

**Action:** OCR returned shifts as object instead of array. Fix OCR prompt.

---

## ✅ Success Output Example

When it works, you'll see multiple items (one per shift):

**Item 1:**
```json
{
  "timesheet_id": "TS_1733054400_abc12",
  "upload_timestamp": "2025-12-01T10:30:00.000Z",
  "staff_name_raw": "Theresa Atomi",
  "staff_title": "Ms",
  "employer_number": "0426065951",
  "job_title_raw": "Care Assistant",
  "client_name_raw": "Hampton Manor",
  "client_name_matched": "Hampton Manor",
  "client_match_confidence": 95,
  "week_beginning": "",
  "employee_signature": "T",
  "supervisor_signature_present": true,
  "supervisor_signature_date": "19.01.25",
  "row_number": 1,
  "shift_date": "13/01/25",
  "shift_date_parsed": "2025-01-13",
  "start_time": "20:00",
  "end_time": "08:00",
  "break_minutes": 60,
  "hours_calculated": 11,
  "hours_claimed": 11,
  "hours_discrepancy": 0,
  "overtime_hours": 0,
  "validation_status": "PENDING",
  "needs_review": false,
  "validation_notes": "",
  "original_document_url": ""
}
```

**Item 2, 3:** Same structure with different shift data

---

## 🎨 Visual Flow

```
INPUT (from OCR)
    ↓
┌─────────────────────────────┐
│ Handle Multiple Structures  │
│ ✓ json['0'].content[0].text │
│ ✓ json.content[0].text      │
│ ✓ json.text                 │
│ ✓ string                    │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ Clean JSON                  │
│ • Remove markdown           │
│ • Remove extra text         │
│ • Normalize whitespace      │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ Parse JSON                  │
│ Try: JSON.parse()           │
│ Fallback: Regex extraction  │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ Validate Structure          │
│ ✓ Has timesheetMetadata?    │
│ ✓ Has shifts array?         │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ Generate IDs                │
│ • Unique timesheet_id       │
│ • ISO timestamp             │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ Flatten to Rows             │
│ • One item per shift        │
│ • All fields at root level  │
│ • Easy to map               │
└─────────────────────────────┘
    ↓
OUTPUT (3 items for 3 shifts)
```

---

## 📝 Testing Checklist

After updating the code node:

- [ ] Code pasted correctly
- [ ] No syntax errors
- [ ] Execute workflow
- [ ] Check node output shows flat structure
- [ ] Verify all fields present
- [ ] Test with 1-row timesheet
- [ ] Test with 3-row timesheet
- [ ] Verify unique timesheet_id for all rows from same upload
- [ ] Check Google Sheets receives data
- [ ] Validate all 27 columns populated

---

## 🚀 Next Steps

1. **Update node 3** with improved code
2. **Test workflow** with sample timesheet
3. **Check output format** - should be flat and draggable
4. **Update Google Sheets mapping** - use auto-map or simple expressions
5. **Verify data appears** in your sheet

---

## 💡 Pro Tips

### Tip 1: Use Auto-Mapping
In Google Sheets node, change to "Map Automatically" - it will detect all fields automatically!

### Tip 2: Debug Mode
If errors occur, check the node output - error objects contain:
- Exact error message
- Preview of raw/cleaned text
- Data structure received

### Tip 3: Multiple Items = Multiple Shifts
Remember: 1 timesheet with 3 shifts = 3 output items = 3 Google Sheet rows

### Tip 4: Unique IDs
All shifts from one upload share the same `timesheet_id` but have different `row_number` values.

---

**Ready to test!** Copy the improved code and see the difference. 🎉
