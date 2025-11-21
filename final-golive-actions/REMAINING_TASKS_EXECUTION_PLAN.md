# 🎯 REMAINING TASKS - DEEP DIVE & EXECUTION PLAN

**Date**: 2025-11-20  
**Status**: Ready for Execution  
**Total Tasks**: 9  
**Estimated Time**: 8-12 hours

---

## 📊 TASK PRIORITY MATRIX

| Task | Priority | Time | Risk | Dependencies |
|------|----------|------|------|--------------|
| 5. Notification System Audit | 🟡 HIGH | 1-2h | 🟢 Low | None |
| 6. Fix Signup/Signin UI | 🟡 HIGH | 1-2h | 🟢 Low | None |
| 7. Test GPS Clock-In/Out | 🔴 CRITICAL | 30m-1h | 🟡 Medium | Netlify env vars |
| 10. Staff Portal Welcome Text | 🟢 MEDIUM | 15m | 🟢 Low | None |
| 11. Company Logo | 🟡 HIGH | 1-2h | 🟢 Low | Design asset |
| 12. Test Live Timesheet Upload | 🔴 CRITICAL | 30m-1h | 🟡 Medium | GPS test |
| 13. Hide Payslip from Staff Portal | 🟢 MEDIUM | 15m | 🟢 Low | None |
| 14. Add Shift Calendar to Staff Portal | 🟡 HIGH | 2-3h | 🟢 Low | None |
| 15. Use agilecaremanagement.co.uk Domain | 🔴 CRITICAL | 30m | 🟡 Medium | DNS/Netlify |

---

## 🔍 TASK 5: NOTIFICATION SYSTEM AUDIT

### Objective
Create comprehensive audit document and ensure all email templates have consistent branding, headers/footers, and work on both light/dark themes.

### Current State Analysis
✅ **Already Completed**:
- Email templates use safe colors for dark/light themes
- Base wrapper includes dark mode support
- Sender name standardized to "Agile Care Management"
- Domain migration to agilecaremanagement.co.uk complete

### Files to Audit
1. `src/components/notifications/EmailTemplates.jsx` - Base wrapper + all templates
2. `src/components/notifications/NotificationService.jsx` - Multi-channel delivery
3. `supabase/functions/send-email/index.ts` - Email sending function
4. `supabase/functions/send-agency-admin-invite/index.ts` - Invite emails
5. `supabase/functions/notification-digest-engine/index.ts` - Batched emails
6. `supabase/functions/email-automation-engine/index.ts` - Automated workflows
7. `supabase/functions/staff-daily-digest-engine/index.ts` - Daily digests

### Execution Steps
1. **Create audit document** (30 min)
   - Document all email templates
   - List color schemes used
   - Verify dark/light theme compatibility
   - Check header/footer consistency

2. **Test email rendering** (30 min)
   - Send test emails to Gmail (light mode)
   - Send test emails to Outlook (dark mode)
   - Verify mobile rendering
   - Check spam scores

3. **Document findings** (30 min)
   - Create `NOTIFICATION_SYSTEM_COMPLETE_AUDIT.md`
   - Include screenshots if needed
   - List any inconsistencies found
   - Provide recommendations

### Deliverable
- `final-golive-actions/NOTIFICATION_SYSTEM_COMPLETE_AUDIT.md`

---

## 🔍 TASK 6: FIX SIGNUP/SIGNIN UI

### Objective
Modernize authentication UI by removing enterprise text, improving mobile UX, and changing tab structure to standard signin page with links.

### Current State
**File**: `src/pages/Login.jsx` (582 lines)

**Current Issues**:
- Left side has "enterprise-grade workforce orchestration" text (irrelevant to staff/care homes)
- Left side visible on mobile (wastes space)
- Uses tabs for signin/signup (non-standard UX)
- "ACG" logo placeholder instead of real logo

### Proposed Changes

#### Option A: Remove Left Side Completely
- Simpler, cleaner design
- Better mobile experience
- Faster load time
- More modern SaaS look

#### Option B: Replace with ACG-Specific Content
- "Welcome to Agile Care Management"
- "Simplifying care home staffing"
- Benefits: GPS clock-in, instant shift offers, compliance tracking
- Keep for brand reinforcement

### Recommended Approach: **Option A** (Remove Left Side)

### Execution Steps

