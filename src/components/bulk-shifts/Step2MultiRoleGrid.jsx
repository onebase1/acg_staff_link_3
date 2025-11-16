import React, { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Grid3x3, Plus, Trash2, Download, FileUp, CheckCircle, XCircle, Upload, Copy, ChevronLeft, ChevronRight, LayoutGrid, LayoutList } from "lucide-react";
import { STAFF_ROLES } from "@/constants/staffRoles";
import { parsePastedData, convertToGridData, getExamplePasteText } from "@/utils/bulkShifts/pasteParser";
import { parseCSVFile, convertCSVToGridData } from "@/utils/bulkShifts/csvUploader";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function Step2MultiRoleGrid({
  formData,
  setFormData,
  onBack,
  onNext,
  currentAgency
}) {
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [isLoadingDuplicate, setIsLoadingDuplicate] = useState(false);
  const [focusedCell, setFocusedCell] = useState({ dateIndex: -1, roleIndex: -1 });
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0); // For role pagination
  const [viewMode, setViewMode] = useState('vertical'); // 'vertical' or 'horizontal'
  const fileInputRef = useRef(null);
  const inputRefs = useRef({});

  // Generate date array from range (ONLY FUTURE DATES)
  const dateArray = useMemo(() => {
    if (!formData.dateRange.startDate || !formData.dateRange.endDate) return [];

    const dates = [];
    const start = new Date(formData.dateRange.startDate);
    const end = new Date(formData.dateRange.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for comparison

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d);
      currentDate.setHours(0, 0, 0, 0);

      // Only include dates that are today or in the future
      if (currentDate >= today) {
        dates.push(new Date(d).toISOString().split('T')[0]);
      }
    }

    return dates;
  }, [formData.dateRange]);

  // Initialize active roles from client rates
  const initializeActiveRoles = () => {
    if (!formData.ratesByRole || Object.keys(formData.ratesByRole).length === 0) {
      // Default roles
      return [
        {
          key: 'nurse_day',
          label: 'Nurses Day',
          role: 'nurse',
          shiftType: 'day',
          payRate: 18.50,
          chargeRate: 24.50
        },
        {
          key: 'nurse_night',
          label: 'Nurses Night',
          role: 'nurse',
          shiftType: 'night',
          payRate: 18.50,
          chargeRate: 24.50
        }
      ];
    }

    // Create role columns from client rates
    const roles = [];
    Object.entries(formData.ratesByRole).forEach(([roleKey, rates]) => {
      // Day shift
      roles.push({
        key: `${roleKey}_day`,
        label: `${roleKey.replace(/_/g, ' ')} Day`,
        role: roleKey,
        shiftType: 'day',
        payRate: rates.pay_rate,
        chargeRate: rates.charge_rate
      });
      // Night shift
      roles.push({
        key: `${roleKey}_night`,
        label: `${roleKey.replace(/_/g, ' ')} Night`,
        role: roleKey,
        shiftType: 'night',
        payRate: rates.pay_rate,
        chargeRate: rates.charge_rate
      });
    });

    return roles;
  };

  // Initialize active roles if not set
  if (!formData.activeRoles || formData.activeRoles.length === 0) {
    setFormData(prev => ({
      ...prev,
      activeRoles: initializeActiveRoles()
    }));
  }

  // Initialize grid data if empty
  if (!formData.gridData || Object.keys(formData.gridData).length === 0) {
    const initialGrid = {};
    dateArray.forEach(date => {
      initialGrid[date] = {};
    });
    setFormData(prev => ({ ...prev, gridData: initialGrid }));
  }

  // Handle quantity change
  const handleQuantityChange = (date, roleKey, value) => {
    const quantity = parseInt(value) || 0;

    setFormData(prev => ({
      ...prev,
      gridData: {
        ...prev.gridData,
        [date]: {
          ...prev.gridData[date],
          [roleKey]: quantity > 0 ? quantity : undefined
        }
      }
    }));
  };

  // Get quantity for a cell
  const getQuantity = (date, roleKey) => {
    return formData.gridData?.[date]?.[roleKey] || '';
  };

  // Calculate row totals
  const getRowTotal = (date) => {
    if (!formData.gridData?.[date]) return 0;
    return Object.values(formData.gridData[date]).reduce((sum, qty) => sum + (qty || 0), 0);
  };

  // Calculate column totals
  const getColumnTotal = (roleKey) => {
    let total = 0;
    dateArray.forEach(date => {
      total += formData.gridData?.[date]?.[roleKey] || 0;
    });
    return total;
  };

  // Calculate grand total
  const grandTotal = useMemo(() => {
    let total = 0;
    dateArray.forEach(date => {
      if (formData.gridData?.[date]) {
        Object.values(formData.gridData[date]).forEach(qty => {
          total += qty || 0;
        });
      }
    });
    return total;
  }, [formData.gridData, dateArray]);

  // Clear all
  const handleClearAll = () => {
    if (window.confirm('Clear all quantities? This cannot be undone.')) {
      const clearedGrid = {};
      dateArray.forEach(date => {
        clearedGrid[date] = {};
      });
      setFormData(prev => ({ ...prev, gridData: clearedGrid }));
    }
  };

  // Fill column
  const handleFillColumn = (roleKey) => {
    const quantity = prompt('Enter quantity to fill all dates for this role:');
    if (quantity && !isNaN(quantity)) {
      const qty = parseInt(quantity);
      setFormData(prev => {
        const newGrid = { ...prev.gridData };
        dateArray.forEach(date => {
          newGrid[date] = {
            ...newGrid[date],
            [roleKey]: qty > 0 ? qty : undefined
          };
        });
        return { ...prev, gridData: newGrid };
      });
      toast.success(`Filled column with ${qty} for all dates`);
    }
  };

  // Fill row - PHASE 2
  const handleFillRow = (date) => {
    const quantity = prompt('Enter quantity to fill all roles for this date:');
    if (quantity && !isNaN(quantity)) {
      const qty = parseInt(quantity);
      setFormData(prev => {
        const newGrid = { ...prev.gridData };
        newGrid[date] = {};
        formData.activeRoles?.forEach(role => {
          newGrid[date][role.key] = qty > 0 ? qty : undefined;
        });
        return { ...prev, gridData: newGrid };
      });
      toast.success(`Filled row with ${qty} for all roles`);
    }
  };

  // Fill weekdays - PHASE 2
  const handleFillWeekdays = () => {
    const quantity = prompt('Enter quantity to fill all weekdays (Mon-Fri):');
    if (quantity && !isNaN(quantity)) {
      const qty = parseInt(quantity);
      setFormData(prev => {
        const newGrid = { ...prev.gridData };
        dateArray.forEach(date => {
          const dayOfWeek = new Date(date + 'T00:00:00').getDay();
          // 1-5 = Monday-Friday
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            newGrid[date] = {};
            formData.activeRoles?.forEach(role => {
              newGrid[date][role.key] = qty > 0 ? qty : undefined;
            });
          }
        });
        return { ...prev, gridData: newGrid };
      });
      const weekdayCount = dateArray.filter(date => {
        const day = new Date(date + 'T00:00:00').getDay();
        return day >= 1 && day <= 5;
      }).length;
      toast.success(`Filled ${weekdayCount} weekdays with ${qty}`);
    }
  };

  // Fill weekends - PHASE 2
  const handleFillWeekends = () => {
    const quantity = prompt('Enter quantity to fill all weekends (Sat-Sun):');
    if (quantity && !isNaN(quantity)) {
      const qty = parseInt(quantity);
      setFormData(prev => {
        const newGrid = { ...prev.gridData };
        dateArray.forEach(date => {
          const dayOfWeek = new Date(date + 'T00:00:00').getDay();
          // 0 = Sunday, 6 = Saturday
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            newGrid[date] = {};
            formData.activeRoles?.forEach(role => {
              newGrid[date][role.key] = qty > 0 ? qty : undefined;
            });
          }
        });
        return { ...prev, gridData: newGrid };
      });
      const weekendCount = dateArray.filter(date => {
        const day = new Date(date + 'T00:00:00').getDay();
        return day === 0 || day === 6;
      }).length;
      toast.success(`Filled ${weekendCount} weekend days with ${qty}`);
    }
  };

  // Duplicate Last Week - PHASE 2.7
  const handleDuplicateLastWeek = async () => {
    if (!formData.client_id) {
      toast.error('Please select a client first');
      return;
    }

    if (!formData.dateRange.startDate || !formData.dateRange.endDate) {
      toast.error('Please select a date range first');
      return;
    }

    if (!currentAgency) {
      toast.error('Agency information not available');
      return;
    }

    // Confirm action
    const confirmed = window.confirm(
      'This will duplicate shift patterns from last week. Any existing quantities will be overwritten. Continue?'
    );

    if (!confirmed) return;

    setIsLoadingDuplicate(true);

    try {
      // Calculate last week date range (7 days before current range start)
      const currentStart = new Date(formData.dateRange.startDate + 'T00:00:00');
      const lastWeekStart = new Date(currentStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      const lastWeekEnd = new Date(currentStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1); // Day before current range starts

      console.log('🔍 Fetching shifts from:', lastWeekStart.toISOString().split('T')[0], 'to', lastWeekEnd.toISOString().split('T')[0]);

      // Fetch last week's shifts from database
      const { data: lastWeekShifts, error } = await supabase
        .from('shifts')
        .select('date, role_required, shift_type')
        .eq('client_id', formData.client_id)
        .eq('agency_id', currentAgency)
        .gte('date', lastWeekStart.toISOString().split('T')[0])
        .lte('date', lastWeekEnd.toISOString().split('T')[0])
        .eq('status', 'open'); // Only duplicate open/unfilled shifts

      if (error) {
        console.error('❌ Error fetching last week shifts:', error);
        throw error;
      }

      console.log('📊 Found shifts:', lastWeekShifts?.length || 0);

      if (!lastWeekShifts || lastWeekShifts.length === 0) {
        toast.warning('No shifts found from last week');
        setIsLoadingDuplicate(false);
        return;
      }

      // Count shifts by date and role
      const gridCounts = {};

      lastWeekShifts.forEach(shift => {
        // Map old date to new date (maintain day-of-week alignment)
        const oldDate = new Date(shift.date + 'T00:00:00');
        const daysDiff = Math.floor((oldDate - lastWeekStart) / (1000 * 60 * 60 * 24));

        const newDate = new Date(currentStart);
        newDate.setDate(newDate.getDate() + daysDiff);
        const newDateStr = newDate.toISOString().split('T')[0];

        // Only include if within current date range
        if (newDateStr >= formData.dateRange.startDate && newDateStr <= formData.dateRange.endDate) {
          if (!gridCounts[newDateStr]) {
            gridCounts[newDateStr] = {};
          }

          // Use shift_type from database (no longer need to calculate from start_time)
          const roleKey = `${shift.role_required}_${shift.shift_type || 'day'}`;

          gridCounts[newDateStr][roleKey] = (gridCounts[newDateStr][roleKey] || 0) + 1;
        }
      });

      console.log('📋 Grid counts:', gridCounts);

      // Merge with existing grid (replaces matching dates)
      setFormData(prev => ({
        ...prev,
        gridData: {
          ...prev.gridData,
          ...gridCounts
        }
      }));

      toast.success(`✅ Duplicated ${lastWeekShifts.length} shifts from last week`);

    } catch (error) {
      console.error('❌ Error duplicating last week:', error);
      toast.error(`Failed to duplicate: ${error.message}`);
    } finally {
      setIsLoadingDuplicate(false);
    }
  };

  // Day of week helper
  const getDayName = (dateStr) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const date = new Date(dateStr + 'T00:00:00');
    return days[date.getDay()];
  };

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    return `${day} ${month}`;
  };

  // Handle paste parsing - PHASE 2
  const handleParsePaste = () => {
    if (!pasteText || !pasteText.trim()) {
      toast.error('Please paste some data first');
      return;
    }

    // Parse the pasted text
    const result = parsePastedData(pasteText, formData.activeRoles);

    setParseResult(result);

    if (!result.success) {
      toast.error(`Failed to parse: ${result.errors[0]}`);
      return;
    }

    // Convert to grid data
    const newGridData = convertToGridData(result.data, formData.activeRoles, dateArray);

    // Merge with existing grid data (add, don't replace)
    setFormData(prev => ({
      ...prev,
      gridData: {
        ...prev.gridData,
        ...Object.keys(newGridData).reduce((acc, date) => {
          acc[date] = {
            ...(prev.gridData[date] || {}),
            ...newGridData[date]
          };
          return acc;
        }, {})
      }
    }));

    toast.success(`✅ Parsed ${result.data.length} rows successfully!`);
    setPasteText(''); // Clear paste area
  };

  // Download CSV template - PHASE 2
  const handleDownloadTemplate = () => {
    const headers = ['Role', 'Day of Week', 'Date (DD/MM/YYYY)', 'Shift Type', 'Quantity'];
    const exampleRows = [
      ['Nurses', 'Saturday', '15/11/2025', 'Day', '2'],
      ['Nurses', 'Saturday', '15/11/2025', 'Night', '2'],
      ['Healthcare Assistants', 'Saturday', '15/11/2025', 'Day', '3'],
      ['Healthcare Assistants', 'Saturday', '15/11/2025', 'Night', '2']
    ];

    const csvContent = [
      headers.join(','),
      ...exampleRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BulkShiftTemplate_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Template downloaded!');
  };

  // Handle CSV file upload - PHASE 2
  const handleCSVUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsUploadingCSV(true);

    try {
      // Parse CSV file
      const result = await parseCSVFile(file, formData.activeRoles);

      setParseResult(result);

      if (!result.success) {
        toast.error(`CSV validation failed: ${result.errors[0]}`);
        setIsUploadingCSV(false);
        return;
      }

      // Convert to grid data
      const newGridData = convertCSVToGridData(result.data, dateArray);

      // Merge with existing grid data (add, don't replace)
      setFormData(prev => ({
        ...prev,
        gridData: {
          ...prev.gridData,
          ...Object.keys(newGridData).reduce((acc, date) => {
            acc[date] = {
              ...(prev.gridData[date] || {}),
              ...newGridData[date]
            };
            return acc;
          }, {})
        }
      }));

      toast.success(`✅ Uploaded ${result.data.length} rows from CSV successfully!`);

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('CSV upload error:', error);
      toast.error(`Failed to upload CSV: ${error.message}`);
      setParseResult({
        success: false,
        data: [],
        errors: [error.message]
      });
    } finally {
      setIsUploadingCSV(false);
    }
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Keyboard navigation - PHASE 2
  const handleKeyDown = (event, dateIndex, roleIndex) => {
    const totalDates = dateArray.length;
    const totalRoles = formData.activeRoles?.length || 0;

    // Helper to focus a cell
    const focusCell = (newDateIndex, newRoleIndex) => {
      if (newDateIndex >= 0 && newDateIndex < totalDates && newRoleIndex >= 0 && newRoleIndex < totalRoles) {
        const cellKey = `${newDateIndex}-${newRoleIndex}`;
        const inputElement = inputRefs.current[cellKey];
        if (inputElement) {
          inputElement.focus();
          inputElement.select();
          setFocusedCell({ dateIndex: newDateIndex, roleIndex: newRoleIndex });
        }
      }
    };

    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        if (event.shiftKey) {
          // Shift+Tab: Move to previous cell
          let prevRoleIndex = roleIndex - 1;
          let prevDateIndex = dateIndex;
          if (prevRoleIndex < 0) {
            prevRoleIndex = totalRoles - 1;
            prevDateIndex = dateIndex - 1;
          }
          focusCell(prevDateIndex, prevRoleIndex);
        } else {
          // Tab: Move to next cell
          let nextRoleIndex = roleIndex + 1;
          let nextDateIndex = dateIndex;
          if (nextRoleIndex >= totalRoles) {
            nextRoleIndex = 0;
            nextDateIndex = dateIndex + 1;
          }
          focusCell(nextDateIndex, nextRoleIndex);
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        focusCell(dateIndex, roleIndex + 1);
        break;

      case 'ArrowLeft':
        event.preventDefault();
        focusCell(dateIndex, roleIndex - 1);
        break;

      case 'ArrowDown':
        event.preventDefault();
        focusCell(dateIndex + 1, roleIndex);
        break;

      case 'ArrowUp':
        event.preventDefault();
        focusCell(dateIndex - 1, roleIndex);
        break;

      case 'Enter':
        event.preventDefault();
        // Enter: Move down (same column)
        focusCell(dateIndex + 1, roleIndex);
        break;

      case 'Escape':
        event.preventDefault();
        // Escape: Clear current cell
        const date = dateArray[dateIndex];
        const role = formData.activeRoles[roleIndex];
        if (date && role) {
          handleQuantityChange(date, role.key, '0');
        }
        break;

      default:
        // Allow normal input
        break;
    }
  };

  // Handle cell focus
  const handleCellFocus = (dateIndex, roleIndex) => {
    setFocusedCell({ dateIndex, roleIndex });
  };

  // Get cell key
  const getCellKey = (dateIndex, roleIndex) => {
    return `${dateIndex}-${roleIndex}`;
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gray-50">
        <CardTitle className="flex items-center gap-2">
          <Grid3x3 className="w-5 h-5 text-cyan-600" />
          Step 2: Enter Shift Quantities
          {grandTotal > 0 && (
            <Badge variant="default" className="ml-auto">
              {grandTotal} shifts to create
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Paste Area (Collapsible) - PHASE 2 */}
        <div className="border border-gray-200 rounded-lg">
          <button
            type="button"
            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
            onClick={() => setShowPasteArea(!showPasteArea)}
          >
            <span className="font-medium flex items-center gap-2">
              <FileUp className="w-4 h-4" />
              Quick Paste from Email
            </span>
            <span className="text-gray-500 text-sm">
              {showPasteArea ? 'Hide' : 'Show'}
            </span>
          </button>

          {showPasteArea && (
            <div className="p-4 space-y-3">
              <Label className="text-sm text-gray-600">
                Paste tab or comma-separated data (Role, Day, Date, Shift, Quantity)
              </Label>
              <textarea
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                placeholder="Nurses	Saturday	15/11/2025	Day	2&#10;Nurses	Saturday	15/11/2025	Night	2&#10;Healthcare Assistants	Saturday	15/11/2025	Day	3"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />

              {/* Parse Result */}
              {parseResult && (
                <Alert variant={parseResult.success ? "default" : "destructive"} className="text-sm">
                  <div className="flex items-start gap-2">
                    {parseResult.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      {parseResult.success ? (
                        <p>Parsed {parseResult.data.length} row(s) successfully!</p>
                      ) : (
                        <div>
                          <p className="font-semibold mb-1">Parse errors:</p>
                          <ul className="list-disc list-inside">
                            {parseResult.errors.slice(0, 3).map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleParsePaste}
                  disabled={!pasteText.trim()}
                >
                  <FileUp className="w-3 h-3 mr-1" />
                  Parse & Fill Grid
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleUploadClick}
                  disabled={isUploadingCSV}
                >
                  <Upload className="w-3 h-3 mr-1" />
                  {isUploadingCSV ? 'Uploading...' : 'Upload CSV'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download Template
                </Button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* View Controls */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b">
          {/* Role Pagination */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentRoleIndex(Math.max(0, currentRoleIndex - 2))}
              disabled={currentRoleIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-sm font-medium">
              {formData.activeRoles && formData.activeRoles.length > 0 ? (
                <>
                  <span className="capitalize">{formData.activeRoles[currentRoleIndex]?.label.split(' ')[0]}</span>
                  <span className="text-gray-500 ml-2">
                    ({Math.floor(currentRoleIndex / 2) + 1} of {Math.ceil(formData.activeRoles.length / 2)})
                  </span>
                </>
              ) : (
                'No roles'
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentRoleIndex(Math.min(formData.activeRoles.length - 2, currentRoleIndex + 2))}
              disabled={!formData.activeRoles || currentRoleIndex >= formData.activeRoles.length - 2}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">View:</span>
            <Button
              type="button"
              variant={viewMode === 'vertical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('vertical')}
            >
              <LayoutList className="w-4 h-4 mr-1" />
              Vertical
            </Button>
            <Button
              type="button"
              variant={viewMode === 'horizontal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('horizontal')}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Horizontal
            </Button>
          </div>
        </div>

        {/* Grid - Vertical Layout (Dates vertical, Shifts horizontal) */}
        {viewMode === 'vertical' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold sticky left-0 bg-gray-100 z-10">
                    Date
                  </th>
                  {formData.activeRoles?.slice(currentRoleIndex, currentRoleIndex + 2).map(role => (
                    <th key={role.key} className="border border-gray-300 px-2 py-2 text-center text-xs min-w-[120px]">
                      <div className="flex flex-col">
                        <span className="font-semibold capitalize">
                          {role.label.split(' ')[0]}
                        </span>
                        <span className="text-gray-600">
                          {role.shiftType === 'day' ? '☀️ Day' : '🌙 Night'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFillColumn(role.key)}
                        className="mt-1 text-xs text-cyan-600 hover:underline"
                      >
                        Fill ↓
                      </button>
                    </th>
                  ))}
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold bg-cyan-50">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {dateArray.map((date, dateIndex) => {
                  const currentRoles = formData.activeRoles?.slice(currentRoleIndex, currentRoleIndex + 2) || [];
                  const rowTotal = currentRoles.reduce((sum, role) => {
                    const qty = getQuantity(date, role.key);
                    return sum + (qty || 0);
                  }, 0);
                  const isWeekend = new Date(date + 'T00:00:00').getDay() % 6 === 0;
                  return (
                    <tr key={date} className={isWeekend ? 'bg-orange-50' : ''}>
                      <td className="border border-gray-300 px-3 py-2 text-sm sticky left-0 bg-white z-10">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="font-medium">{getDayName(date)}</span>
                            <span className="text-gray-600 text-xs">{formatDate(date)}</span>
                            {isWeekend && <span className="text-orange-600 text-xs">Weekend</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleFillRow(date)}
                            className="text-xs text-cyan-600 hover:underline whitespace-nowrap"
                            title="Fill all roles for this date"
                          >
                            Fill →
                          </button>
                        </div>
                      </td>
                      {currentRoles.map((role, roleIndex) => {
                        const qty = getQuantity(date, role.key);
                        const hasValue = qty && qty > 0;
                        const actualRoleIndex = currentRoleIndex + roleIndex;
                        const cellKey = getCellKey(dateIndex, actualRoleIndex);
                        const isFocused = focusedCell.dateIndex === dateIndex && focusedCell.roleIndex === actualRoleIndex;

                        return (
                          <td key={role.key} className="border border-gray-300 px-1 py-1">
                            <Input
                              ref={(el) => {
                                if (el) {
                                  inputRefs.current[cellKey] = el;
                                }
                              }}
                              type="number"
                              min="0"
                              max="99"
                              value={qty}
                              onChange={(e) => handleQuantityChange(date, role.key, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, dateIndex, actualRoleIndex)}
                              onFocus={() => handleCellFocus(dateIndex, actualRoleIndex)}
                              className={`text-center h-10 transition-all ${
                                hasValue ? 'bg-emerald-50 border-emerald-300 font-semibold' : ''
                              } ${
                                isFocused ? 'ring-2 ring-cyan-500 ring-offset-1' : ''
                              }`}
                              placeholder="0"
                            />
                          </td>
                        );
                      })}
                      <td className="border border-gray-300 px-3 py-2 text-center font-bold text-cyan-600 bg-cyan-50">
                        {rowTotal}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-cyan-100">
                  <td className="border border-gray-300 px-3 py-2 text-sm font-semibold sticky left-0 bg-cyan-100 z-10">
                    TOTALS
                  </td>
                  {formData.activeRoles?.slice(currentRoleIndex, currentRoleIndex + 2).map(role => (
                    <td key={role.key} className="border border-gray-300 px-3 py-2 text-center font-bold text-cyan-700">
                      {getColumnTotal(role.key)}
                    </td>
                  ))}
                  <td className="border border-gray-300 px-3 py-2 text-center font-bold text-lg text-cyan-700">
                    {grandTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Grid - Horizontal Layout (Dates horizontal, Shifts vertical) */}
        {viewMode === 'horizontal' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold sticky left-0 bg-gray-100 z-10">
                    Shift
                  </th>
                  {dateArray.map(date => {
                    const isWeekend = new Date(date + 'T00:00:00').getDay() % 6 === 0;
                    return (
                      <th key={date} className={`border border-gray-300 px-2 py-2 text-center text-xs min-w-[100px] ${isWeekend ? 'bg-orange-100' : ''}`}>
                        <div className="flex flex-col">
                          <span className="font-semibold">{getDayName(date).substring(0, 3)}</span>
                          <span className="text-gray-600 text-xs">{formatDate(date).split(' ').slice(0, 2).join(' ')}</span>
                          {isWeekend && <span className="text-orange-600 text-xs">Weekend</span>}
                        </div>
                      </th>
                    );
                  })}
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold bg-cyan-50">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {formData.activeRoles?.slice(currentRoleIndex, currentRoleIndex + 2).map((role, roleIndex) => {
                  const actualRoleIndex = currentRoleIndex + roleIndex;
                  const columnTotal = getColumnTotal(role.key);
                  return (
                    <tr key={role.key}>
                      <td className="border border-gray-300 px-3 py-2 text-sm sticky left-0 bg-white z-10">
                        <div className="flex flex-col">
                          <span className="font-medium capitalize">{role.label.split(' ')[0]}</span>
                          <span className="text-gray-600 text-xs">
                            {role.shiftType === 'day' ? '☀️ Day Shift' : '🌙 Night Shift'}
                          </span>
                        </div>
                      </td>
                      {dateArray.map((date, dateIndex) => {
                        const qty = getQuantity(date, role.key);
                        const hasValue = qty && qty > 0;
                        const cellKey = getCellKey(dateIndex, actualRoleIndex);
                        const isFocused = focusedCell.dateIndex === dateIndex && focusedCell.roleIndex === actualRoleIndex;
                        const isWeekend = new Date(date + 'T00:00:00').getDay() % 6 === 0;

                        return (
                          <td key={date} className={`border border-gray-300 px-1 py-1 ${isWeekend ? 'bg-orange-50' : ''}`}>
                            <Input
                              ref={(el) => {
                                if (el) {
                                  inputRefs.current[cellKey] = el;
                                }
                              }}
                              type="number"
                              min="0"
                              max="99"
                              value={qty}
                              onChange={(e) => handleQuantityChange(date, role.key, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, dateIndex, actualRoleIndex)}
                              onFocus={() => handleCellFocus(dateIndex, actualRoleIndex)}
                              className={`text-center h-10 transition-all ${
                                hasValue ? 'bg-emerald-50 border-emerald-300 font-semibold' : ''
                              } ${
                                isFocused ? 'ring-2 ring-cyan-500 ring-offset-1' : ''
                              }`}
                              placeholder="0"
                            />
                          </td>
                        );
                      })}
                      <td className="border border-gray-300 px-3 py-2 text-center font-bold text-cyan-600 bg-cyan-50">
                        {columnTotal}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDuplicateLastWeek}
              disabled={!formData.client_id || isLoadingDuplicate}
              title="Duplicate shift pattern from 7 days ago"
            >
              <Copy className="w-3 h-3 mr-1" />
              {isLoadingDuplicate ? 'Loading...' : 'Duplicate Last Week'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillWeekdays}
            >
              <Calendar className="w-3 h-3 mr-1" />
              Fill Weekdays
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillWeekends}
            >
              <Calendar className="w-3 h-3 mr-1" />
              Fill Weekends
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearAll}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
            >
              ← Back
            </Button>
            <Button
              onClick={onNext}
              disabled={grandTotal === 0}
              size="lg"
            >
              Preview {grandTotal} Shifts →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
