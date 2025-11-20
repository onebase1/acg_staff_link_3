# Quick Fix: Liam Osei Account

**User:** g.basera5+liam@gmail.com  
**Issue:** Orphaned account, not linked to Dominion agency  
**Fix Time:** 2 minutes

---

## 🚀 Fastest Method (UI)

1. Log in as **g.basera@yahoo.com**
2. Go to **Admin Workflows**
3. Find: **"New User Signup: Liam Osei"**
4. Click **"Approve"** button
5. Select:
   - **Agency:** Dominion
   - **Role:** Staff Member
6. Click **"Approve User"**
7. ✅ Done!

---

## 🔧 Alternative Method (SQL)

If no workflow exists, run this in Supabase SQL Editor:

```sql
-- 1. Get user ID
SELECT id FROM auth.users WHERE email = 'g.basera5+liam@gmail.com';
-- Copy the ID

-- 2. Get Dominion agency ID
SELECT id FROM agencies WHERE name ILIKE '%dominion%';
-- Copy the ID

-- 3. Update profile (replace [USER_ID] and [AGENCY_ID])
UPDATE profiles
SET user_type = 'staff_member',
    agency_id = '[AGENCY_ID]',
    full_name = 'Liam Osei'
WHERE id = '[USER_ID]';

-- 4. Link or create staff record
-- If staff record exists:
UPDATE staff
SET user_id = '[USER_ID]', status = 'active'
WHERE email = 'g.basera5+liam@gmail.com';

-- If NO staff record:
INSERT INTO staff (user_id, agency_id, first_name, last_name, email, phone, status, role, employment_type)
VALUES ('[USER_ID]', '[AGENCY_ID]', 'Liam', 'Osei', 'g.basera5+liam@gmail.com', '+447901685907', 'active', 'healthcare_assistant', 'temporary');
```

---

## ✅ Verify

```sql
SELECT 
  au.email,
  p.user_type,
  a.name as agency,
  s.status
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN agencies a ON a.id = p.agency_id
LEFT JOIN staff s ON s.user_id = au.id
WHERE au.email = 'g.basera5+liam@gmail.com';
```

**Expected:**
- user_type: `staff_member`
- agency: `Dominion [Name]`
- status: `active`

---

## 📞 Test

Ask Liam to:
1. Log in: g.basera5+liam@gmail.com
2. Should see: **Staff Portal** (not "awaiting approval")
3. Should see: Their confirmed shift

---

**Full Guide:** See `LIAM_OSEI_FIX_GUIDE.md`  
**SQL Script:** See `fix_liam_osei_account.sql`

