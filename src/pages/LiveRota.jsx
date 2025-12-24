
import React, { useState, useMemo } from 'react';
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
    Calendar as CalendarIcon,
    LayoutGrid,
    Activity,
    PlusCircle,
    ListFilter,
    X,
    User,
    Clock
} from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import LiveRotaCard from '@/components/LiveRotaCard';
import { toast } from 'sonner';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 as LucideLoader } from 'lucide-react';
import { NotificationService } from '@/components/notifications/NotificationService';

export default function LiveRota() {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [assigningShift, setAssigningShift] = useState(null);
    const [selectedStaff, setSelectedStaff] = useState('');
    const [viewType, setViewType] = useState('cards'); // 'cards' or 'table'
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
                staff_id: s.assigned_staff_id || s.staff_id, // Normalize column name
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
                    staff_id: staffId,
                    assigned_staff_id: staffId,
                    status: 'assigned',
                    shift_journey_log: [
                        ...(shift.shift_journey_log || []),
                        {
                            state: 'assigned',
                            timestamp: new Date().toISOString(),
                            staff_id: staffId,
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
        let filtered = shifts.filter(s =>
            s.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.staff_name && s.staff_name.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        if (showOnlyOpen) {
            filtered = filtered.filter(s => !s.staff_id);
        }

        return filtered;
    }, [shifts, searchTerm, showOnlyOpen]);

    // Group shifts: Client -> Date -> Shifts
    const groupedData = useMemo(() => {
        return filteredShifts.reduce((acc, shift) => {
            const clientName = shift.client_name;
            if (!acc[clientName]) acc[clientName] = {};

            const dateKey = shift.date;
            if (!acc[clientName][dateKey]) acc[clientName][dateKey] = [];
            acc[clientName][dateKey].push(shift);

            return acc;
        }, {});
    }, [filteredShifts]);

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
                const { data: shift } = await supabase.from('shifts').select('*, staff:staff(*), client:clients(*), agency:agencies(*)').eq('id', shiftId).single();
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
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold"
                                onClick={() => navigate(`/PostShiftV2?date=${weekRange.start.toISOString().split('T')[0]}`)}
                            >
                                <PlusCircle className="w-4 h-4 mr-1.5" />
                                Add Staff Requirement
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading}>
                                <RefreshCw className={`w-5 h-5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                            <Button variant="ghost" size="sm" className="h-9 w-9" onClick={() => navigateWeek(-1)}>
                                <ChevronLeft className="w-5 h-5 text-slate-600" />
                            </Button>
                            <div className="flex-1 text-center py-1">
                                <span className="text-sm font-black text-slate-700 whitespace-nowrap">
                                    {weekRange.start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {weekRange.end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-9 w-9" onClick={() => navigateWeek(1)}>
                                <ChevronRight className="w-5 h-5 text-slate-600" />
                            </Button>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <Button
                                variant={viewType === 'cards' ? 'white' : 'ghost'}
                                size="sm"
                                className={`h-8 px-3 rounded-lg text-xs font-black shadow-none transition-all ${viewType === 'cards' ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'text-slate-500'}`}
                                onClick={() => setViewType('cards')}
                            >
                                <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                                Mobile
                            </Button>
                            <Button
                                variant={viewType === 'table' ? 'white' : 'ghost'}
                                size="sm"
                                className={`h-8 px-3 rounded-lg text-xs font-black shadow-none transition-all ${viewType === 'table' ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'text-slate-500'}`}
                                onClick={() => setViewType('table')}
                            >
                                <ListFilter className="w-3.5 h-3.5 mr-1.5" />
                                Table
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

            {/* Main Rota Content */}
            <div className="max-w-lg mx-auto p-4 space-y-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                        <RotaLoader className="w-8 h-8 animate-spin" />
                        <p className="font-bold flex items-center gap-2">Loading Live Rota...</p>
                    </div>
                ) : Object.keys(groupedData).length === 0 ? (
                    <div className="text-center py-20 space-y-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                            <CalendarIcon className="w-10 h-10 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-bold">No shifts found for this week.</p>
                        <Button variant="outline" onClick={() => setSearchTerm('')}>Clear Filters</Button>
                    </div>
                ) : viewType === 'cards' ? (
                    Object.entries(groupedData).map(([clientName, dates]) => (
                        <div key={clientName} className="space-y-6">
                            <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border">
                                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-700">
                                    <LayoutGrid className="w-5 h-5" />
                                </div>
                                <h2 className="font-black text-slate-800 text-xl tracking-tight uppercase underline decoration-indigo-200 decoration-4 underline-offset-4">
                                    {clientName}
                                </h2>
                            </div>

                            {Object.entries(dates).sort().map(([date, shifts]) => (
                                <LiveRotaCard
                                    key={date}
                                    date={date}
                                    shifts={shifts}
                                    onAssign={handleAssign}
                                    onStatusChange={handleStatusCycle}
                                />
                            ))}
                        </div>
                    ))
                ) : (
                    /* Tabular View */
                    <Card className="rounded-2xl shadow-sm overflow-hidden border">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-500">Client / Time</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-500">Role / Staff</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-500 text-center">Coverage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(groupedData).map(([clientName, dates]) => (
                                    Object.entries(dates).sort().map(([date, dayShifts]) => (
                                        dayShifts.map((s, idx) => (
                                            <TableRow key={s.id || `${clientName}-${date}-${idx}`}>
                                                <TableCell className="py-3">
                                                    <p className="font-black text-slate-800 text-xs leading-none mb-1">{clientName}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} • {s.start_time}
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="font-bold text-slate-700 text-xs leading-none mb-1 capitalize">
                                                        {s.role_display || s.role_required?.replace(/_/g, ' ')}
                                                    </p>
                                                    {s.staff_name ? (
                                                        <p className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                                                            <User className="w-2.5 h-2.5" />
                                                            {s.staff_name}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[10px] font-medium text-red-400 italic">Unassigned</p>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div
                                                        className={`w-4 h-4 rounded-full mx-auto shadow-sm ring-2 ring-offset-1 transition-transform hover:scale-125 cursor-pointer ${s.staff_id ? 'bg-emerald-400 ring-emerald-100' : 'bg-red-400 ring-red-100 animate-pulse'}`}
                                                        title={`${s.status}`}
                                                        onClick={() => s.staff_id ? null : handleAssign(s.id)}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ))
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
                        <DialogTitle className="text-xl font-black">Quick Assign</DialogTitle>
                        <DialogDescription className="font-bold text-slate-500">
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
                            className="w-full h-12 rounded-xl font-black bg-blue-600 hover:bg-blue-700"
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
                        <div className="text-blue-400 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Filled</div>
                        <div className="text-xl font-black leading-none">{filteredShifts.filter(s => s.staff_id).length}</div>
                    </div>
                    <div className="w-[1px] h-8 bg-slate-700 mx-1"></div>
                    <div
                        className={`px-5 py-3 text-center cursor-pointer hover:bg-white/10 rounded-2xl transition-colors ${showOnlyOpen ? 'bg-red-500/20' : ''}`}
                        onClick={() => setShowOnlyOpen(!showOnlyOpen)}
                    >
                        <div className="text-red-400 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Open</div>
                        <div className="text-xl font-black leading-none">{filteredShifts.filter(s => !s.staff_id).length}</div>
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
        </div >
    );
}

function RotaLoader(props) {
    return <RefreshCw {...props} className={props.className + " animate-spin"} />
}
