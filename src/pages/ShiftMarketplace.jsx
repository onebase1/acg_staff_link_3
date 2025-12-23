
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar, Clock, MapPin, AlertCircle, Star, CheckCircle,
  TrendingUp, Zap, Award, Building2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatShiftTimeRange, formatTodayShiftTime, getShiftType } from "../utils/shiftTimeFormatter";
import { calculateStaffEarnings } from "../utils/shiftCalculations";
import NotificationService from "../components/notifications/NotificationService";

export default function ShiftMarketplace() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          console.error('❌ Not authenticated:', authError);
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profile) {
          console.error('❌ Profile not found:', profileError);
          setError('Profile not found');
          setLoading(false);
          return;
        }

        setUser(profile);

        console.log('ShiftMarketplace - User:', {
          email: profile.email,
          user_type: profile.user_type,
          agency_id: profile.agency_id
        });

        // CRITICAL: Check if user is admin - redirect to dashboard
        if (profile.user_type === 'agency_admin' || profile.user_type === 'manager') {
          console.log('Admin user detected - redirecting to Dashboard');
          toast.info('Shift Marketplace is for staff members only', {
            description: 'Redirecting you to the admin dashboard...',
            duration: 3000
          });
          navigate(createPageUrl('Dashboard'));
          return;
        }

        // Check if user is a staff member
        if (profile.user_type !== 'staff_member') {
          setError('This page is only accessible to staff members');
          setLoading(false);
          return;
        }

        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .or(`user_id.eq.${profile.id},email.eq.${profile.email}`);

        const staffProfile = staffData?.find(s =>
          s.user_id === profile.id ||
          s.email?.toLowerCase() === profile.email?.toLowerCase()
        );

        if (!staffProfile) {
          console.log('No staff profile found');
          setError('Staff profile not found. Please contact your administrator.');
          setLoading(false);
          return;
        }

        console.log('Staff profile found:', staffProfile.first_name, staffProfile.last_name);
        setStaffProfile(staffProfile);
        setLoading(false);
      } catch (err) {
        console.error('ShiftMarketplace error:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const { data: agency } = useQuery({
    queryKey: ['agency', user?.agency_id],
    queryFn: async () => {
      if (!user?.agency_id) return null;

      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', user.agency_id)
        .single();

      if (error) {
        console.error('❌ Error fetching agency:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.agency_id,
    refetchOnMount: 'always'
  });

  const { data: availableShifts = [], refetch: refetchShifts } = useQuery({
    queryKey: ['available-shifts', staffProfile?.id],
    queryFn: async () => {
      if (!staffProfile) return [];

      // Fetch all shifts
      const { data: allShifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*')
        .order('date', { ascending: false });

      if (shiftsError) {
        console.error('❌ Error fetching shifts:', shiftsError);
        return [];
      }

      // ✅ Get staff's assigned shifts to prevent double-booking
      const assignedShiftDates = allShifts
        .filter(s => s.assigned_staff_id === staffProfile.id && (s.status === 'assigned' || s.status === 'confirmed'))
        .map(s => s.date);

      console.log('📅 Staff already working on:', assignedShiftDates);

      // ✅ Get current datetime for filtering past shifts
      const now = new Date();

      // CRITICAL: Only show truly UNASSIGNED open shifts that match staff role
      const openShifts = allShifts.filter(shift => {
        // Must be open status
        if (shift.status !== 'open') return false;

        // Must NOT have any staff assigned
        if (shift.assigned_staff_id) return false;

        // Must be same agency
        if (shift.agency_id !== staffProfile.agency_id) return false;

        // ✅ CRITICAL FIX: ALWAYS check role matching first
        // Staff should NEVER see shifts for roles they can't work
        // Even if marketplace_visible=true, role must match
        if (shift.role_required !== staffProfile.role) return false;

        // ✅ CRITICAL FIX: Only show shifts that haven't ended yet (handles overnight shifts)
        // For overnight shifts (end_time < start_time), the end datetime is next day
        const shiftEndDateTime = new Date(`${shift.date}T${shift.end_time}`);

        // If end_time < start_time, it's an overnight shift - add 1 day to end time
        if (shift.end_time < shift.start_time) {
          shiftEndDateTime.setDate(shiftEndDateTime.getDate() + 1);
        }

        // Only filter out if shift has completely ended
        if (shiftEndDateTime < now) {
          console.log(`🚫 Filtering out completed shift on ${shift.date} (ended at ${shiftEndDateTime.toISOString()})`);
          return false;
        }

        // ✅ CRITICAL FIX: Check for double-booking
        // Staff should NOT see shifts on days they're already working
        if (assignedShiftDates.includes(shift.date)) {
          console.log(`🚫 Filtering out shift on ${shift.date} - staff already working`);
          return false;
        }

        // EITHER: Admin has marked it visible in marketplace
        // OR: Matches staff availability (auto-matched)
        const isAdminApproved = shift.marketplace_visible === true;

        const isAutoMatched = (() => {
          // Check availability
          const shiftDay = format(new Date(shift.date), 'EEEE').toLowerCase();
          const availability = staffProfile.availability?.[shiftDay] || [];

          const isNightShift = shift.start_time >= '20:00' || shift.start_time < '08:00';
          const shiftType = isNightShift ? 'night' : 'day';

          return availability.includes(shiftType);
        })();

        return isAdminApproved || isAutoMatched;
      });

      console.log('Marketplace shifts:', openShifts.length);
      return openShifts;
    },
    enabled: !!staffProfile,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    refetchOnMount: 'always'
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*');

      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      return data || [];
    },
    enabled: true,
    refetchOnMount: 'always'
  });

  // ✅ Track which shift is being accepted to show loading state per-shift
  const [acceptingShiftId, setAcceptingShiftId] = useState(null);
  const [recentlyAcceptedIds, setRecentlyAcceptedIds] = useState(new Set());

  const acceptShiftMutation = useMutation({
    mutationFn: async (shiftId) => {
      setAcceptingShiftId(shiftId);

      // CRITICAL: Double-check shift is still available before accepting
      await refetchShifts();
      const shift = availableShifts.find(s => s.id === shiftId);

      if (!shift) {
        throw new Error('Shift not found - it may have been removed');
      }

      if (shift.assigned_staff_id) {
        throw new Error('Sorry, this shift was just accepted by someone else');
      }

      if (shift.status !== 'open') {
        throw new Error('This shift is no longer available');
      }

      // ✅ AUTO-CONFIRM: When staff accepts shift themselves, auto-confirm to "confirmed"
      // Only require manual confirmation when admin assigns without staff consent
      const { error: shiftError } = await supabase
        .from('shifts')
        .update({
          status: 'confirmed',
          assigned_staff_id: staffProfile.id,
          shift_journey_log: [
            ...(shift.shift_journey_log || []),
            {
              state: 'confirmed',
              timestamp: new Date().toISOString(),
              staff_id: staffProfile.id,
              method: 'marketplace_accept',
              notes: 'Staff accepted from marketplace - auto-confirmed'
            }
          ]
        })
        .eq('id', shiftId);

      if (shiftError) throw shiftError;

      // Create booking with confirmed status (staff accepted themselves)
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          agency_id: shift.agency_id,
          shift_id: shiftId,
          staff_id: staffProfile.id,
          client_id: shift.client_id,
          status: 'confirmed',
          booking_date: new Date().toISOString(),
          shift_date: shift.date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          confirmation_method: 'app',
          created_date: new Date().toISOString()
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 🚨 CRITICAL FIX: Create timesheet when staff accepts shift from marketplace
      try {
        if (booking?.id) {
          console.log('✅ [Marketplace Accept] Triggering timesheet creation for booking:', booking.id);
          await supabase.functions.invoke('auto-timesheet-creator', {
            body: {
              booking_id: booking.id,
              shift_id: shiftId,
              staff_id: staffProfile.id,
              client_id: shift.client_id,
              agency_id: shift.agency_id
            }
          });
        }
      } catch (tsError) {
        console.error('❌ [Marketplace Accept] Timesheet creation failed:', tsError);
      }

      // 🚀 NOTIFY STAFF (Batched)
      const client = clients.find(c => c.id === shift.client_id);
      try {
        if (agency && staffProfile) {
          console.log('📧 [Marketplace Accept] Queueing confirmation email for staff:', staffProfile.email);
          await NotificationService.notifyShiftAssignment({
            staff: staffProfile,
            shift: shift,
            client: client,
            agency: agency,
            useBatching: true
          });
        }
      } catch (notifyError) {
        console.error('❌ [Marketplace Accept] Notification failed:', notifyError);
      }

      return { shift, client };
    },
    onSuccess: ({ shift, client }) => {
      setAcceptingShiftId(null);

      // ✅ NEW: Add to recently accepted set for visual feedback
      setRecentlyAcceptedIds(prev => new Set([...prev, shift.id]));

      // ✅ NEW: Remove after 3 seconds to let the list refresh naturally
      setTimeout(() => {
        setRecentlyAcceptedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(shift.id);
          return newSet;
        });

        // Invalidate queries only after the feedback period to avoid jarring jumps
        queryClient.invalidateQueries(['available-shifts']);
        queryClient.invalidateQueries(['my-shifts']);
        queryClient.invalidateQueries(['my-bookings']);
        queryClient.invalidateQueries(['shifts']);
      }, 3000);

      toast.success('🎉 Shift Accepted!', {
        description: `You've accepted ${client?.name || 'the shift'} on ${format(new Date(shift.date), 'MMM d')}. Check "My Shifts" to confirm attendance.`,
        duration: 4000
      });
    },
    onError: (error) => {
      setAcceptingShiftId(null);
      toast.error('❌ Failed to Accept Shift', {
        description: error.message,
        duration: 4000,
        position: 'top-center'
      });

      // Refresh the list to remove stale shifts
      refetchShifts();
    }
  });

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown';
  };

  const getClientRating = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.rating || 0;
  };



  const urgentShifts = availableShifts.filter(s => s.urgency === 'urgent' || s.urgency === 'critical');
  const regularShifts = availableShifts.filter(s => s.urgency === 'normal');

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading shift marketplace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-300 bg-red-50 max-w-2xl mx-auto mt-12">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <AlertDescription className="text-red-900">
          <strong>Access Denied</strong>
          <p className="mt-2">{error}</p>
          <div className="mt-4 flex gap-3">
            <Button onClick={() => navigate(createPageUrl('Dashboard'))}>
              Go to Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate(createPageUrl('ProfileSetup'))}>
              Profile Setup
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!staffProfile) {
    return (
      <Alert className="border-orange-300 bg-orange-50 max-w-2xl mx-auto mt-12">
        <AlertCircle className="h-5 w-5 text-orange-600" />
        <AlertDescription className="text-orange-900">
          <strong>Staff Profile Not Found</strong>
          <p className="mt-2">Please contact your administrator to set up your staff profile.</p>
          <Button className="mt-4" onClick={() => navigate(createPageUrl('Home'))}>
            Back to Home
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Agency Branding */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-8 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Available Shifts
            </h1>
            <p className="text-purple-50">
              {availableShifts.length} shifts matched to your profile
            </p>
            {/* REMOVED: "Powered by" branding - Task 10 */}
          </div>
          <div className="text-right">
            <p className="text-sm text-purple-200">Your Role</p>
            <p className="text-2xl font-bold capitalize">{staffProfile.role.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">URGENT Shifts</p>
                <p className="text-3xl font-bold text-red-600">{urgentShifts.length}</p>
                <p className="text-xs text-red-600 mt-1">Higher pay rates!</p>
              </div>
              <Zap className="w-10 h-10 text-red-500 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Regular Shifts</p>
                <p className="text-3xl font-bold text-blue-600">{regularShifts.length}</p>
              </div>
              <Calendar className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">Potential Earnings</p>
                <p className="text-3xl font-bold text-amber-600">
                  £{availableShifts.reduce((sum, s) => sum + calculateStaffEarnings(s), 0).toFixed(0)}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-amber-500 opacity-30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ NEW: Important Notice about Confirmation */}
      <Alert className="border-blue-300 bg-blue-50">
        <AlertCircle className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>⚠️ Two-Step Process:</strong> When you accept a shift, you'll need to <strong>confirm your attendance</strong> in your Staff Portal.
          This ensures you're committed to the shift and reduces no-shows.
        </AlertDescription>
      </Alert>

      {/* URGENT Shifts Section */}
      {urgentShifts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-6 h-6 text-red-600" />
            <h2 className="text-2xl font-bold text-red-600">URGENT SHIFTS</h2>
          </div>
          <div className="space-y-4">
            {urgentShifts.map(shift => (
              <Card key={shift.id} className="border-2 border-red-300 bg-red-50/50 hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className="bg-red-600 text-white animate-pulse">
                          {shift.urgency === 'critical' ? '🚨 CRITICAL' : '⚡ URGENT'}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {shift.role_required.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm mb-3">
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-semibold">{getClientName(shift.client_id)}</p>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs">{getClientRating(shift.client_id).toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{format(new Date(shift.date), 'EEE, MMM d')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{formatShiftTimeRange(shift.start_time, shift.end_time)}</span>
                        </div>
                      </div>

                      {shift.notes && (
                        <Alert className="bg-yellow-50 border-yellow-300 mt-3">
                          <AlertDescription className="text-sm text-yellow-900">
                            {shift.notes}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <div className="text-right p-4 bg-white rounded-lg border-2 border-green-300">
                        <p className="text-sm text-gray-600">You'll earn</p>
                        <p className="text-3xl font-bold text-green-600">
                          £{calculateStaffEarnings(shift).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          £{shift.pay_rate}/hr
                        </p>
                      </div>

                      {recentlyAcceptedIds.has(shift.id) ? (
                        <div className="bg-green-100 text-green-700 font-bold py-6 px-4 rounded-md flex items-center justify-center gap-2 border-2 border-green-500 animate-in zoom-in duration-300">
                          <CheckCircle className="w-6 h-6" />
                          <span>Shift Accepted!</span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => acceptShiftMutation.mutate(shift.id)}
                          disabled={acceptingShiftId === shift.id}
                          className="bg-red-600 hover:bg-red-700 text-lg py-6"
                        >
                          {acceptingShiftId === shift.id ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                              Accepting...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5 mr-2" />
                              Accept Shift
                            </>
                          )}
                        </Button>
                      )}

                      <p className="text-xs text-center text-gray-600">
                        ⚠️ You'll need to confirm after accepting
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Regular Shifts Section */}
      {regularShifts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Regular Shifts</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {regularShifts.map(shift => (
              <Card key={shift.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="capitalize">
                          {shift.role_required.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="font-semibold text-lg">{getClientName(shift.client_id)}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{getClientRating(shift.client_id).toFixed(1)} rating</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Earn</p>
                      <p className="text-2xl font-bold text-green-600">
                        £{calculateStaffEarnings(shift).toFixed(0)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(shift.date), 'EEEE, MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{formatShiftTimeRange(shift.start_time, shift.end_time)} ({shift.duration_hours}h)</span>
                    </div>
                  </div>

                  {shift.notes && (
                    <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded mb-4">
                      {shift.notes}
                    </p>
                  )}

                  {recentlyAcceptedIds.has(shift.id) ? (
                    <div className="bg-green-100 text-green-700 font-bold py-3 px-4 rounded-md flex items-center justify-center gap-2 border-2 border-green-500 animate-in zoom-in duration-300 mt-4">
                      <CheckCircle className="w-5 h-5" />
                      <span>Accepted!</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => acceptShiftMutation.mutate(shift.id)}
                      disabled={acceptingShiftId === shift.id}
                      className="w-full mt-4 bg-sky-600 hover:bg-sky-700"
                    >
                      {acceptingShiftId === shift.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accept This Shift
                        </>
                      )}
                    </Button>
                  )}

                  <p className="text-xs text-center text-gray-500 mt-2">
                    You'll need to confirm attendance after accepting
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {availableShifts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Available Shifts</h3>
            <p className="text-gray-600">
              Check back soon! New shifts matching your profile will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            Smart Shift Matching
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-lg">1</span>
              </div>
              <h4 className="font-semibold mb-1">We Match</h4>
              <p className="text-sm text-gray-600">Only see shifts that fit your role, skills & availability</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-lg">2</span>
              </div>
              <h4 className="font-semibold mb-1">One-Tap Accept</h4>
              <p className="text-sm text-gray-600">Click to confirm, we notify the client instantly</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-lg">3</span>
              </div>
              <h4 className="font-semibold mb-1">Get Paid</h4>
              <p className="text-sm text-gray-600">Digital timesheets, auto-approval, fast payments</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
