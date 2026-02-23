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
  AlertCircle,
  Camera,
  Clock,
  Calendar,
  User,
  Building2,
  Coffee,
  MousePointerClick,
  Loader2,
  Check,
  History,
  FileSearch,
  CheckSquare,
  Square,
} from 'lucide-react';

import { format, parseISO, isSameDay } from 'date-fns';
import { calculateBillableHoursWithRule } from '@/utils/shiftCalculations';
import timesheetService from '@/services/timesheetService';

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
  const [activeRow, setActiveRow] = useState(null);

  // NEW: Batch Processing State
  const [addressableShifts, setAddressableShifts] = useState([]);
  const [isFetchingShifts, setIsFetchingShifts] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState(new Set()); // Indices of extractedData.rows to update

  // Initialize active row and fetch addressable shifts
  useEffect(() => {
    if (extractedData?.matched_row_info) {
      setActiveRow(extractedData.matched_row_info);
    } else if (extractedData?.rows && extractedData.rows.length > 0) {
      setActiveRow(extractedData.rows[0]);
    } else {
      setActiveRow(null);
    }

    // Fetch other shifts for this staff to enable batch save
    const fetchOtherShifts = async () => {
      const staffId = extractedData.staff_id || expectedData?.staff_id;
      if (!staffId || !extractedData.rows?.length) return;

      setIsFetchingShifts(true);
      try {
        // Find date range from OCR rows
        const dates = extractedData.rows
          .map(r => r.date)
          .filter(Boolean)
          .map(d => {
            // Attempt to parse various date formats (DD/MM/YY is common)
            try {
              const parts = d.split(/[/.-]/);
              if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
                return new Date(year, month, day);
              }
            } catch (e) { }
            return null;
          })
          .filter(Boolean);

        if (dates.length > 0) {
          const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
          const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];

          const shifts = await timesheetService.fetchAddressableTimesheets(staffId, minDate, maxDate);
          setAddressableShifts(shifts);

          // AUTO-SELECTION LOGIC
          const newSelected = new Set();
          extractedData.rows.forEach((row, idx) => {
            const match = shifts.find(s => s.shift_date === row.date || (row.date && s.shift_date && isSameDay(parseISO(s.shift_date), parseISO(row.date))));

            if (match) {
              // Always select if it matches the current timesheet we are focused on
              if (match.id === expectedData.timesheet_id) {
                newSelected.add(idx);
                return;
              }

              // Select if draft or pending and data differs (conflict) OR is empty
              const dbHours = parseFloat(match.total_hours || 0);
              const ocrHours = parseFloat(row.hours || 0);

              if (dbHours === 0 || Math.abs(dbHours - ocrHours) > 0.1) {
                newSelected.add(idx);
              }
            }
          });
          setSelectedIndices(newSelected);
        }
      } catch (err) {
        console.error('Failed to fetch addressable shifts:', err);
      } finally {
        setIsFetchingShifts(false);
      }
    };

    fetchOtherShifts();
  }, [extractedData, expectedData?.staff_id, expectedData.timesheet_id]);

  const confidence = extractedData.confidence?.overall || 0;
  const hasHighConfidence = confidence >= 95; // BUMP to 95% per user preference
  const hasLowConfidence = confidence < 75;

  // ✅ SMART VALIDATION: 10-Hour Gold Rule & Name Fuzzy Match
  const isSmartMatch = (field, expected, actual) => {
    if (field === 'hours') {
      const e = parseFloat(expected);
      const a = parseFloat(actual);
      if (isNaN(e) || isNaN(a)) return false;

      // If expected gross matches actual net after rule-based deduction (e.g. 12 -> 11)
      return calculateBillableHoursWithRule(e) === a;
    }

    if (field === 'staff_name' || field === 'employee_name') {
      const e = String(expected || '').toLowerCase();
      const a = String(actual || '').toLowerCase();
      if (!e || !a) return false;

      // Fuzzy match: if one is contained in the other or they are very similar
      // e.g. "Navya Prathyusha Tunuguntla" vs "Navya Tunuguntla"
      return e.includes(a) || a.includes(e);
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

  // Handler for row checkbox toggle
  const toggleRowSelection = (idx) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedIndices(newSelected);
  };

  // Handler for confirm - injects the selected batch updates
  const handleConfirmWrapper = () => {
    const selectedUpdates = Array.from(selectedIndices).map(idx => {
      const row = extractedData.rows[idx];
      const match = addressableShifts.find(s => s.shift_date === row.date);
      return {
        row,
        timesheetId: match?.id || expectedData.timesheet_id, // Fallback if no match found but it's the current one
        isPrimary: match?.id === expectedData.timesheet_id
      };
    });

    onConfirm(staffNote, selectedUpdates);
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
      if (!open) {
        // Handled by buttons
      }
    }}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
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
                Verified by AI ({confidence}%)
              </Badge>
            ) : (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 px-3 py-1 text-xs">
                <AlertTriangle className="w-4 h-4 mr-1.5" />
                Manual Review Suggested ({confidence}%)
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


          {/* Multi-Row Timesheet Display */}
          {hasMultipleRows && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <CheckSquare className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-bold text-blue-900 text-base">📋 Batch Processing Detected</p>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    We found {extractedData.rows.length} shifts.
                    <strong> Toggle checkboxes</strong> to update multiple shifts at once.
                  </p>
                </div>
              </div>

              {isFetchingShifts ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                  <span className="text-sm text-blue-600 font-medium">Reconciling with database...</span>
                </div>
              ) : (
                <div className="space-y-2 mt-3">
                  {extractedData.rows.map((row, idx) => {
                    const isSelected = selectedIndices.has(idx);
                    const match = addressableShifts.find(s => s.shift_date === row.date);

                    let statusColor = 'bg-gray-100 text-gray-600';
                    let statusLabel = 'New Date';
                    let isUpToDate = false;

                    if (match) {
                      const dbHours = parseFloat(match.total_hours || 0);
                      const ocrHours = parseFloat(row.hours || 0);

                      if (dbHours > 0 && Math.abs(dbHours - ocrHours) < 0.1) {
                        statusColor = 'bg-green-100 text-green-700';
                        statusLabel = 'Up to Date';
                        isUpToDate = true;
                      } else if (dbHours > 0) {
                        statusColor = 'bg-orange-100 text-orange-700 font-bold animate-pulse';
                        statusLabel = `Conflict (DB: ${dbHours}h)`;
                      } else {
                        statusColor = 'bg-blue-100 text-blue-700';
                        statusLabel = 'Ready to Save';
                      }
                    }

                    return (
                      <div
                        key={idx}
                        onClick={() => !isUpToDate && toggleRowSelection(idx)}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-sm active:scale-[0.99] ${isSelected
                          ? 'bg-white border-blue-500 ring-1 ring-blue-500 shadow-sm'
                          : isUpToDate
                            ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'
                            : 'bg-white border-gray-200 hover:border-blue-200'
                          }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${isUpToDate
                              ? 'bg-green-500 border-green-500'
                              : isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-300'
                              }`}>
                              {isUpToDate ? (
                                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                              ) : isSelected && (
                                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm sm:text-base text-gray-900">
                                  {row.date}
                                </span>
                                <Badge className={`text-[10px] px-2 py-0 h-4 border-none ${statusColor}`}>
                                  {statusLabel}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500 mt-0.5">
                                {row.start_time || '??'} - {row.end_time || '??'}
                                {row.break_minutes > 0 && ` (${row.break_minutes}m break)`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-base text-gray-900 leading-none">
                              {row.hours}h
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <DataField
              icon={<Calendar className="w-4 h-4" />}
              label="Date"
              value={getDisplayValue('date')}
              expected={expectedData?.shift_date}
              mismatch={extractedData.mismatches?.find(m => m.field === 'date')}
            />

            <DataField
              icon={<Clock className="w-4 h-4" />}
              label="Hours Worked"
              value={getDisplayValue('hours')}
              expected={expectedData?.scheduled_hours ? `${expectedData.scheduled_hours}h` : null}
              mismatch={effectiveMismatches.find(m => m.field === 'hours')}
              isSmartMatch={isSmartMatch('hours', expectedData?.scheduled_hours, parseFloat(getDisplayValue('hours')))}
            />
          </div>

          <div className="px-3 py-1 flex justify-between items-center text-[11px] text-gray-500 border-t pt-2">
            <span>Staff: {extractedData.employee_name || 'N/A'}</span>
            <span>Client: {extractedData.client_name || 'N/A'}</span>
          </div>
        </div>

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

        <DialogFooter className="sticky bottom-0 bg-white border-t pt-4 mt-6 flex flex-col gap-3">
          {/* Confirm Button - PRIMARY CTA */}
          <Button
            type="button"
            onClick={handleConfirmWrapper}
            disabled={confirming || rejecting || selectedIndices.size === 0}
            className={`w-full h-14 text-lg font-bold shadow-xl transition-all duration-300 active:scale-95 ${selectedIndices.size === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 shadow-green-100'
              }`}
          >
            {confirming ? (
              <Loader2 className="w-6 h-6 animate-spin mr-3" />
            ) : (
              <CheckCircle className="w-6 h-6 mr-3" />
            )}
            {confirming ? 'Processing...' : `Yes, Everything looks Correct`}
          </Button>

          {/* Secondary Actions Row */}
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={onReUpload}
              disabled={confirming || rejecting}
              className="flex-1 h-11 text-gray-600 border-gray-300 hover:bg-gray-50 font-medium"
            >
              <Camera className="w-4 h-4 mr-2" />
              Retake / Change Photo
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => onReject(staffNote)}
              disabled={confirming || rejecting}
              className="flex-1 h-11 text-red-600 hover:bg-red-50 font-medium opacity-80 hover:opacity-100"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              AI Error? Send to Agency
            </Button>
          </div>

          <p className="text-[10px] text-gray-400 text-center px-4 italic">
            Reporting an error will flag this for manual review by your agency.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * DataField Component - Shows a single extracted field with optional mismatch
 */
function DataField({ icon, label, value, expected, mismatch, isSmartMatch }) {
  const normalize = (val) => String(val || '').trim().toLowerCase();
  const isRealMismatch = mismatch && normalize(mismatch.actual) !== normalize(mismatch.expected) && !isSmartMatch;
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
