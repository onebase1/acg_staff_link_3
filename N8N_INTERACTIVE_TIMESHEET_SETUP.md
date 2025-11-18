# 🤖 n8n Interactive Timesheet Workflow - Setup Guide

**Date:** 2025-11-18  
**Status:** Ready to Import  
**n8n Instance:** https://n8n.dreampathai.co.uk

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
Check Message Type:
   ├─ IMAGE? → Route to whatsapp-timesheet-upload-handler
   │            ↓
   │            OCR extraction + Interactive confirmation
   │
   └─ TEXT? → Route to incoming-whatsapp-handler
                ↓
                YES/NO reply handling OR AI conversation
```

---

## 📋 **PREREQUISITES**

Before importing, ensure you have:

1. ✅ **n8n instance running**: https://n8n.dreampathai.co.uk
2. ✅ **WhatsApp Business Cloud API credentials** configured in n8n
3. ✅ **Supabase Service Role Key** configured in n8n
4. ✅ **Environment variables** set in n8n:
   - `SUPABASE_URL` = https://rzzxxkppkiasuouuglaf.supabase.co
   - `SUPABASE_SERVICE_ROLE_KEY` = [Your service role key]

---

## 🚀 **STEP-BY-STEP SETUP**

### **Step 1: Import Workflow into n8n** (2 minutes)

1. **Open n8n**: https://n8n.dreampathai.co.uk
2. **Click** "+" → "Import from File"
3. **Upload**: `n8n-workflows/whatsapp-interactive-timesheet-receiver.json`
4. **Click** "Import"

---

### **Step 2: Configure Credentials** (3 minutes)

The workflow uses 2 credentials:

#### **Credential 1: WhatsApp Business Cloud API**

1. **Click** on "WhatsApp Trigger" node
2. **Select** existing credential: "WhatsApp Business Cloud API"
   - If not exists, create new:
     - **Access Token**: [Your Meta access token]
     - **Phone Number ID**: 683816761472557

#### **Credential 2: Supabase Service Role Key**

1. **Click** on "Route to Upload Handler" node
2. **Select** existing credential: "Supabase Service Role Key"
   - If not exists, create new:
     - **Header Name**: Authorization
     - **Header Value**: Bearer [Your Supabase Service Role Key]

---

### **Step 3: Set Environment Variables** (2 minutes)

In n8n, go to **Settings** → **Environment Variables**:

```bash
SUPABASE_URL=https://rzzxxkppkiasuouuglaf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enh4a3Bwa2lhc3VvdXVnbGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU5NjA0OCwiZXhwIjoyMDc3MTcyMDQ4fQ.Uli0ZjO1FOrBZnfMNYCyx1W1sw2Ehia4-lkuuj70-Wo
```

---

### **Step 4: Activate Workflow** (1 minute)

1. **Click** "Active" toggle (top right)
2. **Workflow should turn green** ✅
3. **Copy the Webhook URL** from the WhatsApp Trigger node

**Expected URL format:**
```
https://n8n.dreampathai.co.uk/webhook/acg-interactive-timesheet-receiver
```

---

### **Step 5: Configure WhatsApp Webhook in Meta** (5 minutes)

1. **Go to**: https://developers.facebook.com/apps
2. **Select your app** → WhatsApp → Configuration
3. **Webhook** section:
   - **Callback URL**: [Paste webhook URL from Step 4]
   - **Verify Token**: [Your verify token]
4. **Subscribe to**: `messages` events
5. **Click** "Verify and Save"

---

### **Step 6: Test the Workflow** (5 minutes)

#### **Test 1: Image Upload (Timesheet)**

1. **Send a photo** to +44 7924 975049
2. **Check n8n execution log**:
   - ✅ WhatsApp Trigger received
   - ✅ Check Message Type → IMAGE
   - ✅ Route to Upload Handler called
3. **Check WhatsApp**:
   - Should receive interactive confirmation message

#### **Test 2: Text Message (YES/NO Reply)**

1. **Reply** "YES" to the confirmation message
2. **Check n8n execution log**:
   - ✅ WhatsApp Trigger received
   - ✅ Check Message Type → TEXT
   - ✅ Route to Text Handler called
3. **Check WhatsApp**:
   - Should receive final confirmation

---

## 🔧 **WORKFLOW NODES EXPLAINED**

### **Node 1: WhatsApp Trigger**

**Type:** WhatsApp Trigger  
**Purpose:** Receives all incoming WhatsApp messages from Meta

**Configuration:**
- **Updates**: messages ✅
- **Webhook ID**: acg-interactive-timesheet-receiver
- **Credential**: WhatsApp Business Cloud API

**Output:**
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "+447557679989",
          "type": "image" | "text",
          "image": { "id": "...", "caption": "..." },
          "text": { "body": "YES" }
        }],
        "contacts": [{
          "profile": { "name": "John Doe" }
        }]
      }
    }]
  }]
}
```

---

### **Node 2: Check Message Type**

**Type:** Switch  
**Purpose:** Routes messages based on type (image vs text)

**Configuration:**
- **Condition**: `{{ $json.entry[0].changes[0].value.messages[0].type }}` equals "image"
- **Output 0**: IMAGE → Route to Upload Handler
- **Output 1**: TEXT → Route to Text Handler

---

### **Node 3: Route to Upload Handler**

**Type:** HTTP Request  
**Purpose:** Forwards image messages to whatsapp-timesheet-upload-handler

**Configuration:**
- **URL**: `{{ $env.SUPABASE_URL }}/functions/v1/whatsapp-timesheet-upload-handler`
- **Method**: POST
- **Headers**:
  - Content-Type: application/json
  - Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
- **Body**:
  ```json
  {
    "from": "{{ $json.entry[0].changes[0].value.messages[0].from }}",
    "message_type": "image",
    "image_url": "{{ $json.entry[0].changes[0].value.messages[0].image.id }}",
    "image_id": "{{ $json.entry[0].changes[0].value.messages[0].image.id }}",
    "caption": "{{ $json.entry[0].changes[0].value.messages[0].image.caption || '' }}",
    "profileName": "{{ $json.entry[0].changes[0].value.contacts[0].profile.name }}"
  }
  ```

---

### **Node 4: Route to Text Handler**

**Type:** HTTP Request  
**Purpose:** Forwards text messages to incoming-whatsapp-handler (handles YES/NO replies + AI)

**Configuration:**
- **URL**: `{{ $env.SUPABASE_URL }}/functions/v1/incoming-whatsapp-handler`
- **Method**: POST
- **Headers**:
  - Content-Type: application/json
  - Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}
- **Body**:
  ```json
  {
    "from": "{{ $json.entry[0].changes[0].value.messages[0].from }}",
    "message": "{{ $json.entry[0].changes[0].value.messages[0].text.body }}",
    "profileName": "{{ $json.entry[0].changes[0].value.contacts[0].profile.name }}"
  }
  ```

---

## 🐛 **TROUBLESHOOTING**

### **Issue 1: Workflow not receiving messages**

**Possible Causes:**
- Webhook not configured in Meta
- Webhook URL incorrect
- Workflow not active

**Debug:**
1. Check workflow is **Active** (green toggle)
2. Check webhook URL in Meta matches n8n webhook URL
3. Check n8n execution log for errors

---

### **Issue 2: Image messages not routing correctly**

**Possible Causes:**
- Message type check failing
- Image ID not extracted correctly

**Debug:**
1. Check n8n execution log
2. Look at "Check Message Type" node output
3. Verify `$json.entry[0].changes[0].value.messages[0].type` = "image"

---

### **Issue 3: Supabase Edge Function errors**

**Possible Causes:**
- Service Role Key incorrect
- Edge Function not deployed
- Environment variables not set

**Debug:**
1. Check Supabase logs:
   ```powershell
   supabase functions logs whatsapp-timesheet-upload-handler
   ```
2. Verify Service Role Key in n8n credentials
3. Verify Edge Functions are deployed

---

## ✅ **SUCCESS CHECKLIST**

After setup, confirm:

- [ ] **Workflow imported** into n8n
- [ ] **Credentials configured** (WhatsApp + Supabase)
- [ ] **Environment variables set** in n8n
- [ ] **Workflow activated** (green toggle)
- [ ] **Webhook URL copied** from WhatsApp Trigger
- [ ] **Meta webhook configured** with n8n URL
- [ ] **Test image sent** → Interactive confirmation received
- [ ] **Test YES reply** → Final confirmation received

---

## 📞 **SUPPORT**

**n8n Dashboard**: https://n8n.dreampathai.co.uk  
**Workflow File**: `n8n-workflows/whatsapp-interactive-timesheet-receiver.json`

**Common Commands:**

```powershell
# Check Supabase logs
supabase functions logs whatsapp-timesheet-upload-handler --follow
supabase functions logs incoming-whatsapp-handler --follow
supabase functions logs whatsapp-timesheet-interactive --follow
```

---

## 🎉 **READY TO IMPORT!**

**Next Steps:**

1. Import workflow into n8n
2. Configure credentials
3. Activate workflow
4. Configure Meta webhook
5. Test with real timesheet photo

**Good luck!** 🚀

