# Directive: UI Stability and Lifecycle Guard

## Goal
To prevent frontend regressions such as infinite render loops, "Maximum update depth exceeded" errors, and unstable data references in complex React components (e.g., `LiveRota.jsx`).

## Core Principles
1. **Stable Defaults**: Never use inline literals (like `[]` or `{}`) as default values in `useQuery` destructuring or props if they are used as dependencies in `useMemo` or `useEffect`.
2. **Effect Guards**: Always add a comparison guard (e.g., stringifying keys or deep comparison) to `useEffect` hooks that update state based on complex data structures.
3. **Data Uniformity**: Centralize data transformations in `useQuery` `select` or `queryFn` to keep derived state references stable and avoid redundant mappings.

## Critical Patterns
- **Unstable Dependency**: `const { data: shifts = [] } = useQuery(...)` -> `[]` is a new object reference on every render while `data` is `undefined`.
- **Render Loop Cascade**: An unstable dependency triggers a `useMemo` -> triggers `useEffect` -> calls `setState` -> triggers re-render -> loop.

## Implementation Standard (from LiveRota logic)
```javascript
// 1. Stabilize references
const EMPTY_ARRAY = useMemo(() => [], []);
const shifts = rawShifts || EMPTY_ARRAY;

// 2. Guard state updates in effects
useEffect(() => {
    if (!shifts.length) return;
    const newKeys = generateKeys(groupedData);
    if (currentKeys !== newKeys) {
        setExpandedGroups(newExpanded);
    }
}, [groupedData, shifts.length]);
```

## Shift Assignment Modal (Strict Safety Protocols)
The `ShiftAssignmentModal.jsx` handles core assignment logic and is highly sensitive to cache poisoning and filtering errors.

1. **Strict Client-Side Filtering:** The `filteredStaff` function MUST completely hide staff whose `validation.valid` state evaluates to false (e.g., 11-hour rest violations, double bookings). Do not render them with a disabled button.
2. **React Query Cache Poisoning Prevention:** The global `QueryClient` maps a 5-minute `staleTime`. You MUST use `staleTime: 0` and `cacheTime: 0` on the `staff-for-assignment` query to override this. Additionally, NEVER `return []` inside the `useQuery` `queryFn` catch block for network/abort errors—if you do, React Query permanently caches the `[]` as a successful result! **Always `throw error;`** so the query actively fails and retries.
3. **Role String Normalization:** Shift roles between app inputs and the database can vary significantly by case and spacing. Always run rigorous global normalization:
```javascript
// Safest method for cross-matching (e.g. 'Healthcare Assistant' vs 'healthcare_assistant')
const cleanRole = (shift.role_required || '').trim().toLowerCase();
const roleSearch = cleanRole;
const roleAlt = cleanRole.includes(' ') 
  ? cleanRole.replace(/\s+/g, '_') 
  : cleanRole.replace(/_/g, ' ');
const rolesToMatch = [...new Set([roleSearch, roleAlt])].filter(Boolean);
// ... then query with `.in('role', rolesToMatch)`
```
**Avoid complex regex character classes like `[_-]`**, as unescaped hyphens at the end of ranges cause silent JavaScript compilation crashes in some browser environments leading to "invisible" empty modal states!
