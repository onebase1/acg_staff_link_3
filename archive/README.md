# Archive - Historical Documentation

**Purpose:** This folder contains historical documentation from the Base64 SDK to Supabase migration and various fixes applied during development.

**Date Archived:** 2025-11-13

---

## 📁 Folder Structure

### `/migration/` - Migration Documentation (32 files)
Documentation related to the Base64 SDK → Supabase migration process.

**Key Files:**
- `BASE44_TO_SUPABASE_CONVERSION_GUIDE.md` - Conversion patterns
- `MIGRATION_COMPLETE_SUMMARY.md` - Final migration status
- `SCHEMA_MIGRATION_REPORT.md` - Database schema changes
- `FUNCTION_COMPARISON_REPORT.md` - Function mapping

**Use Case:** Reference for understanding migration decisions and patterns

---

### `/fixes/` - Bug Fix Reports (16 files)
Reports and guides for bugs fixed during development.

**Key Files:**
- `CRITICAL_PAGES_FIXED.md` - Critical page fixes
- `SHIFT_CREATION_FIXED.md` - Shift creation bug fixes
- `RLS_POLICIES_APPLIED.md` - Row Level Security fixes
- `NOTIFICATION_FIXES_SUMMARY.md` - Notification system fixes

**Use Case:** Understanding past issues and how they were resolved

---

### `/test-reports/` - Historical Test Reports (11 files)
Test results and validation reports from various testing phases.

**Key Files:**
- `BUSINESS_PROCESS_VALIDATION_RESULTS.md` - Business process validation
- `PIPELINE_TEST_REPORT.md` - Pipeline test results
- `HYBRID_TEST_SUITE_IMPLEMENTATION.md` - Test suite implementation

**Use Case:** Historical test coverage and results

---

### `/setup/` - One-Time Setup Guides (6 files)
Setup and configuration guides that were used during initial deployment.

**Key Files:**
- `SETUP_NATIVE_CRON_JOBS.md` - Cron job setup
- `NOTIFICATION_REMINDERS_SETUP.md` - Notification setup
- `SEED_DATA_SUMMARY.md` - Seed data generation

**Use Case:** Reference for disaster recovery or new environment setup

---

## 🔍 How to Use This Archive

### Finding Information

**If you need to understand:**
- **Migration decisions** → Check `/migration/`
- **How a bug was fixed** → Check `/fixes/`
- **Historical test results** → Check `/test-reports/`
- **Initial setup steps** → Check `/setup/`

### Searching Across Archive

```bash
# Search for specific term across all archived docs
Get-ChildItem -Path archive -Recurse -Filter "*.md" | Select-String "search_term"
```

---

## ⚠️ Important Notes

1. **These docs are historical** - They describe past states of the project
2. **Current docs are in root** - See `PROJECT_MASTER_REFERENCE.md` for current state
3. **Don't use for new work** - Reference only for understanding past decisions
4. **Migration is complete** - No need to follow migration guides

---

## 📊 Archive Statistics

- **Total Files Archived:** 65 markdown files
- **Migration Docs:** 32 files
- **Fix Reports:** 16 files
- **Test Reports:** 11 files
- **Setup Guides:** 6 files

---

## 🔗 Related Documentation

**Current Active Docs (in project root):**
- `PROJECT_MASTER_REFERENCE.md` - Master reference for all AI threads
- `COMPLETE_SYSTEM_SUMMARY.md` - Current system status
- `STAFF_INVITATION_FLOW.md` - Current testing focus
- `QUICKSTART.md` - Test execution guide

**Test Documentation:**
- `tests/README.md` - Current test suite documentation
- `critical_path_testing_matrix.csv` - Test coverage matrix

---

**Last Updated:** 2025-11-13

