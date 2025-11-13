# 📱 Twilio WhatsApp Webhook Setup - 5 Minutes

## Quick Start

### Step 1: Login to Twilio Console
https://console.twilio.com/

### Step 2: Go to WhatsApp Sandbox Settings
**Direct link:** https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox

Or navigate:
1. Click **Messaging** in left sidebar
2. Click **Try it out** → **Send a WhatsApp message**
3. You'll see the sandbox settings

### Step 3: Configure Webhook

Under **"WHEN A MESSAGE COMES IN"**:

1. **URL:**
   ```
   https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/whatsapp-master-router
   ```

2. **Method:** `POST` (HTTP POST)

3. Click **Save**

### Step 4: Get Your Sandbox Join Code

You'll see something like:
```
join proud-planet
```

This is YOUR unique sandbox code.

### Step 5: Test It!

1. **Save** the Twilio contact number to your phone:
   ```
   +1 415 523 8886
   ```

2. **Send WhatsApp message**:
   ```
   join proud-planet
   ```
   (Replace `proud-planet` with YOUR sandbox code)

3. **You'll get confirmation**:
   ```
   ✅ Sandbox: You are all set!
   ```

4. **Now test the AI**:
   ```
   Hello
   ```

5. **Bot will ask for PIN**:
   ```
   👋 Hi! I couldn't find your profile.
   Please reply with your 4-digit PIN.
   ```

6. **Send a PIN** (any 4-digit PIN from your staff database)

7. **If PIN matches**:
   ```
   ✅ WhatsApp Linked!
   Hi [Name]! You're now connected to [Agency].

   Try asking:
   • "Show my shifts this week"
   • "Any shifts available tomorrow?"
   • "What's my schedule?"
   ```

---

## 🧪 Testing with Real Staff

### Generate PINs for Staff

Run this SQL in Supabase:
```sql
-- Generate random 4-digit PINs for all staff without one
UPDATE staff
SET whatsapp_pin = LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE whatsapp_pin IS NULL;

-- View staff with their PINs
SELECT
    first_name,
    last_name,
    phone,
    email,
    whatsapp_pin,
    whatsapp_number_verified
FROM staff
ORDER BY last_name;
```

### Send PIN to Staff via Email

Use your `send-email` function:
```sql
-- Example: Send PIN to staff
SELECT net.http_post(
    url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object(
        'to', 'staff@example.com',
        'subject', 'Your WhatsApp PIN',
        'html', '<h2>Your WhatsApp Assistant PIN</h2>
                 <p>Hi John,</p>
                 <p>Your PIN to link WhatsApp: <strong>1234</strong></p>
                 <p>Send this PIN to our WhatsApp number to get started!</p>'
    )
);
```

---

## 🔄 Optional: Status Callback URL

Under **"WHEN DELIVERY STATUS CHANGES"** (optional):
```
https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/whatsapp-delivery-status
```

This lets you track message delivery (sent, delivered, read, failed).

---

## 🚀 Production: Approved WhatsApp Business Number

### Why Upgrade?

**Sandbox Limitations:**
- ❌ 72-hour session timeout (users must rejoin)
- ❌ Limited to test numbers only
- ❌ "Sandbox" appears in messages
- ❌ Can't send first message to users

**Approved Number Benefits:**
- ✅ No session expiration
- ✅ Send to anyone
- ✅ Professional branded name
- ✅ Initiate conversations
- ✅ Rich media support

### How to Get Approved

1. **Go to:** https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders

2. **Click:** "Request to enable my Twilio Number for WhatsApp"

3. **Requirements:**
   - Facebook Business Manager account
   - Business verification
   - WhatsApp Business Profile
   - ~2 weeks approval time

4. **Cost:**
   - Setup: Free
   - Messages: ~£0.005 per message

5. **Once approved, update webhook URL to:**
   ```
   https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/whatsapp-master-router
   ```

---

## 🐛 Troubleshooting

### "Not receiving messages in my function"

**Check:**
1. Webhook URL is correct (no typos)
2. Method is POST (not GET)
3. Function is deployed (check Supabase dashboard)
4. Check function logs: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/functions/whatsapp-master-router/logs

### "Bot not responding"

**Check:**
1. OPENAI_API_KEY is set in Supabase secrets
2. TWILIO_* credentials are correct
3. Look at function logs for errors

### "Can't find my staff record"

**Check:**
1. Phone number format in database matches Twilio format
2. Run phone normalization test:
   ```sql
   SELECT
       first_name,
       last_name,
       phone,
       CASE
           WHEN phone ~ '^\+' THEN phone
           WHEN phone ~ '^07' THEN '+44' || SUBSTRING(phone FROM 2)
           WHEN phone ~ '^447' THEN '+' || phone
           ELSE '+44' || phone
       END AS normalized
   FROM staff;
   ```

3. Update phone numbers to E.164 format (+44...)

### "Invalid PIN"

**Check:**
1. PIN exists in database: `SELECT whatsapp_pin FROM staff WHERE phone = '+44...';`
2. PIN is 4 digits
3. No spaces/special characters in PIN

---

## 📊 Monitor Usage

### View WhatsApp Activity
```sql
-- Staff with linked WhatsApp
SELECT
    COUNT(*) as linked_count
FROM staff
WHERE whatsapp_number_verified IS NOT NULL;

-- Recent linkages
SELECT
    first_name,
    last_name,
    whatsapp_number_verified,
    whatsapp_linked_at
FROM staff
WHERE whatsapp_linked_at > NOW() - INTERVAL '7 days'
ORDER BY whatsapp_linked_at DESC;
```

### Function Execution Logs

View in real-time:
https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/functions/whatsapp-master-router/logs

---

## ✅ Success Checklist

- [ ] Twilio webhook URL configured
- [ ] Webhook method set to POST
- [ ] Tested sandbox join command
- [ ] Generated PINs for staff
- [ ] Tested authentication flow
- [ ] Tested "Show my shifts" query
- [ ] Tested "Find available shifts" query
- [ ] Function logs show successful executions
- [ ] OpenAI API responding
- [ ] Twilio WhatsApp sending responses

---

## 🎯 Next: Send PINs to All Staff

Once webhook is working, send PINs to all staff:

```sql
-- Create function to send all PINs
CREATE OR REPLACE FUNCTION send_whatsapp_pins_to_all_staff()
RETURNS void AS $$
DECLARE
    staff_record RECORD;
    agency_record RECORD;
BEGIN
    FOR staff_record IN
        SELECT * FROM staff WHERE whatsapp_pin IS NOT NULL AND email IS NOT NULL
    LOOP
        -- Get agency name
        SELECT * INTO agency_record FROM agencies WHERE id = staff_record.agency_id;

        -- Send email with PIN
        PERFORM net.http_post(
            url := 'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/send-email',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
            ),
            body := jsonb_build_object(
                'to', staff_record.email,
                'subject', 'Link Your WhatsApp - ' || COALESCE(agency_record.name, 'ACG StaffLink'),
                'html', '<h2>📱 Link Your WhatsApp</h2>
                         <p>Hi ' || staff_record.first_name || ',</p>
                         <p>Get instant shift updates via WhatsApp!</p>
                         <h3>Your PIN: <strong>' || staff_record.whatsapp_pin || '</strong></h3>
                         <p><strong>How to link:</strong></p>
                         <ol>
                            <li>Save this number: <strong>+1 415 523 8886</strong></li>
                            <li>Send "join proud-planet" to that number</li>
                            <li>Then send your PIN: <strong>' || staff_record.whatsapp_pin || '</strong></li>
                            <li>Start chatting!</li>
                         </ol>
                         <p>Try asking: "Show my shifts this week"</p>'
            )
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute it
SELECT send_whatsapp_pins_to_all_staff();
```

---

**You're done!** Your WhatsApp AI assistant is now live! 🎉
