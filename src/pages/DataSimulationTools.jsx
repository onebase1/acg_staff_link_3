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
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

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

  // Get October 2025 shifts
  const octoberShifts = shifts.filter(s => {
    if (!s.date) return false;
    const date = new Date(s.date);
    return date.getMonth() === 9 && date.getFullYear() === 2025; // October = month 9
  });

  const handleRandomizeOctoberStatuses = async () => {
    if (!window.confirm(
      `⚠️ This will randomly update statuses for ${octoberShifts.length} October shifts.\n\n` +
      `Statuses will include: completed, cancelled, disputed, no_show, etc.\n\n` +
      `Each status will have a logged reason in ChangeLog.\n\n` +
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
        ]},
        { status: 'no_show', weight: 5, reasons: [
          'Staff no-show - car breakdown reported',
          'Staff no-show - illness (no cover arranged)',
          'Staff no-show - uncontactable'
        ]},
        { status: 'awaiting_admin_closure', weight: 10, reasons: [
          'Awaiting admin verification',
          'Timesheet submitted - awaiting review',
          'Pending admin closure - unusual hours logged'
        ]}
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
 
        // Update shift status
        const shiftUpdates = {
          status: selectedOption.status,
          ...(selectedOption.status === 'completed' && {
            shift_ended_at: new Date(shift.date + 'T' + shift.end_time).toISOString(),
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
          throw changeLogError;
        }
 
        changeLogs.push({
          shift_id: shift.id,
          reason
        });
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries(['all-shifts']);
      queryClient.invalidateQueries(['shifts']);

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
        changelog_entries: changeLogs.length
      });

      toast.success(
        <div>
          <p className="font-bold">October Shifts Randomized!</p>
          <p className="text-sm">{updates.length} shifts updated with random statuses</p>
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

      {/* October Shifts Randomization */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-600" />
            October 2025 Shift Status Randomization
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

          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded border">
              <Database className="w-8 h-8 text-gray-600 mb-2" />
              <p className="text-sm text-gray-600">October Shifts</p>
              <p className="text-3xl font-bold text-gray-900">{octoberShifts.length}</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded border border-green-200">
              <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
              <p className="text-sm text-green-700">Expected Completed</p>
              <p className="text-3xl font-bold text-green-900">
                ~{Math.round(octoberShifts.length * 0.7)}
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded border border-red-200">
              <AlertCircle className="w-8 h-8 text-red-600 mb-2" />
              <p className="text-sm text-red-700">Expected Issues</p>
              <p className="text-3xl font-bold text-red-900">
                ~{Math.round(octoberShifts.length * 0.2)}
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
                Randomize October Shift Statuses
              </>
            )}
          </Button>

          {octoberShifts.length === 0 && (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-amber-800">
                No October 2025 shifts found. Import test data first.
              </AlertDescription>
            </Alert>
          )}
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

            <div className="flex gap-3">
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