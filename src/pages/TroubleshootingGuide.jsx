import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle, Search, CheckCircle, XCircle, Zap, Info,
  MapPin, Clock, Users, FileText, Mail, Shield, AlertTriangle
} from "lucide-react";

export default function TroubleshootingGuide() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const issues = [
    {
      id: 'gps-not-working',
      category: 'GPS',
      severity: 'high',
      icon: MapPin,
      title: 'GPS Location Not Working',
      symptoms: [
        'Staff can\'t clock in',
        '"Location unavailable" error',
        'GPS accuracy shows >1000m'
      ],
      solutions: [
        {
          title: 'Check Browser Permissions',
          steps: [
            'Open browser settings',
            'Search for "Location" or "Site permissions"',
            'Find your ACG StaffLink domain',
            'Ensure Location is set to "Allow"',
            'Refresh the page'
          ]
        },
        {
          title: 'Enable Device GPS',
          steps: [
            'iOS: Settings → Privacy → Location Services → ON',
            'Android: Settings → Location → ON',
            'Ensure device has clear view of sky (not indoors)',
            'Wait 30 seconds for GPS to acquire signal'
          ]
        },
        {
          title: 'Use Chrome/Safari',
          steps: [
            'GPS works best in Chrome (Android) or Safari (iOS)',
            'Some browsers (Firefox, Opera) have GPS issues',
            'Try switching browser if problem persists'
          ]
        }
      ],
      prevention: 'Grant GPS consent before first shift. Test GPS in Staff Portal → My Profile → Test Location.'
    },
    {
      id: 'geofence-violation',
      category: 'GPS',
      severity: 'medium',
      icon: Shield,
      title: 'Geofence Validation Failed',
      symptoms: [
        'Clock-in blocked with "outside geofence" error',
        'Distance shows >100m from site',
        'Staff physically at correct location'
      ],
      solutions: [
        {
          title: 'Check Client GPS Coordinates',
          steps: [
            'Go to Clients → Select client → Edit',
            'Verify GPS coordinates are correct',
            'Use Google Maps to find exact coordinates',
            'Ensure coordinates are for main entrance (not office address)'
          ]
        },
        {
          title: 'Increase Geofence Radius',
          steps: [
            'Default radius: 100m',
            'Large facilities may need 200-300m radius',
            'Edit client → Set geofence_radius_meters',
            'Balance security vs. convenience'
          ]
        },
        {
          title: 'Manual Override',
          steps: [
            'Admin can approve timesheet manually',
            'Add note explaining geofence failure',
            'Update client coordinates for future shifts'
          ]
        }
      ],
      prevention: 'Set GPS coordinates when creating clients. Test with staff BEFORE first shift.'
    },
    {
      id: 'invoice-not-sending',
      category: 'Invoicing',
      severity: 'high',
      icon: FileText,
      title: 'Invoice Not Sending to Client',
      symptoms: [
        'Invoice stays in "draft" status',
        'Email not received by client',
        'Error message when clicking "Send"'
      ],
      solutions: [
        {
          title: 'Verify Client Email',
          steps: [
            'Go to Clients → Select client → Edit',
            'Check "billing_email" field is filled',
            'Ensure email format is correct (no spaces)',
            'Test by sending test email first'
          ]
        },
        {
          title: 'Check Invoice Status',
          steps: [
            'Invoice must be "draft" to send',
            'Already sent invoices can\'t be re-sent',
            'Create invoice amendment if changes needed'
          ]
        },
        {
          title: 'Check Email Service',
          steps: [
            'Verify RESEND_API_KEY is set (Settings → Secrets)',
            'Check RESEND_FROM_DOMAIN matches your domain',
            'Contact support if emails consistently fail'
          ]
        }
      ],
      prevention: 'Set client billing email when creating client. Send test invoice before first billing cycle.'
    },
    {
      id: 'staff-cant-login',
      category: 'Authentication',
      severity: 'high',
      icon: Users,
      title: 'Staff Can\'t Login After Invitation',
      symptoms: [
        'Staff clicks invitation link → "Not found" error',
        'Login loop (keeps redirecting)',
        'Password reset not working'
      ],
      solutions: [
        {
          title: 'Check Invitation Status',
          steps: [
            'Go to Staff → Find staff member',
            'Check status: should be "onboarding" or "active"',
            'If "suspended" → change to "active"',
            'Resend invitation email if >7 days old'
          ]
        },
        {
          title: 'Shared Device Issue',
          steps: [
            'If someone else logged in on this device before:',
            'Staff should click logout=true link in email',
            'Or manually logout first, then click invitation',
            'Browser may cache old session'
          ]
        },
        {
          title: 'Create Account Manually',
          steps: [
            'Staff goes to app login page',
            'Clicks "Create Account"',
            'Uses EXACT email from invitation',
            'Completes profile setup'
          ]
        }
      ],
      prevention: 'Include logout=true in invitation URLs. Clear browser cache before first login on shared devices.'
    },
    {
      id: 'timesheet-locked',
      category: 'Timesheets',
      severity: 'medium',
      icon: Clock,
      title: 'Can\'t Edit Timesheet (Locked)',
      symptoms: [
        '"Timesheet financially locked" error',
        'Hours/rates can\'t be changed',
        'Edit button grayed out'
      ],
      solutions: [
        {
          title: 'Understanding Financial Locking',
          steps: [
            'Timesheets auto-lock when invoiced',
            'This prevents post-invoice tampering',
            'You CANNOT unlock - it\'s a security feature',
            'Must create invoice amendment instead'
          ]
        },
        {
          title: 'Create Invoice Amendment',
          steps: [
            'Go to Invoices → Find invoice → View Details',
            'Click "Create Amendment"',
            'Explain reason for change',
            'System generates amended invoice (v2)',
            'Original invoice marked as "superseded"'
          ]
        },
        {
          title: 'Prevent Future Issues',
          steps: [
            'Double-check timesheets BEFORE approving',
            'Once approved → locked within 24h if invoiced',
            'Train staff to submit accurate timesheets',
            'Review GPS location before approval'
          ]
        }
      ],
      prevention: 'Review timesheets carefully before approval. Locked timesheets = no edits allowed.'
    },
    {
      id: 'notifications-not-received',
      category: 'Notifications',
      severity: 'medium',
      icon: Mail,
      title: 'Email/SMS Notifications Not Received',
      symptoms: [
        'Staff not receiving shift reminders',
        'Client not receiving invoices',
        'No SMS confirmations'
      ],
      solutions: [
        {
          title: 'Check Email Settings',
          steps: [
            'Verify email address is correct (no typos)',
            'Check spam/junk folder',
            'Add no-reply@yourdomain.com to contacts',
            'Check email filtering rules'
          ]
        },
        {
          title: 'Check SMS Settings',
          steps: [
            'Verify phone number format: +447XXX',
            'Must include country code (+44 for UK)',
            'Check SMS credit balance (Twilio)',
            'Ensure phone can receive SMS from online services'
          ]
        },
        {
          title: 'Check Automation Settings',
          steps: [
            'Go to Agency Settings → Automation',
            'Ensure relevant automations are enabled',
            'Check notification digest settings',
            'Verify API keys are set correctly'
          ]
        }
      ],
      prevention: 'Test notifications during onboarding. Verify all email/phone formats before going live.'
    },
    {
      id: 'compliance-expiry-not-detected',
      category: 'Compliance',
      severity: 'high',
      icon: Shield,
      title: 'Compliance Expiry Not Detected',
      symptoms: [
        'No expiry reminders sent',
        'Staff working with expired docs',
        'Auto-suspension not working'
      ],
      solutions: [
        {
          title: 'Check Document Upload',
          steps: [
            'Go to Compliance Tracker → Select staff',
            'Ensure document_type is set correctly',
            'Verify expiry_date is filled',
            'AI should extract date automatically from PDF'
          ]
        },
        {
          title: 'Manual Date Entry',
          steps: [
            'If AI fails to extract date:',
            'Click "Edit" on compliance record',
            'Manually enter expiry_date',
            'Save → Reminders will trigger automatically'
          ]
        },
        {
          title: 'Check Automation Settings',
          steps: [
            'Go to Agency Settings → Automation',
            'Ensure "auto_compliance_reminders" is enabled',
            'Check reminder intervals (30/14/7 days)',
            'Test with document expiring soon'
          ]
        }
      ],
      prevention: 'Upload compliance docs as soon as staff joins. Verify AI extracted dates correctly.'
    },
    {
      id: 'shift-not-appearing',
      category: 'Shifts',
      severity: 'medium',
      icon: Clock,
      title: 'Shift Not Appearing in Staff Portal',
      symptoms: [
        'Admin created shift',
        'Staff can\'t see it in Marketplace',
        'Assigned staff can\'t see shift'
      ],
      solutions: [
        {
          title: 'Check Shift Status',
          steps: [
            'Go to Shifts → Find shift → View Details',
            'Status must be "open" for marketplace',
            'Status must be "assigned" for staff to see',
            'Draft shifts are admin-only'
          ]
        },
        {
          title: 'Check Marketplace Visibility',
          steps: [
            'Edit shift → Check "marketplace_visible" toggle',
            'If false, shift won\'t appear in marketplace',
            'Enable toggle → Save → Staff can now see it'
          ]
        },
        {
          title: 'Check Staff Eligibility',
          steps: [
            'Shift role must match staff role',
            'Staff status must be "active"',
            'Staff must have GPS consent (if required)',
            'Check staff availability matches shift date/time'
          ]
        }
      ],
      prevention: 'Enable marketplace_visible when creating shifts. Verify staff meets eligibility criteria.'
    }
  ];

  const categories = ['all', 'GPS', 'Invoicing', 'Authentication', 'Timesheets', 'Notifications', 'Compliance', 'Shifts'];

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = searchTerm === '' ||
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.symptoms.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || issue.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getSeverityBadge = (severity) => {
    const variants = {
      critical: { className: 'bg-red-600 text-white', label: 'CRITICAL' },
      high: { className: 'bg-orange-500 text-white', label: 'HIGH' },
      medium: { className: 'bg-yellow-100 text-yellow-800', label: 'MEDIUM' },
      low: { className: 'bg-blue-100 text-blue-800', label: 'LOW' }
    };
    return variants[severity] || variants.medium;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 text-white p-8 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-10 h-10" />
          <h1 className="text-3xl font-bold">Troubleshooting Guide</h1>
        </div>
        <p className="text-orange-100 text-lg">
          Common issues and how to solve them
        </p>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search issues (e.g., GPS not working, invoice locked)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === 'all' ? 'All Issues' : cat}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Issues Found</h3>
            <p className="text-gray-600">Try different search terms or browse all categories</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredIssues.map(issue => {
            const Icon = issue.icon;
            const badge = getSeverityBadge(issue.severity);

            return (
              <Card key={issue.id} className="border-2">
                <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{issue.category}</Badge>
                          <Badge className={badge.className}>{badge.label}</Badge>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{issue.title}</h3>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Symptoms */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      Symptoms
                    </h4>
                    <ul className="space-y-2">
                      {issue.symptoms.map((symptom, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <span>{symptom}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Solutions */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-600" />
                      Solutions
                    </h4>
                    <div className="space-y-4">
                      {issue.solutions.map((solution, sIdx) => (
                        <div key={sIdx} className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h5 className="font-semibold text-green-900 mb-2">
                            {sIdx + 1}. {solution.title}
                          </h5>
                          <ol className="space-y-1 ml-4 list-decimal">
                            {solution.steps.map((step, stepIdx) => (
                              <li key={stepIdx} className="text-sm text-green-800">{step}</li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Prevention */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                    <h4 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Prevention
                    </h4>
                    <p className="text-sm text-blue-800">{issue.prevention}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Still Need Help */}
      <Card className="border-2 border-purple-300 bg-purple-50">
        <CardHeader className="border-b bg-purple-100">
          <CardTitle className="text-purple-900">Still Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3 text-sm text-purple-900">
            <p>If you can't find a solution here:</p>
            <ul className="space-y-2 ml-4 list-disc">
              <li><strong>Check Help Center:</strong> Search for specific features or error messages</li>
              <li><strong>Contact Support:</strong> Email support@acgstafflink.com with screenshots</li>
              <li><strong>Request Feature:</strong> Suggest improvements via feedback button</li>
              <li><strong>Book Training:</strong> Schedule 1-on-1 session with our team</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}