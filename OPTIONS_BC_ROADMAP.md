# 🗺️ Options B & C: Smart Prompts + LLM Reasoning - Roadmap

**Date:** 2025-11-18  
**Status:** ⏸️ Future Enhancement (Separate Functions)  
**Dependencies:** Option A must be deployed first

---

## 🎯 **STRATEGY: MODULAR APPROACH**

**Why Separate Functions?**
- ✅ If B/C get stuck, Option A still works
- ✅ Can test independently
- ✅ Can enable/disable per agency
- ✅ Easier to debug and maintain

**Deployment Order:**
1. ✅ **Option A** (Interactive Confirmation) - DEPLOY NOW
2. ⏸️ **Option B** (Smart Prompts) - Build when ready
3. ⏸️ **Option C** (LLM Reasoning) - Build when ready

---

## 🔧 **OPTION B: SMART PROMPTS (LOW CONFIDENCE)**

### **The Problem:**
```
Staff uploads timesheet
   ↓
OCR confidence = 65% (low)
   ↓
Current: Simple "Timesheet received" message
   ↓
Issue: Staff doesn't know WHY it's low confidence
   ↓
Result: Admin has to review manually
```

### **The Solution:**
```
Staff uploads timesheet
   ↓
OCR confidence = 65% (low)
   ↓
Analyze WHY confidence is low:
   ├─ Missing signature? → "Are you still at site? Can you get signature?"
   ├─ Missing hours? → "Please reply with total hours worked (e.g., '12')"
   ├─ Blurry image? → "Please retake photo with better lighting"
   └─ Other issues? → "Admin will review and contact you if needed"
   ↓
Staff responds with fix
   ↓
Update timesheet with corrected data
   ↓
Re-run OCR or validation
```

---

### **Implementation Plan:**

**File:** `supabase/functions/whatsapp-timesheet-smart-prompts/index.ts` (NEW)

**Function Signature:**
```typescript
async function analyzeAndPrompt(
    extractedData: any,
    confidenceScore: number,
    shift: any,
    staff: any
): Promise<{ prompt: string, issue_type: string }>
```

**Logic:**
```typescript
// Analyze what's missing
const issues = [];

if (!extractedData.signature_present) {
    issues.push({
        type: 'missing_signature',
        severity: 'high',
        prompt: `⚠️ *Signature Missing*\n\n` +
                `Are you still at ${shift.clients?.name}?\n\n` +
                `Reply YES if you can return to get signature\n` +
                `Reply NO if you've already left`
    });
}

if (!extractedData.hours_worked || extractedData.hours_worked === 0) {
    issues.push({
        type: 'missing_hours',
        severity: 'critical',
        prompt: `⚠️ *Hours Unclear*\n\n` +
                `We couldn't read the hours worked.\n\n` +
                `Please reply with total hours (e.g., "12")`
    });
}

if (confidenceScore < 60) {
    issues.push({
        type: 'low_quality_image',
        severity: 'medium',
        prompt: `⚠️ *Image Quality Low*\n\n` +
                `Please retake photo with:\n` +
                `• Better lighting\n` +
                `• All text visible\n` +
                `• No shadows or glare`
    });
}

// Return highest severity issue
return issues.sort((a, b) => 
    severityScore(b.severity) - severityScore(a.severity)
)[0];
```

**Integration:**
```typescript
// In whatsapp-timesheet-upload-handler
if (confidenceScore < 80) {
    // Call smart prompts function
    const { data: promptResult } = await supabase.functions.invoke(
        'whatsapp-timesheet-smart-prompts',
        { body: { extractedData, confidenceScore, shift, staff, phone } }
    );
    
    // Send targeted prompt instead of generic confirmation
}
```

---

### **Estimated Effort:**
- **Development:** 2-3 hours
- **Testing:** 1 hour
- **Deployment:** 30 minutes

**Total:** ~4 hours

---

## 🧠 **OPTION C: LLM REASONING (WEEKLY TIMESHEET)**

### **The Problem You Identified:**

**Weekly Timesheet Reality:**
```
Monday: Staff uploads timesheet with 1 column filled (Monday)
Tuesday: Staff uploads SAME timesheet with 2 columns filled (Monday + Tuesday)
Wednesday: Staff uploads SAME timesheet with 3 columns filled (Monday + Tuesday + Wednesday)
...
```

**Current OCR Problem:**
- ❌ OCR extracts ALL visible data (sums Monday + Tuesday + Wednesday)
- ❌ Creates duplicate timesheets
- ❌ Wrong total hours (e.g., 36h instead of 12h)

**Example:**
```
Monday shift: 8h
Tuesday shift: 12h
Wednesday shift: 12h

Staff uploads Wednesday timesheet:
OCR sees: 8h + 12h + 12h = 32h ❌ WRONG!
Should extract: 12h (Wednesday only) ✅ CORRECT
```

---

### **The Solution (LLM Reasoning):**

**Use GPT-4 Vision with Context:**
```
Staff uploads timesheet
   ↓
Send image + context to GPT-4 Vision:
   
   "This is a weekly timesheet for [Staff Name] at [Care Home].
    Staff works Monday-Friday at the same location.
    
    Today is Wednesday, 2025-11-20.
    
    Previous submissions:
    - Monday 2025-11-18: 8h (already submitted)
    - Tuesday 2025-11-19: 12h (already submitted)
    
    TASK: Extract ONLY Wednesday's data (2025-11-20).
    IGNORE Monday and Tuesday columns (already submitted).
    
    Validate:
    1. Is Wednesday column filled?
    2. Does date match 2025-11-20?
    3. Is signature present?
    4. Are hours reasonable (4-13h)?
    5. Is this a duplicate submission?
    
    Return JSON:
    {
      'is_new_submission': true/false,
      'target_date': '2025-11-20',
      'hours_worked': 12,
      'break_minutes': 30,
      'signature_present': true,
      'confidence': 95,
      'reasoning': 'Wednesday column is filled, matches shift date, signature present',
      'duplicate_detected': false
    }"
   ↓
   LLM responds with structured JSON
   ↓
   Create timesheet with validated data (Wednesday only)
```

---

### **Implementation Plan:**

**File:** `supabase/functions/whatsapp-timesheet-llm-validator/index.ts` (NEW)

**Function Signature:**
```typescript
async function validateWithLLM(
    imageUrl: string,
    staff: any,
    shift: any,
    previousSubmissions: any[]
): Promise<{
    is_new_submission: boolean,
    extracted_data: any,
    confidence: number,
    reasoning: string,
    duplicate_detected: boolean
}>
```

**GPT-4 Vision Prompt:**
```typescript
const prompt = `You are a timesheet validation expert.

CONTEXT:
- Staff: ${staff.first_name} ${staff.last_name}
- Care Home: ${shift.clients?.name}
- Today's Shift: ${shift.date}
- Scheduled Hours: ${shift.duration_hours}h

PREVIOUS SUBMISSIONS (IGNORE THESE):
${previousSubmissions.map(s => 
    `- ${s.shift_date}: ${s.total_hours}h (already submitted)`
).join('\n')}

TASK:
Analyze the attached timesheet image and extract ONLY today's data (${shift.date}).

VALIDATION RULES:
1. Is today's column (${shift.date}) filled?
2. Does the date match ${shift.date}?
3. Is signature present?
4. Are hours reasonable (4-13h)?
5. Is this a duplicate submission?

RETURN JSON:
{
  "is_new_submission": true/false,
  "target_date": "${shift.date}",
  "hours_worked": <number>,
  "break_minutes": <number>,
  "signature_present": true/false,
  "confidence": <0-100>,
  "reasoning": "<brief explanation>",
  "duplicate_detected": true/false,
  "issues": ["<list any issues>"]
}`;

const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
        {
            role: "user",
            content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
            ]
        }
    ],
    temperature: 0.1,
    max_tokens: 800,
    response_format: { type: "json_object" }
});
```

**Integration:**
```typescript
// In whatsapp-timesheet-upload-handler
// Get previous submissions for this staff at this care home
const { data: previousSubmissions } = await supabase
    .from('timesheets')
    .select('*, shifts!inner(*)')
    .eq('staff_id', staff.id)
    .eq('shifts.client_id', shift.client_id)
    .gte('shifts.date', sevenDaysAgo)
    .lt('shifts.date', shift.date)
    .order('shifts.date', { ascending: false });

// Call LLM validator
const { data: llmResult } = await supabase.functions.invoke(
    'whatsapp-timesheet-llm-validator',
    { 
        body: { 
            imageUrl: file_url, 
            staff, 
            shift, 
            previousSubmissions 
        } 
    }
);

if (llmResult.duplicate_detected) {
    // Send message: "You already submitted this timesheet"
    return;
}

if (!llmResult.is_new_submission) {
    // Send message: "No new data found for today's shift"
    return;
}

// Use LLM-validated data instead of OCR data
const extractedData = llmResult.extracted_data;
```

---

### **Estimated Effort:**
- **Development:** 4-5 hours
- **Testing:** 2 hours (need real weekly timesheets)
- **Deployment:** 30 minutes

**Total:** ~7 hours

---

## 📊 **COMPARISON: OPTIONS A, B, C**

| Feature | Option A | Option B | Option C |
|---------|----------|----------|----------|
| **Purpose** | Confirm high confidence data | Fix low confidence issues | Handle weekly timesheets |
| **Trigger** | Confidence ≥80% | Confidence <80% | Always (if enabled) |
| **User Action** | Reply YES/NO | Reply with fix | None (automatic) |
| **Admin Work** | Reduced (only if NO) | Reduced (staff fixes) | Minimal (LLM validates) |
| **Complexity** | Low | Medium | High |
| **Effort** | 2 hours | 4 hours | 7 hours |
| **Status** | ✅ READY | ⏸️ Future | ⏸️ Future |

---

## 🚀 **RECOMMENDED DEPLOYMENT ORDER**

### **Phase 1: NOW**
1. ✅ Deploy Option A (Interactive Confirmation)
2. ✅ Test with real timesheets
3. ✅ Monitor for 1-2 weeks

### **Phase 2: AFTER OPTION A IS STABLE**
4. ⏸️ Build Option B (Smart Prompts)
5. ⏸️ Test with low confidence timesheets
6. ⏸️ Deploy as separate function

### **Phase 3: AFTER OPTION B IS STABLE**
7. ⏸️ Build Option C (LLM Reasoning)
8. ⏸️ Test with weekly timesheets
9. ⏸️ Deploy as separate function

---

## ✅ **DECISION REQUIRED**

**For NOW:**
- ✅ Deploy Option A (Interactive Confirmation)
- ⏸️ Hold Options B & C for future

**For FUTURE:**
- When ready, build Option B (4 hours)
- When ready, build Option C (7 hours)

**What do you think? Ready to deploy Option A?** 🚀

