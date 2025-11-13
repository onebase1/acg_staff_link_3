import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock, Send, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Calendar, Bell, Zap, User, Building2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function TestShiftReminders() {
  const [sending, setSending] = useState(new Set());
  const [results, setResults] = useState({});
  const [runningEngine, setRunningEngine] = useState(false);
  const queryClient = useQueryClient();

  const { data: shifts = [], isLoading, refetch } = useQuery({
    queryKey: ['upcoming-shifts-reminders'],
    queryFn: async () => {
      console.log('🔄 Fetching shifts...');
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .in('status', ['confirmed', 'assigned']);

      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }

      const allShifts = data || [];
      
      const now = new Date();
      console.log('📅 Current time:', now.toISOString());
      
      // Filter and sort upcoming shifts
      const processed = allShifts
        .map(shift => {
          const shiftDate = new Date(shift.date);
          const [startHour, startMin] = shift.start_time.split(':').map(Number);
          const shiftStart = new Date(shiftDate);
          shiftStart.setHours(startHour, startMin, 0, 0);
          
          const hoursUntil = (shiftStart.getTime() - now.getTime()) / (1000 * 60 * 60);
          
          return {
            ...shift,
            shiftStart,
            hoursUntil,
            isPast: hoursUntil < 0,
            needs24hReminder: hoursUntil >= 23 && hoursUntil <= 25 && !shift.reminder_24h_sent,
            needs2hReminder: hoursUntil >= 1.5 && hoursUntil <= 2.5 && !shift.reminder_2h_sent,
            can24hReminder: hoursUntil >= 20 && hoursUntil <= 30 && !shift.reminder_24h_sent,
            can2hReminder: hoursUntil >= 1 && hoursUntil <= 4 && !shift.reminder_2h_sent
          };
        })
        .filter(s => !s.isPast)
        .sort((a, b) => a.hoursUntil - b.hoursUntil);
      
      console.log(`✅ Found ${processed.length} upcoming shifts`);
      return processed;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('*');
      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      return data || [];
    }
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
    }
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agencies').select('*');
      if (error) {
        console.error('❌ Error fetching agencies:', error);
        return [];
      }
      return data || [];
    }
  });

  const sendReminderMutation = useMutation({
    mutationFn: async ({ shift, type, force = false }) => {
      console.log(`📤 Sending ${type} reminder for shift ${shift.id} (force: ${force})`);
      
      const staffMember = staff.find(s => s.id === shift.assigned_staff_id);
      const client = clients.find(c => c.id === shift.client_id);
      const agency = agencies.find(a => a.id === shift.agency_id);

      if (!staffMember?.phone) {
        throw new Error('Staff has no phone number');
      }

      const agencyName = agency?.name || 'Your Agency';
      const locationText = shift.work_location_within_site ? ` (${shift.work_location_within_site})` : '';

      let message;
      if (type === '24h') {
        message = `🔔 REMINDER [${agencyName}]: You have a shift TOMORROW at ${client?.name}${locationText}, ${shift.start_time}-${shift.end_time}. See you there!`;
      } else {
        message = `🏥 SHIFT STARTING SOON [${agencyName}]: ${client?.name}${locationText} in 2 HOURS (${shift.start_time}). Arrive 10 min early. Good luck! 👍`;
      }

      console.log(`📱 Sending to ${staffMember.phone}`);
      console.log(`💬 Message: ${message}`);

      // Send SMS + WhatsApp in parallel
      const [smsResult, whatsappResult] = await Promise.allSettled([
        supabase.functions.invoke('send-sms', {
          body: {
            to: staffMember.phone,
            message
          }
        }),
        supabase.functions.invoke('send-whatsapp', {
          body: {
            to: staffMember.phone,
            message
          }
        })
      ]);

      console.log('📊 SMS Result:', smsResult);
      console.log('📊 WhatsApp Result:', whatsappResult);

      const smsSuccess = smsResult.status === 'fulfilled' && smsResult.value?.data?.success;
      const whatsappSuccess = whatsappResult.status === 'fulfilled' && whatsappResult.value?.data?.success;

      if (!smsSuccess && !whatsappSuccess) {
        throw new Error('Both SMS and WhatsApp failed');
      }

      // Update shift with reminder flag (even if forced)
      const updateData = type === '24h' 
        ? { reminder_24h_sent: true, reminder_24h_sent_at: new Date().toISOString() }
        : { reminder_2h_sent: true, reminder_2h_sent_at: new Date().toISOString() };

      const { error: updateError } = await supabase
        .from('shifts')
        .update(updateData)
        .eq('id', shift.id);

      if (updateError) {
        throw updateError;
      }
      console.log(`✅ Updated shift ${shift.id} with reminder flag`);

      return { smsSuccess, whatsappSuccess, staffName: `${staffMember.first_name} ${staffMember.last_name}` };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['upcoming-shifts-reminders']);
      setResults(prev => ({
        ...prev,
        [variables.shift.id]: {
          success: true,
          sms: data.smsSuccess,
          whatsapp: data.whatsappSuccess,
          staffName: data.staffName,
          type: variables.type
        }
      }));
      
      toast.success(
        `✅ Reminder sent to ${data.staffName}`,
        { description: `SMS: ${data.smsSuccess ? '✓' : '✗'} | WhatsApp: ${data.whatsappSuccess ? '✓' : '✗'}` }
      );
    },
    onError: (error, variables) => {
      console.error('❌ Send reminder error:', error);
      setResults(prev => ({
        ...prev,
        [variables.shift.id]: {
          success: false,
          error: error.message
        }
      }));
      toast.error(`Failed: ${error.message}`);
    }
  });

  const handleSendReminder = async (shift, type, force = false) => {
    const key = `${shift.id}-${type}`;
    setSending(prev => new Set([...prev, key]));
    
    try {
      await sendReminderMutation.mutateAsync({ shift, type, force });
    } finally {
      setSending(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const runEngineManually = async () => {
    setRunningEngine(true);
    try {
      console.log('🚀 Running reminder engine manually...');
      toast.info('🔄 Running reminder engine...');
      
      const { data, error } = await supabase.functions.invoke('shift-reminder-engine');
      if (error) {
        throw error;
      }
      const response = { data };
      console.log('📊 Engine response:', response);
      
      if (response.data?.success) {
        toast.success(
          `✅ Reminder engine complete`,
          { 
            description: `24h: ${response.data.results.reminders_24h_sent} | 2h: ${response.data.results.reminders_2h_sent}`,
            duration: 5000
          }
        );
        await refetch();
      } else {
        toast.error('Engine run failed');
      }
    } catch (error) {
      console.error('❌ Engine error:', error);
      toast.error(`Engine error: ${error.message}`);
    } finally {
      setRunningEngine(false);
    }
  };

  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    toast.info('Refreshing shifts...');
    await refetch();
    toast.success('✅ Refreshed');
  };

  const getStaffName = (staffId) => {
    const s = staff.find(st => st.id === staffId);
    return s ? `${s.first_name} ${s.last_name}` : 'Unknown';
  };

  const getClientName = (clientId) => {
    const c = clients.find(cl => cl.id === clientId);
    return c?.name || 'Unknown';
  };

  const needsReminder = shifts.filter(s => s.needs24hReminder || s.needs2hReminder);
  const upcoming = shifts.filter(s => !s.needs24hReminder && !s.needs2hReminder);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 text-cyan-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shift Reminders - Manual Testing</h2>
          <p className="text-gray-600 mt-1">
            Test and send shift reminders manually until cron automation is set up
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button 
            onClick={runEngineManually} 
            disabled={runningEngine}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {runningEngine ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Run Engine Now
          </Button>
        </div>
      </div>

      {/* Cron Setup Instructions */}
      <Alert className="border-orange-300 bg-orange-50">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <AlertDescription>
          <p className="font-bold text-orange-900 mb-2">🚨 Cron Job Not Running</p>
          <p className="text-sm text-orange-800 mb-2">
            The reminder engine exists but has no automatic schedule. Set up a cron job:
          </p>
          <div className="bg-white p-3 rounded border border-orange-200 font-mono text-xs">
            <p className="mb-1"><strong>Function URL:</strong></p>
            <p className="text-blue-600 break-all">
              Dashboard → Functions → shiftReminderEngine → Copy URL
            </p>
            <p className="mt-2"><strong>Schedule:</strong> Every hour (0 * * * *)</p>
            <p className="mt-2"><strong>Cron Service:</strong> cron-job.org (free) or EasyCron</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-orange-700 font-semibold">Needs Reminders</p>
                <p className="text-3xl font-bold text-orange-900">{needsReminder.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-700 font-semibold">Upcoming Shifts</p>
                <p className="text-3xl font-bold text-blue-900">{upcoming.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-green-700 font-semibold">24h Reminders Sent</p>
                <p className="text-3xl font-bold text-green-900">
                  {shifts.filter(s => s.reminder_24h_sent).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-300 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-700 font-semibold">2h Reminders Sent</p>
                <p className="text-3xl font-bold text-purple-900">
                  {shifts.filter(s => s.reminder_2h_sent).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shifts Needing Reminders NOW */}
      {needsReminder.length > 0 && (
        <Card className="border-2 border-orange-400">
          <CardHeader className="bg-orange-50 border-b">
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <Bell className="w-5 h-5" />
              🚨 Shifts Needing Reminders NOW
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {needsReminder.map(shift => {
                const result = results[shift.id];
                const sending24h = sending.has(`${shift.id}-24h`);
                const sending2h = sending.has(`${shift.id}-2h`);

                return (
                  <Card key={shift.id} className="border-orange-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold">{getStaffName(shift.assigned_staff_id)}</span>
                            {shift.needs24hReminder && (
                              <Badge className="bg-orange-500 text-white">24h Window</Badge>
                            )}
                            {shift.needs2hReminder && (
                              <Badge className="bg-red-500 text-white">2h Window</Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3 h-3 text-gray-400" />
                              <span>{getClientName(shift.client_id)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span>{format(new Date(shift.date), 'EEE, MMM d')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span>{shift.start_time} - {shift.end_time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Bell className="w-3 h-3 text-gray-400" />
                              <span className="font-bold text-orange-600">
                                {shift.hoursUntil.toFixed(1)}h until start
                              </span>
                            </div>
                          </div>

                          {shift.work_location_within_site && (
                            <p className="text-xs text-gray-600 mt-2">
                              📍 {shift.work_location_within_site}
                            </p>
                          )}

                          {result && (
                            <div className={`mt-2 p-2 rounded text-xs ${
                              result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                            }`}>
                              {result.success ? (
                                <>✅ Sent to {result.staffName} (SMS: {result.sms ? '✓' : '✗'} | WhatsApp: {result.whatsapp ? '✓' : '✗'})</>
                              ) : (
                                <>❌ {result.error}</>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          {shift.needs24hReminder && (
                            <Button
                              size="sm"
                              onClick={() => handleSendReminder(shift, '24h')}
                              disabled={sending24h || result?.success}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              {sending24h ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : result?.success && result.type === '24h' ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              <span className="ml-2">Send 24h</span>
                            </Button>
                          )}

                          {shift.needs2hReminder && (
                            <Button
                              size="sm"
                              onClick={() => handleSendReminder(shift, '2h')}
                              disabled={sending2h || result?.success}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {sending2h ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : result?.success && result.type === '2h' ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              <span className="ml-2">Send 2h</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Upcoming Shifts - FORCE SEND ENABLED */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            All Upcoming Shifts (Force Send Enabled)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {shifts.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No upcoming shifts found</p>
          ) : (
            <div className="space-y-2">
              {shifts.map(shift => {
                const result = results[shift.id];
                const sending24h = sending.has(`${shift.id}-24h`);
                const sending2h = sending.has(`${shift.id}-2h`);

                return (
                  <Card key={shift.id} className="border-gray-200">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="font-semibold">{getStaffName(shift.assigned_staff_id)}</span>
                            <span className="text-gray-400">→</span>
                            <span>{getClientName(shift.client_id)}</span>
                            <span className="text-gray-400">•</span>
                            <span>{format(new Date(shift.date), 'EEE, MMM d')}</span>
                            <span className="text-gray-400">•</span>
                            <span>{shift.start_time}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {shift.hoursUntil.toFixed(1)}h until start
                            {shift.reminder_24h_sent && <span className="ml-2 text-green-600">✅ 24h sent</span>}
                            {shift.reminder_2h_sent && <span className="ml-2 text-green-600">✅ 2h sent</span>}
                          </div>
                          {result && (
                            <div className={`mt-1 text-xs ${
                              result.success ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {result.success ? (
                                <>✅ Sent (SMS: {result.sms ? '✓' : '✗'} | WhatsApp: {result.whatsapp ? '✓' : '✗'})</>
                              ) : (
                                <>❌ {result.error}</>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          {!shift.reminder_24h_sent && (
                            <Button
                              size="sm"
                              onClick={() => handleSendReminder(shift, '24h', true)}
                              disabled={sending24h}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {sending24h ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              <span className="ml-1">Force 24h</span>
                            </Button>
                          )}
                          {!shift.reminder_2h_sent && (
                            <Button
                              size="sm"
                              onClick={() => handleSendReminder(shift, '2h', true)}
                              disabled={sending2h}
                              className="bg-indigo-600 hover:bg-indigo-700"
                            >
                              {sending2h ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              <span className="ml-1">Force 2h</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}