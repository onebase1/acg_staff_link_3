
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen, CheckCircle, Clock, Users, FileText, TrendingUp,
  Calendar, Mail, MessageSquare, Shield, AlertTriangle, Zap,
  ChevronRight, ChevronDown, DollarSign, Upload, Eye
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
