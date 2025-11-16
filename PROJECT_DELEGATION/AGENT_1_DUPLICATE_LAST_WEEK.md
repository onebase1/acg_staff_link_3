# AGENT 1 - DUPLICATE LAST WEEK FEATURE

**Priority:** 🔴 HIGH (Completes Phase 2)
**Complexity:** Medium-High
**Estimated Time:** 6 hours
**Skills Required:** Database queries, React state management, date manipulation

---

## 🎯 MISSION OBJECTIVE

Implement "Duplicate Last Week" functionality that allows users to copy shift patterns from the previous week and apply them to the current date range. This is the **final task of Phase 2**.

---

## 📋 FEATURE REQUIREMENTS

### User Story

**As a** care home admin
**I want to** duplicate last week's shift pattern
**So that** I don't have to manually re-enter the same weekly schedule

### Acceptance Criteria

✅ **MUST HAVE:**
1. Button to trigger "Duplicate Last Week"
2. Fetch shifts from 7 days before current date range
3. Map old dates to new dates (maintain day-of-week alignment)
4. Preserve role quantities
5. Populate grid with duplicated pattern
6. Show count of shifts found and duplicated
7. Handle "no shifts found" gracefully

✅ **SHOULD HAVE:**
8. Loading state during fetch
9. Confirmation dialog showing what will be duplicated
10. Toast notifications for success/error

✅ **NICE TO HAVE:**
11. Option to choose which week to duplicate (not just last week)
12. Preview before applying

---

## 🏗️ TECHNICAL SPECIFICATION

### Component Location

**File to Modify:** `src/components/bulk-shifts/Step2MultiRoleGrid.jsx`

**Where to Add Button:** Bottom action bar (next to Fill Weekdays, Fill Weekends)

### Function Signature

```javascript
const handleDuplicateLastWeek = async () => {
  // Your implementation here
};
```

### Database Query

**Table:** `shifts`

**Query Logic:**
```javascript
// Get date range for "last week" (7 days before current range start)
const currentStart = new Date(formData.dateRange.startDate);
const lastWeekStart = new Date(currentStart);
lastWeekStart.setDate(lastWeekStart.getDate() - 7);

const lastWeekEnd = new Date(currentStart);
lastWeekEnd.setDate(lastWeekEnd.getDate() - 1); // Day before current range starts

// Fetch shifts from last week for this client
const { data: lastWeekShifts, error } = await supabase
  .from('shifts')
  .select('date, role, shift_type, start_time, end_time')
  .eq('client_id', formData.client_id)
  .eq('agency_id', currentAgency)
  .gte('date', lastWeekStart.toISOString().split('T')[0])
  .lte('date', lastWeekEnd.toISOString().split('T')[0])
  .eq('status', 'open'); // Only duplicate open/unfilled shifts
```

### Date Mapping Logic

```javascript
// Map each last week shift to new date range
// Maintain day-of-week alignment

const mapShiftToNewDate = (oldShift, oldRangeStart, newRangeStart) => {
  const oldDate = new Date(oldShift.date + 'T00:00:00');
  const daysDiff = Math.floor((oldDate - oldRangeStart) / (1000 * 60 * 60 * 24));

  const newDate = new Date(newRangeStart);
  newDate.setDate(newDate.getDate() + daysDiff);

  return newDate.toISOString().split('T')[0];
};
```

### Grid Population

```javascript
// Count shifts by role and date
const gridCounts = {};

lastWeekShifts.forEach(shift => {
  const newDate = mapShiftToNewDate(shift, lastWeekStart, currentStart);

  if (!gridCounts[newDate]) {
    gridCounts[newDate] = {};
  }

  const roleKey = `${shift.role}_${shift.shift_type}`;
  gridCounts[newDate][roleKey] = (gridCounts[newDate][roleKey] || 0) + 1;
});

// Populate grid
setFormData(prev => ({
  ...prev,
  gridData: {
    ...prev.gridData,
    ...gridCounts
  }
}));
```

---

## 💻 IMPLEMENTATION GUIDE

### Step 1: Add Button to UI

**Location:** After "Fill Weekends" button in action bar

```jsx
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={handleDuplicateLastWeek}
  disabled={!formData.client_id || isLoadingDuplicate}
>
  <Calendar className="w-3 h-3 mr-1" />
  {isLoadingDuplicate ? 'Loading...' : 'Duplicate Last Week'}
</Button>
```

### Step 2: Add State

```javascript
const [isLoadingDuplicate, setIsLoadingDuplicate] = useState(false);
```

### Step 3: Implement Handler Function

```javascript
const handleDuplicateLastWeek = async () => {
  if (!formData.client_id) {
    toast.error('Please select a client first');
    return;
  }

  if (!formData.dateRange.startDate || !formData.dateRange.endDate) {
    toast.error('Please select a date range first');
    return;
  }

  // Confirm action
  const confirmed = window.confirm(
    'This will duplicate shift patterns from last week. Any existing quantities will be overwritten. Continue?'
  );

  if (!confirmed) return;

  setIsLoadingDuplicate(true);

  try {
    // Calculate last week date range
    const currentStart = new Date(formData.dateRange.startDate + 'T00:00:00');
    const lastWeekStart = new Date(currentStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const lastWeekEnd = new Date(currentStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    // Fetch last week's shifts
    const { data: lastWeekShifts, error } = await supabase
      .from('shifts')
      .select('date, role, shift_type')
      .eq('client_id', formData.client_id)
      .eq('agency_id', currentAgency)
      .gte('date', lastWeekStart.toISOString().split('T')[0])
      .lte('date', lastWeekEnd.toISOString().split('T')[0])
      .eq('status', 'open');

    if (error) throw error;

    if (!lastWeekShifts || lastWeekShifts.length === 0) {
      toast.warning('No shifts found from last week');
      setIsLoadingDuplicate(false);
      return;
    }

    // Count shifts by date and role
    const gridCounts = {};

    lastWeekShifts.forEach(shift => {
      // Map old date to new date
      const oldDate = new Date(shift.date + 'T00:00:00');
      const daysDiff = Math.floor((oldDate - lastWeekStart) / (1000 * 60 * 60 * 24));

      const newDate = new Date(currentStart);
      newDate.setDate(newDate.getDate() + daysDiff);
      const newDateStr = newDate.toISOString().split('T')[0];

      // Only include if within current date range
      if (newDateStr >= formData.dateRange.startDate && newDateStr <= formData.dateRange.endDate) {
        if (!gridCounts[newDateStr]) {
          gridCounts[newDateStr] = {};
        }

        const roleKey = `${shift.role}_${shift.shift_type}`;
        gridCounts[newDateStr][roleKey] = (gridCounts[newDateStr][roleKey] || 0) + 1;
      }
    });

    // Merge with existing grid (replaces matching dates)
    setFormData(prev => ({
      ...prev,
      gridData: {
        ...prev.gridData,
        ...gridCounts
      }
    }));

    toast.success(`Duplicated ${lastWeekShifts.length} shifts from last week`);

  } catch (error) {
    console.error('Error duplicating last week:', error);
    toast.error(`Failed to duplicate: ${error.message}`);
  } finally {
    setIsLoadingDuplicate(false);
  }
};
```

---

## 🧪 TESTING REQUIREMENTS

### Manual Testing Checklist

- [ ] **Test 1: Happy Path**
  - Create 20 shifts for week of Nov 10-16
  - Select date range Nov 17-23
  - Click "Duplicate Last Week"
  - Verify grid populated with same pattern shifted by 7 days

- [ ] **Test 2: No Previous Shifts**
  - Select a client with no previous shifts
  - Click "Duplicate Last Week"
  - Verify warning message shown

- [ ] **Test 3: Partial Week**
  - Create only 3 shifts last week
  - Duplicate to new week
  - Verify only 3 shifts duplicated

- [ ] **Test 4: Mixed Roles**
  - Create shifts with 4 different roles last week
  - Duplicate
  - Verify all roles preserved

- [ ] **Test 5: Overwrite Existing**
  - Manually enter 2 shifts for Monday
  - Duplicate last week (has 5 shifts Monday)
  - Verify Monday now shows 5 (not 7)

- [ ] **Test 6: Loading State**
  - Click duplicate
  - Verify button shows "Loading..." during fetch
  - Verify button disabled during load

- [ ] **Test 7: Error Handling**
  - Disconnect internet
  - Click duplicate
  - Verify error toast shown

- [ ] **Test 8: Confirmation Dialog**
  - Click duplicate
  - Click "Cancel" on confirm
  - Verify no changes made

### Automated Testing (Optional)

```javascript
// Example Playwright test
test('duplicate last week populates grid', async ({ page }) => {
  // Setup: Create shifts for last week
  // Navigate to bulk shift creation
  // Select client and date range
  // Click "Duplicate Last Week"
  // Assert grid populated
});
```

---

## 📊 EXPECTED BEHAVIOR

### User Flow

```
1. User selects client: "Richmond Court"
2. User selects date range: Nov 17-23 (this week)
3. User clicks "Duplicate Last Week"
   ↓
4. System fetches shifts from Nov 10-16 (last week)
   - Finds 109 shifts
   ↓
5. System maps dates:
   - Nov 10 (last Mon) → Nov 17 (this Mon)
   - Nov 11 (last Tue) → Nov 18 (this Tue)
   - etc.
   ↓
6. System counts by role:
   - Mon Nov 17: nurse_day=2, nurse_night=2, hca_day=3, hca_night=2
   - Tue Nov 18: nurse_day=2, nurse_night=2, hca_day=3, hca_night=2
   - etc.
   ↓
7. System populates grid
   ↓
8. User sees: "✅ Duplicated 109 shifts from last week"
9. Grid shows all cells filled
10. User clicks "Preview Shifts →"
```

### Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No shifts last week | Show warning toast, don't change grid |
| Partial overlap | Only duplicate dates within current range |
| Different client | Fetch only that client's shifts |
| Different agency | RLS prevents cross-agency duplication |
| Database error | Show error toast, don't crash |
| User cancels | No changes to grid |

---

## 🔒 SECURITY CONSIDERATIONS

### RLS (Row Level Security)

**IMPORTANT:** The Supabase query will automatically enforce RLS policies.

**Verify:**
```sql
-- User can only access shifts for their agency
SELECT * FROM shifts WHERE agency_id = auth.uid()::text
```

**Do NOT:**
- Bypass RLS
- Fetch shifts from other agencies
- Expose shift data in client-side code

---

## 📁 FILES TO MODIFY

### Primary File

**Path:** `src/components/bulk-shifts/Step2MultiRoleGrid.jsx`

**Changes:**
- Add `isLoadingDuplicate` state
- Add `handleDuplicateLastWeek` function
- Add button to action bar
- Import `supabase` if not already imported

**Estimated Lines Added:** ~100 lines

---

## 🎨 UI/UX SPECIFICATIONS

### Button Appearance

**Location:** Action bar (bottom of grid)
**Position:** After "Fill Weekends", before "Clear All"
**Icon:** Calendar
**Text:** "Duplicate Last Week"
**Variant:** outline
**Size:** sm

**Disabled States:**
- No client selected
- No date range selected
- Currently loading

**Loading State:**
- Text changes to "Loading..."
- Button disabled
- Spinner icon (optional)

### Toast Notifications

**Success:**
```
✅ Duplicated 109 shifts from last week
```

**Warning (no shifts):**
```
⚠️ No shifts found from last week
```

**Error:**
```
❌ Failed to duplicate: [error message]
```

---

## 💡 IMPLEMENTATION TIPS

### Date Manipulation

**Use this helper:**
```javascript
// Safe date parsing
const parseDate = (dateStr) => {
  return new Date(dateStr + 'T00:00:00');
};

// Add days to date
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
```

### Debugging

**Console logs to add:**
```javascript
console.log('Last week range:', lastWeekStart, '->', lastWeekEnd);
console.log('Found shifts:', lastWeekShifts.length);
console.log('Grid counts:', gridCounts);
```

**Remove before submitting!**

---

## 📚 REFERENCE CODE

### Similar Pattern (Fill Weekdays)

Look at `handleFillWeekdays()` in same file for:
- Grid data structure
- Toast notifications
- State updates

### Database Query Examples

Look at `src/components/bulk-shifts/Step1ClientSetup.jsx` for:
- Supabase query syntax
- Error handling
- Loading states

---

## ✅ DEFINITION OF DONE

### Code Complete When:

- [ ] Function implemented and tested
- [ ] Button added to UI
- [ ] Loading state handled
- [ ] Error handling implemented
- [ ] Toast notifications added
- [ ] Code commented
- [ ] No console errors
- [ ] No console warnings
- [ ] Matches existing code style

### Testing Complete When:

- [ ] All 8 manual tests passed
- [ ] Edge cases tested
- [ ] Error scenarios tested
- [ ] Works with real database
- [ ] Performance acceptable (<2s)

### Documentation Complete When:

- [ ] Completion report submitted
- [ ] Known issues documented
- [ ] User instructions written
- [ ] Code comments added

---

## 📝 COMPLETION REPORT TEMPLATE

**Save to:** `PROJECT_DELEGATION/COMPLETION_REPORTS/AGENT_1_COMPLETION.md`

```markdown
# AGENT 1 - DUPLICATE LAST WEEK - COMPLETION REPORT

**Status:** Complete
**Date:** [Date]
**Time Spent:** [X hours]

## Implementation Summary

[What you built]

## Files Modified

- src/components/bulk-shifts/Step2MultiRoleGrid.jsx (lines XXX-XXX)

## Testing Results

### Manual Tests
- [x] Test 1: Happy path - PASSED
- [x] Test 2: No previous shifts - PASSED
- etc.

### Edge Cases Tested
1. [Description] - [Result]
2. [Description] - [Result]

## Known Issues

1. [Issue if any]

## Screenshots

[Optional: Add screenshots showing feature working]

## Ready for Review

- [ ] All tests passing
- [ ] Code commented
- [ ] No blockers
```

---

## 🚀 GET STARTED

### Setup Steps

1. Pull latest code
2. Install dependencies (if needed)
3. Start dev server: `npm run dev`
4. Navigate to bulk shift creation page
5. Begin implementation

### Development Flow

1. Read this document thoroughly
2. Review reference files
3. Implement in small increments
4. Test after each increment
5. Commit frequently (local)
6. Submit when complete

---

## ❓ QUESTIONS?

**If you encounter blockers:**
1. Document in completion report
2. Make best judgment call
3. Note assumption made
4. Continue with task

**Do not wait for approval on:**
- Code style decisions
- Minor UX tweaks
- Error message wording

**Do flag for review:**
- Security concerns
- Performance issues
- Breaking changes

---

**ASSIGNED TO:** Agent 1
**DUE DATE:** ASAP (Phase 2 completion depends on this)
**PROJECT LEADER:** Lead AI Agent

Good luck! This is the final piece of Phase 2. Let's finish strong! 🚀
