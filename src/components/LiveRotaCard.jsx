
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Phone,
    MessageSquare,
    UserPlus,
    Clock,
    Sun,
    Moon,
    AlertCircle,
    CheckCircle,
    Calendar,
    MoreVertical
} from 'lucide-react';

const StatusBadge = ({ status }) => {
    const configs = {
        open: { label: 'Open', color: 'bg-red-100 text-red-700 border-red-200' },
        assigned: { label: 'Assigned', color: 'bg-amber-100 text-amber-700 border-amber-200' },
        confirmed: { label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-200' },
        completed: { label: 'Completed', color: 'bg-gray-100 text-gray-700 border-gray-200' },
        awaiting_admin_closure: { label: 'Awaiting Closure', color: 'bg-purple-100 text-purple-700 border-purple-200' }
    };

    const config = configs[status] || configs.open;
    return (
        <Badge variant="outline" className={`font-bold capitalize shadow-sm ${config.color}`}>
            {config.label}
        </Badge>
    );
};


export default function LiveRotaCard({ date, shifts, onAssign, onStatusChange }) {
    // Group shifts by time slot (Day/Night)
    const groupedShifts = shifts.reduce((acc, shift) => {
        const type = shift.shift_type || 'Day';
        if (!acc[type]) acc[type] = [];
        acc[type].push(shift);
        return acc;
    }, {});

    const openWhatsApp = (phone, staffName, shiftDate, shiftTime) => {
        const message = `Hi ${staffName}, just confirming your shift for ${shiftDate} at ${shiftTime}. Please acknowledge. thanks!`;
        window.open(`https://wa.me/${phone.replace(/\s/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const parsedDate = new Date(date);
    const isValidDate = !isNaN(parsedDate.getTime());

    return (
        <div className="space-y-4 mb-8">
            {/* Dynamic Date Header */}
            <div className="flex items-center gap-3 px-2">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex flex-col items-center justify-center text-white shadow-lg">
                    {isValidDate ? (
                        <>
                            <span className="text-[10px] font-bold leading-none">{parsedDate.toLocaleDateString('en-GB', { month: 'short' })}</span>
                            <span className="text-xl font-bold leading-none">{parsedDate.getDate()}</span>
                        </>
                    ) : (
                        <Calendar className="w-6 h-6" />
                    )}
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-lg leading-tight">
                        {isValidDate ? parsedDate.toLocaleDateString('en-GB', { weekday: 'long' }) : 'Shift Date'}
                    </h3>
                    <p className="text-slate-500 text-xs font-bold tracking-widest">
                        {shifts.length} {shifts.length === 1 ? 'Shift' : 'Shifts'} Total
                    </p>
                </div>
            </div>

            {/* Shift Slots */}
            <div className="space-y-3">
                {Object.entries(groupedShifts).sort(([a], [b]) => a.localeCompare(b)).map(([type, typeShifts]) => (
                    <Card key={type} className="border-l-4 border-l-blue-500 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
                        <div className="bg-slate-50/50 px-4 py-2 border-b flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                {type.toLowerCase().includes('night') ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-orange-400" />}
                                <span className="text-xs font-bold text-slate-600 tracking-wider">
                                    {type} Shift Slots
                                </span>
                            </div>
                            <Badge className="bg-blue-100 text-blue-700 text-[10px] font-bold">{typeShifts.length} REQ</Badge>
                        </div>

                        <CardContent className="p-0 divide-y divide-slate-100">
                            {typeShifts.map((shift, idx) => (
                                <div key={shift.id || idx} className="p-4 space-y-3 active:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 tracking-tight">{shift.role_display || shift.role?.replace(/_/g, ' ') || shift.role_required?.replace(/_/g, ' ')}</span>
                                                <div className="cursor-pointer active:scale-95 transition-transform" onClick={() => onStatusChange(shift.id, shift.status)}>
                                                    <StatusBadge status={shift.status} />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-500">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span className="text-xs font-medium">{shift.start_time} - {shift.end_time}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* Staff Section */}
                                    {shift.assigned_staff_id ? (
                                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-sm">
                                                    {shift.staff_name?.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 leading-none mb-1">{shift.staff_name}</p>
                                                    <p className="text-[10px] text-emerald-700 font-bold tracking-tighter cursor-pointer flex items-center gap-1" onClick={() => shift.staff_phone && openWhatsApp(shift.staff_phone, shift.staff_name, date, shift.start_time)}>
                                                        <MessageSquare className="w-3 h-3" />
                                                        Tap to WhatsApp
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="secondary" size="icon" className="h-9 w-9 bg-white shadow-sm border text-emerald-600 rounded-full" onClick={() => shift.staff_phone && (window.location.href = `tel:${shift.staff_phone}`)}>
                                                    <Phone className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            className="w-full border-dashed border-2 py-6 rounded-xl border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all bg-white"
                                            onClick={() => onAssign(shift.id)}
                                        >
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            Assign Available Staff
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
