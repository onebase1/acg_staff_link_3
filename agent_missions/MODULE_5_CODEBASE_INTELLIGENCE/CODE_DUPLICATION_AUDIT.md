# Code Duplication Audit

**Purpose:** Track all code duplication issues to prevent silent breakage
**Last Updated:** 2025-12-17
**For:** MODULE_5 agents building `/admin/code-duplication` UI page

---

## 🎯 Why Code Duplication is Dangerous

**The Timesheet Upload Incident (2025-12-17):**
- Upload logic existed in 2 files
- OCR feature added to TimesheetDetail.jsx only
- Timesheets.jsx still had basic upload (no OCR)
- Staff used Timesheets.jsx → bypassed all AI features
- Result: "Single most important feature" silently broken

**Key Lesson:** At enterprise scale, you forget what needs to be updated where.

---

## 📊 Duplication Categories

### Category A: Logic Duplication (CRITICAL)
**Risk:** Business logic implemented twice, changes to one don't affect other
**Examples:** Upload handlers, validation functions, calculation logic

### Category B: Component Duplication (HIGH)
**Risk:** UI components copied instead of shared, styling/behavior diverges
**Examples:** Modals, forms, tables

### Category C: Configuration Duplication (MEDIUM)
**Risk:** Constants/config defined in multiple files, inconsistencies arise
**Examples:** API endpoints, feature flags, validation rules

### Category D: Utility Duplication (LOW)
**Risk:** Helper functions copied, bug fixes not propagated
**Examples:** Date formatters, string helpers, math utilities

---

## 🔴 CRITICAL: Logic Duplication Issues

### Issue #1: Timesheet Upload Logic

**Files Affected:**
- [src/pages/Timesheets.jsx](../../src/pages/Timesheets.jsx:339-758) (420 lines)
- [src/pages/TimesheetDetail.jsx](../../src/pages/TimesheetDetail.jsx:231-651) (421 lines)

**Duplicated Functions:**
```javascript
// BOTH files have these (nearly identical):
- handleFileUpload()        // ~170 lines
- handleConfirmOCR()         // ~150 lines
- handleRejectOCR()          // ~60 lines
- handleReUpload()           // ~20 lines
```

**Total Duplication:** ~400 lines

**Risk:** 🔴 CRITICAL
- Changes to upload flow must be applied to BOTH files
- Easy to forget one file during updates
- Silent feature breakage (staff bypass features)

**Impact:**
- Timesheet approval (auto-approval logic)
- Payroll generation (depends on approved timesheets)
- Invoice generation (depends on hours from OCR)
- Compliance tracking (depends on signatures)

**Recommended Fix:**
1. Create `src/components/timesheets/TimesheetUploader.jsx` shared component
2. Extract logic to `src/services/timesheetUploadService.js` service layer
3. Update both pages to use shared implementation
4. Delete duplicate code

**Estimated Effort:** 3-4 hours

**Status:** 🟡 Temporarily patched (2025-12-17) - Both files now have OCR, but still duplicated

---

### Issue #2: Shift Assignment Logic

**Files Affected:**
- [src/pages/Shifts.jsx](../../src/pages/Shifts.jsx) (assignment modal)
- [src/components/shifts/ShiftAssignmentModal.jsx](../../src/components/shifts/ShiftAssignmentModal.jsx)

**Duplicated Functions:**
```javascript
// Assignment logic exists in both:
- handleAssignShift()
- validateStaffEligibility()
- checkSkillsMatch()
```

**Total Duplication:** ~150 lines

**Risk:** 🟠 HIGH
- Assignment rules may diverge
- Skill matching logic inconsistent

**Recommended Fix:**
1. Create `src/services/shiftAssignmentService.js`
2. Centralize all assignment logic
3. Update both components to use service

**Estimated Effort:** 2-3 hours

**Status:** 🔴 Not fixed

---

### Issue #3: GPS Validation Logic

**Files Affected:**
- [src/components/staff/MobileClockIn.jsx](../../src/components/staff/MobileClockIn.jsx)
- [src/pages/StaffPortal.jsx](../../src/pages/StaffPortal.jsx)

**Duplicated Functions:**
```javascript
// GPS distance calculation duplicated:
- calculateDistance(lat1, lon1, lat2, lon2)
- validateGPSRange(staffLocation, clientLocation, radius)
```

**Total Duplication:** ~50 lines

**Risk:** 🟡 MEDIUM
- GPS validation formula may differ
- Thresholds (radius) hardcoded differently

**Recommended Fix:**
1. Create `src/utils/gpsValidation.js`
2. Export shared functions
3. Update both files to import

**Estimated Effort:** 1 hour

**Status:** 🔴 Not fixed

---

## 🟠 HIGH: Component Duplication Issues

### Issue #4: Data Tables

**Components:**
- `src/components/tables/StaffTable.jsx`
- `src/components/tables/ClientTable.jsx`
- `src/components/tables/ShiftTable.jsx`
- `src/components/tables/TimesheetTable.jsx`

**Duplicated Patterns:**
```javascript
// All tables implement:
- Pagination logic
- Sorting logic
- Filter controls
- Export to CSV
- Row selection
```

**Total Duplication:** ~800 lines (across 4 components)

**Risk:** 🟠 HIGH
- Bug fixes applied to one table don't propagate
- Inconsistent UX across tables
- Hard to maintain

**Recommended Fix:**
1. Create `src/components/tables/DataTable.jsx` generic component
2. Use column configuration pattern
3. Replace all 4 tables with `<DataTable columns={...} />`

**Estimated Effort:** 6-8 hours

**Status:** 🔴 Not fixed

---

### Issue #5: Form Validation

**Components:**
- `src/components/staff/StaffForm.jsx`
- `src/components/clients/ClientForm.jsx`
- `src/components/shifts/ShiftForm.jsx`

**Duplicated Logic:**
```javascript
// Each form implements:
- Email validation
- Phone number validation
- Required field checking
- Error message display
```

**Total Duplication:** ~200 lines

**Risk:** 🟡 MEDIUM
- Validation rules inconsistent
- Error messages different

**Recommended Fix:**
1. Use `react-hook-form` with shared validation schema
2. Create `src/utils/validationSchemas.js`
3. Centralize all validation rules

**Estimated Effort:** 4-5 hours

**Status:** 🔴 Not fixed

---

## 🟡 MEDIUM: Configuration Duplication Issues

### Issue #6: API Endpoints

**Files Affected:**
- `src/lib/supabaseFunctions.js` - Hardcoded function names
- `src/pages/*.jsx` (50+ files) - Direct `supabase.functions.invoke()` calls

**Duplicated Config:**
```javascript
// Edge Function names scattered across files:
'send-email'
'send-sms'
'send-whatsapp'
'extract-timesheet-data'
// ... 40+ more functions
```

**Risk:** 🟡 MEDIUM
- Renaming a function requires updating 50+ files
- Typos cause silent failures

**Recommended Fix:**
1. Create `src/config/edgeFunctions.js`
   ```javascript
   export const EDGE_FUNCTIONS = {
     SEND_EMAIL: 'send-email',
     SEND_SMS: 'send-sms',
     SEND_WHATSAPP: 'send-whatsapp',
     EXTRACT_TIMESHEET_DATA: 'extract-timesheet-data'
   };
   ```
2. Update all files to use constants
3. TypeScript types for function names

**Estimated Effort:** 3-4 hours

**Status:** 🔴 Not fixed

---

### Issue #7: Feature Flags

**Files Affected:**
- `src/pages/Shifts.jsx` - `const FEATURE_FLAG_AUTO_MATCH = true`
- `src/pages/Timesheets.jsx` - `const FEATURE_FLAG_OCR = true`
- 20+ other files with inline feature flags

**Risk:** 🟡 MEDIUM
- Feature flags scattered across codebase
- Hard to toggle features globally
- No database-driven flags

**Recommended Fix:**
1. Create `feature_flags` database table
2. Create `src/hooks/useFeatureFlag.js` hook
3. Replace all inline flags with hook

**Estimated Effort:** 4-5 hours

**Status:** 🔴 Not fixed

---

## 🟢 LOW: Utility Duplication Issues

### Issue #8: Date Formatting

**Files Affected:**
- 30+ components with inline date formatting

**Duplicated Logic:**
```javascript
// Variations of:
new Date(dateString).toLocaleDateString('en-GB')
format(new Date(dateString), 'dd/MM/yyyy')
moment(dateString).format('DD/MM/YYYY')
```

**Risk:** 🟢 LOW
- Inconsistent date formats
- Hard to change format globally

**Recommended Fix:**
1. Standardize on `date-fns`
2. Create `src/utils/dateFormatters.js`
3. Export `formatDate()`, `formatDateTime()`, etc.

**Estimated Effort:** 2-3 hours

**Status:** 🔴 Not fixed

---

## 📊 Summary Statistics

| Category | Count | Total Lines | Risk Level | Estimated Fix Hours |
|----------|-------|-------------|------------|---------------------|
| Logic Duplication | 3 | ~600 | 🔴 CRITICAL | 6-8 |
| Component Duplication | 2 | ~1000 | 🟠 HIGH | 10-13 |
| Configuration Duplication | 2 | ~50 | 🟡 MEDIUM | 7-9 |
| Utility Duplication | 1 | ~30 | 🟢 LOW | 2-3 |
| **TOTAL** | **8** | **~1680** | - | **25-33 hours** |

---

## 🎨 UI Page Design Suggestions

**For `/admin/code-duplication` page:**

### Layout
```
┌────────────────────────────────────────────────────────────────┐
│ Code Duplication Audit                          🔄 Scan Now    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Risk Overview:                                                 │
│  🔴 Critical: 3 issues    🟠 High: 2    🟡 Medium: 2    🟢 Low: 1│
│                                                                │
│ Estimated Fix Effort: 25-33 hours                             │
│ Total Duplicated Lines: ~1,680                                │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Duplication Issues:                                            │
│                                                                │
│ ┌────┬─────────────────────────────────┬──────────┬──────────┐│
│ │Risk│ Issue                           │ Lines    │ Fix Time ││
│ ├────┼─────────────────────────────────┼──────────┼──────────┤│
│ │🔴  │ Timesheet Upload Logic          │ ~400     │ 3-4h     ││
│ │    │ 2 files: Timesheets.jsx,        │          │          ││
│ │    │          TimesheetDetail.jsx    │          │          ││
│ │    │ [View Diff] [Create Task]       │          │          ││
│ ├────┼─────────────────────────────────┼──────────┼──────────┤│
│ │🟠  │ Shift Assignment Logic          │ ~150     │ 2-3h     ││
│ │    │ [View Diff] [Create Task]       │          │          ││
│ └────┴─────────────────────────────────┴──────────┴──────────┘│
│                                                                │
│ [Export Report] [Schedule Auto-Scan]                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Issue Detail Modal
```
┌────────────────────────────────────────────────────────────────┐
│ Duplication Issue: Timesheet Upload Logic                  ✕ │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Risk: 🔴 CRITICAL                                             │
│ Category: Logic Duplication                                    │
│                                                                │
│ Files Affected:                                                │
│  1. src/pages/Timesheets.jsx (lines 339-758)                  │
│     [View File →] [View in VSCode]                            │
│                                                                │
│  2. src/pages/TimesheetDetail.jsx (lines 231-651)             │
│     [View File →] [View in VSCode]                            │
│                                                                │
│ Duplicated Functions:                                          │
│  • handleFileUpload() - 170 lines duplicated                  │
│  • handleConfirmOCR() - 150 lines duplicated                  │
│  • handleRejectOCR() - 60 lines duplicated                    │
│  • handleReUpload() - 20 lines duplicated                     │
│                                                                │
│ Impact:                                                        │
│  Features depending on this:                                   │
│   • Timesheet approval (auto-approval logic)                  │
│   • Payroll generation                                        │
│   • Invoice generation                                        │
│   • Compliance tracking                                       │
│                                                                │
│ Recommended Fix:                                               │
│  1. Create TimesheetUploader.jsx shared component             │
│  2. Extract to timesheetUploadService.js service              │
│  3. Update both pages to use shared code                      │
│  4. Delete duplicate code                                     │
│                                                                │
│ Estimated Effort: 3-4 hours                                    │
│                                                                │
│ [View Side-by-Side Diff] [Create Refactor Task] [Close]       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Detection Strategies

**For MODULE_5 agents: How to auto-detect duplication**

### Strategy 1: AST-Based Detection
```javascript
// Use @babel/parser to parse all .jsx files
// Compare function ASTs for similarity
// Flag functions with >80% similarity

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

function detectDuplication(file1, file2) {
  const ast1 = parse(file1Source);
  const ast2 = parse(file2Source);

  const functions1 = extractFunctions(ast1);
  const functions2 = extractFunctions(ast2);

  return findSimilarFunctions(functions1, functions2, threshold=0.8);
}
```

### Strategy 2: String-Based Detection (Simple)
```javascript
// Extract all functions from files
// Compare normalized strings (ignore whitespace/comments)
// Flag >50 line matches

function normalizeCode(code) {
  return code
    .replace(/\/\/.*$/gm, '') // Remove comments
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
}
```

### Strategy 3: Manual Registry (Current)
```javascript
// Maintain duplication_issues table
// Manual entry by developers or agents
// Periodic review

CREATE TABLE duplication_issues (
  id UUID PRIMARY KEY,
  issue_name TEXT,
  files TEXT[],
  duplicated_lines INT,
  risk_level TEXT,
  estimated_fix_hours NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📋 Database Schema for UI Page

```sql
CREATE TABLE duplication_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Issue details
  issue_name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('logic', 'component', 'config', 'utility')),

  -- Files affected
  files JSONB, -- [{ path: '...', lines: '339-758' }]
  duplicated_lines INT,

  -- Impact
  risk_level TEXT CHECK (risk_level IN ('critical', 'high', 'medium', 'low')),
  affected_features TEXT[], -- Feature names from critical_features table

  -- Fix plan
  recommended_fix TEXT,
  estimated_fix_hours NUMERIC,

  -- Status
  status TEXT CHECK (status IN ('identified', 'in_progress', 'fixed', 'wont_fix')),
  fixed_at TIMESTAMPTZ,
  fixed_by TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_duplication_risk ON duplication_issues(risk_level);
CREATE INDEX idx_duplication_status ON duplication_issues(status);
CREATE INDEX idx_duplication_category ON duplication_issues(category);
```

---

## 📋 TODO for MODULE_5 Agents

When building `/admin/code-duplication` UI page:

1. ✅ Create `duplication_issues` database table
2. ✅ Populate with issues from this document
3. ✅ Create React page at `src/pages/admin/CodeDuplication.jsx`
4. ✅ Add "View Diff" button (side-by-side file comparison)
5. ✅ Add "Create Task" button (creates TODO item)
6. ✅ Add "View in VSCode" deep link (`vscode://file/{path}:{line}`)
7. ✅ Add risk-based sorting/filtering
8. ✅ Add progress tracking (% of issues fixed)
9. ✅ Add "Schedule Refactor" workflow
10. ✅ Add auto-scan (weekly cron to detect new duplication)

---

## 🚨 Prevention Guidelines

**For future development:**

### 1. Before Copying Code:
- ❌ DON'T: Copy-paste logic to new file
- ✅ DO: Extract to shared component/service first

### 2. Code Review Checklist:
- [ ] Is this logic already implemented elsewhere?
- [ ] Can this be extracted to a shared utility?
- [ ] Are constants defined in a central config?

### 3. Architecture Patterns:
- **Shared Components:** `src/components/shared/`
- **Service Layer:** `src/services/` (business logic)
- **Utility Functions:** `src/utils/` (pure helpers)
- **Configuration:** `src/config/` (constants, endpoints)

### 4. Automated Checks:
- TODO: Add ESLint plugin to detect duplication
- TODO: Add pre-commit hook to warn on large copy-pastes
- TODO: CI check to fail if duplication increases

---

**END OF DOCUMENT**
