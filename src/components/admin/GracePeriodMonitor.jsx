import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, CheckCircle, Users, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

/**
 * Grace Period Monitor - Admin Dashboard Widget
 *
 * Displays real-time status of shifts in 2-hour grace period
 * Shows which reminders have been sent and allows manual intervention
 */
export default function GracePeriodMonitor() {
  const [shiftsInGracePeriod, setShiftsInGracePeriod] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchGracePeriodShifts = async () => {
    try {
      setLoading(true);

      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Fetch all in_progress shifts from today
      const { data: shifts, error } = await supabase
        .from('shifts')
        .select(`
          *,
          staff:assigned_staff_id(id, first_name, last_name, phone, email),
          client:client_id(id, name),
          timesheets!inner(id, clock_in_time, clock_out_time)
        `)
        .eq('date', today)
        .eq('status', 'in_progress');

      if (error) throw error;

      const now = new Date();
      const gracePeriodShifts = [];

      for (const shift of shifts || []) {
        // Calculate shift end time
        let endDateTime = new Date(`${shift.date}T${shift.end_time}`);

        // Handle overnight shifts
        if (shift.end_time < shift.start_time) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }

        // Check if shift has ended but is within 2-hour grace period
        const twoHoursAfterEnd = new Date(endDateTime.getTime() + 2 * 60 * 60 * 1000);

        if (now >= endDateTime && now < twoHoursAfterEnd) {
          // Shift is in grace period
          const minutesSinceEnd = Math.floor((now.getTime() - endDateTime.getTime()) / (1000 * 60));
          const minutesRemaining = 120 - minutesSinceEnd;

          // Check if staff has clocked out
          const hasClocked Out = shift.timesheets?.some(t => t.clock_out_time);

          gracePeriodShifts.push({
            ...shift,
            minutesSinceEnd,
            minutesRemaining,
            hasClocked Out,
            urgency: minutesRemaining < 30 ? 'high' : minutesRemaining < 60 ? 'medium' : 'low'
          });
        }
      }

      // Sort by urgency (least time remaining first)
      gracePeriodShifts.sort((a, b) => a.minutesRemaining - b.minutesRemaining);

      setShiftsInGracePeriod(gracePeriodShifts);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching grace period shifts:', error);
      toast.error('Failed to load grace period shifts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGracePeriodShifts();

    // Auto-refresh every 1 minute
    const interval = setInterval(fetchGracePeriodShifts, 60000);

    return () => clearInterval(interval);
  }, []);

  const manualClockOut = async (shift) => {
    if (!window.confirm(`Manually clock out ${shift.staff?.first_name} ${shift.staff?.last_name}?`)) {
      return;
    }

    try {
      const now = new Date().toISOString();

      // Find timesheet
      const { data: timesheet, error: timesheetError } = await supabase
        .from('timesheets')
        .select('id')
        .eq('shift_id', shift.id)
        .single();

      if (timesheetError) throw timesheetError;

      // Update timesheet with admin clock-out
      const { error: updateError } = await supabase
        .from('timesheets')
        .update({
          clock_out_time: now,
          clock_out_note: 'Admin manual clock-out (staff did not clock out during grace period)',
          status: 'submitted'
        })
        .eq('id', timesheet.id);

      if (updateError) throw updateError;

      // Update shift status
      const { error: shiftError } = await supabase
        .from('shifts')
        .update({
          status: 'completed',
          shift_ended_at: now,
          admin_closed_at: now,
          shift_journey_log: [
            ...(shift.shift_journey_log || []),
            {
              state: 'completed',
              timestamp: now,
              method: 'admin_manual',
              notes: 'Admin manually clocked out staff (did not clock out during grace period)'
            }
          ]
        })
        .eq('id', shift.id);

      if (shiftError) throw shiftError;

      toast.success('Staff clocked out successfully');
      fetchGracePeriodShifts();
    } catch (error) {
      console.error('Error manually clocking out:', error);
      toast.error('Failed to clock out staff');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Grace Period Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            Grace Period Monitor
            {shiftsInGracePeriod.length > 0 && (
              <Badge className="bg-orange-600">
                {shiftsInGracePeriod.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Last updated: {format(lastRefresh, 'HH:mm:ss')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchGracePeriodShifts}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {shiftsInGracePeriod.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="font-semibold">All Clear!</p>
            <p className="text-sm mt-1">No shifts currently in grace period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shiftsInGracePeriod.map((shift) => (
              <div
                key={shift.id}
                className={`p-4 rounded-lg border-2 ${
                  shift.urgency === 'high'
                    ? 'bg-red-50 border-red-300'
                    : shift.urgency === 'medium'
                    ? 'bg-orange-50 border-orange-300'
                    : 'bg-blue-50 border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-gray-600" />
                      <span className="font-semibold">
                        {shift.staff?.first_name} {shift.staff?.last_name}
                      </span>
                      {shift.hasClocked Out ? (
                        <Badge className="bg-green-600 text-white">
                          ✓ Clocked Out
                        </Badge>
                      ) : (
                        <Badge className={
                          shift.urgency === 'high' ? 'bg-red-600' :
                          shift.urgency === 'medium' ? 'bg-orange-600' :
                          'bg-blue-600'
                        }>
                          {shift.urgency === 'high' ? '🚨 Urgent' :
                           shift.urgency === 'medium' ? '⏰ Soon' :
                           '📍 Active'}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 mb-1">
                      <strong>Client:</strong> {shift.client?.name}
                    </p>
                    <p className="text-sm text-gray-700 mb-1">
                      <strong>Shift:</strong> {shift.start_time} - {shift.end_time}
                    </p>

                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className={`font-semibold ${
                        shift.urgency === 'high' ? 'text-red-700' :
                        shift.urgency === 'medium' ? 'text-orange-700' :
                        'text-blue-700'
                      }`}>
                        ⏱️ {shift.minutesRemaining} mins remaining
                      </span>

                      {shift.reminder_15min_sent && (
                        <Badge variant="outline" className="text-xs">
                          ✓ 15min reminder sent
                        </Badge>
                      )}
                      {shift.reminder_1hour_sent && (
                        <Badge variant="outline" className="text-xs">
                          ✓ 1h reminder sent
                        </Badge>
                      )}
                      {shift.reminder_urgent_sent && (
                        <Badge variant="outline" className="text-xs bg-red-100">
                          ✓ Urgent reminder sent
                        </Badge>
                      )}
                    </div>
                  </div>

                  {!shift.hasClocked Out && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => manualClockOut(shift)}
                      className="ml-4"
                    >
                      Manual Clock Out
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
