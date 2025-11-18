# 🎯 WHATSAPP HANDLER IMPLEMENTATION PLAN

## 🤔 **YOUR QUESTION: WHERE DOES THE LLM GO?**

**Answer:** It depends on the intent! Here's the strategy:

### **SIMPLE INTENTS (No LLM needed)** ✅
For structured data queries, we DON'T need LLM:
```
User: "What's my shifts?"
  ↓
Intent Detection (LLM) ← Already done!
  ↓
Supabase Query (Get shifts)
  ↓
Format Response (Code node) ← Just format the data
  ↓
Send WhatsApp
```

### **COMPLEX INTENTS (LLM needed)** 🤖
For open-ended questions, we USE LLM:
```
User: "What's the sick leave policy?"
  ↓
Intent Detection (LLM) ← Already done!
  ↓
Supabase Query (Get agency policies)
  ↓
LLM Response (OpenAI node) ← Generate natural answer
  ↓
Send WhatsApp
```

---

## 📋 **HANDLER-BY-HANDLER PLAN**

### **1. GREETING HANDLER** 👋
**Flow:** No database, no LLM - just static response

**Current Node:** "Handle Greeting" (Code node)

**Update Code:**
```javascript
const staffName = $('Format Staff Data').first().json.first_name;

return {
  message: `Hi ${staffName}! 👋 How can I help you today?

I can help with:
📅 Check your schedule
🔍 Find available shifts
💰 Calculate your pay
📋 Check compliance status
❓ Answer general questions

Just ask me anything!`
};
```

**Next Node:** → Format Final Response → Send WhatsApp ✅

---

### **2. CHECK SCHEDULE HANDLER** 📅
**Flow:** Supabase Query → Format (no LLM)

**Nodes to Add:**

#### **Node A: Query Shifts**
- **Type:** Supabase
- **Operation:** Get
- **Table:** `shifts`
- **Select:** `*, clients(name, address)`
- **Filters:**
  - `assigned_staff_id` = `{{ $('Format Staff Data').first().json.staff_id }}`
  - `status` in `['confirmed', 'assigned', 'in_progress']`
  - `date` >= `{{ $now.toFormat('yyyy-MM-dd') }}`
- **Sort:** `date ASC, start_time ASC`
- **Limit:** 10

#### **Node B: Format Schedule Response**
- **Type:** Code
- **JavaScript:**
```javascript
const shifts = $input.first().json;
const staffName = $('Format Staff Data').first().json.first_name;

if (!shifts || shifts.length === 0) {
  return {
    message: `Hi ${staffName}! 📅 You have no upcoming shifts scheduled.`
  };
}

let message = `📅 *Your Upcoming Shifts* (${shifts.length})\n\n`;

shifts.forEach((shift, i) => {
  const date = new Date(shift.date);
  const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
  const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  
  message += `${i + 1}. *${dayName}, ${dateStr}*\n`;
  message += `   🏥 ${shift.clients?.name || 'TBC'}\n`;
  message += `   ⏰ ${shift.start_time} - ${shift.end_time}\n`;
  message += `   💰 £${shift.pay_rate}/hr\n\n`;
});

return { message };
```

**Flow:** Handle Check Schedule → Query Shifts → Format Schedule Response → Format Final Response → Send WhatsApp

---

### **3. FIND SHIFTS HANDLER** 🔍
**Flow:** Supabase Query → Format (no LLM)

#### **Node A: Query Available Shifts**
- **Type:** Supabase
- **Operation:** Get
- **Table:** `shifts`
- **Select:** `*, clients(name, address)`
- **Filters:**
  - `status` = `open`
  - `marketplace_visible` = `true`
  - `date` >= `{{ $now.toFormat('yyyy-MM-dd') }}`
  - `agency_id` = `{{ $('Format Staff Data').first().json.agency_id }}`
- **Sort:** `date ASC`
- **Limit:** 5

#### **Node B: Format Available Shifts**
- **Type:** Code
```javascript
const shifts = $input.first().json;
const staffName = $('Format Staff Data').first().json.first_name;

if (!shifts || shifts.length === 0) {
  return {
    message: `Hi ${staffName}! 🔍 No available shifts right now. Check back later!`
  };
}

let message = `🔍 *Available Shifts* (${shifts.length})\n\n`;

shifts.forEach((shift, i) => {
  const date = new Date(shift.date);
  const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
  const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  
  message += `${i + 1}. *${dayName}, ${dateStr}*\n`;
  message += `   🏥 ${shift.clients?.name || 'TBC'}\n`;
  message += `   ⏰ ${shift.start_time} - ${shift.end_time}\n`;
  message += `   💰 £${shift.pay_rate}/hr\n`;
  message += `   📍 Shift ID: ${shift.id.substring(0, 8)}\n\n`;
});

message += `\nTo book a shift, reply: "Book shift [ID]"`;

return { message };
```

---

### **4. CHECK COMPLIANCE HANDLER** 📋
**Flow:** Query Staff → Format (no LLM)

#### **Node A: Get Compliance Data**
- **Type:** Code (reuse existing staff data)
```javascript
const staff = $('Format Staff Data').first().json;
const staffName = staff.first_name;

// Get compliance data from staff record
const dbsExpiry = staff.dbs_expiry_date;
const dbsStatus = staff.dbs_status;

let message = `📋 *Compliance Status for ${staffName}*\n\n`;

// DBS Check
if (dbsStatus === 'valid') {
  message += `✅ DBS Check: Valid\n`;
  if (dbsExpiry) {
    message += `   Expires: ${new Date(dbsExpiry).toLocaleDateString('en-GB')}\n`;
  }
} else {
  message += `⚠️ DBS Check: ${dbsStatus || 'Not uploaded'}\n`;
}

message += `\n📄 Need to upload documents? Visit the app:\nhttps://agilecaremanagement.netlify.app/staff/compliance`;

return { message };
```

---

### **5. CALCULATE PAY HANDLER** 💰
**Flow:** Query Shifts → Calculate → Format (no LLM)

#### **Node A: Query Completed Shifts**
- **Type:** Supabase
- **Operation:** Get
- **Table:** `shifts`
- **Select:** `date, start_time, end_time, pay_rate, actual_start_time, actual_end_time`
- **Filters:**
  - `assigned_staff_id` = `{{ $('Format Staff Data').first().json.staff_id }}`
  - `status` = `completed`
  - `date` >= `{{ $now.minus({days: 30}).toFormat('yyyy-MM-dd') }}`

#### **Node B: Calculate Earnings**
- **Type:** Code
```javascript
const shifts = $input.first().json;
const staffName = $('Format Staff Data').first().json.first_name;

if (!shifts || shifts.length === 0) {
  return {
    message: `Hi ${staffName}! 💰 No completed shifts in the last 30 days.`
  };
}

let totalHours = 0;
let totalPay = 0;

shifts.forEach(shift => {
  const start = new Date(`${shift.date}T${shift.actual_start_time || shift.start_time}`);
  const end = new Date(`${shift.date}T${shift.actual_end_time || shift.end_time}`);
  const hours = (end - start) / (1000 * 60 * 60);
  
  totalHours += hours;
  totalPay += hours * shift.pay_rate;
});

let message = `💰 *Earnings Summary (Last 30 Days)*\n\n`;
message += `📊 Total Shifts: ${shifts.length}\n`;
message += `⏱️ Total Hours: ${totalHours.toFixed(1)}h\n`;
message += `💵 Total Earnings: £${totalPay.toFixed(2)}\n`;
message += `📈 Average per shift: £${(totalPay / shifts.length).toFixed(2)}`;

return { message };
```

---

### **6. GENERAL QUESTION HANDLER** ❓
**Flow:** Get Context → LLM Response

#### **Node A: Prepare Context**
- **Type:** Code
```javascript
const staff = $('Format Staff Data').first().json;
const question = $('Extract Message Data').first().json['message.text'];

return {
  staff_name: staff.first_name,
  staff_role: staff.role,
  agency_id: staff.agency_id,
  question: question
};
```

#### **Node B: LLM Response**
- **Type:** OpenAI
- **Model:** gpt-4o-mini
- **System Prompt:**
```
You are a helpful assistant for ACG StaffLink healthcare staffing agency.

Answer the staff member's question professionally and concisely.

Common topics:
- Sick leave policy
- Holiday requests
- Timesheet submission
- Shift cancellation policy
- Payment schedules
- Contact information

Keep responses under 200 words.
```
- **User Message:** `{{ $json.question }}`

---

## 🔄 **WORKFLOW STRUCTURE**

```
WhatsApp Trigger
  ↓
Extract Message Data
  ↓
Get Staff by Phone (Supabase)
  ↓
Format Staff Data
  ↓
Intent Classification (OpenAI) ← LLM #1
  ↓
Parse Intent
  ↓
Route by Intent (Switch)
  ↓
┌─────────────────────────────────────┐
│ GREETING → Code → Send              │
│ CHECK SCHEDULE → Supabase → Code → Send │
│ FIND SHIFTS → Supabase → Code → Send    │
│ COMPLIANCE → Code → Send            │
│ CALCULATE PAY → Supabase → Code → Send  │
│ GENERAL Q → Code → OpenAI → Send   │ ← LLM #2
└─────────────────────────────────────┘
```

---

**Ready to implement? Which handler should we start with?** 🚀

