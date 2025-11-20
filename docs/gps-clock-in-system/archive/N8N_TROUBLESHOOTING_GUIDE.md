# 🔧 n8n Workflow Troubleshooting Guide

**Issue:** "The service was not able to process your request" - Unexpected end of JSON input

**Root Cause:** The JSON body in the HTTP Request nodes is not being constructed correctly.

---

## 🐛 **PROBLEM IDENTIFIED**

Looking at your screenshots, the error is:
```
The service was not able to process your request
Unexpected end of JSON input
```

This means the Supabase Edge Function is receiving **malformed JSON** or **empty body**.

---

## ✅ **SOLUTION 1: Fix JSON Body Syntax**

### **Current (WRONG):**
```json
{
  "from": "{{ $('WhatsApp Trigger').item.json.messages[0].from }}",
  "message": "{{ $('WhatsApp Trigger').item.json.messages[0].text.body }}",
  "profileName": "{{ $('WhatsApp Trigger').item.json.contacts[0].profile.name }}"
}
```

### **Fixed (CORRECT):**
```json
={
  "from": {{ $('WhatsApp Trigger').item.json.messages[0].from }},
  "message": {{ $('WhatsApp Trigger').item.json.messages[0].text.body }},
  "profileName": {{ $('WhatsApp Trigger').item.json.contacts[0].profile.name }}
}
```

**Key Changes:**
1. ✅ Add `=` at the start (n8n expression syntax)
2. ✅ Remove quotes around `{{ }}` expressions
3. ✅ n8n will automatically stringify the values

---

## ✅ **SOLUTION 2: Use Code Node Instead**

Instead of using "Specify Body" → "JSON", use a **Code node** to construct the JSON:

### **Step 1: Add Code Node Before HTTP Request**

```javascript
// For Upload Handler
const triggerData = $('WhatsApp Trigger').item.json;

return {
  json: {
    from: triggerData.messages[0].from,
    message_type: "image",
    image_url: $json.url, // From Get Image URL node
    image_id: triggerData.messages[0].image.id,
    caption: triggerData.messages[0].image.caption || '',
    profileName: triggerData.contacts[0].profile.name
  }
};
```

### **Step 2: Update HTTP Request Node**

- **Body Content Type:** JSON
- **Specify Body:** Using Fields Below
- **Body Parameters:**
  - `from`: `{{ $json.from }}`
  - `message_type`: `{{ $json.message_type }}`
  - `image_url`: `{{ $json.image_url }}`
  - `image_id`: `{{ $json.image_id }}`
  - `caption`: `{{ $json.caption }}`
  - `profileName`: `{{ $json.profileName }}`

---

## ✅ **SOLUTION 3: Check WhatsApp Trigger Output Structure**

The issue might be that the WhatsApp Trigger output structure is different than expected.

### **Step 1: Import Diagnostic Workflow**

I created: `n8n-workflows/whatsapp-diagnostic-workflow.json`

1. Import this workflow into n8n
2. Activate it
3. Send a test message to WhatsApp
4. Check the execution logs to see the **actual structure**

### **Step 2: Update JSON Paths**

Once you see the actual structure, update the JSON paths in the workflow.

**Common structures:**

**Option A (Direct):**
```javascript
$json.from
$json.text.body
$json.image.id
```

**Option B (Nested in entry):**
```javascript
$json.entry[0].changes[0].value.messages[0].from
$json.entry[0].changes[0].value.messages[0].text.body
$json.entry[0].changes[0].value.messages[0].image.id
```

**Option C (Nested in messages):**
```javascript
$json.messages[0].from
$json.messages[0].text.body
$json.messages[0].image.id
```

---

## ✅ **SOLUTION 4: Simplify for Testing**

Let's create a **minimal test workflow** that just logs the data:

### **Test Workflow:**

```json
{
  "name": "WhatsApp Test - Minimal",
  "nodes": [
    {
      "name": "WhatsApp Trigger",
      "type": "n8n-nodes-base.whatsAppTrigger",
      "parameters": {
        "updates": ["messages"]
      }
    },
    {
      "name": "Log Data",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "console.log('Full input:', JSON.stringify($input.all(), null, 2));\nreturn $input.all();"
      }
    },
    {
      "name": "Send Test to Supabase",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/incoming-whatsapp-handler",
        "method": "POST",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "from",
              "value": "=+447557679989"
            },
            {
              "name": "message",
              "value": "=Test message"
            },
            {
              "name": "profileName",
              "value": "=Test User"
            }
          ]
        }
      }
    }
  ]
}
```

---

## 🔍 **DEBUGGING STEPS**

### **Step 1: Check n8n Execution Logs**

1. Go to n8n → Executions
2. Click on the failed execution
3. Click on each node to see input/output
4. Look for the **actual data structure**

### **Step 2: Check Supabase Edge Function Logs**

```powershell
# Check upload handler logs
supabase functions logs whatsapp-timesheet-upload-handler --tail

# Check incoming handler logs
supabase functions logs incoming-whatsapp-handler --tail
```

Look for:
- ✅ Request received
- ❌ JSON parse errors
- ❌ Missing fields

### **Step 3: Test Edge Function Directly**

```powershell
# Test incoming-whatsapp-handler
curl -X POST https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/incoming-whatsapp-handler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+447557679989",
    "message": "Test message",
    "profileName": "Test User"
  }'
```

Expected response:
```json
{
  "success": true,
  "routed_to": "ai-handler",
  "response": "..."
}
```

---

## 🎯 **RECOMMENDED FIX (EASIEST)**

### **Option 1: Use Body Parameters Instead of JSON Body**

In the HTTP Request nodes:

1. **Send Body:** ON
2. **Body Content Type:** JSON
3. **Specify Body:** Using Fields Below
4. **Body Parameters:**
   - Add each field individually
   - Use expressions for values

**Example:**
- Name: `from`
- Value: `={{ $('WhatsApp Trigger').item.json.messages[0].from }}`

This is more reliable than constructing JSON manually.

---

### **Option 2: Use Code Node to Build JSON**

Add a Code node before each HTTP Request:

```javascript
// Build JSON payload
const payload = {
  from: $('WhatsApp Trigger').item.json.messages[0].from,
  message: $('WhatsApp Trigger').item.json.messages[0].text.body,
  profileName: $('WhatsApp Trigger').item.json.contacts[0].profile.name
};

// Return as JSON
return {
  json: payload
};
```

Then in HTTP Request:
- **Send Body:** ON
- **Body Content Type:** JSON
- **Specify Body:** Using JSON
- **JSON:** `={{ $json }}`

---

## 📞 **NEXT STEPS**

1. **Import diagnostic workflow** to see actual WhatsApp Trigger output
2. **Update JSON paths** based on actual structure
3. **Use Body Parameters** instead of JSON Body for reliability
4. **Test with simple message** first
5. **Then test with image**

---

## ✅ **QUICK WIN: Test with Hardcoded Values**

To verify the Supabase Edge Functions work, test with hardcoded values first:

```javascript
// In HTTP Request node
{
  "from": "+447557679989",
  "message": "Test message",
  "profileName": "Test User"
}
```

If this works, the issue is with the JSON path expressions, not the Edge Functions.

---

**Let me know what you see in the n8n execution logs and I'll help fix it!** 🚀

