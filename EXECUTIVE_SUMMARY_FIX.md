# EXECUTIVE SUMMARY: MODULE 1 RESCUE PLAN

## The Issue: "Orphaned Users"
Users who signed up directly (without clicking an invite link) were getting stuck.
*   **Why:** The system created a User account but didn't know which Client Company they belonged to.
*   **Result:** They landed on a generic "Profile Setup" page that asked for an Agency ID (which they don't know), causing the "Select Agency" error.

## The Fix: "Auto-Link" Logic
I have designed a new "Safety Net" mechanism:
1.  **The Matchmaker:** I created a new database function (`link_user_to_client_contact_by_email`).
2.  **How it works:**
    *   When *any* user lands on the Profile Setup page, the system secretly checks: "Does this email match any known Client Contact?"
    *   **If YES:** It automatically links them to that Client, fills in their details, and unlocks the portal.
    *   **If NO:** It shows the "Pending Approval" screen (as intended for strangers).

## The Plan: Fix, Link, & Launch

### 1. Fix the "Invite" Flows (Module 1A - Phase 0)
I discovered that the **"Invite Client"** and **"Onboard Client"** buttons were broken (they didn't create the necessary contact records).
*   **The Fix:** The agent will repair these buttons first.
*   **Benefit:** You can use the *real app* to invite test users, instead of SQL scripts.

### 2. Implement "Auto-Link" (Module 1A - Phase 1)
The agent will implement the database "matchmaker" to ensure that when these invited users sign up, they are automatically connected to their profile.

### 3. Build Features (Module 1B)
Once login is smooth, a separate agent will build the Shift Creation and Ratings features.

## Action Required
Assign the next agent to **Module 1A**.
Path: `C:\Users\gbase\AiAgency\ACG_BASE\agc_latest3\agent_missions\module_1a_auth_fix`
