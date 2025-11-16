import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, Trash2, CheckCircle, AlertCircle, AlertTriangle, Pencil, Info } from "lucide-react";
import { groupShiftsByDate, calculateFinancialSummary } from "@/utils/bulkShifts/shiftGenerator";
import EditShiftModal from "./EditShiftModal";

export default function Step3PreviewTable({
  shifts,
  validation,
  onBack,
  onCreate,
  onShiftUpdate,
  isCreating,
  creationProgress
}) {
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [expandedRoles, setExpandedRoles] = useState(new Set());
  const [editingShift, setEditingShift] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Group shifts by date
  const groupedShifts = useMemo(() => {
    return groupShiftsByDate(shifts);
  }, [shifts]);

  // Financial summary
  const financialSummary = useMemo(() => {
    return calculateFinancialSummary(shifts);
  }, [shifts]);

  // Toggle date expansion
  const toggleDate = (date) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  // Toggle role expansion (to show individual shifts)
  const toggleRole = (roleKey) => {
    setExpandedRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleKey)) {
        newSet.delete(roleKey);
      } else {
        newSet.add(roleKey);
      }
      return newSet;
    });
  };

  // Expand all / Collapse all
  const expandAll = () => {
    setExpandedDates(new Set(Object.keys(groupedShifts)));
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
    setExpandedRoles(new Set());
  };

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'long' });
    const year = date.getFullYear();
    return `${dayName}, ${day} ${month} ${year}`;
  };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    const colors = {
      nurse: 'bg-blue-100 text-blue-700',
      healthcare_assistant: 'bg-green-100 text-green-700',
      senior_care_worker: 'bg-purple-100 text-purple-700',
      care_worker: 'bg-orange-100 text-orange-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  // Handle edit shift
  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setIsEditModalOpen(true);
  };

  // Handle save edited shift
  const handleSaveShift = (updatedShift) => {
    if (onShiftUpdate) {
      onShiftUpdate(updatedShift);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gray-50">
        <CardTitle className="flex items-center gap-2">
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600"></div>
              Creating Shifts...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 text-cyan-600" />
              Step 3: Review & Validate
              <Badge variant="default" className="ml-auto">
                {shifts.length} shifts
              </Badge>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Validation Summary */}
        <Alert
          variant={validation.errors.length > 0 ? "destructive" : validation.warnings.length > 0 ? "default" : "success"}
          className={
            validation.errors.length === 0 && validation.warnings.length === 0
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : ""
          }
        >
          <div className="flex items-start gap-2">
            {validation.errors.length > 0 ? (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            ) : validation.warnings.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              {validation.errors.length === 0 && validation.warnings.length === 0 && (
                <p className="font-semibold">All shifts validated successfully!</p>
              )}

              {validation.errors.length > 0 && (
                <div>
                  <p className="font-semibold mb-2">
                    {validation.errors.length} Error{validation.errors.length > 1 ? 's' : ''} Found:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validation.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className={validation.errors.length > 0 ? 'mt-3' : ''}>
                  <p className="font-semibold mb-2">
                    {validation.warnings.length} Warning{validation.warnings.length > 1 ? 's' : ''}:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validation.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.info && validation.info.length > 0 && (
                <div className={validation.errors.length > 0 || validation.warnings.length > 0 ? 'mt-3' : ''}>
                  <p className="font-semibold mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Information:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validation.info.map((info, i) => (
                      <li key={i}>{info}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Alert>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <div className="text-xs uppercase text-blue-600 font-medium mb-1">Total Shifts</div>
            <div className="text-2xl font-bold text-blue-900">{financialSummary.totalShifts}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-blue-600 font-medium mb-1">Staff Cost</div>
            <div className="text-2xl font-bold text-blue-900">£{financialSummary.totalStaffCost}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-blue-600 font-medium mb-1">Client Revenue</div>
            <div className="text-2xl font-bold text-blue-900">£{financialSummary.totalClientRevenue}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-blue-600 font-medium mb-1">Margin</div>
            <div className="text-2xl font-bold text-emerald-700">
              £{financialSummary.margin} ({financialSummary.marginPercentage}%)
            </div>
          </div>
        </div>

        {/* Group Controls */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Grouped by date ({Object.keys(groupedShifts).length} days)
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </div>

        {/* Grouped Shifts */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto border rounded-lg p-4">
          {Object.entries(groupedShifts).sort((a, b) => a[0].localeCompare(b[0])).map(([date, group]) => {
            const isExpanded = expandedDates.has(date);
            const isWeekend = new Date(date + 'T00:00:00').getDay() % 6 === 0;

            return (
              <div key={date} className={`border rounded-lg ${isWeekend ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
                {/* Date Header */}
                <button
                  type="button"
                  onClick={() => toggleDate(date)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">{formatDate(date)}</div>
                      <div className="text-sm text-gray-600">
                        {group.totalCount} shift{group.totalCount > 1 ? 's' : ''}
                        {isWeekend && <span className="ml-2 text-orange-600">(Weekend)</span>}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">{group.totalCount}</Badge>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {Object.entries(group.byRole).map(([roleKey, roleGroup]) => {
                      const isRoleExpanded = expandedRoles.has(roleKey);

                      return (
                        <div key={roleKey} className="border-l-2 border-gray-200">
                          {/* Role Summary Header */}
                          <div className="pl-8 py-2">
                            <button
                              type="button"
                              onClick={() => toggleRole(roleKey)}
                              className="w-full flex items-center justify-between hover:bg-gray-50 p-2 rounded transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isRoleExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-gray-500" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-gray-500" />
                                )}
                                <Badge className={getRoleBadgeColor(roleGroup.role)}>
                                  {roleGroup.role.replace(/_/g, ' ')}
                                </Badge>
                                <span className="text-sm text-gray-600">
                                  {roleGroup.shiftType === 'day' ? '☀️ Day Shift' : '🌙 Night Shift'}
                                </span>
                                <span className="text-sm font-medium">
                                  × {roleGroup.count}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {roleGroup.shifts[0]?.start_time.split('T')[1].substring(0, 5)} - {roleGroup.shifts[0]?.end_time.split('T')[1].substring(0, 5)}
                              </div>
                            </button>

                            {/* Individual Shifts */}
                            {isRoleExpanded && (
                              <div className="mt-2 ml-4 space-y-2">
                                {roleGroup.shifts.map((shift, idx) => (
                                  <div
                                    key={shift._tempId || idx}
                                    className="p-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between hover:shadow-sm transition-shadow"
                                  >
                                    <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-500">Time:</span>{' '}
                                        <span className="font-medium">
                                          {shift.start_time.split('T')[1].substring(0, 5)} - {shift.end_time.split('T')[1].substring(0, 5)}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Pay:</span>{' '}
                                        <span className="font-medium">£{shift.pay_rate}/hr</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Charge:</span>{' '}
                                        <span className="font-medium">£{shift.charge_rate}/hr</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Duration:</span>{' '}
                                        <span className="font-medium">{shift.duration_hours}h</span>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditShift(shift)}
                                      disabled={isCreating}
                                    >
                                      <Pencil className="w-3 h-3 mr-1" />
                                      Edit
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Creation Progress */}
        {isCreating && (
          <div className="space-y-2">
            <Progress value={creationProgress} className="h-2" />
            <p className="text-sm text-center text-gray-600">
              Creating shifts: {Math.round(creationProgress)}%
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isCreating}
          >
            ← Edit Grid
          </Button>
          <Button
            onClick={onCreate}
            disabled={!validation.isValid || shifts.length === 0 || isCreating}
            size="lg"
            className="min-w-[200px]"
          >
            {isCreating ? 'Creating...' : `Create ${shifts.length} Shifts`}
          </Button>
        </div>
      </CardContent>

      {/* Edit Shift Modal */}
      <EditShiftModal
        shift={editingShift}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveShift}
      />
    </Card>
  );
}
