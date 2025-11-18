# 🎯 ACG STAFFLINK - WHATSAPP MASTER PLAN

## 📋 **YOUR QUESTIONS ANSWERED**

### **Q1: Can we link Netlify URL to Supabase functions?**
**A:** No, but we don't need to! Here's the architecture:
- **Netlify**: `https://agilecaremanagement.netlify.app` (frontend only)
- **Supabase Edge Functions**: `https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/...`
- **n8n**: Calls Supabase Edge Functions directly (not through Netlify)

### **Q2: Do we need Header Auth in n8n for Supabase?**
**A:** YES! Create this credential in n8n:
- **Type**: "Header Auth"
- **Name**: "Supabase Service Role Key"
- **Header Name**: `Authorization`
- **Header Value**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo`

### **Q3: Strategy for sending WhatsApp to multiple users?**
**A:** WhatsApp Business Cloud API (FREE - no sandbox needed!):
- ✅ **1,000 free conversations/month** per phone number
- ✅ **No sandbox** - users receive messages directly
- ✅ **No opt-in required** (for service notifications)
- ✅ **Template messages** for notifications (pre-approved by Meta)
- ✅ **Conversational messages** for replies (24h window after user messages you)

**Current Setup:**
- You already have WhatsApp Business Cloud API configured in n8n
- Phone Number ID: `683816761472557`
- This is production-ready!

### **Q4: PIN Authentication Strategy?**
**A:** Your existing workflow already has this! We'll use:
- ✅ **Phone number lookup** in `staff` table (primary auth)
- ✅ **PIN generation** (optional, for high-security actions)
- ✅ **Session management** (track conversation state)

**Recommendation:** Start with phone-only auth, add PIN later if needed.

### **Q5: Which database tables for Priority 2 AI?**
**A:** Based on your workflow, here's the optimal set:

**CORE TABLES (Must Have):**
1. ✅ `staff` - User identity, availability, compliance
2. ✅ `shifts` - Upcoming shifts, assignments
3. ✅ `agencies` - Agency name, contact info
4. ✅ `clients` - Client names, locations

**SECONDARY TABLES (Nice to Have):**
5. ⚠️ `timesheets` - Earnings calculation
6. ⚠️ `bookings` - Shift booking history
7. ⚠️ `compliance_documents` - DBS, certificates

**Strategy:** Use Supabase node in n8n to query these tables directly (no Edge Function needed for simple queries!)

---

## 🏗️ **ARCHITECTURE OVERVIEW**

### **Priority 1: Agency → Staff (Outgoing)**
```
ACG StaffLink App → Supabase Edge Function → n8n Sender Workflow → WhatsApp Business API → Staff
```

### **Priority 2: Staff → Agency (Incoming)**
```
Staff → WhatsApp Business API → n8n Receiver Workflow → Supabase Queries → OpenAI Intent Detection → Response → Staff
```

**Key Insight:** Your existing workflow (`Whatsapp-ACG-Comp.json`) is PERFECT for Priority 2! We just need to:
1. Connect it to ACG StaffLink database
2. Add database query nodes after intent detection
3. Format responses with real data

---

## 📊 **PRIORITY 1: AGENCY → STAFF NOTIFICATIONS**

### **Use Cases:**
1. ✅ **Shift Assignment** - "You've been assigned to Divine Care Center on Mon, 18 Nov..."
2. ✅ **24h Pre-Shift Reminder** - "REMINDER: You have a shift TOMORROW at 8am..."
3. ✅ **2h Pre-Shift Reminder + GPS** - "SHIFT STARTING SOON: Turn on GPS & clock in..."
4. ✅ **Post-Shift Timesheet** - "Shift complete! GPS timesheet auto-created..."
5. ⚠️ **Shift Cancellation** - "URGENT: Your shift on Mon, 18 Nov has been cancelled"
6. ⚠️ **Compliance Expiry** - "Your DBS expires in 30 days. Please renew..."

### **Status:**
- ✅ Items 1-4 already implemented and working!
- ⚠️ Items 5-6 need implementation

### **n8n Workflow: "ACG StaffLink - WhatsApp Sender"**

**Nodes:**
1. **Webhook Trigger** - Receives requests from Supabase Edge Functions
2. **Extract Data** - Parse shift/staff details
3. **Format Message** - Create WhatsApp message with emojis
4. **Send WhatsApp** - WhatsApp Business Cloud API node
5. **Log Response** - Store delivery status

---

## 🤖 **PRIORITY 2: STAFF → AGENCY CONVERSATIONAL AI**

### **Use Cases (Your Workflow Already Handles!):**
1. ✅ **Greeting** - "Hi! How can I help?"
2. ✅ **Check Schedule** - "What's my shifts this week?"
3. ✅ **Find Shifts** - "Any shifts available?"
4. ✅ **Book Shift** - "Book shift ABC-123"
5. ✅ **Cancel Booking** - "Cancel my Monday shift"
6. ✅ **Check Compliance** - "When does my DBS expire?"
7. ✅ **Calculate Pay** - "How much will I earn this week?"
8. ✅ **General Question** - "What's the sick leave policy?"

### **n8n Workflow: "ACG StaffLink - WhatsApp Receiver" (Based on your existing workflow)**

**Nodes (Manual Creation Steps):**

1. **WhatsApp Trigger**
   - Type: `WhatsApp Trigger`
   - Updates: `messages`
   - Webhook ID: `acg-stafflink-receiver`

2. **Filter Text Messages**
   - Type: `Switch`
   - Condition: `{{ $json.messages[0].type == "text" }}`
   - Outputs: "Text", "Voice" (ignore voice for now)

3. **Extract Message Data**
   - Type: `Set`
   - Fields:
     - `message.text` = `{{ $json.messages[0].text.body }}`
     - `sessionId` = `{{ $json.messages[0].from }}`

4. **Check Valid Message**
   - Type: `IF`
   - Condition: `message.text` is not empty

5. **Get Staff by Phone** ⭐ **KEY NODE**
   - Type: `Supabase`
   - Operation: `Get`
   - Table: `staff`
   - Filter: `phone` = `{{ $json.sessionId }}`
   - Credential: "ACG-Supabase"

6. **Format Staff Data**
   - Type: `Code`
   - JavaScript: Extract staff info + message text
   - Output: `staff_id`, `first_name`, `agency_id`, `message_text`, etc.

7. **Check Staff Error**
   - Type: `IF`
   - Condition: `error` = `true`
   - True: Send "Phone not found" message
   - False: Continue to intent detection

8. **Intent Classification** ⭐ **AI NODE**
   - Type: `OpenAI`
   - Model: `gpt-4o-mini`
   - System Prompt: (Your existing prompt - it's excellent!)
   - Output: Intent + parameters

9. **Parse Intent**
   - Type: `Code`
   - JavaScript: Extract intent from AI response

10. **Check Multi-Intent**
    - Type: `IF`
    - Condition: `is_multi_intent` = `true`
    - True: Ask user to prioritize
    - False: Route to handler

11. **Route by Intent**
    - Type: `Switch`
    - Outputs: Greeting, Check Schedule, Find Shifts, Book Shift, Cancel Booking, Check Compliance, Calculate Pay, General Question, Unknown

12-19. **Intent Handlers** (8 nodes)
    - Type: `Code` (for simple responses)
    - Type: `Supabase` (for database queries)
    - Each handler formats response message

20. **Format Final Response**
    - Type: `Code`
    - Prepare message for WhatsApp

21. **Send WhatsApp Response**
    - Type: `WhatsApp`
    - Phone Number ID: `683816761472557`
    - Recipient: `{{ $('WhatsApp Trigger').item.json.messages[0].from }}`
    - Message: `{{ $json.body }}`

---

## 🎯 **NEXT STEPS - IMPLEMENTATION ORDER**

### **Step 1: Set Up n8n Credentials** ✅
1. Create "ACG-Supabase" credential (Supabase API)
2. Create "Supabase Service Role Key" (Header Auth)
3. Create "WhatsApp Business Cloud API" credential

### **Step 2: Test Priority 1 (Already Working!)** ✅
1. Verify shift assignment notifications work
2. Verify pre-shift reminders work
3. Verify post-shift reminders work

### **Step 3: Build Priority 2 Receiver Workflow** 🔨
1. Import your existing `Whatsapp-ACG-Comp.json` as template
2. Update Supabase queries to ACG StaffLink tables
3. Add database query nodes for each intent
4. Test with real WhatsApp messages

### **Step 4: Enhance Intent Handlers** 🚀
1. **Check Schedule**: Query `shifts` table, format with dates/times
2. **Find Shifts**: Query `shifts` where `status='open'` and `marketplace_visible=true`
3. **Check Compliance**: Query `staff` table for expiry dates
4. **Calculate Pay**: Query `timesheets` or `shifts`, sum pay_rate * hours

---

**Ready to proceed? Which phase should we tackle first?** 🎯

