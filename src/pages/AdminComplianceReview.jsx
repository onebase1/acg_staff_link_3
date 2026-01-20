import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield, CheckCircle, XCircle, Eye, Clock, FileText, User, Calendar, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { BUCKETS } from '@/api/supabaseStorage';
import { format } from 'date-fns';

/**
 * 🔍 ADMIN COMPLIANCE REVIEW DASHBOARD
 *
 * Central hub for admins to review and verify staff compliance documents
 *
 * Features:
 * - View all pending documents awaiting review
 * - See verified and rejected documents
 * - Approve/Reject with one click
 * - View document previews
 * - Filter by document type
 * - Track who uploaded what and when
 */

export default function AdminComplianceReview() {
  const [selectedTab, setSelectedTab] = useState('pending');
  const [viewingDoc, setViewingDoc] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 🛡️ RBAC: Block staff members
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        navigate(createPageUrl('Home'));
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError || !profile) {
        navigate(createPageUrl('Home'));
        return;
      }

      // 🚫 Silent redirect for staff members
      if (profile.user_type === 'staff_member') {
        navigate(createPageUrl('StaffPortal'));
        return;
      }

      setUser(profile);
    };
    fetchUser();
  }, [navigate]);

  // Fetch all compliance documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['admin-compliance-review'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance')
        .select(`
          *,
          staff:staff_id (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('created_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Update document status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ documentId, status, notes }) => {
      const { error } = await supabase
        .from('compliance')
        .update({
          status,
          notes: notes || null,
          reviewed_by: user?.email,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-compliance-review']);
      toast.success('✅ Document status updated!');
    },
    onError: (error) => {
      toast.error(`❌ Failed to update: ${error.message}`);
    }
  });

  const handleApprove = (documentId) => {
    if (confirm('Approve this document?')) {
      updateStatusMutation.mutate({
        documentId,
        status: 'verified',
        notes: `Verified by ${user?.email} on ${new Date().toLocaleDateString()}`
      });
    }
  };

  const handleReject = (documentId) => {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      updateStatusMutation.mutate({
        documentId,
        status: 'rejected',
        notes: `Rejected: ${reason}`
      });
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKETS.COMPLIANCE_DOCS)
        .createSignedUrl(doc.document_url, 3600);

      if (error) throw error;

      setViewingDoc({ ...doc, signedUrl: data.signedUrl });
    } catch (error) {
      toast.error('Failed to load document');
      console.error(error);
    }
  };

  // Filter documents by status
  const pendingDocs = documents.filter(d => d.status === 'pending');
  const verifiedDocs = documents.filter(d => d.status === 'verified');
  const rejectedDocs = documents.filter(d => d.status === 'rejected');
  const expiredDocs = documents.filter(d => {
    if (!d.expiry_date) return false;
    return new Date(d.expiry_date) < new Date();
  });

  const getDocumentTypeIcon = (type) => {
    const icons = {
      dbs_check: Shield,
      right_to_work: FileText,
      id_verification: User,
      training_certificate: FileText,
      professional_registration: Shield
    };
    return icons[type] || FileText;
  };

  const getStatusBadge = (doc) => {
    const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();

    if (isExpired) {
      return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
    }

    const badges = {
      pending: <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Awaiting Review</Badge>,
      verified: <Badge className="bg-green-100 text-green-800">Verified</Badge>,
      rejected: <Badge className="bg-red-100 text-red-800">Rejected</Badge>
    };

    return badges[doc.status] || <Badge>{doc.status}</Badge>;
  };

  const DocumentCard = ({ doc }) => {
    const Icon = getDocumentTypeIcon(doc.document_type);
    const staffName = doc.staff ? `${doc.staff.first_name} ${doc.staff.last_name}` : 'Unknown';

    return (
      <Card className="border-2 hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Icon className="w-6 h-6 text-blue-600" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-semibold text-sm">{doc.document_name}</h3>
                  <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                    <User className="w-3 h-3" />
                    {staffName}
                  </p>
                </div>
                {getStatusBadge(doc)}
              </div>

              <div className="text-xs text-gray-600 space-y-1 mb-3">
                {doc.issue_date && (
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Issued: {format(new Date(doc.issue_date), 'dd MMM yyyy')}
                  </p>
                )}
                {doc.expiry_date && (
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Expires: {format(new Date(doc.expiry_date), 'dd MMM yyyy')}
                  </p>
                )}
                {doc.reference_number && (
                  <p className="text-xs text-gray-500">Ref: {doc.reference_number}</p>
                )}
                <p className="text-xs text-gray-400">
                  Uploaded: {format(new Date(doc.created_date), 'dd MMM yyyy HH:mm')}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewDocument(doc)}
                  className="h-8 text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>

                {doc.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(doc.id)}
                      className="h-8 text-xs bg-green-600 hover:bg-green-700"
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(doc.id)}
                      className="h-8 text-xs"
                      disabled={updateStatusMutation.isPending}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Reject
                    </Button>
                  </>
                )}

                {doc.status === 'rejected' && doc.notes && (
                  <div className="flex-1">
                    <p className="text-xs text-red-600">
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      {doc.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading compliance documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-6 shadow-lg">
        <h1 className="text-2xl font-bold">Compliance Review Dashboard</h1>
        <p className="text-blue-100 text-sm mt-1">Review and verify staff compliance documents</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Awaiting Review</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingDocs.length}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Verified</p>
                  <p className="text-2xl font-bold text-green-600">{verifiedDocs.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{rejectedDocs.length}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Expired</p>
                  <p className="text-2xl font-bold text-orange-600">{expiredDocs.length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Priority Alert */}
        {pendingDocs.length > 0 && (
          <Alert className="mb-6 border-yellow-300 bg-yellow-50">
            <Clock className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              <strong>{pendingDocs.length} document{pendingDocs.length > 1 ? 's' : ''} awaiting review.</strong>
              <p className="text-sm mt-1">Staff cannot work shifts until their compliance documents are verified.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">
              Pending ({pendingDocs.length})
            </TabsTrigger>
            <TabsTrigger value="verified">
              Verified ({verifiedDocs.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({rejectedDocs.length})
            </TabsTrigger>
            <TabsTrigger value="expired">
              Expired ({expiredDocs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingDocs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-600">No pending documents to review!</p>
                </CardContent>
              </Card>
            ) : (
              pendingDocs.map(doc => <DocumentCard key={doc.id} doc={doc} />)
            )}
          </TabsContent>

          <TabsContent value="verified" className="space-y-4 mt-4">
            {verifiedDocs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-600">No verified documents yet.</p>
                </CardContent>
              </Card>
            ) : (
              verifiedDocs.map(doc => <DocumentCard key={doc.id} doc={doc} />)
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4 mt-4">
            {rejectedDocs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-600">No rejected documents.</p>
                </CardContent>
              </Card>
            ) : (
              rejectedDocs.map(doc => <DocumentCard key={doc.id} doc={doc} />)
            )}
          </TabsContent>

          <TabsContent value="expired" className="space-y-4 mt-4">
            {expiredDocs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-600">No expired documents!</p>
                </CardContent>
              </Card>
            ) : (
              expiredDocs.map(doc => <DocumentCard key={doc.id} doc={doc} />)
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{viewingDoc.document_name}</h3>
                <p className="text-sm text-gray-600">
                  {viewingDoc.staff?.first_name} {viewingDoc.staff?.last_name}
                </p>
              </div>
              <Button variant="ghost" onClick={() => setViewingDoc(null)}>
                <XCircle className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
              <iframe
                src={viewingDoc.signedUrl}
                className="w-full h-[70vh] border rounded"
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
