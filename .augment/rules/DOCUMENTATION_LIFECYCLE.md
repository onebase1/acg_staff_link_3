---
type: "always_apply"
---

status: active | requires_review | deprecated | archived
last_sync_date: YYYY-MM-DD
code_reference: path/to/code:line_range (or "N/A" with justification)
deprecation_date: YYYY-MM-DD (only if status = deprecated)
deprecation_reason: [brief explanation]
associated_issues: [GitHub links or ticket IDs]
commit_hash: [last commit that touched this file]
---
---
status: active
last_sync_date: 2025-11-17
code_reference: functions/shiftStatusAutomation.js:1-200
associated_issues: PHASE2-001
commit_hash: a3f5e8d
---

# Shift Status Automation Engine
[content here...]
Lifecycle States (Every .md has exactly ONE)
ACTIVE → Current, verified, in use
↓ (code changes OR 30 days pass)
REQUIRES_REVIEW → Needs verification, 7-day deadline
↓ (verified + still accurate)
ACTIVE (reset) OR (marked obsolete)
↓
DEPRECATED → Obsolete, 90 days until archive
↓ (90 days pass)
ARCHIVED → Moved to docs/archive/, Git-searchable only, not in builds

Automatic Lifecycle Triggers (DO NOT OVERRIDE)
Trigger 1: Code Modified
When code at code_reference changes

Action: Set doc status → requires_review

Deadline: 7 days to re-verify

Result: Auto-deprecate if deadline missed

Trigger 2: Time-Based (30 Days Rule)
When last_sync_date > 30 days old

Action: Transition status → requires_review

Deadline: 7 days to verify

Result: Auto-deprecate if deadline missed

Trigger 3: Code Deletion
When code at code_reference is deleted/moved

Action: Auto-deprecate immediately

Reason: "Referenced code deleted (commit: [hash])"

Result: Auto-archive after 90 days

Where .md Files Can Live (ONLY These Folders)
✅ functions/IMPLEMENTATION_NOTES.md (documents specific function)
✅ components/COMPONENT_GUIDE.md (documents specific component)
✅ docs/active/WORKFLOW_GUIDE.md (evergreen documentation)
✅ docs/review/[FILENAME].md (auto-populated for stale docs)
✅ docs/deprecated/[FILENAME].md (marked obsolete)
✅ docs/archive/[FILENAME].md (90+ day old deprecated)
✅ schemas/SCHEMA_REFERENCE.md (database documentation)

❌ Random folders or root level = NOT ALLOWED

When Creating New .md Files
ALWAYS include:

YAML metadata header (all 7 fields)

status: active

last_sync_date: [today's date]

code_reference: [actual path or "N/A"]

NEVER create .md for:

Personal notes or temp tasks

Implementation code (that goes in functions, not docs)

Vague planning (put in memory bank, not docs)

Deprecation Workflow
text
1. Developer notices doc is outdated
   ↓
2. Set status: deprecated
3. Add deprecation_date: [today]
4. Add deprecation_reason: [brief explanation]
   ↓
5. After 30 days: Move to docs/deprecated/ (auto or manual)
   ↓
6. After 90 days: Move to docs/archive/ (auto or manual)
   ↓
7. Forever: Available in Git history (git log --all)