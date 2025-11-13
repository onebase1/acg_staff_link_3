import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle, XCircle, AlertTriangle, Shield, Calendar, Clock, 
  MapPin, Users, FileText, TrendingUp, Search
} from 'lucide-react';

export default function ValidationMatrix() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const validations = [
    // SHIFT ASSIGNMENT VALIDATIONS
    {
      id: 1,
      category: 'Shift Assignment',
      icon: Calendar,
      color: 'blue',
      name: 'Staff Overlap Prevention',
      description: 'Prevent assigning same staff to multiple overlapping shifts on same day',
      severity: 'critical',
      automated: true,
      blocking: true,
      implementation: 'ShiftAssignmentModal validates before assignment',
      testCase: 'Try assigning Ebuka to 3 shifts on Nov 2, 2025 08:00-20:00',
      expectedBehavior: 'After first assignment, show error: "Staff already assigned to overlapping shift"',
      currentStatus: 'active'
    },
    {
      id: 2,
      category: 'Shift Assignment',
      icon: Clock,
      color: 'blue',
      name: '24-Hour Work Limit',
      description: 'Prevent staff from working >16 hours in any 24-hour period',
      severity: 'critical',
      automated: true,
      blocking: true,
      implementation: 'Calculates total hours worked in 24h window before assignment',
      testCase: 'Assign staff to 08:00-20:00 shift, then try 20:00-08:00 same day',
      expectedBehavior: 'Show error: "Would work 24h in 24 hours (max: 16h)"',
      currentStatus: 'active'
    },
    {
      id: 3,
      category: 'Shift Assignment',
      icon: Users,
      color: 'blue',
      name: 'Role Matching',
      description: 'Only show staff with matching role when assigning shifts',
      severity: 'high',
      automated: true,
      blocking: true,
      implementation: 'Filter staff by role === shift.role_required',
      testCase: 'Create nurse shift → Only nurses appear in assignment modal',
      expectedBehavior: 'Care workers not shown',
      currentStatus: 'active'
    },
    {
      id: 4,
      category: 'Shift Assignment',
      icon: Shield,
      color: 'blue',
      name: 'Active Staff Only',
      description: 'Suspended/inactive staff cannot be assigned',
      severity: 'critical',
      automated: true,
      blocking: true,
      implementation: 'Filter: s.status === "active"',
      testCase: 'Suspend staff → Try assigning to shift',
      expectedBehavior: 'Staff not shown in assignment modal',
      currentStatus: 'active'
    },

    // GPS & GEOFENCING VALIDATIONS
    {
      id: 5,
      category: 'GPS & Geofencing',
      icon: MapPin,
      color: 'green',
      name: 'Clock-In Geofence',
      description: 'Staff must be within X meters of client location to clock in',
      severity: 'high',
      automated: true,
      blocking: true,
      implementation: 'geofenceValidator function calculates distance',
      testCase: 'Clock in from home (>100m away)',
      expectedBehavior: 'Show error + create AdminWorkflow for manual review',
      currentStatus: 'active'
    },
    {
      id: 6,
      category: 'GPS & Geofencing',
      icon: MapPin,
      color: 'green',
      name: 'GPS Consent Required',
      description: 'Staff must consent to GPS tracking before clocking in',
      severity: 'medium',
      automated: true,
      blocking: true,
      implementation: 'Check: staff.gps_consent === true',
      testCase: 'Staff without GPS consent tries to clock in',
      expectedBehavior: 'Show: "GPS tracking not enabled. Enable in settings"',
      currentStatus: 'active'
    },
    {
      id: 7,
      category: 'GPS & Geofencing',
      icon: AlertTriangle,
      color: 'green',
      name: 'GPS Accuracy Check',
      description: 'Reject GPS readings with accuracy >50 meters',
      severity: 'medium',
      automated: true,
      blocking: false,
      implementation: 'Check: location.accuracy <= 50',
      testCase: 'Mock GPS with 100m accuracy',
      expectedBehavior: 'Flag as low accuracy + admin review',
      currentStatus: 'active'
    },

    // TIMESHEET VALIDATIONS
    {
      id: 8,
      category: 'Timesheets',
      icon: FileText,
      color: 'purple',
      name: 'Hours Worked vs Scheduled',
      description: 'Flag timesheets where hours differ >20% from scheduled',
      severity: 'high',
      automated: true,
      blocking: false,
      implementation: 'intelligentTimesheetValidator calculates variance',
      testCase: 'Schedule 12h, submit timesheet with 8h',
      expectedBehavior: 'Create AdminWorkflow: "Significant hours mismatch (33%)"',
      currentStatus: 'active'
    },
    {
      id: 9,
      category: 'Timesheets',
      icon: Clock,
      color: 'purple',
      name: 'Break Duration Compliance',
      description: 'Ensure break time matches contract terms',
      severity: 'medium',
      automated: true,
      blocking: false,
      implementation: 'Compare: timesheet.break_duration_minutes vs client.contract_terms.break_duration_minutes',
      testCase: 'Contract says 30min break, timesheet shows 60min',
      expectedBehavior: 'Flag for review',
      currentStatus: 'active'
    },
    {
      id: 10,
      category: 'Timesheets',
      icon: MapPin,
      color: 'purple',
      name: 'Location Verification',
      description: 'Timesheet location must match shift location',
      severity: 'high',
      automated: true,
      blocking: false,
      implementation: 'Compare: timesheet.work_location_within_site vs shift.work_location_within_site',
      testCase: 'Shift says "Room 14", timesheet shows "Room 20"',
      expectedBehavior: 'AdminWorkflow: "Location mismatch"',
      currentStatus: 'pending'
    },
    {
      id: 11,
      category: 'Timesheets',
      icon: AlertTriangle,
      color: 'purple',
      name: 'No-Show Detection',
      description: 'Detect shifts where staff clocked <30 mins on a 4+ hour shift',
      severity: 'critical',
      automated: true,
      blocking: false,
      implementation: 'If actualHours < 0.5 && scheduledHours > 4 → flag',
      testCase: 'Scheduled 12h shift, staff clocks 20 minutes',
      expectedBehavior: 'AdminWorkflow: "Possible no-show/early departure"',
      currentStatus: 'active'
    },

    // COMPLIANCE VALIDATIONS
    {
      id: 12,
      category: 'Compliance',
      icon: Shield,
      color: 'orange',
      name: 'DBS Expiry Check',
      description: 'Staff cannot work with expired DBS',
      severity: 'critical',
      automated: true,
      blocking: true,
      implementation: 'complianceMonitor checks expiry dates daily',
      testCase: 'DBS expires tomorrow → Try assigning shift in 2 days',
      expectedBehavior: 'Staff not shown in assignment modal',
      currentStatus: 'pending'
    },
    {
      id: 13,
      category: 'Compliance',
      icon: FileText,
      color: 'orange',
      name: 'Mandatory Documents',
      description: 'Staff must have DBS + Right to Work + Professional Registration',
      severity: 'critical',
      automated: true,
      blocking: true,
      implementation: 'Check for verified documents before activation',
      testCase: 'Activate staff without DBS',
      expectedBehavior: 'Error: "Cannot activate - DBS verification missing"',
      currentStatus: 'pending'
    },
    {
      id: 14,
      category: 'Compliance',
      icon: AlertTriangle,
      color: 'orange',
      name: '30-Day Expiry Reminder',
      description: 'Auto-send reminders 30, 14, 7 days before document expiry',
      severity: 'high',
      automated: true,
      blocking: false,
      implementation: 'complianceMonitor runs daily',
      testCase: 'Set DBS expiry to 29 days from now',
      expectedBehavior: 'Email sent next day: "DBS expires in 29 days"',
      currentStatus: 'active'
    },

    // FINANCIAL VALIDATIONS
    {
      id: 15,
      category: 'Financial',
      icon: TrendingUp,
      color: 'cyan',
      name: 'Rate Override Approval',
      description: 'Pay rate changes >10% require admin approval',
      severity: 'high',
      automated: false,
      blocking: true,
      implementation: 'Admin must approve in PostShiftV2',
      testCase: 'Set pay rate £25/hr (standard is £18/hr)',
      expectedBehavior: 'Requires approval + reason',
      currentStatus: 'active'
    },
    {
      id: 16,
      category: 'Financial',
      icon: FileText,
      color: 'cyan',
      name: 'Invoice Line Item Validation',
      description: 'Each invoice line must have matching approved timesheet',
      severity: 'critical',
      automated: true,
      blocking: true,
      implementation: 'autoInvoiceGenerator checks timesheet.status === "approved"',
      testCase: 'Try including draft timesheet in invoice',
      expectedBehavior: 'Excluded from invoice',
      currentStatus: 'active'
    },
    {
      id: 17,
      category: 'Financial',
      icon: AlertTriangle,
      color: 'cyan',
      name: 'Margin Validation',
      description: 'Flag if agency margin <10% (unprofitable shift)',
      severity: 'medium',
      automated: true,
      blocking: false,
      implementation: 'Calculate: (charge_rate - pay_rate) / charge_rate',
      testCase: 'Charge £20/hr, Pay £19/hr (5% margin)',
      expectedBehavior: 'Warning: "Low margin shift - review pricing"',
      currentStatus: 'pending'
    },

    // DATA INTEGRITY VALIDATIONS
    {
      id: 18,
      category: 'Data Integrity',
      icon: Shield,
      color: 'red',
      name: 'Client Deletion Protection',
      description: 'Prevent deleting clients with active/future shifts',
      severity: 'critical',
      automated: true,
      blocking: true,
      implementation: 'Check for shifts with status !== "completed" before delete',
      testCase: 'Delete client with open shifts',
      expectedBehavior: 'Error: "Cannot delete - 3 active shifts linked"',
      currentStatus: 'pending'
    },
    {
      id: 19,
      category: 'Data Integrity',
      icon: Users,
      color: 'red',
      name: 'Staff Deletion Protection',
      description: 'Prevent deleting staff with future bookings',
      severity: 'critical',
      automated: true,
      blocking: true,
      implementation: 'Check for bookings with shift_date >= today',
      testCase: 'Delete staff assigned to tomorrow\'s shift',
      expectedBehavior: 'Error: "Cannot delete - 1 future booking"',
      currentStatus: 'pending'
    },
    {
      id: 20,
      category: 'Data Integrity',
      icon: Calendar,
      color: 'red',
      name: 'Shift Date Validation',
      description: 'Prevent creating shifts in the past',
      severity: 'high',
      automated: true,
      blocking: true,
      implementation: 'Check: shift.date >= today',
      testCase: 'Create shift for yesterday',
      expectedBehavior: 'Error: "Cannot create shifts in the past"',
      currentStatus: 'pending'
    }
  ];

  const filteredValidations = validations.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || v.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...new Set(validations.map(v => v.category))];

  const getSeverityBadge = (severity) => {
    const variants = {
      critical: { className: 'bg-red-100 text-red-800', icon: XCircle },
      high: { className: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
      medium: { className: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      low: { className: 'bg-blue-100 text-blue-800', icon: CheckCircle }
    };
    return variants[severity] || variants.medium;
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: { className: 'bg-green-100 text-green-800', text: '✅ Active' },
      pending: { className: 'bg-gray-100 text-gray-800', text: '⏳ Pending' },
      disabled: { className: 'bg-red-100 text-red-800', text: '❌ Disabled' }
    };
    return variants[status] || variants.pending;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Validation Matrix</h2>
          <p className="text-gray-600 mt-1">Complete list of all system validations and business rules</p>
        </div>
        <Badge className="bg-purple-100 text-purple-800 text-lg px-4 py-2">
          {validations.length} Validations
        </Badge>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search validations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat === 'all' ? 'All' : cat}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{validations.length}</p>
            <p className="text-sm text-gray-600">Total Validations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">
              {validations.filter(v => v.currentStatus === 'active').length}
            </p>
            <p className="text-sm text-gray-600">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-600">
              {validations.filter(v => v.severity === 'critical').length}
            </p>
            <p className="text-sm text-gray-600">Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {validations.filter(v => v.automated).length}
            </p>
            <p className="text-sm text-gray-600">Automated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">
              {validations.filter(v => v.blocking).length}
            </p>
            <p className="text-sm text-gray-600">Blocking</p>
          </CardContent>
        </Card>
      </div>

      {/* Validations List */}
      <div className="space-y-4">
        {filteredValidations.map((validation) => {
          const Icon = validation.icon;
          const severityBadge = getSeverityBadge(validation.severity);
          const SeverityIcon = severityBadge.icon;
          const statusBadge = getStatusBadge(validation.currentStatus);

          return (
            <Card key={validation.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-${validation.color}-100`}>
                      <Icon className={`w-6 h-6 text-${validation.color}-600`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">{validation.name}</h3>
                        <Badge {...severityBadge}>
                          <SeverityIcon className="w-3 h-3 mr-1" />
                          {validation.severity.toUpperCase()}
                        </Badge>
                        {validation.automated && (
                          <Badge className="bg-blue-100 text-blue-800">🤖 Automated</Badge>
                        )}
                        {validation.blocking && (
                          <Badge className="bg-red-100 text-red-800">🚫 Blocking</Badge>
                        )}
                        <Badge {...statusBadge}>{statusBadge.text}</Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{validation.description}</p>
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div className="p-3 bg-gray-50 rounded">
                          <p className="font-semibold text-gray-700 mb-1">Implementation:</p>
                          <p className="text-gray-600 font-mono text-xs">{validation.implementation}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded">
                          <p className="font-semibold text-blue-700 mb-1">Test Case:</p>
                          <p className="text-blue-900 text-xs">{validation.testCase}</p>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                        <p className="font-semibold text-green-700 text-xs mb-1">✅ Expected Behavior:</p>
                        <p className="text-green-900 text-xs">{validation.expectedBehavior}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredValidations.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No validations found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}