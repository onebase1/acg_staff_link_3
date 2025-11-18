# AI Shift Paste - SIMPLIFIED Implementation Plan

**Date:** 2025-11-18  
**Architecture:** AI Frontend → BulkShiftCreation Backend (100% Reuse)

---

## 🎯 CORE CONCEPT

**AI is a conversational assistant** that:
1. Understands healthcare jargon (HCA → healthcare_assistant, care assistant → care_worker)
2. Matches client names to actual database records
3. Asks clarifying questions when data is missing/ambiguous
4. Validates extracted data before proceeding
5. Converts to `formData` structure → Hands off to BulkShiftCreation

```
User pastes schedule → AI conversation (validate/clarify) → Convert to gridData → BulkShiftCreation
```

---

## 📊 DATA TRANSFORMATION

### **Input (Pasted Text)**
```
DAYS
Monday- 17th x 5 – Agatha Eze, Mba Kalu James...
Tuesday – 18th x 1- Oluchi Victoria Ezeokoye

NIGHTS
Monday 17th x 2 – Ozia Odewenwa & Ifechukwude...
```

### **AI Extraction**
```javascript
{
  shifts: [
    { date: "2025-11-17", shift_type: "day", quantity: 5 },
    { date: "2025-11-18", shift_type: "day", quantity: 1 },
    { date: "2025-11-17", shift_type: "night", quantity: 2 }
  ]
}
```

### **Convert to BulkShift gridData Format**
```javascript
const gridData = {
  '2025-11-17': {
    'healthcare_assistant_day': 5,
    'healthcare_assistant_night': 2
  },
  '2025-11-18': {
    'healthcare_assistant_day': 1
  }
};

const activeRoles = [
  {
    key: 'healthcare_assistant_day',
    label: 'Healthcare Assistant Day',
    role: 'healthcare_assistant',
    shiftType: 'day',
    payRate: 14.75,
    chargeRate: 19.18
  },
  {
    key: 'healthcare_assistant_night',
    label: 'Healthcare Assistant Night',
    role: 'healthcare_assistant',
    shiftType: 'night',
    payRate: 16.50,
    chargeRate: 21.45
  }
];

// Set formData (SAME structure as BulkShiftCreation)
setFormData({
  client_id: selectedClient.id,
  client: selectedClient,
  activeRoles: activeRoles,
  gridData: gridData,
  ratesByRole: {
    healthcare_assistant: { pay_rate: 14.75, charge_rate: 19.18 }
  },
  shiftTimes: {
    day: { start: '08:00', end: '20:00' },
    night: { start: '20:00', end: '08:00' }
  },
  break_duration_minutes: 0,
  urgency: 'normal',
  notes: ''
});

// Jump to Step 3 (Preview) - BulkShiftCreation takes over
setCurrentStep(3);
```

---

## 🏗️ COMPONENT STRUCTURE

### **AIShiftPaste.jsx (NEW - 200 lines)**
```jsx
export default function AIShiftPaste() {
  const [step, setStep] = useState(1); // 1: Configure, 2: Processing, 3+: BulkShift
  const [formData, setFormData] = useState({...}); // SAME as BulkShiftCreation
  
  // Step 1: Configuration
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [pastedText, setPastedText] = useState('');
  
  // Step 2: AI Processing
  const handleExtractShifts = async () => {
    const extracted = await convertPasteToGridData(
      pastedText,
      selectedClient,
      selectedRole,
      month,
      year
    );
    
    setFormData(extracted.formData);
    setStep(3); // Jump to preview
  };
  
  // Step 3+: Render BulkShiftCreation components
  if (step >= 3) {
    return (
      <>
        <Step3PreviewTable
          formData={formData}
          setFormData={setFormData}
          onBack={() => setStep(1)}
          onContinue={handleCreateShifts}
        />
      </>
    );
  }
  
  // Step 1: Configuration UI
  return (
    <Card>
      <ClientSelector value={selectedClient} onChange={setSelectedClient} />
      <RoleSelector value={selectedRole} onChange={setSelectedRole} />
      <MonthYearSelector month={month} year={year} onChange={...} />
      <Textarea value={pastedText} onChange={setPastedText} />
      <Button onClick={handleExtractShifts}>Extract Shifts with AI</Button>
    </Card>
  );
}
```

### **aiShiftParser.js (NEW - 100 lines)**
```javascript
export async function convertPasteToGridData(pastedText, client, role, month, year) {
  // 1. Call OpenAI to extract shifts
  const extracted = await InvokeLLM({
    systemPrompt: buildSystemPrompt(client, role, month, year),
    userMessage: pastedText,
    responseFormat: { type: "json_object" }
  });
  
  // 2. Convert to gridData format
  const gridData = {};
  const activeRolesSet = new Set();
  
  extracted.shifts.forEach(shift => {
    const roleKey = `${role}_${shift.shift_type}`;
    activeRolesSet.add(roleKey);
    
    if (!gridData[shift.date]) {
      gridData[shift.date] = {};
    }
    gridData[shift.date][roleKey] = shift.quantity;
  });
  
  // 3. Build activeRoles array
  const activeRoles = Array.from(activeRolesSet).map(roleKey => {
    const shiftType = roleKey.endsWith('_day') ? 'day' : 'night';
    const rates = getClientRates(client, role, shiftType);
    
    return {
      key: roleKey,
      label: `${role.replace(/_/g, ' ')} ${shiftType}`,
      role: role,
      shiftType: shiftType,
      payRate: rates.pay_rate,
      chargeRate: rates.charge_rate
    };
  });
  
  // 4. Return formData (SAME structure as BulkShiftCreation)
  return {
    formData: {
      client_id: client.id,
      client: client,
      activeRoles: activeRoles,
      gridData: gridData,
      ratesByRole: { [role]: getClientRates(client, role, 'day') },
      shiftTimes: {
        day: getShiftTimes(client, 'day'),
        night: getShiftTimes(client, 'night')
      },
      break_duration_minutes: client.contract_terms?.break_duration_minutes || 0,
      urgency: 'normal',
      notes: ''
    }
  };
}
```

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Create `src/utils/aiShiftParser.js` (100 lines)
- [ ] Create `src/pages/AIShiftPaste.jsx` (200 lines)
- [ ] Add route to `src/pages/index.jsx`
- [ ] Test AI extraction with sample data
- [ ] Verify handoff to BulkShiftCreation works
- [ ] Add navigation link

**Total New Code:** ~300 lines  
**Reused Code:** ~1000 lines from BulkShiftCreation

---

---

## 🤖 CONVERSATIONAL AI VALIDATION

### **Phase 1: Initial Extraction**
AI extracts shifts from pasted text and identifies:
- Client name (fuzzy match against database)
- Role mentions (HCA, care assistant, nurse, etc.)
- Dates and quantities
- Shift types (day/night)

### **Phase 2: Validation & Clarification**

**Scenario 1: Client Name Ambiguous**
```
User pastes: "Divine Care shifts for next week..."

AI Response:
"I found 2 clients matching 'Divine Care':
1. Divine Care Centre (London)
2. Divine Care Home (Manchester)

Which client are these shifts for? (Reply with 1 or 2)"

User: "1"

AI: "✅ Using Divine Care Centre (London)"
```

**Scenario 2: Client Not Found**
```
User pastes: "Sunshine Home shifts..."

AI Response:
"⚠️ I couldn't find a client named 'Sunshine Home' in your database.

Your active clients:
- Divine Care Centre
- St Mary's Care Home
- Oakwood Residential

Which client are these shifts for? Or type the exact name if it's a new client."

User: "St Mary's"

AI: "✅ Using St Mary's Care Home"
```

**Scenario 3: Role Jargon Translation**
```
User pastes: "Monday x 5 HCA shifts..."

AI thinks: "HCA" → healthcare_assistant (using jargon mapping)

AI Response:
"✅ I detected 5 Healthcare Assistant shifts for Monday.
Rates: £14.75/hr pay, £19.18/hr charge
Continue? (yes/no)"
```

**Scenario 4: Missing Month/Year**
```
User pastes: "Monday 17th x 5..."

AI Response:
"📅 I see shifts for the 17th, but which month?
- November 2025
- December 2025
- January 2026

Reply with month name or number (e.g., 'November' or '11')"

User: "November"

AI: "✅ Using November 2025"
```

**Scenario 5: Invalid Role for Client**
```
User pastes: "Monday x 5 nurse shifts for Divine Care..."

AI checks: Divine Care has no nurse rates configured

AI Response:
"⚠️ Divine Care Centre doesn't have rates configured for 'nurse'.

Available roles for this client:
- Healthcare Assistant (£14.75/hr)
- Care Worker (£13.50/hr)

Which role should I use instead? Or would you like to configure nurse rates first?"

User: "Healthcare Assistant"

AI: "✅ Using Healthcare Assistant"
```

---

## 🧠 AI JARGON MAPPING

### **Role Aliases (AI Auto-Translates)**
```javascript
const ROLE_JARGON_MAP = {
  // Healthcare Assistant
  'hca': 'healthcare_assistant',
  'hca\'s': 'healthcare_assistant',
  'healthcare assistant': 'healthcare_assistant',
  'health care assistant': 'healthcare_assistant',
  'assistant': 'healthcare_assistant',

  // Care Worker
  'care assistant': 'care_worker',
  'care worker': 'care_worker',
  'carer': 'care_worker',
  'support worker': 'care_worker',

  // Nurse
  'rn': 'nurse',
  'registered nurse': 'nurse',
  'staff nurse': 'nurse',
  'rgn': 'nurse',

  // Senior Care Worker
  'senior': 'senior_care_worker',
  'senior carer': 'senior_care_worker',
  'senior care assistant': 'senior_care_worker',
  'team leader': 'senior_care_worker'
};
```

### **Client Name Fuzzy Matching**
```javascript
// AI uses fuzzy matching to find clients
// "Divine" → "Divine Care Centre"
// "St Mary" → "St Mary's Care Home"
// "Oakwood" → "Oakwood Residential Care"

// If multiple matches, ask user to clarify
// If no match, show list of all active clients
```

---

## 🔄 CONVERSATION FLOW

```
┌─────────────────────────────────────────────────────────┐
│ Step 1: User Pastes Schedule                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: AI Initial Extraction                           │
│ - Extract client name (fuzzy match)                     │
│ - Extract role mentions (translate jargon)              │
│ - Extract dates (infer month/year if possible)          │
│ - Extract quantities                                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: AI Validation (Multi-Turn Conversation)         │
│                                                          │
│ IF client ambiguous → Ask user to clarify               │
│ IF client not found → Show list, ask user               │
│ IF role invalid → Show available roles, ask user        │
│ IF month/year missing → Ask user                        │
│ IF dates invalid → Ask user to clarify                  │
│                                                          │
│ LOOP until all data is valid                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Step 4: AI Confirmation                                 │
│ "✅ Ready to create:                                    │
│  - Client: Divine Care Centre                           │
│  - Role: Healthcare Assistant                           │
│  - Period: November 2025                                │
│  - Total: 42 shifts                                     │
│                                                          │
│ Continue to preview? (yes/no)"                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Step 5: Convert to gridData → BulkShiftCreation         │
└─────────────────────────────────────────────────────────┘
```

---

## 💬 CONVERSATION UI

### **Chat Interface (Left Side)**
```
┌─────────────────────────────────────────────────────────┐
│ 🤖 AI Shift Assistant                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ [User] Pasted schedule text...                          │
│                                                          │
│ [AI] I found 2 clients matching 'Divine Care':          │
│      1. Divine Care Centre (London)                     │
│      2. Divine Care Home (Manchester)                   │
│      Which one? (Reply 1 or 2)                          │
│                                                          │
│ [User] 1                                                │
│                                                          │
│ [AI] ✅ Using Divine Care Centre                        │
│      I detected 42 Healthcare Assistant shifts          │
│      for November 2025.                                 │
│                                                          │
│      Ready to preview? (yes/no)                         │
│                                                          │
│ [User] yes                                              │
│                                                          │
│ [AI] ✅ Generating preview...                           │
│                                                          │
│ [Input box: Type your response...]                      │
└─────────────────────────────────────────────────────────┘
```

### **Preview Panel (Right Side - Shows After Confirmation)**
```
┌─────────────────────────────────────────────────────────┐
│ 📊 Extracted Shifts Preview                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Client: Divine Care Centre                              │
│ Role: Healthcare Assistant                              │
│ Period: November 2025                                   │
│                                                          │
│ Monday 17th: 5 day, 2 night (7 shifts)                  │
│ Tuesday 18th: 1 day, 2 night (3 shifts)                 │
│ ...                                                      │
│                                                          │
│ Total: 42 shifts | 504 hours | £7,434                   │
│                                                          │
│ [Continue to Full Preview →]                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ UPDATED IMPLEMENTATION

### **aiShiftParser.js (NOW 300 lines - includes conversation logic)**
```javascript
export async function conversationalExtraction(
  pastedText,
  agencyId,
  conversationHistory = []
) {
  // 1. Fetch agency's clients for matching
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('status', 'active');

  // 2. Build context-aware system prompt
  const systemPrompt = `You are an intelligent shift scheduling assistant.

**AGENCY CLIENTS:**
${clients.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')}

**ROLE JARGON MAPPING:**
- HCA, healthcare assistant, health care assistant → healthcare_assistant
- Care assistant, care worker, carer → care_worker
- RN, registered nurse, staff nurse → nurse
- Senior, senior carer → senior_care_worker

**YOUR JOB:**
1. Extract client name from pasted text (fuzzy match against client list)
2. Extract role mentions (translate jargon to standard role names)
3. Extract dates and quantities
4. Validate all data

**IF DATA IS MISSING OR AMBIGUOUS:**
- Ask clarifying questions
- Provide options for user to choose
- Don't proceed until all data is valid

**CONVERSATION HISTORY:**
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

**RESPONSE FORMAT:**
{
  "status": "needs_clarification" | "ready",
  "question": "Your question to user (if needs_clarification)",
  "options": ["Option 1", "Option 2"] (if applicable),
  "extracted_data": {
    "client_id": "uuid or null",
    "client_name": "matched name or null",
    "role": "standard role name or null",
    "month": "November or null",
    "year": "2025 or null",
    "shifts": [...]
  },
  "validation_errors": ["error 1", "error 2"]
}`;

  // 3. Call OpenAI
  const response = await InvokeLLM({
    systemPrompt,
    userMessage: pastedText,
    responseFormat: { type: "json_object" }
  });

  return response;
}
```

---

## ✅ UPDATED CHECKLIST

- [ ] Create `src/utils/aiShiftParser.js` (300 lines - with conversation logic)
- [ ] Create `src/pages/AIShiftPaste.jsx` (400 lines - with chat UI)
- [ ] Add client fuzzy matching
- [ ] Add role jargon translation
- [ ] Add multi-turn conversation handling
- [ ] Test with ambiguous inputs
- [ ] Test with invalid data
- [ ] Add route and navigation

**Total New Code:** ~700 lines (worth millions! 🚀)

---

**Ready to build the conversational AI version?**

