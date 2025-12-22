# MODULE: GPS vs Manual Timesheet Shifts

## Problem Statement

Currently, the system assumes **all shifts require GPS clock-in/out**. This is incorrect:
- Some clients (e.g., private home care) don't need GPS verification
- Some shifts are purely timesheet-based (staff submits hours manually)
- The automation engines (no-show detection, clock-out reminders) incorrectly trigger for non-GPS shifts

### Current Behavior (WRONG)
1. Staff gets "forgot to clock in" SMS even for timesheet-based shifts
2. No-show detection flags shifts that don't use GPS clock-in
3. Clock-out reminders sent for shifts that don't use GPS
4. Staff portal always shows GPS clock-in UI even when not needed

---

## Existing Infrastructure

### Already Exists ✅
- `clients.geofence_enabled` (BOOLEAN) - Currently only used by `geofence-validator` to bypass distance validation
- `geofence-validator` function already checks this flag and auto-validates if disabled

### Missing ❌
- No shift-level override for GPS requirement
- Automation engines don't check the client's `geofence_enabled` flag
- Staff portal doesn't adapt UI based on GPS requirement
- No clear UX for agencies to configure this

---

## Options Analysis

### Option A: Client-Level Only (Simple)
**Use existing `clients.geofence_enabled` flag everywhere**

| Pros | Cons |
|------|------|
| Already exists in DB | No flexibility per-shift |
| Simple implementation | What if same client has GPS and non-GPS shifts? |
| One setting = many shifts | Can't override for specific situations |

**Implementation Effort:** LOW (2-3 hours)

---

### Option B: Shift-Level Only
**Add `shifts.requires_gps` boolean, default TRUE**

| Pros | Cons |
|------|------|
| Maximum flexibility | More work when creating shifts |
| Each shift explicit | Easy to forget to set |
| Override anything | Bulk creation more complex |

**Implementation Effort:** MEDIUM (4-6 hours)

---

### Option C: Hybrid - Client Default + Shift Override (RECOMMENDED)
**Use `clients.geofence_enabled` as default, `shifts.requires_gps` as optional override**

| Pros | Cons |
|------|------|
| Best of both worlds | More complex logic |
| Client sets baseline | Two places to check |
| Shift can override when needed | Slightly more code |

**Logic:**
```javascript
const requiresGPS = shift.requires_gps !== null 
  ? shift.requires_gps           // Shift-level override wins
  : client.geofence_enabled;     // Fall back to client default
```

**Implementation Effort:** MEDIUM (5-7 hours)

---

## Recommended Approach: Option C (Hybrid)

### Why Hybrid?
1. **Care homes** typically want GPS for ALL shifts (set once at client level)
2. **Private clients** typically DON'T want GPS (set once at client level)
3. **Exceptions** happen (training shift at care home = no GPS, one-off verification = GPS)
4. **Agencies** can choose their level of control

---

## Implementation Checklist

### Phase 1: Database (30 mins)
- [ ] Add `shifts.requires_gps` column (BOOLEAN, nullable, default NULL)
- [ ] NULL = inherit from client, TRUE/FALSE = override

```sql
ALTER TABLE shifts ADD COLUMN requires_gps BOOLEAN DEFAULT NULL;
COMMENT ON COLUMN shifts.requires_gps IS 'Override client GPS setting. NULL=inherit from client, TRUE=require GPS, FALSE=no GPS needed';
```

### Phase 2: Edge Functions (2-3 hours)
Update these functions to check `requiresGPS` before acting:

| Function | Current Behavior | Required Change |
|----------|-----------------|-----------------|
| `no-show-detection-engine` | Always checks for clock-in | Skip if `!requiresGPS` |
| `smart-clock-out-reminders` | Always sends reminders | Skip if `!requiresGPS` |
| `shift-status-automation` | Checks for GPS data | Use different completion logic for non-GPS |
| `auto-timesheet-approval-engine` | GPS validation in criteria | Skip GPS checks if `!requiresGPS` |

**Helper function to add to each:**
```typescript
async function shiftRequiresGPS(supabase, shift, client) {
  // Shift-level override wins
  if (shift.requires_gps !== null) {
    return shift.requires_gps;
  }
  // Fall back to client setting (default true if not set)
  return client?.geofence_enabled !== false;
}
```

### Phase 3: Staff Portal (1-2 hours)
Update `MobileClockIn.jsx`:

| If GPS Required | If GPS NOT Required |
|-----------------|---------------------|
| Show GPS clock-in UI | Show simple "Start Shift" button |
| Validate geofence | Just record start time |
| Show location indicator | No location needed |

```jsx
// In MobileClockIn.jsx
const requiresGPS = shift.requires_gps !== null 
  ? shift.requires_gps 
  : client?.geofence_enabled !== false;

if (!requiresGPS) {
  // Show simplified timesheet-based UI
  return <ManualTimesheetEntry shift={shift} />;
}
// Existing GPS-based UI
```

### Phase 4: Shift Creation UX (1-2 hours)

#### A. Client Settings Page (`/clients` edit modal)
- [ ] Show `geofence_enabled` toggle with clear label
- [ ] Label: "Require GPS Clock-In for shifts at this location"
- [ ] Default: ON for care homes, OFF for private clients (based on client type?)

#### B. Single Shift Creation (`PostShiftV3`)
- [ ] Add "GPS Required" toggle (only show if different from client default)
- [ ] Label: "Override: This shift requires GPS clock-in" or "Override: No GPS needed"

#### C. Bulk Shift Creation (`BulkShiftCreation`)
- [ ] Add column or option for GPS override
- [ ] Default: inherit from client (show client's setting)

### Phase 5: Timesheet Handling (1 hour)
For non-GPS shifts, timesheets work differently:

| GPS Shifts | Non-GPS Shifts |
|------------|---------------|
| Auto-created on clock-in | Staff creates manually OR admin enters |
| GPS location captured | No location data |
| Geofence validated | `geofence_validated = null` (N/A) |
| Auto-approval if GPS verified | Requires signature OR admin approval |

---

## Files Affected

### Database
- `supabase/migrations/YYYYMMDD_add_requires_gps_to_shifts.sql`

### Edge Functions
- `supabase/functions/no-show-detection-engine/index.ts`
- `supabase/functions/smart-clock-out-reminders/index.ts`
- `supabase/functions/shift-status-automation/index.ts`
- `supabase/functions/auto-timesheet-approval-engine/index.ts`
- `supabase/functions/_shared/gpsHelper.ts` (NEW - shared helper)

### Frontend
- `src/components/staff/MobileClockIn.jsx`
- `src/components/staff/ManualTimesheetEntry.jsx` (NEW)
- `src/pages/PostShiftV3.jsx`
- `src/pages/BulkShiftCreation.jsx`
- `src/pages/Clients.jsx` (client edit modal)

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Existing shifts have NULL `requires_gps` | NULL = inherit from client (safe default) |
| Agencies confused by two settings | Clear UX: "Client default is X, override here" |
| Non-GPS shifts harder to verify | Require signatures for non-GPS timesheets |
| Staff abuse (claim hours not worked) | Flag for admin review if no GPS and no signature |

---

## Testing Checklist

1. [ ] Create client with `geofence_enabled = false`
2. [ ] Create shift for that client → should NOT require GPS
3. [ ] Verify no-show detection skips this shift
4. [ ] Verify clock-out reminders skip this shift
5. [ ] Verify staff portal shows simplified UI
6. [ ] Create shift with `requires_gps = true` override → should require GPS
7. [ ] Create shift with `requires_gps = false` override at GPS-enabled client → should NOT require GPS

---

## Decision Required

Before implementation, confirm:

1. **Default behavior for existing clients?**
   - Option A: All existing = GPS required (current behavior)
   - Option B: Backfill based on client type (care_home = GPS, private = no GPS)

2. **Staff portal for non-GPS shifts?**
   - Option A: Simple "Start/End Shift" buttons (no GPS at all)
   - Option B: Optional GPS (try to capture but don't block if unavailable)

3. **Timesheet approval for non-GPS?**
   - Option A: Always require signatures
   - Option B: Allow admin approval without signatures
   - Option C: Trust staff (auto-approve after 48h if no disputes)

---

## Estimated Total Effort

| Phase | Time |
|-------|------|
| Database migration | 30 mins |
| Edge functions (4 functions) | 2-3 hours |
| Staff portal | 1-2 hours |
| Shift creation UX | 1-2 hours |
| Testing | 1 hour |
| **TOTAL** | **6-9 hours** |

---

## Next Steps

1. User confirms Option C (Hybrid) approach
2. User answers Decision Required questions
3. Agent implements in phases
4. Test each phase before moving to next

