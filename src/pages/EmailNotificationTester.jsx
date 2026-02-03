import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, Send, CheckCircle, XCircle, AlertCircle, Loader2, 
  MessageSquare, Phone, Clock, User, Building2, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import NotificationService from '../components/notifications/NotificationService';

export default function EmailNotificationTester() {
  const [testType, setTestType] = useState('shift_assignment');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);

  // Custom email test
  const [customTo, setCustomTo] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('*');
      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      return data || [];
    },
    initialData: []
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*');
      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      return data || [];
    },
    initialData: []
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('date', { ascending: false });
      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }
      return data || [];
    },
    initialData: []
  });

  const { data: agency } = useQuery({
    queryKey: ['current-agency'],
    queryFn: async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.error('❌ Not authenticated:', authError);
        return null;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Profile not found:', profileError);
        return null;
      }

      if (!profile.agency_id) {
        return null;
      }

      const { data: agencyRecord, error: agencyError } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', profile.agency_id)
        .single();

      if (agencyError) {
        console.error('❌ Error fetching agency:', agencyError);
        return null;
      }

      return agencyRecord;
    },
    initialData: null
  });

  const runTest = async () => {
    setTesting(true);
    const testResult = {
      type: testType,
      timestamp: new Date().toISOString(),
      success: false,
      message: '',
      details: {}
    };

    try {
      switch (testType) {
        case 'shift_assignment':
          if (!selectedStaff || !selectedShift || !selectedClient) {
            throw new Error('Please select staff, shift, and client');
          }

          const assignStaff = staff.find(s => s.id === selectedStaff);
          const assignShift = shifts.find(s => s.id === selectedShift);
          const assignClient = clients.find(c => c.id === selectedClient);

          const assignResult = await NotificationService.notifyShiftAssignment({
            staff: assignStaff,
            shift: assignShift,
            client: assignClient,
            agency: agency
          });

          testResult.success = assignResult.success;
          testResult.message = assignResult.success 
            ? `✅ Assignment email sent to ${assignStaff.email}` 
            : `❌ Failed: ${assignResult.error}`;
          testResult.details = { to: assignStaff.email, ...assignResult };
          break;

        case 'shift_confirmed_staff':
          if (!selectedStaff || !selectedShift || !selectedClient) {
            throw new Error('Please select staff, shift, and client');
          }

          const confStaff = staff.find(s => s.id === selectedStaff);
          const confShift = shifts.find(s => s.id === selectedShift);
          const confClient = clients.find(c => c.id === selectedClient);

          const confResult = await NotificationService.notifyShiftConfirmedToStaff({
            staff: confStaff,
            shift: confShift,
            client: confClient,
            agency: agency
          });

          testResult.success = confResult.success;
          testResult.message = confResult.success 
            ? `✅ Confirmation email sent to staff: ${confStaff.email}` 
            : `❌ Failed: ${confResult.error}`;
          testResult.details = { to: confStaff.email, ...confResult };
          break;

        case 'shift_confirmed_client':
          if (!selectedStaff || !selectedShift || !selectedClient) {
            throw new Error('Please select staff, shift, and client');
          }

          const clientStaff = staff.find(s => s.id === selectedStaff);
          const clientShift = shifts.find(s => s.id === selectedShift);
          const notifyClient = clients.find(c => c.id === selectedClient);

          const clientResult = await NotificationService.notifyShiftConfirmedToClient({
            staff: clientStaff,
            shift: clientShift,
            client: notifyClient
          });

          testResult.success = clientResult.success;
          testResult.message = clientResult.success 
            ? `✅ Confirmation email sent to client: ${notifyClient.billing_email || notifyClient.contact_person?.email}` 
            : `❌ Failed: ${clientResult.error}`;
          testResult.details = clientResult;
          break;

        case 'compliance_expiry':
          if (!selectedStaff) {
            throw new Error('Please select staff member');
          }

          const compStaff = staff.find(s => s.id === selectedStaff);
          const mockDocument = {
            document_name: 'DBS Certificate (TEST)',
            expiry_date: '2025-12-31',
            reference_number: 'TEST-123456'
          };

          const compResult = await NotificationService.notifyComplianceExpiry({
            staff: compStaff,
            document: mockDocument,
            days_until_expiry: 14,
            agency: agency
          });

          testResult.success = compResult[0]?.value?.success || false;
          testResult.message = testResult.success 
            ? `✅ Compliance reminder sent to ${compStaff.email}` 
            : `❌ Failed: ${compResult[0]?.reason}`;
          testResult.details = compResult;
          break;

        case 'custom_email':
          if (!customTo || !customSubject || !customBody) {
            throw new Error('Please fill in all custom email fields');
          }

          const customResult = await NotificationService.sendEmail({
            to: customTo,
            subject: customSubject,
            html: customBody,
            from_name: agency?.name || 'ACG StaffLink'
          });

          testResult.success = customResult.success;
          testResult.message = customResult.success 
            ? `✅ Custom email sent to ${customTo}` 
            : `❌ Failed: ${customResult.error}`;
          testResult.details = customResult;
          break;

        default:
          throw new Error('Unknown test type');
      }

      if (testResult.success) {
        toast.success(testResult.message);
      } else {
        toast.error(testResult.message);
      }

    } catch (error) {
      testResult.success = false;
      testResult.message = `❌ Error: ${error.message}`;
      testResult.details = { error: error.message };
      toast.error(error.message);
    }

    setTestResults(prev => [testResult, ...prev].slice(0, 10));
    setTesting(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Email & Notification Tester</h2>
        <p className="text-gray-600 mt-1">Test email templates and notification workflows before UAT</p>
        <Badge className="mt-2 bg-blue-100 text-blue-800">Pre-UAT Testing Tool</Badge>
      </div>

      {/* Test Configuration */}
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-cyan-50 to-blue-50">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-cyan-600" />
            Configure Test
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Test Type Selection */}
          <div>
            <Label htmlFor="test_type">Test Type</Label>
            <Select value={testType} onValueChange={setTestType}>
              <SelectTrigger id="test_type" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shift_assignment">
                  📧 Shift Assignment (to Staff)
                </SelectItem>
                <SelectItem value="shift_confirmed_staff">
                  ✅ Shift Confirmed (to Staff)
                </SelectItem>
                <SelectItem value="shift_confirmed_client">
                  ✅ Shift Confirmed (to Client)
                </SelectItem>
                <SelectItem value="compliance_expiry">
                  ⚠️ Compliance Expiry Reminder
                </SelectItem>
                <SelectItem value="custom_email">
                  ✉️ Custom Email
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Fields based on Test Type */}
          {testType !== 'custom_email' && (
            <>
              {/* Staff Selection */}
              {['shift_assignment', 'shift_confirmed_staff', 'shift_confirmed_client', 'compliance_expiry'].includes(testType) && (
                <div>
                  <Label htmlFor="staff">Staff Member *</Label>
                  <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                    <SelectTrigger id="staff" className="mt-1">
                      <SelectValue placeholder="Select staff member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.first_name} {s.last_name} - {s.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Client Selection */}
              {['shift_assignment', 'shift_confirmed_staff', 'shift_confirmed_client'].includes(testType) && (
                <div>
                  <Label htmlFor="client">Client / Care Home *</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger id="client" className="mt-1">
                      <SelectValue placeholder="Select client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Shift Selection */}
              {['shift_assignment', 'shift_confirmed_staff', 'shift_confirmed_client'].includes(testType) && (
                <div>
                  <Label htmlFor="shift">Shift *</Label>
                  <Select value={selectedShift} onValueChange={setSelectedShift}>
                    <SelectTrigger id="shift" className="mt-1">
                      <SelectValue placeholder="Select shift..." />
                    </SelectTrigger>
                    <SelectContent>
                      {shifts.slice(0, 20).map(shift => {
                        const client = clients.find(c => c.id === shift.client_id);
                        return (
                          <SelectItem key={shift.id} value={shift.id}>
                            {client?.name} - {shift.date} ({shift.start_time}-{shift.end_time})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* Custom Email Fields */}
          {testType === 'custom_email' && (
            <>
              <div>
                <Label htmlFor="custom_to">To (Email Address) *</Label>
                <Input
                  id="custom_to"
                  type="email"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="custom_subject">Subject *</Label>
                <Input
                  id="custom_subject"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Test Email Subject"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="custom_body">Email Body (HTML) *</Label>
                <Textarea
                  id="custom_body"
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  placeholder="<p>Your HTML email content here...</p>"
                  rows={8}
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </>
          )}

          {/* Run Test Button */}
          <Button
            onClick={runTest}
            disabled={testing}
            className="w-full bg-green-600 hover:bg-green-700 h-12"
          >
            {testing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sending Test Email...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Test Results (Last 10)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {testResults.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-2 ${
                    result.success 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-red-50 border-red-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-semibold text-gray-900">
                        {result.type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <Badge className="text-xs">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </Badge>
                  </div>
                  <p className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {result.message}
                  </p>
                  {result.details.to && (
                    <p className="text-xs text-gray-600 mt-1">
                      <strong>Recipient:</strong> {result.details.to}
                    </p>
                  )}
                  {result.details.messageId && (
                    <p className="text-xs text-gray-600 mt-1">
                      <strong>Message ID:</strong> {result.details.messageId}
                    </p>
                  )}
                  {result.details.error && (
                    <p className="text-xs text-red-600 mt-2 font-mono bg-red-100 p-2 rounded">
                      {result.details.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Reference */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Testing Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">📧 What Each Test Does:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li><strong>Shift Assignment:</strong> Tests email sent to staff when assigned to a shift (FROM agency name)</li>
                <li><strong>Shift Confirmed (Staff):</strong> Tests confirmation email to staff with shift details</li>
                <li><strong>Shift Confirmed (Client):</strong> Tests confirmation email to care home (FROM ACG StaffLink)</li>
                <li><strong>Compliance Expiry:</strong> Tests reminder email for expiring documents</li>
                <li><strong>Custom Email:</strong> Send a test email with your own content</li>
              </ul>
            </div>

            <Alert className="border-blue-300 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>💡 Pro Tip:</strong> Check your spam folder if test emails don't arrive within 30 seconds. 
                All emails are sent via Resend with your configured domain.
              </AlertDescription>
            </Alert>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">🎯 UAT Checklist:</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>✅ Test all 4 main email types</li>
                <li>✅ Verify emails arrive in inbox (not spam)</li>
                <li>✅ Check email formatting on mobile and desktop</li>
                <li>✅ Confirm correct sender name appears (agency vs ACG)</li>
                <li>✅ Verify all dynamic data renders correctly</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}