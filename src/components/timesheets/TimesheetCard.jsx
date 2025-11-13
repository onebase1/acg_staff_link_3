
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User, Building2, Calendar, Clock, MapPin, ChevronDown, ChevronUp,
  CheckCircle, XCircle, AlertTriangle, FileText, ExternalLink, Loader2,
  Zap, RefreshCw, AlertCircle // Added AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import GPSIndicator, { GPSDetails } from "./GPSIndicator";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TimesheetCard({ 
  timesheet, 
  staffName, 
  clientName, 
  issues = [],
  onApprove,
  onReject,
  isAdmin = false,
  isApproving = false,
  isRejecting = false
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const { data: staff } = useQuery({
    queryKey: ['staff-for-timesheet', timesheet.staff_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('id', timesheet.staff_id)
        .single();

      if (error) {
        console.error('❌ Error fetching staff for TimesheetCard:', error);
        return null;
      }

      return data;
    },
    enabled: !!timesheet.staff_id
  });

  const getStatusConfig = (status) => {
    const configs = {
      draft: { 
        bg: 'bg-gray-50 border-gray-200', 
        badge: 'bg-gray-100 text-gray-700 border-gray-300',
        label: 'Draft' 
      },
      submitted: { 
        bg: 'bg-yellow-50 border-yellow-200', 
        badge: 'bg-yellow-100 text-yellow-700 border-gray-300',
        label: 'Pending' 
      },
      approved: { 
        bg: 'bg-green-50 border-green-200', 
        badge: 'bg-green-100 text-green-700 border-green-300',
        label: 'Approved' 
      },
      rejected: { 
        bg: 'bg-red-50 border-red-200', 
        badge: 'bg-red-100 text-red-700 border-red-300',
        label: 'Rejected' 
      },
      paid: { 
        bg: 'bg-emerald-50 border-emerald-200', 
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        label: 'Paid' 
      }
    };
    return configs[status] || configs.draft;
  };

  const statusConfig = getStatusConfig(timesheet.status);
  
  // ✅ FIX 1: Only show validation issues if shift has ended
  const shiftHasEnded = timesheet.shift_date ? new Date(timesheet.shift_date) < new Date() : false;
  const hasIssues = shiftHasEnded && issues.length > 0;

  const formatDate = (dateString, formatString) => {
    if (!dateString) {
      return 'Date Not Set';
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return format(date, formatString);
    } catch (error) {
      return 'Date Error';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${statusConfig.badge} border text-xs font-semibold`}>
              {statusConfig.label}
            </Badge>
            <GPSIndicator timesheet={timesheet} staff={staff} />
            {hasIssues && (
              <Badge className="bg-red-600 text-white text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {issues.length} issue{issues.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl('TimesheetDetail') + `?id=${timesheet.id}`)}
            className="text-blue-600 hover:text-blue-700"
          >
            View Details
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-900">{staffName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">{clientName}</span>
            </div>
            {timesheet.shift_date ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(timesheet.shift_date, 'EEE, MMM d, yyyy')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <Calendar className="w-4 h-4" />
                <span className="italic">Date not set</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {timesheet.clock_in_time ? (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>
                  {formatDate(timesheet.clock_in_time, 'HH:mm')} 
                  {timesheet.clock_out_time && ` - ${formatDate(timesheet.clock_out_time, 'HH:mm')}`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span className="italic">Not clocked in yet</span>
              </div>
            )}
            
            {timesheet.total_hours && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="font-semibold text-gray-900">{timesheet.total_hours}h worked</span>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-right">
                <p className="text-xs text-gray-600">Pay</p>
                <p className="text-lg font-bold text-gray-900">
                  £{(timesheet.staff_pay_amount || 0).toFixed(2)}
                </p>
              </div>
              {isAdmin && (
                <div className="text-right">
                  <p className="text-xs text-gray-600">Charge</p>
                  <p className="text-lg font-bold text-gray-900">
                    £{(timesheet.client_charge_amount || 0).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ✅ FIX 2: Only show issues alert if shift has ended */}
        {hasIssues && (
          <Alert className="border-red-300 bg-red-50 mb-4">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="space-y-1">
                {issues.map((issue, idx) => (
                  <div key={idx} className="text-xs text-red-800">
                    • {issue.message}
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {timesheet.rejection_reason && (
          <Alert className="border-red-300 bg-red-50 mb-4">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-sm text-red-800">
              <strong>Rejected:</strong> {timesheet.rejection_reason}
            </AlertDescription>
          </Alert>
        )}

        {timesheet.clock_in_location && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-600 hover:text-blue-700 w-full justify-center mb-2"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Hide GPS Details
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Show GPS Details
                </>
              )}
            </Button>

            {isExpanded && (
              <div className="pl-4 border-l-2 border-blue-200 mt-3">
                <GPSDetails timesheet={timesheet} />
              </div>
            )}
          </div>
        )}

        {/* ✅ FIX 3: Show Approve/Reject buttons for BOTH draft AND submitted */}
        {isAdmin && (timesheet.status === 'submitted' || timesheet.status === 'draft') && shiftHasEnded && (
          <div className="space-y-2 mt-4 pt-4 border-t">
            {issues.length === 0 && (
              <div className="p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-800 flex items-center gap-2">
                <Zap className="w-3 h-3" />
                <span>✅ Eligible for auto-approval (all checks passed)</span>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onApprove(timesheet.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isApproving}
              >
                {isApproving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(timesheet.id)}
                className="flex-1 text-red-600 border-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isRejecting}
              >
                {isRejecting ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        )}

        {/* ✅ NEW: Warning for future shifts */}
        {!shiftHasEnded && timesheet.shift_date && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Shift hasn't occurred yet</p>
                <p className="text-xs mt-1">Approval/validation will be available after {formatDate(timesheet.shift_date, 'MMM d, yyyy')}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
