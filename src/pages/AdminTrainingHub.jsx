
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, CheckCircle, Clock, Users, FileText, TrendingUp,
  Calendar, Mail, MessageSquare, Shield, AlertTriangle, Zap,
  ChevronRight, ChevronDown, DollarSign, Upload, Eye, MapPin
} from "lucide-react";

export default function AdminTrainingHub() {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const trainingModules = [
    {
      id: 'getting-started',
      title: '🚀 Getting Started',
      icon: Zap,
      color: 'text-blue-600',
      lessons: [
        {
          title: 'Dashboard Overview',
          duration: '5 min',
          description: 'Navigate the admin dashboard and understand key metrics'
        },
        {
          title: 'User Roles & Permissions',
          duration: '8 min',
          description: 'Understand agency admin, manager, and staff roles'
        },
        {
          title: 'Approving Uninvited User Signups (Super Admin)',
          duration: '5 min',
          description: 'Review and approve users who sign up without an invitation, assign them to agencies',
          isNew: true
        },
        {
          title: 'Quick Actions Guide',
          duration: '10 min',
          description: 'Master the Quick Actions page for daily workflows'
        }
      ]
    },
    {
      id: 'shift-management',
      title: '📅 Shift Management',
      icon: Calendar,
      color: 'text-green-600',
      lessons: [
        {
          title: 'Creating Shifts',
          duration: '10 min',
          description: 'Create single shifts with proper rates and locations'
        },
        {
          title: 'Bulk Shift Creation',
          duration: '12 min',
          description: 'Upload multiple shifts via CSV for efficiency'
        },
        {
          title: 'Assigning Staff',
          duration: '8 min',
          description: 'Assign staff members and send confirmation notifications'
        },
        {
          title: 'Urgent Shift Broadcasting',
          duration: '10 min',
          description: 'Use SMS + WhatsApp to broadcast urgent shifts to eligible staff'
        },
        {
          title: 'Shift Reminders',
          duration: '7 min',
          description: 'Set up automatic 24h and 2h reminders via SMS + WhatsApp'
        },
        {
          title: 'Marketplace Management',
          duration: '12 min',
          description: 'Enable marketplace visibility for staff to accept shifts'
        },
        {
          title: 'Care Home Email Requests (NEW)',
          duration: '10 min',
          description: 'Receive and process shift requests from care homes via email',
          isNew: true
        }
      ]
    },
    {
      id: 'timesheet-workflows',
      title: '⏱️ Timesheet Workflows',
      icon: Clock,
      color: 'text-purple-600',
      lessons: [
        {
          title: 'Auto Timesheet Creation',
          duration: '6 min',
          description: 'Understand automatic draft timesheets when shifts are confirmed'
        },
        {
          title: 'Manual Timesheet Completion',
          duration: '10 min',
          description: 'Use ShiftCompletionModal to mark shifts as completed with actual times'
        },
        {
          title: 'Post-Shift Reminders',
          duration: '8 min',
          description: 'Automatic WhatsApp + Email reminders sent when shift ends, asking staff to upload timesheet'
        },
        {
          title: 'Staff Timesheet Upload',
          duration: '10 min',
          description: 'Staff upload signed timesheets via Staff Portal → Timesheets page'
        },
        {
          title: 'Document Upload & OCR',
          duration: '12 min',
          description: 'Upload timesheet documents with automatic data extraction'
        },
        {
          title: 'Auto-Approval Engine',
          duration: '10 min',
          description: 'Leverage AI to auto-approve timesheets without discrepancies'
        },
        {
          title: 'Manual Approval Process',
          duration: '8 min',
          description: 'Review flagged timesheets and resolve discrepancies'
        },
        {
          title: 'GPS Verification',
          duration: '10 min',
          description: 'Understand geofencing and location validation'
        }
      ]
    },
    {
      id: 'gps-timesheets',
      title: '📍 GPS Timesheet Management',
      icon: MapPin,
      color: 'text-emerald-600',
      lessons: [
        {
          title: 'How GPS Timesheets Work',
          duration: '10 min',
          description: 'Understand GPS clock-in/out, geofence validation, and automatic timesheet creation',
          isNew: true
        },
        {
          title: 'Viewing GPS Evidence',
          duration: '8 min',
          description: 'Access GPS coordinates, timestamps, device info, and geofence validation data',
          isNew: true
        },
        {
          title: 'Handling GPS Failures',
          duration: '12 min',
          description: 'What to do when staff forgets to clock in/out, phone dies, or geofence fails',
          isNew: true
        },
        {
          title: 'GPS vs Paper Timesheets',
          duration: '8 min',
          description: 'When to use GPS auto-approval vs manual paper timesheet upload',
          isNew: true
        },
        {
          title: 'Overtime & 12-Hour Cap',
          duration: '10 min',
          description: 'How GPS timesheets handle overtime detection and hour capping',
          isNew: true
        },
        {
          title: 'GPS Dispute Resolution',
          duration: '10 min',
          description: 'Generate evidence PDFs with GPS data, verification chain, and device info',
          isNew: true
        }
      ]
    },
    {
      id: 'invoicing',
      title: '💰 Invoicing & Payments',
      icon: DollarSign,
      color: 'text-orange-600',
      lessons: [
        {
          title: 'Auto Invoice Generation',
          duration: '10 min',
          description: 'Generate invoices from approved timesheets'
        },
        {
          title: 'Invoice Amendments',
          duration: '12 min',
          description: 'Handle invoice corrections and credit notes'
        },
        {
          title: 'Sending Invoices',
          duration: '8 min',
          description: 'Email invoices to clients with PDF attachments'
        },
        {
          title: 'Payment Tracking',
          duration: '10 min',
          description: 'Monitor outstanding payments and send reminders'
        }
      ]
    },
    {
      id: 'staff-management',
      title: '👥 Staff Management',
      icon: Users,
      color: 'text-cyan-600',
      lessons: [
        {
          title: 'Inviting Staff',
          duration: '8 min',
          description: 'Send invitation emails for staff onboarding'
        },
        {
          title: 'Compliance Tracking',
          duration: '15 min',
          description: 'Monitor DBS, training, and document expiry dates'
        },
        {
          title: 'Availability Management',
          duration: '10 min',
          description: 'Track staff availability and preferences'
        },
        {
          title: 'Performance Analytics',
          duration: '12 min',
          description: 'Review staff performance metrics and ratings'
        }
      ]
    },
    {
      id: 'communications',
      title: '📧 Communications',
      icon: Mail,
      color: 'text-pink-600',
      lessons: [
        {
          title: 'Email Notifications',
          duration: '10 min',
          description: 'Understand email batching and notification queues'
        },
        {
          title: 'SMS Messaging',
          duration: '8 min',
          description: 'Send SMS for urgent communications'
        },
        {
          title: 'WhatsApp Integration',
          duration: '12 min',
          description: 'Use WhatsApp for instant staff communication'
        },
        {
          title: 'Care Home Inbound Email (NEW)',
          duration: '12 min',
          description: 'Process shift requests and confirmations from care homes via email',
          isNew: true
        }
      ]
    }
  ];

  // 📍 GPS Timesheet Management - Complete Guide
  const gpsTimesheetGuide = {
    title: '📍 GPS Timesheet Management - Complete Guide',
    icon: MapPin,
    color: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    sections: [
      {
        title: '🎯 Overview',
        content: `
          <p class="mb-4">GPS timesheets eliminate manual timesheet uploads by automatically capturing clock-in/out times with location verification.</p>

          <div class="grid md:grid-cols-2 gap-4 mb-4">
            <div class="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 class="font-bold text-green-900 mb-2">✅ GPS Staff (Automatic)</h4>
              <p class="text-sm text-green-800">Staff clocks in/out via app → GPS validates location → Timesheet auto-created → Auto-approved → Shift auto-completed</p>
              <p class="text-xs text-green-700 mt-2"><strong>Admin work: ZERO</strong></p>
            </div>

            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 class="font-bold text-blue-900 mb-2">📋 Non-GPS Staff (Manual)</h4>
              <p class="text-sm text-blue-800">Staff works shift → Uploads paper timesheet → Admin reviews → Admin approves → Shift completed</p>
              <p class="text-xs text-blue-700 mt-2"><strong>Admin work: Review + approve</strong></p>
            </div>
          </div>
        `
      },
      {
        title: '📱 How GPS Timesheets Work',
        content: `
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span class="text-blue-600 font-bold">1</span>
              </div>
              <div>
                <p class="font-semibold">Staff Grants GPS Consent</p>
                <p class="text-sm text-gray-600">One-time consent in Staff Portal → Profile → GPS Consent</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span class="text-purple-600 font-bold">2</span>
              </div>
              <div>
                <p class="font-semibold">Staff Arrives at Client Location</p>
                <p class="text-sm text-gray-600">Staff opens Staff Portal → My Shifts → Clicks "Clock In"</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span class="text-green-600 font-bold">3</span>
              </div>
              <div>
                <p class="font-semibold">GPS Geofence Validation</p>
                <p class="text-sm text-gray-600">System checks if staff is within 100m of client location. If YES → Clock-in successful. If NO → Error message.</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <span class="text-orange-600 font-bold">4</span>
              </div>
              <div>
                <p class="font-semibold">Staff Works Shift</p>
                <p class="text-sm text-gray-600">GPS only captured at clock-in/out. Not tracked continuously. Staff can turn off GPS during shift.</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <span class="text-yellow-600 font-bold">5</span>
              </div>
              <div>
                <p class="font-semibold">Staff Clocks Out</p>
                <p class="text-sm text-gray-600">Staff clicks "Clock Out" → GPS validates location again → Timesheet auto-created with actual times</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                <span class="text-pink-600 font-bold">6</span>
              </div>
              <div>
                <p class="font-semibold">Auto-Approval & Completion</p>
                <p class="text-sm text-gray-600">If GPS validated + hours within tolerance → Timesheet auto-approved → Shift auto-completed → Ready for invoicing</p>
              </div>
            </div>
          </div>
        `
      },
      {
        title: '📊 Viewing GPS Evidence',
        content: `
          <div class="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
            <h4 class="font-bold text-blue-900 mb-3">🔍 Where to Find GPS Data</h4>

            <ol class="list-decimal pl-6 text-sm text-blue-800 space-y-2">
              <li>Go to <strong>Timesheets</strong> page</li>
              <li>Click on any GPS-verified timesheet</li>
              <li>Look for <strong>GPS Verified</strong> badge</li>
              <li>View GPS evidence:
                <ul class="list-disc pl-6 mt-2">
                  <li><strong>Clock-In Time:</strong> Exact timestamp (e.g., 08:07:23)</li>
                  <li><strong>Clock-In Location:</strong> GPS coordinates (e.g., 51.5074° N, 0.1278° W)</li>
                  <li><strong>Geofence Status:</strong> ✅ Verified (45m from client) or ❌ Failed</li>
                  <li><strong>Clock-Out Time:</strong> Exact timestamp (e.g., 19:52:14)</li>
                  <li><strong>Clock-Out Location:</strong> GPS coordinates</li>
                  <li><strong>Actual Times:</strong> Rounded to 30-minute intervals (08:00 - 20:00)</li>
                  <li><strong>Total Hours:</strong> Capped at scheduled duration (12 hours)</li>
                  <li><strong>Overtime:</strong> Flagged if worked beyond scheduled hours</li>
                </ul>
              </li>
            </ol>
          </div>

          <div class="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 class="font-bold text-green-900 mb-3">📄 Generate Evidence PDF</h4>
            <p class="text-sm text-green-800 mb-2">For disputes, generate comprehensive evidence PDF:</p>
            <ol class="list-decimal pl-6 text-sm text-green-800 space-y-2">
              <li>Go to <strong>Dispute Resolution</strong> page</li>
              <li>Find the shift in question</li>
              <li>Click <strong>"Generate Evidence PDF"</strong></li>
              <li>PDF includes:
                <ul class="list-disc pl-6 mt-2">
                  <li>GPS clock-in/out coordinates + timestamps</li>
                  <li>Geofence validation status + distance</li>
                  <li>Device info (browser, OS, IP address)</li>
                  <li>Email verification chain</li>
                  <li>Calculated times (raw hours, capped hours, overtime)</li>
                  <li>Timesheet signatures</li>
                </ul>
              </li>
            </ol>
          </div>
        `
      },
      {
        title: '⚠️ Handling GPS Failures',
        content: `
          <div class="space-y-3">
            <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p class="font-bold text-yellow-900 mb-2">❌ "Staff Forgot to Clock In"</p>
              <p class="text-sm text-yellow-800"><strong>What Happens:</strong> No GPS data captured at start of shift</p>
              <p class="text-sm text-yellow-800 mt-2"><strong>Solution:</strong></p>
              <ol class="list-decimal pl-6 text-sm text-yellow-800 mt-1">
                <li>Staff contacts admin immediately</li>
                <li>Admin goes to <strong>Timesheets</strong> page</li>
                <li>Manually enter actual start time</li>
                <li>Mark timesheet as <strong>"Incomplete - Forgot to clock in"</strong></li>
                <li>Request paper timesheet as backup evidence</li>
              </ol>
            </div>

            <div class="bg-red-50 p-3 rounded-lg border border-red-200">
              <p class="font-bold text-red-900 mb-2">🔋 "Phone Battery Died During Shift"</p>
              <p class="text-sm text-red-800"><strong>What Happens:</strong> Staff clocked in successfully, but phone died before clock-out</p>
              <p class="text-sm text-red-800 mt-2"><strong>Solution:</strong></p>
              <ol class="list-decimal pl-6 text-sm text-red-800 mt-1">
                <li>Staff charges phone and clocks out as soon as possible</li>
                <li>If too late, staff contacts admin with estimated end time</li>
                <li>Admin manually completes timesheet with estimated time</li>
                <li>Admin marks as <strong>"Incomplete - Phone died"</strong></li>
                <li>Request paper timesheet as backup evidence</li>
              </ol>
            </div>

            <div class="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <p class="font-bold text-orange-900 mb-2">📵 "Care Home Requires Phones Off"</p>
              <p class="text-sm text-orange-800"><strong>What Happens:</strong> Care home policy prohibits phones on ward</p>
              <p class="text-sm text-orange-800 mt-2"><strong>Solution:</strong></p>
              <ol class="list-decimal pl-6 text-sm text-orange-800 mt-1">
                <li>Staff clocks in at care home entrance (before entering ward)</li>
                <li>Staff turns off phone and works shift</li>
                <li>Staff clocks out at care home entrance (after leaving ward)</li>
                <li>GPS validates location at entrance (still within 100m geofence)</li>
                <li>Timesheet auto-created successfully ✅</li>
              </ol>
            </div>

            <div class="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <p class="font-bold text-purple-900 mb-2">❌ "Geofence Validation Failed"</p>
              <p class="text-sm text-purple-800"><strong>What Happens:</strong> Staff is more than 100m from client location</p>
              <p class="text-sm text-purple-800 mt-2"><strong>Solution:</strong></p>
              <ol class="list-decimal pl-6 text-sm text-purple-800 mt-1">
                <li>Check if client address is correct in system</li>
                <li>Check if staff is at correct location</li>
                <li>If address wrong: Update client address, ask staff to clock in again</li>
                <li>If GPS inaccurate: Allow manual override, request paper timesheet</li>
              </ol>
            </div>
          </div>
        `
      },
      {
        title: '⏱️ 12-Hour Cap & Overtime',
        content: `
          <div class="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
            <h4 class="font-bold text-blue-900 mb-3">🎯 How Hour Capping Works</h4>

            <p class="text-sm text-blue-800 mb-3">GPS timesheets automatically cap total hours at the scheduled shift duration (typically 12 hours).</p>

            <div class="bg-white p-3 rounded border border-blue-200 mb-3">
              <p class="font-semibold text-blue-900 mb-2">Example Scenario:</p>
              <ul class="list-disc pl-6 text-sm text-blue-800 space-y-1">
                <li><strong>Scheduled:</strong> 08:00 - 20:00 (12 hours)</li>
                <li><strong>Actual Clock-In:</strong> 07:52:14 → Rounded to 08:00</li>
                <li><strong>Actual Clock-Out:</strong> 20:37:45 → Rounded to 20:30</li>
                <li><strong>Raw Hours Worked:</strong> 12.5 hours</li>
                <li><strong>Billable Hours (Capped):</strong> 12.0 hours</li>
                <li><strong>Overtime Hours:</strong> 0.5 hours</li>
                <li><strong>Overtime Flag:</strong> ⚠️ YES</li>
              </ul>
            </div>

            <p class="text-sm text-blue-800"><strong>What Happens:</strong></p>
            <ol class="list-decimal pl-6 text-sm text-blue-800 mt-2 space-y-1">
              <li>Staff is paid for 12 hours (capped)</li>
              <li>Client is charged for 12 hours (capped)</li>
              <li>Overtime flagged for admin review</li>
              <li>Admin can manually approve overtime if justified</li>
            </ol>
          </div>

          <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 class="font-bold text-yellow-900 mb-3">⚠️ Reviewing Overtime</h4>
            <ol class="list-decimal pl-6 text-sm text-yellow-800 space-y-2">
              <li>Go to <strong>Timesheets</strong> page</li>
              <li>Filter by <strong>"Overtime Flag"</strong></li>
              <li>Review each flagged timesheet:
                <ul class="list-disc pl-6 mt-2">
                  <li>Check raw hours vs capped hours</li>
                  <li>Verify reason for overtime (late finish, early start)</li>
                  <li>Contact client to confirm overtime was authorized</li>
                </ul>
              </li>
              <li>If approved: Manually adjust billable hours to include overtime</li>
              <li>If rejected: Keep capped hours, notify staff</li>
            </ol>
          </div>
        `
      },
      {
        title: '📋 GPS vs Paper Timesheets',
        content: `
          <div class="grid md:grid-cols-2 gap-4">
            <div class="bg-green-50 p-4 rounded-lg border-2 border-green-300">
              <h4 class="font-bold text-green-900 mb-3">✅ When to Use GPS</h4>
              <ul class="list-disc pl-6 text-sm text-green-800 space-y-2">
                <li><strong>Staff has smartphone</strong> with GPS</li>
                <li><strong>Staff granted GPS consent</strong> in profile</li>
                <li><strong>Client location has accurate address</strong> in system</li>
                <li><strong>Care home allows phones</strong> at entrance</li>
                <li><strong>Staff is tech-comfortable</strong> with app</li>
              </ul>
              <p class="text-xs text-green-700 mt-3"><strong>Result:</strong> 100% automation, zero admin work</p>
            </div>

            <div class="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
              <h4 class="font-bold text-blue-900 mb-3">📋 When to Use Paper</h4>
              <ul class="list-disc pl-6 text-sm text-blue-800 space-y-2">
                <li><strong>Staff has no smartphone</strong> or basic phone</li>
                <li><strong>Staff declined GPS consent</strong></li>
                <li><strong>Client location address unknown</strong> or inaccurate</li>
                <li><strong>Care home prohibits phones</strong> entirely</li>
                <li><strong>Staff prefers traditional method</strong></li>
              </ul>
              <p class="text-xs text-blue-700 mt-3"><strong>Result:</strong> Manual upload + admin review required</p>
            </div>
          </div>

          <div class="bg-purple-50 p-4 rounded-lg border border-purple-200 mt-4">
            <h4 class="font-bold text-purple-900 mb-3">🔄 Hybrid Approach (Recommended)</h4>
            <p class="text-sm text-purple-800 mb-2">Allow GPS users to optionally upload paper timesheet as backup evidence:</p>
            <ul class="list-disc pl-6 text-sm text-purple-800 space-y-1">
              <li>GPS timesheet auto-created and auto-approved</li>
              <li>Staff can still upload signed paper timesheet if they have one</li>
              <li>Both GPS data + paper timesheet available for disputes</li>
              <li>Provides maximum evidence protection</li>
            </ul>
          </div>
        `
      }
    ]
  };

  // ✅ UPDATED: Care Home Email Integration Guide with correct webhook setup
  const careHomeEmailGuide = {
    title: '🏥 Care Home Email Integration - Complete Guide',
    icon: Mail,
    color: 'bg-gradient-to-r from-purple-500 to-pink-600',
    sections: [
      {
        title: '🎯 Overview',
        content: `
          <p class="mb-4">Care homes can now communicate with your agency via email at <code>dominion@instayfs.co.uk</code> (or any address on your verified domain).</p>
          
          <div class="grid md:grid-cols-2 gap-4 mb-4">
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 class="font-bold text-blue-900 mb-2">1️⃣ Shift Requests</h4>
              <p class="text-sm text-blue-800">Care homes email shift needs → AI parses → Shift created → Confirmation sent</p>
            </div>
            
            <div class="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 class="font-bold text-green-900 mb-2">2️⃣ Shift Confirmations</h4>
              <p class="text-sm text-green-800">Care home replies "CONFIRMED" → Shift marked confirmed → Acknowledgment sent</p>
            </div>
          </div>
        `
      },
      {
        title: '⚙️ Setup (ALREADY DONE ✅)',
        content: `
          <div class="bg-green-50 p-4 rounded-lg border-2 border-green-300 mb-4">
            <h4 class="font-bold text-green-900 mb-3">✅ Good News - Webhook Already Configured!</h4>
            <p class="text-sm text-green-800">Your Resend webhook is already set up at the Supabase level:</p>
            <ul class="list-disc pl-6 text-sm text-green-800 mt-2">
              <li>Webhook URL: <code class="bg-white px-1 rounded">resend-webhook-handler</code></li>
              <li>Event type: <code class="bg-white px-1 rounded">email.received</code> ✓</li>
              <li>Domain: <code class="bg-white px-1 rounded">instayfs.co.uk</code> ✓</li>
            </ul>
          </div>
          
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              <strong>Verify Webhook (Check Only):</strong>
              <ul class="list-disc pl-6 mt-2">
                <li>Go to: <a href="https://resend.com/webhooks" target="_blank" class="text-blue-600 underline">Resend Dashboard → Webhooks</a></li>
                <li>You should see: <code>email.received</code> event enabled ✓</li>
                <li>Webhook endpoint: Your Supabase function URL ✓</li>
              </ul>
            </li>
            <li>
              <strong>Add Client Email to System:</strong>
              <ul class="list-disc pl-6 mt-2">
                <li>Go to <strong>Clients</strong> page</li>
                <li>Edit <strong>Dominion Care Home</strong></li>
                <li>Set <strong>Contact Email</strong> or <strong>Billing Email</strong> to their real email address</li>
                <li>Save changes ✓</li>
              </ul>
            </li>
            <li>
              <strong>Test the Integration:</strong>
              <ul class="list-disc pl-6 mt-2">
                <li>Send test email from Dominion's registered email</li>
                <li>TO: <code>dominion@instayfs.co.uk</code></li>
                <li>Check <strong>Shifts</strong> page for new shift</li>
                <li>Check <strong>AdminWorkflows</strong> page if AI flagged issues</li>
              </ul>
            </li>
          </ol>
        `
      },
      {
        title: '📝 Email Format (For Care Homes)',
        content: `
          <div class="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
            <h4 class="font-bold text-blue-900 mb-3">📧 Shift Request Email Format</h4>
            
            <div class="bg-white p-3 rounded border border-blue-200 font-mono text-sm">
              <p><strong>To:</strong> dominion@instayfs.co.uk</p>
              <p><strong>Subject:</strong> Shift Request - Nurse needed</p>
              <p class="mt-2"><strong>Body:</strong></p>
              <p class="mt-1">We need a nurse for tomorrow (Nov 10) from 08:00 to 20:00 for Room 14.</p>
            </div>
            
            <p class="text-sm text-blue-800 mt-3"><strong>AI will automatically extract:</strong></p>
            <ul class="list-disc pl-6 text-sm text-blue-800 mt-2">
              <li>Date: Nov 10 → 2025-11-10</li>
              <li>Time: 08:00 - 20:00</li>
              <li>Role: Nurse</li>
              <li>Location: Room 14</li>
            </ul>
          </div>
          
          <div class="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 class="font-bold text-green-900 mb-3">✅ Confirmation Email Format</h4>
            
            <div class="bg-white p-3 rounded border border-green-200 font-mono text-sm">
              <p><strong>Reply to:</strong> Shift assignment email</p>
              <p><strong>Subject:</strong> RE: Shift Assignment - CONFIRMED</p>
              <p class="mt-2"><strong>Body:</strong></p>
              <p class="mt-1">Yes, confirmed. Thank you.</p>
            </div>
            
            <p class="text-sm text-green-800 mt-3">System detects keywords: CONFIRMED, YES, ACCEPT, APPROVED</p>
          </div>
        `
      },
      {
        title: '🤖 How AI Processing Works',
        content: `
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span class="text-blue-600 font-bold">1</span>
              </div>
              <div>
                <p class="font-semibold">Email Received</p>
                <p class="text-sm text-gray-600">Resend forwards email to webhook → <code>email.received</code> event → function triggered</p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span class="text-purple-600 font-bold">2</span>
              </div>
              <div>
                <p class="font-semibold">Care Home Matching</p>
                <p class="text-sm text-gray-600">Matches sender email to Client record (via <code>contact_person.email</code> or <code>billing_email</code>)</p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span class="text-green-600 font-bold">3</span>
              </div>
              <div>
                <p class="font-semibold">Intent Detection</p>
                <p class="text-sm text-gray-600">AI determines: Shift Request vs Shift Confirmation</p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <span class="text-orange-600 font-bold">4</span>
              </div>
              <div>
                <p class="font-semibold">Data Extraction (if request)</p>
                <p class="text-sm text-gray-600">LLM parses: date, time, role, location, urgency from natural language</p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <span class="text-yellow-600 font-bold">5</span>
              </div>
              <div>
                <p class="font-semibold">Confidence Assessment</p>
                <p class="text-sm text-gray-600">
                  <strong>HIGH:</strong> Creates shift immediately<br>
                  <strong>MEDIUM:</strong> Creates shift + AdminWorkflow for verification<br>
                  <strong>LOW:</strong> Creates AdminWorkflow only, asks for clarification
                </p>
              </div>
            </div>
            
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                <span class="text-pink-600 font-bold">6</span>
              </div>
              <div>
                <p class="font-semibold">Confirmation Email</p>
                <p class="text-sm text-gray-600">Care home receives structured confirmation with shift details (or clarification request if low confidence)</p>
              </div>
            </div>
          </div>
        `
      },
      {
        title: '✅ Testing with Dominion',
        content: `
          <div class="bg-purple-50 p-4 rounded-lg border border-purple-200 mb-4">
            <p class="font-bold text-purple-900 mb-2">🧪 Test Scenario 1: Shift Request (HIGH Confidence)</p>
            <ol class="list-decimal pl-6 text-sm text-purple-800 space-y-2">
              <li>Set Dominion's contact email in <strong>Clients</strong> page</li>
              <li>Send email <strong>TO:</strong> <code>dominion@instayfs.co.uk</code></li>
              <li><strong>FROM:</strong> Dominion's registered email</li>
              <li><strong>Subject:</strong> "Shift Request - Nurse needed"</li>
              <li><strong>Body:</strong> "We need a nurse for November 15 from 08:00 to 20:00 for Room 14"</li>
              <li>Check: Shift created in system ✅</li>
              <li>Check: Confirmation email received ✅</li>
              <li>Check: No AdminWorkflow created (high confidence)</li>
            </ol>
          </div>
          
          <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
            <p class="font-bold text-yellow-900 mb-2">🧪 Test Scenario 2: Ambiguous Request (MEDIUM Confidence)</p>
            <ol class="list-decimal pl-6 text-sm text-yellow-800 space-y-2">
              <li><strong>Body:</strong> "Need cover tomorrow 8-8"</li>
              <li>Check: Shift created with assumed times (08:00-20:00) ✅</li>
              <li>Check: AdminWorkflow created "Verify Auto-Created Shift" ✅</li>
              <li>Check: Email warns care home to verify details ✅</li>
            </ol>
          </div>
          
          <div class="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
            <p class="font-bold text-red-900 mb-2">🧪 Test Scenario 3: Insufficient Data (LOW Confidence)</p>
            <ol class="list-decimal pl-6 text-sm text-red-800 space-y-2">
              <li><strong>Body:</strong> "Need urgent help Friday"</li>
              <li>Check: NO shift created</li>
              <li>Check: AdminWorkflow created with full email content ✅</li>
              <li>Check: Email sent asking for: time + role ✅</li>
            </ol>
          </div>
          
          <div class="bg-green-50 p-4 rounded-lg border border-green-200">
            <p class="font-bold text-green-900 mb-2">🧪 Test Scenario 4: Shift Confirmation</p>
            <ol class="list-decimal pl-6 text-sm text-green-800 space-y-2">
              <li>Assign staff to a shift (sends notification to care home)</li>
              <li>Care home replies to that email with "CONFIRMED"</li>
              <li>Check: Shift status changed to "confirmed" ✅</li>
              <li>Check: Acknowledgment email received ✅</li>
            </ol>
          </div>
        `
      },
      {
        title: '⚠️ Common Issues',
        content: `
          <div class="space-y-3">
            <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p class="font-bold text-yellow-900 mb-2">❌ "Client Not Found"</p>
              <p class="text-sm text-yellow-800"><strong>Cause:</strong> Sender email doesn't match any Client record</p>
              <p class="text-sm text-yellow-800 mt-2"><strong>Fix:</strong> Add care home's email to <strong>Contact Email</strong> or <strong>Billing Email</strong> in <strong>Clients</strong> page</p>
              <p class="text-sm text-yellow-800 mt-2"><strong>Auto-Fallback:</strong> System creates AdminWorkflow + sends email to sender saying "We'll contact you within 1 hour"</p>
            </div>
            
            <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p class="font-bold text-yellow-900 mb-2">❌ "Insufficient Data"</p>
              <p class="text-sm text-yellow-800"><strong>Cause:</strong> Email doesn't include date, time, or role</p>
              <p class="text-sm text-yellow-800 mt-2"><strong>Fix:</strong> Care home receives auto-reply with required format + AdminWorkflow created for you to follow up</p>
            </div>
            
            <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p class="font-bold text-yellow-900 mb-2">❌ Webhook Not Receiving Emails</p>
              <p class="text-sm text-yellow-800"><strong>Check:</strong></p>
              <ul class="list-disc pl-6 text-sm text-yellow-800 mt-2">
                <li>Resend Dashboard → Webhooks → Verify <code>email.received</code> is enabled</li>
                <li>Check Dashboard → Functions → careHomeInboundEmail → Logs for errors</li>
                <li>Verify email sent TO: <code>dominion@instayfs.co.uk</code> (exact address)</li>
              </ul>
            </div>
          </div>
        `
      }
    ]
  };

  // ✅ NEW: Uninvited User Approval Guide (Super Admin Only)
  const uninvitedUserGuide = {
    title: '👤 Approving Uninvited User Signups (Super Admin)',
    icon: Users,
    color: 'bg-gradient-to-r from-green-500 to-blue-600',
    sections: [
      {
        title: '🎯 Overview',
        content: `
          <p class="mb-4">When users sign up without an invitation, they are placed in a <strong>pending</strong> state and cannot access the system until approved by the super admin.</p>

          <div class="grid md:grid-cols-2 gap-4 mb-4">
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 class="font-bold text-blue-900 mb-2">1️⃣ User Signs Up</h4>
              <p class="text-sm text-blue-800">User creates account → Profile created with status "pending" → Admin workflow created</p>
            </div>

            <div class="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 class="font-bold text-green-900 mb-2">2️⃣ Super Admin Approves</h4>
              <p class="text-sm text-green-800">Review workflow → Select agency & role → User gains access to appropriate dashboard</p>
            </div>
          </div>
        `
      },
      {
        title: '📋 Step-by-Step Approval Process',
        content: `
          <ol class="list-decimal pl-6 space-y-4">
            <li>
              <strong>Navigate to Admin Workflows:</strong>
              <ul class="list-disc pl-6 mt-2 text-sm">
                <li>Go to: <strong>Management → Admin Workflows</strong></li>
                <li>Look for workflows titled: <strong>"New User Signup: [Name]"</strong></li>
                <li>Status will be: <strong>pending</strong></li>
              </ul>
            </li>
            <li>
              <strong>Review User Details:</strong>
              <ul class="list-disc pl-6 mt-2 text-sm">
                <li>Workflow shows: Email, Name, Registration Date</li>
                <li>User cannot access system until approved</li>
                <li>User sees "Account Under Review" banner when logged in</li>
              </ul>
            </li>
            <li>
              <strong>Click "Approve" Button:</strong>
              <ul class="list-disc pl-6 mt-2 text-sm">
                <li>Green button with UserPlus icon</li>
                <li>Opens approval modal with user details</li>
              </ul>
            </li>
            <li>
              <strong>Select Agency:</strong>
              <ul class="list-disc pl-6 mt-2 text-sm">
                <li>Dropdown shows all agencies in the system</li>
                <li>Choose the agency this user should belong to</li>
                <li>Required field</li>
              </ul>
            </li>
            <li>
              <strong>Select Role:</strong>
              <ul class="list-disc pl-6 mt-2 text-sm">
                <li><strong>Agency Admin:</strong> Full admin access to their agency</li>
                <li><strong>Staff Member:</strong> Access to Staff Portal, shifts, timesheets</li>
                <li><strong>Client:</strong> Access to Client Portal, view assigned staff</li>
                <li>Required field</li>
              </ul>
            </li>
            <li>
              <strong>Add Notes (Optional):</strong>
              <ul class="list-disc pl-6 mt-2 text-sm">
                <li>Add any context about the approval</li>
                <li>Notes saved in workflow resolution</li>
              </ul>
            </li>
            <li>
              <strong>Click "Approve User":</strong>
              <ul class="list-disc pl-6 mt-2 text-sm">
                <li>Profile updated with selected agency and role</li>
                <li>Workflow marked as resolved</li>
                <li>Success toast shows confirmation</li>
                <li>User can now log in and access appropriate dashboard</li>
              </ul>
            </li>
          </ol>
        `
      },
      {
        title: '🎨 What User Sees',
        content: `
          <div class="space-y-3">
            <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p class="font-bold text-yellow-900 mb-2">⏳ Before Approval</p>
              <ul class="list-disc pl-6 text-sm text-yellow-800">
                <li>User can log in but sees "Account Under Review" banner</li>
                <li>Profile setup page is accessible but submit button is disabled</li>
                <li>No access to any dashboards or features</li>
                <li>Message: "Your account is awaiting approval from an agency administrator"</li>
              </ul>
            </div>

            <div class="bg-green-50 p-4 rounded-lg border border-green-200">
              <p class="font-bold text-green-900 mb-2">✅ After Approval</p>
              <ul class="list-disc pl-6 text-sm text-green-800">
                <li>User logs in and is redirected to appropriate dashboard</li>
                <li><strong>Agency Admin:</strong> Admin Dashboard with full agency access</li>
                <li><strong>Staff Member:</strong> Staff Portal with shifts, timesheets, compliance</li>
                <li><strong>Client:</strong> Client Portal with shift requests, invoices</li>
                <li>No "Account Under Review" banner</li>
              </ul>
            </div>
          </div>
        `
      },
      {
        title: '⚠️ Important Notes',
        content: `
          <div class="space-y-3">
            <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p class="font-bold text-blue-900 mb-2">🔒 Security</p>
              <p class="text-sm text-blue-800">Only super admin (g.basera@yahoo.com) can approve uninvited users. This prevents unauthorized access to agency data.</p>
            </div>

            <div class="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <p class="font-bold text-purple-900 mb-2">📧 No Automatic Notifications</p>
              <p class="text-sm text-purple-800">Users are NOT automatically notified when approved. They will discover access when they next log in.</p>
            </div>

            <div class="bg-green-50 p-3 rounded-lg border border-green-200">
              <p class="font-bold text-green-900 mb-2">✅ Invited Users Skip This</p>
              <p class="text-sm text-green-800">Users invited via "Invite Staff" or "Invite Client" are automatically linked to the agency and do NOT require approval.</p>
            </div>
          </div>
        `
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Admin Training Hub</h2>
        <p className="text-gray-600 mt-1">
          Master the ACG StaffLink platform with step-by-step training modules
        </p>
      </div>

      {/* ✅ NEW: Care Home Email Integration Guide */}
      <Card className="border-2 border-purple-400 shadow-lg">
        <CardHeader className={`${careHomeEmailGuide.color} text-white`}>
          <CardTitle className="flex items-center gap-3">
            <careHomeEmailGuide.icon className="w-6 h-6" />
            {careHomeEmailGuide.title}
            <Badge className="bg-white text-purple-600 ml-auto">PHASE 3 PREVIEW</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {careHomeEmailGuide.sections.map((section, idx) => (
            <div key={idx} className="mb-8 last:mb-0">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                {section.title}
              </h3>
              <div 
                className="text-gray-700 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
              {idx < careHomeEmailGuide.sections.length - 1 && (
                <hr className="mt-8 border-gray-200" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ✅ NEW: Uninvited User Approval Guide (Super Admin Only) */}
      <Card className="border-2 border-green-400 shadow-lg">
        <CardHeader className={`${uninvitedUserGuide.color} text-white`}>
          <CardTitle className="flex items-center gap-3">
            <uninvitedUserGuide.icon className="w-6 h-6" />
            {uninvitedUserGuide.title}
            <Badge className="bg-white text-green-600 ml-auto">SUPER ADMIN ONLY</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {uninvitedUserGuide.sections.map((section, idx) => (
            <div key={idx} className="mb-8 last:mb-0">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                {section.title}
              </h3>
              <div
                className="text-gray-700 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
              {idx < uninvitedUserGuide.sections.length - 1 && (
                <hr className="mt-8 border-gray-200" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Training Modules */}
      <div className="grid gap-6">
        {trainingModules.map((module) => {
          const Icon = module.icon;
          const isExpanded = expandedSection === module.id;

          return (
            <Card key={module.id} className="hover:shadow-lg transition-shadow">
              <CardHeader 
                className="cursor-pointer"
                onClick={() => toggleSection(module.id)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${module.color}`} />
                    {module.title}
                    <Badge variant="outline">{module.lessons.length} lessons</Badge>
                  </CardTitle>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {module.lessons.map((lesson, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-bold text-sm">{idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                            {lesson.isNew && (
                              <Badge className="bg-green-500 text-white text-xs">NEW</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{lesson.description}</p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lesson.duration}
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
      </div>
    </div>
  );
}
