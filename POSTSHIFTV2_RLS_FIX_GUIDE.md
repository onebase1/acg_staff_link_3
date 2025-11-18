# PostShiftV2 RLS Fix Guide

**Date:** 2025-11-18  
**Issue:** RLS policies blocking client data access in PostShiftV2

---

## 🐛 ROOT CAUSE

The console errors show:
```
[getAvailableRoles] No client or rates_by_role
```

**Why?** RLS policies on `clients` table require:
1. User is super admin (`is_super_admin()`) ✅
2. OR client's `agency_id` matches user's `agency_id` ❌ (NULL)
3. OR client's `id` matches user's `client_id` ❌ (NULL)

**Problem:** Your profile (`g.basera@yahoo.com`) likely has `agency_id = NULL`, so RLS blocks all client queries.

---

## 🔍 DIAGNOSIS STEPS

### **Step 1: Check Your Profile**
Run this in **Supabase SQL Editor**:

```sql
-- Check if your profile has agency_id set
SELECT 
  id,
  email,
  user_type,
  agency_id,
  client_id,
  full_name
FROM profiles
WHERE email = 'g.basera@yahoo.com';
```

**Expected Result:**
- `user_type` should be `'super_admin'` or `'agency_admin'`
- `agency_id` should be a valid agency ID (e.g., `'acg-123...'`)
- `client_id` should be `NULL`

**If `agency_id` is NULL → This is the problem!**

---

### **Step 2: Check If Agency Exists**
```sql
-- Check if agency exists for your email
SELECT 
  id,
  name,
  contact_email,
  status
FROM agencies
WHERE contact_email = 'g.basera@yahoo.com';
```

**Expected Result:**
- Should return 1 agency with your email
- If no results → Agency doesn't exist yet

---

### **Step 3: Test RLS Helper Functions**
```sql
-- Test if RLS functions work
SELECT 
  is_super_admin() as is_super_admin,
  get_user_agency_id() as user_agency_id,
  is_agency_admin() as is_agency_admin;
```

**Expected Result:**
- `is_super_admin` = `true` (if email is g.basera@yahoo.com)
- `user_agency_id` = valid agency ID (NOT NULL)
- `is_agency_admin` = `true`

**If `user_agency_id` is NULL → Profile not linked to agency!**

---

## ✅ FIX: Link Profile to Agency

### **Option 1: Automatic Fix (Recommended)**
Run the provided SQL script: `fix_profile_agency_link.sql`

**What it does:**
1. Finds your profile in `auth.users`
2. Checks if agency exists for `g.basera@yahoo.com`
3. Creates agency if missing
4. Updates your profile with `agency_id` and `user_type='super_admin'`

**How to run:**
1. Open **Supabase SQL Editor**
2. Copy contents of `fix_profile_agency_link.sql`
3. Click **Run**
4. Check output for success message

---

### **Option 2: Manual Fix**
If you already have an agency, just link your profile:

```sql
-- Get your agency ID
SELECT id FROM agencies WHERE contact_email = 'g.basera@yahoo.com';

-- Update your profile (replace 'YOUR_AGENCY_ID' with actual ID)
UPDATE profiles
SET 
  agency_id = 'YOUR_AGENCY_ID',
  user_type = 'super_admin',
  client_id = NULL
WHERE email = 'g.basera@yahoo.com';
```

---

## 🧪 VERIFY THE FIX

### **Test 1: Check Profile Updated**
```sql
SELECT 
  p.email,
  p.user_type,
  p.agency_id,
  a.name as agency_name
FROM profiles p
LEFT JOIN agencies a ON p.agency_id = a.id
WHERE p.email = 'g.basera@yahoo.com';
```

**Expected:**
- `agency_id` is NOT NULL ✅
- `agency_name` shows your agency ✅

---

### **Test 2: Check Client Access**
```sql
-- This should now return clients
SELECT 
  id,
  name,
  agency_id,
  status
FROM clients
WHERE agency_id = (SELECT agency_id FROM profiles WHERE email = 'g.basera@yahoo.com')
LIMIT 5;
```

**Expected:**
- Returns list of clients ✅
- If empty → No clients exist yet (create some in /clients page)

---

### **Test 3: Test PostShiftV2**
1. **Refresh the page** (http://localhost:5174/)
2. **Open browser console** (F12)
3. **Select a care home**
4. **Check console logs:**

**Expected:**
```
🔍 [getAvailableRoles] Client rates: {
  clientName: "Divine Care Center",
  ratesByRole: { nurse: {...}, healthcare_assistant: {...} },
  totalStaffRoles: 5
}
✅ [getAvailableRoles] Available roles: 2 ["nurse", "healthcare_assistant"]
```

**If still seeing errors:**
- Check if clients have `agency_id` matching your profile's `agency_id`
- Run: `SELECT id, name, agency_id FROM clients;`
- Update clients if needed: `UPDATE clients SET agency_id = 'YOUR_AGENCY_ID' WHERE agency_id IS NULL;`

---

## 📋 FILES PROVIDED

1. **`check_profile_agency.sql`** - Diagnostic queries
2. **`fix_profile_agency_link.sql`** - Automatic fix script
3. **`POSTSHIFTV2_RLS_FIX_GUIDE.md`** - This guide

---

## 🎯 SUMMARY

**Problem:** Profile not linked to agency → RLS blocks client access  
**Solution:** Link profile to agency using provided SQL script  
**Result:** PostShiftV2 can now query clients and show available roles  

**After fix:**
- ✅ Clients dropdown works
- ✅ Roles dropdown shows correct roles
- ✅ Create button activates when all fields filled

