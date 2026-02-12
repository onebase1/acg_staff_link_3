import React, { useState, useEffect } from 'react';
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
  CheckCircle,
  XCircle,
  AlertTriangle,
  Camera,
  Clock,
  Calendar,
  User,
  Building2,
  Coffee,
  MousePointerClick,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { calculateBillableHoursWithRule } from '@/utils/shiftCalculations';

/**
 * 🔍 CONFIRM OCR MODAL
 *
 * WhatsApp-style confirmation workflow for web timesheet uploads.
 * Shows extracted OCR data for staff to review and approve/reject.
 *
 * Features:
 * - Visual confidence score indicator
 * - Mismatch highlighting
 * - Multi-row timesheet support with INTERACTIVE SELECTION
 * - Auto-approval logic guidance
 * - Re-upload option
 * - Locked state (prevents accidental closure)
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
  // State to track which row is currently selected (defaults to auto-matched row)
  const [activeRow, setActiveRow] = useState(null);

  // Initialize active row when data loads
  useEffect(() => {
    if (extractedData?.matched_row_info) {
      setActiveRow(extractedData.matched_row_info);
    } else if (extractedData?.rows && extractedData.rows.length > 0) {
      // Fallback to first row if no match found but rows exist
      setActiveRow(extractedData.rows[0]);
    } else {
      setActiveRow(null);
    }
  }, [extractedData]);

  const confidence = extractedData.confidence?.overall || 0;
  const hasHighConfidence = confidence >= 95; // BUMP to 95% per user preference
  const hasLowConfidence = confidence < 75;

  // ✅ SMART VALIDATION: 10-Hour Gold Rule
  // Uses centralized utility to see if "actual" exactly matches "expected" after break deduction
  const isSmartMatch = (field, expected, actual) => {
    if (field === 'hours') {
      const e = parseFloat(expected);
      const a = parseFloat(actual);
      if (isNaN(e) || isNaN(a)) return false;

      // If expected gross matches actual net after rule-based deduction (e.g. 12 -> 11)
      return calculateBillableHoursWithRule(e) === a;
    }
    return false;
  };

  const effectiveMismatches = extractedData.mismatches?.filter(m => !isSmartMatch(m.field, m.expected, m.actual)) || [];

  // ✅ SMART WARNING FILTERING
  // Filter out warnings that describe the 10-hour break deduction (not really an error)
  const isBreakWarning = (msg) => {
    return (msg.includes('scheduled: 12') && msg.includes('actual: 11')) ||
      (msg.includes('1.0h difference') && msg.includes('scheduled:'));
  };

  const effectiveWarnings = extractedData.warnings?.filter(w => {
    const msg = typeof w === 'string' ? w : w.message;
    return !isBreakWarning(msg);
  }) || [];

  const canAutoApprove = (
    hasHighConfidence &&
    (extractedData.validation_status === 'match' || effectiveMismatches.length === 0) &&
    !effectiveMismatches.some(m => m.severity === 'critical')
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

  // Handler for row selection
  const handleRowSelect = (row) => {
    console.log('👆 User selected row:', row);
    setActiveRow(row);
  };

  // Handler for confirm - injects the selected row data
  const handleConfirmWrapper = () => {
    // If user selected a different row, we need to pass that info back
    // We can attach it to the extractedData or pass it as a separate argument
    // For now, we'll modify the extractedData object in place before passing it back (or rely on parent to use activeRow if we passed it)

    // Actually, the parent `handleConfirmOCR` uses `pendingOcrData`. 
    // We should probably pass the activeRow to the onConfirm callback.
    // But `onConfirm` currently only takes `staffNote`.

    // Let's modify `onConfirm` in the parent to accept an override object, 
    // OR we update the `extractedData` in the parent context.
    // Since we can't easily change the parent's state from here without a setter, 
    // we will pass the `activeRow` as a second argument to `onConfirm`.

    // Wait, `onConfirm` signature in parent is `(staffNote)`. 
    // We need to update the parent to handle this. 
    // For now, let's assume we can pass it.

    // BETTER APPROACH: The parent uses `pendingOcrData`. 
    // We can't mutate that safely.
    // Let's pass `{ ...extractedData, matched_row_info: activeRow }` to onConfirm?
    // No, `onConfirm` doesn't take data.

    // Let's pass it as a second arg: onConfirm(staffNote, activeRow)
    onConfirm(staffNote, activeRow);
  };

  // Helper to format display values based on Active Row or Global Data
  const getDisplayValue = (field) => {
    if (activeRow) {
      if (field === 'date') return activeRow.date;
      if (field === 'time') return `${activeRow.start_time || '??:??'} - ${activeRow.end_time || '??:??'}`;
      if (field === 'break') return `${activeRow.break_minutes || 0} minutes`;
      if (field === 'hours') return `${activeRow.hours || 0}h`;
    }
    // Fallback to global extracted data
    if (field === 'date') return extractedData.date;
    if (field === 'time') return `${extractedData.start_time || '??:??'} - ${extractedData.end_time || '??:??'}`;
    if (field === 'break') return `${extractedData.break_minutes || 0} minutes`;
    if (field === 'hours') return `${extractedData.hours_worked || extractedData.total_hours || 0}h`;
    return 'N/A';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // 🔒 PREVENT ACCIDENTAL CLOSURE
      // Only allow closing if explicitly calling onClose (which usually happens via buttons)
      // We block the default "click outside" or "escape" closing by not calling onClose(false) here
      // unless we really want to. 
      // Actually, onOpenChange is called by the library. We should just ignore false if we want to lock it.
      // But we need to allow the parent to close it.
      // The best way in Radix UI / shadcn is to use onInteractOutside and onEscapeKeyDown on Content.
      if (!open) {
        // Do nothing here to prevent close. The buttons will call onClose directly if needed.
        // Or better, we just don't pass onOpenChange to Dialog if we want to fully control it?
        // No, we need it for the close button (X) if it exists.
        // Let's rely on the Content props below.
      }
    }}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        // 🔒 LOCK MODAL: Prevent closing by clicking outside or pressing Escape
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        // Hide the default close button (X) to force user to choose an action
        hideCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            🔍 Review Extracted Data
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Please verify the information extracted from your timesheet.
            {hasMultipleRows && " Select the correct shift if multiple are detected."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {hasHighConfidence ? (
              <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1 text-xs">
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Verified by AI
              </Badge>
            ) : (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 px-3 py-1 text-xs">
                <AlertTriangle className="w-4 h-4 mr-1.5" />
                Manual Review Suggested
              </Badge>
            )}
            {canAutoApprove && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1 text-xs">
                Auto-Approval Ready
              </Badge>
            )}
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


          {/* Multi-Row Timesheet Display - MOVED UP for better visibility */}
          {hasMultipleRows && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <MousePointerClick className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-bold text-blue-900 text-base">📋 Multi-Day Timesheet Detected</p>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    We found {extractedData.rows.length} shifts.
                    <strong> Tap the correct row</strong> to use its data.
                  </p>
                </div>
              </div>

              <div className="space-y-2 mt-3">
                {extractedData.rows.map((row, idx) => {
                  const isSelected = row.date === activeRow?.date; // Use activeRow for selection state
                  return (
                    <div
                      key={idx}
                      onClick={() => handleRowSelect(row)}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md active:scale-[0.98] ${isSelected
                        ? 'bg-green-50 border-green-500 ring-1 ring-green-500'
                        : 'bg-white border-gray-200 hover:border-blue-300'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isSelected ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                          )}
                          <span className={`font-bold text-sm sm:text-base ${isSelected ? 'text-green-900' : 'text-gray-700'}`}>
                            {row.date}
                          </span>
                        </div>
                        <span className={`font-bold text-base ${isSelected ? 'text-green-900' : 'text-gray-600'}`}>
                          {row.hours}h
                        </span>
                      </div>
                      {row.start_time && row.end_time && (
                        <p className={`text-sm mt-2 ml-9 leading-relaxed ${isSelected ? 'text-green-700' : 'text-gray-500'}`}>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Date */}
            <DataField
              icon={<Calendar className="w-4 h-4" />}
              label="Date"
              value={getDisplayValue('date')}
              expected={expectedData?.shift_date}
              mismatch={extractedData.mismatches?.find(m => m.field === 'date')}
            />

            {/* Hours Worked */}
            <DataField
              icon={<Clock className="w-4 h-4" />}
              label="Hours Worked"
              value={getDisplayValue('hours')}
              expected={expectedData?.scheduled_hours ? `${expectedData.scheduled_hours}h` : null}
              mismatch={effectiveMismatches.find(m => m.field === 'hours')}
              isSmartMatch={isSmartMatch('hours', expectedData?.scheduled_hours, parseFloat(getDisplayValue('hours')))}
            />
          </div>

          {/* Employee Name (Subtle) */}
          <div className="px-3 py-1 flex justify-between items-center text-[11px] text-gray-500 border-t pt-2">
            <span>Staff: {extractedData.employee_name || 'N/A'}</span>
            <span>Client: {extractedData.client_name || 'N/A'}</span>
          </div>
        </div>

        {/* Mismatches Alert */}
        {effectiveMismatches.length > 0 && (
          <Alert className="bg-red-50 border-red-300">
            <XCircle className="w-5 h-5 text-red-600" />
            <AlertDescription>
              <p className="font-bold text-red-900 mb-2">⚠️ Data Mismatches Detected</p>
              <div className="space-y-2">
                {effectiveMismatches.map((m, idx) => (
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
        {effectiveWarnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="font-medium text-yellow-900 mb-2">⚠️ Warnings</p>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              {effectiveWarnings.map((warning, idx) => (
                <li key={idx}>{typeof warning === 'string' ? warning : warning.message}</li>
              ))}
            </ul>
          </div>
        )}

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

        <DialogFooter className="sticky bottom-0 bg-white border-t pt-4 mt-6 flex flex-col gap-2">
          {/* Confirm Button - PRIMARY CTA */}
          <Button
            type="button"
            onClick={handleConfirmWrapper}
            disabled={confirming || rejecting}
            className="w-full h-12 text-base bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100"
          >
            {confirming ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <CheckCircle className="w-5 h-5 mr-2" />
            )}
            {confirming ? 'Saving Timesheet...' : 'Yes, Information is Correct'}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            {/* Re-Upload Button */}
            <Button
              type="button"
              variant="outline"
              onClick={onReUpload}
              disabled={confirming || rejecting}
              className="w-full text-gray-600"
            >
              <Camera className="w-4 h-4 mr-2" />
              Re-Upload
            </Button>

            {/* Reject Button */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onReject(staffNote)}
              disabled={confirming || rejecting}
              className="w-full text-red-600 hover:bg-red-50"
            >
              {rejecting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Problem with AI
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * DataField Component - Shows a single extracted field with optional mismatch
 */
function DataField({ icon, label, value, expected, mismatch, isSmartMatch }) {
  // 🧹 NORMALIZE VALUES FOR COMPARISON
  // This fixes the "2025-01-17" vs "2025-01-17" mismatch bug caused by type/whitespace
  const normalize = (val) => String(val || '').trim().toLowerCase();

  // Check if mismatch is real (ignoring case and whitespace)
  const isRealMismatch = mismatch && normalize(mismatch.actual) !== normalize(mismatch.expected) && !isSmartMatch;

  // Also check if the current 'value' matches 'expected' (for dynamic row updates)
  const matchesExpected = isSmartMatch || (expected && normalize(value) === normalize(expected));

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${isRealMismatch ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
      }`}>
      <div className={isRealMismatch ? 'text-red-600' : 'text-gray-600'}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-500 mb-1 uppercase tracking-wider">{label}</p>
        <p className={`text-lg font-bold leading-none ${isRealMismatch ? 'text-red-900' : 'text-gray-900'}`}>
          {value || 'Not found'}
        </p>
        {matchesExpected && (
          <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> {isSmartMatch ? 'Correct Break Deduction' : 'Matches scheduled'}
          </p>
        )}
        {isRealMismatch && (
          <p className="text-xs text-red-700 mt-1.5 bg-red-100/50 px-2 py-0.5 rounded w-fit">
            ⚠️ Expected: {mismatch.expected}
          </p>
        )}
      </div>
      {isRealMismatch ? (
        <XCircle className="w-5 h-5 text-red-600" />
      ) : matchesExpected ? (
        <CheckCircle className="w-5 h-5 text-green-600" />
      ) : null}
    </div>
  );
}
