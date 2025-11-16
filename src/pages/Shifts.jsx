
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus, Calendar, Clock, MapPin, AlertCircle, UserPlus, LayoutGrid, List, Zap, RefreshCw, AlertTriangle, Building2,
  Edit2, Save, X as XIcon, Loader2, Download, CalendarIcon, CheckCircle, Mail, MessageSquare
} from "lucide-react";
import { format, subDays, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import NotificationService from "../components/notifications/NotificationService";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ShiftRateDisplay from "../components/shifts/ShiftRateDisplay";
import { Label } from "@/components/ui/label";
import ShiftCompletionModal from "../components/shifts/ShiftCompletionModal";

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

export default function Shifts() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [dateRange, setDateRange] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [assigningShift, setAssigningShift] = useState(null);
  const [viewMode, setViewMode] = useState('cards');
  const [broadcastingShiftIds, setBroadcastingShiftIds] = useState(new Set());

  const [currentAgency, setCurrentAgency] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const [editingShift, setEditingShift] = useState(null);
  const [editFormData, setEditFormData] = useState({
    client_id: '',
    assigned_staff_id: '',
    status: ''
  });

  const [editingCell, setEditingCell] = useState(null);
  const [cellEditValue, setCellEditValue] = useState('');
  const [adminBypassMode, setAdminBypassMode] = useState(false);

  const [completingShift, setCompletingShift] = useState(null);
  
  // ✅ NEW: Track which shifts are sending timesheet requests
  const [sendingTimesheetRequest, setSendingTimesheetRequest] = useState(new Set());

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const getDateRangeFilter = () => {
    const today = new Date();

    switch (dateRange) {
      case 'today':
        return {
          start: format(today, 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
      case 'upcoming':
        return {
          start: format(today, 'yyyy-MM-dd'),
          end: format(addDays(today, 30), 'yyyy-MM-dd')
        };
      case 'week':
        return {
          start: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          end: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        };
      case 'month':
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd')
        };
      case 'last30':
        return {
          start: format(subDays(today, 30), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
      case 'last90':
        return {
          start: format(subDays(today, 90), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd')
        };
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: customStartDate,
            end: customEndDate
          };
        }
        return null;
      case 'all':
        return null;
      default:
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd')
        };
    }
  };

  useEffect(() => {
    return () => {
      setStatusFilter('all');
      setClientFilter('all');
      setDateRange('month');
      setEditingCell(null);
      setAdminBypassMode(false);
    };
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Get authenticated user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          console.error('❌ [Shifts] Not authenticated:', authError);
          setUserLoading(false);
          return;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profile) {
          console.error('❌ [Shifts] Profile not found:', profileError);
          setUserLoading(false);
          return;
        }

        console.log('✅ [Shifts] Loaded user:', profile.email, 'Agency:', profile.agency_id);

        setCurrentUser(profile); // Store full profile for role checking

        if (profile.agency_id) {
          setCurrentAgency(profile.agency_id);
        } else {
          setCurrentAgency(null);
        }
      } catch (error) {
        console.error('❌ [Shifts] Auth error:', error);
        toast.error('Failed to load user data');
      } finally {
        setUserLoading(false);
      }
    };

    loadUser();
  }, []);

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', currentAgency, dateRange, customStartDate, customEndDate],
    queryFn: async () => {
      console.log('📊 [Shifts Query] Fetching with params:', {
        agency: currentAgency,
        dateRange,
        customStartDate,
        customEndDate
      });

      const dateFilter = getDateRangeFilter();
      console.log('📅 [Shifts Query] Date filter:', dateFilter);

      let query = supabase.from('shifts').select('*');
      
      // Filter by agency
      if (currentAgency) {
        query = query.eq('agency_id', currentAgency);
      }
      
      // Filter by date range
      if (dateFilter) {
        query = query.gte('date', dateFilter.start).lte('date', dateFilter.end);
      }
      
      query = query.order('date', { ascending: false }).limit(200);
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ [Shifts Query] Error:', error);
        return [];
      }

      console.log(`✅ [Shifts Query] Loaded ${data?.length || 0} shifts`);
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients', currentAgency],
    queryFn: async () => {
      let query = supabase.from('clients').select('*').order('name', { ascending: true });
      
      if (currentAgency) {
        query = query.eq('agency_id', currentAgency);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff', currentAgency],
    queryFn: async () => {
      let query = supabase.from('staff').select('*').order('first_name', { ascending: true });
      
      if (currentAgency) {
        query = query.eq('agency_id', currentAgency);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agencies').select('*').order('name', { ascending: true });
      
      if (error) {
        console.error('❌ Error fetching agencies:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const clientMap = useMemo(() => {
    const map = {};
    clients.forEach(c => {
      map[c.id] = c.name;
    });
    return map;
  }, [clients]);

  const staffMap = useMemo(() => {
    const map = {};
    staff.forEach(s => {
      map[s.id] = `${s.first_name} ${s.last_name}`;
    });
    return map;
  }, [staff]);

  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, data, staffReassigned, oldStaffId, newStaffId }) => {
      const shiftToEdit = shifts.find(s => s.id === id);

      if (shiftToEdit?.financial_locked) {
        const financialFields = ['pay_rate', 'charge_rate', 'duration_hours', 'work_location_within_site'];
        const attemptingFinancialChange = Object.keys(data).some(
          field => financialFields.includes(field)
        );

        if (attemptingFinancialChange) {
          throw new Error('🔒 BLOCKED: This shift is financially locked (timesheet approved). Cannot modify rates, hours, or location.');
        }
      }

      const { data: updated, error } = await supabase
        .from('shifts')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // ✅ AUDIT TRAIL: Send emails if staff was reassigned
      if (staffReassigned && oldStaffId && newStaffId) {
        const oldStaff = staff.find(s => s.id === oldStaffId);
        const newStaff = staff.find(s => s.id === newStaffId);
        const client = clients.find(c => c.id === shiftToEdit.client_id);
        const agency = agencies.find(a => a.id === shiftToEdit.agency_id);

        // 1. Email old staff (cancellation/reassignment notice)
        if (oldStaff?.email) {
          try {
            await supabase.functions.invoke('critical-change-notifier', {
              body: {
                change_type: 'shift_reassigned',
                affected_entity_type: 'shift',
                affected_entity_id: id,
                staff_email: oldStaff.email,
                staff_name: `${oldStaff.first_name} ${oldStaff.last_name}`,
                client_name: client?.name || 'Unknown Client',
                shift_date: shiftToEdit.date,
                shift_time: `${shiftToEdit.start_time} - ${shiftToEdit.end_time}`,
                reason: 'Admin updated who actually worked this shift'
              }
            });
            console.log(`✅ [Edit Shift] Reassignment email sent to old staff: ${oldStaff.email}`);
          } catch (emailError) {
            console.warn(`⚠️ [Edit Shift] Failed to email old staff:`, emailError);
          }
        }

        // 2. Email new staff (confirmation notice)
        if (newStaff?.email) {
          try {
            await NotificationService.notifyShiftConfirmedToStaff({
              staff: newStaff,
              shift: updated,
              client: client,
              agency: agency
            });
            console.log(`✅ [Edit Shift] Confirmation email sent to new staff: ${newStaff.email}`);
          } catch (emailError) {
            console.warn(`⚠️ [Edit Shift] Failed to email new staff:`, emailError);
          }
        }
      }

      return updated;
    },
    onSuccess: async (updatedShift, { id, data, staffReassigned }) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'], exact: false });

      if (data.status || data.assigned_staff_id) {
        queryClient.invalidateQueries({ queryKey: ['bookings'], exact: false });
      }

      if (staffReassigned) {
        toast.success('✅ Shift updated! Emails sent to both staff members for audit trail.');
      } else {
        toast.success('Shift updated');
      }
      setEditingShift(null);
    },
    onError: (error) => {
      console.error('❌ [Update Shift] Error:', error);
      toast.error(error.message);
    }
  });

  const handleCellClick = (shiftId, field, currentValue) => {
    setEditingCell({ shiftId, field });
    setCellEditValue(currentValue || '');
  };

  const handleCellSave = () => {
    if (!editingCell) return;

    updateShiftMutation.mutate({
      id: editingCell.shiftId,
      data: { [editingCell.field]: cellEditValue.trim() }
    });
    setEditingCell(null);
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setCellEditValue('');
  };

  const assignStaffMutation = useMutation({
    mutationFn: async ({ shiftId, staffId, bypassConfirmation = false }) => {
      const shift = shifts.find(s => s.id === shiftId);
      const assignedStaff = staff.find(s => s.id === staffId);
      const client = clients.find(c => c.id === shift.client_id);
      const agency = agencies.find(a => a.id === shift.agency_id);

      if (shift.assigned_staff_id && shift.assigned_staff_id !== staffId) {
        const existingStaff = staff.find(s => s.id === shift.assigned_staff_id);
        const existingStaffName = existingStaff ? `${existingStaff.first_name} ${existingStaff.last_name}` : 'another staff member';

        throw new Error(`⚠️ This shift is already assigned to ${existingStaffName}. Please refresh the page to see current assignments.`);
      }

      const newStatus = bypassConfirmation ? 'confirmed' : 'assigned';

      const { error: shiftError } = await supabase
        .from('shifts')
        .update({
          status: newStatus,
          assigned_staff_id: staffId,
          shift_journey_log: [
            ...(shift.shift_journey_log || []),
            {
              state: newStatus,
              timestamp: new Date().toISOString(),
              staff_id: staffId,
              method: bypassConfirmation ? 'admin_confirmed' : 'admin_assigned',
              notes: bypassConfirmation
                ? 'Admin confirmed shift on behalf of staff'
                : 'Staff assigned - awaiting confirmation'
            }
          ]
        })
        .eq('id', shiftId);

      if (shiftError) throw shiftError;

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          agency_id: shift.agency_id,
          shift_id: shiftId,
          staff_id: staffId,
          client_id: shift.client_id,
          status: bypassConfirmation ? 'confirmed' : 'pending',
          booking_date: new Date().toISOString(),
          shift_date: shift.date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          confirmation_method: bypassConfirmation ? 'admin_bypass' : 'app',
          ...(bypassConfirmation && { confirmed_by_staff_at: new Date().toISOString() })
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      let timesheetId = null;
      try {
        const { data: timesheetResponse, error: timesheetError } = await supabase.functions.invoke('auto-timesheet-creator', {
          body: {
            booking_id: booking.id,
            shift_id: shiftId,
            staff_id: staffId,
            client_id: shift.client_id,
            agency_id: shift.agency_id
          }
        });
        
        if (timesheetError) throw timesheetError;

        if (timesheetResponse.data?.success) {
          timesheetId = timesheetResponse.data.timesheet_id;
        }
      } catch (timesheetError) {
        console.error('❌ Timesheet creation failed:', timesheetError);
      }

      let emailResult = { success: false, queued: false };
      try {
        if (agency) {
          const staffResult = await NotificationService.notifyShiftAssignment({
            staff: assignedStaff,
            shift: shift,
            client: client,
            agency: agency,
            useBatching: true
          });

          emailResult = {
            success: staffResult.success,
            queued: staffResult.queued || false
          };
        }
      } catch (emailError) {
        console.error('❌ Email notification error:', emailError);
      }

      return {
        emailResult,
        timesheetId,
        staffName: `${assignedStaff.first_name} ${assignedStaff.last_name}`,
        newStatus
      };
    },
    onSuccess: ({ emailResult, timesheetId, staffName, newStatus }) => {
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['bookings']);
      queryClient.invalidateQueries(['staff']);
      queryClient.invalidateQueries(['timesheets']);
      queryClient.invalidateQueries(['workflows']);
      queryClient.invalidateQueries(['my-shifts']);
      queryClient.invalidateQueries(['client-shifts']);
      queryClient.invalidateQueries(['my-bookings']);

      setAssigningShift(null);
      setAdminBypassMode(false);

      let message = `✅ ${staffName} ${newStatus === 'confirmed' ? 'confirmed' : 'assigned'}!`;
      if (newStatus === 'confirmed') {
        message += ' Shift confirmed (admin bypass).';
      } else {
        message += ' Awaiting staff confirmation.';
      }
      if (timesheetId) {
        message += ' Draft timesheet created.';
      }
      if (emailResult.queued) {
        message += ' ⏱️ Notification queued (sends in ~5 mins).';
      }

      toast.success(message);
    },
    onError: (error) => {
      console.error('❌ Shift assignment error:', error);
      toast.error(`Failed to assign staff: ${error.message}`);
    }
  });

  const toggleMarketplaceMutation = useMutation({
    mutationFn: async ({ shiftId, visible }) => {
      const { error } = await supabase
        .from('shifts')
        .update({
          marketplace_visible: visible,
          marketplace_added_at: visible ? new Date().toISOString() : null
        })
        .eq('id', shiftId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['marketplace-shifts']);
      queryClient.invalidateQueries(['my-shifts']);
      toast.success('Marketplace visibility updated');
    }
  });

  const broadcastUrgentShift = async (shift) => {
    try {
      console.log('🚨 [Broadcast] Starting urgent shift broadcast for shift:', shift.id);
      
      if (shift.broadcast_sent_at) {
        const sentTime = new Date(shift.broadcast_sent_at);
        const minutesAgo = Math.round((new Date() - sentTime) / (1000 * 60));
        
        const confirmed = window.confirm(
          `⚠️ This shift was already broadcast ${minutesAgo} minutes ago.\n\n` +
          `Sent at: ${sentTime.toLocaleTimeString('en-GB')}\n\n` +
          `Are you sure you want to broadcast again? This will send duplicate SMS/WhatsApp to all eligible staff.`
        );
        
        if (!confirmed) {
          console.log('❌ [Broadcast] User cancelled re-broadcast');
          return;
        }
      }

      setBroadcastingShiftIds(prev => new Set([...prev, shift.id]));

      const client = clients.find(c => c.id === shift.client_id);
      const agency = agencies.find(a => a.id === shift.agency_id);

      console.log(`📋 [Broadcast] Client: ${client?.name}, Agency: ${agency?.name}`);

      const eligibleStaff = staff.filter(s =>
        s.status === 'active' &&
        s.role === shift.role_required &&
        s.agency_id === shift.agency_id
      );

      console.log(`👥 [Broadcast] Found ${eligibleStaff.length} eligible staff members`);

      if (eligibleStaff.length === 0) {
        toast.error(`No eligible ${shift.role_required.replace('_', ' ')} found for this shift.`);
        setBroadcastingShiftIds(prev => {
          const next = new Set(prev);
          next.delete(shift.id);
          return next;
        });
        return;
      }

      const results = await Promise.allSettled(
        eligibleStaff.map(async (staffMember) => {
          console.log(`📤 [Broadcast] Sending to ${staffMember.first_name} (${staffMember.phone})`);
          const result = await NotificationService.notifyUrgentShift({
            staff: staffMember,
            shift: shift,
            client: client,
            agency: agency
          });
          console.log(`📊 [Broadcast] Result for ${staffMember.first_name}:`, result);
          return result;
        })
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
      const failCount = results.length - successCount;

      console.log(`✅ [Broadcast] Complete: ${successCount} successful, ${failCount} failed`);

      const { error } = await supabase
        .from('shifts')
        .update({
          broadcast_sent_at: new Date().toISOString()
        })
        .eq('id', shift.id);
      
      if (error) throw error;

      queryClient.invalidateQueries(['shifts']);

      if (successCount > 0) {
        toast.success(`📢 Broadcast sent to ${successCount} staff! ${failCount > 0 ? `(${failCount} failed)` : ''}`);
      } else {
        toast.error(`Failed to send broadcast to any staff. Check console for details.`);
      }

      setTimeout(() => {
        setBroadcastingShiftIds(prev => {
          const next = new Set(prev);
          next.delete(shift.id);
          return next;
        });
      }, 5000);

    } catch (error) {
      console.error('❌ [Broadcast] Error:', error);
      toast.error(`Broadcast failed: ${error.message}`);

      setBroadcastingShiftIds(prev => {
        const next = new Set(prev);
        next.delete(shift.id);
        return next;
      });
    }
  };

  const completeShiftMutation = useMutation({
    mutationFn: async ({ shiftId, actualData }) => {
      const shift = shifts.find(s => s.id === shiftId);
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('shifts')
        .update({
          status: 'completed',
          admin_closure_outcome: 'completed_as_planned',
          admin_closed_at: new Date().toISOString(),
          admin_closed_by: authUser.id,
          shift_journey_log: [
            ...(shift.shift_journey_log || []),
            {
              state: 'completed',
              timestamp: new Date().toISOString(),
              method: 'admin_closure',
              notes: `Shift completed. Actual times: ${actualData.actual_start_time} - ${actualData.actual_end_time} (${actualData.actual_hours_worked}h)${actualData.completion_notes ? '. ' + actualData.completion_notes : ''}`
            }
          ]
        })
        .eq('id', shiftId);
      
      if (error) throw error;

      if (shift.timesheet_id) {
        const { data: timesheets, error: timesheetFetchError } = await supabase
          .from('timesheets')
          .select('*')
          .eq('id', shift.timesheet_id);
        
        if (timesheetFetchError) throw timesheetFetchError;
        
        if (timesheets && timesheets.length > 0) {
          const timesheet = timesheets[0];
          
          const { error: timesheetUpdateError } = await supabase
            .from('timesheets')
            .update({
              actual_start_time: actualData.actual_start_time,
              actual_end_time: actualData.actual_end_time,
              total_hours: actualData.actual_hours_worked,
              staff_pay_amount: actualData.actual_hours_worked * timesheet.pay_rate,
              client_charge_amount: actualData.actual_hours_worked * timesheet.charge_rate,
              notes: (timesheet.notes || '') + `\n[Admin Completion] ${actualData.completion_notes || 'Shift completed as planned'}`
            })
            .eq('id', shift.timesheet_id);
          
          if (timesheetUpdateError) throw timesheetUpdateError;
        }
      }

      return { shiftId, staffName: getStaffName(shift.assigned_staff_id) };
    },
    onSuccess: ({ staffName }) => {
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['timesheets']);
      queryClient.invalidateQueries(['workflows']);
      setCompletingShift(null);
      toast.success(`✅ Shift marked as completed for ${staffName}`);
    },
    onError: (error) => {
      toast.error('Failed to complete shift: ' + error.message);
    }
  });

  // ✅ NEW: Request timesheet mutation
  const requestTimesheetMutation = useMutation({
    mutationFn: async (shiftId) => {
      console.log('📋 [Request Timesheet] Sending request for shift:', shiftId);
      toast.info('📤 Sending timesheet request...');
      
      const { data, error } = await supabase.functions.invoke('post-shift-timesheet-reminder', {
        body: {
          shift_id: shiftId
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, shiftId) => {
      queryClient.invalidateQueries(['shifts']);
      
      const shift = shifts.find(s => s.id === shiftId);
      const staffName = shift ? getStaffName(shift.assigned_staff_id) : 'staff';
      
      if (data.result) {
        const { whatsapp, email } = data.result;
        const channels = [];
        if (whatsapp?.success) channels.push('WhatsApp');
        if (email?.success) channels.push('Email');
        
        if (channels.length > 0) {
          toast.success(
            `✅ Timesheet request sent to ${staffName}`,
            { description: `Sent via: ${channels.join(' + ')}` }
          );
        } else {
          toast.warning('Request sent but no channels succeeded');
        }
      } else {
        toast.success(`✅ Timesheet request sent to ${staffName}`);
      }
      
      setSendingTimesheetRequest(prev => {
        const next = new Set(prev);
        next.delete(shiftId);
        return next;
      });
    },
    onError: (error, shiftId) => {
      console.error('❌ [Request Timesheet] Error:', error);
      toast.error(`Failed to send request: ${error.message}`);
      
      setSendingTimesheetRequest(prev => {
        const next = new Set(prev);
        next.delete(shiftId);
        return next;
      });
    }
  });

  // ✅ NEW: Handle request timesheet
  const handleRequestTimesheet = (shift) => {
    if (!shift.assigned_staff_id) {
      toast.error('No staff assigned to this shift');
      return;
    }
    
    // Check if shift has ended
    const shiftEndDateTime = new Date(`${shift.date}T${shift.end_time}`);
    if (shiftEndDateTime > new Date()) {
      toast.error('Cannot request timesheet - shift has not ended yet');
      return;
    }
    
    setSendingTimesheetRequest(prev => new Set([...prev, shift.id]));
    requestTimesheetMutation.mutate(shift.id);
  };

  const handleCompleteShift = (shift) => {
    if (!shift.assigned_staff_id) {
      toast.error('Cannot complete shift - no staff assigned');
      return;
    }

    const shiftEndDateTime = new Date(`${shift.date}T${shift.end_time}`);
    if (shiftEndDateTime > new Date()) {
      toast.error('Cannot complete shift - end time has not passed yet');
      return;
    }

    setCompletingShift(shift);
  };

  const handleConfirmCompletion = (actualData) => {
    completeShiftMutation.mutate({
      shiftId: completingShift.id,
      actualData
    });
  };

  const handleAssignStaff = (staffId) => {
    if (assignStaffMutation.isPending) {
      return;
    }

    assignStaffMutation.mutate({
      shiftId: assigningShift.id,
      staffId,
      bypassConfirmation: adminBypassMode
    });
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);

    // Check if shift is past-dated (can edit actual times)
    const shiftDate = new Date(shift.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPastShift = shiftDate < today;

    setEditFormData({
      status: shift.status || 'open',
      notes: shift.notes || '',
      // Actual times (only for past shifts)
      actual_start_time: shift.shift_started_at ? formatTime(shift.shift_started_at) : formatTime(shift.start_time),
      actual_end_time: shift.shift_ended_at ? formatTime(shift.shift_ended_at) : formatTime(shift.end_time),
      // Who actually worked the shift
      actual_staff_id: shift.actual_staff_id || shift.assigned_staff_id || null,
      assigned_staff_id: shift.assigned_staff_id || null
    });
  };

  const handleSaveShiftEdit = async () => {
    if (updateShiftMutation.isPending) {
      return;
    }

    // Check if shift is past-dated
    const shiftDate = new Date(editingShift.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPastShift = shiftDate < today;

    // Validate actual_staff_id (check for conflicts if past shift)
    if (isPastShift && editFormData.actual_staff_id && editFormData.actual_staff_id !== 'none') {
      const { data: conflictingShifts } = await supabase
        .from('shifts')
        .select('id, start_time, end_time, client_id, clients(name)')
        .eq('actual_staff_id', editFormData.actual_staff_id)
        .eq('date', editingShift.date)
        .neq('id', editingShift.id)
        .in('status', ['completed', 'in_progress']);

      if (conflictingShifts && conflictingShifts.length > 0) {
        const conflict = conflictingShifts[0];
        const staffMember = staff.find(s => s.id === editFormData.actual_staff_id);
        const staffName = staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Staff';

        toast.error(
          `⚠️ ${staffName} already worked at ${conflict.clients?.name || 'another client'} on ${editingShift.date} (${formatTime(conflict.start_time)} - ${formatTime(conflict.end_time)}). Staff cannot work in two places at the same time.`
        );
        return;
      }
    }

    const updates = {
      status: editFormData.status,
      notes: editFormData.notes
    };

    // Add actual times if shift is past-dated
    if (isPastShift && editFormData.actual_start_time && editFormData.actual_end_time) {
      updates.shift_started_at = `${editingShift.date}T${editFormData.actual_start_time}:00`;
      updates.shift_ended_at = `${editingShift.date}T${editFormData.actual_end_time}:00`;

      // Calculate actual hours
      const [startH, startM] = editFormData.actual_start_time.split(':').map(Number);
      const [endH, endM] = editFormData.actual_end_time.split(':').map(Number);
      let startMinutes = startH * 60 + startM;
      let endMinutes = endH * 60 + endM;
      if (endMinutes <= startMinutes) endMinutes += 24 * 60; // Handle overnight
      const actualHours = (endMinutes - startMinutes) / 60;

      // Warn if >15min difference from scheduled
      const scheduledHours = editingShift.duration_hours || 0;
      const hoursDiff = Math.abs(actualHours - scheduledHours);
      if (hoursDiff > 0.25) { // 15 minutes
        const proceed = window.confirm(
          `⚠️ Actual hours (${actualHours.toFixed(2)}h) differ from scheduled hours (${scheduledHours}h) by ${hoursDiff.toFixed(2)}h.\n\nThis will affect payroll and billing. Continue?`
        );
        if (!proceed) {
          return;
        }
      }
    }

    // ✅ AUDIT TRAIL: Detect staff reassignment and send emails
    let staffReassigned = false;
    let oldStaffId = null;
    let newStaffId = null;

    if (isPastShift) {
      const oldActualStaffId = editingShift.actual_staff_id || editingShift.assigned_staff_id;
      const newActualStaffId = editFormData.actual_staff_id === 'none' ? null : editFormData.actual_staff_id;

      if (oldActualStaffId && newActualStaffId && oldActualStaffId !== newActualStaffId) {
        staffReassigned = true;
        oldStaffId = oldActualStaffId;
        newStaffId = newActualStaffId;
      }

      updates.actual_staff_id = newActualStaffId;
    }

    updateShiftMutation.mutate({
      id: editingShift.id,
      data: updates,
      staffReassigned,
      oldStaffId,
      newStaffId
    });
  };

  const exportToCSV = () => {
    const csvData = filteredShifts.map(shift => {
      const clientName = clientMap[shift.client_id] || 'Unknown';
      const staffName = shift.assigned_staff_id ? (staffMap[shift.assigned_staff_id] || 'Unknown') : 'Unassigned';
      const staffMember = staff.find(s => s.id === shift.assigned_staff_id);

      const payRate = shift.pay_rate_override?.override_rate || shift.pay_rate || 0;
      const chargeRate = shift.charge_rate || 0;
      const durationHours = shift.duration_hours || 0;

      let formattedShiftDate = 'N/A';
      try {
        if (shift.date) {
          const shiftDateObj = new Date(shift.date);
          if (!isNaN(shiftDateObj.getTime())) {
            formattedShiftDate = format(shiftDateObj, 'yyyy-MM-dd');
          }
        }
      } catch (error) { /* ignore */ }

      let formattedCreatedDate = 'N/A';
      try {
        if (shift.created_date) {
          const createdDateObj = new Date(shift.created_date);
          if (!isNaN(createdDateObj.getTime())) {
            formattedCreatedDate = format(createdDateObj, 'yyyy-MM-dd');
          }
        }
      } catch (error) { /* ignore */ }

      return {
        'Shift ID': shift.id?.substring(0, 8).toUpperCase() || 'N/A',
        'Date': formattedShiftDate,
        'Start Time': shift.start_time || '',
        'End Time': shift.end_time || '',
        'Duration (hours)': durationHours,
        'Client': clientName,
        'Location': shift.work_location_within_site || 'Not specified',
        'Role Required': shift.role_required?.replace(/_/g, ' ') || '',
        'Status': shift.status?.replace(/_/g, ' ') || '',
        'Urgency': shift.urgency || 'normal',
        'Assigned Staff': staffName,
        'Staff Phone': staffMember?.phone || '',
        'Pay Rate (£/hr)': payRate.toFixed(2),
        'Charge Rate (£/hr)': chargeRate.toFixed(2),
        'Staff Cost (£)': (durationHours * payRate).toFixed(2),
        'Client Charge (£)': (durationHours * chargeRate).toFixed(2),
        'Break (mins)': shift.break_duration_minutes || 0,
        'Notes': shift.notes || '',
        'Created Date': formattedCreatedDate,
        'Marketplace Visible': shift.marketplace_visible ? 'Yes' : 'No'
      };
    });

    if (csvData.length === 0) {
      toast.info('No shifts to export with current filters.');
      return;
    }

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.map(header => `"${header}"`).join(','),
      ...csvData.map(row =>
        headers.map(header => {
          let value = row[header];
          if (value === null || value === undefined) {
              value = '';
          }
          if (typeof value === 'string') {
              if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                  return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shifts_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`✅ Exported ${csvData.length} shifts to CSV`);
  };

  const filteredShifts = useMemo(() => {
    if (!shifts || shifts.length === 0) return [];

    return shifts.filter(shift => {
      if (!shift || !shift.id || !shift.date) return false;

      const statusMatch = statusFilter === 'all' || shift.status === statusFilter;
      const clientMatch = clientFilter === 'all' || shift.client_id === clientFilter;

      return statusMatch && clientMatch;
    });
  }, [shifts, statusFilter, clientFilter]);

  const filterCounts = useMemo(() => {
    return {
      all: shifts.length,
      open: shifts.filter(s => s.status === 'open').length,
      assigned: shifts.filter(s => s.status === 'assigned').length,
      confirmed: shifts.filter(s => s.status === 'confirmed').length,
      in_progress: shifts.filter(s => s.status === 'in_progress').length,
      awaiting_admin_closure: shifts.filter(s => s.status === 'awaiting_admin_closure').length,
      completed: shifts.filter(s => s.status === 'completed').length,
      cancelled: shifts.filter(s => s.status === 'cancelled').length,
      no_show: shifts.filter(s => s.status === 'no_show').length,
      disputed: shifts.filter(s => s.status === 'disputed').length
    };
  }, [shifts]);

  const getClientName = (clientId) => {
    if (!clientId) return 'No Client Assigned';
    return clientMap[clientId] || `⚠️ Client Deleted (${clientId.substring(0, 8)})`;
  };

  const getStaffName = (staffId) => {
    if (!staffId) return null;
    return staffMap[staffId] || 'Unknown Staff';
  };

  const getStatusBadge = (status) => {
    const variants = {
      open: { className: 'bg-red-100 text-red-800' },
      assigned: { className: 'bg-blue-100 text-blue-800' },
      confirmed: { className: 'bg-green-100 text-green-800' },
      in_progress: { className: 'bg-yellow-100 text-yellow-800' },
      awaiting_admin_closure: { className: 'bg-orange-100 text-orange-800' },
      completed: { className: 'bg-green-200 text-green-800' },
      cancelled: { className: 'bg-gray-100 text-gray-600' },
      no_show: { className: 'bg-red-200 text-red-900' },
      disputed: { className: 'bg-purple-100 text-purple-800' }
    };
    return variants[status] || { className: 'bg-gray-100 text-gray-800' };
  };

  const getUrgencyBadge = (urgency) => {
    const variants = {
      normal: { variant: 'outline', className: 'text-gray-600' },
      urgent: { className: 'bg-red-600 text-white animate-pulse' },
      critical: { className: 'bg-red-700 text-white animate-pulse' }
    };
    return variants[urgency] || variants.normal;
  };

  // ✅ NEW: Helper to check if shift can have timesheet requested
  const canRequestTimesheet = (shift) => {
    if (!shift.assigned_staff_id) return false;
    
    const shiftEndDateTime = new Date(`${shift.date}T${shift.end_time}`);
    const hasEnded = shiftEndDateTime <= new Date();
    
    // Can request if: shift ended, in awaiting_admin_closure, in_progress or confirmed status, and no timesheet received yet
    return hasEnded && 
           (shift.status === 'awaiting_admin_closure' || shift.status === 'in_progress' || shift.status === 'confirmed') &&
           !shift.timesheet_received;
  };

  if (userLoading || shiftsLoading || clientsLoading || staffLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-cyan-600 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Loading Shifts...</h3>
          <p className="text-gray-600">Fetching shift data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shift Management</h2>
          <p className="text-gray-600 mt-1">
            {filteredShifts.length} shifts shown
          </p>
          {currentAgency && agencies.length > 0 && (
            <Badge className="mt-2 bg-purple-100 text-purple-800">
              {agencies.find(a => a.id === currentAgency)?.name || 'Your Agency'}
            </Badge>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={filteredShifts.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Link to={createPageUrl('PostShiftV2')}>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Create Shift
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span className="capitalize">
                        {dateRange === 'month' ? 'This Month' :
                         dateRange === 'upcoming' ? 'Next 30 Days' :
                         dateRange === 'last30' ? 'Last 30 Days' :
                         dateRange === 'last90' ? 'Last 3 Months' :
                         dateRange.replace('_', ' ')}
                      </span>
                    </div>
                    <Badge className="ml-2">{shifts.length}</Badge>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="start">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Date Range</h4>
                    <div className="space-y-2">
                      <Button
                        variant={dateRange === 'today' ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setDateRange('today')}
                      >
                        Today
                      </Button>
                      <Button
                        variant={dateRange === 'week' ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setDateRange('week')}
                      >
                        This Week
                      </Button>
                      <Button
                        variant={dateRange === 'month' ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setDateRange('month')}
                      >
                        📅 This Month (Billing Period)
                      </Button>
                      <Button
                        variant={dateRange === 'upcoming' ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setDateRange('upcoming')}
                      >
                        Next 30 Days
                      </Button>
                      <Button
                        variant={dateRange === 'last30' ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setDateRange('last30')}
                      >
                        Last 30 Days
                      </Button>
                      <Button
                        variant={dateRange === 'last90' ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setDateRange('last90')}
                      >
                        Last 3 Months (Max History)
                      </Button>
                      <Button
                        variant={dateRange === 'all' ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setDateRange('all')}
                      >
                        ⚠️ All Shifts (Slow)
                      </Button>

                      <div className="pt-2 border-t">
                        <p className="text-xs font-semibold mb-2">Custom Range</p>
                        <div className="space-y-2">
                          <Input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="text-xs"
                          />
                          <Input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="text-xs"
                          />
                          <Button
                            size="sm"
                            className="w-full"
                            disabled={!customStartDate || !customEndDate}
                            onClick={() => setDateRange('custom')}
                          >
                            Apply Custom Range
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <SelectValue placeholder="All Care Homes" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <strong>All Care Homes</strong> ({shifts.length})
                  </SelectItem>
                  {clients.map(client => {
                    const clientShiftCount = shifts.filter(s => s.client_id === client.id).length;
                    return (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} ({clientShiftCount})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2 overflow-x-auto pb-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className={statusFilter === 'all' ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : ''}
                >
                  All ({filterCounts.all})
                </Button>
                <Button
                  variant={statusFilter === 'open' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('open')}
                  className={statusFilter === 'open' ? 'bg-red-600 text-white' : ''}
                >
                  Open ({filterCounts.open})
                </Button>
                <Button
                  variant={statusFilter === 'assigned' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('assigned')}
                  className={statusFilter === 'assigned' ? 'bg-blue-600 text-white' : ''}
                >
                  Assigned ({filterCounts.assigned})
                </Button>
                <Button
                  variant={statusFilter === 'confirmed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('confirmed')}
                  className={statusFilter === 'confirmed' ? 'bg-green-600 text-white' : ''}
                >
                  Confirmed ({filterCounts.confirmed})
                </Button>
                <Button
                  variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('in_progress')}
                  className={statusFilter === 'in_progress' ? 'bg-yellow-600 text-white' : ''}
                >
                  In Progress ({filterCounts.in_progress})
                </Button>
              </div>

              <div className="flex gap-2 overflow-x-auto">
                <Button
                  variant={statusFilter === 'awaiting_admin_closure' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('awaiting_admin_closure')}
                  className={statusFilter === 'awaiting_admin_closure' ? 'bg-orange-600 text-white' : ''}
                >
                  Awaiting Closure ({filterCounts.awaiting_admin_closure})
                </Button>
                <Button
                  variant={statusFilter === 'completed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('completed')}
                  className={statusFilter === 'completed' ? 'bg-green-700 text-white' : ''}
                >
                  ✅ Completed ({filterCounts.completed})
                </Button>
                <Button
                  variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('cancelled')}
                  className={statusFilter === 'cancelled' ? 'bg-gray-600 text-white' : ''}
                >
                  Cancelled ({filterCounts.cancelled})
                </Button>
                <Button
                  variant={statusFilter === 'no_show' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('no_show')}
                  className={statusFilter === 'no_show' ? 'bg-red-700 text-white' : ''}
                >
                  No Show ({filterCounts.no_show})
                </Button>
                <Button
                  variant={statusFilter === 'disputed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('disputed')}
                  className={statusFilter === 'disputed' ? 'bg-purple-600 text-white' : ''}
                >
                  Disputed ({filterCounts.disputed})
                </Button>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="w-4 h-4 mr-2" />
                Table
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredShifts.length === 0 && !shiftsLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Shifts Found</h3>
            <p className="text-gray-600 mb-6">
              No shifts match your current filters. Try adjusting the date range or filters.
            </p>
            <Link to={createPageUrl('PostShiftV2')}>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Shift
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Time</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Staff</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Urgency</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredShifts.map(shift => {
                    const client = clients.find(c => c.id === shift.client_id);
                    const assignedStaff = staff.find(s => s.id === shift.assigned_staff_id);
                    const statusBadge = getStatusBadge(shift.status);
                    const urgencyBadge = getUrgencyBadge(shift.urgency);

                    let formattedDate = 'Invalid Date';
                    try {
                      if (shift.date) {
                        const shiftDate = new Date(shift.date);
                        if (!isNaN(shiftDate.getTime())) {
                          formattedDate = format(shiftDate, 'EEE, MMM d');
                        }
                      }
                    } catch (error) {
                      console.error('Date formatting error in table:', shift.date, error);
                    }

                    const isBroadcasting = broadcastingShiftIds.has(shift.id);
                    const isEditingLocation = editingCell?.shiftId === shift.id && editingCell?.field === 'work_location_within_site';
                    const canRequest = canRequestTimesheet(shift);
                    const isSendingRequest = sendingTimesheetRequest.has(shift.id);

                    return (
                      <tr key={shift.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {formattedDate}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {client?.name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isEditingLocation ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={cellEditValue}
                                onChange={(e) => setCellEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCellSave();
                                  if (e.key === 'Escape') handleCellCancel();
                                }}
                                className="h-8 text-xs"
                                placeholder="e.g., Room 14"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={handleCellSave}
                                className="h-8 px-2 bg-green-600"
                                disabled={updateShiftMutation.isPending}
                              >
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCellCancel}
                                className="h-8 px-2"
                              >
                                <XIcon className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleCellClick(shift.id, 'work_location_within_site', shift.work_location_within_site)}
                              className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                            >
                              {shift.work_location_within_site ? (
                                <Badge className="bg-cyan-100 text-cyan-800 text-xs">
                                  📍 {shift.work_location_within_site}
                                </Badge>
                              ) : (
                                <span className="text-xs text-gray-400 italic">-</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800 capitalize">
                          {shift.role_required?.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800">
                          {shift.start_time} - {shift.end_time} ({shift.duration_hours}h)
                        </td>
                        <td className="px-4 py-3">
                          {assignedStaff ? (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              {assignedStaff.first_name} {assignedStaff.last_name}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500 text-xs">
                              Unassigned
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge {...statusBadge}>
                            {shift.status?.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                           {shift.urgency && shift.urgency !== 'normal' ? (
                             <Badge {...urgencyBadge}>
                               {shift.urgency?.toUpperCase()}
                             </Badge>
                           ) : (
                            <Badge variant="outline" className="text-gray-500 text-xs">
                              Normal
                            </Badge>
                           )}
                        </td>
                        <td className="px-4 py-3 text-right">
                           <div className="flex justify-end gap-1">
                               <Button
                                 size="sm"
                                 variant="ghost"
                                 className="h-8 w-8 p-0"
                                 onClick={() => handleEditShift(shift)}
                                 title="Edit Shift"
                               >
                                 <Edit2 className="w-4 h-4 text-blue-600" />
                               </Button>
                               {shift.status === 'open' && (
                                 <>
                                   <Button
                                     size="sm"
                                     variant="ghost"
                                     className="h-8 w-8 p-0"
                                     onClick={() => setAssigningShift(shift)}
                                     title="Assign Staff"
                                   >
                                     <UserPlus className="w-4 h-4 text-green-600" />
                                   </Button>
                                   {(shift.urgency === 'urgent' || shift.urgency === 'critical') && (
                                     <Button
                                       size="sm"
                                       variant="ghost"
                                       className="h-8 w-8 p-0"
                                       onClick={() => broadcastUrgentShift(shift)}
                                       disabled={isBroadcasting}
                                       title="Broadcast Urgent Shift"
                                     >
                                       {isBroadcasting ? (
                                         <RefreshCw className="w-4 h-4 text-green-600 animate-spin" />
                                       ) : (
                                         <Zap className="w-4 h-4 text-red-600" />
                                       )}
                                     </Button>
                                   )}
                                 </>
                               )}
                               {shift.status === 'awaiting_admin_closure' && (
                                 <Button
                                   size="sm"
                                   variant="ghost"
                                   className="h-8 px-2"
                                   onClick={() => handleCompleteShift(shift)}
                                   title="Mark as Completed"
                                 >
                                   <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                                   <span className="text-xs">Complete</span>
                                 </Button>
                               )}
                               {/* ✅ NEW: Request Timesheet button */}
                               {canRequest && (
                                 <Button
                                   size="sm"
                                   variant="ghost"
                                   className="h-8 px-2"
                                   onClick={() => handleRequestTimesheet(shift)}
                                   disabled={isSendingRequest}
                                   title="Request Timesheet Upload"
                                 >
                                   {isSendingRequest ? (
                                     <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                   ) : (
                                     <>
                                       <Mail className="w-4 h-4 text-blue-600 mr-1" />
                                       <span className="text-xs">Request</span>
                                     </>
                                   )}
                                 </Button>
                               )}
                             </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredShifts.map(shift => {
            const isBroadcasting = broadcastingShiftIds.has(shift.id);
            const alreadyBroadcast = !!shift.broadcast_sent_at;
            const clientName = getClientName(shift.client_id);
            const isOrphaned = clientName.includes('Client Deleted');
            const statusBadge = getStatusBadge(shift.status);
            const urgencyBadge = getUrgencyBadge(shift.urgency);
            const client = clients.find(c => c.id === shift.client_id);
            const canRequest = canRequestTimesheet(shift);
            const isSendingRequest = sendingTimesheetRequest.has(shift.id);

            let formattedDate = 'Invalid Date';
            try {
              if (shift.date) {
                const shiftDate = new Date(shift.date);
                if (!isNaN(shiftDate.getTime())) {
                  formattedDate = format(shiftDate, 'EEE, MMM d, yyyy');
                }
              }
            } catch (error) {
              console.error('Date formatting error:', shift.date, error);
            }

            return (
              <Card key={shift.id} className={`hover:shadow-lg transition-shadow ${isOrphaned ? 'border-red-300 border-2' : ''}`}>
                <CardContent className="p-6">
                  {isOrphaned && (
                    <Alert className="mb-4 border-red-300 bg-red-50">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <AlertDescription className="text-red-900">
                        <strong>⚠️ ORPHANED SHIFT:</strong> Client was deleted. Click "Edit Shift" to reassign.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Badge {...statusBadge}>
                        {shift.status?.replace('_', ' ')}
                      </Badge>
                      {shift.urgency !== 'normal' && (
                        <Badge {...urgencyBadge} className="ml-2">
                          {(shift.urgency === 'urgent' || shift.urgency === 'critical') && <AlertCircle className="w-3 h-3 mr-1" />}
                          {shift.urgency?.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <Badge variant="outline" className="capitalize">
                          {shift.role_required?.replace('_', ' ')}
                        </Badge>
                        {shift.marketplace_visible && (
                          <Badge className="bg-purple-100 text-purple-800">
                            📢 In Marketplace
                          </Badge>
                        )}
                        {shift.pay_rate_override && (
                          <Badge className="bg-amber-100 text-amber-800">
                            💰 Rate Override
                          </Badge>
                        )}
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="font-medium">{getClientName(shift.client_id)}</span>
                            {shift.work_location_within_site && (
                              <span className="ml-2 text-cyan-600 font-semibold">
                                → {shift.work_location_within_site}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{formatTime(shift.start_time)} - {formatTime(shift.end_time)} ({shift.duration_hours}h)</span>
                        </div>
                      </div>

                      {shift.assigned_staff_id && (
                        <div className="mt-2 text-sm text-cyan-600 font-medium">
                          ✓ Assigned to {getStaffName(shift.assigned_staff_id)}
                        </div>
                      )}

                      {client && currentUser?.role === 'agency_owner' && (
                        <div className="mt-3">
                          <ShiftRateDisplay shift={shift} client={client} compact={false} />
                        </div>
                      )}

                      {shift.pay_rate_override && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                          <p className="text-amber-900">
                            <strong>Override:</strong> £{shift.pay_rate_override.original_rate} → £{shift.pay_rate_override.override_rate}/hr
                          </p>
                          <p className="text-amber-800">Reason: {shift.pay_rate_override.reason_notes || shift.pay_rate_override.reason}</p>
                        </div>
                      )}

                      {shift.notes && (
                        <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-3 rounded">
                          {shift.notes}
                        </p>
                      )}

                      {shift.status === 'open' && (
                        <div className="flex items-center gap-2 mt-3 p-3 bg-purple-50 rounded border border-purple-200">
                          <Switch
                            checked={shift.marketplace_visible || false}
                            onCheckedChange={(checked) =>
                              toggleMarketplaceMutation.mutate({ shiftId: shift.id, visible: checked })
                            }
                          />
                          <Label className="text-sm text-purple-900 font-medium cursor-pointer">
                            {shift.marketplace_visible ? '📢 Visible in Marketplace' : 'Show in Marketplace'}
                          </Label>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 min-w-[150px]">
                      {shift.status === 'open' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => setAssigningShift(shift)}
                            className="bg-gradient-to-r from-cyan-500 to-blue-600"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Assign Staff
                          </Button>
                          {(shift.urgency === 'urgent' || shift.urgency === 'critical') && (
                            <Button
                              size="sm"
                              onClick={() => broadcastUrgentShift(shift)}
                              disabled={isBroadcasting}
                              className={
                                isBroadcasting ? "bg-green-600" : 
                                alreadyBroadcast ? "bg-orange-600 hover:bg-orange-700" : 
                                "bg-red-600 hover:bg-red-700"
                              }
                            >
                              {isBroadcasting ? (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                  Sending...
                                </>
                              ) : alreadyBroadcast ? (
                                <>
                                  <Zap className="w-4 h-4 mr-2" />
                                  Broadcast Again
                                </>
                              ) : (
                                <>
                                  <Zap className="w-4 h-4 mr-2" />
                                  Broadcast Alert
                                </>
                              )}
                            </Button>
                          )}
                        </>
                      )}
                      {shift.status === 'assigned' && (
                        <div className="text-center py-2 bg-blue-50 rounded text-blue-700 text-sm font-medium">
                          ⏳ Awaiting Confirmation
                        </div>
                      )}
                      {shift.status === 'awaiting_admin_closure' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleCompleteShift(shift)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Complete Shift
                        </Button>
                      )}
                      {/* ✅ NEW: Request Timesheet button */}
                      {canRequest && (
                        <Button
                          size="sm"
                          onClick={() => handleRequestTimesheet(shift)}
                          disabled={isSendingRequest}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isSendingRequest ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4 mr-2" />
                              Request Timesheet
                            </>
                          )}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleEditShift(shift)}>
                        Edit Shift
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {assigningShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b sticky top-0 bg-white z-10">
              <CardTitle>Assign Staff to Shift</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {format(new Date(assigningShift.date), 'EEEE, MMMM d, yyyy')} • {assigningShift.start_time} - {assigningShift.end_time}
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="admin-bypass"
                    checked={adminBypassMode}
                    onChange={(e) => setAdminBypassMode(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="admin-bypass" className="font-semibold text-blue-900 cursor-pointer">
                      ⚡ Admin Bypass: Mark as "Confirmed" Immediately
                    </label>
                    <p className="text-sm text-blue-700 mt-1">
                      {adminBypassMode ? (
                        <>
                          <strong>Enabled:</strong> Shift will be marked as "confirmed" (no staff confirmation needed).
                          Use when you've spoken to staff by phone and they've verbally agreed.
                        </>
                      ) : (
                        <>
                          <strong>Disabled:</strong> Shift will be marked as "assigned" - staff must confirm via portal/SMS.
                          Recommended for accountability.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {staff
                  .filter(s => s.status === 'active' && s.role === assigningShift.role_required)
                  .map(staffMember => (
                    <div
                      key={staffMember.id}
                      onClick={() => handleAssignStaff(staffMember.id)}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-cyan-500 hover:bg-cyan-50 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {staffMember.first_name} {staffMember.last_name}
                          </p>
                          <p className="text-sm text-gray-600 capitalize">
                            {staffMember.role?.replace('_', ' ')}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          Available
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAssigningShift(null);
                    setAdminBypassMode(false);
                  }}
                  className="flex-1"
                  disabled={assignStaffMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {editingShift && (
        <Dialog open={!!editingShift} onOpenChange={() => setEditingShift(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Shift</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* READ-ONLY SHIFT DETAILS */}
              {editingShift && (() => {
                let formattedDate = 'Invalid Date';
                let isPastShift = false;
                try {
                  if (editingShift.date) {
                    const shiftDate = new Date(editingShift.date);
                    if (!isNaN(shiftDate.getTime())) {
                      formattedDate = format(shiftDate, 'EEE, MMM d, yyyy');
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      isPastShift = shiftDate < today;
                    }
                  }
                } catch (error) {
                  console.error('Date formatting error in modal:', editingShift.date, error);
                }

                const clientName = clients.find(c => c.id === editingShift.client_id)?.name || 'Unknown';

                return (
                  <>
                    <div className="p-4 bg-gray-50 rounded space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-600">Date:</span>
                          <p className="font-semibold">{formattedDate}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Care Home:</span>
                          <p className="font-semibold">{clientName}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-600">Scheduled Time:</span>
                          <p className="font-semibold">{formatTime(editingShift.start_time)} - {formatTime(editingShift.end_time)} ({editingShift.duration_hours}h)</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Role Required:</span>
                          <p className="font-semibold">{editingShift.role_required?.replace('_', ' ')}</p>
                        </div>
                      </div>
                      {editingShift.assigned_staff_id && (
                        <div>
                          <span className="text-gray-600">Currently Assigned:</span>
                          <p className="font-semibold">
                            {(() => {
                              const assignedStaff = staff.find(s => s.id === editingShift.assigned_staff_id);
                              return assignedStaff ? `${assignedStaff.first_name} ${assignedStaff.last_name} - ${assignedStaff.role}` : 'Unknown';
                            })()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* EDITABLE: SHIFT STATUS */}
                    <div>
                      <Label htmlFor="edit-status">Shift Status</Label>
                      <Select
                        value={editFormData.status}
                        onValueChange={(value) => setEditFormData({...editFormData, status: value})}
                      >
                        <SelectTrigger id="edit-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="assigned">Assigned</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="awaiting_admin_closure">Awaiting Admin Closure</SelectItem>
                          <SelectItem value="completed">✅ Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="no_show">No Show</SelectItem>
                          <SelectItem value="disputed">Disputed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* EDITABLE: ACTUAL TIMES (Post-Shift Only) */}
                    {isPastShift && (
                      <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded">
                        <div className="flex items-center gap-2 text-blue-900 font-semibold">
                          <Clock className="w-4 h-4" />
                          <span>Actual Times (Post-Shift)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="actual-start" className="text-xs">Actual Start Time</Label>
                            <Input
                              id="actual-start"
                              type="time"
                              value={editFormData.actual_start_time || ''}
                              onChange={(e) => setEditFormData({...editFormData, actual_start_time: e.target.value})}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="actual-end" className="text-xs">Actual End Time</Label>
                            <Input
                              id="actual-end"
                              type="time"
                              value={editFormData.actual_end_time || ''}
                              onChange={(e) => setEditFormData({...editFormData, actual_end_time: e.target.value})}
                              className="text-sm"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-blue-700">
                          💡 Enter actual times worked for accurate payroll and billing
                        </p>
                      </div>
                    )}

                    {/* EDITABLE: WHO ACTUALLY DID THE SHIFT (Post-Shift Only) */}
                    {isPastShift && (
                      <div className="space-y-2">
                        <Label htmlFor="actual-staff">Who Actually Worked This Shift?</Label>
                        <Select
                          value={editFormData.actual_staff_id || editFormData.assigned_staff_id || 'none'}
                          onValueChange={(value) => setEditFormData({
                            ...editFormData,
                            actual_staff_id: value === 'none' ? null : value
                          })}
                        >
                          <SelectTrigger id="actual-staff">
                            <SelectValue placeholder="Select staff who worked..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No one worked (No Show)</SelectItem>
                            {staff.filter(s => s.role === editingShift.role_required).map(staffMember => (
                              <SelectItem key={staffMember.id} value={staffMember.id}>
                                {staffMember.first_name} {staffMember.last_name} - {staffMember.role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-600">
                          ⚠️ Only showing staff with matching role: {editingShift.role_required?.replace('_', ' ')}
                        </p>
                      </div>
                    )}

                    {/* EDITABLE: NOTES */}
                    <div>
                      <Label htmlFor="edit-notes">Admin Notes (Optional)</Label>
                      <Textarea
                        id="edit-notes"
                        value={editFormData.notes || ''}
                        onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                        placeholder="Add any notes about this shift..."
                        rows={3}
                      />
                    </div>
                  </>
                );
              })()}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingShift(null)}
                disabled={updateShiftMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveShiftEdit}
                disabled={updateShiftMutation.isPending}
              >
                {updateShiftMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {completingShift && (
        <ShiftCompletionModal
          isOpen={!!completingShift}
          onClose={() => setCompletingShift(null)}
          shift={completingShift}
          staffName={getStaffName(completingShift.assigned_staff_id)}
          clientName={getClientName(completingShift.client_id)}
          onConfirm={handleConfirmCompletion}
          isLoading={completeShiftMutation.isPending}
        />
      )}
    </div>
  );
}
