# MODULE 9: Progress Tracker

**Last Updated:** 2025-12-17
**Status:** 🔴 NOT STARTED
**Completion:** 0%

---

## PHASE 1: Inventory Scan (0%)

### React Pages Scan
- [ ] List all files in src/pages/
- [ ] Check App.jsx for route definitions
- [ ] Mark pages with no route as "orphaned candidate"
- [ ] Check for page-to-page navigation links
- [ ] Document findings

**Orphaned Pages Found:**
1. [ ] _name_ - reason
2. [ ] _name_ - reason
...

### Components Scan
- [ ] List all files in src/components/
- [ ] Search codebase for import statements
- [ ] Mark components with no imports as "orphaned"

**Orphaned Components Found:**
1. [ ] _name_ - reason
...

### Edge Functions Scan
- [ ] List all folders in supabase/functions/
- [ ] Check cron.job for scheduled functions
- [ ] Search frontend for invoke() calls
- [ ] Check other Edge Functions for internal calls
- [ ] Mark functions never called as "orphaned candidate"

**Orphaned Functions Found:**
1. [ ] _name_ - reason
...

### Documentation Scan
- [ ] Count .md files in root (should be 150+)
- [ ] Check last modified dates
- [ ] Identify migration/setup docs (completed)
- [ ] Identify test result docs (outdated)

**Docs to Archive:**
_Count: ___

---

## PHASE 2: Categorize (0%)

### Category: SAFE TO ARCHIVE
_Files that are clearly unused/outdated_
- [ ] src/pages/Login_BACKUP*.jsx (3 files)
- [ ] src/pages/StaffPortal.jsx.backup
- [ ] ... (add more)

### Category: ARCHIVE WITH CAUTION  
_Files that might be referenced somewhere_
- [ ] ... (list files)

### Category: KEEP
_Files that should remain despite appearing unused_
- [ ] ... (list with reason)

---

## PHASE 3: Execute Cleanup (0%)

### Create Archive Folders
- [ ] Create archive/pages/
- [ ] Create archive/components/
- [ ] Create archive/functions/

### Move Files
- [ ] Move backup .jsx files → archive/pages/
- [ ] Move test pages → archive/pages/
- [ ] Move 100+ .md files → docs_archive/

### Update References
- [ ] Remove archived routes from App.jsx
- [ ] Remove archived nav links from Layout.jsx
- [ ] Update any imports

### Build Verification
- [ ] Run: npm run build
- [ ] Fix any errors
- [ ] Run: npm run dev
- [ ] Test main flows

---

## PHASE 4: Final Verification (0%)

- [ ] Build passes
- [ ] Dev server runs
- [ ] Login works
- [ ] Dashboard loads
- [ ] Shifts page works
- [ ] No console errors
- [ ] Codebase reduced by 15%+

---

## CLEANUP SUMMARY

| Category | Before | After | Removed |
|----------|--------|-------|---------|
| React Pages | 85 | - | - |
| Components | 50+ | - | - |
| Edge Functions | 64 | - | - |
| Root .md files | 150+ | - | - |
| **Total Files** | 635+ | - | - |

---

## ISSUES ENCOUNTERED

| Issue | Resolution | Status |
|-------|------------|--------|
| - | - | - |

---

**Next Module:** MODULE_10 (Documentation Lifecycle)

