
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Search, User, Star, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ShiftAssignmentModal({ shift, onAssign, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentAgency, setCurrentAgency] = useState(null);
  const [isLoadingAgency, setIsLoadingAgency] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});

  const queryClient = useQueryClient();

  // Get current user's agency
  useEffect(() => {
    const getAgency = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError || !authUser) {
          console.error("Error fetching auth user:", authError);
          setCurrentAgency(shift.agency_id);
          setIsLoadingAgency(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profile) {
          console.error("Error fetching profile:", profileError);
          setCurrentAgency(shift.agency_id);
          setIsLoadingAgency(false);
          return;
        }

        const superAdminEmail = 'g.basera@yahoo.com';
        if (profile.email === superAdminEmail) {
          setCurrentAgency(shift.agency_id);
        } else {
          setCurrentAgency(profile.agency_id || shift.agency_id);
        }

        setIsLoadingAgency(false);
      } catch (error) {
        console.error("Error fetching user:", error);
        setCurrentAgency(shift.agency_id);
        setIsLoadingAgency(false);
      }
    };
    getAgency();
  }, [shift.agency_id]);

  const { data: staff = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff-for-assignment', currentAgency, shift.role_required],
    queryFn: async () => {
      if (!currentAgency) return [];
      
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('agency_id', currentAgency)
        .eq('status', 'active')
        .eq('role', shift.role_required);

      if (error) {
        console.error('Error fetching staff:', error);
        return [];
      }

      return data || [];
    },
    initialData: [],
    enabled: !!currentAgency && !isLoadingAgency
  });

  // Fetch ALL shifts for overlap validation
  const { data: allShifts = [] } = useQuery({
    queryKey: ['all-shifts-validation', currentAgency],
    queryFn: async () => {
      if (!currentAgency) return [];
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('agency_id', currentAgency)
        .in('status', ['assigned', 'confirmed', 'in_progress']);

      if (error) {
        console.error('Error fetching shifts for validation:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!currentAgency && !isLoadingAgency,
    staleTime: 30000 // Cache for 30 seconds
  });

  // VALIDATION FUNCTION: Check staff overlap
  const validateStaffAvailability = (staffId) => {
    const staffShifts = allShifts.filter(s => s.assigned_staff_id === staffId);
    
    if (staffShifts.length === 0) return { valid: true };

    const shiftStart = new Date(`${shift.date}T${shift.start_time}`);
    let shiftEnd = new Date(`${shift.date}T${shift.end_time}`);

    // Handle overnight shifts
    if (shiftEnd < shiftStart) {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }

    const overlaps = [];

    for (const existingShift of staffShifts) {
      if (existingShift.id === shift.id) continue; // Skip current shift

      const existingStart = new Date(`${existingShift.date}T${existingShift.start_time}`);
      let existingEnd = new Date(`${existingShift.date}T${existingShift.end_time}`);

      // Handle overnight shifts
      if (existingEnd < existingStart) {
        existingEnd.setDate(existingEnd.getDate() + 1);
      }

      // Check for overlap
      const hasOverlap = (
        (shiftStart >= existingStart && shiftStart < existingEnd) ||
        (shiftEnd > existingStart && shiftEnd <= existingEnd) ||
        (shiftStart <= existingStart && shiftEnd >= existingEnd)
      );

      if (hasOverlap) {
        overlaps.push({
          date: existingShift.date,
          start: existingShift.start_time,
          end: existingShift.end_time,
          client: existingShift.client_id
        });
      }
    }

    if (overlaps.length > 0) {
      return {
        valid: false,
        reason: 'overlap',
        overlaps: overlaps
      };
    }

    // Check for 24-hour violation (worked > 16 hours in 24h window)
    const last24Hours = staffShifts.filter(s => {
      const sDate = new Date(s.date);
      const shiftDate = new Date(shift.date);
      // Calculate difference in milliseconds
      const timeDiff = Math.abs(shiftDate.getTime() - sDate.getTime());
      // Convert to hours
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      return hoursDiff <= 24;
    });

    const totalHoursIn24h = last24Hours.reduce((sum, s) => sum + (s.duration_hours || 0), 0) + (shift.duration_hours || 0);

    if (totalHoursIn24h > 16) {
      return {
        valid: false,
        reason: '24h_limit',
        totalHours: totalHoursIn24h
      };
    }

    return { valid: true };
  };

  const assignMutation = useMutation({
    mutationFn: async ({ shiftId, staffId }) => {
      // VALIDATION GATE
      const validation = validateStaffAvailability(staffId);
      
      if (!validation.valid) {
        if (validation.reason === 'overlap') {
          throw new Error(`Staff already assigned to ${validation.overlaps.length} overlapping shift(s) on ${shift.date}`);
        } else if (validation.reason === '24h_limit') {
          throw new Error(`Staff would work ${validation.totalHours.toFixed(1)}h in 24 hours (max: 16h)`);
        }
      }

      const { data: updatedShift, error: shiftError } = await supabase
        .from('shifts')
        .update({
          assigned_staff_id: staffId,
          status: 'assigned'
        })
        .eq('id', shiftId)
        .select()
        .single();

      if (shiftError) {
        throw shiftError;
      }

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          agency_id: shift.agency_id,
          shift_id: shiftId,
          staff_id: staffId,
          client_id: shift.client_id,
          status: 'confirmed',
          booking_date: new Date().toISOString(),
          shift_date: shift.date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          confirmation_method: 'app'
        });

      if (bookingError) {
        throw bookingError;
      }

      // FIX: Graceful email failure handling - don't crash assignment if email fails
      try {
        console.log('📧 [ShiftAssignment] Calling shiftVerificationChain...');
        const { data: emailData } = await supabase.functions.invoke('shift-verification-chain', {
          body: {
            shift_id: shiftId,
            trigger_point: 'staff_assigned'
          }
        });
        
        console.log('✅ [ShiftAssignment] Verification email response:', emailData);
        
        if (emailData?.success) {
          console.log(`✅ [ShiftAssignment] Care home notified: ${emailData.email_sent_to}`);
        } else if (emailData?.skipped) {
          console.warn(`⚠️ [ShiftAssignment] Email skipped: ${emailData.reason}`);
        } else {
          console.warn('⚠️ [ShiftAssignment] Email notification failed:', emailData?.error);
        }
      } catch (emailError) {
        // DON'T FAIL THE ASSIGNMENT - just log the error
        console.error('⚠️ [ShiftAssignment] Verification email failed (non-critical):', emailError.message);
        // User will still see success toast, but email failure is logged
      }

      return updatedShift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['bookings']);
      queryClient.invalidateQueries(['staff']);
      queryClient.invalidateQueries(['timesheets']);
      queryClient.invalidateQueries(['my-shifts']);
      queryClient.invalidateQueries(['my-bookings']);
      queryClient.invalidateQueries(['client-shifts']);
      queryClient.invalidateQueries(['workflows']);
      queryClient.invalidateQueries(['staff-for-assignment']);
      queryClient.invalidateQueries(['all-shifts-validation']);
      
      toast.success('✅ Staff assigned & notification sent to care home!');
      onClose();
    },
    onError: (error) => {
      toast.error(`❌ ${error.message}`);
    }
  });

  const handleAssignClick = (staffId) => {
    // Clear previous errors
    setValidationErrors({});

    // Validate before attempting assignment
    const validation = validateStaffAvailability(staffId);

    if (!validation.valid) {
      setValidationErrors({ [staffId]: validation });
      return;
    }

    assignMutation.mutate({ shiftId: shift.id, staffId });
  };

  const filteredStaff = staff.filter(s =>
    s.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLoading = isLoadingAgency || isLoadingStaff || assignMutation.isLoading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-cyan-50 to-blue-50">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Assign Staff to Shift</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {shift.role_required?.replace('_', ' ')} • {shift.date} • {shift.start_time}-{shift.end_time}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search staff by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-cyan-600 animate-spin mx-auto mb-3" />
              <p className="text-gray-600">Loading available staff...</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredStaff.length > 0 ? (
                filteredStaff.map(staffMember => {
                  const validation = validateStaffAvailability(staffMember.id);
                  const hasError = validationErrors[staffMember.id];

                  return (
                    <div key={staffMember.id}>
                      <div className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors ${!validation.valid ? 'border-red-300 bg-red-50' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {staffMember.first_name?.[0]}{staffMember.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {staffMember.first_name} {staffMember.last_name}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="capitalize">{staffMember.role?.replace('_', ' ')}</span>
                              {staffMember.rating && (
                                <>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <span>{staffMember.rating.toFixed(1)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAssignClick(staffMember.id)}
                          className={validation.valid ? "bg-cyan-600 hover:bg-cyan-700" : "bg-gray-400"}
                          disabled={assignMutation.isLoading || !validation.valid}
                        >
                          {assignMutation.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : validation.valid ? 'Assign' : 'Unavailable'}
                        </Button>
                      </div>

                      {/* Show validation error */}
                      {!validation.valid && (
                        <Alert className="mt-2 border-red-300 bg-red-50">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-900 text-sm">
                            {validation.reason === 'overlap' && (
                              <>
                                <strong>⚠️ OVERLAP DETECTED:</strong> Already assigned to {validation.overlaps.length} shift(s) on {shift.date}:
                                <ul className="mt-1 ml-4 list-disc">
                                  {validation.overlaps.map((overlap, idx) => (
                                    <li key={idx}>{overlap.start} - {overlap.end}</li>
                                  ))}
                                </ul>
                              </>
                            )}
                            {validation.reason === '24h_limit' && (
                              <>
                                <strong>⚠️ 24-HOUR LIMIT:</strong> Would work {validation.totalHours.toFixed(1)}h in 24 hours (max: 16h for safety)
                              </>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No available staff found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Role required: {shift.role_required?.replace('_', ' ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
