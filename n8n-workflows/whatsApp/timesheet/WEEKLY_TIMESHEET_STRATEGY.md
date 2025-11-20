# Weekly Timesheet Strategy - Daily Upload Handling

## 🎯 Problem Statement

**Scenario**: Staff working Monday-Friday at same location use **ONE weekly timesheet**:
- Monday: Upload timesheet with 1 column filled (Monday only)
- Tuesday: Upload **SAME timesheet** with 2 columns filled (Monday + Tuesday)
- Wednesday: Upload **SAME timesheet** with 3 columns filled (Monday + Tuesday + Wednesday)
- ...and so on

**Challenge**: How to extract ONLY the new column without creating duplicates?

## ✅ Recommended Solution: Extract Today's Column Only

### Strategy

1. **AI Prompt Enhancement**: Tell GPT-4o to extract ONLY today's date
2. **Date Validation**: Reject if extracted date ≠ today
3. **Duplicate Check**: Query database before inserting
4. **Clear Error Messages**: Guide staff to submit on correct day

### Enhanced AI Prompt

```javascript
const today = new Date().toISOString().split('T')[0]; // "2025-01-20"

const prompt = `
Extract timesheet data from this image.

CRITICAL INSTRUCTIONS:
- This is a weekly timesheet that may have multiple days filled
- Today's date is: ${today}
- Extract ONLY the shift entry for ${today}
- IGNORE all other dates (past or future)
- If ${today}'s column is empty, return empty shift_entries array

Return ONLY valid JSON:
{
  "employee_number": "string",
  "employee_name": "string",
  "workplace": "string",
  "job_title": "string",
  "week_beginning": "YYYY-MM-DD or null",
  "shift_entries": [
    {
      "date": "${today}",  // MUST be today's date
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "break_minutes": integer,
      "total_hours": decimal,
      "is_overnight": boolean
    }
  ],
  "employee_signature_present": boolean,
  "supervisor_signature_present": boolean
}

If ${today}'s column is not filled, return:
{
  "employee_number": "...",
  "employee_name": "...",
  "shift_entries": []
}
`;
```

### Validation Logic

```javascript
// After AI extraction
const extractedData = JSON.parse(aiResponse);
const today = new Date().toISOString().split('T')[0];

// Check 1: Is there a shift entry?
if (!extractedData.shift_entries || extractedData.shift_entries.length === 0) {
  return {
    success: false,
    message: `No shift found for today (${today}). Please fill in today's column before uploading.`
  };
}

// Check 2: Does the date match today?
const extractedDate = extractedData.shift_entries[0].date;
if (extractedDate !== today) {
  return {
    success: false,
    message: `Timesheet shows ${extractedDate} but today is ${today}. Please upload on the day you worked.`
  };
}

// Check 3: Has this shift already been submitted?
const existingTimesheet = await supabase
  .from('timesheets')
  .select('id, status')
  .eq('staff_id', staff_id)
  .eq('shift_date', today)
  .single();

if (existingTimesheet) {
  return {
    success: false,
    message: `Timesheet already submitted for ${today}. Status: ${existingTimesheet.status}`
  };
}

// All checks passed - proceed with validation layers
```

### Benefits

✅ **Prevents Duplicates**: Only processes today's shift
✅ **Clear Expectations**: Staff know to upload daily
✅ **Better Cash Flow**: Daily submissions = faster invoicing
✅ **Simpler Logic**: No need to track which columns are new
✅ **Error Prevention**: Rejects wrong-day submissions

### Drawbacks

⚠️ **Requires Daily Upload**: Staff must remember to upload each day
⚠️ **No Batch Submission**: Can't submit Friday's timesheet with all 5 days at once

---

## 🔄 Alternative Solution: Accept All Columns, Deduplicate

### Strategy

1. **Extract All Visible Shifts**: Let AI extract all filled columns
2. **Loop Through Each Shift**: Check if already exists in database
3. **Insert Only New Shifts**: Skip duplicates, insert new ones
4. **Return Summary**: Tell staff which shifts were processed

### Implementation

```javascript
// AI extracts all visible shifts
const extractedData = JSON.parse(aiResponse);
const allShifts = extractedData.shift_entries; // [Mon, Tue, Wed]

const results = {
  processed: [],
  skipped: [],
  errors: []
};

for (const shift of allShifts) {
  // Check if already exists
  const existing = await supabase
    .from('timesheets')
    .select('id, status')
    .eq('staff_id', staff_id)
    .eq('shift_date', shift.date)
    .single();
  
  if (existing) {
    results.skipped.push({
      date: shift.date,
      reason: `Already submitted (${existing.status})`
    });
    continue;
  }
  
  // Validate shift against scheduled shift
  const scheduledShift = await supabase
    .from('shifts')
    .select('*')
    .eq('assigned_staff_id', staff_id)
    .eq('date', shift.date)
    .single();
  
  if (!scheduledShift) {
    results.errors.push({
      date: shift.date,
      reason: 'No shift scheduled'
    });
    continue;
  }
  
  // Run validation layers (time variance, workplace match, etc.)
  const validation = validateShift(shift, scheduledShift);
  
  if (validation.result === 'REJECT') {
    results.errors.push({
      date: shift.date,
      reason: validation.message
    });
    continue;
  }
  
  // Insert new timesheet
  await supabase.from('timesheets').insert({
    staff_id,
    shift_date: shift.date,
    actual_start_time: shift.start_time,
    actual_end_time: shift.end_time,
    break_duration_minutes: shift.break_minutes,
    total_hours: shift.total_hours,
    status: validation.status,
    validation_flags: validation.flags
  });
  
  results.processed.push({
    date: shift.date,
    hours: shift.total_hours,
    status: validation.status
  });
}

// Send summary to staff
const message = `
✅ Timesheet processed!

${results.processed.length > 0 ? `
📋 New shifts recorded:
${results.processed.map(s => `- ${s.date}: ${s.hours} hrs (${s.status})`).join('\n')}
` : ''}

${results.skipped.length > 0 ? `
⏭️ Already submitted:
${results.skipped.map(s => `- ${s.date}: ${s.reason}`).join('\n')}
` : ''}

${results.errors.length > 0 ? `
❌ Errors:
${results.errors.map(s => `- ${s.date}: ${s.reason}`).join('\n')}
` : ''}
`;
```

### Benefits

✅ **Flexible Upload**: Staff can upload anytime (daily or weekly)
✅ **Batch Submission**: Can submit all 5 days on Friday
✅ **Forgiving**: Doesn't reject if they upload wrong day
✅ **Comprehensive**: Processes all visible shifts

### Drawbacks

⚠️ **More Complex**: Need to loop through all shifts
⚠️ **Slower Processing**: Multiple database queries per upload
⚠️ **Delayed Cash Flow**: If staff wait until Friday to submit all
⚠️ **More Edge Cases**: What if they upload Monday's timesheet on Friday with all 5 days?

---

## 🎯 Recommendation

**Use Solution 1: Extract Today's Column Only**

**Reasoning**:
1. **Payroll Critical**: You emphasized this is directly linked to invoicing/payroll
2. **Cash Flow**: Daily submissions = faster invoicing = better cash flow
3. **Simpler Logic**: Fewer edge cases = fewer bugs
4. **Clear Expectations**: Staff know the rule: "Upload on the day you worked"
5. **Error Prevention**: Rejects wrong-day submissions before processing

**Implementation**:
- Update AI prompt to extract only today's date
- Add date validation before processing
- Add duplicate check before inserting
- Send clear error messages if wrong day

**Staff Training**:
- "Upload your timesheet at the end of each shift"
- "You'll get instant confirmation"
- "Don't wait until Friday - upload daily for faster payment processing"

---

## 🔄 Hybrid Approach (Best of Both Worlds)

**Allow both daily AND batch submission**:

```javascript
const today = new Date().toISOString().split('T')[0];
const extractedShifts = extractedData.shift_entries;

// Check if this is a daily upload (only today's shift)
const isDailyUpload = extractedShifts.length === 1 && extractedShifts[0].date === today;

// Check if this is a batch upload (multiple past shifts)
const isBatchUpload = extractedShifts.length > 1 && extractedShifts.every(s => s.date <= today);

if (isDailyUpload) {
  // Fast path: Process today's shift only
  return processSingleShift(extractedShifts[0]);
}

if (isBatchUpload) {
  // Batch path: Process all shifts, skip duplicates
  return processBatchShifts(extractedShifts);
}

// Invalid: Future dates or empty
return {
  success: false,
  message: "Please upload timesheet for today or past shifts only"
};
```

**Benefits**:
✅ **Flexible**: Supports both daily and batch
✅ **Optimized**: Fast path for daily uploads
✅ **Forgiving**: Allows catch-up if staff forget

**Complexity**: Medium (but worth it for flexibility)

---

## 📊 Decision Matrix

| Criteria | Today Only | All Columns | Hybrid |
|----------|-----------|-------------|--------|
| Simplicity | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Cash Flow | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| Flexibility | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Error Prevention | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Staff Convenience | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**Final Recommendation**: **Hybrid Approach** - Best balance of simplicity, flexibility, and cash flow optimization.

