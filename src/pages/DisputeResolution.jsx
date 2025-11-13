import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield, AlertTriangle, FileText, Download, Eye, CheckCircle,
  Mail, Clock, MapPin, User, Building2, Calendar
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function DisputeResolution() {
  const [selectedShift, setSelectedShift] = useState(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts-disputed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .in('status', ['disputed', 'completed', 'no_show'])
        .order('date', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return [];
      }
      return data || [];
    },
    enabled: true,
    refetchOnMount: 'always'
  });

  const { data: changeLogs = [] } = useQuery({
    queryKey: ['change-logs-verification'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_logs')
        .select('*')
        .eq('change_type', 'shift_verification_email');
      
      if (error) {
        console.error('❌ Error fetching change logs:', error);
        return [];
      }
      return data || [];
    },
    enabled: true,
    refetchOnMount: 'always'
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*');
      
      if (error) {
        console.error('❌ Error fetching staff:', error);
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

  const getShiftAuditTrail = (shiftId) => {
    return changeLogs.filter(log => log.affected_entity_id === shiftId)
      .sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unknown';
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown';
  };

  const getTimesheetForShift = (shiftId) => {
    return timesheets.find(t => t.booking_id === shiftId);
  };

  const generateEvidencePDF = async (shift) => {
    toast.info('📄 Generating evidence PDF... (Feature coming soon)');
    
    // TODO: Implement PDF generation with:
    // - All email confirmations
    // - GPS clock-in/out data
    // - Timesheet with signatures
    // - Full audit trail
    // - Timestamped evidence chain
  };

  const handleViewAuditTrail = (shift) => {
    setSelectedShift(shift);
    setShowAuditTrail(true);
  };

  const stats = {
    total: shifts.length,
    disputed: shifts.filter(s => s.status === 'disputed').length,
    completed: shifts.filter(s => s.status === 'completed').length,
    noShow: shifts.filter(s => s.status === 'no_show').length,
    withEvidence: shifts.filter(s => getShiftAuditTrail(s.id).length > 0).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dispute Resolution Center</h2>
          <p className="text-gray-600 mt-1">
            Manage shift disputes with full email audit trails and GPS evidence
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export All Evidence
        </Button>
      </div>

      {/* Anti-Dispute Protection Notice */}
      <Alert className="border-green-300 bg-green-50">
        <Shield className="h-5 w-5 text-green-600" />
        <AlertDescription className="text-green-900">
          <strong>🛡️ Protected by Verification Chain:</strong> Every shift has an automated email audit trail sent to care homes at each stage. 
          This irrefutable evidence prevents the common disputes that cost agencies thousands in unpaid invoices.
        </AlertDescription>
      </Alert>

      {/* Stats Dashboard */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-gray-600">Total Shifts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-red-700 font-medium">Disputed</p>
              <p className="text-2xl font-bold text-red-600">{stats.disputed}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-green-700 font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-orange-700 font-medium">No Show</p>
              <p className="text-2xl font-bold text-orange-600">{stats.noShow}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-300 bg-blue-50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-blue-700 font-medium">With Evidence</p>
              <p className="text-2xl font-bold text-blue-600">{stats.withEvidence}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shifts List */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Shifts Requiring Review</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {shifts.map(shift => {
              const auditTrail = getShiftAuditTrail(shift.id);
              const timesheet = getTimesheetForShift(shift.id);
              const hasEvidence = auditTrail.length > 0;

              return (
                <div key={shift.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge className={
                          shift.status === 'disputed' ? 'bg-red-600 text-white' :
                          shift.status === 'no_show' ? 'bg-orange-600 text-white' :
                          'bg-green-600 text-white'
                        }>
                          {shift.status?.replace('_', ' ')}
                        </Badge>
                        {hasEvidence && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                            <Shield className="w-3 h-3 mr-1" />
                            {auditTrail.length} email confirmations
                          </Badge>
                        )}
                        {timesheet?.geofence_validated && (
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            <MapPin className="w-3 h-3 mr-1" />
                            GPS Verified
                          </Badge>
                        )}
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{getClientName(shift.client_id)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{getStaffName(shift.assigned_staff_id)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{format(new Date(shift.date), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{shift.start_time} - {shift.end_time}</span>
                        </div>
                      </div>

                      {!hasEvidence && (
                        <Alert className="border-amber-300 bg-amber-50">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-amber-900 text-sm">
                            <strong>⚠️ No email audit trail found.</strong> This shift was created before the Verification Chain was enabled. 
                            Evidence may be limited.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <Button 
                        size="sm"
                        onClick={() => handleViewAuditTrail(shift)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Audit Trail ({auditTrail.length})
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => generateEvidencePDF(shift)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Generate Evidence PDF
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {shifts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Disputes!</h3>
            <p className="text-gray-600">
              The Verification Chain is protecting your revenue. Keep it up!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail Modal */}
      {showAuditTrail && selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-6">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b sticky top-0 bg-white z-10">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Email Audit Trail</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Shift: {getClientName(selectedShift.client_id)} - {format(new Date(selectedShift.date), 'MMM d, yyyy')}
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setShowAuditTrail(false)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {getShiftAuditTrail(selectedShift.id).map((log, idx) => (
                  <div key={log.id} className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-blue-600 mt-1" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{log.reason}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {format(new Date(log.changed_at), 'MMM d, yyyy HH:mm:ss')}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Sent to:</strong> {log.new_value}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Trigger: {log.old_value}
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                ))}

                {getShiftAuditTrail(selectedShift.id).length === 0 && (
                  <Alert className="border-amber-300 bg-amber-50">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <AlertDescription className="text-amber-900">
                      No email audit trail found for this shift. This may have been created before the Verification Chain was enabled.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}