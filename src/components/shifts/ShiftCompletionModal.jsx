import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle, CheckCircle, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";

/**
 * Format time from ISO timestamp to HH:MM
 * Handles both ISO timestamps (2025-11-15T09:00:00+00:00) and plain times (09:00)
 */
const formatTime = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    // If it's already in HH:MM format, return as is
    if (/^\d{2}:\d{2}$/.test(isoString)) return isoString;

    // Extract time from ISO timestamp (e.g., "2025-11-15T09:00:00+00:00" -> "09:00")
    const timePart = isoString.split('T')[1];
    if (timePart) {
      return timePart.substring(0, 5); // Get HH:MM
    }
    return isoString;
  } catch (error) {
    console.error('Time formatting error:', isoString, error);
    return isoString;
  }
};

/**
 * 📋 SHIFT COMPLETION MODAL
 *
 * Purpose: Force admin to confirm ACTUAL start/end times before marking shift as completed
 *
 * Use Cases:
 * - Staff arrived late → adjust actual_start_time
 * - Staff left early/late → adjust actual_end_time
 * - No GPS available → manual time confirmation required
 *
 * Auto-populates with scheduled times, admin can override
 */

export default function ShiftCompletionModal({
  isOpen, 
  onClose, 
  shift,
  staffName,
  clientName,
  onConfirm 
}) {
  const [actualTimes, setActualTimes] = useState({
    actual_start_time: shift?.start_time || '',
    actual_end_time: shift?.end_time || '',
    notes: ''
  });
  const [confirming, setConfirming] = useState(false);

  if (!shift) return null;

  // Calculate if times were adjusted
  const startAdjusted = actualTimes.actual_start_time !== shift.start_time;
  const endAdjusted = actualTimes.actual_end_time !== shift.end_time;
  const anyAdjustment = startAdjusted || endAdjusted;

  // Calculate actual hours worked
  const calculateActualHours = () => {
    if (!actualTimes.actual_start_time || !actualTimes.actual_end_time) return shift.duration_hours;
    
    const [startH, startM] = actualTimes.actual_start_time.split(':').map(Number);
    const [endH, endM] = actualTimes.actual_end_time.split(':').map(Number);
    
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    
    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    
    const totalMinutes = endMinutes - startMinutes;
    return (totalMinutes / 60).toFixed(2);
  };

  const actualHours = parseFloat(calculateActualHours());
  const hoursDifference = (actualHours - shift.duration_hours).toFixed(2);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm({
        actual_start_time: actualTimes.actual_start_time,
        actual_end_time: actualTimes.actual_end_time,
        actual_hours_worked: actualHours,
        completion_notes: actualTimes.notes
      });
      onClose();
      toast.success('✅ Shift marked as completed');
    } catch (error) {
      toast.error('Failed to complete shift: ' + error.message);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Confirm Shift Completion</DialogTitle>
          <p className="text-gray-600 mt-2">
            Verify the actual times staff worked before finalizing
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Shift Details Summary */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="font-semibold">{clientName}</span>
              {shift.work_location_within_site && (
                <Badge className="bg-cyan-100 text-cyan-800">
                  📍 {shift.work_location_within_site}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{new Date(shift.date).toLocaleDateString('en-GB', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}</span>
            </div>
            <div className="text-sm text-gray-700">
              <strong>Staff:</strong> {staffName}
            </div>
          </div>

          {/* Scheduled vs Actual Times */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-semibold mb-3 block">
                <Clock className="w-4 h-4 inline mr-2" />
                Actual Start Time
              </Label>
              <div className="mb-2 p-2 bg-blue-50 rounded text-sm">
                <span className="text-gray-600">Scheduled:</span>
                <span className="font-semibold ml-2">{formatTime(shift.start_time)}</span>
              </div>
              <Input
                type="time"
                value={actualTimes.actual_start_time}
                onChange={(e) => setActualTimes({...actualTimes, actual_start_time: e.target.value})}
                className="text-lg font-semibold"
              />
              {startAdjusted && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Adjusted from scheduled time
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-semibold mb-3 block">
                <Clock className="w-4 h-4 inline mr-2" />
                Actual End Time
              </Label>
              <div className="mb-2 p-2 bg-blue-50 rounded text-sm">
                <span className="text-gray-600">Scheduled:</span>
                <span className="font-semibold ml-2">{formatTime(shift.end_time)}</span>
              </div>
              <Input
                type="time"
                value={actualTimes.actual_end_time}
                onChange={(e) => setActualTimes({...actualTimes, actual_end_time: e.target.value})}
                className="text-lg font-semibold"
              />
              {endAdjusted && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Adjusted from scheduled time
                </p>
              )}
            </div>
          </div>

          {/* Hours Calculation */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900">Hours Worked:</span>
              <span className="text-3xl font-bold text-green-600">{actualHours}h</span>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Scheduled Hours:</span>
                <span className="font-semibold">{shift.duration_hours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Difference:</span>
                <span className={`font-semibold ${
                  parseFloat(hoursDifference) === 0 ? 'text-gray-700' :
                  parseFloat(hoursDifference) > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {parseFloat(hoursDifference) > 0 ? '+' : ''}{hoursDifference}h
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-green-200">
                <span className="text-gray-600">Staff Pay:</span>
                <span className="font-bold text-gray-900">
                  £{(actualHours * shift.pay_rate).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Client Charge:</span>
                <span className="font-bold text-green-600">
                  £{(actualHours * shift.charge_rate).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Adjustment Warning */}
          {anyAdjustment && Math.abs(parseFloat(hoursDifference)) > 0.25 && (
            <Alert className="border-orange-300 bg-orange-50">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <strong>⚠️ Significant Time Adjustment:</strong>
                <p className="text-sm mt-2">
                  You've adjusted the times by {Math.abs(parseFloat(hoursDifference))} hours. 
                  This will affect payroll and invoicing. Please add a note explaining the reason.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Notes */}
          <div>
            <Label>
              Notes {anyAdjustment && Math.abs(parseFloat(hoursDifference)) > 0.25 && (
                <span className="text-red-600">*</span>
              )}
            </Label>
            <Textarea
              value={actualTimes.notes}
              onChange={(e) => setActualTimes({...actualTimes, notes: e.target.value})}
              placeholder={anyAdjustment ? "Required: Explain why times were adjusted (e.g., 'Staff arrived 15 mins late due to traffic')" : "Optional notes about this shift..."}
              rows={3}
              className={anyAdjustment && Math.abs(parseFloat(hoursDifference)) > 0.25 && !actualTimes.notes ? 'border-red-300' : ''}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={confirming}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              confirming || 
              !actualTimes.actual_start_time || 
              !actualTimes.actual_end_time ||
              (anyAdjustment && Math.abs(parseFloat(hoursDifference)) > 0.25 && !actualTimes.notes)
            }
            className="bg-green-600 hover:bg-green-700 min-w-[180px]"
          >
            {confirming ? 'Processing...' : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Completed
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}