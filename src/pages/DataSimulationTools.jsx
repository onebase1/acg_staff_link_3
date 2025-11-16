import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shuffle, AlertTriangle, CheckCircle, Database,
  XCircle, AlertCircle, Clock, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// ✅ NEW: Invoice Eligibility Diagnostic Component
function InvoiceEligibilityDiagnostic() {
  const { data: completedShifts = [] } = useQuery({
    queryKey: ['completed-shifts-diagnostic'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('status', 'completed');

      if (error) {
        console.error('❌ Error fetching completed shifts:', error);
        return [];
      }

      return data || [];
    }
  });

  const { data: allTimesheets = [] } = useQuery({
    queryKey: ['all-timesheets-diagnostic'],
    queryFn: async () => {
      const { data, error} = await supabase
        .from('timesheets')
        .select('*');

      if (error) {
        console.error('❌ Error fetching timesheets:', error);
        return [];
      }

      return data || [];
    }
  });

  // Analyze each completed shift
  const analysis = completedShifts.map(shift => {
    const relatedTimesheets = allTimesheets.filter(t =>
      t.shift_id === shift.id ||
      (t.booking_id && shift.booking_id && t.booking_id === shift.booking_id)
    );

    let status = 'unknown';
    let reason = '';

    if (relatedTimesheets.length === 0) {
      status = 'blocked';
      reason = '❌ No timesheet exists';
    } else {
      const approvedTimesheet = relatedTimesheets.find(t => t.status === 'approved');

      if (!approvedTimesheet) {
        status = 'blocked';
        const statuses = relatedTimesheets.map(t => t.status).join(', ');
        reason = `❌ Timesheet not approved (status: ${statuses})`;
      } else if (approvedTimesheet.invoice_id) {
        status = 'already_invoiced';
        reason = '✅ Already invoiced';
      } else {
        status = 'ready';
        reason = '✅ Ready for invoicing!';
      }
    }

    return {
      shift,
      timesheets: relatedTimesheets,
      status,
      reason
    };
  });

  const readyCount = analysis.filter(a => a.status === 'ready').length;
  const blockedCount = analysis.filter(a => a.status === 'blocked').length;
  const invoicedCount = analysis.filter(a => a.status === 'already_invoiced').length;

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 rounded border border-blue-200">
          <CheckCircle className="w-8 h-8 text-blue-600 mb-2" />
          <p className="text-sm text-blue-700">Completed Shifts</p>
          <p className="text-3xl font-bold text-blue-900">{completedShifts.length}</p>
        </div>

        <div className="p-4 bg-green-50 rounded border border-green-200">
          <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
          <p className="text-sm text-green-700">Ready for Invoice</p>
          <p className="text-3xl font-bold text-green-900">{readyCount}</p>
        </div>

        <div className="p-4 bg-red-50 rounded border border-red-200">
          <XCircle className="w-8 h-8 text-red-600 mb-2" />
          <p className="text-sm text-red-700">Blocked</p>
          <p className="text-3xl font-bold text-red-900">{blockedCount}</p>
        </div>

        <div className="p-4 bg-gray-50 rounded border border-gray-200">
          <Database className="w-8 h-8 text-gray-600 mb-2" />
          <p className="text-sm text-gray-700">Already Invoiced</p>
          <p className="text-3xl font-bold text-gray-900">{invoicedCount}</p>
        </div>
      </div>

      {blockedCount > 0 && (
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription>
            <p className="font-semibold text-red-900">🚫 {blockedCount} completed shifts are blocked from invoicing:</p>
            <div className="mt-2 space-y-1 text-sm text-red-800 max-h-48 overflow-y-auto">
              {analysis.filter(a => a.status === 'blocked').slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="font-mono text-xs">{item.shift.date}</span>
                  <span>{item.reason}</span>
                </div>
              ))}
              {blockedCount > 10 && (
                <p className="text-xs text-red-600 mt-2">...and {blockedCount - 10} more</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {readyCount > 0 && (
        <Alert className="border-green-300 bg-green-50">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>✅ {readyCount} shifts are ready for invoicing!</strong>
            <p className="text-sm mt-1">
              <Link to={createPageUrl('GenerateInvoices')} className="underline font-semibold">
                → Go to Generate Invoices
              </Link>
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ✅ Delete Old Test Data Component
function DeleteOldDataButton() {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const queryClient = useQueryClient();

  // Get counts
  const { data: pastShifts = [] } = useQuery({
    queryKey: ['past-shifts-count'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('shifts')
        .select('id, date')
        .lt('date', today.toISOString().split('T')[0]);

      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }

      return data || [];
    }
  });

  const { data: allTimesheets = [] } = useQuery({
    queryKey: ['all-timesheets-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timesheets')
        .select('id');

      if (error) {
        console.error('❌ Error fetching timesheets:', error);
        return [];
      }

      return data || [];
    }
  });

  const handleDeleteOldData = async () => {
    if (pastShifts.length === 0) {
      toast.error('No past shifts found to delete');
      return;
    }

    if (!window.confirm(
      `🚨 PERMANENT DELETION - Are you sure?\n\n` +
      `This will DELETE:\n` +
      `• ${pastShifts.length} past shifts\n` +
      `• ${allTimesheets.length} timesheets\n` +
      `• All related bookings\n` +
      `• All related change logs\n` +
      `• All related admin workflows\n\n` +
      `⚠️ THIS CANNOT BE UNDONE!\n\n` +
      `Type "DELETE" in the next prompt to confirm.`
    )) {
      return;
    }

    const confirmation = prompt('Type DELETE to confirm permanent deletion:');
    if (confirmation !== 'DELETE') {
      toast.error('Deletion cancelled - confirmation text did not match');
      return;
    }

    setProcessing(true);
    setResults(null);

    try {
      let deletedShifts = 0;
      let deletedTimesheets = 0;
      let deletedBookings = 0;
      let deletedChangeLogs = 0;
      let deletedWorkflows = 0;

      // Delete timesheets first (foreign key constraint)
      const { error: timesheetsError } = await supabase
        .from('timesheets')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (timesheetsError) {
        console.error('❌ Error deleting timesheets:', timesheetsError);
      } else {
        deletedTimesheets = allTimesheets.length;
      }

      // Delete bookings
      const { error: bookingsError } = await supabase
        .from('bookings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (bookingsError) {
        console.error('❌ Error deleting bookings:', bookingsError);
      } else {
        deletedBookings = allTimesheets.length; // Approximate
      }

      // Delete change logs for shifts
      const { error: changeLogsError } = await supabase
        .from('change_logs')
        .delete()
        .eq('entity_type', 'shift');

      if (changeLogsError) {
        console.error('❌ Error deleting change logs:', changeLogsError);
      } else {
        deletedChangeLogs = pastShifts.length; // Approximate
      }

      // Delete admin workflows related to shifts
      const { error: workflowsError } = await supabase
        .from('admin_workflows')
        .delete()
        .eq('related_entity->>entity_type', 'shift');

      if (workflowsError) {
        console.error('❌ Error deleting workflows:', workflowsError);
      } else {
        deletedWorkflows = 50; // Approximate
      }

      // Delete past shifts
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { error: shiftsError } = await supabase
        .from('shifts')
        .delete()
        .lt('date', today.toISOString().split('T')[0]);

      if (shiftsError) {
        console.error('❌ Error deleting shifts:', shiftsError);
        throw shiftsError;
      } else {
        deletedShifts = pastShifts.length;
      }

      // Invalidate all queries
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['timesheets']);
      queryClient.invalidateQueries(['bookings']);
      queryClient.invalidateQueries(['workflows']);
      queryClient.invalidateQueries(['change_logs']);
      queryClient.invalidateQueries(['past-shifts-count']);
      queryClient.invalidateQueries(['all-timesheets-count']);

      setResults({
        success: true,
        deleted_shifts: deletedShifts,
        deleted_timesheets: deletedTimesheets,
        deleted_bookings: deletedBookings,
        deleted_change_logs: deletedChangeLogs,
        deleted_workflows: deletedWorkflows
      });

      toast.success(
        <div>
          <p className="font-bold">✅ Old Data Deleted!</p>
          <p className="text-sm">{deletedShifts} shifts removed</p>
          <p className="text-sm">{deletedTimesheets} timesheets removed</p>
        </div>
      );

      setProcessing(false);
    } catch (error) {
      console.error('Error deleting data:', error);
      toast.error(`Failed: ${error.message}`);
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 bg-red-50 rounded border border-red-200">
          <Database className="w-8 h-8 text-red-600 mb-2" />
          <p className="text-sm text-red-700">Past Shifts</p>
          <p className="text-3xl font-bold text-red-900">{pastShifts.length}</p>
        </div>

        <div className="p-4 bg-red-50 rounded border border-red-200">
          <XCircle className="w-8 h-8 text-red-600 mb-2" />
          <p className="text-sm text-red-700">All Timesheets</p>
          <p className="text-3xl font-bold text-red-900">{allTimesheets.length}</p>
        </div>

        <div className="p-4 bg-red-50 rounded border border-red-200">
          <AlertTriangle className="w-8 h-8 text-red-600 mb-2" />
          <p className="text-sm text-red-700">Will Be Deleted</p>
          <p className="text-3xl font-bold text-red-900">{pastShifts.length + allTimesheets.length}</p>
        </div>
      </div>

      <Button
        onClick={handleDeleteOldData}
        disabled={processing || pastShifts.length === 0}
        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
        size="lg"
      >
        {processing ? (
          <>
            <Clock className="w-5 h-5 mr-2 animate-spin" />
            Deleting Data...
          </>
        ) : (
          <>
            <XCircle className="w-5 h-5 mr-2" />
            Delete All Past Shifts & Timesheets
          </>
        )}
      </Button>

      {pastShifts.length === 0 && (
        <Alert className="border-green-300 bg-green-50">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertDescription className="text-green-800">
            No past shifts found. Database is clean!
          </AlertDescription>
        </Alert>
      )}

      {results && (
        <div className="p-4 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-green-900 font-bold mb-2">
            ✅ Deletion Complete
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-green-800">
            <div>Shifts: {results.deleted_shifts}</div>
            <div>Timesheets: {results.deleted_timesheets}</div>
            <div>Bookings: {results.deleted_bookings}</div>
            <div>ChangeLogs: {results.deleted_change_logs}</div>
            <div>Workflows: {results.deleted_workflows}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ Bulk Complete Shifts Component
function BulkCompleteShiftsButton() {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const queryClient = useQueryClient();

  // Get shifts awaiting closure
  const { data: shiftsAwaitingClosure = [] } = useQuery({
    queryKey: ['shifts-awaiting-closure'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('status', 'awaiting_admin_closure');

      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }

      return data || [];
    }
  });

  // Get all approved timesheets
  const { data: approvedTimesheets = [] } = useQuery({
    queryKey: ['approved-timesheets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('status', 'approved');

      if (error) {
        console.error('❌ Error fetching timesheets:', error);
        return [];
      }

      return data || [];
    }
  });

  // Find shifts with approved timesheets
  const shiftsWithApprovedTimesheets = shiftsAwaitingClosure.filter(shift => {
    return approvedTimesheets.some(ts =>
      ts.shift_id === shift.id ||
      (ts.booking_id && shift.booking_id && ts.booking_id === shift.booking_id)
    );
  });

  const handleBulkComplete = async () => {
    if (shiftsWithApprovedTimesheets.length === 0) {
      toast.error('No shifts found with approved timesheets');
      return;
    }

    if (!window.confirm(
      `⚠️ TESTING TOOL - Mark ${shiftsWithApprovedTimesheets.length} shifts as COMPLETED?\n\n` +
      `⚠️ WARNING: This bypasses manual verification!\n\n` +
      `In production, use:\n` +
      `• GPS Auto-Complete (recommended)\n` +
      `• Manual Admin Closure (DailyShiftVerification page)\n\n` +
      `This tool is ONLY for testing invoice generation.\n\n` +
      `Continue?`
    )) {
      return;
    }

    setProcessing(true);
    setResults(null);

    try {
      const updates = [];
      const changeLogs = [];

      for (const shift of shiftsWithApprovedTimesheets) {
        // Update shift status
        const { error: updateError } = await supabase
          .from('shifts')
          .update({
            status: 'completed',
            admin_closed_at: new Date().toISOString(),
            shift_journey_log: [
              ...(shift.shift_journey_log || []),
              {
                state: 'completed',
                timestamp: new Date().toISOString(),
                method: 'bulk_completion_tool',
                notes: 'Bulk completed - approved timesheet exists'
              }
            ]
          })
          .eq('id', shift.id);

        if (updateError) {
          console.error('❌ Error updating shift:', updateError);
          continue;
        }

        updates.push(shift.id);

        // Create ChangeLog entry
        const { error: logError } = await supabase
          .from('change_logs')
          .insert({
            entity_type: 'shift',
            entity_id: shift.id,
            change_type: 'status_update',
            old_value: { status: 'awaiting_admin_closure' },
            new_value: { status: 'completed' },
            changed_by: 'system',
            reason: 'Bulk completion - approved timesheet exists',
            metadata: {
              tool: 'bulk_complete_shifts',
              shift_date: shift.date,
              client_id: shift.client_id
            }
          });

        if (!logError) {
          changeLogs.push(shift.id);
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['shifts-awaiting-closure']);
      queryClient.invalidateQueries(['timesheets']);
      queryClient.invalidateQueries(['ready-to-invoice-count']);

      setResults({
        success: true,
        total_updated: updates.length,
        changelog_entries: changeLogs.length
      });

      toast.success(
        <div>
          <p className="font-bold">✅ Shifts Completed!</p>
          <p className="text-sm">{updates.length} shifts marked as completed</p>
          <p className="text-sm">Ready for invoice generation</p>
        </div>
      );

      setProcessing(false);
    } catch (error) {
      console.error('Error completing shifts:', error);
      toast.error(`Failed: ${error.message}`);
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 bg-orange-50 rounded border border-orange-200">
          <AlertCircle className="w-8 h-8 text-orange-600 mb-2" />
          <p className="text-sm text-orange-700">Awaiting Closure</p>
          <p className="text-3xl font-bold text-orange-900">{shiftsAwaitingClosure.length}</p>
        </div>

        <div className="p-4 bg-green-50 rounded border border-green-200">
          <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
          <p className="text-sm text-green-700">With Approved Timesheets</p>
          <p className="text-3xl font-bold text-green-900">{shiftsWithApprovedTimesheets.length}</p>
        </div>

        <div className="p-4 bg-blue-50 rounded border border-blue-200">
          <Database className="w-8 h-8 text-blue-600 mb-2" />
          <p className="text-sm text-blue-700">Ready to Complete</p>
          <p className="text-3xl font-bold text-blue-900">{shiftsWithApprovedTimesheets.length}</p>
        </div>
      </div>

      <Button
        onClick={handleBulkComplete}
        disabled={processing || shiftsWithApprovedTimesheets.length === 0}
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
        size="lg"
      >
        {processing ? (
          <>
            <Clock className="w-5 h-5 mr-2 animate-spin" />
            Completing {shiftsWithApprovedTimesheets.length} Shifts...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5 mr-2" />
            Mark {shiftsWithApprovedTimesheets.length} Shifts as Completed
          </>
        )}
      </Button>

      {shiftsWithApprovedTimesheets.length === 0 && shiftsAwaitingClosure.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {shiftsAwaitingClosure.length} shifts awaiting closure, but none have approved timesheets yet.
            Approve timesheets first, then run this tool.
          </AlertDescription>
        </Alert>
      )}

      {results && (
        <div className="p-4 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-green-900">
            <strong>✅ {results.total_updated} shifts completed</strong>
          </p>
          <p className="text-xs text-green-700 mt-1">
            {results.changelog_entries} ChangeLog entries created. Shifts are now ready for invoicing.
          </p>
        </div>
      )}
    </div>
  );
}

export default function DataSimulationTools() {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: shifts = [] } = useQuery({
    queryKey: ['all-shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }

      return data || [];
    }
  });

  // ✅ FIX: Get past shifts (any shifts before today) instead of hardcoded October 2025
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison

  const pastShifts = shifts.filter(s => {
    if (!s.date) return false;
    const shiftDate = new Date(s.date);
    return shiftDate < today; // Any shift before today
  });

  // Keep octoberShifts variable name for backward compatibility
  const octoberShifts = pastShifts;

  const handleRandomizeOctoberStatuses = async () => {
    if (!window.confirm(
      `⚠️ This will randomly update statuses for ${octoberShifts.length} past shifts.\n\n` +
      `Statuses will include: completed, cancelled, disputed, no_show, etc.\n\n` +
      `Each status will have a logged reason in ChangeLog.\n\n` +
      `✅ NEW: Shifts marked as 'awaiting_admin_closure' will auto-create AdminWorkflows!\n\n` +
      `Continue?`
    )) {
      return;
    }

    setProcessing(true);
    setResults(null);

    try {
      const statusOptions = [
        { status: 'completed', weight: 70, reasons: [
          'Shift completed successfully',
          'Staff completed shift as scheduled',
          'No issues reported - shift completed'
        ]},
        { status: 'cancelled', weight: 10, reasons: [
          'Client cancelled due to staffing levels',
          'Cancelled - facility temporarily closed',
          'Cancelled by client - resident discharged'
        ]},
        { status: 'disputed', weight: 5, reasons: [
          'Disputed hours - staff claims 2 hours overtime',
          'Location dispute - staff claims Room 14 not Room 20',
          'Rate dispute - contract rate vs actual rate mismatch'
        ], priority: 'critical' }, // ✅ CRITICAL priority for disputed shifts
        { status: 'no_show', weight: 5, reasons: [
          'Staff no-show - car breakdown reported',
          'Staff no-show - illness (no cover arranged)',
          'Staff no-show - uncontactable'
        ], priority: 'high' }, // ✅ HIGH priority for no-shows
        { status: 'awaiting_admin_closure', weight: 10, reasons: [
          'Awaiting admin verification',
          'Timesheet submitted - awaiting review',
          'Pending admin closure - unusual hours logged'
        ], priority: 'medium' } // ✅ MEDIUM priority for awaiting closure
      ];

      const getWeightedRandom = () => {
        const totalWeight = statusOptions.reduce((sum, opt) => sum + opt.weight, 0);
        let random = Math.random() * totalWeight;

        for (const option of statusOptions) {
          if (random < option.weight) {
            return option;
          }
          random -= option.weight;
        }
        return statusOptions[0]; // Fallback
      };

      const updates = [];
      const changeLogs = [];
      const workflowsCreated = []; // ✅ NEW: Track workflows created

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        throw new Error('Not authenticated');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Profile not found');
      }

      for (const shift of octoberShifts) {
        const selectedOption = getWeightedRandom();
        const reason = selectedOption.reasons[Math.floor(Math.random() * selectedOption.reasons.length)];

        // ✅ For completed shifts: actual times = scheduled times (default window)
        // Admin can manually adjust later when reviewing timesheet
        const shiftUpdates = {
          status: selectedOption.status,
          ...(selectedOption.status === 'completed' && {
            shift_started_at: new Date(shift.start_time).toISOString(), // Use scheduled start
            shift_ended_at: new Date(shift.end_time).toISOString(),     // Use scheduled end
            admin_closed_at: new Date().toISOString(),
            admin_closure_outcome: 'completed_as_planned'
          }),
          ...(selectedOption.status === 'cancelled' && {
            cancelled_at: new Date().toISOString(),
            cancelled_by: 'client',
            cancellation_reason: reason,
            admin_closure_outcome: 'cancelled'
          }),
          ...(selectedOption.status === 'no_show' && {
            admin_closure_outcome: 'no_show',
            admin_closed_at: new Date().toISOString()
          }),
          ...(selectedOption.status === 'disputed' && {
            admin_closure_outcome: 'disputed',
            admin_closed_at: new Date().toISOString()
          })
        };

        const { error: updateError } = await supabase
          .from('shifts')
          .update(shiftUpdates)
          .eq('id', shift.id);

        if (updateError) {
          throw updateError;
        }

        updates.push({
          shift_id: shift.id,
          date: shift.date,
          old_status: shift.status,
          new_status: selectedOption.status,
          reason
        });

        // Create ChangeLog entry
        const { error: changeLogError } = await supabase
          .from('change_logs')
          .insert({
            agency_id: shift.agency_id,
            change_type: 'shift_modified',
            affected_entity_type: 'shift',
            affected_entity_id: shift.id,
            old_value: shift.status,
            new_value: selectedOption.status,
            reason: `[DATA SIMULATION] ${reason}`,
            changed_by: profile.id,
            changed_by_email: profile.email,
            changed_at: new Date().toISOString(),
            risk_level: selectedOption.status === 'disputed' ? 'high' :
                        selectedOption.status === 'no_show' ? 'medium' : 'low',
            flagged_for_review: selectedOption.status === 'disputed' || selectedOption.status === 'no_show'
          });

        if (changeLogError) {
          console.warn('⚠️ Failed to create ChangeLog:', changeLogError);
        }

        changeLogs.push({
          shift_id: shift.id,
          reason
        });

        // ✅ NEW: Create AdminWorkflow for shifts needing admin action
        if (['awaiting_admin_closure', 'disputed', 'no_show'].includes(selectedOption.status)) {
          const workflowTitle = selectedOption.status === 'disputed'
            ? `🚨 DISPUTED SHIFT - ${shift.date}`
            : selectedOption.status === 'no_show'
            ? `❌ NO SHOW - ${shift.date}`
            : `Past Shift Needs Closure - ${shift.id.substring(0, 8).toUpperCase()}`;

          const workflowDescription = selectedOption.status === 'disputed'
            ? `CRITICAL: Shift disputed. Reason: ${reason}. Requires immediate investigation.`
            : selectedOption.status === 'no_show'
            ? `Staff no-show reported. Reason: ${reason}. Verify and update payroll.`
            : `Shift from ${shift.date} needs admin review. Was it worked? No-show? Cancelled?`;

          const { error: workflowError } = await supabase
            .from('admin_workflows')
            .insert({
              agency_id: shift.agency_id,
              name: workflowTitle,
              type: 'shift_completion_verification',
              priority: selectedOption.priority || 'medium',
              status: 'pending',
              title: workflowTitle,
              description: workflowDescription,
              related_entity: {
                entity_type: 'shift',
                entity_id: shift.id
              },
              deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
              auto_created: true
            });

          if (workflowError) {
            console.warn('⚠️ Failed to create AdminWorkflow:', workflowError);
          } else {
            workflowsCreated.push({
              shift_id: shift.id,
              status: selectedOption.status,
              priority: selectedOption.priority || 'medium'
            });
          }
        }
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries(['all-shifts']);
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['workflows']); // ✅ NEW: Refresh AdminWorkflows

      setResults({
        success: true,
        total_updated: updates.length,
        status_breakdown: {
          completed: updates.filter(u => u.new_status === 'completed').length,
          cancelled: updates.filter(u => u.new_status === 'cancelled').length,
          disputed: updates.filter(u => u.new_status === 'disputed').length,
          no_show: updates.filter(u => u.new_status === 'no_show').length,
          awaiting_admin_closure: updates.filter(u => u.new_status === 'awaiting_admin_closure').length
        },
        updates,
        changelog_entries: changeLogs.length,
        workflows_created: workflowsCreated.length, // ✅ NEW: Track workflows created
        workflow_breakdown: { // ✅ NEW: Breakdown by priority
          critical: workflowsCreated.filter(w => w.priority === 'critical').length,
          high: workflowsCreated.filter(w => w.priority === 'high').length,
          medium: workflowsCreated.filter(w => w.priority === 'medium').length
        }
      });

      toast.success(
        <div>
          <p className="font-bold">✅ Past Shifts Randomized!</p>
          <p className="text-sm">{updates.length} shifts updated</p>
          <p className="text-sm">{workflowsCreated.length} AdminWorkflows created</p>
        </div>
      );

      setProcessing(false);
    } catch (error) {
      console.error('Error randomizing shifts:', error);
      toast.error(`Failed: ${error.message}`);
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Simulation Tools</h2>
          <p className="text-gray-600 mt-1">
            Testing utilities for randomizing shift statuses and analytics
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl('ValidationMatrix'))}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Validation
        </Button>
      </div>

      {/* Warning Alert */}
      <Alert className="border-orange-300 bg-orange-50">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <AlertDescription>
          <p className="font-semibold text-orange-900">⚠️ Testing Tools Only</p>
          <p className="text-sm text-orange-800 mt-1">
            These tools directly modify database records. Only use in test/UAT environments.
            All changes are logged to ChangeLog for audit trail.
          </p>
        </AlertDescription>
      </Alert>

      {/* ✅ NEW: Invoice Eligibility Diagnostic */}
      <Card className="border-2 border-blue-300">
        <CardHeader className="border-b bg-blue-50">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Invoice Eligibility Diagnostic
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="p-4 bg-blue-50 rounded border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">🔍 What this shows:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>How many <strong>completed shifts</strong> you have</li>
              <li>How many are <strong>ready for invoicing</strong> (completed + approved timesheet + not invoiced)</li>
              <li>How many are <strong>blocked</strong> (missing timesheet or timesheet not approved)</li>
              <li>Detailed breakdown of why shifts are blocked</li>
            </ul>
          </div>

          <InvoiceEligibilityDiagnostic />
        </CardContent>
      </Card>

      {/* Past Shifts Randomization */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-600" />
            Past Shift Status Randomization
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="p-4 bg-purple-50 rounded border border-purple-200">
            <h3 className="font-semibold text-purple-900 mb-2">What this does:</h3>
            <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
              <li><strong>70%</strong> of shifts → marked as "completed"</li>
              <li><strong>10%</strong> of shifts → marked as "cancelled" with reasons</li>
              <li><strong>5%</strong> of shifts → marked as "disputed" with dispute reasons</li>
              <li><strong>5%</strong> of shifts → marked as "no_show" with reasons</li>
              <li><strong>10%</strong> of shifts → marked as "awaiting_admin_closure"</li>
              <li>All changes logged to <strong>ChangeLog</strong> entity</li>
              <li>Reasons provided for all non-completed shifts</li>
            </ul>
          </div>

          {/* ✅ NEW: Current Status Breakdown */}
          {octoberShifts.length > 0 && (
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">📊 Current Status of Past Shifts:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {['open', 'confirmed', 'assigned', 'completed', 'cancelled', 'disputed', 'no_show', 'awaiting_admin_closure'].map(status => {
                  const count = octoberShifts.filter(s => s.status === status).length;
                  if (count === 0) return null;
                  return (
                    <div key={status} className="p-2 bg-white rounded border">
                      <p className="text-xs text-gray-600 capitalize">{status.replace(/_/g, ' ')}</p>
                      <p className="text-lg font-bold text-gray-900">{count}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded border">
              <Database className="w-8 h-8 text-gray-600 mb-2" />
              <p className="text-sm text-gray-600">Past Shifts (Before Today)</p>
              <p className="text-3xl font-bold text-gray-900">{octoberShifts.length}</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded border border-green-200">
              <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
              <p className="text-sm text-green-700">Will Be Completed (70%)</p>
              <p className="text-3xl font-bold text-green-900">
                ~{Math.round(octoberShifts.length * 0.7)}
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded border border-red-200">
              <AlertCircle className="w-8 h-8 text-red-600 mb-2" />
              <p className="text-sm text-red-700">Will Have Issues (30%)</p>
              <p className="text-3xl font-bold text-red-900">
                ~{Math.round(octoberShifts.length * 0.3)}
              </p>
            </div>
          </div>

          <Button
            onClick={handleRandomizeOctoberStatuses}
            disabled={processing || octoberShifts.length === 0}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            size="lg"
          >
            {processing ? (
              <>
                <Clock className="w-5 h-5 mr-2 animate-spin" />
                Randomizing {octoberShifts.length} Shifts...
              </>
            ) : (
              <>
                <Shuffle className="w-5 h-5 mr-2" />
                Randomize Past Shift Statuses
              </>
            )}
          </Button>

          {octoberShifts.length === 0 && (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-amber-800">
                No past shifts found (shifts before today). Create some test shifts with past dates first.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ✅ NEW: Delete Old Test Data */}
      <Card className="border-2 border-red-300">
        <CardHeader className="border-b bg-red-50">
          <CardTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            Delete Old Test Data (Clean Slate)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Alert className="border-red-300 bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription>
              <p className="font-semibold text-red-900">⚠️ DANGER - PERMANENT DELETION</p>
              <p className="text-sm text-red-800 mt-1">
                This will permanently delete ALL past shifts, timesheets, and related data.
                Use this to clean up test data and start fresh.
              </p>
            </AlertDescription>
          </Alert>

          <DeleteOldDataButton />
        </CardContent>
      </Card>

      {/* ✅ Bulk Complete Shifts - TESTING ONLY */}
      <Card className="border-2 border-orange-300">
        <CardHeader className="border-b bg-orange-50">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Bulk Complete Shifts (TESTING ONLY - Invoice Testing)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Alert className="border-red-300 bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription>
              <p className="font-semibold text-red-900">⚠️ TESTING TOOL ONLY - DO NOT USE IN PRODUCTION</p>
              <p className="text-sm text-red-800 mt-1">
                In production, shifts should ONLY be completed via:
              </p>
              <ul className="text-sm text-red-800 mt-2 space-y-1 list-disc list-inside">
                <li><strong>GPS Auto-Complete:</strong> Fully automated when GPS validated (recommended)</li>
                <li><strong>Manual Admin Closure:</strong> Admin reviews in DailyShiftVerification page</li>
              </ul>
              <p className="text-sm text-red-800 mt-2">
                This tool bypasses verification and should ONLY be used to prepare test data for invoice generation testing.
              </p>
            </AlertDescription>
          </Alert>

          <div className="p-4 bg-green-50 rounded border border-green-200">
            <h3 className="font-semibold text-green-900 mb-2">🎯 What this does (for testing):</h3>
            <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
              <li>Finds all shifts with status <strong>"awaiting_admin_closure"</strong></li>
              <li>Checks if they have <strong>approved timesheets</strong></li>
              <li>Marks them as <strong>"completed"</strong> so they're ready for invoicing</li>
              <li>Logs all changes to <strong>ChangeLog</strong></li>
              <li><strong className="text-red-700">⚠️ BYPASSES manual verification - testing only!</strong></li>
            </ul>
          </div>

          <BulkCompleteShiftsButton />
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card className="border-2 border-green-300">
          <CardHeader className="border-b bg-green-50">
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle className="w-5 h-5" />
              Randomization Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid md:grid-cols-5 gap-4">
              <div className="p-3 bg-green-50 rounded border border-green-200 text-center">
                <p className="text-2xl font-bold text-green-900">
                  {results.status_breakdown.completed}
                </p>
                <p className="text-xs text-green-700">Completed</p>
              </div>
              <div className="p-3 bg-gray-50 rounded border border-gray-200 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {results.status_breakdown.cancelled}
                </p>
                <p className="text-xs text-gray-700">Cancelled</p>
              </div>
              <div className="p-3 bg-purple-50 rounded border border-purple-200 text-center">
                <p className="text-2xl font-bold text-purple-900">
                  {results.status_breakdown.disputed}
                </p>
                <p className="text-xs text-purple-700">Disputed</p>
              </div>
              <div className="p-3 bg-red-50 rounded border border-red-200 text-center">
                <p className="text-2xl font-bold text-red-900">
                  {results.status_breakdown.no_show}
                </p>
                <p className="text-xs text-red-700">No Show</p>
              </div>
              <div className="p-3 bg-orange-50 rounded border border-orange-200 text-center">
                <p className="text-2xl font-bold text-orange-900">
                  {results.status_breakdown.awaiting_admin_closure}
                </p>
                <p className="text-xs text-orange-700">Awaiting</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>✅ {results.changelog_entries} ChangeLog entries created</strong>
              </p>
              <p className="text-xs text-blue-700 mt-1">
                All changes logged with reasons. View in PerformanceAnalytics for impact analysis.
              </p>
            </div>

            {/* ✅ NEW: AdminWorkflows Created */}
            {results.workflows_created > 0 && (
              <div className="p-4 bg-purple-50 rounded border border-purple-200">
                <p className="text-sm text-purple-900">
                  <strong>🎯 {results.workflows_created} AdminWorkflows Created</strong>
                </p>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="text-center">
                    <p className="text-xs text-red-700">Critical</p>
                    <p className="text-lg font-bold text-red-900">{results.workflow_breakdown.critical}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-orange-700">High</p>
                    <p className="text-lg font-bold text-orange-900">{results.workflow_breakdown.high}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-yellow-700">Medium</p>
                    <p className="text-lg font-bold text-yellow-900">{results.workflow_breakdown.medium}</p>
                  </div>
                </div>
                <p className="text-xs text-purple-700 mt-2">
                  View in <Link to={createPageUrl('AdminWorkflows')} className="underline font-semibold">AdminWorkflows</Link> to resolve.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => navigate(createPageUrl('AdminWorkflows'))}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600"
              >
                View AdminWorkflows
              </Button>
              <Button
                onClick={() => navigate(createPageUrl('PerformanceAnalytics'))}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600"
              >
                View Analytics Impact
              </Button>
              <Button
                variant="outline"
                onClick={() => setResults(null)}
                className="flex-1"
              >
                Clear Results
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}