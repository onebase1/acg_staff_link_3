# Technical Specifications: Multi-Shift Batch Logic

This document provides the technical requirements and pseudo-logic for implementing the "Contextual Fan-Out" update.

## 1. Database Query: "The Fetch"
When a document is uploaded, the frontend should not only fetch the current shift but all "Addressable Shifts" for that staff member.

**Logic:**
```javascript
const { data: addressableShifts } = await supabase
  .from('timesheets')
  .select('*, shift:shifts(*)')
  .eq('staff_id', currentStaffId)
  .in('status', ['draft', 'pending_admin_review']) // Only update non-final records
  .gte('shift_date', minDateFromOCR)
  .lte('shift_date', maxDateFromOCR);
```

## 2. Reconciliation: "The Match"
Loop through the `rows` extracted by OCR and find the corresponding record in `addressableShifts`.

**Criteria for Match:**
- `row.date === shift.shift_date`
- `row.client === shift.client.name` (optional but recommended for strictly avoiding wrong-client uploads)

## 3. The "Already Updated" Logic
Before populating, the system MUST compare OCR data with existing DB values:
- **Case: Matched & Identical**: If `DB.total_hours === OCR.total_hours` AND `DB.actual_start_time === OCR.start_time`, mark as **"Already Up-to-Date"**.
    - *Action*: Show in UI but default to unselected (no update needed).
- **Case: Matched & Conflicting**: If dates match but hours/times differ, mark as **"Conflict / Update Available"**.
    - *Action*: Highlight the difference and allow user to overwrite DB with OCR.
- **Case: Not Found**: If date exists on OCR but NOT in fetched shifts, mark as **"Missing Shift"**.
    - *Action*: Prompt user to create shift or check for different staff.

## 4. Test Case Library (Navya Scenarios)

### Case A: The "Split" Sheet (26/01 & 28/01)
- **Current DB State**: 28/01 is already populated (11h). 26/01 is Draft (Empty).
- **Expected Behavior**: System flags 28/01 as "Already Up-to-Date" and automatically focuses/selects 26/01 for the update.

### Case B: The "New" Sheet (24/01 & 25/01)
- **Current DB State**: Both 24/01 and 25/01 are Draft (Empty).
- **Expected Behavior**: System detects both rows, matches them to the 24th/25th shifts, and offers to update both in one click.

## 4. User Interaction: "The Selection"
The UI should present a checklist to the user:
- [x] **2026-01-19 (Richmond Court)**: Detected 11h. Matches database. (Already updated)
- [x] **2026-01-20 (Richmond Court)**: Detected 11h. Matches database. (Already updated)
- [ ] **2026-01-21 (Richmond Court)**: Detected 11h. **DB currently shows 12h.** -> *Check to Update*.

## 5. The "Batch Save" Operation
When the user clicks "Confirm All", execute a batch update.

**Pseudo-code:**
```javascript
const updates = selectedShifts.map(s => {
  const finalData = calculateFinalData(s.ocrRow, s.shiftDate);
  return supabase
    .from('timesheets')
    .update({
      ...finalData,
      uploaded_documents: [...s.existingDocs, newDoc],
      staff_confirmed: true,
      // ... status logic ...
    })
    .eq('id', s.id);
});

await Promise.all(updates);
```

## 6. Audit Trail & UX
- Each affected timesheet MUST have the document attached to its `uploaded_documents` array.
- A single toast should summarize the result: *"✅ Successfully updated 3 shifts from this document."*
