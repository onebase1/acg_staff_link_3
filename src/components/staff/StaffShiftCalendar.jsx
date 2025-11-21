import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, DollarSign, MapPin, X, Upload } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek } from 'date-fns';

/**
 * 📅 STAFF SHIFT CALENDAR
 *
 * Mobile-first read-only calendar showing staff's shifts
 * - Color-coded shift dots
 * - Touch interaction → shift detail modal
 * - Future shifts: show scheduled hours, client, pay
 * - Past shifts: show actual hours (if timesheet submitted) or "pending" message
 */

export default function StaffShiftCalendar({ shifts = [], timesheets = [], clients = [], staffRecord, onUploadTimesheet }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Get all dates to display in calendar (including padding days)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Get shifts for a specific date
  const getShiftsForDate = (date) => {
    return shifts.filter(shift => {
      try {
        const shiftDate = new Date(shift.date);
        return isSameDay(shiftDate, date);
      } catch {
        return false;
      }
    });
  };

  // Get shift color based on status and date
  const getShiftColor = (shift) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shiftDate = new Date(shift.date);
    shiftDate.setHours(0, 0, 0, 0);
    const isPast = shiftDate < today;

    if (isPast) {
      // Past shifts
      if (shift.status === 'completed') return 'bg-green-600';
      if (shift.status === 'awaiting_admin_closure') return 'bg-orange-500';
      if (shift.status === 'no_show') return 'bg-red-600';
      if (shift.status === 'disputed') return 'bg-purple-600';
      if (shift.status === 'cancelled') return 'bg-gray-400';
      if (shift.status === 'in_progress') return 'bg-blue-500';
      return 'bg-gray-400';
    } else {
      // Future shifts
      if (shift.status === 'confirmed') return 'bg-green-500';
      if (shift.status === 'assigned') return 'bg-blue-500';
      if (shift.status === 'awaiting_staff_confirmation') return 'bg-yellow-500';
      if (shift.status === 'open') return 'bg-orange-400';
      if (shift.status === 'cancelled') return 'bg-gray-400';
      if (shift.status === 'disputed') return 'bg-red-500';
      return 'bg-gray-400';
    }
  };

  // Get client name
  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Care Home';
  };

  // Handle date click
  const handleDateClick = (date) => {
    const dayShifts = getShiftsForDate(date);
    if (dayShifts.length > 0) {
      setSelectedDate(date);
      setShowModal(true);
    }
  };

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <CalendarIcon className="w-5 h-5" />
              My Shift Calendar
            </CardTitle>
            <div className="flex gap-1 sm:gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth} className="h-8 w-8 p-0">
                ←
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} className="h-8 px-2 text-xs sm:text-sm">
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextMonth} className="h-8 w-8 p-0">
                →
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {format(currentMonth, 'MMMM yyyy')}
          </p>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}



            {/* Calendar days */}
            {calendarDays.map((day, idx) => {
              const dayShifts = getShiftsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);
              const hasShifts = dayShifts.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => handleDateClick(day)}
                  className={`
                    min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 border rounded-lg
                    ${isTodayDate ? 'bg-cyan-50 border-cyan-500 border-2' : 'border-gray-200'}
                    ${!isCurrentMonth ? 'opacity-40' : ''}
                    ${hasShifts ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''}
                    transition-colors
                  `}
                >
                  <div className={`text-xs sm:text-sm font-semibold mb-1 ${isTodayDate ? 'text-cyan-600' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </div>

                  {/* Shift dots */}
                  {hasShifts && (
                    <div className="flex flex-wrap gap-1">
                      {dayShifts.slice(0, 3).map((shift, shiftIdx) => (
                        <div
                          key={shiftIdx}
                          className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${getShiftColor(shift)}`}
                          title={getClientName(shift.client_id)}
                        />
                      ))}
                      {dayShifts.length > 3 && (
                        <div className="text-[10px] text-gray-500">+{dayShifts.length - 3}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-semibold text-gray-600 mb-2">Legend:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Assigned</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                <span>Completed</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shift Detail Modal */}
      {showModal && selectedDate && (
        <ShiftDetailModal
          date={selectedDate}
          shifts={getShiftsForDate(selectedDate)}
          timesheets={timesheets}
          clients={clients}
          staffRecord={staffRecord}
          onClose={() => setShowModal(false)}
          onUploadTimesheet={onUploadTimesheet}
        />
      )}
    </>
  );
}

// Shift Detail Modal Component
function ShiftDetailModal({ date, shifts, timesheets, clients, staffRecord, onClose, onUploadTimesheet }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDateObj = new Date(date);
  selectedDateObj.setHours(0, 0, 0, 0);
  const isPast = selectedDateObj < today;

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Care Home';
  };

  const getStatusBadge = (shift) => {
    const statusConfig = {
      confirmed: { label: '✅ Confirmed', className: 'bg-green-100 text-green-800' },
      assigned: { label: '⏳ Awaiting Confirmation', className: 'bg-blue-100 text-blue-800' },
      awaiting_staff_confirmation: { label: '⚠️ Please Confirm', className: 'bg-yellow-100 text-yellow-800' },
      completed: { label: '✅ Completed', className: 'bg-green-200 text-green-900' },
      awaiting_admin_closure: { label: '⏳ Under Review', className: 'bg-orange-100 text-orange-800' },
      no_show: { label: '❌ No Show', className: 'bg-red-100 text-red-800' },
      disputed: { label: '⚠️ Disputed', className: 'bg-purple-100 text-purple-800' },
      cancelled: { label: '❌ Cancelled', className: 'bg-gray-100 text-gray-800' },
      in_progress: { label: '🔵 In Progress', className: 'bg-blue-100 text-blue-800' },
      open: { label: '🟠 Open', className: 'bg-orange-100 text-orange-800' },
    };
    return statusConfig[shift.status] || { label: shift.status, className: 'bg-gray-100 text-gray-800' };
  };

  const calculatePay = (shift, actualHours = null) => {
    const hours = actualHours || shift.duration_hours;
    const rate = shift.pay_rate || staffRecord?.hourly_rate || 15;
    return (hours * rate).toFixed(2);
  };

  const getTimesheetForShift = (shift) => {
    return timesheets.find(t => t.shift_id === shift.id);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <Card
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="border-b sticky top-0 bg-white z-10">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl sm:text-2xl">
                {format(date, 'EEEE, MMMM d, yyyy')}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {shifts.length} shift{shifts.length !== 1 ? 's' : ''} on this day
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {shifts.map((shift, idx) => {
            const statusBadge = getStatusBadge(shift);
            const timesheet = getTimesheetForShift(shift);
            const actualHours = timesheet?.total_hours;

            return (
              <div key={idx} className="border rounded-lg p-4 space-y-3">
                {/* Status Badge */}
                <Badge className={`${statusBadge.className} text-sm px-3 py-1`}>
                  {statusBadge.label}
                </Badge>

                {/* Client Name */}
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span className="font-semibold text-lg">{getClientName(shift.client_id)}</span>
                </div>

                {/* Shift Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Time */}
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="font-semibold text-sm">Time</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {shift.start_time} - {shift.end_time}
                    </p>
                    <p className="text-sm text-gray-600">
                      {isPast && actualHours ? `${actualHours}h worked` : `${shift.duration_hours}h scheduled`}
                    </p>
                  </div>

                  {/* Pay */}
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold text-sm">Pay</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      £{calculatePay(shift, actualHours)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {isPast && actualHours ? 'Actual earnings' : 'Estimated earnings'}
                    </p>
                  </div>
                </div>

                {/* Past shift specific messages */}
                {isPast && (
                  <>
                    {shift.status === 'awaiting_admin_closure' && !shift.timesheet_received && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-orange-800 mb-2">⚠️ Timesheet Pending</p>
                        <p className="text-sm text-orange-700 mb-3">
                          Please upload your timesheet to complete this shift.
                        </p>
                        {onUploadTimesheet && (
                          <Button
                            size="sm"
                            onClick={() => {
                              onClose();
                              onUploadTimesheet(shift);
                            }}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Timesheet
                          </Button>
                        )}
                      </div>
                    )}

                    {shift.status === 'awaiting_admin_closure' && shift.timesheet_received && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          ⏳ Timesheet submitted - awaiting admin approval
                        </p>
                      </div>
                    )}

                    {shift.status === 'no_show' && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-red-800 mb-1">❌ No Show Recorded</p>
                        <p className="text-sm text-red-700">
                          Please contact your agency if this is incorrect.
                        </p>
                      </div>
                    )}

                    {shift.status === 'disputed' && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-purple-800 mb-1">⚠️ Shift Under Review</p>
                        <p className="text-sm text-purple-700">
                          Please contact your agency to resolve this issue.
                        </p>
                      </div>
                    )}

                    {shift.status === 'cancelled' && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-sm text-gray-700">
                          ❌ This shift was cancelled
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Work location */}
                {shift.work_location_within_site && (
                  <p className="text-sm text-gray-600">
                    📍 Location: {shift.work_location_within_site}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}