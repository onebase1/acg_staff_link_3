# Step 8 FIX - Update User Types

⏱️ **Time:** 2 minutes

**What happened:** Step 8 SQL had wrong column name, so users are stuck as "pending"

---

## DO THIS:

1. Go to Supabase SQL Editor
2. Run this fix:

```sql
-- Fix user_type AND add proper names
UPDATE profiles
SET
  user_type = 'client',
  full_name = CASE email
    WHEN 'g.basera5+ops_manager@gmail.com' THEN 'John Operations'
    WHEN 'g.basera5+finance@gmail.com' THEN 'Sarah Finance'
    WHEN 'g.basera5+coordinator@gmail.com' THEN 'Mike Coordinator'
    WHEN 'g.basera5+viewonly@gmail.com' THEN 'View Only'
  END
WHERE email IN (
  'g.basera5+ops_manager@gmail.com',
  'g.basera5+finance@gmail.com',
  'g.basera5+coordinator@gmail.com',
  'g.basera5+viewonly@gmail.com'
);
```

3. Verify it worked:

```sql
SELECT email, user_type, client_id
FROM profiles
WHERE email LIKE 'g.basera5+%@gmail.com'
  AND email IN (
    'g.basera5+ops_manager@gmail.com',
    'g.basera5+finance@gmail.com',
    'g.basera5+coordinator@gmail.com',
    'g.basera5+viewonly@gmail.com'
  );
```

You should see all 4 with `user_type = 'client'`

---

✅ **You're done when:** All 4 show "client" (not "pending")

🎯 **Then:** Try Step 10 again (login as ops_manager)
