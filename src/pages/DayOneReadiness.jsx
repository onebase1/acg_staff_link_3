import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle, Circle, AlertTriangle, Rocket, Database, Users,
  Shield, FileText, TrendingUp, Download, Zap, Clock, Settings
} from "lucide-react";

export default function DayOneReadiness() {
  const [expandedSection, setExpandedSection] = useState(null);

  const readinessChecklist = [
    {
      category: "1. DATA MIGRATION (Dominion Agency)",
      icon: Database,
      color: "indigo",
      priority: "CRITICAL",
      items: [
        {
          task: "Staff Data Upload",
          status: "ready",
          details: "CSV with 100+ staff members (names, emails, phones, roles, hourly rates, bank details)",
          validation: "✅ BulkDataImport page with AI validator ready",
          testing: "Upload staff CSV → AI validates emails/phones → Review flagged duplicates → Bulk create Staff entities"
        },
        {
          task: "Client/Care Home Data Upload",
          status: "ready",
          details: "CSV with care homes (names, addresses, contact details, payment terms, contract rates)",
          validation: "✅ Auto-populate GPS coordinates via geocoding",
          testing: "Upload client CSV → Verify geofences appear on Live Shift Map → Test: Can clients login?"
        },
        {
          task: "Historical Shifts (Unpaid)",
          status: "ready",
          details: "Import shifts from last billing period that haven't been invoiced yet",
          validation: "✅ Shifts appear in Shift Calendar with status='completed'",
          testing: "Upload shift CSV → Verify dates/times correct → Check Performance Analytics shows accurate totals"
        },
        {
          task: "Historical Timesheets (Approved)",
          status: "ready",
          details: "Import approved timesheets matching the historical shifts",
          validation: "✅ Financial totals match Dominion's spreadsheet (within 1%)",
          testing: "Upload timesheet CSV → Navigate to Timesheets page → Verify hours/amounts → Compare to source spreadsheet"
        },
        {
          task: "Compliance Documents Upload",
          status: "ready",
          details: "Staff profile photos + DBS/Right to Work PDFs",
          validation: "✅ extractDocumentDates function extracts expiry dates via OCR",
          testing: "Upload profile pic → Upload DBS PDF → Check Compliance Tracker shows expiry date → Test: Date extraction accuracy"
        },
        {
          task: "Staff Availability Calendars",
          status: "ready",
          details: "Import staff availability (which days/shift types each staff can work)",
          validation: "✅ Shift Marketplace only shows matched shifts",
          testing: "Upload availability CSV → Login as staff → Check Shift Marketplace shows only matching shifts"
        },
        {
          task: "Contract Rates Configuration",
          status: "ready",
          details: "Import client-specific rates by role (pay_rate, charge_rate per role)",
          validation: "✅ Rates stored in Client entity → contract_terms.rates_by_role",
          testing: "Upload rates CSV → Create new shift → Verify correct rates auto-populate"
        }
      ]
    },
    {
      category: "2. ADMIN APPROVAL WORKFLOWS",
      icon: Shield,
      color: "red",
      priority: "CRITICAL",
      items: [
        {
          task: "Shift Completion Verification",
          status: "ready",
          details: "Admin validates shift happened via GPS timesheet OR manual override",
          validation: "✅ Admin Workflows page shows 'awaiting_verification' shifts",
          testing: "Create shift → Mark complete → Check workflow appears → Admin approves/rejects"
        },
        {
          task: "Shift Reassignment with Notifications",
          status: "ready",
          details: "Admin can reassign shift to different staff, system logs change + notifies all parties",
          validation: "✅ Reassignment history tracked, automated emails sent",
          testing: "Assign shift to Staff A → Reassign to Staff B → Check: Staff A receives cancellation email, Staff B receives assignment email"
        },
        {
          task: "Override Permissions & Audit Trail",
          status: "ready",
          details: "Admins can override geofence violations, timesheet discrepancies - all logged in ChangeLog entity",
          validation: "✅ ChangeLog entity tracks who, what, when, why",
          testing: "Override geofence violation → Check ChangeLog entity → Verify: User ID, timestamp, reason logged"
        },
        {
          task: "Dispute Resolution Interface",
          status: "ready",
          details: "Admin Workflows shows disputed shifts/timesheets with resolution actions",
          validation: "✅ Can mark as resolved with notes, updates related entities",
          testing: "Create disputed timesheet → Navigate to Admin Workflows → Resolve with notes → Check: Timesheet status updated"
        },
        {
          task: "Automated Change Notifications",
          status: "ready",
          details: "System emails staff when: Shift cancelled, Bank details changed, Pay rate adjusted",
          validation: "✅ criticalChangeNotifier function sends security alerts",
          testing: "Cancel shift → Check staff receives email: 'If you didn't request this, contact agency'"
        }
      ]
    },
    {
      category: "3. INVOICING SIMULATION",
      icon: FileText,
      color: "green",
      priority: "HIGH",
      items: [
        {
          task: "Invoice Generation from Approved Timesheets",
          status: "ready",
          details: "Invoices ONLY include timesheets with status='approved'",
          validation: "✅ autoInvoiceGenerator groups by client, excludes draft/rejected/submitted",
          testing: "Approve 5 timesheets → Generate invoice → Check: Only approved timesheets included, totals accurate"
        },
        {
          task: "Invoice Email to Care Home Billing Contact",
          status: "ready",
          details: "Send invoice PDF to client.billing_email (NOT to care home manager)",
          validation: "✅ Email goes to billing_email field, not contact_person.email",
          testing: "Generate invoice → Check email sent to correct recipient → Verify PDF attachment"
        },
        {
          task: "Invoice Approval Workflow Stats",
          status: "ready",
          details: "Dashboard shows: X approved, Y pending, Z rejected timesheets for current period",
          validation: "✅ Performance Analytics shows breakdown",
          testing: "Navigate to Invoices page → Check stats widget → Verify counts match Timesheets page filters"
        },
        {
          task: "Invoice Payment Tracking (Manual)",
          status: "ready",
          details: "Admin manually marks invoice as 'paid' after bank transfer received",
          validation: "✅ Invoice status updates, payslips can be generated",
          testing: "Mark invoice as paid → Navigate to Payslips → Verify: Can generate payslips for that period"
        }
      ]
    },
    {
      category: "4. CONTRACTUAL FINANCIAL AGREEMENTS",
      icon: TrendingUp,
      color: "purple",
      priority: "CRITICAL",
      items: [
        {
          task: "Protected Base Rates (Client Contract)",
          status: "ready",
          details: "Client.contract_terms.rates_by_role stores negotiated rates (care_worker: pay £14.75, charge £19.18)",
          validation: "✅ Only agency_admin can edit Client entity (RLS enforced)",
          testing: "Login as manager → Try to edit client rates → Should be blocked OR logged"
        },
        {
          task: "Shift-Specific Pay Overrides",
          status: "ready",
          details: "Admin can set higher pay for: Urgent shifts, Far locations, Skill premium, Negotiated rate",
          validation: "✅ Shift.pay_rate_override tracks original + new rate + reason",
          testing: "Create shift → Set pay override (£14.75 → £18.00, reason: 'urgent_incentive') → Assign staff → Check: Staff sees override in marketplace"
        },
        {
          task: "Financial Data Privacy (Staff)",
          status: "ready",
          details: "Staff CANNOT see client charge rates, only their own pay rate",
          validation: "✅ RLS on Shift entity hides charge_rate from staff_member role",
          testing: "Login as staff → View shift → Verify: Only pay_rate visible, charge_rate hidden"
        },
        {
          task: "Financial Data Privacy (Care Home Manager)",
          status: "ready",
          details: "Care home managers CANNOT see staff pay rates, only what they're being charged",
          validation: "✅ RLS on Timesheet/Invoice entities",
          testing: "Login as client_user → View invoice → Verify: Only charge amounts visible, pay rates hidden"
        },
        {
          task: "Rate Validation on Shift Creation",
          status: "ready",
          details: "When admin creates shift, system auto-fills rates from Client.contract_terms.rates_by_role[shift.role_required]",
          validation: "✅ PostShift page loads rates from contract",
          testing: "Select client → Select role → Verify: pay_rate and charge_rate auto-populate from contract"
        }
      ]
    },
    {
      category: "5. CHANGE CONFIRMATIONS & FRAUD PREVENTION",
      icon: Shield,
      color: "red",
      priority: "CRITICAL",
      items: [
        {
          task: "Shift Cancellation Alerts",
          status: "ready",
          details: "Staff receives email: 'Your shift has been cancelled. If you didn't request this, contact agency'",
          validation: "✅ criticalChangeNotifier function",
          testing: "Cancel shift → Staff receives email within 60 seconds → Verify: Email contains shift details + warning"
        },
        {
          task: "Bank Details Change Alerts",
          status: "ready",
          details: "Staff receives security email: 'Your bank details changed. If you didn't authorize, contact agency IMMEDIATELY'",
          validation: "✅ Email shows old → new values, timestamp, who changed it",
          testing: "Update staff bank details → Staff receives email → Verify: Shows old/new account numbers"
        },
        {
          task: "Pay Rate Override Alerts",
          status: "ready",
          details: "Staff receives email: 'Your pay rate adjusted for shift [details]'",
          validation: "✅ Email shows standard rate → override rate + reason",
          testing: "Set pay override on shift → Assign staff → Staff receives email → Verify: Transparency"
        },
        {
          task: "Audit Trail (ChangeLog entity)",
          status: "ready",
          details: "Every critical change logged: Who, What, When, Why, Risk Level",
          validation: "✅ ChangeLog entity stores full audit trail",
          testing: "Make 5 critical changes → Navigate to Dashboard → Data → ChangeLog → Verify all logged"
        },
        {
          task: "IP Address Logging (Future)",
          status: "future",
          details: "Log IP address of user making critical changes (fraud detection)",
          validation: "Future: Geo-locate IP, flag changes from unusual locations",
          testing: "N/A - Phase 2 feature"
        }
      ]
    },
    {
      category: "6. SHIFT MARKETPLACE (Admin Control)",
      icon: Zap,
      color: "cyan",
      priority: "HIGH",
      items: [
        {
          task: "Admin Toggle: Add to Marketplace",
          status: "ready",
          details: "For any open shift, admin can manually add to marketplace via toggle switch",
          validation: "✅ Shift.marketplace_visible boolean field",
          testing: "Create open shift → Toggle 'Show in Marketplace' → Login as staff → Verify: Shift appears in marketplace"
        },
        {
          task: "Auto-Match Algorithm",
          status: "ready",
          details: "Shifts auto-appear in marketplace if they match staff role + availability",
          validation: "✅ ShiftMarketplace filters by role + availability calendar",
          testing: "Create shift for 'nurse' on Monday day → Login as nurse with Monday availability → Verify: Shift appears"
        },
        {
          task: "Marketplace Visibility Indicator",
          status: "ready",
          details: "Shifts page shows badge '📢 In Marketplace' for shifts staff can see",
          validation: "✅ Badge visible on Shifts page",
          testing: "Toggle marketplace ON → Check Shifts page → Verify: Badge appears"
        }
      ]
    },
    {
      category: "7. FUTURE ENHANCEMENTS (Post Day-One)",
      icon: Rocket,
      color: "orange",
      priority: "MEDIUM",
      items: [
        {
          task: "WhatsApp Shift Broadcasts",
          status: "future",
          details: "Urgent shifts broadcast to WhatsApp in addition to SMS",
          validation: "enhancedWhatsAppOffers function (already built)",
          testing: "Defer to Phase 2"
        },
        {
          task: "Proactive Client Drop-Off Detection",
          status: "future",
          details: "Weekly email to admin: 'Client X bookings dropped from 10/wk → 3/wk. Investigate: Late assignments? Cancellations? Quality issues?'",
          validation: "AI analyzes booking trends, flags drops >30%",
          testing: "Phase 2 - requires 4+ weeks of data"
        },
        {
          task: "Invoice Payment Workflow (Auto-Chase)",
          status: "future",
          details: "System auto-emails client on: Day 7 overdue, Day 14 overdue, Day 30 overdue (escalating tone)",
          validation: "paymentReminderEngine function (already built)",
          testing: "Phase 2 - activate after invoicing proven"
        },
        {
          task: "Conversational AI for Shift Requests",
          status: "future",
          details: "Care home emails/WhatsApps: 'Need 2 nurses tomorrow 8am-8pm' → AI parses → Creates shifts",
          validation: "AI agent with access to Shift entity",
          testing: "Phase 3 - after core workflows proven"
        },
        {
          task: "Weekly Insight Reports",
          status: "future",
          details: "Email agency owner: Staff performance trends, Client booking patterns, Revenue by client, Margin analysis, Action items",
          validation: "Data visualization + LLM-generated insights",
          testing: "Phase 2 - after 4+ weeks of operational data"
        }
      ]
    }
  ];

  const testingPlan = {
    day_one_migration: {
      title: "DAY ONE MIGRATION - Step by Step",
      steps: [
        {
          step: 1,
          title: "Prepare Dominion's Data",
          tasks: [
            "Request from Dominion: Staff list (Excel), Shift schedules (last 4 weeks - unpaid), Client list, Compliance docs",
            "Download our CSV templates (BulkDataImport page)",
            "Map Dominion's columns to our format (use AI to suggest mapping)",
            "Clean data: Remove duplicates, fix phone formats, validate emails"
          ]
        },
        {
          step: 2,
          title: "Import Clients First",
          tasks: [
            "Navigate to: Management → Bulk Data Import",
            "Select: 'Clients / Care Homes'",
            "Upload Dominion's client CSV",
            "AI validates → Review flagged issues → Confirm import",
            "Verify: Clients appear in Clients page",
            "Verify: Geofences appear on Live Shift Map"
          ]
        },
        {
          step: 3,
          title: "Import Staff",
          tasks: [
            "Select: 'Staff Members'",
            "Upload Dominion's staff CSV (100+ records)",
            "AI validates → Flags duplicates, invalid emails",
            "Review and fix flagged issues",
            "Confirm bulk import",
            "Verify: All staff appear in Staff page",
            "Send onboarding emails (optional - or import with existing passwords)"
          ]
        },
        {
          step: 4,
          title: "Import Staff Availability",
          tasks: [
            "Select: 'Staff Availability'",
            "Upload availability CSV (staff_email, monday, tuesday, etc.)",
            "System merges with existing staff records",
            "Verify: Staff Availability page shows calendars"
          ]
        },
        {
          step: 5,
          title: "Import Historical Shifts (Unpaid)",
          tasks: [
            "Select: 'Shifts'",
            "Upload shifts CSV (only shifts not yet invoiced)",
            "System matches client_name to Client entity, staff_name to Staff entity",
            "Sets status='completed' and shift_ended_at timestamps",
            "Verify: Shifts appear in Shift Calendar",
            "Verify: Performance Analytics shows correct totals"
          ]
        },
        {
          step: 6,
          title: "Import Historical Timesheets",
          tasks: [
            "Select: 'Historical Timesheets'",
            "Upload timesheet CSV (matching the shifts from Step 5)",
            "System links timesheets to shifts",
            "Sets status='approved'",
            "CRITICAL: Verify financial totals match Dominion's spreadsheet (within 1%)",
            "If mismatch >1%: Investigate discrepancies before proceeding"
          ]
        },
        {
          step: 7,
          title: "Upload Compliance Documents",
          tasks: [
            "For each staff: Upload profile photo + DBS + Right to Work",
            "System calls extractDocumentDates → OCR extracts expiry",
            "Verify: Compliance Tracker shows completion %",
            "Flag: Any expired documents",
            "Test: Staff Profile Simulation (what care homes see)"
          ]
        },
        {
          step: 8,
          title: "Generate Test Invoice",
          tasks: [
            "Navigate to: Financials → Invoices",
            "Click: 'Generate Invoice'",
            "Select: Client + Date range",
            "System pulls ONLY approved timesheets",
            "Preview invoice → Verify: Totals match Step 6",
            "Send invoice to test email",
            "Verify: PDF formatted correctly, all line items present"
          ]
        },
        {
          step: 9,
          title: "UAT Testing - Admin Perspective",
          tasks: [
            "Login as Dominion admin",
            "Create new shift → Assign staff → Verify notification sent",
            "Approve pending timesheet → Verify appears in 'Ready to invoice'",
            "Cancel a shift → Verify: Staff receives automated email",
            "Reassign shift → Verify: Both staff notified",
            "Generate invoice → Verify: Only approved items included",
            "Test Admin Workflows → Resolve pending task → Verify: Shift status updates"
          ]
        },
        {
          step: 10,
          title: "UAT Testing - Staff Perspective",
          tasks: [
            "Login as test staff member",
            "Navigate to Shift Marketplace",
            "Verify: Only see shifts matching role + availability",
            "Accept shift → Verify: Status changes to 'assigned'",
            "Navigate to Staff Portal → View upcoming shifts",
            "Check: Received shift confirmation email",
            "Test: Clock in with GPS (if consented)",
            "Verify: Timesheet created with geofence validation"
          ]
        },
        {
          step: 11,
          title: "UAT Testing - Client Perspective",
          tasks: [
            "Login as care home manager",
            "Navigate to Client Portal",
            "View assigned shifts",
            "Verify: Can see staff details, ETA",
            "Test: Approve timesheet (digital signature)",
            "Verify: Can view invoices (but NOT see staff pay rates)",
            "Check: Receives shift confirmation emails"
          ]
        },
        {
          step: 12,
          title: "Final Reconciliation & Go-Live",
          tasks: [
            "Compare ACG totals vs Dominion spreadsheet:",
            "  - Total hours: Must match within 1%",
            "  - Total revenue: Must match within 1%",
            "  - Staff count: Must match exactly",
            "  - Client count: Must match exactly",
            "Document any discrepancies → Investigate → Resolve",
            "Dominion sign-off: ✅ Data accurate, ready to go live",
            "Enable automation: Shift reminders, Compliance alerts",
            "Monitor for 48 hours: Any errors? User feedback?",
            "Celebrate: 🎉 Dominion is live on ACG StaffLink!"
          ]
        }
      ]
    }
  };

  const downloadMigrationChecklist = () => {
    const content = `ACG STAFFLINK - DAY ONE MIGRATION CHECKLIST

${readinessChecklist.map(category => `
${category.category}
Priority: ${category.priority}

${category.items.map((item, idx) => `
${idx + 1}. ${item.task}
   Status: ${item.status}
   Details: ${item.details}
   Validation: ${item.validation}
   Testing: ${item.testing}
`).join('\n')}
`).join('\n')}

TESTING PLAN
${Object.entries(testingPlan.day_one_migration.steps).map(([key, step]) => `
STEP ${step.step}: ${step.title}
${step.tasks.map(task => `  • ${task}`).join('\n')}
`).join('\n')}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'acg_stafflink_day_one_migration_checklist.txt';
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white p-8 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <Rocket className="w-12 h-12" />
          <div>
            <h1 className="text-4xl font-bold">Day One Readiness</h1>
            <p className="text-green-100 text-lg mt-2">
              Complete migration plan for Dominion Agency (100+ staff, hundreds of shifts)
            </p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap mt-4">
          <Badge className="bg-white/20 text-white border-white/30 text-sm">✅ Pre-Live Testing Phase</Badge>
          <Badge className="bg-green-500 text-white text-sm">💰 First Paying Client</Badge>
          <Badge className="bg-amber-500 text-white text-sm">🚀 Multi-Million £ Platform</Badge>
        </div>
      </div>

      {/* Download Button */}
      <div className="flex justify-center">
        <Button 
          onClick={downloadMigrationChecklist}
          className="bg-indigo-600 hover:bg-indigo-700 text-lg py-6 px-8"
        >
          <Download className="w-5 h-5 mr-2" />
          Download Complete Migration Checklist
        </Button>
      </div>

      {/* Readiness Checklist */}
      {readinessChecklist.map((category, catIdx) => {
        const Icon = category.icon;
        const isExpanded = expandedSection === catIdx;
        const totalItems = category.items.length;
        const readyItems = category.items.filter(i => i.status === 'ready').length;
        const completionRate = (readyItems / totalItems) * 100;

        return (
          <Card key={catIdx} className="border-2">
            <CardHeader 
              className={`bg-${category.color}-50 border-b cursor-pointer`}
              onClick={() => setExpandedSection(isExpanded ? null : catIdx)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={`w-6 h-6 text-${category.color}-600`} />
                  <div>
                    <CardTitle className="text-lg">{category.category}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {readyItems}/{totalItems} ready • {completionRate.toFixed(0)}% complete
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={
                    category.priority === 'CRITICAL' ? 'bg-red-600 text-white' :
                    category.priority === 'HIGH' ? 'bg-orange-500 text-white' :
                    'bg-gray-400 text-white'
                  }>
                    {category.priority}
                  </Badge>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`bg-${category.color}-600 h-2 rounded-full transition-all`}
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="p-6">
                <div className="space-y-4">
                  {category.items.map((item, itemIdx) => (
                    <div key={itemIdx} className={`p-4 rounded-lg border-l-4 ${
                      item.status === 'ready' ? 'border-l-green-500 bg-green-50' :
                      item.status === 'future' ? 'border-l-gray-400 bg-gray-50' :
                      'border-l-orange-500 bg-orange-50'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {item.status === 'ready' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : item.status === 'future' ? (
                            <Clock className="w-5 h-5 text-gray-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-orange-500" />
                          )}
                          <h4 className="font-bold text-gray-900">{item.task}</h4>
                        </div>
                        <Badge className={
                          item.status === 'ready' ? 'bg-green-100 text-green-800' :
                          item.status === 'future' ? 'bg-gray-100 text-gray-600' :
                          'bg-orange-100 text-orange-800'
                        }>
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2 ml-7">{item.details}</p>
                      <div className="ml-7 space-y-1">
                        <p className="text-xs text-green-700">
                          <strong>✅ Validation:</strong> {item.validation}
                        </p>
                        <p className="text-xs text-blue-700">
                          <strong>🧪 Testing:</strong> {item.testing}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Testing Plan */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
          <CardTitle>12-Step UAT Testing Plan</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {testingPlan.day_one_migration.steps.map((step) => (
              <div key={step.step} className="p-4 bg-white border-2 border-blue-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {step.step}
                  </div>
                  <h4 className="font-bold text-gray-900 text-lg">{step.title}</h4>
                </div>
                <ul className="ml-11 space-y-1">
                  {step.tasks.map((task, idx) => (
                    <li key={idx} className="text-sm text-gray-700">• {task}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Success Metrics */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <CardTitle>✅ Day One Success Metrics</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Technical Validation:</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  All staff imported (100% match with source)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  All clients imported with GPS coordinates
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Financial totals match within 1%
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Zero duplicate records
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  All emails/SMS delivered successfully
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  GPS geofencing working for all clients
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Business Validation:</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Admin can create, assign, approve shifts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Staff can accept shifts, clock in/out
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Invoices generated accurately
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  No spreadsheets needed for Day 1
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Client confirms: Saves 8+ hours/week
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Zero critical bugs reported
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
