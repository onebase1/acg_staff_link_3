
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users, Calendar, Clock, FileText, TrendingUp, AlertCircle,
  Plus, CheckCircle, XCircle, UserPlus, Filter, ChevronDown, Eye, Building2,
  DollarSign, Target, Activity, Award, Upload,
  AlertTriangle, ClipboardList, CheckCircle2, ChevronRight, Briefcase, MapPin, Star, Zap, Search, MessageCircle, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import StatsCard from "../components/dashboard/StatsCard";
import RecentActivity from "../components/dashboard/RecentActivity";
import ShiftAssignmentModal from "../components/shifts/ShiftAssignmentModal";
import ViewSwitcher from "../components/admin/ViewSwitcher";
import QuickStatsWidget from "../components/dashboard/QuickStatsWidget";
import ShiftStatusAnalytics from "../components/dashboard/ShiftStatusAnalytics";
import { format, subDays, parseISO, isToday, isTomorrow, addDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { toast } from "sonner";
import NotificationService from "../components/notifications/NotificationService";

export default function Dashboard() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [assigningShift, setAssigningShift] = useState(null);
  const [user, setUser] = useState(null);
  const [agency, setAgency] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ✅ FIXED: Get current user and agency using direct Supabase
  useEffect(() => {
    const fetchUserAndAgency = async () => {
      try {
        // Get authenticated user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          console.error('❌ Not authenticated:', authError);
          navigate('/login');
          return;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError) {
          console.error('❌ Error fetching profile:', profileError);
          return;
        }

        const currentUser = {
          id: profile.id,
          email: profile.email || authUser.email,
          user_type: profile.user_type,
          agency_id: profile.agency_id,
          client_id: profile.client_id,
          full_name: profile.full_name,
          phone: profile.phone,
        };
        
        setUser(currentUser);
        
        const superAdminEmail = 'g.basera@yahoo.com';
        const isSuperAdminUser = currentUser.email === superAdminEmail;
        setIsSuperAdmin(isSuperAdminUser);
        
        // Check ViewSwitcher mode
        const viewMode = localStorage.getItem('admin_view_mode');
        let agencyIdToUse = currentUser.agency_id;
        
        if (isSuperAdminUser && viewMode) {
          try {
            const viewConfig = JSON.parse(viewMode);
            if (viewConfig.type === 'agency_admin' && viewConfig.entityId) {
              console.log(`🔍 Super Admin viewing as agency: ${viewConfig.entityId}`);
              agencyIdToUse = viewConfig.entityId;
            } else if (viewConfig.type === 'super_admin') {
              console.log(`🔍 Super Admin: Platform-wide view active.`);
              agencyIdToUse = 'super_admin';
            }
          } catch (e) {
            console.error("Error parsing admin_view_mode from localStorage", e);
          }
        }
        
        // Platform-wide view for super admin
        if (agencyIdToUse === 'super_admin') {
          setAgency({ id: 'super_admin', name: 'Platform Wide', logo_url: null, address: null, subscription_tier: 'SUPER_ADMIN' });
          console.log(`✅ Dashboard: Super Admin in platform-wide view.`);
          return;
        }

        // If super admin with no agency selected, DON'T fetch
        if (isSuperAdminUser && !agencyIdToUse) {
          console.log(`⚠️ Super Admin: No agency selected yet`);
          setAgency(null);
          return;
        }
        
        // Load specific agency
        if (agencyIdToUse) {
          try {
            const { data: userAgency, error: agencyError } = await supabase
              .from('agencies')
              .select('*')
              .eq('id', agencyIdToUse)
              .single();

            if (agencyError) {
              console.error('❌ Error loading agency:', agencyError);
              setAgency(null);
            } else {
              setAgency(userAgency);
              console.log(`✅ Dashboard: Loaded agency ${userAgency?.name} (${agencyIdToUse})`);
            }
          } catch (error) {
            console.error('❌ Error loading agency:', error);
            setAgency(null);
          }
        } else {
          console.log(`⚠️ Dashboard: No agency context found`);
          setAgency(null);
        }
      } catch (error) {
        console.error('❌ Fatal error in fetchUserAndAgency:', error);
        setAgency(null);
      }
    };
    fetchUserAndAgency();
  }, [navigate]);

  // ✅ FIXED: Server-side filtering for security and performance
  const { data: staff = [] } = useQuery({
    queryKey: ['staff', agency?.id],
    queryFn: async () => {
      console.log('🔍 Fetching staff for agency:', agency.id);

      // ✅ SECURITY FIX: Filter at DATABASE level, not client-side
      let query = supabase.from('staff').select('*');

      if (agency.id !== 'super_admin') {
        query = query.eq('agency_id', agency.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      console.log(`✅ Loaded ${data?.length || 0} staff members for agency ${agency.id}`);
      return data;
    },
    enabled: !!agency?.id, // Only run when agency is loaded
    refetchOnMount: 'always'
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', agency?.id],
    queryFn: async () => {
      console.log('🔍 Fetching shifts for agency:', agency.id);

      // ✅ SECURITY FIX: Filter at DATABASE level, not client-side
      let query = supabase.from('shifts').select('*').order('date', { ascending: false });

      if (agency.id !== 'super_admin') {
        query = query.eq('agency_id', agency.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }
      console.log(`✅ Loaded ${data?.length || 0} shifts for agency ${agency.id}`);
      return data;
    },
    enabled: !!agency?.id,
    refetchOnMount: 'always'
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', agency?.id],
    queryFn: async () => {
      // ✅ SECURITY FIX: Filter at DATABASE level, not client-side
      let query = supabase.from('bookings').select('*').order('created_date', { ascending: false });

      if (agency.id !== 'super_admin') {
        query = query.eq('agency_id', agency.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching bookings:', error);
        return [];
      }
      return data;
    },
    enabled: !!agency?.id,
    refetchOnMount: 'always'
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets', agency?.id],
    queryFn: async () => {
      // ✅ SECURITY FIX: Filter at DATABASE level, not client-side
      let query = supabase.from('timesheets').select('*').order('created_date', { ascending: false });

      if (agency.id !== 'super_admin') {
        query = query.eq('agency_id', agency.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching timesheets:', error);
        return [];
      }
      return data;
    },
    enabled: !!agency?.id,
    refetchOnMount: 'always'
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', agency?.id],
    queryFn: async () => {
      console.log('🔍 Fetching clients for agency:', agency.id);

      // ✅ SECURITY FIX: Filter at DATABASE level, not client-side
      let query = supabase.from('clients').select('*');

      if (agency.id !== 'super_admin') {
        query = query.eq('agency_id', agency.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      console.log(`✅ Loaded ${data?.length || 0} clients for agency ${agency.id}`);
      return data;
    },
    enabled: !!agency?.id,
    refetchOnMount: 'always'
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows', agency?.id],
    queryFn: async () => {
      // ✅ SECURITY FIX: Filter at DATABASE level, not client-side
      let query = supabase.from('admin_workflows').select('*').order('created_date', { ascending: false });

      if (agency.id !== 'super_admin') {
        query = query.eq('agency_id', agency.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching workflows:', error);
        return [];
      }
      return data;
    },
    enabled: !!agency?.id,
    refetchOnMount: 'always'
  });

  // ✅ FIXED: Agencies query using direct Supabase
  const { data: agencies = [], isLoading: loadingAgencies } = useQuery({
    queryKey: ['all-agencies', isSuperAdmin],
    queryFn: async () => {
      if (!isSuperAdmin) {
        console.log('⏳ Not super admin, skipping agencies query');
        return [];
      }
      try {
        console.log('🔍 [Dashboard] Fetching agencies...');
        
        const { data, error } = await supabase.from('agencies').select('*');
        
        if (error) {
          console.error('❌ [Dashboard] Error fetching agencies:', error);
          return [];
        }
        
        console.log(`✅ [Dashboard] Loaded ${data.length} agencies`);
        return data;
      } catch (error) {
        console.error('❌ [Dashboard] Error fetching agencies:', error);
        return [];
      }
    },
    initialData: [],
    staleTime: 60000,
    cacheTime: 300000,
    retry: 1,
    refetchOnWindowFocus: false
  });

  // ✅ QUICK WIN 3: Enhanced Global Search - searches across staff, clients, AND shifts
  const globalSearchResults = () => {
    if (!searchTerm || searchTerm.length < 2) return { staff: [], clients: [], shifts: [] };

    const term = searchTerm.toLowerCase();

    return {
      staff: staff.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term) ||
        s.phone?.includes(term) ||
        s.role?.toLowerCase().includes(term)
      ).slice(0, 5),

      clients: clients.filter(c =>
        c.name?.toLowerCase().includes(term) ||
        c.location?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term)
      ).slice(0, 5),

      shifts: shifts.filter(shift => {
        const client = clients.find(c => c.id === shift.client_id);
        const assignedStaff = staff.find(s => s.id === shift.assigned_staff_id);
        return (
          shift.role_required?.toLowerCase().includes(term) ||
          client?.name?.toLowerCase().includes(term) ||
          client?.location?.toLowerCase().includes(term) ||
          `${assignedStaff?.first_name} ${assignedStaff?.last_name}`.toLowerCase().includes(term) ||
          shift.status?.toLowerCase().includes(term) ||
          shift.id?.toLowerCase().includes(term)
        );
      }).slice(0, 5)
    };
  };

  const searchResults = globalSearchResults();
  const hasSearchResults = searchResults.staff.length > 0 || searchResults.clients.length > 0 || searchResults.shifts.length > 0;

  // Filter shifts by search term for display (keep existing for shift list filtering)
  const searchFilteredShifts = shifts.filter(shift => {
    if (!searchTerm) return true;
    const client = clients.find(c => c.id === shift.client_id);
    const assignedStaff = staff.find(s => s.id === shift.assigned_staff_id);

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    return (
      client?.name?.toLowerCase().includes(lowerCaseSearchTerm) ||
      assignedStaff?.first_name?.toLowerCase().includes(lowerCaseSearchTerm) ||
      assignedStaff?.last_name?.toLowerCase().includes(lowerCaseSearchTerm) ||
      shift.role_required?.toLowerCase().includes(lowerCaseSearchTerm) ||
      shift.status?.toLowerCase().includes(lowerCaseSearchTerm) ||
      shift.id?.toLowerCase().includes(lowerCaseSearchTerm)
    );
  });

  // Calculate key metrics, using searchFilteredShifts for display metrics
  const activeStaff = staff.filter(s => s.status === 'active').length;
  const openShifts = searchFilteredShifts.filter(s => s.status === 'open').length;
  const todayShifts = searchFilteredShifts.filter(s => s.date === format(new Date(), 'yyyy-MM-dd')).length;
  
  // Helper for fillRate and completedThisWeek, now based on filtered shifts
  const weekShiftsForMetrics = searchFilteredShifts.filter(s => {
    const shiftDate = new Date(s.date);
    const weekAgo = subDays(new Date(), 7);
    return shiftDate >= weekAgo;
  });

  const completedThisWeek = weekShiftsForMetrics.filter(s => s.status === 'completed').length;
  const fillRate = weekShiftsForMetrics.length > 0 ? ((weekShiftsForMetrics.length - weekShiftsForMetrics.filter(s => s.status === 'open').length) / weekShiftsForMetrics.length * 100) : 0;
  
  // Revenue/Cost metrics are based on timesheets, not filtered by shift search
  const weekRevenue = timesheets
    .filter(t => {
      const tsDate = new Date(t.shift_date);
      const weekAgo = subDays(new Date(), 7);
      return tsDate >= weekAgo && (t.status === 'approved' || t.status === 'paid');
    })
    .reduce((sum, t) => sum + (t.client_charge_amount || 0), 0);

  const weekCosts = timesheets
    .filter(t => {
      const tsDate = new Date(t.shift_date);
      const weekAgo = subDays(new Date(), 7);
      return tsDate >= weekAgo && (t.status === 'approved' || t.status === 'paid');
    })
    .reduce((sum, t) => sum + (t.staff_pay_amount || 0), 0);

  // ✅ NEW: Calculate potential revenue from ALL confirmed/completed shifts (not just approved timesheets)
  const weekPotentialRevenue = shifts
    .filter(s => {
      const shiftDate = new Date(s.date);
      const weekAgo = subDays(new Date(), 7);
      return shiftDate >= weekAgo && 
             (s.status === 'confirmed' || s.status === 'in_progress' || s.status === 'completed' || s.status === 'awaiting_admin_closure');
    })
    .reduce((sum, s) => sum + ((s.charge_rate || 0) * (s.duration_hours || 0)), 0);

  // Use potential revenue if higher than approved timesheet revenue
  const displayRevenue = Math.max(weekRevenue, weekPotentialRevenue);

  const weekMargin = displayRevenue - weekCosts;
  const marginPercentage = displayRevenue > 0 ? (weekMargin / displayRevenue * 100) : 0;

  const pendingTimesheets = timesheets.filter(t => t.status === 'submitted').length;
  const pendingWorkflows = workflows.filter(w => w.status === 'pending').length;

  // ✅ FIX: Safely handle chart data with fallbacks
  const monthlyTrend = Array.from({length: 30}, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayShifts = shifts.filter(s => s.date === dateStr); // Use original 'shifts'
    const dayRevenue = timesheets
      .filter(t => t.shift_date === dateStr && (t.status === 'approved' || t.status === 'paid'))
      .reduce((sum, t) => sum + (t.client_charge_amount || 0), 0);
    
    return {
      date: format(date, 'MMM d'),
      shifts: dayShifts.length || 0,
      filled: dayShifts.filter(s => s.status !== 'open').length || 0,
      revenue: Math.round(dayRevenue) || 0
    };
  });

  // ✅ FIX: Ensure chart always has valid data
  const hasChartData = monthlyTrend.length > 0 && monthlyTrend.some(d => d.shifts > 0 || d.revenue > 0);

  // Action items use ALL shifts/timesheets to ensure critical items are always visible.
  const actionItems = [
    ...shifts
      .filter(s => s.status === 'open' && (s.urgency === 'urgent' || s.urgency === 'critical'))
      .map(s => ({
        id: s.id,
        type: 'urgent_shift',
        priority: s.urgency === 'critical' ? 'critical' : 'high',
        title: `URGENT: ${s.role_required.replace('_', ' ')} needed`,
        description: `${format(new Date(s.date), 'MMM d')} • ${s.start_time}-${s.end_time}`,
        client: clients.find(c => c.id === s.client_id)?.name || 'Unknown',
        date: s.date,
        status: 'open',
        entity: s,
        entityType: 'shift'
      })),
    ...timesheets
      .filter(t => t.status === 'submitted')
      .map(t => ({
        id: t.id,
        type: 'timesheet',
        priority: 'medium',
        title: 'Timesheet awaiting approval',
        description: `${staff.find(s => s.id === t.staff_id)?.first_name || 'Staff'} • ${t.total_hours}h`,
        client: clients.find(c => c.id === t.client_id)?.name || 'Unknown',
        date: t.shift_date,
        status: 'submitted',
        entity: t,
        entityType: 'timesheet'
      })),
  ].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  }).slice(0, 5);

  // ✅ FIXED: Mutations using direct Supabase
  const assignStaffMutation = useMutation({
    mutationFn: async ({ shiftId, staffId }) => {
      const shift = shifts.find(s => s.id === shiftId);
      const assignedStaff = staff.find(s => s.id === staffId);
      const client = clients.find(c => c.id === shift.client_id);
      
      await supabase
        .from('shifts')
        .update({
          status: 'assigned',
          assigned_staff_id: staffId,
          shift_journey_log: [
            ...(shift.shift_journey_log || []),
            {
              state: 'assigned',
              timestamp: new Date().toISOString(),
              user_id: user?.id,
              staff_id: staffId
            }
          ]
        })
        .eq('id', shiftId);
      
      await supabase
        .from('bookings')
        .insert({
          agency_id: shift.agency_id,
          shift_id: shiftId,
          staff_id: staffId,
          client_id: shift.client_id,
          status: 'pending',
          booking_date: new Date().toISOString(),
          shift_date: shift.date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          confirmation_method: 'app'
        });
      
      const emailResult = await NotificationService.notifyShiftAssignment({
        staff: assignedStaff,
        shift: shift,
        client: client
      });
      
      return { emailResult, staffName: `${assignedStaff.first_name} ${assignedStaff.last_name}` };
    },
    onSuccess: ({ emailResult, staffName }) => {
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['bookings']);
      queryClient.invalidateQueries(['staff']);
      queryClient.invalidateQueries(['workflows']);
      queryClient.invalidateQueries(['my-shifts']);
      queryClient.invalidateQueries(['client-shifts']);
      
      setAssigningShift(null);
      
      if (emailResult.success) {
        toast.success(`✅ ${staffName} assigned! Confirmation email sent.`);
      } else {
        toast.warning(`✅ ${staffName} assigned, but email failed to send.`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to assign staff: ${error.message}`);
    }
  });

  const approveTimesheetMutation = useMutation({
    mutationFn: async ({ id }) => {
      await supabase
        .from('timesheets')
        .update({
          status: 'approved',
          client_approved_at: new Date().toISOString()
        })
        .eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['timesheets']);
      toast.success('Timesheet approved');
    }
  });

  const getPriorityBadge = (priority) => {
    const variants = {
      critical: { className: 'bg-red-600 text-white', label: 'CRITICAL' },
      high: { className: 'bg-orange-500 text-white', label: 'HIGH' },
      medium: { className: 'bg-yellow-100 text-yellow-800', label: 'MEDIUM' },
    };
    return variants[priority] || variants.medium;
  };

  // WhatsApp assistant (not yet implemented in Supabase migration)
  const whatsappConnectUrl = null;

  const whatsappAssistantCard = (
    <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              💬 ACG StaffLink AI Assistant
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              {isSuperAdmin 
                ? "Get instant insights across all agencies, shifts, and staff via WhatsApp!" 
                : "Query shifts, staff availability, compliance, and analytics instantly via WhatsApp!"}
            </p>
            <div className="bg-white rounded-lg p-3 mb-4 text-xs space-y-1">
              <p className="text-gray-600">Try asking:</p>
              {isSuperAdmin ? (
                <>
                  <p className="text-green-700">• "Which agencies have the highest fill rate?"</p>
                  <p className="text-green-700">• "Show platform revenue this week"</p>
                  <p className="text-green-700">• "Any critical compliance issues?"</p>
                </>
              ) : (
                <>
                  <p className="text-green-700">• "How many open shifts today?"</p>
                  <p className="text-green-700">• "Who needs compliance renewal?"</p>
                  <p className="text-green-700">• "Show unfilled shifts this week"</p>
                </>
              )}
            </div>
            {whatsappConnectUrl ? (
              <a 
                href={whatsappConnectUrl} 
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Connect WhatsApp Assistant
                </Button>
              </a>
            ) : (
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base"
                onClick={() => window.open('mailto:enterprise@guest-glow.com', '_blank')}
              >
                Request WhatsApp Assistant Access
              </Button>
            )}
            <p className="text-xs text-gray-500 mt-2 text-center">
              🔒 Secure & Private - {isSuperAdmin ? "Platform-wide access" : "Agency data only"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your operations</p>
          {agency && agency.id !== 'super_admin' && ( // Only show agency badge if it's a specific agency
            <Badge className="mt-2 bg-purple-100 text-purple-800">
              {agency.name}
            </Badge>
          )}
        </div>
        
        {/* ✅ QUICK WIN 3: Enhanced Global Search Bar with Results Dropdown */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search staff, clients, shifts..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSearchResults(e.target.value.length >= 2);
            }}
            onFocus={() => searchTerm.length >= 2 && setShowSearchResults(true)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
            className="pl-10"
          />

          {/* Search Results Dropdown */}
          {showSearchResults && hasSearchResults && (
            <Card className="absolute top-full mt-2 w-full z-50 max-h-96 overflow-y-auto shadow-2xl border-2 border-purple-200">
              <CardContent className="p-0">
                {searchResults.staff.length > 0 && (
                  <div className="border-b">
                    <div className="px-4 py-2 bg-blue-50 font-semibold text-sm text-blue-800 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Staff ({searchResults.staff.length})
                    </div>
                    {searchResults.staff.map(s => (
                      <div
                        key={s.id}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3 border-b last:border-b-0"
                        onClick={() => navigate(createPageUrl('Staff'))}
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                          {s.first_name?.[0]}{s.last_name?.[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{s.first_name} {s.last_name}</p>
                          <p className="text-xs text-gray-600">{s.role} • {s.email}</p>
                        </div>
                        <Badge className="text-xs">{s.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.clients.length > 0 && (
                  <div className="border-b">
                    <div className="px-4 py-2 bg-green-50 font-semibold text-sm text-green-800 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Clients ({searchResults.clients.length})
                    </div>
                    {searchResults.clients.map(c => (
                      <div
                        key={c.id}
                        className="px-4 py-3 hover:bg-green-50 cursor-pointer flex items-center gap-3 border-b last:border-b-0"
                        onClick={() => navigate(createPageUrl('Clients'))}
                      >
                        <Building2 className="w-10 h-10 p-2 rounded-full bg-green-100 text-green-600" />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-600">{c.location}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.shifts.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-purple-50 font-semibold text-sm text-purple-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Shifts ({searchResults.shifts.length})
                    </div>
                    {searchResults.shifts.map(shift => {
                      const client = clients.find(c => c.id === shift.client_id);
                      return (
                        <div
                          key={shift.id}
                          className="px-4 py-3 hover:bg-purple-50 cursor-pointer flex items-center gap-3 border-b last:border-b-0"
                          onClick={() => navigate(createPageUrl('Shifts'))}
                        >
                          <Calendar className="w-10 h-10 p-2 rounded-full bg-purple-100 text-purple-600" />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{shift.role_required.replace('_', ' ')}</p>
                            <p className="text-xs text-gray-600">{client?.name} • {format(new Date(shift.date), 'MMM d')}</p>
                          </div>
                          <Badge className="text-xs">{shift.status}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Super Admin View */}
      {isSuperAdmin ? (
        <>
          {/* ✅ IMPROVED: Platform Overview Header */}
          <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white p-8 rounded-2xl shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Activity className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">Platform Control Center</h1>
                    <p className="text-purple-100 text-sm">Real-time oversight across all agencies</p>
                  </div>
                </div>
                <div className="flex gap-6 mt-4">
                  {/* ✅ IMPROVED: Show loading state */}
                  <div>
                    <p className="text-purple-200 text-xs uppercase tracking-wide">Agencies</p>
                    {loadingAgencies ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        <p className="text-2xl font-bold">...</p>
                      </div>
                    ) : (
                      <p className="text-4xl font-bold">{agencies.length}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-purple-200 text-xs uppercase tracking-wide">Total Staff</p>
                    <p className="text-4xl font-bold">{staff.length}</p>
                  </div>
                  <div>
                    <p className="text-purple-200 text-xs uppercase tracking-wide">Active Shifts</p>
                    <p className="text-4xl font-bold">{searchFilteredShifts.filter(s => ['assigned', 'confirmed', 'in_progress'].includes(s.status)).length}</p>
                  </div>
                  <div>
                    <p className="text-purple-200 text-xs uppercase tracking-wide">Platform Revenue (7d)</p>
                    <p className="text-4xl font-bold">£{(displayRevenue / 1000).toFixed(1)}k</p>
                  </div>
                </div>
              </div>
              <Badge className="bg-white/20 text-white text-sm px-4 py-2">
                👑 Super Admin
              </Badge>
            </div>
          </div>

          {/* Platform KPIs */}
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <Target className="w-8 h-8 text-green-600" />
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Fill Rate</p>
                <p className="text-3xl font-bold text-gray-900">{fillRate.toFixed(0)}%</p>
                <p className="text-xs text-green-600 mt-2">+2.3% vs last week</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <CheckCircle className="w-8 h-8 text-blue-600" />
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Completed (7d)</p>
                <p className="text-3xl font-bold text-gray-900">{completedThisWeek}</p>
                <p className="text-xs text-blue-600 mt-2">{weekShiftsForMetrics.length} total shifts</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <DollarSign className="w-8 h-8 text-purple-600" />
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Margin</p>
                <p className="text-3xl font-bold text-gray-900">{marginPercentage.toFixed(1)}%</p>
                <p className="text-xs text-purple-600 mt-2">£{weekMargin.toFixed(0)} profit</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                  {openShifts > 0 && <TrendingUp className="w-5 h-5 text-orange-600" />}
                </div>
                <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Open Shifts</p>
                <p className="text-3xl font-bold text-gray-900">{openShifts}</p>
                <p className="text-xs text-orange-600 mt-2">Require attention</p>
              </CardContent>
            </Card>
          </div>

          {/* ✅ FIX: Only render chart if data exists */}
          {hasChartData && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center justify-between">
                  <span>30-Day Performance Trend</span>
                  <Badge variant="outline">Platform-wide</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="shifts" stroke="#3b82f6" strokeWidth={2} name="Total Shifts" />
                    <Line yAxisId="left" type="monotone" dataKey="filled" stroke="#10b981" strokeWidth={2} name="Filled" />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} name="Revenue (£)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* ✅ IMPROVED: Agency Comparison with loading state */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Agency Performance Comparison
                {loadingAgencies && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loadingAgencies ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading agencies...</p>
                  </div>
                </div>
              ) : agencies.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Agencies Found</h3>
                  <p className="text-gray-600">Create your first agency to get started</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {agencies.map(ag => {
                    // These calculations correctly use the globally fetched staff, shifts, timesheets
                    // which are then filtered by the current agency in the loop, 'ag.id'
                    const agStaff = staff.filter(s => s.agency_id === ag.id);
                    const agShifts = shifts.filter(s => {
                      const shiftDate = new Date(s.date);
                      const weekAgo = subDays(new Date(), 7);
                      return s.agency_id === ag.id && shiftDate >= weekAgo;
                    });
                    const agFillRate = agShifts.length > 0 ? ((agShifts.length - agShifts.filter(s => s.status === 'open').length) / agShifts.length * 100) : 0;
                    const agRevenue = timesheets
                      .filter(t => {
                        const tsDate = new Date(t.shift_date);
                        const weekAgo = subDays(new Date(), 7);
                        return t.agency_id === ag.id && tsDate >= weekAgo && (t.status === 'approved' || t.status === 'paid');
                      })
                      .reduce((sum, t) => sum + (t.client_charge_amount || 0), 0);

                    // ✅ QUICK WIN 2: Calculate Agency Health Score (0-100)
                    const calculateAgencyHealth = () => {
                      let score = 0;
                      // Fill Rate Score (0-30 points)
                      score += Math.min(30, agFillRate * 0.3);
                      // Revenue Score (0-25 points) - £5k/week = 100%
                      score += Math.min(25, (agRevenue / 5000) * 25);
                      // Staff Count Score (0-20 points) - 50 staff = 100%
                      score += Math.min(20, (agStaff.length / 50) * 20);
                      // Activity Score (0-25 points) - 20 shifts/week = 100%
                      score += Math.min(25, (agShifts.length / 20) * 25);
                      return Math.round(Math.min(100, score));
                    };

                    const healthScore = calculateAgencyHealth();
                    const healthColor = healthScore >= 80 ? 'green' : healthScore >= 60 ? 'yellow' : healthScore >= 40 ? 'orange' : 'red';
                    const healthBgColor = healthScore >= 80 ? 'bg-green-100 text-green-800 border-green-300' :
                                         healthScore >= 60 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                         healthScore >= 40 ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                         'bg-red-100 text-red-800 border-red-300';

                    return (
                      <div key={ag.id} className="p-5 border-2 rounded-xl hover:shadow-lg transition-all bg-gradient-to-br from-white to-gray-50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {ag.logo_url ? (
                              <img
                                src={ag.logo_url}
                                alt={ag.name}
                                className="w-12 h-12 rounded-lg object-contain"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-white" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-gray-900">{ag.name}</h3>
                                <Badge className={`text-xs font-bold border ${healthBgColor}`}>
                                  {healthScore >= 80 ? '🟢' : healthScore >= 60 ? '🟡' : healthScore >= 40 ? '🟠' : '🔴'} {healthScore}
                                </Badge>
                              </div>
                              <Badge className="text-xs">{ag.subscription_tier}</Badge>
                            </div>
                          </div>
                          <Award className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">{agStaff.length}</p>
                            <p className="text-xs text-gray-600">Staff</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{agFillRate.toFixed(0)}%</p>
                            <p className="text-xs text-gray-600">Fill Rate</p>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <p className="text-2xl font-bold text-purple-600">£{agRevenue.toFixed(0)}</p>
                            <p className="text-xs text-gray-600">Revenue (7d)</p>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <p className="text-2xl font-bold text-orange-600">{agShifts.filter(s => s.status === 'completed').length}</p>
                            <p className="text-xs text-gray-600">Completed (7d)</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          {whatsappAssistantCard} {/* WhatsApp AI Assistant for Super Admin */}
        </>
      ) : (
        <>
          {/* Agency Admin View */}
          {agency && (
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {agency.logo_url ? (
                    <img 
                      src={agency.logo_url} 
                      alt={agency.name}
                      className="w-16 h-16 rounded-lg object-contain bg-white p-2"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-white/20 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold">{agency.name}</h2>
                    <p className="text-cyan-100 text-sm">
                      {agency.address?.city || 'UK'} • {staff.length} Staff • {clients.length} Clients
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-white/20 text-white mb-2">Agency Dashboard</Badge>
                  <p className="text-3xl font-bold">£{(displayRevenue / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-cyan-100">Revenue (7d)</p>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid md:grid-cols-5 gap-4">
            <Link to={createPageUrl('Staff')}>
              <Card className="border-l-4 border-l-cyan-500 hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <Users className="w-6 h-6 text-cyan-600 mb-2" />
                  <p className="text-xs text-gray-600 uppercase">Active Staff</p>
                  <p className="text-2xl font-bold text-gray-900">{activeStaff}</p>
                  <p className="text-xs text-cyan-600 mt-1">View all →</p>
                </CardContent>
              </Card>
            </Link>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <Target className="w-6 h-6 text-green-600 mb-2" />
                <p className="text-xs text-gray-600 uppercase">Fill Rate</p>
                <p className="text-2xl font-bold text-gray-900">{fillRate.toFixed(0)}%</p>
              </CardContent>
            </Card>

            <Link to={createPageUrl('ShiftCalendar')}>
              <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <Calendar className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-xs text-gray-600 uppercase">Today's Shifts</p>
                  <p className="text-2xl font-bold text-gray-900">{todayShifts}</p>
                  <p className="text-xs text-blue-600 mt-1">View calendar →</p>
                </CardContent>
              </Card>
            </Link>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <DollarSign className="w-6 h-6 text-purple-600 mb-2" />
                <p className="text-xs text-gray-600 uppercase">Margin</p>
                <p className="text-2xl font-bold text-gray-900">{marginPercentage.toFixed(1)}%</p>
              </CardContent>
            </Card>

            <Link to={createPageUrl('Shifts') + '?status=open'}>
              <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <AlertCircle className="w-6 h-6 text-orange-600 mb-2" />
                  <p className="text-xs text-gray-600 uppercase">Open Shifts</p>
                  <p className="text-2xl font-bold text-gray-900">{openShifts}</p>
                  <p className="text-xs text-orange-600 mt-1">Assign now →</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* ✅ FIX: Only render chart if data exists */}
          {hasChartData && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>30-Day Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="shifts" stroke="#3b82f6" strokeWidth={2} name="Shifts" />
                    <Line yAxisId="left" type="monotone" dataKey="filled" stroke="#10b981" strokeWidth={2} name="Filled" />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} name="Revenue (£)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Priority Actions */}
      {actionItems.length > 0 && (
        <Card className="border-2 border-red-200">
          <CardHeader className="bg-red-50 border-b">
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="w-5 h-5" />
              Priority Actions ({actionItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {actionItems.map(item => {
                const badge = getPriorityBadge(item.priority);
                return (
                  <div key={`${item.entityType}-${item.id}`} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 flex-1">
                      <Badge className={badge.className}>{badge.label}</Badge>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-600">{item.description}</p>
                      </div>
                    </div>
                    {item.entityType === 'shift' && (
                      <Button size="sm" onClick={() => setAssigningShift(item.entity)} className="bg-green-600">
                        <UserPlus className="w-3 h-3 mr-1" />
                        Assign
                      </Button>
                    )}
                    {item.entityType === 'timesheet' && (
                      <Button size="sm" onClick={() => approveTimesheetMutation.mutate({ id: item.id })} className="bg-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Link to={createPageUrl('Staff')}>
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Users className="w-5 h-5" />
                <span className="text-sm">Manage Staff</span>
              </Button>
            </Link>
            <Link to={createPageUrl('BulkShiftCreation')}>
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Upload className="w-5 h-5" />
                <span className="text-sm">Bulk Create Shifts</span>
              </Button>
            </Link>
            <Link to={createPageUrl('NaturalLanguageShiftCreator')}>
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-purple-50">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span className="text-sm">AI Shift Creator</span>
              </Button>
            </Link>
            <Link to={createPageUrl('Timesheets')}>
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Clock className="w-5 h-5" />
                <span className="text-sm">Timesheets</span>
              </Button>
            </Link>
            <Link to={createPageUrl('BulkDataImport')}>
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Upload className="w-5 h-5" />
                <span className="text-sm">Bulk Import</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ✅ NEW: Revenue & Margin Quick Links */}
      {!isSuperAdmin && (
        <div className="grid md:grid-cols-2 gap-4">
          <Link to={createPageUrl('CFODashboard')}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-purple-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                  <Badge className="bg-purple-600 text-white">View Details →</Badge>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Revenue Analytics</h3>
                <p className="text-3xl font-bold text-purple-600">£{(displayRevenue / 1000).toFixed(1)}k</p>
                <p className="text-sm text-gray-600 mt-1">7-day revenue</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('PerformanceAnalytics')}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Target className="w-8 h-8 text-green-600" />
                  <Badge className="bg-green-600 text-white">View Details →</Badge>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Profit Margin</h3>
                <p className="text-3xl font-bold text-green-600">{marginPercentage.toFixed(1)}%</p>
                <p className="text-sm text-gray-600 mt-1">£{weekMargin.toFixed(0)} profit (7d)</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {assigningShift && (
        <ShiftAssignmentModal
          shift={assigningShift}
          onAssign={(staffId) => assignStaffMutation.mutate({ shiftId: assigningShift.id, staffId })}
          onClose={() => setAssigningShift(null)}
        />
      )}
    </div>
  );
}
