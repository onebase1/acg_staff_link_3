import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon, Clock, MapPin, DollarSign,
  Upload, CheckCircle, AlertCircle, XCircle, Filter, ChevronDown,
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
  const [statusFilter, setStatusFilter] = useState('all');
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
  const { data: allShifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['myShifts', staffRecord?.id, selectedDate],
    queryFn: async () => {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);

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

  // Get shifts for selected date
  const shiftsForSelectedDate = allShifts.filter(shift => {
    try {
      const shiftDate = parseISO(shift.date);
      const matchesDate = isSameDay(shiftDate, selectedDate);
      const matchesStatus = statusFilter === 'all' || shift.status === statusFilter;
      return matchesDate && matchesStatus;
    } catch {
      return false;
    }
  });

  // Get dates with shifts for calendar highlighting
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const datesWithShifts = allShifts.map(shift => {
    try {
      return parseISO(shift.date);
    } catch {
      return null;
    }
  }).filter(Boolean);

  // Separate past and future shifts for different colors
  // Exclude selected date to let CSS styling show through
  const selectedDateNormalized = new Date(selectedDate);
  selectedDateNormalized.setHours(0, 0, 0, 0);

  const pastShiftDates = datesWithShifts.filter(date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d < today && d.getTime() !== selectedDateNormalized.getTime();
  });

  const futureShiftDates = datesWithShifts.filter(date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d > today && d.getTime() !== selectedDateNormalized.getTime();
  });

  const todayShiftDates = datesWithShifts.filter(date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime() && d.getTime() !== selectedDateNormalized.getTime();
  });

  // Debug: Log dates with shifts
  console.log('🔵 Dates with shifts:', datesWithShifts.map(d => format(d, 'yyyy-MM-dd')));
  console.log('⏮️ Past shifts:', pastShiftDates.map(d => format(d, 'yyyy-MM-dd')));
  console.log('⏭️ Future shifts:', futureShiftDates.map(d => format(d, 'yyyy-MM-dd')));
  console.log('📅 Today shifts:', todayShiftDates.map(d => format(d, 'yyyy-MM-dd')));

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

  // Get shift count by status for stats
  const shiftStats = {
    total: allShifts.length,
    confirmed: allShifts.filter(s => s.status === 'confirmed').length,
    pending: allShifts.filter(s => s.status === 'awaiting_staff_confirmation').length,
    completed: allShifts.filter(s => s.status === 'completed').length,
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

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <CalendarCheck className="w-4 h-4 text-white/80" />
              <span className="text-xs text-white/80 font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold">{shiftStats.total}</p>
            <p className="text-xs text-white/70 mt-0.5">This month</p>
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
              <CalendarClock className="w-4 h-4 text-yellow-300" />
              <span className="text-xs text-white/80 font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold">{shiftStats.pending}</p>
            <p className="text-xs text-white/70 mt-0.5">Needs action</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-300" />
              <span className="text-xs text-white/80 font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold">{shiftStats.completed}</p>
            <p className="text-xs text-white/70 mt-0.5">Finished</p>
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
                /* FULL WIDTH CALENDAR - Force 100% */
                .staff-calendar-container {
                  width: 100%;
                  overflow: hidden;
                }

                .staff-calendar-container .rdp {
                  --rdp-cell-size: 40px;
                  width: 100% !important;
                  margin: 0 !important;
                }

                .staff-calendar-container .rdp-months {
                  width: 100% !important;
                }

                .staff-calendar-container .rdp-month {
                  width: 100% !important;
                }

                .staff-calendar-container .rdp-table {
                  width: 100% !important;
                  max-width: 100% !important;
                }

                .staff-calendar-container .rdp-head,
                .staff-calendar-container .rdp-tbody {
                  width: 100% !important;
                }

                /* Make all buttons circular by default */
                .staff-calendar-container .rdp-button {
                  border-radius: 50% !important;
                  width: 40px !important;
                  height: 40px !important;
                  transition: all 0.2s ease !important;
                }

                /* RED RING for today - High priority, no background override */
                .staff-calendar-container .rdp-day_today .rdp-button {
                  border: 3px solid #ef4444 !important;
                  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
                }

                /* NAVY BLUE with red border for selected date - Highest priority */
                .staff-calendar-container .rdp-day_selected .rdp-button {
                  background-color: #1e3a8a !important;  /* Navy blue (blue-900) */
                  color: white !important;
                  font-weight: 700 !important;
                  border: 3px solid #ef4444 !important;  /* Red border */
                  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3) !important;  /* Red glow */
                }

                /* Today + Selected = Navy with stronger red border */
                .staff-calendar-container .rdp-day_today.rdp-day_selected .rdp-button {
                  background-color: #1e3a8a !important;  /* Navy blue */
                  color: white !important;
                  border: 3px solid #ef4444 !important;  /* Red border (matches today ring) */
                  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4) !important;  /* Stronger red glow */
                }

                /* Hover effects */
                .staff-calendar-container .rdp-button:hover:not(.rdp-day_selected .rdp-button) {
                  transform: scale(1.08) !important;
                  opacity: 0.9 !important;
                }

                /* Accessibility - focus states */
                .staff-calendar-container .rdp-button:focus-visible {
                  outline: 3px solid #3b82f6 !important;
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
                    pastShift: pastShiftDates,
                    futureShift: futureShiftDates,
                    todayShift: todayShiftDates,
                  }}
                  modifiersStyles={{
                    pastShift: {
                      backgroundColor: '#9ca3af',  // Gray for past shifts
                      color: 'white',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                    },
                    futureShift: {
                      backgroundColor: '#3b82f6',  // Blue for future shifts
                      color: 'white',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                    },
                    todayShift: {
                      backgroundColor: '#10b981',  // Green for today's shifts
                      color: 'white',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                    }
                  }}
                  classNames={{
                    day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 rounded-full transition-all",
                  }}
                />
              </div>

              {/* Enhanced Metrics Cards */}
              <div className="mt-4 space-y-2">
                <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-700">This Month</span>
                      </div>
                      <Badge variant="outline" className="text-base font-bold px-2">
                        {allShifts.length}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-100 bg-gradient-to-br from-green-50 to-white">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-semibold text-gray-700">Selected Date</span>
                      </div>
                      <Badge className="bg-green-600 text-base font-bold">
                        {shiftsForSelectedDate.length}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Enhanced Status Filter */}
              <div className="mt-4">
                <label
                  htmlFor="status-filter"
                  className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"
                >
                  <Filter className="w-4 h-4 text-gray-500" />
                  Filter by Status
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer hover:border-gray-400"
                  aria-label="Filter shifts by status"
                >
                  <option value="all">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="assigned">Awaiting Confirmation</option>
                  <option value="awaiting_staff_confirmation">Please Confirm</option>
                  <option value="completed">Completed</option>
                  <option value="awaiting_admin_closure">Under Review</option>
                </select>
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

