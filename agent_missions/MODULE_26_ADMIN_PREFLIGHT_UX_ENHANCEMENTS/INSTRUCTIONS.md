# MODULE 26: ADMIN PREFLIGHT UX ENHANCEMENTS

## 🎯 Mission Objective
Add profile completion % column and "Ready to Invite" filter to staff list for better admin experience.

## 📊 Priority: P2 - MEDIUM
**Duration:** 1-2 hours
**Dependencies:** MODULE 21 (profileHelpers.js)

---

## 🚀 Implementation

### 1. Add Completion Column to Staff Table

**File:** `src/pages/Staff.jsx`

**Import helper:**
```jsx
import { calculateProfileCompletion, getCompletionBadge } from '../utils/profileHelpers';
```

**Add column header:**
```jsx
<TableHead>Completion</TableHead>
```

**Add column cell:**
```jsx
<TableCell>
  {(() => {
    const { percentage } = calculateProfileCompletion(staffMember);
    const badge = getCompletionBadge(percentage);

    return (
      <div className="flex items-center gap-2">
        <span className="text-lg">{badge.icon}</span>
        <div>
          <div className="text-sm font-semibold">{percentage}%</div>
          <div className={`text-xs ${
            badge.color === 'green' ? 'text-green-600' :
            badge.color === 'yellow' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {badge.text}
          </div>
        </div>
      </div>
    );
  })()}
</TableCell>
```

### 2. Add Completion Filter

**Add filter state:**
```jsx
const [completionFilter, setCompletionFilter] = useState('all');
```

**Add filter dropdown:**
```jsx
<select
  value={completionFilter}
  onChange={(e) => setCompletionFilter(e.target.value)}
  className="border rounded-lg px-3 py-2"
>
  <option value="all">All Staff</option>
  <option value="ready">✅ Ready to Invite (80%+)</option>
  <option value="in_progress">⚠️ In Progress (50-79%)</option>
  <option value="incomplete">❌ Incomplete (<50%)</option>
</select>
```

**Filter logic:**
```jsx
const filteredStaff = allStaff.filter(s => {
  if (completionFilter === 'all') return true;

  const { percentage } = calculateProfileCompletion(s);

  if (completionFilter === 'ready') return percentage >= 80;
  if (completionFilter === 'in_progress') return percentage >= 50 && percentage < 80;
  if (completionFilter === 'incomplete') return percentage < 50;

  return true;
});
```

### 3. Add Hover Tooltip for Missing Fields

**Install tooltip library (if not present):**
```bash
npx shadcn-ui@latest add tooltip
```

**Wrap completion cell:**
```jsx
<Tooltip>
  <TooltipTrigger>
    {/* ... completion display ... */}
  </TooltipTrigger>
  <TooltipContent>
    <p className="font-semibold">Missing Fields:</p>
    <ul className="text-xs list-disc list-inside">
      {calculateProfileCompletion(staffMember).missingFields.map(field => (
        <li key={field}>{field}</li>
      ))}
    </ul>
  </TooltipContent>
</Tooltip>
```

### 4. Warn Before Sending Invite if <50% Complete

**In handleSendInvite:**
```jsx
const handleSendInvite = async (staffMember) => {
  const { percentage, missingFields } = calculateProfileCompletion(staffMember);

  if (percentage < 50) {
    const confirm = window.confirm(
      `⚠️ Warning: This profile is only ${percentage}% complete.\n\n` +
      `Missing: ${missingFields.slice(0, 5).join(', ')}${missingFields.length > 5 ? ` +${missingFields.length - 5} more` : ''}\n\n` +
      `Staff will need to fill these fields during onboarding. Continue?`
    );

    if (!confirm) return;
  }

  // ... proceed with invite ...
};
```

---

## ✅ Success Criteria

✅ Completion % shown in staff list
✅ Color-coded badges (green/yellow/red)
✅ Filter by completion status
✅ Hover tooltip shows missing fields
✅ Warning before inviting incomplete profiles

**MODULE 26 COMPLETE!**
