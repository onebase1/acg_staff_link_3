# 🎯 WHATSAPP V1 SCOPED IMPLEMENTATION

## ✅ **WHAT WE'RE BUILDING (V1)**

### **Priority 1: Agency → Staff (Templates)** 📤
- Shift assignments
- Shift reminders
- Shift cancellations
- Compliance warnings
- Timesheet reminders
- Payment notifications
- New shifts available

**Status:** Templates being created by Meta agent ✅

---

### **Priority 2: Staff → Agency (Conversational)** 💬
**SCOPED INTENTS FOR V1:**

1. ✅ **Greeting** - Welcome message with menu
2. ✅ **Check Schedule** - Show upcoming shifts
3. ✅ **Find Shifts** - Show available shifts
4. ✅ **Book Shift** - Book an available shift
5. ✅ **Cancel Booking** - Cancel a confirmed shift
6. ✅ **Check Compliance** - Show compliance status
7. ✅ **Calculate Pay** - Show earnings summary
8. 🔥 **Upload Timesheet** - Handle photo uploads (PRIORITY!)
9. ❌ **General Questions** - Fallback with contact info

---

## 🚫 **WHAT WE'RE NOT HANDLING (V1)**

### **Out of Scope Questions:**
- Sick leave policy
- Holiday requests
- Detailed HR policies
- Complex scheduling conflicts
- Payment disputes
- Contract negotiations

### **Fallback Response:**
```
Thanks for your message! 

For questions about [topic], please contact your agency:

📞 Phone: [agency_phone]
📧 Email: [agency_email]

Or we can have someone get back to you - just reply "Contact me"
```

### **If user replies "Contact me":**
- Send email to agency admin
- Log the question in database
- Confirm to user: "We've notified your agency. Someone will contact you within 24 hours."

---

## 🏗️ **MULTI-TENANT ARCHITECTURE**

### **Database Structure:**
All queries MUST filter by `agency_id` to ensure data isolation:

```javascript
// ✅ CORRECT - Multi-tenant safe
const shifts = await supabase
  .from('shifts')
  .select('*')
  .eq('agency_id', staffData.agency_id)
  .eq('assigned_staff_id', staffData.staff_id);

// ❌ WRONG - Could leak data across agencies
const shifts = await supabase
  .from('shifts')
  .select('*')
  .eq('assigned_staff_id', staffData.staff_id);
```

### **Key Principles:**
1. **Always include `agency_id` filter** in Supabase queries
2. **Use RLS policies** as backup security layer
3. **Staff phone numbers are unique** across all agencies
4. **Agency settings are isolated** (phone, email, branding)

---

## 📋 **HANDLER IMPLEMENTATION PLAN**

### **1. GREETING** 👋
**Flow:** Static response

**Code:**
```javascript
const staff = $('Format Staff Data').first().json;

return {
  message: `Hi ${staff.first_name}! 👋

I can help you with:
📅 Check schedule
🔍 Find shifts
📝 Book shift
❌ Cancel booking
📋 Check compliance
💰 Calculate pay
📸 Upload timesheet

Just ask me anything!`
};
```

---

### **2. CHECK SCHEDULE** 📅
**Flow:** Supabase → Format

**Supabase Query:**
- Table: `shifts`
- Select: `*, clients(name, address)`
- Filters:
  - `agency_id` = `{{ $('Format Staff Data').first().json.agency_id }}`
  - `assigned_staff_id` = `{{ $('Format Staff Data').first().json.staff_id }}`
  - `status` in `['confirmed', 'assigned', 'in_progress']`
  - `date` >= `{{ $now.toFormat('yyyy-MM-dd') }}`
- Sort: `date ASC, start_time ASC`
- Limit: 10

**Format Code:** (See WHATSAPP_HANDLER_IMPLEMENTATION_PLAN.md)

---

### **3. FIND SHIFTS** 🔍
**Flow:** Supabase → Format

**Supabase Query:**
- Table: `shifts`
- Select: `*, clients(name, address)`
- Filters:
  - `agency_id` = `{{ $('Format Staff Data').first().json.agency_id }}`
  - `status` = `open`
  - `marketplace_visible` = `true`
  - `date` >= `{{ $now.toFormat('yyyy-MM-dd') }}`
- Sort: `date ASC`
- Limit: 5

---

### **4. BOOK SHIFT** 📝
**Flow:** Parse ID → Validate → Update Supabase → Confirm

**Expected Input:** "Book shift [ID]" or "Book [ID]"

**Steps:**
1. Extract shift ID from message
2. Query shift to validate:
   - Shift exists
   - Status is 'open'
   - Belongs to staff's agency
   - Staff is qualified (role matches)
3. Update shift:
   - Set `assigned_staff_id`
   - Set `status` = 'assigned'
4. Send confirmation

---

### **5. CANCEL BOOKING** ❌
**Flow:** Parse ID → Validate → Update Supabase → Confirm

**Expected Input:** "Cancel shift [ID]" or "Cancel [ID]"

**Steps:**
1. Extract shift ID from message
2. Query shift to validate:
   - Shift exists
   - Assigned to this staff member
   - Status is 'assigned' or 'confirmed'
   - Not within 24 hours of start time
3. Update shift:
   - Set `assigned_staff_id` = NULL
   - Set `status` = 'open'
4. Send confirmation

---

### **6. CHECK COMPLIANCE** 📋
**Flow:** Get staff data → Format

**Code:**
```javascript
const staff = $('Format Staff Data').first().json;

let message = `📋 *Compliance Status*\n\n`;

// DBS Check
if (staff.dbs_status === 'valid') {
  message += `✅ DBS: Valid`;
  if (staff.dbs_expiry_date) {
    const expiry = new Date(staff.dbs_expiry_date);
    message += ` (Expires: ${expiry.toLocaleDateString('en-GB')})`;
  }
} else {
  message += `⚠️ DBS: ${staff.dbs_status || 'Not uploaded'}`;
}

message += `\n\n📄 Update documents:\nhttps://agilecaremanagement.netlify.app/staff/compliance`;

return { message };
```

---

### **7. CALCULATE PAY** 💰
**Flow:** Supabase → Calculate → Format

(See WHATSAPP_HANDLER_IMPLEMENTATION_PLAN.md for full implementation)

---

### **8. UPLOAD TIMESHEET** 📸 **[PRIORITY!]**
**Flow:** Detect image → Download → OCR → Update shift → Confirm

**Steps:**
1. Detect if message contains image
2. Download image from WhatsApp
3. Upload to Supabase Storage (`timesheets/` bucket)
4. Run OCR (optional - future enhancement)
5. Update shift record with timesheet URL
6. Send confirmation

**Code Structure:**
```javascript
// Check if message has media
if ($json.message?.type === 'image') {
  const imageId = $json.message.image.id;
  // Download from WhatsApp API
  // Upload to Supabase Storage
  // Update shift record
  return { message: "✅ Timesheet received! Thank you." };
}
```

---

### **9. FALLBACK** ❓
**Flow:** Check if out-of-scope → Provide contact info → Optional email admin

**Code:**
```javascript
const staff = $('Format Staff Data').first().json;
const agency = staff.agency; // Assuming we join agency data

let message = `Thanks for your message!\n\n`;
message += `For this question, please contact your agency:\n\n`;
message += `📞 ${agency.phone}\n`;
message += `📧 ${agency.email}\n\n`;
message += `Or reply "Contact me" and we'll have someone reach out within 24 hours.`;

return { message };
```

**If user replies "Contact me":**
- Send email to agency admin
- Log in `support_requests` table
- Confirm to user

---

## 🎯 **IMPLEMENTATION ORDER**

1. ✅ Greeting (easiest)
2. ✅ Check Schedule (teaches pattern)
3. ✅ Find Shifts (similar to schedule)
4. 🔥 Upload Timesheet (PRIORITY!)
5. ✅ Book Shift
6. ✅ Cancel Booking
7. ✅ Check Compliance
8. ✅ Calculate Pay
9. ✅ Fallback

---

**Ready to start implementing? Let's begin with Greeting!** 🚀

