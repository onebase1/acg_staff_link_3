# 🚨 GROUP A: MANUAL STEPS REQUIRED - URGENT

**Date**: 2025-11-20  
**Status**: Code deployed ✅ - Manual configuration needed ⚠️  
**Priority**: 🔴 CRITICAL - Must complete before emails will work

---

## ✅ WHAT'S ALREADY DONE

All code changes have been completed and deployed:
- ✅ Edge functions updated to use `agilecaremanagement.co.uk`
- ✅ Sender name changed to "Agile Care Management"
- ✅ All test configurations updated
- ✅ Documentation updated
- ✅ Changes committed to Git (commit: ece7c08)
- ✅ Changes pushed to GitHub
- ✅ Edge functions deployed to Supabase

---

## ⚠️ WHAT YOU NEED TO DO NOW

### STEP 1: Configure Supabase Auth SMTP (5 minutes) 🔴 CRITICAL

**Why**: Without this, password reset and signup emails will still show "from Supabase Auth" instead of "Agile Care Management"

**How**:
1. Go to: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf
2. Click **Authentication** in left sidebar
3. Click **Email Templates** tab
4. Scroll down to **SMTP Settings** section
5. Toggle ON: **"Enable Custom SMTP"**
6. Enter the following configuration:

```
SMTP Host: smtp.resend.com
SMTP Port: 587
SMTP Username: resend
SMTP Password: [Your Resend API Key]

Sender Email: noreply@agilecaremanagement.co.uk
Sender Name: Agile Care Management
```

7. Click **Save**
8. Click **Send Test Email** to verify it works
9. Check your inbox - sender should show "Agile Care Management <noreply@agilecaremanagement.co.uk>"

---

### STEP 2: Update Netlify Environment Variables (2 minutes) 🔴 CRITICAL

**Why**: Frontend needs to know the new domain for email sending

**How**:
1. Go to: https://app.netlify.com
2. Select your site: **acg_staff_link_3**
3. Click **Site settings** (top navigation)
4. Click **Environment variables** (left sidebar)
5. Find or add these variables:

```
RESEND_FROM_DOMAIN=agilecaremanagement.co.uk
RESEND_DEFAULT_FROM=noreply@agilecaremanagement.co.uk
```

6. Click **Save**
7. Go to **Deploys** tab
8. Click **Trigger deploy** → **Deploy site**
9. Wait 2-3 minutes for deployment to complete

---

### STEP 3: Verify Domain in Resend (Check only) 🟡 HIGH

**Why**: Emails won't send if domain isn't verified

**How**:
1. Go to: https://resend.com/domains
2. Login with your Resend account
3. Check if `agilecaremanagement.co.uk` appears in the list
4. Check if it shows **"Verified"** status

**If NOT verified**:
1. Click **Add Domain**
2. Enter: `agilecaremanagement.co.uk`
3. Add the DNS records shown (SPF, DKIM, DMARC) to your domain registrar
4. Wait for verification (usually 5-30 minutes)
5. Refresh page until status shows "Verified"

---

### STEP 4: Test Email Sending (5 minutes) 🔴 CRITICAL

**Why**: Verify everything works before going live

**Test 1: Edge Function Email**
1. Open Supabase Functions dashboard
2. Go to: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/functions
3. Click **send-email** function
4. Click **Invoke** tab
5. Enter test payload:
```json
{
  "to": "your-email@example.com",
  "subject": "Test Email - Domain Migration",
  "html": "<p>This is a test email from Agile Care Management</p>",
  "from_name": "Agile Care Management"
}
```
6. Click **Run**
7. Check your inbox - sender should show "Agile Care Management <noreply@agilecaremanagement.co.uk>"

**Test 2: Password Reset Email**
1. Go to your app: https://agilecaremanagement.co.uk (or Netlify URL)
2. Click **Forgot Password**
3. Enter a test email address
4. Check inbox - sender should show "Agile Care Management <noreply@agilecaremanagement.co.uk>"

**Test 3: Signup Email**
1. Try to create a new account
2. Check inbox for confirmation email
3. Verify sender shows "Agile Care Management <noreply@agilecaremanagement.co.uk>"

---

## ✅ SUCCESS CRITERIA

All emails should now show:
- **From**: Agile Care Management <noreply@agilecaremanagement.co.uk>
- **NOT**: "from Supabase Auth" or "guest-glow.com"

---

## 🔄 ROLLBACK PLAN

If emails fail after these changes:

1. **Revert Supabase SMTP**:
   - Go back to Supabase Auth SMTP settings
   - Change sender email to: `noreply@guest-glow.com`
   - Change sender name to: `ACG StaffLink`
   - Save

2. **Revert Netlify Env Vars**:
   - Change `RESEND_FROM_DOMAIN` back to `guest-glow.com`
   - Change `RESEND_DEFAULT_FROM` back to `noreply@guest-glow.com`
   - Redeploy

3. **Investigate**:
   - Check Resend domain verification status
   - Check Resend API logs
   - Check Supabase function logs

---

## 📞 NEED HELP?

If you encounter issues:
1. Check Resend dashboard for error logs
2. Check Supabase function logs
3. Verify DNS records are correct
4. Contact Resend support if domain verification fails

---

**Next**: After completing these steps, move to GROUP F (GPS & Mapbox Verification)

