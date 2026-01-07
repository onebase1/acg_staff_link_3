# 📱 Meta WhatsApp Template Instructions

**Date:** 2025-11-16  
**Action Required:** Template deletions and amendments

---

## ❌ STEP 1: DELETE TEMPLATES

Go to Meta Business Manager → WhatsApp → Message Templates

### **Delete Template 1: paymentprocessed**
- **Template ID:** 1580093036315178
- **Reason:** Feature not needed
- **Action:** Click "..." → Delete → Confirm

### **Delete Template 2: newshiftsavailable**
- **Template ID:** 1907996346803698
- **Reason:** Using email notifications instead
- **Action:** Click "..." → Delete → Confirm

---

## ✏️ STEP 2: AMEND TEMPLATE - shiftreminder

### **Current Template:** shiftreminder (ID: 1552941689046345)

**Action:** Edit template

### **New Template Content:**

**Header:** None

**Body:**
```
Shift Reminder

Hi {{1}},

Tomorrow's shift:
Date: {{2}}
Time: {{3}}
Client: {{4}}
Location: {{5}}

Total earnings: £{{6}}

See you there!

Reply STOP to disable reminders.
```

**Footer:** None

**Buttons:** None

**Variables:**
1. {{1}} - Staff first name
2. {{2}} - Shift date (e.g., "Monday, 18 November 2025")
3. {{3}} - Shift time (e.g., "08:00 - 20:00")
4. {{4}} - Client name
5. {{5}} - Client address
6. {{6}} - Total earnings (e.g., "177.00")

**Category:** Marketing (keep as-is)

**Language:** English (UK)

---

## ✅ STEP 3: CREATE NEW TEMPLATE - timesheetconfirmation

### **New Template:** timesheetconfirmation

**Action:** Create new template

**Category:** Utility

**Language:** English (UK)

**Template Content:**

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

**Variables:**
1. {{1}} - Staff first name
2. {{2}} - Client name
3. {{3}} - Shift date (e.g., "2025-11-18")
4. {{4}} - Hours worked (e.g., "12")
5. {{5}} - Break duration in minutes (e.g., "30")
6. {{6}} - Staff pay amount (e.g., "264.00")

---

## ❌ STEP 4: DO NOT DEPLOY - timesheetreminder

### **Template:** timesheetreminder (EXISTS IN META - DO NOT USE)

**Action:** ❌ **DO NOT DEPLOY** this template in n8n workflows

**Reason:** Redundant - immediate post-shift reminder already sent via Edge Function

**Status:** Template can remain in Meta (inactive) or be deleted

**Alternative:** If you want follow-up reminders in the future, this template would need to be AMENDED to include:
- Portal link variable
- WhatsApp upload option mention
- Proper deadline calculation

---

## ✅ STEP 5: VERIFY TEMPLATES

After changes, you should have these 5 active templates in use:

1. ✅ **shiftassignment** (Utility) - No changes
2. ✅ **shiftreminder** (Marketing) - AMENDED (added {{6}})
3. ✅ **timesheetconfirmation** (Utility) - NEW
4. ✅ **complianceexpirywarning** (Utility) - No changes
5. ✅ **shiftcancelled** (Marketing) - No changes

**Note:** `timesheetreminder` template exists in Meta but is NOT deployed in any n8n workflow.

---

## 📋 CHECKLIST

- [ ] Deleted paymentprocessed template
- [ ] Deleted newshiftsavailable template
- [ ] Amended shiftreminder template (added {{6}} variable)
- [ ] Created timesheetconfirmation template
- [ ] Verified 6 templates remain active
- [ ] All templates show "Approved" status

---

## ⏱️ EXPECTED TIME

- Delete 2 templates: 2 minutes
- Amend 1 template: 3 minutes
- Create 1 template: 3 minutes
- Approval time: Instant (for edits) + 24-48 hours (for new template)

**Total:** 8 minutes + approval wait

---

## 🎯 NEXT STEP

After completing these changes and templates are approved, proceed to import workflows to n8n.

