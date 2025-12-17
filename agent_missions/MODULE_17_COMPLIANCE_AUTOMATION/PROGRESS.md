# MODULE 17: Progress Tracker

**Last Updated:** 2025-12-17
**Status:** 🔴 NOT STARTED
**Completion:** 0%

---

## PHASE 1: Enhance Schema (0%)

- [ ] Review staff_documents table structure
- [ ] Add compliance_status column
- [ ] Add expiry_reminder_sent tracking
- [ ] Create compliance views
- [ ] Apply migration
- [ ] Backfill existing documents

---

## PHASE 2: Compliance Monitor (0%)

- [ ] Review existing compliance-monitor function
- [ ] Enhance to check all documents daily
- [ ] Implement status update logic:
  - VALID: expiry > 30 days
  - EXPIRING_SOON: expiry 8-30 days
  - URGENT: expiry 1-7 days
  - EXPIRED: expiry passed
- [ ] Implement staff blocking for expired docs
- [ ] Add cron schedule (daily)
- [ ] Deploy function
- [ ] Test with sample documents

---

## PHASE 3: Reminder System (0%)

- [ ] Implement 30-day reminder (email)
- [ ] Implement 7-day urgent reminder (email + SMS)
- [ ] Implement expiry notification (email + SMS + admin)
- [ ] Track reminder history
- [ ] Prevent duplicate reminders
- [ ] Test reminder sequence

---

## PHASE 4: Compliance Dashboard (0%)

- [ ] Create ComplianceDashboard.jsx page
- [ ] Fetch documents by status
- [ ] Display grouped by status
- [ ] Highlight expiring/expired
- [ ] Add quick actions: Remind, Extend, Archive
- [ ] Show compliance score per agency
- [ ] Add route to App.jsx
- [ ] Add navigation link

---

## FINAL VALIDATION (0%)

- [ ] All documents have compliance_status
- [ ] Daily status updates running
- [ ] 30-day reminders sending
- [ ] 7-day urgent reminders sending
- [ ] Expired staff blocked from shifts
- [ ] Dashboard shows overview
- [ ] Zero expired staff working shifts

---

## COMPLIANCE STATUS SUMMARY

| Status | Count |
|--------|-------|
| Valid | - |
| Expiring Soon | - |
| Urgent | - |
| Expired | - |

---

**Next Module:** MODULE_18 (AI Shift Matching)

