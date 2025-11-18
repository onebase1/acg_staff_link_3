# AI Shift Paste - Manual Test Plan

**Date:** 2025-11-18  
**Feature:** AI Shift Paste with Conversational Validation  
**Expected Result:** 42 shifts created (23 day + 19 night) for November 17-23

---

## 🎯 Test Objective

Verify that AI Shift Paste can:
1. Extract shifts from pasted schedule text
2. Handle conversational clarification (client, role, month)
3. Convert to gridData format
4. Hand off to BulkShiftCreation backend
5. Create 42 shifts in database

---

## 📋 Test Data

### Schedule Text (Paste This):
```
DAYS

Monday- 17th x 5 – Agatha Eze, Mba Kalu James, Oluchi Victoria Ezeokoye, Eneche Ojima & Janet Ochefije Atama

Tuesday – 18th  x 1- Oluchi Victoria Ezeokoye

Wednesday – 19th x 2 – Aminata Bangura & Agatha Eze

Thursday – 20th x 4 – Agatha Eze, Aminata Bangura, Aninta Into Amboson & Oluchi Victoria Ezeokoye

Friday 21st x 2 - Aminata Bangura & Agatha Eze

Saturday 22nd x 5 - Agatha Eze, Mba Kalu James, Oluchi Victoria Ezeokoye, Eneche Ojima & Darlington Sakpoba

Sunday 23rd  x 4 – Ashia Ernest, Mba Kalu James, Darlington Sakpoba & Eneche Ojima

 

NIGHTS

Monday 17th x 2 – Ozia Odewenwa & Ifechukwude Stellamaris Okafor

Tuesday 18th x 2 – Ifechukwude Stellamaris Okafor & Deepak Siliveri

Wednesday 19th x 3 – Ozia Odewenwa, Ifechukwude Stellamaris Okafor & Aishat Kehinde Olaitan

Thursday 20th x 3 – Ozia Odewenwa, Ifechukwude Stellamaris Okafor & Theresa Utomi

Friday 21st x 5 – Akintola Akinpelu, Ozia Odewenwa, Aishat Kehinde Olaitan, Deepak Siliveri, & Theresa Utomi

Saturday 22nd x 3 – Akintola Akinpelu, Ozia Odewenwa & Deepak Siliveri

Sunday 23rd x 3 – Akintola Akinpelu, Ozia & Aminata Bangura & Lilian Chinenye Onwumelu
```

### Expected Extraction:
- **Day Shifts:** 23 (5+1+2+4+2+5+4)
- **Night Shifts:** 19 (2+2+3+3+5+3+3)
- **Total:** 42 shifts
- **Dates:** November 17-23, 2025
- **Client:** Any care home with no location requirement
- **Role:** Healthcare Assistant (HCA)
- **Staff Names:** IGNORED (shifts created as "open")

---

## 🧪 Test Steps

### Step 1: Navigate to AI Shift Paste
1. Login as admin
2. Go to Dashboard
3. Click "Quick Actions"
4. Click "AI Shift Paste" button (purple with Sparkles icon)

**Expected:** AI Shift Paste page loads with chat interface

---

### Step 2: Paste Schedule
1. Copy the schedule text above
2. Paste into the textarea at bottom of chat
3. Click Send button (or press Enter)

**Expected:** 
- User message appears in chat (purple bubble)
- AI starts processing (loading spinner)

---

### Step 3: AI Conversation - Client Selection
**AI will ask:** "Which client are these shifts for?"

**Response:** Type the name of any care home client (e.g., "Divine Care Centre")

**Expected:**
- AI confirms client selection
- Context panel on right shows selected client

---

### Step 4: AI Conversation - Month/Year
**AI will ask:** "Which month?" or "Which year?"

**Response:** Type "November 2025"

**Expected:**
- AI confirms month/year
- Context panel shows "November 2025"

---

### Step 5: AI Conversation - Role
**AI might ask:** "Which role?" (if not clear from "HCA" in text)

**Response:** Type "Healthcare Assistant" or "HCA"

**Expected:**
- AI confirms role
- Context panel shows "healthcare_assistant"

---

### Step 6: AI Confirmation
**AI will say:** "Ready to create X shifts. Continue to preview?"

**Response:** Type "yes"

**Expected:**
- Page transitions to preview screen
- Shows tabular preview of all 42 shifts

---

### Step 7: Review Preview
**Check:**
- ✅ Monday 17th: 5 day + 2 night = 7 shifts
- ✅ Tuesday 18th: 1 day + 2 night = 3 shifts
- ✅ Wednesday 19th: 2 day + 3 night = 5 shifts
- ✅ Thursday 20th: 4 day + 3 night = 7 shifts
- ✅ Friday 21st: 2 day + 5 night = 7 shifts
- ✅ Saturday 22nd: 5 day + 3 night = 8 shifts
- ✅ Sunday 23rd: 4 day + 3 night = 7 shifts
- ✅ **Total: 42 shifts**

**Expected:**
- All shifts show as "open" status
- No staff assigned
- Correct dates (Nov 17-23)
- Correct shift types (day/night)
- Correct times (08:00-20:00 for day, 20:00-08:00 for night)

---

### Step 8: Create Shifts
1. Click "Create All Shifts" button
2. Wait for progress bar

**Expected:**
- Progress bar shows 0% → 100%
- Success message: "🎉 Successfully created 42 shifts!"
- Auto-redirect to Shifts page after 3 seconds

---

### Step 9: Verify in Database
1. Go to Shifts page
2. Filter by date range: Nov 17-23, 2025
3. Filter by client (the one you selected)
4. Filter by status: "open"

**Expected:**
- 42 shifts visible
- All shifts are "open" (no staff assigned)
- Correct dates and times
- Correct client and role

---

## ✅ Success Criteria

- [ ] AI correctly extracts 42 shifts from pasted text
- [ ] AI asks clarifying questions (client, month, role)
- [ ] AI ignores staff names in pasted text
- [ ] Preview shows all 42 shifts correctly
- [ ] All 42 shifts created in database
- [ ] All shifts are "open" status
- [ ] No staff assigned to any shift
- [ ] Correct dates (Nov 17-23, 2025)
- [ ] Correct shift types (day/night)
- [ ] Correct times based on client configuration

---

## 🐛 Known Issues / Edge Cases

1. **AI might not recognize client name** → Provide list of clients to choose from
2. **AI might ask for year separately** → Respond with "2025"
3. **AI might translate "HCA" to different role** → Confirm "Healthcare Assistant"
4. **Preview might take time to load** → Wait for expandGridToShifts() to process

---

## 📊 Test Results

**Date Tested:** _____________  
**Tester:** _____________  
**Result:** ☐ PASS ☐ FAIL  
**Notes:**

---

**If test fails, check:**
1. Is InvokeLLM edge function working?
2. Are clients loaded correctly?
3. Is BulkShiftCreation backend working?
4. Check browser console for errors

