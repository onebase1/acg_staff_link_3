import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  Clock,
  Calendar,
  User,
  Building2,
  Coffee,
} from 'lucide-react';

/**
 * 🔍 CONFIRM OCR MODAL
 *
 * WhatsApp-style confirmation workflow for web timesheet uploads.
 * Shows extracted OCR data for staff to review and approve/reject.
 *
 * Features:
 * - Visual confidence score indicator
 * - Mismatch highlighting
 * - Multi-row timesheet support
 * - Auto-approval logic guidance
 * - Re-upload option
 */
export default function ConfirmOCRModal({
  isOpen,
  onClose,
  extractedData,
  expectedData,
  onConfirm,
  onReject,
  onReUpload,
  confirming = false,
  rejecting = false,
}) {
  if (!extractedData) return null;

  const [staffNote, setStaffNote] = useState('');

  const confidence = extractedData.confidence?.overall || 0;
  const hasHighConfidence = confidence >= 80;
  const hasLowConfidence = confidence < 60;
  const hasMediumConfidence = confidence >= 60 && confidence < 80;

  const canAutoApprove = (
    hasHighConfidence &&
    extractedData.validation_status === 'match' &&
    !extractedData.mismatches?.some(m => m.severity === 'critical')
  );

  // Get confidence color and label
  const getConfidenceColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (score) => {
    if (score >= 80) return 'High Confidence';
    if (score >= 60) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const getConfidenceBadge = (score) => {
    if (score >= 80) return 'bg-green-50 text-green-700 border-green-200';
    if (score >= 60) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  // Multi-row detection
  const hasMultipleRows = extractedData.rows && extractedData.rows.length > 1;
  const matchedRow = extractedData.matched_row_info;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            🔍 Review Extracted Data
          </DialogTitle>
          <DialogDescription>
            Please verify the information extracted from your timesheet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Confidence Score */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">OCR Confidence</span>
              <Badge className={getConfidenceBadge(confidence)}>
                {getConfidenceLabel(confidence)}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${getConfidenceColor(confidence)} transition-all`}
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <span className="text-lg font-bold text-gray-900">{confidence}%</span>
            </div>
          </div>

          {/* Low Confidence Warning */}
          {hasLowConfidence && (
            <Alert className="bg-red-50 border-red-300">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <AlertDescription className="text-red-900">
                <p className="font-bold mb-1">Low Confidence Detected</p>
                <p className="text-sm">
                  The document quality is poor. We recommend re-uploading a clearer photo for better accuracy.
                  You can still confirm, but the timesheet will be sent to admin for manual review.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Auto-Approval Notice */}
          {canAutoApprove && (
            <Alert className="bg-green-50 border-green-300">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <AlertDescription className="text-green-900">
                <p className="font-bold">✅ Ready for Auto-Approval</p>
                <p className="text-sm">
                  High confidence and no critical issues detected.
                  If you confirm, this timesheet will be automatically approved!
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Extracted Data Fields */}
          <div className="space-y-3 border rounded-lg p-4 bg-white">
            <h3 className="font-semibold text-gray-900 mb-3">Extracted Information</h3>

            {/* Employee Name */}
            <DataField
              icon={<User className="w-5 h-5" />}
              label="Employee"
              value={extractedData.employee_name}
              expected={expectedData?.staff_name}
              mismatch={extractedData.mismatches?.find(m => m.field === 'staff_name')}
            />

            {/* Client Name */}
            <DataField
              icon={<Building2 className="w-5 h-5" />}
              label="Client"
              value={extractedData.client_name}
              expected={expectedData?.client_name}
              mismatch={extractedData.mismatches?.find(m => m.field === 'client_name')}
            />

            {/* Date */}
            <DataField
              icon={<Calendar className="w-5 h-5" />}
              label="Date"
              value={matchedRow?.date || extractedData.date}
              expected={expectedData?.shift_date}
              mismatch={extractedData.mismatches?.find(m => m.field === 'date')}
            />

            {/* Time */}
            <DataField
              icon={<Clock className="w-5 h-5" />}
              label="Time"
              value={`${extractedData.start_time || matchedRow?.start_time || '??:??'} - ${extractedData.end_time || matchedRow?.end_time || '??:??'}`}
            />

            {/* Break */}
            <DataField
              icon={<Coffee className="w-5 h-5" />}
              label="Break"
              value={`${extractedData.break_minutes || matchedRow?.break_minutes || 0} minutes`}
            />

            {/* Hours Worked */}
            <DataField
              icon={<Clock className="w-5 h-5" />}
              label="Hours Worked"
              value={`${extractedData.hours_worked || matchedRow?.hours || extractedData.total_hours || 0}h`}
              expected={expectedData?.scheduled_hours ? `${expectedData.scheduled_hours}h` : null}
              mismatch={extractedData.mismatches?.find(m => m.field === 'hours')}
            />
          </div>

          {/* Multi-Row Timesheet Display */}
          {hasMultipleRows && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-bold text-blue-900">📋 Multi-Day Timesheet Detected</p>
                  <p className="text-sm text-blue-700">
                    This timesheet contains {extractedData.rows.length} shifts.
                    We're using the data for <strong>{matchedRow?.date || 'the first date'}</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-2 mt-3">
                {extractedData.rows.map((row, idx) => {
                  const isMatched = row.date === matchedRow?.date;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isMatched
                          ? 'bg-green-50 border-green-500'
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isMatched && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                          <span className={`font-medium ${isMatched ? 'text-green-900' : 'text-gray-600'}`}>
                            {row.date}
                          </span>
                          {isMatched && (
                            <Badge className="bg-green-600 text-white">THIS SHIFT</Badge>
                          )}
                        </div>
                        <span className={`font-bold ${isMatched ? 'text-green-900' : 'text-gray-500'}`}>
                          {row.hours}h
                        </span>
                      </div>
                      {row.start_time && row.end_time && (
                        <p className={`text-sm mt-1 ${isMatched ? 'text-green-700' : 'text-gray-500'}`}>
                          {row.start_time} - {row.end_time}
                          {row.break_minutes > 0 && ` (${row.break_minutes}min break)`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mismatches Alert */}
          {extractedData.mismatches && extractedData.mismatches.length > 0 && (
            <Alert className="bg-red-50 border-red-300">
              <XCircle className="w-5 h-5 text-red-600" />
              <AlertDescription>
                <p className="font-bold text-red-900 mb-2">⚠️ Data Mismatches Detected</p>
                <div className="space-y-2">
                  {extractedData.mismatches.map((m, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="font-medium text-red-800">{m.field}:</p>
                      <p className="text-red-700">
                        Expected: <strong>{m.expected}</strong> |
                        Found: <strong>{m.actual}</strong>
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-sm mt-2 text-red-700">
                  This timesheet will require admin review even if you confirm.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Warnings */}
          {extractedData.warnings && extractedData.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="font-medium text-yellow-900 mb-2">⚠️ Warnings</p>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                {extractedData.warnings.map((warning, idx) => (
                  <li key={idx}>{typeof warning === 'string' ? warning : warning.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Optional staff note to help admins on review */}
        <div className="mt-4">
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Add a note for your agency (optional)
          </label>
          <textarea
            className="w-full min-h-[64px] rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-y"
            placeholder="Explain any mismatches (e.g. wrong client name on sheet, shared timesheet, special circumstances)..."
            value={staffNote}
            onChange={(e) => setStaffNote(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-gray-500">
            This note will be visible to your agency when they review this timesheet.
          </p>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6">
          {/* Re-Upload Button (Mobile: Full Width) */}
          <Button
            type="button"
            variant="outline"
            onClick={onReUpload}
            disabled={confirming || rejecting}
            className="w-full sm:w-auto order-3 sm:order-1"
          >
            <Camera className="w-4 h-4 mr-2" />
            Re-Upload Better Photo
          </Button>

          {/* Reject Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => onReject(staffNote)}
            disabled={confirming || rejecting}
            className="w-full sm:w-auto order-2 sm:order-2"
          >
            {rejecting ? (
              <>⏳ Processing...</>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                No, Review Needed
              </>
            )}
          </Button>

          {/* Confirm Button */}
          <Button
            type="button"
            onClick={() => onConfirm(staffNote)}
            disabled={confirming || rejecting}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 order-1 sm:order-3"
          >
            {confirming ? (
              <>⏳ Processing...</>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Yes, Confirm
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * DataField Component - Shows a single extracted field with optional mismatch
 */
function DataField({ icon, label, value, expected, mismatch }) {
  const hasMismatch = !!mismatch;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${
      hasMismatch ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
    }`}>
      <div className={hasMismatch ? 'text-red-600' : 'text-gray-600'}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
        <p className={`font-semibold ${hasMismatch ? 'text-red-900' : 'text-gray-900'}`}>
          {value || 'Not found'}
        </p>
        {expected && !hasMismatch && (
          <p className="text-xs text-green-600 mt-1">
            ✅ Matches expected: {expected}
          </p>
        )}
        {hasMismatch && (
          <p className="text-xs text-red-700 mt-1">
            ⚠️ Expected: {mismatch.expected}
          </p>
        )}
      </div>
      {hasMismatch ? (
        <XCircle className="w-5 h-5 text-red-600" />
      ) : expected ? (
        <CheckCircle2 className="w-5 h-5 text-green-600" />
      ) : null}
    </div>
  );
}
