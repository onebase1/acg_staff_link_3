# 🤖 n8n Interactive Timesheet Workflow - Setup Guide (V2 - IMPROVED)

**Date:** 2025-11-18  
**Status:** Ready to Import  
**n8n Instance:** https://n8n.dreampathai.co.uk  
**Workflow File:** `n8n-workflows/whatsapp-interactive-receiver-v2.json`

**✅ IMPROVED VERSION** - Based on n8n MCP best practices from template #3586

---

## 🎯 **WHAT THIS WORKFLOW DOES**

### **Complete Flow:**

```
Staff sends WhatsApp message
   ↓
WhatsApp Business Cloud API (Meta)
   ↓
n8n Webhook Trigger
   ↓
Check Message Type (Switch Node):
   ├─ IMAGE? → Get Image URL → Download → Route to whatsapp-timesheet-upload-handler
   │                                        ↓
   │                                        OCR extraction + Interactive confirmation
   │
   ├─ TEXT? → Route to incoming-whatsapp-handler
   │           ↓
   │           YES/NO reply handling OR AI conversation
   │
   └─ OTHER? → Send "Unsupported message type" error
```

---

## 🆕 **KEY IMPROVEMENTS FROM V1**

### **1. Proper Media Download Flow**
**V1 (WRONG):**
```
Image message → Send image ID to Supabase → Supabase can't access image ❌
```

**V2 (CORRECT):**
```
Image message → Get Image URL from WhatsApp API → Send URL to Supabase → Supabase downloads image ✅
```

### **2. Better Message Type Detection**
**V1:** Simple IF node checking message type
**V2:** Switch node with proper exists checks for `$json.messages[0].image` and `$json.messages[0].text.body`

### **3. Unsupported Message Handling**
**V1:** No handling for audio, video, document messages
**V2:** Sends friendly error message: "Sorry, I can only process text messages and images"

### **4. Proper WhatsApp API Structure**
**V1:** Incorrect JSON paths
**V2:** Correct paths based on WhatsApp Business Cloud API:
- `$json.messages[0].from` - Sender phone number
- `$json.messages[0].image.id` - Image media ID
- `$json.contacts[0].profile.name` - Sender name

---

## 📋 **PREREQUISITES**

Before importing this workflow, ensure you have:

1. ✅ **n8n instance running** (https://n8n.dreampathai.co.uk)
2. ✅ **WhatsApp Business Cloud API credentials:**
   - Phone Number ID: `683816761472557`
   - Business Account ID: `244657210968951`
   - Display Phone Number: `+44 7924 975049`
   - Access Token (from Meta Business Manager)
3. ✅ **Supabase credentials:**
   - Supabase URL: `https://rzzxxkppkiasuouuglaf.supabase.co`
   - Supabase Service Role Key (from Supabase Dashboard → Settings → API)
4. ✅ **Supabase Edge Functions deployed:**
   - `whatsapp-timesheet-upload-handler` (Version 1)
   - `whatsapp-timesheet-interactive` (Version 1)
   - `incoming-whatsapp-handler` (Version 2)

---

## 🚀 **STEP-BY-STEP SETUP**

### **Step 1: Import Workflow into n8n**

1. Open n8n: https://n8n.dreampathai.co.uk
2. Click **"Workflows"** → **"Add Workflow"** → **"Import from File"**
3. Select: `n8n-workflows/whatsapp-interactive-receiver-v2.json`
4. Click **"Import"**

---

### **Step 2: Configure WhatsApp Credentials**

1. Click on **"WhatsApp Trigger"** node
2. Click **"Credential to connect with"** → **"Create New"**
3. Enter credentials:
   - **Name:** WhatsApp Business Cloud API
   - **Access Token:** [Get from Meta Business Manager]
   - **Phone Number ID:** 683816761472557
4. Click **"Save"**

---

### **Step 3: Configure Supabase Credentials**

1. Click on **"Route to Upload Handler"** node
2. Click **"Credential to connect with"** → **"Create New"**
3. Select **"Header Auth"**
4. Enter:
   - **Name:** Supabase Service Role Key
   - **Header Name:** Authorization
   - **Header Value:** Bearer [YOUR_SUPABASE_SERVICE_ROLE_KEY]
5. Click **"Save"**
6. Repeat for **"Route to Text Handler"** node (select existing credential)

---

### **Step 4: Set Environment Variables**

1. Click **"Settings"** (gear icon in top right)
2. Click **"Environment Variables"**
3. Add the following:
   ```
   SUPABASE_URL=https://rzzxxkppkiasuouuglaf.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
   WHATSAPP_PHONE_NUMBER_ID=683816761472557
   ```
4. Click **"Save"**

---

### **Step 5: Activate Workflow**

1. Click **"Active"** toggle in top right (should turn green)
2. Copy the webhook URL (shown in WhatsApp Trigger node)
3. Example: `https://n8n.dreampathai.co.uk/webhook/acg-interactive-timesheet-receiver`

---

### **Step 6: Configure Meta Webhook**

1. Go to Meta Business Manager: https://business.facebook.com
2. Navigate to **WhatsApp** → **Configuration**
3. Click **"Edit"** next to Webhook
4. Enter:
   - **Callback URL:** [n8n webhook URL from Step 5]
   - **Verify Token:** acg-interactive-timesheet-receiver
5. Subscribe to: **messages**
6. Click **"Verify and Save"**

---

## 🧪 **TESTING**

### **Test 1: Image Upload (Timesheet)**

1. Send a timesheet photo to: **+44 7924 975049**
2. Expected flow:
   ```
   WhatsApp → n8n → Get Image URL → Route to Upload Handler → OCR → Interactive Confirmation
   ```
3. Expected response:
   ```
   ✅ Timesheet Received!
   
   Hi [Name],
   
   We extracted the following data from your timesheet:
   
   📋 Shift: [Client Name]
   📅 Date: [Date]
   ⏱️ Hours: [Hours]h
   ☕ Break: [Minutes] min
   ✅ Signature: Present
   
   Is this correct?
   
   Reply YES to confirm
   Reply NO if it needs review
   
   Confidence: 95%
   ```

### **Test 2: YES/NO Reply**

1. Reply **"YES"** to the confirmation message
2. Expected flow:
   ```
   WhatsApp → n8n → Route to Text Handler → incoming-whatsapp-handler → whatsapp-timesheet-interactive → Auto-approve
   ```
3. Expected response:
   ```
   ✅ Perfect! Your timesheet has been submitted for processing.
   ```

### **Test 3: Unsupported Message Type**

1. Send an audio message or video to: **+44 7924 975049**
2. Expected response:
   ```
   Sorry, I can only process text messages and images. Please send a timesheet photo or a text message.
   ```

---

## 🔍 **WORKFLOW NODES EXPLAINED**

### **Node 1: WhatsApp Trigger**
- **Type:** `n8n-nodes-base.whatsAppTrigger`
- **Purpose:** Receives incoming WhatsApp messages
- **Output:** WhatsApp message object with sender info, message type, content

### **Node 2: Check Message Type (Switch)**
- **Type:** `n8n-nodes-base.switch`
- **Purpose:** Routes messages based on type (image, text, other)
- **Logic:**
  - Output 0 (Image): `$json.messages[0].image` exists
  - Output 1 (Text): `$json.messages[0].text.body` exists
  - Output 2 (Other): Fallback for unsupported types

### **Node 3: Get Image URL**
- **Type:** `n8n-nodes-base.whatsApp`
- **Purpose:** Retrieves download URL for image from WhatsApp API
- **Operation:** `mediaUrlGet`
- **Input:** Image media ID from trigger
- **Output:** Image download URL

### **Node 4: Route to Upload Handler**
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Sends image URL to Supabase Edge Function for OCR processing
- **Endpoint:** `https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/whatsapp-timesheet-upload-handler`
- **Payload:**
  ```json
  {
    "from": "+447557679989",
    "message_type": "image",
    "image_url": "https://lookaside.fbsbx.com/...",
    "image_id": "1234567890",
    "caption": "",
    "profileName": "John Doe"
  }
  ```

### **Node 5: Route to Text Handler**
- **Type:** `n8n-nodes-base.httpRequest`
- **Purpose:** Sends text message to Supabase Edge Function for YES/NO handling or AI chat
- **Endpoint:** `https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/incoming-whatsapp-handler`
- **Payload:**
  ```json
  {
    "from": "+447557679989",
    "message": "YES",
    "profileName": "John Doe"
  }
  ```

### **Node 6: Unsupported Message Type**
- **Type:** `n8n-nodes-base.whatsApp`
- **Purpose:** Sends error message for unsupported message types (audio, video, document)
- **Operation:** `send`
- **Message:** "Sorry, I can only process text messages and images. Please send a timesheet photo or a text message."

---

## 🐛 **TROUBLESHOOTING**

### **Issue 1: Workflow not receiving messages**
**Symptoms:** No executions showing in n8n when sending WhatsApp messages

**Solutions:**
1. Check webhook URL is correct in Meta Business Manager
2. Verify workflow is **Active** (green toggle)
3. Check WhatsApp credentials are valid
4. Test webhook manually:
   ```bash
   curl -X POST https://n8n.dreampathai.co.uk/webhook/acg-interactive-timesheet-receiver \
     -H "Content-Type: application/json" \
     -d '{"test": "message"}'
   ```

### **Issue 2: Image download fails**
**Symptoms:** Error in "Get Image URL" node

**Solutions:**
1. Verify WhatsApp credentials have media download permissions
2. Check image ID is being extracted correctly: `$json.messages[0].image.id`
3. Test manually in n8n using "Execute Node" with sample data

### **Issue 3: Supabase Edge Function errors**
**Symptoms:** HTTP 500 errors from Route to Upload Handler or Route to Text Handler

**Solutions:**
1. Check Supabase Service Role Key is correct
2. Verify Edge Functions are deployed:
   ```powershell
   supabase functions list
   ```
3. Check Edge Function logs:
   ```powershell
   supabase functions logs whatsapp-timesheet-upload-handler
   supabase functions logs incoming-whatsapp-handler
   ```

### **Issue 4: Environment variables not working**
**Symptoms:** `$env.SUPABASE_URL` returns undefined

**Solutions:**
1. Restart n8n after adding environment variables
2. Use hardcoded values temporarily for testing
3. Check environment variable names match exactly (case-sensitive)

---

## 📊 **MONITORING**

### **Check Workflow Executions:**
1. Go to n8n → **Executions**
2. Filter by workflow: "ACG StaffLink - WhatsApp Interactive Timesheet Receiver"
3. Review success/failure rate

### **Check Supabase Logs:**
```powershell
# Upload handler logs
supabase functions logs whatsapp-timesheet-upload-handler --tail

# Interactive confirmation logs
supabase functions logs whatsapp-timesheet-interactive --tail

# Text handler logs
supabase functions logs incoming-whatsapp-handler --tail
```

### **Check Database:**
```sql
-- Check pending confirmations
SELECT * FROM timesheets WHERE status = 'pending_confirmation' ORDER BY created_at DESC LIMIT 10;

-- Check submitted timesheets
SELECT * FROM timesheets WHERE status = 'submitted' ORDER BY created_at DESC LIMIT 10;

-- Check admin workflows (staff said NO)
SELECT * FROM "AdminWorkflow" WHERE type = 'timesheet_review' ORDER BY created_at DESC LIMIT 10;
```

---

## ✅ **SUCCESS CRITERIA**

- ✅ Workflow receives WhatsApp messages
- ✅ Image messages trigger OCR processing
- ✅ High confidence (≥80%) sends interactive confirmation
- ✅ YES replies auto-approve timesheets
- ✅ NO replies create AdminWorkflow
- ✅ Text messages route to AI handler
- ✅ Unsupported messages get error response
- ✅ No errors in n8n execution logs
- ✅ No errors in Supabase function logs

---

## 🎉 **NEXT STEPS**

Once this workflow is stable:

1. **Monitor for 1 week** - Check success rate, error patterns
2. **Gather feedback** - Ask staff about experience
3. **Build Option B** - Smart Prompts for low confidence timesheets
4. **Build Option C** - LLM Reasoning for weekly timesheet pattern

---

**Questions? Issues? Check the troubleshooting section or review Supabase logs!** 🚀

