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

## 3. The "NFA" Check (No Further Action)
Before populating, check if the hours already in the database match what the OCR found.
- If `DB.total_hours === OCR.total_hours`, mark as "Already Reconciled".
- If `DB.total_hours !== OCR.total_hours`, mark as "Update Required".

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
