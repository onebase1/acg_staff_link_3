import React, { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  Mail,
  RefreshCw,
  Shield,
  UserPlus,
  Users,
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function SuperAdminAgencyManagement() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedAgencies, setExpandedAgencies] = useState(new Set());
  const [selectedAgencyForAdmin, setSelectedAgencyForAdmin] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditAdminOpen, setIsEditAdminOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editAdminName, setEditAdminName] = useState("");
  const [editAdminPhone, setEditAdminPhone] = useState("");

  const isSuperAdmin = useMemo(
    () => !!user && (user.email === "g.basera@yahoo.com" || user.user_type === "super_admin"),
    [user]
  );


  // Fetch all data via SAAS Owner View
  const { data: saasData, isLoading: saasLoading, error: saasError } = useQuery({
    queryKey: ["saas-owner-view"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_saas_owner_view');

      if (error) {
        console.error("Error fetching SAAS view:", error);
        throw error;
      }

      return data || { agencies: [], admins: [], invitations: [] };
    },
    enabled: isSuperAdmin,
  });

  const agencies = saasData?.agencies || [];
  const agencyAdmins = saasData?.admins || [];
  const invitations = saasData?.invitations || [];
  const agenciesLoading = saasLoading;
  const adminsLoading = saasLoading;
  const invitationsLoading = saasLoading;

  // Add admin mutation
  const addAdminMutation = useMutation({
    mutationFn: async ({ agencyId, adminEmail, adminName }) => {
      // 1. Create the invitation record directly in the DB
      // We rely on the "SAAS Owner Insert" policy we just added
      const { data: invitation, error: inviteError } = await supabase
        .from("agency_admin_invitations")
        .insert({
          agency_id: agencyId,
          email: adminEmail,
          status: "pending",
          admin_name: adminName,
        })
        .select()
        .single();

      if (inviteError) {
        console.error("DB Insert Error:", inviteError);
        throw new Error("Failed to create invitation record: " + inviteError.message);
      }

      // 2. Fetch agency details for the email
      const { data: agency } = await supabase
        .from("agencies")
        .select("name")
        .eq("id", agencyId)
        .single();

      const agencyName = agency?.name || "Agile Care";
      // Use the origin from window location for the setup link
      const setupUrl = `${window.location.origin}/login?view=sign-up&email=${encodeURIComponent(adminEmail)}`;

      // 3. Send email using the generic 'send-email' function (same as Staff.jsx)
      const { error: emailError } = await supabase.functions.invoke("send-email", {
        body: {
          to: adminEmail,
          subject: `Invitation to manage ${agencyName}`,
          from_name: "Agile Care Admin",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Welcome to ACG StaffLink</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <p style="font-size: 16px; color: #1f2937;">Hi ${adminName},</p>
                <p style="font-size: 16px; color: #1f2937;">
                  You've been invited to be an administrator for <strong>${agencyName}</strong> on ACG StaffLink.
                </p>

                <div style="background: white; border-left: 4px solid #06b6d4; padding: 20px; margin: 20px 0;">
                  <p style="margin: 10px 0;"><strong>Role:</strong> Agency Administrator</p>
                  <p style="margin: 10px 0;"><strong>Your Email:</strong> ${adminEmail}</p>
                  <p style="margin: 10px 0;"><strong>Next Steps:</strong></p>
                  <ol style="margin: 10px 0; padding-left: 20px;">
                    <li>Create your account using the email above</li>
                    <li>Set up your agency profile</li>
                    <li>Start managing staff and shifts</li>
                  </ol>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${setupUrl}" style="background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                    Create Your Account
                  </a>
                </div>

                <div style="background: #e0f2fe; border-left: 44px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #0c4a6e; font-size: 14px; font-weight: 600;">📝 How to Sign Up:</p>
                  <p style="margin: 10px 0 0 0; color: #0c4a6e; font-size: 13px; line-height: 1.6;">
                    1️⃣ Click "Create Your Account" above<br>
                    2️⃣ Enter your email: <strong>${adminEmail}</strong><br>
                    3️⃣ Create a secure password<br>
                    4️⃣ We'll recognize your invitation automatically!
                  </p>
                </div>

                <p style="font-size: 14px; color: #6b7280;">
                  This invitation expires in 7 days.
                </p>
              </div>
              <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
                <p>© ${new Date().getFullYear()} ${agencyName}. All rights reserved.</p>
                <p style="margin-top: 5px;">Powered by ACG StaffLink</p>
              </div>
            </div>
          `
        },
      });

      if (emailError) {
        console.error("Email Edge Function Error:", emailError);
        throw emailError;
      }

      return { invitation };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["super-admin-all-agency-admins"]);
      queryClient.invalidateQueries(["agency-admin-invitations"]);
      queryClient.invalidateQueries(["saas-owner-view"]); // Refresh the main view
      setIsDialogOpen(false);
      setNewAdminEmail("");
      setNewAdminName("");
      toast.success("Invitation Sent", {
        description: `An invitation has been sent to ${newAdminEmail}.`,
        className: "bg-green-600 text-white border-none",
      });
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      toast.error("Error", {
        description: error.message || "Failed to send invitation. Please try again.",
      });
    },
  });

  // Update admin mutation
  const updateAdminMutation = useMutation({
    mutationFn: async ({ adminId, fullName, phone }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone,
        })
        .eq("id", adminId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["saas-owner-view"]);
      setIsEditAdminOpen(false);
      toast.success("Administrator updated successfully", {
        className: "bg-green-600 text-white border-none",
      });
    },
    onError: (error) => {
      console.error("Update admin error:", error);
      toast.error("Error", {
        description: error.message || "Failed to update administrator. Please try again.",
      });
    },
  });

  const toggleAgency = (agencyId) => {
    const newSet = new Set(expandedAgencies);
    if (newSet.has(agencyId)) {
      newSet.delete(agencyId);
    } else {
      newSet.add(agencyId);
    }
    setExpandedAgencies(newSet);
  };

  const handleAddAdmin = () => {
    if (!selectedAgencyForAdmin || !newAdminEmail) {
      toast.error("Please select an agency and enter an email");
      return;
    }

    addAdminMutation.mutate({
      agencyId: selectedAgencyForAdmin,
      adminEmail: newAdminEmail,
      adminName: newAdminName,
    });
  };

  const handleEditAdmin = (admin) => {
    setEditingAdmin(admin);
    setEditAdminName(admin.full_name || "");
    setEditAdminPhone(admin.phone || "");
    setIsEditAdminOpen(true);
  };

  const handleUpdateAdmin = () => {
    if (!editingAdmin) return;
    updateAdminMutation.mutate({
      adminId: editingAdmin.id,
      fullName: editAdminName,
      phone: editAdminPhone,
    });
  };

  if (loading || agenciesLoading || adminsLoading || invitationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading agency management...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    if (user?.user_type === 'staff_member') {
      navigate(createPageUrl('StaffPortal'));
    } else {
      navigate(createPageUrl('Dashboard'));
    }
    return null;
  }

  // Group admins and invitations by agency
  const agenciesWithAdmins = agencies.map((agency) => {
    const admins = agencyAdmins.filter((admin) => admin.agency_id === agency.id);
    const pending = invitations.filter(
      (inv) => inv.agency_id === agency.id && inv.status === "pending"
    );
    return { ...agency, admins, pendingInvitations: pending };
  });

  const agenciesWithoutAdmins = agenciesWithAdmins.filter((a) => a.admins.length === 0);
  const agenciesWithAdminsCount = agenciesWithAdmins.filter((a) => a.admins.length > 0).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agency Management</h1>
          <p className="text-gray-600 mt-1">
            View and manage all agencies and their administrators
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-purple-600 text-white px-4 py-2">Super Admin</Badge>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Admin to Agency
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Admin to Existing Agency</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="agency-select">Select Agency *</Label>
                  <Select value={selectedAgencyForAdmin} onValueChange={setSelectedAgencyForAdmin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an agency..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agencies.map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          {agency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="admin-email">Admin Email *</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="admin-name">Admin Full Name</Label>
                  <Input
                    id="admin-name"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <Button
                  onClick={handleAddAdmin}
                  disabled={addAdminMutation.isPending}
                  className="w-full"
                >
                  {addAdminMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sending Invitation...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Agencies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{agencies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Agencies with Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{agenciesWithAdminsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Missing Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {agenciesWithoutAdmins.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{agencyAdmins.length}</div>
          </CardContent>
        </Card>
      </div >

      {/* Agencies without admins warning */}
      {
        agenciesWithoutAdmins.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription>
              <strong>{agenciesWithoutAdmins.length} agencies have no administrators:</strong>{" "}
              {agenciesWithoutAdmins.map((a) => a.name).join(", ")}
            </AlertDescription>
          </Alert>
        )
      }

      {/* Agencies List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            All Agencies ({agencies.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {agenciesWithAdmins.map((agency) => {
              const isExpanded = expandedAgencies.has(agency.id);
              const hasNoAdmins = agency.admins.length === 0;

              return (
                <Collapsible
                  key={agency.id}
                  open={isExpanded}
                  onOpenChange={() => toggleAgency(agency.id)}
                >
                  <div
                    className={`p-4 hover:bg-gray-50 ${hasNoAdmins ? "bg-red-50 border-l-4 border-red-500" : ""
                      }`}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                          <div className="text-left">
                            <div className="font-semibold text-gray-900">{agency.name}</div>
                            <div className="text-sm text-gray-500">
                              {agency.email || agency.contact_email || "No contact email"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={hasNoAdmins ? "destructive" : "secondary"}>
                            {agency.admins.length} admin{agency.admins.length !== 1 ? "s" : ""}
                          </Badge>
                          {agency.pendingInvitations.length > 0 && (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              {agency.pendingInvitations.length} pending
                            </Badge>
                          )}
                          <Badge
                            variant={agency.status === "active" ? "default" : "secondary"}
                            className={
                              agency.status === "active"
                                ? "bg-green-100 text-green-800"
                                : ""
                            }
                          >
                            {agency.status}
                          </Badge>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="mt-4 ml-8 space-y-4">
                        {/* Admins List */}
                        {agency.admins.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              Administrators
                            </h4>
                            <div className="space-y-2">
                              {agency.admins.map((admin) => (
                                <div
                                  key={admin.id}
                                  className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow group"
                                >
                                  <div>
                                    <div className="font-medium text-gray-900">{admin.email}</div>
                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                      {admin.full_name || "Name not set"}
                                      {admin.phone && (
                                        <Badge variant="outline" className="text-[10px] py-0 px-1 border-cyan-200 text-cyan-700 bg-cyan-50">
                                          {admin.phone}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      Added: {new Date(admin.created_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditAdmin(admin);
                                    }}
                                    className="h-8 text-cyan-600 border-cyan-100 hover:bg-cyan-50 hover:border-cyan-200"
                                  >
                                    <Pencil className="w-3.5 h-3.5 mr-1" />
                                    Edit
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Pending Invitations */}
                        {agency.pendingInvitations.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              Pending Invitations
                            </h4>
                            <div className="space-y-2">
                              {agency.pendingInvitations.map((invitation) => (
                                <div
                                  key={invitation.id}
                                  className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                                >
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {invitation.email}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Sent: {new Date(invitation.created_at).toLocaleDateString()}
                                      {invitation.expires_at && (
                                        <> • Expires: {new Date(invitation.expires_at).toLocaleDateString()}</>
                                      )}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-orange-600">
                                    Awaiting Setup
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Agency Details */}
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                          <div>
                            <span className="text-xs text-gray-500">Agency ID</span>
                            <p className="text-sm font-mono text-gray-700">{agency.id}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Created</span>
                            <p className="text-sm text-gray-700">
                              {new Date(agency.created_date).toLocaleDateString()}
                            </p>
                          </div>
                          {agency.billing_email && (
                            <div>
                              <span className="text-xs text-gray-500">Billing Email</span>
                              <p className="text-sm text-gray-700">{agency.billing_email}</p>
                            </div>
                          )}
                          {agency.payment_terms_days && (
                            <div>
                              <span className="text-xs text-gray-500">Payment Terms</span>
                              <p className="text-sm text-gray-700">
                                {agency.payment_terms_days} days
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Admin Dialog */}
      <Dialog open={isEditAdminOpen} onOpenChange={setIsEditAdminOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Administrator Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address (Read-only)</Label>
              <Input value={editingAdmin?.email || ""} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editAdminName}
                onChange={(e) => setEditAdminName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number (WhatsApp)</Label>
              <Input
                id="edit-phone"
                value={editAdminPhone}
                onChange={(e) => setEditAdminPhone(e.target.value)}
                placeholder="+447700900123"
              />
              <p className="text-[10px] text-muted-foreground">
                Enter number in E.164 format (e.g., +447700900123) for WhatsApp notifications.
              </p>
            </div>
            <div className="pt-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditAdminOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                onClick={handleUpdateAdmin}
                disabled={updateAdminMutation.isPending}
              >
                {updateAdminMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Update Profile"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
