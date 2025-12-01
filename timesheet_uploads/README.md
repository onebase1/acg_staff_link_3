# Timesheet Upload & Validation System

## CSV Files Overview

### 1. EXTRACTED_TIMESHEETS.csv
**Purpose:** Raw data extracted from uploaded timesheet images via OCR + LLM

**Key Columns:**
- `timesheet_id` - Unique ID for each uploaded timesheet document
- `row_number` - Row position (1, 2, 3...) - each row = unique shift
- `shift_date_parsed` - ISO date format for database matching
- `hours_calculated` - System calculated hours
- `hours_claimed` - What staff claimed on timesheet
- `hours_discrepancy` - Difference (flags calculation errors)
- `client_match_confidence` - 0-100 score for fuzzy matching
- `needs_review` - Boolean flag for manual review

**One row per shift** - if timesheet has 3 shifts, you'll see 3 rows with same `timesheet_id`

---

### 2. EXPECTED_SHIFTS.csv
**Purpose:** Shifts from your database that staff should be submitting timesheets for

**Key Columns:**
- `shift_id` - Database shift ID
- `employer_number` - Links to staff
- `shift_date_parsed` - For matching with extracted data
- `already_has_timesheet` - Prevents duplicate submissions

**Use Case:** Match extracted timesheet rows against these expected shifts to:
- Validate the shift actually existed
- Detect fraud (submitting for shifts they weren't assigned)
- Identify missing timesheets

---

### 3. VALIDATION_COMBINED.csv
**Purpose:** Side-by-side comparison for Google Sheets testing

**Workflow:**
1. Import extracted timesheet data (left columns)
2. Use VLOOKUP or scripts to find matching expected shift (right columns)
3. Compare:
   - ✓ Date matches?
   - ✓ Time matches (within tolerance)?
   - ✓ Client matches?
   - ✓ Hours reasonable?
4. Flag rows needing manual review

**Google Sheets Formulas (examples):**
```
// Match status based on date + employer number
=IF(VLOOKUP(D2&E2, ExpectedShifts!$B$2:$C$100, 1, FALSE), "MATCHED", "NO_MATCH")

// Flag time discrepancies
=IF(ABS(I2 - P2) > 0.5, "REVIEW", "OK")

// Client name match
=IF(K2 = N2, "✓", "⚠")
```

---

### 4. VALID_CLIENTS.csv
**Purpose:** Master list of care homes for fuzzy matching

**Columns:**
- `client_name` - Official name
- `common_variations` - Known misspellings/abbreviations

**Usage:**
- Feed this list to the LLM prompt in the `{CLIENT_LIST_PLACEHOLDER}` section
- LLM will fuzzy match handwritten client names against this list
- Helps handle messy handwriting: "Hamton Mnr" → "Hampton Manor"

---

## Google Sheets Testing Workflow

### Setup Steps:

1. **Create a new Google Sheet with 4 tabs:**
   - Tab 1: "Extracted" (import EXTRACTED_TIMESHEETS.csv)
   - Tab 2: "Expected" (import EXPECTED_SHIFTS.csv)
   - Tab 3: "Validation" (import VALIDATION_COMBINED.csv)
   - Tab 4: "Clients" (import VALID_CLIENTS.csv)

2. **Add Conditional Formatting:**
   - Red: `needs_review = TRUE`
   - Yellow: `client_match_confidence < 80`
   - Green: `match_status = MATCHED`

3. **Add Matching Formula in Validation tab:**
   ```
   =ARRAYFORMULA(IF(D2:D="",,
     IFERROR(
       VLOOKUP(D2:D&E2:E,
         {Expected!$D$2:$D&Expected!$E$2:$E, Expected!$A$2:$J},
         2, FALSE),
       "NO_MATCH"
     )
   ))
   ```

4. **Test the Process:**
   - Upload a timesheet image
   - Get LLM JSON output
   - Parse JSON into CSV row format
   - Add rows to "Extracted" tab
   - Watch formulas auto-populate "Validation" tab
   - Review flagged rows manually

---

## Critical Validation Rules

### ✓ MUST MATCH:
- Staff employer_number
- Shift date (exact)
- Client name (within confidence threshold)

### ⚠ TOLERANCE ALLOWED:
- Start/end time ±15 minutes (staff may arrive early/late)
- Break duration ±15 minutes
- Hours worked ±0.5 (accounting for rounding)

### 🚫 AUTO-REJECT:
- Shift doesn't exist in database
- Staff worked at 2 places same day (duplicate dates)
- Hours >13 or <0 (impossible)
- No supervisor signature
- Client match confidence <60%

---

## Next Steps After Google Sheets Testing

Once validated in Sheets, you'll:

1. **Create Supabase Edge Function:** Parse LLM JSON → Insert to `timesheets` table
2. **Match shifts:** Query expected shifts by `staff_id + shift_date`
3. **Update shift status:** Mark shift as "timesheet_received"
4. **Calculate pay:** Use `hours_calculated` (not `hours_claimed` if different)
5. **Fraud detection:** Check if same staff has overlapping shifts
6. **Generate invoice line items:** Link timesheet to invoice

---

## Example: Processing the Sample Timesheet

**Input:** Timesheet image for Theresa Atomi, 3 shifts at Hampton Manor

**LLM Extracted:**
- Row 1: 13/01/25, 20:00-08:00, 11 hrs
- Row 2: 17/01/25, 20:00-08:00, 11 hrs
- Row 3: 18/01/25, 20:00-08:00, 11 hrs

**Database Lookup:**
- Query: `SELECT * FROM shifts WHERE staff.employer_number = '0426065951' AND shift_date IN ('2025-01-13', '2025-01-17', '2025-01-18')`
- Result: 3 matching shifts found ✓

**Validation:**
- ✓ All 3 dates exist in database
- ✓ Client matches (Hampton Manor, 95% confidence)
- ✓ Times match scheduled times
- ⚠ Week beginning blank (flag for review but not critical)
- ✓ Supervisor signed

**Action:**
- Auto-approve all 3 shifts
- Update database: `shift.timesheet_received = TRUE`
- Create 3 timesheet records
- Add to invoice queue

---

## Files Location
`/timesheet_uploads/`
- EXTRACTED_TIMESHEETS.csv
- EXPECTED_SHIFTS.csv
- VALIDATION_COMBINED.csv
- VALID_CLIENTS.csv
