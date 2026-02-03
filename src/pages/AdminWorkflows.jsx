
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertCircle, CheckCircle, Clock, User, FileText,
  XCircle, TrendingUp, Filter, Plus, Eye, Loader2, LayoutGrid, List, UserPlus, Building2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Checkbox } from "@/components/ui/checkbox";
import ApproveUserModal from "@/components/admin/ApproveUserModal";

export default function AdminWorkflows() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [shiftResolutionAction, setShiftResolutionAction] = useState('completed');
  const [actualStaffId, setActualStaffId] = useState('none');
  const [actualStartTime, setActualStartTime] = useState('');
  const [actualEndTime, setActualEndTime] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('adminWorkflowsViewMode') || 'cards';
  });

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('adminWorkflowsViewMode', viewMode);
  }, [viewMode]);
  const [clientIdFilter, setClientIdFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [approveUserWorkflow, setApproveUserWorkflow] = useState(null);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // 🛡️ RBAC: Block staff members
  useEffect(() => {
    const checkAccess = async () => {
      try {
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

        // 🚫 Silent redirect for staff members
        if (profile.user_type === 'staff_member') {
          navigate(createPageUrl('StaffPortal'));
          return;
        }

        setUser(profile);
      } catch (error) {
        console.error("Auth error:", error);
        navigate(createPageUrl('Home'));
      }
    };
    checkAccess();
  }, [navigate]);

  const queryClient = useQueryClient();

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      // ✅ FIX: Fetch only pending/in_progress workflows to avoid hitting 1000-row limit
      // Resolved/dismissed workflows can be viewed in a separate "History" page
      const { data, error } = await supabase
        .from('admin_workflows')
        .select('*')
        .in('status', ['pending', 'in_progress'])
        .order('created_date', { ascending: false })
        .limit(2000); // Safety limit

      if (error) {
        console.error('❌ Error fetching workflows:', error);
        return [];
      }

      console.log(`✅ [Admin Workflows] Fetched ${data?.length || 0} active workflows`);
      return data || [];
    },
    enabled: true,
    refetchOnMount: 'always'
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*');

      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }
      return data || [];
    },
    enabled: true,
    refetchOnMount: 'always'
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timesheets')
        .select('*');

      if (error) {
        console.error('❌ Error fetching timesheets:', error);
        return [];
      }
      return data || [];
    },
    enabled: true,
    refetchOnMount: 'always'
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name');
      return data || [];
    }
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, first_name, last_name');
      return data || [];
    }
  });

  const clientMap = React.useMemo(() => {
    return clients.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});
  }, [clients]);

  const staffMap = React.useMemo(() => {
    return profiles.reduce((acc, p) => ({ ...acc, [p.id]: `${p.first_name || ''} ${p.last_name || ''}`.trim() }), {});
  }, [profiles]);

  // ✅ FIX 3: Enhanced workflow mutation with proper shift update
  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ id, data, shiftId, shiftAction, actualStaffId, actualStartTime, actualEndTime }) => {
      console.log('🔄 [Admin Workflow] Updating workflow:', id);
      console.log('🔄 [Admin Workflow] Shift action:', shiftAction, 'Shift ID:', shiftId);

      // ✅ FIX: Update shift FIRST, then workflow (so validation can check shift status)
      if (shiftId && shiftAction) {
        console.log('🔄 [Admin Workflow] Updating shift status to:', shiftAction);

        // 🔒 VALIDATION: If marking shift as completed, ensure timesheet exists
        if (shiftAction === 'completed') {
          const shiftTimesheets = timesheets.filter(
            t => t.shift_id === shiftId || (t.booking_id && shifts.some(s => s.id === shiftId && s.booking_id === t.booking_id))
          );

          if (shiftTimesheets.length === 0) {
            throw new Error('❌ Cannot mark shift as completed: No timesheet exists. Staff must clock in/out first.');
          }

          const hasApprovedTimesheet = shiftTimesheets.some(t => t.status === 'approved' || t.status === 'submitted');

          if (!hasApprovedTimesheet) {
            const confirm = window.confirm(
              '⚠️ WARNING: No approved timesheet found.\n\n' +
              'Timesheets: ' + shiftTimesheets.map(t => `${t.status}`).join(', ') + '\n\n' +
              'Mark as completed anyway?'
            );

            if (!confirm) {
              throw new Error('Shift completion cancelled - awaiting timesheet approval');
            }
          }
        }

        // Update shift status
        const shiftUpdates = {
          status: shiftAction,
          ...(shiftAction === 'completed' && {
            shift_ended_at: new Date().toISOString(),
            admin_closed_at: new Date().toISOString(),
            admin_closure_outcome: 'completed_as_planned',
            actual_staff_id: actualStaffId === 'none' ? null : actualStaffId,
            actual_start_time: actualStartTime || null,
            actual_end_time: actualEndTime || null
          }),
          ...(shiftAction === 'cancelled' && {
            cancelled_at: new Date().toISOString(),
            status: 'cancelled',
            cancelled_by: 'agency',
            cancellation_reason: data.resolution_notes,
            admin_closure_outcome: 'cancelled'
          }),
          ...(shiftAction === 'no_show' && {
            admin_closure_outcome: 'no_show',
            status: 'completed',
            admin_closed_at: new Date().toISOString()
          }),
          ...(shiftAction === 'disputed' && {
            admin_closure_outcome: 'disputed',
            admin_closed_at: new Date().toISOString()
          })
        };

        console.log('💾 [Admin Workflow] Applying shift updates:', shiftUpdates);
        const { error: shiftError } = await supabase
          .from('shifts')
          .update(shiftUpdates)
          .eq('id', shiftId);

        if (shiftError) {
          console.error('❌ [Admin Workflow] Shift update failed:', shiftError);
          throw shiftError;
        }
        console.log('✅ [Admin Workflow] Shift updated successfully');
      }

      // Then update workflow
      const { error: workflowError } = await supabase
        .from('admin_workflows')
        .update(data)
        .eq('id', id);

      if (workflowError) throw workflowError;
    },
    onSuccess: () => {
      console.log('✅ [Admin Workflow] Workflow updated successfully');
      queryClient.invalidateQueries(['workflows']);
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['bookings']);
      queryClient.invalidateQueries(['timesheets']);
      setSelectedWorkflow(null);
      setResolutionNotes('');
      setShiftResolutionAction('completed');
      setActualStaffId('none');
      setActualStartTime('');
      setActualEndTime('');
      toast.success('✅ Workflow resolved & shift status updated');
    },
    onError: (error) => {
      console.error('❌ [Admin Workflow] Error:', error);
      if (error.message && !error.message.includes('cancelled')) {
        toast.error(`Error: ${error.message}`);
      }
    }
  });

  const bulkResolveMutation = useMutation({
    mutationFn: async ({ status, notes, outcome }) => {
      const { data, error } = await supabase.rpc('bulk_resolve_admin_workflows', {
        target_workflow_ids: selectedIds,
        resolution_status: status,
        notes: notes,
        shift_outcome: outcome
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`✅ ${data.updated_count} workflows resolved in bulk`);
      setSelectedIds([]);
      queryClient.invalidateQueries(['workflows']);
      queryClient.invalidateQueries(['shifts']);
    },
    onError: (error) => toast.error(`Bulk update failed: ${error.message}`)
  });

  const handleStatusChange = (workflowId, newStatus) => {
    if (updateWorkflowMutation.isPending) {
      console.log('⏸️ [Admin Workflow] Already processing, ignoring duplicate call');
      return;
    }

    const workflow = workflows.find(w => w.id === workflowId);

    const updates = {
      status: newStatus,
      ...(newStatus === 'resolved' && {
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionNotes
      })
    };

    // ✅ FIX: Extract shift ID and pass shift action
    const shiftId = workflow?.related_entity?.entity_type === 'shift'
      ? workflow.related_entity.entity_id
      : null;

    updateWorkflowMutation.mutate({
      id: workflowId,
      data: updates,
      shiftId: shiftId,
      shiftAction: shiftResolutionAction,
      actualStaffId,
      actualStartTime,
      actualEndTime
    });
  };

  const filteredWorkflows = workflows.filter(w => {
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || w.priority === priorityFilter;
    const matchesType = typeFilter === 'all' || w.type === typeFilter;

    let matchesClient = true;
    if (clientIdFilter !== 'all') {
      const shiftId = w.related_entity?.entity_id;
      const shift = shifts.find(s => s.id === shiftId);
      matchesClient = shift?.client_id === clientIdFilter;
    }

    let matchesDate = true;
    if (startDateFilter || endDateFilter) {
      const shiftId = w.related_entity?.entity_id;
      const shift = shifts.find(s => s.id === shiftId);
      if (shift?.date) {
        if (startDateFilter && shift.date < startDateFilter) matchesDate = false;
        if (endDateFilter && shift.date > endDateFilter) matchesDate = false;
      } else {
        // Fallback to workflow created date if no shift date
        const workflowDate = format(new Date(w.created_date), 'yyyy-MM-dd');
        if (startDateFilter && workflowDate < startDateFilter) matchesDate = false;
        if (endDateFilter && workflowDate > endDateFilter) matchesDate = false;
      }
    }

    return matchesStatus && matchesPriority && matchesType && matchesClient && matchesDate;
  });

  const toggleAll = () => {
    if (selectedIds.length === filteredWorkflows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredWorkflows.map(w => w.id));
    }
  };

  const toggleOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      critical: { className: 'bg-red-600 text-white', icon: AlertCircle },
      high: { className: 'bg-orange-500 text-white', icon: AlertCircle },
      medium: { className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      low: { className: 'bg-blue-100 text-blue-800', icon: TrendingUp }
    };
    return variants[priority] || variants.medium;
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { className: 'bg-red-100 text-red-800', icon: AlertCircle },
      in_progress: { className: 'bg-blue-100 text-blue-800', icon: Clock },
      resolved: { className: 'bg-green-100 text-green-800', icon: CheckCircle },
      dismissed: { className: 'bg-gray-100 text-gray-800', icon: XCircle }
    };
    return variants[status] || variants.pending;
  };

  const getTypeName = (type) => {
    const types = {
      unfilled_urgent_shift: '🚨 Unfilled Urgent Shift',
      expired_compliance_document: '📄 Expired Document',
      expiring_compliance_document: '⚠️ Expiring Document',
      timesheet_discrepancy: '⏰ Timesheet Issue',
      missing_staff_information: '👤 Missing Info',
      payment_issue: '💰 Payment Issue',
      client_complaint: '😠 Client Complaint',
      staff_no_show: '❌ Staff No Show',
      shift_cancellation: '🚫 Cancellation',
      shift_completion_verification: '✅ Shift Verification', // New type
      other: '📋 Other'
    };
    return types[type] || type;
  };

  // ✅ NEW: Helper to detect pending user signup workflows
  const isPendingUserSignup = (workflow) => {
    return workflow?.related_entity?.entity_type === 'profile' &&
      workflow?.title?.includes('New User Signup') &&
      workflow?.status === 'pending';
  };

  const getRelatedEntityLink = (workflow) => {
    if (!workflow.related_entity) return null;

    const { entity_type, entity_id } = workflow.related_entity;

    // ✅ SMART ROUTING: If it's a shift in the past, route to Timesheets for intervention
    if (entity_type === 'shift') {
      const shift = shifts.find(s => s.id === entity_id);
      if (shift) {
        // Use a simple date comparison for "past" shift
        const isPastShift = new Date(shift.date) < new Date();
        if (isPastShift) {
          console.log(`🔀 [Routing] Past shift detected (${shift.date}), redirecting to Timesheets for intervention.`);
          return `${createPageUrl('Timesheets')}?shiftId=${entity_id}`;
        }
      }
    }

    const links = {
      shift: createPageUrl('Shifts', entity_id),
      staff: createPageUrl('Staff', entity_id),
      client: createPageUrl('Clients', entity_id),
      timesheet: createPageUrl('Timesheets', entity_id),
      compliance: createPageUrl('ComplianceTracker', entity_id),
      booking: createPageUrl('Bookings', entity_id),
      invoice: createPageUrl('Invoices', entity_id)
    };

    // Fallback to a generic entity list if no specific link is found or entity_id is not useful
    return links[entity_type] || createPageUrl(entity_type);
  };

  // Count workflows by status (only active workflows are fetched)
  const pendingCount = workflows.filter(w => w.status === 'pending').length;
  const inProgressCount = workflows.filter(w => w.status === 'in_progress').length;
  const criticalCount = workflows.filter(w => w.priority === 'critical').length;
  const totalActiveCount = workflows.length; // Total active (pending + in_progress)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Workflows</h2>
          <p className="text-gray-600 mt-1">Central command center for issues requiring intervention</p>
        </div>
        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-2 border-red-300 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">Critical</p>
                <p className="text-3xl font-bold text-red-600">{criticalCount}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-500 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Pending</p>
                <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
              </div>
              <Clock className="w-10 h-10 text-orange-500 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-300 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">{inProgressCount}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-500 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Workflows</p>
                <p className="text-3xl font-bold text-gray-900">{totalActiveCount}</p>
                <p className="text-xs text-gray-500 mt-1">Pending + In Progress</p>
              </div>
              <FileText className="w-10 h-10 text-gray-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ ENHANCED: Filters with View Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="flex-1">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="unfilled_urgent_shift">Unfilled Urgent Shift</SelectItem>
                    <SelectItem value="shift_completion_verification">Shift Verification</SelectItem>
                    <SelectItem value="expired_compliance_document">Expired Document</SelectItem>
                    <SelectItem value="timesheet_discrepancy">Timesheet Issue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Select value={clientIdFilter} onValueChange={setClientIdFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ✅ NEW: View Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className={viewMode === 'cards' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white' : ''}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white' : ''}
              >
                <List className="w-4 h-4 mr-2" />
                Table
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ QUICK DATE SELECTS */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Period:</span>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="h-8 w-36 text-xs"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
          />
          <span className="text-gray-400">to</span>
          <Input
            type="date"
            className="h-8 w-36 text-xs"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
          />
        </div>
        <div className="flex gap-2 ml-2">
          <Button
            variant="outline"
            size="xs"
            className="h-7 text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 font-bold"
            onClick={() => { setStartDateFilter('2025-12-01'); setEndDateFilter('2025-12-31'); }}
          >
            🗓️ Dec 2025
          </Button>
          <Button
            variant="outline"
            size="xs"
            className="h-7 text-[10px]"
            onClick={() => {
              const d = new Date();
              const first = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
              const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
              setStartDateFilter(first); setEndDateFilter(last);
            }}
          >
            📅 This Month
          </Button>
          <Button variant="ghost" size="xs" className="h-7 text-[10px] text-gray-400" onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}>
            Clear Dates
          </Button>
        </div>
      </div>

      {/* ✅ NEW: Table View */}
      {viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <Checkbox
                        checked={selectedIds.length > 0 && selectedIds.length === filteredWorkflows.length}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Related</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Deadline</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredWorkflows.map(workflow => {
                    const priorityInfo = getPriorityBadge(workflow.priority);
                    const statusInfo = getStatusBadge(workflow.status);
                    const relatedLink = getRelatedEntityLink(workflow);

                    return (
                      <tr key={workflow.id} className="hover:bg-gray-50 border-b">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedIds.includes(workflow.id)}
                            onCheckedChange={() => toggleOne(workflow.id)}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge className={priorityInfo.className}>
                            {workflow.priority}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge className={statusInfo.className}>
                            {workflow.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          {getTypeName(workflow.type)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-sm text-gray-900">{workflow.title}</p>
                          <p className="text-xs text-gray-600 truncate max-w-xs">{workflow.description}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {workflow.related_entity && (
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="text-xs w-fit">
                                {workflow.related_entity.entity_type}
                              </Badge>
                              {workflow.related_entity.entity_type === 'shift' && (
                                <div className="text-[11px] text-gray-500">
                                  {(() => {
                                    const shift = shifts.find(s => s.id === workflow.related_entity.entity_id);
                                    if (shift) {
                                      const clientName = clientMap[shift.client_id] || 'Unknown Client';
                                      const staffName = staffMap[shift.assigned_staff_id || shift.actual_staff_id] || 'Unassigned';
                                      return (
                                        <>
                                          <p className="font-medium text-gray-700 truncate max-w-[120px]">{clientName}</p>
                                          <p className="truncate max-w-[120px]">{staffName}</p>
                                        </>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {workflow.deadline ? format(new Date(workflow.deadline), 'MMM d, HH:mm') : '-'}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1">
                            {/* ✅ NEW: Approve User button for pending user signups */}
                            {isPendingUserSignup(workflow) && (
                              <Button
                                size="sm"
                                className="h-8 bg-green-600 hover:bg-green-700 text-white px-3"
                                onClick={() => setApproveUserWorkflow(workflow)}
                                disabled={updateWorkflowMutation.isPending}
                                title="Approve User"
                              >
                                <UserPlus className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                            )}
                            {workflow.status === 'pending' && !isPendingUserSignup(workflow) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => handleStatusChange(workflow.id, 'in_progress')}
                                disabled={updateWorkflowMutation.isPending}
                                title="Start Working"
                              >
                                <Clock className="w-4 h-4 text-blue-600" />
                              </Button>
                            )}
                            {(workflow.status === 'pending' || workflow.status === 'in_progress') && !isPendingUserSignup(workflow) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => setSelectedWorkflow(workflow)}
                                disabled={updateWorkflowMutation.isPending}
                                title="Mark Resolved"
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                            {relatedLink && (
                              <Link to={relatedLink}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  title={`View ${workflow.related_entity?.entity_type || 'Related'}`}
                                >
                                  <Eye className="w-4 h-4 text-gray-600" />
                                </Button>
                              </Link>
                            )}
                            {!isPendingUserSignup(workflow) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => handleStatusChange(workflow.id, 'dismissed')}
                                disabled={updateWorkflowMutation.isPending}
                                title="Dismiss"
                              >
                                <XCircle className="w-4 h-4 text-gray-600" />
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
        /* Workflows List (Cards View) */
        <div className="space-y-4">
          {filteredWorkflows.map(workflow => {
            const priorityInfo = getPriorityBadge(workflow.priority);
            const statusInfo = getStatusBadge(workflow.status);
            const PriorityIcon = priorityInfo.icon;
            const StatusIcon = statusInfo.icon;
            const relatedLink = getRelatedEntityLink(workflow);

            return (
              <Card key={workflow.id} className={`hover:shadow-lg transition-shadow relative ${workflow.priority === 'critical' ? 'border-2 border-red-300' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex gap-4">
                      {/* Checkbox positioned more naturally */}
                      <div className="pt-1">
                        <Checkbox
                          checked={selectedIds.includes(workflow.id)}
                          onCheckedChange={() => toggleOne(workflow.id)}
                          className="w-5 h-5 border-2 border-gray-300 data-[state=checked]:bg-blue-600"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <Badge className={priorityInfo.className}>
                            <PriorityIcon className="w-3 h-3 mr-1" />
                            {workflow.priority}
                          </Badge>
                          <Badge className={statusInfo.className}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {workflow.status}
                          </Badge>
                          <span className="text-sm text-gray-600">{getTypeName(workflow.type)}</span>
                        </div>

                        <h3 className="font-semibold text-gray-900 text-lg mb-2">{workflow.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>

                        {workflow.deadline && (
                          <p className="text-xs text-gray-500">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Deadline: {format(new Date(workflow.deadline), 'MMM d, yyyy HH:mm')}
                          </p>
                        )}

                        {workflow.related_entity?.entity_type === 'shift' && (
                          <div className="mt-3 grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100 italic">
                            {(() => {
                              const shift = shifts.find(s => s.id === workflow.related_entity.entity_id);
                              if (shift) {
                                return (
                                  <>
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <Building2 className="w-3.5 h-3.5" />
                                      <span>{clientMap[shift.client_id] || 'Unknown Client'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <User className="w-3.5 h-3.5" />
                                      <span>{staffMap[shift.assigned_staff_id || shift.actual_staff_id] || 'Unassigned'}</span>
                                    </div>
                                  </>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}

                        {workflow.resolved_at && (
                          <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                            <p className="text-sm text-green-800">
                              <strong>Resolved:</strong> {format(new Date(workflow.resolved_at), 'MMM d, yyyy HH:mm')}
                            </p>
                            {workflow.resolution_notes && (
                              <p className="text-sm text-green-700 mt-1">{workflow.resolution_notes}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 min-w-[200px]">
                        {/* ✅ NEW: Approve User button for pending user signups */}
                        {isPendingUserSignup(workflow) && (
                          <Button
                            size="sm"
                            onClick={() => setApproveUserWorkflow(workflow)}
                            disabled={updateWorkflowMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Approve User
                          </Button>
                        )}

                        {workflow.status === 'pending' && !isPendingUserSignup(workflow) && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(workflow.id, 'in_progress')}
                              disabled={updateWorkflowMutation.isPending}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {updateWorkflowMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                'Start Working'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedWorkflow(workflow)}
                              disabled={updateWorkflowMutation.isPending}
                            >
                              Mark Resolved
                            </Button>
                          </>
                        )}

                        {workflow.status === 'in_progress' && !isPendingUserSignup(workflow) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedWorkflow(workflow)}
                            disabled={updateWorkflowMutation.isPending}
                          >
                            Mark Resolved
                          </Button>
                        )}

                        {relatedLink && (
                          <Link to={relatedLink}>
                            <Button size="sm" variant="outline" className="w-full">
                              <Eye className="w-4 h-4 mr-2" />
                              View {workflow.related_entity.entity_type}
                            </Button>
                          </Link>
                        )}

                        {!isPendingUserSignup(workflow) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(workflow.id, 'dismissed')}
                            disabled={updateWorkflowMutation.isPending}
                            className="text-gray-600"
                          >
                            Dismiss
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ✅ NEW: Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <Card className="shadow-2xl border-2 border-blue-500 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-600 text-white text-lg px-3 py-1">
                  {selectedIds.length} Selected
                </Badge>
                <span className="text-sm font-medium text-gray-700">workflows selected for bulk action</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                  disabled={bulkResolveMutation.isPending}
                >
                  Clear
                </Button>

                <Select disabled={bulkResolveMutation.isPending} onValueChange={(val) => {
                  if (val === 'dismiss') {
                    bulkResolveMutation.mutate({ status: 'dismissed', notes: 'Bulk dismissed by admin' });
                  } else {
                    const outcome = window.confirm(`Mark ${selectedIds.length} workflows as Resolved?`) ? 'completed' : null;
                    if (outcome) {
                      bulkResolveMutation.mutate({ status: 'resolved', notes: 'Bulk resolved by admin', outcome });
                    }
                  }
                }}>
                  <SelectTrigger className="w-[180px] bg-blue-700 text-white hover:bg-blue-800 font-bold border-2 border-blue-400">
                    <SelectValue placeholder={<span className="text-white">Bulk Action</span>} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resolve">✅ Mark as Resolved</SelectItem>
                    <SelectItem value="dismiss">🚫 Bulk Dismiss</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {filteredWorkflows.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear!</h3>
            <p className="text-gray-600">No workflows match your filters. Great job!</p>
          </CardContent>
        </Card>
      )}

      {/* ✅ ENHANCED: Resolution Modal with better shift handling */}
      {selectedWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full">
            <CardHeader className="border-b">
              <CardTitle>Resolve Workflow</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{selectedWorkflow.title}</h3>
                <p className="text-sm text-gray-600">{selectedWorkflow.description}</p>
              </div>

              {/* ✅ ENHANCED: Show shift action dropdown if this is a shift-related workflow */}
              {selectedWorkflow.related_entity?.entity_type === 'shift' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shift Resolution Action *
                  </label>
                  <Select value={shiftResolutionAction} onValueChange={setShiftResolutionAction}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">✅ Shift Completed Successfully</SelectItem>
                      <SelectItem value="cancelled">❌ Shift Cancelled</SelectItem>
                      <SelectItem value="no_show">🚫 Staff No Show</SelectItem>
                      <SelectItem value="disputed">⚠️ Shift Disputed</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    ⚠️ "Completed" requires a timesheet to exist
                  </p>

                  {shiftResolutionAction === 'completed' && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-4">
                      <p className="text-xs font-bold text-blue-900 uppercase">Input Actual Shift Data</p>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Who Actually Worked?
                        </label>
                        <Select value={actualStaffId} onValueChange={setActualStaffId}>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No one worked (No Show)</SelectItem>
                            {profiles.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Actual Start</label>
                          <Input
                            type="time"
                            className="bg-white"
                            value={actualStartTime}
                            onChange={(e) => setActualStartTime(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Actual End</label>
                          <Input
                            type="time"
                            className="bg-white"
                            value={actualEndTime}
                            onChange={(e) => setActualEndTime(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Notes *
                </label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe how this issue was resolved..."
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => handleStatusChange(selectedWorkflow.id, 'resolved')}
                  disabled={!resolutionNotes || updateWorkflowMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {updateWorkflowMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    'Mark as Resolved'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedWorkflow(null);
                    setResolutionNotes('');
                    setShiftResolutionAction('completed');
                  }}
                  disabled={updateWorkflowMutation.isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ✅ NEW: Approve User Modal */}
      <ApproveUserModal
        workflow={approveUserWorkflow}
        isOpen={!!approveUserWorkflow}
        onClose={() => setApproveUserWorkflow(null)}
      />
    </div>
  );
}
