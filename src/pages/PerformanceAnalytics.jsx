
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, TrendingDown, Users, DollarSign, Calendar, AlertTriangle,
  Target, Clock, XCircle, CheckCircle, Award, Download, Shield
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export default function PerformanceAnalytics() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [selectedClient, setSelectedClient] = useState('all');
  const [currentAgency, setCurrentAgency] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); // ✅ QUICK CONNECT: Super admin detection
  const [selectedAgency, setSelectedAgency] = useState('all'); // ✅ QUICK CONNECT: Agency selector for drill-down

  // ✅ QUICK CONNECT: Enhanced RBAC Check with Super Admin support
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          console.error('❌ Not authenticated:', authError);
          navigate(createPageUrl('Home'));
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profile) {
          console.error('❌ Profile not found:', profileError);
          navigate(createPageUrl('Home'));
          return;
        }

        setUser(profile);

        // Block staff members
        if (profile.user_type === 'staff_member') {
          navigate(createPageUrl('StaffPortal'));
          return;
        }

        // ✅ QUICK CONNECT: Super Admin Detection
        const superAdminEmail = 'g.basera@yahoo.com';
        const isSuperAdminUser = profile.email === superAdminEmail;
        setIsSuperAdmin(isSuperAdminUser);

        // Check ViewSwitcher mode
        const viewMode = localStorage.getItem('admin_view_mode');
        let agencyIdToUse = profile.agency_id;

        if (isSuperAdminUser && viewMode) {
          try {
            const viewConfig = JSON.parse(viewMode);
            if (viewConfig.type === 'agency_admin' && viewConfig.entityId) {
              console.log(`🔍 Super Admin viewing as agency: ${viewConfig.entityId}`);
              agencyIdToUse = viewConfig.entityId;
              setSelectedAgency(viewConfig.entityId); // Set to specific agency
            } else if (viewConfig.type === 'super_admin') {
              console.log(`🔍 Super Admin: Platform-wide view active.`);
              agencyIdToUse = 'super_admin';
              setSelectedAgency('all'); // Set to "All Agencies"
            }
          } catch (e) {
            console.error("Error parsing admin_view_mode from localStorage", e);
          }
        } else if (isSuperAdminUser) {
          // Super admin with no ViewSwitcher mode - default to platform-wide
          agencyIdToUse = 'super_admin';
          setSelectedAgency('all');
        }

        setCurrentAgency(agencyIdToUse);
        console.log('PerformanceAnalytics - Agency:', agencyIdToUse, 'Super Admin:', isSuperAdminUser);

        setLoading(false);
      } catch (error) {
        console.error("Auth error:", error);
        navigate(createPageUrl('Home'));
      }
    };
    checkAccess();
  }, [navigate]);

  // ✅ QUICK CONNECT: Fetch all agencies for super admin dropdown
  const { data: agencies = [] } = useQuery({
    queryKey: ['all-agencies', isSuperAdmin],
    queryFn: async () => {
      if (!isSuperAdmin) return [];

      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .order('name');

      if (error) {
        console.error('❌ Error fetching agencies:', error);
        return [];
      }
      return data || [];
    },
    enabled: isSuperAdmin && !loading,
    staleTime: 60000
  });

  // ✅ QUICK CONNECT: Determine which agency to filter by
  const effectiveAgencyId = selectedAgency === 'all' ? null : selectedAgency;

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', effectiveAgencyId, selectedAgency],
    queryFn: async () => {
      let query = supabase
        .from('staff')
        .select('*');

      // ✅ QUICK CONNECT: Only filter if not viewing all agencies
      if (effectiveAgencyId && effectiveAgencyId !== 'super_admin') {
        query = query.eq('agency_id', effectiveAgencyId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      console.log('PerformanceAnalytics - Staff:', data?.length || 0, 'Agency:', effectiveAgencyId || 'ALL');
      return data || [];
    },
    enabled: !loading && (!!currentAgency || isSuperAdmin),
    refetchOnMount: 'always'
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', effectiveAgencyId, selectedAgency],
    queryFn: async () => {
      let query = supabase
        .from('shifts')
        .select('*')
        .order('date', { ascending: false });

      // ✅ QUICK CONNECT: Only filter if not viewing all agencies
      if (effectiveAgencyId && effectiveAgencyId !== 'super_admin') {
        query = query.eq('agency_id', effectiveAgencyId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }
      return data || [];
    },
    enabled: !loading && (!!currentAgency || isSuperAdmin),
    refetchOnMount: 'always'
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', effectiveAgencyId, selectedAgency],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select('*')
        .order('created_date', { ascending: false });

      // ✅ QUICK CONNECT: Only filter if not viewing all agencies
      if (effectiveAgencyId && effectiveAgencyId !== 'super_admin') {
        query = query.eq('agency_id', effectiveAgencyId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('❌ Error fetching bookings:', error);
        return [];
      }
      return data || [];
    },
    enabled: !loading && (!!currentAgency || isSuperAdmin),
    refetchOnMount: 'always'
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', effectiveAgencyId, selectedAgency],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('*');

      // ✅ QUICK CONNECT: Only filter if not viewing all agencies
      if (effectiveAgencyId && effectiveAgencyId !== 'super_admin') {
        query = query.eq('agency_id', effectiveAgencyId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      return data || [];
    },
    initialData: [],
    enabled: !loading && (!!currentAgency || isSuperAdmin)
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets', effectiveAgencyId, selectedAgency],
    queryFn: async () => {
      let query = supabase.from('timesheets').select('*');

      // ✅ QUICK CONNECT: Only filter if not viewing all agencies
      if (effectiveAgencyId && effectiveAgencyId !== 'super_admin') {
        query = query.eq('agency_id', effectiveAgencyId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('❌ Error fetching timesheets:', error);
        return [];
      }
      return data || [];
    },
    initialData: [],
    enabled: !loading && (!!currentAgency || isSuperAdmin)
  });

  // If no real data exists, show message prompting to import test data
  if (!loading && shifts.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto mt-12">
        <CardContent className="p-12 text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600 mb-6">
            Import test data to see analytics in action.
          </p>
          <Button onClick={() => navigate(createPageUrl('BulkDataImport'))} className="bg-cyan-600">
            Go to Bulk Data Import
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Filter by time range
  const getFilteredData = (data, dateField) => {
    const now = new Date();
    let startDate;
    
    switch(timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'quarter':
        startDate = subMonths(now, 3);
        break;
      case 'year':
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = startOfMonth(now);
    }
    
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= startDate;
    });
  };

  const filteredShifts = getFilteredData(shifts, 'date');
  const filteredBookings = getFilteredData(bookings, 'shift_date');

  // FINANCIAL ANALYTICS
  const totalRevenue = timesheets
    .filter(t => t.status === 'approved' || t.status === 'paid')
    .reduce((sum, t) => sum + (t.client_charge_amount || 0), 0);

  const totalCosts = timesheets
    .filter(t => t.status === 'approved' || t.status === 'paid')
    .reduce((sum, t) => sum + (t.staff_pay_amount || 0), 0);

  const grossMargin = totalRevenue - totalCosts;
  const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue * 100) : 0;

  // OPERATIONAL METRICS
  const totalShiftsBooked = filteredShifts.length;
  const shiftsCompleted = filteredShifts.filter(s => s.status === 'completed').length;
  const shiftsInProgress = filteredShifts.filter(s => s.status === 'in_progress').length;
  const shiftsCancelled = filteredShifts.filter(s => s.status === 'cancelled').length;
  const shiftsNoShow = filteredShifts.filter(s => s.status === 'no_show').length;
  const shiftsOpen = filteredShifts.filter(s => s.status === 'open').length;
  
  const completionRate = totalShiftsBooked > 0 ? (shiftsCompleted / totalShiftsBooked * 100) : 0;
  const fillRate = totalShiftsBooked > 0 ? ((totalShiftsBooked - shiftsOpen) / totalShiftsBooked * 100) : 0;
  const cancellationRate = totalShiftsBooked > 0 ? (shiftsCancelled / totalShiftsBooked * 100) : 0;
  const noShowRate = totalShiftsBooked > 0 ? (shiftsNoShow / totalShiftsBooked * 100) : 0;

  // LOSS ANALYSIS
  const avgShiftValue = filteredShifts.length > 0 ? filteredShifts.reduce((sum, s) => sum + (s.charge_rate * s.duration_hours), 0) / filteredShifts.length : 0;
  
  const noShowLoss = shiftsNoShow * avgShiftValue;
  const cancellationLoss = shiftsCancelled * avgShiftValue * 0.3; // Assume 30% loss on cancellations
  const unfilledLoss = shiftsOpen * avgShiftValue;
  const totalAvoidableLoss = noShowLoss + cancellationLoss;

  // CLIENT PERFORMANCE
  const clientMetrics = clients.map(client => {
    const clientShifts = filteredShifts.filter(s => s.client_id === client.id);
    const completed = clientShifts.filter(s => s.status === 'completed').length;
    const cancelled = clientShifts.filter(s => s.status === 'cancelled').length;
    const noShows = clientShifts.filter(s => s.status === 'no_show').length;
    const revenue = timesheets
      .filter(t => t.client_id === client.id && (t.status === 'approved' || t.status === 'paid'))
      .reduce((sum, t) => sum + (t.client_charge_amount || 0), 0);

    return {
      id: client.id,
      name: client.name,
      totalShifts: clientShifts.length,
      completed,
      cancelled,
      noShows,
      revenue,
      completionRate: clientShifts.length > 0 ? (completed / clientShifts.length * 100) : 0,
      reliability: clientShifts.length > 0 ? ((clientShifts.length - cancelled - noShows) / clientShifts.length * 100) : 100
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const topClients = clientMetrics.slice(0, 5);
  const problematicClients = clientMetrics.filter(c => c.reliability < 80 && c.totalShifts > 3);

  // STAFF UTILIZATION
  const staffUtilization = staff.map(s => {
    const staffShifts = filteredShifts.filter(shift => shift.assigned_staff_id === s.id);
    const completedShifts = staffShifts.filter(shift => shift.status === 'completed').length;
    const noShows = staffShifts.filter(shift => shift.status === 'no_show').length;
    
    return {
      name: `${s.first_name} ${s.last_name}`,
      shifts: staffShifts.length,
      completed: completedShifts,
      noShows,
      reliability: staffShifts.length > 0 ? ((staffShifts.length - noShows) / staffShifts.length * 100) : 100
    };
  }).filter(s => s.shifts > 0).sort((a, b) => b.shifts - a.shifts).slice(0, 10);

  // LOSS BREAKDOWN
  const lossData = [
    { name: 'No Shows', value: noShowLoss, count: shiftsNoShow, color: '#ef4444' },
    { name: 'Cancellations', value: cancellationLoss, count: shiftsCancelled, color: '#f59e0b' },
    { name: 'Unfilled Shifts', value: unfilledLoss, count: shiftsOpen, color: '#6b7280' }
  ];

  // MONTHLY TREND
  const monthlyData = Array.from({length: 6}, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const monthShifts = shifts.filter(s => {
      const shiftDate = new Date(s.date);
      return shiftDate >= startOfMonth(month) && shiftDate <= endOfMonth(month);
    });
    
    const completed = monthShifts.filter(s => s.status === 'completed').length;
    const revenue = timesheets
      .filter(t => {
        const tsDate = new Date(t.shift_date);
        return tsDate >= startOfMonth(month) && tsDate <= endOfMonth(month) && (t.status === 'approved' || t.status === 'paid');
      })
      .reduce((sum, t) => sum + (t.client_charge_amount || 0), 0);

    return {
      month: format(month, 'MMM'),
      shifts: monthShifts.length,
      completed,
      revenue: Math.round(revenue)
    };
  });

  const COLORS = ['#ef4444', '#f59e0b', '#6b7280'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!user || user.user_type === 'staff_member') {
    return (
      <Card className="max-w-md mx-auto mt-20">
        <CardContent className="p-12 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">Performance analytics is only accessible to agency administrators.</p>
          <Button onClick={() => navigate(createPageUrl('StaffPortal'))}>
            Go to Staff Portal
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Analytics</h1>
          <p className="text-gray-600 mt-1">
            Data-driven insights for strategic decision making
            {isSuperAdmin && selectedAgency === 'all' && (
              <Badge className="ml-2 bg-purple-600 text-white">Platform-Wide View</Badge>
            )}
            {isSuperAdmin && selectedAgency !== 'all' && agencies.length > 0 && (
              <Badge className="ml-2 bg-blue-600 text-white">
                {agencies.find(a => a.id === selectedAgency)?.name || 'Agency View'}
              </Badge>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          {/* ✅ QUICK CONNECT: Agency selector for super admin */}
          {isSuperAdmin && (
            <Select value={selectedAgency} onValueChange={setSelectedAgency}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agencies</SelectItem>
                {agencies.map(agency => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-gradient-to-r from-cyan-500 to-blue-600">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-lg bg-green-500">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">£{(totalRevenue / 1000).toFixed(1)}k</p>
            <p className="text-sm text-green-600 mt-2">+12% vs last period</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-lg bg-purple-500">
                <Target className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm text-gray-600">Gross Margin</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{marginPercentage.toFixed(1)}%</p>
            <p className="text-sm text-purple-600 mt-2">£{(grossMargin / 1000).toFixed(1)}k profit</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-2 border-red-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-lg bg-red-500">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-sm text-gray-600">Avoidable Losses</p>
            <p className="text-3xl font-bold text-red-600 mt-1">£{(totalAvoidableLoss / 1000).toFixed(1)}k</p>
            <p className="text-sm text-red-600 mt-2">{shiftsNoShow + shiftsCancelled} incidents</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-lg bg-blue-500">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">Completion Rate</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{completionRate.toFixed(0)}%</p>
            <p className="text-sm text-blue-600 mt-2">{shiftsCompleted}/{totalShiftsBooked} shifts</p>
          </CardContent>
        </Card>
      </div>

      {/* Loss Analysis */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Revenue Loss Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={lossData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, count }) => `${name}: £${(value/1000).toFixed(1)}k (${count})`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {lossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `£${value.toFixed(0)}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Avoidable Loss:</span>
                <span className="font-bold text-red-600">£{totalAvoidableLoss.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Potential Revenue (if resolved):</span>
                <span className="font-bold text-green-600">+£{(totalAvoidableLoss * 0.7).toFixed(0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Operational Metrics</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Fill Rate</span>
                  <span className="text-sm font-bold">{fillRate.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-green-600 h-3 rounded-full transition-all" style={{width: `${fillRate}%`}}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <span className="text-sm font-bold">{completionRate.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-blue-600 h-3 rounded-full transition-all" style={{width: `${completionRate}%`}}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Cancellation Rate</span>
                  <span className="text-sm font-bold text-orange-600">{cancellationRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-orange-500 h-3 rounded-full transition-all" style={{width: `${cancellationRate}%`}}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">No-Show Rate</span>
                  <span className="text-sm font-bold text-red-600">{noShowRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-red-600 h-3 rounded-full transition-all" style={{width: `${noShowRate}%`}}></div>
                </div>
              </div>

              <div className="pt-4 border-t grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-2xl font-bold text-gray-900">{shiftsInProgress}</p>
                  <p className="text-xs text-gray-600">In Progress</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-2xl font-bold text-gray-900">{shiftsOpen}</p>
                  <p className="text-xs text-gray-600">Open</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>6-Month Performance Trend</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="shifts" stroke="#06b6d4" name="Total Shifts" strokeWidth={2} />
              <Line yAxisId="left" type="monotone" dataKey="completed" stroke="#10b981" name="Completed" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#8b5cf6" name="Revenue (£)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Client Performance */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Top 5 Clients by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {topClients.map((client, index) => (
                <div key={client.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-semibold">{client.name}</p>
                      <p className="text-xs text-gray-600">{client.totalShifts} shifts • {client.completionRate.toFixed(0)}% completion</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">£{(client.revenue / 1000).toFixed(1)}k</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Clients Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {problematicClients.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600">All clients performing well!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {problematicClients.map(client => (
                  <div key={client.id} className="p-3 border-2 border-orange-300 rounded-lg bg-orange-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{client.name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {client.cancelled} cancellations • {client.noShows} no-shows
                        </p>
                      </div>
                      <Badge className="bg-orange-600 text-white">
                        {client.reliability.toFixed(0)}% reliable
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Staff Utilization */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Top 10 Staff Utilization</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={staffUtilization} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="shifts" fill="#06b6d4" name="Total Shifts" />
              <Bar dataKey="completed" fill="#10b981" name="Completed" />
              <Bar dataKey="noShows" fill="#ef4444" name="No Shows" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Insights & Recommendations */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            AI-Powered Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 bg-white rounded-lg border border-red-200">
              <p className="font-semibold text-red-900">🚨 Priority Action Required</p>
              <p className="text-sm text-gray-700 mt-1">
                No-shows are costing £{noShowLoss.toFixed(0)} ({noShowRate.toFixed(1)}% rate). Implement automated reminder system 2 hours before shift start to reduce by 60%.
              </p>
            </div>
            
            <div className="p-4 bg-white rounded-lg border border-orange-200">
              <p className="font-semibold text-orange-900">💰 Revenue Opportunity</p>
              <p className="text-sm text-gray-700 mt-1">
                {shiftsOpen} unfilled shifts represent £{unfilledLoss.toFixed(0)} in lost revenue. Recruit {Math.ceil(shiftsOpen / 40)} more {staff[0]?.role || 'care workers'} to capture this.
              </p>
            </div>

            {problematicClients.length > 0 && (
              <div className="p-4 bg-white rounded-lg border border-yellow-200">
                <p className="font-semibold text-yellow-900">⚠️ Client Relationship Risk</p>
                <p className="text-sm text-gray-700 mt-1">
                  {problematicClients.length} client(s) showing high cancellation rates. Schedule review meetings to understand issues and improve service delivery.
                </p>
              </div>
            )}

            <div className="p-4 bg-white rounded-lg border border-green-200">
              <p className="font-semibold text-green-900">✅ Strong Performance</p>
              <p className="text-sm text-gray-700 mt-1">
                {completionRate.toFixed(0)}% completion rate exceeds industry average of 85%. Consider upselling additional services to top clients.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
