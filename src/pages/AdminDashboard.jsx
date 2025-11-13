
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, Calendar, Clock, FileText, TrendingUp, TrendingDown,
  AlertTriangle, DollarSign, Star, Award, Download, Filter, Shield
} from "lucide-react";
import { format } from "date-fns";
import StatsCard from "../components/dashboard/StatsCard";
import ShiftStatusAnalytics from "../components/dashboard/ShiftStatusAnalytics";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [currentAgency, setCurrentAgency] = useState(null);

  // RBAC Check
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
        
        // Block staff members from accessing this page
        if (profile.user_type === 'staff_member') {
          navigate(createPageUrl('StaffPortal'));
          return;
        }
        
        setCurrentAgency(profile.agency_id);
        console.log('AdminDashboard - Agency:', profile.agency_id);
        
        setLoading(false);
      } catch (error) {
        console.error("Auth error:", error);
        navigate(createPageUrl('Home')); 
      }
    };
    checkAccess();
  }, [navigate]);

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', currentAgency],
    queryFn: async () => {
      const query = supabase
        .from('staff')
        .select('*');
      
      if (currentAgency) {
        query.eq('agency_id', currentAgency);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      console.log('AdminDashboard - Staff:', data?.length || 0);
      return data || [];
    },
    enabled: !loading && !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', currentAgency],
    queryFn: async () => {
      const query = supabase
        .from('shifts')
        .select('*')
        .order('date', { ascending: false });
      
      if (currentAgency) {
        query.eq('agency_id', currentAgency);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }
      return data || [];
    },
    enabled: !loading && !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', currentAgency],
    queryFn: async () => {
      const query = supabase
        .from('bookings')
        .select('*')
        .order('created_date', { ascending: false });
      
      if (currentAgency) {
        query.eq('agency_id', currentAgency);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('❌ Error fetching bookings:', error);
        return [];
      }
      return data || [];
    },
    enabled: !loading && !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets', currentAgency],
    queryFn: async () => {
      const query = supabase
        .from('timesheets')
        .select('*')
        .order('created_date', { ascending: false });
      
      if (currentAgency) {
        query.eq('agency_id', currentAgency);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('❌ Error fetching timesheets:', error);
        return [];
      }
      return data || [];
    },
    enabled: !loading && !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', currentAgency],
    queryFn: async () => {
      const query = supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false });
      
      if (currentAgency) {
        query.eq('agency_id', currentAgency);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('❌ Error fetching invoices:', error);
        return [];
      }
      return data || [];
    },
    enabled: !loading && !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: payslips = [] } = useQuery({
    queryKey: ['payslips', currentAgency],
    queryFn: async () => {
      const query = supabase
        .from('payslips')
        .select('*')
        .order('period_end', { ascending: false });
      
      if (currentAgency) {
        query.eq('agency_id', currentAgency);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('❌ Error fetching payslips:', error);
        return [];
      }
      return data || [];
    },
    enabled: !loading && !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: compliance = [] } = useQuery({
    queryKey: ['compliance', currentAgency],
    queryFn: async () => {
      const query = supabase
        .from('compliance')
        .select('*');
      
      if (currentAgency) {
        query.eq('agency_id', currentAgency);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('❌ Error fetching compliance:', error);
        return [];
      }
      return data || [];
    },
    enabled: !loading && !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', currentAgency],
    queryFn: async () => {
      const query = supabase
        .from('clients')
        .select('*');
      
      if (currentAgency) {
        query.eq('agency_id', currentAgency);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      return data || [];
    },
    enabled: !loading && !!currentAgency,
    refetchOnMount: 'always'
  });

  // Calculate advanced metrics
  const activeStaff = staff.filter(s => s.status === 'active').length;
  const onboardingStaff = staff.filter(s => s.status === 'onboarding').length;
  const avgStaffRating = staff.reduce((sum, s) => sum + (s.rating || 0), 0) / staff.length || 0;

  const openShifts = shifts.filter(s => s.status === 'open').length;
  const urgentShifts = shifts.filter(s => s.urgency === 'urgent' || s.urgency === 'critical').length;
  const fillRate = shifts.length > 0 ? ((shifts.length - openShifts) / shifts.length * 100) : 0;

  const pendingTimesheets = timesheets.filter(t => t.status === 'submitted').length;
  const approvedTimesheets = timesheets.filter(t => t.status === 'approved').length;

  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalCosts = payslips.reduce((sum, ps) => sum + (ps.gross_pay || 0), 0);
  const grossMargin = totalRevenue - totalCosts;
  const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue * 100) : 0;

  const unpaidInvoices = invoices.filter(i => ['sent', 'viewed', 'overdue'].includes(i.status));
  const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

  const expiredDocs = compliance.filter(d => d.status === 'expired').length;
  const expiringSoon = compliance.filter(d => {
    if (!d.expiry_date || d.status === 'expired') return false;
    const days = Math.floor((new Date(d.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
    return days > 0 && days <= 30;
  }).length;

  // Staff performance leaderboard
  const topPerformers = [...staff]
    .filter(s => s.rating && s.total_shifts_completed > 5)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  // Problem staff (low ratings or lateness)
  const staffNeedingAttention = staff.filter(s => 
    (s.rating && s.rating < 4.0) || s.status === 'suspended'
  );

  const criticalAlerts = [];
  if (urgentShifts > 0) criticalAlerts.push({ type: 'urgent', message: `${urgentShifts} urgent shifts unfilled`, action: 'View Shifts', severity: 'high' });
  if (expiredDocs > 0) criticalAlerts.push({ type: 'compliance', message: `${expiredDocs} compliance documents expired`, action: 'View Staff', severity: 'high' });
  if (expiringSoon > 0) criticalAlerts.push({ type: 'compliance', message: `${expiringSoon} documents expiring within 30 days`, action: 'View Staff', severity: 'medium' });
  if (staffNeedingAttention.length > 0) criticalAlerts.push({ type: 'performance', message: `${staffNeedingAttention.length} staff need performance review`, action: 'View Staff', severity: 'medium' });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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
          <p className="text-gray-600 mb-6">Analytics dashboard is only accessible to agency administrators.</p>
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agency Control Center</h1>
          <p className="text-gray-600 mt-1">Real-time oversight and analytics</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button className="bg-gradient-to-r from-cyan-500 to-blue-600">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-3">
          {criticalAlerts.map((alert, index) => (
            <Alert key={index} variant={alert.severity === 'high' ? 'destructive' : 'default'} 
                   className={alert.severity === 'high' ? 'border-red-500' : 'border-orange-400'}>
              <AlertTriangle className="h-5 w-5" />
              <AlertDescription className="flex items-center justify-between">
                <span><strong>Alert:</strong> {alert.message}</span>
                <Button size="sm" variant="outline">
                  {alert.action}
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Staff"
          value={activeStaff}
          icon={Users}
          trend="up"
          trendValue={`+${onboardingStaff} onboarding`}
          color="cyan"
        />
        <StatsCard
          title="Fill Rate"
          value={`${fillRate.toFixed(0)}%`}
          icon={TrendingUp}
          trend={fillRate >= 80 ? "up" : "down"}
          trendValue={`${openShifts} open`}
          color={fillRate >= 80 ? "green" : "orange"}
        />
        <StatsCard
          title="Revenue (MTD)"
          value={`£${(totalRevenue / 1000).toFixed(1)}k`}
          icon={DollarSign}
          trend="up"
          trendValue={`${marginPercentage.toFixed(0)}% margin`}
          color="green"
        />
        <StatsCard
          title="Avg Staff Rating"
          value={avgStaffRating.toFixed(1)}
          icon={Star}
          color="purple"
        />
      </div>

      {/* NEW: Shift Status Analytics */}
      <ShiftStatusAnalytics agencyId={currentAgency} />

      {/* Financial Overview */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>Financial Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 font-medium mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">£{totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-green-600 mt-1">{invoices.length} invoices</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 font-medium mb-1">Staff Costs</p>
                <p className="text-2xl font-bold text-blue-600">£{totalCosts.toFixed(2)}</p>
                <p className="text-xs text-blue-600 mt-1">{payslips.length} payslips</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700 font-medium mb-1">Gross Margin</p>
                <p className="text-2xl font-bold text-purple-600">£{grossMargin.toFixed(2)}</p>
                <p className="text-xs text-purple-600 mt-1">{marginPercentage.toFixed(1)}% margin</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-red-700 font-medium">Outstanding Invoices</p>
                  <p className="text-sm text-red-600">{unpaidInvoices.length} unpaid invoices</p>
                </div>
                <p className="text-2xl font-bold text-red-600">£{totalOutstanding.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Summary */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Compliance Status</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Documents</span>
                <span className="font-bold">{compliance.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600">Verified</span>
                <span className="font-bold text-green-600">
                  {compliance.filter(d => d.status === 'verified').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-600">Expired</span>
                <span className="font-bold text-red-600">{expiredDocs}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="text-sm text-orange-600">Expiring Soon</span>
                <span className="font-bold text-orange-600">{expiringSoon}</span>
              </div>
              
              <div className="pt-2">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-600 h-3 rounded-full transition-all" 
                    style={{ width: `${(compliance.filter(d => d.status === 'verified').length / compliance.length * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  {((compliance.filter(d => d.status === 'verified').length / compliance.length) * 100).toFixed(0)}% Compliant
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Top Performing Staff
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {topPerformers.map((staffMember, index) => (
                <div key={staffMember.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-semibold">{staffMember.first_name} {staffMember.last_name}</p>
                      <p className="text-sm text-gray-600 capitalize">{staffMember.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold text-lg">{staffMember.rating.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-gray-600">{staffMember.total_shifts_completed} shifts</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Operational Metrics */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Operational Metrics</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm font-medium">Total Shifts (MTD)</span>
                <span className="font-bold text-lg">{shifts.filter(s => 
                  new Date(s.date).getMonth() === new Date().getMonth()
                ).length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                <span className="text-sm font-medium">Completed Shifts</span>
                <span className="font-bold text-lg text-green-600">
                  {bookings.filter(b => b.status === 'completed').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                <span className="text-sm font-medium">Pending Approvals</span>
                <span className="font-bold text-lg text-orange-600">{pendingTimesheets}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                <span className="text-sm font-medium">Active Clients</span>
                <span className="font-bold text-lg text-blue-600">
                  {clients.filter(c => c.status === 'active').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                <span className="text-sm font-medium">Avg Client Rating</span>
                <span className="font-bold text-lg text-purple-600">
                  {(clients.reduce((sum, c) => sum + (c.rating || 0), 0) / clients.length || 0).toFixed(1)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Requiring Attention */}
      {staffNeedingAttention.length > 0 && (
        <Card className="border-2 border-orange-300">
          <CardHeader className="border-b bg-orange-50">
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="w-5 h-5" />
              Staff Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              {staffNeedingAttention.map(staffMember => (
                <div key={staffMember.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{staffMember.first_name} {staffMember.last_name}</p>
                      <p className="text-sm text-gray-600">{staffMember.email}</p>
                      <Badge className="mt-2 bg-orange-100 text-orange-800">
                        {staffMember.status === 'suspended' ? 'Suspended' : 'Low Rating'}
                      </Badge>
                    </div>
                    {staffMember.rating && (
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
                          <span className="font-bold text-orange-600">{staffMember.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Admin Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Users className="w-6 h-6" />
              <span className="text-sm">Invite Staff</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <FileText className="w-6 h-6" />
              <span className="text-sm">Generate Invoices</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Clock className="w-6 h-6" />
              <span className="text-sm">Approve Timesheets</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Download className="w-6 h-6" />
              <span className="text-sm">Export Payroll</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
