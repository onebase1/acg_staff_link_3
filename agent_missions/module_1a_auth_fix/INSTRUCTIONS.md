# AGENT INSTRUCTIONS: MODULE 1A (AUTH & CORE FIXES)

**Role:** You are the AI Agent responsible for **Module 1A: Client Portal Core & Auth**.
**Objective:** Fix the "Orphaned User" issue and ensure smooth client onboarding via both Invite and Direct Signup flows.
**Inputs:** `SPECIFICATION.md` (Module 1), Codebase access.

---

## CONTEXT
The previous attempt at Module 1 failed because users signing up directly (not via invite) were not being linked to their Client Contact records. Additionally, the **Invite Client** and **Onboard Client** features are currently broken because they create a `clients` record but **fail to create a corresponding `client_contacts` record**. This means invited users also become orphans.

## MISSION CHECKLIST

### Phase 0: Fix Invite & Onboard Flows (CRITICAL PRE-REQUISITE)
**Goal:** Ensure that creating a client also creates a `client_contacts` record, which is the "anchor" for the auth fix.

1.  **Modify `src/components/clients/InviteClientModal.jsx`:**
    *   In `inviteClientMutation`, after inserting into `clients`, **IMMEDIATELY insert into `client_contacts`**.
    *   Fields to map: `client_id` (from new client), `name` (contact_person_name), `email` (contact_person_email), `role` (contact_person_role), `is_primary` (true).
    *   Ensure this happens *before* sending the email.

2.  **Modify `src/pages/OnboardClient.jsx`:**
    *   In `createClientMutation`, similar to above, insert into `client_contacts` after creating the client.
    *   Map the `contact_person` fields from `formData`.

### Phase 1: Database & RPC Setup
- [ ] **Apply Migration:** Run `supabase/migrations/20251203000000_link_client_contact_rpc.sql` (I created this for you).
- [ ] **Verify:** Check that the function `link_user_to_client_contact_by_email` exists in Supabase.

### Phase 2: Frontend Logic (ProfileSetup.jsx)
- [ ] **Modify `src/pages/ProfileSetup.jsx`:**
    - Add a call to `link_user_to_client_contact_by_email` inside the `useQuery` or `useEffect` (similar to how `link_user_to_staff_by_email` is called).
    - Logic:
        ```javascript
        // Pseudo-code
        const { data: clientLink } = await supabase.rpc('link_user_to_client_contact_by_email');
        if (clientLink) {
           // Auto-fill form
           // Set user_type = 'client_user'
           // Redirect to /ClientPortal if ready
        }
        ```
    - **Critical:** Ensure `handleSubmit` does NOT block client users if `agency_id` is missing (though the RPC attempts to fill it).
    - **UI:** If user is linked to a client, show "Welcome, [Name] from [Client Name]" instead of generic setup.

### Phase 3: Testing (The "Real World" Test)
**Do NOT use SQL to create test users. Use the App.**

1.  **Test Invite Flow:**
    *   Log in as Agency Admin.
    *   Click "Invite Client".
    *   Invite `test_invite_[random]@gmail.com`.
    *   **Verify:** Check Supabase `client_contacts` table. A record MUST exist for this email.
    *   **Signup:** Open Incognito window, click link in email (or just signup with that email).
    *   **Result:** Should auto-link and go to Portal.

2.  **Test Onboard Flow:**
    *   Click "Onboard Client".
    *   Complete wizard for "Test Care Home".
    *   **Verify:** Check `client_contacts` table.
    *   **Signup:** Signup with the contact email used.
    *   **Result:** Should auto-link and go to Portal.

### Phase 4: Documentation
- [ ] **Update `IMPLEMENTATION_NOTES.md`** with details of the fix.

---

**GO! Start with Phase 0.**
