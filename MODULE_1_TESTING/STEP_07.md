# Step 7 - Get User IDs

⏱️ **Time:** 3 minutes

---

## DO THIS:

1. Click **"SQL Editor"** in left sidebar (looks like </> icon)
2. Click **"New query"**
3. Paste this:
```sql
SELECT id, email FROM auth.users
WHERE email LIKE 'g.basera5+%@gmail.com'
ORDER BY email;
```
4. Click **"Run"** (or press Ctrl+Enter)
5. Copy the 4 UUIDs you see

---

✅ **You're done when:** You have 4 UUIDs copied

🎯 **Come back for Step 8**
