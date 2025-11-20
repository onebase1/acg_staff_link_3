# 📱 n8n WORKFLOW CREATION STEPS

## 🔐 **STEP 1: CREATE CREDENTIALS**

### **1.1 Supabase API Credential**
1. Click "Credentials" → "New"
2. Search "Supabase"
3. Fill in:
   - **Name**: `ACG-Supabase`
   - **Host**: `rzzxxkppkiasuouuglaf.supabase.co`
   - **Service Role Secret**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo`
4. Click "Save"

### **1.2 Header Auth for Supabase Edge Functions**
1. Click "Credentials" → "New"
2. Search "Header Auth"
3. Fill in:
   - **Name**: `Supabase Service Role Key`
   - **Name** (header): `Authorization`
   - **Value**: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo`
4. Click "Save"

### **1.3 WhatsApp Business Cloud API** (Already exists)
- **Name**: `WhatsApp account`
- **Phone Number ID**: `683816761472557`

---

## 🤖 **STEP 2: CREATE RECEIVER WORKFLOW**

### **Workflow Name**: `ACG StaffLink - WhatsApp Receiver`

### **Node 1: WhatsApp Trigger**
- **Type**: `WhatsApp Trigger`
- **Settings**:
  - Updates: `messages` ✅
  - Webhook ID: `acg-stafflink-receiver`
- **Credential**: `WhatsApp account`

### **Node 2: Filter Text Messages**
- **Type**: `Switch`
- **Settings**:
  - Rule 1:
    - Condition: `{{ $json.messages[0].type }}` equals `text`
    - Output Name: `Text`

### **Node 3: Extract Message Data**
- **Type**: `Set`
- **Settings**:
  - Field 1:
    - Name: `message.text`
    - Value: `{{ $json.messages[0].text.body }}`
  - Field 2:
    - Name: `sessionId`
    - Value: `{{ $json.messages[0].from }}`

### **Node 4: Check Valid Message**
- **Type**: `IF`
- **Settings**:
  - Condition: `{{ $json.message.text }}` is not empty

### **Node 5: Get Staff by Phone** ⭐
- **Type**: `Supabase`
- **Credential**: `ACG-Supabase`
- **Settings**:
  - Resource: `Row`
  - Operation: `Get`
  - Table Name: `staff`
  - Select Conditions:
    - Key: `phone`
    - Value: `{{ $json.sessionId }}`

### **Node 6: Format Staff Data**
- **Type**: `Code`
- **JavaScript**:
```javascript
const staffData = $input.all()[0].json;

if (!staffData || (Array.isArray(staffData) && staffData.length === 0)) {
  return {
    error: true,
    message: '⚠️ Phone number not found. Please contact your agency to register.'
  };
}

const staff = Array.isArray(staffData) ? staffData[0] : staffData;
const messageText = $('Extract Message Data').item.json.message.text;

return {
  staff_id: staff.id,
  first_name: staff.first_name,
  last_name: staff.last_name,
  agency_id: staff.agency_id,
  phone: staff.phone,
  email: staff.email,
  role: staff.role,
  rating: staff.rating || 'N/A',
  total_shifts_completed: staff.total_shifts_completed || 0,
  message_text: messageText,
  error: false
};
```

### **Node 7: Check Staff Error**
- **Type**: `IF`
- **Settings**:
  - Condition: `{{ $json.error }}` equals `true`
  - True → Send error message
  - False → Continue to AI

### **Node 8: Send Error Message** (if staff not found)
- **Type**: `WhatsApp`
- **Credential**: `WhatsApp account`
- **Settings**:
  - Operation: `Send`
  - Phone Number ID: `683816761472557`
  - Recipient: `{{ $('WhatsApp Trigger').item.json.messages[0].from }}`
  - Message: `{{ $json.message }}`

### **Node 9: Intent Classification** ⭐ AI
- **Type**: `OpenAI`
- **Credential**: `OpenAi account`
- **Settings**:
  - Model: `gpt-4o-mini`
  - Messages:
    - Role: `system`
    - Content: (See next section for full prompt)

### **Node 10: Parse Intent**
- **Type**: `Code`
- **JavaScript**:
```javascript
const aiResponse = $input.item.json.message.content;
let jsonString = aiResponse.trim();

if (jsonString.startsWith('```json')) {
  jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
}

const intentData = JSON.parse(jsonString.trim());

if (intentData.is_multi_intent && intentData.intents.length > 1) {
  return {
    is_multi_intent: true,
    intents: intentData.intents,
    primary_intent: intentData.intents[0].intent,
    intent_count: intentData.intents.length
  };
} else {
  const singleIntent = intentData.intents[0];
  return {
    is_multi_intent: false,
    intent: singleIntent.intent,
    parameters: singleIntent.parameters || {},
    confidence: singleIntent.confidence || 0.0
  };
}
```

### **Node 11: Check Multi-Intent**
- **Type**: `IF`
- **Settings**:
  - Condition: `{{ $json.is_multi_intent }}` equals `true`

### **Node 12: Route by Intent**
- **Type**: `Switch`
- **Settings**:
  - Rule 1: `{{ $json.intent }}` equals `greeting` → Output: `Greeting`
  - Rule 2: `{{ $json.intent }}` equals `check_schedule` → Output: `Check Schedule`
  - Rule 3: `{{ $json.intent }}` equals `find_shifts` → Output: `Find Shifts`
  - Rule 4: `{{ $json.intent }}` equals `check_compliance` → Output: `Check Compliance`
  - Rule 5: `{{ $json.intent }}` equals `calculate_pay` → Output: `Calculate Pay`
  - Fallback: `Unknown`

---

## 🎯 **STEP 3: INTENT HANDLERS**

### **Handler: Greeting**
- **Type**: `Code`
- **JavaScript**:
```javascript
const staffName = $('Format Staff Data').item.json.first_name;
return {
  message: `Hi ${staffName}! 👋 How can I help you today?\n\nI can help with:\n📅 Check schedule\n🔍 Find shifts\n💰 Calculate pay\n📋 Check compliance`
};
```

### **Handler: Check Schedule** ⭐ WITH DATABASE
- **Type**: `Supabase`
- **Credential**: `ACG-Supabase`
- **Settings**:
  - Operation: `Get`
  - Table: `shifts`
  - Select: `*, clients(*)`
  - Filters:
    - `assigned_staff_id` = `{{ $('Format Staff Data').item.json.staff_id }}`
    - `status` in `['confirmed', 'assigned', 'in_progress']`

Then add **Code node** to format:
```javascript
const shifts = $input.all()[0].json;
const staffName = $('Format Staff Data').item.json.first_name;

if (!shifts || shifts.length === 0) {
  return { message: `Hi ${staffName}! You have no upcoming shifts.` };
}

let message = `📅 *Your Upcoming Shifts* (${shifts.length})\n\n`;
shifts.slice(0, 5).forEach((shift, i) => {
  message += `${i+1}. ${shift.date} at ${shift.clients?.name}\n`;
  message += `   ⏰ ${shift.start_time} - ${shift.end_time}\n\n`;
});

return { message };
```

---

**Continue with remaining handlers following same pattern!**

