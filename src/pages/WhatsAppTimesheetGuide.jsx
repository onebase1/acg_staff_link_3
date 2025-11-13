import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, MessageSquare, CheckCircle, Clock, DollarSign, FileText, AlertTriangle } from "lucide-react";

/**
 * WhatsApp Timesheet Submission - Staff Guide
 * 
 * Documentation for staff on how to submit timesheets via WhatsApp
 */

export default function WhatsAppTimesheetGuide() {
  const messageExamples = [
    {
      input: "8 hours, 30 min break",
      result: "✅ 8 hours worked, 30 min break recorded",
      scenario: "Standard shift with break"
    },
    {
      input: "8.5 hours no break",
      result: "✅ 8.5 hours worked, no break recorded",
      scenario: "Shift without break"
    },
    {
      input: "Worked 12 hours with 1 hour break",
      result: "✅ 12 hours worked, 60 min break recorded",
      scenario: "Long shift"
    },
    {
      input: "YES",
      result: "✅ Full scheduled hours confirmed, standard 30min break applied",
      scenario: "Simple confirmation"
    },
    {
      input: "7 hours 45 min break",
      result: "✅ 7 hours worked, 45 min break recorded",
      scenario: "Non-standard timing"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">📱 WhatsApp Timesheet Submission</h2>
        <p className="text-gray-600 mt-1">
          Complete guide for staff to submit timesheets via WhatsApp
        </p>
      </div>

      {/* Overview */}
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="text-green-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-800">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div>
              <p className="font-semibold">Complete Your Shift</p>
              <p className="text-sm text-gray-700">After your shift ends, you'll receive a WhatsApp message from the system</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              2
            </div>
            <div>
              <p className="font-semibold">Reply with Hours Worked</p>
              <p className="text-sm text-gray-700">Send a simple message like "8 hours, 30 min break" or just "YES" to confirm</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              3
            </div>
            <div>
              <p className="font-semibold">Instant Confirmation</p>
              <p className="text-sm text-gray-700">Get immediate confirmation showing your earnings and next steps</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Setup */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">🔧 Technical Setup (Admin Only)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Required: Twilio WhatsApp Webhook Configuration</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Go to Twilio Console → Messaging → WhatsApp Sandbox Settings</li>
                <li>Copy this function URL: <code className="bg-gray-800 text-white px-2 py-1 rounded">https://[your-project].supabase.co/functions/v1/whatsapp-timesheet-handler</code></li>
                <li>Paste into "WHEN A MESSAGE COMES IN" webhook field</li>
                <li>Method: <strong>HTTP POST</strong></li>
                <li>Click "Save"</li>
              </ol>
            </AlertDescription>
          </Alert>

          <p className="text-gray-700">
            <strong>Test Setup:</strong> Send a WhatsApp to your Twilio number with "8 hours no break". If webhook configured correctly, you'll get an automated response.
          </p>
        </CardContent>
      </Card>

      {/* Message Examples */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-600" />
            Message Examples (Staff Guide)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {messageExamples.map((example, idx) => (
            <div key={idx} className="border-2 border-gray-200 rounded-lg p-4 hover:border-cyan-300 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-gray-700">{example.scenario}</Badge>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg mb-2">
                <p className="text-sm text-gray-600 mb-1">You send:</p>
                <p className="font-mono text-gray-900 font-medium">"{example.input}"</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="text-sm text-green-900 font-semibold mb-1">System responds:</p>
                <p className="text-sm text-gray-700">{example.result}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* What Staff See */}
      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-purple-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Example: Full Flow (Staff Experience)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                📱
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">WhatsApp from ACG StaffLink (Today, 20:15)</p>
                <div className="bg-cyan-50 p-3 rounded-lg border border-cyan-200">
                  <p className="text-sm font-medium text-gray-900">
                    Hey John! Complete your timesheet for <strong>Sunrise Care Home</strong>
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    📅 October 31, 2024<br/>
                    🕐 08:00 - 20:00 (12 hours)
                  </p>
                  <p className="text-sm text-gray-700 mt-3">
                    Reply with hours worked (e.g., "8 hours, 30 min break") or just "YES" to confirm full shift.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 mb-3 justify-end">
              <div className="bg-green-100 p-3 rounded-lg border border-green-300 max-w-xs">
                <p className="text-sm font-medium text-gray-900">
                  12 hours, 30 min break
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                👤
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                📱
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">WhatsApp from ACG StaffLink (Today, 20:16)</p>
                <div className="bg-cyan-50 p-3 rounded-lg border border-cyan-200">
                  <p className="text-sm font-medium text-green-700">
                    ✅ <strong>Timesheet Submitted!</strong>
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    📋 Shift: Sunrise Care Home<br/>
                    📅 Date: October 31, 2024<br/>
                    ⏱️ Hours: 12h (30 min break)<br/>
                    💰 You'll earn: <strong className="text-green-700">£177.00</strong>
                  </p>
                  <p className="text-sm text-gray-600 mt-3">
                    Your timesheet is now awaiting client approval. We'll notify you when it's approved!
                  </p>
                  <p className="text-sm text-gray-500 mt-2 italic">
                    Have a great day! 🎉
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card className="border-2 border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Why This is Better Than Manual Forms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Instant (10 seconds)</p>
                <p className="text-gray-700">vs 5 minutes filling out forms</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Smartphone className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">No App Login Required</p>
                <p className="text-gray-700">Just reply to WhatsApp message</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <DollarSign className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Instant Earnings Confirmation</p>
                <p className="text-gray-700">See exactly what you'll be paid</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Auto-Validation</p>
                <p className="text-gray-700">AI checks for errors immediately</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Instructions (Printable) */}
      <Card className="border-2 border-cyan-200">
        <CardHeader className="bg-cyan-50">
          <CardTitle className="text-cyan-900">📄 Staff Instructions (Send to Team)</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3 text-sm">
          <h3 className="font-semibold text-gray-900 text-base">How to Submit Your Timesheet via WhatsApp</h3>
          
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li><strong>After your shift ends</strong>, wait for a WhatsApp message from the ACG StaffLink system</li>
            <li><strong>Reply with your hours worked</strong>, for example:
              <ul className="list-disc list-inside ml-6 mt-1 text-gray-600">
                <li>"8 hours, 30 min break"</li>
                <li>"12 hours no break"</li>
                <li>Or just "YES" if you worked the full scheduled time</li>
              </ul>
            </li>
            <li><strong>Get instant confirmation</strong> showing your earnings</li>
            <li><strong>Done!</strong> Your timesheet is submitted and awaiting approval</li>
          </ol>

          <Alert className="bg-blue-50 border-blue-200 mt-4">
            <AlertDescription className="text-blue-900">
              <p className="font-semibold mb-1">💡 Tip:</p>
              <p className="text-sm">If you don't receive a WhatsApp message after your shift, contact your agency admin. Make sure your phone number is correct in the system.</p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}