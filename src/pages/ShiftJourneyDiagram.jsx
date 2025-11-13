import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ShiftJourneyDiagram() {
  const mermaidCode = `
graph TD
    Start([🏥 Care Home Email Request]) --> EmailReceived[📧 Webhook Receives Email]
    
    EmailReceived --> ParseEmail{🤖 AI Parses Email<br/>High/Medium/Low Confidence}
    
    ParseEmail -->|High Confidence| ShiftCreated[✅ Shift Created<br/>Status: OPEN]
    ParseEmail -->|Medium Confidence| ShiftCreatedWithWorkflow[✅ Shift Created + ⚠️ Admin Review<br/>Status: OPEN]
    ParseEmail -->|Low Confidence| WorkflowOnly[⚠️ AdminWorkflow Created<br/>Admin Must Create Manually]
    
    WorkflowOnly --> AdminReview{Admin Reviews}
    AdminReview -->|Clarify with Client| EmailClarification[📧 Request More Info]
    AdminReview -->|Create Manually| ShiftCreated
    
    ShiftCreated --> AssignmentChoice{How to Fill Shift?}
    ShiftCreatedWithWorkflow --> AssignmentChoice
    
    AssignmentChoice -->|Direct Assign| DirectAssign[👤 Admin Assigns Staff<br/>Status: ASSIGNED]
    AssignmentChoice -->|Urgent Broadcast| UrgentBroadcast[📢 SMS + WhatsApp to All<br/>Status: OPEN]
    AssignmentChoice -->|Marketplace| Marketplace[🛒 Add to Marketplace<br/>Status: OPEN]
    
    UrgentBroadcast --> StaffResponds{Staff Accepts?}
    Marketplace --> StaffAccepts[Staff Self-Assigns<br/>Status: ASSIGNED]
    
    StaffResponds -->|Yes| DirectAssign
    StaffResponds -->|No Response| UnfilledEscalation[⚠️ Unfilled Shift Escalation<br/>AdminWorkflow Created]
    
    DirectAssign --> ConfirmationChoice{Admin Bypass?}
    StaffAccepts --> ConfirmationChoice
    
    ConfirmationChoice -->|Admin Confirmed| ShiftConfirmed[✅ Status: CONFIRMED<br/>+ Draft Timesheet Created]
    ConfirmationChoice -->|Awaiting Staff| AwaitingConfirmation[⏳ Status: ASSIGNED<br/>Awaiting Confirmation]
    
    AwaitingConfirmation --> StaffConfirms{Staff Confirms?}
    StaffConfirms -->|Yes - App/SMS/WhatsApp| ShiftConfirmed
    StaffConfirms -->|No Response in 24h| FollowUp[📞 Admin Follow-Up]
    
    ShiftConfirmed --> ClientNotification[📧 Client Receives Confirmation<br/>Staff Name + Contact]
    ClientNotification --> Reminder24h{24h Before Shift?}
    
    Reminder24h -->|Yes| Send24hReminder[📧 SMS + WhatsApp + Email<br/>24h Reminder Sent]
    Send24hReminder --> Reminder2h{2h Before Shift?}
    
    Reminder2h -->|Yes| Send2hReminder[📱 SMS + WhatsApp<br/>2h Reminder Sent]
    Send2hReminder --> ShiftDay[📅 Shift Day Arrives]
    
    ShiftDay --> ShiftStarts{Shift Start Time}
    
    ShiftStarts --> StaffClockIn{Staff Clocks In?}
    StaffClockIn -->|Yes - GPS Validated| InProgress[⏱️ Status: IN_PROGRESS<br/>GPS Location Recorded]
    StaffClockIn -->|No Clock In| NoShowCheck[⚠️ No Clock In Detected]
    
    NoShowCheck --> Wait15Min{Wait 15 mins}
    Wait15Min -->|Still No Show| NoShowWorkflow[🚨 AdminWorkflow: No Show<br/>Contact Staff + Client]
    
    InProgress --> ShiftEnds{Shift End Time}
    
    ShiftEnds --> StaffClockOut{Staff Clocks Out?}
    StaffClockOut -->|Yes - GPS Validated| AwaitingAdminClosure[📋 Status: AWAITING_ADMIN_CLOSURE<br/>Timesheet Reminder Sent]
    StaffClockOut -->|No Clock Out| ManualClosureRequired[⚠️ Admin Must Verify Completion]
    
    AwaitingAdminClosure --> TimesheetReminder[📧 WhatsApp + Email<br/>Upload Timesheet Request]
    
    TimesheetReminder --> StaffUploads{Staff Uploads Timesheet?}
    
    StaffUploads -->|Yes - Photo/PDF| AIProcessing[🤖 AI OCR + Extraction<br/>Hours, Signatures, Location]
    StaffUploads -->|No Upload in 24h| AdminRequestsTimesheet[📞 Admin Requests Timesheet]
    
    AIProcessing --> ConfidenceCheck{AI Confidence Score}
    
    ConfidenceCheck -->|High 80%+| AutoApproved[✅ Auto-Approved<br/>Status: APPROVED]
    ConfidenceCheck -->|Medium 60-79%| AdminReviewTimesheet[👀 Admin Reviews Discrepancies]
    ConfidenceCheck -->|Low <60%| ManualApproval[👨‍💼 Manual Admin Approval Required]
    
    AdminReviewTimesheet --> ApprovalDecision{Admin Decision}
    ManualApproval --> ApprovalDecision
    
    ApprovalDecision -->|Approve| AdminApproved[✅ Status: APPROVED]
    ApprovalDecision -->|Reject| TimesheetRejected[❌ Rejected + Reason<br/>Staff Resubmits]
    
    TimesheetRejected --> StaffResubmits[Staff Corrects & Resubmits]
    StaffResubmits --> AIProcessing
    
    AutoApproved --> AdminMarkComplete[Admin Confirms Completion<br/>Status: COMPLETED]
    AdminApproved --> AdminMarkComplete
    
    AdminMarkComplete --> FinancialLock[🔒 Financial Lock Applied<br/>Rates + Hours Frozen]
    
    FinancialLock --> InvoiceGeneration{Invoice Generation}
    
    InvoiceGeneration -->|Auto-Generate| InvoiceCreated[💰 Invoice Created<br/>Includes Work Location]
    InvoiceGeneration -->|Manual| AdminCreatesInvoice[👨‍💼 Admin Creates Invoice]
    
    InvoiceCreated --> InvoiceSent[📧 Invoice Emailed to Client<br/>Status: SENT]
    AdminCreatesInvoice --> InvoiceSent
    
    InvoiceSent --> ClientPayment{Client Pays?}
    
    ClientPayment -->|Paid in 30 Days| InvoicePaid[✅ Status: PAID]
    ClientPayment -->|Overdue| PaymentReminder[📧 Payment Reminder Sent]
    ClientPayment -->|Disputes Hours/Location| InvoiceDispute[⚠️ Dispute Resolution<br/>Shift Journey Log Used as Proof]
    
    PaymentReminder --> ClientPayment
    
    InvoiceDispute --> DisputeResolution{Resolution}
    DisputeResolution -->|Resolved - Payment| InvoicePaid
    DisputeResolution -->|Amended Invoice| InvoiceAmendment[📝 Invoice Amendment Created<br/>Version 2]
    
    InvoiceAmendment --> InvoiceSent
    
    InvoicePaid --> PayslipGeneration[💵 Payslip Generation<br/>Monthly/Weekly]
    
    PayslipGeneration --> StaffPaid[✅ Staff Paid<br/>Shift Journey Complete ✓]
    
    ShiftConfirmed -.->|Cancellation Before Start| CancellationPath[❌ Cancellation Flow]
    InProgress -.->|Cancellation During Shift| CancellationPath
    
    CancellationPath --> CancelledBy{Cancelled By?}
    
    CancelledBy -->|Staff| StaffCancellation[Staff Cancels<br/>Reason Required]
    CancelledBy -->|Client| ClientCancellation[Client Cancels<br/>Reason Required]
    CancelledBy -->|Agency| AgencyCancellation[Agency Cancels<br/>e.g., Compliance Issue]
    
    StaffCancellation --> ReplacementNeeded{Find Replacement?}
    ClientCancellation --> ShiftCancelled[Status: CANCELLED<br/>No Payment]
    AgencyCancellation --> ShiftCancelled
    
    ReplacementNeeded -->|Yes - Urgent| UrgentBroadcast
    ReplacementNeeded -->|No - Cancel Shift| ShiftCancelled
    
    ShiftCancelled --> ChangeLogCreated[📋 ChangeLog Created<br/>Audit Trail]
    ChangeLogCreated --> NotifyParties[📧 Notify Client + Staff]
    
    ManualClosureRequired --> AdminVerifies{Admin Verifies Shift?}
    AdminVerifies -->|Confirmed Worked| AdminMarkComplete
    AdminVerifies -->|No Show Confirmed| NoShowFinal[Status: NO_SHOW<br/>No Payment to Staff]
    AdminVerifies -->|Disputed| DisputedShift[Status: DISPUTED<br/>Investigation Required]
    
    NoShowFinal --> ClientNotifiedNoShow[📧 Client Notified<br/>No Charge]
    DisputedShift --> DisputeInvestigation[🔍 Admin Investigates<br/>GPS + Timesheet + Client Feedback]
    
    DisputeInvestigation --> DisputeResolved{Resolution}
    DisputeResolved -->|Staff Worked| AdminMarkComplete
    DisputeResolved -->|Staff Didn't Work| NoShowFinal
    DisputeResolved -->|Partial Hours| PartialPayment[💰 Adjusted Payment<br/>Amended Invoice]
    
    style Start fill:#06b6d4,stroke:#0284c7,stroke-width:3px,color:#fff
    style ShiftCreated fill:#10b981,stroke:#059669,stroke-width:2px
    style ShiftConfirmed fill:#10b981,stroke:#059669,stroke-width:2px
    style InProgress fill:#f59e0b,stroke:#d97706,stroke-width:2px
    style AdminMarkComplete fill:#10b981,stroke:#059669,stroke-width:2px
    style FinancialLock fill:#dc2626,stroke:#b91c1c,stroke-width:3px,color:#fff
    style InvoicePaid fill:#10b981,stroke:#059669,stroke-width:2px
    style StaffPaid fill:#10b981,stroke:#059669,stroke-width:3px,color:#fff
    style ShiftCancelled fill:#6b7280,stroke:#4b5563,stroke-width:2px
    style NoShowFinal fill:#dc2626,stroke:#b91c1c,stroke-width:2px
    style DisputedShift fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px
    style UnfilledEscalation fill:#dc2626,stroke:#b91c1c,stroke-width:2px
    style WorkflowOnly fill:#f59e0b,stroke:#d97706,stroke-width:2px
  `;

  const handleDownload = () => {
    const blob = new Blob([mermaidCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shift-journey-diagram.mmd';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Complete Shift Journey</h2>
          <p className="text-gray-600 mt-1">
            From care home email request → final payment (or cancellation/dispute)
          </p>
        </div>
        <Button onClick={handleDownload} className="gap-2">
          <Download className="w-4 h-4" />
          Download Mermaid Code
        </Button>
      </div>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Diagram Key</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-cyan-600"></div>
              <span className="text-sm">Start Point</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-600"></div>
              <span className="text-sm">Success States</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-600"></div>
              <span className="text-sm">In Progress / Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-600"></div>
              <span className="text-sm">Critical / Error States</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-600"></div>
              <span className="text-sm">Dispute Resolution</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-600"></div>
              <span className="text-sm">Cancelled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 border-2 border-dashed border-gray-400"></div>
              <span className="text-sm">Cancellation Paths</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="border-blue-300 bg-blue-50">
        <CardContent className="p-6">
          <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            How to View This Diagram
          </h3>
          <ol className="list-decimal pl-6 space-y-2 text-sm text-blue-900">
            <li>
              <strong>Copy the code below</strong> (or download using button above)
            </li>
            <li>
              <strong>Go to:</strong> <a 
                href="https://mermaid.live" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-700"
              >
                https://mermaid.live
              </a>
            </li>
            <li>
              <strong>Paste the code</strong> into the left editor panel
            </li>
            <li>
              <strong>View the interactive diagram</strong> on the right
            </li>
            <li>
              <strong>Export as PNG/SVG</strong> for your Dominion presentation
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Key Decision Points */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🎯 Key Decision Points for Dominion Discussion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-bold text-green-900 mb-2">✅ Automated Workflows</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• AI email parsing (saves 5-10 mins per request)</li>
                <li>• Auto-timesheet creation on confirmation</li>
                <li>• Multi-channel reminders (24h + 2h)</li>
                <li>• AI OCR for timesheet processing</li>
                <li>• Auto-approval for high-confidence timesheets</li>
                <li>• Automatic invoice generation</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-bold text-blue-900 mb-2">🔒 Financial Protection</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Financial lock after timesheet approval</li>
                <li>• Work location tracking (invoice disputes)</li>
                <li>• GPS validation (geofencing)</li>
                <li>• Complete audit trail (shift journey log)</li>
                <li>• Dispute resolution with evidence</li>
                <li>• Invoice amendments with version control</li>
              </ul>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h4 className="font-bold text-orange-900 mb-2">⚠️ Admin Workflows</h4>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• Low-confidence email requests flagged</li>
                <li>• Unfilled urgent shifts escalated</li>
                <li>• No-show detection (15 min after start)</li>
                <li>• Missing timesheet alerts (24h after shift)</li>
                <li>• Overdue payment reminders</li>
                <li>• Dispute investigations</li>
              </ul>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-bold text-red-900 mb-2">🚨 Critical Alerts</h4>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• Staff no-shows (client notified immediately)</li>
                <li>• Unfilled shifts 2h before start</li>
                <li>• Disputed hours/location</li>
                <li>• Compliance document expiry</li>
                <li>• Late timesheet submissions</li>
                <li>• Payment overdue &gt;30 days</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mermaid Code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Mermaid Diagram Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
              <code>{mermaidCode}</code>
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={() => {
                navigator.clipboard.writeText(mermaidCode);
                alert('✅ Copied to clipboard!');
              }}
            >
              Copy Code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card className="border-purple-300 bg-purple-50">
        <CardContent className="p-6">
          <h3 className="font-bold text-purple-900 mb-4">📊 Journey Statistics</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">15+</div>
              <div className="text-sm text-purple-800">Status Transitions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">30+</div>
              <div className="text-sm text-purple-800">Automated Notifications</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">8</div>
              <div className="text-sm text-purple-800">Admin Workflows</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">5</div>
              <div className="text-sm text-purple-800">Communication Channels</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}