# Step 8 - Assign Roles via SQL

⏱️ **Time:** 5 minutes

---

## DO THIS:

1. In SQL Editor, click **"New query"**
2. Paste this SQL (replace UUIDs with yours from Step 7):

```sql
DO $$
DECLARE
  ops_id UUID := 'PASTE_OPS_MANAGER_UUID_HERE';
  finance_id UUID := 'PASTE_FINANCE_MANAGER_UUID_HERE';
  coord_id UUID := 'PASTE_COORDINATOR_UUID_HERE';
  view_id UUID := 'PASTE_VIEWONLY_UUID_HERE';
  client_uuid UUID := 'f679e93f-97d8-4697-908a-e165f22e322a';
BEGIN
  INSERT INTO profiles (id, role, first_name, last_name, email, client_id)
  VALUES
    (ops_id, 'client', 'John', 'Operations', 'g.basera5+ops_manager@gmail.com', client_uuid),
    (finance_id, 'client', 'Sarah', 'Finance', 'g.basera5+finance@gmail.com', client_uuid),
    (coord_id, 'client', 'Mike', 'Coordinator', 'g.basera5+coordinator@gmail.com', client_uuid),
    (view_id, 'client', 'View', 'Only', 'g.basera5+viewonly@gmail.com', client_uuid)
  ON CONFLICT (id) DO UPDATE SET client_id = EXCLUDED.client_id;

  INSERT INTO client_contacts (
    client_id, profile_id, role, first_name, last_name, email,
    job_title, is_primary_contact, is_active
  ) VALUES
    (client_uuid, ops_id, 'OPERATIONS_MANAGER', 'John', 'Operations',
     'g.basera5+ops_manager@gmail.com', 'Operations Manager', true, true),
    (client_uuid, finance_id, 'FINANCE_MANAGER', 'Sarah', 'Finance',
     'g.basera5+finance@gmail.com', 'Finance Manager', false, true),
    (client_uuid, coord_id, 'FACILITY_COORDINATOR', 'Mike', 'Coordinator',
     'g.basera5+coordinator@gmail.com', 'Facility Coordinator', false, true),
    (client_uuid, view_id, 'VIEW_ONLY_CONTACT', 'View', 'Only',
     'g.basera5+viewonly@gmail.com', 'Observer', false, true)
  ON CONFLICT (client_id, profile_id) DO UPDATE SET is_active = true;
END $$;
```

3. Click **"Run"**

---

✅ **You're done when:** You see "Success. No rows returned"

🎯 **Come back for Step 9**
