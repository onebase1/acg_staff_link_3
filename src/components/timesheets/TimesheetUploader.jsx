import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import timesheetService from "@/services/timesheetService";
import ConfirmOCRModal from "./ConfirmOCRModal";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Shared component for uploading timesheet documents and handling OCR confirmation.
 * 
 * @param {Object} props
 * @param {string} props.timesheetId - The ID of the timesheet to upload for.
 * @param {Object} props.timesheet - The timesheet record (optional).
 * @param {Object} props.shift - The related shift (optional).
 * @param {Object} props.staff - The related staff member (optional).
 * @param {Object} props.client - The related client (optional).
 * @param {string} props.mode - Rendering mode: 'button' or 'inline'.
 * @param {Function} props.onSuccess - Callback after successful confirmed upload.
 */
export default function TimesheetUploader({
    timesheetId,
    timesheet: initialTimesheet,
    shift: initialShift,
    staff: initialStaff,
    client: initialClient,
    mode = 'button',
    onSuccess,
    user // The logged in user
}) {
    const queryClient = useQueryClient();
    const [uploading, setUploading] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    // OCR Pending State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingOcrData, setPendingOcrData] = useState(null);
    const [pendingDocument, setPendingDocument] = useState(null);

    // ✅ FIX: State to hold resolved context for the OCR modal
    const [resolvedContext, setResolvedContext] = useState({
        ts: initialTimesheet,
        staff: initialStaff,
        client: initialClient,
        shift: initialShift
    });

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size must be less than 10MB');
            return;
        }

        setUploading(true);
        toast.info('📤 AI processing started... Uploading and extracting data.');

        try {
            // 1. Fetch data if missing (for context)
            let ts = initialTimesheet;
            if (!ts) {
                const { data } = await supabase.from('timesheets').select('*').eq('id', timesheetId).single();
                ts = data;
            }

            let staffMember = initialStaff;
            if (!staffMember && ts?.staff_id) {
                const { data } = await supabase.from('staff').select('*').eq('id', ts.staff_id).single();
                staffMember = data;
            }

            let clientObj = initialClient;
            if (!clientObj && ts?.client_id) {
                const { data } = await supabase.from('clients').select('*').eq('id', ts.client_id).single();
                clientObj = data;
            }

            let shiftObj = initialShift;
            if (!shiftObj && ts?.shift_id) {
                const { data } = await supabase.from('shifts').select('*').eq('id', ts.shift_id).single();
                shiftObj = data;
            }

            // Update state so the render method has access to these resolved values
            setResolvedContext({
                ts,
                staff: staffMember,
                client: clientObj,
                shift: shiftObj
            });

            // 2. Upload to storage
            const fileUrl = await timesheetService.uploadFile(file);
            console.log('✅ File uploaded:', fileUrl);

            // 3. Trigger OCR
            const scheduledHours = shiftObj?.duration_hours
                ? shiftObj.duration_hours - (shiftObj.break_duration_minutes || 0) / 60
                : ts?.total_hours || null;

            const expectedData = {
                staff_name: staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : null,
                client_name: clientObj?.name || null,
                shift_date: ts?.shift_date || null,
                scheduled_hours: scheduledHours,
                expected_start: shiftObj?.start_time || null,
                expected_end: shiftObj?.end_time || null,
            };

            const extracted = await timesheetService.extractData(fileUrl, expectedData);
            console.log('📊 OCR Success:', extracted);

            const newDoc = {
                file_url: fileUrl,
                uploaded_at: new Date().toISOString(),
                uploaded_by: user?.email || 'unknown',
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
                notes: `OCR Status: ok`,
                extracted_data: extracted,
            };

            setPendingOcrData(extracted);
            setPendingDocument(newDoc);
            setShowConfirmModal(true);

        } catch (error) {
            console.error('❌ Upload/OCR Error:', error);
            toast.error(`Processing failed: ${error.message}`);

            // Fallback: Save document without OCR
            if (error.message.includes('upload') || fileUrl) {
                // handle save without OCR if needed? 
                // For now let the user try again or alert admin.
            }
        } finally {
            setUploading(false);
        }
    };

    const handleConfirm = async (staffNote, selectedUpdates) => {
        if (!pendingOcrData || !pendingDocument) return;

        setConfirming(true);
        try {
            // If it's a batch update (array of {row, timesheetId, isPrimary})
            const updatesList = Array.isArray(selectedUpdates)
                ? selectedUpdates
                : [{ row: selectedUpdates || pendingOcrData.matched_row_info || pendingOcrData, timesheetId: timesheetId, isPrimary: true }];

            console.log(`🚀 Preparing ${updatesList.length} updates for batch save...`);

            const preparedUpdates = await Promise.all(updatesList.map(async (update) => {
                const targetTsId = update.timesheetId;

                // Fetch target timesheet if not primary (to get existing data)
                let targetTs = update.isPrimary ? (initialTimesheet || resolvedContext.ts) : null;
                if (!targetTs) {
                    const { data } = await supabase.from('timesheets').select('*').eq('id', targetTsId).single();
                    targetTs = data;
                }

                const finalTimesheetData = timesheetService.calculateFinalData(
                    pendingOcrData,
                    update.row,
                    targetTs?.shift_date
                );

                const existingDocs = targetTs?.uploaded_documents || [];
                const updateData = {
                    ...finalTimesheetData,
                    uploaded_documents: [...existingDocs, pendingDocument],
                    staff_confirmed: true,
                    staff_confirmed_at: new Date().toISOString(),
                    notes: staffNote ? `${targetTs?.notes || ''}\n[Staff note]: ${staffNote}` : targetTs?.notes
                };

                // Auto-approval logic (Shared logic)
                const isSmartMatch = (field, expected, actual) => {
                    if (field === 'hours') {
                        const e = parseFloat(expected);
                        const a = parseFloat(actual);
                        if (isNaN(e) || isNaN(a)) return false;
                        const breakDeduction = e > 10 ? 1 : 0; // Rule: Strictly > 10 per core rule
                        return (e - breakDeduction) === a;
                    }
                    return false;
                };

                const effectiveMismatches = pendingOcrData.mismatches?.filter(m => !isSmartMatch(m.field, m.expected, m.actual)) || [];
                const canAutoApprove = (
                    pendingOcrData.confidence?.overall >= 95 &&
                    (pendingOcrData.validation_status === 'match' || effectiveMismatches.length === 0) &&
                    !effectiveMismatches.some(m => m.severity === 'critical')
                );

                // Admin bypass: If current user is an admin/manager, they can approve directly during confirmation
                const isAdmin = user?.user_type === 'agency_admin' || user?.user_type === 'manager';

                if (canAutoApprove || isAdmin) {
                    updateData.status = 'approved';
                    updateData.approved_by = isAdmin ? `admin_${user.email}` : 'auto_approved_by_staff';
                    updateData.approved_at = new Date().toISOString();
                    updateData.auto_approved = !isAdmin;
                } else {
                    updateData.status = 'pending_admin_review';
                }

                // Signatures
                if (pendingOcrData.staff_signature) updateData.staff_signature = `ocr_present_${new Date().toISOString()}`;
                if (pendingOcrData.supervisor_signature || pendingOcrData.client_signature) updateData.client_signature = `ocr_present_${new Date().toISOString()}`;
                if (!updateData.staff_signature) updateData.staff_signature = `staff_confirmed_${new Date().toISOString()}`;
                if (!updateData.client_signature) updateData.client_signature = `staff_confirmed_on_behalf_${new Date().toISOString()}`;

                return { timesheetId: targetTsId, updateData, shiftId: targetTs?.shift_id };
            }));

            const results = await timesheetService.batchSaveTimesheets(preparedUpdates);

            const autoApprovedCount = results.filter(r => r.autoApproved).length;
            const manualCount = results.length - autoApprovedCount;

            if (results.length > 1) {
                toast.success(`✅ Batch saved! ${results.length} shifts updated. (${autoApprovedCount} auto-approved)`);
            } else {
                toast.success(autoApprovedCount > 0 ? '✅ Timesheet approved automatically!' : '⏳ Reserved for admin review.');
            }

            setShowConfirmModal(false);
            if (onSuccess) onSuccess();

            // Invalidate queries
            queryClient.invalidateQueries(['timesheets']);
            queryClient.invalidateQueries(['shifts']);

        } catch (error) {
            console.error('❌ Confirmation failed:', error);
            toast.error(`Saving failed: ${error.message}`);
        } finally {
            setConfirming(false);
        }
    };

    const handleReject = async (staffNote) => {
        if (!timesheetId) return;
        setRejecting(true);
        try {
            console.log('🛑 Staff rejected OCR - marking for admin review');

            // Still save the document so admin can see it
            const targetTs = initialTimesheet || resolvedContext.ts;
            const existingDocs = targetTs?.uploaded_documents || [];

            const { error } = await supabase.from('timesheets').update({
                status: 'pending_admin_review',
                uploaded_documents: [...existingDocs, pendingDocument],
                notes: staffNote ? `[AI REJECTED BY STAFF]: ${staffNote}` : `[AI REJECTED BY STAFF]: Staff indicated OCR data was incorrect.`
            }).eq('id', timesheetId);

            if (error) throw error;

            toast.success('⚠️ Flagged for agency review. They will check your timesheet manually.');
            setShowConfirmModal(false);
            if (onSuccess) onSuccess();
            queryClient.invalidateQueries(['timesheets']);
        } catch (error) {
            console.error('❌ Rejection markup failed:', error);
            toast.error('Failed to report error. Please try again or contact agency.');
        } finally {
            setRejecting(false);
        }
    };

    return (
        <div className="flex flex-col gap-2 relative">
            {/* ✅ NEW: Premium AI Processing Overlay */}
            {uploading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-3 p-4 text-center">
                        <div className="relative">
                            <Loader2 className="w-10 h-10 text-cyan-600 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900">AI is Reading...</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">Please wait, extracting data</p>
                        </div>
                    </div>
                </div>
            )}

            <label className="cursor-pointer">
                <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    onClick={(e) => (e.target.value = null)}
                    disabled={uploading}
                />
                <Button
                    variant="outline"
                    size="sm"
                    className={`gap-2 w-full transition-all duration-300 ${uploading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                    asChild
                    disabled={uploading}
                >
                    <span>
                        <Upload className="w-4 h-4" />
                        {mode === 'button' ? 'Upload Timesheet Paper' : 'Upload Document'}
                    </span>
                </Button>
            </label>

            {showConfirmModal && (
                <ConfirmOCRModal
                    isOpen={showConfirmModal}
                    onClose={() => setShowConfirmModal(false)}
                    extractedData={pendingOcrData}
                    expectedData={{
                        staff_id: initialStaff?.id || resolvedContext.staff?.id || initialTimesheet?.staff_id || resolvedContext.ts?.staff_id,
                        timesheet_id: timesheetId,
                        staff_name: resolvedContext.staff ? `${resolvedContext.staff.first_name} ${resolvedContext.staff.last_name}` :
                            initialStaff ? `${initialStaff.first_name} ${initialStaff.last_name}` : null,
                        client_name: resolvedContext.client?.name || initialClient?.name || null,
                        shift_date: initialTimesheet?.shift_date || resolvedContext.ts?.shift_date || null,
                        scheduled_hours: initialTimesheet?.total_hours || initialShift?.duration_hours || resolvedContext.ts?.total_hours || null,
                    }}
                    onConfirm={handleConfirm}
                    onReject={handleReject}
                    onReUpload={() => setShowConfirmModal(false)}
                    confirming={confirming}
                    rejecting={rejecting}
                />
            )}
        </div>
    );
}
