# 🎯 N8N HANDLER CODE SNIPPETS - COPY & PASTE READY

## 📋 **IMPLEMENTATION ORDER**
1. ✅ Greeting
2. Check Schedule
3. Find Shifts
4. Book Shift
5. Cancel Booking
6. Check Compliance
7. Calculate Pay
8. Upload Timesheet (PRIORITY!)
9. Fallback

---

## 1️⃣ **GREETING HANDLER** 👋

### **Node Type:** Code (JavaScript)
### **Node Name:** Handle Greeting

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

**Connect to:** Format Final Response → Send WhatsApp

---

## 2️⃣ **CHECK SCHEDULE HANDLER** 📅

### **Step 1: Query Shifts (Supabase Node)**
**Node Name:** Query Upcoming Shifts

**Configuration:**
- **Operation:** Get
- **Table:** `shifts`
- **Select:** `*, clients(name, address)`
- **Filters:**
  - `agency_id` = `{{ $('Format Staff Data').first().json.agency_id }}`
  - `assigned_staff_id` = `{{ $('Format Staff Data').first().json.staff_id }}`
  - `status` in `confirmed,assigned,in_progress`
  - `date` >= `{{ $now.toFormat('yyyy-MM-dd') }}`
- **Sort:** `date:asc,start_time:asc`
- **Limit:** 10

### **Step 2: Format Response (Code Node)**
**Node Name:** Format Schedule Response

```javascript
const shifts = $input.first().json;
const staff = $('Format Staff Data').first().json;

// Handle no shifts
if (!shifts || shifts.length === 0) {
  return {
    json: {
      message: `Hi ${staff.first_name}! 📅\n\nYou have no upcoming shifts scheduled.`,
      staff_id: staff.staff_id,
      phone: staff.phone
    }
  };
}

// Build message
let message = `📅 *Your Upcoming Shifts* (${shifts.length})\n\n`;

shifts.forEach((shift, i) => {
  const date = new Date(shift.date);
  const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
  const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  
  message += `${i + 1}. *${dayName}, ${dateStr}*\n`;
  message += `   🏥 ${shift.clients?.name || 'TBC'}\n`;
  message += `   📍 ${shift.clients?.address || 'TBC'}\n`;
  message += `   ⏰ ${shift.start_time} - ${shift.end_time}\n`;
  message += `   💰 £${shift.pay_rate}/hr\n\n`;
});

return {
  json: {
    message: message,
    staff_id: staff.staff_id,
    phone: staff.phone
  }
};
```

**Connect:** Query Upcoming Shifts → Format Schedule Response → Format Final Response → Send WhatsApp

---

## 3️⃣ **FIND SHIFTS HANDLER** 🔍

### **Step 1: Query Available Shifts (Supabase Node)**
**Node Name:** Query Available Shifts

**Configuration:**
- **Operation:** Get
- **Table:** `shifts`
- **Select:** `*, clients(name, address)`
- **Filters:**
  - `agency_id` = `{{ $('Format Staff Data').first().json.agency_id }}`
  - `status` = `open`
  - `marketplace_visible` = `true`
  - `date` >= `{{ $now.toFormat('yyyy-MM-dd') }}`
- **Sort:** `date:asc,start_time:asc`
- **Limit:** 5

### **Step 2: Format Response (Code Node)**
**Node Name:** Format Available Shifts

```javascript
const shifts = $input.first().json;
const staff = $('Format Staff Data').first().json;

// Handle no shifts
if (!shifts || shifts.length === 0) {
  return {
    json: {
      message: `Hi ${staff.first_name}! 🔍\n\nNo available shifts right now. Check back later!`,
      staff_id: staff.staff_id,
      phone: staff.phone
    }
  };
}

// Build message
let message = `🔍 *Available Shifts* (${shifts.length})\n\n`;

shifts.forEach((shift, i) => {
  const date = new Date(shift.date);
  const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
  const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  
  // Get first 8 chars of shift ID for booking reference
  const shortId = shift.id.substring(0, 8);
  
  message += `${i + 1}. *${dayName}, ${dateStr}*\n`;
  message += `   🏥 ${shift.clients?.name || 'TBC'}\n`;
  message += `   📍 ${shift.clients?.address || 'TBC'}\n`;
  message += `   ⏰ ${shift.start_time} - ${shift.end_time}\n`;
  message += `   💰 £${shift.pay_rate}/hr\n`;
  message += `   📋 ID: ${shortId}\n\n`;
});

message += `\n💡 To book a shift, reply:\n"Book shift [ID]"`;

return {
  json: {
    message: message,
    staff_id: staff.staff_id,
    phone: staff.phone
  }
};
```

---

## 4️⃣ **FALLBACK HANDLER** ❓

### **Node Type:** Code (JavaScript)
### **Node Name:** Handle Fallback

```javascript
const staff = $('Format Staff Data').first().json;
const originalMessage = $('Extract Message Data').first().json['message.text'];

// Get agency contact info (you'll need to query this or have it in staff data)
// For now, using placeholder - you can add a Supabase query before this node
const agencyPhone = staff.agency?.phone || '+44 XXX XXX XXXX';
const agencyEmail = staff.agency?.email || 'support@agency.com';

const message = `Thanks for your message! 📧

For questions about:
• Sick leave policy
• Holiday requests  
• HR policies
• Payment queries

Please contact your agency:

📞 ${agencyPhone}
📧 ${agencyEmail}

Or reply *"Contact me"* and we'll have someone reach out within 24 hours.`;

return {
  json: {
    message: message,
    staff_id: staff.staff_id,
    phone: staff.phone,
    original_question: originalMessage,
    needs_followup: false
  }
};
```

### **Optional: Add "Contact Me" Detection**

If you want to handle "Contact me" responses, add a **Switch node** after this that checks if the user replied "Contact me", then:

1. **Send email to admin** (Email node)
2. **Log support request** (Supabase Insert)
3. **Confirm to user** (WhatsApp response)

---

## 🔄 **FORMAT FINAL RESPONSE NODE**

This node should be used by ALL handlers before sending to WhatsApp.

### **Node Type:** Code (JavaScript)
### **Node Name:** Format Final Response

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

---

## 📤 **SEND WHATSAPP NODE**

### **Node Type:** HTTP Request
### **Node Name:** Send WhatsApp

**Configuration:**
- **Method:** POST
- **URL:** `https://graph.facebook.com/v18.0/{{ $env.WHATSAPP_PHONE_NUMBER_ID }}/messages`
- **Authentication:** Header Auth
  - **Header Name:** `Authorization`
  - **Header Value:** `Bearer {{ $env.WHATSAPP_ACCESS_TOKEN }}`
- **Send Headers:** Yes
  - **Content-Type:** `application/json`
- **Send Body:** Yes (JSON)
- **JSON Body:** `{{ $json }}`

---

## 5️⃣ **BOOK SHIFT HANDLER** 📝

### **Step 1: Extract Shift ID (Code Node)**
**Node Name:** Extract Shift ID

```javascript
const staff = $('Format Staff Data').first().json;
const message = $('Extract Message Data').first().json['message.text'];

// Extract shift ID from message (e.g., "Book shift abc123" or "Book abc123")
const match = message.match(/book\s+(?:shift\s+)?([a-f0-9-]{8,})/i);

if (!match) {
  return {
    json: {
      error: true,
      message: `Sorry, I couldn't find a shift ID in your message.\n\nPlease reply with:\n"Book shift [ID]"\n\nExample: "Book shift abc12345"`,
      staff_id: staff.staff_id,
      phone: staff.phone
    }
  };
}

const shiftId = match[1];

return {
  json: {
    shift_id: shiftId,
    staff_id: staff.staff_id,
    agency_id: staff.agency_id,
    phone: staff.phone
  }
};
```

### **Step 2: Find Shift (Supabase Node)**
**Node Name:** Find Shift to Book

**Configuration:**
- **Operation:** Get
- **Table:** `shifts`
- **Select:** `*, clients(name, address)`
- **Filters:**
  - `id` starts with `{{ $json.shift_id }}`
  - `agency_id` = `{{ $json.agency_id }}`
  - `status` = `open`
  - `marketplace_visible` = `true`
- **Limit:** 1

### **Step 3: Validate and Book (Code Node)**
**Node Name:** Validate and Book Shift

```javascript
const shifts = $input.first().json;
const data = $('Extract Shift ID').first().json;

// Check if shift exists
if (!shifts || shifts.length === 0) {
  return {
    json: {
      error: true,
      message: `Sorry, I couldn't find that shift.\n\nIt may have been:\n• Already booked\n• Cancelled\n• Invalid ID\n\nReply "Find shifts" to see available shifts.`,
      staff_id: data.staff_id,
      phone: data.phone
    }
  };
}

const shift = shifts[0];

// Prepare update data
return {
  json: {
    shift_id: shift.id,
    staff_id: data.staff_id,
    phone: data.phone,
    shift_details: {
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      client_name: shift.clients?.name,
      pay_rate: shift.pay_rate
    }
  }
};
```

### **Step 4: Update Shift (Supabase Node)**
**Node Name:** Update Shift Assignment

**Configuration:**
- **Operation:** Update
- **Table:** `shifts`
- **Update Key:** `id`
- **Update Key Value:** `{{ $json.shift_id }}`
- **Fields to Update:**
  - `assigned_staff_id` = `{{ $json.staff_id }}`
  - `status` = `assigned`

### **Step 5: Confirm Booking (Code Node)**
**Node Name:** Confirm Booking

```javascript
const data = $input.first().json;
const details = $('Validate and Book Shift').first().json.shift_details;

const date = new Date(details.date);
const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' });
const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

const message = `✅ *Shift Booked Successfully!*

📅 ${dayName}, ${dateStr}
⏰ ${details.start_time} - ${details.end_time}
🏥 ${details.client_name}
💰 £${details.pay_rate}/hr

We'll send you a reminder before your shift.

Good luck! 🌟`;

return {
  json: {
    message: message,
    staff_id: data.staff_id,
    phone: data.phone
  }
};
```

**Flow:** Extract Shift ID → Find Shift to Book → Validate and Book Shift → Update Shift Assignment → Confirm Booking → Format Final Response → Send WhatsApp

---

## 6️⃣ **CANCEL BOOKING HANDLER** ❌

### **Step 1: Extract Shift ID (Code Node)**
**Node Name:** Extract Shift ID for Cancellation

```javascript
const staff = $('Format Staff Data').first().json;
const message = $('Extract Message Data').first().json['message.text'];

// Extract shift ID from message
const match = message.match(/cancel\s+(?:shift\s+|booking\s+)?([a-f0-9-]{8,})/i);

if (!match) {
  return {
    json: {
      error: true,
      message: `Sorry, I couldn't find a shift ID.\n\nPlease reply with:\n"Cancel shift [ID]"\n\nTo see your shifts, reply "Check schedule"`,
      staff_id: staff.staff_id,
      phone: staff.phone
    }
  };
}

return {
  json: {
    shift_id: match[1],
    staff_id: staff.staff_id,
    agency_id: staff.agency_id,
    phone: staff.phone
  }
};
```

### **Step 2: Find Assigned Shift (Supabase Node)**
**Node Name:** Find Shift to Cancel

**Configuration:**
- **Operation:** Get
- **Table:** `shifts`
- **Select:** `*, clients(name)`
- **Filters:**
  - `id` starts with `{{ $json.shift_id }}`
  - `agency_id` = `{{ $json.agency_id }}`
  - `assigned_staff_id` = `{{ $json.staff_id }}`
  - `status` in `assigned,confirmed`
- **Limit:** 1

### **Step 3: Validate Cancellation (Code Node)**
**Node Name:** Validate Cancellation

```javascript
const shifts = $input.first().json;
const data = $('Extract Shift ID for Cancellation').first().json;

if (!shifts || shifts.length === 0) {
  return {
    json: {
      error: true,
      message: `Sorry, I couldn't find that shift in your bookings.\n\nTo see your shifts, reply "Check schedule"`,
      staff_id: data.staff_id,
      phone: data.phone
    }
  };
}

const shift = shifts[0];

// Check if shift is within 24 hours
const shiftDateTime = new Date(`${shift.date}T${shift.start_time}`);
const now = new Date();
const hoursUntilShift = (shiftDateTime - now) / (1000 * 60 * 60);

if (hoursUntilShift < 24) {
  return {
    json: {
      error: true,
      message: `⚠️ This shift starts in less than 24 hours.\n\nPlease contact your agency to cancel:\n📞 ${data.agency?.phone || 'Contact your agency'}`,
      staff_id: data.staff_id,
      phone: data.phone
    }
  };
}

return {
  json: {
    shift_id: shift.id,
    staff_id: data.staff_id,
    phone: data.phone,
    shift_details: {
      date: shift.date,
      start_time: shift.start_time,
      client_name: shift.clients?.name
    }
  }
};
```

### **Step 4: Cancel Shift (Supabase Node)**
**Node Name:** Cancel Shift Assignment

**Configuration:**
- **Operation:** Update
- **Table:** `shifts`
- **Update Key:** `id`
- **Update Key Value:** `{{ $json.shift_id }}`
- **Fields to Update:**
  - `assigned_staff_id` = `null`
  - `status` = `open`

### **Step 5: Confirm Cancellation (Code Node)**
**Node Name:** Confirm Cancellation

```javascript
const data = $input.first().json;
const details = $('Validate Cancellation').first().json.shift_details;

const date = new Date(details.date);
const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

const message = `✅ *Shift Cancelled*

Your booking for ${dateStr} at ${details.client_name} has been cancelled.

The shift is now available for other staff members.

Reply "Find shifts" to see other opportunities.`;

return {
  json: {
    message: message,
    staff_id: data.staff_id,
    phone: data.phone
  }
};
```

---

## 🎯 **NEXT STEPS**

1. ✅ Copy the **Greeting Handler** code into your "Handle Greeting" node
2. ✅ Test it by sending "Hi" to your WhatsApp number
3. ✅ Verify the response shows the menu
4. Move to **Check Schedule** handler next

**Ready to implement? Start with Greeting!** 🚀

