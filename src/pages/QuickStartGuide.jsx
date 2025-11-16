import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle, Clock, Users, Building2, Calendar, FileText,
  Zap, Shield, ChevronRight, PlayCircle, Target, Award, UserPlus
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function QuickStartGuide() {
  const [completedSteps, setCompletedSteps] = useState([]);

  const toggleStep = (stepId) => {
    setCompletedSteps(prev =>
      prev.includes(stepId)
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const steps = [
    {
      id: 'agency-setup',
      title: 'Agency Profile Setup',
      time: '2 mins',
      icon: Building2,
      actions: [
        { text: 'Add agency logo', link: createPageUrl('AgencySettings') },
        { text: 'Enter bank details (for invoices)', link: createPageUrl('AgencySettings') },
        { text: 'Set default rates', link: createPageUrl('AgencySettings') }
      ],
      why: 'Your logo appears on all invoices. Bank details are critical for client payments.'
    },
    {
      id: 'invite-staff',
      title: 'Invite Your First Staff Members',
      time: '3 mins',
      icon: Users,
      actions: [
        { text: 'Go to Staff → Invite Staff', link: createPageUrl('Staff') },
        { text: 'Enter email + name + role', link: createPageUrl('Staff') },
        { text: 'Staff receives email with setup link', link: null }
      ],
      why: 'Staff complete their own profiles (saves admin time). They upload compliance docs themselves.'
    },
    {
      id: 'add-clients',
      title: 'Add Your First Care Home',
      time: '2 mins',
      icon: Building2,
      actions: [
        { text: 'Go to Clients → Add Client', link: createPageUrl('Clients') },
        { text: 'Enter care home name + address', link: createPageUrl('Clients') },
        { text: 'Set GPS coordinates (for geofencing)', link: createPageUrl('Clients') },
        { text: 'Add internal locations (e.g., Room 14)', link: createPageUrl('Clients') }
      ],
      why: 'GPS coordinates enable location verification. Internal locations prevent invoice disputes.'
    },
    {
      id: 'create-shift',
      title: 'Post Your First Shift',
      time: '2 mins',
      icon: Calendar,
      actions: [
        { text: 'Go to Shifts → Create Shift', link: createPageUrl('Shifts') },
        { text: 'Select client + date + times', link: createPageUrl('Shifts') },
        { text: 'Choose role required', link: createPageUrl('Shifts') },
        { text: 'Assign staff or post to marketplace', link: createPageUrl('Shifts') }
      ],
      why: 'Staff see available shifts in their portal. GPS clock-in auto-creates timesheets.'
    },
    {
      id: 'gps-consent',
      title: 'Enable GPS Verification',
      time: '1 min',
      icon: Shield,
      actions: [
        { text: 'Go to Settings → GPS Consent', link: createPageUrl('StaffGPSConsent') },
        { text: 'Staff grant consent via mobile', link: createPageUrl('StaffGPSConsent') },
        { text: 'Set geofence radius (default: 100m)', link: createPageUrl('Clients') }
      ],
      why: 'GPS proves staff were on-site. Prevents invoice disputes over location.'
    },
    {
      id: 'test-timesheet',
      title: 'Test GPS Clock-In',
      time: '3 mins',
      icon: Clock,
      actions: [
        { text: 'Staff logs in via Staff Portal', link: createPageUrl('StaffPortal') },
        { text: 'Staff clicks "Clock In" (GPS captured)', link: createPageUrl('StaffPortal') },
        { text: 'Admin sees timesheet in Timesheets page', link: createPageUrl('Timesheets') },
        { text: 'Approve timesheet', link: createPageUrl('Timesheets') }
      ],
      why: 'GPS-verified timesheets eliminate disputes. Location appears on invoices.'
    },
    {
      id: 'generate-invoice',
      title: 'Generate Your First Invoice',
      time: '2 mins',
      icon: FileText,
      actions: [
        { text: 'Go to Invoices → Generate Invoice', link: createPageUrl('GenerateInvoices') },
        { text: 'Select client + date range', link: createPageUrl('GenerateInvoices') },
        { text: 'Review line items (shows locations)', link: createPageUrl('GenerateInvoices') },
        { text: 'Send invoice to client', link: createPageUrl('Invoices') }
      ],
      why: 'Invoices auto-populate from approved timesheets. Sent via email with PDF.'
    },
    {
      id: 'approve-uninvited-users',
      title: 'Review Uninvited User Signups (Super Admin Only)',
      time: '2 mins',
      icon: UserPlus,
      actions: [
        { text: 'Go to Management → Admin Workflows', link: createPageUrl('AdminWorkflows') },
        { text: 'Look for "New User Signup" workflows', link: createPageUrl('AdminWorkflows') },
        { text: 'Click green "Approve" button', link: createPageUrl('AdminWorkflows') },
        { text: 'Select agency and role (Admin/Staff/Client)', link: createPageUrl('AdminWorkflows') },
        { text: 'Click "Approve User" to grant access', link: createPageUrl('AdminWorkflows') }
      ],
      why: 'Users who sign up without an invitation need manual approval and agency assignment before accessing the system.',
      superAdminOnly: true
    }
  ];

  const totalTime = steps.reduce((sum, step) => sum + parseInt(step.time), 0);
  const progressPercentage = (completedSteps.length / steps.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white p-8 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <Zap className="w-10 h-10" />
          <h1 className="text-3xl font-bold">Quick Start Guide</h1>
        </div>
        <p className="text-green-100 text-lg mb-4">
          Go live in 15 minutes - Complete onboarding checklist
        </p>
        <div className="flex gap-4 flex-wrap">
          <Badge className="bg-white/20 text-white border-white/30">
            <Clock className="w-3 h-3 mr-1" />
            {totalTime} minutes total
          </Badge>
          <Badge className="bg-white/20 text-white border-white/30">
            {completedSteps.length}/{steps.length} completed
          </Badge>
          <Badge className="bg-white/20 text-white border-white/30">
            {Math.round(progressPercentage)}% progress
          </Badge>
        </div>
      </div>

      {/* Progress Alert */}
      {completedSteps.length === steps.length ? (
        <Alert className="border-2 border-green-300 bg-green-50">
          <Award className="h-5 w-5 text-green-600" />
          <AlertDescription>
            <div className="text-green-900">
              <strong className="text-lg block mb-2">🎉 Congratulations! You're Live!</strong>
              <p>You've completed the quick start guide. Your agency is ready to operate.</p>
              <div className="mt-3 flex gap-2">
                <Link to={createPageUrl('AdminTrainingHub')}>
                  <Button size="sm" className="bg-green-600">
                    Continue to Full Training
                  </Button>
                </Link>
                <Link to={createPageUrl('Dashboard')}>
                  <Button size="sm" variant="outline">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-blue-300 bg-blue-50">
          <Target className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Goal:</strong> Complete all 7 steps to go live. You can complete them in any order.
          </AlertDescription>
        </Alert>
      )}

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = completedSteps.includes(step.id);

          return (
            <Card
              key={step.id}
              className={`border-2 transition-all ${
                isCompleted ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}
            >
              <CardHeader className="border-b bg-gradient-to-r from-white to-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isCompleted ? 'bg-green-600' : 'bg-gradient-to-r from-cyan-500 to-blue-600'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-7 h-7 text-white" />
                      ) : (
                        <Icon className="w-7 h-7 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">Step {idx + 1}</Badge>
                        <Badge className="bg-blue-100 text-blue-800">
                          <Clock className="w-3 h-3 mr-1" />
                          {step.time}
                        </Badge>
                        {step.superAdminOnly && (
                          <Badge className="bg-purple-100 text-purple-800">
                            <Shield className="w-3 h-3 mr-1" />
                            Super Admin Only
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                    </div>
                  </div>
                  <Button
                    onClick={() => toggleStep(step.id)}
                    variant={isCompleted ? 'outline' : 'default'}
                    className={isCompleted ? 'border-green-600 text-green-600' : ''}
                  >
                    {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Actions */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">📋 Steps:</h4>
                    <div className="space-y-2">
                      {step.actions.map((action, actionIdx) => (
                        <div
                          key={actionIdx}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                              {actionIdx + 1}
                            </div>
                            <span className="text-sm text-gray-900">{action.text}</span>
                          </div>
                          {action.link && (
                            <Link to={action.link}>
                              <Button size="sm" variant="outline">
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Why This Matters */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <p className="text-sm text-blue-900">
                      <strong>💡 Why this matters:</strong> {step.why}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Next Steps */}
      <Card className="border-2 border-purple-300 bg-purple-50">
        <CardHeader className="border-b bg-purple-100">
          <CardTitle className="text-purple-900">What's Next?</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3 text-sm text-purple-900">
            <p className="font-semibold">After completing quick start:</p>
            <ul className="space-y-2 ml-4 list-disc">
              <li>
                <strong>Admin Training Hub:</strong> Complete full training modules (3 hours)
                <Link to={createPageUrl('AdminTrainingHub')} className="ml-2 text-purple-600 underline">
                  Start Training →
                </Link>
              </li>
              <li>
                <strong>Bulk Import:</strong> Import existing staff/clients from Excel
                <Link to={createPageUrl('BulkDataImport')} className="ml-2 text-purple-600 underline">
                  Import Data →
                </Link>
              </li>
              <li>
                <strong>Automation Settings:</strong> Enable auto-reminders & workflows
                <Link to={createPageUrl('AgencySettings')} className="ml-2 text-purple-600 underline">
                  Configure →
                </Link>
              </li>
              <li>
                <strong>Help Center:</strong> Search for specific features or issues
                <Link to={createPageUrl('HelpCenter')} className="ml-2 text-purple-600 underline">
                  Browse Help →
                </Link>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>💡 Pro Tips</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
              <h4 className="font-semibold text-cyan-900 mb-2">Use Natural Language</h4>
              <p className="text-sm text-cyan-800">
                Type "Need nurse at Divine Care tomorrow 8am-8pm" to create shifts instantly
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">GPS is Optional</h4>
              <p className="text-sm text-green-800">
                Staff can still work without GPS consent, but it prevents invoice disputes
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2">Staff Self-Service</h4>
              <p className="text-sm text-purple-800">
                Staff upload their own compliance docs, reducing admin workload by 80%
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-2">Financial Locking</h4>
              <p className="text-sm text-orange-800">
                Once invoiced, data is locked automatically - prevents tampering & disputes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}