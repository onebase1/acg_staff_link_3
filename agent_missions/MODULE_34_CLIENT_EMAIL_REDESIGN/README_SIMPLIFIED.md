# Module 34: Client Email System - Simplified Architecture

**Last Updated:** 2025-12-28
**Status:** Templates ready, awaiting implementation

---

## 🎯 Mission Goal

Send professional, CQC-compliant emails to clients about their shifts **WITHOUT** exposing staff phone numbers and **WITHOUT** complex download features.

---

## 📧 Email Types (Simplified)

### 1. **Batch Confirmation** - "Who's coming for your shifts"
- **Template:** `batch_confirmation.html`
- **When:** Shifts are assigned to staff
- **Shows:** Staff names + CQC profile links
- **Format:** Grouped by Date → Time → Role
- **Privacy:** NO phone numbers (use profile links instead)

### 2. **Weekly Summary** - "This week's schedule at a glance"
- **Template:** `weekly_summary.html`
- **When:** Every Monday (or on-demand)
- **Shows:** Staff counts + hours (not names)
- **Format:** Simple table (invoice-style)
- **Privacy:** NO phone numbers, NO staff names

### 3. **Daily Digest** - "Tomorrow's staff"
- **Template:** `daily_client_digest.html` (existing)
- **When:** Every evening (for next day)
- **Shows:** Tomorrow's confirmed shifts
- **Needs:** Profile links added

---

## 📂 Folder Structure

```
MODULE_34_CLIENT_EMAIL_REDESIGN/
│
├── 📄 README_SIMPLIFIED.md        ← You are here
├── 📄 CLEANUP_SUMMARY.md          ← What was done today
├── 📄 IMPLEMENTATION_GUIDE.md     ← Instructions for agent (START HERE!)
├── 📄 _TEMPLATE_PARTS_REFERENCE.md ← HTML structure examples
│
├── ✅ batch_confirmation.html      ← NEW production template
├── ✅ weekly_summary.html          ← NEW production template
│
├── 📋 batch_confirmation_full.html     ← OLD approved mockup (reference)
├── 📋 weekly_summary_invoice_style.html ← OLD approved mockup (reference)
├── 📋 daily_client_digest_MOCKUP.html  ← Approved mockup (reference)
├── 📋 monthly_status_report.html       ← Future feature idea
│
└── _archive/                      ← Old experimental mockups (ignore)
    ├── current_email.html
    ├── improved_email_original.html
    ├── improved_email_table.html
    ├── improved_email.html
    ├── weekly_summary_email.html
    └── weekly_summary_FINAL.html
```

---

## 🚀 Quick Start for Agent

### Step 1: Read Documentation
1. **CLEANUP_SUMMARY.md** - Understand what changed
2. **IMPLEMENTATION_GUIDE.md** - Follow step-by-step instructions

### Step 2: Key Changes Required

#### ❌ REMOVE:
- Phone numbers from emails: `(${s.phone})`
- Download button generation: `generateDownloadUrls()`
- Complex inline HTML (replace with templates)

#### ✅ ADD:
- Profile links: `[📋 View Profile]`
- Template usage: `loadTemplate('batch_confirmation', variables)`
- Simplified table generation

#### 📝 MODIFY:
- `notification-digest-engine/index.ts` - Use batch_confirmation.html
- `weekly-client-summary/index.ts` - Use weekly_summary.html
- `daily-client-digest/index.ts` - Add profile links

### Step 3: Test & Deploy
```bash
# Deploy updated functions
/c/Users/gbase/superbasecli/supabase functions deploy notification-digest-engine --no-verify-jwt
/c/Users/gbase/superbasecli/supabase functions deploy weekly-client-summary --no-verify-jwt
/c/Users/gbase/superbasecli/supabase functions deploy daily-client-digest --no-verify-jwt
```

### Step 4: Verify
- ✅ No phone numbers in emails
- ✅ Profile links work
- ✅ Emails match new mockups
- ✅ Richmond scenario works (36 shifts)

---

## 🔑 Key Principles

### Privacy & CQC Compliance
```
WRONG: • Sarah Jones (07123456789)
RIGHT: • Sarah Jones [📋 View Profile] → Opens CQC compliance page
```

### Simplicity
```
BEFORE: 850 lines of complex code + download buttons + inline HTML
AFTER:  650 lines + simple templates + no downloads
```

### Maintainability
```
BEFORE: Edit TypeScript to change email design
AFTER:  Edit HTML template file
```

---

## 📊 Email Content Rules

### Batch Confirmation
**DO:**
- Show staff names
- Group by date, time, role
- Include profile links
- Show staff count badges
- Calculate total hours

**DON'T:**
- Show phone numbers
- Add download buttons
- Include pricing/costs

### Weekly Summary
**DO:**
- Show all shifts for the week
- Display staff COUNT (not names)
- Include total hours
- Use simple table format

**DON'T:**
- Show staff names/phones
- Add download buttons
- Include pricing/costs
- Group by anything (just chronological)

---

## 🛠️ Technical Details

### Templates Use Mustache-Style Variables
```html
<h1>Hello {{client_name}}</h1>
<p>Total: {{total_hours}}h</p>
```

### Dynamic HTML Generated in TypeScript
```typescript
const groupedShiftsHtml = buildGroupedShiftsHtml(enrichedItems);
const variables = {
  client_name: 'Richmond Court',
  grouped_shifts_html: groupedShiftsHtml,
  total_hours: 120
};
const html = await loadTemplate('batch_confirmation', variables);
```

### Profile Links via Magic Tokens
```typescript
const profileLink = await generateStaffProfileLink(
  supabase,
  staff_id,
  client_id,
  agency_id
);
// Returns: https://...supabase.co/functions/v1/staff-profile-linker?token=abc123
// Expires: 14 days
// Redirects to: /staffprofilesimulation?id=staff_id
```

---

## ✅ Success Criteria

- [x] Templates created and copied to production
- [x] Old mockups archived
- [x] Implementation guide written
- [x] HTML structure documented
- [ ] Agent implements changes (IN PROGRESS)
- [ ] Emails tested with real data
- [ ] No phone numbers in emails
- [ ] Profile links working
- [ ] Richmond scenario verified (36 shifts)
- [ ] Functions deployed to production

---

## 📞 Questions?

**Template syntax:** See `_TEMPLATE_PARTS_REFERENCE.md`
**Implementation steps:** See `IMPLEMENTATION_GUIDE.md`
**What changed:** See `CLEANUP_SUMMARY.md`
**Original mission:** See `FINAL_STRATEGY.md` and `PROGRESS.md`

---

**IMPORTANT:** The goal is **simplicity**. Remove complexity, protect privacy, make emails professional and CQC-compliant.

