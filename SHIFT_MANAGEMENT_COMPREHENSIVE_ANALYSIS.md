# Shift Management - Comprehensive Analysis
**Date:** 2025-11-16  
**Purpose:** Complete understanding of shifts table, columns, workflow, and integration points

---

## 📊 SHIFTS TABLE SCHEMA - COMPLETE COLUMN BREAKDOWN

### **Core Identification & Timestamps**
| Column | Type | Purpose | Critical Notes |
|--------|------|---------|----------------|
| `id` | UUID | Primary key | Auto-generated |
| `created_date` | TIMESTAMPTZ | When shift was created | Audit trail |
| `updated_date` | TIMESTAMPTZ | Last modification | Auto-updated |
| `agency_id` | UUID | Multi-tenant isolation | FK → agencies.id |

---

### **Client & Location Data**
| Column | Type | Purpose | Data Source |
|--------|------|---------|-------------|
| `client_id` | UUID | Which care home/facility | FK → clients.id |
| `work_location_within_site` | TEXT | Specific room/ward/unit | Manual entry or client defaults |

**Integration:** BulkShiftCreation pulls `internal_locations` from clients table to populate dropdown

---

### **Shift Scheduling (Planned Times)**
| Column | Type | Purpose | Data Source |
|--------|------|---------|-------------|
| `date` | DATE | Shift date (YYYY-MM-DD) | User input |
| `start_time` | TIMESTAMPTZ | Scheduled start (ISO 8601) | Client defaults via `shift_window_type` |
| `end_time` | TIMESTAMPTZ | Scheduled end (ISO 8601) | Client defaults (7-7 or 8-8) |
| `duration_hours` | NUMERIC | Calculated hours | Auto-calculated from times |
| `shift_type` | TEXT | 'day' or 'night' | Determined by start_time |
| `break_duration_minutes` | INTEGER | Unpaid break time | Client contract_terms default |

**BulkShiftCreation Flow:**
1. User selects client → system loads `shift_window_type` (7_to_7 or 8_to_8)
2. System uses `getShiftTimes(client, 'day')` → returns {start: '08:00', end: '20:00'}
3. Shift created with correct default times based on client configuration

---

### **Actual Times (Post-Shift Reality)**
| Column | Type | Purpose | When Populated |
|--------|------|---------|----------------|
| `shift_started_at` | TIMESTAMPTZ | **Actual start time** | Staff clock-in OR admin manual entry |
| `shift_ended_at` | TIMESTAMPTZ | **Actual end time** | Staff clock-out OR admin manual entry |

**⚠️ CRITICAL ISSUE:** Edit Shift Modal does NOT show these fields!  
**Impact:** Admins cannot manually enter actual times for timesheet calculation

---

### **Staffing & Assignment**
| Column | Type | Purpose | Status Transition |
|--------|------|---------|-------------------|
| `role_required` | ENUM | nurse/hca/senior_care_worker | Set at creation |
| `assigned_staff_id` | UUID | Who's working the shift | NULL → UUID when assigned |
| `actual_staff_id` | UUID | Who actually worked | For replacement scenarios |
| `reassignment_history` | JSONB | Track all reassignments | Audit trail |

---

### **Financial Data (Rates & Costs)**
| Column | Type | Purpose | Data Source |
|--------|------|---------|-------------|
| `pay_rate` | NUMERIC | £/hour paid to staff | Client `contract_terms.rates_by_role[role].pay_rate` |
| `charge_rate` | NUMERIC | £/hour charged to client | Client `contract_terms.rates_by_role[role].charge_rate` |
| `pay_rate_override` | JSONB | Manual rate adjustments | Admin override in Edit Modal |

**BulkShiftCreation Integration:**
```javascript
// Step 1: Load client rates
const dayRates = getClientRates(client, 'healthcare_assistant', 'day');
// Returns: { pay_rate: 14.75, charge_rate: 19.18 }

// Step 2: Create shift with rates
shift.pay_rate = dayRates.pay_rate;
shift.charge_rate = dayRates.charge_rate;
```

**⚠️ ISSUE:** Edit Modal shows rates but doesn't explain override vs default

---

### **Status Workflow (Lifecycle)**
| Column | Type | Purpose | Values |
|--------|------|---------|--------|
| `status` | ENUM | Current shift state | See workflow below |
| `shift_journey_log` | JSONB | Complete state history | Array of transitions |

**Complete Status Workflow:**
```
1. OPEN → Shift created, no staff assigned
   ↓ (Admin assigns OR staff accepts from marketplace)
   
2. ASSIGNED → Staff assigned, awaiting confirmation
   ↓ (Staff confirms OR admin bypass)
   
3. CONFIRMED → Staff confirmed attendance
   ↓ (Automated: shift start time reached)
   
4. IN_PROGRESS → Shift actively happening
   ↓ (Automated: shift end time reached)
   
5. AWAITING_ADMIN_CLOSURE → Shift ended, needs verification
   ↓ (Admin reviews timesheet + GPS data)
   
6. COMPLETED → Verified, ready for payroll/invoicing
   
   OR
   
   CANCELLED → Shift cancelled before completion
   NO_SHOW → Staff didn't show up
   DISPUTED → Discrepancy needs investigation
```

**Triggers for Each Transition:**
- **OPEN → ASSIGNED:** Admin assigns staff OR staff accepts from marketplace
- **ASSIGNED → CONFIRMED:** Staff confirms via app/SMS OR admin bypass
- **CONFIRMED → IN_PROGRESS:** Automated (shift-status-automation Edge Function)
- **IN_PROGRESS → AWAITING_ADMIN_CLOSURE:** Automated when shift end time reached
- **AWAITING_ADMIN_CLOSURE → COMPLETED:** Admin verifies via ShiftCompletionModal

---

### **Timesheet Management**
| Column | Type | Purpose | Workflow |
|--------|------|---------|----------|
| `timesheet_id` | UUID | Link to timesheet record | FK → timesheets.id |
| `timesheet_received` | BOOLEAN | Has timesheet been uploaded? | FALSE → TRUE when uploaded |
| `timesheet_received_at` | TIMESTAMPTZ | When timesheet arrived | Timestamp of upload |
| `timesheet_reminder_sent` | BOOLEAN | Reminder sent to staff? | Auto-sent after shift ends |
| `timesheet_reminder_sent_at` | TIMESTAMPTZ | When reminder sent | Tracking |

**Flow:**
1. Shift ends → status = `awaiting_admin_closure`
2. System sends WhatsApp/Email: "Upload your timesheet"
3. Staff uploads photo/PDF → `timesheet_received = TRUE`
4. AI OCR extracts actual times → populates `shift_started_at`, `shift_ended_at`
5. Admin reviews → marks shift as `completed`

---

### **Booking Integration**
| Column | Type | Purpose | Relationship |
|--------|------|---------|--------------|
| `booking_id` | UUID | Link to booking record | FK → bookings.id |

**Note:** Bookings track client/staff confirmation separately from shift status

---

### **Marketplace & Visibility**
| Column | Type | Purpose | When Used |
|--------|------|---------|-----------|
| `marketplace_visible` | BOOLEAN | Show in staff marketplace? | Admin toggles |
| `marketplace_added_at` | TIMESTAMPTZ | When added to marketplace | Tracking |

---

### **Recurring Shifts**
| Column | Type | Purpose | Values |
|--------|------|---------|--------|
| `recurring` | BOOLEAN | Part of recurring pattern? | TRUE/FALSE |
| `recurrence_pattern` | TEXT | Frequency | daily/weekly/biweekly/monthly |
| `replaced_shift_id` | UUID | If this replaces another shift | FK → shifts.id |
| `is_replacement` | BOOLEAN | Is this a replacement shift? | TRUE/FALSE |

---

### **Urgency & Requirements**
| Column | Type | Purpose | Values |
|--------|------|---------|--------|
| `urgency` | ENUM | Priority level | normal/urgent/critical |
| `requirements` | JSONB | Special requirements | ["DBS checked", "Medication trained"] |
| `notes` | TEXT | Additional information | Free text |

---

### **Broadcast & Escalation**
| Column | Type | Purpose | When Set |
|--------|------|---------|----------|
| `broadcast_sent_at` | TIMESTAMPTZ | When SMS/WhatsApp sent | Broadcast action |
| `escalation_deadline` | TIMESTAMPTZ | When to escalate if unfilled | Auto-calculated |

---

### **Reminders & Notifications**
| Column | Type | Purpose | Automation |
|--------|------|---------|------------|
| `reminder_24h_sent` | BOOLEAN | 24h reminder sent? | Edge Function |
| `reminder_24h_sent_at` | TIMESTAMPTZ | When sent | Tracking |
| `reminder_2h_sent` | BOOLEAN | 2h reminder sent? | Edge Function |
| `reminder_2h_sent_at` | TIMESTAMPTZ | When sent | Tracking |

---

### **GPS & Location Tracking**
| Column | Type | Purpose | Data Structure |
|--------|------|---------|----------------|
| `approaching_staff_location` | JSONB | Staff GPS when approaching | {lat, lng, timestamp, accuracy} |

---

### **Admin Closure & Verification**
| Column | Type | Purpose | Values |
|--------|------|---------|--------|
| `admin_closure_required` | BOOLEAN | Needs admin review? | TRUE for complex shifts |
| `admin_closed_at` | TIMESTAMPTZ | When admin verified | Completion timestamp |
| `admin_closed_by` | UUID | Which admin verified | FK → profiles.id |
| `admin_closure_outcome` | TEXT | Verification result | completed_as_planned/no_show/disputed |
| `verification_workflow_id` | UUID | Link to workflow | FK → admin_workflows.id |

---

### **Staff Confirmation Tracking**
| Column | Type | Purpose | Values |
|--------|------|---------|--------|
| `staff_confirmed_completion` | BOOLEAN | Staff confirmed they worked? | TRUE/FALSE |
| `staff_confirmation_requested_at` | TIMESTAMPTZ | When confirmation requested | Timestamp |
| `staff_confirmed_at` | TIMESTAMPTZ | When staff confirmed | Timestamp |
| `staff_confirmation_method` | TEXT | How they confirmed | sms_reply/auto_high_confidence/manual_admin |
| `staff_confirmation_confidence_score` | NUMERIC | AI confidence (0-100) | OCR quality score |

---

### **Cancellation Tracking**
| Column | Type | Purpose | Values |
|--------|------|---------|--------|
| `cancellation_reason` | TEXT | Why cancelled | Free text |
| `cancelled_by` | TEXT | Who cancelled | staff/client/agency |
| `cancelled_at` | TIMESTAMPTZ | When cancelled | Timestamp |

---

### **Financial Locking (Immutability)**
| Column | Type | Purpose | When Locked |
|--------|------|---------|-------------|
| `financial_locked` | BOOLEAN | Prevent edits? | After invoice/payslip generated |
| `financial_locked_at` | TIMESTAMPTZ | When locked | Timestamp |
| `financial_locked_by` | UUID | Who locked it | FK → profiles.id |
| `financial_snapshot` | JSONB | Immutable financial data | Rates, hours, costs at lock time |

**Critical:** Once locked, rates/hours cannot be changed (prevents invoice/payroll discrepancies)

---

### **Archival**
| Column | Type | Purpose | When Used |
|--------|------|---------|-----------|
| `archived` | BOOLEAN | Hidden from active view? | After 6+ months |
| `archived_at` | TIMESTAMPTZ | When archived | Timestamp |

---

### **Audit & Metadata**
| Column | Type | Purpose | Data |
|--------|------|---------|------|
| `created_by` | TEXT | Who created shift | User email |
| `on_duty_contact` | JSONB | Emergency contact | {name, phone} |

---

