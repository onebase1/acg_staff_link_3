# 🔍 WhatsApp Debugging Guide

## 🎯 **Current Status**

✅ **n8n workflow**: Active and tested (direct test worked)  
✅ **Supabase Edge Function**: Deployed with n8n mode enabled  
❌ **Shift assignment**: WhatsApp not being sent  

---

## 🧪 **Testing Steps**

### **Step 1: Check Console Logs**

1. **Open browser** and navigate to ACG StaffLink
2. **Open Developer Console** (F12)
3. **Go to Console tab**
4. **Clear console** (trash icon)
5. **Assign a shift** to Chadaira Basera (+447557679989)
6. **Watch for these log messages**:

```
📧 [Shifts] Calling NotificationService.notifyShiftAssignment...
📧 [Shifts] Staff: Chadaira +447557679989
📧 [NotificationService] Shift assignment to g.basera5+chadaira@gmail.com - Multi-channel
📧 [NotificationService] Staff phone: +447557679989
📱 [NotificationService] Staff has phone, sending SMS + WhatsApp...
📱 [WhatsApp] Attempting to send to +447557679989
📱 [WhatsApp] Calling invokeSendWhatsApp...
✅ [WhatsApp] Message sent successfully
```

---

### **Step 2: Check Network Tab**

1. **Open Developer Console** (F12)
2. **Go to Network tab**
3. **Filter**: Type `send-whatsapp`
4. **Assign a shift**
5. **Look for**:
   - Request to `send-whatsapp` Edge Function
   - Status code (should be 200)
   - Response body

---

### **Step 3: Check Supabase Logs**

```powershell
# Check Edge Function logs
supabase functions logs send-whatsapp --limit 50
```

**Look for**:
- Incoming requests
- n8n webhook calls
- Success/error messages

---

## 🐛 **Common Issues**

### **Issue 1: No console logs at all**

**Cause**: NotificationService not being called  
**Fix**: Check if agency is loaded in Shifts.jsx

### **Issue 2: "Unauthorized" error**

**Cause**: Edge Function authentication failing  
**Fix**: Check if user is logged in, token is valid

### **Issue 3: WhatsApp logs show but no message received**

**Cause**: n8n workflow issue or WhatsApp API issue  
**Fix**: 
1. Check n8n execution logs
2. Verify Phone Number ID in n8n workflow
3. Check WhatsApp Business Cloud dashboard

### **Issue 4: Promise.allSettled swallowing errors**

**Cause**: Errors caught but not logged properly  
**Fix**: Check the detailed logs we just added

---

## 🔧 **Quick Fixes**

### **Fix 1: Test WhatsApp directly from console**

```javascript
// Paste this in browser console
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
const supabase = createClient(
  'https://rzzxxkppkiasuouuglaf.supabase.co',
  'YOUR_SUPABASE_JWT_TOKEN'
);

const { data, error } = await supabase.functions.invoke('send-whatsapp', {
  body: {
    to: '+447557679989',
    message: '🧪 Test from console'
  }
});

console.log('Result:', { data, error });
```

### **Fix 2: Check if staff has phone number**

```javascript
// In browser console
const staff = await supabase
  .from('staff')
  .select('*')
  .eq('email', 'g.basera5+chadaira@gmail.com')
  .single();

console.log('Staff phone:', staff.data.phone);
```

---

## 📊 **Expected Flow**

```
User assigns shift in UI
  ↓
Shifts.jsx → assignStaffMutation
  ↓
NotificationService.notifyShiftAssignment()
  ↓
Promise.allSettled([sendSMS(), sendWhatsApp()])
  ↓
invokeSendWhatsApp({ to, message })
  ↓
supabase.functions.invoke('send-whatsapp', { body: { to, message } })
  ↓
Edge Function send-whatsapp (with auth check)
  ↓
fetch(N8N_WHATSAPP_WEBHOOK_URL, { body: { to, message } })
  ↓
n8n workflow receives webhook
  ↓
n8n sends to WhatsApp Business Cloud API
  ↓
WhatsApp delivers message to +447557679989
```

---

## 🎯 **Next Steps**

1. **Refresh your browser** to load the new logging code
2. **Open console** (F12)
3. **Assign a shift** to Chadaira
4. **Share the console output** with me
5. **Check Network tab** for send-whatsapp request

---

## 📞 **If Still Not Working**

Share these with me:
1. **Console logs** (screenshot or copy/paste)
2. **Network tab** (send-whatsapp request/response)
3. **Any error messages**

I'll diagnose the exact issue and fix it! 🚀

