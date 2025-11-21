# 🔧 NOTIFICATION SYSTEM - CRITICAL FIXES REQUIRED

**Date**: 2025-11-20  
**Priority**: 🔴 CRITICAL - BLOCKS GO-LIVE  
**Estimated Time**: 2-3 hours  
**Status**: ❌ NOT STARTED

---

## 🚨 CRITICAL ISSUES (Must Fix Before Go-Live)

### Issue #1: Hardcoded Placeholder Phone Number

**File**: `supabase/functions/critical-change-notifier/index.ts`  
**Line**: 139  
**Current Code**:
```html
<strong>CONTACT AGENCY IMMEDIATELY: +44 XXX XXX XXXX</strong>
```

**Problem**: Placeholder phone number - staff cannot contact agency in emergencies

**Fix**:
```html
<strong>CONTACT ${agency.name} IMMEDIATELY: ${agency.phone || agency.contact_phone}</strong>
```

**Impact**: HIGH - Security/fraud alerts are useless without real contact info

---

### Issue #2: Generic "Contact Agency" Text (3 instances)

**File**: `supabase/functions/critical-change-notifier/index.ts`  
**Lines**: 221, 271  

**Current Code**:
```
"please contact the agency immediately"
```

**Problem**: No agency name, phone, or email provided

**Fix**:
```html
please contact ${agency.name} immediately at:
📧 <a href="mailto:${agency.email}">${agency.email}</a> or 
📱 ${agency.phone}
```

**Impact**: HIGH - Staff cannot take action on critical alerts

---

### Issue #3: Missing Footer/Signature (Admin Invite)

**File**: `supabase/functions/send-agency-admin-invite/index.ts`  
**Lines**: 92-114  

**Problem**: Email has NO footer, NO copyright, NO branding

**Fix**: Add standard footer before closing `</div>`:
```html
<hr style="border:none;border-top:1px solid #e2e8f0;margin:40px 0 24px 0;" />
<div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
  <p style="margin: 0; font-size: 13px; color: #64748b;">
    © 2025 Agile Care Management. All rights reserved.
  </p>
  <p style="margin: 10px 0 0 0; font-size: 12px; color: #94a3b8;">
    Need help? Contact us at 
    <a href="mailto:support@agilecaremanagement.co.uk" style="color: #0284c7;">
      support@agilecaremanagement.co.uk
    </a>
  </p>
</div>
```

**Impact**: MEDIUM - Looks unprofessional, inconsistent with other emails

---

### Issue #4: Generic "Contact Us" Text (Shift Confirmed)

**File**: `src/components/notifications/NotificationService.jsx`  
**Line**: 492  

**Current Code**:
```
"Contact us immediately if you're running late or cannot attend"
```

**Problem**: No agency name, phone, or email

**Fix**:
```javascript
`Contact ${agencyName} immediately at ${agency.phone || agency.contact_phone} if you're running late or cannot attend`
```

**Impact**: MEDIUM - Staff don't know who to contact

---

### Issue #5: Broken/Missing CTA Links

**File**: `src/components/notifications/NotificationService.jsx`  
**Lines**: Multiple locations (shift confirmed, reminders, compliance)  

**Problem**: Emails say "Clock in via the app" or "Update your profile" but provide NO link

**Fix**: Add CTA button after each alert box:
```javascript
${EmailTemplates.ctaButton({
  text: 'Go to Staff Portal',
  url: 'https://agilecaremanagement.co.uk/staff-portal',
  bgColor: '#10b981'
})}
```

**Locations to Add**:
1. Shift confirmed email (line ~495)
2. Shift reminder email (line ~570)
3. Compliance expiry email (line ~410)

**Impact**: HIGH - Staff cannot take action without portal link

---

### Issue #6: Inconsistent Branding

**File**: `supabase/functions/critical-change-notifier/index.ts`  
**Lines**: 97, 234, 294  

**Current Code**:
```javascript
from: `ACG StaffLink <noreply@${RESEND_FROM_DOMAIN}>`
```

**Problem**: Uses "ACG StaffLink" instead of "Agile Care Management"

**Fix**:
```javascript
from: `Agile Care Management <noreply@${RESEND_FROM_DOMAIN}>`
```

**Impact**: MEDIUM - Brand confusion

---

### Issue #7: Missing Agency Contact Info Section

**File**: Multiple files  
**Problem**: Most emails lack agency contact details

**Fix**: Add this section to ALL critical emails (cancellations, changes, compliance):
```html
<div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 25px 0; border-radius: 8px;">
  <p style="margin: 0 0 10px 0; color: #0c4a6e; font-size: 15px; font-weight: bold;">
    📞 Need Help?
  </p>
  <p style="margin: 0; color: #0c4a6e; font-size: 14px; line-height: 1.8;">
    Contact ${agency.name}:<br>
    📧 <a href="mailto:${agency.email}" style="color: #0284c7; text-decoration: none;">${agency.email}</a><br>
    📱 ${agency.phone || agency.contact_phone}<br>
    ${agency.office_hours ? `🕐 ${agency.office_hours}` : ''}
  </p>
</div>
```

**Locations**:
1. `critical-change-notifier.ts` - All 3 email types
2. `NotificationService.jsx` - Shift confirmed, reminders, compliance

**Impact**: HIGH - Staff cannot contact agency when needed

---

## ⚠️ MEDIUM PRIORITY (Should Fix)

### Issue #8: No Unsubscribe Link

**Files**: `email-automation-engine.ts`, `staff-daily-digest-engine.ts`  
**Problem**: Automated emails violate email best practices

**Fix**: Add before footer:
```html
<p style="text-align: center; font-size: 12px; color: #94a3b8; margin: 20px 0;">
  <a href="https://agilecaremanagement.co.uk/preferences?email=${encodeURIComponent(email)}" 
     style="color: #64748b; text-decoration: underline;">
    Manage email preferences
  </a>
</p>
```

---

### Issue #9: Missing "View in Browser" Link

**Files**: Batched emails, digests  
**Problem**: No fallback if email doesn't render

**Fix**: Add to header:
```html
<p style="text-align: center; font-size: 11px; color: #94a3b8; margin: 0 0 20px 0;">
  <a href="https://agilecaremanagement.co.uk/email/${emailId}" style="color: #64748b;">
    View in browser
  </a>
</p>
```

---

### Issue #10: Missing Agency Logo

**Files**: `critical-change-notifier.ts`, `send-agency-admin-invite.ts`  
**Problem**: Some templates don't use agency logo

**Fix**: Add agency logo to header (if available):
```javascript
// Fetch agency data first
const { data: agency } = await supabase
  .from('agencies')
  .select('name, logo_url, phone, email')
  .eq('id', agency_id)
  .single();

// Then use in template
${agency?.logo_url ? `<img src="${agency.logo_url}" alt="${agency.name}" style="max-width: 150px; margin-bottom: 20px;">` : ''}
```

---

## 📋 EXECUTION CHECKLIST

### Phase 1: Critical Fixes (2-3 hours)

- [ ] **Fix #1**: Replace hardcoded phone number
- [ ] **Fix #2**: Add agency contact details (3 instances)
- [ ] **Fix #3**: Add footer to admin invite email
- [ ] **Fix #4**: Fix "contact us" text in shift confirmed
- [ ] **Fix #5**: Add CTA buttons (3 locations)
- [ ] **Fix #6**: Fix branding inconsistency (3 instances)
- [ ] **Fix #7**: Add agency contact section (6 locations)

### Phase 2: Professional Polish (1-2 hours)

- [ ] **Fix #8**: Add unsubscribe links (2 files)
- [ ] **Fix #9**: Add "view in browser" links (3 files)
- [ ] **Fix #10**: Add agency logos (2 files)

### Phase 3: Testing (30 min)

- [ ] Send test emails for each notification type
- [ ] Verify all placeholders are replaced
- [ ] Verify all links work
- [ ] Verify agency contact info displays correctly
- [ ] Test on Gmail, Outlook, Apple Mail
- [ ] Test dark mode rendering

---

## 🎯 SUCCESS CRITERIA

**Before marking as COMPLETE**:
- ✅ All 7 critical issues fixed
- ✅ All placeholders replaced with real data
- ✅ All emails have proper footers
- ✅ All emails have agency contact info
- ✅ All CTAs have working links
- ✅ Consistent branding across all emails
- ✅ Test emails sent and verified

**Estimated Total Time**: 3-5 hours

---

**Next Step**: Start with Issue #1 (hardcoded phone) and work through the list sequentially.
