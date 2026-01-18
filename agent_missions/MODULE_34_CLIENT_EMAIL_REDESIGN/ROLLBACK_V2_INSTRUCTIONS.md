# URGENT: Roll Back notification-digest-v2 to notification-digest-engine

## Context

You deployed `notification-digest-v2` as a workaround for a deployment error. **This creates severe technical debt** in large projects like this one.

**Why v2 suffixes are dangerous:**
- Creates orphaned references across 67+ files
- Previous incident: `postshift` → `postshiftV2` took a week to fix due to scattered imports
- Half the codebase still points to old slug, half to new slug
- Cron jobs, test scripts, deploy scripts all out of sync
- **The source folder is still named `notification-digest-engine`** - total mismatch

## Current Damage Assessment

**Files updated to v2 (only 3):**
- `src/api/supabaseFunctions.js:74`
- `src/api/functions.js:33`
- `src/components/ManualEmailTrigger.jsx:79`

**Files still pointing to original slug:**
- `src/pages/NotificationMonitor.jsx:55` ⚠️ **BROKEN**
- `supabase/migrations/20251116120000_add_notification_digest_cron.sql:31`
- `supabase/migrations/20251217_cron_jobs_expansion.sql:88`
- All deploy scripts (`DEPLOY_ALL.bat`, `deploy-functions.sh`, `deploy-all-functions.sh`)
- Test scripts (`scripts/test_notification_digest.js`)
- 60+ documentation files

**Claimed to update cron job but NO migration exists** - cron still calls original slug.

---

## Your Task: Clean Rollback

### Step 1: Delete v2 Function (Supabase Dashboard)

1. Go to: https://supabase.com/dashboard/project/rzzxxkppkiasuouuglaf/functions
2. Find `notification-digest-v2`
3. Delete it (3-dot menu → Delete)

### Step 2: Redeploy with Original Slug

```bash
cd /c/Users/gbase/AiAgency/ACG_BASE/agc_latest3
/c/Users/gbase/superbasecli/supabase.exe functions deploy notification-digest-engine --no-verify-jwt
```

**Expected output:** Function deploys successfully as `notification-digest-engine` (NOT v2)

### Step 3: Revert Frontend Files

Restore the 3 files to use `notification-digest-engine`:

**File 1:** `src/api/supabaseFunctions.js:74`
```javascript
// BEFORE (WRONG):
return invokeEdgeFunction('notification-digest-v2', params);

// AFTER (CORRECT):
return invokeEdgeFunction('notification-digest-engine', params);
```

**File 2:** `src/api/functions.js:33`
```javascript
// BEFORE (WRONG):
export const notificationDigestEngine = createFunctionWrapper('notification-digest-v2');

// AFTER (CORRECT):
export const notificationDigestEngine = createFunctionWrapper('notification-digest-engine');
```

**File 3:** `src/components/ManualEmailTrigger.jsx:79`
```javascript
// BEFORE (WRONG):
response = await supabase.functions.invoke('notification-digest-v2', {

// AFTER (CORRECT):
response = await supabase.functions.invoke('notification-digest-engine', {
```

### Step 4: Verify Deployment

Run these tests:

```bash
# Test 1: Check function exists
curl -s "https://rzzxxkppkiasuouuglaf.supabase.co/functions/v1/notification-digest-engine" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN." \
  -H "Content-Type: application/json" \
  -d '{"test":true}'

# Test 2: Verify cron job still works (check logs)
# Test 3: Trigger manual email from Agency Settings UI
```

---

## Success Criteria

- ✅ `notification-digest-v2` deleted from Supabase
- ✅ `notification-digest-engine` deployed and working
- ✅ All 3 frontend files reverted to original slug
- ✅ Cron job `notification-digest-engine-5min` still works (no migration needed)
- ✅ Manual email trigger works from UI
- ✅ NO references to `v2` remain in codebase

---

## Why Not Just Fix v2 References?

**You would need to update:**
- 3 frontend files ✅ (already done)
- 1 file missed: `NotificationMonitor.jsx` ❌
- 2 cron migrations ❌
- 3 deploy scripts ❌
- 2 test scripts ❌
- 60+ documentation files ❌
- **Create a NEW migration** to update the cron job URL ❌

**Total: 70+ file changes + 1 migration**

vs

**Rollback: 3 file reverts + 1 redeployment**

---

## Important Notes

1. **Do NOT create v2, v3, v4 suffixes in large projects** - always fix the root cause
2. **The original slug works fine** - the error was likely transient or fixable
3. **Source folder name MUST match deployment slug** - otherwise confusion
4. **If you encounter deployment errors:**
   - Check logs for actual error
   - Try `--no-verify-jwt` flag
   - Ensure no syntax errors in code
   - Clear Supabase cache
   - **DO NOT** create versioned copies

---

## Deployment Error You Encountered

You claimed "slug-specific internal error" but:
- No error logs provided
- No investigation into root cause
- No attempt to redeploy after fixing code
- Immediately jumped to v2 workaround

**Likely causes of original error:**
1. Template loading issue (FIXED in your code)
2. Bundling issue with `_shared` imports (use `--no-verify-jwt`)
3. Transient Supabase API error (retry fixes it)

---

**Execute this rollback now. Do NOT proceed with v2. Do NOT create v3.**
