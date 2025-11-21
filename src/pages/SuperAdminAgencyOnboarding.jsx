import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { agencyService } from "@/api/agencyService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Mail, RefreshCw, Shield, UserPlus } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_FORM = {
  agencyName: "",
  contactEmail: "",
  contactPhone: "",
  vatNumber: "",
  registrationNumber: "",
  billingEmail: "",
  paymentTermsDays: 30,
  invoiceFrequency: "weekly",
  adminName: "",
  adminEmail: "",
  accountName: "",
  bankName: "",
  accountNumber: "",
  sortCode: "",
  iban: "",
  swift: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  postcode: "",
  country: "United Kingdom",
  notes: "",
};

function buildAddressPayload(form) {
  return {
    line1: form.addressLine1 || null,
    line2: form.addressLine2 || null,
    city: form.city || null,
    postcode: form.postcode || null,
    country: form.country || null,
  };
}

function buildBankPayload(form) {
  return {
    account_name: form.accountName || null,
    bank_name: form.bankName || null,
    account_number: form.accountNumber || null,
    sort_code: form.sortCode || null,
    iban: form.iban || null,
    swift_bic: form.swift || null,
  };
}

export default function SuperAdminAgencyOnboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => ({ ...DEFAULT_FORM }));

  const isSuperAdmin = useMemo(
    () => !!user && (user.email === "g.basera@yahoo.com" || user.user_type === "super_admin"),
    [user]
  );

  const { data: agencies = [], isLoading: agenciesLoading } = useQuery({
    queryKey: ["super-admin-agencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .order("created_date", { ascending: false });

      if (error) {
        console.error("❌ Error fetching agencies:", error);
        return [];
      }

      return data || [];
    },
    enabled: isSuperAdmin,
    initialData: [],
  });

  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ["agency-admin-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_admin_invitations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("❌ Error fetching agency admin invitations:", error);
        return [];
      }

      return data || [];
    },
    enabled: isSuperAdmin,
    initialData: [],
  });

  const createAgencyMutation = useMutation({
    mutationFn: async (payload) => {
      return agencyService.createAgencyWithAdmin(payload);
    },
    onSuccess: (result) => {
      toast.success("Agency created and invitation queued.");
      queryClient.invalidateQueries({ queryKey: ["super-admin-agencies"] });
      queryClient.invalidateQueries({ queryKey: ["agency-admin-invitations"] });
      setForm({ ...DEFAULT_FORM });
      if (result?.invite_token) {
        console.info("Invitation token generated:", result.invite_token);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create agency");
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (invitationId) => {
      return agencyService.resendInvitation(invitationId);
    },
    onSuccess: () => {
      toast.success("Invitation email refreshed.");
      queryClient.invalidateQueries({ queryKey: ["agency-admin-invitations"] });
    },
    onError: (error) => {
      toast.error(error.message || "Unable to resend invite");
    },
  });

  const handleChange = (field) => (event) => {
    const value = event?.target?.value ?? event;
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // ✅ ENHANCED VALIDATION: Check all critical fields
    const errors = [];

    if (!form.agencyName) errors.push("Agency name");
    if (!form.contactEmail) errors.push("Contact email");
    if (!form.contactPhone) errors.push("Contact phone number");
    if (!form.adminEmail) errors.push("Admin email");

    if (errors.length > 0) {
      toast.error(
        <div>
          <p className="font-bold">❌ Missing Required Fields</p>
          <p className="text-sm mt-1">Please provide: {errors.join(", ")}</p>
          <p className="text-xs mt-2 text-red-200">
            Contact email and phone are critical for staff notifications!
          </p>
        </div>,
        { duration: 6000 }
      );
      return;
    }

    // ✅ EMAIL VALIDATION
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.contactEmail)) {
      toast.error("Contact email is invalid");
      return;
    }
    if (!emailRegex.test(form.adminEmail)) {
      toast.error("Admin email is invalid");
      return;
    }

    // ✅ PHONE VALIDATION (UK format)
    const phoneRegex = /^(\+44|0)[0-9\s]{9,13}$/;
    if (!phoneRegex.test(form.contactPhone.replace(/\s/g, ''))) {
      toast.error(
        <div>
          <p className="font-bold">❌ Invalid Phone Number</p>
          <p className="text-sm mt-1">Please use UK format: +44 20 1234 5678 or 020 1234 5678</p>
        </div>,
        { duration: 5000 }
      );
      return;
    }

    createAgencyMutation.mutate({
      agencyName: form.agencyName,
      contactEmail: form.contactEmail,
      contactPhone: form.contactPhone,
      vatNumber: form.vatNumber,
      registrationNumber: form.registrationNumber,
      address: buildAddressPayload(form),
      bankDetails: buildBankPayload(form),
      billingEmail: form.billingEmail,
      paymentTermsDays: Number(form.paymentTermsDays) || 30,
      invoiceFrequency: form.invoiceFrequency || "weekly",
      adminEmail: form.adminEmail,
      adminFullName: form.adminName,
    });
  };

  if (loading || agenciesLoading || invitationsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading agency onboarding...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="max-w-xl mx-auto mt-16">
        <Alert variant="destructive">
          <Shield className="h-5 w-5" />
          <AlertDescription>
            Only platform super admins can access the agency onboarding controls.
          </AlertDescription>
        </Alert>
        <Button className="mt-6" onClick={() => navigate("/")}>
          Return to dashboard
        </Button>
      </div>
    );
  }

  const pendingInvitations = invitations.filter((invite) => invite.status === "pending");

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agency Onboarding Control Center</h1>
          <p className="text-gray-600 mt-1">
            Provision new agencies, configure billing, and invite their administrators in one flow.
          </p>
        </div>
        <Badge className="bg-purple-600 text-white">Super Admin</Badge>
      </div>

      <Card className="border-2 border-cyan-200 shadow-sm">
        <CardHeader className="bg-cyan-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-600" />
            New Agency Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Agency Profile</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="agency-name">Agency Name *</Label>
                  <Input
                    id="agency-name"
                    value={form.agencyName}
                    onChange={handleChange("agencyName")}
                  />
                </div>
                <div>
                  <Label htmlFor="contact-email">Contact Email *</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={form.contactEmail}
                    onChange={handleChange("contactEmail")}
                  />
                </div>
                <div>
                  <Label htmlFor="contact-phone">Contact Phone *</Label>
                  <Input
                    id="contact-phone"
                    value={form.contactPhone}
                    onChange={handleChange("contactPhone")}
                    placeholder="+44 20 1234 5678"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required for staff notifications (shift confirmations, reminders)
                  </p>
                </div>
                <div>
                  <Label htmlFor="billing-email">Billing Email</Label>
                  <Input
                    id="billing-email"
                    type="email"
                    value={form.billingEmail}
                    onChange={handleChange("billingEmail")}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Defaults invoices & payment reminders to this address.
                  </p>
                </div>
                <div>
                  <Label htmlFor="vat-number">VAT Number</Label>
                  <Input
                    id="vat-number"
                    value={form.vatNumber}
                    onChange={handleChange("vatNumber")}
                  />
                </div>
                <div>
                  <Label htmlFor="company-number">Company Registration Number</Label>
                  <Input
                    id="company-number"
                    value={form.registrationNumber}
                    onChange={handleChange("registrationNumber")}
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Registered Address</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label htmlFor="address-line1">Address Line 1</Label>
                  <Input
                    id="address-line1"
                    value={form.addressLine1}
                    onChange={handleChange("addressLine1")}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address-line2">Address Line 2</Label>
                  <Input
                    id="address-line2"
                    value={form.addressLine2}
                    onChange={handleChange("addressLine2")}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={handleChange("city")} />
                </div>
                <div>
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    value={form.postcode}
                    onChange={handleChange("postcode")}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={form.country}
                    onChange={handleChange("country")}
                  />
                </div>
                <div>
                  <Label htmlFor="special-notes">Special Notes</Label>
                  <Textarea
                    id="special-notes"
                    value={form.notes || ""}
                    onChange={handleChange("notes")}
                    placeholder="Optional onboarding notes (internal use)"
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Bank & Billing Configuration</h2>
              <Alert className="mb-4 border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  These details appear on every invoice and payment instruction. Ensure accuracy before
                  sending invites.
                </AlertDescription>
              </Alert>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="account-holder">Account Holder</Label>
                  <Input
                    id="account-holder"
                    value={form.accountName}
                    onChange={handleChange("accountName")}
                  />
                </div>
                <div>
                  <Label htmlFor="bank-name">Bank Name</Label>
                  <Input
                    id="bank-name"
                    value={form.bankName}
                    onChange={handleChange("bankName")}
                  />
                </div>
                <div>
                  <Label htmlFor="account-number">Account Number</Label>
                  <Input
                    id="account-number"
                    value={form.accountNumber}
                    onChange={handleChange("accountNumber")}
                  />
                </div>
                <div>
                  <Label htmlFor="sort-code">Sort Code</Label>
                  <Input
                    id="sort-code"
                    value={form.sortCode}
                    onChange={handleChange("sortCode")}
                  />
                </div>
                <div>
                  <Label htmlFor="iban">IBAN (optional)</Label>
                  <Input id="iban" value={form.iban} onChange={handleChange("iban")} />
                </div>
                <div>
                  <Label htmlFor="swift">SWIFT/BIC (optional)</Label>
                  <Input id="swift" value={form.swift} onChange={handleChange("swift")} />
                </div>
                <div>
                  <Label htmlFor="payment-terms">Payment Terms (days)</Label>
                  <Input
                    id="payment-terms"
                    type="number"
                    min={7}
                    value={form.paymentTermsDays}
                    onChange={handleChange("paymentTermsDays")}
                  />
                </div>
                <div>
                  <Label htmlFor="invoice-frequency">Invoice Frequency</Label>
                  <Input
                    id="invoice-frequency"
                    value={form.invoiceFrequency}
                    onChange={handleChange("invoiceFrequency")}
                    placeholder="weekly, biweekly, monthly..."
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Agency Admin Invitation</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="admin-name">Admin Full Name</Label>
                  <Input
                    id="admin-name"
                    value={form.adminName}
                    onChange={handleChange("adminName")}
                  />
                </div>
                <div>
                  <Label htmlFor="admin-email">Admin Email *</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={form.adminEmail}
                    onChange={handleChange("adminEmail")}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                The invite email will ask them to choose a password and complete profile onboarding. Until
                acceptance, the invitation remains pending.
              </p>
            </section>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm({ ...DEFAULT_FORM })}
                disabled={createAgencyMutation.isPending}
              >
                Clear Form
              </Button>
              <Button type="submit" disabled={createAgencyMutation.isPending}>
                {createAgencyMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Agency & Invite Admin
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Recent Agencies</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {agencies.length === 0 ? (
            <p className="text-sm text-gray-500">No agencies available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Agency
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Billing Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Payment Terms
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agencies.map((agency) => (
                    <tr key={agency.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{agency.name}</div>
                        <div className="text-xs text-gray-500">{agency.status}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div>{agency.email}</div>
                        {agency.phone && <div className="text-xs text-gray-400">{agency.phone}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{agency.billing_email || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {agency.payment_terms_days || 30} days
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            Pending Invitations
            <Badge variant="secondary" className="ml-2">
              {pendingInvitations.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {pendingInvitations.length === 0 ? (
            <p className="text-sm text-gray-500">No outstanding invitations – great job!</p>
          ) : (
            pendingInvitations.map((invite) => {
              const agency = agencies.find((a) => a.id === invite.agency_id);
              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{invite.email}</p>
                    {invite.admin_name && (
                      <p className="text-sm text-gray-600">{invite.admin_name}</p>
                    )}
                    <p className="text-sm text-gray-600">
                      {agency?.name || "Agency"} • Expires{" "}
                      {invite.expires_at
                        ? new Date(invite.expires_at).toLocaleDateString()
                        : "in 7 days"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    disabled={resendInviteMutation.isPending}
                    onClick={() => resendInviteMutation.mutate(invite.id)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend Invite
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

