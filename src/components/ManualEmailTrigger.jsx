/**
 * Manual Email Trigger Component
 * 
 * Allows agency admins to manually send:
 * - Weekly Client Summary emails
 * - Batch Shift Confirmation emails
 * 
 * Used when clients call mid-week requesting schedule updates.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Send, Calendar, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export default function ManualEmailTrigger({ agencyId }) {
  const [selectedClient, setSelectedClient] = useState('');
  const [emailType, setEmailType] = useState('weekly_summary');
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(null);

  // Fetch clients for this agency
  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ['agency-clients', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, status')
        .eq('agency_id', agencyId)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!agencyId
  });

  const handleSendEmail = async () => {
    if (!selectedClient || !emailType) {
      toast.error('Please select a client and email type');
      return;
    }

    const client = clients?.find(c => c.id === selectedClient);
    if (!client) {
      toast.error('Client not found');
      return;
    }

    setSending(true);
    try {
      let response;

      if (emailType === 'weekly_summary') {
        // Trigger monthly alignment summary for specific client
        response = await supabase.functions.invoke('weekly-client-summary', {
          body: {
            manual_trigger: true,
            client_id: selectedClient,
            agency_id: agencyId
          }
        });
      } else if (emailType === 'batch_confirmation') {
        // Trigger batch confirmation (uses notification queue)
        response = await supabase.functions.invoke('notification-digest-engine', {
          body: {
            manual_trigger: true,
            client_id: selectedClient,
            agency_id: agencyId,
            force_send: true
          }
        });
      } else if (emailType === 'daily_digest') {
        // Trigger daily digest
        response = await supabase.functions.invoke('daily-client-digest', {
          body: {
            manual_trigger: true,
            client_id: selectedClient,
            agency_id: agencyId
          }
        });
      }

      if (response.error) throw response.error;

      setLastSent({
        client: client.name,
        email: client.email,
        type: emailType,
        timestamp: new Date()
      });

      toast.success(`✅ ${emailType === 'weekly_summary' ? 'Monthly Alignment Summary' : 'Shift Confirmation'} sent to ${client.email}`);
    } catch (error) {
      console.error('Email send error:', error);
      toast.error(`Failed to send email: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-2 border-blue-300 shadow-md">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          Client Communication Automation
          <Badge className="ml-2 bg-blue-100 text-blue-800">Mission Critical</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Admin Action:</strong> Manually trigger professional client reports. Use this to provide
            immediate schedule visibility or alignment summaries outside of automated monthly/weekly cycles.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Report Type</Label>
            <Select value={emailType} onValueChange={setEmailType}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select email type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly_summary">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <span>Monthly Alignment Summary (Month-to-Date)</span>
                  </div>
                </SelectItem>
                <SelectItem value="batch_confirmation">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Batch Shift Confirmation (Who is Coming)</span>
                  </div>
                </SelectItem>
                <SelectItem value="daily_digest">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-orange-600" />
                    <span>Daily Client Digest (Ready for Tomorrow)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Recipient Client</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient} disabled={loadingClients}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={loadingClients ? "Loading clients..." : "Select client"} />
              </SelectTrigger>
              <SelectContent>
                {clients?.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{client.name}</span>
                      <span className="text-xs text-gray-400 ml-4 font-normal">{client.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Send Button */}
        <div className="flex items-center gap-4 py-2">
          <Button
            onClick={handleSendEmail}
            disabled={!selectedClient || !emailType || sending}
            className="bg-blue-600 hover:bg-blue-700 h-10 px-8 transition-all hover:scale-105 active:scale-95"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Trigger Professional Email
              </>
            )}
          </Button>

          {selectedClient && clients && (
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Sending to</span>
              <span className="text-sm text-gray-700"><strong>{clients.find(c => c.id === selectedClient)?.email}</strong></span>
            </div>
          )}
        </div>

        {/* Last Sent Confirmation */}
        {lastSent && (
          <Alert className="bg-green-50 border-green-200 animate-in fade-in slide-in-from-top-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>✅ Success!</strong> {lastSent.type === 'weekly_summary' ? 'Monthly Alignment Summary' : 'Shift Confirmation'}
              {' '}sent to <strong>{lastSent.client}</strong> ({lastSent.email})
              {' '}at {lastSent.timestamp.toLocaleTimeString()}
            </AlertDescription>
          </Alert>
        )}

        {/* Email Types Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-gray-100">
          <div className="p-4 bg-green-50/50 rounded-xl border border-green-100 hover:bg-green-50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-green-900">Monthly Alignment</h4>
            </div>
            <p className="text-sm text-green-800 leading-relaxed">
              A comprehensive summary of all shifts for the current month. Clearly distinguishes
              between actual worked hours and future scheduled shifts.
            </p>
          </div>
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 hover:bg-indigo-50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h4 className="font-semibold text-indigo-900">Batch Confirmation</h4>
            </div>
            <p className="text-sm text-indigo-800 leading-relaxed">
              Answers the client's question: <em>"Who is coming?"</em>. Groups shifts by day and role,
              listing assigned staff with their contact details.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

