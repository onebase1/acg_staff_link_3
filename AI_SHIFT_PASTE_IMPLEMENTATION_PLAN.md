# AI Shift Paste - End-to-End Implementation Plan

**Date:** 2025-11-18  
**Status:** Design Phase  
**Goal:** Paste weekly schedule text → AI extracts shifts → Tabular preview → Bulk create

---

## 📋 EXECUTIVE SUMMARY

**Problem:** Current AI shift creators don't show tabular preview before submission (like BulkShiftCreation does)

**Solution:** Build new AI Shift Paste page that:
1. Accepts pasted schedule text (your format)
2. Uses OpenAI to extract individual shifts
3. Shows tabular preview (like Step3PreviewTable)
4. Allows editing before bulk creation
5. Creates all shifts with proper validation

---

## 🎯 USER FLOW

```
1. Admin pastes schedule text
   ↓
2. AI extracts shifts (OpenAI LLM)
   ↓
3. Tabular preview with edit/delete
   ↓
4. Admin confirms
   ↓
5. Bulk create shifts (same as BulkShiftCreation)
```

---

## 📝 INPUT FORMAT ANALYSIS

**Your Example:**
```
DAYS
Monday- 17th x 5 – Agatha Eze, Mba Kalu James, Oluchi Victoria Ezeokoye, Eneche Ojima & Janet Ochefije Atama
Tuesday – 18th  x 1- Oluchi Victoria Ezeokoye
...

NIGHTS
Monday 17th x 2 – Ozia Odewenwa & Ifechukwude Stellamaris Okafor
...
```

**AI Must Extract:**
- **Shift Type:** "DAYS" or "NIGHTS" → `shift_type: 'day' | 'night'`
- **Date:** "Monday 17th" → `date: '2025-11-17'` (need month/year context)
- **Quantity:** "x 5" → Create 5 separate shifts
- **Staff Names:** Ignore (shifts created as "open", staff assigned later)

**Critical:** Staff names are IGNORED - we create OPEN shifts only

---

## 🏗️ ARCHITECTURE (AI Frontend → BulkShiftCreation Backend)

### **Design Philosophy**
**AI is just a smart input method** - it formats the pasted text into the same data structure that BulkShiftCreation uses, then hands off to the existing backend.

```
┌─────────────────────────────────────────────────────────────┐
│ AIShiftPaste.jsx (NEW - Thin AI Frontend Layer)            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Step 1: Paste & Configure                                  │
│   ├── Client selector                                      │
│   ├── Month/Year selector (for date context)               │
│   ├── Role selector (what role are these shifts for?)      │
│   ├── Textarea for pasted schedule                         │
│   └── "Extract Shifts" button                              │
│                                                             │
│ Step 2: AI Processing (Format to BulkShift structure)      │
│   ├── Call InvokeLLM with schedule text                    │
│   ├── Parse response into shift array                      │
│   ├── Convert to gridData format (same as BulkShift)       │
│   └── Set formData state (same structure as BulkShift)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    (Hand off to existing backend)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ BulkShiftCreation Backend (REUSE 100%)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Step 3: Preview (REUSE Step3PreviewTable)                  │
│   ├── expandGridToShifts() - Convert grid to shifts        │
│   ├── validateBulkShifts() - Validate all shifts           │
│   ├── Show tabular preview with edit/delete                │
│   ├── Financial summary                                    │
│   └── "Create All Shifts" button                           │
│                                                             │
│ Step 4: Creation (REUSE existing mutation)                 │
│   ├── prepareShiftsForInsert() - Format for DB             │
│   ├── Insert shifts to database                            │
│   ├── Show progress bar                                    │
│   └── Success message                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Key Insight**
AI just converts:
```
"Monday 17th x 5" → gridData['2025-11-17']['healthcare_assistant_day'] = 5
```

Then BulkShiftCreation's existing `expandGridToShifts()` does the rest!

---

## 🔧 TECHNICAL IMPLEMENTATION

### **1. AI Prompt Design**

```javascript
const systemPrompt = `You are a shift schedule parser for a UK healthcare staffing agency.

**INPUT FORMAT:**
User will paste a weekly schedule in this format:

DAYS
Monday- 17th x 5 – Agatha Eze, Mba Kalu James, ...
Tuesday – 18th x 1- Oluchi Victoria Ezeokoye
...

NIGHTS
Monday 17th x 2 – Ozia Odewenwa & Ifechukwude ...
...

**YOUR JOB:**
1. Extract each shift entry
2. Parse: day of week, date (day number), quantity (x N), shift type (DAYS/NIGHTS)
3. IGNORE staff names - we create OPEN shifts
4. Return JSON array of shifts

**CONTEXT:**
- Month: ${selectedMonth} (e.g., "November")
- Year: ${selectedYear} (e.g., "2025")
- Client: ${client.name}
- Role: ${selectedRole} (e.g., "healthcare_assistant")
- Day Shift Times: ${dayStart} - ${dayEnd}
- Night Shift Times: ${nightStart} - ${nightEnd}

**OUTPUT FORMAT:**
{
  "shifts": [
    {
      "date": "2025-11-17",
      "shift_type": "day",
      "quantity": 5,
      "day_of_week": "Monday"
    },
    {
      "date": "2025-11-18",
      "shift_type": "day",
      "quantity": 1,
      "day_of_week": "Tuesday"
    },
    ...
  ]
}

**RULES:**
- Convert day number to full date using provided month/year
- "DAYS" section → shift_type: "day"
- "NIGHTS" section → shift_type: "night"
- "x 5" → quantity: 5 (create 5 separate shifts)
- Ignore all staff names
`;
```

---

## 📊 DATA FLOW (AI → BulkShift Backend)

### **Step 1: User Input (AI Frontend)**
```javascript
{
  client_id: "abc-123",
  role_required: "healthcare_assistant",
  month: "November",
  year: "2025",
  pastedText: "DAYS\nMonday- 17th x 5 – ..."
}
```

### **Step 2: AI Extraction (AI Frontend)**
```javascript
// AI extracts this from pasted text
{
  shifts: [
    { date: "2025-11-17", shift_type: "day", quantity: 5 },
    { date: "2025-11-18", shift_type: "day", quantity: 1 },
    { date: "2025-11-17", shift_type: "night", quantity: 2 },
    ...
  ]
}
```

### **Step 3: Convert to BulkShift gridData Format (AI Frontend)**
```javascript
// AI converts to SAME format as BulkShiftCreation Step 2
const gridData = {
  '2025-11-17': {
    'healthcare_assistant_day': 5,    // Monday day x 5
    'healthcare_assistant_night': 2   // Monday night x 2
  },
  '2025-11-18': {
    'healthcare_assistant_day': 1     // Tuesday day x 1
  }
};

// Set formData (SAME structure as BulkShiftCreation)
setFormData({
  client_id: "abc-123",
  client: clientObject,
  activeRoles: ['healthcare_assistant_day', 'healthcare_assistant_night'],
  gridData: gridData,
  ratesByRole: {
    healthcare_assistant: { pay_rate: 14.75, charge_rate: 19.18 }
  },
  shiftTimes: {
    day: { start: '08:00', end: '20:00' },
    night: { start: '20:00', end: '08:00' }
  },
  break_duration_minutes: 0,
  urgency: 'normal'
});

// Jump to Step 3 (Preview) - REUSE BulkShiftCreation logic
setCurrentStep(3);
```

### **Step 4: Expand to Individual Shifts (BulkShift Backend - REUSED)**
```javascript
// BulkShiftCreation's expandGridToShifts() does this automatically
const expandedShifts = expandGridToShifts(
  formData.gridData,
  formData.activeRoles,
  formData.client,
  formData,
  currentAgency,
  user
);

// Result: Array of 8 individual shift objects
[
  {
    _tempId: "temp-1",
    client_id: "abc-123",
    role_required: "healthcare_assistant",
    date: "2025-11-17",
    start_time: "2025-11-17T08:00:00",
    end_time: "2025-11-17T20:00:00",
    duration_hours: 12,
    shift_type: "day",
    pay_rate: 14.75,
    charge_rate: 19.18,
    status: "open"
  },
  // ... 4 more day shifts for Monday
  // ... 2 night shifts for Monday
  // ... 1 day shift for Tuesday
]
```

### **Step 5: Preview & Edit (BulkShift Backend - REUSED)**
```javascript
// Step3PreviewTable shows all shifts in table
// User can edit/delete individual shifts
// Financial summary calculated automatically
```

### **Step 6: Database Insert (BulkShift Backend - REUSED)**
```javascript
// BulkShiftCreation's existing mutation handles this
const prepared = prepareShiftsForInsert(expandedShifts);
await supabase.from('shifts').insert(prepared);
```

---

## 🎯 CRITICAL INSIGHT

**AI's ONLY job:** Convert pasted text → `gridData` object

**BulkShiftCreation's job:** Everything else (expand, validate, preview, create)

This means:
- ✅ No duplicate code
- ✅ Same validation logic
- ✅ Same preview UI
- ✅ Same creation flow
- ✅ AI is just a smart input method

---

## 🎨 UI DESIGN

### **Step 1: Configuration Screen**
```
┌─────────────────────────────────────────┐
│ 🤖 AI Shift Paste                       │
├─────────────────────────────────────────┤
│                                         │
│ Client: [Divine Care Centre ▼]         │
│ Role:   [Healthcare Assistant ▼]       │
│ Month:  [November ▼]  Year: [2025 ▼]   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Paste your schedule here:           │ │
│ │                                     │ │
│ │ DAYS                                │ │
│ │ Monday- 17th x 5 – Agatha Eze, ... │ │
│ │ Tuesday – 18th x 1- Oluchi ...     │ │
│ │                                     │ │
│ │ NIGHTS                              │ │
│ │ Monday 17th x 2 – Ozia Odewenwa... │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Extract Shifts with AI]                │
└─────────────────────────────────────────┘
```

### **Step 2: Tabular Preview (REUSE Step3PreviewTable)**
```
┌──────────────────────────────────────────────────────────┐
│ ✅ 42 Shifts Extracted - Review Before Creating          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ 📅 Monday, 17 November 2025 (10 shifts)                 │
│   ├─ Day Shift (5 shifts)                               │
│   │   08:00-20:00 | HCA | £14.75/hr | Open              │
│   │   [Edit] [Delete]                                   │
│   └─ Night Shift (2 shifts)                             │
│       20:00-08:00 | HCA | £16.50/hr | Open              │
│                                                          │
│ 📅 Tuesday, 18 November 2025 (3 shifts)                 │
│   ├─ Day Shift (1 shift)                                │
│   └─ Night Shift (2 shifts)                             │
│                                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Total: 42 shifts | 504 hours | £7,434 staff cost        │
│                                                          │
│ [← Back to Edit] [Create All Shifts →]                  │
└──────────────────────────────────────────────────────────┘
```

---

## ✅ VALIDATION RULES

1. **Client must be selected** (required for rates)
2. **Role must be selected** (required for rates)
3. **Month/Year must be selected** (required for date parsing)
4. **Pasted text must not be empty**
5. **AI must extract at least 1 shift**
6. **All dates must be valid** (not in past, within selected month)
7. **All shifts must have valid rates** (from client contract)

---

## 🔄 REUSABLE COMPONENTS (100% Backend Reuse)

**From BulkShiftCreation (REUSE EVERYTHING):**
- ✅ `Step3PreviewTable.jsx` - Tabular preview with edit/delete
- ✅ `EditShiftModal.jsx` - Edit individual shift
- ✅ `expandGridToShifts()` - Expand gridData to individual shifts
- ✅ `validateBulkShifts()` - Validation logic
- ✅ `prepareShiftsForInsert()` - Format for database
- ✅ `calculateFinancialSummary()` - Cost calculations
- ✅ `groupShiftsByDate()` - Group for display
- ✅ `getClientRates()` - Get rates from client contract
- ✅ Creation mutation - Database insert with progress

**New Components (AI Frontend Only):**
- ❌ `AIShiftPaste.jsx` - Main page (200 lines - THIN layer)
- ❌ `convertPasteToGridData()` - AI extraction + conversion (100 lines)

---

## 📁 FILE STRUCTURE (Minimal New Code)

```
src/
├── pages/
│   ├── AIShiftPaste.jsx (NEW - 200 lines)
│   │   ├── Step 1: Paste & Configure (UI only)
│   │   ├── Step 2: AI Processing (calls convertPasteToGridData)
│   │   └── Step 3+: Hand off to BulkShiftCreation components
│   │
│   └── BulkShiftCreation.jsx (EXISTING - REUSE)
│       ├── expandGridToShifts()
│       ├── validateBulkShifts()
│       ├── Step3PreviewTable
│       └── Creation mutation
│
├── utils/
│   ├── aiShiftParser.js (NEW - 100 lines)
│   │   └── convertPasteToGridData() - AI extraction + format
│   │
│   └── bulkShifts/ (EXISTING - REUSE)
│       ├── shiftGenerator.js
│       └── validation.js
│
└── components/
    └── bulk-shifts/ (EXISTING - REUSE)
        ├── Step3PreviewTable.jsx
        └── EditShiftModal.jsx
```

**Total New Code:** ~300 lines (vs 1000+ if built from scratch)

---

## 🚀 NEXT STEPS

1. Create `src/utils/aiShiftParser.js`
2. Create `src/pages/AIShiftPaste.jsx`
3. Add route to `src/pages/index.jsx`
4. Add navigation link to Quick Actions
5. Test with your example data
6. Deploy

---

**Estimated Time:** 4-6 hours
**Complexity:** Medium (reusing 70% of BulkShiftCreation logic)

---

## 🔍 DETAILED TECHNICAL SPECS

### **Shift Data Structure (Database Insert)**

```javascript
{
  // Required fields
  agency_id: "uuid",
  client_id: "uuid",
  role_required: "healthcare_assistant",
  date: "2025-11-17",
  start_time: "2025-11-17T08:00:00", // ISO timestamp
  end_time: "2025-11-17T20:00:00",   // ISO timestamp
  duration_hours: 12,
  shift_type: "day",

  // Rates (from client contract)
  pay_rate: 14.75,
  charge_rate: 19.18,

  // Status
  status: "open",
  marketplace_visible: false, // ✅ FIXED: Manual approval required (admin toggles in UI)

  // Optional
  work_location_within_site: "",
  urgency: "normal",
  notes: "",
  break_duration_minutes: 0,

  // Journey log
  shift_journey_log: [{
    state: "created",
    timestamp: "2025-11-18T10:30:00Z",
    user_id: "uuid",
    method: "ai_paste",
    metadata: {
      batch_creation: true,
      source: "AIShiftPaste"
    }
  }],

  // Metadata
  created_date: "2025-11-18T10:30:00Z",
  created_by: "admin@agency.com"
}
```

---

## 🧪 TEST CASES

### **Test Case 1: Basic Day Shifts**
**Input:**
```
DAYS
Monday- 17th x 3 – Staff names here
```

**Expected Output:**
- 3 shifts created
- Date: 2025-11-17
- Shift type: day
- Times: 08:00-20:00
- Status: open

---

### **Test Case 2: Mixed Day/Night**
**Input:**
```
DAYS
Monday- 17th x 2 – Names
NIGHTS
Monday 17th x 1 – Names
```

**Expected Output:**
- 3 shifts total
- 2 day shifts (08:00-20:00)
- 1 night shift (20:00-08:00)
- All same date (2025-11-17)

---

### **Test Case 3: Full Week**
**Input:**
```
DAYS
Monday- 17th x 5
Tuesday – 18th x 1
Wednesday – 19th x 2

NIGHTS
Monday 17th x 2
Tuesday 18th x 2
```

**Expected Output:**
- 12 shifts total
- 8 day shifts
- 4 night shifts
- Dates: 17th, 18th, 19th

---

## 🎯 SUCCESS CRITERIA

✅ **Functional Requirements:**
1. Accepts pasted schedule text
2. Extracts shifts using AI
3. Shows tabular preview (like BulkShiftCreation)
4. Allows editing individual shifts
5. Creates all shifts in single transaction
6. Shows progress during creation
7. Redirects to Shifts page on success

✅ **Data Quality:**
1. All shifts have valid dates
2. All shifts have correct shift_type
3. All shifts have rates from client contract
4. All shifts created as "open" status
5. All shifts have proper journey log

✅ **User Experience:**
1. Clear error messages if AI fails
2. Validation before creation
3. Edit/delete before confirming
4. Financial summary visible
5. Progress indicator during creation

---

## 🚨 EDGE CASES TO HANDLE

1. **Invalid date format** → Ask user to clarify
2. **Missing month/year** → Require selection before extraction
3. **No client selected** → Block extraction
4. **No role selected** → Block extraction
5. **AI extraction fails** → Show error, allow retry
6. **Duplicate dates** → Allow (multiple shifts same day is valid)
7. **Past dates** → Warn but allow (admin might be backfilling)
8. **Client has no rates for role** → Block creation, show error

---

## 📝 IMPLEMENTATION CHECKLIST

### Phase 1: Core Functionality
- [ ] Create `src/utils/aiShiftParser.js`
- [ ] Create `src/pages/AIShiftPaste.jsx`
- [ ] Add route to `src/pages/index.jsx`
- [ ] Test AI extraction with sample data
- [ ] Test tabular preview rendering

### Phase 2: Integration
- [ ] Connect to client selector
- [ ] Connect to role selector
- [ ] Fetch client rates
- [ ] Calculate shift times from client config
- [ ] Validate all extracted shifts

### Phase 3: Preview & Edit
- [ ] Integrate Step3PreviewTable
- [ ] Enable edit functionality
- [ ] Enable delete functionality
- [ ] Show financial summary
- [ ] Add expand/collapse by date

### Phase 4: Creation
- [ ] Implement bulk insert
- [ ] Add progress indicator
- [ ] Handle errors gracefully
- [ ] Invalidate queries on success
- [ ] Redirect to Shifts page

### Phase 5: Polish
- [ ] Add navigation link
- [ ] Add help text/examples
- [ ] Add loading states
- [ ] Add success toast
- [ ] Test with real data

---

## 🔗 NAVIGATION INTEGRATION

**Add to Quick Actions:**
```jsx
<Link to={createPageUrl('AIShiftPaste')}>
  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-purple-50">
    <Sparkles className="w-6 h-6 text-purple-600" />
    <span className="text-sm font-medium">Paste Schedule (AI)</span>
  </Button>
</Link>
```

**Add to Layout Navigation:**
```javascript
{
  section: "OPERATIONS",
  items: [
    { title: "AI Shift Paste", url: createPageUrl("AIShiftPaste"), icon: Sparkles, adminOnly: true },
  ]
}
```

---

## 💡 FUTURE ENHANCEMENTS

1. **Save templates** - Save common schedule formats
2. **Multi-client support** - Extract shifts for multiple clients at once
3. **Staff assignment** - Optionally assign staff during extraction
4. **Recurring schedules** - "Repeat this schedule for next 4 weeks"
5. **Email import** - Forward schedule email to system
6. **WhatsApp integration** - Send schedule via WhatsApp

---

**Ready to implement?** Let me know and I'll start building the code!

