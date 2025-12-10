import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
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
    ChevronDown,
    ChevronRight,
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

export default function ClientManagement() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [expandedClients, setExpandedClients] = useState(new Set());
    const [selectedClientForContact, setSelectedClientForContact] = useState("");
    const [newContactEmail, setNewContactEmail] = useState("");
    const [newContactName, setNewContactName] = useState("");
    const [newContactRole, setNewContactRole] = useState("OPERATIONS_MANAGER");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const isAdmin = useMemo(
        () => !!user && (user.user_type === "agency_admin" || user.user_type === "super_admin"),
        [user]
    );

    // Fetch all clients for this agency
    const { data: clients = [], isLoading: clientsLoading } = useQuery({
        queryKey: ["agency-clients", user?.agency_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("clients")
                .select("*")
                .eq("agency_id", user.agency_id)
                .order("name");

            if (error) {
                console.error("Error fetching clients:", error);
                throw error;
            }

            return data || [];
        },
        enabled: isAdmin && !!user?.agency_id,
    });

    // Fetch all client contacts for this agency's clients
    const { data: clientContacts = [], isLoading: contactsLoading } = useQuery({
        queryKey: ["client-contacts", user?.agency_id],
        queryFn: async () => {
            if (!user?.agency_id) return [];

            const { data, error } = await supabase
                .from("client_contacts")
                .select(`
          *,
          client:clients!inner(id, name, agency_id)
        `)
                .eq("client.agency_id", user.agency_id);

            if (error) {
                console.error("Error fetching client contacts:", error);
                throw error;
            }

            return data || [];
        },
        enabled: isAdmin && !!user?.agency_id,
    });

    // Fetch all pending invitations
    const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
        queryKey: ["client-contact-invitations", user?.agency_id],
        queryFn: async () => {
            if (!user?.agency_id) return [];

            const { data, error } = await supabase
                .from("client_contact_invitations")
                .select(`
          *,
          client:clients!inner(id, name, agency_id)
        `)
                .eq("client.agency_id", user.agency_id)
                .eq("status", "pending");

            if (error) {
                console.error("Error fetching invitations:", error);
                throw error;
            }

            return data || [];
        },
        enabled: isAdmin && !!user?.agency_id,
    });

    // Add contact mutation
    const addContactMutation = useMutation({
        mutationFn: async ({ clientId, contactEmail, contactName, contactRole }) => {
            // 1. Create the invitation record
            const { data: invitation, error: inviteError } = await supabase
                .from("client_contact_invitations")
                .insert({
                    client_id: clientId,
                    email: contactEmail,
                    status: "pending",
                    contact_name: contactName,
                    role: contactRole,
                })
                .select()
                .single();

            if (inviteError) {
                console.error("DB Insert Error:", inviteError);
                throw new Error("Failed to create invitation record: " + inviteError.message);
            }

            // 2. Create the client_contacts record (with profile_id = NULL for now)
            const nameParts = contactName.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || '';

            const { error: contactError } = await supabase
                .from("client_contacts")
                .insert({
                    client_id: clientId,
                    first_name: firstName,
                    last_name: lastName,
                    email: contactEmail,
                    role: contactRole,
                    is_primary_contact: false, // Not primary since client already exists
                });

            if (contactError) {
                console.error("Error creating client contact:", contactError);
                throw new Error("Failed to create contact record: " + contactError.message);
            }

            // 3. Fetch client details for the email
            const { data: client } = await supabase
                .from("clients")
                .select("name, agency_id, agencies(name)")
                .eq("id", clientId)
                .single();

            const clientName = client?.name || "Care Home";
            const agencyName = client?.agencies?.name || "Your Agency";

            const setupUrl = `${window.location.origin}/login?view=sign-up&email=${encodeURIComponent(contactEmail)}`;

            // 4. Send email invitation
            const { error: emailError } = await supabase.functions.invoke("send-email", {
                body: {
                    to: contactEmail,
                    subject: `Invitation to manage ${clientName}`,
                    from_name: agencyName,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Welcome to ${agencyName}</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <p style="font-size: 16px; color: #1f2937;">Hi ${contactName},</p>
                <p style="font-size: 16px; color: #1f2937;">
                  You've been invited to manage <strong>${clientName}</strong> on ACG StaffLink.
                </p>

                <div style="background: white; border-left: 4px solid #06b6d4; padding: 20px; margin: 20px 0;">
                  <p style="margin: 10px 0;"><strong>Role:</strong> ${contactRole}</p>
                  <p style="margin: 10px 0;"><strong>Your Email:</strong> ${contactEmail}</p>
                  <p style="margin: 10px 0;"><strong>Next Steps:</strong></p>
                  <ol style="margin: 10px 0; padding-left: 20px;">
                    <li>Create your account using the email above</li>
                    <li>Access your client portal</li>
                    <li>Approve timesheets, request shifts, and view invoices</li>
                  </ol>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${setupUrl}" style="background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                    Create Your Account
                  </a>
                </div>

                <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #0c4a6e; font-size: 14px; font-weight: 600;">📝 How to Sign Up:</p>
                  <p style="margin: 10px 0 0 0; color: #0c4a6e; font-size: 13px; line-height: 1.6;">
                    1️⃣ Click "Create Your Account" above<br>
                    2️⃣ Enter your email: <strong>${contactEmail}</strong><br>
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
            queryClient.invalidateQueries(["client-contacts"]);
            queryClient.invalidateQueries(["client-contact-invitations"]);
            setIsDialogOpen(false);
            setNewContactEmail("");
            setNewContactName("");
            setNewContactRole("OPERATIONS_MANAGER");
            toast.success("Invitation Sent", {
                description: `An invitation has been sent to ${newContactEmail}.`,
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

    const toggleClient = (clientId) => {
        const newSet = new Set(expandedClients);
        if (newSet.has(clientId)) {
            newSet.delete(clientId);
        } else {
            newSet.add(clientId);
        }
        setExpandedClients(newSet);
    };

    const handleAddContact = () => {
        if (!selectedClientForContact || !newContactEmail) {
            toast.error("Please select a client and enter an email");
            return;
        }

        addContactMutation.mutate({
            clientId: selectedClientForContact,
            contactEmail: newContactEmail,
            contactName: newContactName,
            contactRole: newContactRole,
        });
    };

    if (loading || clientsLoading || contactsLoading || invitationsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading client management...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="max-w-xl mx-auto mt-16">
                <Alert variant="destructive">
                    <Shield className="h-5 w-5" />
                    <AlertDescription>
                        Only agency administrators can access client management.
                    </AlertDescription>
                </Alert>
                <Button className="mt-6" onClick={() => navigate("/")}>
                    Return to dashboard
                </Button>
            </div>
        );
    }

    // Group contacts and invitations by client
    const clientsWithContacts = clients.map((client) => {
        const contacts = clientContacts.filter((contact) => contact.client_id === client.id);
        const pending = invitations.filter(
            (inv) => inv.client_id === client.id && inv.status === "pending"
        );
        return { ...client, contacts, pendingInvitations: pending };
    });

    const clientsWithoutContacts = clientsWithContacts.filter((c) => c.contacts.length === 0);
    const clientsWithContactsCount = clientsWithContacts.filter((c) => c.contacts.length > 0).length;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-24">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
                    <p className="text-gray-600 mt-1">
                        View and manage all clients and their contacts
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Add Contact to Client
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Contact to Existing Client</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                    <Label htmlFor="client-select">Select Client *</Label>
                                    <Select value={selectedClientForContact} onValueChange={setSelectedClientForContact}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a client..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients.map((client) => (
                                                <SelectItem key={client.id} value={client.id}>
                                                    {client.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="contact-email">Contact Email *</Label>
                                    <Input
                                        id="contact-email"
                                        type="email"
                                        value={newContactEmail}
                                        onChange={(e) => setNewContactEmail(e.target.value)}
                                        placeholder="manager@carehome.com"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="contact-name">Contact Full Name</Label>
                                    <Input
                                        id="contact-name"
                                        value={newContactName}
                                        onChange={(e) => setNewContactName(e.target.value)}
                                        placeholder="Sarah Johnson"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="contact-role">Role *</Label>
                                    <Select value={newContactRole} onValueChange={setNewContactRole}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="OPERATIONS_MANAGER">Operations Manager</SelectItem>
                                            <SelectItem value="FINANCE_MANAGER">Finance Manager</SelectItem>
                                            <SelectItem value="FACILITY_COORDINATOR">Facility Coordinator</SelectItem>
                                            <SelectItem value="VIEW_ONLY_CONTACT">View Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        This determines what the user can do in the client portal
                                    </p>
                                </div>
                                <Button
                                    onClick={handleAddContact}
                                    disabled={addContactMutation.isPending}
                                    className="w-full"
                                >
                                    {addContactMutation.isPending ? (
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
                        <CardTitle className="text-sm font-medium text-gray-600">Total Clients</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{clients.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Clients with Contacts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{clientsWithContactsCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Missing Contacts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">
                            {clientsWithoutContacts.length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Total Contacts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{clientContacts.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Clients without contacts warning */}
            {clientsWithoutContacts.length > 0 && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <AlertDescription>
                        <strong>{clientsWithoutContacts.length} clients have no contacts:</strong>{" "}
                        {clientsWithoutContacts.map((c) => c.name).join(", ")}
                    </AlertDescription>
                </Alert>
            )}

            {/* Clients List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        All Clients ({clients.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {clientsWithContacts.map((client) => {
                            const isExpanded = expandedClients.has(client.id);
                            const hasNoContacts = client.contacts.length === 0;

                            return (
                                <Collapsible
                                    key={client.id}
                                    open={isExpanded}
                                    onOpenChange={() => toggleClient(client.id)}
                                >
                                    <div
                                        className={`p-4 hover:bg-gray-50 ${hasNoContacts ? "bg-red-50 border-l-4 border-red-500" : ""
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
                                                        <div className="font-semibold text-gray-900">{client.name}</div>
                                                        <div className="text-sm text-gray-500">
                                                            {client.contact_person?.email || client.billing_email || "No contact email"}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant={hasNoContacts ? "destructive" : "secondary"}>
                                                        {client.contacts.length} contact{client.contacts.length !== 1 ? "s" : ""}
                                                    </Badge>
                                                    {client.pendingInvitations.length > 0 && (
                                                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                                                            {client.pendingInvitations.length} pending
                                                        </Badge>
                                                    )}
                                                    <Badge
                                                        variant={client.status === "active" ? "default" : "secondary"}
                                                        className={
                                                            client.status === "active"
                                                                ? "bg-green-100 text-green-800"
                                                                : ""
                                                        }
                                                    >
                                                        {client.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                            <div className="mt-4 ml-8 space-y-4">
                                                {/* Contacts List */}
                                                {client.contacts.length > 0 && (
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                            <Users className="w-4 h-4" />
                                                            Contacts
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {client.contacts.map((contact) => (
                                                                <div
                                                                    key={contact.id}
                                                                    className="flex items-center justify-between p-3 bg-white border rounded-lg"
                                                                >
                                                                    <div>
                                                                        <div className="font-medium text-gray-900">{contact.email}</div>
                                                                        <div className="text-sm text-gray-500">
                                                                            {contact.first_name} {contact.last_name} - {contact.role}
                                                                        </div>
                                                                        {contact.is_primary_contact && (
                                                                            <Badge className="mt-1 bg-blue-100 text-blue-800">Primary</Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Pending Invitations */}
                                                {client.pendingInvitations.length > 0 && (
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                            <Mail className="w-4 h-4" />
                                                            Pending Invitations
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {client.pendingInvitations.map((invitation) => (
                                                                <div
                                                                    key={invitation.id}
                                                                    className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                                                                >
                                                                    <div>
                                                                        <div className="font-medium text-gray-900">
                                                                            {invitation.email}
                                                                        </div>
                                                                        <div className="text-sm text-gray-500">
                                                                            {invitation.contact_name} - {invitation.role}
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
                                            </div>
                                        </CollapsibleContent>
                                    </div>
                                </Collapsible>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
