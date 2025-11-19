
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar, Clock, MapPin, DollarSign, AlertTriangle,
  FileText, TrendingUp, Star, Award, Filter, ChevronDown, Building2,
  CheckCircle, ChevronRight, Zap, AlertCircle, Loader2, X as XIcon, Briefcase, MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, isWithinInterval, isFuture, isPast, isToday, parseISO, addDays } from "date-fns";
import MobileClockIn from "../components/staff/MobileClockIn";
import { formatShiftTimeRange, formatTodayShiftTime, getShiftType, formatTime12Hour } from "../utils/shiftTimeFormatter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress"; // NEW: Import Progress component

export default function StaffPortal() {
  const [user, setUser] = useState(null);
  const [staffRecord, setStaffRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all');
  const [selectedShift, setSelectedShift] = useState(null);
  const [showShiftDetail, setShowShiftDetail] = useState(false);
  
  // ✅ NEW: Advanced shift filtering state with localStorage persistence
  const [showFilters, setShowFilters] = useState(false);
  const [shiftFilters, setShiftFilters] = useState(() => {
    const saved = localStorage.getItem('staff_portal_shift_filters');
    return saved ? JSON.parse(saved) : {
      dateRangeType: 'all', // all, next7days, next14days, next30days, custom
      customStartDate: '',
      customEndDate: '',
      clientId: 'all',
      roleFilter: 'all'
    };
  });

  // ✅ FIX 1: Track confirming state per shift (not global boolean)
  const [confirmingShifts, setConfirmingShifts] = useState(new Set());



  // ✅ NEW: Persist filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('staff_portal_shift_filters', JSON.stringify(shiftFilters));
  }, [shiftFilters]);
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          console.error('❌ Not authenticated:', authError);
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
          setLoading(false);
          return;
        }

        setUser(profile);

        if (!profile.agency_id) {
          toast.error('Profile setup required');
          navigate(createPageUrl('ProfileSetup'));
          return;
        }

        const { data: allStaff, error: staffError } = await supabase
          .from('staff')
          .select('*');

        if (staffError) {
          console.error('❌ Error fetching staff:', staffError);
          setLoading(false);
          return;
        }

        const linkedStaff = allStaff?.find(s =>
          s.user_id === profile.id ||
          s.email?.toLowerCase() === profile.email?.toLowerCase()
        );

        if (linkedStaff) {
          console.log('✅ StaffPortal - Found staff record:', linkedStaff.id);
          setStaffRecord(linkedStaff);
        } else {
          console.error('❌ StaffPortal - No staff record found for user:', profile.id);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error:", error);
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
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.agency_id],
    queryFn: async () => {
      if (!user?.agency_id) return [];
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('agency_id', user.agency_id);
      
      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.agency_id,
    refetchOnMount: 'always'
  });

  const getClientName = (clientId) => {
    if (!clientId) return 'Care Home';
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Care Home';
  };

  const getClientAddress = (clientId) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client?.address;
  };

  const { data: myShifts = [], isLoading: loadingShifts } = useQuery({
    queryKey: ['my-shifts', staffRecord?.id],
    queryFn: async () => {
      if (!staffRecord) return [];
      
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('assigned_staff_id', staffRecord.id)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!staffRecord,
    refetchOnMount: 'always'
  });

  const { data: myTimesheets = [] } = useQuery({
    queryKey: ['my-timesheets', staffRecord?.id],
    queryFn: async () => {
      if (!user || !staffRecord) return [];
      
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('staff_id', staffRecord.id)
        .eq('agency_id', user.agency_id)
        .order('created_date', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching timesheets:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user && !!staffRecord,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const { data: myPayslips = [] } = useQuery({
    queryKey: ['my-payslips', staffRecord?.id],
    queryFn: async () => {
      if (!user || !staffRecord) return [];
      
      const { data, error } = await supabase
        .from('payslips')
        .select('*')
        .eq('staff_id', staffRecord.id)
        .eq('agency_id', user.agency_id)
        .order('payment_date', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching payslips:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user && !!staffRecord,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const { data: myBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['my-bookings', staffRecord?.id],
    queryFn: async () => {
      if (!staffRecord) return [];
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('staff_id', staffRecord.id);
      
      if (error) {
        console.error('❌ Error fetching bookings:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!staffRecord,
    refetchOnMount: 'always'
  });

  const acceptShiftMutation = useMutation({
    mutationFn: async (shiftId) => {
      const { data: shiftToAccept, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', shiftId)
        .single();

      if (shiftError || !shiftToAccept) {
        throw new Error("Shift not found.");
      }

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          agency_id: staffRecord.agency_id,
          shift_id: shiftId,
          staff_id: staffRecord.id,
          client_id: shiftToAccept.client_id,
          status: 'staff_confirmed',
          booking_date: new Date().toISOString(),
          shift_date: shiftToAccept.date,
          start_time: shiftToAccept.start_time,
          end_time: shiftToAccept.end_time,
          confirmation_method: 'app',
          confirmed_by_staff_at: new Date().toISOString(),
          created_date: new Date().toISOString()
        });

      if (bookingError) throw bookingError;

      const { error: updateError } = await supabase
        .from('shifts')
        .update({
          status: 'assigned',
          assigned_staff_id: staffRecord.id,
          shift_journey_log: [
            ...(shiftToAccept.shift_journey_log || []),
            {
              state: 'staff_accepted',
              timestamp: new Date().toISOString(),
              staff_id: staffRecord.id,
              method: 'staff_portal'
            }
          ]
        })
        .eq('id', shiftId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-shifts']);
      queryClient.invalidateQueries(['my-bookings']);
      queryClient.invalidateQueries(['marketplace-shifts']);
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['bookings']);
      queryClient.invalidateQueries(['workflows']);
      
      toast.success('🎉 Shift accepted! Check your bookings.');
    }
  });

  // ✅ FIX 3: Update confirmShiftMutation to track individual shift state
  const confirmShiftMutation = useMutation({
    mutationFn: async (shiftId) => {
      console.log('✅ [Staff Confirmation] Confirming shift:', shiftId);
      
      const shift = myShifts.find(s => s.id === shiftId);
      if (!shift) {
        throw new Error('Shift not found in local cache.');
      }

      // Update shift status to confirmed
      const { error: shiftUpdateError } = await supabase
        .from('shifts')
        .update({
          status: 'confirmed',
          shift_journey_log: [
            ...(shift.shift_journey_log || []),
            {
              state: 'confirmed',
              timestamp: new Date().toISOString(),
              user_id: user?.id,
              staff_id: staffRecord?.id, // Use staffRecord directly
              method: 'app',
              notes: 'Staff confirmed attendance via Staff Portal'
            }
          ]
        })
        .eq('id', shiftId);

      if (shiftUpdateError) throw shiftUpdateError;

      // Create or update booking
      const existingBooking = myBookings.find(b => b.shift_id === shiftId && b.staff_id === staffRecord?.id); // Use myBookings and staffRecord
      
      let bookingId = null;

      if (existingBooking) {
        const { error: bookingUpdateError } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            confirmed_by_staff_at: new Date().toISOString()
          })
          .eq('id', existingBooking.id);

        if (bookingUpdateError) throw bookingUpdateError;
        bookingId = existingBooking.id;
      } else {
        // If booking doesn't exist, create it. This might happen if a shift was assigned directly.
        const { data: newBooking, error: bookingCreateError } = await supabase
          .from('bookings')
          .insert({
            agency_id: shift.agency_id,
            shift_id: shiftId,
            staff_id: staffRecord.id,
            client_id: shift.client_id,
            status: 'confirmed',
            booking_date: new Date().toISOString(),
            shift_date: shift.date,
            start_time: shift.start_time, // ✅ TEXT (HH:MM) from shifts
            end_time: shift.end_time,     // ✅ TEXT (HH:MM) from shifts
            confirmation_method: 'app',
            confirmed_by_staff_at: new Date().toISOString(),
            created_date: new Date().toISOString()
          })
          .select()
          .single();

        if (bookingCreateError) throw bookingCreateError;
        bookingId = newBooking?.id;
      }

      // 🚨 CRITICAL FIX: Create timesheet when staff confirms shift
      // This ensures every confirmed shift has a timesheet record for staff to upload to
      let timesheetId = null;
      try {
        if (bookingId) {
          console.log('✅ [Timesheet Creation] Creating timesheet for booking:', bookingId);

          const { data: timesheetResponse, error: timesheetError } = await supabase.functions.invoke('auto-timesheet-creator', {
            body: {
              booking_id: bookingId,
              shift_id: shiftId,
              staff_id: staffRecord.id,
              client_id: shift.client_id,
              agency_id: shift.agency_id
            }
          });

          if (timesheetError) {
            console.error('❌ [Timesheet Creation] Failed:', timesheetError);
          } else if (timesheetResponse?.data?.success) {
            timesheetId = timesheetResponse.data.timesheet_id;
            console.log('✅ [Timesheet Creation] Success! Timesheet ID:', timesheetId);
          } else {
            console.warn('⚠️ [Timesheet Creation] Unexpected response:', timesheetResponse);
          }
        } else {
          console.error('❌ [Timesheet Creation] No booking ID available');
        }
      } catch (timesheetError) {
        console.error('❌ [Timesheet Creation] Exception:', timesheetError);
        // Don't fail the confirmation if timesheet creation fails
        // The shift is still confirmed, timesheet can be created manually if needed
      }

      return { shiftId, timesheetId };
    },
    onMutate: (shiftId) => {
      // ✅ FIX: Add this shift to confirming set
      setConfirmingShifts(prev => new Set([...prev, shiftId]));
    },
    onSuccess: (data, shiftId) => {
      // ✅ FIX: Remove this shift from confirming set
      setConfirmingShifts(prev => {
        const newSet = new Set(prev);
        newSet.delete(shiftId);
        return newSet;
      });

      queryClient.invalidateQueries(['my-shifts']);
      queryClient.invalidateQueries(['my-bookings']);
      queryClient.invalidateQueries(['shifts']); // Invalidate general shifts cache as well
      queryClient.invalidateQueries(['bookings']); // Invalidate general bookings cache as well

      // Find the confirmed shift to provide details in the toast
      const confirmedShift = myShifts.find(s => s.id === shiftId);
      const shiftDateFormatted = confirmedShift ? format(new Date(confirmedShift.date), 'EEE, MMM d') : 'your shift';

      toast.success('✅ Shift Confirmed!', {
        description: `You've confirmed attendance for ${shiftDateFormatted}. See you there!`,
        duration: 5000
      });

      // 🚀 NOTIFY ADMIN
      if (confirmedShift && staffRecord) {
        const clientName = getClientName(confirmedShift.client_id);
        const subject = `✅ Staff Confirmed: ${staffRecord.first_name} ${staffRecord.last_name} for ${clientName}`;
        const body_html = `
          <p><strong>${staffRecord.first_name} ${staffRecord.last_name}</strong> has confirmed their attendance for a shift.</p>
          <ul>
            <li><strong>Client:</strong> ${clientName}</li>
            <li><strong>Shift Date:</strong> ${confirmedShift.date}</li>
            <li><strong>Shift Time:</strong> ${confirmedShift.start_time} - ${confirmedShift.end_time}</li>
            <li><strong>Role:</strong> ${confirmedShift.role_required}</li>
          </ul>
          <p>No action is required. This is an automated confirmation.</p>
        `;
        
        supabase.functions.invoke('internal-admin-notifier', {
          body: { subject, body_html, change_type: 'staff_shift_confirmation' }
        }).catch(error => console.error("Failed to send admin notification:", error));

        // 🚀 NOTIFY CLIENT
        supabase.functions.invoke('shift-verification-chain', {
          body: {
            shift_id: confirmedShift.id,
            trigger_point: 'staff_confirmed_shift'
          }
        }).catch(error => console.error("Failed to send client confirmation notification:", error));
      }
    },
    onError: (error, shiftId) => {
      // ✅ FIX: Remove this shift from confirming set on error
      setConfirmingShifts(prev => {
        const newSet = new Set(prev);
        newSet.delete(shiftId);
        return newSet;
      });

      console.error('❌ [Staff Confirmation] Error:', error);
      toast.error('Failed to confirm shift', {
        description: error.message
      });
    }
  });

  const filterByDateRange = (items, dateField) => {
    if (dateRange === 'all') return items;
    
    const today = new Date();
    let start, end;
    
    if (dateRange === 'today') {
      start = today;
      end = today;
    } else if (dateRange === 'week') {
      start = startOfWeek(today, { weekStartsOn: 1 });
      end = endOfWeek(today, { weekStartsOn: 1 });
    } else if (dateRange === 'month') {
      start = startOfMonth(today);
      end = endOfMonth(today);
    } else if (dateRange === 'last7days') {
      start = subDays(today, 7);
      end = today;
    } else if (dateRange === 'last30days') {
      start = subDays(today, 30);
      end = today;
    }
    
    if (!start || !end) return items;
    
    return items.filter(item => {
      const itemDate = new Date(item[dateField]);
      if (dateRange === 'today') {
        return itemDate.toDateString() === start.toDateString();
      }
      return isWithinInterval(itemDate, { start, end });
    });
  };

  const filteredTimesheets = filterByDateRange(myTimesheets, 'shift_date');
  const filteredPayslips = filterByDateRange(myPayslips, 'payment_date');

  // ✅ NEW: Advanced shift filtering function
  const applyShiftFilters = (shifts) => {
    let filtered = [...shifts];

    // Date range filter
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today for comparison
    
    if (shiftFilters.dateRangeType !== 'all') {
      filtered = filtered.filter(shift => {
        const shiftDate = parseISO(shift.date);
        
        const shiftDateNormalized = new Date(shiftDate);
        shiftDateNormalized.setHours(0, 0, 0, 0);
        
        let rangeStart, rangeEnd;

        switch (shiftFilters.dateRangeType) {
          case 'next7days':
            rangeStart = today;
            rangeEnd = addDays(today, 7);
            rangeEnd.setHours(23, 59, 59, 999); // End of day for comparison
            break;
          case 'next14days':
            rangeStart = today;
            rangeEnd = addDays(today, 14);
            rangeEnd.setHours(23, 59, 59, 999);
            break;
          case 'next30days':
            rangeStart = today;
            rangeEnd = addDays(today, 30);
            rangeEnd.setHours(23, 59, 59, 999);
            break;
          case 'custom':
            if (shiftFilters.customStartDate && shiftFilters.customEndDate) {
              rangeStart = parseISO(shiftFilters.customStartDate);
              rangeEnd = parseISO(shiftFilters.customEndDate);
              rangeStart.setHours(0,0,0,0);
              rangeEnd.setHours(23,59,59,999);
            } else {
              return true; // No custom range set, don't filter by date if 'custom' selected but dates are empty
            }
            break;
          default:
            return true;
        }
        
        return isWithinInterval(shiftDateNormalized, { start: rangeStart, end: rangeEnd });
      });
    }

    // Client filter
    if (shiftFilters.clientId !== 'all') {
      filtered = filtered.filter(shift => shift.client_id === shiftFilters.clientId);
    }

    // Role filter
    if (shiftFilters.roleFilter !== 'all') {
      filtered = filtered.filter(shift => shift.role_required === shiftFilters.roleFilter);
    }

    return filtered;
  };

  // ✅ NEW: Clear all filters
  const clearFilters = () => {
    setShiftFilters({
      dateRangeType: 'all',
      customStartDate: '',
      customEndDate: '',
      clientId: 'all',
      roleFilter: 'all'
    });
    toast.success('Filters cleared');
  };

  // ✅ NEW: Check if any filters are active
  const hasActiveFilters = () => {
    return shiftFilters.dateRangeType !== 'all' || 
           shiftFilters.clientId !== 'all' || 
           shiftFilters.roleFilter !== 'all' ||
           (shiftFilters.dateRangeType === 'custom' && (shiftFilters.customStartDate || shiftFilters.customEndDate));
  };

  // ✅ MODIFIED: Apply filters to shift arrays
  const generallyFilteredShifts = applyShiftFilters(myShifts);

  const assignedShifts = generallyFilteredShifts.filter(s => {
    const shiftDate = new Date(s.date);
    return s.status === 'assigned' && (isFuture(shiftDate) || isToday(shiftDate));
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const upcomingShifts = generallyFilteredShifts.filter(s => {
    const shiftDate = new Date(s.date);
    return (isFuture(shiftDate) || isToday(shiftDate));
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const confirmedShifts = upcomingShifts.filter(s => s.status === 'confirmed');

  const todayShifts = myShifts.filter(s => { // This should NOT be filtered by general filters
    const shiftDate = new Date(s.date);
    const today = new Date();
    // Only show today's shifts that are either assigned (awaiting clock-in) or confirmed
    return shiftDate.toDateString() === today.toDateString() && (s.status === 'assigned' || s.status === 'confirmed' || s.status === 'in_progress');
  });

  const nextShift = upcomingShifts.filter(s => s.status === 'confirmed' || s.status === 'assigned' || s.status === 'in_progress')[0]; // Next relevant shift for display in hero

  // ✅ FIX 2: Calculate actual earnings from CONFIRMED shifts
  const today = new Date();
  const sevenDaysAgo = subDays(today, 7);

  const thisWeekEarnings = myShifts
    .filter(s => {
      if (s.status !== 'confirmed') return false; // Only confirmed shifts count
      const shiftDate = new Date(s.date);
      // Check if shiftDate is within the last 7 days (inclusive of today)
      return shiftDate >= sevenDaysAgo && shiftDate <= today;
    })
    .reduce((sum, shift) => sum + ((shift.pay_rate || 0) * (shift.duration_hours || 0)), 0);

  const totalEarningsAllTime = myShifts
    .filter(s => s.status === 'confirmed') // Only confirmed shifts
    .reduce((sum, shift) => sum + ((shift.pay_rate || 0) * (shift.duration_hours || 0)), 0);

  const thisWeekShiftCount = myShifts.filter(s => {
    if (s.status !== 'confirmed') return false;
    const shiftDate = new Date(s.date);
    return shiftDate >= sevenDaysAgo && shiftDate <= today;
  }).length;

  const pendingTimesheets = myTimesheets.filter(t => t.status === 'pending').length;
  const completedShifts = myShifts.filter(s => s.status === 'completed').length;

  // ✅ NEW: Calculate onboarding progress for staff
  const { data: compliance = [] } = useQuery({
    queryKey: ['my-compliance', staffRecord?.id],
    queryFn: async () => {
      if (!staffRecord?.id) return [];
      
      const { data, error } = await supabase
        .from('compliance')
        .select('*')
        .eq('staff_id', staffRecord.id);
      
      if (error) {
        console.error('❌ Error fetching compliance:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!staffRecord?.id,
    refetchOnMount: 'always'
  });

  const calculateOnboardingProgress = () => {
    if (!staffRecord) return { percentage: 0, missing: [] };
    
    let completed = 0;
    let total = 10;
    const missing = [];
    
    // Critical items
    if (staffRecord.profile_photo_url) {
      completed++;
    } else {
      missing.push({ item: '📸 Profile Photo', priority: 'critical', action: 'Upload in Profile Settings' });
    }
    
    if (staffRecord.date_of_birth) {
      completed++;
    } else {
      missing.push({ item: '🎂 Date of Birth', priority: 'critical', action: 'Add in Profile Settings' });
    }
    
    if (staffRecord.address?.postcode) {
      completed++;
    } else {
      missing.push({ item: '🏠 Full Address', priority: 'important', action: 'Complete in Profile Settings' });
    }
    
    if (staffRecord.emergency_contact?.phone) {
      completed++;
    } else {
      missing.push({ item: '🚨 Emergency Contact', priority: 'important', action: 'Add in Profile Settings' });
    }
    
    const dbsCheck = compliance.find(c => c.document_type === 'dbs_check' && c.status === 'verified');
    if (dbsCheck) {
      completed++;
    } else {
      missing.push({ item: '🛡️ DBS Certificate', priority: 'critical', action: 'Upload in My Docs' });
    }
    
    const rightToWork = compliance.find(c => c.document_type === 'right_to_work' && c.status === 'verified');
    if (rightToWork) {
      completed++;
    } else {
      missing.push({ item: '📋 Right to Work', priority: 'critical', action: 'Upload in My Docs' });
    }
    
    if (staffRecord.references && staffRecord.references.length >= 2) {
      completed++;
    } else {
      missing.push({ item: '✍️ References (min 2)', priority: 'critical', action: 'Add in Profile Settings' });
    }
    
    if (staffRecord.employment_history && staffRecord.employment_history.length > 0) {
      completed++;
    } else {
      missing.push({ item: '💼 Employment History', priority: 'important', action: 'Add in Profile Settings' });
    }
    
    const mandatoryTraining = staffRecord.mandatory_training || {};
    const mandatoryTrainingValues = Object.values(mandatoryTraining);
    const validMandatoryTrainingCount = mandatoryTrainingValues.filter((t) => {
      if (!t || typeof t !== 'object') return false;
      if (!t.completed_date) return false;
      if (!t.expiry_date) return true;
      return new Date(t.expiry_date) > new Date();
    }).length;

    const totalMandatoryTrainingItems = 10;
    const trainingCount = validMandatoryTrainingCount;

    if (trainingCount >= totalMandatoryTrainingItems) {
      completed++;
    } else {
      const remaining = Math.max(0, totalMandatoryTrainingItems - trainingCount);
      missing.push({
        item: `📜 Mandatory Training (${trainingCount}/${totalMandatoryTrainingItems} – ${remaining} missing)`,
        priority: 'important',
        action: 'Upload in My Docs',
      });
    }

    if (staffRecord.occupational_health?.cleared_to_work) {
      completed++;
    } else {
      missing.push({ item: '🏥 Occupational Health', priority: 'important', action: 'Add in Profile Settings' });
    }
    
    const percentage = Math.round((completed / total) * 100);
    return { percentage, missing: missing.slice(0, 5) }; // Show top 5 most critical
  };

  const onboardingProgress = calculateOnboardingProgress();
  const isFullyCompliant = onboardingProgress.percentage === 100;


  // ✅ NEW: Handle shift click to show details
  const handleShiftClick = (shift) => {
    setSelectedShift(shift);
    setShowShiftDetail(true);
  };

  // ✅ NEW: Get unique roles from staff's shifts for filter dropdown
  const uniqueRoles = [...new Set(myShifts.map(s => s.role_required))].filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!staffRecord) {
    return (
      <Alert className="border-orange-300 bg-orange-50 max-w-2xl mx-auto mt-12">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <AlertDescription className="text-orange-900">
          <strong>Staff Profile Not Found</strong>
          <p className="mt-2">Please contact your administrator to set up your staff profile.</p>
          <p className="text-xs mt-2">User ID: {user?.id}</p>
          <p className="text-xs">Email: {user?.email}</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-20 px-3 sm:px-4 md:px-6">
      {/* ✅ MOBILE-FIRST: Onboarding Progress Alert (Only if not 100%) */}
      {!isFullyCompliant && (
        <Card className="border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-orange-900 text-base sm:text-lg">
                      ⚠️ Profile {onboardingProgress.percentage}% Complete
                    </h3>
                    <p className="text-xs sm:text-sm text-orange-700">
                      Complete your profile to accept shifts
                    </p>
                  </div>
                </div>

                <Progress value={onboardingProgress.percentage} className="h-2 mb-4" />

                {/* ✅ MOBILE: Missing Items with touch-friendly targets */}
                <div className="space-y-2">
                  {onboardingProgress.missing.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        // Navigate based on action type
                        if (item.action.includes('Profile Settings')) {
                          navigate('/profilesetup');
                        } else if (item.action.includes('My Docs')) {
                          navigate('/compliancetracker');
                        }
                      }}
                      className="w-full flex items-center justify-between p-3 sm:p-2 bg-white rounded border border-orange-200 hover:bg-orange-50 hover:border-orange-400 transition-all cursor-pointer min-h-[48px] sm:min-h-0"
                    >
                      <span className="text-xs sm:text-sm font-medium text-gray-900 text-left">{item.item}</span>
                      <Badge className={`${item.priority === 'critical' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'} text-xs flex-shrink-0 ml-2`}>
                        {item.priority === 'critical' ? '🔴 Critical' : '🟡 Important'}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>

              {/* ✅ MOBILE: Stack buttons on mobile, side-by-side on desktop */}
              <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => navigate(createPageUrl('ProfileSetup'))}
                  className="bg-cyan-600 hover:bg-cyan-700 whitespace-nowrap flex-1 sm:flex-none min-h-[48px] sm:min-h-0"
                >
                  Complete Profile
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl('ComplianceTracker'))}
                  className="whitespace-nowrap flex-1 sm:flex-none min-h-[48px] sm:min-h-0"
                >
                  Upload Docs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ MOBILE-FIRST: Next Shift Hero Card - Optimized for mobile */}
      {nextShift && (
        <Card className="bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 text-white border-0 shadow-2xl">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-cyan-100 text-xs sm:text-sm font-medium mb-1">YOUR NEXT SHIFT</p>
                <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
                  {isToday(new Date(nextShift.date)) ? 'Today' : format(new Date(nextShift.date), 'EEEE')}
                </h2>
                <p className="text-lg sm:text-xl opacity-90">{format(new Date(nextShift.date), 'MMM d')}</p>
              </div>
              <Badge className="bg-white text-blue-600 text-base sm:text-lg px-3 py-1 flex-shrink-0">
                {formatTime12Hour(nextShift.start_time)}
              </Badge>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 sm:p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base sm:text-lg truncate">{getClientName(nextShift.client_id)}</p>
                  <p className="text-xs sm:text-sm opacity-90">{formatTodayShiftTime(nextShift)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 flex-shrink-0" />
                <p className="font-bold text-base sm:text-lg">
                  £{((nextShift.duration_hours || 0) * (nextShift.pay_rate || staffRecord.hourly_rate || 15)).toFixed(2)}
                </p>
                <span className="text-xs sm:text-sm opacity-75">for this shift</span>
              </div>
            </div>

            {isToday(new Date(nextShift.date)) && (
              <Button
                className="w-full bg-white text-blue-600 hover:bg-gray-100 text-base sm:text-lg py-5 sm:py-6 font-bold min-h-[56px]"
                onClick={() => document.getElementById(`clock-in-${nextShift.id}`)?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Zap className="w-5 h-5 mr-2" />
                CLOCK IN NOW
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ✅ MOBILE-FIRST: Earnings Cards - Responsive grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3 sm:p-5">
            <p className="text-xs sm:text-sm text-green-700 mb-1 font-medium">This Week</p>
            <p className="text-xl sm:text-3xl font-bold text-green-600">£{thisWeekEarnings.toFixed(2)}</p>
            <p className="text-[10px] sm:text-xs text-green-600 mt-1">{thisWeekShiftCount} shift{thisWeekShiftCount !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3 sm:p-5">
            <p className="text-xs sm:text-sm text-blue-700 mb-1 font-medium">Total Earned</p>
            <p className="text-xl sm:text-3xl font-bold text-blue-600">£{totalEarningsAllTime.toFixed(2)}</p>
            <p className="text-[10px] sm:text-xs text-blue-600 mt-1">
              All Time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ MOBILE-FIRST: Advanced Shift Filters - Collapsible on mobile */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="border-b bg-purple-50 p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-purple-900 text-base sm:text-lg">
              <Filter className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">Filter Shifts</span>
              {hasActiveFilters() && (
                <Badge className="bg-purple-600 text-white text-xs">
                  {
                    ((shiftFilters.dateRangeType !== 'all' && shiftFilters.dateRangeType !== 'custom') ? 1 : 0) +
                    ((shiftFilters.dateRangeType === 'custom' && (shiftFilters.customStartDate || shiftFilters.customEndDate)) ? 1 : 0) +
                    (shiftFilters.clientId !== 'all' ? 1 : 0) +
                    (shiftFilters.roleFilter !== 'all' ? 1 : 0)
                  }
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="min-h-[44px] sm:min-h-0"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="p-3 sm:p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Date Range Filter */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">Date Range</label>
                <Select
                  value={shiftFilters.dateRangeType}
                  onValueChange={(value) => setShiftFilters({...shiftFilters, dateRangeType: value, customStartDate: '', customEndDate: ''})}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Upcoming</SelectItem>
                    <SelectItem value="next7days">Next 7 Days</SelectItem>
                    <SelectItem value="next14days">Next 14 Days</SelectItem>
                    <SelectItem value="next30days">Next 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Client Filter */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">Care Home</label>
                <Select
                  value={shiftFilters.clientId}
                  onValueChange={(value) => setShiftFilters({...shiftFilters, clientId: value})}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Care Homes</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role Filter */}
              <div className="sm:col-span-2 md:col-span-1">
                <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">Role</label>
                <Select
                  value={shiftFilters.roleFilter}
                  onValueChange={(value) => setShiftFilters({...shiftFilters, roleFilter: value})}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {uniqueRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {role.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Date Range Inputs */}
            {shiftFilters.dateRangeType === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">Start Date</label>
                  <Input
                    type="date"
                    value={shiftFilters.customStartDate}
                    onChange={(e) => setShiftFilters({...shiftFilters, customStartDate: e.target.value})}
                    className="min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">End Date</label>
                  <Input
                    type="date"
                    value={shiftFilters.customEndDate}
                    onChange={(e) => setShiftFilters({...shiftFilters, customEndDate: e.target.value})}
                    className="min-h-[44px]"
                  />
                </div>
              </div>
            )}

            {/* Filter Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t">
              <p className="text-xs sm:text-sm text-gray-600">
                Showing <strong>{assignedShifts.length + confirmedShifts.length}</strong> shifts
              </p>
              {hasActiveFilters() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2 min-h-[44px] sm:min-h-0 w-full sm:w-auto"
                >
                  <XIcon className="w-4 h-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ✅ MOBILE-FIRST: Shifts Awaiting Confirmation - Touch-friendly */}
      {assignedShifts.length > 0 && (
        <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardHeader className="pb-3 p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-blue-900 text-base sm:text-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-blue-600" />
              <span className="truncate">Confirm Shifts ({assignedShifts.length})</span>
            </CardTitle>
            <p className="text-xs sm:text-sm text-blue-700 mt-1">
              These shifts have been assigned to you. Please confirm your attendance!
            </p>
          </CardHeader>
          <CardContent className="space-y-3 p-3 sm:p-6">
            {assignedShifts.map(shift => {
              const isThisShiftConfirming = confirmingShifts.has(shift.id);

              return (
              <div key={shift.id} className="p-3 sm:p-4 bg-white rounded-lg border-2 border-blue-200">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                  <div className="flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className="bg-blue-100 text-blue-800 text-sm sm:text-base px-2 sm:px-3 py-1">
                        {format(new Date(shift.date), 'EEE, MMM d')}
                      </Badge>
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        {formatTodayShiftTime(shift)}
                      </Badge>
                    </div>

                    <p className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">
                      {getClientName(shift.client_id)}
                      {shift.work_location_within_site && (
                        <span className="block sm:inline sm:ml-2 text-cyan-600 text-xs sm:text-sm">→ {shift.work_location_within_site}</span>
                      )}
                    </p>

                    <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>{shift.duration_hours}h</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="font-semibold text-green-600">
                          £{((shift.duration_hours || 0) * (shift.pay_rate || staffRecord.hourly_rate || 15)).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {shift.notes && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                        {shift.notes}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={() => confirmShiftMutation.mutate(shift.id)}
                    disabled={isThisShiftConfirming}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white w-full sm:w-auto sm:min-w-[140px] min-h-[48px] sm:min-h-0"
                  >
                    {isThisShiftConfirming ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );})}
          </CardContent>
        </Card>
      )}

      {/* ✅ MOBILE-FIRST: Today's Shifts with Clock In (LARGE TOUCH TARGETS) */}
      {todayShifts.length > 0 && (
        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardHeader className="pb-3 p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-orange-900 text-base sm:text-lg">
              <Clock className="w-5 h-5 flex-shrink-0" />
              Today's Shifts ({todayShifts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3 sm:p-6">
            {todayShifts.map(shift => {
              const booking = myBookings.find(b => b.shift_id === shift.id);
              const timesheet = booking ? myTimesheets.find(t => t.booking_id === booking.id) : null;

              return (
                <div key={shift.id} id={`clock-in-${shift.id}`}>
                  <MobileClockIn 
                    shift={shift} 
                    staffId={staffRecord.id}
                    existingTimesheet={timesheet}
                    onClockInComplete={() => {
                      toast.info("Refreshing shift status...");
                      queryClient.invalidateQueries({ queryKey: ['my-shifts'] });
                      queryClient.invalidateQueries({ queryKey: ['my-timesheets'] });
                      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
                    }}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ✅ MOBILE-FIRST: Upcoming Shifts - Only show CONFIRMED shifts */}
      <Card>
        <CardHeader className="pb-3 p-3 sm:p-6 flex flex-row items-center justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg truncate">Confirmed Upcoming Shifts</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Shifts you've confirmed attendance for</p>
          </div>
          <Badge className="bg-green-100 text-green-800 flex-shrink-0 ml-2">{confirmedShifts.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {confirmedShifts.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm sm:text-base text-gray-600">No confirmed upcoming shifts</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                {assignedShifts.length > 0
                  ? 'You have shifts awaiting confirmation above!'
                  : hasActiveFilters()
                    ? 'Try adjusting your filters to find more shifts.'
                    : 'Check the marketplace for available shifts'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {confirmedShifts.slice(0, 5).map(shift => (
                <div
                  key={shift.id}
                  className="p-3 sm:p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer min-h-[72px] sm:min-h-0"
                  onClick={() => handleShiftClick(shift)}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* ✅ MOBILE: Smaller date badge on mobile */}
                    <div className="text-center bg-green-100 rounded-lg p-2 sm:p-3 min-w-[56px] sm:min-w-[70px] flex-shrink-0">
                      <p className="text-xl sm:text-2xl font-bold text-green-600">
                        {format(new Date(shift.date), 'd')}
                      </p>
                      <p className="text-[10px] sm:text-xs text-green-700 font-medium">
                        {format(new Date(shift.date), 'MMM')}
                      </p>
                      <p className="text-[10px] sm:text-xs text-green-600">
                        {format(new Date(shift.date), 'EEE')}
                      </p>
                    </div>

                    {/* ✅ MOBILE: Shift Info - responsive text sizes */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900 text-sm sm:text-base truncate">{getClientName(shift.client_id)}</p>
                        <Badge className="bg-green-100 text-green-800 text-[10px] sm:text-xs flex-shrink-0">
                          ✓ Confirmed
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">{formatTodayShiftTime(shift)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="font-semibold text-green-600">
                            £{((shift.duration_hours || 0) * (shift.pay_rate || staffRecord.hourly_rate || 15)).toFixed(2)}
                          </span>
                        </div>
                        {shift.work_location_within_site && (
                          <div className="flex items-center gap-1 w-full sm:w-auto">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="text-cyan-600 font-medium text-[10px] sm:text-xs truncate">{shift.work_location_within_site}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ NEW: Shift Detail Modal */}
      {showShiftDetail && selectedShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowShiftDetail(false)}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="border-b sticky top-0 bg-white z-10">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{getClientName(selectedShift.client_id)}</CardTitle>
                  <p className="text-gray-600 mt-1">
                    {format(new Date(selectedShift.date), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowShiftDetail(false)}
                  className="h-8 w-8"
                >
                  <XIcon className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Status Badge */}
              <div>
                <Badge className={
                  selectedShift.status === 'confirmed' 
                    ? 'bg-green-100 text-green-800 text-lg px-4 py-2' 
                    : 'bg-blue-100 text-blue-800 text-lg px-4 py-2'
                }>
                  {selectedShift.status === 'confirmed' ? '✅ Confirmed' : '⏳ Awaiting Confirmation'}
                </Badge>
              </div>

              {/* Time & Pay */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold">Time</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatTodayShiftTime(selectedShift)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{selectedShift.duration_hours} hours</p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <DollarSign className="w-5 h-5" />
                    <span className="font-semibold">Earnings</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    £{((selectedShift.duration_hours || 0) * (selectedShift.pay_rate || staffRecord.hourly_rate || 15)).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    £{(selectedShift.pay_rate || staffRecord.hourly_rate || 15).toFixed(2)}/hour
                  </p>
                </div>
              </div>

              {/* Location */}
              {(() => {
                const address = getClientAddress(selectedShift.client_id);
                return address && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-700 mb-2">
                      <MapPin className="w-5 h-5" />
                      <span className="font-semibold">Location</span>
                    </div>
                    <p className="text-gray-900">
                      {address.line1}
                      {address.line2 && `, ${address.line2}`}
                    </p>
                    <p className="text-gray-600">
                      {address.city}, {address.postcode}
                    </p>
                    {selectedShift.work_location_within_site && (
                      <p className="text-cyan-600 font-semibold mt-2">
                        📍 Specific Location: {selectedShift.work_location_within_site}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Role */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                  <Briefcase className="w-5 h-5" />
                  <span className="font-semibold">Role</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {selectedShift.role_required?.replace('_', ' ')}
                </p>
              </div>

              {/* Notes */}
              {selectedShift.notes && (
                <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                  <div className="flex items-center gap-2 text-amber-700 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">Important Notes</span>
                  </div>
                  <p className="text-gray-900">{selectedShift.notes}</p>
                </div>
              )}

              {/* Reminders */}
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📋 Shift Reminders</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="mt-1">•</span>
                    <span>Arrive 10 minutes before shift start time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1">•</span>
                    <span>Bring your ID badge and any required documents</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1">•</span>
                    <span>Clock in via the app when you arrive</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1">•</span>
                    <span>Contact agency immediately if running late</span>
                  </li>
                </ul>
              </div>

              {selectedShift.status === 'assigned' && (
                <Button
                  onClick={() => {
                    confirmShiftMutation.mutate(selectedShift.id);
                    setShowShiftDetail(false);
                  }}
                  disabled={confirmingShifts.has(selectedShift.id)} // Use individual shift confirming state
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12 text-lg"
                >
                  {confirmingShifts.has(selectedShift.id) ? ( // Use individual shift confirming state
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Confirm Shift
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}


      {/* Quick Actions - LARGE BUTTONS */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          className="h-24 flex flex-col gap-2 border-2"
          onClick={() => navigate(createPageUrl('ShiftMarketplace'))}
        >
          <Calendar className="w-6 h-6 text-purple-600" />
          <span className="font-semibold">Find Shifts</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-24 flex flex-col gap-2 border-2"
          onClick={() => navigate(createPageUrl('Timesheets'))}
        >
          <FileText className="w-6 h-6 text-blue-600" />
          <span className="font-semibold">Timesheets</span>
          {pendingTimesheets > 0 && (
            <Badge className="bg-orange-500 text-white text-xs">{pendingTimesheets}</Badge>
          )}
        </Button>
        <Button 
          variant="outline" 
          className="h-24 flex flex-col gap-2 border-2"
          onClick={() => navigate(createPageUrl('ComplianceTracker'))}
        >
          <CheckCircle className="w-6 h-6 text-green-600" />
          <span className="font-semibold">My Docs</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-24 flex flex-col gap-2 border-2"
          onClick={() => navigate(createPageUrl('Payslips'))}
        >
          <DollarSign className="w-6 h-6 text-green-600" />
          <span className="font-semibold">Payslips</span>
        </Button>
      </div>

      {/* Agency Info Footer */}
      {agency && (
        <Card className="bg-gray-50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-600 mb-2">Working with</p>
            <div className="flex items-center justify-center gap-3 mb-2">
              {agency.logo_url && (
                <img 
                  src={agency.logo_url} 
                  alt={agency.name}
                  className="h-12 w-auto rounded object-contain"
                />
              )}
              <p className="font-bold text-gray-900 text-lg">{agency.name}</p>
            </div>
            {agency.contact_email && (
              <p className="text-xs text-gray-500 mt-2">📧 {agency.contact_email}</p>
            )}
            {agency.contact_phone && (
              <p className="text-xs text-gray-500">📞 {agency.contact_phone}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
