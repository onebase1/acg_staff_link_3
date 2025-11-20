# Email Sender Audit & Configuration Fix

**Date:** 2025-11-20  
**Issue:** Supabase Auth emails show "from Supabase Auth" instead of "ACG StaffLink"  
**Impact:** Users may mark as spam or not trust the email  
**Priority:** Medium (not blocking, but affects trust)

---

## 🔍 CURRENT EMAIL SENDER CONFIGURATION

### ✅ **Application Emails (Working Correctly)**

These emails are sent via **Resend API** and show correct sender:

| Email Type | Sender Name | Sender Email | Code Location |
|------------|-------------|--------------|---------------|
| Shift notifications | Agile Care Management | noreply@agilecaremanagement.co.uk | `send-email/index.ts` |
| Staff invitations | Agile Care Management | noreply@agilecaremanagement.co.uk | `send-agency-admin-invite/index.ts` |
| Role change alerts | Agile Care Management | noreply@agilecaremanagement.co.uk | `NotificationService.jsx` |
| Timesheet reminders | Agile Care Management | noreply@agilecaremanagement.co.uk | `send-email/index.ts` |
| Welcome emails | Agile Care Management | noreply@agilecaremanagement.co.uk | `send-email/index.ts` |

**Configuration:**
```javascript
// supabase/functions/send-email/index.ts (Line 84)
const senderName = from_name || 'Agile Care Management';
const from = `${senderName} <noreply@${RESEND_FROM_DOMAIN}>`;
// Result: "Agile Care Management <noreply@agilecaremanagement.co.uk>"
```

**Environment Variables:**
```bash
RESEND_API_KEY=re_hzPF7CWV_CTkBHMxuNM2rfAKUwEdJ6GB2
RESEND_FROM_DOMAIN=agilecaremanagement.co.uk (default)
```

---

### ⚠️ **Supabase Auth Emails (Shows "Supabase Auth")**

These emails are sent by **Supabase Auth service** (NOT Resend):

| Email Type | Current Sender | When Triggered | User Sees |
|------------|----------------|----------------|-----------|
| Password reset | Supabase Auth | User clicks "Forgot Password" | ⚠️ "from Supabase Auth" |
| Email confirmation | Supabase Auth | New user signup | ⚠️ "from Supabase Auth" |
| Email change confirmation | Supabase Auth | User changes email | ⚠️ "from Supabase Auth" |
| Magic link login | Supabase Auth | User requests magic link | ⚠️ "from Supabase Auth" |

**Why This Happens:**
- Supabase Auth has its own email service (separate from your Resend integration)
- By default, uses Supabase's SMTP server
- Shows "Supabase Auth" as sender name
- Uses `noreply@mail.app.supabase.io` as sender email

**Screenshot Evidence:**
- User sees: "Reset Your Password - You're receiving this email because you signed up for an application powered by Supabase"
- Sender shows: "Supabase Auth <noreply@mail.app.supabase.io>"

---

## 🎯 SOLUTION OPTIONS

### **Option 1: Configure Custom SMTP in Supabase (RECOMMENDED)** ⭐

**What:** Configure Supabase Auth to use Resend SMTP instead of default Supabase SMTP

**Pros:**
- ✅ All emails (app + auth) show "ACG StaffLink"
- ✅ Consistent branding across all emails
- ✅ Users trust emails more (not marked as spam)
- ✅ Professional appearance

**Cons:**
- ⚠️ Requires Supabase dashboard configuration (5 minutes)
- ⚠️ Need to verify domain in Resend (if not already done)

**Effort:** 5-10 minutes (one-time setup)

---

### **Option 2: Do Nothing (Current State)**

**What:** Keep Supabase Auth emails showing "Supabase Auth"

**Pros:**
- ✅ No work required
- ✅ Emails still deliver successfully

**Cons:**
- ❌ Users see "Supabase Auth" (confusing)
- ❌ May be marked as spam
- ❌ Unprofessional appearance
- ❌ Users may not trust the email

**Effort:** 0 minutes

---

### **Option 3: Use Resend for Auth Emails (Complex)**

**What:** Bypass Supabase Auth emails entirely, send custom password reset emails via Resend

**Pros:**
- ✅ Full control over email content and sender

**Cons:**
- ❌ Requires custom password reset flow
- ❌ Need to generate secure tokens manually
- ❌ More code to maintain
- ❌ Not recommended by Supabase

**Effort:** 2-3 hours (not worth it)

---

## ✅ RECOMMENDED SOLUTION: Configure Custom SMTP

### Step-by-Step Implementation

#### **Step 1: Verify Domain in Resend (If Not Already Done)**

1. Login to Resend: https://resend.com/domains
2. Check if `agilecaremanagement.co.uk` is verified
3. If not verified:
   - Add domain
   - Add DNS records (SPF, DKIM, DMARC)
   - Wait for verification (5-10 minutes)

**Current Status:** Likely already verified (you're sending emails successfully)

---

#### **Step 2: Get Resend SMTP Credentials**

Resend provides SMTP access for custom integrations:

**SMTP Server:** `smtp.resend.com`  
**Port:** `587` (TLS) or `465` (SSL)  
**Username:** `resend`  
**Password:** Your Resend API Key (`re_hzPF7CWV_CTkBHMxuNM2rfAKUwEdJ6GB2`)

---

#### **Step 3: Configure Supabase Custom SMTP**

1. **Go to Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf
   - Navigate to: **Authentication** → **Email Templates** → **SMTP Settings**

2. **Enable Custom SMTP:**
   - Toggle ON: **"Enable Custom SMTP"**

3. **Enter SMTP Configuration:**
   ```
   SMTP Host: smtp.resend.com
   SMTP Port: 587
   SMTP Username: resend
   SMTP Password: re_hzPF7CWV_CTkBHMxuNM2rfAKUwEdJ6GB2

   Sender Email: noreply@agilecaremanagement.co.uk
   Sender Name: Agile Care Management
   ```

4. **Save Changes**

5. **Test Configuration:**
   - Click "Send Test Email"
   - Check your inbox
   - Verify sender shows "Agile Care Management <noreply@agilecaremanagement.co.uk>"

---

#### **Step 4: Customize Email Templates (Optional)**

While you're in Supabase Auth settings, you can customize the email templates:

1. **Navigate to:** Authentication → Email Templates
2. **Customize templates:**
   - Confirm Signup
   - Invite User
   - Magic Link
   - Change Email Address
   - Reset Password ⭐ **Most important for Dominion migration**

**Example: Reset Password Template**

**Current (Default):**
```
Reset Your Password

You're receiving this email because you signed up for an application powered by Supabase.

Click here to reset your password: {{ .ConfirmationURL }}
```

**Improved (Custom):**
```
Reset Your ACG StaffLink Password

Hi there,

You requested to reset your password for ACG StaffLink.

Click the button below to set a new password:

{{ .ConfirmationURL }}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

Need help? Contact support@acg-stafflink.com

Thanks,
ACG StaffLink Team
```

---

## 📊 BEFORE vs AFTER

### **BEFORE (Current State)**

**Password Reset Email:**
- **From:** Supabase Auth <noreply@mail.app.supabase.io>
- **Subject:** Reset Your Password
- **Body:** "You're receiving this email because you signed up for an application powered by Supabase"
- **User Reaction:** 🤔 "What's Supabase? Is this spam?"

**Signup Confirmation Email:**
- **From:** Supabase Auth <noreply@mail.app.supabase.io>
- **Subject:** Confirm Your Signup
- **Body:** "You're receiving this email because you signed up for an application powered by Supabase"
- **User Reaction:** 🤔 "I signed up for ACG StaffLink, not Supabase..."

---

### **AFTER (With Custom SMTP)**

**Password Reset Email:**
- **From:** Agile Care Management <noreply@agilecaremanagement.co.uk>
- **Subject:** Reset Your Agile Care Management Password
- **Body:** "You requested to reset your password for Agile Care Management..."
- **User Reaction:** ✅ "Oh, this is from Agile Care Management. I trust this."

**Signup Confirmation Email:**
- **From:** Agile Care Management <noreply@agilecaremanagement.co.uk>
- **Subject:** Welcome to Agile Care Management
- **Body:** "Welcome to Agile Care Management! Click below to confirm your email..."
- **User Reaction:** ✅ "Perfect, this is what I expected."

---

## 🚨 CRITICAL FOR DOMINION MIGRATION

**Why This Matters for Dominion Staff:**

1. **Trust:** Staff receive pre-announcement from Dominion → Expect email from "ACG StaffLink" → See "Supabase Auth" → Confusion/Spam

2. **Password Reset Flow:**
   - Staff click "Set Password" in welcome email
   - Redirected to forgot password page
   - Enter email → Receive password reset email
   - **This email MUST show "ACG StaffLink"** (not Supabase)

3. **First Impression:**
   - This is staff's first interaction with ACG StaffLink
   - Seeing "Supabase Auth" creates doubt
   - May abandon onboarding process

---

## ✅ IMPLEMENTATION TIMELINE

| Task | Duration | When |
|------|----------|------|
| Verify Resend domain | 5 min | Before migration |
| Configure Supabase SMTP | 5 min | Before migration |
| Test password reset email | 2 min | Before migration |
| Customize email templates | 10 min | Optional (can do later) |

**Total:** 10-20 minutes (one-time setup)

---

## 🎯 DECISION REQUIRED

**Option 1: Configure Custom SMTP Now** ⭐ RECOMMENDED
- [ ] Yes, configure before Dominion migration (10 minutes)
- [ ] Ensures all emails show "ACG StaffLink"
- [ ] Professional, trustworthy appearance

**Option 2: Leave As-Is**
- [ ] No, keep "Supabase Auth" for now
- [ ] Accept risk of confusion/spam
- [ ] Can configure later if issues arise

---

## 📝 NEXT STEPS (If Approved)

1. **I'll provide:** Step-by-step screenshots for Supabase dashboard
2. **You'll do:** Configure SMTP settings (5 minutes)
3. **We'll test:** Send test password reset email
4. **Result:** All emails show "ACG StaffLink"

**Ready to proceed?** 🎯

