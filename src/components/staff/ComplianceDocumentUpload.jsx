import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, CheckCircle, XCircle, FileText, Shield, IdCard, Briefcase } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BUCKETS } from "@/api/supabaseStorage";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

/**
 * ComplianceDocumentUpload
 *
 * Component for uploading and managing compliance documents (DBS, ID, Right to Work)
 * within ProfileSetup. Writes directly to the compliance table.
 */

const DOCUMENT_TYPES = {
  dbs_check: {
    type: 'dbs_check',
    label: 'DBS Check',
    icon: Shield,
    color: 'blue',
    fields: ['issue_date', 'expiry_date', 'reference_number', 'issuing_authority']
  },
  id_verification: {
    type: 'id_verification',
    label: 'ID Verification (Passport/Photo ID)',
    icon: IdCard,
    color: 'green',
    fields: ['issue_date', 'expiry_date', 'reference_number', 'issuing_authority']
  },
  right_to_work: {
    type: 'right_to_work',
    label: 'Right to Work',
    icon: Briefcase,
    color: 'purple',
    fields: ['issue_date', 'expiry_date', 'reference_number', 'issuing_authority']
  }
};

function DocumentUploadModal({
  open,
  documentType,
  staffId,
  agencyId,
  existingDocument,
  onClose,
  onSaved
}) {
  const docConfig = DOCUMENT_TYPES[documentType];
  const [form, setForm] = useState({
    issue_date: existingDocument?.issue_date || "",
    expiry_date: existingDocument?.expiry_date || "",
    reference_number: existingDocument?.reference_number || "",
    issuing_authority: existingDocument?.issuing_authority || "",
    notes: existingDocument?.notes || ""
  });
  const [uploading, setUploading] = useState(false);
  const [documentUrl, setDocumentUrl] = useState(existingDocument?.document_url || "");

  if (!open || !docConfig) return null;

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
      const path = `compliance/${documentType}/${safeStaffId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.COMPLIANCE_DOCS)
        .upload(path, file);

      if (uploadError) throw uploadError;

      setDocumentUrl(path);
      toast.success("✅ Document uploaded");
    } catch (error) {
      console.error("❌ Error uploading document:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!staffId) {
      toast.error("Missing staff record - please save your profile first.");
      return;
    }

    if (!documentUrl) {
      toast.error("Please upload the document file first.");
      return;
    }

    try {
      // Check if updating existing document or creating new one
      if (existingDocument?.id) {
        const { error } = await supabase
          .from("compliance")
          .update({
            issue_date: form.issue_date || null,
            expiry_date: form.expiry_date || null,
            document_url: documentUrl,
            reference_number: form.reference_number || null,
            issuing_authority: form.issuing_authority || null,
            notes: form.notes || null,
            status: 'pending' // Reset to pending when re-uploaded
          })
          .eq('id', existingDocument.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("compliance")
          .insert({
            staff_id: staffId,
            agency_id: agencyId || null,
            document_type: documentType,
            document_name: docConfig.label,
            issue_date: form.issue_date || null,
            expiry_date: form.expiry_date || null,
            document_url: documentUrl,
            reference_number: form.reference_number || null,
            issuing_authority: form.issuing_authority || null,
            notes: form.notes || null,
            status: 'pending'
          });

        if (error) throw error;
      }

      toast.success(`✅ ${docConfig.label} saved successfully!`);
      onSaved?.();
    } catch (error) {
      console.error("❌ Error saving compliance document:", error);
      toast.error("Failed to save document");
    }
  };

  const Icon = docConfig.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <Card className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl">
        <CardHeader className={`border-b sticky top-0 bg-${docConfig.color}-50 z-10`}>
          <CardTitle className="flex items-center gap-2">
            <Icon className={`w-6 h-6 text-${docConfig.color}-600`} />
            {existingDocument ? 'Update' : 'Upload'} {docConfig.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File upload first */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <Label className="text-base font-semibold block mb-2">
                {documentUrl ? "✅ Document Uploaded" : `Upload ${docConfig.label}`}
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

            {/* Document metadata */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="issue-date" className="text-sm">
                    Issue Date *
                  </Label>
                  <Input
                    id="issue-date"
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, issue_date: e.target.value }))}
                    className="h-10 text-sm mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expiry-date" className="text-sm">
                    Expiry Date {documentType === 'dbs_check' ? '(if applicable)' : '*'}
                  </Label>
                  <Input
                    id="expiry-date"
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, expiry_date: e.target.value }))}
                    className="h-10 text-sm mt-1"
                    required={documentType !== 'dbs_check'}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="reference-number" className="text-sm">
                  Reference/Certificate Number
                </Label>
                <Input
                  id="reference-number"
                  type="text"
                  value={form.reference_number}
                  onChange={(e) => setForm((prev) => ({ ...prev, reference_number: e.target.value }))}
                  className="h-10 text-sm mt-1"
                  placeholder={documentType === 'dbs_check' ? "e.g. DBS Certificate Number" : "e.g. Passport Number"}
                />
              </div>
              <div>
                <Label htmlFor="issuing-authority" className="text-sm">
                  Issuing Authority
                </Label>
                <Input
                  id="issuing-authority"
                  type="text"
                  value={form.issuing_authority}
                  onChange={(e) => setForm((prev) => ({ ...prev, issuing_authority: e.target.value }))}
                  className="h-10 text-sm mt-1"
                  placeholder={documentType === 'dbs_check' ? "e.g. Disclosure and Barring Service" : "e.g. UK Home Office"}
                />
              </div>
              <div>
                <Label htmlFor="notes" className="text-sm">
                  Notes (optional)
                </Label>
                <Textarea
                  id="notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="text-sm mt-1"
                  placeholder="Any additional information..."
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
                Save Document
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ComplianceDocumentCard({ documentType, document, onUpload, onView }) {
  const docConfig = DOCUMENT_TYPES[documentType];
  if (!docConfig) return null;

  const Icon = docConfig.icon;
  const isExpired = document?.expiry_date && new Date(document.expiry_date) < new Date();
  const isExpiringSoon = document?.expiry_date &&
    new Date(document.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const getStatusBadge = () => {
    if (!document) {
      return <Badge className="bg-red-100 text-red-800 border-red-300">Missing</Badge>;
    }
    if (isExpired) {
      return <Badge className="bg-red-100 text-red-800 border-red-300">Expired</Badge>;
    }
    if (isExpiringSoon) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Expiring Soon</Badge>;
    }
    if (document.status === 'verified') {
      return <Badge className="bg-green-100 text-green-800 border-green-300">Verified</Badge>;
    }
    if (document.status === 'pending') {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Pending Review</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{document.status}</Badge>;
  };

  return (
    <Card className="border-2">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-lg bg-${docConfig.color}-100 flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-6 h-6 text-${docConfig.color}-600`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-sm">{docConfig.label}</h4>
              {getStatusBadge()}
            </div>
            {document ? (
              <div className="text-xs text-gray-600 space-y-1">
                {document.issue_date && (
                  <p>Issued: {new Date(document.issue_date).toLocaleDateString()}</p>
                )}
                {document.expiry_date && (
                  <p className={isExpired || isExpiringSoon ? 'text-red-600 font-semibold' : ''}>
                    Expires: {new Date(document.expiry_date).toLocaleDateString()}
                  </p>
                )}
                {document.reference_number && (
                  <p>Ref: {document.reference_number}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-red-600 font-semibold">Required for shift eligibility</p>
            )}
            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onUpload(documentType)}
                className="h-8 text-xs"
              >
                <Upload className="w-3 h-3 mr-1" />
                {document ? 'Update' : 'Upload'}
              </Button>
              {document?.document_url && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onView(document)}
                  className="h-8 text-xs"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  View
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ComplianceDocumentUpload({ compliance, staffId, agencyId, onDocumentUploaded }) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState(null);

  const getDocument = (docType) => {
    return compliance.find(c => c.document_type === docType) || null;
  };

  const handleOpenUpload = (docType) => {
    setSelectedDocType(docType);
    setUploadModalOpen(true);
  };

  const handleCloseModal = () => {
    setUploadModalOpen(false);
    setSelectedDocType(null);
  };

  const handleSaved = () => {
    handleCloseModal();
    onDocumentUploaded?.();
  };

  const handleViewDocument = async (document) => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKETS.COMPLIANCE_DOCS)
        .createSignedUrl(document.document_url, 3600); // 1 hour expiry

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('❌ Error viewing document:', error);
      toast.error('Failed to load document');
    }
  };

  const dbsDoc = getDocument('dbs_check');
  const idDoc = getDocument('id_verification');
  const rtwDoc = getDocument('right_to_work');

  const allComplete = dbsDoc && idDoc && rtwDoc;
  const allVerified = dbsDoc?.status === 'verified' &&
                      idDoc?.status === 'verified' &&
                      rtwDoc?.status === 'verified';

  return (
    <>
      <Card className="border-2 border-purple-300">
        <CardHeader className="bg-purple-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Compliance Documents *
            </CardTitle>
            {allComplete && (
              <Badge className={allVerified ? "bg-green-600" : "bg-blue-600"}>
                {allVerified ? "All Verified" : "Under Review"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {!allComplete && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-900 font-semibold flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                CRITICAL: All 3 documents required before accepting shifts
              </p>
            </div>
          )}

          <ComplianceDocumentCard
            documentType="dbs_check"
            document={dbsDoc}
            onUpload={handleOpenUpload}
            onView={handleViewDocument}
          />

          <ComplianceDocumentCard
            documentType="id_verification"
            document={idDoc}
            onUpload={handleOpenUpload}
            onView={handleViewDocument}
          />

          <ComplianceDocumentCard
            documentType="right_to_work"
            document={rtwDoc}
            onUpload={handleOpenUpload}
            onView={handleViewDocument}
          />
        </CardContent>
      </Card>

      {uploadModalOpen && selectedDocType && (
        <DocumentUploadModal
          open={uploadModalOpen}
          documentType={selectedDocType}
          staffId={staffId}
          agencyId={agencyId}
          existingDocument={getDocument(selectedDocType)}
          onClose={handleCloseModal}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
