import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Send, Mail, MessageSquare, Smartphone, CheckCircle, 
  AlertCircle, Loader2, Sparkles, User
} from "lucide-react";
import NotificationService from "../components/notifications/NotificationService";
import { toast } from "sonner";

export default function TestNotifications() {
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);

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

  const { data: compliance = [] } = useQuery({
    queryKey: ['compliance'],
    queryFn: async () => {
      const { data, error } = await supabase.from('compliance').select('*');
      if (error) {
        console.error('❌ Error fetching compliance:', error);
        return [];
      }
      return data || [];
    },
    initialData: []
  });

  const activeStaff = staff.filter(s => s.status === 'active').slice(0, 5);

  const sendTestEmails = async () => {
    setSending(true);
    setResults([]);
    const testResults = [];

    for (const staffMember of activeStaff) {
      try {
        // Get a sample shift and client
        const sampleShift = shifts[0] || {
          date: '2025-11-15',
          start_time: '08:00',
          end_time: '20:00',
          role_required: 'Healthcare Assistant',
          charge_rate: 18.5,
          duration_hours: 12
        };

        const sampleClient = clients[0] || {
          name: 'Riverside Care Home',
          address: {
            line1: '45 Riverside Road',
            city: 'London',
            postcode: 'E1 7AB'
          }
        };

        // Send shift assignment email
        const result = await NotificationService.notifyShiftAssignment({
          staff: staffMember,
          shift: sampleShift,
          client: sampleClient
        });

        testResults.push({
          staff: `${staffMember.first_name} ${staffMember.last_name}`,
          email: staffMember.email,
          type: 'Shift Assignment',
          status: result.success ? 'success' : 'failed',
          message: result.success ? 'Email sent successfully' : result.error
        });
      } catch (error) {
        testResults.push({
          staff: `${staffMember.first_name} ${staffMember.last_name}`,
          email: staffMember.email,
          type: 'Shift Assignment',
          status: 'failed',
          message: error.message
        });
      }
    }

    setResults(testResults);
    setSending(false);
    
    const successCount = testResults.filter(r => r.status === 'success').length;
    if (successCount > 0) {
      toast.success(`${successCount} test emails sent successfully!`);
    }
  };

  const sendUrgentShiftTest = async () => {
    setSending(true);
    const testResults = [];

    const testStaff = activeStaff[0];
    if (!testStaff) {
      toast.error('No active staff found for testing');
      setSending(false);
      return;
    }

    try {
      const sampleShift = shifts[0] || {
        date: '2025-11-15',
        start_time: '18:00',
        end_time: '22:00',
        role_required: 'Nurse',
        charge_rate: 22.0,
        duration_hours: 4
      };

      const sampleClient = clients[0] || {
        name: 'Riverside Care Home'
      };

      const results = await NotificationService.notifyUrgentShift({
        staff: testStaff,
        shift: sampleShift,
        client: sampleClient
      });

      results.forEach((result, idx) => {
        const channel = idx === 0 ? 'SMS' : 'WhatsApp';
        testResults.push({
          staff: `${testStaff.first_name} ${testStaff.last_name}`,
          email: testStaff.phone,
          type: `Urgent Shift - ${channel}`,
          status: result.status === 'fulfilled' && result.value.success ? 'success' : 'failed',
          message: result.status === 'fulfilled' && result.value.success ? 'Message sent' : 'Failed to send'
        });
      });
    } catch (error) {
      testResults.push({
        staff: `${testStaff.first_name} ${testStaff.last_name}`,
        email: testStaff.phone,
        type: 'Urgent Shift',
        status: 'failed',
        message: error.message
      });
    }

    setResults(testResults);
    setSending(false);
    toast.success('Urgent shift notifications sent!');
  };

  const sendComplianceReminder = async () => {
    setSending(true);
    const testResults = [];

    const testStaff = activeStaff[0];
    if (!testStaff) {
      toast.error('No active staff found for testing');
      setSending(false);
      return;
    }

    try {
      const mockDocument = {
        document_name: 'DBS Certificate',
        expiry_date: '2025-12-15'
      };

      const results = await NotificationService.notifyComplianceExpiry({
        staff: testStaff,
        document: mockDocument,
        days_until_expiry: 30
      });

      results.forEach((result, idx) => {
        const channel = idx === 0 ? 'Email' : 'SMS';
        testResults.push({
          staff: `${testStaff.first_name} ${testStaff.last_name}`,
          email: idx === 0 ? testStaff.email : testStaff.phone,
          type: `Compliance Reminder - ${channel}`,
          status: result.status === 'fulfilled' && result.value.success ? 'success' : 'failed',
          message: result.status === 'fulfilled' && result.value.success ? 'Sent' : 'Failed'
        });
      });
    } catch (error) {
      testResults.push({
        staff: `${testStaff.first_name} ${testStaff.last_name}`,
        email: testStaff.email,
        type: 'Compliance Reminder',
        status: 'failed',
        message: error.message
      });
    }

    setResults(testResults);
    setSending(false);
    toast.success('Compliance reminders sent!');
  };

  const testAIGeneration = async () => {
    setSending(true);
    
    try {
      const result = await NotificationService.generateShiftDescription({
        role: 'Healthcare Assistant',
        client_name: 'Riverside Care Home',
        shift_type: 'Night shift',
        requirements: 'Dementia care experience preferred, patient with wandering behavior'
      });

      if (result.success) {
        setResults([{
          staff: 'AI Test',
          email: 'N/A',
          type: 'AI Shift Description',
          status: 'success',
          message: result.description
        }]);
        toast.success('AI description generated!');
      } else {
        toast.error('AI generation failed');
      }
    } catch (error) {
      toast.error(error.message);
    }

    setSending(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Notification Testing Center</h2>
        <p className="text-gray-600 mt-1">Test email, SMS, WhatsApp, and AI integrations before stakeholder demo</p>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Testing Strategy:</strong> All emails use g.basera5+[name]@gmail.com format. 
          Check your Gmail inbox - messages will be grouped by sender and you can filter by "+alex", "+sarah", etc.
        </AlertDescription>
      </Alert>

      {/* Test Staff Overview */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Test Staff Pool ({activeStaff.length} active)</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            {activeStaff.map((staffMember, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="font-semibold text-gray-900">
                    {staffMember.first_name} {staffMember.last_name}
                  </p>
                  <p className="text-sm text-gray-600">{staffMember.email}</p>
                  <Badge variant="outline" className="text-xs mt-1 capitalize">
                    {staffMember.role.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Mail className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Shift Assignment Emails</h3>
            <p className="text-sm text-gray-600 mb-4">
              Send test shift assignment emails to all active staff
            </p>
            <Button 
              onClick={sendTestEmails}
              disabled={sending || activeStaff.length === 0}
              className="w-full"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Test Emails
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <MessageSquare className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Urgent Shift Alert</h3>
            <p className="text-sm text-gray-600 mb-4">
              Test SMS + WhatsApp urgent shift notification
            </p>
            <Button 
              onClick={sendUrgentShiftTest}
              disabled={sending || activeStaff.length === 0}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Urgent Alert
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Smartphone className="w-12 h-12 text-orange-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Compliance Reminder</h3>
            <p className="text-sm text-gray-600 mb-4">
              Test email + SMS compliance expiry notification
            </p>
            <Button 
              onClick={sendComplianceReminder}
              disabled={sending || activeStaff.length === 0}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 mr-2" />
                  Send Reminder
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">AI Description</h3>
            <p className="text-sm text-gray-600 mb-4">
              Test OpenAI shift description generator
            </p>
            <Button 
              onClick={testAIGeneration}
              disabled={sending}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate AI Text
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {results.map((result, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${result.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="font-semibold text-gray-900">{result.staff}</p>
                        <p className="text-sm text-gray-600">{result.email}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{result.message}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {result.type}
                    </Badge>
                    {result.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="border-2 border-indigo-200 bg-indigo-50">
        <CardHeader className="border-b bg-indigo-100">
          <CardTitle className="text-indigo-900">Pre-Stakeholder Testing Checklist</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div>
                <p className="font-semibold text-indigo-900">1. Test Email Delivery</p>
                <p className="text-sm text-indigo-700">Send shift assignment emails, check Gmail inbox for all +name variants</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div>
                <p className="font-semibold text-indigo-900">2. Test SMS/WhatsApp</p>
                <p className="text-sm text-indigo-700">Send urgent alerts, verify messages arrive on your phone</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div>
                <p className="font-semibold text-indigo-900">3. Test AI Generation</p>
                <p className="text-sm text-indigo-700">Generate shift descriptions, verify quality and professionalism</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div>
                <p className="font-semibold text-indigo-900">4. Review Email Design</p>
                <p className="text-sm text-indigo-700">Check that emails are mobile-responsive and branded correctly</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div>
                <p className="font-semibold text-indigo-900">5. Test Multi-Channel Delivery</p>
                <p className="text-sm text-indigo-700">Verify that urgent alerts send via both SMS AND WhatsApp</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}