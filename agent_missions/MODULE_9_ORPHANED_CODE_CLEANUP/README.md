# MODULE 9: Orphaned Code Cleanup

**Status:** 🔴 NOT STARTED
**Priority:** MVP CRITICAL
**Estimated Time:** 4-6 hours
**Risk Level:** Medium (deletions require careful review)
**Dependencies:** MODULE_5 inventory data helpful

---

## 🎯 MISSION OBJECTIVE

**Problem:** Codebase has grown to 635+ files. Estimated 15-20% is orphaned:
- React pages with no routes
- Components never imported
- Edge Functions never called
- Database columns never queried
- Utility functions never used

**Solution:**
1. Scan and identify all orphaned code
2. Create removal recommendations
3. Archive (not delete) with clear documentation
4. Reduce codebase complexity

**End State:** Clean codebase with only active code, 15-20% reduction in size.

---

## 📊 SUSPECTED ORPHANED CODE

### React Pages (Check These):
- `src/pages/Login_BACKUP*.jsx` (3 backup files)
- `src/pages/CleanSlate.jsx` - Purpose unclear
- `src/pages/Phase2*.jsx` - Old planning pages
- `src/pages/NaturalLanguageTests.jsx` - Test page
- `src/pages/TestNotifications.jsx` - Test page
- `src/pages/TestShiftReminders.jsx` - Test page
- `src/pages/TestWhatsAppN8N.jsx` - Test page
- `src/pages/PhoneDiagnostic.jsx` - Debug page
- `src/pages/DominionPresentation.jsx` - One-time use

### Edge Functions (Verify Usage):
- Functions with no cron job AND no frontend call
- Functions with `test` or `debug` in name
- Duplicated functionality

### Documentation (200+ .md files):
- Migration docs (completed)
- Bug fix summaries (historical)
- Test results (outdated)

---

## 📦 DELIVERABLES

### Phase 1: Inventory Scan (2 hours)
- [ ] Scan all React pages for route references
- [ ] Scan all components for import references
- [ ] Cross-reference Edge Functions with callers
- [ ] Create `ORPHANED_CODE_INVENTORY.json`

### Phase 2: Categorize (1 hour)
- [ ] Safe to delete: Test files, backups
- [ ] Archive: Old planning docs, one-time pages
- [ ] Keep: Might be used, unclear
- [ ] Create removal recommendations

### Phase 3: Clean Up (2-3 hours)
- [ ] Move test pages to `src/pages/_archive/`
- [ ] Move backup files to `archive/`
- [ ] Remove unused routes from App.jsx
- [ ] Update navigation components
- [ ] Move 100+ stale .md files to `docs_archive/`

### Phase 4: Verify (30 min)
- [ ] Build passes: `npm run build`
- [ ] No broken imports
- [ ] App runs correctly

---

## 🔧 FILES AFFECTED

### Move to Archive:
- `src/pages/Login_BACKUP*.jsx` → `archive/pages/`
- `src/pages/*Test*.jsx` → `archive/pages/`
- `src/pages/Phase2*.jsx` → `archive/pages/`
- Root `.md` files (100+) → `docs_archive/`

### Modify:
- `src/App.jsx` - Remove orphaned routes
- `src/pages/Layout.jsx` - Remove orphaned nav links

### Create:
- `archive/pages/` folder
- `ORPHANED_CODE_INVENTORY.json`

---

## 🚨 SAFETY RULES

1. **NEVER delete** - Always move to archive folder
2. **Verify before moving** - Search for imports/references
3. **Build after each batch** - Catch issues early
4. **Document everything** - Note why each file was archived

---

## ✅ SUCCESS CRITERIA

- [ ] 15+ React pages archived
- [ ] 50+ .md files organized
- [ ] Build passes with no errors
- [ ] All active routes still work
- [ ] Codebase feels cleaner

---

## 📞 AGENT HANDOFF

**To Start:** Run inventory scan first
**When Done:** Verify build, update MASTER_MODULE_INDEX
**Next Module:** MODULE_10 (Documentation Lifecycle)

