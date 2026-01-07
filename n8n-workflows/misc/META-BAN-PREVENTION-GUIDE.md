# 🛡️ Meta WhatsApp Ban Prevention Guide

## 🚨 CRITICAL: Template Risk Assessment

### ✅ **SAFE TO DEPLOY (Phase 1)**

**1. shiftassignment** (Utility)
- **Risk Level:** VERY LOW ✅
- **Reason:** Transactional, user-initiated
- **Deploy:** Immediately

**2. timesheetreminder** (Utility)
- **Risk Level:** LOW ✅
- **Reason:** Operational requirement
- **Deploy:** Immediately

---

### ⚠️ **CAUTION REQUIRED (Phase 2)**

**3. complianceexpirywarning** (Utility)
- **Risk Level:** LOW ✅
- **Reason:** Regulatory/compliance
- **Deploy:** Week 2

**4. paymentprocessed** (Marketing)
- **Risk Level:** MEDIUM ⚠️
- **Issue:** Categorized as Marketing (should be Utility)
- **Action Required:**
  ```
  1. Resubmit to Meta as UTILITY category
  2. Reword to be more transactional
  3. Only send when payment actually processed
  ```

**5. shiftreminder** (Marketing)
- **Risk Level:** MEDIUM-HIGH ⚠️⚠️
- **Issue:** Daily automated messages = spam risk
- **Action Required:**
  ```
  1. Add opt-out mechanism
  2. Only send if shift not confirmed
  3. Limit to 1 reminder per shift
  4. Consider resubmitting as Utility
  ```

---

### 🔴 **HIGH RISK (Review Before Deploy)**

**6. shiftcancelled** (Marketing)
- **Risk Level:** MEDIUM-HIGH ⚠️⚠️
- **Issue:** Frequent cancellations = spam reports
- **Action Required:**
  ```
  1. Reword as transactional notification
  2. Resubmit as UTILITY category
  3. Include cancellation reason
  4. Provide alternative shifts
  ```

**7. newshiftsavailable** (Marketing)
- **Risk Level:** VERY HIGH 🔴🔴🔴
- **Issue:** Broadcast/promotional = classic spam
- **Action Required:**
  ```
  🔴 DO NOT DEPLOY YET
  
  Required Changes:
  1. Reword as "Shift Match Alert" (personalized)
  2. Resubmit as UTILITY category
  3. Add opt-in requirement in staff profile
  4. Only send shifts matching preferences
  5. Limit to 2 alerts per week maximum
  6. Track opt-outs and respect immediately
  ```

---

## 📋 REVISED DEPLOYMENT PLAN

### **Phase 1: Week 1 (DEPLOY NOW)**
```
✅ shiftassignment (Utility)
✅ timesheetreminder (Utility)
```

**Risk:** VERY LOW  
**Action:** Deploy immediately, monitor for 1 week

---

### **Phase 2: Week 2 (AFTER MONITORING)**
```
✅ complianceexpirywarning (Utility)
⚠️ paymentprocessed (Marketing - monitor closely)
```

**Risk:** LOW-MEDIUM  
**Action:** 
1. Deploy complianceexpirywarning
2. Monitor paymentprocessed closely
3. Check Meta quality metrics daily

---

### **Phase 3: Week 3 (AFTER TEMPLATE RESUBMISSION)**
```
⚠️ shiftreminder (Resubmit as Utility first)
⚠️ shiftcancelled (Resubmit as Utility first)
```

**Risk:** MEDIUM  
**Action:**
1. Reword templates (see below)
2. Resubmit to Meta as Utility
3. Wait for approval
4. Deploy with safety features

---

### **Phase 4: Future (MAJOR REWORK REQUIRED)**
```
🔴 newshiftsavailable (PARK - needs complete redesign)
```

**Risk:** VERY HIGH  
**Action:**
1. Complete template redesign
2. Add opt-in mechanism in app
3. Implement strict rate limiting
4. Only send personalized matches
5. Test with small group first

---

## 🔧 REQUIRED TEMPLATE REWORDINGS

### **shiftreminder** (Marketing → Utility)

**Current (Marketing tone):**
```
Hi {{1}}! 

Reminder: You have a shift tomorrow at {{2}}.

Time: {{3}}
Location: {{4}}

See you there!
```

**Revised (Utility tone):**
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

**Resubmit to Meta as:** UTILITY  
**Justification:** Operational confirmation request, not promotional

---

### **shiftcancelled** (Marketing → Utility)

**Current (Marketing tone):**
```
Hi {{1}},

Your shift on {{2}} has been cancelled.

Reason: {{3}}

Check the app for new shifts!
```

**Revised (Utility tone):**
```
SHIFT CANCELLATION NOTICE

Staff: {{1}}
Cancelled Shift: {{2}} at {{3}}
Reason: {{4}}

No action required. You will not be charged for this cancellation.

View alternative shifts: [link]

Reply STOP to opt out.
```

**Resubmit to Meta as:** UTILITY  
**Justification:** Transactional cancellation notice

---

### **newshiftsavailable** (Marketing → Utility)

**Current (Broadcast/Spam tone):**
```
Hi {{1}}!

New shifts are available in your area!

Check the app now to claim them.
```

**Revised (Personalized/Utility tone):**
```
SHIFT MATCH ALERT

{{1}}, a shift matching your preferences is available:

Role: {{2}}
Date: {{3}}
Location: {{4}}
Pay Rate: {{5}}

This alert is based on your saved preferences.

View details: [link]

Manage alerts: [link]
Reply STOP to disable.
```

**Resubmit to Meta as:** UTILITY  
**Justification:** Personalized alert based on user preferences, not broadcast

---

## 🛡️ SAFETY FEATURES TO IMPLEMENT

### 1. **Opt-Out Mechanism**

Add to database:
```sql
ALTER TABLE staff 
ADD COLUMN whatsapp_opt_out BOOLEAN DEFAULT FALSE,
ADD COLUMN whatsapp_opt_out_date TIMESTAMPTZ;
```

Check before sending:
```javascript
// In all workflows, add this check
const staff = $('Get Staff Details').item.json;

if (staff.whatsapp_opt_out) {
  return []; // Don't send message
}
```

---

### 2. **Rate Limiting**

Add to database:
```sql
CREATE TABLE whatsapp_rate_limits (
  staff_id UUID PRIMARY KEY REFERENCES staff(id),
  daily_count INTEGER DEFAULT 0,
  weekly_count INTEGER DEFAULT 0,
  last_reset_daily TIMESTAMPTZ DEFAULT NOW(),
  last_reset_weekly TIMESTAMPTZ DEFAULT NOW()
);
```

Check before sending:
```javascript
// Check daily limit
const limit = await supabase
  .from('whatsapp_rate_limits')
  .select('daily_count')
  .eq('staff_id', staffId)
  .single();

if (limit.data.daily_count >= 5) {
  console.log('Daily limit reached, skipping message');
  return [];
}
```

---

### 3. **Quality Monitoring**

Track in notifications table:
```sql
ALTER TABLE notifications
ADD COLUMN delivery_status TEXT, -- sent/delivered/read/failed
ADD COLUMN error_code TEXT,
ADD COLUMN spam_reported BOOLEAN DEFAULT FALSE;
```

Monitor daily:
```sql
-- Check delivery rate
SELECT 
  DATE(sent_at) as date,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE delivery_status = 'delivered') as delivered,
  ROUND(100.0 * COUNT(*) FILTER (WHERE delivery_status = 'delivered') / COUNT(*), 2) as delivery_rate
FROM notifications
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at);

-- Check spam reports
SELECT COUNT(*) FROM notifications 
WHERE spam_reported = TRUE 
AND sent_at >= NOW() - INTERVAL '7 days';
```

**Alert if:**
- Delivery rate < 90%
- Spam reports > 0
- Error rate > 5%

---

## 🚨 META BAN WARNING SIGNS

Watch for these in Meta Business Manager:

1. **Quality Rating Drop**
   - Green → Yellow → Red
   - Action: Pause all Marketing templates immediately

2. **Message Limit Reduction**
   - Tier drops (e.g., 1000/day → 250/day)
   - Action: Reduce sending frequency by 50%

3. **Template Rejection**
   - New templates rejected
   - Action: Review all active templates

4. **Account Warning**
   - Email from Meta about quality
   - Action: Pause all non-essential messages

---

## ✅ SAFE DEPLOYMENT CHECKLIST

Before deploying ANY template:

- [ ] Template category is correct (Utility vs Marketing)
- [ ] Opt-out mechanism included in message
- [ ] Rate limiting implemented
- [ ] Quality monitoring in place
- [ ] Template wording is transactional, not promotional
- [ ] Message is expected by recipient
- [ ] Message provides value to recipient
- [ ] Tested with small group first (<10 staff)
- [ ] Meta quality metrics monitored daily
- [ ] Rollback plan ready (can pause immediately)

---

## 🎯 RECOMMENDED IMMEDIATE ACTIONS

### **Action 1: Deploy Phase 1 Only**
```
✅ shiftassignment
✅ timesheetreminder
```

**Timeline:** Deploy today  
**Risk:** VERY LOW  
**Monitoring:** Check Meta dashboard daily for 1 week

---

### **Action 2: Resubmit Risky Templates**
```
⚠️ shiftreminder → Reword and resubmit as Utility
⚠️ shiftcancelled → Reword and resubmit as Utility
⚠️ paymentprocessed → Resubmit as Utility (no rewording needed)
```

**Timeline:** This week  
**Expected Approval:** 1-3 days

---

### **Action 3: Park High-Risk Template**
```
🔴 newshiftsavailable → DO NOT USE
```

**Timeline:** Redesign in 2-4 weeks  
**Requirements:**
- Complete template rewrite
- Opt-in mechanism in app
- Strict rate limiting
- Personalization engine

---

## 📞 WHAT TO DO IF BANNED

If you receive a ban or quality warning:

1. **Immediate Actions:**
   - Pause ALL workflows in n8n
   - Stop all WhatsApp sending
   - Review Meta Business Manager for details

2. **Investigation:**
   - Check which template triggered ban
   - Review recent message volume
   - Check spam report rate

3. **Appeal Process:**
   - Go to Meta Business Manager
   - Submit appeal with explanation
   - Provide evidence of legitimate use
   - Explain corrective actions

4. **Recovery:**
   - Wait for Meta response (1-7 days)
   - Implement corrective actions
   - Resume with only Utility templates
   - Monitor closely for 30 days

---

## 🎯 FINAL RECOMMENDATION

**DEPLOY IMMEDIATELY (Zero Risk):**
- shiftassignment
- timesheetreminder

**RESUBMIT THIS WEEK (Low Risk):**
- paymentprocessed (as Utility)
- shiftreminder (reworded as Utility)
- shiftcancelled (reworded as Utility)

**PARK FOR NOW (High Risk):**
- newshiftsavailable (needs major rework)

**MONITOR DAILY:**
- Meta quality metrics
- Delivery rates
- Spam reports

**This approach minimizes ban risk while delivering 90% of the value immediately.**

