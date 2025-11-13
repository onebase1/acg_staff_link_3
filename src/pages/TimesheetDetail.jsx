
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock, MapPin, FileText, CheckCircle, XCircle, DollarSign,
  AlertTriangle, User, Building2, Calendar, Eye, Download,
  Upload, ArrowLeft, Sun, Moon, Sunrise, TrendingUp, TrendingDown
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import GPSIndicator from "../components/timesheets/GPSIndicator";

export default function TimesheetDetail() {
  const [timesheetId, setTimesheetId] = useState(null);
  const [user, setUser] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState(null); // New state for upload error
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTimesheetId(params.get('id'));
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
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
    };
    fetchUser();
  }, []);

  const { data: timesheet, refetch: refetchTimesheet } = useQuery({
    queryKey: ['timesheet', timesheetId],
    queryFn: async () => {
      if (!timesheetId) return null;
      
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('id', timesheetId)
        .single();
      
      if (error) {
        console.error('❌ Error fetching timesheet:', error);
        return null;
      }
      return data;
    },
    enabled: !!timesheetId,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const { data: staff } = useQuery({
    queryKey: ['staff', timesheet?.staff_id],
    queryFn: async () => {
      if (!timesheet?.staff_id) return null;
      
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('id', timesheet.staff_id)
        .single();
      
      if (error) {
        console.error('❌ Error fetching staff:', error);
        return null;
      }
      return data;
    },
    enabled: !!timesheet?.staff_id,
    refetchOnMount: 'always'
  });

  const { data: client } = useQuery({
    queryKey: ['client', timesheet?.client_id],
    queryFn: async () => {
      if (!timesheet?.client_id) return null;
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', timesheet.client_id)
        .single();
      
      if (error) {
        console.error('❌ Error fetching client:', error);
        return null;
      }
      return data;
    },
    enabled: !!timesheet?.client_id,
    refetchOnMount: 'always'
  });

  const { data: shift } = useQuery({
    queryKey: ['shift', timesheet?.booking_id],
    queryFn: async () => {
      if (timesheet?.booking_id) {
        const { data: bookings, error: bookingError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', timesheet.booking_id)
          .single();
        
        if (!bookingError && bookings?.shift_id) {
          const { data: shifts, error: shiftError } = await supabase
            .from('shifts')
            .select('*')
            .eq('id', bookings.shift_id)
            .single();
          
          if (!shiftError && shifts) {
            return shifts;
          }
        }
      }

      const { data: allShifts, error } = await supabase
        .from('shifts')
        .select('*');
      
      if (error) {
        console.error('❌ Error fetching shifts:', error);
        return null;
      }
      
      const matchingShift = allShifts?.find(s =>
        s.date === timesheet.shift_date &&
        s.client_id === timesheet.client_id &&
        (s.assigned_staff_id === timesheet.staff_id || !s.assigned_staff_id)
      );

      return matchingShift;
    },
    enabled: !!timesheet
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await supabase
        .from('timesheets')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['timesheet', timesheetId]);
      queryClient.invalidateQueries(['timesheets']);
      toast.success('Timesheet updated');
    }
  });

  const uploadFileMutation = useMutation({ // Renamed to keep consistency with existing call sites
    mutationFn: async (file) => {
      setUploadingDoc(true); // Changed from setUploading to setUploadingDoc
      setUploadError(null);

      try {
        console.log('📤 Starting document upload...');
        toast.info('📤 Uploading document and extracting data with AI...');

        const fileName = `timesheets/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file);
        
        if (uploadError) {
          console.error('❌ Upload error:', uploadError);
          throw uploadError;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);
        
        const file_url = publicUrl;
        console.log('✅ File uploaded:', file_url);

        console.log('🔍 Extracting timesheet data with OCR...');
        const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('extract-timesheet-data', {
          body: {
            file_url,
            expected_staff_name: staff ? `${staff.first_name} ${staff.last_name}` : null,
            expected_client_name: client?.name,
            expected_date: timesheet?.shift_date,
            expected_hours: timesheet?.total_hours
          }
        });

        console.log('📊 OCR Result:', ocrResult.data);

        // Map OCR response for toast messages
        if (ocrResult.data?.success) {
          if (ocrResult.data.confidence_score) {
            if (ocrResult.data.confidence_score >= 80) {
              toast.success(`✅ High confidence extraction (${ocrResult.data.confidence_score}%)`);
            } else if (ocrResult.data.confidence_score >= 60) {
              toast.warning(`⚠️ Medium confidence extraction (${ocrResult.data.confidence_score}%) - Please review`);
            } else {
              toast.error(`❌ Low confidence extraction (${ocrResult.data.confidence_score}%) - Manual review required`);
            }
          }

          if (ocrResult.data.discrepancies && ocrResult.data.discrepancies.length > 0) {
            const critical = ocrResult.data.discrepancies.filter(m => m.severity === 'critical');
            if (critical.length > 0) {
              toast.error(`🚨 Critical discrepancies detected! Manual review required.`);
            }
          }
        } else {
          console.log('⚠️ OCR extraction failed:', ocrResult.data);
          toast.warning('Document uploaded, but OCR extraction failed. File is still saved.');
        }

        const newDocument = {
          file_url,
          uploaded_at: new Date().toISOString(),
          uploaded_by: user?.email || 'unknown', // Changed from currentUser to user
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          notes: `OCR Status: ${ocrResult.data?.status || 'failed'}`,
          extracted_data: ocrResult.data // Use extracted_data to be consistent with existing UI render logic
        };

        const existingDocs = timesheet.uploaded_documents || [];

        const { error: updateError } = await supabase
          .from('timesheets')
          .update({
            uploaded_documents: [...existingDocs, newDocument]
          })
          .eq('id', timesheetId);

        // CRITICAL: Auto-trigger validation if discrepancies detected
        if (ocrResult.data.status === 'success' && ocrResult.data.discrepancies?.length > 0) {
          console.log('⚠️ Discrepancies detected - triggering intelligentTimesheetValidator...');

          try {
            const { data: validationResult, error: validationError } = await supabase.functions.invoke('intelligent-timesheet-validator', {
              body: {
                timesheet_id: timesheetId,
                ocr_extracted_data: ocrResult.data.extracted_data,
                expected_data: {
                  staff_name: staff ? `${staff.first_name} ${staff.last_name}` : null,
                  client_name: client?.name,
                  shift_date: timesheet?.shift_date,
                  hours: timesheet?.total_hours
                },
                discrepancies: ocrResult.data.discrepancies,
                confidence_score: ocrResult.data.confidence_score
              }
            });

            console.log('✅ Validation triggered:', validationResult.data);

            if (validationResult.data.workflow_created) {
              toast.success('📋 Discrepancy detected - AdminWorkflow created for review');
            }
          } catch (validationError) {
            console.error('❌ Failed to trigger validation:', validationError);
            toast.warning('OCR completed but validation failed to trigger');
          }
        }

        toast.success('✅ Document uploaded and processed successfully!');
        return file_url; // Return something on success
      } catch (error) {
        console.error('Upload error:', error);
        setUploadError(error.message);
        toast.error(`Upload failed: ${error.message}`); // Move general error toast here
        throw error;
      } finally {
        setUploadingDoc(false); // Changed from setUploading to setUploadingDoc
      }
    },
    onSuccess: async () => { // Modified to match combined requirements
      queryClient.invalidateQueries(['timesheet', timesheetId]);
      queryClient.invalidateQueries(['timesheets']); // Ensure general timesheet lists are updated
      queryClient.invalidateQueries(['workflows']); // Refresh workflows in case one was created
      setUploadingDoc(false); // Ensure upload state is reset
      await refetchTimesheet(); // Force immediate refetch for UI update
    },
    onError: (error) => {
      // toast.error is already handled inside mutationFn's catch block, so avoid double toast here.
      setUploadingDoc(false); // Ensure upload state is reset
    }
  });

  const handleFileUpload = async (file) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadingDoc(true);
    uploadFileMutation.mutate(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleApprove = () => {
    updateMutation.mutate({
      id: timesheetId,
      data: {
        status: 'approved',
        client_approved_at: new Date().toISOString()
      }
    });
  };

  const handleReject = () => {
    const reason = prompt('Please enter rejection reason:');
    if (reason) {
      updateMutation.mutate({
        id: timesheetId,
        data: {
          status: 'rejected',
          rejection_reason: reason
        }
      });
    }
  };

  const handleCreateInvoice = async () => {
    if (!window.confirm('Create invoice for this timesheet? This will group it with other approved timesheets for the same client.')) {
      return;
    }

    try {
      toast.info('🔄 Creating invoice...');

      const { data: response, error: invoiceError } = await supabase.functions.invoke('auto-invoice-generator', {
        body: {
          timesheet_ids: [timesheetId],
          auto_mode: false
        }
      });

      if (response.data?.success) {
        toast.success(`✅ Invoice created! ${response.data.invoices_created} invoice(s) generated.`);
        queryClient.invalidateQueries(['timesheet', timesheetId]);
        queryClient.invalidateQueries(['timesheets']);
        queryClient.invalidateQueries(['invoices']);

        // Navigate to invoices page
        setTimeout(() => {
          navigate(createPageUrl('Invoices'));
        }, 2000);
      } else {
        toast.error(`Failed to create invoice: ${response.data?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Invoice creation error:', error);
      toast.error(`Error creating invoice: ${error.message}`);
    }
  };

  if (!timesheet) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  const getShiftType = () => {
    if (!shift || !shift.start_time) {
      return { label: 'Unknown', icon: Clock, color: 'text-gray-600' };
    }

    const startHour = parseInt(shift.start_time.split(':')[0]);

    if (startHour >= 20 || startHour < 6) {
      return { label: 'Night Shift', icon: Moon, color: 'text-indigo-600' };
    } else if (startHour >= 6 && startHour < 12) {
      return { label: 'Day Shift', icon: Sun, color: 'text-yellow-600' };
    } else {
      return { label: 'Long Day', icon: Sunrise, color: 'text-orange-600' };
    }
  };

  const shiftType = getShiftType();
  const ShiftTypeIcon = shiftType.icon;

  const getStatusBadge = (status) => {
    const variants = {
      draft: { className: 'bg-gray-100 text-gray-700', text: 'Draft' },
      submitted: { className: 'bg-yellow-100 text-yellow-800', text: 'Pending Approval' },
      approved: { className: 'bg-green-100 text-green-800', text: 'Approved' },
      rejected: { className: 'bg-red-100 text-red-800', text: 'Rejected' },
      paid: { className: 'bg-emerald-100 text-emerald-800', text: 'Paid' }
    };
    return variants[status] || variants.draft;
  };

  const statusBadge = getStatusBadge(timesheet.status);
  const isDraft = timesheet.status === 'draft';
  const isAdmin = user?.user_type === 'agency_admin' || user?.user_type === 'manager';

  const scheduledHours = shift?.duration_hours || 12;
  const workedHours = timesheet.total_hours || 0;
  const hoursDifference = workedHours - scheduledHours;

  const hasGPSConsent = staff?.gps_consent === true;
  const gpsConsentMessage = !hasGPSConsent && !isDraft ? (
    <Alert className="border-orange-300 bg-orange-50 mb-4">
      <AlertTriangle className="h-5 w-5 text-orange-600" />
      <AlertDescription className="text-orange-900">
        <strong>⚠️ No GPS Consent</strong>
        <p className="mt-1 text-sm">
          This staff member has not provided GPS tracking consent. Location data not available.
        </p>
      </AlertDescription>
    </Alert>
  ) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(createPageUrl('Timesheets'))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Timesheet Details</h2>
            <p className="text-gray-600 mt-1">
              {staff ? `${staff.first_name} ${staff.last_name}` : 'Loading...'} • {format(new Date(timesheet.shift_date), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
        <Badge {...statusBadge} className="text-lg px-4 py-2">
          {statusBadge.text}
        </Badge>
      </div>

      {/* DRAFT NOTICE */}
      {isDraft && (
        <Alert className="border-yellow-300 bg-yellow-50">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="text-yellow-900">
            <strong>⚠️ DRAFT TIMESHEET</strong>
            <p className="mt-1 text-sm">
              This timesheet was automatically created when the shift was booked. Hours and GPS data will be recorded when staff clocks in/out on shift day.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {gpsConsentMessage}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Staff Member</p>
                    <p className="font-semibold text-gray-900">
                      {staff ? `${staff.first_name} ${staff.last_name}` : 'Loading...'}
                    </p>
                    {staff?.role && (
                      <p className="text-sm text-gray-500 capitalize">{staff.role.replace('_', ' ')}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Client</p>
                    <p className="font-semibold text-gray-900">{client?.name || 'Loading...'}</p>
                    {client?.type && (
                      <p className="text-sm text-gray-500 capitalize">{client.type.replace('_', ' ')}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Shift Date</p>
                    <p className="font-semibold text-gray-900">
                      {format(new Date(timesheet.shift_date), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShiftTypeIcon className={`w-5 h-5 ${shiftType.color} mt-1`} />
                  <div>
                    <p className="text-sm text-gray-600">Shift Type</p>
                    <p className={`font-semibold ${shiftType.color}`}>{shiftType.label}</p>
                    {shift && (
                      <p className="text-sm text-gray-500">
                        {shift.start_time} - {shift.end_time} ({scheduledHours}h)
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Hours</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-lg">
                        {workedHours > 0 ? `${workedHours}h` : '--'}
                      </p>
                      {workedHours > 0 && Math.abs(hoursDifference) > 0.25 && (
                        <Badge className={hoursDifference > 0 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}>
                          {hoursDifference > 0 ? '+' : ''}{hoursDifference.toFixed(1)}h
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">Scheduled: {scheduledHours}h</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Uploaded Documents */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Supporting Documents
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Drag & Drop Upload Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-cyan-500 bg-cyan-50'
                    : 'border-gray-300 hover:border-cyan-400 hover:bg-gray-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-cyan-600' : 'text-gray-400'}`} />
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {dragActive ? 'Drop file here' : 'Drag & drop timesheet document'}
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  or click to browse (PDF, JPG, PNG - max 10MB)
                </p>
                <label className="cursor-pointer">
                  <Button
                    type="button"
                    size="sm"
                    disabled={uploadingDoc}
                    asChild
                  >
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingDoc ? 'Uploading...' : 'Browse Files'}
                    </span>
                  </Button>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    disabled={uploadingDoc}
                  />
                </label>
              </div>

              {/* Show uploaded documents */}
              {timesheet.uploaded_documents && timesheet.uploaded_documents.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {timesheet.uploaded_documents.map((doc, idx) => (
                    <div key={idx} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                      {/* Document Header */}
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <p className="text-sm font-bold text-green-900">
                                {doc.file_name || `Document ${idx + 1}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              <span>📅 {format(new Date(doc.uploaded_at), 'MMM d, yyyy HH:mm')}</span>
                              <span>👤 {doc.uploaded_by}</span>
                              {doc.file_size && (
                                <span>📦 {(doc.file_size / 1024).toFixed(1)} KB</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => window.open(doc.file_url, '_blank')}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = doc.file_url;
                                link.download = doc.file_name || `timesheet-doc-${idx + 1}`;
                                link.click();
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* ✅ ENHANCED: OCR Validation Results Canvas */}
                      {doc.extracted_data && (
                        <div className="p-4 bg-white">
                          {/* Confidence Score Banner */}
                          {doc.extracted_data.confidence_score !== undefined && (
                            <div className={`p-4 rounded-lg mb-4 ${
                              doc.extracted_data.confidence_score >= 80
                                ? 'bg-green-100 border-2 border-green-400'
                                : doc.extracted_data.confidence_score >= 60
                                ? 'bg-yellow-100 border-2 border-yellow-400'
                                : 'bg-red-100 border-2 border-red-400'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className={`text-sm font-bold ${
                                    doc.extracted_data.confidence_score >= 80 ? 'text-green-900' :
                                    doc.extracted_data.confidence_score >= 60 ? 'text-yellow-900' : 'text-red-900'
                                  }`}>
                                    🤖 AI Confidence Score
                                  </p>
                                  <p className={`text-xs mt-1 ${
                                    doc.extracted_data.confidence_score >= 80 ? 'text-green-700' :
                                    doc.extracted_data.confidence_score >= 60 ? 'text-yellow-700' : 'text-red-700'
                                  }`}>
                                    {doc.extracted_data.confidence_score >= 80
                                      ? '✅ High confidence - data looks reliable'
                                      : doc.extracted_data.confidence_score >= 60
                                      ? '⚠️ Medium confidence - please review carefully'
                                      : '❌ Low confidence - manual verification required'}
                                  </p>
                                </div>
                                <div className={`text-4xl font-black ${
                                  doc.extracted_data.confidence_score >= 80 ? 'text-green-600' :
                                  doc.extracted_data.confidence_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {doc.extracted_data.confidence_score}%
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Validation Status */}
                          {doc.extracted_data.validation_status && (
                            <div className={`p-3 rounded-lg mb-4 ${
                              doc.extracted_data.validation_status === 'match'
                                ? 'bg-green-50 border-2 border-green-300'
                                : 'bg-orange-50 border-2 border-orange-300'
                            }`}>
                              <p className={`text-sm font-bold ${
                                doc.extracted_data.validation_status === 'match' ? 'text-green-900' : 'text-orange-900'
                              }`}>
                                {doc.extracted_data.validation_status === 'match'
                                  ? '✅ All Data Matches Expected Values'
                                  : '⚠️ Discrepancies Detected - Review Required'}
                              </p>
                            </div>
                          )}

                          {/* Extracted Fields */}
                          <div className="space-y-3 mb-4">
                            <h4 className="text-sm font-bold text-gray-700 border-b pb-2">📊 Extracted Data</h4>

                            {/* Staff Name */}
                            {doc.extracted_data.staff_name && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Staff Name:</span>
                                <span className="font-semibold">{doc.extracted_data.staff_name}</span>
                              </div>
                            )}

                            {/* Client Name */}
                            {doc.extracted_data.client_name && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Client Name:</span>
                                <span className="font-semibold">{doc.extracted_data.client_name}</span>
                              </div>
                            )}

                            {/* Date */}
                            {doc.extracted_data.date && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Date:</span>
                                <span className="font-semibold">{doc.extracted_data.date}</span>
                              </div>
                            )}

                            {/* Hours */}
                            {doc.extracted_data.hours_worked && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Hours Worked:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-lg text-green-600">{doc.extracted_data.hours_worked}h</span>
                                  {doc.extracted_data.scheduled_hours && doc.extracted_data.scheduled_hours !== doc.extracted_data.hours_worked && (
                                    <Badge className="bg-orange-100 text-orange-800 text-xs">
                                      Expected: {doc.extracted_data.scheduled_hours}h
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Signatures */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                              <div className={`p-2 rounded border ${
                                doc.extracted_data.staff_signature
                                  ? 'bg-green-50 border-green-300'
                                  : 'bg-red-50 border-red-300'
                              }`}>
                                <p className="text-xs text-gray-600 mb-1">Staff Signature</p>
                                <p className={`text-xs font-bold ${
                                  doc.extracted_data.staff_signature ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {doc.extracted_data.staff_signature ? '✓ Present' : '✗ Missing'}
                                </p>
                              </div>
                              <div className={`p-2 rounded border ${
                                doc.extracted_data.supervisor_signature || doc.extracted_data.client_signature
                                  ? 'bg-green-50 border-green-300'
                                  : 'bg-red-50 border-red-300'
                              }`}>
                                <p className="text-xs text-gray-600 mb-1">Supervisor Signature</p>
                                <p className={`text-xs font-bold ${
                                  doc.extracted_data.supervisor_signature || doc.extracted_data.client_signature ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {doc.extracted_data.supervisor_signature || doc.extracted_data.client_signature ? '✓ Present' : '✗ Missing'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* ✅ NEW: Discrepancies/Mismatches Section */}
                          {doc.extracted_data.discrepancies && doc.extracted_data.discrepancies.length > 0 && (
                            <div className="mt-4 p-4 bg-red-50 rounded-lg border-2 border-red-300">
                              <div className="flex items-start gap-2 mb-3">
                                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <h4 className="text-sm font-bold text-red-900 mb-1">
                                    🚨 {doc.extracted_data.discrepancies.length} Discrepanc{doc.extracted_data.discrepancies.length > 1 ? 'ies' : 'y'} Found
                                  </h4>
                                  <p className="text-xs text-red-700">
                                    The following mismatches were detected between extracted and expected data:
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-2">
                                {doc.extracted_data.discrepancies.map((mismatch, i) => (
                                  <div key={i} className="p-3 bg-white rounded border border-red-200">
                                    <div className="flex items-start gap-2">
                                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                        mismatch.severity === 'critical' ? 'bg-red-600' :
                                        mismatch.severity === 'high' ? 'bg-orange-600' : 'bg-yellow-600'
                                      }`}></div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <p className="text-xs font-bold text-gray-900 uppercase">
                                            {mismatch.field?.replace('_', ' ')}
                                          </p>
                                          <Badge className={`text-xs ${
                                            mismatch.severity === 'critical' ? 'bg-red-600 text-white' :
                                            mismatch.severity === 'high' ? 'bg-orange-600 text-white' : 'bg-yellow-600 text-white'
                                          }`}>
                                            {mismatch.severity}
                                          </Badge>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                                          <div className="p-2 bg-red-100 rounded">
                                            <p className="text-red-600 font-semibold mb-1">Expected:</p>
                                            <p className="text-red-900 font-bold">{mismatch.expected || 'N/A'}</p>
                                          </div>
                                          <div className="p-2 bg-orange-100 rounded">
                                            <p className="text-orange-600 font-semibold mb-1">Found:</p>
                                            <p className="text-orange-900 font-bold">{mismatch.actual || 'N/A'}</p>
                                          </div>
                                        </div>

                                        {/* Hours difference calculation */}
                                        {mismatch.difference !== undefined && (
                                          <div className="mt-2 p-2 bg-gray-50 rounded">
                                            <p className="text-xs text-gray-700">
                                              <strong>Difference:</strong> {mismatch.difference > 0 ? '+' : ''}{mismatch.difference.toFixed(1)}h
                                              {mismatch.percent_difference && ` (${mismatch.percent_difference}%)`}
                                            </p>
                                          </div>
                                        )}

                                        {/* Reason/Description */}
                                        {mismatch.reason && (
                                          <p className="text-xs text-gray-600 mt-2 italic">
                                            💡 {mismatch.reason}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ✅ NEW: Alternative - Handle old 'mismatches' key */}
                          {doc.extracted_data.mismatches && doc.extracted_data.mismatches.length > 0 && !doc.extracted_data.discrepancies && (
                            <div className="mt-4 p-4 bg-red-50 rounded-lg border-2 border-red-300">
                              <div className="flex items-start gap-2 mb-3">
                                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <h4 className="text-sm font-bold text-red-900 mb-1">
                                    🚨 {doc.extracted_data.mismatches.length} Mismatch{doc.extracted_data.mismatches.length > 1 ? 'es' : ''} Detected
                                  </h4>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {doc.extracted_data.mismatches.map((mismatch, i) => (
                                  <div key={i} className="p-3 bg-white rounded border border-red-200">
                                    <p className="text-xs font-bold text-gray-900 uppercase mb-2">
                                      {mismatch.field}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className="p-2 bg-red-100 rounded">
                                        <p className="text-red-600 font-semibold">Expected:</p>
                                        <p className="text-red-900 font-bold">{mismatch.expected}</p>
                                      </div>
                                      <div className="p-2 bg-orange-100 rounded">
                                        <p className="text-orange-600 font-semibold">Found:</p>
                                        <p className="text-orange-900 font-bold">{mismatch.actual}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ✅ NEW: Warnings */}
                          {doc.extracted_data.warnings && doc.extracted_data.warnings.length > 0 && (
                            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-300">
                              <p className="text-xs font-bold text-yellow-900 mb-2">⚠️ Warnings:</p>
                              <div className="space-y-1">
                                {doc.extracted_data.warnings.map((warning, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-600 mt-1.5 flex-shrink-0"></div>
                                    <p className="text-xs text-yellow-800">
                                      {warning.message || warning}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ✅ NEW: Manual Review Flag */}
                          {doc.extracted_data.requires_manual_review && (
                            <div className="mt-4 p-4 bg-orange-100 rounded-lg border-2 border-orange-400">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                                  <Eye className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-orange-900">
                                    🔍 Manual Review Required
                                  </p>
                                  <p className="text-xs text-orange-700 mt-1">
                                    {doc.extracted_data.confidence_score < 60
                                      ? 'Low confidence score - please verify all extracted data'
                                      : 'Critical discrepancies detected - admin review needed before approval'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ✅ NEW: Extracted Data Summary Grid */}
                          {(doc.extracted_data.hours_worked || doc.extracted_data.staff_signature || doc.extracted_data.supervisor_signature) && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">Extracted Details</h4>
                              <div className="space-y-2">
                                {doc.extracted_data.hours_worked && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Hours Worked:</span>
                                    <span className="font-bold text-green-600 text-lg">{doc.extracted_data.hours_worked}h</span>
                                  </div>
                                )}

                                {doc.extracted_data.staff_signature && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Staff Signature:</span>
                                    <Badge className="bg-green-100 text-green-700">✓ Present</Badge>
                                  </div>
                                )}

                                {(doc.extracted_data.supervisor_signature || doc.extracted_data.client_signature) && (
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Supervisor Signature:</span>
                                    <Badge className="bg-green-100 text-green-700">✓ Present</Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ✅ NEW: OCR Debug Info (Only for super admins) */}
                          {user?.email === 'g.basera@yahoo.com' && doc.extracted_data.raw_llm_response && (
                            <details className="mt-4">
                              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                🔧 Debug: Raw AI Response
                              </summary>
                              <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded text-xs overflow-auto max-h-64">
                                {JSON.stringify(doc.extracted_data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-700">No documents uploaded yet</h3>
                  <p className="text-xs text-gray-500 mt-2 max-w-md mx-auto">
                    Upload paper timesheets, signatures, or supporting documents
                  </p>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-lg mx-auto">
                    <p className="text-xs text-blue-900 font-semibold mb-2">
                      💡 AI-Powered Document Scanning
                    </p>
                    <p className="text-xs text-blue-700">
                      Our AI will automatically:
                    </p>
                    <ul className="text-xs text-blue-700 mt-2 space-y-1 text-left">
                      <li>• Extract hours worked, signatures, and dates</li>
                      <li>• Validate data against expected values</li>
                      <li>• Flag discrepancies for your review</li>
                      <li>• Assign confidence scores to extracted data</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* GPS Location */}
          {hasGPSConsent && timesheet.clock_in_location && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Location Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <GPSIndicator timesheet={timesheet} client={client} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Financial & Actions */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="border-b border-green-200">
              <CardTitle className="flex items-center gap-2 text-green-900">
                <DollarSign className="w-5 h-5" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-sm text-green-700">Staff Pay</p>
                <p className="text-2xl font-bold text-green-900">
                  £{(timesheet.staff_pay_amount || 0).toFixed(2)}
                </p>
                <p className="text-xs text-green-600">
                  £{timesheet.pay_rate}/hr × {workedHours}h
                </p>
              </div>

              {isAdmin && (
                <>
                  <div className="pt-4 border-t border-green-200">
                    <p className="text-sm text-green-700">Client Charge</p>
                    <p className="text-2xl font-bold text-green-900">
                      £{(timesheet.client_charge_amount || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600">
                      £{timesheet.charge_rate}/hr × {workedHours}h
                    </p>
                  </div>

                  <div className="pt-4 border-t border-green-200">
                    <p className="text-sm text-green-700">Agency Margin</p>
                    <p className="text-2xl font-bold text-green-900">
                      £{((timesheet.client_charge_amount || 0) - (timesheet.staff_pay_amount || 0)).toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600">
                      {(((timesheet.client_charge_amount || 0) - (timesheet.staff_pay_amount || 0)) / (timesheet.client_charge_amount || 1) * 100).toFixed(1)}% margin
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {isAdmin && timesheet.status === 'submitted' && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <Button
                  onClick={handleApprove}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={updateMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Timesheet
                </Button>
                <Button
                  onClick={handleReject}
                  variant="outline"
                  className="w-full text-red-600 border-red-600 hover:bg-red-50"
                  disabled={updateMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Timesheet
                </Button>
              </CardContent>
            </Card>
          )}

          {/* NEW: Create Invoice Button for Approved Timesheets */}
          {isAdmin && timesheet.status === 'approved' && !timesheet.invoice_id && (
            <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader className="border-b border-green-200">
                <CardTitle className="text-green-900">Ready to Invoice</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-green-800 mb-4">
                  This timesheet has been approved and is ready to be invoiced.
                </p>
                <Button
                  onClick={handleCreateInvoice}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
                <p className="text-xs text-green-700 mt-2 text-center">
                  Will generate PDF invoice with VAT calculation
                </p>
              </CardContent>
            </Card>
          )}

          {/* Invoice Link if Already Invoiced */}
          {timesheet.invoice_id && (
            <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardHeader className="border-b border-blue-200">
                <CardTitle className="text-blue-900">Invoiced</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-blue-800 mb-4">
                  This timesheet has been included in an invoice.
                </p>
                <Button
                  onClick={() => navigate(`${createPageUrl('InvoiceDetail')}?id=${timesheet.invoice_id}`)}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Invoice
                </Button>
              </CardContent>
            </Card>
          )}

          {timesheet.rejection_reason && (
            <Alert variant="destructive">
              <XCircle className="h-5 w-5" />
              <AlertDescription>
                <strong>Rejection Reason:</strong>
                <p className="mt-1">{timesheet.rejection_reason}</p>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
