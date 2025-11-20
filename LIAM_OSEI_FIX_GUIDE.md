# Fix Liam Osei's Orphaned Account

**Date:** 2025-11-20  
**User:** Liam Osei (g.basera5+liam@gmail.com)  
**Issue:** Account created via password reset workaround, not linked to Dominion agency  
**Status:** ⚠️ PENDING FIX

---

## 🎯 Problem Summary

Liam Osei has:
- ✅ **Confirmed shift** in the system
- ✅ **Auth account** (created via "forgot password" workaround)
- ❌ **Profile showing "awaiting approval"** (user_type = 'pending')
- ❌ **No association with Dominion agency**
- ❌ **No access to Staff Portal**

**Root Cause:**  
User bypassed normal invite flow by using password reset, so the database trigger didn't link them to their staff record.

---

## 🛠️ Solution Options

### **Option 1: Use Admin Workflows UI** (Recommended - Safest)

This uses the built-in approval system you already have.

#### Steps:

1. **Log in as Super Admin**
   - Email: g.basera@yahoo.com
   - Navigate to: **Admin Workflows** page

2. **Look for Pending User Workflow**
   - Search for: **"New User Signup: Liam Osei"**
   - Status: Pending

3. **If Workflow Exists:**
   - Click green **"Approve"** button
   - **Agency**: Select "Dominion" (or correct agency name)
   - **Role**: Select "Staff Member"
   - **Notes** (optional): "Linking orphaned user to existing shift"
   - Click **"Approve User"**
   - ✅ **Done!** User can now access Staff Portal

4. **If NO Workflow Exists:**
   - Proceed to **Option 2** below

---

### **Option 2: Manual Database Fix** (Faster if no workflow)

Use this if there's no workflow in the Admin UI.

#### Prerequisites:
- Access to Supabase SQL Editor
- Super admin permissions

#### Steps:

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/[your-project-id]/sql
   - Or use local SQL client

2. **Run the SQL Script**
   - Open file: `fix_liam_osei_account.sql`
   - Execute each section **one at a time**
   - Follow the instructions in the comments

3. **Key Steps in the Script:**

   **A. Find User's Auth ID**
   ```sql
   SELECT au.id, au.email, p.user_type, p.agency_id
   FROM auth.users au
   LEFT JOIN profiles p ON p.id = au.id
   WHERE au.email = 'g.basera5+liam@gmail.com';
   ```
   - Copy the `id` value (this is `[AUTH_USER_ID]`)

   **B. Find Dominion Agency ID**
   ```sql
   SELECT id, name FROM agencies WHERE name ILIKE '%dominion%';
   ```
   - Copy the `id` value (this is `[DOMINION_AGENCY_ID]`)

   **C. Check if Staff Record Exists**
   ```sql
   SELECT id, first_name, last_name, email, user_id, status
   FROM staff
   WHERE email = 'g.basera5+liam@gmail.com';
   ```

   **D. If Staff Record EXISTS:**
   ```sql
   UPDATE staff
   SET user_id = '[AUTH_USER_ID]', status = 'active'
   WHERE email = 'g.basera5+liam@gmail.com';
   ```

   **E. If NO Staff Record:**
   ```sql
   INSERT INTO staff (user_id, agency_id, first_name, last_name, email, phone, status, role, employment_type)
   VALUES ('[AUTH_USER_ID]', '[DOMINION_AGENCY_ID]', 'Liam', 'Osei', 'g.basera5+liam@gmail.com', '+447901685907', 'active', 'healthcare_assistant', 'temporary');
   ```

   **F. Update Profile**
   ```sql
   UPDATE profiles
   SET user_type = 'staff_member', agency_id = '[DOMINION_AGENCY_ID]', full_name = 'Liam Osei'
   WHERE id = '[AUTH_USER_ID]';
   ```

4. **Verify the Fix**
   ```sql
   SELECT au.email, p.user_type, a.name as agency_name, s.status as staff_status
   FROM auth.users au
   LEFT JOIN profiles p ON p.id = au.id
   LEFT JOIN agencies a ON a.id = p.agency_id
   LEFT JOIN staff s ON s.user_id = au.id
   WHERE au.email = 'g.basera5+liam@gmail.com';
   ```

   **Expected Result:**
   - ✅ `user_type`: staff_member
   - ✅ `agency_name`: Dominion [Agency Name]
   - ✅ `staff_status`: active

---

## ✅ Post-Fix Verification

After applying either option:

1. **Ask Liam to Log In**
   - Email: g.basera5+liam@gmail.com
   - Password: [their password]

2. **Expected Behavior:**
   - ✅ No "awaiting approval" banner
   - ✅ Redirected to **Staff Portal**
   - ✅ Can see their confirmed shift
   - ✅ Can access profile, timesheets, etc.

3. **If Still Showing "Awaiting Approval":**
   - Clear browser cache
   - Log out and log back in
   - Check profile in database again

---

## 🔍 Troubleshooting

### Issue: "User still sees awaiting approval"
**Fix:** Clear browser cache or use incognito mode

### Issue: "Staff record not found"
**Fix:** Create staff record using STEP 4B in SQL script

### Issue: "Agency not found"
**Fix:** Verify agency name spelling, check agencies table

### Issue: "RLS policy error"
**Fix:** Ensure you're running SQL as service_role or super admin

---

## 📝 Prevention for Future

To prevent this issue in the future:

1. **Always use proper invite flow:**
   - Admin creates staff record first
   - System sends invite email
   - User clicks link and sets password

2. **If user needs password reset:**
   - Check if staff record exists first
   - If yes, manually link before sending reset email

3. **Monitor Admin Workflows:**
   - Check for "New User Signup" workflows regularly
   - Approve or reject within 24 hours

---

## 🎉 Summary

**Recommended Path:** Option 1 (Admin Workflows UI)  
**Fallback Path:** Option 2 (Manual SQL)  
**Time Required:** 2-5 minutes  
**Risk Level:** Low (both methods are safe)

Once fixed, Liam will have full access to the Staff Portal and can manage their confirmed shift.

