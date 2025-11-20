# Supabase Auth Email Templates - Branded HTML

**Status**: ✅ DNS configured, emails not marked as spam  
**Next Step**: Wrap Supabase Auth emails in branded templates  
**Date**: 2025-11-20

---

## 🎯 Quick Access

**Supabase Dashboard**: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/auth/templates

**Templates to Update**:
1. ✅ Confirm signup
2. ✅ Reset Password (Magic Link)
3. ✅ Invite user
4. ⚠️ Change Email Address (optional)

---

## 📋 Template 1: Confirm Signup

**Path**: Authentication → Email Templates → "Confirm signup"

**Replace entire content with**:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 40px 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to Agile Care!</h1>
    <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 14px;">Healthcare Staffing Platform</p>
  </div>

  <!-- Body -->
  <div style="padding: 40px 20px; background: #f8fafc;">
    <h2 style="color: #1e293b; margin: 0 0 20px 0;">Confirm Your Email</h2>
    
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Thank you for joining Agile Care Management! We're excited to have you on board.
    </p>

    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Click the button below to confirm your email address and activate your account:
    </p>

    <!-- Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); 
                color: #ffffff; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: bold; 
                font-size: 16px;
                display: inline-block;">
        Confirm Email Address
      </a>
    </div>

    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-top: 30px;">
      If you didn't create this account, you can safely ignore this email.
    </p>
  </div>

  <!-- Footer -->
  <div style="background: #1e293b; padding: 30px 20px; text-align: center;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
      © 2025 Agile Care Management Ltd. All rights reserved.
    </p>
    <p style="color: #64748b; font-size: 12px; margin: 10px 0 0 0;">
      Healthcare Staffing Solutions | United Kingdom
    </p>
  </div>
</div>
```

---

## 📋 Template 2: Reset Password (Magic Link)

**Path**: Authentication → Email Templates → "Magic Link"

**Replace entire content with**:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 40px 20px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Agile Care Management</h1>
    <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 14px;">Healthcare Staffing Platform</p>
  </div>

  <!-- Body -->
  <div style="padding: 40px 20px; background: #f8fafc;">
    <h2 style="color: #1e293b; margin: 0 0 20px 0;">Reset Your Password</h2>
    
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      You requested to reset your password for your Agile Care Management account.
    </p>

    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Click the button below to create a new password:
    </p>

    <!-- Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); 
                color: #ffffff; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: bold; 
                font-size: 16px;
                display: inline-block;">
        Reset Password
      </a>
    </div>

    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-top: 30px;">
      If you didn't request this, you can safely ignore this email.
    </p>

    <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
      This link will expire in 1 hour for security reasons.
    </p>
  </div>

  <!-- Footer -->
  <div style="background: #1e293b; padding: 30px 20px; text-align: center;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
      © 2025 Agile Care Management Ltd. All rights reserved.
    </p>
    <p style="color: #64748b; font-size: 12px; margin: 10px 0 0 0;">
      Healthcare Staffing Solutions | United Kingdom
    </p>
  </div>
</div>
```

---

## ✅ After Updating Templates

1. **Click "Save"** for each template
2. **Test** by requesting password reset or creating new account
3. **Verify** email looks professional with blue header and branding

---

## 🎯 Expected Result

Emails will now show:
- ✅ Professional blue gradient header
- ✅ "Agile Care Management" branding
- ✅ Clear call-to-action button
- ✅ Company footer
- ✅ No spam warnings

---

**Status**: Ready to implement  
**Time**: 10 minutes  
**Impact**: Professional branded emails for all auth flows

