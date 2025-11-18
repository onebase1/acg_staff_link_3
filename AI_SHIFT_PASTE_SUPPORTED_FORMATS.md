# AI Shift Paste - Supported Schedule Formats

## ✅ SUPPORTED FORMATS (AI Handles These Automatically)

### Format 1: Standard Day/Night Sections
```
DAYS
Monday 17th x 5
Tuesday 18th x 1
Wednesday 19th x 2

NIGHTS
Monday 17th x 2
Tuesday 18th x 2
```

### Format 2: With Dashes/Hyphens
```
DAYS
Monday- 17th x 5
Tuesday – 18th x 1
Wednesday – 19th x 2

NIGHTS
Monday 17th x 2
Tuesday 18th x 2
```

### Format 3: Full Date Format
```
DAYS
Monday 17th November x 5
Tuesday 18th November x 1
Wednesday 19th November x 2

NIGHTS
Monday 17th November x 2
Tuesday 18th November x 2
```

### Format 4: Numeric Dates
```
DAYS
17/11 x 5
18/11 x 1
19/11 x 2

NIGHTS
17/11 x 2
18/11 x 2
```

### Format 5: Mixed Case
```
days
monday 17th x 5
tuesday 18th x 1

nights
monday 17th x 2
```

### Format 6: With Role Mentions
```
HCA SHIFTS - DAYS
Monday 17th x 5
Tuesday 18th x 1

HCA SHIFTS - NIGHTS
Monday 17th x 2
```

### Format 7: Care Worker Format
```
CARE WORKER SHIFTS
DAYS
Monday 17th x 5
Tuesday 18th x 1

NIGHTS
Monday 17th x 2
```

### Format 8: Nurse Format
```
NURSE SHIFTS
DAYS
Monday 17th x 5

NIGHTS
Monday 17th x 2
```

---

## ❌ REJECTED FORMATS (AI Will Ask User to Reformat)

### ❌ Format with Staff Names (REJECTED)
```
DAYS
Monday 17th x 5 – Agatha Eze, Mba Kalu James, Oluchi Victoria
Tuesday 18th x 1 – Oluchi Victoria
```
**AI Response**: "Please remove staff names and paste only dates and quantities. Example: 'Monday 17th x 5'"

### ❌ Format with Time Ranges (REJECTED)
```
Monday 17th 08:00-20:00 x 5
Tuesday 18th 08:00-20:00 x 1
```
**AI Response**: "Please use 'DAYS' or 'NIGHTS' sections instead of specific times. Example: 'DAYS\nMonday 17th x 5'"

### ❌ Format with Client Names Mixed In (REJECTED)
```
Divine Care - Monday 17th x 5
Divine Care - Tuesday 18th x 1
```
**AI Response**: "Please remove client names from each line. I'll ask you which client separately. Example: 'Monday 17th x 5'"

### ❌ Unstructured Text (REJECTED)
```
We need 5 healthcare assistants on Monday the 17th and 1 on Tuesday
```
**AI Response**: "Please use the standard format: 'DAYS\nMonday 17th x 5\nTuesday 18th x 1'"

---

## 📋 REQUIRED FORMAT RULES

### ✅ MUST INCLUDE:
1. **Section Headers**: "DAYS" or "NIGHTS" (case-insensitive)
2. **Date Format**: Day name + date number (e.g., "Monday 17th")
3. **Quantity Format**: "x [number]" (e.g., "x 5")

### ✅ OPTIONAL:
1. Month name (e.g., "Monday 17th November")
2. Dashes/hyphens between elements
3. Role mentions (HCA, Care Worker, Nurse)

### ❌ MUST EXCLUDE:
1. Staff names
2. Specific time ranges (08:00-20:00)
3. Client names on each line
4. Unstructured sentences

---

## 🎯 ENFORCEMENT STRATEGY

### Step 1: AI Detects Invalid Format
If user pastes format with staff names or invalid structure:
```
AI: "I detected staff names in your schedule. Please remove them and paste only:
- Day name + date
- Quantity (x 5)
- Section headers (DAYS/NIGHTS)

Example:
DAYS
Monday 17th x 5
Tuesday 18th x 1

NIGHTS
Monday 17th x 2"
```

### Step 2: AI Provides Template
```
AI: "Please use this template:

DAYS
[Day] [Date]th x [Quantity]
[Day] [Date]th x [Quantity]

NIGHTS
[Day] [Date]th x [Quantity]

Example:
DAYS
Monday 17th x 5
Tuesday 18th x 1

NIGHTS
Monday 17th x 2"
```

### Step 3: AI Rejects Until Correct
- AI will NOT proceed until format is correct
- AI will keep showing examples
- AI will highlight what's wrong

---

## 🚀 BENEFITS OF STANDARDIZED FORMAT

### For Agencies:
✅ Faster shift creation (30 seconds vs 30 minutes)
✅ No manual data entry errors
✅ Consistent shift records
✅ Easy to copy/paste from Excel or WhatsApp

### For AI:
✅ 100% accurate extraction
✅ No ambiguity in parsing
✅ Predictable validation
✅ Easy to add new formats later

### For Staff:
✅ Shifts created as "open" (no pre-assignment)
✅ Fair marketplace visibility
✅ No bias in shift allocation

---

## 📝 EXAMPLES OF VALID SCHEDULES

### Example 1: Simple Week
```
DAYS
Monday 17th x 5
Tuesday 18th x 1
Wednesday 19th x 2
Thursday 20th x 4
Friday 21st x 2

NIGHTS
Monday 17th x 2
Tuesday 18th x 2
Wednesday 19th x 3
Thursday 20th x 3
Friday 21st x 5
```

### Example 2: With Role
```
HEALTHCARE ASSISTANT SHIFTS

DAYS
Monday 17th x 5
Tuesday 18th x 1

NIGHTS
Monday 17th x 2
```

### Example 3: Mixed Roles (Separate Pastes)
```
First Paste (HCA):
DAYS
Monday 17th x 5

Second Paste (Nurse):
DAYS
Monday 17th x 2
```

---

## 🎓 USER TRAINING

### What to Tell Agencies:
1. "Remove all staff names before pasting"
2. "Use DAYS and NIGHTS sections"
3. "Format: 'Monday 17th x 5'"
4. "AI will ask for client and role separately"

### What AI Will Handle:
1. Client selection (fuzzy matching)
2. Role selection (jargon translation)
3. Month/year selection
4. Shift time calculation (day = 08:00-20:00, night = 20:00-08:00)
5. Financial preview
6. Database creation

---

**This format enforcement ensures data quality and forces agencies to adopt best practices! 🎯**

