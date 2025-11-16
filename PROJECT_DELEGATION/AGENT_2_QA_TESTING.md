# AGENT 2 - PHASE 2 QA TESTING SUITE

**Priority:** 🔴 HIGH (Quality Gate for Phase 2)
**Complexity:** Medium
**Estimated Time:** 8 hours
**Skills Required:** Playwright, Testing, JavaScript, Database validation

---

## 🎯 MISSION OBJECTIVE

Create comprehensive Playwright test suite for all Phase 2 features (P2.1-P2.6) to ensure production readiness. Your tests will serve as regression suite for future development.

---

## 📋 TESTING SCOPE

### Features to Test

| Feature | Description | Complexity |
|---------|-------------|------------|
| **P2.1** | Smart Paste Area | Medium |
| **P2.2** | CSV Template Download | Low |
| **P2.3** | CSV Upload Handler | High |
| **P2.4** | Edit Shift Modal | Medium |
| **P2.5** | Keyboard Navigation | High |
| **P2.6** | Bulk Fill Actions | Medium |

---

## 🧪 TEST SPECIFICATIONS

### Test 1: Smart Paste - Tab-Delimited Data

**File:** `tests/bulk-shifts/smart-paste.spec.js`

**Scenario:** User pastes tab-delimited shift data from email

**Test Steps:**
```javascript
test('paste tab-delimited data from email', async ({ page }) => {
  // Setup
  await page.goto('http://localhost:5173/shifts/bulk-create');
  await selectClient(page, 'Richmond Court');
  await selectDateRange(page, '2025-11-16', '2025-11-22');
  await page.click('text=Next');

  // Paste data
  const pasteData = `Nurses\t16/11/2025\tDay\t2
Nurses\t16/11/2025\tNight\t2
Healthcare Assistants\t16/11/2025\tDay\t3`;

  await page.click('[data-testid="paste-area"]');
  await page.keyboard.insertText(pasteData);
  await page.click('text=Apply Paste');

  // Verify
  await expect(page.locator('[data-testid="grid-cell-2025-11-16-nurse_day"]')).toHaveValue('2');
  await expect(page.locator('[data-testid="grid-cell-2025-11-16-nurse_night"]')).toHaveValue('2');
  await expect(page.locator('[data-testid="grid-cell-2025-11-16-hca_day"]')).toHaveValue('3');

  // Verify toast notification
  await expect(page.locator('.toast')).toContainText('3 rows pasted successfully');
});
```

**Edge Cases:**
- Empty paste
- Invalid delimiters
- Mismatched roles
- Dates outside range
- Invalid shift types (Morning, Evening, etc.)

---

### Test 2: CSV Template Download

**File:** `tests/bulk-shifts/csv-template.spec.js`

**Scenario:** User downloads pre-filled CSV template

**Test Steps:**
```javascript
test('download CSV template with client rates', async ({ page }) => {
  // Setup
  await page.goto('http://localhost:5173/shifts/bulk-create');
  await selectClient(page, 'Richmond Court');
  await selectDateRange(page, '2025-11-16', '2025-11-22');
  await page.click('text=Next');

  // Download template
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download Template')
  ]);

  // Verify filename
  expect(download.suggestedFilename()).toMatch(/bulk-shifts-template-\d{4}-\d{2}-\d{2}\.csv/);

  // Verify content
  const path = await download.path();
  const csvContent = await fs.readFileSync(path, 'utf-8');

  expect(csvContent).toContain('Role,Day of Week,Date (DD/MM/YYYY),Shift Type,Quantity');
  expect(csvContent).toContain('Nurses,Saturday,16/11/2025,Day,');
  expect(csvContent).toContain('Healthcare Assistants,Saturday,16/11/2025,Night,');
});
```

---

### Test 3: CSV Upload - Valid File

**File:** `tests/bulk-shifts/csv-upload.spec.js`

**Scenario:** User uploads valid CSV file

**Test Steps:**
```javascript
test('upload valid CSV file and populate grid', async ({ page }) => {
  // Create test CSV
  const csvPath = path.join(__dirname, 'fixtures', 'valid-shifts.csv');
  await fs.writeFileSync(csvPath, `Role,Date,Shift Type,Quantity
Nurses,16/11/2025,Day,2
Nurses,16/11/2025,Night,2
Healthcare Assistants,16/11/2025,Day,3
Healthcare Assistants,16/11/2025,Night,2`);

  // Setup
  await page.goto('http://localhost:5173/shifts/bulk-create');
  await selectClient(page, 'Richmond Court');
  await selectDateRange(page, '2025-11-16', '2025-11-22');
  await page.click('text=Next');

  // Upload CSV
  await page.setInputFiles('input[type="file"]', csvPath);

  // Verify success toast
  await expect(page.locator('.toast')).toContainText('Uploaded 4 rows from CSV successfully');

  // Verify grid populated
  await expect(page.locator('[data-testid="grid-cell-2025-11-16-nurse_day"]')).toHaveValue('2');
  await expect(page.locator('[data-testid="grid-cell-2025-11-16-hca_night"]')).toHaveValue('2');

  // Cleanup
  await fs.unlinkSync(csvPath);
});
```

**Edge Cases:**
- Missing required columns
- Invalid date formats
- Invalid quantities (negative, decimals, text)
- Roles not in client setup
- Large files (500+ rows)

---

### Test 4: CSV Upload - Invalid File

**File:** `tests/bulk-shifts/csv-upload-validation.spec.js`

**Scenario:** User uploads CSV with validation errors

**Test Steps:**
```javascript
test('show validation errors for invalid CSV', async ({ page }) => {
  // Create invalid CSV
  const csvPath = path.join(__dirname, 'fixtures', 'invalid-shifts.csv');
  await fs.writeFileSync(csvPath, `Role,Date,Shift Type,Quantity
,16/11/2025,Day,2
Nurses,32/13/2025,Day,abc
Nurses,17/11/2025,Morning,3`);

  // Setup and upload
  await page.goto('http://localhost:5173/shifts/bulk-create');
  await selectClient(page, 'Richmond Court');
  await selectDateRange(page, '2025-11-16', '2025-11-22');
  await page.click('text=Next');
  await page.setInputFiles('input[type="file"]', csvPath);

  // Verify error messages
  await expect(page.locator('.toast')).toContainText('CSV validation failed');
  await expect(page.locator('[data-testid="parse-errors"]')).toContainText('Row 2: Missing role');
  await expect(page.locator('[data-testid="parse-errors"]')).toContainText('Row 3: Invalid date format');
  await expect(page.locator('[data-testid="parse-errors"]')).toContainText('Row 3: Invalid quantity');
  await expect(page.locator('[data-testid="parse-errors"]')).toContainText('Row 4: Could not identify shift type');

  // Verify grid not populated
  await expect(page.locator('[data-testid="grid-cell-2025-11-16-nurse_day"]')).toHaveValue('');

  // Cleanup
  await fs.unlinkSync(csvPath);
});
```

---

### Test 5: Edit Shift Modal

**File:** `tests/bulk-shifts/edit-modal.spec.js`

**Scenario:** User edits individual shift before submission

**Test Steps:**
```javascript
test('edit shift details in modal', async ({ page }) => {
  // Setup - create shifts
  await page.goto('http://localhost:5173/shifts/bulk-create');
  await selectClient(page, 'Richmond Court');
  await selectDateRange(page, '2025-11-16', '2025-11-22');
  await page.click('text=Next');

  // Fill grid
  await page.fill('[data-testid="grid-cell-2025-11-16-nurse_day"]', '2');
  await page.click('text=Preview Shifts');

  // Open edit modal
  await page.click('[data-testid="edit-shift-0"]');

  // Verify modal shows correct data
  await expect(page.locator('[data-testid="modal-client"]')).toHaveText('Richmond Court');
  await expect(page.locator('[data-testid="modal-date"]')).toHaveValue('2025-11-16');
  await expect(page.locator('[data-testid="modal-role"]')).toHaveValue('nurse');
  await expect(page.locator('[data-testid="modal-shift-type"]')).toHaveValue('day');

  // Edit times
  await page.fill('[data-testid="modal-start-time"]', '07:00');
  await page.fill('[data-testid="modal-end-time"]', '19:00');

  // Verify real-time calculations
  await expect(page.locator('[data-testid="modal-duration"]')).toHaveText('12 hours');

  // Edit rate
  await page.fill('[data-testid="modal-rate"]', '25.00');

  // Verify cost calculation
  await expect(page.locator('[data-testid="modal-cost"]')).toHaveText('£300.00');

  // Save
  await page.click('text=Save Changes');

  // Verify modal closed
  await expect(page.locator('[data-testid="edit-modal"]')).not.toBeVisible();

  // Verify shift updated in preview
  await expect(page.locator('[data-testid="shift-0-start-time"]')).toHaveText('07:00');
  await expect(page.locator('[data-testid="shift-0-end-time"]')).toHaveText('19:00');
});
```

**Edge Cases:**
- Invalid time formats
- End time before start time (overnight)
- Zero or negative rates
- Required field validation

---

### Test 6: Keyboard Navigation

**File:** `tests/bulk-shifts/keyboard-nav.spec.js`

**Scenario:** Power user navigates grid with keyboard only

**Test Steps:**
```javascript
test('navigate grid with Tab key', async ({ page }) => {
  // Setup
  await page.goto('http://localhost:5173/shifts/bulk-create');
  await selectClient(page, 'Richmond Court');
  await selectDateRange(page, '2025-11-16', '2025-11-22');
  await page.click('text=Next');

  // Focus first cell
  await page.click('[data-testid="grid-cell-2025-11-16-nurse_day"]');

  // Type and Tab
  await page.keyboard.type('2');
  await page.keyboard.press('Tab');

  // Verify moved to next cell
  await expect(page.locator('[data-testid="grid-cell-2025-11-16-nurse_night"]')).toBeFocused();

  // Type and Tab again
  await page.keyboard.type('2');
  await page.keyboard.press('Tab');

  // Verify third cell
  await expect(page.locator('[data-testid="grid-cell-2025-11-16-hca_day"]')).toBeFocused();
});

test('navigate grid with Arrow keys', async ({ page }) => {
  await page.goto('http://localhost:5173/shifts/bulk-create');
  await selectClient(page, 'Richmond Court');
  await selectDateRange(page, '2025-11-16', '2025-11-22');
  await page.click('text=Next');

  // Focus first cell
  await page.click('[data-testid="grid-cell-2025-11-16-nurse_day"]');

  // Arrow Right
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-testid="grid-cell-2025-11-16-nurse_night"]')).toBeFocused();

  // Arrow Down
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-testid="grid-cell-2025-11-17-nurse_night"]')).toBeFocused();

  // Arrow Left
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('[data-testid="grid-cell-2025-11-17-nurse_day"]')).toBeFocused();

  // Arrow Up
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('[data-testid="grid-cell-2025-11-16-nurse_day"]')).toBeFocused();
});

test('Enter key moves down', async ({ page }) => {
  await page.goto('http://localhost:5173/shifts/bulk-create');
  await selectClient(page, 'Richmond Court');
  await selectDateRange(page, '2025-11-16', '2025-11-22');
  await page.click('text=Next');

  await page.click('[data-testid="grid-cell-2025-11-16-nurse_day"]');
  await page.keyboard.type('2');
  await page.keyboard.press('Enter');

  // Verify moved down same column
  await expect(page.locator('[data-testid="grid-cell-2025-11-17-nurse_day"]')).toBeFocused();
});

test('Escape key clears cell', async ({ page }) => {
  await page.goto('http://localhost:5173/shifts/bulk-create');
  await selectClient(page, 'Richmond Court');
  await selectDateRange(page, '2025-11-16', '2025-11-22');
  await page.click('text=Next');

  await page.fill('[data-testid="grid-cell-2025-11-16-nurse_day"]', '5');
  await page.click('[data-testid="grid-cell-2025-11-16-nurse_day"]');
  await page.keyboard.press('Escape');

  // Verify cell cleared
  await expect(page.locator('[data-testid="grid-cell-2025-11-16-nurse_day"]')).toHaveValue('0');
});
```

---

### Test 7: Bulk Fill Actions

**File:** `tests/bulk-shifts/bulk-fill.spec.js`

**Scenario:** User uses bulk fill shortcuts

**Test Steps:**
```javascript
test('fill weekdays with same quantity', async ({ page }) => {
  await page.goto('http://localhost:5173/shifts/bulk-create');
  await selectClient(page, 'Richmond Court');
  await selectDateRange(page, '2025-11-18', '2025-11-24'); // Mon-Sun
  await page.click('text=Next');

  // Click Fill Weekdays
  await page.click('text=Fill Weekdays');

  // Enter quantity in prompt
  page.on('dialog', dialog => dialog.accept('2'));

  // Verify weekdays filled
  await expect(page.locator('[data-testid="grid-cell-2025-11-18-nurse_day"]')).toHaveValue('2'); // Mon
  await expect(page.locator('[data-testid="grid-cell-2025-11-19-nurse_day"]')).toHaveValue('2'); // Tue
  await expect(page.locator('[data-testid="grid-cell-2025-11-21-nurse_day"]')).toHaveValue('2'); // Thu

  // Verify weekends NOT filled
  await expect(page.locator('[data-testid="grid-cell-2025-11-23-nurse_day"]')).toHaveValue(''); // Sun
});

test('fill weekends with different quantity', async ({ page }) => {
  await page.goto('http://localhost:5173/shifts/bulk-create');
  await selectClient(page, 'Richmond Court');
  await selectDateRange(page, '2025-11-16', '2025-11-22');
  await page.click('text=Next');

  // Fill weekdays first
  await page.click('text=Fill Weekdays');
  page.on('dialog', dialog => dialog.accept('2'));

  // Fill weekends with different quantity
  await page.click('text=Fill Weekends');
  page.on('dialog', dialog => dialog.accept('3'));

  // Verify pattern
  await expect(page.locator('[data-testid="grid-cell-2025-11-16-nurse_day"]')).toHaveValue('3'); // Sat
  await expect(page.locator('[data-testid="grid-cell-2025-11-17-nurse_day"]')).toHaveValue('3'); // Sun
  await expect(page.locator('[data-testid="grid-cell-2025-11-18-nurse_day"]')).toHaveValue('2'); // Mon
});

test('fill row with quantity', async ({ page }) => {
  await page.goto('http://localhost:5173/shifts/bulk-create');
  await selectClient(page, 'Richmond Court');
  await selectDateRange(page, '2025-11-16', '2025-11-22');
  await page.click('text=Next');

  // Click Fill → for Saturday
  await page.click('[data-testid="fill-row-2025-11-16"]');
  page.on('dialog', dialog => dialog.accept('5'));

  // Verify all roles for that date filled
  await expect(page.locator('[data-testid="grid-cell-2025-11-16-nurse_day"]')).toHaveValue('5');
  await expect(page.locator('[data-testid="grid-cell-2025-11-16-nurse_night"]')).toHaveValue('5');
  await expect(page.locator('[data-testid="grid-cell-2025-11-16-hca_day"]')).toHaveValue('5');
  await expect(page.locator('[data-testid="grid-cell-2025-11-16-hca_night"]')).toHaveValue('5');

  // Verify other dates NOT filled
  await expect(page.locator('[data-testid="grid-cell-2025-11-17-nurse_day"]')).toHaveValue('');
});
```

---

### Test 8: End-to-End - 109 Shifts

**File:** `tests/bulk-shifts/e2e-full-workflow.spec.js`

**Scenario:** Complete workflow from setup to database insert

**Test Steps:**
```javascript
test('create 109 shifts for Richmond Court', async ({ page }) => {
  // Step 1: Client Setup
  await page.goto('http://localhost:5173/shifts/bulk-create');
  await selectClient(page, 'Richmond Court');
  await selectDateRange(page, '2025-11-16', '2025-11-22');
  await page.click('text=Next');

  // Step 2: Fill Grid
  await page.click('text=Fill Weekdays');
  page.on('dialog', dialog => dialog.accept('2'));

  await page.click('text=Fill Weekends');
  page.on('dialog', dialog => dialog.accept('2'));

  // Manually adjust HCA quantities
  for (let i = 0; i < 7; i++) {
    const date = addDays('2025-11-16', i);
    await page.fill(`[data-testid="grid-cell-${date}-hca_day"]`, '3');
  }

  // Verify grand total
  await expect(page.locator('[data-testid="grand-total"]')).toHaveText('109 shifts');

  // Step 3: Preview
  await page.click('text=Preview Shifts');

  // Verify preview count
  await expect(page.locator('[data-testid="preview-count"]')).toHaveText('109 shifts ready to create');

  // Verify validation passed
  await expect(page.locator('[data-testid="validation-status"]')).toHaveText('✅ All shifts valid');

  // Step 4: Create Shifts
  await page.click('text=Create All Shifts');

  // Wait for batch processing
  await page.waitForTimeout(5000);

  // Verify success
  await expect(page.locator('.toast')).toContainText('Successfully created 109 shifts');

  // Verify database
  const { data: shifts } = await supabase
    .from('shifts')
    .select('*')
    .eq('client_id', RICHMOND_COURT_ID)
    .gte('date', '2025-11-16')
    .lte('date', '2025-11-22');

  expect(shifts.length).toBe(109);

  // Cleanup
  await supabase
    .from('shifts')
    .delete()
    .in('id', shifts.map(s => s.id));
});
```

---

## 🔧 HELPER FUNCTIONS

**File:** `tests/helpers/bulk-shifts-helpers.js`

```javascript
export async function selectClient(page, clientName) {
  await page.click('[data-testid="client-select"]');
  await page.click(`text=${clientName}`);
}

export async function selectDateRange(page, startDate, endDate) {
  await page.fill('[data-testid="start-date"]', startDate);
  await page.fill('[data-testid="end-date"]', endDate);
}

export function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export async function setupTestData(supabase) {
  // Create test client
  const { data: client } = await supabase
    .from('clients')
    .insert({
      name: 'Test Client',
      rates_by_role: {
        nurse: { day: 22.50, night: 25.00 },
        hca: { day: 15.00, night: 17.50 }
      }
    })
    .select()
    .single();

  return client;
}

export async function cleanupTestData(supabase, clientId) {
  await supabase.from('shifts').delete().eq('client_id', clientId);
  await supabase.from('clients').delete().eq('id', clientId);
}
```

---

## 📊 TEST COVERAGE REQUIREMENTS

### Minimum Coverage Goals:

- **Unit Tests:** N/A (Integration tests only)
- **Integration Tests:** 8 test files minimum
- **E2E Tests:** 1 complete workflow
- **Edge Cases:** 20+ scenarios covered

### Critical Paths to Test:

1. ✅ Manual grid entry → Preview → Create
2. ✅ Paste → Preview → Create
3. ✅ CSV Upload → Preview → Create
4. ✅ Grid entry → Edit → Preview → Create
5. ✅ Bulk fill → Preview → Create
6. ✅ Keyboard nav → Preview → Create

---

## 🚨 KNOWN ISSUES TO VALIDATE

### From Previous Implementation:

1. **Paste Parser:**
   - Fuzzy role matching might fail for unusual spellings
   - Date formats outside DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY fail

2. **CSV Upload:**
   - Files >1000 rows not tested
   - Non-UTF-8 encoding not supported

3. **Keyboard Navigation:**
   - No multi-cell selection (Shift+Arrows)
   - No clipboard operations (Ctrl+C/V)

4. **Edit Modal:**
   - Overnight shifts (end < start) might confuse users
   - No visual indicator for overnight

### Your Tests Should Catch:

- RLS violations (cross-agency access)
- Negative quantities
- Invalid date ranges
- Missing required fields
- Batch insert failures
- Race conditions

---

## 📁 FILE STRUCTURE

Create tests in this structure:

```
tests/
  bulk-shifts/
    smart-paste.spec.js
    csv-template.spec.js
    csv-upload.spec.js
    csv-upload-validation.spec.js
    edit-modal.spec.js
    keyboard-nav.spec.js
    bulk-fill.spec.js
    e2e-full-workflow.spec.js
  helpers/
    bulk-shifts-helpers.js
  fixtures/
    valid-shifts.csv
    invalid-shifts.csv
    large-shifts.csv (500 rows)
```

---

## ✅ DEFINITION OF DONE

### Testing Complete When:

- [ ] All 8 test files created
- [ ] All tests passing locally
- [ ] Edge cases covered
- [ ] Database cleanup implemented
- [ ] No flaky tests (run 5x each)
- [ ] Test execution time <5 minutes total

### Documentation Complete When:

- [ ] Test report generated
- [ ] Known failures documented
- [ ] Coverage report submitted
- [ ] Recommendations for Phase 3 provided

---

## 📝 COMPLETION REPORT TEMPLATE

**Save to:** `PROJECT_DELEGATION/COMPLETION_REPORTS/AGENT_2_COMPLETION.md`

```markdown
# AGENT 2 - QA TESTING - COMPLETION REPORT

**Status:** Complete
**Date:** [Date]
**Time Spent:** [X hours]

## Test Summary

**Total Tests:** [X]
**Passing:** [X]
**Failing:** [X]
**Skipped:** [X]

## Test Files Created

- tests/bulk-shifts/smart-paste.spec.js
- tests/bulk-shifts/csv-upload.spec.js
- [etc.]

## Test Results

### Passing Tests
1. [Test name] - [Description]
2. [Test name] - [Description]

### Failing Tests
1. [Test name] - [Reason] - [Bug filed?]

### Edge Cases Tested
1. [Scenario] - [Result]
2. [Scenario] - [Result]

## Bugs Found

### Critical
- [ ] Bug 1: [Description]

### Medium
- [ ] Bug 2: [Description]

### Low
- [ ] Bug 3: [Description]

## Coverage Report

- Smart Paste: [%]
- CSV Upload: [%]
- Edit Modal: [%]
- Keyboard Nav: [%]
- Bulk Fill: [%]

## Recommendations for Phase 3

1. [Recommendation]
2. [Recommendation]

## Known Issues (Not Bugs)

1. [Limitation]
2. [Limitation]

## Ready for Production?

- [ ] Yes, all critical paths tested
- [ ] No, blockers: [List]
```

---

## 🚀 GET STARTED

### Setup Steps

1. Ensure Playwright installed: `npm install -D @playwright/test`
2. Create test database with seed data
3. Update test-config.ts with credentials
4. Run dev server: `npm run dev`
5. Run tests: `npx playwright test`

### Development Flow

1. Read all Phase 2 completion docs
2. Create helper functions first
3. Write tests in order (simple → complex)
4. Run each test individually before moving on
5. Document any bugs found
6. Submit completion report when done

---

**ASSIGNED TO:** Agent 2
**DUE DATE:** ASAP (Phase 2 quality gate)
**PROJECT LEADER:** Lead AI Agent

Your tests are the safety net for production. Be thorough! 🧪
