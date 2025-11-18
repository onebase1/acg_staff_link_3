# 📱 WhatsApp Migration: Twilio → n8n + WhatsApp Business Cloud

## 🎯 **Why This Migration?**

- ❌ **Twilio**: Paid service, currently out of funds
- ✅ **WhatsApp Business Cloud API**: **FREE** (up to 1,000 conversations/month)
- ✅ **n8n**: Already running at https://n8n.dreampathai.co.uk
- ✅ **Zero Code Changes**: Drop-in replacement for existing `send-whatsapp` function

---

## 📋 **Prerequisites**

### 1. WhatsApp Business Cloud API Setup

1. **Create Facebook Business Account**
   - Go to https://business.facebook.com
   - Create a business account (if you don't have one)

2. **Create Meta App**
   - Go to https://developers.facebook.com/apps
   - Click "Create App" → "Business" type
   - Add "WhatsApp" product to your app

3. **Get Credentials**
   You'll need these 3 values:
   - **Access Token**: From WhatsApp → API Setup → Temporary access token
   - **Phone Number ID**: From WhatsApp → API Setup → Phone number ID
   - **Business Account ID**: From WhatsApp → API Setup

4. **Verify Your Business** (Optional but recommended)
   - Increases message limits from 250 to 1,000+ per day
   - Go to Business Settings → Security Center

---

## 🔧 **n8n Workflow Setup**

### Step 1: Import Workflows

You need to import **TWO** workflows:

1. **Sender Workflow** (for outgoing messages)
   - Open n8n: https://n8n.dreampathai.co.uk
   - Click **"+"** → **"Import from File"**
   - Upload: `n8n-workflows/whatsapp-sender-workflow.json`

2. **Receiver Workflow** (for incoming messages - conversational AI)
   - Click **"+"** → **"Import from File"**
   - Upload: `n8n-workflows/whatsapp-receiver-workflow.json`

### Step 2: Configure WhatsApp Credentials

**For BOTH workflows:**

1. Click on **"Send WhatsApp"** or **"WhatsApp Trigger"** node
2. Click **"Create New Credential"** (or reuse existing)
3. Enter your WhatsApp Business Cloud API credentials:
   - **Access Token**: `YOUR_ACCESS_TOKEN`
   - **Business Account ID**: `YOUR_BUSINESS_ACCOUNT_ID`
4. Save credentials

### Step 3: Set Environment Variables

In n8n settings, add:
```
WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID
SUPABASE_URL=https://rzzxxkppkiasuouuglaf.supabase.co
```

### Step 4: Configure Supabase Credentials (Receiver Workflow Only)

1. In **"Forward to Supabase"** node
2. Click **"Create New Credential"** for HTTP Header Auth
3. Set:
   - **Name**: `Authorization`
   - **Value**: `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY`

### Step 5: Activate Workflows

**Sender Workflow:**
1. Click **"Active"** toggle in top-right
2. Copy the **Production Webhook URL**
   - Should look like: `https://n8n.dreampathai.co.uk/webhook/send-whatsapp`

**Receiver Workflow:**
1. Click **"Active"** toggle
2. Copy the **WhatsApp Webhook URL** from the trigger node
3. Go to WhatsApp Business Cloud dashboard
4. Set this URL as your webhook endpoint

---

## 🔄 **Update Supabase Edge Function**

Replace the Twilio code in `supabase/functions/send-whatsapp/index.ts` with n8n webhook call:

```typescript
// NEW: Call n8n workflow instead of Twilio
const N8N_WEBHOOK_URL = Deno.env.get("N8N_WHATSAPP_WEBHOOK_URL");

const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        to: to,
        message: message
    }),
});
```

---

## 🌍 **Environment Variables**

Add to Supabase Edge Function secrets:

```bash
supabase secrets set N8N_WHATSAPP_WEBHOOK_URL=https://n8n.dreampathai.co.uk/webhook/send-whatsapp
```

---

## ✅ **Testing**

### Test via Supabase Function

```bash
supabase functions invoke send-whatsapp --body '{
  "to": "+44XXXXXXXXXX",
  "message": "Test message from n8n!"
}'
```

### Expected Response

```json
{
  "success": true,
  "messageId": "wamid.XXX==",
  "status": "whatsapp"
}
```

---

## 📊 **Cost Comparison**

| Provider | Cost | Limit |
|----------|------|-------|
| **Twilio** | $0.005/msg | Paid only |
| **WhatsApp Business Cloud** | **FREE** | 1,000 conversations/month |

**Savings**: ~$150/month (assuming 30,000 messages)

---

## 🔒 **Security Notes**

1. **Webhook Authentication** (Optional):
   - Add API key to n8n webhook
   - Pass in `Authorization` header from Supabase

2. **Rate Limiting**:
   - WhatsApp Business Cloud: 80 messages/second
   - n8n: No limits

---

## 🚀 **Next Steps**

1. ✅ Set up WhatsApp Business Cloud API
2. ✅ Import n8n workflow
3. ✅ Configure credentials
4. ✅ Update Supabase Edge function
5. ✅ Test with real phone number
6. ✅ Deploy to production

---

## 📞 **Support**

- **WhatsApp Business Cloud Docs**: https://developers.facebook.com/docs/whatsapp/cloud-api
- **n8n WhatsApp Node Docs**: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.whatsapp/
- **n8n Community**: https://community.n8n.io/

---

## 🎉 **Benefits**

✅ **FREE** WhatsApp messaging (up to 1,000 conversations/month)  
✅ **No code changes** required in your app  
✅ **Same API interface** as Twilio  
✅ **Better reliability** (Meta's official API)  
✅ **Rich media support** (images, documents, location)  
✅ **Template messages** for marketing  

---

**Ready to migrate? Follow the steps above!** 🚀

