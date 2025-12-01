# Simplified Timesheet Workflow - What Changed

## The Problem

Your original workflow was using an **AI Agent with Google Sheets as a "tool"** which made it super complex with all those `$fromAI()` mappings. This was confusing and hard to debug.

## The Solution - 4 Simple Steps

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 1. Upload   │ ──>│ 2. OCR      │ ──>│ 3. Parse    │ ──>│ 4. Append   │
│   Image     │    │   Extract   │    │   & Split   │    │   to Sheet  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Node 1: Form Upload
- User uploads timesheet image
- **No changes needed**

### Node 2: OCR Extract (OpenAI Vision)
- OpenAI GPT-4o-mini analyzes image
- **New prompt**: Simpler, direct JSON output
- Includes fuzzy matching for client names
- Calculates hours correctly
- **Output**: Clean JSON with metadata + shifts array

### Node 3: Parse & Split Rows (Code Node)
- **NEW**: Simple JavaScript to parse JSON
- Creates ONE row per shift
- Generates timesheet_id and timestamp
- Maps all fields to your Google Sheets columns
- **Output**: Multiple items (one per shift)

### Node 4: Append to Sheet
- **SIMPLIFIED**: Direct column mapping
- No more `$fromAI()` functions
- Just simple `={{ $json.field_name }}`
- Appends each shift as a row

---

## Key Improvements

### ✅ Before (Complex)
- AI Agent trying to "figure out" how to use Google Sheets
- Confusing $fromAI() magic mappings
- Hard to debug when something fails
- Multiple Google Sheets nodes

### ✅ After (Simple)
- Direct data flow: Upload → Extract → Parse → Save
- Clear JavaScript code you can edit
- Easy to debug each step
- One Google Sheets node

---

## How to Import

1. Open n8n
2. Click **Import from File**
3. Select: `My workflow 7 - SIMPLIFIED.json`
4. Update credentials:
   - OpenAI API (already set: tFcIPTBu9oNfbJex)
   - Google Sheets (already set: ldtku0rackgdIafR)
5. Test with sample timesheet

---

## The Code Node Explained

**What it does:**
1. Takes OCR output (JSON text)
2. Cleans any markdown formatting
3. Parses into JavaScript object
4. Loops through each shift
5. Creates a row object for each shift
6. Returns array of rows to Google Sheets

**Example:**
If timesheet has 3 shifts, Code Node creates 3 items:
- Item 1: TS_001, Row 1, Jan 13, 11 hours
- Item 2: TS_001, Row 2, Jan 17, 11 hours
- Item 3: TS_001, Row 3, Jan 18, 11 hours

Each gets appended to your sheet!

---

## Testing the Workflow

### Step 1: Activate Workflow
- Click "Active" toggle in n8n

### Step 2: Open Form URL
- Click "Form Trigger" node
- Copy "Test URL"
- Open in browser

### Step 3: Upload Test Timesheet
- Upload the Dominion timesheet image
- Click Submit
- Wait 30-60 seconds

### Step 4: Check Google Sheet
- Open: [timesheet_data tab](https://docs.google.com/spreadsheets/d/1zDEOf3HDqrVriqugqDV24nc47m_TMtUi8xhBtEWK6mA/edit#gid=1362267685)
- Should see 3 new rows appear!

---

## What Happens to Your Data

### Input (Timesheet Image)
```
Staff: Theresa Atomi
Employer #: 0426065951
Client: Hampton Manor
Shift 1: 13/01/25, 20:00-08:00, 1hr break, 11hrs
Shift 2: 17/01/25, 20:00-08:00, 1hr break, 11hrs
Shift 3: 18/01/25, 20:00-08:00, 1hr break, 11hrs
```

### Output (Google Sheet Rows)
```
Row 1: TS_1733054400, Theresa Atomi, 0426065951, Hampton Manor, 2025-01-13, 20:00, 08:00, 60, 11, 11, 0, 0, PENDING, FALSE
Row 2: TS_1733054400, Theresa Atomi, 0426065951, Hampton Manor, 2025-01-17, 20:00, 08:00, 60, 11, 11, 0, 0, PENDING, FALSE
Row 3: TS_1733054400, Theresa Atomi, 0426065951, Hampton Manor, 2025-01-18, 20:00, 08:00, 60, 11, 11, 0, 0, PENDING, FALSE
```

All 3 shifts share same `timesheet_id` (TS_1733054400) but have different `row_number` and `shift_date`.

---

## Next Steps

### Immediate:
1. ✅ Test workflow with sample timesheet
2. ✅ Verify data appears in Google Sheet
3. ✅ Check all columns populated correctly

### Soon:
1. Add validation (match against expected_shifts tab)
2. Flag duplicates/fraud
3. Send confirmation email to staff

### Later:
1. Replace Google Sheets with Supabase database
2. Auto-update shift statuses
3. Generate invoices

---

## Troubleshooting

### Error: "JSON.parse failed"
**Cause:** OCR returned markdown code blocks
**Fix:** Code node already handles this with `.replace()`

### Error: "Cannot read property 'employerName'"
**Cause:** OCR didn't return expected JSON structure
**Solution:** Check "2. OCR Extract" node output to see what it returned

### No rows appearing in Google Sheet
**Check:**
1. Google Sheets credential connected?
2. Sheet ID correct: `1zDEOf3HDqrVriqugqDV24nc47m_TMtUi8xhBtEWK6mA`
3. Tab name: `timesheet_data`
4. Columns match exactly (case-sensitive)

### Hours calculated wrong
**Common issue:** Shifts crossing midnight
**Example:** 20:00 to 08:00 should be 12 hours (not -12 hours)
**Fix:** OCR prompt already handles this correctly

---

## Comparison: Old vs New

| Feature | OLD (AI Agent) | NEW (Simple) |
|---------|----------------|--------------|
| Nodes | 5 nodes | 4 nodes |
| Complexity | High (AI agent with tools) | Low (direct flow) |
| Debugging | Hard (agent decisions hidden) | Easy (see each step) |
| Speed | Slower (agent thinking) | Faster (direct execution) |
| Cost | Higher (more AI calls) | Lower (1 OCR call) |
| Mappings | `$fromAI()` magic | Direct `$json.field` |
| Editable | No (AI controlled) | Yes (edit code node) |
| Errors | Cryptic agent errors | Clear step errors |

---

## Files to Use

### For n8n:
- ✅ **My workflow 7 - SIMPLIFIED.json** ← Import this one!
- ❌ My workflow 7.json (old complex version)

### For Reference:
- LLM_SYSTEM_PROMPT.txt (full detailed prompt)
- GoogleSheetsValidation.js (Apps Script for validation)
- All CSV templates (for understanding data structure)

---

## Your Google Sheet Tabs

### Tab: timesheet_data (gid=1362267685)
- **Purpose:** Raw extracted data lands here
- **Columns:** All 27 fields from CSV template
- **Updated by:** n8n workflow (automatic)

### Tab: expected_shifts (gid=892101352)
- **Purpose:** Shifts from database to validate against
- **Columns:** shift_id, staff details, client, dates, times
- **Updated by:** You manually or via another workflow

### Tab: valid_clients (gid=1201286820)
- **Purpose:** Master list of care homes
- **Columns:** client_id, client_name, variations
- **Used by:** OCR prompt for fuzzy matching

### Tab: validation_combined (if exists)
- **Purpose:** Side-by-side comparison
- **Updated by:** Apps Script (manual trigger)

---

## Success Checklist

After importing workflow:

- [ ] Workflow imported successfully
- [ ] All nodes visible (4 total)
- [ ] Credentials connected (OpenAI, Google Sheets)
- [ ] Sheet ID correct in node 4
- [ ] Test upload works
- [ ] Data appears in timesheet_data tab
- [ ] All 27 columns populated
- [ ] Multiple shifts create multiple rows
- [ ] timesheet_id same for all rows from one upload

---

**You're ready to go! Upload a timesheet and watch it work!** 🎉
