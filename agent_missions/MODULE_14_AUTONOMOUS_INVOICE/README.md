# MODULE 14: Autonomous Invoice Pipeline

**Status:** 🔴 NOT STARTED
**Priority:** MVP CRITICAL
**Estimated Time:** 6-8 hours
**Risk Level:** Medium (financial feature)
**Dependencies:** MODULE_8 (Shift State Machine) helpful

---

## 🎯 MISSION OBJECTIVE

**Problem:** Invoice workflow requires manual intervention:
- Manual trigger to generate invoices
- Manual send to clients
- Manual payment tracking
- Manual reminders for overdue

**Solution:**
Full automation from approved timesheet → payment received

**End State:** Zero manual invoice work. Money flows automatically.

---

## 📊 AUTONOMOUS PIPELINE

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Timesheet       │────►│ Invoice         │────►│ Email Sent      │
│ APPROVED        │     │ GENERATED       │     │ to Client       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Payment         │◄────│ Payment Match   │◄────│ 7 Day Reminder  │
│ RECEIVED        │     │ (Bank Feed)     │     │ Sent            │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │ 14 Day Overdue  │
                                                │ Escalation      │
                                                └─────────────────┘
```

---

## 📦 DELIVERABLES

### Phase 1: Auto-Generation (2 hours)
- [ ] Enhance `auto-invoice-generator` Edge Function
- [ ] Trigger on: All timesheets for client approved
- [ ] Group timesheets by client and period
- [ ] Generate PDF with line items
- [ ] Schedule: Weekly on Sunday

### Phase 2: Auto-Send (1 hour)
- [ ] Enhance `send-invoice` Edge Function
- [ ] Auto-send after generation
- [ ] Track delivery status
- [ ] Retry on failure

### Phase 3: Payment Reminders (2 hours)
- [ ] Enhance `payment-reminder-engine`
- [ ] 7-day reminder (friendly)
- [ ] 14-day reminder (urgent)
- [ ] 30-day escalation (admin alert)
- [ ] Schedule: Daily

### Phase 4: Payment Matching (2-3 hours)
- [ ] Create manual payment recording UI
- [ ] (Future) Bank feed integration
- [ ] Auto-match payments to invoices
- [ ] Mark invoices as PAID

---

## 🔧 FILES AFFECTED

### Modify:
- `supabase/functions/auto-invoice-generator/index.ts`
- `supabase/functions/send-invoice/index.ts`
- `supabase/functions/payment-reminder-engine/index.ts`
- `supabase/migrations/` - Add cron jobs

### Create:
- `src/components/invoices/PaymentRecorder.jsx`
- `src/pages/PaymentTracking.jsx` (optional)

---

## 📋 AUTOMATION RULES

### Invoice Generation
```
WHEN: Sunday at 00:00
FOR: Each client with approved timesheets
IF: Timesheets not yet invoiced
THEN: Generate invoice, group by shift date
```

### Invoice Sending
```
WHEN: Invoice generated
THEN: Send email immediately
RETRY: 3 times with exponential backoff
```

### Payment Reminders
```
WHEN: Invoice age = 7 days AND status != PAID
THEN: Send friendly reminder

WHEN: Invoice age = 14 days AND status != PAID
THEN: Send urgent reminder

WHEN: Invoice age = 30 days AND status != PAID
THEN: Alert admin, escalate
```

---

## ✅ SUCCESS CRITERIA

- [ ] Invoices generate automatically weekly
- [ ] Emails send automatically
- [ ] 7-day reminders working
- [ ] 14-day reminders working
- [ ] 30-day escalation working
- [ ] Payment recording works
- [ ] Zero manual intervention needed

---

## 📞 AGENT HANDOFF

**To Start:** Review existing invoice Edge Functions
**When Done:** Test full pipeline end-to-end
**Next Module:** MODULE_15 (Self-Healing Notifications)

