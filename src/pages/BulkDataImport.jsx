
import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload, Download, FileText, AlertCircle, CheckCircle, Users,
  Calendar, Building2, Shield, Loader2, Clock, Check, X, ChevronDown, ChevronUp,
  Zap, Info, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import NotificationService from "../components/notifications/NotificationService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"; // Import Input component

export default function BulkDataImport() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [importType, setImportType] = useState('shifts');
  const [previewData, setPreviewData] = useState([]);
  const [validationReport, setValidationReport] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    autoFixes: true,
    issues: true,
    suggestions: false
  });
  const [user, setUser] = useState(null);
  const [currentAgency, setCurrentAgency] = useState(null);
  const fileInputRef = useRef(null);

  // ✅ NEW: Inline editing state
  const [editingIssue, setEditingIssue] = useState(null);
  const [editValue, setEditValue] = useState('');

  // ✅ NEW: Editable cell state
  const [editingCell, setEditingCell] = useState(null); // {rowIndex, field}
  const [cellEditValue, setCellEditValue] = useState('');

  // ✅ NEW: Animated loading text
  const [loadingText, setLoadingText] = useState('Importing');

  const loadingMessages = [
    'Noodling', 'Meandering', 'Hustling', 'Tinkering', 'Chipping',
    'Crafting', 'Building', 'Pushing', 'Scribing', 'Creating',
    'Grinding', 'Hacking', 'Solving', 'Moving', 'Shaping',
    'Moulding', 'Making', 'Iterating', 'Debugging', 'Clicking',
    'Exploring', 'Navigating', 'Unwinding', 'Brewing', 'Juggling',
    'Skimming', 'Twisting', 'Drifting', 'Striding', 'Winding',
    'Flickering', 'Zooming', 'Polishing', 'Racing', 'Venturing',
    'Soaring', 'Flowing', 'Hovering', 'Rolling', 'Gliding'
  ];

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          console.error('❌ Not authenticated:', authError);
          return;
        }

        const { data: currentUser, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !currentUser) {
          console.error('❌ Profile not found:', profileError);
          return;
        }

        setUser(currentUser);

        if (currentUser.user_type === 'staff_member') {
          toast.error('Access Denied: This page is for agency admins only');
          navigate(createPageUrl('StaffPortal'));
          return;
        }

        setCurrentAgency(currentUser.agency_id);
      } catch (error) {
        console.error('Auth error:', error);
        toast.error('Authentication failed. Please log in again.');
        navigate(createPageUrl('Home'));
      }
    };
    fetchUser();
  }, [navigate]);

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', currentAgency],
    queryFn: async () => {
      if (!currentAgency) return [];
      
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('agency_id', currentAgency);
      
      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', currentAgency],
    queryFn: async () => {
      if (!currentAgency) return [];
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('agency_id', currentAgency);
      
      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('*');
      
      if (error) {
        console.error('❌ Error fetching agencies:', error);
        return [];
      }
      return data || [];
    },
    refetchOnMount: 'always'
  });

  const { data: currentAgencyObject } = useQuery({
    queryKey: ['agencyDetails', currentAgency],
    queryFn: async () => {
      if (!currentAgency) return null;
      
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', currentAgency)
        .single();
      
      if (error) {
        console.error('❌ Error fetching agency details:', error);
        return null;
      }
      return data;
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  // ✅ FIX: Move importShiftsMutation BEFORE useEffect that uses it
  const importShiftsMutation = useMutation({
    mutationFn: async (shifts) => {
      console.log('🚀 [Bulk Import] Starting comprehensive workflow for', shifts.length, 'shifts');

      const enrichedShifts = shifts.map(shift => {
        const clientMatch = clients.find(c =>
          c.name.toLowerCase() === shift.client_name?.toLowerCase()
        );

        if (!clientMatch) {
          throw new Error(`Client not found: ${shift.client_name}`);
        }

        const staffMatch = shift.assigned_staff_email
          ? staff.find(s => s.email.toLowerCase() === shift.assigned_staff_email.toLowerCase())
          : null;

        return {
          agency_id: currentAgency,
          client_id: clientMatch.id,
          role_required: shift.role_required,
          date: shift.date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          duration_hours: parseFloat(shift.duration_hours) || 12,
          work_location_within_site: shift.work_location_within_site || null,
          pay_rate: parseFloat(shift.pay_rate) || 15.0,
          charge_rate: parseFloat(shift.charge_rate) || 19.0,
          status: staffMatch ? 'assigned' : 'open',
          assigned_staff_id: staffMatch?.id || null,
          break_duration_minutes: parseInt(shift.break_duration_minutes) || 0,
          urgency: shift.urgency || 'normal',
          notes: shift.notes || '',
          requirements: null,
          shift_journey_log: [
            {
              state: 'created_via_bulk_import',
              timestamp: new Date().toISOString(),
              user_id: user?.id,
              method: 'bulk_csv_import'
            }
          ],
          staffEmail: shift.assigned_staff_email,
          clientName: shift.client_name
        };
      });

      console.log('📅 [Bulk Import] Step 1/4: Creating shifts...');
      const { data: createdShifts, error: shiftsError } = await supabase
        .from('shifts')
        .insert(enrichedShifts)
        .select();
      
      if (shiftsError) {
        console.error('❌ Error creating shifts:', shiftsError);
        throw shiftsError;
      }
      
      console.log('✅ [Bulk Import] Created', createdShifts?.length || 0, 'shifts');

      const results = {
        shifts_created: createdShifts.length,
        bookings_created: 0,
        timesheets_created: 0,
        emails_sent: 0,
        emails_failed: 0,
        client_notifications_sent: 0,
        unassigned_shifts: 0,
        errors: []
      };

      console.log('🔄 [Bulk Import] Step 2/4: Processing assigned shifts...');

      for (const shift of createdShifts) {
        if (!shift.assigned_staff_id) {
          results.unassigned_shifts++;
          console.log(`⏭️ [Bulk Import] Shift ${shift.id.substring(0, 8)} - No staff assigned, skipping workflow`);
          continue;
        }

        try {
          console.log(`📋 [Bulk Import] Processing shift ${shift.id.substring(0, 8)} for staff ${shift.assigned_staff_id.substring(0, 8)}`);

          const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
              agency_id: shift.agency_id,
              shift_id: shift.id,
            staff_id: shift.assigned_staff_id,
            client_id: shift.client_id,
            status: 'confirmed',
            booking_date: new Date().toISOString(),
            shift_date: shift.date,
            start_time: shift.start_time,
            end_time: shift.end_time,
            confirmation_method: 'bulk_import'
          });
          results.bookings_created++;
          console.log(`✅ [Bulk Import] Booking created: ${booking.id.substring(0, 8)}`);

          try {
            const { data: timesheetRes, error: timesheetError } = await supabase.functions.invoke('auto-timesheet-creator', {
              body: {
                booking_id: booking.id,
                shift_id: shift.id,
                staff_id: shift.assigned_staff_id,
                client_id: shift.client_id,
                agency_id: shift.agency_id
              }
            });

            if (timesheetRes.data?.success) {
              results.timesheets_created++;
              console.log(`✅ [Bulk Import] Timesheet created: ${timesheetRes.data.timesheet_id?.substring(0, 8)}`);
            } else {
              console.warn(`⚠️ [Bulk Import] Timesheet creation returned non-success:`, timesheetRes.data?.message);
              results.errors.push({
                shift_id: shift.id.substring(0, 8),
                error: `Timesheet: ${timesheetRes.data?.message || 'Unknown error'}`
              });
            }
          } catch (tsError) {
            console.error(`❌ [Bulk Import] Timesheet error for shift ${shift.id.substring(0, 8)}:`, tsError.message);
            results.errors.push({
                shift_id: shift.id.substring(0, 8),
                error: `Timesheet: ${tsError.message}`
            });
          }

          const shouldSendNotifications = true;
          
          if (shouldSendNotifications) {
            try {
              const staffMember = staff.find(s => s.id === shift.assigned_staff_id);
              const client = clients.find(c => c.id === shift.client_id);
              const agency = agencies.find(a => a.id === shift.agency_id);

              if (!staffMember) {
                console.warn(`⚠️ [Bulk Import] Staff not found: ${shift.assigned_staff_id}`);
              } else if (!agency) {
                console.warn(`⚠️ [Bulk Import] Agency not found: ${shift.agency_id}`);
              } else {
                const emailResult = await NotificationService.notifyShiftAssignment({
                  staff: staffMember,
                  shift: shift,
                  client: client,
                  agency: agency
                });

                if (emailResult.success) {
                  results.emails_sent++;
                  console.log(`📧 [Bulk Import] Staff notification sent to ${staffMember.email}`);
                } else {
                  results.emails_failed++;
                  console.warn(`⚠️ [Bulk Import] Staff email failed:`, emailResult.error);
                }

                try {
                  await supabase.functions.invoke('shift-verification-chain', {
                    body: {
                      shift_id: shift.id,
                      trigger_point: 'staff_assigned'
                    }
                  });
                  results.client_notifications_sent++;
                  console.log(`📧 [Bulk Import] Client notification triggered for ${client.name}`);
                } catch (clientError) {
                  console.warn(`⚠️ [Bulk Import] Client notification failed:`, clientError.message);
                }
              }
            } catch (emailError) {
              results.emails_failed++;
              console.error(`❌ [Bulk Import] Notification error for shift ${shift.id.substring(0, 8)}:`, emailError.message);
              results.errors.push({
                shift_id: shift.id.substring(0, 8),
                error: `Notifications: ${emailError.message}`
              });
            }
          }

        } catch (error) {
          console.error(`❌ [Bulk Import] Critical error for shift ${shift.id.substring(0, 8)}:`, error);
          results.errors.push({
            shift_id: shift.id.substring(0, 8),
            error: error.message
          });
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✅ [Bulk Import] Workflow complete!', results);
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['bookings']);
      queryClient.invalidateQueries(['timesheets']);
      queryClient.invalidateQueries(['workflows']);
      queryClient.invalidateQueries(['my-shifts']);

      const successParts = [];
      successParts.push(`✅ ${results.shifts_created} shifts created`);
      if (results.bookings_created > 0) successParts.push(`📋 ${results.bookings_created} bookings created`);
      if (results.timesheets_created > 0) successParts.push(`🕒 ${results.timesheets_created} timesheets created`);
      if (results.emails_sent > 0) successParts.push(`📧 ${results.emails_sent} staff notified`);
      if (results.client_notifications_sent > 0) successParts.push(`🏥 ${results.client_notifications_sent} clients notified`);
      if (results.unassigned_shifts > 0) successParts.push(`⏭️ ${results.unassigned_shifts} left unassigned`);

      toast.success(
        <div>
          <p className="font-bold">Import Complete!</p>
          {successParts.map((part, idx) => (
            <p key={idx} className="text-sm">{part}</p>
          ))}
          {results.errors.length > 0 && (
            <p className="text-xs text-amber-700 mt-2">
              ⚠️ {results.errors.length} non-critical errors (check console)
            </p>
          )}
        </div>,
        { duration: 8000 }
      );

      setTimeout(() => {
        setPreviewData([]);
        setSelectedFile(null);
        setValidationReport(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 3000);
    },
    onError: (error) => {
      console.error('❌ [Bulk Import] Fatal error:', error);
      toast.error(`Import failed: ${error.message}`);
    }
  });

  // ✅ NOW SAFE: useEffect can access importShiftsMutation.status
  useEffect(() => {
    if (importShiftsMutation.status === 'pending') {
      let index = 0;
      const interval = setInterval(() => {
        index = (index + 1) % loadingMessages.length;
        setLoadingText(loadingMessages[index]);
      }, 800); // Change every 800ms

      return () => clearInterval(interval);
    } else {
      setLoadingText('Importing'); // Reset text when not pending
    }
  }, [importShiftsMutation.status, loadingMessages]); // Added loadingMessages to dependencies

  // ✅ MODIFIED: Use rows from validation response (with auto-converted dates)
  const validateImportData = async (rows) => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-bulk-import', {
        body: {
          rows,
          import_type: importType,
          agency_id: currentAgency
        }
      });

      console.log('📊 [Validation] Report:', data);

      // ✅ NEW: Update preview data with auto-converted dates
      if (data.rows) {
        setPreviewData(data.rows);
        if (data.validation.auto_converted_dates > 0) {
          console.log(`✅ [Validation] Updated preview data with ${data.validation.auto_converted_dates} auto-converted UK dates`);
        }
      }
      
      setValidationReport(data);
      return data;
    } catch (error) {
      console.error('❌ [Validation] Error:', error);
      toast.error('Validation failed: ' + error.message);
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  // ENHANCED: File upload with validation
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationReport(null);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split('\n').map(row => row.split(','));
      
      if (rows.length < 2) {
        toast.error('CSV file must contain headers and at least one data row');
        if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input
        setSelectedFile(null); // Clear selected file
        setPreviewData([]); // Clear preview data
        return;
      }

      const headers = rows[0].map(h => h.trim());
      // Filter out completely empty rows, but keep rows with some content
      const dataRows = rows.slice(1).filter(row => row.some(cell => cell.trim()));

      const parsedData = dataRows.map((row, idx) => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header.toLowerCase().replace(/ /g, '_')] = row[i]?.trim() || '';
        });
        obj._rowIndex = idx + 2; // +2 because of header row and 0-based index
        return obj;
      });

      // Initially set previewData, it will be updated by validateImportData with auto-converted dates
      setPreviewData(parsedData); 

      // Run enterprise validation
      await validateImportData(parsedData);
    };

    reader.readAsText(file);
  };

  // NEW: Apply auto-fix
  const applyAutoFix = (fix) => {
    // Deep copy the validationReport to ensure immutability with nested objects
    const updatedReport = JSON.parse(JSON.stringify(validationReport));
    
    updatedReport.validation.auto_fixes = updatedReport.validation.auto_fixes.filter(f => 
        !(f.row === fix.row && f.field === fix.field && f.original === fix.original)
    );
    updatedReport.validation.auto_fixable = (updatedReport.validation.auto_fixable || 0) - 1;
    updatedReport.validation.clean_rows = (updatedReport.validation.clean_rows || 0) + 1;

    // Recalculate ready_to_import based on new counts
    updatedReport.ready_to_import = (updatedReport.validation.critical_errors === 0 && updatedReport.validation.issues.length === 0);

    setValidationReport(updatedReport);
    toast.success(`✅ Applied: "${fix.original}" → "${fix.corrected}"`);
    // Re-validate to update previewData after auto-fix (as backend might apply the fix)
    validateImportData(previewData); // Pass current previewData, backend will apply the fix
  };

  // ✅ NEW: Inline fix for critical issues
  const handleQuickFix = (issue) => {
    setEditingIssue(issue);
    setEditValue(issue.value || '');
  };

  const applyInlineFix = async () => {
    if (!editingIssue || !editValue.trim()) {
      toast.error('Please enter or select a valid value');
      return;
    }

    // Update preview data locally first
    const updatedData = previewData.map((row) => {
      if (row._rowIndex === editingIssue.row) {
        return {
          ...row,
          [editingIssue.field]: editValue.trim()
        };
      }
      return row;
    });

    setPreviewData(updatedData);
    setEditingIssue(null);
    setEditValue('');

    // Re-validate to update report and get any new auto-fixes/issues
    toast.info('Re-validating data...');
    await validateImportData(updatedData);
  };

  // ✅ FIXED: Handle cell edit - use actual array index, not _rowIndex
  const handleCellEdit = (rowIdx, field) => {
    setEditingCell({ rowIndex: rowIdx, field });
    setCellEditValue(previewData[rowIdx][field] || '');
  };

  const handleCellSave = async () => {
    if (editingCell === null) return;

    const updatedData = previewData.map((row, idx) => {
      if (idx === editingCell.rowIndex) {
        return {
          ...row,
          [editingCell.field]: cellEditValue.trim()
        };
      }
      return row;
    });

    setPreviewData(updatedData);
    setEditingCell(null);
    setCellEditValue('');

    // Re-validate after edit
    toast.info('Re-validating data...');
    await validateImportData(updatedData);
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setCellEditValue('');
  };


  const handleImport = () => {
    if (!validationReport || !validationReport.ready_to_import) {
      toast.error('Please fix validation errors before importing');
      return;
    }

    if (importType === 'shifts') {
      importShiftsMutation.mutate(previewData);
    }
  };

  const downloadTemplate = () => {
    let csvContent = '';
    
    if (importType === 'shifts') {
      // 🇬🇧 UK DATE FORMAT in template
      csvContent = 'client_name,role_required,date,start_time,end_time,duration_hours,work_location_within_site,shift_type,pay_rate,charge_rate,break_duration_minutes,urgency,notes,requirements,assigned_staff_email\n';
      csvContent += 'Divine Care Centre,nurse,15/11/2025,08:00,20:00,12,Room 14,day_shift,18.50,24.05,60,normal,Medication round required,DBS check valid,chidi@example.com\n';
      csvContent += 'Lindisfarne Care Home,care_worker,16/11/2025,20:00,08:00,12,L/D 15&16,night_shift,16.00,20.80,60,urgent,2 staff required,Senior level,\n';
    } else if (importType === 'staff') {
      csvContent = 'first_name,last_name,email,phone,role,date_of_birth,address,postcode,national_insurance_number,bank_account_name,bank_sort_code,bank_account_number,status,hourly_rate,employment_type,availability_notes,emergency_contact_name,emergency_contact_phone,emergency_contact_relationship,skills,months_of_experience,nmc_pin,medication_trained,driving_license_number,profile_photo_url,proposed_first_shift_date\n';
      csvContent += 'Chidi,Okonkwo,chidi@example.com,07123456789,care_worker,15/03/1995,123 High Street,SW1A 1AA,AB123456C,Chidi Okonkwo,12-34-56,12345678,active,18.50,temporary,Weekends preferred,Jane Okonkwo,07987654321,Spouse,Mental Health Care,36,,,ABC123456,https://example.com/photo.jpg,01/01/2025\n';
    } else if (importType === 'clients') {
      csvContent = 'name,type,contact_person_name,contact_person_email,contact_person_phone,contact_person_role,billing_email,address_line1,address_line2,city,postcode,latitude,longitude,bed_capacity,cqc_rating,payment_terms,contract_start_date,contract_type,preferred_staffing_roles,max_concurrent_staff,notes,require_location_specification\n';
      csvContent += 'Divine Care Centre,care_home,Margaret Smith,manager@divine.com,01234567890,Care Home Manager,accounts@divine.com,100 High Street,,Wingate,TS28 5EN,54.6946,-1.3644,50,good,net_30,01/01/2024,rolling,nurse care_worker,5,CQC Outstanding,true\n';
    } else if (importType === 'compliance') {
      csvContent = 'staff_email,document_type,document_name,certification_number,issue_date,expiry_date,issuing_organization,status,notes\n';
      csvContent += 'chidi@example.com,dbs_check,DBS Enhanced Check,DBS123456789,15/11/2023,15/11/2026,UK Home Office,verified,Enhanced DBS for healthcare\n';
    } else if (importType === 'timesheets') {
      csvContent = 'staff_email,client_name,shift_date,work_location_within_site,clock_in_time,clock_out_time,break_duration_minutes,total_hours,hourly_rate,status,notes\n';
      csvContent += 'chidi@example.com,Divine Care Centre,30/10/2025,Room 14,2025-10-30T08:00:00,2025-10-30T20:00:00,60,11,18.50,approved,Shift completed successfully\n';
    } else if (importType === 'staff_availability') {
      csvContent = 'staff_email,monday,tuesday,wednesday,thursday,friday,saturday,sunday\n';
      csvContent += 'chidi@example.com,day night,day night,day,day night,day,day night,night\n';
    } else if (importType === 'client_rates') {
      csvContent = 'client_name,role,pay_rate,charge_rate,payment_terms\n';
      csvContent += 'Divine Care Centre,care_worker,14.75,19.18,net_30\n';
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importType}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(`✅ Template downloaded: ${importType}_template.csv (using UK date format DD/MM/YYYY)`);
  };

  const importTypes = [
    { 
      value: 'clients', 
      icon: Building2, 
      label: 'Clients / Care Homes', 
      description: 'Import client facilities and contract details',
      priority: 1
    },
    { 
      value: 'staff', 
      icon: Users, 
      label: 'Staff Members', 
      description: 'Import staff profiles, roles, and contact details',
      priority: 2
    },
    { 
      value: 'staff_availability', 
      icon: Clock, 
      label: 'Staff Availability', 
      description: 'Import staff availability schedules and shift preferences',
      priority: 3
    },
    { 
      value: 'client_rates', 
      icon: FileText, 
      label: 'Client Contract Rates', 
      description: 'Import client-specific rates by role',
      priority: 4
    },
    { 
      value: 'compliance', 
      icon: Shield, 
      label: 'Compliance Documents', 
      description: 'Import compliance document records and expiry dates',
      priority: 5
    },
    { 
      value: 'shifts', 
      icon: Calendar, 
      label: 'Shifts', 
      description: 'Import shift schedules with dates and times',
      priority: 6
    },
    { 
      value: 'timesheets', 
      icon: Clock, 
      label: 'Historical Timesheets', 
      description: 'Import historical timesheet data (last 3-6 months)',
      priority: 7
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bulk Data Import</h2>
        <p className="text-gray-600 mt-1">Import staff, clients, shifts, compliance records, and historical timesheets via CSV</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Select Import Type</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {importTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => {
                    setImportType(type.value);
                    setPreviewData([]);
                    setValidationReport(null);
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    setEditingIssue(null); // Clear any active editing
                    setEditValue(''); // Clear edit value
                    setEditingCell(null); // Clear any active cell editing
                    setCellEditValue(''); // Clear cell edit value
                  }}
                  className={`relative p-6 border-2 rounded-xl text-left transition-all ${
                    importType === type.value
                      ? 'border-cyan-500 bg-cyan-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-full bg-gradient-to-r ${
                    type.priority <= 2 ? 'from-green-500 to-emerald-600' :
                    type.priority <= 4 ? 'from-blue-500 to-cyan-600' :
                    'from-purple-500 to-pink-600'
                  } flex items-center justify-center text-white text-xs font-bold`}>
                    {type.priority}
                  </div>
                  <Icon className={`w-8 h-8 mb-3 ${importType === type.value ? 'text-cyan-600' : 'text-gray-400'}`} />
                  <h3 className="font-semibold text-gray-900 mb-1">{type.label}</h3>
                  <p className="text-sm text-gray-600">{type.description}</p>
                  {importType === type.value && (
                    <Badge className="mt-3 bg-cyan-600">Selected</Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="capitalize">Import {importType.replace('_', ' ')}</CardTitle>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {previewData.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Click to upload CSV file</h3>
              <p className="text-gray-600 mb-4">or drag and drop your file here</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button asChild>
                  <span>Choose File</span>
                </Button>
              </label>
              <p className="text-xs text-gray-500 mt-4">Need a template? Download one above.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-cyan-600" />
                  <div>
                    <p className="font-semibold text-gray-900">{selectedFile?.name}</p>
                    <p className="text-sm text-gray-600">{previewData.length} records found</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  setPreviewData([]);
                  setSelectedFile(null);
                  setValidationReport(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  setEditingIssue(null);
                  setEditValue('');
                  setEditingCell(null);
                  setCellEditValue('');
                }}>
                  Change File
                </Button>
              </div>

              {isValidating && (
                <Alert className="border-blue-300 bg-blue-50">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <AlertDescription>
                    <p className="font-semibold text-blue-900">🔍 Running Enterprise Validation...</p>
                    <p className="text-sm text-blue-800 mt-1">
                      Checking for errors, fuzzy matching client names, validating emails, and analyzing data quality...
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {validationReport && !isValidating && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600 uppercase">Clean</p>
                            <p className="text-2xl font-bold text-green-600">
                              {validationReport.validation.clean_rows}
                            </p>
                          </div>
                          <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600 uppercase">Auto-Fixable</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {validationReport.validation.auto_fixable}
                            </p>
                          </div>
                          <Zap className="w-8 h-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600 uppercase">Review Needed</p>
                            <p className="text-2xl font-bold text-orange-600">
                              {validationReport.validation.requires_review}
                            </p>
                          </div>
                          <AlertTriangle className="w-8 h-8 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-red-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600 uppercase">Critical Errors</p>
                            <p className="text-2xl font-bold text-red-600">
                              {validationReport.validation.critical_errors}
                            </p>
                          </div>
                          <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* ✅ NEW: Auto-conversion success banner */}
                  {validationReport.validation.auto_converted_dates > 0 && (
                    <Alert className="border-green-300 bg-green-50">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <AlertDescription>
                        <p className="font-semibold text-green-900">
                          ✅ Auto-converted {validationReport.validation.auto_converted_dates} UK dates (DD/MM/YYYY → YYYY-MM-DD)
                        </p>
                        <p className="text-sm text-green-800 mt-1">
                          Dates in the preview table have been automatically converted for database compatibility. No manual action needed.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Alert className={
                    validationReport.validation.critical_errors > 0 ? 'border-red-300 bg-red-50' :
                    validationReport.validation.issues.length > 0 ? 'border-orange-300 bg-orange-50' : // If issues, even if not critical, it requires review
                    validationReport.validation.auto_fixable > 0 ? 'border-blue-300 bg-blue-50' :
                    'border-green-300 bg-green-50'
                  }>
                    {validationReport.validation.critical_errors > 0 || validationReport.validation.issues.length > 0 ? <AlertCircle className="h-5 w-5 text-red-600" /> :
                     validationReport.validation.auto_fixable > 0 ? <Zap className="h-5 w-5 text-blue-600" /> :
                     <CheckCircle className="h-5 w-5 text-green-600" />}
                    <AlertDescription>
                      <p className={`font-semibold ${
                        validationReport.validation.critical_errors > 0 ? 'text-red-900' :
                        validationReport.validation.issues.length > 0 ? 'text-orange-900' :
                        validationReport.validation.auto_fixable > 0 ? 'text-blue-900' :
                        'text-green-900'
                      }`}>
                        {validationReport.recommendation}
                      </p>
                    </AlertDescription>
                  </Alert>

                  {validationReport.validation.auto_fixes.length > 0 && (
                    <Card className="border-2 border-blue-300">
                      <CardHeader 
                        className="cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors"
                        onClick={() => setExpandedSections(prev => ({ ...prev, autoFixes: !prev.autoFixes }))}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-blue-600" />
                            <CardTitle className="text-blue-900">
                              Auto-Fixable Issues ({validationReport.validation.auto_fixes.length})
                            </CardTitle>
                          </div>
                          {expandedSections.autoFixes ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </CardHeader>
                      {expandedSections.autoFixes && (
                        <CardContent className="p-4 space-y-3">
                          {validationReport.validation.auto_fixes.map((fix, idx) => (
                            <div key={idx} className="p-4 bg-white border border-blue-200 rounded-lg">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-blue-100 text-blue-800">Row {fix.row}</Badge>
                                    <Badge variant="outline">{fix.field.replace(/_/g, ' ')}</Badge>
                                    <Badge className={fix.confidence >= 95 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                      {fix.confidence}% match
                                    </Badge>
                                  </div>
                                  <div className="text-sm space-y-1">
                                    <p className="text-gray-600">
                                      <span className="line-through text-red-600">{fix.original}</span>
                                      <span className="mx-2">→</span>
                                      <span className="text-green-600 font-semibold">{fix.corrected}</span>
                                    </p>
                                    {fix.reason && (
                                      <p className="text-xs text-gray-500">Reason: {fix.reason}</p>
                                    )}
                                    {fix.alternatives && fix.alternatives.length > 0 && (
                                      <p className="text-xs text-gray-500">
                                        Alternatives: {fix.alternatives.map(a => `${a.name} (${a.confidence}%)`).join(', ')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {fix.auto_apply && (
                                  <Button 
                                    size="sm" 
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={() => applyAutoFix(fix)}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Apply Fix
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      )}
                    </Card>
                  )}

                  {/* ✅ MODIFIED: Critical Issues with inline editing */}
                  {validationReport.validation.issues.length > 0 && (
                    <Card className="border-2 border-red-300">
                      <CardHeader 
                        className="cursor-pointer bg-red-50 hover:bg-red-100 transition-colors"
                        onClick={() => setExpandedSections(prev => ({ ...prev, issues: !prev.issues }))}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <CardTitle className="text-red-900">
                              Critical Issues ({validationReport.validation.issues.length})
                            </CardTitle>
                          </div>
                          {expandedSections.issues ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </CardHeader>
                      {expandedSections.issues && (
                        <CardContent className="p-4 space-y-2">
                          {validationReport.validation.issues.map((issue, idx) => (
                            <div key={idx} className="p-3 bg-white border border-red-200 rounded-lg">
                              <div className="flex items-start gap-3">
                                <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge className="bg-red-100 text-red-800">Row {issue.row}</Badge>
                                    <Badge variant="outline">{issue.field}</Badge>
                                    <Badge className={
                                      issue.severity === 'critical' ? 'bg-red-600 text-white' :
                                      issue.severity === 'high' ? 'bg-orange-500 text-white' :
                                      'bg-yellow-100 text-yellow-800'
                                    }>
                                      {issue.severity}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-900 font-medium">{issue.message}</p>
                                  {issue.value && (
                                    <p className="text-xs text-gray-600 mt-1">Value: "{issue.value}"</p>
                                  )}
                                  {issue.suggestion && (
                                    <p className="text-xs text-blue-600 mt-1">💡 Suggestion: {issue.suggestion}</p>
                                  )}
                                  
                                  {/* ✅ NEW: Inline editing UI */}
                                  {issue.fixable_inline && issue.available_options && (
                                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                                      {editingIssue?.row === issue.row && editingIssue?.field === issue.field ? (
                                        <div className="space-y-2">
                                          <Label className="text-xs font-semibold text-blue-900">
                                            Quick Fix: Select correct {issue.field.replace(/_/g, ' ')}
                                          </Label>
                                          <Select value={editValue} onValueChange={setEditValue}>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Choose from database..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {issue.available_options.map((opt) => (
                                                <SelectItem key={opt.id || opt.name} value={opt.name}>
                                                  {opt.name}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <div className="flex gap-2">
                                            <Button size="sm" onClick={applyInlineFix}>
                                              <Check className="w-3 h-3 mr-1" />
                                              Apply Fix
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setEditingIssue(null)}>
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => handleQuickFix(issue)}
                                          className="text-blue-700 border-blue-300 hover:bg-blue-100"
                                        >
                                          <Zap className="w-3 h-3 mr-1" />
                                          Quick Fix
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      )}
                    </Card>
                  )}

                  {validationReport.validation.suggestions.length > 0 && (
                    <Card className="border-2 border-gray-300">
                      <CardHeader 
                        className="cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                        onClick={() => setExpandedSections(prev => ({ ...prev, suggestions: !prev.suggestions }))}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Info className="w-5 h-5 text-gray-600" />
                            <CardTitle className="text-gray-900">
                              Informational ({validationReport.validation.suggestions.length})
                            </CardTitle>
                          </div>
                          {expandedSections.suggestions ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </CardHeader>
                      {expandedSections.suggestions && (
                        <CardContent className="p-4 space-y-2">
                          {validationReport.validation.suggestions.map((suggestion, idx) => (
                            <div key={idx} className="p-3 bg-white border rounded-lg">
                              <div className="flex items-start gap-3">
                                <Info className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline">Row {suggestion.row}</Badge>
                                    <Badge variant="outline">{suggestion.field}</Badge>
                                  </div>
                                  <p className="text-sm text-gray-700">{suggestion.message}</p>
                                  {suggestion.suggestion && (
                                    <p className="text-xs text-gray-600 mt-1">💡 {suggestion.suggestion}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      )}
                    </Card>
                  )}
                </div>
              )}

              {/* ✅ ENHANCED: Editable Data Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Data Preview</h3>
                    <p className="text-xs text-gray-600 mt-1">💡 Click any cell to edit directly</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    ✏️ Editable
                  </Badge>
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {Object.keys(previewData[0] || {}).filter(k => k !== '_rowIndex').map(key => (
                          <th key={key} className="px-4 py-3 text-left font-semibold text-gray-900 border-b uppercase text-xs">
                            {key.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b hover:bg-gray-50">
                          {Object.entries(row).filter(([k]) => k !== '_rowIndex').map(([key, value]) => {
                            const isEditing = editingCell?.rowIndex === rowIdx && editingCell?.field === key;

                            return (
                              <td 
                                key={key} 
                                className={`px-4 py-3 text-gray-700 ${!isEditing ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''}`}
                                onClick={() => !isEditing && handleCellEdit(rowIdx, key)}
                              >
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={cellEditValue}
                                      onChange={(e) => setCellEditValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleCellSave();
                                        } else if (e.key === 'Escape') {
                                          handleCellCancel();
                                        }
                                      }}
                                      className="h-8 text-sm"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      onClick={handleCellSave}
                                      className="h-8 px-2 bg-green-600 hover:bg-green-700"
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCellCancel}
                                      className="h-8 px-2"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="block py-1">
                                    {value || <span className="text-gray-400 italic">empty</span>}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ✅ MODIFIED: Action Buttons with animated loading text */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreviewData([]);
                    setSelectedFile(null);
                    setValidationReport(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    setEditingIssue(null);
                    setEditValue('');
                    setEditingCell(null);
                    setCellEditValue('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!validationReport || !validationReport.ready_to_import || importShiftsMutation.status === 'pending'}
                  className={
                    validationReport && validationReport.ready_to_import 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-400'
                  }
                >
                  {importShiftsMutation.status === 'pending' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {loadingText}...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Import {previewData.length} Records
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
