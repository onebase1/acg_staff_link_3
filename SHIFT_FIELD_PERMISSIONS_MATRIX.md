# Shift Management - Field Permissions Matrix
**Date:** 2025-11-16  
**Purpose:** Define which fields are immutable vs editable post-creation

---

## 🔒 IMMUTABLE FIELDS (Cannot Change After Shift Created)

These fields define the shift's identity and cannot be changed without creating a new shift:

| Field | Reason | Alternative Action |
|-------|--------|-------------------|
| `date` | Shift date defines when it occurs | Cancel and create new shift |
| `start_time` | Scheduled start (from contract) | Cancel and create new shift |
| `end_time` | Scheduled end (from contract) | Cancel and create new shift |
| `duration_hours` | Calculated from scheduled times | Cancel and create new shift |
| `shift_type` | 'day' or 'night' (derived from start_time) | Cancel and create new shift |
| `role_required` | Job role for the shift | Cancel and create new shift |
| `client_id` | Which care home/facility | Cancel and create new shift |
| `agency_id` | Multi-tenant isolation | NEVER change |
| `created_date` | Audit trail | NEVER change |
| `created_by` | Who created shift | NEVER change |
| `shift_journey_log` | Complete state history | Append only, never delete |

**Rationale:**
- Changing these fields would fundamentally alter the shift's identity
- Financial/compliance implications (invoices, payroll, audit trail)
- Better to cancel and create new shift for clarity

---

## ✅ EDITABLE FIELDS (Can Change During Shift Lifecycle)

### **Assignment & Staffing**
| Field | When Editable | Notes |
|-------|---------------|-------|
| `assigned_staff_id` | Before `completed` | Can reassign staff |
| `actual_staff_id` | Before `completed` | If different staff worked |
| `reassignment_history` | Append only | Track all reassignments |

### **Status & Workflow**
| Field | When Editable | Notes |
|-------|---------------|-------|
| `status` | Always (with rules) | Follow status workflow |
| `admin_closure_outcome` | During closure | completed_as_planned/no_show/disputed |
| `admin_closed_at` | During closure | Timestamp of completion |
| `admin_closed_by` | During closure | Admin who verified |

### **Actual Times (Post-Shift)**
| Field | When Editable | Notes |
|-------|---------------|-------|
| `shift_started_at` | Before `financial_locked` | Actual start time for payroll |
| `shift_ended_at` | Before `financial_locked` | Actual end time for payroll |

**⚠️ CRITICAL:** Once `financial_locked = TRUE`, actual times become IMMUTABLE

### **Location & Details**
| Field | When Editable | Notes |
|-------|---------------|-------|
| `work_location_within_site` | Before `completed` | Room/ward/unit |
| `notes` | Always | Additional information |
| `urgency` | Before `assigned` | normal/urgent/critical |

### **Financial (With Restrictions)**
| Field | When Editable | Notes |
|-------|---------------|-------|
| `pay_rate` | Before `financial_locked` | Via override only |
| `charge_rate` | Before `financial_locked` | Via override only |
| `pay_rate_override` | Before `financial_locked` | Must include reason |
| `break_duration_minutes` | Before `financial_locked` | Affects total hours |

### **Cancellation**
| Field | When Editable | Notes |
|-------|---------------|-------|
| `cancellation_reason` | When status = 'cancelled' | Required |
| `cancelled_by` | When status = 'cancelled' | staff/client/agency |
| `cancelled_at` | When status = 'cancelled' | Timestamp |

### **Marketplace**
| Field | When Editable | Notes |
|-------|---------------|-------|
| `marketplace_visible` | Before `assigned` | Show in staff marketplace |
| `marketplace_added_at` | Auto-set | When added to marketplace |

### **Timesheet Tracking**
| Field | When Editable | Notes |
|-------|---------------|-------|
| `timesheet_id` | Auto-set | Link to timesheet record |
| `timesheet_received` | Auto-set | Boolean flag |
| `timesheet_received_at` | Auto-set | Timestamp |

---

## 🔐 FINANCIAL LOCKING RULES

### **When Locked:**
- After invoice generated for client
- After payslip generated for staff
- Manual lock by admin

### **What Becomes Immutable:**
- `pay_rate`, `charge_rate`
- `shift_started_at`, `shift_ended_at`
- `break_duration_minutes`
- All financial calculations

### **Financial Snapshot:**
```javascript
{
  financial_locked: true,
  financial_locked_at: '2025-11-21T09:00:00Z',
  financial_locked_by: 'admin-uuid',
  financial_snapshot: {
    pay_rate: 14.75,
    charge_rate: 19.18,
    actual_hours: 11.5,
    staff_cost: 169.63,
    client_charge: 220.57,
    margin: 50.94
  }
}
```

**Rationale:** Prevents invoice/payroll discrepancies after financial documents generated

---

## 📊 EDIT PERMISSIONS BY STATUS

| Field | Open | Assigned | Confirmed | In Progress | Awaiting Closure | Completed | Locked |
|-------|------|----------|-----------|-------------|------------------|-----------|--------|
| **Status** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Assigned Staff** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Actual Staff** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Work Location** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Urgency** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Notes** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Actual Start Time** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Actual End Time** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Pay Rate Override** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Charge Rate Override** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## 🚫 NEVER EDITABLE FIELDS

| Field | Reason |
|-------|--------|
| **Date** | Shift identity - cancel and create new |
| **Scheduled Start Time** | From contract - cancel and create new |
| **Scheduled End Time** | From contract - cancel and create new |
| **Shift Type** | Derived from start time - cancel and create new |
| **Role Required** | Shift identity - cancel and create new |
| **Client** | Shift identity - cancel and create new |
| **Agency** | Multi-tenant isolation - NEVER |
| **Created Date** | Audit trail - NEVER |
| **Created By** | Audit trail - NEVER |
| **Journey Log** | Audit trail - append only |

---

**END OF PERMISSIONS MATRIX**

