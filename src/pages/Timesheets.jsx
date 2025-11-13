
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Clock, Download, Filter, Search, TrendingUp, Calendar, DollarSign,
  Upload, Eye, FileText, AlertTriangle, CheckCircle, LayoutGrid, List, Zap
} from "lucide-react";
import { toast } from "sonner";
import TimesheetCard from "../components/timesheets/TimesheetCard";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import AutoApprovalIndicator from "../components/timesheets/AutoApprovalIndicator";

export default function Timesheets() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    timesheet_id: null,
    file_url: '',
    notes: ''
  });
  const [viewMode, setViewMode] = useState('cards'); // NEW: Card or Table view
  const [processingTimesheets, setProcessingTimesheets] = useState({
    approving: new Set(),
    rejecting: new Set()
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.error('❌ Not authenticated:', authError);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Profile not found:', profileError);
        return;
      }

      setUser(profile);
    };
    fetchUser();
  }, []);

  const isAdmin = user?.user_type === 'agency_admin' || user?.user_type === 'manager';
  const isStaff = user?.user_type === 'staff_member';

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets', user?.agency_id],
    queryFn: async () => {
      let query = supabase
        .from('timesheets')
        .select('*')
        .order('created_date', { ascending: false });

      if (isStaff) {
        const { data: staffRecords, error } = await supabase
          .from('staff')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) {
          console.error('❌ Error fetching staff:', error);
          return [];
        }

        if (staffRecords && staffRecords[0]) {
          query = query.eq('staff_id', staffRecords[0].id);
        }
      } else if (user?.agency_id) {
        query = query.eq('agency_id', user.agency_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching timesheets:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user,
    refetchOnMount: 'always'
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', user?.agency_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('agency_id', user?.agency_id)
        .order('first_name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.agency_id,
    refetchOnMount: 'always'
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.agency_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('agency_id', user?.agency_id)
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.agency_id,
    refetchOnMount: 'always'
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', user?.agency_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('agency_id', user?.agency_id)
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.agency_id,
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

  const uploadFileMutation = useMutation({
    mutationFn: async ({ timesheetId, fileUrl, notes }) => {
      const timesheet = timesheets.find(t => t.id === timesheetId);
      const existingFiles = timesheet.uploaded_documents || [];
      const newDoc = {
        file_url: fileUrl,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user.email,
        notes: notes || ''
      };

      const { error } = await supabase
        .from('timesheets')
        .update({
          uploaded_documents: [...existingFiles, newDoc]
        })
        .eq('id', timesheetId);

      if (error) throw error;

      return newDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['timesheets']);
      setShowUploadModal(false);
      setUploadData({ timesheet_id: null, file_url: '', notes: '' });
      setUploadingFile(null);
      toast.success('✅ Timesheet document uploaded successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to upload: ${error.message}`);
      setUploadingFile(null);
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

  const handleFileUpload = async (e, timesheetId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadingFile(timesheetId);
    toast.info('📤 Uploading document...');

    try {
      // Upload to Supabase Storage
      const fileName = `timesheets/${timesheetId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const file_url = publicUrl;

      setUploadData({
        timesheet_id: timesheetId,
        file_url,
        notes: ''
      });
      setShowUploadModal(true);

    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
      setUploadingFile(null);
    }
  };

  const handleUploadSubmit = () => {
    if (!uploadData.file_url) {
      toast.error('No file selected');
      return;
    }

    uploadFileMutation.mutate({
      timesheetId: uploadData.timesheet_id,
      fileUrl: uploadData.file_url,
      notes: uploadData.notes
    });
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
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'pending' && (t.status === 'submitted' || t.status === 'draft')) ||
                         (statusFilter === 'approved' && t.status === 'approved') ||
                         (statusFilter === 'rejected' && t.status === 'rejected') ||
                         (statusFilter === 'paid' && t.status === 'paid');

    const staffName = getStaffName(t.staff_id).toLowerCase();
    const clientName = getClientName(t.client_id).toLowerCase();
    const matchesSearch = staffName.includes(searchTerm.toLowerCase()) ||
                         clientName.includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = timesheets.filter(t => t.status === 'submitted' || t.status === 'draft').length;

  // ✅ FIX 2: Correct total hours calculation - include ALL timesheets with total_hours, not just approved/paid
  const totalHours = timesheets
    .filter(t => t.total_hours && t.total_hours > 0) // ✅ Count all timesheets with hours
    .reduce((sum, t) => sum + (t.total_hours || 0), 0);

  const totalValue = timesheets
    .filter(t => t.status === 'approved' || t.status === 'paid')
    .reduce((sum, t) => sum + (t.client_charge_amount || 0), 0);

  // ✅ ENHANCED: Approve with debouncing and single-call protection
  const handleApprove = (timesheetId) => {
    // ✅ FIX: Prevent double-click and concurrent calls
    if (processingTimesheets.approving.has(timesheetId) || updateMutation.isPending) {
      console.log('⏸️ [Timesheets] Approve already in progress, ignoring duplicate call');
      return;
    }

    console.log('✅ [Timesheets] Approving timesheet:', timesheetId);
    setProcessingTimesheets(prev => ({
      ...prev,
      approving: new Set([...prev.approving, timesheetId])
    }));

    updateMutation.mutate(
      {
        id: timesheetId,
        data: { status: 'approved', client_approved_at: new Date().toISOString() }
      },
      {
        onSettled: () => {
          console.log('🏁 [Timesheets] Approve settled for:', timesheetId);
          setProcessingTimesheets(prev => {
            const newSet = new Set(prev.approving);
            newSet.delete(timesheetId);
            return { ...prev, approving: newSet };
          });
        }
      }
    );
  };

  // ✅ ENHANCED: Reject with debouncing
  const handleReject = (timesheetId) => {
    // ✅ FIX: Prevent double-click
    if (processingTimesheets.rejecting.has(timesheetId) || updateMutation.isPending) {
      console.log('⏸️ [Timesheets] Reject already in progress, ignoring duplicate call');
      return;
    }

    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    console.log('✅ [Timesheets] Rejecting timesheet:', timesheetId);
    setProcessingTimesheets(prev => ({
      ...prev,
      rejecting: new Set([...prev.rejecting, timesheetId])
    }));

    updateMutation.mutate(
      {
        id: timesheetId,
        data: { status: 'rejected', rejection_reason: reason }
      },
      {
        onSettled: () => {
          console.log('🏁 [Timesheets] Reject settled for:', timesheetId);
          setProcessingTimesheets(prev => {
            const newSet = new Set(prev.rejecting);
            newSet.delete(timesheetId);
            return { ...prev, rejecting: newSet };
          });
        }
      }
    );
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
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
              >
                Pending ({pendingCount})
              </Button>
              <Button
                variant={statusFilter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('approved')}
              >
                Approved
              </Button>
              <Button
                variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('rejected')}
              >
                Rejected
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
                  {filteredTimesheets.map((timesheet) => {
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
          {filteredTimesheets.map(timesheet => {
            const staffMember = staff.find(s => s.id === timesheet.staff_id);
            const shift = shifts.find(s => s.id === timesheet.booking_id);
            
            return (
              <div key={timesheet.id} className="relative">
                <TimesheetCard
                  timesheet={timesheet}
                  staffName={getStaffName(timesheet.staff_id)}
                  clientName={getClientName(timesheet.client_id)}
                  issues={validateTimesheet(timesheet)}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isAdmin={isAdmin}
                  isApproving={processingTimesheets.approving.has(timesheet.id)}
                  isRejecting={processingTimesheets.rejecting.has(timesheet.id)}
                />

                {/* ✅ NEW: Auto-Approval Indicator in Cards */}
                {isAdmin && timesheet.status === 'submitted' && (
                  <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <AutoApprovalIndicator 
                      timesheet={timesheet} 
                      shift={shift} 
                      staffMember={staffMember} 
                    />
                    <Button
                      size="sm"
                      onClick={() => autoApproveMutation.mutate(timesheet.id)}
                      disabled={autoApproveMutation.isPending}
                      className="w-full mt-2 bg-purple-600 hover:bg-purple-700"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      {autoApproveMutation.isPending ? 'Processing...' : 'Run Auto-Approval'}
                    </Button>
                  </div>
                )}

                {/* Upload/View Documents Section */}
                <div className="mt-2 flex gap-2">
                  {/* Upload Button */}
                  <label className="flex-1 cursor-pointer">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={uploadingFile === timesheet.id}
                      asChild
                    >
                      <span>
                        <Upload className="w-3 h-3 mr-2" />
                        {uploadingFile === timesheet.id ? 'Uploading...' : 'Upload Doc'}
                      </span>
                    </Button>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, timesheet.id)}
                      disabled={uploadingFile === timesheet.id}
                    />
                  </label>

                  {/* View Uploaded Documents */}
                  {timesheet.uploaded_documents && timesheet.uploaded_documents.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                      onClick={() => {
                        const latestDoc = timesheet.uploaded_documents[timesheet.uploaded_documents.length - 1];
                        window.open(latestDoc.file_url, '_blank');
                      }}
                    >
                      <Eye className="w-3 h-3" />
                      View ({timesheet.uploaded_documents.length})
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardHeader className="border-b">
              <CardTitle>Add Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <Input
                  placeholder="Add any notes about this document..."
                  value={uploadData.notes}
                  onChange={(e) => setUploadData({ ...uploadData, notes: e.target.value })}
                />
              </div>

              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-sm text-green-800">
                  ✓ File uploaded successfully
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadData({ timesheet_id: null, file_url: '', notes: '' });
                    setUploadingFile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUploadSubmit}
                  disabled={uploadFileMutation.isPending}
                  className="bg-green-600"
                >
                  {uploadFileMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
