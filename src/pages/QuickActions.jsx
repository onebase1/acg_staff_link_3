
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Plus, Calendar, Users, Building2, FileText, Clock, Upload,
  Zap, MessageSquare, BarChart3, Shield, DollarSign, CheckSquare,
  TrendingUp, Settings, UserPlus, MapPin, AlertTriangle
} from "lucide-react";

export default function QuickActions() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.error('❌ Not authenticated:', authError);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Profile not found:', profileError);
        setLoading(false);
        return;
      }

      setUser(profile);
      setLoading(false);
    };
    fetchUser();
  }, []);

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', user?.agency_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('agency_id', user?.agency_id)
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.agency_id,
    refetchOnMount: 'always'
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets', user?.agency_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('agency_id', user?.agency_id)
        .order('created_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching timesheets:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.agency_id,
    refetchOnMount: 'always'
  });

  const isAdmin = user?.user_type === 'agency_admin' || user?.user_type === 'manager';
  const isStaff = user?.user_type === 'staff_member';

  // Calculate quick stats
  const openShifts = shifts.filter(s => s.status === 'open').length;
  const urgentOpenShifts = shifts.filter(s => s.status === 'open' && (s.urgency === 'urgent' || s.urgency === 'critical'));
  const pendingTimesheets = timesheets.filter(t => t.status === 'submitted' || t.status === 'draft').length;
  const shiftsAwaitingVerification = shifts.filter(s => s.status === 'awaiting_verification' || s.status === 'awaiting_admin_closure').length;
  const approvedTimesheetsNotInvoiced = timesheets.filter(t => t.status === 'approved' && !t.invoice_id).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
        <p className="text-gray-600 mt-1">Fast access to common tasks</p>
      </div>

      {/* Quick Action Cards - New section as per outline */}
      {isAdmin && ( // Assuming these quick action cards are primarily for admins
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create Shift */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-cyan-200" onClick={() => navigate(createPageUrl('PostShiftV2'))}>
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50">
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <span>Create Shift</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-gray-600">Post a new shift and optionally broadcast to staff</p>
            </CardContent>
          </Card>

          {/* Broadcast Urgent Shifts */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-red-200" onClick={() => navigate(createPageUrl('Shifts') + '?filter=open&urgency=urgent')}>
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <span>Broadcast Urgent Shifts</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-gray-600">View all open urgent shifts and send broadcast alerts</p>
              <Badge className="mt-2 bg-red-600 text-white">
                {urgentOpenShifts.length} urgent shifts
              </Badge>
            </CardContent>
          </Card>

          {/* Approve Timesheets */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200" onClick={() => navigate(createPageUrl('Timesheets') + '?filter=submitted')}>
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <span>Approve Timesheets</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-gray-600">Review and approve pending timesheets</p>
              <Badge className="mt-2 bg-green-600 text-white">
                {pendingTimesheets} awaiting approval
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Overview - Moved below Quick Action Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Open Shifts</p>
                <p className="text-3xl font-bold text-orange-600">{openShifts}</p>
              </div>
              <Calendar className="w-10 h-10 text-orange-500 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">Shifts Awaiting Verification</p>
                <p className="text-3xl font-bold text-amber-600">{shiftsAwaitingVerification}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-amber-500 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-300 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Pending Timesheets</p>
                <p className="text-3xl font-bold text-blue-600">{pendingTimesheets}</p>
              </div>
              <Clock className="w-10 h-10 text-blue-500 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-300 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Ready to Invoice</p>
                <p className="text-3xl font-bold text-green-600">{approvedTimesheetsNotInvoiced}</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500 opacity-30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <>
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Core Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to={createPageUrl('PostShiftV2')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-cyan-50">
                    <Plus className="w-6 h-6 text-cyan-600" />
                    <span className="text-sm font-medium">Create Shift</span>
                  </Button>
                </Link>

                <Link to={createPageUrl('BulkShiftCreation')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-green-50">
                    <Upload className="w-6 h-6 text-green-600" />
                    <span className="text-sm font-medium">Bulk Create Shifts</span>
                  </Button>
                </Link>

                <Link to={createPageUrl('NaturalLanguageShiftCreator')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-purple-50">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                    <span className="text-sm font-medium">Generate Shift (AI)</span>
                  </Button>
                </Link>

                <Link to={createPageUrl('Staff')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-blue-50">
                    <UserPlus className="w-6 h-6 text-blue-600" />
                    <span className="text-sm font-medium">Add Staff</span>
                  </Button>
                </Link>

                <Link to={createPageUrl('Clients')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-green-50">
                    <Building2 className="w-6 h-6 text-green-600" />
                    <span className="text-sm font-medium">Add Client</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to={createPageUrl('BulkDataImport')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-indigo-50">
                    <Upload className="w-6 h-6 text-indigo-600" />
                    <span className="text-sm font-medium">Bulk Import</span>
                  </Button>
                </Link>

                <Link to={createPageUrl('Shifts')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-orange-50">
                    <Calendar className="w-6 h-6 text-orange-600" />
                    <span className="text-sm font-medium">Shift Management</span>
                  </Button>
                </Link>

                <Link to={createPageUrl('Timesheets')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-blue-50">
                    <Clock className="w-6 h-6 text-blue-600" />
                    <span className="text-sm font-medium">Timesheets</span>
                  </Button>
                </Link>

                <Link to={createPageUrl('AdminWorkflows')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-red-50">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <span className="text-sm font-medium">Admin Workflows</span>
                    {shiftsAwaitingVerification > 0 && (
                      <Badge className="bg-red-600 text-white">
                        {shiftsAwaitingVerification}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                Financial Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to={createPageUrl('Invoices')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-purple-50">
                    <FileText className="w-6 h-6 text-purple-600" />
                    <span className="text-sm font-medium">Invoices</span>
                    {approvedTimesheetsNotInvoiced > 0 && (
                      <Badge className="bg-green-600 text-white">
                        {approvedTimesheetsNotInvoiced} ready
                      </Badge>
                    )}
                  </Button>
                </Link>

                <Link to={createPageUrl('Payslips')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-teal-50">
                    <FileText className="w-6 h-6 text-teal-600" />
                    <span className="text-sm font-medium">Payslips</span>
                  </Button>
                </Link>

                <Link to={createPageUrl('PerformanceAnalytics')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-cyan-50">
                    <BarChart3 className="w-6 h-6 text-cyan-600" />
                    <span className="text-sm font-medium">Analytics</span>
                  </Button>
                </Link>

                <Link to={createPageUrl('OperationalCosts')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-amber-50">
                    <TrendingUp className="w-6 h-6 text-amber-600" />
                    <span className="text-sm font-medium">Operational Costs</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Compliance & Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to={createPageUrl('ComplianceTracker')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-blue-50">
                    <Shield className="w-6 h-6 text-blue-600" />
                    <span className="text-sm font-medium">Compliance</span>
                  </Button>
                </Link>

                <Link to={createPageUrl('AgencySettings')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-gray-50">
                    <Settings className="w-6 h-6 text-gray-600" />
                    <span className="text-sm font-medium">Settings</span>
                  </Button>
                </Link>

                <Link to={createPageUrl('ShiftCalendar')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-pink-50">
                    <Calendar className="w-6 h-6 text-pink-600" />
                    <span className="text-sm font-medium">Calendar View</span>
                  </Button>
                </Link>

                <Link to={createPageUrl('LiveShiftMap')}>
                  <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-green-50">
                    <MapPin className="w-6 h-6 text-green-600" />
                    <span className="text-sm font-medium">Live Map</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Staff Actions */}
      {isStaff && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-600" />
              Staff Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Link to={createPageUrl('StaffPortal')}>
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-cyan-50">
                  <Users className="w-6 h-6 text-cyan-600" />
                  <span className="text-sm font-medium">My Dashboard</span>
                </Button>
              </Link>

              <Link to={createPageUrl('ShiftMarketplace')}>
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-purple-50">
                  <Calendar className="w-6 h-6 text-purple-600" />
                  <span className="text-sm font-medium">Available Shifts</span>
                </Button>
              </Link>

              <Link to={createPageUrl('Timesheets')}>
                <Button variant="outline" className="w-full h-24 flex flex-col gap-2 hover:bg-green-50">
                  <Clock className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium">My Timesheets</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
