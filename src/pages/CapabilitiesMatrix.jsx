import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, Building2, UserCog, Zap, Download, CheckCircle, 
  XCircle, Shield, Calendar, FileText, MapPin, Clock, Mail,
  MessageSquare, Phone, TrendingUp, Bell, CheckSquare2, GitBranch
} from "lucide-react";

export default function CapabilitiesMatrix() {
  const [selectedRole, setSelectedRole] = useState('all');

  // ✅ UPDATED: Complete capabilities based on shift journey diagram
  const capabilities = {
    agency_staff: {
      icon: Users,
      color: "blue",
      label: "Agency Staff (100+ users expected)",
      can_do: [
        // ✅ Core Shift Management
        { feature: "View assigned shifts", available: true, critical: true, phase: "Live" },
        { feature: "Accept/decline shift offers", available: true, critical: true, phase: "Live" },
        { feature: "Self-assign from marketplace", available: true, critical: true, phase: "Live" },
        { feature: "Set availability calendar", available: true, critical: true, phase: "Live" },
        { feature: "Receive shift broadcasts (SMS/WhatsApp)", available: true, critical: true, phase: "Live" },
        
        // ✅ Pre-Shift Activities
        { feature: "Receive 24h reminder (SMS/WhatsApp/Email)", available: true, critical: true, phase: "Live" },
        { feature: "Receive 2h reminder (SMS/WhatsApp)", available: true, critical: true, phase: "Live" },
        { feature: "Confirm shift availability", available: true, critical: true, phase: "Live" },
        { feature: "View shift details (location, client, time)", available: true, critical: true, phase: "Live" },
        { feature: "Contact client (phone number provided)", available: true, critical: false, phase: "Live" },
        
        // ✅ Shift Day Activities
        { feature: "Clock in with GPS validation", available: true, critical: true, phase: "Live" },
        { feature: "Clock out with GPS validation", available: true, critical: true, phase: "Live" },
        { feature: "GPS location tracked during shift", available: true, critical: true, phase: "Live" },
        { feature: "Digital signature (staff + client)", available: true, critical: true, phase: "Live" },
        { feature: "Grant/revoke GPS consent", available: true, critical: true, phase: "Live" },
        
        // ✅ Timesheet & Documentation
        { feature: "Submit timesheets with photos", available: true, critical: true, phase: "Live" },
        { feature: "Upload signed timesheet documents", available: true, critical: true, phase: "Live" },
        { feature: "Receive timesheet upload reminder", available: true, critical: true, phase: "Live" },
        { feature: "View timesheet approval status", available: true, critical: true, phase: "Live" },
        { feature: "Resubmit rejected timesheets", available: true, critical: true, phase: "Live" },
        
        // ✅ Compliance & Documents
        { feature: "Upload compliance documents", available: true, critical: true, phase: "Live" },
        { feature: "Receive compliance expiry reminders (30d/14d/7d)", available: true, critical: true, phase: "Live" },
        { feature: "View compliance status dashboard", available: true, critical: true, phase: "Live" },
        { feature: "Upload professional profile photo", available: true, critical: true, phase: "Live" },
        
        // ✅ Payment & Earnings
        { feature: "View payslips", available: true, critical: true, phase: "Live" },
        { feature: "Download payslips as PDF", available: true, critical: false, phase: "Live" },
        { feature: "View earnings summary (current period)", available: true, critical: false, phase: "Live" },
        { feature: "View shift history", available: true, critical: false, phase: "Live" },
        
        // ✅ Communication
        { feature: "WhatsApp conversational assistant", available: true, critical: false, phase: "Live" },
        { feature: "SMS notifications for urgent shifts", available: true, critical: true, phase: "Live" },
        { feature: "Email shift confirmations", available: true, critical: true, phase: "Live" },
        
        // ✅ Profile & Preferences
        { feature: "Update personal profile", available: true, critical: false, phase: "Live" },
        { feature: "Update bank details", available: true, critical: true, phase: "Live" },
        { feature: "View own performance ratings", available: true, critical: false, phase: "Live" },
        
        // 🚧 Phase 2/3
        { feature: "View client ratings/feedback", available: false, critical: false, phase: "Phase 2" },
        { feature: "Request time off", available: false, critical: false, phase: "Phase 2" },
        { feature: "Swap shifts with colleagues", available: false, critical: false, phase: "Phase 3" }
      ],
      receives_from_system: [
        "📧 Email: Welcome email, Shift assignment, Shift confirmation, 24h reminder, Timesheet reminder, Payslip available, Compliance expiry warning",
        "📱 SMS: Shift confirmed, 24h reminder, 2h reminder, Urgent shift offer, Compliance CRITICAL expiry",
        "💬 WhatsApp: Urgent shift broadcast, Shift confirmations, 24h/2h reminders, Timesheet upload request, Compliance reminders",
        "🔔 Push: Real-time shift offers, Clock-in reminders, Timesheet approval status"
      ]
    },
    care_home_managers: {
      icon: Building2,
      color: "green",
      label: "Care Home Managers (Client-side users)",
      can_do: [
        // ✅ Shift Request Initiation
        { feature: "Email shift requests (AI auto-parses)", available: true, critical: true, phase: "Live" },
        { feature: "Request single shifts", available: true, critical: true, phase: "Live" },
        { feature: "Request multiple shifts in one email", available: true, critical: true, phase: "Live" },
        { feature: "Request emergency cover", available: true, critical: true, phase: "Live" },
        { feature: "Specify work location within site", available: true, critical: true, phase: "Live" },
        
        // ✅ Shift Monitoring
        { feature: "Receive staff assignment notification", available: true, critical: true, phase: "Live" },
        { feature: "Receive staff contact details", available: true, critical: true, phase: "Live" },
        { feature: "View live shift status", available: true, critical: true, phase: "Live" },
        { feature: "Confirm shift via email reply", available: true, critical: true, phase: "Live" },
        
        // ✅ On-Site Activities
        { feature: "Verify staff GPS location (on-site)", available: true, critical: true, phase: "Live" },
        { feature: "Provide digital signature (client side)", available: true, critical: true, phase: "Live" },
        { feature: "Configure geofence radius", available: true, critical: true, phase: "Live" },
        { feature: "Pre-approved room/unit locations", available: true, critical: true, phase: "Live" },
        
        // ✅ Timesheet & Documentation
        { feature: "Approve timesheets with signature", available: true, critical: true, phase: "Live" },
        { feature: "Dispute hours worked", available: true, critical: true, phase: "Live" },
        { feature: "Add notes to timesheets", available: true, critical: false, phase: "Live" },
        
        // ✅ Invoicing & Payment
        { feature: "View invoices with work location", available: true, critical: true, phase: "Live" },
        { feature: "Download invoices as PDF", available: true, critical: true, phase: "Live" },
        { feature: "Receive payment reminders", available: true, critical: true, phase: "Live" },
        { feature: "View outstanding balance", available: true, critical: true, phase: "Live" },
        { feature: "Request invoice amendments", available: true, critical: true, phase: "Live" },
        
        // ✅ Communication
        { feature: "Receive no-show alerts", available: true, critical: true, phase: "Live" },
        { feature: "Receive staff approaching notification", available: true, critical: false, phase: "Live" },
        { feature: "Receive shift completion summary", available: true, critical: false, phase: "Live" },
        
        // 🚧 Phase 2/3
        { feature: "Portal login (full dashboard)", available: false, critical: false, phase: "Phase 2" },
        { feature: "Rate staff performance", available: false, critical: false, phase: "Phase 2" },
        { feature: "Set preferred staff list", available: false, critical: false, phase: "Phase 2" },
        { feature: "View shift history", available: false, critical: false, phase: "Phase 2" },
        { feature: "Bulk recurring shift requests", available: false, critical: false, phase: "Phase 3" }
      ],
      receives_from_system: [
        "📧 Email: Shift request confirmation, Staff assigned notification, Shift completed summary, Invoice generated, Payment reminder, Amendment confirmation",
        "📱 SMS: Emergency shift filled, Staff no-show alert, Urgent shift updates",
        "💬 WhatsApp: Shift status updates, Staff on-site confirmation (optional)",
        "🔔 Push: Real-time shift status changes (if portal access enabled)"
      ]
    },
    agency_admins: {
      icon: UserCog,
      color: "purple",
      label: "Agency Admins/Managers (3-5 users)",
      can_do: [
        // ✅ Request Processing
        { feature: "View AI-parsed email requests", available: true, critical: true, phase: "Live" },
        { feature: "Approve auto-created shifts", available: true, critical: true, phase: "Live" },
        { feature: "Review low-confidence requests", available: true, critical: true, phase: "Live" },
        { feature: "Manually create shifts", available: true, critical: true, phase: "Live" },
        { feature: "Bulk create shifts via CSV", available: true, critical: true, phase: "Live" },
        
        // ✅ Shift Assignment
        { feature: "Direct assign staff to shifts", available: true, critical: true, phase: "Live" },
        { feature: "Broadcast urgent shifts (SMS/WhatsApp)", available: true, critical: true, phase: "Live" },
        { feature: "Add shifts to marketplace", available: true, critical: true, phase: "Live" },
        { feature: "Admin bypass (instant confirmation)", available: true, critical: true, phase: "Live" },
        { feature: "Override staff confirmation requirement", available: true, critical: true, phase: "Live" },
        
        // ✅ Staff Management
        { feature: "Add/edit staff profiles", available: true, critical: true, phase: "Live" },
        { feature: "Invite staff (send onboarding link)", available: true, critical: true, phase: "Live" },
        { feature: "Track staff GPS consent status", available: true, critical: true, phase: "Live" },
        { feature: "View staff availability", available: true, critical: true, phase: "Live" },
        { feature: "Upload staff documents (bulk)", available: true, critical: true, phase: "Live" },
        { feature: "Verify compliance documents", available: true, critical: true, phase: "Live" },
        { feature: "Generate staff profiles (AI)", available: true, critical: false, phase: "Live" },
        
        // ✅ Client/Care Home Management
        { feature: "Add/edit clients", available: true, critical: true, phase: "Live" },
        { feature: "Configure client GPS location", available: true, critical: true, phase: "Live" },
        { feature: "Set client rate cards (simple/advanced)", available: true, critical: true, phase: "Live" },
        { feature: "Configure work location requirements", available: true, critical: true, phase: "Live" },
        { feature: "Manage client internal locations", available: true, critical: true, phase: "Live" },
        { feature: "Track contract status", available: true, critical: true, phase: "Live" },
        
        // ✅ Shift Monitoring
        { feature: "View live shift map (GPS tracking)", available: true, critical: true, phase: "Live" },
        { feature: "Monitor shift status transitions", available: true, critical: true, phase: "Live" },
        { feature: "View shift journey log (audit trail)", available: true, critical: true, phase: "Live" },
        { feature: "Detect no-shows (15 min alert)", available: true, critical: true, phase: "Live" },
        { feature: "Manually mark shifts completed", available: true, critical: true, phase: "Live" },
        { feature: "Override geofence violations", available: true, critical: true, phase: "Live" },
        
        // ✅ Timesheet Processing
        { feature: "View uploaded timesheet documents", available: true, critical: true, phase: "Live" },
        { feature: "AI OCR extraction confidence scores", available: true, critical: true, phase: "Live" },
        { feature: "Auto-approve high-confidence timesheets", available: true, critical: true, phase: "Live" },
        { feature: "Manual review for discrepancies", available: true, critical: true, phase: "Live" },
        { feature: "Approve/reject timesheets", available: true, critical: true, phase: "Live" },
        { feature: "Financial lock after approval", available: true, critical: true, phase: "Live" },
        { feature: "Request timesheet via WhatsApp/Email", available: true, critical: true, phase: "Live" },
        
        // ✅ Invoicing & Payment
        { feature: "Generate invoices (manual/auto)", available: true, critical: true, phase: "Live" },
        { feature: "Send invoices via email", available: true, critical: true, phase: "Live" },
        { feature: "Create invoice amendments", available: true, critical: true, phase: "Live" },
        { feature: "Track invoice status (sent/paid)", available: true, critical: true, phase: "Live" },
        { feature: "Send payment reminders", available: true, critical: true, phase: "Live" },
        { feature: "Dispute resolution with evidence", available: true, critical: true, phase: "Live" },
        
        // ✅ Payroll Processing
        { feature: "Generate payslips", available: true, critical: true, phase: "Live" },
        { feature: "View staff earnings summary", available: true, critical: true, phase: "Live" },
        { feature: "Export payroll data (CSV)", available: true, critical: false, phase: "Live" },
        
        // ✅ Admin Workflows
        { feature: "View admin workflow queue", available: true, critical: true, phase: "Live" },
        { feature: "Resolve workflow tasks", available: true, critical: true, phase: "Live" },
        { feature: "Priority escalation system", available: true, critical: true, phase: "Live" },
        { feature: "Automated workflow creation", available: true, critical: true, phase: "Live" },
        
        // ✅ Analytics & Reporting
        { feature: "View performance analytics", available: true, critical: true, phase: "Live" },
        { feature: "View timesheet analytics", available: true, critical: true, phase: "Live" },
        { feature: "Track operational costs", available: true, critical: true, phase: "Live" },
        { feature: "CFO financial dashboard", available: true, critical: true, phase: "Live" },
        { feature: "Export reports (PDF/CSV)", available: true, critical: false, phase: "Live" },
        
        // ✅ Agency Configuration
        { feature: "Configure agency settings", available: true, critical: true, phase: "Live" },
        { feature: "Upload agency logo/branding", available: true, critical: false, phase: "Live" },
        { feature: "Configure notification preferences", available: true, critical: true, phase: "Live" },
        { feature: "Configure automation rules", available: true, critical: true, phase: "Live" },
        { feature: "Configure pay cycles (weekly/monthly)", available: true, critical: true, phase: "Live" },
        
        // ✅ Communication
        { feature: "Send targeted emails/SMS to staff", available: true, critical: false, phase: "Live" },
        { feature: "Broadcast urgent alerts", available: true, critical: true, phase: "Live" },
        
        // 🚧 Phase 2/3
        { feature: "WhatsApp bot configuration", available: false, critical: false, phase: "Phase 2" },
        { feature: "Custom report builder", available: false, critical: false, phase: "Phase 3" },
        { feature: "Multi-agency management", available: false, critical: false, phase: "Phase 3" }
      ],
      receives_from_system: [
        "📧 Email: Daily digest, Unfilled shift alerts, Compliance expiry warnings, System health reports, Dispute notifications",
        "⚠️ Admin Workflows: Urgent shift unfilled, Document verification needed, Timesheet discrepancy, No-show detected, Payment overdue, Low-confidence email request",
        "🔔 Push: Real-time shift status changes, Staff clock-in notifications, Critical system alerts",
        "📊 Reports: Weekly performance summary, Monthly financial report, Compliance status updates"
      ]
    },
    acg_automation: {
      icon: Zap,
      color: "orange",
      label: "ACG Automation (AI Agents & Workflows)",
      can_do: [
        // ✅ Request Processing
        { feature: "Parse email shift requests (NLP → structured data)", available: true, critical: true, phase: "Live" },
        { feature: "AI confidence scoring (high/medium/low)", available: true, critical: true, phase: "Live" },
        { feature: "Auto-create shifts (high confidence)", available: true, critical: true, phase: "Live" },
        { feature: "Create admin workflow (low confidence)", available: true, critical: true, phase: "Live" },
        { feature: "Send clarification email to client", available: true, critical: true, phase: "Live" },
        
        // ✅ Shift Assignment
        { feature: "Match staff to shifts (AI)", available: true, critical: true, phase: "Live" },
        { feature: "Send shift notifications (batched)", available: true, critical: true, phase: "Live" },
        { feature: "Queue notifications (5-min batching)", available: true, critical: true, phase: "Live" },
        
        // ✅ Pre-Shift Activities
        { feature: "Send 24h reminders (Email/SMS/WhatsApp)", available: true, critical: true, phase: "Live" },
        { feature: "Send 2h reminders (SMS/WhatsApp)", available: true, critical: true, phase: "Live" },
        { feature: "Schedule reminder engine (cron)", available: true, critical: true, phase: "Live" },
        
        // ✅ Shift Monitoring
        { feature: "Detect no-shows (shift start + 15min)", available: true, critical: true, phase: "Live" },
        { feature: "Create no-show admin workflow", available: true, critical: true, phase: "Live" },
        { feature: "Monitor shift status transitions", available: true, critical: true, phase: "Live" },
        { feature: "Track shift journey log", available: true, critical: true, phase: "Live" },
        
        // ✅ Timesheet Processing
        { feature: "Auto-create draft timesheets on confirmation", available: true, critical: true, phase: "Live" },
        { feature: "Send timesheet upload reminder (post-shift)", available: true, critical: true, phase: "Live" },
        { feature: "AI OCR extraction from documents", available: true, critical: true, phase: "Live" },
        { feature: "Intelligent timesheet validator", available: true, critical: true, phase: "Live" },
        { feature: "Auto-approve compliant timesheets (80%+ confidence)", available: true, critical: true, phase: "Live" },
        { feature: "Flag discrepancies for admin review", available: true, critical: true, phase: "Live" },
        
        // ✅ GPS & Geofencing
        { feature: "Validate GPS coordinates", available: true, critical: true, phase: "Live" },
        { feature: "Calculate distance from geofence", available: true, critical: true, phase: "Live" },
        { feature: "Create workflow for geofence violations", available: true, critical: true, phase: "Live" },
        
        // ✅ Invoicing & Payment
        { feature: "Auto-generate invoices (weekly/monthly)", available: true, critical: true, phase: "Live" },
        { feature: "Send invoices via email (with PDF)", available: true, critical: true, phase: "Live" },
        { feature: "Send payment reminders (progressive)", available: true, critical: true, phase: "Live" },
        { feature: "Track invoice status", available: true, critical: true, phase: "Live" },
        
        // ✅ Compliance Monitoring
        { feature: "Send compliance expiry reminders (30d/14d/7d)", available: true, critical: true, phase: "Live" },
        { feature: "Create admin workflow for expired docs", available: true, critical: true, phase: "Live" },
        { feature: "Extract document dates via OCR", available: true, critical: true, phase: "Live" },
        
        // ✅ Daily Operations
        { feature: "Daily shift closure engine", available: true, critical: true, phase: "Live" },
        { feature: "Verify shifts >24h old without timesheets", available: true, critical: true, phase: "Live" },
        { feature: "Send staff daily digest", available: true, critical: false, phase: "Live" },
        
        // ✅ Communication
        { feature: "Multi-channel messaging (Email/SMS/WhatsApp)", available: true, critical: true, phase: "Live" },
        { feature: "WhatsApp conversational bot", available: true, critical: false, phase: "Live" },
        
        // ✅ Data Management
        { feature: "Financial lock enforcement", available: true, critical: true, phase: "Live" },
        { feature: "Change log audit trail", available: true, critical: true, phase: "Live" },
        { feature: "Critical change notifications", available: true, critical: true, phase: "Live" },
        
        // 🚧 Phase 2/3
        { feature: "Voice AI (inbound call handling)", available: false, critical: false, phase: "Phase 2" },
        { feature: "Outbound AI calls for urgent shifts", available: false, critical: false, phase: "Phase 3" },
        { feature: "Advanced shift matching (ML)", available: false, critical: false, phase: "Phase 3" }
      ],
      triggers: [
        "📧 Email received at instayfs.co.uk → Parse with AI → Create shift or workflow",
        "✅ Shift confirmed → Create draft timesheet → Send notifications",
        "🔔 24h before shift → Send multi-channel reminder",
        "🔔 2h before shift → Send SMS/WhatsApp reminder",
        "⏰ Shift start time + 15min, no clock-in → Create no-show workflow",
        "🕐 Shift end time → Send timesheet upload reminder",
        "📋 Timesheet uploaded → AI OCR → Confidence scoring → Auto-approve or flag",
        "🔒 Timesheet approved → Financial lock → Enable invoicing",
        "💰 Every Monday 9am → Auto-generate invoices",
        "💰 Invoice overdue 7d → Send payment reminder",
        "📄 Document expires in 30d → Send compliance reminder",
        "🚨 Shift status: awaiting_admin_closure >2h → Create admin workflow",
        "🕐 Daily 9am → Run shift closure engine",
        "📊 Weekly Sunday 8pm → Generate staff weekly digest"
      ]
    }
  };

  const exportCapabilities = () => {
    const rows = [];
    
    Object.entries(capabilities).forEach(([roleKey, roleData]) => {
      roleData.can_do.forEach(capability => {
        rows.push({
          'User Type': roleData.label,
          'Feature': capability.feature,
          'Available': capability.available ? 'Yes' : 'No',
          'Critical': capability.critical ? 'Yes' : 'No',
          'Phase': capability.phase
        });
      });
    });

    const csvContent = [
      ['User Type', 'Feature', 'Available', 'Critical', 'Phase'],
      ...rows.map(r => [r['User Type'], r['Feature'], r['Available'], r['Critical'], r['Phase']])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shift_journey_capabilities_matrix.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-purple-600" />
            Complete Shift Journey Capabilities Matrix
          </h2>
          <p className="text-gray-600 mt-1">
            From email request → payment completion | All user types & automation
          </p>
        </div>
        <Button onClick={exportCapabilities} className="bg-indigo-600 hover:bg-indigo-700">
          <Download className="w-4 h-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      {/* Summary Banner */}
      <Card className="border-2 border-purple-400 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {capabilities.agency_staff.can_do.filter(c => c.available).length}
              </p>
              <p className="text-sm text-gray-600">Staff Features</p>
              <Badge className="mt-2 bg-blue-100 text-blue-800 text-xs">
                {capabilities.agency_staff.can_do.filter(c => c.critical && c.available).length} Critical
              </Badge>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {capabilities.care_home_managers.can_do.filter(c => c.available).length}
              </p>
              <p className="text-sm text-gray-600">Care Home Features</p>
              <Badge className="mt-2 bg-green-100 text-green-800 text-xs">
                {capabilities.care_home_managers.can_do.filter(c => c.critical && c.available).length} Critical
              </Badge>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {capabilities.agency_admins.can_do.filter(c => c.available).length}
              </p>
              <p className="text-sm text-gray-600">Admin Features</p>
              <Badge className="mt-2 bg-purple-100 text-purple-800 text-xs">
                {capabilities.agency_admins.can_do.filter(c => c.critical && c.available).length} Critical
              </Badge>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">
                {capabilities.acg_automation.can_do.filter(c => c.available).length}
              </p>
              <p className="text-sm text-gray-600">Automation Features</p>
              <Badge className="mt-2 bg-orange-100 text-orange-800 text-xs">
                {capabilities.acg_automation.triggers.length} Triggers
              </Badge>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">
                {Object.values(capabilities).reduce((sum, role) => 
                  sum + role.can_do.filter(c => c.available && c.critical).length, 0
                )}
              </p>
              <p className="text-sm text-gray-600">Total Critical</p>
              <Badge className="mt-2 bg-red-100 text-red-800 text-xs">Live Now</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedRole === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedRole('all')}
        >
          All Roles
        </Button>
        {Object.entries(capabilities).map(([key, data]) => (
          <Button
            key={key}
            variant={selectedRole === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedRole(key)}
          >
            {data.label.split('(')[0].trim()}
          </Button>
        ))}
      </div>

      {/* Capabilities Grid */}
      <div className="space-y-6">
        {Object.entries(capabilities)
          .filter(([key]) => selectedRole === 'all' || selectedRole === key)
          .map(([roleKey, roleData]) => {
          const Icon = roleData.icon;
          return (
            <Card key={roleKey}>
              <CardHeader className={`bg-${roleData.color}-50 border-b`}>
                <CardTitle className="flex items-center gap-3">
                  <Icon className={`w-6 h-6 text-${roleData.color}-600`} />
                  {roleData.label}
                  <Badge className="ml-auto bg-white text-gray-800">
                    {roleData.can_do.filter(c => c.available).length} Features Live
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Capabilities List */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">✅ Capabilities</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {roleData.can_do.map((capability, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          {capability.available ? (
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                          <span className={`text-sm flex-1 ${capability.available ? 'text-gray-900' : 'text-gray-400'}`}>
                            {capability.feature}
                          </span>
                          <div className="flex gap-1">
                            {capability.critical && (
                              <Badge className="bg-red-100 text-red-800 text-xs">CRITICAL</Badge>
                            )}
                            {capability.phase && (
                              <Badge variant="outline" className="text-xs">
                                {capability.phase}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* System Communications */}
                  {roleData.receives_from_system && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">📨 Receives from System</h4>
                      <div className="space-y-2">
                        {roleData.receives_from_system.map((comm, idx) => (
                          <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-900">{comm}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Automation Triggers */}
                  {roleData.triggers && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">⚡ Automation Triggers</h4>
                      <div className="space-y-2">
                        {roleData.triggers.map((trigger, idx) => (
                          <div key={idx} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-sm text-orange-900 font-mono">{trigger}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}