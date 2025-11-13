# Dominion Agency Test Report

Generated: 11/11/2025, 08:51:07  
Duration: 1076.43s

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Tests | 5 |
| ✅ Passed | 3 |
| ⚠️  Warnings | 1 |
| ❌ Failed | 0 |
| Success Rate | 60.0% |

## 🚨 Issues Found

### 🔴 Critical Issues (1)

#### 1. Post-Shift Timesheet Reminders Not Working

- **Category**: Notifications
- **Severity**: CRITICAL
- **Details**: {
  "CRITICAL_ISSUE": "POST_SHIFT_REMINDERS_BROKEN",
  "message": "Timesheet reminders not sent (same as Base44)",
  "details": {
    "sms": false,
    "whatsapp": false,
    "email": false,
    "errors": [
      "Timesheet reminder error: Edge Function returned a non-2xx status code"
    ],
    "CRITICAL_ISSUE": "POST_SHIFT_REMINDERS_BROKEN",
    "message": "Timesheet reminders not sent (same as Base44)",
    "details": {
      "data": null,
      "error": {
        "name": "FunctionsHttpError",
        "context": {}
      },
      "response": {}
    },
    "severity": "CRITICAL"
  },
  "severity": "CRITICAL",
  "shift": {
    "id": "150e3a15-20d3-4707-94e4-aa5a5313d86c",
    "agency_id": "c8e84c94-8233-4084-b4c3-63ad9dc81c16",
    "client_id": "f679e93f-97d8-4697-908a-e165f22e322a",
    "assigned_staff_id": null,
    "date": "2025-11-10",
    "start_time": "2025-11-10T08:00:00+00:00",
    "end_time": "2025-11-10T16:00:00+00:00",
    "duration_hours": null,
    "role_required": "care_assistant",
    "pay_rate": null,
    "charge_rate": null,
    "break_duration_minutes": 0,
    "status": "awaiting_admin_closure",
    "urgency": "normal",
    "notes": null,
    "on_duty_contact": null,
    "broadcast_sent_at": null,
    "escalation_deadline": null,
    "created_date": "2025-11-11T09:06:26.158117+00:00",
    "updated_date": "2025-11-11T09:06:26.891088+00:00",
    "work_location_within_site": null,
    "shift_journey_log": [
      {
        "state": "created",
        "method": "automated_test",
        "timestamp": "2025-11-11T09:06:26.670Z"
      },
      {
        "state": "assigned",
        "method": "automated_test",
        "timestamp": "2025-11-11T09:06:26.943Z"
      },
      {
        "state": "confirmed",
        "method": "automated_test",
        "timestamp": "2025-11-11T09:06:27.073Z"
      },
      {
        "state": "in_progress",
        "method": "automated_test",
        "timestamp": "2025-11-11T09:06:27.287Z"
      },
      {
        "state": "awaiting_admin_closure",
        "method": "automated_test",
        "timestamp": "2025-11-11T09:06:27.421Z"
      }
    ],
    "admin_closed_at": null,
    "admin_closure_outcome": null,
    "admin_closed_by": null,
    "financial_locked": false,
    "location": null,
    "role": null,
    "created_by": null,
    "booking_id": null,
    "timesheet_id": null,
    "timesheet_received": false,
    "timesheet_received_at": null,
    "timesheet_reminder_sent": false,
    "timesheet_reminder_sent_at": null,
    "pay_rate_override": {},
    "marketplace_visible": false,
    "marketplace_added_at": null,
    "requirements": [],
    "recurring": false,
    "recurrence_pattern": null,
    "shift_started_at": null,
    "shift_ended_at": null,
    "verification_workflow_id": null,
    "actual_staff_id": null,
    "reassignment_history": {},
    "cancellation_reason": null,
    "cancelled_by": null,
    "cancelled_at": null,
    "reminder_24h_sent": false,
    "reminder_24h_sent_at": null,
    "reminder_2h_sent": false,
    "reminder_2h_sent_at": null,
    "approaching_staff_location": {},
    "admin_closure_required": false,
    "staff_confirmed_completion": false,
    "staff_confirmation_requested_at": null,
    "staff_confirmed_at": null,
    "staff_confirmation_method": null,
    "staff_confirmation_confidence_score": null,
    "replaced_shift_id": null,
    "is_replacement": false,
    "archived": false,
    "archived_at": null,
    "financial_locked_at": null,
    "financial_locked_by": null,
    "financial_snapshot": {}
  }
}

## 📊 Data Validation

### Agency Data
- **Name**: Dominion Healthcare Services Ltd
- **Staff**: 3
- **Clients**: 3
- **Shifts**: 49

### Page Data Availability
- **staff**: 3 records
- **clients**: 3 records
- **shifts**: 49 records
- **bookings**: 14 records
- **timesheets**: 0 records
- **invoices**: 0 records
- **payslips**: 0 records
- **compliance_documents**: 0 records
- **groups**: 0 records
- **admin_workflows**: 0 records

### Data Integrity
- Missing Columns: 0
- Orphaned Records: 0

## 🔄 Shift Journey Tests

### Complete Journey Test
- **Shift ID**: 5bf2a727-c96c-4c8c-8139-886e78e97005
- **Journey States**: created → assigned → confirmed → in_progress → completed
- **Invoices Generated**: 0

### Cancellation Test
- **Shift ID**: d39689d6-9158-4791-961b-66c62bb69d6a
- **Status**: cancelled
- **Change Logs**: 0
- **Notifications**: 0

## 📧 Notification System

### Pre-Shift Reminders
- **24h Reminder**:
  - SMS: ❌
  - WhatsApp: ❌
  - Email: ❌
- **2h Reminder**:
  - SMS: ❌
  - WhatsApp: ❌

### Post-Shift Reminders (CRITICAL)

⚠️ **CRITICAL ISSUE**: POST_SHIFT_REMINDERS_BROKEN

**Message**: Timesheet reminders not sent (same as Base44)

**Status**: Same issue as Base44 - Post-shift reminders not working


### Reminder Engine
- **Status**: unknown
- **Cron Schedule**: 0 * * * *
- **Last Run**: Unknown

## 📈 Analytics Validation

### Before Test
- Total Shifts: 53
- Open Shifts: 0
- Completed Shifts: 19
- Revenue: £0.00

### After Test
- Total Shifts: 55
- Open Shifts: 0
- Completed Shifts: 20
- Revenue: £0.00

### Changes
- Revenue Change: £0.00

## 🎭 UI Tests

Playwright tests executed. See Playwright report for detailed results.

## 💡 Recommendations

1. **URGENT**: Fix post-shift timesheet reminders - currently not working (same as Base44)
2. Review 1 warnings for potential improvements

---

*Report generated by Hybrid Test Suite*
