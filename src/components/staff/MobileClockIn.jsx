
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
import { invokeFunction } from "@/lib/supabaseFunctions";

export default function MobileClockIn({ shift, onClockInComplete, existingTimesheet: initialTimesheet }) {
  const [loading, setLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [location, setLocation] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [staff, setStaff] = useState(null);
  const [client, setClient] = useState(null);
  const [existingTimesheet, setExistingTimesheet] = useState(initialTimesheet);
  const [existingBooking, setExistingBooking] = useState(null);
  
  // 🔒 ANTI-DUPLICATE PROTECTION
  const [isClockingIn, setIsClockingIn] = useState(false);
  const clockInAttemptRef = useRef(null);
  const lastClickTimeRef = useRef(0);

  // New state as per outline, assuming it's for an internal loading specific to location within handleClockIn
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    setExistingTimesheet(initialTimesheet);
  }, [initialTimesheet]);

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
      } catch (error) {
        console.error("Error fetching non-timesheet data:", error);
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

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('GPS not supported on this device');
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
          resolve(locationData);
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject('Location permission denied. Please enable location access in your browser settings.');
              break;
            case error.POSITION_UNAVAILABLE:
              reject('Location unavailable. Please ensure GPS is enabled on your device.');
              break;
            case error.TIMEOUT:
              reject('Location request timed out. Please try again.');
              break;
            default:
              reject('An unknown GPS error occurred. Please try again.');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleClockIn = async () => {
    // Debounce and check for existing process
    const nowTimestamp = Date.now();
    if (nowTimestamp - lastClickTimeRef.current < 2000) return;
    lastClickTimeRef.current = nowTimestamp;
    if (isClockingIn) {
      toast.warning('Clock-in already in progress...');
      return;
    }

    setIsClockingIn(true);
    setLoading(true);
    setGpsError(null);
    setValidationResult(null);

    try {
      // 1. Get Current Location
      const capturedLocation = await getCurrentLocation();
      setLocation(capturedLocation);

      // 2. Validate Geofence
      if (!shift?.client_id) {
        throw new Error("Client data not loaded. Please refresh.");
      }

      // --- 🐞 DIAGNOSTIC LOGGING ---
      console.log("--- 🐞 Invoking geofence-validator ---");
      console.log("Payload to be sent:");
      console.log("1. staff_location:", JSON.stringify(capturedLocation, null, 2));
      console.log("2. client_id:", shift.client_id);
      console.log("------------------------------------");
      // --- END LOGGING ---

      const { data: validation, error: validationError } = await invokeFunction('geofence-validator', {
        body: {
          staff_location: capturedLocation,
          client_id: shift.client_id
        }
      });
      if (validationError) throw validationError;
      setValidationResult(validation);
      if (!validation.validated) {
        toast.error(`Clock-in failed: ${validation.message}`);
        throw new Error(validation.message);
      }

      // 3. Proceed with Clock-in Logic (simplified from original)
      const requestId = `clock-in-${shift.id}-${staff.id}-${Date.now()}`;
      clockInAttemptRef.current = requestId;

      // Double-check for existing timesheet
      const { data: existingTimesheets, error: existingTimesheetError } = await supabase
        .from('timesheets')
        .select('id, clock_in_time')
        .eq('shift_id', shift.id)
        .eq('staff_id', staff.id);
      if (existingTimesheetError) throw existingTimesheetError;
      if (existingTimesheets && existingTimesheets.length > 0 && existingTimesheets[0].clock_in_time) {
        toast.error('You have already clocked in for this shift!');
        setExistingTimesheet(existingTimesheets[0]);
        return;
      }
      
      // Get or create booking
      let booking = existingBooking;
      if (!booking) {
          const { data: newBooking, error: newBookingError } = await supabase
            .from('bookings')
            .insert({
              agency_id: shift.agency_id, shift_id: shift.id, staff_id: staff.id,
              client_id: shift.client_id, status: 'confirmed', booking_date: new Date().toISOString(),
              shift_date: shift.date, start_time: shift.start_time, end_time: shift.end_time,
              confirmation_method: 'app_clock_in'
            })
            .select().single();
          if (newBookingError) throw new Error(`Failed to create booking: ${newBookingError.message}`);
          booking = newBooking;
          setExistingBooking(booking);
      }

      // Create Timesheet
      const { data: timesheet, error: timesheetError } = await supabase
        .from('timesheets')
        .insert({
          agency_id: shift.agency_id, booking_id: booking.id, staff_id: staff.id,
          client_id: shift.client_id, shift_date: shift.date, clock_in_time: new Date().toISOString(),
          clock_in_location: capturedLocation, pay_rate: shift.pay_rate, charge_rate: shift.charge_rate,
          status: 'draft', geofence_validated: validation.validated, geofence_distance_meters: validation.distance_meters
        })
        .select().single();
      if (timesheetError) throw timesheetError;

      // Update shift status
      await supabase.from('shifts').update({ status: 'in_progress', shift_started_at: new Date().toISOString() }).eq('id', shift.id);

      // Trigger notifications
      invokeFunction('shift-verification-chain', {
        body: {
          shift_id: shift.id, trigger_point: 'staff_clocked_in',
          additional_data: {
            clock_in_time: new Date().toLocaleTimeString(),
            geofence_validated: validation.validated,
            distance_meters: validation.distance_meters
          }
        }
      }).catch(console.error);

      toast.success('✅ Clocked in successfully!');
      setExistingTimesheet(timesheet);
      if (onClockInComplete) {
        onClockInComplete(timesheet);
      }

    } catch (error) {
      console.error('❌ [Clock-In] Error:', error);
      setGpsError(error.message);
      toast.error(`Clock-in failed: ${error.message}`);
    } finally {
      setIsClockingIn(false);
      setLoading(false);
      clockInAttemptRef.current = null;
    }
  };

  const handleClockOut = async () => {
    // GUARDRAIL 1: Confirmation Dialog
    if (!window.confirm('Are you sure you want to clock out now?')) {
      return;
    }

    // GUARDRAIL 2: Minimum Shift Duration (15 mins)
    const clockInTime = new Date(existingTimesheet.clock_in_time);
    const now = new Date();
    const minutesSinceClockIn = (now.getTime() - clockInTime.getTime()) / (1000 * 60);

    if (minutesSinceClockIn < 15) {
      toast.error('Minimum shift duration not met', {
        description: 'You can only clock out after at least 15 minutes have passed since clock-in.',
      });
      return;
    }

    // Prevent duplicate requests
    if (isClockingIn) {
      console.warn('⚠️ Already processing clock-out request');
      return;
    }
    if (existingTimesheet.clock_out_time) {
      toast.error('❌ You have already clocked out of this shift!');
      return;
    }

    setIsClockingIn(true);
    setLoading(true);
    setGpsError(null);

    try {
      // 1. Get Current Location
      const capturedLocation = await getCurrentLocation();

      // 2. Proceed with Clock-out Logic
      const clockOutTime = new Date().toISOString();
      const totalHours = (new Date(clockOutTime).getTime() - new Date(existingTimesheet.clock_in_time).getTime()) / (1000 * 60 * 60);
      const totalHoursRounded = parseFloat(totalHours.toFixed(2));

      const { error: timesheetUpdateError } = await supabase
        .from('timesheets')
        .update({
          clock_out_time: clockOutTime,
          clock_out_location: capturedLocation,
          total_hours: totalHoursRounded,
          status: 'submitted',
        })
        .eq('id', existingTimesheet.id);
      if (timesheetUpdateError) throw timesheetUpdateError;

      await supabase.from('shifts').update({ status: 'completed', shift_ended_at: clockOutTime }).eq('id', shift.id);

      // Call intelligent validator
      try {
        const { data: validatorData } = await invokeFunction('intelligent-timesheet-validator', {
          body: { timesheet_id: existingTimesheet.id }
        });
        if (validatorData?.auto_approved) {
          toast.success('✅ Clocked out successfully! Timesheet auto-approved.');
        } else {
          toast.success('✅ Clocked out successfully! Submitted for approval.');
        }
      } catch (validationError) {
        console.error('Validation error:', validationError);
        toast.success('✅ Clocked out successfully!');
      }

      setExistingTimesheet({ ...existingTimesheet, clock_out_time: clockOutTime, total_hours: totalHoursRounded });

    } catch (error) {
      console.error('Clock out error:', error);
      setGpsError(error.message);
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
            {gpsError && (
              <Alert className="border-red-300 bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-900">
                  {gpsError}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleClockOut}
              disabled={loading || isClockingIn}
              className={`w-full py-6 text-lg bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 disabled:bg-gray-400`}
            >
              {loading || isClockingIn ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Clocking Out...
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 mr-2" />
                  Clock Out Now
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
  const canClockIn = location && location.latitude && location.longitude && validationResult && validationResult.validated && !isClockingIn && !isLoadingLocation;

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
            {gpsError && (
              <Alert className="border-red-300 bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-900">
                  {gpsError}
                </AlertDescription>
              </Alert>
            )}

            {validationResult && !validationResult.validated && (
              <Alert className='border-red-300 bg-red-50'>
                <XCircle className="h-5 w-5 text-red-600" />
                <AlertDescription className='text-red-900'>
                  <strong>{validationResult.message}</strong>
                  <p className="text-xs mt-2">
                    Please move closer to the site and try again. You must be within {validationResult.geofence_radius_meters}m to clock in.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {(isClockingIn || isLoadingLocation) && (
              <Alert className="border-blue-300 bg-blue-50">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <AlertDescription className="text-blue-900">
                  <strong>Processing your clock-in...</strong>
                  <p className="text-sm mt-1">Getting location and validating... Please wait.</p>
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleClockIn}
              disabled={loading || isClockingIn || isLoadingLocation}
              className={`w-full py-6 text-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed`}
            >
              {loading || isClockingIn || isLoadingLocation ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Clocking In...
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 mr-2" />
                  Clock In Now
                </>
              )}
            </Button>

            <div className="text-xs text-gray-500 text-center">
              <Shield className="w-3 h-3 inline mr-1" />
              Your location is captured once at the moment you clock in/out.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
