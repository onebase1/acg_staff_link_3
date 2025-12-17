# MODULE 10: Documentation Lifecycle System

**Status:** 🔴 NOT STARTED
**Priority:** MVP CRITICAL
**Estimated Time:** 3-4 hours
**Risk Level:** Low
**Dependencies:** None

---

## 🎯 MISSION OBJECTIVE

**Problem:** 200+ .md documentation files with:
- No tracking of which are current vs stale
- No automatic deprecation
- Code changes without doc updates
- Agents can't tell what's current

**Solution:**
1. Implement lifecycle metadata in all active docs
2. Create tracking database table
3. Build auto-deprecation system
4. Create docs health dashboard

**End State:** Self-maintaining documentation that flags itself when stale.

---

## 📊 LIFECYCLE STATES

```
ACTIVE ──► REQUIRES_REVIEW ──► DEPRECATED ──► ARCHIVED
   ▲              │                               │
   └──────────────┘ (if updated)                  │
                                                  ▼
                                            docs/archive/
```

### State Definitions:
- **ACTIVE**: Current, verified, in use
- **REQUIRES_REVIEW**: Code changed or 30 days old, needs verification
- **DEPRECATED**: Marked obsolete, 90-day countdown to archive
- **ARCHIVED**: Moved to archive folder, git-searchable only

---

## 📦 DELIVERABLES

### Phase 1: Metadata Standard (1 hour)
- [ ] Define YAML frontmatter schema
- [ ] Update 20 critical docs with metadata
- [ ] Create template for new docs

### Phase 2: Tracking Database (1 hour)
- [ ] Create `documentation_registry` table
- [ ] Populate with existing docs
- [ ] Create views for health metrics

### Phase 3: Auto-Deprecation Logic (1 hour)
- [ ] Create Edge Function: `docs-lifecycle-monitor`
- [ ] Check code_reference for changes (git)
- [ ] Flag docs older than 30 days
- [ ] Schedule daily cron

### Phase 4: Dashboard (1 hour)
- [ ] Create `src/pages/DocsHealth.jsx`
- [ ] Show all docs by status
- [ ] Highlight docs needing review
- [ ] Quick actions: Verify, Deprecate, Archive

---

## 📝 METADATA SCHEMA

Every .md file should have this header:

```yaml
---
status: active | requires_review | deprecated | archived
last_sync_date: 2025-12-17
code_reference: src/utils/example.js:1-100
created_date: 2025-12-17
deprecation_date: null
deprecation_reason: null
---
```

---

## 🔧 FILES AFFECTED

### Create:
- `supabase/migrations/20251217_documentation_registry.sql`
- `supabase/functions/docs-lifecycle-monitor/index.ts`
- `src/pages/DocsHealth.jsx`
- `.md.template` (for new docs)

### Modify:
- 20+ critical .md files (add metadata)
- `src/App.jsx` (add route)

---

## ✅ SUCCESS CRITERIA

- [ ] 20+ docs have lifecycle metadata
- [ ] Database table tracking all docs
- [ ] Auto-deprecation running daily
- [ ] Dashboard shows docs by status
- [ ] Stale docs flagged automatically

---

## 📞 AGENT HANDOFF

**To Start:** Add metadata to MODULE docs first (they're new)
**When Done:** Verify cron job running
**Next Module:** MODULE_11 (Feature Flags System)

