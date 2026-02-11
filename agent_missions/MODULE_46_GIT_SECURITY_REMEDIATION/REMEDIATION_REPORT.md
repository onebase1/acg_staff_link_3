# Module 46: Git Security & Repository Remediation

**Date**: 2026-02-11
**Objective**: Resolve GitHub Repository Rule (GH013) block caused by sensitive data detection and ensure a clean deployment path to Netlify.

## ⚠️ Remediation Summary
During the transition to the 1:N multi-shift processing design, the Git push to `main` was blocked by a GitHub security scanner. I performed a project-wide scrub to remove hardcoded identifiers and sensitive samples from the source code and history.

## 🔍 Scrubbed Elements

| File Path | Scrubbed Content | Replacement | Rationale |
|-----------|------------------|-------------|-----------|
| `src/pages/Timesheets.jsx` | `user?.email === 'g.basera@yahoo.com'` | Removed | Hardcoded email in `isAdmin` check triggered GitHub guardrails. |
| `supabase/functions/whatsapp-timesheet-upload-handler/index.ts` | `"+447557679989"` | `"+44XXXXXXXXXX"` | Real-looking phone numbers in comments/docs trigger security false-positives. |
| `supabase/functions/whatsapp-timesheet-upload-handler/index.ts` | `"John Doe"` | `"Staff Member"` | Sample names associated with phone numbers. |
| `[Artifacts dir]/walkthrough.md` | `g.basera@yahoo.com` | `admin email check` | Documentation artifacts included the identifier, persisting the block in Git objects. |

## 🛠️ Infrastructure Cleanup
To fully resolve the block, the following Git actions were taken:
1.  **Soft Reset**: `git reset --soft origin/main` was used to unstage the problematic commits.
2.  **Clean Commit**: All logic changes (including the `CheckCircle2` crash fix and `TimesheetCard` refinements) were re-committed in a single "scrubbed" block.
3.  **Ref History Purge**: All local commit history containing the sensitive email was effectively overwritten to ensure the remote `main` branch never received the blocked strings.

## 📉 Potential Impact Analysis
- **Admin Access**: The removal of the hardcoded email check in `Timesheets.jsx` means users must rely on their `user_type` (`agency_admin` or `manager`) to see admin UI. If an admin is incorrectly tagged as `staff` in the `profiles` table, they will lose access whereas the hardcoded check previously acted as a safety net.
- **WhatsApp Documentation**: The webhook sample payload in the Edge Function is now generic. Developers should refer to the internal n8n logs for real payload structures during debugging.

## 🛡️ External Factors
The user reported a security digest from GitHub regarding an unrelated `text_to_speech` repository (CVE-2026-0994). While this did not directly cause the current Git block, it highlights the importance of maintaining clean dependencies (e.g., updating `protobuf` to `> 5.29.6`).

---

## 🔐 Additional Credential Cleanup (2026-02-11 - Phase 2)

Following the initial PII remediation, a comprehensive security audit revealed **additional hardcoded Supabase credentials** that were actively tracked in Git. These files contained service role JWT tokens and were deleted or sanitized to prevent credential exposure.

### Files Deleted (No Longer Needed)

| File | Purpose | Deletion Rationale |
|------|---------|-------------------|
| `verify_migrations.js` | One-time migration verification script | Migration verification complete (Dec 2025). Only referenced in archived MODULE_2 docs. |
| `verify-channels-enabled.mjs` | UAT diagnostic tool for notification channels | Diagnostic complete. All functionality available in admin dashboard. |
| `trigger_report.js` | Manual trigger for `daily-agency-digest` function | Test script. Function is now scheduled via pg_cron. No production use. |
| `test-multi-recipient.mjs` | Duplicate test script for agency digest | Duplicate of `trigger_report.js`. Created but never used. |

**Security Impact**: All 4 files contained the same hardcoded service role JWT token (`eyJhbGciOiJI...`). These were removed from Git tracking and deleted from disk.

### Files Sanitized (Converted to Templates)

| File | Action Taken | Usage |
|------|-------------|-------|
| `CRON_SETUP_COPY_PASTE.sql` | JWT tokens replaced with `YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE` placeholder | Setup template referenced in documentation. Users must manually insert credentials before use. |

**Impact**: File removed from Git tracking but preserved on disk as a template. Documentation remains valid with added security warnings.

### .gitignore Updates

Added the following patterns to prevent future credential leaks:

```gitignore
# One-off verification and test scripts with credentials
verify*.js
verify*.mjs
trigger*.js
test-multi-recipient.mjs

# SQL setup scripts that may contain credentials
CRON_SETUP_COPY_PASTE.sql
**/CRON_SETUP*.sql
```

### ⚠️ CRITICAL ACTION REQUIRED

**Credential Rotation Needed**: The deleted files contained a Supabase service_role JWT token that has been in Git history since November 2025. To ensure complete security:

1. **Rotate service_role key** via Supabase Dashboard → Settings → API
2. Update deployment scripts and environment variables with new key
3. Consider using `git-filter-repo` to purge old credentials from Git history (optional but recommended)

### Verification

**Cross-reference Check**: None of the deleted files were imported or referenced in active production code. All were one-time use scripts or manual testing tools.

**Documentation Impact**:
- `CRON_SETUP_COPY_PASTE.sql` is referenced in `CRON_SETUP_NOW.md` - documentation updated with security warnings
- All other deleted files had zero references in active documentation

---
**Status**: Phase 1 (PII) - Resolved. Push successful.
**Status**: Phase 2 (Credentials) - Complete. Rotation required.
