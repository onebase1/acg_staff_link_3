
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Clock, MapPin, FileText, CheckCircle, XCircle, DollarSign,
  AlertTriangle, User, Building2, Calendar, Eye, Download,
  Upload, ArrowLeft, Sun, Moon, Sunrise, TrendingUp, TrendingDown,
  ChevronDown, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { calculateDurationHours, calculateBillableHoursWithRule } from "@/utils/shiftCalculations";
import GPSIndicator, { GPSDetails } from "../components/timesheets/GPSIndicator";
import PayDisplay from "../components/timesheets/PayDisplay";
import ResponsiveUploadZone from "../components/timesheets/ResponsiveUploadZone";
import ConfirmOCRModal from "../components/timesheets/ConfirmOCRModal";

export default function TimesheetDetail() {
  const [timesheetId, setTimesheetId] = useState(null);
  const [user, setUser] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState(null); // New state for upload error
  // State for OCR collapsible - default open on desktop (>= 768px), closed on mobile
  const [ocrExpanded, setOcrExpanded] = useState(() => window.innerWidth >= 768);
  // State for tracking last OCR confidence (for re-upload guidance)
  const [lastOcrConfidence, setLastOcrConfidence] = useState(null);

  // PHASE 2: Staff Validation Workflow
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingOcrData, setPendingOcrData] = useState(null);
  const [pendingDocument, setPendingDocument] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);

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
    onSuccess: (updatedTimesheet) => {
      queryClient.invalidateQueries(['timesheet', timesheetId]);
      queryClient.invalidateQueries(['timesheets']);
      toast.success('Timesheet updated');

      // 🚀 NOTIFY STAFF ON MANUAL APPROVAL
      if (updatedTimesheet.status === 'approved' && staff?.email) {
        const subject = `✅ Timesheet Approved: ${client?.name || 'Shift'} on ${updatedTimesheet.shift_date}`;
        const body_html = `
          <p>Hi ${staff.first_name},</p>
          <p>Good news! Your timesheet for the shift at <strong>${client?.name || 'a client'}</strong> on <strong>${updatedTimesheet.shift_date}</strong> has been manually approved by an admin.</p>
          <p>It will now be processed in the next payroll cycle.</p>
          <p>Thank you for your hard work!</p>
        `;

        supabase.functions.invoke('send-email', {
          body: {
            to: staff.email,
            subject,
            html: body_html
          }
        }).then(response => {
          if (response.error) {
            console.error("Failed to send approval email:", response.error);
          } else {
            console.log("✅ Staff approval email sent successfully.");
          }
        });
      }
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
        // Derive scheduled hours as scheduled duration minus scheduled break, so 12h - 1h break = 11h expected
        const scheduledFromShift =
          shift && typeof shift.duration_hours === 'number'
            ? shift.duration_hours - (shift.break_duration_minutes || 0) / 60
            : null;

        const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('extract-timesheet-data', {
          body: {
            file_url,
            expected_data: {
              staff_name: staff ? `${staff.first_name} ${staff.last_name}` : null,
              client_name: client?.name || null,
              shift_date: timesheet?.shift_date || null,
              scheduled_hours: scheduledFromShift ?? timesheet?.total_hours ?? null,
              expected_start: shift?.start_time || null,
              expected_end: shift?.end_time || null,
            },
          },
        });

        // Normalise OCR payload shape
        const isSuccess = ocrResult?.success === true;
        const extracted = ocrResult?.extracted_data || null;

        // Handle failed invocation or unsuccessful response
        if (ocrError || !ocrResult || !isSuccess || !extracted) {
          console.error('❌ OCR invocation failed or returned no data:', ocrError || ocrResult);
          const errorMsg =
            ocrError?.message ||
            (typeof ocrResult?.error === 'string' ? ocrResult.error : 'OCR extraction service unavailable');
          toast.error(`Failed to extract timesheet data: ${errorMsg}`);

          // Save document without OCR data
          const newDocument = {
            file_url,
            uploaded_at: new Date().toISOString(),
            uploaded_by: user?.email || 'unknown',
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            notes: `OCR failed: ${errorMsg}`,
            extracted_data: null,
          };

          const existingDocs = timesheet.uploaded_documents || [];
          const { error: updateError } = await supabase
            .from('timesheets')
            .update({
              uploaded_documents: [...existingDocs, newDocument],
              status: 'pending_admin_review',
            })
            .eq('id', timesheetId);

          if (updateError) throw updateError;

          // Link shift to timesheet for reporting, if we know the shift
          if (shift?.id) {
            await supabase
              .from('shifts')
              .update({
                timesheet_id: timesheetId,
                timesheet_received: true,
                timesheet_received_at: new Date().toISOString(),
              })
              .eq('id', shift.id);
          }

          toast.warning('⚠️ Document saved, but OCR extraction failed. Admin review required.');
          return file_url;
        }

        console.log('📊 OCR Result:', extracted);

        // Map OCR response for toast messages
        const confidenceFromExtractor = extracted.confidence_score ?? extracted.confidence?.overall;
        if (typeof confidenceFromExtractor === 'number') {
          // Track confidence for re-upload guidance (Quick Fix 2)
          setLastOcrConfidence(confidenceFromExtractor);

          if (confidenceFromExtractor >= 80) {
            toast.success(`✅ High confidence extraction (${confidenceFromExtractor}%)`);
          } else if (confidenceFromExtractor >= 60) {
            toast.warning(`⚠️ Medium confidence extraction (${confidenceFromExtractor}%) - Please review`);
          } else {
            toast.error(`❌ Low confidence extraction (${confidenceFromExtractor}%) - Manual review required`);
          }
        }

        const discrepancies = extracted.discrepancies || extracted.mismatches;
        if (Array.isArray(discrepancies) && discrepancies.length > 0) {
          const critical = discrepancies.filter(m => m.severity === 'critical');
          if (critical.length > 0) {
            toast.error('🚨 Critical discrepancies detected! Manual review required.');
          }
        }

        const newDocument = {
          file_url,
          uploaded_at: new Date().toISOString(),
          uploaded_by: user?.email || 'unknown',
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          notes: `OCR Status: ${isSuccess ? 'ok' : 'failed'}`,
          extracted_data: extracted,
        };

        // PHASE 2: Instead of immediately saving, show confirmation modal
        if (isSuccess && extracted) {
          console.log('✅ OCR succeeded - showing confirmation modal');
          setPendingOcrData(extracted);
          setPendingDocument(newDocument);
          setPendingFile(file);
          setShowConfirmModal(true);
          setUploadingDoc(false);
          return { showModal: true }; // Return signal that modal will be shown
        } else {
          // OCR failed - save document without confirmation
          console.log('⚠️ OCR failed - saving without confirmation');
          const existingDocs = timesheet.uploaded_documents || [];
          const { error: updateError } = await supabase
            .from('timesheets')
            .update({
              uploaded_documents: [...existingDocs, newDocument]
            })
            .eq('id', timesheetId);

          if (updateError) throw updateError;

          toast.warning('Document uploaded, but OCR extraction failed. File is still saved.');
          return file_url;
        }
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

  // PHASE 2: Staff Confirmation Handlers
  const handleConfirmOCR = async (staffNote, overrideRowData) => {
    if (!pendingOcrData || !pendingDocument) return;

    setConfirming(true);
    try {
      const extracted = pendingOcrData;
      const existingDocs = timesheet.uploaded_documents || [];

      // Prepare update data with actual times from OCR
      // PRIORITIZE USER SELECTION (overrideRowData) -> then Auto-Match -> then Raw Extraction
      const rowData = overrideRowData || extracted.matched_row_info || extracted;

      console.log('✅ Confirming with Row Data:', rowData);

      const updateData = {
        uploaded_documents: [...existingDocs, pendingDocument],
        staff_confirmed: true,
        staff_confirmed_at: new Date().toISOString()
      };

      // Populate actual times from OCR
      if (rowData.start_time) {
        updateData.actual_start_time = rowData.start_time;
        console.log('✅ Set actual_start_time:', rowData.start_time);
      }

      if (rowData.end_time) {
        updateData.actual_end_time = rowData.end_time;
        console.log('✅ Set actual_end_time:', rowData.end_time);
      }

      if (rowData.break_minutes !== undefined && rowData.break_minutes !== null) {
        updateData.break_duration_minutes = rowData.break_minutes;
        console.log('✅ Set break_duration_minutes:', rowData.break_minutes);
      }

      // Hours: Calculate from Start/End times if available (One Source of Truth)
      // This enforces the rule: "remove break 60mins if and only if total hours >= 10"
      let calculatedHours = null;
      let calculatedBreakMinutes = 0;

      if (updateData.actual_start_time && updateData.actual_end_time) {
        const rawDuration = calculateDurationHours(updateData.actual_start_time, updateData.actual_end_time);
        calculatedHours = calculateBillableHoursWithRule(rawDuration);

        // Set break minutes based on the rule used in calculation
        calculatedBreakMinutes = rawDuration >= 10 ? 60 : 0;

        console.log(`✅ Calculated Hours from Times: ${updateData.actual_start_time}-${updateData.actual_end_time}`);
        console.log(`   Raw Duration: ${rawDuration}h, Break: ${calculatedBreakMinutes}m, Billable: ${calculatedHours}h`);

        updateData.hours_worked = calculatedHours;
        updateData.total_hours = calculatedHours;
        updateData.break_duration_minutes = calculatedBreakMinutes;
      } else {
        // Fallback to OCR/User provided hours if start/end times are missing
        const ocrHours =
          rowData.hours ??
          rowData.hours_worked ??
          extracted.total_hours ??
          null;

        if (ocrHours !== null && ocrHours !== undefined) {
          updateData.hours_worked = ocrHours;
          updateData.total_hours = ocrHours;
          console.log('⚠️ Start/End times missing. Using OCR hours:', ocrHours);
        }
      }

      // Preserve raw_total_hours if the extractor provided it (multi-day sheets)
      if (typeof extracted.raw_total_hours === 'number') {
        updateData.raw_total_hours = extracted.raw_total_hours;
      }

      // Signature fields so admin UI no longer shows "missing signature"
      if (extracted.staff_signature) {
        updateData.staff_signature = `ocr_present_${new Date().toISOString()}`;
      }
      if (extracted.supervisor_signature || extracted.client_signature) {
        updateData.client_signature = `ocr_present_${new Date().toISOString()}`;
      }

      // Optional staff note appended to existing notes
      if (staffNote && staffNote.trim()) {
        const note = staffNote.trim();
        updateData.notes = `${timesheet.notes || ''}\n[Staff note from OCR confirmation]: ${note}`;
      }

      // AUTO-APPROVAL LOGIC
      const canAutoApprove = (
        extracted.confidence?.overall >= 80 &&
        extracted.validation_status === 'match' &&
        !extracted.mismatches?.some(m => m.severity === 'critical')
      );

      if (canAutoApprove) {
        updateData.status = 'approved';
        updateData.approved_by = 'auto_approved_by_staff';
        updateData.approved_at = new Date().toISOString();
        updateData.auto_approved = true;
        console.log('✅ Auto-approving timesheet (high confidence + staff confirmed)');
      } else {
        updateData.status = 'pending_admin_review';
        console.log('⏳ Sending to admin review (low confidence or mismatches detected)');
      }

      const { error: updateError } = await supabase
        .from('timesheets')
        .update(updateData)
        .eq('id', timesheetId);

      if (updateError) throw updateError;

      // Ensure associated shift knows it has a timesheet
      if (shift?.id) {
        await supabase
          .from('shifts')
          .update({
            timesheet_id: timesheetId,
            timesheet_received: true,
            timesheet_received_at: new Date().toISOString(),
          })
          .eq('id', shift.id);
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries(['timesheet', timesheetId]);
      queryClient.invalidateQueries(['timesheets']);

      // Success toast based on auto-approval
      if (canAutoApprove) {
        toast.success('✅ Timesheet approved automatically! High confidence extraction confirmed.');
      } else {
        toast.info('⏳ Sent to admin for review. Thank you for confirming!');
      }

      // Close modal and reset state
      setShowConfirmModal(false);
      setPendingOcrData(null);
      setPendingDocument(null);
      setPendingFile(null);

    } catch (error) {
      console.error('❌ Failed to confirm timesheet:', error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setConfirming(false);
    }
  };

  const handleRejectOCR = async (staffNote) => {
    if (!pendingDocument) return;

    setRejecting(true);
    try {
      // 📝 Save staff note if provided (consistency with confirmation flow)
      if (staffNote && staffNote.trim()) {
        const note = staffNote.trim();
        await supabase
          .from('timesheets')
          .update({
            notes: `${timesheet.notes || ''}\n[Staff note from OCR rejection]: ${note}`
          })
          .eq('id', timesheetId);
      }

      const existingDocs = timesheet.uploaded_documents || [];

      const { error: updateError } = await supabase
        .from('timesheets')
        .update({
          uploaded_documents: [...existingDocs, pendingDocument],
          status: 'pending_admin_review',
          staff_confirmed: false,
          staff_confirmed_at: new Date().toISOString()
        })
        .eq('id', timesheetId);

      if (updateError) throw updateError;

      // Also mark shift as having received a timesheet
      if (shift?.id) {
        await supabase
          .from('shifts')
          .update({
            timesheet_id: timesheetId,
            timesheet_received: true,
            timesheet_received_at: new Date().toISOString(),
          })
          .eq('id', shift.id);
      }

      queryClient.invalidateQueries(['timesheet', timesheetId]);
      queryClient.invalidateQueries(['timesheets']);

      toast.info('⏳ Timesheet sent to admin for manual review.');

      setShowConfirmModal(false);
      setPendingOcrData(null);
      setPendingDocument(null);
      setPendingFile(null);

    } catch (error) {
      console.error('❌ Failed to reject timesheet:', error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setRejecting(false);
    }
  };

  const handleReUpload = () => {
    // Close modal and trigger file picker again
    setShowConfirmModal(false);
    setPendingOcrData(null);
    setPendingDocument(null);
    setPendingFile(null);

    // Trigger file input click
    setTimeout(() => {
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.click();
      }
    }, 100);

    toast.info('📸 Please upload a better quality photo');
  };

  // PHASE 2: Delete Document Handler
  const handleDeleteDocument = async (documentIndex) => {
    // Business rule: staff cannot delete documents once the shift is completed
    const isStaffUser = user?.user_type === 'staff_member';
    if (isStaffUser && shift?.status === 'completed') {
      toast.error('You cannot delete documents for completed shifts. Please contact your agency.');

      // Best-effort notification to agency via email (may be blocked by RLS for staff)
      try {
        if (timesheet?.agency_id) {
          const { data: agency, error: agencyError } = await supabase
            .from('agencies')
            .select('email,billing_email')
            .eq('id', timesheet.agency_id)
            .single();

          if (!agencyError && agency) {
            const agencyEmail = agency.billing_email || agency.email;
            if (agencyEmail) {
              await supabase.functions.invoke('send-email', {
                body: {
                  to: agencyEmail,
                  subject: 'Staff attempted to delete document for completed shift',
                  html: `
                    <p>A staff user attempted to delete a timesheet document for a completed shift.</p>
                    <p><strong>Timesheet ID:</strong> ${timesheetId}</p>
                    <p><strong>Shift date:</strong> ${timesheet?.shift_date}</p>
                    <p><strong>Staff:</strong> ${staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown'}</p>
                  `,
                },
              });
            }
          }
        }
      } catch (emailError) {
        console.warn('⚠️ Failed to notify agency about blocked delete:', emailError);
      }

      return;
    }

    if (!window.confirm('Delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      const existingDocs = timesheet.uploaded_documents || [];
      const docToDelete = existingDocs[documentIndex];

      // Remove from array
      const updatedDocs = existingDocs.filter((_, idx) => idx !== documentIndex);

      // Update database
      const { error: updateError } = await supabase
        .from('timesheets')
        .update({ uploaded_documents: updatedDocs })
        .eq('id', timesheetId);

      if (updateError) {
        console.error('❌ Failed to delete document:', updateError);
        toast.error('Failed to delete document');
        return;
      }

      // Optional: Delete from storage (permanent removal)
      if (docToDelete.file_url) {
        try {
          // Extract file path from URL
          const urlParts = docToDelete.file_url.split('/timesheets/');
          if (urlParts.length > 1) {
            const fileName = urlParts[1];
            const { error: storageError } = await supabase.storage
              .from('documents')
              .remove([`timesheets/${fileName}`]);

            if (storageError) {
              console.warn('⚠️ Failed to delete from storage:', storageError);
              // Don't fail the whole operation if storage delete fails
            } else {
              console.log('✅ File deleted from storage:', fileName);
            }
          }
        } catch (storageError) {
          console.warn('⚠️ Storage delete error:', storageError);
          // Continue even if storage delete fails
        }
      }

      toast.success('✅ Document deleted successfully');
      queryClient.invalidateQueries(['timesheet', timesheetId]);
      queryClient.invalidateQueries(['timesheets']);

    } catch (error) {
      console.error('❌ Delete document error:', error);
      toast.error(`Failed to delete: ${error.message}`);
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
    <div className="space-y-6 relative">
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

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        {/* Basic Info - Always first */}
        <Card className="order-1 lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 space-y-4">
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

        {/* Uploaded Documents - Show after financial on mobile */}
        <Card className="order-5 lg:col-span-2">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Supporting Documents
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {/* Inline status while upload + OCR are running */}
            {uploadingDoc && !showConfirmModal && (
              <Alert className="mb-4 bg-blue-50 border-blue-200">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  Extracting timesheet data with AI. This can take a few seconds – please keep this page open.
                </AlertDescription>
              </Alert>
            )}

            {/* Responsive Upload Zone - Mobile: Compact button | Desktop: Drag & drop */}
            <ResponsiveUploadZone
              onFileSelect={handleFileUpload}
              uploading={uploadingDoc || showConfirmModal}
              disabled={showConfirmModal}
              acceptedFormats=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={10}
            />

            {/* Quick Fix 2: Re-Upload Guidance for Low Confidence */}
            {lastOcrConfidence !== null && lastOcrConfidence < 60 && (
              <Alert className="mt-4 bg-yellow-50 border-yellow-300">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <AlertDescription>
                  <p className="font-bold text-yellow-900">Low Confidence ({lastOcrConfidence}%) - Action Needed</p>
                  <p className="text-sm text-yellow-800 mt-1">
                    The uploaded document quality is unclear (blurry, damaged, or poor lighting). Our AI had difficulty reading the text accurately.
                  </p>
                  <div className="mt-3 text-sm text-yellow-900">
                    <p className="font-semibold mb-2">💡 How to improve accuracy:</p>
                    <ul className="list-disc ml-5 space-y-1">
                      <li>Take a new photo in <strong>good lighting</strong> (natural daylight works best)</li>
                      <li>Ensure all text is <strong>clear and readable</strong></li>
                      <li>Hold camera steady and <strong>flatten the paper</strong></li>
                      <li>Avoid shadows, glare, or reflections</li>
                      <li>Use landscape mode for better framing</li>
                    </ul>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="bg-yellow-600 hover:bg-yellow-700"
                      onClick={() => {
                        // Scroll to upload zone
                        document.querySelector('input[type="file"]')?.click();
                      }}
                    >
                      📸 Re-Upload Better Photo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLastOcrConfidence(null)}
                      className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                    >
                      Dismiss
                    </Button>
                  </div>
                  <p className="text-xs text-yellow-700 mt-3">
                    <strong>Note:</strong> Admins can still manually review and approve if the data is correct, but clearer photos speed up the process.
                  </p>
                </AlertDescription>
              </Alert>
            )}

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
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteDocument(idx)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* ✅ ENHANCED: OCR Validation Results Canvas */}
                    {doc.extracted_data && (
                      <Collapsible
                        open={ocrExpanded}
                        onOpenChange={setOcrExpanded}
                        className="p-4 bg-white"
                      >
                        {/* Collapsible Trigger - Summary Header */}
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-colors mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${doc.extracted_data.confidence_score >= 80 ? 'bg-green-500' :
                                doc.extracted_data.confidence_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}>
                                {doc.extracted_data.confidence_score}%
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-bold text-purple-900">AI Data Extraction</p>
                                <p className="text-xs text-purple-700">
                                  {doc.extracted_data.validation_status === 'match'
                                    ? '✅ Validated' : '⚠️ Review Required'}
                                  {' • '}
                                  {ocrExpanded ? 'Click to collapse' : 'Click to expand'}
                                </p>
                              </div>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-purple-600 transition-transform ${ocrExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          {/* Confidence Score Banner */}
                          {doc.extracted_data.confidence_score !== undefined && (
                            <div className={`p-4 rounded-lg mb-4 ${doc.extracted_data.confidence_score >= 80
                              ? 'bg-green-100 border-2 border-green-400'
                              : doc.extracted_data.confidence_score >= 60
                                ? 'bg-yellow-100 border-2 border-yellow-400'
                                : 'bg-red-100 border-2 border-red-400'
                              }`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className={`text-sm font-bold ${doc.extracted_data.confidence_score >= 80 ? 'text-green-900' :
                                    doc.extracted_data.confidence_score >= 60 ? 'text-yellow-900' : 'text-red-900'
                                    }`}>
                                    🤖 AI Confidence Score
                                  </p>
                                  <p className={`text-xs mt-1 ${doc.extracted_data.confidence_score >= 80 ? 'text-green-700' :
                                    doc.extracted_data.confidence_score >= 60 ? 'text-yellow-700' : 'text-red-700'
                                    }`}>
                                    {doc.extracted_data.confidence_score >= 80
                                      ? '✅ High confidence - data looks reliable'
                                      : doc.extracted_data.confidence_score >= 60
                                        ? '⚠️ Medium confidence - please review carefully'
                                        : '❌ Low confidence - manual verification required'}
                                  </p>
                                </div>
                                <div className={`text-4xl font-black ${doc.extracted_data.confidence_score >= 80 ? 'text-green-600' :
                                  doc.extracted_data.confidence_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                  {doc.extracted_data.confidence_score}%
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Validation Status */}
                          {doc.extracted_data.validation_status && (
                            <div className={`p-3 rounded-lg mb-4 ${doc.extracted_data.validation_status === 'match'
                              ? 'bg-green-50 border-2 border-green-300'
                              : 'bg-orange-50 border-2 border-orange-300'
                              }`}>
                              <p className={`text-sm font-bold ${doc.extracted_data.validation_status === 'match' ? 'text-green-900' : 'text-orange-900'
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
                              <div className={`p-2 rounded border ${doc.extracted_data.staff_signature
                                ? 'bg-green-50 border-green-300'
                                : 'bg-red-50 border-red-300'
                                }`}>
                                <p className="text-xs text-gray-600 mb-1">Staff Signature</p>
                                <p className={`text-xs font-bold ${doc.extracted_data.staff_signature ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                  {doc.extracted_data.staff_signature ? '✓ Present' : '✗ Missing'}
                                </p>
                              </div>
                              <div className={`p-2 rounded border ${doc.extracted_data.supervisor_signature || doc.extracted_data.client_signature
                                ? 'bg-green-50 border-green-300'
                                : 'bg-red-50 border-red-300'
                                }`}>
                                <p className="text-xs text-gray-600 mb-1">Supervisor Signature</p>
                                <p className={`text-xs font-bold ${doc.extracted_data.supervisor_signature || doc.extracted_data.client_signature ? 'text-green-700' : 'text-red-700'
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
                                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${mismatch.severity === 'critical' ? 'bg-red-600' :
                                        mismatch.severity === 'high' ? 'bg-orange-600' : 'bg-yellow-600'
                                        }`}></div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <p className="text-xs font-bold text-gray-900 uppercase">
                                            {mismatch.field?.replace('_', ' ')}
                                          </p>
                                          <Badge className={`text-xs ${mismatch.severity === 'critical' ? 'bg-red-600 text-white' :
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
                        </CollapsibleContent>
                      </Collapsible>
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

        {/* GPS Location - Show before documents on mobile */}
        {hasGPSConsent && timesheet.clock_in_location && (
          <Card className="order-4 lg:col-span-2">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <GPSDetails timesheet={timesheet} staff={staff} />
            </CardContent>
          </Card>
        )}

        {/* Staff Pay Display - Show early on mobile (after basic info) */}
        {shift && (
          <div className="order-2">
            <PayDisplay shift={shift} timesheet={timesheet} />
          </div>
        )}

        {/* Actions - Show after financial on mobile */}
        {isAdmin && timesheet.status === 'submitted' && (
          <Card className="order-3">
            <CardHeader className="border-b">
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 space-y-3">
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

      {/* PHASE 2: Staff Validation Modal */}
      <ConfirmOCRModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        extractedData={pendingOcrData}
        expectedData={{
          staff_name: staff ? `${staff.first_name} ${staff.last_name}` : null,
          client_name: client?.name,
          shift_date: timesheet?.shift_date,
          // Show the same scheduled hours we passed into OCR (duration minus break)
          scheduled_hours:
            (shift && typeof shift.duration_hours === 'number'
              ? shift.duration_hours - (shift.break_duration_minutes || 0) / 60
              : timesheet?.total_hours) || null,
        }}
        onConfirm={handleConfirmOCR}
        onReject={handleRejectOCR}
        onReUpload={handleReUpload}
        confirming={confirming}
        rejecting={rejecting}
      />

      {/* Global blocking overlay while upload + OCR are running */}
      {uploadingDoc && !showConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl px-6 py-5 max-w-sm mx-4 text-center space-y-3">
            <div className="flex justify-center">
              <div className="h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-sm font-semibold text-gray-900">
              Processing your timesheet with AI…
            </p>
            <p className="text-xs text-gray-600">
              This usually takes a few seconds. Please keep this page open until the confirmation
              screen appears so your timesheet can be saved correctly.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
