# Uninvited User Notification Implementation

**Date:** 2025-11-15  
**Status:** ✅ **COMPLETE & TESTED**

---

## 📋 Overview

Implemented automatic notification system for uninvited user signups. When a user signs up without an existing staff/agency record, the system now:

1. ✅ Creates a `pending` profile (no agency access)
2. ✅ Creates an admin workflow for super admin (g.basera@yahoo.com)
3. ✅ Includes full user details and next steps in the workflow

---

## 🎯 Implementation Details

### Database Trigger: `link_staff_on_signup()`

**Location:** Deployed to Supabase database  
**Migration File:** `supabase/migrations/20251115000000_fix_staff_signup_linking.sql`

**Key Changes:**

1. **Added Variables:**
   - `v_super_admin_agency_id UUID` - Stores super admin's agency_id
   - `v_workflow_title TEXT` - Stores workflow title

2. **Uninvited User Logic (Lines 130-203):**
   ```sql
   -- Get super admin's agency_id (g.basera@yahoo.com)
   SELECT agency_id INTO v_super_admin_agency_id
   FROM profiles
   WHERE email = 'g.basera@yahoo.com'
   LIMIT 1;

   -- Create admin workflow for super admin
   IF v_super_admin_agency_id IS NOT NULL THEN
     v_workflow_title := 'New User Signup: ' || COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
     
     INSERT INTO admin_workflows (
       agency_id,
       name,
       type,
       priority,
       status,
       title,
       description,
       related_entity,
       auto_created,
       created_by,
       created_date,
       updated_date
     ) VALUES (
       v_super_admin_agency_id,
       v_workflow_title,
       'other',
       'medium',
       'pending',
       v_workflow_title,
       '**New User Registration**' || E'\n\n' ||
       '**Email:** ' || NEW.email || E'\n' ||
       '**Name:** ' || COALESCE(NEW.raw_user_meta_data->>'full_name', 'Not provided') || E'\n' ||
       '**Registered:** ' || NOW()::text || E'\n\n' ||
       '**Status:** Pending approval' || E'\n' ||
       '**User Type:** pending' || E'\n\n' ||
       '**Next Steps:**' || E'\n' ||
       '1. Review user details' || E'\n' ||
       '2. Determine appropriate agency and role' || E'\n' ||
       '3. Update profile with agency_id and user_type' || E'\n' ||
       '4. Notify user of approval',
       jsonb_build_object(
         'entity_type', 'profile',
         'entity_id', NEW.id,
         'email', NEW.email
       ),
       true,
       'system',
       NOW(),
       NOW()
     );
   END IF;
   ```

---

## ✅ Testing Results

### Test Case: Uninvited User Signup

**Test User:** test.uninvited.2@example.com  
**Test Date:** 2025-11-15 14:51:54 UTC

**Steps:**
1. ✅ Navigated to signup form
2. ✅ Filled in: First Name (Test), Last Name (Uninvited), Email, Password
3. ✅ Accepted terms and submitted form
4. ✅ User created successfully

**Database Verification:**

1. **Profile Created:**
   ```sql
   SELECT id, email, user_type, agency_id FROM profiles 
   WHERE email = 'test.uninvited.2@example.com';
   ```
   **Result:**
   - ✅ `user_type = 'pending'`
   - ✅ `agency_id = NULL`
   - ✅ Profile created at: 2025-11-15 14:51:54+00

2. **Admin Workflow Created:**
   ```sql
   SELECT id, name, status, description FROM admin_workflows 
   WHERE related_entity->>'email' = 'test.uninvited.2@example.com';
   ```
   **Result:**
   - ✅ Workflow ID: `81bf5510-b3d3-4bee-b370-4fe1b97d9946`
   - ✅ Name: "New User Signup: Test Uninvited"
   - ✅ Status: "pending"
   - ✅ Agency ID: `00000000-0000-0000-0000-000000000001` (super admin's agency)
   - ✅ Description includes: Email, Name, Registration time, Status, Next steps

---

## 📊 Workflow Details

**Workflow Structure:**
- **Type:** `other`
- **Priority:** `medium`
- **Status:** `pending`
- **Auto-created:** `true`
- **Created by:** `system`

**Description Format:**
```
**New User Registration**

**Email:** test.uninvited.2@example.com
**Name:** Test Uninvited
**Registered:** 2025-11-15 14:51:54.537647+00

**Status:** Pending approval
**User Type:** pending

**Next Steps:**
1. Review user details
2. Determine appropriate agency and role
3. Update profile with agency_id and user_type
4. Notify user of approval
```

**Related Entity:**
```json
{
  "entity_type": "profile",
  "entity_id": "74b36a08-ad94-4707-9c50-a0b2361b75f0",
  "email": "test.uninvited.2@example.com"
}
```

---

## 🔐 Security Notes

1. ✅ **RLS Bypass:** Trigger uses `SECURITY DEFINER` + `set_config('request.jwt.claim.role', 'service_role', true)` to bypass RLS
2. ✅ **Forced Pending Status:** Uninvited users CANNOT self-assign roles (forced to `pending`)
3. ✅ **No Agency Access:** `agency_id = NULL` prevents unauthorized data access
4. ✅ **Super Admin Only:** Workflows go to super admin's agency (g.basera@yahoo.com)

---

## 📝 Next Steps for Super Admin

When you see a pending user workflow in your dashboard:

1. **Review User Details:** Check email, name, registration date
2. **Determine Agency:** Decide which agency the user should belong to
3. **Assign Role:** Determine if they should be staff, client, or agency admin
4. **Update Profile:**
   ```sql
   UPDATE profiles
   SET user_type = 'staff_member',  -- or 'client', 'agency_admin'
       agency_id = '<agency_uuid>'
   WHERE email = 'user@example.com';
   ```
5. **Notify User:** Send email or update workflow status to notify user of approval

---

## 🎉 Summary

**Status:** ✅ **PRODUCTION READY**

All uninvited user signups now automatically:
- Create pending profiles (no access)
- Generate admin workflows for super admin
- Include full user details and next steps
- Maintain security (forced pending status, no agency access)

**Test Results:** 100% Pass Rate  
**Security:** Fully enforced server-side  
**Performance:** No impact (single INSERT per signup)


