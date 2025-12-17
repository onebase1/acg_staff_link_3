# MODULE 17: Compliance Automation Engine

**Status:** 🔴 NOT STARTED
**Priority:** HIGH
**Estimated Time:** 6-8 hours
**Risk Level:** Medium (regulatory implications)
**Dependencies:** None

---

## 🎯 MISSION OBJECTIVE

**Problem:** Compliance tracking is manual and reactive:
- Documents expire without warning
- Staff work with expired certifications
- No automated reminders
- Audit trail incomplete

**Solution:**
Full automation of compliance lifecycle.

**End State:** Zero compliance violations through proactive automation.

---

## 📊 COMPLIANCE LIFECYCLE

```
Document Uploaded
        │
        ▼
┌─────────────────┐
│ VALID           │ ◄── Expiry > 30 days
└────────┬────────┘
         │ 30 days before expiry
         ▼
┌─────────────────┐
│ EXPIRING_SOON   │ ◄── Send reminder to staff
└────────┬────────┘
         │ 7 days before expiry
         ▼
┌─────────────────┐
│ URGENT          │ ◄── Send urgent reminder + alert admin
└────────┬────────┘
         │ Expiry date passed
         ▼
┌─────────────────┐
│ EXPIRED         │ ◄── Block from shifts, notify agency
└─────────────────┘
```

---

## 📦 DELIVERABLES

### Phase 1: Enhance Schema (1 hour)
- [ ] Add `compliance_status` column to staff_documents
- [ ] Add `expiry_reminder_sent` tracking
- [ ] Create compliance views

### Phase 2: Compliance Monitor (2-3 hours)
- [ ] Enhance `compliance-monitor` Edge Function
- [ ] Check all documents daily
- [ ] Update status based on expiry
- [ ] Trigger appropriate reminders
- [ ] Block staff from shifts if expired

### Phase 3: Reminder System (2 hours)
- [ ] 30-day reminder (email)
- [ ] 7-day urgent reminder (email + SMS)
- [ ] Expiry notification (email + SMS + admin alert)
- [ ] Track reminder history

### Phase 4: Compliance Dashboard (2 hours)
- [ ] Create `src/pages/ComplianceDashboard.jsx`
- [ ] Show all documents by status
- [ ] Highlight expiring/expired
- [ ] Quick actions: Remind, Extend, Archive
- [ ] Compliance score per agency

---

## 📋 DOCUMENT TYPES TO TRACK

| Document | Typical Validity | Reminder Schedule |
|----------|-----------------|-------------------|
| DBS Check | 3 years | 30d, 7d, expired |
| Right to Work | Varies | 30d, 7d, expired |
| Training Cert | 1 year | 30d, 7d, expired |
| ID Document | 10 years | 30d, 7d, expired |
| Reference | N/A | N/A |

---

## ✅ SUCCESS CRITERIA

- [ ] All documents have compliance_status
- [ ] Daily status updates running
- [ ] 30-day reminders sending
- [ ] 7-day urgent reminders sending
- [ ] Expired staff blocked from shifts
- [ ] Dashboard shows compliance overview
- [ ] Zero expired staff working shifts

---

## 📞 AGENT HANDOFF

**To Start:** Review staff_documents table structure
**When Done:** Test full reminder cycle
**Next Module:** MODULE_18 (AI Shift Matching)

