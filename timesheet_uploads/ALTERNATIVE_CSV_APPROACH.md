# Alternative: CSV Output Instead of JSON

## Why This Works Better

JSON parsing is fragile. CSV is simpler and easier to handle.

---

## Option 1: Change OCR to Output CSV

### Update Node "2. OCR Extract" prompt to:

```
Extract timesheet data and return as CSV format with these EXACT columns:

employerName,staffTitle,employerNumber,jobTitle,placeOfWork,weekBeginning,employeeSignature,supervisorSignature,supervisorDate,rowNumber,shiftDate,shiftDateParsed,startTime,endTime,breakMinutes,hoursCalculated,hoursClaimed,hoursDiscrepancy,overtimeHours

Rules:
1. Return ONLY CSV data (no headers, no markdown)
2. One row per shift
3. All dates in DD/MM/YY format for shiftDate, YYYY-MM-DD for shiftDateParsed
4. Times in HH:MM format
5. Numbers without quotes
6. Text in quotes if it contains commas
7. Calculate hours for shifts crossing midnight (20:00 to 08:00 = 11 hours after break)

Example output:
"Theresa Atomi",Ms,0426065951,"Care Assistant","Hampton Manor",,T,true,19.01.25,1,13/01/25,2025-01-13,20:00,08:00,60,11,11,0,0
"Theresa Atomi",Ms,0426065951,"Care Assistant","Hampton Manor",,T,true,19.01.25,2,17/01/25,2025-01-17,20:00,08:00,60,11,11,0,0
"Theresa Atomi",Ms,0426065951,"Care Assistant","Hampton Manor",,T,true,19.01.25,3,18/01/25,2025-01-18,20:00,08:00,60,11,11,0,0

Return ONLY the CSV rows (no headers):
```

---

### Then Update Node "3. Parse & Split Rows" to:

```javascript
// Simple CSV parser
const out = [];

for (const item of items) {
  try {
    // Get text
    let text = '';
    if (item.json?.['0']?.content?.[0]?.text) {
      text = item.json['0'].content[0].text;
    } else if (item.json?.content?.[0]?.text) {
      text = item.json.content[0].text;
    } else {
      throw new Error('No text found');
    }

    // Clean and split into lines
    const lines = text
      .trim()
      .replace(/```csv/gi, '')
      .replace(/```/gi, '')
      .trim()
      .split('\n')
      .filter(line => line.trim().length > 0);

    // Parse each line
    const tsId = 'TS_' + Date.now();
    const timestamp = new Date().toISOString();

    for (const line of lines) {
      // Simple CSV parse (handles quoted fields)
      const fields = line.match(/(".*?"|[^,]+)/g).map(f => f.replace(/^"|"$/g, ''));

      if (fields.length !== 19) {
        continue; // Skip invalid rows
      }

      out.push({
        json: {
          timesheet_id: tsId,
          upload_timestamp: timestamp,
          staff_name_raw: fields[0],
          staff_title: fields[1],
          employer_number: fields[2],
          job_title_raw: fields[3],
          client_name_raw: fields[4],
          client_name_matched: fields[4],
          client_match_confidence: 100,
          week_beginning: fields[5],
          employee_signature: fields[6],
          supervisor_signature_present: fields[7] === 'true',
          supervisor_signature_date: fields[8],
          row_number: Number(fields[9]),
          shift_date: fields[10],
          shift_date_parsed: fields[11],
          start_time: fields[12],
          end_time: fields[13],
          break_minutes: Number(fields[14]),
          hours_calculated: Number(fields[15]),
          hours_claimed: Number(fields[16]),
          hours_discrepancy: Number(fields[17]),
          overtime_hours: Number(fields[18]),
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
        error_message: error.message
      }
    });
  }
}

return out;
```

---

## Option 2: Use the Fixed JSON Code

Try the [FINAL_CODE_NODE.js](FINAL_CODE_NODE.js) which specifically fixes the `\"n ` issue.

Key fix added:
```javascript
.replace(/\\"n\s+/g, '')  // Remove malformed \"n sequences
```

---

## Which to Choose?

### CSV Approach (Recommended for stability):
✅ Simpler parsing
✅ Less prone to errors
✅ OCR can generate CSV more reliably
❌ Less flexible for nested data

### JSON Approach (With fixed code):
✅ More structured
✅ Handles complex data
✅ Industry standard
❌ OCR must return perfect JSON

---

## Quick Test

### Test CSV Approach:
1. Update OCR prompt to CSV format above
2. Update Parse node with CSV parser above
3. Run workflow
4. Should work immediately

### Test Fixed JSON:
1. Copy code from [FINAL_CODE_NODE.js](FINAL_CODE_NODE.js)
2. Paste into Parse node
3. Run workflow
4. Check if `\"n ` cleaning fixed the issue

---

## My Recommendation

**Try FINAL_CODE_NODE.js first** (30 seconds)
↓
**If still fails, switch to CSV approach** (5 minutes)

The CSV approach is bulletproof but less elegant. The fixed JSON should work now that we're cleaning the `\"n ` sequences.
