# Critical Features Registry

**Purpose:** Track mission-critical features that can "make or break" the project
**Last Updated:** 2025-12-17
**For:** MODULE_5 agents building `/admin/critical-features` UI page

---

## 🎯 How to Use This Document

**For AI Agents Building MODULE_5:**

This document provides the **data structure** for the Critical Features Registry UI page.

**Database Table to Create:**
```sql
CREATE TABLE critical_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  status TEXT CHECK (status IN ('working', 'working_but_fragile', 'broken', 'planned')),
  health_color TEXT CHECK (health_color IN ('green', 'yellow', 'red', 'gray')),

  -- Code locations
  frontend_files TEXT[], -- Array of file paths
  backend_functions TEXT[], -- Array of Edge Function names
  database_tables TEXT[], -- Array of table names

  -- Dependencies
  depends_on JSONB, -- What this feature needs
  depended_by JSONB, -- What depends on this feature

  -- Issues
  known_issues JSONB, -- Array of issues
  technical_debt_hours NUMERIC, -- Estimated hours to fix debt

  -- Monitoring
  last_incident_date DATE,
  incident_details TEXT,
  monitoring_enabled BOOLEAN DEFAULT false,
  alert_threshold JSONB,

  -- Metadata
  owner_notes TEXT,
  documentation_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_critical_features_priority ON critical_features(priority);
CREATE INDEX idx_critical_features_status ON critical_features(status);
CREATE INDEX idx_critical_features_health ON critical_features(health_color);
```

**UI Page Location:** `/admin/critical-features`

---

## 📋 Feature #1: Timesheet OCR Upload

```javascript
{
  id: 'uuid-1',
  feature_name: 'timesheet_ocr_upload',
  display_name: 'Timesheet OCR Upload',
  description: 'AI-powered timesheet upload with GPT-4o OCR extraction, fuzzy matching, and auto-approval',
  priority: 'CRITICAL',
  status: 'working_but_fragile',
  health_color: 'yellow',

  frontend_files: [
    'src/pages/Timesheets.jsx:339-758',
    'src/pages/TimesheetDetail.jsx:231-651',
    'src/components/timesheets/ConfirmOCRModal.jsx',
    'src/components/timesheets/ResponsiveUploadZone.jsx'
  ],

  backend_functions: [
    'extract-timesheet-data',
    'whatsapp-timesheet-upload-handler',
    'auto-timesheet-approval-engine'
  ],

  database_tables: [
    'timesheets',
    'shifts',
    'storage.objects'
  ],

  depends_on: {
    external_apis: ['OpenAI GPT-4o-mini'],
    edge_functions: ['extract-timesheet-data'],
    storage: ['documents bucket'],
    auth: ['user session']
  },

  depended_by: {
    features: ['payroll_generation', 'invoice_generation', 'compliance_tracking'],
    components: ['PayDisplay', 'TimesheetCard'],
    pages: ['Payslips', 'Invoices', 'ComplianceTracker']
  },

  known_issues: [
    {
      type: 'code_duplication',
      severity: 'high',
      description: 'Upload logic duplicated in 2 files (Timesheets.jsx and TimesheetDetail.jsx)',
      lines_affected: 400,
      risk: 'Future updates must be applied to both files or regression occurs',
      estimated_fix_hours: 3
    },
    {
      type: 'no_monitoring',
      severity: 'medium',
      description: 'No tracking of upload success rate, OCR confidence, or failures',
      risk: 'Silent failures not detected, breakage discovered by users',
      estimated_fix_hours: 4
    },
    {
      type: 'no_tests',
      severity: 'high',
      description: 'No integration tests for upload flow',
      risk: 'Regression detection relies on manual testing',
      estimated_fix_hours: 6
    }
  ],

  technical_debt_hours: 13, // Sum of estimated fix hours

  last_incident_date: '2025-12-17',
  incident_details: 'Staff uploads bypassed OCR entirely due to code duplication. Timesheets.jsx had basic upload only, staff used this page instead of TimesheetDetail.jsx which had OCR. Fixed by porting OCR logic to Timesheets.jsx.',

  monitoring_enabled: false,
  alert_threshold: {
    upload_success_rate: 90, // Alert if < 90%
    avg_ocr_confidence: 70,  // Alert if < 70%
    failed_uploads_per_day: 5 // Alert if > 5 failures/day
  },

  owner_notes: 'timesheet upload is single most important that can make or break entire project',
  documentation_url: 'file://agent_missions/MODULE_5_CODEBASE_INTELLIGENCE/TIMESHEET_UPLOAD_SYSTEM.md'
}
```

---

## 📋 Feature #2: GPS Clock-In/Out

```javascript
{
  id: 'uuid-2',
  feature_name: 'gps_clock_in_out',
  display_name: 'GPS Clock-In/Out',
  description: 'Location-verified shift clock-in/out with geofencing and GPS accuracy validation',
  priority: 'CRITICAL',
  status: 'working',
  health_color: 'green',

  frontend_files: [
    'src/components/staff/MobileClockIn.jsx',
    'src/pages/StaffPortal.jsx',
    'src/components/timesheets/GPSIndicator.jsx'
  ],

  backend_functions: [
    'clock-in-handler',
    'clock-out-handler',
    'gps-accuracy-validator'
  ],

  database_tables: [
    'timesheets',
    'clients', // Has GPS coordinates
    'gps_consent'
  ],

  depends_on: {
    browser_apis: ['Geolocation API'],
    edge_functions: ['clock-in-handler', 'clock-out-handler'],
    database: ['clients.latitude', 'clients.longitude', 'clients.gps_radius_meters']
  },

  depended_by: {
    features: ['timesheet_verification', 'compliance_tracking', 'payroll'],
    components: ['GPSIndicator', 'TimesheetCard'],
    reports: ['GPS Accuracy Report', 'Compliance Dashboard']
  },

  known_issues: [
    {
      type: 'browser_compatibility',
      severity: 'medium',
      description: 'iOS Safari sometimes requires HTTPS for geolocation',
      risk: 'Staff on iPhone may fail to clock in',
      estimated_fix_hours: 2
    },
    {
      type: 'accuracy_variance',
      severity: 'low',
      description: 'GPS accuracy varies (5m-50m) based on device/location',
      risk: 'Some valid clock-ins flagged as out-of-range',
      estimated_fix_hours: 4 // Add manual override for admins
    }
  ],

  technical_debt_hours: 6,

  last_incident_date: null,
  incident_details: null,

  monitoring_enabled: true,
  alert_threshold: {
    failed_clock_ins_per_day: 10,
    avg_gps_accuracy_meters: 50,
    out_of_range_percentage: 15
  },

  owner_notes: 'Core compliance feature. GPS consent required by law in some jurisdictions.',
  documentation_url: 'file://docs/gps-clock-in-system/'
}
```

---

## 📋 Feature #3: Multi-Channel Notifications

```javascript
{
  id: 'uuid-3',
  feature_name: 'multi_channel_notifications',
  display_name: 'Multi-Channel Notifications',
  description: 'Send notifications via Email (Resend), SMS (Twilio), and WhatsApp with delivery tracking',
  priority: 'HIGH',
  status: 'working',
  health_color: 'green',

  frontend_files: [
    'src/pages/TestNotifications.jsx',
    'src/components/notifications/NotificationService.jsx'
  ],

  backend_functions: [
    'send-email',
    'send-sms',
    'send-whatsapp',
    'whatsapp-master-router',
    'shift-reminder-engine',
    'post-shift-timesheet-reminder'
  ],

  database_tables: [
    'notification_logs',
    'staff', // Has email, phone
    'notification_preferences'
  ],

  depends_on: {
    external_apis: ['Resend API', 'Twilio API', 'WhatsApp Business API'],
    edge_functions: ['send-email', 'send-sms', 'send-whatsapp'],
    cron: ['shift-reminder-engine', 'post-shift-timesheet-reminder']
  },

  depended_by: {
    features: ['shift_reminders', 'timesheet_reminders', 'urgent_shift_broadcast', 'payment_reminders'],
    workflows: ['Onboarding flow', 'Compliance alerts', 'Invoice delivery']
  },

  known_issues: [
    {
      type: 'delivery_tracking_incomplete',
      severity: 'medium',
      description: 'Email delivery tracked, but SMS/WhatsApp delivery status not stored',
      risk: 'Cannot confirm if critical notifications were received',
      estimated_fix_hours: 3
    },
    {
      type: 'rate_limiting_not_enforced',
      severity: 'medium',
      description: 'No rate limiting on notification sends',
      risk: 'Could exceed Twilio/Resend quotas or spam users',
      estimated_fix_hours: 2
    }
  ],

  technical_debt_hours: 5,

  last_incident_date: '2025-11-20',
  incident_details: 'Twilio API key expired, SMS notifications failed silently for 2 days',

  monitoring_enabled: true,
  alert_threshold: {
    email_delivery_rate: 95,
    sms_delivery_rate: 90,
    whatsapp_delivery_rate: 85,
    failed_sends_per_hour: 5
  },

  owner_notes: 'Critical for staff engagement. Must work 24/7.',
  documentation_url: 'file://docs/notifications/'
}
```

---

## 📋 Feature #4: Shift Auto-Matching & Marketplace

```javascript
{
  id: 'uuid-4',
  feature_name: 'shift_auto_matching',
  display_name: 'Shift Auto-Matching & Marketplace',
  display_name: 'Shift Auto-Matching & Marketplace',
  description: 'AI-powered shift matching based on staff skills, availability, and preferences with marketplace broadcast',
  priority: 'HIGH',
  status: 'working',
  health_color: 'green',

  frontend_files: [
    'src/pages/ShiftMarketplace.jsx',
    'src/pages/Shifts.jsx',
    'src/components/shifts/ShiftAssignmentModal.jsx'
  ],

  backend_functions: [
    'smart-marketplace-digest',
    'shift-assignment-engine',
    'availability-matcher'
  ],

  database_tables: [
    'shifts',
    'staff',
    'staff_availability',
    'bookings',
    'staff_skills'
  ],

  depends_on: {
    edge_functions: ['smart-marketplace-digest', 'send-email', 'send-sms'],
    database: ['staff_availability', 'staff_skills'],
    cron: ['smart-marketplace-digest (every 15 min)']
  },

  depended_by: {
    features: ['staff_scheduling', 'urgent_shift_fill', 'client_coverage'],
    workflows: ['Shift creation → Auto-match → Notify staff']
  },

  known_issues: [
    {
      type: 'matching_algorithm_simple',
      severity: 'low',
      description: 'Current matching is basic (skills + availability). No ML/AI optimization.',
      risk: 'Suboptimal matches, staff may decline shifts',
      estimated_fix_hours: 12 // Add AI ranking
    }
  ],

  technical_debt_hours: 12,

  last_incident_date: null,
  incident_details: null,

  monitoring_enabled: true,
  alert_threshold: {
    unfilled_shifts_percentage: 20,
    avg_match_quality_score: 70,
    staff_decline_rate: 30
  },

  owner_notes: 'Core revenue feature. Faster matching = happier clients.',
  documentation_url: 'file://docs/shift-marketplace/'
}
```

---

## 📋 Feature #5: Compliance Document Tracking

```javascript
{
  id: 'uuid-5',
  feature_name: 'compliance_document_tracking',
  display_name: 'Compliance Document Tracking',
  description: 'Track expiring certifications, DBS checks, training certificates with automated reminders',
  priority: 'CRITICAL',
  status: 'working',
  health_color: 'green',

  frontend_files: [
    'src/pages/ComplianceTracker.jsx',
    'src/pages/AdminComplianceReview.jsx',
    'src/components/staff/ComplianceDocumentUpload.jsx'
  ],

  backend_functions: [
    'compliance-monitor',
    'document-expiry-checker',
    'compliance-alert-sender'
  ],

  database_tables: [
    'staff',
    'compliance_documents',
    'training_certificates'
  ],

  depends_on: {
    edge_functions: ['compliance-monitor', 'send-email'],
    cron: ['compliance-monitor (daily 6am)'],
    storage: ['documents bucket']
  },

  depended_by: {
    features: ['shift_assignment', 'staff_eligibility', 'audit_reports'],
    workflows: ['Onboarding checklist', 'Annual renewal process']
  },

  known_issues: [
    {
      type: 'manual_document_review',
      severity: 'medium',
      description: 'Admin must manually verify uploaded documents (no OCR/validation)',
      risk: 'Slow onboarding, admin bottleneck',
      estimated_fix_hours: 8 // Add OCR for document validation
    }
  ],

  technical_debt_hours: 8,

  last_incident_date: null,
  incident_details: null,

  monitoring_enabled: true,
  alert_threshold: {
    expired_documents_count: 5,
    expiring_soon_count: 20, // Within 30 days
    staff_non_compliant_percentage: 10
  },

  owner_notes: 'Legal requirement. Non-compliant staff cannot work.',
  documentation_url: 'file://docs/compliance/'
}
```

---

## 📋 Feature #6: Invoice & Payroll Generation

```javascript
{
  id: 'uuid-6',
  feature_name: 'invoice_payroll_generation',
  display_name: 'Invoice & Payroll Generation',
  description: 'Automated invoice generation for clients and payslip generation for staff based on approved timesheets',
  priority: 'CRITICAL',
  status: 'working',
  health_color: 'green',

  frontend_files: [
    'src/pages/GenerateInvoices.jsx',
    'src/pages/GeneratePayslips.jsx',
    'src/pages/Invoices.jsx',
    'src/pages/Payslips.jsx'
  ],

  backend_functions: [
    'send-invoice',
    'payment-reminder-engine',
    'payroll-calculator'
  ],

  database_tables: [
    'invoices',
    'payslips',
    'timesheets',
    'shifts',
    'clients',
    'staff'
  ],

  depends_on: {
    features: ['timesheet_approval'],
    edge_functions: ['send-invoice', 'send-email'],
    database: ['timesheets.status = approved']
  },

  depended_by: {
    features: ['client_billing', 'staff_payments', 'financial_reporting'],
    integrations: ['Accounting software (future)']
  },

  known_issues: [
    {
      type: 'manual_invoice_sending',
      severity: 'medium',
      description: 'Invoices generated but must be manually sent',
      risk: 'Delayed billing, cash flow impact',
      estimated_fix_hours: 4 // Add auto-send on generation
    },
    {
      type: 'no_payment_tracking',
      severity: 'high',
      description: 'No integration with payment processors (Stripe, etc)',
      risk: 'Manual payment reconciliation required',
      estimated_fix_hours: 16 // Add Stripe integration
    }
  ],

  technical_debt_hours: 20,

  last_incident_date: null,
  incident_details: null,

  monitoring_enabled: false,
  alert_threshold: {
    overdue_invoices_count: 10,
    unpaid_invoices_value_gbp: 5000,
    pending_payslips_count: 20
  },

  owner_notes: 'Revenue-critical. Invoices = cash flow.',
  documentation_url: 'file://docs/invoicing/'
}
```

---

## 🎨 UI Page Design Suggestions

**For `/admin/critical-features` page:**

### Layout
```
┌────────────────────────────────────────────────────────────────┐
│ Critical Features Registry                          🔄 Refresh │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Health Overview:                                               │
│  🟢 Green: 4 features    🟡 Yellow: 1 feature    🔴 Red: 0     │
│                                                                │
│ Priority Breakdown:                                            │
│  🔴 CRITICAL: 4          🟠 HIGH: 2              🟢 MEDIUM: 0  │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Features Table:                                                │
│                                                                │
│ ┌──────┬────────────────────────┬──────────┬────────┬────────┐│
│ │●     │ Feature                │ Priority │ Status │ Issues ││
│ ├──────┼────────────────────────┼──────────┼────────┼────────┤│
│ │🟡    │ Timesheet OCR Upload   │ CRITICAL │ Fragile│   3    ││
│ │      │ [View Details →]       │          │        │        ││
│ ├──────┼────────────────────────┼──────────┼────────┼────────┤│
│ │🟢    │ GPS Clock-In/Out       │ CRITICAL │ Working│   2    ││
│ │      │ [View Details →]       │          │        │        ││
│ └──────┴────────────────────────┴──────────┴────────┴────────┘│
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Feature Detail Modal
```
┌────────────────────────────────────────────────────────────────┐
│ Timesheet OCR Upload                                        ✕ │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Status: 🟡 WORKING BUT FRAGILE                                │
│ Priority: 🔴 CRITICAL                                          │
│                                                                │
│ Description:                                                   │
│ AI-powered timesheet upload with GPT-4o OCR extraction...     │
│                                                                │
│ 📍 Code Locations:                                            │
│  • src/pages/Timesheets.jsx:339-758          [View Code →]   │
│  • src/pages/TimesheetDetail.jsx:231-651     [View Code →]   │
│  • src/components/timesheets/ConfirmOCRModal.jsx [View →]    │
│                                                                │
│ ⚡ Edge Functions:                                            │
│  • extract-timesheet-data                    [Logs →]        │
│  • whatsapp-timesheet-upload-handler         [Logs →]        │
│                                                                │
│ 🗄️ Database Tables:                                           │
│  • timesheets (uploaded_documents column)    [Schema →]      │
│  • shifts (timesheet_id column)              [Schema →]      │
│                                                                │
│ ⚠️ Known Issues (3):                                          │
│  🔴 HIGH: Code duplication (400 lines in 2 files)            │
│     Fix effort: 3 hours                                       │
│     [View Details] [Create Task]                              │
│                                                                │
│  🟡 MEDIUM: No upload monitoring                             │
│     Fix effort: 4 hours                                       │
│     [View Details] [Create Task]                              │
│                                                                │
│  🔴 HIGH: No integration tests                               │
│     Fix effort: 6 hours                                       │
│     [View Details] [Create Task]                              │
│                                                                │
│ 📊 Dependencies:                                              │
│  Depends on: OpenAI API, extract-timesheet-data, Storage     │
│  Depended by: Payroll, Invoices, Compliance                  │
│                                                                │
│ 📝 Last Incident:                                             │
│  Date: 2025-12-17                                             │
│  Details: Staff uploads bypassed OCR due to code duplication │
│           [View Full Report →]                                │
│                                                                │
│ 📖 Documentation:                                             │
│  [View Full Docs →] TIMESHEET_UPLOAD_SYSTEM.md               │
│                                                                │
│ [Enable Monitoring] [Run Health Check] [Close]                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Queries for Live Data

**For MODULE_5 agents: Use these queries to populate real-time health metrics**

### Upload Success Rate (Last 7 Days)
```sql
-- TODO: Create timesheet_upload_logs table first
SELECT
  COUNT(*) FILTER (WHERE ocr_success = true)::FLOAT / COUNT(*) * 100 AS success_rate,
  AVG(ocr_confidence) AS avg_confidence,
  COUNT(*) FILTER (WHERE auto_approved = true)::FLOAT / COUNT(*) * 100 AS auto_approval_rate,
  COUNT(*) FILTER (WHERE errors IS NOT NULL) AS failed_uploads
FROM timesheet_upload_logs
WHERE created_at >= NOW() - INTERVAL '7 days';
```

### GPS Clock-In Accuracy
```sql
SELECT
  AVG((gps_metadata->>'accuracy')::NUMERIC) AS avg_accuracy_meters,
  COUNT(*) FILTER (WHERE (gps_metadata->>'in_range')::BOOLEAN = false) AS out_of_range_count,
  COUNT(*) AS total_clock_ins
FROM timesheets
WHERE clock_in_time >= NOW() - INTERVAL '7 days'
  AND gps_metadata IS NOT NULL;
```

### Notification Delivery Rates
```sql
SELECT
  channel,
  COUNT(*) FILTER (WHERE status = 'delivered')::FLOAT / COUNT(*) * 100 AS delivery_rate,
  COUNT(*) AS total_sent
FROM notification_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY channel;
```

---

## 📋 TODO for MODULE_5 Agents

When building the `/admin/critical-features` UI page:

1. ✅ Create `critical_features` database table (schema above)
2. ✅ Populate initial data from this document
3. ✅ Create React page at `src/pages/admin/CriticalFeatures.jsx`
4. ✅ Add live health metrics (queries above)
5. ✅ Add "Create Task" button for each issue (creates TODO item)
6. ✅ Add "Enable Monitoring" button (sets up alerts)
7. ✅ Add "Run Health Check" button (triggers validation)
8. ✅ Add search/filter by priority, status, health
9. ✅ Add export to CSV/JSON
10. ✅ Add changelog (track when features status changes)

---

**END OF DOCUMENT**
