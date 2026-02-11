
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Clock, Download, Filter, Search, TrendingUp, Calendar, DollarSign,
  Upload, Eye, FileText, AlertTriangle, CheckCircle, LayoutGrid, List, Zap,
  AlertCircle, ShieldCheck, ShieldX, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { validateShiftEligibility } from "../api/functions";
import TimesheetCard from "../components/timesheets/TimesheetCard";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import AutoApprovalIndicator from "../components/timesheets/AutoApprovalIndicator";
import TimesheetUploader from "../components/timesheets/TimesheetUploader";

export default function Timesheets() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const shiftIdParam = queryParams.get('shiftId');

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState(shiftIdParam || '');
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // NEW: Card or Table view

  // OCR Modal state (for advanced timesheet upload with AI extraction)
  // These states are now managed within TimesheetUploader component
  // const [showConfirmModal, setShowConfirmModal] = useState(false);
  // const [pendingOcrData, setPendingOcrData] = useState(null);
  // const [pendingDocument, setPendingDocument] = useState(null);
  // const [pendingFile, setPendingFile] = useState(null);
  // const [pendingTimesheetId, setPendingTimesheetId] = useState(null);
  // const [confirming, setConfirming] = useState(false);
  // const [rejecting, setRejecting] = useState(false);
  const [processingTimesheets, setProcessingTimesheets] = useState({
    approving: new Set(),
    rejecting: new Set()
  });

  // Retrospective Creation State
  const [retrospectiveState, setRetrospectiveState] = useState({
    isValidating: false,
    isCreating: false,
    validationResult: null, // { success, issues: [] }
    showBanner: true
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50); // 50 timesheets per page
  const [totalCount, setTotalCount] = useState(0);

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        navigate(createPageUrl('Home'));
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError || !profile) {
        navigate(createPageUrl('Home'));
        return;
      }


      setUser(profile);
    };
    fetchUser();
  }, []);

  const isAdmin = user?.user_type === 'agency_admin' || user?.user_type === 'manager';
  const isStaff = user?.user_type === 'staff_member';

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets', user?.agency_id, user?.id, isStaff, currentPage, pageSize],
    queryFn: async () => {
      if (!user) return [];

      // Calculate range for pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('timesheets')
        .select('*', { count: 'exact' })
        .order('created_date', { ascending: true })
        .range(from, to);

      if (isStaff) {
        const { data: staffRecords, error } = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('❌ Error fetching staff record for current user:', error);
          return [];
        }

        if (staffRecords) {
          query = query.eq('staff_id', staffRecords.id);
        } else {
          // No staff record found for this user, they have no timesheets
          return [];
        }

      } else if (isAdmin && user.agency_id) {
        query = query.eq('agency_id', user.agency_id);
      } else {
        // User is not staff or admin in an agency, return empty
        return [];
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching timesheets:', error);
        return [];
      }

      // Update total count for pagination controls
      if (count !== null) {
        setTotalCount(count);
      }

      return data || [];
    },
    enabled: !!user,
    refetchOnMount: 'always'
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', user?.agency_id],
    queryFn: async () => {
      if (!user?.agency_id) return [];
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('agency_id', user.agency_id)
        .order('first_name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user, // ✅ FIX: Fetch for both staff and admin users
    refetchOnMount: 'always'
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.agency_id],
    queryFn: async () => {
      if (!user?.agency_id) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('agency_id', user.agency_id)
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user, // ✅ FIX: Fetch for both staff and admin users
    refetchOnMount: 'always'
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', user?.agency_id],
    queryFn: async () => {
      if (!user?.agency_id) return [];
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('agency_id', user.agency_id)
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user, // ✅ FIX: Fetch for both staff and admin users
    refetchOnMount: 'always'
  });

  // ✅ ENHANCED: Update mutation with financial lock protection
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // 🔒 VALIDATION: Check if timesheet is financially locked
      const { data: timesheetsToValidate, error: validateError } = await supabase
        .from('timesheets')
        .select('*')
        .eq('id', id);

      if (validateError) throw validateError;

      const timesheetToEdit = timesheetsToValidate?.[0];

      if (timesheetToEdit?.financial_locked) {
        const financialFields = ['total_hours', 'pay_rate', 'charge_rate', 'staff_pay_amount', 'client_charge_amount'];
        const attemptingFinancialChange = Object.keys(data).some(
          field => financialFields.includes(field)
        );

        if (attemptingFinancialChange) {
          throw new Error('🔒 BLOCKED: This timesheet is financially locked (already invoiced). Cannot modify hours or rates. Create an invoice amendment instead.');
        }
      }

      const { data: updated, error } = await supabase
        .from('timesheets')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['timesheets']);
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['payslips']);
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['workflows']);
      toast.success('Timesheet updated');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });


  // ✅ NEW: Bulk auto-approval mutation
  const bulkAutoApproveMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('scheduled-timesheet-processor');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['timesheets']);
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['workflows']);

      if (data.success) {
        toast.success(
          `✅ Batch Complete: ${data.approved} auto-approved, ${data.flagged} flagged for review`,
          { duration: 5000 }
        );
      }
    },
    onError: (error) => {
      toast.error(`Batch processing failed: ${error.message}`);
    }
  });

  // ✅ NEW: Auto-approval mutation
  const autoApproveMutation = useMutation({
    mutationFn: async (timesheetId) => {
      const { data, error } = await supabase.functions.invoke('auto-timesheet-approval-engine', {
        body: {
          timesheet_id: timesheetId,
          manual_trigger: true
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['timesheets']);
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['workflows']);

      if (data.success) {
        toast.success(data.message || 'Timesheet approved');
      } else {
        toast.warning(data.message || 'Timesheet flagged for manual review', {
          description: data.issues ? `${data.issues.length} issue(s) found` : undefined
        });
      }
    },
    onError: (error) => {
      toast.error(`Auto-approval failed: ${error.message}`);
    }
  });

  const handleCreateRetrospectiveTimesheet = async () => {
    if (!targetedShift || !user) return;

    setRetrospectiveState(prev => ({ ...prev, isValidating: true, validationResult: null }));

    try {
      // 1. Fetch the actual staff assigned (retrospectively)
      const staffId = targetedShift.actual_staff_id;
      if (!staffId) {
        toast.error("No staff member has been assigned to this shift yet.");
        setRetrospectiveState(prev => ({ ...prev, isValidating: false }));
        return;
      }

      // 2. Validate Shift Eligibility
      const { data: validation, error: validationError } = await validateShiftEligibility({
        shift_id: targetedShift.id,
        staff_id: staffId
      });

      if (validationError) throw validationError;

      if (!validation.success) {
        setRetrospectiveState(prev => ({
          ...prev,
          isValidating: false,
          validationResult: { success: false, issues: validation.issues || [validation.message] }
        }));
        return;
      }

      // 3. Validation Success - Proceed to creation
      setRetrospectiveState(prev => ({ ...prev, isValidating: false, isCreating: true }));

      // 4. Ensure Booking Exists
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id')
        .eq('shift_id', targetedShift.id)
        .eq('staff_id', staffId)
        .maybeSingle();

      let bookingId = existingBooking?.id;

      if (!bookingId) {
        const { data: newBooking, error: bookingCreateError } = await supabase
          .from('bookings')
          .insert({
            agency_id: user.agency_id,
            shift_id: targetedShift.id,
            staff_id: staffId,
            client_id: targetedShift.client_id,
            status: 'confirmed',
            booking_date: new Date().toISOString(),
            shift_date: targetedShift.date,
            start_time: targetedShift.start_time,
            end_time: targetedShift.end_time,
            confirmation_method: 'admin_retrospective'
          })
          .select()
          .single();

        if (bookingCreateError) throw bookingCreateError;
        bookingId = newBooking.id;
      }

      // 5. Invoke auto-timesheet-creator
      const { data: tsResult, error: tsError } = await supabase.functions.invoke('auto-timesheet-creator', {
        body: {
          booking_id: bookingId,
          shift_id: targetedShift.id,
          staff_id: staffId,
          client_id: targetedShift.client_id,
          agency_id: user.agency_id
        }
      });

      if (tsError) throw tsError;

      toast.success("Draft timesheet created successfully.");
      queryClient.invalidateQueries(['timesheets']);
      queryClient.invalidateQueries(['shifts']);

      setRetrospectiveState(prev => ({ ...prev, isCreating: false, showBanner: false }));

    } catch (error) {
      console.error("Retrospective creation failed:", error);
      toast.error(`Failed to create timesheet: ${error.message}`);
      setRetrospectiveState(prev => ({ ...prev, isValidating: false, isCreating: false }));
    }
  };


  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unknown';
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown';
  };

  const validateTimesheet = (timesheet) => {
    const issues = [];

    // ✅ FIX 1: Only validate if shift has ended
    const shiftHasEnded = timesheet.shift_date ? new Date(timesheet.shift_date) < new Date() : false;

    if (!shiftHasEnded) {
      // Don't show validation issues for future shifts
      return issues;
    }

    if (!timesheet.booking_id && !timesheet.clock_in_time) {
      return issues;
    }

    const shift = shifts.find(s => s.id === timesheet.booking_id);

    if (shift && timesheet.total_hours) {
      const scheduledHours = shift.duration_hours || 12;
      const workedHours = timesheet.total_hours;
      const hoursDiff = workedHours - scheduledHours;

      if (Math.abs(hoursDiff) > 0.25) {
        issues.push({
          type: 'hours_mismatch',
          severity: Math.abs(hoursDiff) > 2 ? 'high' : 'medium',
          message: `Worked ${workedHours}h, scheduled ${scheduledHours}h (${hoursDiff > 0 ? '+' : ''}${hoursDiff.toFixed(1)}h)`
        });
      }
    }

    // ✅ GPS VERIFICATION BYPASS: Skip signature checks if GPS has verified both clock-in and clock-out
    // GPS verification confirms location and attendance, making signatures redundant
    // Only skip signatures if shift is complete (clocked out) AND both clock-in and clock-out are GPS verified
    const isGPSFullyVerified =
      timesheet.geofence_validated === true &&
      timesheet.clock_in_location &&
      timesheet.clock_out_time && // Shift must be completed (clocked out)
      timesheet.clock_out_geofence_validated === true &&
      timesheet.clock_out_location; // Both clock-in and clock-out GPS verified

    // Only skip signatures if GPS fully verified (both clock-in AND clock-out if shift completed)
    if (!isGPSFullyVerified) {
      // ROLLBACK: Original signature validation logic (restore if needed)
      if (!timesheet.staff_signature) {
        issues.push({
          type: 'missing_signature',
          severity: 'high',
          message: 'Staff signature missing'
        });
      }

      if (!timesheet.client_signature) {
        issues.push({
          type: 'missing_signature',
          severity: 'high',
          message: 'Client/Supervisor signature missing'
        });
      }
    }

    if (timesheet.geofence_validated === false) {
      issues.push({
        type: 'geofence_violation',
        severity: 'high',
        message: `Clock-in ${Math.round(timesheet.geofence_distance_meters || 0)}m outside geofence`
      });
    }

    return issues;
  };

  const filteredTimesheets = timesheets.filter(t => {
    // ✅ CLUTTER REDUCTION: Hide "Draft" timesheets for shifts in the future unless explicitly filtered
    const shift = shifts.find(s => s.id === t.booking_id || s.id === t.shift_id);
    const isFutureShift = shift && new Date(shift.date) > new Date();

    // If it's a future draft and we are in "All" view, skip it
    if (t.status === 'draft' && isFutureShift && statusFilter === 'all' && !searchTerm) {
      return false;
    }

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'pending' && (t.status === 'submitted' || t.status === 'draft')) ||
      (statusFilter === 'draft' && t.status === 'draft') ||
      (statusFilter === 'submitted' && t.status === 'submitted') ||
      (statusFilter === 'approved' && t.status === 'approved') ||
      (statusFilter === 'rejected' && t.status === 'rejected') ||
      (statusFilter === 'paid' && t.status === 'paid');

    const staffName = getStaffName(t.staff_id).toLowerCase();
    const clientName = getClientName(t.client_id).toLowerCase();

    // ✅ ENHANCED: Match ID or names
    const matchesSearch = staffName.includes(searchTerm.toLowerCase()) ||
      clientName.includes(searchTerm.toLowerCase()) ||
      t.id?.includes(searchTerm) ||
      t.booking_id?.includes(searchTerm) ||
      t.shift_id?.includes(searchTerm);

    return matchesStatus && matchesSearch;
  });

  // ✅ MISSING TIMESHEET LOGIC: Find shifts that should have timesheets but don't
  const missingTimesheetShifts = shifts.filter(s => {
    const hasTimesheet = timesheets.some(t => t.booking_id === s.id || t.shift_id === s.id);
    const shiftHasEnded = new Date(s.date) < new Date();
    // Only care about completed or confirmed shifts in the past
    const isRelevantStatus = ['completed', 'awaiting_admin_closure', 'confirmed'].includes(s.status);

    return !hasTimesheet && shiftHasEnded && isRelevantStatus;
  });

  // ✅ MISSING TIMESHEET WRAPPER: Convert shifts to "placeholder" timesheets for the UI
  const missingPlaceholders = missingTimesheetShifts.map(s => ({
    id: `missing-${s.id}`,
    staff_id: s.actual_staff_id || s.staff_id,
    client_id: s.client_id,
    booking_id: s.id,
    shift_date: s.date,
    status: 'missing',
    total_hours: s.duration_hours || 0,
    created_date: s.created_at,
    is_missing: true
  }));

  const displayItems = statusFilter === 'missing' ? missingPlaceholders : filteredTimesheets;

  // ✅ QUICK AUDIT LOGIC
  const auditFilters = {
    hasIssues: (t) => validateTimesheet(t).length > 0,
    noDocs: (t) => !t.uploaded_documents || t.uploaded_documents.length === 0,
    verified: (t) => t.geofence_validated && t.clock_out_geofence_validated
  };

  const [activeAudit, setActiveAudit] = useState(null);

  const auditedItems = activeAudit && statusFilter !== 'missing'
    ? displayItems.filter(auditFilters[activeAudit])
    : displayItems;

  const pendingCount = timesheets.filter(t => t.status === 'submitted').length;
  const draftCount = timesheets.filter(t => t.status === 'draft').length;
  const missingCount = missingTimesheetShifts.length;

  // ✅ FIX 2: Correct total hours calculation
  const totalHours = timesheets
    .filter(t => t.total_hours && t.total_hours > 0)
    .reduce((sum, t) => sum + (t.total_hours || 0), 0);

  // Derived State for Retrospective Workflow
  const targetedShift = shiftIdParam ? shifts.find(s => s.id === shiftIdParam) : null;
  const hasTimesheetForTargetedShift = targetedShift ? timesheets.some(t => t.shift_id === shiftIdParam || t.booking_id === shiftIdParam) : true;

  const totalValue = timesheets
    .filter(t => t.status === 'approved' || t.status === 'paid')
    .reduce((sum, t) => sum + (t.client_charge_amount || 0), 0);

  // ✅ HANDLERS FOR TIMESHEET ACTIONS (Approve/Reject)
  const handleApprove = async (timesheetId) => {
    setProcessingTimesheets(prev => ({ ...prev, approving: new Set(prev.approving).add(timesheetId) }));
    try {
      const { data, error } = await supabase.functions.invoke('auto-timesheet-approval-engine', {
        body: { timesheet_id: timesheetId, manual_trigger: true }
      });
      if (error) throw error;
      toast.success(data.message || 'Timesheet approved');
      queryClient.invalidateQueries(['timesheets']);
    } catch (error) {
      toast.error(`Approval failed: ${error.message}`);
    } finally {
      setProcessingTimesheets(prev => {
        const next = new Set(prev.approving);
        next.delete(timesheetId);
        return { ...prev, approving: next };
      });
    }
  };

  const handleReject = async (timesheetId) => {
    setProcessingTimesheets(prev => ({ ...prev, rejecting: new Set(prev.rejecting).add(timesheetId) }));
    try {
      const { error } = await supabase
        .from('timesheets')
        .update({ status: 'rejected' })
        .eq('id', timesheetId);
      if (error) throw error;
      toast.success('Timesheet rejected');
      queryClient.invalidateQueries(['timesheets']);
    } catch (error) {
      toast.error(`Rejection failed: ${error.message}`);
    } finally {
      setProcessingTimesheets(prev => {
        const next = new Set(prev.rejecting);
        next.delete(timesheetId);
        return { ...prev, rejecting: next };
      });
    }
  };

  // ✅ NEW: CSV Export Function
  const exportToCSV = () => {
    const csvData = filteredTimesheets.map(timesheet => ({
      'Timesheet ID': timesheet.id?.substring(0, 8),
      'Staff Name': getStaffName(timesheet.staff_id),
      'Client Name': getClientName(timesheet.client_id),
      'Shift Date': timesheet.shift_date,
      'Location': timesheet.work_location_within_site || 'Not specified',
      'Clock In': timesheet.clock_in_time ? new Date(timesheet.clock_in_time).toLocaleString() : '',
      'Clock Out': timesheet.clock_out_time ? new Date(timesheet.clock_out_time).toLocaleString() : '',
      'Total Hours': timesheet.total_hours || 0,
      'Break (mins)': timesheet.break_duration_minutes || 0,
      'Pay Rate (£/hr)': timesheet.pay_rate || 0,
      'Charge Rate (£/hr)': timesheet.charge_rate || 0,
      'Staff Pay Amount (£)': timesheet.staff_pay_amount || 0,
      'Client Charge Amount (£)': timesheet.client_charge_amount || 0,
      'Status': timesheet.status,
      'GPS Validated': timesheet.geofence_validated ? 'Yes' : 'No',
      'Staff Signature': timesheet.staff_signature ? 'Yes' : 'No',
      'Client Signature': timesheet.client_signature ? 'Yes' : 'No',
      'Documents Uploaded': timesheet.uploaded_documents?.length || 0,
      'Submitted Date': timesheet.created_date ? new Date(timesheet.created_date).toLocaleDateString() : '',
      'Approved Date': timesheet.client_approved_at ? new Date(timesheet.client_approved_at).toLocaleDateString() : '',
      'Notes': timesheet.notes || ''
    }));

    if (csvData.length === 0) {
      toast.info('No timesheets to export with current filters.');
      return;
    }

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.map(header => {
        const value = String(header);
        if (value.includes(',') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(','),
      ...csvData.map(row =>
        headers.map(header => {
          const value = row[header];
          const stringValue = value === null || value === undefined ? '' : String(value);
          if (stringValue.includes(',') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `timesheets_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`✅ Exported ${csvData.length} timesheets to CSV`);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Timesheets</h2>
          <p className="text-gray-600 mt-1">
            {isStaff ? 'View your timesheets and shift records' : 'Review and approve staff timesheets'}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button
                variant="outline"
                className="gap-2"
                onClick={exportToCSV}
                disabled={filteredTimesheets.length === 0}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              {/* ✅ NEW: Bulk Auto-Approve Button */}
              {pendingCount > 0 && (
                <Button
                  onClick={() => bulkAutoApproveMutation.mutate()}
                  disabled={bulkAutoApproveMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 gap-2"
                >
                  <Zap className="w-4 h-4" />
                  {bulkAutoApproveMutation.isPending ? 'Processing...' : `Auto-Approve All (${pendingCount})`}
                </Button>
              )}
            </>
          )}
          {/* NEW: View Toggle */}
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Cards
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <List className="w-4 h-4 mr-1" />
              Table
            </Button>
          </div>
        </div>
      </div>

      {/* Retrospective Context Banner */}
      {isAdmin && shiftIdParam && targetedShift && !hasTimesheetForTargetedShift && retrospectiveState.showBanner && (
        <Alert className="border-blue-300 bg-blue-50 mb-6">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-900 font-bold flex items-center gap-2">
            Retrospective Management: Missing Timesheet
          </AlertTitle>
          <AlertDescription className="text-blue-800 mt-2">
            <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
              <div>
                <p>
                  No timesheet exists for <strong>{getClientName(targetedShift.client_id)}</strong> on <strong>{format(new Date(targetedShift.date), 'EEE, MMM d')}</strong>.
                  {targetedShift.actual_staff_id ? (
                    <> Staff <strong>{getStaffName(targetedShift.actual_staff_id)}</strong> is currently assigned.</>
                  ) : (
                    <> No staff has been assigned to this past shift yet.</>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateRetrospectiveTimesheet}
                  disabled={retrospectiveState.isValidating || retrospectiveState.isCreating || !targetedShift.actual_staff_id}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {retrospectiveState.isValidating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validating...</>
                  ) : retrospectiveState.isCreating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    <><FileText className="w-4 h-4 mr-2" /> Create Draft Timesheet</>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setRetrospectiveState(prev => ({ ...prev, showBanner: false }))}
                  className="text-blue-600"
                >
                  Dismiss
                </Button>
              </div>
            </div>

            {/* Validation Errors UI */}
            {retrospectiveState.validationResult && !retrospectiveState.validationResult.success && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
                  <ShieldX className="w-5 h-5" />
                  Compliance Block: Staff Ineligible
                </div>
                <ul className="list-disc list-inside space-y-1 text-red-700">
                  {retrospectiveState.validationResult.issues.map((issue, idx) => (
                    <li key={idx}>{typeof issue === 'string' ? issue : (issue.message || JSON.stringify(issue))}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-red-600 italic">
                  * All staff must meet compliance standards before retrospective timesheets can be generated.
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      {isAdmin && (
        <div className="grid md:grid-cols-4 gap-4">
          <Link to={createPageUrl('Timesheets') + '?status=pending'} className="block">
            <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-yellow-900 font-semibold uppercase tracking-wide">Pending Approval</p>
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="text-3xl font-bold text-yellow-900">{pendingCount}</p>
                <p className="text-xs text-yellow-700 mt-1">Click to review →</p>
              </CardContent>
            </Card>
          </Link>
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-blue-900 font-semibold uppercase tracking-wide">Total Hours</p>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-900">{totalHours.toFixed(1)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-green-900 font-semibold uppercase tracking-wide">Total Value</p>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-900">£{totalValue.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-purple-900 font-semibold uppercase tracking-wide">This Week</p>
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-900">{filteredTimesheets.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by staff or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'submitted' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('submitted')}
                className="relative"
              >
                Awaiting Review
                {pendingCount > 0 && (
                  <span className="ml-2 bg-yellow-400 text-yellow-900 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {pendingCount}
                  </span>
                )}
              </Button>
              <Button
                variant={statusFilter === 'draft' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('draft')}
              >
                Drafts ({draftCount})
              </Button>
              {isAdmin && (
                <Button
                  variant={statusFilter === 'missing' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('missing')}
                  className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Missing ({missingCount})
                </Button>
              )}
              <Button
                variant={statusFilter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('approved')}
              >
                Approved
              </Button>
              <Button
                variant={statusFilter === 'paid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('paid')}
              >
                Paid
              </Button>
            </div>
          </div>

          {/* ✅ NEW: Quick Audit Toggles */}
          {isAdmin && statusFilter !== 'missing' && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Quick Audit:</span>
              <button
                onClick={() => setActiveAudit(activeAudit === 'hasIssues' ? null : 'hasIssues')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${activeAudit === 'hasIssues'
                  ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-100'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
              >
                <AlertTriangle className="w-3 h-3" />
                Has Issues
              </button>
              <button
                onClick={() => setActiveAudit(activeAudit === 'noDocs' ? null : 'noDocs')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${activeAudit === 'noDocs'
                  ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-100'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                  }`}
              >
                <FileText className="w-3 h-3" />
                No Documents
              </button>
              <button
                onClick={() => setActiveAudit(activeAudit === 'verified' ? null : 'verified')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${activeAudit === 'verified'
                  ? 'bg-green-600 text-white shadow-sm ring-2 ring-green-100'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
              >
                <ShieldCheck className="w-3 h-3" />
                GPS Verified
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* NEW: Table View */}
      {viewMode === 'table' && filteredTimesheets.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Staff</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pay</th>
                    {isAdmin && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Charge</th>}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">GPS</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Docs</th>
                    {/* ✅ NEW: Auto-Approval Column */}
                    {isAdmin && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Auto-Approval</th>}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {auditedItems.map((timesheet) => {
                    const issues = validateTimesheet(timesheet);
                    const staffMember = staff.find(s => s.id === timesheet.staff_id);
                    const shift = shifts.find(s => s.id === timesheet.booking_id);

                    // ✅ NEW: Check if shift has ended
                    const shiftHasEnded = timesheet.shift_date ? new Date(timesheet.shift_date) < new Date() : false;

                    // ✅ FIX: Safe date formatting helper
                    const formatSafeDate = (dateStr) => {
                      if (!dateStr) return 'No Date';
                      try {
                        const date = new Date(dateStr);
                        if (isNaN(date.getTime())) return 'Invalid Date';
                        return format(date, 'MMM d, yyyy');
                      } catch (error) {
                        console.error('Date format error:', dateStr, error);
                        return 'Date Error';
                      }
                    };

                    return (
                      <tr key={timesheet.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <Badge className={
                            timesheet.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                              timesheet.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                                timesheet.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  timesheet.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-emerald-100 text-emerald-800'
                          }>
                            {timesheet.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-sm">{getStaffName(timesheet.staff_id)}</p>
                          {staffMember?.role && (
                            <p className="text-xs text-gray-500 capitalize">{staffMember.role.replace('_', ' ')}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{getClientName(timesheet.client_id)}</td>
                        <td className="px-4 py-3">
                          {timesheet.work_location_within_site ? (
                            <Badge className="bg-cyan-100 text-cyan-800 text-xs">
                              📍 {timesheet.work_location_within_site}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        {/* ✅ FIX: Safe date display in table */}
                        <td className="px-4 py-3 text-sm">
                          {timesheet.shift_date ? (
                            <span>{formatSafeDate(timesheet.shift_date)}</span>
                          ) : (
                            <span className="text-red-600 italic">No Date</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-sm">{timesheet.total_hours || 0}h</p>
                          {/* ✅ FIX: Only show issue count if shift has ended */}
                          {shiftHasEnded && issues.length > 0 && (
                            <p className="text-xs text-red-600">{issues.length} issue{issues.length > 1 ? 's' : ''}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-sm">£{(timesheet.staff_pay_amount || 0).toFixed(2)}</td>
                        {isAdmin && <td className="px-4 py-3 font-semibold text-sm text-green-600">£{(timesheet.client_charge_amount || 0).toFixed(2)}</td>}
                        <td className="px-4 py-3">
                          {staffMember?.gps_consent ? (
                            timesheet.geofence_validated ? (
                              <Badge className="bg-green-100 text-green-700 text-xs">✓ Verified</Badge>
                            ) : timesheet.clock_in_location ? (
                              <Badge className="bg-red-100 text-red-700 text-xs">⚠️ Failed</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600 text-xs">Pending</Badge>
                            )
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 text-xs">No Consent</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {timesheet.uploaded_documents && timesheet.uploaded_documents.length > 0 ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              {timesheet.uploaded_documents.length} doc{timesheet.uploaded_documents.length > 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </td>

                        {/* ✅ NEW: Auto-Approval Status */}
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <AutoApprovalIndicator
                              timesheet={timesheet}
                              shift={shift}
                              staffMember={staffMember}
                            />
                          </td>
                        )}

                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Link to={createPageUrl('TimesheetDetail') + `?id=${timesheet.id}`}>
                              <Button size="sm" variant="outline">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            </Link>
                            {/* ✅ FIX 4: Show approve/reject for submitted OR draft (if shift ended) */}
                            {isAdmin && (timesheet.status === 'submitted' || timesheet.status === 'draft') && shiftHasEnded && (
                              <>
                                {/* ✅ NEW: Auto-Approve Button */}
                                <Button
                                  size="sm"
                                  onClick={() => autoApproveMutation.mutate(timesheet.id)}
                                  className="bg-purple-600 hover:bg-purple-700 text-white"
                                  disabled={autoApproveMutation.isPending}
                                  title="Run Auto-Approval Engine"
                                >
                                  <Zap className="w-3 h-3 mr-1" />
                                  Auto
                                </Button>

                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(timesheet.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  disabled={processingTimesheets.approving.has(timesheet.id)}
                                >
                                  {processingTimesheets.approving.has(timesheet.id) ? 'Approving...' : 'Approve'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject(timesheet.id)}
                                  className="text-red-600 border-red-600"
                                  disabled={processingTimesheets.rejecting.has(timesheet.id)}
                                >
                                  {processingTimesheets.rejecting.has(timesheet.id) ? 'Rejecting...' : 'Reject'}
                                </Button>
                              </>
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
      ) : viewMode === 'cards' ? (
        /* Timesheets Grid */
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {auditedItems.map(timesheet => {
            const staffMember = staff.find(s => s.id === timesheet.staff_id);
            const shift = shifts.find(s => s.id === timesheet.booking_id);
            const clientObj = clients.find(c => c.id === timesheet.client_id);

            return (
              <div key={timesheet.id} className="relative">
                <TimesheetCard
                  timesheet={timesheet}
                  shift={shift}
                  staffName={getStaffName(timesheet.staff_id)}
                  clientName={getClientName(timesheet.client_id)}
                  issues={validateTimesheet(timesheet)}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isAdmin={isAdmin}
                  isApproving={processingTimesheets.approving.has(timesheet.id)}
                  isRejecting={processingTimesheets.rejecting.has(timesheet.id)}
                  user={user}
                  clientObj={clientObj}
                  extraFooter={isAdmin && timesheet.status === 'submitted' && (
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                      <AutoApprovalIndicator
                        timesheet={timesheet}
                        shift={shift}
                        staffMember={staffMember}
                      />
                      <Button
                        size="sm"
                        onClick={() => autoApproveMutation.mutate(timesheet.id)}
                        disabled={autoApproveMutation.isPending}
                        className="w-full mt-2 bg-purple-600 hover:bg-purple-700 font-bold shadow-sm"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        {autoApproveMutation.isPending ? 'Processing...' : 'Run Auto-Approval'}
                      </Button>
                    </div>
                  )}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Pagination Controls */}
      {totalCount > pageSize && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Page Info */}
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} timesheets
              </div>

              {/* Pagination Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm font-medium px-4">
                  Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                >
                  Next
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                >
                  Last
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredTimesheets.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Timesheets Found</h3>
            <p className="text-gray-600">
              {isStaff
                ? 'Your timesheets will appear here after you complete shifts'
                : statusFilter === 'pending'
                  ? 'No timesheets awaiting approval'
                  : 'Timesheets will appear here after shifts are completed'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal containers removed - now handled by TimesheetUploader and sub-components */}
    </div>
  );
}

