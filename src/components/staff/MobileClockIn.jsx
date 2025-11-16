
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Clock, AlertTriangle, CheckCircle, Loader2, 
  Navigation, Shield, Info, XCircle, Building2
} from "lucide-react";
import { toast } from "sonner";
import { formatTodayShiftTime } from "../../utils/shiftTimeFormatter";

export default function MobileClockIn({ shift, onClockInComplete }) {
  const [loading, setLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [location, setLocation] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [staff, setStaff] = useState(null);
  const [client, setClient] = useState(null);
  const [existingTimesheet, setExistingTimesheet] = useState(null);
  const [existingBooking, setExistingBooking] = useState(null);
  
  // 🔒 ANTI-DUPLICATE PROTECTION
  const [isClockingIn, setIsClockingIn] = useState(false);
  const clockInAttemptRef = useRef(null);
  const lastClickTimeRef = useRef(0);

  // New state as per outline, assuming it's for an internal loading specific to location within handleClockIn
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          throw authError || new Error('Not authenticated');
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profile) {
          throw profileError || new Error('Profile not found');
        }

        const { data: staffRows, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('user_id', profile.id);

        if (staffError) {
          throw staffError;
        }

        const staffRecord = staffRows?.[0];
        if (staffRecord) {
          setStaff(staffRecord);
        }

        if (shift.client_id) {
          const { data: clientRecord, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', shift.client_id)
            .single();

          if (!clientError && clientRecord) {
            setClient(clientRecord);
          }
        }

        if (staffRecord?.id) {
          const { data: bookingRows, error: bookingError } = await supabase
            .from('bookings')
            .select('*')
            .eq('shift_id', shift.id)
            .eq('staff_id', staffRecord.id);

          if (bookingError) {
            throw bookingError;
          }

          const existingBooking = bookingRows?.[0];
          if (existingBooking) {
            setExistingBooking(existingBooking);
            console.log('🔍 Existing booking found:', existingBooking.id);

            const { data: timesheetRows, error: timesheetError } = await supabase
              .from('timesheets')
              .select('*')
              .eq('booking_id', existingBooking.id);

            if (timesheetError) {
              throw timesheetError;
            }

            const existing = timesheetRows?.[0];
            if (existing) {
              setExistingTimesheet(existing);
              console.log('🔒 Existing timesheet detected:', existing.id);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching clock-in data:", error);
        toast.error(error.message || 'Failed to load shift details for clock-in');
      }
    };

    fetchData();
  }, [shift.id, shift.client_id]);

  const needsConsent = staff && !staff.gps_consent;

  const requestGPSConsent = async () => {
    if (!staff) return;
    
    try {
      const { error } = await supabase
        .from('staff')
        .update({
          gps_consent: true,
          gps_consent_date: new Date().toISOString()
        })
        .eq('id', staff.id);
      
      if (error) throw error;
      setStaff({ ...staff, gps_consent: true });
      toast.success('✅ GPS consent granted');
    } catch (error) {
      toast.error(`Failed to update consent: ${error.message}`);
    }
  };

  const captureLocation = () => {
    setGpsStatus('loading');
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('GPS not supported on this device');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };

        setLocation(locationData);
        setGpsStatus('success');
        
        validateGeofence(locationData);
      },
      (error) => {
        setGpsStatus('error');
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('Location permission denied. Please enable location access in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError('Location unavailable. Please ensure GPS is enabled on your device.');
            break;
          case error.TIMEOUT:
            setGpsError('Location request timed out. Please try again.');
            break;
          default:
            setGpsError('Unknown GPS error. Please try again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const validateGeofence = async (locationData) => {
    try {
      const { data, error } = await supabase.functions.invoke('geofence-validator', {
        body: {
          staff_location: locationData,
          client_id: shift.client_id
        }
      });

      if (error) {
        throw error;
      }

      setValidationResult(data);

      if (!data.validated) {
        toast.warning(`⚠️ ${data.message}`);

        await supabase
          .from('shifts')
          .update({ approaching_staff_location: null })
          .eq('id', shift.id);
      } else {
        toast.success(`✅ ${data.message}`);

        await supabase
          .from('shifts')
          .update({
            approaching_staff_location: {
              staff_id: staff.id,
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              distance_from_site: data.distance_meters,
              geofence_validated: true,
              recorded_at: new Date().toISOString()
            }
          })
          .eq('id', shift.id);
      }
    } catch (error) {
      console.error('Geofence validation error:', error);
      toast.error('Failed to validate location');
    }
  };

  // 🔒 ENHANCED CLOCK IN WITH DUPLICATE PREVENTION
  const handleClockIn = async () => {
    // 🔒 PROTECTION 1: Debounce - Prevent clicks within 2 seconds
    const nowTimestamp = Date.now();
    if (nowTimestamp - lastClickTimeRef.current < 2000) {
      console.warn('⚠️ Clock-in debounced - too soon after last click');
      return;
    }
    lastClickTimeRef.current = nowTimestamp;

    // 🔒 PROTECTION 2: Check if already clocking in
    if (isClockingIn) {
      console.warn('⚠️ Already processing clock-in request');
      toast.warning('Clock-in already in progress...');
      return;
    }

    // ✅ FIX & NEW: Time-based clock-in validation
    const shiftDateTime = new Date(`${shift.date}T${shift.start_time}:00`); // Ensure proper ISO format for Date object
    const now = new Date(); // Use a Date object for comparisons
    const fifteenMinsBeforeShift = new Date(shiftDateTime.getTime() - 15 * 60 * 1000); // Earliest allowed clock-in

    // Check if it's too early to clock in (more than 15 minutes before shift start)
    if (now < fifteenMinsBeforeShift) {
      const minutesUntilAllowedClockIn = Math.round((fifteenMinsBeforeShift.getTime() - now.getTime()) / (1000 * 60));
      const hoursUntilAllowedClockIn = Math.floor(minutesUntilAllowedClockIn / 60);
      const remainingMinutes = minutesUntilAllowedClockIn % 60;
      
      let timeMessage = '';
      if (hoursUntilAllowedClockIn > 0) {
        timeMessage = `${hoursUntilAllowedClockIn}h ${remainingMinutes}m`;
      } else if (minutesUntilAllowedClockIn > 0) {
        timeMessage = `${minutesUntilAllowedClockIn} minutes`;
      } else {
        timeMessage = 'less than a minute';
      }
      
      toast.error(
        `⏰ Too early to clock in`,
        {
          description: `You can clock in from ${fifteenMinsBeforeShift.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Please wait ${timeMessage}.`,
          duration: 5000
        }
      );
      return;
    }

    // 🔒 PROTECTION 3: Validate prerequisites
    if (!location) {
      toast.error('Please capture your location first');
      return;
    }

    if (validationResult && !validationResult.validated) {
      toast.error('❌ Cannot clock in: You are outside the geofence radius. Please move closer to the site.');
      return;
    }

    // 🔒 PROTECTION 4: Generate unique request ID
    const requestId = `clock-in-${shift.id}-${staff.id}-${Date.now()}`;
    clockInAttemptRef.current = requestId;

    setIsClockingIn(true);
    setLoading(true);
    setIsLoadingLocation(true); // As per outline, set new loading state

    try {
      console.log(`🔐 [Clock-In] Starting with request ID: ${requestId}`);

      // 🔒 PROTECTION 5: Double-check for existing timesheet RIGHT before creation
      const { data: existingTimesheets, error: existingTimesheetError } = await supabase
        .from('timesheets')
        .select('*')
        .eq('shift_id', shift.id)
        .eq('staff_id', staff.id);

      if (existingTimesheetError) {
        throw existingTimesheetError;
      }

      if (existingTimesheets && existingTimesheets.length > 0) {
        const existing = existingTimesheets[0];
        if (existing.clock_in_time) {
          console.warn(`⚠️ [Clock-In] Duplicate blocked - timesheet ${existing.id} already exists`);
          toast.error('❌ You have already clocked in for this shift!');
          setExistingTimesheet(existing);
          return;
        }
      }

      // Get or create booking
      let booking = existingBooking;
      
      if (!booking) {
        const { data: bookings, error: bookingError } = await supabase
          .from('bookings')
          .select('*')
          .eq('shift_id', shift.id)
          .eq('staff_id', staff.id);
        
        if (bookings && bookings.length > 0) {
          booking = bookings[0];
          console.log(`✅ [Clock-In] Found existing booking: ${booking.id}`);
          setExistingBooking(booking);
        } else {
          const { data: newBooking, error: newBookingError } = await supabase
            .from('bookings')
            .insert({
              agency_id: shift.agency_id,
              shift_id: shift.id,
              staff_id: staff.id,
              client_id: shift.client_id,
              status: 'confirmed',
              booking_date: new Date().toISOString(),
              shift_date: shift.date,
              start_time: shift.start_time,
              end_time: shift.end_time,
              confirmation_method: 'app'
            })
            .select()
            .single();
          if (newBooking) {
            booking = newBooking;
            console.log(`✅ [Clock-In] Created new booking: ${booking.id}`);
            setExistingBooking(booking);
          } else {
            throw new Error(`Failed to create new booking: ${newBookingError?.message}`);
          }
        }
      }

      // 🔒 PROTECTION 6: Final check - ensure no timesheet exists for this booking
      const { data: bookingTimesheets, error: bookingTimesheetError } = await supabase
        .from('timesheets')
        .select('*')
        .eq('booking_id', booking.id);

      if (bookingTimesheetError) {
        throw bookingTimesheetError;
      }

      if (bookingTimesheets && bookingTimesheets.length > 0 && bookingTimesheets[0].clock_in_time) {
        console.warn(`⚠️ [Clock-In] Duplicate blocked - booking ${booking.id} already has timesheet`);
        toast.error('❌ Timesheet already exists for this booking!');
        setExistingTimesheet(bookingTimesheets[0]);
        return;
      }

      // 🔒 CREATE TIMESHEET (only if all checks passed)
      const { data: timesheet, error: timesheetError } = await supabase
        .from('timesheets')
        .insert({
          agency_id: shift.agency_id,
          booking_id: booking.id,
          staff_id: staff.id,
          client_id: shift.client_id,
          shift_date: shift.date,
          clock_in_time: new Date().toISOString(),
          clock_in_location: location,
          pay_rate: shift.pay_rate,
          charge_rate: shift.charge_rate,
          status: 'draft'
        })
        .select()
        .single();

      if (timesheetError) throw timesheetError;
      console.log(`✅ [Clock-In] Timesheet created: ${timesheet.id}`);

      // Validate geofence on the timesheet
      await supabase.functions.invoke('geofence-validator', {
        body: {
          staff_location: location,
          client_id: shift.client_id,
          timesheet_id: timesheet.id
        }
      });

      // Update shift status
      await supabase
        .from('shifts')
        .update({
          status: 'in_progress',
          shift_started_at: new Date().toISOString()
        })
        .eq('id', shift.id);

      // 🔥 GAME CHANGER: Notify care home that staff has clocked in
      try {
        const { error: verificationError } = await supabase.functions.invoke('shift-verification-chain', {
          body: {
            shift_id: shift.id,
            trigger_point: 'staff_clocked_in',
            additional_data: {
              clock_in_time: new Date().toLocaleTimeString(),
              geofence_validated: validationResult?.validated || false,
              distance_meters: validationResult?.distance_meters || null
            }
          }
        });
        if (verificationError) {
          throw verificationError;
        }
        console.log('✅ Clock-in notification sent to care home');
      } catch (emailError) {
        console.error('⚠️ Verification email failed:', emailError);
      }

      // ✅ NEW: Send SMS to care home/client about staff arrival
      try {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', shift.client_id)
          .single();
        if (clientError) {
          throw clientError;
        }

        if (clientData && clientData.contact_person?.phone) {
          const smsMessage = `✅ STAFF ARRIVED: ${staff.first_name} ${staff.last_name} clocked in at ${clientData.name}${shift.work_location_within_site ? ` (${shift.work_location_within_site})` : ''} at ${new Date().toLocaleTimeString()}. Shift: ${shift.start_time}-${shift.end_time}.`;
          
          const { error: smsErrorInvoke } = await supabase.functions.invoke('send-sms', {
            body: {
              to: clientData.contact_person.phone,
              message: smsMessage
            }
          });
          if (smsErrorInvoke) {
            throw smsErrorInvoke;
          }
          
          console.log('✅ SMS arrival notification sent to care home');
        }
      } catch (smsError) {
        console.error('⚠️ SMS notification failed:', smsError);
        // Don't block clock-in if SMS fails
      }

      toast.success('✅ Clocked in successfully!');
      
      setExistingTimesheet(timesheet);
      
      if (onClockInComplete) {
        onClockInComplete(timesheet);
      }

    } catch (error) {
      console.error('❌ [Clock-In] Error:', error);
      
      // Check if error is due to duplicate entry
      if (error.message && error.message.includes('duplicate')) {
        toast.error('❌ Duplicate clock-in prevented');
      } else {
        toast.error(`Failed to clock in: ${error.message}`);
      }
    } finally {
      setIsClockingIn(false);
      setLoading(false);
      setIsLoadingLocation(false); // Reset new loading state
      clockInAttemptRef.current = null;
    }
  };

  // 🔒 ENHANCED CLOCK OUT WITH DUPLICATE PREVENTION
  const handleClockOut = async () => {
    if (!location) {
      toast.error('Please capture your location first');
      return;
    }

    // 🔒 Prevent duplicate clock-out
    if (isClockingIn) { // Re-using isClockingIn for clock-out progress for simplicity
      console.warn('⚠️ Already processing clock-out request');
      return;
    }

    // 🔒 Check if already clocked out
    if (existingTimesheet.clock_out_time) {
      toast.error('❌ You have already clocked out of this shift!');
      return;
    }

    setIsClockingIn(true); // Re-using isClockingIn for clock-out progress
    setLoading(true);

    try {
      const clockOutTime = new Date().toISOString();
      const clockInTime = new Date(existingTimesheet.clock_in_time);
      const totalHours = (new Date(clockOutTime).getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      const totalHoursRounded = parseFloat(totalHours.toFixed(2));

      // 🎯 GPS AUTOMATION: Auto-populate actual times from GPS clock-in/out
      // Round to 30-minute intervals for timesheet display
      const roundToHalfHour = (isoTimestamp) => {
        const date = new Date(isoTimestamp);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const roundedMinutes = minutes < 15 ? 0 : minutes < 45 ? 30 : 0;
        const roundedHours = minutes >= 45 ? hours + 1 : hours;
        return `${String(roundedHours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
      };

      const actualStartTime = roundToHalfHour(existingTimesheet.clock_in_time);
      const actualEndTime = roundToHalfHour(clockOutTime);

      console.log(`🎯 [GPS Auto-Times] Clock-in: ${existingTimesheet.clock_in_time} → Actual: ${actualStartTime}`);
      console.log(`🎯 [GPS Auto-Times] Clock-out: ${clockOutTime} → Actual: ${actualEndTime}`);

      // 🎯 12-HOUR CAP: Cap total hours at scheduled shift duration
      // Flag overtime for manual review
      const scheduledHours = shift.duration_hours || 12;
      let cappedHours = totalHoursRounded;
      let overtimeHours = 0;
      let overtimeFlag = false;

      if (totalHoursRounded > scheduledHours) {
        overtimeHours = parseFloat((totalHoursRounded - scheduledHours).toFixed(2));
        cappedHours = scheduledHours;
        overtimeFlag = true;
        console.log(`⚠️ [Overtime Detected] Worked: ${totalHoursRounded}hrs, Scheduled: ${scheduledHours}hrs, Overtime: ${overtimeHours}hrs`);
        toast.warning(`⚠️ Overtime detected: ${overtimeHours} hours over scheduled shift. Flagged for admin review.`);
      }

      const { error: timesheetUpdateError } = await supabase
        .from('timesheets')
        .update({
          clock_out_time: clockOutTime,
          clock_out_location: location,
          total_hours: cappedHours, // Use capped hours
          actual_start_time: actualStartTime,
          actual_end_time: actualEndTime,
          staff_pay_amount: parseFloat((cappedHours * (shift.pay_rate || 0)).toFixed(2)),
          client_charge_amount: parseFloat((cappedHours * (shift.charge_rate || 0)).toFixed(2)),
          status: 'submitted',
          // Store overtime info for admin review
          overtime_hours: overtimeFlag ? overtimeHours : null,
          overtime_flag: overtimeFlag,
          raw_total_hours: totalHoursRounded // Store uncapped hours for reference
        })
        .eq('id', existingTimesheet.id);

      if (timesheetUpdateError) {
        throw timesheetUpdateError;
      }

      const { error: shiftUpdateError } = await supabase
        .from('shifts')
        .update({
          status: 'completed',
          shift_ended_at: clockOutTime
        })
        .eq('id', shift.id);

      if (shiftUpdateError) {
        throw shiftUpdateError;
      }

      // Call intelligent validator
      try {
        const { data: validatorData, error: validatorError } = await supabase.functions.invoke('intelligent-timesheet-validator', {
          body: {
            timesheet_id: existingTimesheet.id
          }
        });

        if (validatorError) {
          throw validatorError;
        }

        if (validatorData?.auto_approved) {
          toast.success('✅ Clocked out successfully! Timesheet auto-approved.');
        } else if (validatorData?.requires_review) {
          toast.warning('⚠️ Clocked out successfully. Timesheet flagged for review.');
        } else {
          toast.success('✅ Clocked out successfully!');
        }
      } catch (validationError) {
        console.error('Validation error:', validationError);
        toast.success('✅ Clocked out successfully!');
      }

      setExistingTimesheet({ ...existingTimesheet, clock_out_time: clockOutTime, total_hours: totalHoursRounded });

    } catch (error) {
      console.error('Clock out error:', error);
      toast.error(`Failed to clock out: ${error.message}`);
    } finally {
      setIsClockingIn(false);
      setLoading(false);
    }
  };

  // 🟢 ALREADY CLOCKED IN - SHOW CLOCK OUT
  if (existingTimesheet && existingTimesheet.clock_in_time && !existingTimesheet.clock_out_time) {
    const canClockOut = location && validationResult && validationResult.validated;

    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Clocked In - Ready to Clock Out
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          
          {/* Shift Details */}
          {client && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-green-900 font-semibold">
                <Building2 className="w-5 h-5" />
                {client.name}
              </div>
              <div className="text-green-800 text-sm">
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Clocked in at: {new Date(existingTimesheet.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}

          {/* GPS Capture for Clock Out */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Navigation className={`w-5 h-5 ${gpsStatus === 'success' ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="font-medium text-gray-900">GPS Location</span>
              </div>
              {gpsStatus === 'idle' && (
                <Button onClick={captureLocation} size="sm">
                  Capture Location
                </Button>
              )}
              {gpsStatus === 'loading' && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Locating...</span>
                </div>
              )}
              {gpsStatus === 'success' && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Captured
                </Badge>
              )}
            </div>

            {location && validationResult && (
              <Alert className={validationResult.validated ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
                {validationResult.validated ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <AlertDescription className={validationResult.validated ? 'text-green-900' : 'text-red-900'}>
                  <strong>{validationResult.message}</strong>
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleClockOut}
              disabled={!canClockOut || loading || isClockingIn}
              className={`w-full py-6 text-lg ${canClockOut && !isClockingIn ? 'bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700' : 'bg-gray-400 cursor-not-allowed'}`}
            >
              {loading || isClockingIn ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Clocking Out...
                </>
              ) : canClockOut ? (
                <>
                  <Clock className="w-5 h-5 mr-2" />
                  Clock Out Now
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 mr-2" />
                  Clock Out Disabled
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 🏁 ALREADY CLOCKED OUT - SHIFT COMPLETE
  if (existingTimesheet && existingTimesheet.clock_out_time) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-gray-600" />
            Shift Complete
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="py-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Shift Completed!</h3>
            <p className="text-gray-600">Your timesheet has been submitted for approval.</p>
            <div className="mt-4 text-sm text-gray-500">
              <p>Clocked in: {new Date(existingTimesheet.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p>Clocked out: {new Date(existingTimesheet.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="font-semibold mt-2">Total Hours: {existingTimesheet.total_hours}h</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 🔵 DEFAULT: CLOCK IN FLOW
  const canClockIn = location && validationResult && validationResult.validated && !isClockingIn && !isLoadingLocation;

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="border-b bg-gradient-to-r from-cyan-50 to-blue-50">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-600" />
          Clock In to Shift
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        
        {/* Shift Details */}
        {client && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-semibold">
              <Building2 className="w-5 h-5" />
              {client.name}
            </div>
            {client.address && (
              <div className="flex items-start gap-2 text-blue-800 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p>{client.address.line1}</p>
                  <p>{client.address.city}, {client.address.postcode}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-blue-800 text-sm">
              <Clock className="w-4 h-4" />
              <span>{formatTodayShiftTime(shift)} ({shift.duration_hours}h)</span>
            </div>
          </div>
        )}

        {/* GPS Consent Required */}
        {needsConsent && (
          <Alert className="border-blue-300 bg-blue-50">
            <Info className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>GPS Consent Required</strong>
              <p className="text-sm mt-2 mb-3">
                To clock in, we need to verify your location. Your GPS is only captured during clock-in/out - not tracked continuously.
              </p>
              <Button onClick={requestGPSConsent} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Shield className="w-4 h-4 mr-2" />
                Grant GPS Consent
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* GPS Status */}
        {!needsConsent && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Navigation className={`w-5 h-5 ${gpsStatus === 'success' ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="font-medium text-gray-900">GPS Location</span>
              </div>
              {gpsStatus === 'idle' && (
                <Button onClick={captureLocation} size="sm">
                  Capture Location
                </Button>
              )}
              {gpsStatus === 'loading' && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Locating...</span>
                </div>
              )}
              {gpsStatus === 'success' && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Captured
                </Badge>
              )}
              {gpsStatus === 'error' && (
                <Button onClick={captureLocation} size="sm" variant="outline" className="text-red-600">
                  Retry
                </Button>
              )}
            </div>

            {gpsError && (
              <Alert className="border-red-300 bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-900">
                  {gpsError}
                </AlertDescription>
              </Alert>
            )}

            {location && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-green-900">
                  <MapPin className="w-4 h-4" />
                  <span className="font-semibold">Location Captured</span>
                </div>
                <div className="text-sm text-green-800 space-y-1">
                  <p>Latitude: {location.latitude.toFixed(6)}</p>
                  <p>Longitude: {location.longitude.toFixed(6)}</p>
                  <p>Accuracy: ±{Math.round(location.accuracy)}m</p>
                </div>
              </div>
            )}

            {validationResult && (
              <Alert className={validationResult.validated ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
                {validationResult.validated ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <AlertDescription className={validationResult.validated ? 'text-green-900' : 'text-red-900'}>
                  <strong>{validationResult.message}</strong>
                  <div className="text-sm mt-2 space-y-1">
                    <p>Distance: {validationResult.distance_meters}m from {validationResult.client_name}</p>
                    <p>Geofence: {validationResult.geofence_radius_meters}m radius</p>
                    {validationResult.gps_accuracy && (
                      <p>GPS Accuracy: ±{Math.round(validationResult.gps_accuracy)}m</p>
                    )}
                  </div>
                  {!validationResult.validated && (
                    <p className="text-xs mt-3 font-bold text-red-800">
                      ❌ Clock-in BLOCKED: You must be within {validationResult.geofence_radius_meters}m of the site to clock in.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* 🔒 ANTI-DUPLICATE WARNING / General Clock-in Progress */}
            {(isClockingIn || isLoadingLocation) && (
              <Alert className="border-blue-300 bg-blue-50">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <AlertDescription className="text-blue-900">
                  <strong>Processing your clock-in...</strong>
                  <p className="text-sm mt-1">Please wait, do not click again.</p>
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleClockIn}
              disabled={!canClockIn || loading || isClockingIn || isLoadingLocation}
              className={`w-full py-6 text-lg ${canClockIn ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
            >
              {loading || isClockingIn || isLoadingLocation ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Clocking In...
                </>
              ) : canClockIn ? (
                <>
                  <Clock className="w-5 h-5 mr-2" />
                  Clock In Now
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 mr-2" />
                  Clock In Disabled
                </>
              )}
            </Button>

            {!canClockIn && location && !isClockingIn && !isLoadingLocation && (
              <p className="text-xs text-center text-red-600 font-semibold">
                Move closer to the site to enable clock-in
              </p>
            )}

            <div className="text-xs text-gray-500 text-center">
              <Shield className="w-3 h-3 inline mr-1" />
              Your location is only captured at clock-in/out. We don't track you continuously.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
