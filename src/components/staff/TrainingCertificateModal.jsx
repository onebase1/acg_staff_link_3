import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BUCKETS } from "@/api/supabaseStorage";
import { toast } from "sonner";

/**
 * TrainingCertificateModal
 *
 * Lightweight, self-contained modal used from ProfileSetup so staff can:
 * - confirm dates / reference for a core CQC training item, or
 * - add a new ad-hoc training / qualification,
 * and upload the matching certificate as a proper compliance record
 * (document_type = "training_certificate").
 *
 * It does NOT change any compliance-monitor or shift-eligibility logic –
 * it simply creates a new row in the existing `compliance` table and lets
 * the parent component decide how to mirror dates into staff.mandatory_training.
 */
function TrainingCertificateModal({
  open,
  mode = "core", // "core" | "additional"
  trainingKey,
  trainingLabel,
  staffId,
  agencyId,
  initialValues,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    name: trainingLabel || initialValues?.name || "",
    provider: initialValues?.provider || "",
    completed_date: initialValues?.completed_date || "",
    expiry_date: initialValues?.expiry_date || "",
    certificate_ref: initialValues?.certificate_ref || "",
    notes: initialValues?.notes || "",
  });
  const [uploading, setUploading] = useState(false);
  const [documentUrl, setDocumentUrl] = useState(initialValues?.document_url || "");

  useEffect(() => {
    if (!open) return;
    setForm({
      name: trainingLabel || initialValues?.name || "",
      provider: initialValues?.provider || "",
      completed_date: initialValues?.completed_date || "",
      expiry_date: initialValues?.expiry_date || "",
      certificate_ref: initialValues?.certificate_ref || "",
      notes: initialValues?.notes || "",
    });
    setDocumentUrl(initialValues?.document_url || "");
  }, [open, trainingLabel, initialValues]);

  if (!open) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const safeStaffId = staffId || "unknown";
      const path = `training/${safeStaffId}/${Date.now()}-${file.name}`;

      // Store training certificates in dedicated compliance-docs bucket
      const bucket = BUCKETS.COMPLIANCE_DOCS;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file);

      if (uploadError) throw uploadError;

      // Store the storage path; actual viewing uses signed URLs for this private bucket
      setDocumentUrl(path);
      toast.success("✅ Certificate uploaded");
    } catch (error) {
      console.error("❌ Error uploading training certificate:", error);
      toast.error("Failed to upload certificate");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!staffId) {
      toast.error("Missing staff record - please refresh and try again.");
      return;
    }

    if (!documentUrl) {
      toast.error("Please upload the certificate file first.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("compliance")
        .insert({
          staff_id: staffId,
          agency_id: agencyId || null,
          document_type: "training_certificate",
          document_name: form.name || trainingLabel || "Training Certificate",
          issue_date: form.completed_date || null,
          expiry_date: form.expiry_date || null,
          document_url: documentUrl,
          reference_number: form.certificate_ref || null,
          issuing_authority: form.provider || null,
          notes: form.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      onSaved?.({
        mode,
        trainingKey,
        trainingLabel: form.name || trainingLabel,
        values: form,
        complianceDoc: data,
      });
    } catch (error) {
      console.error("❌ Error saving training certificate:", error);
      toast.error("Failed to save training & certificate");
    }
  };

  const heading =
    mode === "additional"
      ? "Add Training / Qualification"
      : `Attach Certificate - ${trainingLabel}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <Card className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl">
        <CardHeader className="border-b sticky top-0 bg-white z-10">
          <CardTitle>{heading}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File upload first so it feels primary */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <Label className="text-base font-semibold block mb-2">
                {documentUrl ? "✅ Certificate Uploaded" : "Upload Training Certificate"}
              </Label>
              <p className="text-sm text-gray-600 mb-4">PDF, JPG, or PNG - Max 10MB</p>
              <label className="cursor-pointer">
                <Button type="button" disabled={uploading} asChild>
                  <span>{uploading ? "Uploading..." : documentUrl ? "Change File" : "Choose File"}</span>
                </Button>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Training meta */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="training-name" className="text-sm">
                  Training / Qualification *
                </Label>
                <Input
                  id="training-name"
                  type="text"
                  value={form.name}
                  disabled={mode === "core"}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="h-10 text-sm mt-1"
                  placeholder="e.g. COSHH, Conflict Resolution, Care Certificate"
                />
              </div>
              <div>
                <Label htmlFor="training-provider" className="text-sm">
                  Training Provider
                </Label>
                <Input
                  id="training-provider"
                  type="text"
                  value={form.provider}
                  onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
                  className="h-10 text-sm mt-1"
                  placeholder="e.g. Agile Care Group Training, NHS e-Learning"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="training-completed-date" className="text-sm">
                    Date Completed *
                  </Label>
                  <Input
                    id="training-completed-date"
                    type="date"
                    value={form.completed_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, completed_date: e.target.value }))}
                    className="h-10 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="training-expiry-date" className="text-sm">
                    Expiry Date
                  </Label>
                  <Input
                    id="training-expiry-date"
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, expiry_date: e.target.value }))}
                    className="h-10 text-sm mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="training-certificate-ref" className="text-sm">
                  Certificate Reference
                </Label>
                <Input
                  id="training-certificate-ref"
                  type="text"
                  value={form.certificate_ref}
                  onChange={(e) => setForm((prev) => ({ ...prev, certificate_ref: e.target.value }))}
                  className="h-10 text-sm mt-1"
                  placeholder="e.g. CERT-2025-001"
                />
              </div>
              <div>
                <Label htmlFor="training-notes" className="text-sm">
                  Notes (optional)
                </Label>
                <Textarea
                  id="training-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="text-sm mt-1"
                  placeholder="Any context, e.g. part of full Care Certificate covering all CQC topics."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading || !documentUrl}
                className="flex-1 h-11 bg-gradient-to-r from-cyan-500 to-blue-600"
              >
                Save Training & Certificate
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default TrainingCertificateModal;

