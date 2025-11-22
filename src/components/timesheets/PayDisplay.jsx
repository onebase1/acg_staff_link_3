import React from "react";
import { Badge } from "@/components/ui/badge";
import { Info, Clock, CheckCircle, AlertTriangle, MapPin } from "lucide-react";

/**
 * Smart Pay Display Component
 * Shows different pay information based on shift status:
 * - PRE-SHIFT: Estimated pay (scheduled hours)
 * - IN-PROGRESS: "Pay calculated at shift end"
 * - COMPLETED: Actual GPS-verified pay (with breaks deducted)
 */
export default function PayDisplay({ shift, timesheet }) {
  // Safety check: if no shift data, return null
  if (!shift) {
    return null;
  }

  // Determine display mode based on shift status
  const getDisplayMode = () => {
    if (!shift.status) return 'pending';

    if (['created', 'open', 'assigned', 'confirmed'].includes(shift.status)) {
      return 'scheduled';
    } else if (shift.status === 'in_progress') {
      return 'in_progress';
    } else if (['completed', 'awaiting_admin_closure'].includes(shift.status) && timesheet) {
      return 'actual';
    } else {
      return 'pending';
    }
  };

  const mode = getDisplayMode();

  // ========================================
  // MODE 1: PRE-SHIFT (Scheduled)
  // ========================================
  if (mode === 'scheduled') {
    const scheduledPay = shift.pay_rate * shift.duration_hours;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">Estimated Pay (Pre-Tax)</span>
        </div>
        <div className="text-2xl font-bold text-blue-900">
          £{scheduledPay.toFixed(2)}
        </div>
        <div className="text-xs text-blue-700 mt-1">
          Based on {shift.duration_hours}h scheduled
        </div>
        <div className="text-xs text-blue-600 mt-3 p-2 bg-blue-100 rounded flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>Actual pay calculated at shift end (GPS verified)</span>
        </div>
      </div>
    );
  }

  // ========================================
  // MODE 2: IN-PROGRESS (Shift Ongoing)
  // ========================================
  if (mode === 'in_progress') {
    const startTime = new Date(shift.shift_started_at || shift.created_date);
    const now = new Date();
    const elapsed = Math.floor((now - startTime) / (1000 * 60));
    const hours = Math.floor(elapsed / 60);
    const mins = elapsed % 60;

    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-orange-600 animate-pulse" />
          <span className="text-sm font-semibold text-orange-900">Shift In Progress</span>
        </div>

        <div className="space-y-1 mb-3">
          <div className="text-sm text-orange-700">
            <strong>Started:</strong> {startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-sm text-orange-700">
            <strong>Elapsed:</strong> {hours}h {mins}min
          </div>
        </div>

        <div className="text-xs text-orange-600 mt-3 p-2 bg-orange-100 rounded flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>Pay calculated at shift end (GPS clock-out required)</span>
        </div>
      </div>
    );
  }

  // ========================================
  // MODE 3: ACTUAL (Completed/Submitted)
  // ========================================
  if (mode === 'actual' && timesheet) {
    const isGPS = timesheet.clock_in_location && Object.keys(timesheet.clock_in_location).length > 0;
    const actualHours = timesheet.total_hours || 0;
    const breakMins = timesheet.break_duration_minutes || 0;
    const billableHours = actualHours - (breakMins / 60);
    const pay = timesheet.staff_pay_amount || 0;
    const geofenceDistance = timesheet.geofence_distance_meters;

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-semibold text-green-900">
            {isGPS ? 'GPS Verified' : 'Timesheet Recorded'}
          </span>
          {isGPS && geofenceDistance !== undefined && (
            <Badge className="bg-green-600 text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {geofenceDistance}m
            </Badge>
          )}
        </div>

        {/* Hours Breakdown */}
        <div className="space-y-1 text-sm text-green-800 mb-3 p-2 bg-green-100 rounded">
          <div className="flex justify-between">
            <span>Worked:</span>
            <span className="font-semibold">{actualHours.toFixed(2)}h</span>
          </div>
          {breakMins > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Break (unpaid):</span>
              <span>{breakMins}min</span>
            </div>
          )}
          <div className="flex justify-between border-t border-green-200 pt-1 font-semibold">
            <span>Billable:</span>
            <span>{billableHours.toFixed(2)}h</span>
          </div>
        </div>

        {/* Pay Amount */}
        <div className="border-t border-green-200 pt-3">
          <div className="text-xs text-green-700 mb-1">Gross Pay (Pre-Tax)</div>
          <div className="text-3xl font-bold text-green-900">
            £{pay.toFixed(2)}
          </div>
          <div className="text-xs text-green-600 mt-1">
            £{timesheet.pay_rate?.toFixed(2) || '0.00'}/hr × {billableHours.toFixed(2)}h
          </div>
        </div>

        {/* Status Warnings */}
        {timesheet.status === 'draft' && (
          <div className="text-xs text-orange-600 mt-3 p-2 bg-orange-50 border border-orange-200 rounded flex items-start gap-1">
            <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span><strong>Draft:</strong> Please submit your timesheet</span>
          </div>
        )}

        {timesheet.status === 'submitted' && (
          <div className="text-xs text-blue-600 mt-3 p-2 bg-blue-50 border border-blue-200 rounded flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span><strong>Pending approval</strong> - Subject to tax, NI, pension deductions</span>
          </div>
        )}

        {timesheet.status === 'approved' && (
          <div className="text-xs text-green-600 mt-3 p-2 bg-green-100 border border-green-300 rounded flex items-start gap-1">
            <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span><strong>Approved</strong> - Ready for payroll processing</span>
          </div>
        )}

        {/* GPS Details (if available) */}
        {isGPS && (
          <div className="text-xs text-green-600 mt-3 pt-2 border-t border-green-200">
            <div className="flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Clock In:</strong> {timesheet.clock_in_time ? new Date(timesheet.clock_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                {timesheet.clock_out_time && (
                  <span className="ml-3"><strong>Clock Out:</strong> {new Date(timesheet.clock_out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========================================
  // MODE 4: PENDING (Awaiting Data)
  // ========================================
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600">Pay pending timesheet completion</span>
      </div>
    </div>
  );
}
