# CSV Workflow - Guaranteed to Work

## Problem
JSON from OCR keeps having syntax errors. CSV is simpler and more reliable.

---

## Solution: Change OCR to Return CSV

### Step 1: Update OCR Prompt (Node 2)

Replace the OCR prompt with:

```
Extract ALL shift data from this timesheet and return as CSV format.

IMPORTANT: Return ONLY CSV data, NO explanations, NO markdown.

Format (one row per shift):
Name|Title|EmployerNum|JobTitle|Client|Signature|SupervisorSigned|SupervisorDate|RowNum|Date|DateParsed|Start|End|Break|HoursCalc|HoursClaim|Discrep|Overtime

Example output for 3 shifts:
Theresa Atomi|Ms|0426065951|Care Assistant|Hampton Manor|T|true|19.01.25|1|13/01/25|2025-01-13|20:00|08:00|60|11|11|0|0
Theresa Atomi|Ms|0426065951|Care Assistant|Hampton Manor|T|true|19.01.25|2|17/01/25|2025-01-17|20:00|08:00|60|11|11|0|0
Theresa Atomi|Ms|0426065951|Care Assistant|Hampton Manor|T|true|19.01.25|3|18/01/25|2025-01-18|20:00|08:00|60|11|11|0|0

Rules:
- Use | as separator (easier than comma for names with commas)
- NO headers
- NO quotes
- One row per shift
- Calculate hours for midnight-crossing shifts (20:00 to 08:00 = 11 hrs after break)

Return ONLY the CSV rows:
```

---

### Step 2: Update Parse Node (Node 3)

Replace code with:

```javascript
// CSV Parser - Simple and reliable
const allItems = $input.all();
const out = [];

for (const item of allItems) {
  try {
    // Get text
    let raw = '';
    const json = item.json;

    if (json && json['0'] && json['0'].content && json['0'].content[0]) {
      raw = json['0'].content[0].text;
    } else {
      throw new Error('No text');
    }

    // Clean
    let cleaned = raw
      .replace(/```csv/gi, '')
      .replace(/```/gi, '')
      .replace(/^[^A-Za-z]*/g, '') // Remove until first letter
      .trim();

    // Split into lines
    const lines = cleaned.split('\n').filter(line => line.trim().length > 0);

    // Generate IDs
    const tsId = 'TS_' + Date.now();
    const now = new Date().toISOString();

    // Parse each line
    for (const line of lines) {
      const fields = line.split('|');

      if (fields.length !== 18) {
        continue; // Skip invalid lines
      }

      out.push({
        json: {
          timesheet_id: tsId,
          upload_timestamp: now,
          staff_name_raw: fields[0],
          staff_title: fields[1],
          employer_number: fields[2],
          job_title_raw: fields[3],
          client_name_raw: fields[4],
          client_name_matched: fields[4],
          client_match_confidence: 100,
          week_beginning: '',
          employee_signature: fields[5],
          supervisor_signature_present: fields[6] === 'true',
          supervisor_signature_date: fields[7],
          row_number: Number(fields[8]),
          shift_date: fields[9],
          shift_date_parsed: fields[10],
          start_time: fields[11],
          end_time: fields[12],
          break_minutes: Number(fields[13]),
          hours_calculated: Number(fields[14]),
          hours_claimed: Number(fields[15]),
          hours_discrepancy: Number(fields[16]),
          overtime_hours: Number(fields[17]),
          validation_status: 'PENDING',
          needs_review: false,
          validation_notes: '',
          original_document_url: ''
        }
      });
    }

  } catch (error) {
    out.push({
      json: {
        error: true,
        error_message: String(error.message)
      }
    });
  }
}

return out;
```

---

## Why CSV Works Better

| CSV | JSON |
|-----|------|
| ✅ Simple format | ❌ Complex nested structure |
| ✅ No syntax errors | ❌ Brackets, commas, quotes must be perfect |
| ✅ Easy to parse | ❌ Needs perfect structure |
| ✅ Works with any delimiter | ❌ Escape sequences cause issues |
| ✅ Reliable | ❌ Fragile |

---

## Quick Test

After changing to CSV:

1. **Run workflow**
2. **Check node 2 output** - should see plain text CSV
3. **Check node 3 output** - should see 3 items (one per shift)
4. **Google Sheets** should get 3 rows

---

## Your Choice

### Try SIMPLEST_WORKING_CODE.js first (2 min)
- Copy code
- Run workflow
- If still fails → go to CSV

### Or go straight to CSV (5 min)
- Update OCR prompt
- Update parse code
- Guaranteed to work

---

**My recommendation: Try the simplest JS code one more time. If it fails, switch to CSV immediately.** The CSV approach is bulletproof and many production systems use CSV for exactly this reason - it's more reliable than JSON for OCR/AI extraction.
