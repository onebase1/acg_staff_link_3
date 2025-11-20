# 🎯 N8N HANDLER CODE SNIPPETS - PART 2

## 7️⃣ **CHECK COMPLIANCE HANDLER** 📋

### **Node Type:** Code (JavaScript)
### **Node Name:** Handle Check Compliance

```javascript
const staff = $('Format Staff Data').first().json;

let message = `📋 *Compliance Status for ${staff.first_name}*\n\n`;

// DBS Check
if (staff.dbs_status === 'valid') {
  message += `✅ *DBS Check:* Valid`;
  if (staff.dbs_expiry_date) {
    const expiry = new Date(staff.dbs_expiry_date);
    const daysUntilExpiry = Math.floor((expiry - new Date()) / (1000 * 60 * 60 * 24));
    message += ` (Expires: ${expiry.toLocaleDateString('en-GB')})`;
    
    if (daysUntilExpiry < 30) {
      message += `\n⚠️ Expires soon! Please renew.`;
    }
  }
  message += `\n\n`;
} else {
  message += `⚠️ *DBS Check:* ${staff.dbs_status || 'Not uploaded'}\n\n`;
}

// Right to Work
if (staff.right_to_work_status === 'valid') {
  message += `✅ *Right to Work:* Valid\n`;
} else {
  message += `⚠️ *Right to Work:* ${staff.right_to_work_status || 'Not uploaded'}\n`;
}

// Training certificates (if you track these)
// Add more compliance checks as needed

message += `\n📄 *Update documents:*\nhttps://agilecaremanagement.netlify.app/staff/compliance`;

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

## 8️⃣ **CALCULATE PAY HANDLER** 💰

### **Step 1: Query Completed Shifts (Supabase Node)**
**Node Name:** Query Completed Shifts

**Configuration:**
- **Operation:** Get
- **Table:** `shifts`
- **Select:** `date, start_time, end_time, pay_rate, actual_start_time, actual_end_time`
- **Filters:**
  - `agency_id` = `{{ $('Format Staff Data').first().json.agency_id }}`
  - `assigned_staff_id` = `{{ $('Format Staff Data').first().json.staff_id }}`
  - `status` = `completed`
  - `date` >= `{{ $now.minus({days: 30}).toFormat('yyyy-MM-dd') }}`
- **Sort:** `date:desc`

### **Step 2: Calculate Earnings (Code Node)**
**Node Name:** Calculate Earnings

```javascript
const shifts = $input.first().json;
const staff = $('Format Staff Data').first().json;

if (!shifts || shifts.length === 0) {
  return {
    json: {
      message: `Hi ${staff.first_name}! 💰\n\nNo completed shifts in the last 30 days.`,
      staff_id: staff.staff_id,
      phone: staff.phone
    }
  };
}

let totalHours = 0;
let totalPay = 0;

shifts.forEach(shift => {
  // Use actual times if available, otherwise use scheduled times
  const startTime = shift.actual_start_time || shift.start_time;
  const endTime = shift.actual_end_time || shift.end_time;
  
  const start = new Date(`${shift.date}T${startTime}`);
  const end = new Date(`${shift.date}T${endTime}`);
  
  // Calculate hours (handle overnight shifts)
  let hours = (end - start) / (1000 * 60 * 60);
  if (hours < 0) hours += 24; // Overnight shift
  
  totalHours += hours;
  totalPay += hours * shift.pay_rate;
});

const avgPerShift = totalPay / shifts.length;

let message = `💰 *Earnings Summary (Last 30 Days)*\n\n`;
message += `📊 Total Shifts: ${shifts.length}\n`;
message += `⏱️ Total Hours: ${totalHours.toFixed(1)}h\n`;
message += `💵 Total Earnings: £${totalPay.toFixed(2)}\n`;
message += `📈 Average per shift: £${avgPerShift.toFixed(2)}\n\n`;
message += `💡 This is based on completed shifts with submitted timesheets.`;

return {
  json: {
    message: message,
    staff_id: staff.staff_id,
    phone: staff.phone,
    stats: {
      total_shifts: shifts.length,
      total_hours: totalHours,
      total_pay: totalPay
    }
  }
};
```

**Connect:** Query Completed Shifts → Calculate Earnings → Format Final Response → Send WhatsApp

---

## 9️⃣ **UPLOAD TIMESHEET HANDLER** 📸 **[PRIORITY!]**

### **Step 1: Detect Image (Code Node)**
**Node Name:** Detect Timesheet Image

```javascript
const messageData = $('Extract Message Data').first().json;
const staff = $('Format Staff Data').first().json;

// Check if message contains an image
const hasImage = messageData['message.type'] === 'image';

if (!hasImage) {
  return {
    json: {
      error: true,
      message: `Please send a photo of your timesheet.\n\n📸 Take a clear photo showing:\n• Client name\n• Date\n• Start/end times\n• Your signature\n• Client signature`,
      staff_id: staff.staff_id,
      phone: staff.phone
    }
  };
}

// Get image details from WhatsApp
const imageId = messageData['message.image.id'];
const imageCaption = messageData['message.image.caption'] || '';

return {
  json: {
    image_id: imageId,
    caption: imageCaption,
    staff_id: staff.staff_id,
    agency_id: staff.agency_id,
    phone: staff.phone,
    from: messageData['message.from']
  }
};
```

### **Step 2: Download Image from WhatsApp (HTTP Request Node)**
**Node Name:** Download Timesheet Image

**Configuration:**
- **Method:** GET
- **URL:** `https://graph.facebook.com/v18.0/{{ $json.image_id }}`
- **Authentication:** Header Auth
  - **Header Name:** `Authorization`
  - **Header Value:** `Bearer {{ $env.WHATSAPP_ACCESS_TOKEN }}`
- **Response Format:** File
- **Put Output in Field:** `image_data`

### **Step 3: Get Image URL (HTTP Request Node)**
**Node Name:** Get Image Download URL

**Configuration:**
- **Method:** GET
- **URL:** `https://graph.facebook.com/v18.0/{{ $('Detect Timesheet Image').first().json.image_id }}`
- **Authentication:** Header Auth
  - **Header Name:** `Authorization`
  - **Header Value:** `Bearer {{ $env.WHATSAPP_ACCESS_TOKEN }}`
- **Response Format:** JSON

### **Step 4: Download Actual Image (HTTP Request Node)**
**Node Name:** Download Image File

**Configuration:**
- **Method:** GET
- **URL:** `{{ $json.url }}`
- **Authentication:** Header Auth
  - **Header Name:** `Authorization`
  - **Header Value:** `Bearer {{ $env.WHATSAPP_ACCESS_TOKEN }}`
- **Response Format:** File
- **Binary Property:** `data`

### **Step 5: Upload to Supabase Storage (Code Node)**
**Node Name:** Upload to Supabase Storage

```javascript
const imageData = $input.first().binary.data;
const metadata = $('Detect Timesheet Image').first().json;

// Generate filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const filename = `timesheet_${metadata.staff_id}_${timestamp}.jpg`;
const filepath = `timesheets/${metadata.agency_id}/${filename}`;

// Upload to Supabase Storage
const supabaseUrl = $env.SUPABASE_URL;
const supabaseKey = $env.SUPABASE_SERVICE_ROLE_KEY;

const uploadUrl = `${supabaseUrl}/storage/v1/object/timesheets/${filepath}`;

const response = await fetch(uploadUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'image/jpeg'
  },
  body: imageData
});

if (!response.ok) {
  throw new Error(`Upload failed: ${response.statusText}`);
}

const publicUrl = `${supabaseUrl}/storage/v1/object/public/timesheets/${filepath}`;

return {
  json: {
    timesheet_url: publicUrl,
    filename: filename,
    staff_id: metadata.staff_id,
    agency_id: metadata.agency_id,
    phone: metadata.phone,
    uploaded_at: new Date().toISOString()
  }
};
```

### **Step 6: Find Recent Shift (Supabase Node)**
**Node Name:** Find Recent Completed Shift

**Configuration:**
- **Operation:** Get
- **Table:** `shifts`
- **Select:** `id, date, clients(name)`
- **Filters:**
  - `agency_id` = `{{ $json.agency_id }}`
  - `assigned_staff_id` = `{{ $json.staff_id }}`
  - `status` = `completed`
  - `timesheet_url` is `null`
- **Sort:** `date:desc`
- **Limit:** 1

### **Step 7: Update Shift with Timesheet (Supabase Node)**
**Node Name:** Update Shift Timesheet

**Configuration:**
- **Operation:** Update
- **Table:** `shifts`
- **Update Key:** `id`
- **Update Key Value:** `{{ $json.id }}`
- **Fields to Update:**
  - `timesheet_url` = `{{ $('Upload to Supabase Storage').first().json.timesheet_url }}`
  - `timesheet_submitted_at` = `{{ $now.toISO() }}`

### **Step 8: Confirm Upload (Code Node)**
**Node Name:** Confirm Timesheet Upload

```javascript
const uploadData = $('Upload to Supabase Storage').first().json;
const shiftData = $('Find Recent Completed Shift').first().json;

let message = `✅ *Timesheet Received!*\n\n`;

if (shiftData && shiftData.length > 0) {
  const shift = shiftData[0];
  const date = new Date(shift.date);
  const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  
  message += `📅 Shift: ${dateStr}\n`;
  message += `🏥 Client: ${shift.clients?.name}\n\n`;
  message += `Your timesheet has been submitted for processing.\n\n`;
} else {
  message += `Your timesheet has been uploaded successfully.\n\n`;
}

message += `💰 Payment will be processed according to your agency's schedule.\n\n`;
message += `Thank you! 🌟`;

return {
  json: {
    message: message,
    staff_id: uploadData.staff_id,
    phone: uploadData.phone
  }
};
```

**Flow:** Detect Timesheet Image → Get Image Download URL → Download Image File → Upload to Supabase Storage → Find Recent Completed Shift → Update Shift Timesheet → Confirm Timesheet Upload → Format Final Response → Send WhatsApp

---

## 🚨 **IMPORTANT NOTES**

### **Multi-Tenant Security:**
ALL Supabase queries MUST include `agency_id` filter:
```javascript
// ✅ CORRECT
.eq('agency_id', staff.agency_id)
.eq('assigned_staff_id', staff.staff_id)

// ❌ WRONG - Could leak data!
.eq('assigned_staff_id', staff.staff_id)
```

### **Timesheet Storage Setup:**
Before using timesheet upload, create the bucket in Supabase:
1. Go to Storage in Supabase Dashboard
2. Create bucket named `timesheets`
3. Set to **Private** (not public)
4. Add RLS policy to allow staff to upload their own timesheets

---

## 🎯 **IMPLEMENTATION CHECKLIST**

- [ ] Greeting Handler
- [ ] Check Schedule Handler
- [ ] Find Shifts Handler
- [ ] Book Shift Handler
- [ ] Cancel Booking Handler
- [ ] Check Compliance Handler
- [ ] Calculate Pay Handler
- [ ] **Upload Timesheet Handler** (PRIORITY!)
- [ ] Fallback Handler

**Start with Greeting, then move to Timesheet Upload!** 🚀

