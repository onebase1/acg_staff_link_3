# 📱 ACG StaffLink - n8n WhatsApp Workflows

This folder contains n8n workflows for WhatsApp integration using **WhatsApp Business Cloud API** (FREE alternative to Twilio).

---

## 📦 **Workflows**

### 1. **whatsapp-sender-workflow.json** (Outgoing Messages)

**Purpose**: Send WhatsApp messages from ACG StaffLink to staff members

**Trigger**: Webhook (called by Supabase Edge Function)

**Flow**:
```
Webhook Trigger → Send WhatsApp → Success/Error Response
```

**Input**:
```json
{
  "to": "+44XXXXXXXXXX",
  "message": "Your shift has been assigned!"
}
```

**Output**:
```json
{
  "success": true,
  "messageId": "wamid.XXX==",
  "status": "whatsapp"
}
```

**Used By**:
- Shift assignment notifications
- Urgent shift broadcasts
- Timesheet reminders
- Payment reminders
- All outgoing WhatsApp messages

---

### 2. **whatsapp-receiver-workflow.json** (Incoming Messages)

**Purpose**: Receive WhatsApp messages from staff and forward to conversational AI

**Trigger**: WhatsApp Trigger (Meta webhook)

**Flow**:
```
WhatsApp Trigger → Filter Text Messages → Forward to Supabase (whatsapp-master-router)
```

**Input** (from WhatsApp):
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "+44XXXXXXXXXX",
          "text": { "body": "Show my shifts this week" }
        }],
        "contacts": [{
          "profile": { "name": "John Doe" }
        }]
      }
    }]
  }]
}
```

**Output** (to Supabase):
```
From=+44XXXXXXXXXX
Body=Show my shifts this week
ProfileName=John Doe
```

**Used By**:
- Conversational AI (`whatsapp-master-router`)
- PIN verification
- Shift queries
- Timesheet submission via WhatsApp
- All incoming WhatsApp messages

---

## 🚀 **Quick Setup**

### Prerequisites

1. **WhatsApp Business Cloud API** account
   - Facebook Business account
   - Meta app with WhatsApp product
   - Access Token, Phone Number ID, Business Account ID

2. **n8n instance** running at https://n8n.dreampathai.co.uk

3. **Supabase** project with Edge Functions deployed

### Installation

1. **Import workflows**:
   ```
   n8n → Import from File → whatsapp-sender-workflow.json
   n8n → Import from File → whatsapp-receiver-workflow.json
   ```

2. **Configure credentials**:
   - WhatsApp Business Cloud API credentials (both workflows)
   - Supabase Service Role Key (receiver workflow only)

3. **Set environment variables** in n8n:
   ```
   WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID
   SUPABASE_URL=https://rzzxxkppkiasuouuglaf.supabase.co
   ```

4. **Activate workflows**:
   - Enable both workflows
   - Copy webhook URLs

5. **Configure Supabase**:
   ```bash
   supabase secrets set N8N_WHATSAPP_WEBHOOK_URL=https://n8n.dreampathai.co.uk/webhook/send-whatsapp
   supabase secrets set USE_N8N_WHATSAPP=true
   ```

6. **Configure WhatsApp webhook**:
   - Go to WhatsApp Business Cloud dashboard
   - Set webhook URL from receiver workflow
   - Subscribe to `messages` events

7. **Deploy Edge Function**:
   ```bash
   supabase functions deploy send-whatsapp
   ```

---

## 🧪 **Testing**

### Test Sender Workflow

```bash
curl -X POST https://n8n.dreampathai.co.uk/webhook/send-whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+44XXXXXXXXXX",
    "message": "Test from n8n!"
  }'
```

### Test Receiver Workflow

Send a WhatsApp message to your business number:
```
"Show my shifts this week"
```

Check n8n execution logs to see the message being forwarded to Supabase.

---

## 📊 **Monitoring**

### n8n Dashboard

- **Executions**: View all workflow runs
- **Errors**: Debug failed messages
- **Logs**: See detailed execution data

### WhatsApp Business Cloud Dashboard

- **Message analytics**: Sent/delivered/read rates
- **Conversation limits**: Track free tier usage
- **API usage**: Monitor rate limits

---

## 🔧 **Troubleshooting**

### Sender Workflow Issues

**Problem**: Messages not sending  
**Solution**: Check WhatsApp credentials, verify phone number ID

**Problem**: Webhook not responding  
**Solution**: Ensure workflow is active, check n8n logs

### Receiver Workflow Issues

**Problem**: Not receiving messages  
**Solution**: Verify webhook URL in WhatsApp dashboard, check subscription

**Problem**: Messages not reaching Supabase  
**Solution**: Check Supabase credentials, verify service role key

---

## 📞 **Support**

- **WhatsApp Business Cloud Docs**: https://developers.facebook.com/docs/whatsapp/cloud-api
- **n8n WhatsApp Node Docs**: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.whatsapp/
- **n8n Community**: https://community.n8n.io/

---

## 🎉 **Benefits**

✅ **FREE** WhatsApp messaging (up to 1,000 conversations/month)  
✅ **Bidirectional** communication (send + receive)  
✅ **Conversational AI** support  
✅ **Rich media** support (images, documents, location)  
✅ **Template messages** for marketing  
✅ **Higher rate limits** (80 messages/second)

---

**For detailed setup instructions, see: `WHATSAPP_N8N_MIGRATION_GUIDE.md`**

