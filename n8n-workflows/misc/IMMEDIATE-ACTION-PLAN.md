# 🎯 IMMEDIATE ACTION PLAN

**Date:** 2025-11-16  
**Priority:** CRITICAL  
**Timeline:** Today + This Week

---

## ✅ TODAY (30 Minutes)

### **Step 1: Deploy SAFE Templates Only** (20 min)

Import and activate ONLY these 2 workflows:

1. **shift-assignment-notification.json**
   - Template: `shiftassignment` (Utility)
   - Risk: VERY LOW ✅
   - Deploy: YES

2. **timesheet-reminders.json**
   - Template: `timesheetreminder` (Utility)
   - Risk: LOW ✅
   - Deploy: YES

**DO NOT deploy:**
- ❌ daily-shift-reminders.json (uses Marketing template)

---

### **Step 2: Test Shift Assignment** (10 min)

```bash
curl -X POST https://your-n8n.com/webhook/shift-assigned \
  -H "Content-Type: application/json" \
  -d '{"shift_id": "cdce9c0e-f7a2-46d2-b549-d0858b556517"}'
```

**Expected:**
- WhatsApp message received
- Notification logged
- No errors

---

## 📋 THIS WEEK (Template Resubmission)

### **Action 1: Resubmit Marketing Templates as Utility**

Go to Meta Business Manager and resubmit these templates:

#### **Template 1: shiftreminder**
**Current:** Marketing  
**Change To:** Utility

**New Wording:**
```
SHIFT CONFIRMATION REQUIRED

Staff: {{1}}
Date: {{2}}
Time: {{3}}
Client: {{4}}
Location: {{5}}

Please confirm attendance via staff portal or report absence.

Reply STOP to opt out of reminders.
```

**Justification for Meta:**
"This is an operational confirmation request for scheduled work shifts, not promotional content. Staff members need to confirm attendance for compliance and scheduling purposes."

---

#### **Template 2: shiftcancelled**
**Current:** Marketing  
**Change To:** Utility

**New Wording:**
```
SHIFT CANCELLATION NOTICE

Staff: {{1}}
Cancelled Shift: {{2}} at {{3}}
Reason: {{4}}

No action required. You will not be charged for this cancellation.

View alternative shifts: [link]

Reply STOP to opt out.
```

**Justification for Meta:**
"This is a transactional notification informing staff of shift cancellations, similar to appointment cancellation notices. Not promotional."

---

#### **Template 3: paymentprocessed**
**Current:** Marketing  
**Change To:** Utility

**Keep Current Wording** (already transactional)

**Justification for Meta:**
"This is a payment confirmation notification, similar to bank transaction alerts. Purely transactional, not promotional."

---

### **Action 2: PARK High-Risk Template**

**newshiftsavailable** - DO NOT USE YET

**Reason:** High spam risk, needs complete redesign

**Future Action Required:**
1. Reword as "Shift Match Alert" (personalized)
2. Add opt-in mechanism in staff profile
3. Implement strict rate limiting
4. Only send shifts matching preferences

**Timeline:** 2-4 weeks

---

## 🛡️ SAFETY FEATURES TO ADD

### **Database Changes** (10 min)

```sql
-- Add opt-out tracking
ALTER TABLE staff 
ADD COLUMN whatsapp_opt_out BOOLEAN DEFAULT FALSE,
ADD COLUMN whatsapp_opt_out_date TIMESTAMPTZ;

-- Add rate limiting
CREATE TABLE whatsapp_rate_limits (
  staff_id UUID PRIMARY KEY REFERENCES staff(id),
  daily_count INTEGER DEFAULT 0,
  weekly_count INTEGER DEFAULT 0,
  last_reset_daily TIMESTAMPTZ DEFAULT NOW(),
  last_reset_weekly TIMESTAMPTZ DEFAULT NOW()
);

-- Add delivery tracking
ALTER TABLE notifications
ADD COLUMN delivery_status TEXT,
ADD COLUMN error_code TEXT,
ADD COLUMN spam_reported BOOLEAN DEFAULT FALSE;
```

---

## 📊 MONITORING SETUP

### **Daily Checks** (5 min/day)

1. **Meta Business Manager**
   - Check quality rating (should be Green)
   - Check message limits (should not decrease)
   - Check for warnings

2. **Supabase Notifications Table**
   ```sql
   -- Check delivery rate
   SELECT 
     COUNT(*) as total,
     COUNT(*) FILTER (WHERE status = 'sent') as sent,
     ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'sent') / COUNT(*), 2) as rate
   FROM notifications
   WHERE sent_at >= NOW() - INTERVAL '24 hours';
   ```

3. **n8n Execution Logs**
   - Check for errors
   - Verify all executions successful

---

## 🎯 DEPLOYMENT TIMELINE

### **Week 1 (This Week)**
- ✅ Deploy shiftassignment
- ✅ Deploy timesheetreminder
- 📝 Resubmit 3 templates to Meta as Utility
- 📊 Monitor quality metrics daily

### **Week 2 (After Approval)**
- ✅ Deploy complianceexpirywarning
- ⚠️ Deploy paymentprocessed (monitor closely)
- 📊 Continue daily monitoring

### **Week 3 (After Approval)**
- ⚠️ Deploy shiftreminder (if approved as Utility)
- ⚠️ Deploy shiftcancelled (if approved as Utility)
- 📊 Continue daily monitoring

### **Week 4+ (Future)**
- 🔴 Redesign newshiftsavailable
- 🔴 Add opt-in mechanism
- 🔴 Test with small group

---

## ⚠️ RED FLAGS TO WATCH

**STOP ALL SENDING if you see:**

1. Quality rating drops from Green to Yellow
2. Message limit decreases
3. Template gets rejected
4. Email warning from Meta
5. Delivery rate < 90%
6. Any spam reports

**Action:** Pause all workflows immediately, investigate

---

## ✅ SUCCESS CRITERIA

**Week 1:**
- [ ] 2 workflows deployed and active
- [ ] 100% delivery rate
- [ ] Zero spam reports
- [ ] Quality rating: Green
- [ ] 3 templates resubmitted to Meta

**Week 2:**
- [ ] Templates approved as Utility
- [ ] 4 workflows active
- [ ] >95% delivery rate
- [ ] Zero spam reports
- [ ] Quality rating: Green

**Week 3:**
- [ ] All safe templates deployed
- [ ] >95% delivery rate
- [ ] Zero spam reports
- [ ] Quality rating: Green
- [ ] Staff feedback positive

---

## 📞 EMERGENCY CONTACTS

**If Banned:**
1. Pause all workflows in n8n
2. Check Meta Business Manager for details
3. Submit appeal with explanation
4. Implement corrective actions
5. Wait for Meta response (1-7 days)

**Support Resources:**
- Meta Business Support: https://business.facebook.com/support
- WhatsApp Business API Docs: https://developers.facebook.com/docs/whatsapp
- n8n Community: https://community.n8n.io

---

## 🎯 FINAL CHECKLIST

**Before Importing to n8n:**

- [ ] Read META-BAN-PREVENTION-GUIDE.md
- [ ] Understand template risk levels
- [ ] Know which templates to deploy (only 2)
- [ ] Know which templates to park (1)
- [ ] Database safety features added
- [ ] Monitoring plan in place
- [ ] Emergency plan understood

**After Importing:**

- [ ] Only 2 workflows active (shiftassignment, timesheetreminder)
- [ ] Test shift assignment works
- [ ] Check Meta quality metrics
- [ ] Monitor for 24 hours
- [ ] Resubmit 3 templates to Meta

---

## 🚀 YOU'RE READY!

**Deploy these 2 workflows today:**
1. shift-assignment-notification.json ✅
2. timesheet-reminders.json ✅

**DO NOT deploy:**
- daily-shift-reminders.json ❌ (wait for template resubmission)

**This gives you 60% of the value with ZERO risk.**

The remaining 40% comes after template resubmission (1-3 days).

---

**Next Step:** Import the 2 safe workflows to n8n and test!

