import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseAuth } from "@/api/supabaseAuth";
import { Shift, Staff, Client, Timesheet } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CheckCircle, XCircle, AlertTriangle, Calendar, Building2, 
  User, Phone, Search, Filter, Loader2
} from "lucide-react";
import { format, parseISO, isPast, subDays } from "date-fns";
import { toast } from "sonner";

export default function DailyShiftVerification() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedShift, setSelectedShift] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verificationOutcome, setVerificationOutcome] = useState('completed');
  const [processingShifts, setProcessingShifts] = useState(new Set());

  const queryClient = useQueryClient();

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts-for-verification'],
    queryFn: () => Shift.list('-date'),
    initialData: []
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => Staff.list(),
    initialData: []
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => Client.list(),
    initialData: []
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets'],
    queryFn: () => Timesheet.list(),
    initialData: []
  });

  const verifyShiftMutation = useMutation({
    mutationFn: async ({ shiftId, outcome, notes }) => {
      const shift = shifts.find(s => s.id === shiftId);
      
      // Update shift status
      const currentUser = await supabaseAuth.me();
      const shiftUpdate = await Shift.update(shiftId, {
        status: outcome,
        admin_closed_at: new Date().toISOString(),
        admin_closure_outcome: outcome,
        admin_closed_by: currentUser.id,
        shift_journey_log: [
          ...(shift.shift_journey_log || []),
          {
            state: outcome,
            timestamp: new Date().toISOString(),
            user_id: currentUser.id,
            notes: notes
          }
        ]
      });

      // If outcome is completed, ensure timesheet exists and is approved
      if (outcome === 'completed') {
        const relatedTimesheets = timesheets.filter(t => 
          t.booking_id === shift.booking_id || t.shift_id === shiftId
        );

        if (relatedTimesheets.length === 0) {
          toast.warning('⚠️ Shift marked complete, but no timesheet exists. Please create one.');
        } else {
          // Auto-approve timesheets for completed shifts
          for (const timesheet of relatedTimesheets) {
            if (timesheet.status !== 'approved' && timesheet.status !== 'invoiced') {
              await Timesheet.update(timesheet.id, {
                status: 'approved',
                client_approved_at: new Date().toISOString()
              });
            }
          }
        }
      }

      // If cancelled or no_show, ensure no invoice is generated
      if (outcome === 'cancelled' || outcome === 'no_show') {
        const relatedTimesheets = timesheets.filter(t => 
          t.booking_id === shift.booking_id || t.shift_id === shiftId
        );

        for (const timesheet of relatedTimesheets) {
          await Timesheet.update(timesheet.id, {
            status: 'rejected',
            rejection_reason: `Shift ${outcome}: ${notes}`
          });
        }
      }

      return shiftUpdate;
    },
    onMutate: (variables) => {
      setProcessingShifts(prev => new Set([...prev, variables.shiftId]));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts-for-verification']);
      queryClient.invalidateQueries(['timesheets']);
      queryClient.invalidateQueries(['workflows']);
      setSelectedShift(null);
      setVerificationNotes('');
      setVerificationOutcome('completed');
      toast.success('✅ Shift verified successfully!');
    },
    onError: (error, variables) => {
      toast.error(`Failed: ${error.message}`);
    },
    onSettled: (data, error, variables) => {
      setProcessingShifts(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.shiftId);
        return newSet;
      });
    }
  });

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unknown';
  };

  const getStaffPhone = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.phone || 'No phone';
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown';
  };

  const getClientPhone = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.contact_person?.phone || 'No phone';
  };

  // Filter shifts that need verification
  const shiftsNeedingVerification = shifts.filter(shift => {
    try {
      const shiftDate = parseISO(shift.date);
      const shiftEndTime = new Date(`${shift.date}T${shift.end_time}`);
      const now = new Date();

      // Only show past shifts that haven't been closed by admin
      if (!isPast(shiftEndTime)) return false;

      // Filter out already verified shifts
      if (['completed', 'cancelled', 'no_show', 'disputed'].includes(shift.status) && shift.admin_closed_at) {
        return false;
      }

      // Date filtering
      if (dateFilter === 'today') {
        return format(shiftDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      } else if (dateFilter === 'yesterday') {
        const yesterday = subDays(now, 1);
        return format(shiftDate, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd');
      } else if (dateFilter === 'last_7_days') {
        const sevenDaysAgo = subDays(now, 7);
        return shiftDate >= sevenDaysAgo && shiftDate < now;
      }

      return true; // 'all'
    } catch (error) {
      console.error('Date filtering error:', shift.date, error);
      return false;
    }
  });

  // Search filtering
  const filteredShifts = shiftsNeedingVerification.filter(shift => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const staffName = getStaffName(shift.assigned_staff_id).toLowerCase();
    const clientName = getClientName(shift.client_id).toLowerCase();
    return staffName.includes(search) || clientName.includes(search);
  });

  const handleVerifyClick = (shift) => {
    setSelectedShift(shift);
    setVerificationOutcome('completed');
    setVerificationNotes('');
  };

  const handleQuickVerify = (shiftId, outcome) => {
    const defaultNotes = {
      completed: 'Shift completed as planned - verified by phone',
      cancelled: 'Shift cancelled by client/staff',
      no_show: 'Staff did not show up for shift',
      disputed: 'Shift completion disputed - requires investigation'
    };

    verifyShiftMutation.mutate({
      shiftId,
      outcome,
      notes: defaultNotes[outcome]
    });
  };

  const handleSubmitVerification = () => {
    if (!selectedShift) return;
    if (!verificationNotes.trim()) {
      toast.error('Please add verification notes');
      return;
    }

    verifyShiftMutation.mutate({
      shiftId: selectedShift.id,
      outcome: verificationOutcome,
      notes: verificationNotes
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Daily Shift Verification</h2>
        <p className="text-gray-600 mt-1">
          Verify completed shifts and mark status for invoicing
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Awaiting Verification</p>
                <p className="text-3xl font-bold text-orange-600">{shiftsNeedingVerification.length}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-500 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-300 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Verified Today</p>
                <p className="text-3xl font-bold text-green-600">
                  {shifts.filter(s => 
                    s.admin_closed_at && 
                    format(parseISO(s.admin_closed_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                  ).length}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500 opacity-30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by staff or client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                <SelectItem value="all">All Past Shifts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Shifts List */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredShifts.map(shift => {
          const isProcessing = processingShifts.has(shift.id);
          const hasTimesheet = timesheets.some(t => 
            t.booking_id === shift.booking_id || t.shift_id === shift.id
          );

          return (
            <Card key={shift.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span className="font-semibold text-gray-900">
                        {format(parseISO(shift.date), 'EEE, MMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {shift.start_time} - {shift.end_time} • {shift.duration_hours}h
                    </p>
                  </div>
                  <Badge className={`${
                    shift.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                    shift.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {shift.status?.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{getStaffName(shift.assigned_staff_id)}</span>
                    <a 
                      href={`tel:${getStaffPhone(shift.assigned_staff_id)}`}
                      className="ml-auto text-cyan-600 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      {getStaffPhone(shift.assigned_staff_id)}
                    </a>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span>{getClientName(shift.client_id)}</span>
                    <a 
                      href={`tel:${getClientPhone(shift.client_id)}`}
                      className="ml-auto text-cyan-600 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      {getClientPhone(shift.client_id)}
                    </a>
                  </div>

                  {shift.work_location_within_site && (
                    <p className="text-xs text-gray-600 bg-cyan-50 px-2 py-1 rounded">
                      📍 {shift.work_location_within_site}
                    </p>
                  )}

                  {!hasTimesheet && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-xs text-red-700 font-semibold">
                        ⚠️ No timesheet exists for this shift
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    size="sm"
                    onClick={() => handleQuickVerify(shift.id, 'completed')}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Completed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleVerifyClick(shift)}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    More Options
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredShifts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-gray-600">No shifts need verification right now.</p>
          </CardContent>
        </Card>
      )}

      {/* Verification Modal */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <CardTitle>Verify Shift Completion</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600">Shift Date</p>
                <p className="font-semibold">{format(parseISO(selectedShift.date), 'EEE, MMM d, yyyy')}</p>
                <p className="text-sm text-gray-600 mt-2">Staff</p>
                <p className="font-semibold">{getStaffName(selectedShift.assigned_staff_id)}</p>
                <p className="text-sm text-gray-600 mt-2">Client</p>
                <p className="font-semibold">{getClientName(selectedShift.client_id)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Outcome *
                </label>
                <Select value={verificationOutcome} onValueChange={setVerificationOutcome}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">✅ Shift Completed Successfully</SelectItem>
                    <SelectItem value="cancelled">❌ Shift Cancelled</SelectItem>
                    <SelectItem value="no_show">🚫 Staff No Show</SelectItem>
                    <SelectItem value="disputed">⚠️ Disputed/Investigation Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Notes *
                </label>
                <Textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="e.g., Called staff - confirmed shift worked as planned"
                  rows={4}
                />
              </div>

              {verificationOutcome === 'completed' && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-sm text-green-800">
                    ✅ Marking as completed will auto-approve associated timesheets and make them ready for invoicing.
                  </p>
                </div>
              )}

              {(verificationOutcome === 'cancelled' || verificationOutcome === 'no_show') && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-800">
                    ⚠️ This will reject associated timesheets and prevent invoicing.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSubmitVerification}
                  disabled={!verificationNotes.trim() || verifyShiftMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {verifyShiftMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Submit Verification'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedShift(null);
                    setVerificationNotes('');
                    setVerificationOutcome('completed');
                  }}
                  disabled={verifyShiftMutation.isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}