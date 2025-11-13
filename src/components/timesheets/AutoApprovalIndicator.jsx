import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Zap, Shield } from "lucide-react";

/**
 * 🤖 AUTO-APPROVAL STATUS INDICATOR
 * 
 * Shows if timesheet is eligible for auto-approval
 * Displays validation criteria visually
 * 
 * Part of: Priority 2.3 - Auto-Approval Status Display
 * Created: 2025-01-08
 */

export default function AutoApprovalIndicator({ timesheet, shift, staffMember }) {
  if (!timesheet) return null;

  // Already approved/paid
  if (timesheet.status === 'approved' || timesheet.status === 'paid') {
    // Check if it was auto-approved
    const wasAutoApproved = timesheet.notes?.includes('[AUTO-APPROVED');
    
    return (
      <div className="flex items-center gap-2">
        <Badge className={wasAutoApproved ? 'bg-green-600 text-white' : 'bg-blue-100 text-blue-800'}>
          {wasAutoApproved ? (
            <>
              <Zap className="w-3 h-3 mr-1" />
              Auto-Approved
            </>
          ) : (
            <>
              <Shield className="w-3 h-3 mr-1" />
              Manually Approved
            </>
          )}
        </Badge>
      </div>
    );
  }

  // Not yet submitted
  if (timesheet.status === 'draft') {
    return null;
  }

  // Calculate validation criteria
  const criteria = {
    signatures: timesheet.staff_signature && timesheet.client_signature,
    gps: staffMember?.gps_consent 
      ? timesheet.geofence_validated === true 
      : true, // Skip GPS check if no consent
    hours: shift ? (() => {
      const scheduledHours = shift.duration_hours || 12;
      const workedHours = timesheet.total_hours || 0;
      const diff = Math.abs(workedHours - scheduledHours);
      return diff <= 0.25; // 15 min tolerance
    })() : false
  };

  const allPassed = criteria.signatures && criteria.gps && criteria.hours;
  const passedCount = Object.values(criteria).filter(Boolean).length;

  return (
    <div className="space-y-2">
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        {allPassed ? (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Eligible for Auto-Approval
          </Badge>
        ) : (
          <Badge className="bg-orange-100 text-orange-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Manual Review Required
          </Badge>
        )}
        <span className="text-xs text-gray-600">
          {passedCount}/3 checks passed
        </span>
      </div>

      {/* Criteria Breakdown */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className={criteria.signatures ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}>
          {criteria.signatures ? '✅' : '❌'} Signatures
        </Badge>
        
        {staffMember?.gps_consent && (
          <Badge variant="outline" className={criteria.gps ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}>
            {criteria.gps ? '✅' : '❌'} GPS
          </Badge>
        )}
        
        <Badge variant="outline" className={criteria.hours ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}>
          {criteria.hours ? '✅' : '❌'} Hours
        </Badge>
      </div>
    </div>
  );
}