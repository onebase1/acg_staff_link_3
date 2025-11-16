
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { BUCKETS, createSignedUrl } from "@/api/supabaseStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Shield, Upload, Download, AlertTriangle, CheckCircle, XCircle,
  Calendar, FileText, Search, Filter, User, Edit2, Trash2, Eye, HelpCircle
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";

/**
 * 📱 MOBILE-FIRST COMPLIANCE TRACKER
 *
 * FIXES:
 * ✅ Update expiry dates without re-upload
 * ✅ Real-time visibility after upload
 * ✅ Mobile-optimized UI
 * ✅ Clear progress tracking
 * ✅ Document preview
 * ✅ Smart agency branding
 */

export default function ComplianceTracker() {
  const [user, setUser] = useState(null);
  const [agency, setAgency] = useState(null);
  const [staffRecord, setStaffRecord] = useState(null);
  const [isStaff, setIsStaff] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.error('❌ Not authenticated:', authError);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Profile not found:', profileError);
        return;
      }

      setUser(profile);

      const isStaffUser = profile.user_type === 'staff_member';
      setIsStaff(isStaffUser);

      // Get agency
      if (profile.agency_id) {
        const { data: agencyData, error: agencyError } = await supabase
          .from('agencies')
          .select('*')
          .eq('id', profile.agency_id)
          .single();

        if (!agencyError && agencyData) {
          setAgency(agencyData);
        }
      }

      if (isStaffUser) {
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .or(`user_id.eq.${profile.id},email.eq.${profile.email}`)
          .single();

        if (!staffError && staffData) {
          setStaffRecord(staffData);
        }
      }
    };
    fetchUser();
  }, []);

  const { data: compliance = [], refetch: refetchCompliance } = useQuery({
    queryKey: ['compliance', isStaff ? staffRecord?.id : user?.agency_id],
    queryFn: async () => {
      let query = supabase.from('compliance').select('*').order('created_date', { ascending: false });

      if (isStaff && staffRecord?.id) {
        query = query.eq('staff_id', staffRecord.id);
      } else if (user?.agency_id) {
        query = query.eq('agency_id', user.agency_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching compliance:', error);
        return [];
      }
      return data || [];
    },
    refetchOnMount: 'always',
    staleTime: 0,
    enabled: !!user && (isStaff ? !!staffRecord?.id : true)
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*');

      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      return data || [];
    },
    enabled: true,
    refetchOnMount: 'always'
  });

  const [uploadData, setUploadData] = useState({
    document_type: 'dbs_check',
    document_name: '',
    issue_date: '',
    expiry_date: '',
    document_url: '',
    staff_id: '',
    reference_number: '',
    issuing_authority: '',
    notes: ''
  });

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      const { data: created, error } = await supabase
        .from('compliance')
        .insert({
          ...data,
          created_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return created;
    },
    onSuccess: async () => {
      await refetchCompliance();
      await queryClient.invalidateQueries(['compliance']);
      setShowUploadModal(false);
      setUploadData({
        document_type: 'dbs_check',
        document_name: '',
        issue_date: '',
        expiry_date: '',
        document_url: '',
        staff_id: '',
        reference_number: '',
        issuing_authority: '',
        notes: ''
      });
      toast.success('✅ Document uploaded successfully!');
    },
    onError: (error) => {
      toast.error(`❌ Upload failed: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase
        .from('compliance')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await refetchCompliance();
      await queryClient.invalidateQueries(['compliance']);
      setShowEditModal(false);
      setEditingDoc(null);
      toast.success('✅ Document updated successfully!');
    },
    onError: (error) => {
      toast.error(`❌ Update failed: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('compliance')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await refetchCompliance();
      await queryClient.invalidateQueries(['compliance']);
      toast.success('✅ Document deleted');
    },
    onError: (error) => {
      toast.error(`❌ Delete failed: ${error.message}`);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('❌ Only PDF, JPG, and PNG files allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('❌ File must be less than 10MB');
      return;
    }

    setUploadingDoc(true);

    try {
      toast.info('📤 Uploading file...');

      // Upload to Supabase Storage (private compliance-docs bucket)
      const filePath = `compliance/${Date.now()}-${file.name}`;
      const { data: uploadedFile, error: uploadError } = await supabase.storage
        .from(BUCKETS.COMPLIANCE_DOCS)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Store the storage path; viewing uses signed URLs
      setUploadData({ ...uploadData, document_url: filePath });
      toast.success('✅ File uploaded! Complete the form below.');
    } catch (error) {
      toast.error(`❌ Upload failed: ${error.message}`);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!uploadData.document_url) {
      toast.error('⚠️ Please upload a document file first');
      return;
    }

    if (!uploadData.document_name) {
      toast.error('⚠️ Document Name is required');
      return;
    }

    let finalStaffId = uploadData.staff_id;

    if (isStaff && staffRecord?.id) {
      finalStaffId = staffRecord.id;
    } else if (!isStaff && !finalStaffId) {
      toast.error('⚠️ Please select a staff member');
      return;
    }

    const submitData = {
      ...uploadData,
      staff_id: finalStaffId,
      agency_id: user?.agency_id,
      status: 'pending'
    };

    uploadMutation.mutate(submitData);
  };

  const handleEdit = (doc) => {
    setEditingDoc(doc);
    setShowEditModal(true);
  };

  // ✅ NEW: Handle file replacement
  const handleFileReplace = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('❌ Only PDF, JPG, and PNG files allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('❌ File must be less than 10MB');
      return;
    }

    setUploadingDoc(true);

    try {
      toast.info('📤 Uploading new file...');

      // Upload to Supabase Storage (private compliance-docs bucket)
      const filePath = `compliance/${Date.now()}-${file.name}`;
      const { data: uploadedFile, error: uploadError } = await supabase.storage
        .from(BUCKETS.COMPLIANCE_DOCS)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Store the storage path; viewing uses signed URLs
      setEditingDoc({ ...editingDoc, document_url: filePath });
      toast.success('✅ New file uploaded! Click "Save Changes" to confirm.');
    } catch (error) {
      toast.error(`❌ Upload failed: ${error.message}`);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleUpdate = (e) => {
    e.preventDefault();

    updateMutation.mutate({
      id: editingDoc.id,
      data: {
        document_name: editingDoc.document_name,
        document_url: editingDoc.document_url, // ✅ Now updates file URL if changed
        issue_date: editingDoc.issue_date,
        expiry_date: editingDoc.expiry_date,
        reference_number: editingDoc.reference_number,
        issuing_authority: editingDoc.issuing_authority,
        notes: editingDoc.notes,
        status: editingDoc.status
      }
    });
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this document? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unknown';
  };

  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    return differenceInDays(new Date(expiryDate), new Date());
  };

  const getExpiryBadge = (expiryDate) => {
    if (!expiryDate) return <Badge variant="secondary" className="text-xs">No Expiry</Badge>;

    const days = getDaysUntilExpiry(expiryDate);
    if (days < 0) return <Badge className="bg-red-600 text-white text-xs"><XCircle className="w-3 h-3 mr-1" /> Expired</Badge>;
    if (days <= 7) return <Badge className="bg-red-500 text-white text-xs"><AlertTriangle className="w-3 h-3 mr-1" /> {days}d</Badge>;
    if (days <= 30) return <Badge className="bg-orange-500 text-white text-xs"><Calendar className="w-3 h-3 mr-1" /> {days}d</Badge>;
    return <Badge className="bg-green-600 text-white text-xs"><CheckCircle className="w-3 h-3 mr-1" /> {days}d</Badge>;
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { className: 'bg-yellow-100 text-yellow-800 text-xs', icon: AlertTriangle, text: 'Pending' },
      verified: { className: 'bg-green-100 text-green-800 text-xs', icon: CheckCircle, text: 'Verified' },
      expired: { className: 'bg-red-100 text-red-800 text-xs', icon: XCircle, text: 'Expired' },
      rejected: { className: 'bg-gray-100 text-gray-800 text-xs', icon: XCircle, text: 'Rejected' }
    };
    const info = variants[status] || variants.pending;
    const Icon = info.icon;
    return <Badge className={info.className}><Icon className="w-3 h-3 mr-1" /> {info.text}</Badge>;
  };

  const getComplianceStoragePath = (documentUrl) => {
    if (!documentUrl) return "";
    const marker = "/compliance-docs/";
    const idx = documentUrl.indexOf(marker);
    if (idx === -1) {
      // Already a storage path (e.g. "compliance/...")
      return documentUrl;
    }
    return documentUrl.substring(idx + marker.length);
  };

  const handleViewDocument = async (documentUrl, description = "document") => {
    const path = getComplianceStoragePath(documentUrl);
    if (!path) {
      toast.error("Document path is missing");
      return;
    }

    try {
      const signedUrl = await createSignedUrl({
        bucket: BUCKETS.COMPLIANCE_DOCS,
        path,
        expiresIn: 60 * 60, // 1 hour
      });
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("❌ Error generating secure link:", error);
      toast.error(`Unable to open ${description}. Please try again.`);
    }
  };


  const filteredCompliance = compliance.filter(doc => {
    const statusMatch = statusFilter === 'all' || doc.status === statusFilter;
    const typeMatch = typeFilter === 'all' || doc.document_type === typeFilter;

    const searchLower = searchTerm.toLowerCase();
    const searchMatch = doc.document_name?.toLowerCase().includes(searchLower) ||
                       doc.document_type?.toLowerCase().includes(searchLower) ||
                       getStaffName(doc.staff_id).toLowerCase().includes(searchLower);

    return statusMatch && typeMatch && searchMatch;
  });

  const stats = {
    total: filteredCompliance.length,
    verified: filteredCompliance.filter(d => d.status === 'verified').length,
    pending: filteredCompliance.filter(d => d.status === 'pending').length,
    expiring: filteredCompliance.filter(d => {
      if (!d.expiry_date) return false;
      const days = getDaysUntilExpiry(d.expiry_date);
      return days >= 0 && days <= 30;
    }).length
  };

  // Calculate compliance progress for staff
  const complianceProgress = isStaff && staffRecord ? (() => {
    const required = ['dbs_check', 'right_to_work', 'professional_registration'];
    const completed = required.filter(type =>
      compliance.some(d => d.document_type === type && d.status === 'verified')
    ).length;
    return Math.round((completed / required.length) * 100);
  })() : null;

  const documentTypeInfo = {
    dbs_check: { label: 'DBS Check', icon: '🛡️', help: 'Criminal records check - required for all care workers' },
    right_to_work: { label: 'Right to Work', icon: '📋', help: 'Passport, visa, or work permit' },
    professional_registration: { label: 'Professional Registration', icon: '👨‍⚕️', help: 'NMC PIN for nurses' },
    training_certificate: { label: 'Training Certificate', icon: '📜', help: 'Mandatory training completion' },
    vaccination_record: { label: 'Vaccination Record', icon: '💉', help: 'COVID-19, Hep B, flu vaccines' },
    reference: { label: 'Reference', icon: '✍️', help: 'Written employment reference' },
    id_verification: { label: 'ID Verification', icon: '🆔', help: 'Photo ID verification' },
    insurance: { label: 'Insurance', icon: '🏥', help: 'Professional indemnity insurance' },
    other: { label: 'Other', icon: '📄', help: 'Other compliance documents' }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Mobile Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6 rounded-xl -mx-4 sm:mx-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">
              {isStaff ? 'My Documents' : 'Compliance Tracker'}
            </h2>
            <p className="text-cyan-100 text-sm mt-1">
              {agency?.name || 'Healthcare Agency'}
            </p>
          </div>
          {isStaff && complianceProgress !== null && (
            <div className="text-right">
              <div className="text-3xl font-bold">{complianceProgress}%</div>
              <p className="text-xs text-cyan-100">Complete</p>
            </div>
          )}
        </div>

        {isStaff && complianceProgress !== null && (
          <Progress value={complianceProgress} className="h-2 bg-cyan-400" />
        )}
      </div>

      {/* Quick Stats - Mobile Optimized */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <FileText className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-600">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
            <p className="text-xs text-green-700">Verified</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-yellow-700">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <Calendar className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-600">{stats.expiring}</p>
            <p className="text-xs text-red-700">Expiring</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Button - Sticky on Mobile */}
      <div className="sticky top-16 z-10 bg-white py-3 -mx-4 px-4 sm:mx-0 sm:px-0 border-b sm:border-0 shadow-sm sm:shadow-none">
        <Button
          onClick={() => setShowUploadModal(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 h-12 text-lg"
          size="lg"
        >
          <Upload className="w-5 h-5 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Filters - Mobile Optimized */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(documentTypeInfo).map(([key, info]) => (
                  <SelectItem key={key} value={key}>{info.icon} {info.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents List - Mobile Cards */}
      <div className="space-y-3">
        {filteredCompliance.length > 0 ? (
          filteredCompliance.map(doc => {
            const typeInfo = documentTypeInfo[doc.document_type] || documentTypeInfo.other;

            return (
              <Card key={doc.id} className="border-2 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-3xl">{typeInfo.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{doc.document_name}</h3>
                        <p className="text-xs text-gray-500">{typeInfo.label}</p>
                        {!isStaff && (
                          <p className="text-xs text-gray-600 mt-1">
                            <User className="w-3 h-3 inline mr-1" />
                            {getStaffName(doc.staff_id)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getExpiryBadge(doc.expiry_date)}
                      {getStatusBadge(doc.status)}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3 bg-gray-50 p-2 rounded">
                    {doc.issue_date && (
                      <div>
                        <span className="font-medium">Issued:</span>
                        <br />
                        {format(new Date(doc.issue_date), 'dd MMM yyyy')}
                      </div>
                    )}
                    {doc.expiry_date && (
                      <div>
                        <span className="font-medium">Expires:</span>
                        <br />
                        {format(new Date(doc.expiry_date), 'dd MMM yyyy')}
                      </div>
                    )}
                  </div>

                  {/* Actions - Large Touch Targets */}
                  <div className="flex gap-2">
                    {doc.document_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-10"
                        onClick={() => handleViewDocument(doc.document_url, doc.document_name || "document")}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-10"
                      onClick={() => handleEdit(doc)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    {/* ✅ CHANGED: Staff can now delete their own documents */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-10 text-red-600"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No documents match your filters.'
                  : 'Upload your first compliance document to get started.'}
              </p>
              <Button onClick={() => setShowUploadModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload Modal - Mobile Optimized */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <Card className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl">
            <CardHeader className="border-b sticky top-0 bg-white z-10">
              <CardTitle>Upload Document</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* File Upload - Prominent */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <Label className="text-base font-semibold block mb-2">
                    {uploadData.document_url ? '✅ File Uploaded' : 'Upload Document File'}
                  </Label>
                  <p className="text-sm text-gray-600 mb-4">PDF, JPG, or PNG - Max 10MB</p>
                  <label className="cursor-pointer">
                    <Button type="button" disabled={uploadingDoc} asChild>
                      <span>
                        {uploadingDoc ? 'Uploading...' : uploadData.document_url ? 'Change File' : 'Choose File'}
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploadingDoc}
                    />
                  </label>
                  {uploadData.document_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleViewDocument(uploadData.document_url, uploadData.document_name || "document")}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  )}
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <Label>Document Type *</Label>
                    <Select
                      value={uploadData.document_type}
                      onValueChange={(value) => setUploadData({ ...uploadData, document_type: value })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(documentTypeInfo).map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <span>{info.icon}</span>
                              <div>
                                <div className="font-medium">{info.label}</div>
                                <div className="text-xs text-gray-500">{info.help}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="upload-document-name">Document Name *</Label>
                    <Input
                      id="upload-document-name"
                      placeholder="e.g., DBS Certificate 2024"
                      value={uploadData.document_name}
                      onChange={(e) => setUploadData({ ...uploadData, document_name: e.target.value })}
                      className="h-12"
                      required
                    />
                  </div>

                  {!isStaff && (
                    <div>
                      <Label>Staff Member *</Label>
                      <Select
                        value={uploadData.staff_id}
                        onValueChange={(value) => setUploadData({ ...uploadData, staff_id: value })}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select staff..." />
                        </SelectTrigger>
                        <SelectContent>
                          {staff.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.first_name} {s.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="upload-issue-date">Issue Date</Label>
                      <Input
                        id="upload-issue-date"
                        type="date"
                        value={uploadData.issue_date}
                        onChange={(e) => setUploadData({ ...uploadData, issue_date: e.target.value })}
                        className="h-12"
                      />
                    </div>
                    <div>
                      <Label htmlFor="upload-expiry-date">Expiry Date</Label>
                      <Input
                        id="upload-expiry-date"
                        type="date"
                        value={uploadData.expiry_date}
                        onChange={(e) => setUploadData({ ...uploadData, expiry_date: e.target.value })}
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Reference Number</Label>
                    <Input
                      placeholder="Certificate/Document number"
                      value={uploadData.reference_number}
                      onChange={(e) => setUploadData({ ...uploadData, reference_number: e.target.value })}
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Actions - Large Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 h-12"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={uploadMutation.isPending || !uploadData.document_url || uploadingDoc}
                    className="flex-1 h-12 bg-gradient-to-r from-cyan-500 to-blue-600"
                  >
                    {uploadMutation.isPending ? 'Uploading...' : 'Submit'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Modal - Mobile Optimized */}
      {showEditModal && editingDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <Card className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl">
            <CardHeader className="border-b sticky top-0 bg-white z-10">
              <CardTitle>Edit Document</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpdate} className="space-y-4">
                <Alert className="border-blue-300 bg-blue-50">
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <strong>Update Document:</strong> You can update dates, details, or replace the file completely. Changes are saved when you click "Save Changes".
                  </AlertDescription>
                </Alert>

                {/* ✅ NEW: File Replacement Section */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                  <Label className="text-base font-semibold block mb-2">
                    Current Document File
                  </Label>
                  {editingDoc.document_url && (
                    <div className="flex items-center gap-3 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-gray-700">File attached</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDocument(editingDoc.document_url, editingDoc.document_name || "document")}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview Current
                      </Button>
                    </div>
                  )}

                  <div className="mt-3">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Replace with New File (Optional)
                    </Label>
                    <label className="cursor-pointer">
                      <Button type="button" variant="outline" disabled={uploadingDoc} asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingDoc ? 'Uploading...' : 'Choose New File'}
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileReplace}
                        className="hidden"
                        disabled={uploadingDoc}
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      PDF, JPG, or PNG - Max 10MB. Leave unchanged if you don't want to replace the file.
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-document-name">Document Name *</Label>
                  <Input
                    id="edit-document-name"
                    value={editingDoc.document_name}
                    onChange={(e) => setEditingDoc({ ...editingDoc, document_name: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-issue-date">Issue Date</Label>
                    <Input
                      id="edit-issue-date"
                      type="date"
                      value={editingDoc.issue_date || ''}
                      onChange={(e) => setEditingDoc({ ...editingDoc, issue_date: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-expiry-date">Expiry Date</Label>
                    <Input
                      id="edit-expiry-date"
                      type="date"
                      value={editingDoc.expiry_date || ''}
                      onChange={(e) => setEditingDoc({ ...editingDoc, expiry_date: e.target.value })}
                      className="h-12"
                    />
                  </div>
                </div>

                <div>
                  <Label>Reference Number</Label>
                  <Input
                    value={editingDoc.reference_number || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, reference_number: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div>
                  <Label>Issuing Authority</Label>
                  <Input
                    value={editingDoc.issuing_authority || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, issuing_authority: e.target.value })}
                    className="h-12"
                  />
                </div>

                {!isStaff && (
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={editingDoc.status}
                      onValueChange={(value) => setEditingDoc({ ...editingDoc, status: value })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending Review</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Notes</Label>
                  <Input
                    value={editingDoc.notes || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, notes: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingDoc(null);
                    }}
                    className="flex-1 h-12"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending || uploadingDoc}
                    className="flex-1 h-12 bg-gradient-to-r from-cyan-500 to-blue-600"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
