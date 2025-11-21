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
  Upload, CheckCircle, AlertCircle, XCircle, Filter, ChevronDown
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
  const datesWithShifts = allShifts.map(shift => {
    try {
      return parseISO(shift.date);
    } catch {
      return null;
    }
  }).filter(Boolean);

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

  if (shiftsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your shifts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-20 px-3 sm:px-4 md:px-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg p-4 sm:p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <CalendarIcon className="w-8 h-8" />
          <h1 className="text-2xl sm:text-3xl font-bold">My Shifts</h1>
        </div>
        <p className="text-blue-100">View and manage your upcoming and past shifts</p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* LEFT: Calendar Widget */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Date</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <style>{`
                /* Make calendar full width */
                .rdp {
                  width: 100%;
                  margin: 0;
                }
                .rdp-months {
                  width: 100%;
                }
                .rdp-month {
                  width: 100%;
                }
                .rdp-table {
                  width: 100%;
                  max-width: 100%;
                }

                /* Style dates with shifts - bold + circle + color */
                .rdp-day_has-shift {
                  font-weight: bold;
                  position: relative;
                }
                .rdp-day_has-shift .rdp-day_button {
                  background-color: #3b82f6 !important;
                  color: white !important;
                  border-radius: 50% !important;
                  font-weight: 700 !important;
                }
                .rdp-day_has-shift .rdp-day_button:hover {
                  background-color: #2563eb !important;
                }

                /* Today's date - red circle */
                .rdp-day_today .rdp-day_button {
                  border: 2px solid #ef4444 !important;
                  font-weight: bold !important;
                }

                /* Selected date - darker blue */
                .rdp-day_selected .rdp-day_button {
                  background-color: #1e40af !important;
                  color: white !important;
                  border-radius: 50% !important;
                }
              `}</style>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border w-full"
                modifiers={{
                  hasShift: datesWithShifts,
                }}
                modifiersClassNames={{
                  hasShift: 'rdp-day_has-shift',
                }}
              />

              {/* Quick Stats */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total shifts this month:</span>
                  <Badge variant="outline">{allShifts.length}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Shifts on selected date:</span>
                  <Badge className="bg-blue-600">{shiftsForSelectedDate.length}</Badge>
                </div>
              </div>

              {/* Status Filter */}
              <div className="mt-4">
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Filter by Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm"
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
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h2>
            {shiftsForSelectedDate.length > 0 && (
              <Badge className="bg-blue-600">
                {shiftsForSelectedDate.length} shift{shiftsForSelectedDate.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {shiftsForSelectedDate.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-semibold mb-1">No shifts on this date</p>
                <p className="text-sm text-gray-500">Select a different date or check the shift marketplace</p>
                <Button
                  className="mt-4"
                  onClick={() => navigate(createPageUrl('ShiftMarketplace'))}
                >
                  Find Shifts
                </Button>
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
                <Card key={shift.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    {/* Status Badge */}
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={`${statusBadge.className} text-sm px-3 py-1`}>
                        {statusBadge.label}
                      </Badge>
                      {shift.status === 'awaiting_staff_confirmation' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm Shift
                        </Button>
                      )}
                    </div>

                    {/* Client Name */}
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <span className="font-bold text-lg text-gray-900">
                        {shift.clients?.name || 'Care Home'}
                      </span>
                    </div>

                    {/* Shift Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      {/* Time Card */}
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="font-semibold text-sm">Time</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          {shift.start_time} - {shift.end_time}
                        </p>
                        <p className="text-sm text-gray-600">
                          {isPastShift && actualHours
                            ? `${actualHours}h worked`
                            : `${scheduledHours}h scheduled`}
                        </p>
                      </div>

                      {/* Pay Card */}
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-semibold text-sm">Pay</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          £{actualPay || estimatedPay}
                        </p>
                        <p className="text-sm text-gray-600">
                          {actualPay ? 'Actual earnings' : 'Estimated earnings'}
                        </p>
                      </div>
                    </div>

                    {/* Contextual Actions/Messages */}
                    {isPastShift && shift.status === 'awaiting_admin_closure' && !shift.timesheet_received && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-orange-800 mb-1">
                            ⚠️ Timesheet Pending
                          </p>
                          <p className="text-sm text-orange-700">
                            Please upload your timesheet to complete this shift
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => navigate(createPageUrl('Timesheets'))}
                          className="bg-orange-600 hover:bg-orange-700 ml-2"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                      </div>
                    )}

                    {shift.status === 'no_show' && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-red-800 mb-1">
                          ❌ No Show Recorded
                        </p>
                        <p className="text-sm text-red-700">
                          Please contact your agency if this is incorrect
                        </p>
                      </div>
                    )}

                    {shift.status === 'disputed' && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-purple-800 mb-1">
                          ⚠️ Shift Under Review
                        </p>
                        <p className="text-sm text-purple-700">
                          Please contact your agency to resolve this issue
                        </p>
                      </div>
                    )}

                    {/* Work Location */}
                    {shift.work_location_within_site && (
                      <p className="text-sm text-gray-600 mt-3">
                        📍 Location: {shift.work_location_within_site}
                      </p>
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

