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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedDayShifts, setSelectedDayShifts] = useState(null); // For mobile month view

  // Handle Resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Agency Calendar</h2>
          <p className="text-slate-500 text-xs md:text-sm font-bold uppercase tracking-widest mt-1">Holistic Overview</p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <Link to={createPageUrl('PostShiftV2')} className="flex-1 md:flex-none">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl font-black shadow-lg shadow-blue-200">
              <UserPlus className="w-4 h-4 mr-2" />
              Create Shift
            </Button>
          </Link>
        </div>
      </div>

      {/* ✅ ENHANCED: Stats Row - Scrollable on Mobile */}
      <div className="flex md:grid md:grid-cols-5 gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar">
        <Card className="min-w-[140px] cursor-pointer hover:shadow-md transition-all border-slate-200 rounded-2xl" onClick={() => setSelectedStatus('all')}>
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Total</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-black text-slate-800">{stats.total}</p>
              <CalendarIcon className="w-5 h-5 text-slate-300 mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-[140px] cursor-pointer hover:shadow-md transition-all border-red-100 bg-red-50/30 rounded-2xl" onClick={() => setSelectedStatus('all')}>
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase text-red-600 tracking-widest mb-1">Open</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-black text-red-600">{stats.open}</p>
              <AlertCircle className="w-5 h-5 text-red-300 mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-[140px] cursor-pointer hover:shadow-md transition-all border-blue-100 bg-blue-50/30 rounded-2xl" onClick={() => setSelectedStatus('assigned')}>
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-1">Assigned</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-black text-blue-600">{stats.assigned}</p>
              <Clock className="w-5 h-5 text-blue-300 mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-[140px] cursor-pointer hover:shadow-md transition-all border-emerald-100 bg-emerald-50/30 rounded-2xl" onClick={() => setSelectedStatus('confirmed')}>
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">Confirmed</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-black text-emerald-600">{stats.confirmed}</p>
              <CheckCircle className="w-5 h-5 text-emerald-300 mb-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-[140px] cursor-pointer hover:shadow-md transition-all border-slate-200 rounded-2xl" onClick={() => setSelectedStatus('completed')}>
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Done</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-black text-slate-700">{stats.completed}</p>
              <CheckCircle className="w-5 h-5 text-slate-300 mb-1" />
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
              {view === 'week' && `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`}
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
            <div className={`grid ${isMobile && view === 'week' ? 'grid-cols-1 divide-y' : ''}`} style={!isMobile || view === 'day' ? { gridTemplateColumns: `repeat(${getDatesToDisplay().length}, minmax(0, 1fr))` } : {}}>
              {getDatesToDisplay().map((date, idx) => {
                const dayShifts = getShiftsForDate(date);
                const isTodayDate = isToday(date);

                if (isMobile && view === 'week' && dayShifts.length === 0) return null;

                return (
                  <div
                    key={idx}
                    className={`border-r last:border-r-0 min-h-[100px] md:min-h-[500px] ${isTodayDate ? 'bg-indigo-50/50' : 'bg-white'}`}
                  >
                    <div className={`p-3 border-b flex md:flex-col items-center gap-3 md:gap-0 font-black ${isTodayDate ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-700'}`}>
                      <div className="text-[10px] uppercase tracking-widest opacity-80">{format(date, 'EEE')}</div>
                      <div className="text-lg md:text-xl leading-none">{format(date, 'd')}</div>
                      {isMobile && view === 'week' && (
                        <div className="ml-auto text-[10px] font-black uppercase tracking-tighter text-slate-400">
                          {dayShifts.length} {dayShifts.length === 1 ? 'Shift' : 'Shifts'}
                        </div>
                      )}
                    </div>
                    <div className="p-3 md:p-2 space-y-3 md:space-y-2">
                      {dayShifts.length === 0 ? (
                        <p className="text-[10px] font-bold text-slate-400 text-center py-6 italic uppercase tracking-widest">No shifts</p>
                      ) : (
                        dayShifts.map(shift => (
                          <Link key={shift.id} to={`${createPageUrl('Shifts')}?id=${shift.id}`}>
                            <div
                              className={`p-3 md:p-2 rounded-2xl md:rounded-lg cursor-pointer hover:shadow-md transition-all text-xs border md:border-l-4 shadow-sm ${getStatusColor(shift.status)} active:scale-[0.98]`}
                            >
                              <div className="font-black text-slate-800 truncate mb-1">{getClientName(shift.client_id)}</div>
                              <div className="flex items-center gap-1.5 text-slate-600 text-[10px] font-bold mb-1">
                                <Clock className="w-2.5 h-2.5" />
                                {shift.start_time} - {shift.end_time}
                              </div>
                              <p className="text-[9px] font-bold uppercase tracking-tighter text-slate-500 truncate mb-2">
                                {shift.role_display || shift.role_required?.replace('_', ' ')}
                              </p>
                              <div className="flex items-center justify-between">
                                {shift.assigned_staff_id ? (
                                  <div className="text-slate-700 text-[9px] font-black flex items-center gap-1">
                                    <div className="w-4 h-4 rounded-full bg-white/50 flex items-center justify-center border font-black">
                                      {getStaffName(shift.assigned_staff_id)[0]}
                                    </div>
                                    {getStaffName(shift.assigned_staff_id)}
                                  </div>
                                ) : (
                                  <span className="text-[8px] font-black uppercase text-red-500 bg-red-50 px-1 rounded">Open REQ</span>
                                )}
                                <Badge className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0 border-none shadow-none ${getStatusColor(shift.status)}`}>
                                  {shift.status?.replace('_', ' ')}
                                </Badge>
                              </div>
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
            <div className="bg-white">
              <div className="grid grid-cols-7 border-b bg-slate-50">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className="py-2 text-center font-black text-[10px] text-slate-400 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {getDatesToDisplay().map((date, idx) => {
                  const dayShifts = getShiftsForDate(date);
                  const isTodayDate = isToday(date);
                  const isCurrentMonth = isInCurrentMonth(date);
                  const hasOpen = dayShifts.some(s => s.status === 'open');

                  return (
                    <div
                      key={idx}
                      onClick={() => isMobile && setSelectedDayShifts({ date, shifts: dayShifts })}
                      className={`border-r border-b aspect-square md:aspect-auto md:min-h-[120px] p-1 md:p-2 relative transition-colors cursor-pointer ${isTodayDate ? 'bg-indigo-50/50' :
                        !isCurrentMonth ? 'bg-slate-50/50 opacity-40' : 'bg-white hover:bg-slate-50'
                        }`}
                    >
                      <div className={`text-xs font-black ${isTodayDate ? 'text-indigo-600' : 'text-slate-600'}`}>
                        {format(date, 'd')}
                      </div>

                      {/* Mobile Dots */}
                      <div className="flex md:hidden justify-center gap-0.5 mt-1">
                        {dayShifts.slice(0, 3).map((s, i) => (
                          <div key={i} className={`w-1 h-1 rounded-full ${s.status === 'open' ? 'bg-red-400' : 'bg-blue-400'}`} />
                        ))}
                      </div>

                      <div className="hidden md:block space-y-1 mt-1">
                        {dayShifts.slice(0, 3).map(shift => {
                          const statusColor = getStatusColor(shift.status);
                          return (
                            <Link key={shift.id} to={`${createPageUrl('Shifts')}?id=${shift.id}`}>
                              <div className={`text-[9px] font-bold p-1 rounded-md cursor-pointer hover:opacity-80 transition-opacity truncate ${statusColor}`}>
                                {getClientName(shift.client_id)} • {shift.start_time}
                              </div>
                            </Link>
                          );
                        })}
                        {dayShifts.length > 3 && (
                          <div className="text-[8px] text-slate-400 font-black uppercase text-center">
                            +{dayShifts.length - 3} MORE
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Selected Day Detail Drawer/Section */}
              {isMobile && selectedDayShifts && (
                <div className="p-4 border-t bg-slate-50/80 animate-in slide-in-from-bottom duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-slate-800 uppercase tracking-tight">
                      {format(selectedDayShifts.date, 'EEEE, MMM d')}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDayShifts(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {selectedDayShifts.shifts.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No shifts on this date.</p>
                    ) : (
                      selectedDayShifts.shifts.map(shift => (
                        <Link key={shift.id} to={`${createPageUrl('Shifts')}?id=${shift.id}`}>
                          <div className={`p-4 rounded-2xl border bg-white shadow-sm flex justify-between items-center ${getStatusColor(shift.status)}`}>
                            <div>
                              <p className="font-black text-slate-800 text-sm mb-1">{getClientName(shift.client_id)}</p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {shift.start_time} - {shift.end_time}
                              </p>
                            </div>
                            <Badge className={`font-black uppercase text-[8px] ${getStatusColor(shift.status)}`}>
                              {shift.status}
                            </Badge>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
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

      {
        isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading calendar...</p>
          </div>
        )
      }
    </div >
  );
}