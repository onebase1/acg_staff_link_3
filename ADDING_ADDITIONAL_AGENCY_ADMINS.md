# Adding Additional Agency Admins - Complete Guide

## Overview

This guide explains how to add additional administrators to existing agencies. Only **Super Admins** can add agency administrators.

## Current Situation

**dillatu93@gmail.com** has been successfully added as an additional admin for **Dominion Healthcare Services Ltd**.

Details:
- Auth User ID: `c6ae6c97-458d-488e-8792-b8d6cc6bbbe5`
- Invitation ID: `328b6d7e-6db8-4f6d-a740-5c0bb3c06bac`
- Password reset email sent
- Invitation expires: 7 days from creation

---

## The Flow: How Agency Admins Are Onboarded

### Role Hierarchy
1. **Super Admin** (`g.basera@yahoo.com`) - Platform owner
2. **Agency Admin** - Agency administrators (multiple per agency allowed)
3. **Staff Members** - Regular staff
4. **Pending** - Awaiting approval

### Security Model
- **Only Super Admin can create agency admins** (enforced by RLS policies)
- Agency admins **CANNOT** invite other agency admins
- New signups are auto-detected but require manual approval
- Profile type is forced server-side to prevent self-promotion

---

## Method 1: Using the New Edge Function (Programmatic)

A new Edge Function `add-additional-agency-admin` has been deployed for this purpose.

### JavaScript/TypeScript Example

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://rzzxxkppkiasuouuglaf.supabase.co',
  'SERVICE_ROLE_KEY_HERE'
)

// Step 1: Find the agency
const { data: agencies } = await supabase
  .from('agencies')
  .select('id, name')
  .ilike('name', '%dominion%')

const agencyId = agencies[0].id

// Step 2: Call the Edge Function
const { data, error } = await supabase.functions.invoke('add-additional-agency-admin', {
  body: {
    agencyId: agencyId,
    adminEmail: 'newadmin@example.com',
    adminName: 'New Admin Full Name'
  }
})

if (error) {
  console.error('Error:', error)
} else {
  console.log('Success!', data)
}
```

### CURL Example

```bash
curl -X POST \
  'https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/add-additional-agency-admin' \
  -H 'Authorization: Bearer SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "agencyId": "c8e84c94-8233-4084-b4c3-63ad9dc81c16",
    "adminEmail": "newadmin@example.com",
    "adminName": "New Admin Name"
  }'
```

---

## Method 2: Manual Database Approach (Quick)

If you need to add an admin immediately without writing code:

### Step 1: Find the Agency ID

```sql
-- Run in Supabase Dashboard > SQL Editor
SELECT id, name FROM agencies WHERE name ILIKE '%agency name%';
```

### Step 2: Create Auth User via Dashboard

1. Go to **Supabase Dashboard > Authentication > Users**
2. Click **Add User**
3. Enter email: `newadmin@example.com`
4. Check **"Auto Confirm User"** (optional)
5. In **User Metadata**, add:
   ```json
   {
     "invited_role": "agency_admin",
     "invited_agency_id": "AGENCY_ID_FROM_STEP_1",
     "full_name": "Admin Name"
   }
   ```
6. Click **Create User**

### Step 3: Update Profile (Auto-created by trigger)

The profile should be auto-created by the `on_auth_user_created` trigger. Verify:

```sql
SELECT id, email, user_type, agency_id, full_name
FROM profiles
WHERE email = 'newadmin@example.com';
```

If not created or incorrect:

```sql
UPDATE profiles
SET user_type = 'agency_admin',
    agency_id = 'AGENCY_ID_FROM_STEP_1',
    full_name = 'Admin Full Name'
WHERE email = 'newadmin@example.com';
```

### Step 4: Send Password Reset Email

In Supabase Dashboard > Authentication > Users:
1. Find the user
2. Click the three dots menu
3. Select **"Send password recovery"**

---

## Method 3: Script Approach (Reusable)

Save this script as `add-agency-admin.mjs` for future use:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function addAgencyAdmin(agencyName, adminEmail, adminName) {
  // Find agency
  const { data: agencies, error: agencyError } = await supabase
    .from('agencies')
    .select('id, name')
    .ilike('name', `%${agencyName}%`)
    .limit(1)

  if (agencyError || !agencies.length) {
    throw new Error(`Agency not found: ${agencyName}`)
  }

  const agency = agencies[0]
  console.log(`Found agency: ${agency.name} (${agency.id})`)

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    email_confirm: false,
    user_metadata: {
      invited_role: 'agency_admin',
      invited_agency_id: agency.id,
      full_name: adminName
    }
  })

  if (authError) throw authError

  console.log(`✅ Auth user created: ${authData.user.id}`)

  // Send password reset
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(adminEmail, {
    redirectTo: 'https://your-app-url.com/reset-password'
  })

  if (resetError) {
    console.warn('⚠️ Password reset email failed:', resetError)
  } else {
    console.log('📧 Password reset email sent')
  }

  // Create invitation record
  await supabase.from('agency_admin_invitations').insert({
    agency_id: agency.id,
    email: adminEmail,
    status: 'pending',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  })

  console.log('🎉 SUCCESS!')
  console.log(`   Email: ${adminEmail}`)
  console.log(`   Agency: ${agency.name}`)
  console.log(`   User ID: ${authData.user.id}`)
}

// Usage
addAgencyAdmin('Dominion', 'newadmin@example.com', 'New Admin Name')
  .catch(console.error)
```

Run with:
```bash
node add-agency-admin.mjs
```

---

## Future UI Enhancement (Optional)

To add this to the Super Admin UI, add this section to [SuperAdminAgencyOnboarding.jsx](src/pages/SuperAdminAgencyOnboarding.jsx):

```jsx
{/* Add between "Create Agency" card and "Recent Agencies" card */}
<Card className="border-2 border-blue-200">
  <CardHeader className="bg-blue-50 border-b">
    <CardTitle className="flex items-center gap-2">
      <Users className="w-5 h-5 text-blue-600" />
      Add Additional Admin to Existing Agency
    </CardTitle>
  </CardHeader>
  <CardContent className="p-6">
    <form onSubmit={handleAddAdditionalAdmin} className="space-y-4">
      <div>
        <Label htmlFor="select-agency">Select Agency *</Label>
        <Select value={additionalAdminForm.agencyId} onValueChange={(val) => setAdditionalAdminForm(prev => ({ ...prev, agencyId: val }))}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an agency..." />
          </SelectTrigger>
          <SelectContent>
            {agencies.map(agency => (
              <SelectItem key={agency.id} value={agency.id}>
                {agency.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="additional-admin-email">Admin Email *</Label>
        <Input
          id="additional-admin-email"
          type="email"
          value={additionalAdminForm.adminEmail}
          onChange={(e) => setAdditionalAdminForm(prev => ({ ...prev, adminEmail: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="additional-admin-name">Admin Name</Label>
        <Input
          id="additional-admin-name"
          value={additionalAdminForm.adminName}
          onChange={(e) => setAdditionalAdminForm(prev => ({ ...prev, adminName: e.target.value }))}
        />
      </div>
      <Button type="submit">
        <UserPlus className="w-4 h-4 mr-2" />
        Send Invitation
      </Button>
    </form>
  </CardContent>
</Card>
```

---

## Verification Checklist

After adding a new admin:

1. **Check Auth User**
   ```sql
   SELECT id, email, email_confirmed_at, user_metadata
   FROM auth.users
   WHERE email = 'newadmin@example.com';
   ```

2. **Check Profile**
   ```sql
   SELECT id, email, user_type, agency_id, full_name
   FROM profiles
   WHERE email = 'newadmin@example.com';
   ```

3. **Check Invitation Record**
   ```sql
   SELECT id, email, agency_id, status, expires_at
   FROM agency_admin_invitations
   WHERE email = 'newadmin@example.com'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

4. **Verify they received the email**
   - Check spam folder
   - Resend if needed (see Method 2, Step 4)

---

## Troubleshooting

### User created but no profile
Run the profile creation trigger manually:
```sql
INSERT INTO profiles (id, email, user_type, agency_id, full_name)
SELECT
  id,
  email,
  'agency_admin',
  'AGENCY_ID_HERE',
  user_metadata->>'full_name'
FROM auth.users
WHERE email = 'newadmin@example.com'
ON CONFLICT (id) DO UPDATE
SET user_type = 'agency_admin',
    agency_id = 'AGENCY_ID_HERE';
```

### Email not received
Send manually via Dashboard or run:
```javascript
await supabase.auth.resetPasswordForEmail('newadmin@example.com', {
  redirectTo: 'https://your-app-url.com/reset-password'
})
```

### Profile has wrong agency_id
```sql
UPDATE profiles
SET agency_id = 'CORRECT_AGENCY_ID'
WHERE email = 'newadmin@example.com';
```

---

## Security Notes

- All invitation creation is logged in `agency_admin_invitations` table
- RLS policies prevent agency admins from creating other admins
- Only super admin (`g.basera@yahoo.com`) can run these operations
- Service role key should NEVER be exposed in frontend code
- Password reset links expire after 1 hour (Supabase default)
- Invitation records expire after 7 days

---

## Next Steps

1. **Test the new admin**: Have `dillatu93@gmail.com` check their email and set their password
2. **Add UI (optional)**: Implement the UI enhancement section above
3. **Document internally**: Share this guide with your team
4. **Monitor**: Check invitation status in Super Admin dashboard

---

## Quick Reference: Agency IDs

```sql
-- List all agencies with their IDs
SELECT
  id,
  name,
  email,
  status,
  created_date
FROM agencies
ORDER BY name;
```

**Dominion Healthcare Services Ltd**
- ID: `c8e84c94-8233-4084-b4c3-63ad9dc81c16`
- Current Admins:
  - `info@guest-glow.com` (Primary)
  - `dillatu93@gmail.com` (Additional - Just Added)

---

## Contact

For issues or questions about agency admin management, contact the super admin at `g.basera@yahoo.com`.
