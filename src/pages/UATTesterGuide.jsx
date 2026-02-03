import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckSquare, User, Users, Building2, UserCog, Shield,
  FileText, Download, AlertTriangle, Zap, Eye, Camera, UserPlus
} from "lucide-react";

export default function UATTesterGuide() {
  const [completedTests, setCompletedTests] = useState(new Set());

  const testAccounts = {
    staff: [
      {
        name: "Ebuka Okonkwo",
        email: "g.basera5+ebuka@gmail.com",
        password: "Broadbacnd@123",
        role: "Care Worker",
        purpose: "Test: View assigned shifts, Clock in/out, View marketplace, Accept shifts"
      },
      {
        name: "Chidi Okonkwo",
        email: "g.basera5+chidi@gmail.com",
        password: "Broadbacnd@123",
        role: "Care Worker",
        purpose: "Test: Staff availability, Shift acceptance, Timesheet submission"
      },
      {
        name: "Funke Adeyemi",
        email: "g.basera5+funke@gmail.com",
        password: "Broadbacnd@123",
        role: "Nurse",
        purpose: "Test: Different role filtering, Marketplace matches, Compliance uploads"
      }
    ],
    clients: [
      {
        name: "Sarah Thompson",
        email: "g.basera5+sarah@gmail.com",
        password: "Broadbacnd@123",
        care_home: "Castle Bank Residential Home",
        purpose: "Test: View assigned staff, Approve timesheets, View invoices"
      },
      {
        name: "Michael Davies",
        email: "g.basera5+michael@gmail.com",
        password: "Broadbacnd@123",
        care_home: "Divine Care Centre",
        purpose: "Test: Request shifts, Rate staff, View shift status"
      }
    ],
    admins: [
      {
        name: "Grace Basera",
        email: "g.basera5+admin@gmail.com",
        password: "Broadbacnd@123",
        role: "Agency Admin",
        purpose: "Test: ALL admin functions (create shifts, approve, assign, invoice, etc.)"
      },
      {
        name: "David Johnson",
        email: "g.basera5+david@gmail.com",
        password: "Broadbacnd@123",
        role: "Operations Manager",
        purpose: "Test: Limited admin permissions (cannot change agency settings)"
      }
    ]
  };

  const testingScenarios = [
    {
      id: 1,
      category: "ADMIN: Shift Creation & Assignment",
      priority: "CRITICAL",
      icon: Zap,
      color: "red",
      tests: [
        {
          step: "Login as Admin (g.basera5+admin@gmail.com)",
          action: "Navigate to: Operations → Shifts → Create Shift",
          expected: "See form with all fields (Client, Role, Date, Time, Rates)",
          passIf: "Form loads, all dropdowns populated",
          screenshot: "✅ Take screenshot of form"
        },
        {
          step: "Fill in shift details",
          action: "Select: Client = Castle Bank, Role = Care Worker, Date = Tomorrow, 08:00-20:00",
          expected: "Rates auto-fill from contract (pay: £14.75, charge: £19.18)",
          passIf: "Rates appear automatically, can submit",
          screenshot: "✅ Take screenshot of auto-filled rates"
        },
        {
          step: "Create shift",
          action: "Click 'Create Shift'",
          expected: "Success message, redirected to Shifts page, new shift visible",
          passIf: "Shift appears in list with status 'open'",
          screenshot: "✅ Take screenshot of new shift in list"
        },
        {
          step: "Assign staff to shift",
          action: "Click 'Assign Staff' on newly created shift",
          expected: "Modal appears with list of available staff (filtered by role)",
          passIf: "Only Care Workers shown in list",
          screenshot: "✅ Take screenshot of assignment modal"
        },
        {
          step: "Select staff and confirm",
          action: "Select 'Ebuka Okonkwo' → Click 'Assign'",
          expected: "Shift status changes to 'assigned', confirmation message",
          passIf: "Status badge updates, Ebuka's name appears",
          screenshot: "✅ Take screenshot of assigned shift"
        },
        {
          step: "Check email notification",
          action: "Open Gmail → Check g.basera5+ebuka@gmail.com inbox",
          expected: "Email received: 'Shift Assigned - Castle Bank on [date]'",
          passIf: "Email arrived within 2 minutes, contains shift details",
          screenshot: "✅ Take screenshot of email"
        }
      ]
    },
    {
      id: 2,
      category: "SUPER ADMIN: Uninvited User Signup & Approval",
      priority: "HIGH",
      icon: UserPlus,
      color: "purple",
      tests: [
        {
          step: "Create uninvited user signup",
          action: "Open incognito window → Navigate to login page → Click 'Sign Up'",
          expected: "Signup form appears with 4 fields: First Name, Last Name, Email, Password",
          passIf: "Form is clean and simple (no role selection, no agency dropdown)",
          screenshot: "✅ Take screenshot of signup form"
        },
        {
          step: "Complete signup",
          action: "Fill in: First='Test', Last='Uninvited', Email='test.uninvited.3@example.com', Password='Test123!'",
          expected: "Account created, redirected to profile setup page with 'Account Under Review' banner",
          passIf: "Yellow banner visible: 'Your account is awaiting approval from an agency administrator'",
          screenshot: "✅ Take screenshot of pending account view"
        },
        {
          step: "Verify workflow created",
          action: "Login as super admin (g.basera@yahoo.com) → Navigate to Admin Workflows",
          expected: "New workflow appears: 'New User Signup: Test Uninvited'",
          passIf: "Workflow status is 'pending', shows user email and name",
          screenshot: "✅ Take screenshot of workflow in list"
        },
        {
          step: "Click Approve button",
          action: "Click green 'Approve' button on the workflow",
          expected: "Modal opens showing user details (email, name) with agency and role dropdowns",
          passIf: "Modal displays correctly with all fields",
          screenshot: "✅ Take screenshot of approval modal"
        },
        {
          step: "Select agency and role",
          action: "Select Agency: 'Agile Care Group', Role: 'Staff Member', Notes: 'Test approval'",
          expected: "Dropdowns populate correctly, all agencies visible",
          passIf: "Can select agency and role without errors",
          screenshot: "✅ Take screenshot of filled modal"
        },
        {
          step: "Approve user",
          action: "Click 'Approve User' button",
          expected: "Success toast appears, modal closes, workflow marked as resolved",
          passIf: "Workflow disappears from pending list or status changes to 'resolved'",
          screenshot: "✅ Take screenshot of success message"
        },
        {
          step: "Verify user can access system",
          action: "Login as test.uninvited.3@example.com",
          expected: "User redirected to Staff Portal (no 'Account Under Review' banner)",
          passIf: "Staff Portal loads, user can see shifts/timesheets/compliance tabs",
          screenshot: "✅ Take screenshot of Staff Portal access"
        },
        {
          step: "Verify profile updated",
          action: "Check Supabase Dashboard → profiles table → Find test.uninvited.3@example.com",
          expected: "Profile shows: user_type='staff_member', agency_id='00000000-0000-0000-0000-000000000001'",
          passIf: "Database record updated correctly",
          screenshot: "✅ Take screenshot of database record"
        }
      ]
    },
    {
      id: 3,
      category: "ADMIN: Shift Cancellation (Critical Change)",
      priority: "CRITICAL",
      icon: AlertTriangle,
      color: "orange",
      tests: [
        {
          step: "Navigate to assigned shift",
          action: "Operations → Shifts → Find shift assigned to Ebuka",
          expected: "See shift with status 'assigned'",
          passIf: "Shift visible with correct status",
          screenshot: "✅ Before cancellation"
        },
        {
          step: "Cancel shift",
          action: "Click '...' menu → 'Cancel Shift'",
          expected: "⚠️ TWO-STEP CONFIRMATION: 'Are you sure?' + Reason dropdown",
          passIf: "Confirmation dialog appears with reason field",
          screenshot: "✅ Take screenshot of confirmation dialog"
        },
        {
          step: "Provide reason and confirm",
          action: "Select reason: 'Client cancelled' → Type notes → Confirm",
          expected: "Shift status changes to 'cancelled', success message",
          passIf: "Status updates immediately",
          screenshot: "✅ After cancellation"
        },
        {
          step: "Check security email to staff",
          action: "Open g.basera5+ebuka@gmail.com inbox",
          expected: "Email: '⚠️ SHIFT CANCELLED - If you didn't request this, contact agency'",
          passIf: "Email received within 60 seconds, contains warning",
          screenshot: "✅ Take screenshot of security email"
        },
        {
          step: "Verify audit trail",
          action: "Dashboard → Data → ChangeLog entity",
          expected: "Record logged: change_type='shift_cancelled', reason, who made change",
          passIf: "ChangeLog entry exists with all details",
          screenshot: "✅ Take screenshot of audit log"
        }
      ]
    },
    {
      id: 3,
      category: "STAFF: Shift Marketplace & Acceptance",
      priority: "CRITICAL",
      icon: Users,
      color: "blue",
      tests: [
        {
          step: "Login as Staff (g.basera5+chidi@gmail.com)",
          action: "Navigate to: Shift Marketplace",
          expected: "See list of available shifts matching role + availability",
          passIf: "Only Care Worker shifts shown (not Nurse shifts)",
          screenshot: "✅ Marketplace view"
        },
        {
          step: "Admin adds shift to marketplace",
          action: "Login as Admin → Create shift → Toggle 'Show in Marketplace' ON",
          expected: "Admin can manually add any shift to marketplace",
          passIf: "Toggle switch visible, works correctly",
          screenshot: "✅ Marketplace toggle in admin view"
        },
        {
          step: "Staff sees marketplace shift",
          action: "Login back as Chidi → Refresh Shift Marketplace",
          expected: "Newly added shift appears",
          passIf: "Shift visible with 'Apply' button",
          screenshot: "✅ Shift in staff marketplace"
        },
        {
          step: "Accept shift",
          action: "Click 'Accept Shift' → Confirm",
          expected: "Success message, shift disappears from marketplace",
          passIf: "Shift moves to 'My Shifts' tab",
          screenshot: "✅ After acceptance"
        },
        {
          step: "Check confirmation email",
          action: "Check g.basera5+chidi@gmail.com inbox",
          expected: "Email: 'Shift Confirmed - [details]'",
          passIf: "Email received with correct shift info",
          screenshot: "✅ Confirmation email"
        }
      ]
    },
    {
      id: 4,
      category: "STAFF: Clock In/Out with GPS",
      priority: "HIGH",
      icon: Shield,
      color: "green",
      tests: [
        {
          step: "Login as Staff with assigned shift",
          action: "Staff Portal → Today's Shifts → Click 'Clock In'",
          expected: "⚠️ Browser asks for location permission",
          passIf: "Permission prompt appears",
          screenshot: "✅ Permission prompt"
        },
        {
          step: "Grant GPS permission",
          action: "Click 'Allow'",
          expected: "GPS coordinates captured, 'Clocking you in...' message",
          passIf: "Loading indicator appears",
          screenshot: "✅ Clock-in loading"
        },
        {
          step: "Verify geofence validation",
          action: "Wait for success message",
          expected: "✅ 'Clocked in successfully! You're [X]m from site' OR ⚠️ 'Out of bounds'",
          passIf: "Message shows distance, timesheet created",
          screenshot: "✅ Success/warning message"
        },
        {
          step: "Check timesheet created",
          action: "Navigate to: My Timesheets",
          expected: "New timesheet with status='draft', GPS location captured",
          passIf: "Timesheet visible with clock-in time",
          screenshot: "✅ Timesheet entry"
        },
        {
          step: "Clock out",
          action: "At shift end time → Click 'Clock Out'",
          expected: "GPS captured again, total hours calculated",
          passIf: "Timesheet shows clock-out time + total hours",
          screenshot: "✅ After clock-out"
        }
      ]
    },
    {
      id: 5,
      category: "ADMIN: Timesheet Approval",
      priority: "CRITICAL",
      icon: FileText,
      color: "purple",
      tests: [
        {
          step: "Login as Admin",
          action: "Navigate to: Operations → Timesheets",
          expected: "See list of timesheets with status filters",
          passIf: "Timesheets visible, can filter by 'Pending'",
          screenshot: "✅ Timesheets page"
        },
        {
          step: "Review submitted timesheet",
          action: "Click on timesheet with status='submitted'",
          expected: "See full details: GPS map, hours worked, pay amounts",
          passIf: "All data visible, GPS map loads",
          screenshot: "✅ Timesheet detail page"
        },
        {
          step: "Check validation issues",
          action: "Look for red badges/alerts",
          expected: "If hours mismatch OR geofence violation → Warning shown",
          passIf: "Issues clearly highlighted",
          screenshot: "✅ Validation warnings (if any)"
        },
        {
          step: "Approve timesheet",
          action: "Click 'Approve' button",
          expected: "⚠️ TWO-STEP CONFIRMATION if issues present",
          passIf: "Can approve despite warnings (override)",
          screenshot: "✅ Approval confirmation"
        },
        {
          step: "Verify timesheet approved",
          action: "Check status changed to 'approved'",
          expected: "Green badge, timestamp of approval",
          passIf: "Status updated, ready for invoicing",
          screenshot: "✅ Approved timesheet"
        }
      ]
    },
    {
      id: 6,
      category: "ADMIN: Invoice Generation",
      priority: "CRITICAL",
      icon: FileText,
      color: "green",
      tests: [
        {
          step: "Navigate to Invoices",
          action: "Financials → Invoices → 'Generate Invoice'",
          expected: "Form: Select client, date range",
          passIf: "Client dropdown populated",
          screenshot: "✅ Invoice generation form"
        },
        {
          step: "Generate invoice",
          action: "Select: Castle Bank, Last 7 days → Generate",
          expected: "System pulls ONLY approved timesheets for that client",
          passIf: "Invoice shows line items, totals",
          screenshot: "✅ Invoice preview"
        },
        {
          step: "Verify accuracy",
          action: "Check: Each line item matches approved timesheet",
          expected: "Hours, rates, amounts all correct",
          passIf: "Math adds up (hours × rate = amount)",
          screenshot: "✅ Invoice detail"
        },
        {
          step: "Send invoice",
          action: "Click 'Send Invoice' → Email to billing contact",
          expected: "Email sent to client.billing_email (NOT manager email)",
          passIf: "Confirmation message, PDF attached",
          screenshot: "✅ Send confirmation"
        },
        {
          step: "Check email received",
          action: "Open client billing email inbox",
          expected: "Email with PDF attachment, professional formatting",
          passIf: "PDF opens, shows agency branding",
          screenshot: "✅ Invoice email + PDF"
        }
      ]
    },
    {
      id: 7,
      category: "CLIENT: View Assigned Staff & Approve Timesheet",
      priority: "HIGH",
      icon: Building2,
      color: "cyan",
      tests: [
        {
          step: "Login as Client (g.basera5+sarah@gmail.com)",
          action: "Navigate to: Client Portal",
          expected: "See today's shifts, assigned staff",
          passIf: "Dashboard shows relevant shifts only",
          screenshot: "✅ Client portal dashboard"
        },
        {
          step: "View shift details",
          action: "Click on assigned shift",
          expected: "See: Staff name, role, ETA, contact",
          passIf: "⚠️ CANNOT see staff pay rate (privacy)",
          screenshot: "✅ Shift detail (verify pay rate hidden)"
        },
        {
          step: "Approve timesheet",
          action: "Navigate to: Timesheets → Pending Approval",
          expected: "See timesheet for completed shift",
          passIf: "Shows: Hours worked, charge amount (not staff pay)",
          screenshot: "✅ Timesheet approval screen"
        },
        {
          step: "Digital signature",
          action: "Click 'Approve' → Sign digitally",
          expected: "Signature pad or checkbox confirmation",
          passIf: "Can submit approval",
          screenshot: "✅ Signature/confirmation"
        },
        {
          step: "Verify approved",
          action: "Check status changed to 'approved'",
          expected: "Green badge, timestamp",
          passIf: "Admin can now generate invoice",
          screenshot: "✅ Approved status"
        }
      ]
    },
    {
      id: 8,
      category: "ADMIN: Bulk Data Import",
      priority: "HIGH",
      icon: Download,
      color: "indigo",
      tests: [
        {
          step: "Navigate to Bulk Import",
          action: "Management → Bulk Data Import",
          expected: "See import types: Staff, Clients, Shifts, etc.",
          passIf: "All import cards visible",
          screenshot: "✅ Bulk import page"
        },
        {
          step: "Download template",
          action: "Click 'Download Template' for Staff",
          expected: "CSV file downloads with example data",
          passIf: "File opens in Excel, shows required columns",
          screenshot: "✅ CSV template"
        },
        {
          step: "Upload test CSV",
          action: "Upload CSV with 5 test staff",
          expected: "AI validates: Emails, phones, duplicates",
          passIf: "Validation results appear",
          screenshot: "✅ AI validation results"
        },
        {
          step: "Review flagged issues",
          action: "Check: Any errors or warnings",
          expected: "Issues clearly explained (e.g., 'Row 3: Invalid email')",
          passIf: "Can fix issues or proceed anyway",
          screenshot: "✅ Validation errors/warnings"
        },
        {
          step: "Import data",
          action: "Click 'Import X Records'",
          expected: "Progress indicator, success message",
          passIf: "Data appears in Staff page",
          screenshot: "✅ Import success"
        }
      ]
    },
    {
      id: 9,
      category: "ADMIN: Pay Rate Override",
      priority: "HIGH",
      icon: Zap,
      color: "amber",
      tests: [
        {
          step: "Create shift with pay override",
          action: "Create shift → Check 'Override Pay Rate' → Set £18/hr (instead of £14.75)",
          expected: "Reason dropdown appears: urgent_incentive, distance_bonus, etc.",
          passIf: "Must select reason + optional notes",
          screenshot: "✅ Pay override form"
        },
        {
          step: "Assign to staff",
          action: "Assign shift to staff member",
          expected: "System logs override in Shift.pay_rate_override",
          passIf: "Override tracked with reason",
          screenshot: "✅ Assigned with override"
        },
        {
          step: "Check staff notification",
          action: "Check staff email inbox",
          expected: "Email: 'Pay rate adjusted: £14.75 → £18.00. Reason: Urgent incentive'",
          passIf: "Email shows transparency, reason",
          screenshot: "✅ Rate override email"
        },
        {
          step: "Verify in marketplace",
          action: "Login as staff → View marketplace shift",
          expected: "Shift shows override rate (£18/hr) with badge",
          passIf: "Staff sees higher rate, accepts shift",
          screenshot: "✅ Override in marketplace"
        }
      ]
    },
    {
      id: 10,
      category: "EDGE CASES & ERROR HANDLING",
      priority: "MEDIUM",
      icon: AlertTriangle,
      color: "red",
      tests: [
        {
          step: "Double-click prevention",
          action: "Create shift → Click 'Submit' multiple times rapidly",
          expected: "Button disables after first click, prevents duplicates",
          passIf: "Only 1 shift created, not multiple",
          screenshot: "✅ If multiple created = BUG"
        },
        {
          step: "Network error handling",
          action: "Disconnect internet → Try to submit form",
          expected: "Error message: 'Check your connection and try again'",
          passIf: "User-friendly error, not technical jargon",
          screenshot: "✅ Error message"
        },
        {
          step: "Invalid data handling",
          action: "Enter invalid phone number (e.g., '123')",
          expected: "Validation error before submit",
          passIf: "Clear error message: 'Phone must be valid UK number'",
          screenshot: "✅ Validation error"
        },
        {
          step: "Conflicting assignments",
          action: "Try to assign staff to 2 overlapping shifts",
          expected: "Warning: 'Staff already assigned during this time'",
          passIf: "System prevents double-booking",
          screenshot: "✅ Conflict warning"
        },
        {
          step: "Expired session",
          action: "Leave browser open for 30+ mins → Try action",
          expected: "Redirect to login with message: 'Session expired'",
          passIf: "No data loss, can resume after login",
          screenshot: "✅ Session handling"
        }
      ]
    }
  ];

  const toggleTest = (testId) => {
    setCompletedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  const completionRate = (completedTests.size / testingScenarios.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white p-8 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <CheckSquare className="w-12 h-12" />
          <div>
            <h1 className="text-4xl font-bold">UAT Tester Guide</h1>
            <p className="text-purple-100 text-lg mt-2">
              Step-by-step testing instructions for non-technical users
            </p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap mt-4">
          <Badge className="bg-white/20 text-white border-white/30 text-sm">
            {testingScenarios.length} Test Scenarios
          </Badge>
          <Badge className="bg-white/20 text-white border-white/30 text-sm">
            {testAccounts.staff.length + testAccounts.clients.length + testAccounts.admins.length} Test Accounts
          </Badge>
          <Badge className="bg-green-500 text-white text-sm">
            {completionRate.toFixed(0)}% Complete
          </Badge>
        </div>
      </div>

      {/* Important Instructions */}
      <Alert className="border-amber-300 bg-amber-50">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <AlertDescription>
          <div className="text-amber-900">
            <p className="font-semibold mb-2">🎯 Testing Guidelines:</p>
            <ul className="space-y-1 text-sm">
              <li>• <strong>Take screenshots</strong> at each step (use Snipping Tool or Cmd+Shift+4)</li>
              <li>• <strong>Note the time</strong> when you encounter issues</li>
              <li>• <strong>Write down</strong> exact error messages (don't paraphrase)</li>
              <li>• <strong>Test as a real user</strong> - don't skip steps or take shortcuts</li>
              <li>• <strong>Report critical bugs immediately</strong> (system breaks, data loss, security issues)</li>
              <li>• <strong>Batch minor issues</strong> (typos, UI tweaks) - report at end of day</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Progress Tracker */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Testing Progress</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 bg-gray-200 rounded-full h-4">
              <div 
                className="bg-green-600 h-4 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <span className="font-bold text-gray-900">{completionRate.toFixed(0)}%</span>
          </div>
          <p className="text-sm text-gray-600">
            {completedTests.size} of {testingScenarios.length} scenarios completed
          </p>
        </CardContent>
      </Card>

      {/* Test Accounts */}
      <Card>
        <CardHeader className="border-b bg-indigo-50">
          <CardTitle>Test Account Credentials</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <Eye className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              <strong>All emails go to your inbox:</strong> g.basera5+{'{name}'}@gmail.com routes to g.basera5@gmail.com
              <br />You can track which role sent/received each email by the +label
            </AlertDescription>
          </Alert>

          {/* Staff Accounts */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Staff Accounts
            </h4>
            <div className="space-y-3">
              {testAccounts.staff.map((account, idx) => (
                <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{account.name}</p>
                      <p className="text-sm text-gray-600">{account.role}</p>
                    </div>
                    <Badge className="bg-blue-600 text-white">{account.role}</Badge>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2 text-sm mb-2">
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <code className="ml-2 bg-white px-2 py-1 rounded">{account.email}</code>
                    </div>
                    <div>
                      <span className="text-gray-600">Password:</span>
                      <code className="ml-2 bg-white px-2 py-1 rounded">{account.password}</code>
                    </div>
                  </div>
                  <p className="text-xs text-blue-800 italic">{account.purpose}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Client Accounts */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-600" />
              Care Home Manager Accounts
            </h4>
            <div className="space-y-3">
              {testAccounts.clients.map((account, idx) => (
                <div key={idx} className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{account.name}</p>
                      <p className="text-sm text-gray-600">{account.care_home}</p>
                    </div>
                    <Badge className="bg-green-600 text-white">Client</Badge>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2 text-sm mb-2">
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <code className="ml-2 bg-white px-2 py-1 rounded">{account.email}</code>
                    </div>
                    <div>
                      <span className="text-gray-600">Password:</span>
                      <code className="ml-2 bg-white px-2 py-1 rounded">{account.password}</code>
                    </div>
                  </div>
                  <p className="text-xs text-green-800 italic">{account.purpose}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Accounts */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-purple-600" />
              Admin Accounts
            </h4>
            <div className="space-y-3">
              {testAccounts.admins.map((account, idx) => (
                <div key={idx} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{account.name}</p>
                      <p className="text-sm text-gray-600">{account.role}</p>
                    </div>
                    <Badge className="bg-purple-600 text-white">{account.role}</Badge>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2 text-sm mb-2">
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <code className="ml-2 bg-white px-2 py-1 rounded">{account.email}</code>
                    </div>
                    <div>
                      <span className="text-gray-600">Password:</span>
                      <code className="ml-2 bg-white px-2 py-1 rounded">{account.password}</code>
                    </div>
                  </div>
                  <p className="text-xs text-purple-800 italic">{account.purpose}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Testing Scenarios */}
      {testingScenarios.map((scenario) => {
        const Icon = scenario.icon;
        const isCompleted = completedTests.has(scenario.id);

        return (
          <Card key={scenario.id} className="border-2">
            <CardHeader 
              className={`bg-${scenario.color}-50 border-b cursor-pointer`}
              onClick={() => toggleTest(scenario.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isCompleted ? (
                    <CheckSquare className="w-6 h-6 text-green-600" />
                  ) : (
                    <Icon className={`w-6 h-6 text-${scenario.color}-600`} />
                  )}
                  <div>
                    <CardTitle className="text-lg">
                      Scenario {scenario.id}: {scenario.category}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {scenario.tests.length} steps to complete
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={
                    scenario.priority === 'CRITICAL' ? 'bg-red-600 text-white' :
                    scenario.priority === 'HIGH' ? 'bg-orange-500 text-white' :
                    'bg-gray-400 text-white'
                  }>
                    {scenario.priority}
                  </Badge>
                  {isCompleted && (
                    <Badge className="bg-green-600 text-white">✓ Completed</Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="space-y-4">
                {scenario.tests.map((test, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border-l-4 border-l-indigo-500">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 mb-2">{test.step}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-blue-700 min-w-[80px]">Action:</span>
                            <span className="text-gray-700">{test.action}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-green-700 min-w-[80px]">Expected:</span>
                            <span className="text-gray-700">{test.expected}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-purple-700 min-w-[80px]">Pass if:</span>
                            <span className="text-gray-700">{test.passIf}</span>
                          </div>
                          {test.screenshot && (
                            <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded">
                              <Camera className="w-4 h-4 text-amber-700" />
                              <span className="text-xs text-amber-900 font-semibold">{test.screenshot}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-semibold mb-2">✓ After completing this scenario:</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Check the box above to mark as complete</li>
                  <li>• Save all screenshots to a folder named "Scenario_{scenario.id}"</li>
                  <li>• Note any issues in a document (or voice recording)</li>
                  <li>• If critical bug: Contact immediately. If minor: Continue testing</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Bug Reporting Template */}
      <Card>
        <CardHeader className="bg-red-50 border-b">
          <CardTitle className="text-red-900">🐛 Bug Reporting Template</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-white p-4 border-2 border-gray-300 rounded font-mono text-sm">
            <p className="font-bold mb-2">Copy this template for each bug:</p>
            <pre className="whitespace-pre-wrap text-xs">
{`BUG REPORT #[Number]
Severity: [ ] CRITICAL (breaks system) [ ] HIGH (major issue) [ ] MEDIUM (minor bug) [ ] LOW (cosmetic)
Date/Time: [When you found it]
Scenario: [Which scenario were you testing?]
User Role: [Admin/Staff/Client]
Logged in as: [Email address]

STEPS TO REPRODUCE:
1. [First step]
2. [Second step]
3. [Third step]

EXPECTED RESULT:
[What should have happened]

ACTUAL RESULT:
[What actually happened]

SCREENSHOTS:
[Attached: screenshot_1.png, screenshot_2.png]

ERROR MESSAGE (if any):
[Exact text of error - copy/paste]

ADDITIONAL NOTES:
[Any other relevant info]`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}