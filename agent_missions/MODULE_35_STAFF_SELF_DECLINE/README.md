# MODULE 35: Staff Self-Decline Feature

**Status:** 📋 Planning
**Priority:** High
**Estimated Time:** 90 minutes
**Dependencies:** Auto-assignment engine, Marketplace, Urgent broadcast system

---

## 🎯 Objective

Enable staff members to decline/remove themselves from assigned or confirmed shifts through the Staff Portal, with intelligent automation based on time-until-shift and agency settings.

---

## 📋 Business Requirements

### User Story
> "As a staff member, I need to be able to decline a shift I've been assigned to when I realize I cannot work it, so that the agency can find a replacement quickly."

### Key Constraints
1. **Notification Mandatory**: Staff MUST receive multi-channel notification when unassigned (prevent double-staffing)
2. **Conditional Automation**: System behavior depends on:
   - Time until shift starts
   - Agency settings (auto-matcher enabled? marketplace enabled?)
3. **Deterrent System**: Staff should see warnings about reliability impact
4. **Audit Trail**: All declines must be logged with reason and timestamp

---

## 🔄 Current System State

### What Already Exists ✅
1. **Auto-assignment engine** (`auto-shift-assignment-engine/index.ts`) - matches open shifts to qualified staff
2. **Marketplace system** - shifts have `marketplace_visible` and `marketplace_added_at` fields
3. **Urgent broadcast** (`auto-urgent-digest-broadcaster/index.ts`) - SMS/WhatsApp blasts for urgent shifts
4. **Unassignment notifications** (`critical-change-notifier/index.ts`) - email template for "shift_reassigned"
5. **Orphaned timesheet cleanup** - NEW (just implemented in Shifts.jsx)

### What Needs Building 🔨
1. **Frontend UI**: "Decline Shift" button in Staff Portal
2. **Edge Function**: `staff-decline-shift` with conditional logic
3. **Permission Update**: Allow staff to modify their own shift assignments
4. **Validation**: Prevent decline if timesheet submitted/approved

---

## 📐 Technical Specification

### 1. Frontend Changes

#### Location: `src/pages/MyShifts.jsx` or `src/pages/StaffPortal.jsx`

#### New UI Component
```jsx
// Add to each shift card in staff's shift list
{shift.status === 'confirmed' || shift.status === 'assigned' ? (
  <Button
    size="sm"
    variant="destructive"
    onClick={() => handleDeclineShift(shift)}
    disabled={shift.status === 'completed' || shift.status === 'cancelled'}
  >
    <XCircle className="w-4 h-4 mr-1" />
    Decline Shift
  </Button>
) : null}
```

#### Handler Function
```javascript
const handleDeclineShift = async (shift) => {
  // 1. Calculate time until shift
  const shiftDateTime = new Date(`${shift.date}T${shift.start_time}`);
  const now = new Date();
  const hoursUntilShift = (shiftDateTime - now) / (1000 * 60 * 60);

  // Prevent declining past shifts
  if (hoursUntilShift < 0) {
    toast.error('Cannot decline a shift that has already started or ended.');
    return;
  }

  // 2. Show warning based on urgency
  const warningMessage = hoursUntilShift < 24
    ? `⚠️ URGENT: This shift starts in ${Math.round(hoursUntilShift)} hours!\n\n` +
      `Declining this shift may:\n` +
      `• Affect your reliability rating\n` +
      `• Reduce future shift offers\n` +
      `• Impact your relationship with ${agency.name}\n\n` +
      `This shift will be broadcast as URGENT to all available staff.\n\n` +
      `Are you absolutely sure?`
    : `You are declining this shift.\n\n` +
      `The shift will be offered to other available staff.\n\n` +
      `Continue?`;

  if (!window.confirm(warningMessage)) return;

  // 3. Optional: Ask for reason
  const reason = prompt('Please provide a brief reason for declining (optional):');

  // 4. Call edge function
  const { data, error } = await supabase.functions.invoke('staff-decline-shift', {
    body: {
      shift_id: shift.id,
      staff_id: currentUser.id,
      hours_until_shift: hoursUntilShift,
      decline_reason: reason || 'No reason provided'
    }
  });

  if (error) {
    console.error('Failed to decline shift:', error);
    toast.error(`Failed to decline shift: ${error.message}`);
    return;
  }

  toast.success('✅ Shift declined. You will receive confirmation via email.');
  queryClient.invalidateQueries(['my-shifts']);
  queryClient.invalidateQueries(['shifts']);
};
```

---

### 2. New Edge Function: `staff-decline-shift`

#### Location: `supabase/functions/staff-decline-shift/index.ts`

#### Input Parameters
```typescript
{
  shift_id: string;        // UUID of shift
  staff_id: string;        // UUID of staff declining
  hours_until_shift: number; // Calculated by frontend
  decline_reason?: string;   // Optional reason
}
```

#### Business Logic Flow

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { shift_id, staff_id, hours_until_shift, decline_reason } = await req.json();

  // ============================================================================
  // STEP 1: VALIDATION
  // ============================================================================

  // Fetch shift
  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select('*, agency_id')
    .eq('id', shift_id)
    .single();

  if (shiftError || !shift) {
    return new Response(JSON.stringify({ error: 'Shift not found' }), { status: 404 });
  }

  // Verify staff owns this shift
  if (shift.assigned_staff_id !== staff_id) {
    return new Response(JSON.stringify({
      error: 'Unauthorized: This shift is not assigned to you'
    }), { status: 403 });
  }

  // Prevent decline if shift already started
  if (hours_until_shift < 0) {
    return new Response(JSON.stringify({
      error: 'Cannot decline a shift that has already started'
    }), { status: 400 });
  }

  // Check if timesheet already submitted/approved
  const { data: timesheets } = await supabase
    .from('timesheets')
    .select('status')
    .eq('staff_id', staff_id)
    .eq('shift_date', shift.date)
    .eq('client_id', shift.client_id);

  if (timesheets && timesheets.length > 0) {
    const hasSubmitted = timesheets.some(t =>
      ['submitted', 'approved', 'paid'].includes(t.status)
    );
    if (hasSubmitted) {
      return new Response(JSON.stringify({
        error: 'Cannot decline: Timesheet already submitted'
      }), { status: 400 });
    }
  }

  // ============================================================================
  // STEP 2: FETCH RELATED DATA
  // ============================================================================

  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('id', staff_id)
    .single();

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', shift.client_id)
    .single();

  const { data: agency } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', shift.agency_id)
    .single();

  // ============================================================================
  // STEP 3: SEND UNASSIGNMENT NOTIFICATION TO STAFF
  // ============================================================================

  console.log(`📧 Sending unassignment notification to ${staff.email}`);

  await supabase.functions.invoke('critical-change-notifier', {
    body: {
      change_type: 'shift_reassigned',
      staff_email: staff.email,
      staff_name: `${staff.first_name} ${staff.last_name}`,
      client_name: client?.name || 'Unknown Client',
      shift_date: shift.date,
      shift_time: `${shift.start_time} - ${shift.end_time}`,
      reason: `You declined this shift. Reason: ${decline_reason}`,
      agency_id: shift.agency_id
    }
  });

  // ============================================================================
  // STEP 4: UPDATE SHIFT STATUS
  // ============================================================================

  const { error: updateError } = await supabase
    .from('shifts')
    .update({
      status: 'open',
      assigned_staff_id: null,
      staff_confirmed_at: null,
      staff_confirmation_method: null,
      shift_journey_log: [
        ...(shift.shift_journey_log || []),
        {
          state: 'open',
          timestamp: new Date().toISOString(),
          staff_id: staff_id,
          method: 'staff_self_decline',
          notes: `Staff declined shift. Reason: ${decline_reason}`
        }
      ]
    })
    .eq('id', shift_id);

  if (updateError) {
    console.error('Failed to update shift:', updateError);
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  // ============================================================================
  // STEP 5: CLEAN UP ORPHANED TIMESHEETS
  // ============================================================================

  const { data: orphanedTimesheets } = await supabase
    .from('timesheets')
    .select('id')
    .eq('staff_id', staff_id)
    .eq('shift_date', shift.date)
    .eq('client_id', shift.client_id)
    .in('status', ['draft', 'pending']);

  if (orphanedTimesheets && orphanedTimesheets.length > 0) {
    await supabase
      .from('timesheets')
      .delete()
      .in('id', orphanedTimesheets.map(t => t.id));

    console.log(`🗑️ Deleted ${orphanedTimesheets.length} orphaned timesheet(s)`);
  }

  // ============================================================================
  // STEP 6: DELETE BOOKING RECORD
  // ============================================================================

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('shift_id', shift_id)
    .eq('staff_id', staff_id);

  if (bookings && bookings.length > 0) {
    await supabase
      .from('bookings')
      .delete()
      .in('id', bookings.map(b => b.id));

    console.log(`🗑️ Deleted ${bookings.length} booking record(s)`);
  }

  // ============================================================================
  // STEP 7: CONDITIONAL AUTOMATION BASED ON TIME UNTIL SHIFT
  // ============================================================================

  if (hours_until_shift < 24) {
    // 🚨 URGENT PATH (<24 hours)
    console.log('🚨 URGENT: <24 hours until shift. Setting to urgent and broadcasting...');

    // Set urgency and add to marketplace
    await supabase
      .from('shifts')
      .update({
        urgency: 'high',
        marketplace_visible: true,
        marketplace_added_at: new Date().toISOString()
      })
      .eq('id', shift_id);

    // Trigger urgent broadcast
    await supabase.functions.invoke('auto-urgent-digest-broadcaster', {
      body: { shift_id }
    });

    console.log('✅ Shift marked as urgent and broadcast sent');

  } else {
    // ⏰ NORMAL PATH (>24 hours)
    console.log('⏰ >24 hours until shift. Checking agency settings...');

    const { data: agencySettings } = await supabase
      .from('agency_settings')
      .select('auto_assignment_enabled, marketplace_enabled')
      .eq('agency_id', shift.agency_id)
      .single();

    if (agencySettings?.auto_assignment_enabled) {
      // Try auto-assignment first
      console.log('🤖 Auto-assignment enabled. Triggering matcher...');

      await supabase.functions.invoke('auto-shift-assignment-engine', {
        body: { shift_id }
      });

      console.log('✅ Auto-assignment triggered');

    } else if (agencySettings?.marketplace_enabled) {
      // Add to marketplace
      console.log('🛒 Marketplace enabled. Adding shift...');

      await supabase
        .from('shifts')
        .update({
          marketplace_visible: true,
          marketplace_added_at: new Date().toISOString()
        })
        .eq('id', shift_id);

      console.log('✅ Shift added to marketplace');

    } else {
      // Neither enabled - just leave as open
      console.log('ℹ️ No automation enabled. Shift left as open.');
    }
  }

  // ============================================================================
  // STEP 8: NOTIFY AGENCY ADMIN (OPTIONAL)
  // ============================================================================

  if (agency?.admin_email) {
    await supabase.functions.invoke('send-email', {
      body: {
        to: agency.admin_email,
        subject: `Staff Declined Shift - ${shift.date}`,
        html: `
          <p>Staff member <strong>${staff.first_name} ${staff.last_name}</strong> has declined a shift:</p>
          <ul>
            <li><strong>Client:</strong> ${client?.name}</li>
            <li><strong>Date:</strong> ${shift.date}</li>
            <li><strong>Time:</strong> ${shift.start_time} - ${shift.end_time}</li>
            <li><strong>Reason:</strong> ${decline_reason}</li>
            <li><strong>Time until shift:</strong> ${Math.round(hours_until_shift)} hours</li>
          </ul>
          <p>The shift has been ${hours_until_shift < 24 ? 'marked as URGENT and broadcast' : 'returned to open status'}.</p>
        `
      }
    });
  }

  // ============================================================================
  // RETURN SUCCESS
  // ============================================================================

  return new Response(JSON.stringify({
    success: true,
    message: 'Shift declined successfully',
    action_taken: hours_until_shift < 24 ? 'urgent_broadcast' : 'auto_assign_or_marketplace'
  }), {
    headers: { "Content-Type": "application/json" }
  });
});
```

---

### 3. Database Changes

#### No new tables required ✅

#### Existing table usage:
- `shifts` - Update `assigned_staff_id`, `status`, `shift_journey_log`, `urgency`, `marketplace_visible`
- `timesheets` - Delete orphaned drafts
- `bookings` - Delete booking record
- `agency_settings` - Read `auto_assignment_enabled`, `marketplace_enabled`

---

### 4. Permission Updates

#### RLS Policy Changes

**File:** `supabase/migrations/[timestamp]_staff_self_decline_permissions.sql`

```sql
-- Allow staff to update shifts they're assigned to (only to unassign themselves)
CREATE POLICY "Staff can decline their own assigned shifts"
  ON shifts
  FOR UPDATE
  USING (
    assigned_staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid())
    AND status IN ('assigned', 'confirmed')
  )
  WITH CHECK (
    -- Only allow clearing assigned_staff_id and setting status to open
    assigned_staff_id IS NULL
    AND status = 'open'
  );

-- Allow staff to delete their own draft timesheets
CREATE POLICY "Staff can delete their own draft timesheets"
  ON timesheets
  FOR DELETE
  USING (
    staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid())
    AND status IN ('draft', 'pending')
  );

-- Allow staff to delete their own bookings
CREATE POLICY "Staff can delete their own bookings"
  ON bookings
  FOR DELETE
  USING (
    staff_id::text = (SELECT id::text FROM profiles WHERE id = auth.uid())
    AND status IN ('pending', 'confirmed')
  );
```

---

## 🧪 Testing Plan

### Test Cases

1. **Decline with >24h notice**
   - Verify shift status → 'open'
   - Verify auto-assignment triggered (if enabled)
   - Verify marketplace visibility (if enabled)
   - Verify notification sent to staff

2. **Decline with <24h notice**
   - Verify urgency → 'high'
   - Verify marketplace_visible → true
   - Verify urgent broadcast triggered
   - Verify notification sent

3. **Decline with timesheet submitted**
   - Verify error: "Cannot decline: Timesheet already submitted"

4. **Decline shift not assigned to user**
   - Verify 403 Unauthorized error

5. **Decline past shift**
   - Verify error: "Cannot decline a shift that has already started"

6. **Orphaned data cleanup**
   - Verify draft timesheets deleted
   - Verify booking record deleted

---

## 📊 Success Metrics

- Staff decline rate <10% (healthy)
- Average time from decline to reassignment <2 hours
- Zero instances of double-staffing after decline
- 100% notification delivery rate

---

## 🚀 Deployment Checklist

- [ ] Create edge function `staff-decline-shift`
- [ ] Deploy RLS policy updates
- [ ] Update frontend (MyShifts.jsx or StaffPortal.jsx)
- [ ] Test all 6 test cases above
- [ ] Update MASTER_MODULE_INDEX.md
- [ ] Document in user guide

---

## 📝 Future Enhancements

1. **Reliability Score**: Track decline frequency and impact future shift offers
2. **Decline Penalty Window**: Block declines <4h before shift
3. **Preferred Replacement**: Allow staff to suggest replacement staff member
4. **Decline History Dashboard**: Admin view of all declines with patterns

---

## 🔗 Related Modules

- MODULE_6: Cron Jobs Command Center (auto-assignment engine)
- MODULE_8: Shift State Machine (status transitions)
- MODULE_34: Client Email Redesign (notification templates)

---

**Created:** 2025-12-24
**Last Updated:** 2025-12-24
**Owner:** TBD
**Est. Completion:** TBD
