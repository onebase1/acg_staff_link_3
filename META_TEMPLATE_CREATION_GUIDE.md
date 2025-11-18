# 📱 Meta WhatsApp Template Creation Guide

**Date:** 2025-11-18  
**Template:** `timesheetconfirmation`  
**Status:** ⏸️ Ready to Create

---

## 🎯 INSTRUCTIONS FOR META ASSISTANT

### **Step 1: Verify Correct Account**

**CRITICAL:** Before creating ANY templates, verify you're in the correct WhatsApp Business account:

1. Go to: **Meta Business Manager → WhatsApp → Settings → Phone Numbers**
2. Confirm the **Phone Number ID** matches: **683816761472557**
3. Confirm the **Display Number** is: **+44 7924 975049**

**If these don't match, STOP and switch to the correct account.**

---

## ✅ CREATE NEW TEMPLATE: timesheetconfirmation

### **Template Details:**

**Template Name:** `timesheetconfirmation` (all lowercase, no spaces)

**Category:** Utility

**Language:** English (UK)

---

### **Template Content:**

**Header:** None

**Body:**
```
Timesheet Submitted!

Hi {{1}},

Your timesheet has been received:

Shift: {{2}}
Date: {{3}}
Hours: {{4}}h ({{5}} min break)
You'll earn: £{{6}}

Your timesheet is now awaiting client approval. We'll notify you when it's approved!

Thank you!
```

**Footer:** None

**Buttons:** None

---

### **Variables Explanation:**

| Variable | Description | Example Value |
|----------|-------------|---------------|
| {{1}} | Staff first name | "James" |
| {{2}} | Client name | "Sunrise Care Home" |
| {{3}} | Shift date | "2025-11-18" |
| {{4}} | Hours worked | "12" |
| {{5}} | Break duration (minutes) | "30" |
| {{6}} | Staff pay amount | "264.00" |

---

### **Sample Message (How It Will Look):**

```
Timesheet Submitted!

Hi James,

Your timesheet has been received:

Shift: Sunrise Care Home
Date: 2025-11-18
Hours: 12h (30 min break)
You'll earn: £264.00

Your timesheet is now awaiting client approval. We'll notify you when it's approved!

Thank you!
```

---

## 📋 VERIFICATION CHECKLIST

After creating the template, verify:

- ✅ Template name is exactly: `timesheetconfirmation` (lowercase, no spaces)
- ✅ Category is: **Utility**
- ✅ Language is: **English (UK)**
- ✅ 6 variables are defined: {{1}} through {{6}}
- ✅ Template status is: **Pending** (waiting for Meta approval)
- ✅ Phone Number ID is: **683816761472557**

---

## 🚀 AFTER TEMPLATE IS APPROVED

### **Step 1: Get Template ID**

Once Meta approves the template (usually 24-48 hours), you'll receive a **Template ID**.

**Example:** `1234567890123456`

---

### **Step 2: Send Template Details Back**

Please provide the following information:

```
Template Name: timesheetconfirmation
Template ID: [TEMPLATE_ID_HERE]
Status: APPROVED
Approval Date: [DATE_HERE]
Phone Number ID: 683816761472557
```

---

### **Step 3: Test Template (Optional)**

You can test the template by sending a test message:

**Test Variables:**
1. {{1}} = "John"
2. {{2}} = "Test Care Home"
3. {{3}} = "2025-11-20"
4. {{4}} = "8"
5. {{5}} = "30"
6. {{6}} = "176.00"

**Expected Output:**
```
Timesheet Submitted!

Hi John,

Your timesheet has been received:

Shift: Test Care Home
Date: 2025-11-20
Hours: 8h (30 min break)
You'll earn: £176.00

Your timesheet is now awaiting client approval. We'll notify you when it's approved!

Thank you!
```

---

## ❌ DO NOT CREATE: timesheetreminder

### **Important Note:**

There is an existing template called `timesheetreminder` in your Meta account.

**Action:** ❌ **DO NOT DEPLOY** this template in any n8n workflows

**Reason:** This template is redundant - we already send immediate post-shift reminders via Edge Function.

**Status:** Template can remain in Meta (inactive) or be deleted if you prefer.

---

## 📊 FINAL TEMPLATE LIST

After creating `timesheetconfirmation`, you should have these **5 active templates** in use:

| # | Template Name | Category | Status | Purpose |
|---|---------------|----------|--------|---------|
| 1 | `shiftassignment` | Utility | Active | Notify staff of new shift assignment |
| 2 | `shiftreminder` | Marketing | Active | Remind staff of upcoming shift (24h before) |
| 3 | `timesheetconfirmation` | Utility | **NEW** | Confirm timesheet received via WhatsApp |
| 4 | `complianceexpirywarning` | Utility | Active | Warn staff of expiring compliance documents |
| 5 | `shiftcancelled` | Marketing | Active | Notify staff of cancelled shift |

**Note:** `timesheetreminder` exists but is NOT deployed in any workflow.

---

## 🎉 COMPLETION

Once you've created the template and it's approved, please confirm:

1. ✅ Template created successfully
2. ✅ Template ID received
3. ✅ Template status is APPROVED
4. ✅ Phone Number ID is correct (683816761472557)

**Then I can proceed with deploying the WhatsApp timesheet upload handler!** 🚀

---

## 📞 SUPPORT

If you encounter any issues:

1. **Template Rejected:** Check for policy violations (no promotional content in Utility templates)
2. **Wrong Account:** Verify Phone Number ID matches 683816761472557
3. **Variable Errors:** Ensure exactly 6 variables ({{1}} through {{6}})
4. **Approval Delay:** Meta typically approves within 24-48 hours

**Contact:** Your agency admin if you need assistance

