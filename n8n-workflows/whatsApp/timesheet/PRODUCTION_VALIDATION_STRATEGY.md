# Production Timesheet Validation Strategy

## 🎯 Business Requirements

**Critical**: This directly impacts invoicing and payroll - 100% accuracy required on:
- ✅ Staff identification
- ✅ Shift dates
- ✅ Actual hours worked
- ✅ Break durations
- ✅ Client/workplace match

**Acceptable Variance**: Minor time differences (±30 min) due to real-world conditions

## 🔍 Multi-Layer Validation Process

### Layer 1: Staff Identification (4-Step Fallback)

```javascript
// Step 1: WhatsApp Number Lookup (PRIMARY)
const staff = await db.query(`
  SELECT id, employee_number, full_name, phone_number
  FROM staff
  WHERE phone_number = $1
`, [whatsapp_number]);

if (staff.length === 1) {
  return staff[0]; // ✅ Unique match
}

// Step 2: Employee Number from OCR (FALLBACK)
if (extracted.employee_number) {
  const staff = await db.query(`
    SELECT id, employee_number, full_name, phone_number
    FROM staff
    WHERE employee_number = $1
  `, [extracted.employee_number]);
  
  if (staff.length === 1) {
    // ⚠️ Verify phone number matches
    if (staff[0].phone_number !== whatsapp_number) {
      return {
        status: "verification_required",
        message: `Found ${staff[0].full_name}. Is this you? Reply YES or NO`
      };
    }
    return staff[0]; // ✅ Match confirmed
  }
}

// Step 3: Fuzzy Name Match (LAST RESORT)
if (extracted.employee_name) {
  const allStaff = await db.query(`SELECT id, full_name, phone_number FROM staff`);
  const matches = allStaff.filter(s => 
    levenshteinDistance(s.full_name, extracted.employee_name) < 3
  );
  
  if (matches.length === 1) {
    return {
      status: "verification_required",
      message: `Found ${matches[0].full_name}. Is this you? Reply YES or NO`
    };
  }
  
  if (matches.length > 1) {
    return {
      status: "multiple_matches",
      message: "Multiple staff found. Please include your employee number on timesheet."
    };
  }
}

// Step 4: Manual Intervention Required
return {
  status: "not_found",
  message: "Staff not found. Please contact admin to register your WhatsApp number."
};
```

### Layer 2: Shift Existence Validation

```javascript
// For each extracted shift entry
for (const shift of extracted.shift_entries) {
  const scheduledShift = await db.query(`
    SELECT 
      s.id,
      s.date,
      s.start_time,
      s.end_time,
      s.client_id,
      c.name as client_name,
      s.status
    FROM shifts s
    JOIN clients c ON s.client_id = c.id
    WHERE s.assigned_staff_id = $1
      AND s.date = $2
  `, [staff_id, shift.date]);
  
  if (scheduledShift.length === 0) {
    // ❌ No shift scheduled
    errors.push({
      date: shift.date,
      error: "no_shift_scheduled",
      message: `No shift scheduled for ${shift.date}`
    });
    continue;
  }
  
  if (scheduledShift.length > 1) {
    // ⚠️ Multiple shifts same day - need more info
    // Try to match by start_time
    const matched = scheduledShift.find(s => s.start_time === shift.start_time);
    if (!matched) {
      errors.push({
        date: shift.date,
        error: "multiple_shifts",
        message: `Multiple shifts on ${shift.date}. Which one: ${scheduledShift.map(s => s.start_time).join(', ')}?`
      });
      continue;
    }
  }
  
  // ✅ Shift found - proceed to Layer 3
  shift.matched_shift_id = scheduledShift[0].id;
  shift.scheduled_client = scheduledShift[0].client_name;
}
```

### Layer 3: Time Variance Analysis

```javascript
function validateTimeVariance(extracted, scheduled) {
  const startVariance = Math.abs(
    timeToMinutes(extracted.start_time) - timeToMinutes(scheduled.start_time)
  );
  const endVariance = Math.abs(
    timeToMinutes(extracted.end_time) - timeToMinutes(scheduled.end_time)
  );
  
  const validation = {
    start_variance_minutes: startVariance,
    end_variance_minutes: endVariance,
    status: "approved",
    flags: []
  };
  
  // Tolerance: ±30 minutes acceptable
  if (startVariance > 30 || endVariance > 30) {
    validation.status = "pending_review";
    validation.flags.push("time_variance");
    validation.message = `Scheduled: ${scheduled.start_time}-${scheduled.end_time}, Actual: ${extracted.start_time}-${extracted.end_time}`;
  }
  
  // Major variance: >60 minutes
  if (startVariance > 60 || endVariance > 60) {
    validation.status = "rejected";
    validation.flags.push("major_time_variance");
    validation.message = `Times differ significantly from schedule. Please verify and resubmit.`;
  }
  
  return validation;
}
```

### Layer 4: Workplace/Client Fuzzy Match

```javascript
function validateWorkplace(extracted, scheduled) {
  const extractedWorkplace = extracted.workplace.toLowerCase().trim();
  const scheduledClient = scheduled.client_name.toLowerCase().trim();
  
  // Exact match
  if (extractedWorkplace === scheduledClient) {
    return { match: true, confidence: 1.0 };
  }
  
  // Fuzzy match (Levenshtein distance)
  const distance = levenshteinDistance(extractedWorkplace, scheduledClient);
  const maxLength = Math.max(extractedWorkplace.length, scheduledClient.length);
  const similarity = 1 - (distance / maxLength);
  
  // Contains match (e.g., "Hampton Manor" vs "Hampton Manor Care Home")
  const contains = scheduledClient.includes(extractedWorkplace) || 
                   extractedWorkplace.includes(scheduledClient);
  
  if (similarity > 0.8 || contains) {
    return { match: true, confidence: similarity };
  }
  
  // No match - flag for review
  return {
    match: false,
    confidence: similarity,
    message: `Timesheet shows "${extracted.workplace}" but shift scheduled at "${scheduled.client_name}"`
  };
}
```

### Layer 5: Hours Reasonability Check

```javascript
function validateHours(shift) {
  const flags = [];
  let status = "approved";
  
  // Too short (< 4 hours)
  if (shift.total_hours < 4) {
    flags.push("short_shift");
    status = "pending_review";
  }
  
  // Too long (> 16 hours)
  if (shift.total_hours > 16) {
    flags.push("excessive_hours");
    status = "rejected";
  }
  
  // Excessive break (> 2 hours)
  if (shift.break_minutes > 120) {
    flags.push("excessive_break");
    status = "pending_review";
  }
  
  // No break on long shift (legal requirement)
  if (shift.total_hours > 6 && shift.break_minutes === 0) {
    flags.push("missing_break");
    status = "pending_review";
  }
  
  // Overtime detection (> 12 hours)
  if (shift.total_hours > 12) {
    flags.push("overtime");
    shift.overtime_hours = shift.total_hours - 12;
    shift.overtime_flag = true;
  }
  
  // Calculate expected hours from scheduled times
  const scheduledHours = calculateHours(
    shift.scheduled_start_time,
    shift.scheduled_end_time,
    shift.break_minutes
  );
  
  const hoursDifference = Math.abs(shift.total_hours - scheduledHours);
  
  // Hours differ significantly from schedule
  if (hoursDifference > 2) {
    flags.push("hours_mismatch");
    status = "pending_review";
  }
  
  return { status, flags, overtime_hours: shift.overtime_hours || 0 };
}
```

## 🤖 AI Agent for Staff Queries

### When to Use AI Agent

**Simple Queries (No LLM needed)**:
- "status" → Check timesheet status
- "hours" → Sum total hours
- "submitted" → List submitted timesheets

**Complex Queries (Use LLM)**:
- "Why was my Monday timesheet rejected?"
- "How much overtime this week?"
- "Did you get my timesheet for Hampton Manor?"

### Implementation

```javascript
// Keyword detection first
const keywords = {
  status: ["status", "received", "got", "submitted"],
  hours: ["hours", "total", "worked", "week"],
  rejected: ["rejected", "why", "problem", "issue"]
};

function detectIntent(message) {
  const msg = message.toLowerCase();
  
  for (const [intent, words] of Object.entries(keywords)) {
    if (words.some(word => msg.includes(word))) {
      return intent;
    }
  }
  
  return "complex"; // Use LLM
}

// Handle query
async function handleStaffQuery(staff_id, message) {
  const intent = detectIntent(message);
  
  switch (intent) {
    case "status":
      return await getTimesheetStatus(staff_id);
    
    case "hours":
      return await getHoursSummary(staff_id);
    
    case "rejected":
      return await getRejectionReasons(staff_id);
    
    case "complex":
      // Use OpenAI function calling
      return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are ACG StaffLink assistant. Help staff with timesheet queries. Be concise and helpful."
          },
          { role: "user", content: message }
        ],
        functions: [
          {
            name: "get_timesheets",
            description: "Get submitted timesheets for staff member",
            parameters: {
              type: "object",
              properties: {
                staff_id: { type: "string" },
                date_from: { type: "string" },
                date_to: { type: "string" }
              }
            }
          },
          {
            name: "get_hours_summary",
            description: "Get total hours worked summary",
            parameters: {
              type: "object",
              properties: {
                staff_id: { type: "string" },
                period: { type: "string", enum: ["week", "month"] }
              }
            }
          }
        ]
      });
  }
}
```

### Example Responses

**Query**: "What shifts have you recorded for me?"
```
✅ Timesheets Submitted:

📅 13 Jan 2025 - Hampton Manor
⏰ 20:00-08:00 (11 hrs)
Status: Pending approval

📅 17 Jan 2025 - Hampton Manor
⏰ 20:00-08:00 (11 hrs)
Status: Pending approval

📅 18 Jan 2025 - Hampton Manor
⏰ 20:00-08:00 (11 hrs)
Status: Pending approval

Total: 33 hours this week
```

**Query**: "Why was my Monday timesheet rejected?"
```
❌ Timesheet Rejected - 13 Jan 2025

Reason: Time variance
Scheduled: 08:00-20:00
Submitted: 20:00-08:00

This appears to be a night shift but was scheduled as day shift. Please contact your manager to verify the correct shift time.
```

## 📊 Validation Decision Matrix

| Validation Result | Action | Status | Notify Staff |
|-------------------|--------|--------|--------------|
| All checks pass | Auto-approve | `pending_approval` | ✅ "Timesheet received" |
| Minor variance (±30 min) | Auto-approve with flag | `pending_approval` | ✅ "Timesheet received" |
| Major variance (>60 min) | Reject | `rejected` | ❌ "Please verify times" |
| Workplace mismatch | Flag for review | `pending_review` | ⚠️ "Under review" |
| No shift scheduled | Reject | `rejected` | ❌ "No shift found" |
| Staff not found | Request verification | `verification_required` | ❓ "Confirm identity" |
| Excessive hours (>16) | Reject | `rejected` | ❌ "Hours unreasonable" |
| Overtime detected (>12) | Auto-approve with flag | `pending_approval` | ✅ "Overtime recorded" |

## 🔄 Complete Validation Flow

```
WhatsApp Upload
    ↓
AI Extract Data
    ↓
┌─────────────────────────────────┐
│ Layer 1: Staff Identification   │
│ - WhatsApp lookup               │
│ - Employee number match         │
│ - Fuzzy name match              │
│ - Ask for confirmation          │
└─────────────────────────────────┘
    ↓ PASS
┌─────────────────────────────────┐
│ Layer 2: Shift Existence        │
│ - Query shifts table            │
│ - Match by date + staff         │
│ - Handle multiple shifts/day    │
└─────────────────────────────────┘
    ↓ PASS
┌─────────────────────────────────┐
│ Layer 3: Time Variance          │
│ - Compare scheduled vs actual   │
│ - ±30 min = OK                  │
│ - >60 min = REJECT              │
└─────────────────────────────────┘
    ↓ PASS
┌─────────────────────────────────┐
│ Layer 4: Workplace Match        │
│ - Fuzzy match client name       │
│ - >80% similarity = OK          │
│ - <80% = FLAG                   │
└─────────────────────────────────┘
    ↓ PASS
┌─────────────────────────────────┐
│ Layer 5: Hours Reasonability    │
│ - 4-16 hours = OK               │
│ - >12 hours = OVERTIME          │
│ - Break validation              │
└─────────────────────────────────┘
    ↓ PASS
Update Database + Notify Staff
```

## 💾 Test Data Structure

See `TEST_DATA_STAFF_SHIFTS.csv` for complete test dataset.

