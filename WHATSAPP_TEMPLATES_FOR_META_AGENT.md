# 📱 WHATSAPP TEMPLATE CREATION INSTRUCTIONS FOR META AGENT

## 🎯 OBJECTIVE
Create WhatsApp Business message templates in Meta Business Manager for ACG StaffLink.
These templates are for **Priority 1: Agency → Staff** automated notifications.

---

## 🔑 CRITICAL: CORRECT WHATSAPP BUSINESS ACCOUNT

**⚠️ IMPORTANT: Create templates in THIS account ONLY:**

- **Phone Number ID:** `683816761472557`
- **Business Account ID:** `244657210968951`
- **Display Phone Number:** `+44 7924 975049`
- **Language Code:** `en_GB` (English UK)

**Verify you're in the correct account BEFORE creating templates!**

Go to: Meta Business Manager → WhatsApp → Settings → Phone Numbers
Confirm the Phone Number ID matches: **683816761472557**

---

## 📋 TEMPLATES TO CREATE

### **TEMPLATE 1: SHIFT_ASSIGNMENT**
**Name:** `shift_assignment`  
**Category:** `UTILITY`  
**Language:** English (UK)

**Message Body:**
```
Hi {{1}},

You've been assigned a new shift! 🎉

📅 Date: {{2}}
⏰ Time: {{3}} - {{4}}
🏥 Client: {{5}}
📍 Location: {{6}}
💰 Pay Rate: £{{7}}/hour

Please confirm your availability by replying:
✅ "Confirm shift"
❌ "Decline shift"

Need help? Contact us at {{8}}
```

**Variables:**
1. Staff first name
2. Shift date (e.g., "Mon, 15 Jan")
3. Start time (e.g., "08:00")
4. End time (e.g., "20:00")
5. Client name
6. Client address
7. Pay rate
8. Agency phone number

**Buttons:** None (conversational response)

---

### **TEMPLATE 2: SHIFT_REMINDER**
**Name:** `shift_reminder`  
**Category:** `UTILITY`  
**Language:** English (UK)

**Message Body:**
```
Hi {{1}},

Reminder: You have a shift tomorrow! ⏰

📅 Date: {{2}}
⏰ Time: {{3}} - {{4}}
🏥 Client: {{5}}
📍 Location: {{6}}

Please arrive 10 minutes early.

Safe travels! 🚗
```

**Variables:**
1. Staff first name
2. Shift date
3. Start time
4. End time
5. Client name
6. Client address

**Buttons:** None

---

### **TEMPLATE 3: SHIFT_CANCELLED**
**Name:** `shift_cancelled`  
**Category:** `UTILITY`  
**Language:** English (UK)

**Message Body:**
```
Hi {{1}},

Your shift on {{2}} at {{3}} has been cancelled.

If you have any questions, please contact us at {{4}}

We'll notify you of new opportunities soon! 🔔
```

**Variables:**
1. Staff first name
2. Shift date
3. Client name
4. Agency phone number

**Buttons:** None

---

### **TEMPLATE 4: COMPLIANCE_EXPIRY_WARNING**
**Name:** `compliance_expiry_warning`  
**Category:** `UTILITY`  
**Language:** English (UK)

**Message Body:**
```
Hi {{1}},

⚠️ Important: Your {{2}} expires on {{3}}.

Please upload a renewed document to avoid shift restrictions.

Update now: https://agilecaremanagement.netlify.app/staff/compliance

Need help? Contact us at {{4}}
```

**Variables:**
1. Staff first name
2. Document type (e.g., "DBS Certificate")
3. Expiry date
4. Agency phone number

**Buttons:** 
- Quick Reply: "Upload Document"

---

### **TEMPLATE 5: TIMESHEET_REMINDER**
**Name:** `timesheet_reminder`  
**Category:** `UTILITY`  
**Language:** English (UK)

**Message Body:**
```
Hi {{1}},

Please submit your timesheet for the shift on {{2}} at {{3}}.

📸 Simply reply with a photo of your signed timesheet.

This ensures timely payment! 💰

Questions? Contact {{4}}
```

**Variables:**
1. Staff first name
2. Shift date
3. Client name
4. Agency phone number

**Buttons:** None (expects photo upload)

---

### **TEMPLATE 6: PAYMENT_PROCESSED**
**Name:** `payment_processed`  
**Category:** `UTILITY`  
**Language:** English (UK)

**Message Body:**
```
Hi {{1}},

Your payment has been processed! 💰

📊 Period: {{2}}
💵 Amount: £{{3}}
📅 Payment Date: {{4}}

You should receive funds within 2-3 business days.

Thank you for your hard work! 🌟
```

**Variables:**
1. Staff first name
2. Pay period (e.g., "1-7 Jan 2025")
3. Payment amount
4. Payment date

**Buttons:** None

---

### **TEMPLATE 7: NEW_SHIFTS_AVAILABLE**
**Name:** `new_shifts_available`  
**Category:** `MARKETING`  
**Language:** English (UK)

**Message Body:**
```
Hi {{1}},

New shifts are available! 🔔

We have {{2}} shifts matching your preferences.

Reply "Find shifts" to see available opportunities.

Don't miss out! ⏰
```

**Variables:**
1. Staff first name
2. Number of available shifts

**Buttons:**
- Quick Reply: "Find shifts"

---

## 🔧 TECHNICAL REQUIREMENTS

### **For Each Template:**
1. **Category Selection:**
   - Use `UTILITY` for transactional messages (assignments, reminders, cancellations)
   - Use `MARKETING` for promotional messages (new shifts available)

2. **Variable Format:**
   - Use `{{1}}`, `{{2}}`, etc. for dynamic content
   - Variables must be in sequential order
   - Maximum 10 variables per template

3. **Character Limits:**
   - Header: 60 characters (optional)
   - Body: 1024 characters
   - Footer: 60 characters (optional)
   - Buttons: 25 characters each

4. **Approval Process:**
   - Submit each template for Meta review
   - Approval typically takes 24-48 hours
   - Ensure compliance with WhatsApp Business Policy

---

## 📝 SUBMISSION CHECKLIST

For each template, ensure:
- [ ] Template name is lowercase with underscores
- [ ] Category is correctly selected (UTILITY or MARKETING)
- [ ] Language is set to English (UK)
- [ ] All variables are numbered sequentially
- [ ] Message is clear and professional
- [ ] No prohibited content (spam, misleading info)
- [ ] Buttons are optional and correctly formatted

---

## 🚀 AFTER APPROVAL

Once templates are approved:
1. Note the **Template ID** for each
2. Share the Template IDs with the development team
3. Templates will be integrated into n8n workflow

---

## 📞 SUPPORT

If any template is rejected:
- Review Meta's feedback
- Adjust wording to comply with policies
- Resubmit for approval

**Common rejection reasons:**
- Vague or misleading content
- Missing opt-out language (for MARKETING)
- Incorrect variable formatting
- Policy violations

---

**Ready to create these templates in Meta Business Manager!** 🎯

