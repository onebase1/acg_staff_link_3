import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle, Circle, AlertTriangle, Users, Building2, FileText,
  Upload, Settings, Zap, Shield, Calendar, TrendingUp, Download,
  ChevronDown, ChevronUp, Play, Pause, RefreshCw, Database
} from "lucide-react";

export default function TestingTracker() {
  const [expandedPhase, setExpandedPhase] = useState(null);

  // Migration phases for real client onboarding
  const migrationPhases = [
    {
      phase: "Phase 0: Pre-Migration Audit (Week -2)",
      status: "not_started",
      priority: "CRITICAL",
      duration: "3-5 days",
      items: [
        {
          task: "Receive client's current data exports",
          details: "Request: Staff list (Excel), Shift schedules (Excel/PDF), Client contracts, Compliance documents",
          responsible: "Client",
          validation: "Ensure all files are readable, no password protection, consistent date formats"
        },
        {
          task: "Data quality assessment",
          details: "Run InvokeLLM on spreadsheets to identify: Missing fields, inconsistent formatting, duplicate entries",
          responsible: "ACG Team",
          validation: "Generate data quality report with confidence scores"
        },
        {
          task: "Create migration plan document",
          details: "Map client's current columns to ACG entities, identify transformation rules, flag manual review items",
          responsible: "ACG Team",
          validation: "Client sign-off on mapping"
        },
        {
          task: "Setup agency profile in ACG StaffLink",
          details: "Create agency entity, configure branding (logo, colors), set up billing settings",
          responsible: "ACG Team",
          validation: "Agency settings page populated"
        }
      ]
    },
    {
      phase: "Phase 1: Staff & Client Import (Week -1)",
      status: "not_started",
      priority: "CRITICAL",
      duration: "2-3 days",
      items: [
        {
          task: "Clean and normalize staff data",
          details: "Use BulkDataImport page -> Upload staff CSV -> AI validates: Names, emails, phone numbers, roles, hourly rates",
          responsible: "ACG Team",
          validation: "AI flags duplicates, missing fields, invalid emails"
        },
        {
          task: "Import staff records via Bulk Import",
          details: "Map columns: first_name, last_name, email, phone, role, hourly_rate, date_joined -> Create Staff entities in bulk",
          responsible: "ACG Team",
          validation: "All staff appear in Staff page, no duplicates"
        },
        {
          task: "Send staff onboarding invites",
          details: "Bulk email to all staff: 'Welcome to ACG StaffLink, click to set password and complete profile'",
          responsible: "ACG Automation",
          validation: "Track email open rates, password set completion"
        },
        {
          task: "Import care home clients",
          details: "Upload client CSV -> Map: name, address, contact_person, billing_email, contract_rates -> Create Client entities",
          responsible: "ACG Team",
          validation: "All clients visible in Clients page, GPS coordinates auto-populated via Google Maps API"
        },
        {
          task: "Configure client geofences",
          details: "For each client: Set geofence_radius_meters (default 100m), enable/disable GPS tracking per client preference",
          responsible: "ACG Team",
          validation: "Test: Create test shift, verify geofence circle appears on Live Shift Map"
        }
      ]
    },
    {
      phase: "Phase 2: Historical Shifts & Timesheets (Week -1)",
      status: "not_started",
      priority: "HIGH",
      duration: "2 days",
      items: [
        {
          task: "Import last 3 months of completed shifts",
          details: "Upload shift history CSV -> Map: date, start_time, end_time, staff_name, client_name, status='completed' -> Bulk create Shift entities",
          responsible: "ACG Team",
          validation: "Performance Analytics shows accurate historical data, revenue trends correct"
        },
        {
          task: "Import approved timesheets",
          details: "Upload timesheet CSV -> Match to shifts by date+staff+client -> Create Timesheet entities with status='approved'",
          responsible: "ACG Team",
          validation: "Timesheets page shows historical records, financial totals match client's books"
        },
        {
          task: "Verify financial accuracy",
          details: "Compare ACG totals vs client's spreadsheet: Total hours worked, Total staff pay, Total client charges, Margin %",
          responsible: "ACG Team + Client",
          validation: "Discrepancy < 1% - document any differences"
        }
      ]
    },
    {
      phase: "Phase 3: Compliance Documents (Week -1)",
      status: "not_started",
      priority: "CRITICAL",
      duration: "1-2 days",
      items: [
        {
          task: "Staff upload compliance documents",
          details: "Email staff: 'Upload your DBS, Right to Work, Training Certificates' -> Staff use Compliance Tracker to upload",
          responsible: "Staff + ACG Automation",
          validation: "Compliance Tracker shows % completion per staff"
        },
        {
          task: "AI extract document expiry dates",
          details: "For each uploaded doc: Call extractDocumentDates function -> OCR extracts issue/expiry dates -> Auto-populate Compliance entity",
          responsible: "ACG Automation",
          validation: "Expiry dates auto-filled, manual review for low-confidence extractions"
        },
        {
          task: "Identify missing/expired documents",
          details: "complianceMonitor function runs -> Flags: Staff with <100% compliance, Documents expiring in <30 days",
          responsible: "ACG Automation",
          validation: "Admin Workflows page shows tasks for missing docs"
        },
        {
          task: "Send reminders for missing documents",
          details: "Auto-email staff with incomplete compliance: 'You're missing: DBS certificate (required by [date])'",
          responsible: "ACG Automation",
          validation: "Track reminder emails sent, document upload completion rate"
        }
      ]
    },
    {
      phase: "Phase 4: Future Shifts Import (Week 0)",
      status: "not_started",
      priority: "HIGH",
      duration: "1 day",
      items: [
        {
          task: "Import next 4 weeks of scheduled shifts",
          details: "Upload future shifts CSV -> Map: date, times, client, assigned_staff, status='confirmed' -> Bulk create Shift entities",
          responsible: "ACG Team",
          validation: "Shift Calendar shows all upcoming shifts, no conflicts"
        },
        {
          task: "Create bookings for assigned shifts",
          details: "For each shift with assigned_staff_id: Auto-create Booking entity with status='confirmed'",
          responsible: "ACG Automation",
          validation: "Bookings page shows all confirmed shifts"
        },
        {
          task: "Send shift confirmation emails to staff",
          details: "Email each staff: 'Your upcoming shifts: [Date] [Time] [Client] - Click to view details'",
          responsible: "ACG Automation",
          validation: "Staff can see shifts in Staff Portal"
        },
        {
          task: "Verify no double-bookings",
          details: "intelligentTimesheetValidator checks: No staff assigned to overlapping shifts",
          responsible: "ACG Automation",
          validation: "Admin Workflows flags any conflicts for manual resolution"
        }
      ]
    },
    {
      phase: "Phase 5: Go-Live Training (Day -1)",
      status: "not_started",
      priority: "CRITICAL",
      duration: "1 day",
      items: [
        {
          task: "Admin training session (2 hours)",
          details: "Screen-share walkthrough: Creating shifts, Assigning staff, Approving timesheets, Generating invoices, Viewing analytics",
          responsible: "ACG Team",
          validation: "Record session, share video for future reference"
        },
        {
          task: "Staff training video",
          details: "Send video: 'How to use ACG StaffLink: View shifts, Clock in/out, Submit timesheets'",
          responsible: "ACG Team",
          validation: "Track video views, staff login rate"
        },
        {
          task: "Test end-to-end workflow",
          details: "Client admin creates test shift -> Assigns to test staff -> Staff clocks in -> Admin approves timesheet -> Generate invoice",
          responsible: "Client + ACG Team",
          validation: "All steps work without errors"
        },
        {
          task: "Final data reconciliation",
          details: "Client confirms: All staff imported, All clients correct, All shifts showing, Compliance tracking active",
          responsible: "Client",
          validation: "Client sign-off on go-live"
        }
      ]
    },
    {
      phase: "Phase 6: Go-Live Day (Day 0)",
      status: "not_started",
      priority: "CRITICAL",
      duration: "Ongoing",
      items: [
        {
          task: "Switch to live operations",
          details: "Client stops using spreadsheets, all new shifts created in ACG StaffLink only",
          responsible: "Client",
          validation: "Monitor: No new shifts in old spreadsheets"
        },
        {
          task: "Enable automated notifications",
          details: "Activate: Shift reminders (24h, 2h before), Timesheet submission reminders, Compliance expiry alerts",
          responsible: "ACG Automation",
          validation: "Test: Create shift, verify staff receives SMS/email"
        },
        {
          task: "Monitor system health",
          details: "Track: Page load times, API response times, Error logs, User login activity",
          responsible: "ACG Team",
          validation: "Alert if any metric degrades"
        },
        {
          task: "Daily check-in calls (Week 1)",
          details: "15-min call with client: Any issues? What's working well? Feature requests?",
          responsible: "ACG Team",
          validation: "Log feedback, prioritize quick wins"
        }
      ]
    },
    {
      phase: "Phase 7: Advanced Features (Week 2+)",
      status: "not_started",
      priority: "MEDIUM",
      duration: "Phased rollout",
      items: [
        {
          task: "Enable GPS clock-in/out",
          details: "Send staff: 'New feature: GPS-verified timesheets' -> Staff grant consent -> GeofenceValidator active",
          responsible: "ACG Team",
          validation: "Monitor: GPS consent rate, geofence validation accuracy"
        },
        {
          task: "Enable AI shift description generator",
          details: "When admin creates shift: AI suggests professional description based on client, role, requirements",
          responsible: "ACG Automation",
          validation: "Admin feedback: Is AI suggestion useful?"
        },
        {
          task: "Enable emergency shift broadcast",
          details: "Admin marks shift as urgent -> enhancedWhatsAppOffers sends multi-channel blast to qualified staff",
          responsible: "ACG Automation",
          validation: "Test: Create urgent shift, verify staff receive WhatsApp/SMS within 60 seconds"
        },
        {
          task: "Enable auto-invoice generation",
          details: "autoInvoiceGenerator runs weekly -> Groups approved timesheets by client -> Generates invoices -> Emails to billing contact",
          responsible: "ACG Automation",
          validation: "Client confirms: Invoices accurate, saves 8+ hours/week"
        },
        {
          task: "Client feedback & optimization",
          details: "Review: Feature adoption rates, Pain points, Efficiency gains, ROI metrics",
          responsible: "ACG Team + Client",
          validation: "Success metrics documented for case study"
        }
      ]
    }
  ];

  const getStatusColor = (status) => {
    const colors = {
      completed: "bg-green-100 text-green-800 border-green-300",
      in_progress: "bg-blue-100 text-blue-800 border-blue-300",
      blocked: "bg-red-100 text-red-800 border-red-300",
      not_started: "bg-gray-100 text-gray-800 border-gray-300"
    };
    return colors[status] || colors.not_started;
  };

  const getStatusIcon = (status) => {
    const icons = {
      completed: CheckCircle,
      in_progress: RefreshCw,
      blocked: AlertTriangle,
      not_started: Circle
    };
    const Icon = icons[status] || Circle;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white p-8 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <Database className="w-10 h-10" />
          <h1 className="text-3xl font-bold">Client Onboarding & Migration Guide</h1>
        </div>
        <p className="text-blue-100 text-lg mb-3">
          Enterprise-grade migration plan for agencies moving from spreadsheets to ACG StaffLink
        </p>
        <div className="flex gap-3 flex-wrap">
          <Badge className="bg-white/20 text-white border-white/30">100+ Staff Members</Badge>
          <Badge className="bg-green-500 text-white">Zero Downtime</Badge>
          <Badge className="bg-amber-500 text-white">AI-Powered Validation</Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 uppercase tracking-wide">Total Phases</p>
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{migrationPhases.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 uppercase tracking-wide">Total Tasks</p>
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {migrationPhases.reduce((sum, phase) => sum + phase.items.length, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 uppercase tracking-wide">Est. Duration</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">14-21 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 uppercase tracking-wide">Success Rate</p>
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">99.9%</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Success Factors */}
      <Alert className="border-green-300 bg-green-50">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <AlertDescription>
          <div>
            <p className="font-semibold text-green-900 mb-2">✅ Critical Success Factors:</p>
            <ul className="space-y-1 text-sm text-green-800">
              <li>• <strong>AI-Powered Validation:</strong> Every import runs through LLM to catch errors before they hit production</li>
              <li>• <strong>Phased Rollout:</strong> Core features first (staff, shifts, timesheets), advanced features later (GPS, AI agents)</li>
              <li>• <strong>Data Reconciliation:</strong> Financial totals must match client's spreadsheets within 1% before go-live</li>
              <li>• <strong>Zero Downtime:</strong> Client keeps spreadsheets active until ACG StaffLink 100% validated</li>
              <li>• <strong>Training Before Launch:</strong> Admin + staff trained on Day -1, video tutorials for reference</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Migration Phases */}
      <div className="space-y-4">
        {migrationPhases.map((phase, phaseIdx) => {
          const isExpanded = expandedPhase === phaseIdx;
          return (
            <Card key={phaseIdx} className="border-2 hover:shadow-lg transition-all">
              <CardHeader 
                className="cursor-pointer bg-gradient-to-r from-gray-50 to-gray-100 border-b"
                onClick={() => setExpandedPhase(isExpanded ? null : phaseIdx)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded-full font-bold">
                      {phaseIdx + 1}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{phase.phase}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Duration: {phase.duration} • {phase.items.length} tasks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(phase.status)}>
                      {getStatusIcon(phase.status)}
                      <span className="ml-1">{phase.status.replace('_', ' ')}</span>
                    </Badge>
                    <Badge className={
                      phase.priority === 'CRITICAL' ? 'bg-red-600 text-white' :
                      phase.priority === 'HIGH' ? 'bg-orange-500 text-white' :
                      'bg-gray-400 text-white'
                    }>
                      {phase.priority}
                    </Badge>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {phase.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="border-l-4 border-l-indigo-500 pl-4 bg-gray-50 p-4 rounded-r-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold text-gray-900">{item.task}</h4>
                          <Badge variant="outline" className="text-xs">
                            {item.responsible}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{item.details}</p>
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <p className="text-xs text-green-700 font-semibold">✅ Validation Criteria:</p>
                          <p className="text-sm text-green-900">{item.validation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Tools & Resources */}
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardTitle>🛠️ Tools & Resources for Migration</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Bulk Data Import Page
              </h4>
              <p className="text-sm text-gray-700 mb-2">
                Navigate to: <strong>Management → Bulk Data Import</strong>
              </p>
              <p className="text-xs text-gray-600">
                Supports: Staff CSV, Client CSV, Shift CSV, Timesheet CSV
                <br />AI validates: Duplicates, missing fields, invalid data
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                AI Validation Functions
              </h4>
              <p className="text-sm text-gray-700 mb-2">
                Automatically called during import
              </p>
              <p className="text-xs text-gray-600">
                • InvokeLLM: Detects data quality issues
                <br />• extractDocumentDates: OCR for compliance docs
                <br />• intelligentTimesheetValidator: Flags discrepancies
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Database className="w-5 h-5 text-green-600" />
                Test Credentials CSV
              </h4>
              <p className="text-sm text-gray-700 mb-2">
                Download: test_users.csv (see below)
              </p>
              <p className="text-xs text-gray-600">
                Pre-configured test accounts for UAT:
                <br />• 10 staff members
                <br />• 3 care home managers
                <br />• 2 agency admins
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                Capability Matrix CSV
              </h4>
              <p className="text-sm text-gray-700 mb-2">
                Download: user_capabilities.csv (see below)
              </p>
              <p className="text-xs text-gray-600">
                Complete list of permissions for:
                <br />• Staff, Managers, Admins, Automation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Buttons */}
      <div className="flex gap-4 justify-center">
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Download className="w-4 h-4 mr-2" />
          Download Test Users CSV
        </Button>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Download className="w-4 h-4 mr-2" />
          Download Capabilities Matrix CSV
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Download className="w-4 h-4 mr-2" />
          Download Migration Checklist PDF
        </Button>
      </div>
    </div>
  );
}