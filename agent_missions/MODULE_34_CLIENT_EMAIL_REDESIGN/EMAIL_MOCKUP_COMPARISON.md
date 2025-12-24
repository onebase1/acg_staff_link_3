# Email Mockup Comparison Guide

## Overview
This document compares all three client email mockups for Richmond Court scenario.

---

## 1. Batch Shift Confirmation Email
**File:** `improved_email.html`  
**When Sent:** Within 5 minutes of shifts being assigned to staff  
**Example:** Richmond books 97 shifts for 3 weeks (Dec 15 - Jan 4)

### Key Features
- ✅ Weekly summary box (25 HCA, 15 RN, 5 Days)
- ✅ Grouped by Date → Time → Role
- ✅ Role section headers (Healthcare Assistants, Registered Nurses)
- ✅ Staff count badges with names/phones
- ✅ Download links (PDF, CSV, Calendar)

### User Experience
**Good for:**
- Immediate confirmation when shifts are booked
- Detailed staff contact information
- Clients who want to know WHO is coming

**Challenge:**
- Long email for 3-week bookings (97 shifts)
- **Solution:** Auto-split into weekly emails

---

## 2. Weekly Summary Email (NEW)
**File:** `weekly_summary_email.html`  
**When Sent:** Every Monday at 8 AM  
**Example:** Summary for week of Dec 22-28

### Key Features
- ✅ This week's staffing overview (32 shifts)
- ✅ Daily breakdown table (Mon-Sun)
- ✅ Last week's completed shifts (billing preview)
- ✅ Download actions (PDF, CSV, Calendar)
- ✅ Important notices section
- ✅ Gentle portal CTA

### User Experience
**Good for:**
- Weekly planning
- At-a-glance coverage view
- Billing previews
- Clients who want weekly digest instead of daily

**Challenge:**
- None - compact and focused

---

## 3. Current Design (For Reference)
**File:** `current_email.html`  
**Format:** Individual shift cards (32 cards for 32 shifts)

### Problems
- ❌ Extremely repetitive
- ❌ Very long scrolling
- ❌ No summary or grouping

---

## Recommended Email Strategy

### For Richmond Scenario (3-week booking)

**Option A: Auto-Split by Week**
```
Admin books 97 shifts (Dec 15 - Jan 4)
                ↓
System auto-splits into 3 emails:
┌────────────────────────────────┐
│ Email 1: Week of Dec 15-21     │
│ (34 shifts, improved design)   │
└────────────────────────────────┘
┌────────────────────────────────┐
│ Email 2: Week of Dec 22-28     │
│ (33 shifts, improved design)   │
└────────────────────────────────┘
┌────────────────────────────────┐
│ Email 3: Week of Dec 29-Jan 4  │
│ (30 shifts, improved design)   │
└────────────────────────────────┘
```

**Then, every Monday:**
```
┌────────────────────────────────┐
│ Weekly Summary Email           │
│ (This week + Last week review) │
└────────────────────────────────┘
```

**Benefits:**
- ✅ Batch confirmation emails stay focused (one week each)
- ✅ Weekly summary provides ongoing reminders
- ✅ No duplicate emails (batch on booking day, summary on Mondays only)

---

### Option B: Single Email + Weekly Summaries

```
Admin books 97 shifts
          ↓
┌────────────────────────────────┐
│ Single batch email (97 shifts) │
│ + Download PDF button          │
└────────────────────────────────┘

Then weekly reminders:
┌────────────────────────────────┐
│ Weekly Summary (every Monday)  │
└────────────────────────────────┘
```

**Benefits:**
- ✅ One comprehensive confirmation
- ✅ PDF download handles length issue
- ✅ Weekly reminders keep it top of mind

---

## Download Link Strategy

### Magic Link Approach (No Login)

```html
<!-- In both email types -->
<div style="text-align: center; margin: 20px 0;">
  <a href="https://app.com/view-schedule/abc-secret-token-123">
    📄 Download PDF Schedule
  </a>
</div>
```

**How it works:**
1. Token generated when email queued
2. Token contains: queue_id + client_email + expiry
3. Link opens webpage (no login required)
4. Webpage validates token → Shows schedule → PDF download
5. Token expires in 30 days

**Reusable for:**
- ✅ Staff Right to Work documents
- ✅ Staff passport copies
- ✅ Compliance certificates
- ✅ Monthly invoices

---

## Questions for Alignment

1. **Auto-split large batches by week?**
   - Option A (auto-split) - Recommended
   - Option B (single email + PDF)

2. **Weekly summary content - keep as shown?**
   - This week's shifts ✅
   - Last week's completed (billing preview) ✅
   - Daily breakdown table ✅

3. **Download link behavior?**
   - Magic links (no login) - Recommended
   - Portal login required

4. **Weekly summary frequency?**
   - Every Monday 8 AM - Recommended
   - Different day/time?

---

## Next Steps

1. ✅ Review both HTML mockups in browser
2. ✅ Align on email strategy (Option A vs B)
3. ✅ Confirm weekly summary content
4. ⏳ Build implementation based on approval
