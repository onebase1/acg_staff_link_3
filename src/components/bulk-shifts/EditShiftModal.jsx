import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Pencil } from "lucide-react";
import { STAFF_ROLES } from "@/constants/staffRoles";
import { toast } from "sonner";

/**
 * Helper: Extract time from shift time field (handles both TEXT "HH:MM" and old TIMESTAMP format)
 * @param {string} timeValue - Either "HH:MM" or "YYYY-MM-DDTHH:MM:SS"
 * @param {string} fallback - Default value if extraction fails
 * @returns {string} - Time in HH:MM format
 */
function extractTime(timeValue, fallback = '00:00') {
  if (!timeValue) return fallback;
  // If already in HH:MM format (no 'T'), return as-is
  if (!timeValue.includes('T')) return timeValue;
  // Otherwise, extract from timestamp format
  return timeValue.split('T')[1]?.substring(0, 5) || fallback;
}

export default function EditShiftModal({ shift, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    role: '',
    date: '',
    start_time: '',
    end_time: '',
    pay_rate: 0,
    charge_rate: 0,
    work_location_within_site: '',
    urgency: 'normal',
    notes: ''
  });

  // Initialize form when shift changes
  useEffect(() => {
    if (shift) {
      // Extract time from datetime strings (handles both TEXT HH:MM and old TIMESTAMP format)
      const startTime = extractTime(shift.start_time, '08:00');
      const endTime = extractTime(shift.end_time, '20:00');
      const shiftDate = shift.date || shift.start_time?.split('T')[0] || '';

      setFormData({
        role: shift.role || '',
        date: shiftDate,
        start_time: startTime,
        end_time: endTime,
        pay_rate: shift.pay_rate || 0,
        charge_rate: shift.charge_rate || 0,
        work_location_within_site: shift.work_location_within_site || '',
        urgency: shift.urgency || 'normal',
        notes: shift.notes || ''
      });
    }
  }, [shift]);

  // Calculate duration
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    // Handle overnight shifts (negative duration means crosses midnight)
    if (duration < 0) {
      duration += 24 * 60;
    }

    return duration / 60; // Return hours
  };

  const duration = calculateDuration(formData.start_time, formData.end_time);

  // Handle form changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle save
  const handleSave = () => {
    // Validation
    if (!formData.role) {
      toast.error('Please select a role');
      return;
    }
    if (!formData.date) {
      toast.error('Please select a date');
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      toast.error('Please enter start and end times');
      return;
    }
    if (formData.pay_rate <= 0 || formData.charge_rate <= 0) {
      toast.error('Pay rate and charge rate must be greater than 0');
      return;
    }
    if (formData.charge_rate < formData.pay_rate) {
      toast.error('Charge rate must be greater than or equal to pay rate');
      return;
    }

    // Build updated shift object
    const updatedShift = {
      ...shift,
      role: formData.role,
      date: formData.date,
      start_time: `${formData.date}T${formData.start_time}:00`,
      end_time: duration >= 12 && formData.end_time < formData.start_time
        ? calculateNextDay(formData.date, formData.end_time)
        : `${formData.date}T${formData.end_time}:00`,
      pay_rate: parseFloat(formData.pay_rate),
      charge_rate: parseFloat(formData.charge_rate),
      work_location_within_site: formData.work_location_within_site,
      urgency: formData.urgency,
      notes: formData.notes,
      duration_hours: duration,
      shift_cost: duration * parseFloat(formData.pay_rate),
      client_charge: duration * parseFloat(formData.charge_rate)
    };

    onSave(updatedShift);
    toast.success('Shift updated successfully');
    onClose();
  };

  // Helper: Calculate next day for overnight shifts
  const calculateNextDay = (dateStr, timeStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() + 1);
    const nextDay = date.toISOString().split('T')[0];
    return `${nextDay}T${timeStr}:00`;
  };

  // Get role display name
  const getRoleDisplayName = (roleKey) => {
    return roleKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-cyan-600" />
            Edit Shift
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(STAFF_ROLES).map(roleKey => (
                  <SelectItem key={roleKey} value={roleKey}>
                    {getRoleDisplayName(roleKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleChange('start_time', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleChange('end_time', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Duration Display */}
          {duration > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700 font-medium">Duration:</span>
                <Badge variant="secondary" className="text-blue-700">
                  {duration} hours {duration >= 12 && formData.end_time < formData.start_time ? '(overnight)' : ''}
                </Badge>
              </div>
            </div>
          )}

          {/* Rates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pay_rate">Pay Rate (£/hour) *</Label>
              <Input
                id="pay_rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.pay_rate}
                onChange={(e) => handleChange('pay_rate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="charge_rate">Charge Rate (£/hour) *</Label>
              <Input
                id="charge_rate"
                type="number"
                step="0.01"
                min="0"
                value={formData.charge_rate}
                onChange={(e) => handleChange('charge_rate', e.target.value)}
              />
            </div>
          </div>

          {/* Cost Display */}
          {duration > 0 && formData.pay_rate > 0 && formData.charge_rate > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Staff Cost</div>
                  <div className="font-semibold text-emerald-700">
                    £{(duration * parseFloat(formData.pay_rate)).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Client Charge</div>
                  <div className="font-semibold text-emerald-700">
                    £{(duration * parseFloat(formData.charge_rate)).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Margin</div>
                  <div className="font-semibold text-emerald-700">
                    £{(duration * (parseFloat(formData.charge_rate) - parseFloat(formData.pay_rate))).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Work Location (optional)</Label>
            <Input
              id="location"
              type="text"
              placeholder="e.g., Ward 3, Ground Floor"
              value={formData.work_location_within_site}
              onChange={(e) => handleChange('work_location_within_site', e.target.value)}
            />
          </div>

          {/* Urgency */}
          <div className="space-y-2">
            <Label htmlFor="urgency">Urgency</Label>
            <Select value={formData.urgency} onValueChange={(value) => handleChange('urgency', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional shift information..."
              rows={3}
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
