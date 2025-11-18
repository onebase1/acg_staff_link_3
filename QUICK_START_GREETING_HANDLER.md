# 🚀 QUICK START: Implement Greeting Handler

## 🎯 **GOAL**
Get your first handler working in 5 minutes!

When user sends "Hi" → Bot responds with welcome menu

---

## 📋 **STEP-BY-STEP INSTRUCTIONS**

### **Step 1: Open Your n8n Workflow**
1. Open n8n
2. Find your "Route by Intent" Switch node
3. Locate the "Greeting" output route

### **Step 2: Update the "Handle Greeting" Node**

**Current Code (showing "[object Object]"):**
```javascript
// OLD CODE - DELETE THIS
return $input.all();
```

**New Code (copy this):**
```javascript
// Get staff data from previous node
const staff = $('Format Staff Data').first().json;

// Create welcome message with menu
const message = `Hi ${staff.first_name}! 👋

I can help you with:

📅 *Check schedule* - See your upcoming shifts
🔍 *Find shifts* - Browse available shifts
📝 *Book shift* - Book an available shift
❌ *Cancel booking* - Cancel a confirmed shift
📋 *Check compliance* - View your compliance status
💰 *Calculate pay* - See your earnings
📸 *Upload timesheet* - Submit your timesheet

Just ask me anything!`;

return {
  json: {
    message: message,
    staff_id: staff.staff_id,
    phone: staff.phone
  }
};
```

### **Step 3: Verify the Connection**

Make sure your flow looks like this:
```
Route by Intent (Greeting output)
  ↓
Handle Greeting (Code node - the one you just updated)
  ↓
Format Final Response (Code node)
  ↓
Send WhatsApp (HTTP Request node)
```

### **Step 4: Check "Format Final Response" Node**

This node should format the message for WhatsApp API:

```javascript
// Get the message from previous handler
const data = $input.first().json;

// Format for WhatsApp API
return {
  json: {
    messaging_product: 'whatsapp',
    to: data.phone,
    type: 'text',
    text: {
      body: data.message
    }
  }
};
```

### **Step 5: Test It!**

1. **Save your workflow** (Ctrl+S or Cmd+S)
2. **Activate the workflow** (toggle switch in top right)
3. **Send a test message** to your WhatsApp number:
   - "Hi"
   - "Hello"
   - "Hey"

**Expected Response:**
```
Hi [Your Name]! 👋

I can help you with:

📅 Check schedule - See your upcoming shifts
🔍 Find shifts - Browse available shifts
📝 Book shift - Book an available shift
❌ Cancel booking - Cancel a confirmed shift
📋 Check compliance - View your compliance status
💰 Calculate pay - See your earnings
📸 Upload timesheet - Submit your timesheet

Just ask me anything!
```

---

## 🐛 **TROUBLESHOOTING**

### **Problem: Still seeing "[object Object]"**

**Cause:** The code isn't returning the right format

**Fix:** Make sure you're returning:
```javascript
return {
  json: {
    message: "your message here",
    staff_id: staff.staff_id,
    phone: staff.phone
  }
};
```

NOT:
```javascript
return $input.all(); // ❌ Wrong!
```

---

### **Problem: "Cannot read property 'first_name' of undefined"**

**Cause:** Staff data isn't being passed correctly

**Fix:** 
1. Check that "Format Staff Data" node exists before "Route by Intent"
2. Verify the node name is exactly "Format Staff Data" (case-sensitive!)
3. Check that staff was found in database

---

### **Problem: No response at all**

**Cause:** Workflow isn't active or WhatsApp credentials are wrong

**Fix:**
1. Check workflow is **Active** (toggle in top right)
2. Verify WhatsApp credentials in "Send WhatsApp" node
3. Check n8n execution log for errors

---

### **Problem: "Phone number not found"**

**Cause:** Staff record doesn't exist in database

**Fix:**
1. Make sure you have a staff record with your phone number
2. Phone format should be: `+44XXXXXXXXXX` (no spaces)
3. Check "Get Staff by Phone" Supabase query

---

## ✅ **SUCCESS CHECKLIST**

- [ ] Updated "Handle Greeting" code node
- [ ] Verified "Format Final Response" node exists
- [ ] Saved workflow
- [ ] Activated workflow
- [ ] Sent "Hi" to WhatsApp
- [ ] Received welcome menu response
- [ ] Response includes your first name
- [ ] Response shows all menu options

---

## 🎯 **NEXT STEPS**

Once Greeting works:

1. **Test other intents** to see which ones need updating
2. **Implement Check Schedule** next (similar pattern)
3. **Then implement Upload Timesheet** (priority!)

**Files to reference:**
- `N8N_HANDLER_CODE_SNIPPETS.md` - All handler code
- `N8N_HANDLER_CODE_SNIPPETS_PART2.md` - Timesheet upload code
- `WHATSAPP_IMPLEMENTATION_SUMMARY.md` - Complete overview

---

## 📸 **VISUAL REFERENCE**

Your n8n workflow should look like this:

```
┌─────────────────────┐
│ WhatsApp Trigger    │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Extract Message     │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Get Staff by Phone  │
│ (Supabase)          │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Format Staff Data   │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Intent              │
│ Classification      │
│ (OpenAI)            │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Parse Intent        │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Route by Intent     │
│ (Switch)            │
└──────────┬──────────┘
           │
    ┌──────┴──────┬──────────┬─────────┐
    │             │          │         │
┌───▼───┐   ┌────▼────┐  ┌──▼──┐   ┌──▼──┐
│Greeting│   │Schedule │  │Book │   │ ... │
└───┬───┘   └────┬────┘  └──┬──┘   └──┬──┘
    │            │          │         │
    └────────┬───┴──────────┴─────────┘
             │
    ┌────────▼────────┐
    │ Format Final    │
    │ Response        │
    └────────┬────────┘
             │
    ┌────────▼────────┐
    │ Send WhatsApp   │
    └─────────────────┘
```

---

**Ready? Update the code and test it!** 🚀

**Time estimate:** 5 minutes ⏱️

