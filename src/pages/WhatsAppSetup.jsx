import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle, ExternalLink, MessageCircle, Zap, Shield, Clock } from "lucide-react";
import { toast } from "sonner";

/**
 * 📱 WHATSAPP BOT SETUP GUIDE
 * 
 * Step-by-step instructions for connecting Twilio WhatsApp to your intelligent router
 */

export default function WhatsAppSetup() {
  const [webhookUrl, setWebhookUrl] = useState('Loading...');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Get webhook URL from environment or construct it
    const APP_URL = window.location.origin;
    const url = `${APP_URL}/functions/whatsappMasterRouter`;
    setWebhookUrl(url);
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const testCases = [
    {
      message: "Show my shifts",
      intent: "schedule_query",
      description: "Check upcoming schedule"
    },
    {
      message: "Any shifts available on Friday?",
      intent: "open_shifts_query",
      description: "Find available shifts"
    },
    {
      message: "Accept shift A3B7C9D1",
      intent: "accept_shift",
      description: "Accept a specific shift"
    },
    {
      message: "8 hours, 30 min break",
      intent: "submit_timesheet",
      description: "Submit timesheet"
    },
    {
      message: "Check my profile",
      intent: "check_profile",
      description: "View compliance status"
    },
    {
      message: "I need Friday off",
      intent: "request_time_off",
      description: "Request time off"
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white p-8 rounded-xl">
        <div className="flex items-center gap-4 mb-4">
          <MessageCircle className="w-12 h-12" />
          <div>
            <h1 className="text-3xl font-bold">WhatsApp AI Bot Setup</h1>
            <p className="text-green-100 mt-1">Connect your intelligent conversational assistant</p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-4">
            <Zap className="w-6 h-6 mb-2" />
            <p className="font-semibold">Natural Language</p>
            <p className="text-sm text-green-100">Understands context</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <Shield className="w-6 h-6 mb-2" />
            <p className="font-semibold">Secure & Private</p>
            <p className="text-sm text-green-100">End-to-end encrypted</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <Clock className="w-6 h-6 mb-2" />
            <p className="font-semibold">24/7 Available</p>
            <p className="text-sm text-green-100">Instant responses</p>
          </div>
        </div>
      </div>

      {/* Step 1: Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">1</span>
            Copy Webhook URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-300 bg-blue-50">
            <AlertDescription>
              This is your WhatsApp webhook endpoint. Copy it exactly as shown - you'll need it in Step 2.
            </AlertDescription>
          </Alert>

          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm break-all relative group">
            {webhookUrl}
            <Button
              onClick={() => copyToClipboard(webhookUrl)}
              className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700"
              size="sm"
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Twilio Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">2</span>
            Configure Twilio WhatsApp Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="bg-gray-200 text-gray-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">a</span>
              <div>
                <p className="font-semibold">Go to Twilio Console</p>
                <p className="text-sm text-gray-600 mt-1">
                  Navigate to: <Badge variant="outline">Messaging → Try it out → Send a WhatsApp message</Badge>
                </p>
                <Button
                  className="mt-2"
                  size="sm"
                  variant="outline"
                  onClick={() => window.open('https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Twilio Console
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="bg-gray-200 text-gray-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">b</span>
              <div>
                <p className="font-semibold">Scroll to "Sandbox Configuration"</p>
                <p className="text-sm text-gray-600 mt-1">Find the section labeled "When a message comes in"</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="bg-gray-200 text-gray-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">c</span>
              <div>
                <p className="font-semibold">Paste Webhook URL</p>
                <p className="text-sm text-gray-600 mt-1">
                  Paste your webhook URL (from Step 1) into the text field
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="bg-gray-200 text-gray-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">d</span>
              <div>
                <p className="font-semibold">Set Method to POST</p>
                <p className="text-sm text-gray-600 mt-1">
                  Ensure the HTTP method is set to <Badge>POST</Badge> (not GET)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="bg-gray-200 text-gray-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">e</span>
              <div>
                <p className="font-semibold">Save Configuration</p>
                <p className="text-sm text-gray-600 mt-1">Click "Save" to apply the changes</p>
              </div>
            </div>
          </div>

          <Alert className="border-amber-300 bg-amber-50">
            <AlertDescription className="text-amber-900">
              <strong>Important:</strong> For production use, you'll need to request approval for your WhatsApp Business account from Twilio.
              The sandbox is for testing only and has limitations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Step 3: Test the Bot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">3</span>
            Test Your Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-300 bg-green-50">
            <AlertDescription>
              <strong>Join Sandbox:</strong> Send <Badge className="bg-green-600 text-white">join [code]</Badge> to your Twilio WhatsApp number.
              You'll find your unique code in the Twilio console.
            </AlertDescription>
          </Alert>

          <div>
            <h4 className="font-semibold mb-3">Try These Test Messages:</h4>
            <div className="space-y-2">
              {testCases.map((test, index) => (
                <div key={index} className="bg-gray-50 border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-mono text-sm bg-gray-900 text-green-400 px-3 py-1 rounded inline-block mb-2">
                        "{test.message}"
                      </p>
                      <p className="text-sm text-gray-600">{test.description}</p>
                    </div>
                    <Badge variant="outline" className="ml-2">{test.intent}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>💡 Pro Tip:</strong> The bot understands natural language! You can write messages however feels natural to you.
              For example: "Do I have any shifts this week?" works just as well as "Show my shifts".
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Bot Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle>What Can Your Staff Do?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  📅
                </div>
                <div>
                  <h4 className="font-semibold">Check Schedule</h4>
                  <p className="text-sm text-gray-600">View upcoming shifts, dates, and locations</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  🔍
                </div>
                <div>
                  <h4 className="font-semibold">Find Open Shifts</h4>
                  <p className="text-sm text-gray-600">Browse available shifts and accept instantly</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  ✅
                </div>
                <div>
                  <h4 className="font-semibold">Accept Shifts</h4>
                  <p className="text-sm text-gray-600">One-tap shift acceptance with instant confirmation</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  ⏱️
                </div>
                <div>
                  <h4 className="font-semibold">Submit Timesheets</h4>
                  <p className="text-sm text-gray-600">Quick timesheet submission via message</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  👤
                </div>
                <div>
                  <h4 className="font-semibold">Check Profile</h4>
                  <p className="text-sm text-gray-600">View compliance status and documents</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  🏖️
                </div>
                <div>
                  <h4 className="font-semibold">Request Time Off</h4>
                  <p className="text-sm text-gray-600">Submit availability updates</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  ❌
                </div>
                <div>
                  <h4 className="font-semibold">Cancel Shifts</h4>
                  <p className="text-sm text-gray-600">Request shift cancellations with reason</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  💬
                </div>
                <div>
                  <h4 className="font-semibold">Get Help</h4>
                  <p className="text-sm text-gray-600">24/7 instant assistance and guidance</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Bot Not Responding?</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Check that the webhook URL is correct in Twilio</li>
              <li>Ensure HTTP method is set to POST (not GET)</li>
              <li>Verify you've joined the sandbox with the correct code</li>
              <li>Check function logs in Dashboard → Functions → whatsappMasterRouter</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">"Staff not found" Error?</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Ensure staff phone number matches exactly in database</li>
              <li>Phone format should include country code (e.g., +447123456789)</li>
              <li>Check Staff entity has phone field populated</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Intent Not Recognized?</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>The AI learns from context - try rephrasing</li>
              <li>Use "HELP" command to see example messages</li>
              <li>Check OpenAI API key is configured</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Success Message */}
      <Alert className="border-green-300 bg-green-50">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <AlertDescription className="text-green-900">
          <strong>🎉 Congratulations!</strong> Your WhatsApp AI bot is ready. Staff can now manage their work entirely through WhatsApp - 
          no app downloads, no passwords, just instant messaging.
        </AlertDescription>
      </Alert>
    </div>
  );
}