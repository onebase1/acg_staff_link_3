# 📧 Staff Invitation & Signup Flow - Complete Guide

## ✅ What's Been Fixed

### 1. **Simplified Signup Form**
- **Before**: Staff saw 10+ fields (name, phone, agency, role selection, etc.)
- **Now**: Only 3 fields - Email, Password, Confirm Password
- Auto-fills everything from invitation

### 2. **Smart Email Detection**
- When staff enter email, system automatically:
  - Checks if they were invited
  - Shows: "✅ Welcome back, [Name]! We found your invitation."
  - Hides all unnecessary fields
  - Pre-fills: Name, Agency, Role

### 3. **Updated Invitation Email**
- Link now includes email: `/login?view=sign-up&email=gizzy@guest-glow.com`
- Email pre-filled when they land on signup page
- Clear 4-step instructions

### 4. **Auto-Linking**
- After signup, staff record automatically linked (`staff.user_id = auth_user.id`)
- Correct `user_type` and `agency_id` set in profiles
- No manual intervention needed

---

## 🎯 Complete Flow

### **Admin Side:**
1. Navigate to Staff page
2. Click **"Invite Staff"** button
3. Fill form:
   - First Name: `Gizzy`
   - Last Name: `Basera`
   - Email: `gizzy@guest-glow.com`
   - Phone: `+44 7700 900200`
   - Role: `Registered Nurse`
4. Click **"Send Invitation"**
5. ✅ Email sent to `gizzy@guest-glow.com`

### **Staff Side:**

#### **Step 1: Receive Email**
Staff receives email with:
- **Subject**: "You're Invited to Join Dominion Healthcare"
- **Button**: "Create Your Account"
- **Link**: `http://localhost:5173/login?view=sign-up&email=gizzy@guest-glow.com`

#### **Step 2: Click Link → Simplified Signup**
When they click the link:
1. Lands on `/login?view=sign-up` with Sign Up tab active
2. **Email field pre-filled** with `gizzy@guest-glow.com`
3. System auto-detects invitation
4. Shows green banner: **"✅ Welcome back, Gizzy Basera! We found your invitation."**
5. **Only 3 fields visible:**
   - ~~Email~~ (pre-filled, can't change)
   - Password
   - Confirm Password
   - Terms checkbox

#### **Step 3: Create Password & Submit**
1. Enter password (10+ chars, uppercase, lowercase, number, special char)
2. Confirm password
3. Accept terms
4. Click **"Create your account"**
5. ✅ Account created immediately (no confirmation email for invited users)

#### **Step 4: Auto-Redirect to ProfileSetup**
After signup:
1. Staff record linked: `staff.user_id = [new_auth_id]`
2. Profile created: `user_type='staff_member'`, `agency_id=[dominion_id]`
3. **Auto-redirect to ProfileSetup** to complete onboarding:
   - Upload profile photo ⚠️ MANDATORY
   - Add personal details
   - Add 2+ references
   - Employment history
   - Emergency contact
   - Occupational health clearance

#### **Step 5: Complete Onboarding**
1. Fill all required fields
2. Click **"Save Changes"**
3. ✅ `staff.status` updated to `'active'`
4. **Auto-redirect to StaffPortal**
5. Ready to accept shifts!

---

## 🔧 Required Supabase Configuration

**IMPORTANT**: You must disable email confirmation for invited users in Supabase settings:

### Option 1: Disable Email Confirmation (Recommended for Development)

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf
2. Navigate to: **Authentication** → **Providers** → **Email**
3. Toggle OFF: **"Confirm email"**
4. Save changes

**Effect**: All signups work immediately without confirmation email

### Option 2: Keep Email Confirmation ON (Production - Requires Extra Work)

If you want to keep email confirmation for security:

1. **Invited users**: Need to check their email and click confirmation link BEFORE logging in
2. **Flow becomes**: Invite → Signup → **Check Email** → **Click Confirm Link** → Login → ProfileSetup

**Current Implementation**: Code tries to skip confirmation for invited users, but Supabase always sends confirmation if enabled in settings.

---

## 📋 What Staff See on Signup Page

### **Invited User (gizzy@guest-glow.com)**
```
┌─────────────────────────────────────┐
│ Create your ACG StaffLink tenant    │
├─────────────────────────────────────┤
│ Sign in | Sign up | Forgot          │
├─────────────────────────────────────┤
│ Work email                          │
│ gizzy@guest-glow.com [pre-filled]   │
│ ✅ Welcome back, Gizzy Basera!      │
│    We found your invitation.        │
│                                     │
│ Password            Confirm password│
│ [__________]        [__________]    │
│                                     │
│ ☑ I agree to Terms and Privacy      │
│                                     │
│ [Create your account]               │
└─────────────────────────────────────┘
```

### **Non-Invited User (random@example.com)**
```
┌─────────────────────────────────────┐
│ Create your ACG StaffLink tenant    │
├─────────────────────────────────────┤
│ Work email                          │
│ alex@example.com                    │
│                                     │
│ Password            Confirm password│
│ [__________]        [__________]    │
│                                     │
│ Full name                           │
│ [_____________________________]     │
│                                     │
│ Organisation / Agency               │
│ [_____________________________]     │
│                                     │
│ Direct line                         │
│ [_____________________________]     │
│                                     │
│ Role / Access level                 │
│ ○ Agency Admin                      │
│ ○ Staff User                        │
│ ○ Client User                       │
│                                     │
│ ☑ I agree to Terms and Privacy      │
│                                     │
│ [Create enterprise account]         │
└─────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

- [ ] Invite staff via UI
- [ ] Check email inbox for invitation
- [ ] Click "Create Your Account" button
- [ ] Verify email is pre-filled
- [ ] Verify green detection banner shows
- [ ] Verify ONLY password fields visible (no name/phone/agency fields)
- [ ] Create password and signup
- [ ] Check if confirmation email sent (depends on Supabase setting)
- [ ] Verify auto-redirect to ProfileSetup
- [ ] Complete profile setup
- [ ] Verify redirect to StaffPortal
- [ ] Check database: `staff.user_id` should be set
- [ ] Check database: `staff.status` should be `'active'`

---

## 🐛 Troubleshooting

### Issue: "Staff still see all the fields (name, phone, agency, etc.)"
**Cause**: Email not pre-filled from URL or detection not working
**Fix**: Make sure invitation link includes `&email=` parameter

### Issue: "Confirmation email still being sent"
**Cause**: Supabase has "Confirm email" enabled in settings
**Fix**: Disable in Supabase Dashboard → Authentication → Providers → Email

### Issue: "Staff can't login after signup"
**Cause**: Email not confirmed (if confirmation is ON)
**Fix**: Either disable confirmation OR have staff check email and click confirm link

### Issue: "Staff record not linked (user_id is null)"
**Cause**: Auto-linking failed after signup
**Fix**: Check browser console for errors. Should see: "✅ Staff record linked to user: [uuid]"

### Issue: "Staff see 'pending' user type after signup"
**Cause**: Profile not created with correct user_type
**Fix**: Check `ensureUserProfile` is called with `userType: 'staff_member'`

---

## 📊 Database States

### After Admin Invites Staff:
```sql
-- staff table
SELECT id, first_name, last_name, email, role, status, user_id, agency_id
FROM staff
WHERE email = 'gizzy@guest-glow.com';

-- Result:
id: [uuid]
first_name: 'Gizzy'
last_name: 'Basera'
email: 'gizzy@guest-glow.com'
role: 'nurse'
status: 'onboarding'
user_id: NULL  ← Not linked yet
agency_id: [dominion_agency_id]
```

### After Staff Signup:
```sql
-- auth.users table (Supabase Auth)
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE email = 'gizzy@guest-glow.com';

-- Result:
id: [new_uuid]
email: 'gizzy@guest-glow.com'
email_confirmed_at: NULL or [timestamp] (depends on setting)

-- profiles table
SELECT id, email, user_type, agency_id, full_name
FROM profiles
WHERE email = 'gizzy@guest-glow.com';

-- Result:
id: [same_as_auth_id]
email: 'gizzy@guest-glow.com'
user_type: 'staff_member'
agency_id: [dominion_agency_id]
full_name: 'Gizzy Basera'

-- staff table (UPDATED)
SELECT id, user_id, status
FROM staff
WHERE email = 'gizzy@guest-glow.com';

-- Result:
id: [original_staff_id]
user_id: [same_as_auth_id]  ← NOW LINKED!
status: 'onboarding'  ← Still onboarding until ProfileSetup complete
```

### After ProfileSetup Complete:
```sql
SELECT id, user_id, status, profile_photo_url
FROM staff
WHERE email = 'gizzy@guest-glow.com';

-- Result:
status: 'active'  ← NOW ACTIVE!
profile_photo_url: 'https://...'  ← Photo uploaded
```

---

## 🎉 Success Criteria

✅ Staff receive invitation email within seconds
✅ Email link pre-fills email on signup page
✅ Green detection banner appears
✅ Only 3 fields visible (email + 2 passwords)
✅ Signup works without errors
✅ Auto-redirect to ProfileSetup
✅ `staff.user_id` auto-linked in database
✅ Profile has correct `user_type='staff_member'`
✅ After ProfileSetup, redirect to StaffPortal
✅ Staff can browse shifts and accept them

---

**Next Steps**: Test the flow end-to-end and let me know if any issues!
