import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Mail, User, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

/**
 * 🏥 CLIENT INVITATION MODAL
 * 
 * Allows admins to invite care home managers to access the client portal.
 * Similar to staff invitations, creates client record + sends professional email.
 * 
 * Flow:
 * 1. Admin enters care home name, manager name, email
 * 2. System creates Client record with status='pending_approval'
 * 3. Sends branded email with login link
 * 4. Manager signs up → auto-linked via email matching
 * 5. Manager can approve timesheets, request shifts, view invoices
 */

export default function InviteClientModal({ open, onClose, currentAgency }) {
  const [formData, setFormData] = useState({
    name: '',
    contact_person_name: '',
    contact_person_email: '',
    contact_person_role: 'Manager',
    type: 'care_home'
  });

  const queryClient = useQueryClient();

  const { data: agency } = useQuery({
    queryKey: ['agency', currentAgency],
    queryFn: async () => {
      if (!currentAgency) return null;
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', currentAgency)
        .single();

      if (error) {
        console.error('❌ Error fetching agency for invite:', error);
        return null;
      }

      return data;
    },
    enabled: !!currentAgency
  });

  const inviteClientMutation = useMutation({
    mutationFn: async (data) => {
      // Step 1: Create Client record
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          agency_id: currentAgency,
          name: data.name,
          type: data.type,
          contact_person: {
            name: data.contact_person_name,
            email: data.contact_person_email,
            role: data.contact_person_role
          },
          billing_email: data.contact_person_email,
          status: 'pending_approval',
          payment_terms: 'net_30',
          contract_terms: {
            require_location_specification: false,
            break_duration_minutes: 0,
            rates_by_role: {
              nurse: { pay_rate: 0, charge_rate: 0 },
              care_worker: { pay_rate: 0, charge_rate: 0 },
              hca: { pay_rate: 0, charge_rate: 0 },
              senior_care_worker: { pay_rate: 0, charge_rate: 0 }
            }
          }
        })
        .select()
        .single();

      if (clientError) {
        throw clientError;
      }

      // Step 2: Generate professional invitation email
      const APP_URL = window.location.origin;
      const setupUrl = `${APP_URL}/ProfileSetup?logout=true`;

      const agencyName = agency?.name || 'Your Healthcare Staffing Partner';
      const agencyLogo = agency?.logo_url || '';

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); padding: 40px 20px; border-radius: 12px;">
          ${agencyLogo ? `
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${agencyLogo}" alt="${agencyName}" style="height: 60px; width: auto; border-radius: 8px; background: white; padding: 10px;" />
            </div>
          ` : ''}
          
          <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #06b6d4, #0284c7); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 40px;">🏥</span>
              </div>
              <h1 style="color: #1e293b; margin: 0; font-size: 28px;">Welcome to ${agencyName}</h1>
              <p style="color: #64748b; margin: 10px 0 0 0; font-size: 16px;">Client Portal Access</p>
            </div>

            <div style="background: #f8fafc; border-left: 4px solid #06b6d4; padding: 20px; margin: 30px 0; border-radius: 8px;">
              <p style="margin: 0; color: #1e293b; font-size: 16px;">
                <strong>Hi ${data.contact_person_name},</strong>
              </p>
              <p style="margin: 15px 0 0 0; color: #475569; font-size: 15px; line-height: 1.6;">
                You've been invited to access the <strong>${data.name}</strong> client portal. 
                This gives you instant access to:
              </p>
            </div>

            <div style="margin: 30px 0;">
              <div style="display: flex; align-items: start; margin-bottom: 15px;">
                <div style="background: #e0f2fe; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0;">
                  <span style="font-size: 16px;">✅</span>
                </div>
                <div>
                  <strong style="color: #1e293b; display: block; margin-bottom: 4px;">Approve Timesheets</strong>
                  <span style="color: #64748b; font-size: 14px;">Review and approve hours worked by staff</span>
                </div>
              </div>

              <div style="display: flex; align-items: start; margin-bottom: 15px;">
                <div style="background: #dbeafe; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0;">
                  <span style="font-size: 16px;">📅</span>
                </div>
                <div>
                  <strong style="color: #1e293b; display: block; margin-bottom: 4px;">Request Shifts</strong>
                  <span style="color: #64748b; font-size: 14px;">Book healthcare staff in seconds</span>
                </div>
              </div>

              <div style="display: flex; align-items: start; margin-bottom: 15px;">
                <div style="background: #e0e7ff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0;">
                  <span style="font-size: 16px;">💰</span>
                </div>
                <div>
                  <strong style="color: #1e293b; display: block; margin-bottom: 4px;">View Invoices</strong>
                  <span style="color: #64748b; font-size: 14px;">Download and pay invoices online</span>
                </div>
              </div>

              <div style="display: flex; align-items: start;">
                <div style="background: #f3e8ff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0;">
                  <span style="font-size: 16px;">📊</span>
                </div>
                <div>
                  <strong style="color: #1e293b; display: block; margin-bottom: 4px;">Real-time Reports</strong>
                  <span style="color: #64748b; font-size: 14px;">Track usage, costs, and service quality</span>
                </div>
              </div>
            </div>

            <div style="text-align: center; margin: 40px 0;">
              <a href="${setupUrl}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);">
                Get Started Now
              </a>
            </div>

            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin: 30px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                <strong>💡 Important:</strong> If you're on a shared computer, 
                the link will automatically log you out first. Use your email 
                <strong style="color: #92400e;">${data.contact_person_email}</strong> to create your account.
              </p>
            </div>

            <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">
                Need help? Contact us at:
              </p>
              <p style="color: #0284c7; font-size: 14px; margin: 0; font-weight: 600;">
                ${agency?.contact_email || 'support@agilecaregroup.com'}
              </p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <p style="color: white; font-size: 12px; opacity: 0.8; margin: 0;">
              © ${new Date().getFullYear()} ${agencyName}. All rights reserved.
            </p>
          </div>
        </div>
      `;

      // Step 3: Send invitation email
      await supabase.functions.invoke('send-email', {
        body: {
          to: data.contact_person_email,
          from_name: agencyName,
          subject: `Welcome to ${agencyName} Client Portal 🏥`,
          html: emailHtml
        }
      });

      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(
        <div>
          <p className="font-bold">✅ Client Invited!</p>
          <p className="text-sm">Invitation email sent to {formData.contact_person_email}</p>
        </div>,
        { duration: 5000 }
      );
      setFormData({
        name: '',
        contact_person_name: '',
        contact_person_email: '',
        contact_person_role: 'Manager',
        type: 'care_home'
      });
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to invite client: ${error.message}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.contact_person_name || !formData.contact_person_email) {
      toast.error('Please fill in all required fields');
      return;
    }

    inviteClientMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="w-6 h-6 text-blue-600" />
            Invite Care Home / Client
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            <Alert className="border-blue-300 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                <strong>How it works:</strong> Enter the care home details below. 
                The manager will receive an invitation email with a secure link to create their account and access the client portal.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="name" className="text-sm font-semibold">
                Care Home / Facility Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., Lindisfarne Shotton Care Home"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="type" className="text-sm font-semibold">
                Facility Type
              </Label>
              <select
                id="type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="care_home">Care Home</option>
                <option value="nursing_home">Nursing Home</option>
                <option value="hospital">Hospital</option>
                <option value="residential_care">Residential Care</option>
                <option value="supported_living">Supported Living</option>
                <option value="home_care">Home Care</option>
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_name" className="text-sm font-semibold">
                  Manager Name *
                </Label>
                <Input
                  id="contact_name"
                  placeholder="e.g., Sarah Johnson"
                  value={formData.contact_person_name}
                  onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="contact_role" className="text-sm font-semibold">
                  Role / Title
                </Label>
                <Input
                  id="contact_role"
                  placeholder="e.g., Care Home Manager"
                  value={formData.contact_person_role}
                  onChange={(e) => setFormData({ ...formData, contact_person_role: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="contact_email" className="text-sm font-semibold">
                Manager Email *
              </Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="e.g., manager@carehome.co.uk"
                value={formData.contact_person_email}
                onChange={(e) => setFormData({ ...formData, contact_person_email: e.target.value })}
                required
                className="mt-1"
              />
              <p className="text-xs text-gray-600 mt-1">
                💡 This email will be used to create their client portal account
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900">
                <strong>✅ After sending:</strong> The manager will receive a professional invitation email 
                with instructions to create their account. They'll be able to approve timesheets, 
                request shifts, and manage invoices immediately.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={inviteClientMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={inviteClientMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              {inviteClientMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Invitation...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}