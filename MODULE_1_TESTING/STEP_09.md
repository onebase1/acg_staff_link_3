# Step 9 - Verify Roles Assigned

⏱️ **Time:** 2 minutes

---

## DO THIS:

1. In SQL Editor, run this:
```sql
SELECT email, role FROM client_contacts
WHERE email LIKE 'g.basera5+%@gmail.com';
```

2. Verify you see:
   - ops_manager → OPERATIONS_MANAGER
   - finance → FINANCE_MANAGER
   - coordinator → FACILITY_COORDINATOR
   - viewonly → VIEW_ONLY_CONTACT

---

✅ **You're done when:** All 4 roles match

🎯 **Come back for Step 10**
