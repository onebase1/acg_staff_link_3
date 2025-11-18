# Booking Time Migration Fix

## Problem
After converting `shifts.start_time` and `shifts.end_time` from TIMESTAMPTZ to TEXT (HH:MM format), staff assignment failed with error:
```
invalid input syntax for type timestamp with time zone: "20:00"
```

## Root Cause
- `shifts` table was converted to TEXT (HH:MM format) via migration `20251118_convert_shift_times_to_text.sql`
- `bookings` table still had TIMESTAMPTZ columns for `start_time` and `end_time`
- Code was passing TEXT values ("08:00", "20:00") to TIMESTAMPTZ columns → PostgreSQL error

## Why Times Are TEXT (Not TIMESTAMPTZ)
- Shift/booking times are **reference/display only** - used for notifications and UI display
- **Actual financial times** come from `timesheets.actual_start_time` and `timesheets.actual_end_time` (also TEXT)
- These are recorded post-shift when timesheet is submitted and approved
- No need for timezone precision in reference times

## Solution Applied

### 1. Database Migration
Created: `supabase/migrations/20251118_convert_booking_times_to_text.sql`
- Converts `bookings.start_time` and `bookings.end_time` from TIMESTAMPTZ to TEXT
- Extracts HH:MM format from existing timestamps
- Adds format validation constraints (HH24:MI)
- Preserves existing data

### 2. Code Updates (7 files)
All booking insert operations now correctly pass TEXT values:

✅ **src/pages/Shifts.jsx** (line 476-477)
- Staff assignment mutation

✅ **src/components/staff/MobileClockIn.jsx** (line 350-351)
- Clock-in booking creation

✅ **src/pages/StaffPortal.jsx** (line 393-394)
- Staff portal shift confirmation

✅ **src/pages/Dashboard.jsx** (line 525-526)
- Dashboard quick assignment

✅ **scripts/apply_bookings_fix.js** (line 91-92)
- Test script

✅ **scripts/check_bookings_rls.js** (line 111-112)
- RLS test script

✅ **scripts/create_test_bookings.js** (line 76-77)
- Booking creation script

### 3. Display Code
**src/pages/Bookings.jsx** (line 338-342) already displays times correctly:
```javascript
{booking.start_time && booking.end_time && (
  <div className="flex items-center gap-2 text-sm text-gray-600">
    <Clock className="w-4 h-4 text-gray-400" />
    <span>{booking.start_time} - {booking.end_time}</span>
  </div>
)}
```

After migration, this will show "08:00 - 20:00" instead of full timestamps.

## Testing Steps

1. **Apply migration**:
   ```bash
   supabase db reset
   # or
   supabase migration up
   ```

2. **Test staff assignment**:
   - Go to `/shift`
   - Assign staff to a shift
   - Should succeed without TIMESTAMPTZ error

3. **Verify booking display**:
   - Go to `/bookings`
   - Check times display as "08:00 - 20:00" (not full timestamps)

4. **Verify database**:
   ```sql
   SELECT start_time, end_time FROM bookings LIMIT 5;
   -- Should show: "08:00", "20:00" (TEXT format)
   ```

## Schema Consistency
After this fix, time columns are consistent across tables:

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| shifts | start_time | TEXT | Reference time (display/notifications) |
| shifts | end_time | TEXT | Reference time (display/notifications) |
| bookings | start_time | TEXT | Reference time (display) |
| bookings | end_time | TEXT | Reference time (display) |
| timesheets | actual_start_time | TEXT | **Financial time** (invoicing/payroll) |
| timesheets | actual_end_time | TEXT | **Financial time** (invoicing/payroll) |

## Rollback Plan
If needed, revert with:
```sql
-- Convert back to TIMESTAMPTZ (loses HH:MM simplicity)
ALTER TABLE bookings DROP CONSTRAINT bookings_start_time_format;
ALTER TABLE bookings DROP CONSTRAINT bookings_end_time_format;
ALTER TABLE bookings ALTER COLUMN start_time TYPE TIMESTAMPTZ USING (CURRENT_DATE + start_time::TIME);
ALTER TABLE bookings ALTER COLUMN end_time TYPE TIMESTAMPTZ USING (CURRENT_DATE + end_time::TIME);
```

## Related Files
- Migration: `supabase/migrations/20251118_convert_shift_times_to_text.sql` (shifts)
- Migration: `supabase/migrations/20251118_convert_booking_times_to_text.sql` (bookings - NEW)
- Schema: `expected_schema.json` (already shows TEXT for bookings times)

