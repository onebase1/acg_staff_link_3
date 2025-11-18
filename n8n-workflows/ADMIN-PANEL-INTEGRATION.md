# 🔗 Admin Panel Integration Guide

## Quick Reference: Add WhatsApp Notifications to Shift Assignment

---

## 📍 WHERE TO ADD THE CODE

**File:** Your admin panel shift assignment component (e.g., `ShiftManagement.jsx` or similar)

**Location:** After successfully assigning a shift to staff, before showing success message

---

## 💻 CODE TO ADD

### Option 1: Simple Integration (Recommended)

```javascript
// Add this function to your component
const sendShiftNotification = async (shiftId) => {
  try {
    const response = await fetch('https://your-n8n-instance.com/webhook/shift-assigned', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shift_id: shiftId
      })
    });

    if (!response.ok) {
      throw new Error('Notification failed');
    }

    const result = await response.json();
    console.log('✅ WhatsApp notification sent:', result.message_id);
    return result;
  } catch (error) {
    console.error('❌ WhatsApp notification failed:', error);
    // Don't block the shift assignment if notification fails
    return null;
  }
};

// Call this after successful shift assignment
const handleAssignShift = async (shiftId, staffId) => {
  try {
    // Your existing shift assignment logic
    const { data, error } = await supabase
      .from('shifts')
      .update({ 
        assigned_staff_id: staffId,
        status: 'assigned'
      })
      .eq('id', shiftId)
      .select()
      .single();

    if (error) throw error;

    // ✨ NEW: Send WhatsApp notification
    await sendShiftNotification(shiftId);

    // Show success message
    toast.success('Shift assigned and staff notified via WhatsApp!');
  } catch (error) {
    console.error('Error assigning shift:', error);
    toast.error('Failed to assign shift');
  }
};
```

---

### Option 2: With Loading State

```javascript
const [isSendingNotification, setIsSendingNotification] = useState(false);

const sendShiftNotification = async (shiftId) => {
  setIsSendingNotification(true);
  try {
    const response = await fetch('https://your-n8n-instance.com/webhook/shift-assigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shift_id: shiftId })
    });

    const result = await response.json();
    
    if (result.success) {
      toast.success('Staff notified via WhatsApp ✓');
      return result;
    } else {
      throw new Error('Notification failed');
    }
  } catch (error) {
    toast.warning('Shift assigned but WhatsApp notification failed');
    console.error('Notification error:', error);
    return null;
  } finally {
    setIsSendingNotification(false);
  }
};
```

---

### Option 3: With Retry Logic

```javascript
const sendShiftNotification = async (shiftId, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch('https://your-n8n-instance.com/webhook/shift-assigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: shiftId })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      console.log(`✅ Notification sent (attempt ${attempt}):`, result.message_id);
      return result;
    } catch (error) {
      console.error(`❌ Notification attempt ${attempt} failed:`, error);
      
      if (attempt === retries) {
        // Final attempt failed
        console.error('All notification attempts failed');
        return null;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};
```

---

## 🔧 CONFIGURATION

### 1. Get Your Webhook URL

After importing the workflow to n8n:
1. Open "Shift Assignment Notification" workflow
2. Click on "Webhook - Shift Assigned" node
3. Copy the **Production URL**
4. It will look like: `https://your-n8n.com/webhook/shift-assigned`

### 2. Update the Code

Replace `https://your-n8n-instance.com/webhook/shift-assigned` with your actual webhook URL.

### 3. Environment Variable (Best Practice)

```javascript
// .env.local
NEXT_PUBLIC_N8N_WEBHOOK_SHIFT_ASSIGNED=https://your-n8n.com/webhook/shift-assigned

// In your code
const WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_SHIFT_ASSIGNED;

const sendShiftNotification = async (shiftId) => {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id: shiftId })
  });
  // ... rest of code
};
```

---

## 🧪 TESTING

### Test the Integration

1. **Assign a test shift:**
   - Use shift ID: `cdce9c0e-f7a2-46d2-b549-d0858b556517` (Nov 18 shift)
   - Assign to staff: Chadaira Basera

2. **Check the logs:**
   - Open browser console
   - Look for: `✅ WhatsApp notification sent: wamid.xxx`

3. **Verify in n8n:**
   - Go to n8n → Executions
   - Check latest execution of "Shift Assignment Notification"
   - Should show: Success ✓

4. **Check WhatsApp:**
   - Staff should receive message on +447557679989
   - Message should contain shift details

5. **Verify database:**
   ```sql
   SELECT * FROM notifications 
   ORDER BY sent_at DESC 
   LIMIT 1;
   ```
   - Should show new notification record

---

## 🚨 ERROR HANDLING

### Common Issues

**Issue 1: CORS Error**
```
Access to fetch at 'https://n8n.com/webhook/...' from origin 'https://yourapp.com' 
has been blocked by CORS policy
```

**Solution:** n8n webhooks should allow CORS by default. If not, add CORS headers in n8n webhook settings.

---

**Issue 2: 404 Not Found**
```
POST https://n8n.com/webhook/shift-assigned 404 (Not Found)
```

**Solution:** 
- Verify workflow is **Active** in n8n
- Check webhook URL is correct
- Ensure webhook path matches exactly

---

**Issue 3: 500 Internal Server Error**

**Solution:**
- Check n8n execution log for errors
- Verify shift_id exists in database
- Check Supabase credentials in n8n

---

## 📊 MONITORING

### Add Analytics Tracking

```javascript
const sendShiftNotification = async (shiftId) => {
  const startTime = Date.now();
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shift_id: shiftId })
    });

    const result = await response.json();
    const duration = Date.now() - startTime;

    // Track success
    analytics.track('whatsapp_notification_sent', {
      shift_id: shiftId,
      message_id: result.message_id,
      duration_ms: duration,
      status: 'success'
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Track failure
    analytics.track('whatsapp_notification_failed', {
      shift_id: shiftId,
      error: error.message,
      duration_ms: duration,
      status: 'failed'
    });

    return null;
  }
};
```

---

## ✅ CHECKLIST

Before deploying to production:

- [ ] Webhook URL configured correctly
- [ ] Environment variable set (if using)
- [ ] Error handling implemented
- [ ] Success/failure messages shown to admin
- [ ] Tested with real shift assignment
- [ ] Verified WhatsApp message received
- [ ] Checked notification logged in database
- [ ] Added analytics tracking (optional)
- [ ] Documented for team

---

## 🎯 EXPECTED BEHAVIOR

### When Admin Assigns Shift:

1. **Admin Panel:**
   - Shows "Assigning shift..." loading state
   - Updates to "Shift assigned ✓"
   - Shows "Staff notified via WhatsApp ✓"

2. **n8n Workflow:**
   - Receives webhook trigger
   - Fetches shift, staff, client data
   - Formats WhatsApp message
   - Sends to staff's phone
   - Logs to notifications table
   - Returns success response

3. **Staff WhatsApp:**
   - Receives instant notification
   - Sees shift date, time, location
   - Sees pay amount
   - Has link to staff portal

4. **Database:**
   - New record in `notifications` table
   - Contains message_id, timestamp, metadata

**Total Time:** < 3 seconds from assignment to WhatsApp delivery

---

## 📞 SUPPORT

If you encounter issues:
1. Check n8n execution logs
2. Verify webhook URL is correct
3. Test webhook with curl:
   ```bash
   curl -X POST https://your-n8n.com/webhook/shift-assigned \
     -H "Content-Type: application/json" \
     -d '{"shift_id": "cdce9c0e-f7a2-46d2-b549-d0858b556517"}'
   ```
4. Check browser console for errors
5. Review DEPLOYMENT-GUIDE.md troubleshooting section

---

**Integration Time:** 10 minutes
**Difficulty:** Easy
**Impact:** High (instant staff notifications)

