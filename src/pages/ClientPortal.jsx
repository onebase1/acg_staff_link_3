
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar, Clock, Users, DollarSign, CheckCircle,
  AlertCircle, FileText, Star, Plus, X, Send, AlertTriangle,
  User, MapPin, Phone, Mail, TrendingUp, Download, Eye,
  Check, XCircle, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isFuture, isPast } from "date-fns";

export default function ClientPortal() {
  const [clientRecord, setClientRecord] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [activeTab, setActiveTab] = useState('timesheets'); // Changed default to timesheets
  const queryClient = useQueryClient();

  const [shiftRequest, setShiftRequest] = useState({
    date: '',
    start_time: '08:00',
    end_time: '20:00',
    role_required: 'care_worker',
    staff_count: 1,
    urgency: 'normal',
    requirements: ''
  });

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          console.error('❌ Not authenticated:', authError);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profile) {
          console.error('❌ Profile not found:', profileError);
          return;
        }

        setCurrentUser(profile);

        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('*');

        if (clientsError) {
          console.error('❌ Error fetching clients:', clientsError);
          return;
        }

        let userClient = null;

        if (profile.client_id) {
          userClient = clients.find(c => c.id === profile.client_id);
        }

        if (!userClient && profile.email) {
          const userEmailDomain = profile.email.split('@')[1];
          userClient = clients.find(c =>
            c.contact_person?.email?.split('@')[1] === userEmailDomain
          );
        }

        if (!userClient && profile.assigned_client_id) {
          userClient = clients.find(c => c.id === profile.assigned_client_id);
        }

        if (userClient) {
          setClientRecord(userClient);
        } else {
          toast.error('No client account found for your user. Contact your administrator.');
        }
      } catch (error) {
        console.error("Error fetching client data:", error);
        toast.error("Failed to load client data. Please try again.");
      }
    };
    fetchClientData();
  }, []);

  const { data: clientShifts = [] } = useQuery({
    queryKey: ['client-shifts', clientRecord?.id],
    queryFn: async () => {
      if (!clientRecord) return [];
      
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('client_id', clientRecord.id);
      
      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!clientRecord,
    refetchOnMount: 'always'
  });

  const { data: clientTimesheets = [] } = useQuery({
    queryKey: ['client-timesheets', clientRecord?.id],
    queryFn: async () => {
      if (!clientRecord) return [];
      
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('client_id', clientRecord.id)
        .order('shift_date', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching timesheets:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!clientRecord,
    refetchOnMount: 'always'
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*');
      
      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      return data || [];
    },
    enabled: true,
    refetchOnMount: 'always'
  });

  const { data: myInvoices = [] } = useQuery({
    queryKey: ['client-invoices', clientRecord?.id],
    queryFn: async () => {
      if (!clientRecord) return [];
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientRecord.id)
        .order('invoice_date', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching invoices:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!clientRecord,
    refetchOnMount: 'always'
  });

  const { data: agency } = useQuery({
    queryKey: ['agency', clientRecord?.agency_id],
    queryFn: async () => {
      if (!clientRecord?.agency_id) return null;
      
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', clientRecord.agency_id)
        .single();
      
      if (error) {
        console.error('❌ Error fetching agency:', error);
        return null;
      }
      return data;
    },
    enabled: !!clientRecord?.agency_id,
    refetchOnMount: 'always'
  });

  const approveTimesheetMutation = useMutation({
    mutationFn: async (timesheetId) => {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'approved',
          client_approved_at: new Date().toISOString()
        })
        .eq('id', timesheetId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['client-timesheets']);
      queryClient.invalidateQueries(['timesheets']);
      toast.success('✅ Timesheet approved!');
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    }
  });

  const rejectTimesheetMutation = useMutation({
    mutationFn: async ({ timesheetId, reason }) => {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', timesheetId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['client-timesheets']);
      queryClient.invalidateQueries(['timesheets']);
      toast.success('Timesheet rejected');
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    }
  });

  const requestShiftMutation = useMutation({
    mutationFn: async (data) => {
      const duration = calculateDuration(data.start_time, data.end_time);

      const { error } = await supabase
        .from('shifts')
        .insert({
          agency_id: clientRecord.agency_id,
          client_id: clientRecord.id,
          role_required: data.role_required,
          date: data.date,
          start_time: data.start_time,
          end_time: data.end_time,
          duration_hours: duration,
          status: 'open',
          urgency: data.urgency,
          charge_rate: clientRecord.contract_terms?.rates_by_role?.[data.role_required]?.charge_rate || 18,
          pay_rate: clientRecord.contract_terms?.rates_by_role?.[data.role_required]?.pay_rate || 15,
          notes: data.requirements,
          created_date: new Date().toISOString()
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['client-shifts']);
      setShowRequestForm(false);
      setShiftRequest({
        date: '',
        start_time: '08:00',
        end_time: '20:00',
        role_required: 'care_worker',
        staff_count: 1,
        urgency: 'normal',
        requirements: ''
      });
      toast.success('✅ Shift request submitted! The agency will assign staff soon.');
    },
    onError: (error) => {
      toast.error(`Failed to request shift: ${error.message}`);
    }
  });

  const calculateDuration = (start, end) => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    if (endMinutes < startMinutes) endMinutes += 24 * 60;
    return (endMinutes - startMinutes) / 60;
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unknown';
  };

  const getStaffDetails = (staffId) => {
    return staff.find(s => s.id === staffId);
  };

  const handleApproveTimesheet = (timesheetId) => {
    if (window.confirm('Approve this timesheet? This confirms the hours worked are accurate.')) {
      approveTimesheetMutation.mutate(timesheetId);
    }
  };

  const handleRejectTimesheet = (timesheetId) => {
    const reason = prompt('Please enter rejection reason:');
    if (reason) {
      rejectTimesheetMutation.mutate({ timesheetId, reason });
    }
  };

  const handleDownloadInvoice = (invoice) => {
    toast.info('📄 Preparing invoice download...');
    window.open(`/api/invoices/${invoice.id}/download`, '_blank');
  };

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const todayShifts = clientShifts.filter(s => s.date === todayStr);
  const upcomingShifts = clientShifts.filter(s => s.date > todayStr).sort((a, b) => a.date.localeCompare(b.date));
  const inProgressShifts = clientShifts.filter(s => s.status === 'in_progress');
  const openShifts = clientShifts.filter(s => s.status === 'open' && s.date >= todayStr);

  // Timesheet filtering
  const pendingTimesheets = clientTimesheets.filter(t => t.status === 'submitted' || t.status === 'draft');
  const approvedTimesheets = clientTimesheets.filter(t => t.status === 'approved' || t.status === 'invoiced' || t.status === 'paid');

  // Services summary calculations
  const last30DaysDate = new Date();
  last30DaysDate.setDate(last30DaysDate.getDate() - 30);
  const last30DaysStr = last30DaysDate.toISOString().split('T')[0];

  const recentTimesheets = approvedTimesheets.filter(t => t.shift_date >= last30DaysStr);
  const totalHoursLast30Days = recentTimesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0);
  const totalCostLast30Days = recentTimesheets.reduce((sum, t) => sum + (t.client_charge_amount || 0), 0);
  const uniqueStaffLast30Days = new Set(recentTimesheets.map(t => t.staff_id)).size;

  const stats = {
    todayShifts: todayShifts.length,
    inProgress: inProgressShifts.length,
    openShifts: openShifts.length,
    upcomingShifts: upcomingShifts.length,
    pendingTimesheets: pendingTimesheets.length,
    totalSpent: myInvoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.total || 0), 0),
    outstandingBalance: myInvoices
      .filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + (i.balance_due || 0), 0),
    overdueInvoices: myInvoices.filter(i => {
      if (i.status === 'paid') return false;
      const dueDate = new Date(i.due_date);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return new Date(dueDate) < now;
    }).length
  };

  if (!clientRecord) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white p-8 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {agency?.logo_url && (
              <img 
                src={agency.logo_url} 
                alt={agency.name}
                className="h-16 w-16 rounded-lg object-contain bg-white p-2"
              />
            )}
            <div>
              <h1 className="text-4xl font-bold mb-2">{clientRecord.name}</h1>
              <p className="text-cyan-100 text-lg">Client Portal - Real-time Management</p>
              {agency && (
                <p className="text-cyan-200 text-sm mt-1">Powered by {agency.name}</p>
              )}
            </div>
          </div>
          <Button
            onClick={() => setShowRequestForm(true)}
            size="lg"
            className="bg-white text-blue-700 hover:bg-gray-100 text-lg px-8 py-6"
          >
            <Plus className="w-6 h-6 mr-2" />
            Request Shift
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {stats.pendingTimesheets > 0 && (
        <Alert className="border-yellow-300 bg-yellow-50 border-2">
          <AlertTriangle className="h-6 w-6 text-yellow-600 animate-pulse" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-yellow-900 text-lg">
                  ⏳ {stats.pendingTimesheets} timesheet{stats.pendingTimesheets > 1 ? 's' : ''} awaiting your approval
                </p>
                <p className="text-yellow-700 mt-1">
                  Please review and approve to ensure timely invoicing and payment.
                </p>
              </div>
              <Button
                onClick={() => setActiveTab('timesheets')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Review Now
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {stats.overdueInvoices > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  🔴 {stats.overdueInvoices} invoice{stats.overdueInvoices > 1 ? 's' : ''} overdue
                </p>
                <p className="text-sm mt-1">
                  Please arrange payment to avoid service disruption.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('invoices')}
                className="text-white border-white hover:bg-red-700"
              >
                View Invoices
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('timesheets')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-yellow-600" />
              {stats.pendingTimesheets > 0 && (
                <Badge className="bg-yellow-500 text-white animate-pulse">ACTION NEEDED</Badge>
              )}
            </div>
            <p className="text-4xl font-bold text-gray-900">{stats.pendingTimesheets}</p>
            <p className="text-sm text-gray-600 mt-1">Pending Approval</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('summary')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-4xl font-bold text-gray-900">{totalHoursLast30Days.toFixed(0)}</p>
            <p className="text-sm text-gray-600 mt-1">Hours (30 days)</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab('invoices')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">£{stats.totalSpent.toFixed(0)}</p>
            <p className="text-sm text-gray-600 mt-1">Total Paid</p>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${stats.outstandingBalance > 0 ? "border-2 border-orange-300" : ""}`} onClick={() => setActiveTab('invoices')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-orange-600" />
              {stats.overdueInvoices > 0 && (
                <Badge className="bg-red-600 text-white">OVERDUE</Badge>
              )}
            </div>
            <p className="text-3xl font-bold text-orange-600">£{stats.outstandingBalance.toFixed(0)}</p>
            <p className="text-sm text-gray-600 mt-1">Outstanding</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={activeTab === 'timesheets' ? 'default' : 'outline'}
              onClick={() => setActiveTab('timesheets')}
              className="relative"
            >
              Pending Timesheets ({pendingTimesheets.length})
              {stats.pendingTimesheets > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>
              )}
            </Button>
            <Button
              variant={activeTab === 'summary' ? 'default' : 'outline'}
              onClick={() => setActiveTab('summary')}
            >
              Services Summary
            </Button>
            <Button
              variant={activeTab === 'invoices' ? 'default' : 'outline'}
              onClick={() => setActiveTab('invoices')}
              className="relative"
            >
              Invoices ({myInvoices.length})
              {stats.overdueInvoices > 0 && (
                <Badge className="ml-2 bg-red-600 text-white text-xs">
                  {stats.overdueInvoices}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeTab === 'shifts' ? 'default' : 'outline'}
              onClick={() => setActiveTab('shifts')}
            >
              Today's Shifts ({todayShifts.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* TIMESHEETS TAB */}
          {activeTab === 'timesheets' && (
            <div className="p-6">
              {pendingTimesheets.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
                  <p className="text-gray-600">No timesheets awaiting your approval.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-900">
                      <strong>💡 Tip:</strong> Review the hours worked and approve timesheets to authorize payment and invoicing.
                    </p>
                  </div>

                  {pendingTimesheets.map(timesheet => {
                    const staffMember = getStaffDetails(timesheet.staff_id);
                    return (
                      <div key={timesheet.id} className="border-2 border-yellow-200 rounded-lg p-6 bg-yellow-50 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-lg text-gray-900">
                                {getStaffName(timesheet.staff_id)}
                              </h3>
                              <Badge className="bg-yellow-100 text-yellow-800">
                                Awaiting Approval
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              📅 {format(new Date(timesheet.shift_date), 'EEEE, MMMM d, yyyy')}
                            </p>
                            {staffMember?.role && (
                              <p className="text-sm text-gray-600 capitalize">
                                👤 {staffMember.role.replace('_', ' ')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 mb-4 p-4 bg-white rounded border border-yellow-300">
                          <div>
                            <p className="text-xs text-gray-600">Clock In</p>
                            <p className="font-semibold text-gray-900">
                              {timesheet.clock_in_time ? format(new Date(timesheet.clock_in_time), 'HH:mm') : '--'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Clock Out</p>
                            <p className="font-semibold text-gray-900">
                              {timesheet.clock_out_time ? format(new Date(timesheet.clock_out_time), 'HH:mm') : '--'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Total Hours</p>
                            <p className="font-bold text-xl text-gray-900">
                              {timesheet.total_hours || 0}h
                            </p>
                          </div>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                          <p className="text-sm text-green-900">
                            <strong>Cost for this shift:</strong> £{(timesheet.client_charge_amount || 0).toFixed(2)}
                          </p>
                        </div>

                        {timesheet.geofence_validated && (
                          <div className="flex items-center gap-2 text-sm text-green-600 mb-4">
                            <MapPin className="w-4 h-4" />
                            <span>✓ GPS location verified at clock-in</span>
                          </div>
                        )}

                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleApproveTimesheet(timesheet.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            disabled={approveTimesheetMutation.isPending}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Approve Timesheet
                          </Button>
                          <Button
                            onClick={() => handleRejectTimesheet(timesheet.id)}
                            variant="outline"
                            className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                            disabled={rejectTimesheetMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SERVICES SUMMARY TAB */}
          {activeTab === 'summary' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Services Summary (Last 30 Days)</h2>
              
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                  <CardContent className="p-6">
                    <Clock className="w-8 h-8 text-blue-600 mb-3" />
                    <p className="text-3xl font-bold text-blue-900">{totalHoursLast30Days.toFixed(1)}</p>
                    <p className="text-sm text-blue-700 mt-1">Total Hours Worked</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardContent className="p-6">
                    <Users className="w-8 h-8 text-purple-600 mb-3" />
                    <p className="text-3xl font-bold text-purple-900">{uniqueStaffLast30Days}</p>
                    <p className="text-sm text-purple-700 mt-1">Staff Members Used</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardContent className="p-6">
                    <DollarSign className="w-8 h-8 text-green-600 mb-3" />
                    <p className="text-3xl font-bold text-green-900">£{totalCostLast30Days.toFixed(2)}</p>
                    <p className="text-sm text-green-700 mt-1">Total Cost</p>
                  </CardContent>
                </Card>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Shifts</h3>
              <div className="space-y-3">
                {recentTimesheets.slice(0, 10).map(timesheet => (
                  <div key={timesheet.id} className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{getStaffName(timesheet.staff_id)}</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(timesheet.shift_date), 'MMM d, yyyy')} • {timesheet.total_hours}h
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">£{(timesheet.client_charge_amount || 0).toFixed(2)}</p>
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        {timesheet.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INVOICES TAB */}
          {activeTab === 'invoices' && (
            <div className="p-6">
              {myInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Invoices Yet</h3>
                  <p className="text-gray-600">Invoices will appear here after shifts are completed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myInvoices.map(invoice => (
                    <div key={invoice.id} className="border-2 rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-xl text-gray-900">{invoice.invoice_number}</h3>
                            <Badge className={
                              invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                              stats.overdueInvoices > 0 && new Date(invoice.due_date) < today && invoice.status !== 'paid' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {stats.overdueInvoices > 0 && new Date(invoice.due_date) < today && invoice.status !== 'paid' ? 'overdue' : invoice.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>📅 Period: {invoice.period_start} - {invoice.period_end}</p>
                            <p>⏰ Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}</p>
                            <p>📋 {invoice.line_items?.length || 0} shift(s)</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-gray-900">
                            £{invoice.total.toFixed(2)}
                          </p>
                          {invoice.balance_due > 0 && (
                            <p className="text-sm text-orange-600 font-semibold mt-1">
                              Due: £{invoice.balance_due.toFixed(2)}
                            </p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/invoices/${invoice.id}`, '_blank')}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDownloadInvoice(invoice)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TODAY'S SHIFTS TAB */}
          {activeTab === 'shifts' && (
            <div className="p-6">
              {todayShifts.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Shifts Today</h3>
                  <p className="text-gray-600 mb-4">No shifts scheduled for today</p>
                  <Button onClick={() => setShowRequestForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Request Shift
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayShifts.map(shift => {
                    const staffMember = getStaffDetails(shift.assigned_staff_id);
                    return (
                      <div key={shift.id} className="border rounded-lg p-6 bg-white hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-lg">
                                {shift.start_time} - {shift.end_time}
                              </h3>
                              <Badge className={
                                shift.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                shift.status === 'in_progress' ? 'bg-green-500 text-white animate-pulse' :
                                shift.status === 'open' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {shift.status === 'in_progress' ? '🟢 LIVE NOW' : shift.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 capitalize mb-2">
                              👔 {shift.role_required.replace('_', ' ')}
                            </p>
                          </div>
                        </div>

                        {staffMember ? (
                          <div className="bg-blue-50 border border-blue-200 rounded p-4">
                            <p className="font-semibold text-blue-900 mb-2">
                              👤 {staffMember.first_name} {staffMember.last_name}
                            </p>
                            {staffMember.phone && (
                              <p className="text-sm text-blue-700">
                                📞 {staffMember.phone}
                              </p>
                            )}
                            {staffMember.rating && (
                              <p className="text-sm text-blue-700">
                                ⭐ {staffMember.rating.toFixed(1)}/5.0
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="bg-orange-50 border border-orange-200 rounded p-4">
                            <p className="text-orange-900 font-semibold">⚠️ Staff not yet assigned</p>
                            <p className="text-sm text-orange-700 mt-1">Agency is working to fill this shift</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shift Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-6">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="bg-blue-50 border-b sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Request New Shift
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRequestForm(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); requestShiftMutation.mutate(shiftRequest); }} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={shiftRequest.date}
                      onChange={(e) => setShiftRequest({ ...shiftRequest, date: e.target.value })}
                      min={todayStr}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="role">Role Required *</Label>
                    <select
                      id="role"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={shiftRequest.role_required}
                      onChange={(e) => setShiftRequest({ ...shiftRequest, role_required: e.target.value })}
                    >
                      <option value="care_worker">Care Worker</option>
                      <option value="nurse">Nurse</option>
                      <option value="hca">Healthcare Assistant</option>
                      <option value="senior_care_worker">Senior Care Worker</option>
                      <option value="specialist_nurse">Specialist Nurse</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="start_time">Start Time *</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={shiftRequest.start_time}
                      onChange={(e) => setShiftRequest({ ...shiftRequest, start_time: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_time">End Time *</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={shiftRequest.end_time}
                      onChange={(e) => setShiftRequest({ ...shiftRequest, end_time: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="urgency">Urgency</Label>
                    <select
                      id="urgency"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={shiftRequest.urgency}
                      onChange={(e) => setShiftRequest({ ...shiftRequest, urgency: e.target.value })}
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent (24h)</option>
                      <option value="critical">Critical (Same Day)</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="staff_count">Number of Staff</Label>
                    <Input
                      id="staff_count"
                      type="number"
                      min="1"
                      max="10"
                      value={shiftRequest.staff_count}
                      onChange={(e) => setShiftRequest({ ...shiftRequest, staff_count: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="requirements">Special Requirements</Label>
                    <Textarea
                      id="requirements"
                      placeholder="Any specific skills, certifications, or preferences..."
                      value={shiftRequest.requirements}
                      onChange={(e) => setShiftRequest({ ...shiftRequest, requirements: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRequestForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!shiftRequest.date || requestShiftMutation.isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {requestShiftMutation.isLoading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
