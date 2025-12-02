# ⚡ QUICK FIX - Use Finance User as Ops Manager

**30 seconds - Just change the role**

---

## 🎯 DO THIS NOW:

1. Go to Supabase SQL Editor
2. Paste and run:

```sql
-- Change finance user to OPERATIONS_MANAGER role
UPDATE client_contacts
SET role = 'OPERATIONS_MANAGER'
WHERE email = 'g.basera5+finance@gmail.com';

-- Also update the name to make it clear
UPDATE profiles
SET full_name = 'Sarah Operations (was Finance)'
WHERE email = 'g.basera5+finance@gmail.com';
```

3. Click **Run**

---

## ✅ NOW LOGIN:

- **Email:** `g.basera5+finance@gmail.com`
- **Password:** `Broadband@123`

You'll see OPERATIONS_MANAGER role badge.

---

**Time:** 30 seconds
**This user already works** - we're just changing the role.
