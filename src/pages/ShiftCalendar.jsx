import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Users, Clock, AlertCircle, CheckCircle, Filter, X, UserPlus, Eye
} from "lucide-react";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, parseISO } from "date-fns";

export default function ShiftCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week'); // day, week, month
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // ✅ NEW: Status filter
  const [currentAgency, setCurrentAgency] = useState(null);

  // Get current user and agency
  useEffect(() => {
    const fetchUser = async () => {
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

      setCurrentAgency(profile.agency_id);
    };
    fetchUser();
  }, []);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts', currentAgency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('agency_id', currentAgency)
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', currentAgency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('agency_id', currentAgency)
        .order('first_name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', currentAgency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('agency_id', currentAgency)
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  // ✅ ENHANCED: Get shifts with ALL filters applied
  const getShiftsForDate = (date) => {
    if (!date) return [];

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      let filteredShifts = shifts.filter(s => {
        if (!s.date) return false;
        try {
          return s.date === dateStr;
        } catch (error) {
          console.error('Invalid shift date:', s.date, error);
          return false;
        }
      });

      // Apply client filter
      if (selectedClient !== 'all') {
        filteredShifts = filteredShifts.filter(s => s.client_id === selectedClient);
      }

      // Apply staff filter
      if (selectedStaff !== 'all') {
        filteredShifts = filteredShifts.filter(s => s.assigned_staff_id === selectedStaff);
      }

      // ✅ NEW: Apply status filter
      if (selectedStatus !== 'all') {
        filteredShifts = filteredShifts.filter(s => s.status === selectedStatus);
      }

      return filteredShifts;
    } catch (error) {
      console.error('Date formatting error in getShiftsForDate:', date, error);
      return [];
    }
  };

  // ✅ ENHANCED: Comprehensive status color coding for ALL statuses
  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-red-100 text-red-800 border-red-300',
      assigned: 'bg-blue-100 text-blue-800 border-blue-300',
      confirmed: 'bg-green-100 text-green-800 border-green-300',
      in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      awaiting_admin_closure: 'bg-orange-100 text-orange-800 border-orange-300',
      completed: 'bg-green-200 text-green-900 border-green-400',
      cancelled: 'bg-gray-200 text-gray-700 border-gray-300',
      no_show: 'bg-red-200 text-red-900 border-red-400',
      disputed: 'bg-purple-100 text-purple-800 border-purple-300'
    };
    return colors[status] || colors.open;
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unassigned';
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  const goToPrevious = () => {
    if (view === 'day') {
      setCurrentDate(addDays(currentDate, -1));
    } else if (view === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    }
  };

  const goToNext = () => {
    if (view === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date) => {
    try {
      const today = new Date();
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    } catch (error) {
      return false;
    }
  };

  const isInCurrentMonth = (date) => {
    try {
      return date.getMonth() === currentDate.getMonth() &&
             date.getFullYear() === currentDate.getFullYear();
    } catch (error) {
      return false;
    }
  };

  // ✅ ENHANCED: Calculate stats for ALL statuses
  const stats = useMemo(() => {
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const todayShifts = shifts.filter(s => {
        if (!s.date) return false;
        try {
          return s.date === todayStr;
        } catch (error) {
          console.error('Invalid shift date in stats:', s.date);
          return false;
        }
      });

      return {
        total: shifts.length,
        open: shifts.filter(s => s.status === 'open').length,
        assigned: shifts.filter(s => s.status === 'assigned').length,
        confirmed: shifts.filter(s => s.status === 'confirmed').length,
        in_progress: shifts.filter(s => s.status === 'in_progress').length,
        awaiting_closure: shifts.filter(s => s.status === 'awaiting_admin_closure').length,
        completed: shifts.filter(s => s.status === 'completed').length,
        cancelled: shifts.filter(s => s.status === 'cancelled').length,
        no_show: shifts.filter(s => s.status === 'no_show').length,
        disputed: shifts.filter(s => s.status === 'disputed').length,
        today: todayShifts.length,
        todayOpen: todayShifts.filter(s => s.status === 'open').length
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        total: 0, open: 0, assigned: 0, confirmed: 0, in_progress: 0,
        awaiting_closure: 0, completed: 0, cancelled: 0, no_show: 0, disputed: 0,
        today: 0, todayOpen: 0
      };
    }
  }, [shifts]);

  const getDatesToDisplay = () => {
    try {
      if (view === 'day') {
        return [currentDate];
      } else if (view === 'week') {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
        return Array.from({ length: 7 }, (_, i) => addDays(start, i));
      } else {
        // Month view
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startDate = startOfWeek(firstDay, { weekStartsOn: 1 });
        const endDate = endOfWeek(lastDay, { weekStartsOn: 1 });

        const days = [];
        let day = new Date(startDate);
        while (day <= endDate) {
          days.push(new Date(day));
          day = addDays(day, 1);
        }
        return days;
      }
    } catch (error) {
      console.error('Error in getDatesToDisplay:', error);
      return [new Date()];
    }
  };

  const dates = useMemo(() => getDatesToDisplay(), [currentDate, view]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agency Calendar</h2>
          <p className="text-gray-600 mt-1">Holistic overview of all shifts and staffing coverage</p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('PostShiftV2')}>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600">
              <UserPlus className="w-4 h-4 mr-2" />
              Create Shift
            </Button>
          </Link>
        </div>
      </div>

      {/* ✅ ENHANCED: Stats Row with ALL statuses */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('all')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Shifts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('open')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-semibold">Open</p>
                <p className="text-2xl font-bold text-red-600">{stats.open}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('assigned')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-semibold">Assigned</p>
                <p className="text-2xl font-bold text-blue-600">{stats.assigned}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('confirmed')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-semibold">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('completed')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 font-semibold">Completed</p>
                <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ ENHANCED: Filters with Status dropdown */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            {/* Left: Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staff.map(staffMember => (
                    <SelectItem key={staffMember.id} value={staffMember.id}>
                      {staffMember.first_name} {staffMember.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* ✅ NEW: Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">🔴 Open ({stats.open})</SelectItem>
                  <SelectItem value="assigned">🔵 Assigned ({stats.assigned})</SelectItem>
                  <SelectItem value="confirmed">🟢 Confirmed ({stats.confirmed})</SelectItem>
                  <SelectItem value="in_progress">🟡 In Progress ({stats.in_progress})</SelectItem>
                  <SelectItem value="awaiting_admin_closure">🟠 Awaiting Closure ({stats.awaiting_closure})</SelectItem>
                  <SelectItem value="completed">✅ Completed ({stats.completed})</SelectItem>
                  <SelectItem value="cancelled">⚫ Cancelled ({stats.cancelled})</SelectItem>
                  <SelectItem value="no_show">❌ No Show ({stats.no_show})</SelectItem>
                  <SelectItem value="disputed">🟣 Disputed ({stats.disputed})</SelectItem>
                </SelectContent>
              </Select>

              {(selectedClient !== 'all' || selectedStaff !== 'all' || selectedStatus !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedClient('all');
                    setSelectedStaff('all');
                    setSelectedStatus('all');
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All Filters
                </Button>
              )}
            </div>

            {/* Right: View Toggles */}
            <div className="flex gap-2">
              <Button
                variant={view === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('day')}
              >
                Day
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('week')}
              >
                Week
              </Button>
              <Button
                variant={view === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('month')}
              >
                Month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {view === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
              {view === 'week' && `${format(startOfWeek(currentDate, {weekStartsOn: 1}), 'MMM d')} - ${format(endOfWeek(currentDate, {weekStartsOn: 1}), 'MMM d, yyyy')}`}
              {view === 'month' && format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goToPrevious}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNext}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Week/Day View */}
          {(view === 'week' || view === 'day') && (
            <div className="grid" style={{ gridTemplateColumns: `repeat(${getDatesToDisplay().length}, minmax(0, 1fr))` }}>
              {getDatesToDisplay().map((date, idx) => {
                const dayShifts = getShiftsForDate(date);
                const isTodayDate = isToday(date);

                return (
                  <div
                    key={idx}
                    className={`border-r last:border-r-0 min-h-[500px] ${isTodayDate ? 'bg-cyan-50' : 'bg-white'}`}
                  >
                    <div className={`p-3 border-b font-semibold text-center ${isTodayDate ? 'bg-cyan-600 text-white' : 'bg-gray-50 text-gray-900'}`}>
                      <div className="text-xs uppercase tracking-wide">{format(date, 'EEE')}</div>
                      <div className="text-lg">{format(date, 'd')}</div>
                    </div>
                    <div className="p-2 space-y-2">
                      {dayShifts.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No shifts</p>
                      ) : (
                        dayShifts.map(shift => (
                          <Link key={shift.id} to={`${createPageUrl('Shifts')}?id=${shift.id}`}>
                            <div
                              className={`p-2 rounded-lg cursor-pointer hover:shadow-md transition-all text-xs border-l-4 ${getStatusColor(shift.status)}`}
                            >
                              <div className="font-semibold truncate">{getClientName(shift.client_id)}</div>
                              <div className="text-gray-600 text-[10px]">{shift.start_time} - {shift.end_time}</div>
                              <div className="text-gray-500 text-[10px] truncate capitalize">{shift.role_required?.replace('_', ' ')}</div>
                              {shift.assigned_staff_id && (
                                <div className="text-gray-700 text-[10px] font-medium mt-1 truncate">
                                  👤 {getStaffName(shift.assigned_staff_id)}
                                </div>
                              )}
                              <Badge className={`${getStatusColor(shift.status)} text-[9px] mt-1 px-1 py-0`}>
                                {shift.status?.replace('_', ' ')}
                              </Badge>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Month View */}
          {view === 'month' && (
            <div>
              <div className="grid grid-cols-7 border-b">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="p-2 text-center font-semibold text-sm bg-gray-50">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {getDatesToDisplay().map((date, idx) => {
                  const dayShifts = getShiftsForDate(date);
                  const isTodayDate = isToday(date);
                  const isCurrentMonth = isInCurrentMonth(date);

                  return (
                    <div
                      key={idx}
                      className={`border-r border-b min-h-[120px] p-2 ${
                        isTodayDate ? 'bg-cyan-50' :
                        !isCurrentMonth ? 'bg-gray-50 opacity-50' : 'bg-white'
                      }`}
                    >
                      <div className={`text-sm font-semibold mb-1 ${isTodayDate ? 'text-cyan-600' : 'text-gray-700'}`}>
                        {format(date, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayShifts.slice(0, 3).map(shift => {
                          const statusColor = getStatusColor(shift.status);
                          return (
                            <Link key={shift.id} to={`${createPageUrl('Shifts')}?id=${shift.id}`}>
                              <div className={`text-[10px] p-1 rounded cursor-pointer hover:opacity-80 ${statusColor}`}>
                                <div className="font-medium truncate">{getClientName(shift.client_id)}</div>
                                <div className="text-gray-600">{shift.start_time}</div>
                              </div>
                            </Link>
                          );
                        })}
                        {dayShifts.length > 3 && (
                          <div className="text-[10px] text-gray-500 font-semibold">
                            +{dayShifts.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ NEW: Legend for Status Colors */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-sm">Status Legend</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border-2 border-red-300"></div>
              <span className="text-xs text-gray-700">Open</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-100 border-2 border-blue-300"></div>
              <span className="text-xs text-gray-700">Assigned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-300"></div>
              <span className="text-xs text-gray-700">Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100 border-2 border-yellow-300"></div>
              <span className="text-xs text-gray-700">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-100 border-2 border-orange-300"></div>
              <span className="text-xs text-gray-700">Awaiting Closure</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-200 border-2 border-green-400"></div>
              <span className="text-xs text-gray-700">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-200 border-2 border-gray-300"></div>
              <span className="text-xs text-gray-700">Cancelled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-200 border-2 border-red-400"></div>
              <span className="text-xs text-gray-700">No Show</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-100 border-2 border-purple-300"></div>
              <span className="text-xs text-gray-700">Disputed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading calendar...</p>
        </div>
      )}
    </div>
  );
}