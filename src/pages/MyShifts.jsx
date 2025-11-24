import React, { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon, Clock, MapPin, DollarSign,
  Upload, CheckCircle, AlertCircle, XCircle,
  TrendingUp, CalendarCheck, CalendarClock
} from "lucide-react";
import { format, isSameDay, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { toast } from "sonner";

/**
 * 📅 MY SHIFTS PAGE
 *
 * Staff-focused shift management with:
 * - Small calendar widget (date picker style)
 * - List of shifts for selected date
 * - Mobile-first card design
 * - Quick actions: confirm, upload timesheet, view details
 */

export default function MyShifts() {
  const [user, setUser] = useState(null);
  const [staffRecord, setStaffRecord] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const navigate = useNavigate();

  // Get current user and staff record
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.error('❌ Not authenticated:', authError);
        navigate(createPageUrl('Login'));
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

      setUser(profile);

      // Get staff record
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (staffError) {
        console.error('❌ Staff record not found:', staffError);
        return;
      }

      setStaffRecord(staff);
    };
    fetchUser();
  }, [navigate]);

  // Fetch all shifts for current month
  // ⚡ OPTIMIZATION: Key by MONTH, not selected date, to prevent refetch on day click
  const { data: allShifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['myShifts', staffRecord?.id, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from('shifts')
        .select('*, clients(name)')
        .eq('assigned_staff_id', staffRecord.id)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!staffRecord?.id,
    placeholderData: keepPreviousData, // Keep showing previous month while loading next
  });

  // Fetch timesheets
  const { data: timesheets = [] } = useQuery({
    queryKey: ['myTimesheets', staffRecord?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('staff_id', staffRecord.id);

      if (error) {
        console.error('❌ Error fetching timesheets:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!staffRecord?.id,
  });

  // Get shifts for selected date (no filtering by status - staff sees everything for the date)
  const shiftsForSelectedDate = allShifts.filter(shift => {
    try {
      const shiftDate = parseISO(shift.date);
      return isSameDay(shiftDate, selectedDate);
    } catch {
      return false;
    }
  });

  // ✨ STATUS-BASED CALENDAR COLORS with Priority System
  // Priority: Issues (Red) > Needs Action (Yellow/Orange) > Confirmed (Green) > Completed (Light Green)

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper function to get highest priority status for a date
  const getDatePriorityStatus = (dateStr) => {
    const shiftsOnDate = allShifts.filter(s => s.date === dateStr);

    // Priority 1: Issues (no_show, disputed, cancelled)
    if (shiftsOnDate.some(s => ['no_show', 'disputed'].includes(s.status))) {
      return 'issue';
    }

    // Priority 2: Needs timesheet
    if (shiftsOnDate.some(s => s.status === 'awaiting_admin_closure' && !s.timesheet_received)) {
      return 'needsTimesheet';
    }

    // Priority 3: Needs confirmation
    if (shiftsOnDate.some(s => ['awaiting_staff_confirmation', 'assigned'].includes(s.status))) {
      return 'needsConfirmation';
    }

    // Priority 4: Confirmed
    if (shiftsOnDate.some(s => ['confirmed', 'in_progress'].includes(s.status))) {
      return 'confirmed';
    }

    // Priority 5: Completed
    if (shiftsOnDate.some(s => s.status === 'completed')) {
      return 'completed';
    }

    return null;
  };

  // Get unique dates and categorize by priority status
  const uniqueDates = [...new Set(allShifts.map(s => s.date))];

  const datesWithIssues = [];
  const datesNeedingTimesheet = [];
  const datesNeedingConfirmation = [];
  const datesConfirmed = [];
  const datesCompleted = [];

  uniqueDates.forEach(dateStr => {
    const priorityStatus = getDatePriorityStatus(dateStr);
    const date = parseISO(dateStr);

    if (priorityStatus === 'issue') {
      datesWithIssues.push(date);
    } else if (priorityStatus === 'needsTimesheet') {
      datesNeedingTimesheet.push(date);
    } else if (priorityStatus === 'needsConfirmation') {
      datesNeedingConfirmation.push(date);
    } else if (priorityStatus === 'confirmed') {
      datesConfirmed.push(date);
    } else if (priorityStatus === 'completed') {
      datesCompleted.push(date);
    }
  });

  // Debug: Log status-based dates
  console.log('🔴 Dates with issues:', datesWithIssues.map(d => format(d, 'yyyy-MM-dd')));
  console.log('🟠 Dates needing timesheet:', datesNeedingTimesheet.map(d => format(d, 'yyyy-MM-dd')));
  console.log('🟡 Dates needing confirmation:', datesNeedingConfirmation.map(d => format(d, 'yyyy-MM-dd')));
  console.log('🟢 Dates confirmed:', datesConfirmed.map(d => format(d, 'yyyy-MM-dd')));
  console.log('✅ Dates completed:', datesCompleted.map(d => format(d, 'yyyy-MM-dd')));

  // Get status badge
  const getStatusBadge = (status) => {
    const config = {
      confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-800' },
      assigned: { label: 'Awaiting Confirmation', className: 'bg-blue-100 text-blue-800' },
      awaiting_staff_confirmation: { label: 'Please Confirm', className: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Completed', className: 'bg-green-200 text-green-900' },
      awaiting_admin_closure: { label: 'Under Review', className: 'bg-orange-100 text-orange-800' },
      no_show: { label: 'No Show', className: 'bg-red-100 text-red-800' },
      disputed: { label: 'Disputed', className: 'bg-purple-100 text-purple-800' },
      cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
      in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-800' },
    };
    return config[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
  };

  // Navigate to today
  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
  };

  // Handle date selection - update both selected date and month view
  const handleDateSelect = (date) => {
    if (date) {
      setSelectedDate(date);
      setCurrentMonth(date);
    }
  };

  // ✨ SMART STATS - Actionable metrics for staff
  const shiftsNeedingAction = allShifts.filter(s =>
    ['awaiting_staff_confirmation', 'assigned'].includes(s.status) ||
    (s.status === 'awaiting_admin_closure' && !s.timesheet_received)
  );

  const shiftsConfirmed = allShifts.filter(s =>
    ['confirmed', 'in_progress'].includes(s.status)
  );

  const shiftsCompleted = allShifts.filter(s =>
    s.status === 'completed'
  );

  const shiftsWithIssues = allShifts.filter(s =>
    ['no_show', 'disputed', 'cancelled'].includes(s.status)
  );

  const shiftStats = {
    needsAction: shiftsNeedingAction.length,
    confirmed: shiftsConfirmed.length,
    completed: shiftsCompleted.length,
    issues: shiftsWithIssues.length,
  };

  if (shiftsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          {/* Enhanced Loading Skeleton */}
          <div className="max-w-7xl mx-auto px-4 space-y-4">
            {/* Header Skeleton */}
            <div className="h-32 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg animate-pulse"></div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Calendar Skeleton */}
              <div className="lg:col-span-1">
                <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>

              {/* Shifts Skeleton */}
              <div className="lg:col-span-2 space-y-3">
                <div className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your shifts...</p>
            <p className="text-sm text-gray-500 mt-1">Fetching your schedule</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-20 px-3 sm:px-4 md:px-6">
      {/* Compact Header with Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg p-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-7 h-7 sm:w-8 sm:h-8" />
            <h1 className="text-xl sm:text-2xl font-bold">My Shifts</h1>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 hidden sm:flex">
            {format(new Date(), 'MMMM yyyy')}
          </Badge>
        </div>

        {/* Quick Stats Cards - Actionable Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-orange-300" />
              <span className="text-xs text-white/80 font-medium">Needs Action</span>
            </div>
            <p className="text-2xl font-bold">{shiftStats.needsAction}</p>
            <p className="text-xs text-white/70 mt-0.5">Confirm/Upload</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-300" />
              <span className="text-xs text-white/80 font-medium">Confirmed</span>
            </div>
            <p className="text-2xl font-bold">{shiftStats.confirmed}</p>
            <p className="text-xs text-white/70 mt-0.5">Ready to work</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-300" />
              <span className="text-xs text-white/80 font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold">{shiftStats.completed}</p>
            <p className="text-xs text-white/70 mt-0.5">Finished</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-300" />
              <span className="text-xs text-white/80 font-medium">Issues</span>
            </div>
            <p className="text-2xl font-bold">{shiftStats.issues}</p>
            <p className="text-xs text-white/70 mt-0.5">Need attention</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* LEFT: Calendar Widget */}
        <div className="lg:col-span-1">
          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">Select Date</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={goToToday}
                  className="h-8 px-3 text-xs font-medium"
                  aria-label="Jump to today's date"
                >
                  Today
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <style>{`
                /* FULL WIDTH CALENDAR */
                .staff-calendar-container {
                  width: 100%;
                  padding: 10px;
                }

                .staff-calendar-container .rdp {
                  --rdp-cell-size: 40px;
                  width: 100% !important;
                  margin: 0 !important;
                }

                .staff-calendar-container .rdp-months,
                .staff-calendar-container .rdp-month,
                .staff-calendar-container .rdp-table,
                .staff-calendar-container .rdp-head,
                .staff-calendar-container .rdp-tbody {
                  width: 100% !important;
                }

                .staff-calendar-container .rdp-table {
                  max-width: 100% !important;
                  border-collapse: collapse;
                }

                /* BASE BUTTON STYLES */
                .staff-calendar-container .rdp-button {
                  border-radius: 50% !important;
                  width: 40px !important;
                  height: 40px !important;
                  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
                  border: 2px solid transparent;
                }

                /* --- STATUS BACKGROUNDS (Normal State) --- */
                
                .staff-calendar-container .rdp-button.status-issue {
                  background-color: #ef4444 !important;
                  color: white !important;
                  font-weight: 700 !important;
                }

                .staff-calendar-container .rdp-button.status-needsTimesheet {
                  background-color: #f97316 !important;
                  color: white !important;
                  font-weight: 700 !important;
                }

                .staff-calendar-container .rdp-button.status-needsConfirmation {
                  background-color: #eab308 !important;
                  color: white !important;
                  font-weight: 700 !important;
                }

                .staff-calendar-container .rdp-button.status-confirmed {
                  background-color: #10b981 !important;
                  color: white !important;
                  font-weight: 700 !important;
                }

                .staff-calendar-container .rdp-button.status-completed {
                  background-color: #6ee7b7 !important;
                  color: #065f46 !important;
                  font-weight: 700 !important;
                }

                /* --- SELECTED STATE FOR STATUS ITEMS (Keep Color + Add Ring) --- */
                /* We explicitly target each one to ensure specificity wins over default selection */

                .staff-calendar-container .rdp-button.status-issue[aria-selected="true"] {
                  background-color: #ef4444 !important;
                  box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #1e3a8a, 0 10px 15px -3px rgba(0, 0, 0, 0.2) !important;
                  transform: scale(1.2) !important;
                  z-index: 20;
                  opacity: 1 !important;
                }

                .staff-calendar-container .rdp-button.status-needsTimesheet[aria-selected="true"] {
                  background-color: #f97316 !important;
                  box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #1e3a8a, 0 10px 15px -3px rgba(0, 0, 0, 0.2) !important;
                  transform: scale(1.2) !important;
                  z-index: 20;
                  opacity: 1 !important;
                }

                .staff-calendar-container .rdp-button.status-needsConfirmation[aria-selected="true"] {
                  background-color: #eab308 !important;
                  box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #1e3a8a, 0 10px 15px -3px rgba(0, 0, 0, 0.2) !important;
                  transform: scale(1.2) !important;
                  z-index: 20;
                  opacity: 1 !important;
                }

                .staff-calendar-container .rdp-button.status-confirmed[aria-selected="true"] {
                  background-color: #10b981 !important;
                  box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #1e3a8a, 0 10px 15px -3px rgba(0, 0, 0, 0.2) !important;
                  transform: scale(1.2) !important;
                  z-index: 20;
                  opacity: 1 !important;
                }

                .staff-calendar-container .rdp-button.status-completed[aria-selected="true"] {
                  background-color: #6ee7b7 !important;
                  box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #1e3a8a, 0 10px 15px -3px rgba(0, 0, 0, 0.2) !important;
                  transform: scale(1.2) !important;
                  z-index: 20;
                  opacity: 1 !important;
                }

                /* --- DEFAULT SELECTED STATE (No Status) --- */
                /* Target buttons that are selected BUT do NOT have any status class */
                .staff-calendar-container .rdp-button[aria-selected="true"]:not(.status-issue):not(.status-needsTimesheet):not(.status-needsConfirmation):not(.status-confirmed):not(.status-completed) {
                  background-color: #1e3a8a !important;
                  color: white !important;
                  transform: scale(1.2) !important;
                  box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #1e3a8a, 0 10px 15px -3px rgba(0, 0, 0, 0.2) !important;
                  z-index: 20;
                }

                /* --- TODAY STATE --- */
                .staff-calendar-container .rdp-day_today .rdp-button {
                  border-color: #ef4444 !important;
                }

                /* Hover effects */
                .staff-calendar-container .rdp-button:hover:not([aria-selected="true"]) {
                  transform: scale(1.1) !important;
                  background-color: rgba(0,0,0,0.05);
                  z-index: 10;
                }

                /* Accessibility */
                .staff-calendar-container .rdp-button:focus-visible {
                  outline: 2px solid #3b82f6 !important;
                  outline-offset: 2px !important;
                }
              `}</style>
              <div className="staff-calendar-container">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  modifiers={{
                    hasIssue: datesWithIssues,
                    needsTimesheet: datesNeedingTimesheet,
                    needsConfirmation: datesNeedingConfirmation,
                    confirmed: datesConfirmed,
                    completed: datesCompleted,
                  }}
                  modifiersClassNames={{
                    hasIssue: 'status-issue',
                    needsTimesheet: 'status-needsTimesheet',
                    needsConfirmation: 'status-needsConfirmation',
                    confirmed: 'status-confirmed',
                    completed: 'status-completed',
                  }}
                  classNames={{
                    day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 rounded-full transition-all relative flex items-center justify-center",
                    day_selected: "bg-transparent text-foreground hover:bg-transparent focus:bg-transparent", /* Remove default blue bg so our CSS wins */
                  }}
                />
              </div>

              {/* ✨ STATUS-BASED CALENDAR LEGEND */}
              <div className="mt-4">
                <Card className="border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-gray-600" />
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Calendar Guide</span>
                      </div>

                      <div className="space-y-1.5">
                        {/* Red - Issues */}
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">{datesWithIssues.length}</span>
                          </div>
                          <span className="text-xs text-gray-700 font-medium">Issue (No-show, Disputed)</span>
                        </div>

                        {/* Orange - Needs Timesheet */}
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">{datesNeedingTimesheet.length}</span>
                          </div>
                          <span className="text-xs text-gray-700 font-medium">Upload Timesheet</span>
                        </div>

                        {/* Yellow - Needs Confirmation */}
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">{datesNeedingConfirmation.length}</span>
                          </div>
                          <span className="text-xs text-gray-700 font-medium">Confirm Shift</span>
                        </div>

                        {/* Green - Confirmed */}
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">{datesConfirmed.length}</span>
                          </div>
                          <span className="text-xs text-gray-700 font-medium">Confirmed & Ready</span>
                        </div>

                        {/* Light Green - Completed */}
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-300 flex items-center justify-center flex-shrink-0">
                            <span className="text-emerald-900 text-xs font-bold">{datesCompleted.length}</span>
                          </div>
                          <span className="text-xs text-gray-700 font-medium">Completed</span>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-200 my-2"></div>

                        {/* Today */}
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full border-2 border-red-500 flex items-center justify-center flex-shrink-0" style={{ borderWidth: '2px' }}>
                            <span className="text-gray-700 text-xs font-bold">{format(new Date(), 'd')}</span>
                          </div>
                          <span className="text-xs text-gray-700 font-medium">Today (Red ring)</span>
                        </div>

                        {/* Selected */}
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full border-2 border-blue-900 flex items-center justify-center flex-shrink-0" style={{ borderWidth: '2px' }}>
                            <span className="text-gray-700 text-xs font-bold">{format(selectedDate, 'd')}</span>
                          </div>
                          <span className="text-xs text-gray-700 font-medium">Selected (Navy ring)</span>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-600 italic">
                          💡 Click any colored date to view shift details
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Shift List */}
        <div className="lg:col-span-2 space-y-3">
          {/* Date Header with Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b-2 border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h2>
            {shiftsForSelectedDate.length > 0 && (
              <Badge className="bg-blue-600 text-white w-fit px-3 py-1.5 text-sm font-bold">
                {shiftsForSelectedDate.length} shift{shiftsForSelectedDate.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {shiftsForSelectedDate.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-300 shadow-none">
              <CardContent className="p-8 sm:p-12 text-center">
                <div className="max-w-sm mx-auto">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarIcon className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No shifts scheduled</h3>
                  <p className="text-sm text-gray-600 mb-1">
                    You don't have any shifts on this date.
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Select a different date or browse available shifts.
                  </p>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 font-semibold"
                    onClick={() => navigate(createPageUrl('ShiftMarketplace'))}
                  >
                    <CalendarCheck className="w-4 h-4 mr-2" />
                    Find Available Shifts
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            shiftsForSelectedDate.map((shift) => {
              const statusBadge = getStatusBadge(shift.status);
              const timesheet = timesheets.find(t => t.shift_id === shift.id);
              const actualHours = timesheet?.total_hours;
              const scheduledHours = shift.duration_hours;
              const payRate = shift.pay_rate || staffRecord?.hourly_rate || 15;
              const estimatedPay = (scheduledHours * payRate).toFixed(2);
              const actualPay = actualHours ? (actualHours * payRate).toFixed(2) : null;
              const isPastShift = new Date(shift.date) < new Date();

              return (
                <Card
                  key={shift.id}
                  className="hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-200"
                >
                  <CardContent className="p-4 sm:p-6">
                    {/* Status Badge and Action Button */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                      <Badge className={`${statusBadge.className} text-sm px-4 py-1.5 font-semibold`}>
                        {statusBadge.label}
                      </Badge>
                      {shift.status === 'awaiting_staff_confirmation' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 font-semibold shadow-md w-full sm:w-auto"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm Shift
                        </Button>
                      )}
                    </div>

                    {/* Client Name - Enhanced */}
                    <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Client Location</p>
                        <p className="font-bold text-lg text-gray-900">
                          {shift.clients?.name || 'Care Home'}
                        </p>
                      </div>
                    </div>

                    {/* Shift Details Grid - Enhanced */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                      {/* Time Card */}
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 shadow-sm">
                        <div className="flex items-center gap-2 text-blue-700 mb-2">
                          <Clock className="w-5 h-5" />
                          <span className="font-bold text-sm uppercase tracking-wide">Time</span>
                        </div>
                        <p className="text-xl font-bold text-gray-900 mb-1">
                          {shift.start_time} - {shift.end_time}
                        </p>
                        <p className="text-sm font-medium text-blue-700">
                          {isPastShift && actualHours
                            ? `${actualHours}h worked`
                            : `${scheduledHours}h scheduled`}
                        </p>
                      </div>

                      {/* Pay Card */}
                      <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 shadow-sm">
                        <div className="flex items-center gap-2 text-green-700 mb-2">
                          <DollarSign className="w-5 h-5" />
                          <span className="font-bold text-sm uppercase tracking-wide">Pay</span>
                        </div>
                        <p className="text-xl font-bold text-gray-900 mb-1">
                          £{actualPay || estimatedPay}
                        </p>
                        <p className="text-sm font-medium text-green-700">
                          {actualPay ? 'Actual earnings' : 'Estimated earnings'}
                        </p>
                      </div>
                    </div>

                    {/* Contextual Actions/Messages - Enhanced */}
                    {isPastShift && shift.status === 'awaiting_admin_closure' && !shift.timesheet_received && (
                      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0">
                            <Upload className="w-5 h-5 text-orange-700" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-orange-900 mb-1">
                              Timesheet Required
                            </p>
                            <p className="text-xs text-orange-800">
                              Upload your timesheet to complete this shift and receive payment
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => navigate(createPageUrl('Timesheets'))}
                          className="bg-orange-600 hover:bg-orange-700 font-semibold shadow-md w-full sm:w-auto"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Now
                        </Button>
                      </div>
                    )}

                    {shift.status === 'no_show' && (
                      <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-xl p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-red-200 rounded-full flex items-center justify-center flex-shrink-0">
                            <XCircle className="w-5 h-5 text-red-700" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-red-900 mb-1">
                              No Show Recorded
                            </p>
                            <p className="text-xs text-red-800">
                              This shift was marked as a no-show. If this is incorrect, please contact your agency immediately.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {shift.status === 'disputed' && (
                      <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-300 rounded-xl p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-purple-700" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-purple-900 mb-1">
                              Shift Under Review
                            </p>
                            <p className="text-xs text-purple-800">
                              There's a dispute regarding this shift. Please contact your agency to resolve this matter.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {shift.status === 'completed' && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-5 h-5 text-green-700" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-green-900 mb-1">
                              Shift Completed Successfully
                            </p>
                            <p className="text-xs text-green-800">
                              Great work! This shift has been completed and payment is being processed.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Work Location - Enhanced */}
                    {shift.work_location_within_site && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Work Location</p>
                            <p className="text-sm text-gray-900 font-semibold">
                              {shift.work_location_within_site}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

