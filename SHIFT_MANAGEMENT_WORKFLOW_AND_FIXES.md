# Shift Management - Workflow & Critical Fixes
**Date:** 2025-11-16  
**Companion to:** SHIFT_MANAGEMENT_COMPREHENSIVE_ANALYSIS.md

---

## 🔄 COMPLETE SHIFT LIFECYCLE WITH DATA FLOW

### **Phase 1: Creation (Status: OPEN)**
**Trigger:** Admin creates shift via BulkShiftCreation, PostShiftV2, or NaturalLanguageShiftRequest

**Data Populated:**
```javascript
{
  agency_id: currentAgency,
  client_id: selectedClient.id,
  role_required: 'healthcare_assistant',
  date: '2025-11-20',
  start_time: '2025-11-20T08:00:00', // From client.shift_window_type
  end_time: '2025-11-20T20:00:00',   // From client.shift_window_type
  start_time: '2025-11-20T08:00:00', // From client.shift_window_type
  end_time: '2025-11-20T20:00:00',   // From client.shift_window_type
  duration_hours: 12,
  shift_type: 'day',
  pay_rate: 14.75,    // From client.contract_terms.rates_by_role.hca.pay_rate
  charge_rate: 19.18, // From client.contract_terms.rates_by_role.hca.charge_rate
  break_duration_minutes: 0, // From client.contract_terms
  status: 'open',
  shift_journey_log: [{
    state: 'created',
    timestamp: '2025-11-16T10:30:00Z',
    method: 'bulk_creation',
    user_id: 'admin-uuid'
  }]
}
```

**BulkShiftCreation Integration:**
1. Step 1: Select client → loads `shift_window_type`, `contract_terms`, `internal_locations`
2. Step 2: Select roles → uses `getClientRates(client, role, shiftType)` to get rates
3. Step 3: Grid entry → creates shifts with all defaults pre-filled
4. Step 4: Preview → validates rates, times, conflicts
5. Create → inserts into shifts table

---

### **Phase 2: Assignment (Status: ASSIGNED)**
**Trigger:** Admin assigns staff OR staff accepts from marketplace

**Data Updated:**
```javascript
{
  status: 'assigned',
  assigned_staff_id: 'staff-uuid',
  shift_journey_log: [
    ...previous,
    {
      state: 'assigned',
      timestamp: '2025-11-16T11:00:00Z',
      staff_id: 'staff-uuid',
      method: 'admin_assigned'
    }
  ]
}
```

**Booking Created:**
```javascript
// Separate bookings table entry
{
  shift_id: 'shift-uuid',
  staff_id: 'staff-uuid',
  client_id: 'client-uuid',
  status: 'pending',
  booking_date: '2025-11-16T11:00:00Z'
}
```

---

### **Phase 3: Confirmation (Status: CONFIRMED)**
**Trigger:** Staff confirms via app/SMS OR admin bypass

**Data Updated:**
```javascript
{
  status: 'confirmed',
  shift_journey_log: [
    ...previous,
    {
      state: 'confirmed',
      timestamp: '2025-11-16T12:00:00Z',
      staff_id: 'staff-uuid',
      method: 'sms_acceptance', // or 'app', 'admin_bypass'
      notes: 'Staff confirmed shift via SMS reply'
    }
  ]
}
```

**Booking Updated:**
```javascript
{
  status: 'confirmed',
  confirmed_by_staff_at: '2025-11-16T12:00:00Z'
}
```

---

### **Phase 4: In Progress (Status: IN_PROGRESS)**
**Trigger:** Automated (shift-status-automation Edge Function) when start_time reached

**Data Updated:**
```javascript
{
  status: 'in_progress',
  shift_started_at: '2025-11-20T08:00:00Z', // Actual start (scheduled time initially)
  shift_journey_log: [
    ...previous,
    {
      state: 'in_progress',
      timestamp: '2025-11-20T08:00:00Z',
      method: 'automated',
      notes: 'Auto-started at scheduled start time'
    }
  ]
}
```

---

### **Phase 5: Awaiting Closure (Status: AWAITING_ADMIN_CLOSURE)**
**Trigger:** Automated when end_time reached

**Data Updated:**
```javascript
{
  status: 'awaiting_admin_closure',
  shift_ended_at: '2025-11-20T20:00:00Z', // Actual end (scheduled time initially)
  timesheet_reminder_sent: true,
  timesheet_reminder_sent_at: '2025-11-20T20:05:00Z',
  shift_journey_log: [
    ...previous,
    {
      state: 'awaiting_admin_closure',
      timestamp: '2025-11-20T20:00:00Z',
      method: 'automated',
      notes: 'Auto-ended at scheduled end time - awaiting admin verification'
    }
  ]
}
```

**Timesheet Request Sent:**
- WhatsApp: "Hi [Name], please upload your timesheet for [Client] shift on [Date]"
- Email: Same message with upload link

---

### **Phase 6: Completion (Status: COMPLETED)**
**Trigger:** Admin verifies via ShiftCompletionModal

**Data Updated:**
```javascript
{
  status: 'completed',
  admin_closed_at: '2025-11-21T09:00:00Z',
  admin_closed_by: 'admin-uuid',
  admin_closure_outcome: 'completed_as_planned',
  // ⚠️ CRITICAL: Actual times should be editable here!
  shift_started_at: '2025-11-20T08:15:00Z', // Actual from timesheet
  shift_ended_at: '2025-11-20T19:45:00Z',   // Actual from timesheet
  timesheet_received: true,
  timesheet_received_at: '2025-11-20T21:30:00Z',
  shift_journey_log: [
    ...previous,
    {
      state: 'completed',
      timestamp: '2025-11-21T09:00:00Z',
      method: 'admin_closure',
      notes: 'Shift completed. Actual times: 08:15 - 19:45 (11.5h)'
    }
  ]
}
```

**Financial Snapshot Created:**
```javascript
{
  financial_locked: true,
  financial_locked_at: '2025-11-21T09:00:00Z',
  financial_locked_by: 'admin-uuid',
  financial_snapshot: {
    pay_rate: 14.75,
    charge_rate: 19.18,
    actual_hours: 11.5,
    staff_cost: 169.63,  // 11.5 * 14.75
    client_charge: 220.57, // 11.5 * 19.18
    margin: 50.94
  }
}
```

---


