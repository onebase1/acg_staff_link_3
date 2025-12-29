
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Filter,
    RefreshCw,
    Calendar,
    LayoutGrid,
    Activity,
    PlusCircle,
    ListFilter,
    X,
    User,
    Clock,
    UserPlus,
    CheckCircle2,
    Users,
    Plus,
    List,
    ChevronDown,
    Phone,
    MessageSquare,
    Building2
} from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useNavigate, Link } from 'react-router-dom';
import LiveRotaCard from '@/components/LiveRotaCard';
import { toast } from 'sonner';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 as LucideLoader } from 'lucide-react';
import { NotificationService } from '@/components/notifications/NotificationService';
import { Badge } from '@/components/ui/badge';

export default function LiveRota() {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [assigningShift, setAssigningShift] = useState(null);
    const [selectedStaff, setSelectedStaff] = useState('');
    const [viewType, setViewType] = useState('table'); // 'table' by default as per owner request
    const [groupBy, setGroupBy] = useState(() => localStorage.getItem('liverota_groupBy') || 'client'); // 'client' or 'date'
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [showOnlyOpen, setShowOnlyOpen] = useState(false);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Calculate week range (Monday to Sunday)
    const weekRange = useMemo(() => {
        const start = new Date(currentDate);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(start.setDate(diff));
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        return { start: monday, end: sunday };
    }, [currentDate]);

    // Fetch shifts for the week
    const { data: shifts = [], isLoading, refetch } = useQuery({
        queryKey: ['live-rota-shifts', weekRange],
        queryFn: async () => {
            console.log('📡 Fetching Live Rota Shifts...', weekRange);
            const { data, error } = await supabase
                .from('shifts')
                .select(`
          *,
          client:client_id(id, name),
          staff:assigned_staff_id(id, first_name, last_name, phone)
        `)
                .gte('date', weekRange.start.toISOString())
                .lte('date', weekRange.end.toISOString())
                .order('date', { ascending: true });

            if (error) throw error;

            console.log('📡 Fetch Results:', data?.length, 'shifts found');

            // Transform for the UI - ensure staff data is flattened and standardized
            return data.map(s => ({
                ...s,
                assigned_staff_id: s.assigned_staff_id,
                client_name: s.client?.name || 'Unknown Client',
                staff_name: s.staff ? `${s.staff.first_name} ${s.staff.last_name || ''}` : null,
                staff_phone: s.staff?.phone
            }));
        }
    });

    // Fetch available staff for assignment
    const { data: staffList = [] } = useQuery({
        queryKey: ['active-staff'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('staff')
                .select('id, first_name, last_name, status')
                .eq('status', 'active')
                .order('first_name');
            if (error) throw error;
            return data;
        },
        enabled: !!assigningShift
    });

    // Mutations
    const updateStatusMutation = useMutation({
        mutationFn: async ({ shiftId, status }) => {
            const { data, error } = await supabase
                .from('shifts')
                .update({ status })
                .eq('id', shiftId)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['live-rota-shifts']);
            toast.success('Status updated');
        }
    });

    const assignStaffMutation = useMutation({
        mutationFn: async ({ shiftId, staffId }) => {
            // 1. Get Shift & Staff Details for the full workflow
            const { data: shift, error: shiftFetchError } = await supabase
                .from('shifts')
                .select('*')
                .eq('id', shiftId)
                .single();
            if (shiftFetchError) throw shiftFetchError;

            const { data: staffMember, error: staffFetchError } = await supabase
                .from('staff')
                .select('*')
                .eq('id', staffId)
                .single();
            if (staffFetchError) throw staffFetchError;

            const { data: client, error: clientFetchError } = await supabase
                .from('clients')
                .select('*')
                .eq('id', shift.client_id)
                .single();
            if (clientFetchError) throw clientFetchError;

            const { data: agency, error: agencyFetchError } = await supabase
                .from('agencies')
                .select('*')
                .eq('id', shift.agency_id)
                .single();
            if (agencyFetchError) throw agencyFetchError;

            // 2. Update Shift
            const { error: updateError } = await supabase
                .from('shifts')
                .update({
                    assigned_staff_id: staffId,
                    status: 'assigned',
                    updated_date: new Date().toISOString(),
                    shift_journey_log: [
                        ...(shift.shift_journey_log || []),
                        {
                            state: 'assigned',
                            timestamp: new Date().toISOString(),
                            assigned_staff_id: staffId,
                            method: 'live_rota_quick_assign',
                            notes: 'Quick assigned via Live Rota'
                        }
                    ]
                })
                .eq('id', shiftId);
            if (updateError) throw updateError;

            // 3. Create Booking
            const { data: booking, error: bookingError } = await supabase
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
                })
                .select()
                .single();
            if (bookingError) throw bookingError;

            // 4. Auto-Timesheet
            try {
                await supabase.functions.invoke('auto-timesheet-creator', {
                    body: {
                        booking_id: booking.id,
                        shift_id: shiftId,
                        staff_id: staffId,
                        client_id: shift.client_id,
                        agency_id: shift.agency_id
                    }
                });
            } catch (tsError) {
                console.error('Timesheet creation failed:', tsError);
            }

            // 5. Notify Staff (Email, SMS, WhatsApp)
            try {
                const updatedShift = { ...shift, status: 'assigned', assigned_staff_id: staffId };
                await NotificationService.notifyShiftAssignment({
                    staff: staffMember,
                    shift: updatedShift,
                    client: client,
                    agency: agency,
                    useBatching: true
                });
            } catch (notifError) {
                console.error('Notification failed:', notifError);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['live-rota-shifts']);
            toast.success('Staff assigned successfully');
            setAssigningShift(null);
            setSelectedStaff('');
        },
        onError: (error) => {
            toast.error(`Assignment failed: ${error.message}`);
        }
    });

    // Memoized filtered shifts for both stats and grouping
    const filteredShifts = useMemo(() => {
        let filtered = shifts.map(s => ({
            ...s,
            client_name: s.client?.name || 'Unknown Client',
            staff_name: s.staff ? `${s.staff.first_name} ${s.staff.last_name}` : null
        })).filter(s =>
            s.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.staff_name && s.staff_name.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        if (showOnlyOpen) {
            filtered = filtered.filter(s => !s.assigned_staff_id);
        }

        return filtered;
    }, [shifts, searchTerm, showOnlyOpen]);

    // 🆕 Grouping Logic
    const groupedData = useMemo(() => {
        const groups = filteredShifts.reduce((acc, shift) => {
            const groupKey = groupBy === 'client' ? shift.client_name : shift.date;
            if (!acc[groupKey]) acc[groupKey] = [];
            acc[groupKey].push(shift);
            return acc;
        }, {});

        // Return sorted entries
        return Object.entries(groups).sort(([a], [b]) => {
            if (groupBy === 'date') return new Date(b).getTime() - new Date(a).getTime();
            return a.localeCompare(b);
        });
    }, [filteredShifts, groupBy]);

    // 🆕 Persist grouping preference
    useEffect(() => {
        localStorage.setItem('liverota_groupBy', groupBy);
    }, [groupBy]);

    // 🆕 Auto-expand groups with open shifts
    useEffect(() => {
        const newExpanded = new Set();
        groupedData.forEach(([key, shifts]) => {
            if (shifts.some(s => !s.assigned_staff_id)) {
                newExpanded.add(key);
            }
        });
        // If no open shifts, expand the first group
        if (newExpanded.size === 0 && groupedData.length > 0) {
            newExpanded.add(groupedData[0][0]);
        }
        setExpandedGroups(newExpanded);
    }, [groupedData]);

    const toggleGroup = (key) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const navigateWeek = (direction) => {
        const next = new Date(currentDate);
        next.setDate(currentDate.getDate() + (direction * 7));
        setCurrentDate(next);
    };

    const handleAssign = (shiftId) => {
        setAssigningShift(shiftId);
    };

    const handleStatusCycle = async (shiftId, currentStatus) => {
        const statuses = ['open', 'assigned', 'confirmed'];
        const currentIndex = statuses.indexOf(currentStatus);
        const nextStatus = statuses[(currentIndex + 1) % statuses.length];

        updateStatusMutation.mutate({ shiftId, status: nextStatus });

        // If cycling to confirmed, trigger notification (logic from Shifts.jsx confirmation)
        if (nextStatus === 'confirmed') {
            try {
                const { data: shift } = await supabase
                    .from('shifts')
                    .select('*, staff:assigned_staff_id(*), client:client_id(*), agency:agency_id(*)')
                    .eq('id', shiftId)
                    .single();
                if (shift && shift.staff) {
                    await NotificationService.notifyShiftConfirmedToStaff({
                        staff: shift.staff,
                        shift: shift,
                        client: shift.client,
                        agency: shift.agency
                    });
                }
            } catch (error) {
                console.error('Notification failed during status cycle:', error);
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b">
                <div className="p-4 space-y-4 max-w-lg mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-4">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-4 bg-white/50 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                                <button
                                    onClick={() => setViewType('cards')}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${viewType === 'cards' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                    Mobile Cards
                                </button>
                                <button
                                    onClick={() => setViewType('table')}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${viewType === 'table' ? 'bg-slate-800 text-white shadow-lg shadow-slate-300' : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    <List className="w-4 h-4" />
                                    Tabular List
                                </button>
                            </div>

                            {viewType === 'table' && (
                                <div className="flex items-center gap-2 px-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Group By:</span>
                                    <button onClick={() => setGroupBy('client')} className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded transition-all ${groupBy === 'client' ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-50'}`}>Company</button>
                                    <button onClick={() => setGroupBy('date')} className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded transition-all ${groupBy === 'date' ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-50'}`}>Date</button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetch()}
                                className="h-10 rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50 active:scale-95 transition-all"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Link to={`/PostShiftV2?date=${weekRange.start.toISOString().split('T')[0]}`}>
                                <Button className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 font-bold text-xs active:scale-95 transition-all outline-none">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Requirement
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                            <Button variant="ghost" size="sm" className="h-9 w-9" onClick={() => navigateWeek(-1)}>
                                <ChevronLeft className="w-5 h-5 text-slate-600" />
                            </Button>
                            <div className="flex-1 text-center py-1">
                                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">
                                    {weekRange.start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {weekRange.end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-9 w-9" onClick={() => navigateWeek(1)}>
                                <ChevronRight className="w-5 h-5 text-slate-600" />
                            </Button>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search Client or Staff..."
                            className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Main Rota Content - Dynamic Width for Professional View */}
            <div className={`mx-auto p-4 space-y-8 transition-all duration-500 ${viewType === 'table' ? 'max-w-4xl' : 'max-w-lg'}`}>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                        <RotaLoader className="w-8 h-8 animate-spin" />
                        <p className="font-bold flex items-center gap-2">Loading Live Rota...</p>
                    </div>
                ) : Object.keys(groupedData).length === 0 ? (
                    <div className="text-center py-20 space-y-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                            <Calendar className="w-10 h-10 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-bold">No shifts found for this week.</p>
                        <Button variant="outline" onClick={() => setSearchTerm('')}>Clear Filters</Button>
                    </div>
                ) : viewType === 'cards' ? (
                    groupedData.map(([groupKey, groupShifts]) => {
                        // Group shifts by date for each group (client/date)
                        const shiftsByDate = groupShifts.reduce((acc, shift) => {
                            const dateKey = shift.date;
                            if (!acc[dateKey]) acc[dateKey] = [];
                            acc[dateKey].push(shift);
                            return acc;
                        }, {});

                        return (
                            <div key={groupKey} className="space-y-6">
                                {groupBy === 'client' && (
                                    <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <h2 className="font-bold text-slate-800 text-lg tracking-tight">
                                            {groupKey}
                                        </h2>
                                    </div>
                                )}

                                {Object.entries(shiftsByDate).sort().map(([date, shifts]) => (
                                    <LiveRotaCard
                                        key={date}
                                        date={date}
                                        shifts={shifts}
                                        onAssign={handleAssign}
                                        onStatusChange={handleStatusCycle}
                                    />
                                ))}
                            </div>
                        );
                    })
                ) : (
                    /* Tabular View */
                    <Card className="rounded-2xl shadow-sm overflow-hidden border">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-bold text-[10px] uppercase text-slate-400 w-[120px] tracking-wider">Time Slot</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">Service Role / Personnel</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase text-slate-400 text-center w-[100px] tracking-wider">Fulfillment</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedData.map(([groupKey, groupShifts]) => (
                                    <React.Fragment key={groupKey}>
                                        {/* Premium Collapsible Group Header */}
                                        <TableRow
                                            className="bg-slate-50 hover:bg-slate-100 border-y border-slate-200 cursor-pointer group/header"
                                            onClick={() => toggleGroup(groupKey)}
                                        >
                                            <TableCell colSpan={3} className="py-3 px-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-1 rounded bg-white border border-slate-200 shadow-sm text-slate-400 group-hover/header:text-blue-600 transition-colors">
                                                            {expandedGroups.has(groupKey) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[11px] font-bold text-slate-700 tracking-wide">
                                                                {groupBy === 'date' ? new Date(groupKey).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', weekday: 'short' }) : groupKey}
                                                            </span>
                                                            <div className="px-1.5 py-0.5 bg-blue-600/10 text-blue-600 rounded-md text-[9px] font-bold">
                                                                {groupShifts.length} {groupShifts.length === 1 ? 'Entry' : 'Entries'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {groupShifts.some(s => !s.assigned_staff_id) && (
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-[9px] font-bold uppercase tracking-tight border border-red-100 animate-pulse">
                                                            <UserPlus className="w-3 h-3" />
                                                            Action Required
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>

                                        {/* Data Rows (Conditional Rendering) */}
                                        {expandedGroups.has(groupKey) && groupShifts.map((s) => (
                                            <TableRow key={s.id} className="group hover:bg-blue-50/30 transition-all border-b border-slate-100">
                                                <TableCell className="w-[120px] py-4">
                                                    <div className="bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200 group-hover:bg-white group-hover:border-blue-200 transition-all">
                                                        <div className="text-[11px] font-bold text-slate-700 tabular-nums">
                                                            {s.start_time} - {s.end_time}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-900 text-sm tracking-tight">
                                                                {groupBy === 'date' ? s.client_name : s.role_display}
                                                            </span>
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[9px] font-bold uppercase px-2 shadow-sm ${s.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                    s.status === 'assigned' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                                        'bg-red-50 text-red-700 border-red-100'
                                                                    }`}
                                                            >
                                                                {s.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-1">
                                                            {groupBy === 'date' && <span className="text-[10px] font-bold text-blue-600 uppercase mr-1">{s.role_display}</span>}
                                                            {s.assigned_staff_id ? (
                                                                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                                                    <Users className="w-3 h-3" />
                                                                    {s.staff_name}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs font-bold text-red-500/80 italic animate-pulse px-2 py-0.5 bg-red-50 rounded">Awaiting Personnel</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center pr-4">
                                                    <div
                                                        className={`group/btn relative w-10 h-10 mx-auto rounded-2xl flex items-center justify-center cursor-pointer border-2 transition-all duration-300 shadow-sm ${s.assigned_staff_id
                                                            ? 'bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-600 hover:rotate-6 active:scale-95'
                                                            : 'bg-white border-red-200 text-red-500 hover:border-red-400 hover:bg-red-50 hover:-rotate-6 active:scale-95 shadow-lg shadow-red-100'
                                                            }`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!s.assigned_staff_id) handleAssign(s.id);
                                                            else handleStatusCycle(s.id, s.status);
                                                        }}
                                                    >
                                                        {s.assigned_staff_id ? (
                                                            <CheckCircle2 className="w-5 h-5 drop-shadow-sm" />
                                                        ) : (
                                                            <UserPlus className="w-5 h-5 drop-shadow-sm" />
                                                        )}
                                                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-inherit rounded-full" />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </div>

            {/* Assignment Modal */}
            <Dialog open={!!assigningShift} onOpenChange={() => setAssigningShift(null)}>
                <DialogContent className="max-w-xs rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Quick Assign</DialogTitle>
                        <DialogDescription className="font-semibold text-slate-500">
                            Select available staff for this shift.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                            <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue placeholder="Select Staff Member" />
                            </SelectTrigger>
                            <SelectContent>
                                {staffList.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.first_name} {s.last_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button
                            className="w-full h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700"
                            disabled={!selectedStaff || assignStaffMutation.isPending}
                            onClick={() => assignStaffMutation.mutate({ shiftId: assigningShift, staffId: selectedStaff })}
                        >
                            {assignStaffMutation.isPending ? <LucideLoader className="w-4 h-4 animate-spin mr-2" /> : null}
                            Confirm Assignment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Stats Summary Tooltip */}
            <div className="fixed bottom-6 right-6 z-50">
                <div className={`
                bg-slate-900 text-white p-1 rounded-3xl shadow-2xl flex items-center transition-all duration-300
                ${showOnlyOpen ? 'ring-4 ring-red-500/30' : ''}
            `}>
                    <div
                        className={`px-5 py-3 text-center cursor-pointer hover:bg-white/10 rounded-2xl transition-colors ${!showOnlyOpen ? 'bg-white/5' : ''}`}
                        onClick={() => setShowOnlyOpen(false)}
                    >
                        <div className="text-blue-400 text-[10px] font-bold uppercase tracking-widest leading-none mb-1">Filled</div>
                        <div className="text-xl font-bold leading-none">{filteredShifts.filter(s => s.assigned_staff_id).length}</div>
                    </div>
                    <div className="w-[1px] h-8 bg-slate-700 mx-1"></div>
                    <div
                        className={`px-5 py-3 text-center cursor-pointer hover:bg-white/10 rounded-2xl transition-colors ${showOnlyOpen ? 'bg-red-500/20' : ''}`}
                        onClick={() => setShowOnlyOpen(!showOnlyOpen)}
                    >
                        <div className="text-red-400 text-[10px] font-bold uppercase tracking-widest leading-none mb-1">Open</div>
                        <div className="text-xl font-bold leading-none">{filteredShifts.filter(s => !s.assigned_staff_id).length}</div>
                    </div>
                    {(showOnlyOpen || searchTerm) && (
                        <div
                            className="ml-2 pr-4 pl-1 cursor-pointer text-white/50 hover:text-white transition-colors"
                            onClick={() => {
                                setShowOnlyOpen(false);
                                setSearchTerm('');
                            }}
                        >
                            <X className="w-4 h-4" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function RotaLoader(props) {
    return <RefreshCw {...props} className={props.className} />
}
