# 🚀 ACTIVE: WhatsApp Template Integration Plan

**Status:** IN PROGRESS  
**Priority:** CRITICAL (90% of app value)  
**Date Started:** 2025-11-16  
**Project Lead:** AI Assistant (n8n access)

---

## 🎯 OBJECTIVE

Integrate 7 approved WhatsApp Business templates into n8n workflows to enable automated staff notifications for:
- Shift assignments
- Daily shift reminders
- Compliance warnings
- Timesheet reminders
- Payment confirmations
- Shift cancellations
- New shift availability

---

## ✅ TEMPLATES CREATED (Meta Business Manager)

| Template Name | Type | Status | Variables | Quick Replies |
|--------------|------|--------|-----------|---------------|
| shiftassignment | Utility | Active | 8 | None |
| shiftreminder | Marketing | Active | 6 | None |
| shiftcancelled | Marketing | Active | 4 | None |
| complianceexpirywarning | Utility | Active | 4 | Upload Document |
| timesheetreminder | Utility | Active | 4 | Photo upload |
| paymentprocessed | Marketing | Active | 4 | None |
| newshiftsavailable | Marketing | In Review | 2 | Find shifts |

---

## 📋 INTEGRATION PRIORITY ORDER

### **Phase 1: Core Operations (IMMEDIATE)**
1. ✅ **shiftassignment** - Notify staff when assigned to shift
2. ✅ **shiftreminder** - Daily 6 PM reminder for tomorrow's shifts
3. ✅ **timesheetreminder** - Day after shift if timesheet not received

### **Phase 2: Compliance & Payments (WEEK 1)**
4. ⏳ **complianceexpirywarning** - Weekly Monday check for expiring docs
5. ⏳ **paymentprocessed** - After payroll run confirmation

### **Phase 3: Marketplace Features (WEEK 2)**
6. ⏳ **shiftcancelled** - When admin cancels shift
7. ⏳ **newshiftsavailable** - When new shifts posted (once approved)

---

## 🔧 TECHNICAL REQUIREMENTS

### **WhatsApp Business Cloud Credentials**
- **Phone Number ID:** 683816761472557
- **Business Account ID:** 244657210968951
- **Language Code:** en_GB
- **Credential Name:** ACG-WhatsApp (to be created in n8n)

### **n8n Node Configuration Template**
```json
{
  "name": "WhatsApp Business Cloud",
  "type": "n8n-nodes-base.whatsAppBusinessCloud",
  "parameters": {
    "resource": "message",
    "operation": "sendTemplate",
    "phoneNumberId": "683816761472557",
    "to": "={{ $json.phone }}",
    "template": {
      "name": "[template_name]",
      "language": {
        "code": "en_GB"
      },
      "components": [
        {
          "type": "body",
          "parameters": [
            {
              "type": "text",
              "text": "={{ $json.variable_1 }}"
            }
          ]
        }
      ]
    }
  }
}
```

---

## 📊 WORKFLOWS TO CREATE

### **1. Shift Assignment Notification**
**File:** `shift-assignment-notification.json`  
**Trigger:** Webhook from admin portal (when shift assigned)  
**Flow:**
```
Webhook Trigger
  ↓
Get Staff Details (Supabase)
  ↓
Get Shift Details (Supabase)
  ↓
Get Client Details (Supabase)
  ↓
Format Variables (Code node)
  ↓
Send WhatsApp Template (shiftassignment)
  ↓
Log Notification (Supabase)
```

### **2. Daily Shift Reminders**
**File:** `daily-shift-reminders.json`  
**Trigger:** Schedule (Cron: `0 18 * * *` - 6 PM daily)  
**Flow:**
```
Schedule Trigger (6 PM)
  ↓
Get Tomorrow's Shifts (Supabase)
  Filter: date = tomorrow, status IN (confirmed, assigned)
  ↓
Loop Through Shifts
  ↓
Get Staff Details
  ↓
Get Client Details
  ↓
Format Variables
  ↓
Send WhatsApp Template (shiftreminder)
  ↓
Log Notification
```

### **3. Timesheet Reminders**
**File:** `timesheet-reminders.json`  
**Trigger:** Schedule (Cron: `0 10 * * *` - 10 AM daily)  
**Flow:**
```
Schedule Trigger (10 AM)
  ↓
Get Yesterday's Completed Shifts (Supabase)
  Filter: date = yesterday, timesheet_received = false
  ↓
Loop Through Shifts
  ↓
Get Staff Details
  ↓
Send WhatsApp Template (timesheetreminder)
  ↓
Log Notification
```

---

## 🧪 TESTING CHECKLIST

For each workflow:
- [ ] Variables populate correctly from database
- [ ] Phone numbers formatted correctly (+44...)
- [ ] Message sends successfully to WhatsApp
- [ ] Staff receives message on their device
- [ ] Quick reply buttons work (if applicable)
- [ ] Links open correctly (compliance portal, etc.)
- [ ] Notification logged in database
- [ ] Error handling works (invalid phone, API failure)

---

## 🚨 CRITICAL QUESTIONS FOR META

Before proceeding, verify:

1. **API Access Token:** Do we have the permanent access token for WhatsApp Business Cloud API?
2. **Phone Number Verification:** Is +44 7457679989 verified and production-ready?
3. **Message Limits:** What are the daily/monthly message limits?
4. **Template Approval:** Is `newshiftsavailable` approved yet?
5. **Webhook Setup:** Do we need to configure webhooks for delivery status?

---

## 📸 DELIVERABLES

For each workflow, provide:
1. Complete n8n workflow JSON file
2. Screenshot of workflow canvas
3. Screenshot of successful test execution
4. Screenshot of received WhatsApp message
5. Database schema for notification logging

---

## 🎯 SUCCESS CRITERIA

**Phase 1 Complete When:**
- ✅ Staff receives shift assignment notification within 30 seconds
- ✅ Daily reminders sent to all staff with tomorrow's shifts
- ✅ Timesheet reminders sent day after shift completion
- ✅ All messages use correct templates with proper formatting
- ✅ 95%+ delivery success rate

---

**NEXT IMMEDIATE ACTION:** Create WhatsApp Business Cloud credential in n8n and build Workflow #1 (Shift Assignment)

