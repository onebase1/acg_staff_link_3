
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plus, Search, Filter, User, Mail, Phone, Star,
  Edit, Trash2, CheckCircle, XCircle, FileText, UserPlus, Shield, AlertTriangle, Upload, Download, MessageCircle, RefreshCw
} from "lucide-react";
import StaffForm from "../components/staff/StaffForm";
import InviteStaffModal from "../components/staff/InviteStaffModal";
import NotificationService from "../components/notifications/NotificationService";
import { toast } from "sonner";

export default function Staff() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentAgency, setCurrentAgency] = useState(null);

  const queryClient = useQueryClient();

  // ✅ FIXED: RBAC Check using direct Supabase
  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Get authenticated user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          console.error('❌ Not authenticated:', authError);
          navigate(createPageUrl('Home'));
          return;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError) {
          console.error('❌ Error fetching profile:', profileError);
          toast.error('Failed to load profile');
          navigate(createPageUrl('Home'));
          return;
        }

        const currentUser = {
          id: profile.id,
          email: profile.email || authUser.email,
          user_type: profile.user_type,
          agency_id: profile.agency_id,
          client_id: profile.client_id,
          full_name: profile.full_name,
          phone: profile.phone,
        };
        
        setUser(currentUser);

        // Block staff members from accessing this page
        if (currentUser.user_type === 'staff_member') {
          toast.error('Access Denied: This page is for agency admins only');
          navigate(createPageUrl('StaffPortal'));
          return;
        }

        // Set current agency
        setCurrentAgency(currentUser.agency_id);
        console.log('Staff page - Agency:', currentUser.agency_id);

        setLoading(false);
      } catch (error) {
        console.error("Auth error:", error);
        toast.error('Authentication failed. Please log in again.');
        navigate(createPageUrl('Home'));
      }
    };
    checkAccess();
  }, [navigate]);

  // ✅ FIXED: Staff query using direct Supabase
  const { data: staff = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff', currentAgency],
    queryFn: async () => {
      console.log('📊 Querying staff for agency:', currentAgency);
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('agency_id', currentAgency)
        .order('created_date', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      
      console.log('✅ Loaded staff count:', data?.length || 0);
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: agency } = useQuery({
    queryKey: ['agency', currentAgency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', currentAgency)
        .single();
      
      if (error) {
        console.error('❌ Error fetching agency:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  // ✅ FIXED: Create mutation using direct Supabase
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from('staff')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staff']);
      toast.success('✅ Staff member created successfully');
      setShowForm(false);
      setEditingStaff(null);
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    }
  });

  // ✅ FIXED: Update mutation using direct Supabase
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data: updatedStaff, error } = await supabase
        .from('staff')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Send notification email about role change if role was changed
      // Assumes updates object contains first_name and email from the form
      if (updates.role) {
        try {
          await NotificationService.sendEmail({
            to: updates.email,
            subject: `Profile Updated - Role Changed to ${updates.role.replace('_', ' ')}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">Profile Updated</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                  <p>Hi ${updates.first_name},</p>
                  <p>Your profile has been updated by an administrator.</p>
                  
                  <div style="background: white; border-left: 4px solid #06b6d4; padding: 20px; margin: 20px 0;">
                    <p><strong>Role Changed:</strong> ${updates.role.replace('_', ' ')}</p>
                    ${updates.nmc_pin ? `<p><strong>NMC PIN:</strong> ${updates.nmc_pin}</p>` : ''}
                  </div>
                  
                  <p>If you have any questions, please contact your agency administrator.</p>
                </div>
              </div>
            `
          });
        } catch (emailError) {
          console.error('Failed to send role change notification:', emailError);
        }
      }
      
      return updatedStaff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staff']);
      toast.success('✅ Staff member updated successfully');
      // ✅ Close form after successful update
      setShowForm(false);
      setEditingStaff(null);
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    }
  });

  // ✅ FIXED: Soft delete mutation - sets status to 'inactive' instead of deleting
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // First check if staff has related records
      const [shiftsCheck, timesheetsCheck, bookingsCheck] = await Promise.all([
        supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('assigned_staff_id', id),
        supabase.from('timesheets').select('id', { count: 'exact', head: true }).eq('staff_id', id),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('staff_id', id)
      ]);

      const totalRelatedRecords = (shiftsCheck.count || 0) + (timesheetsCheck.count || 0) + (bookingsCheck.count || 0);

      if (totalRelatedRecords > 0) {
        // Soft delete: Set status to inactive
        const { error } = await supabase
          .from('staff')
          .update({ status: 'inactive' })
          .eq('id', id);

        if (error) throw error;

        return { softDelete: true, relatedRecords: totalRelatedRecords };
      } else {
        // Hard delete: No related records, safe to delete
        const { error } = await supabase
          .from('staff')
          .delete()
          .eq('id', id);

        if (error) throw error;

        return { softDelete: false };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['staff']);
      if (result.softDelete) {
        toast.success(`Staff member deactivated (${result.relatedRecords} related records preserved)`);
      } else {
        toast.success('Staff member deleted');
      }
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    }
  });

  const inviteStaffMutation = useMutation({
    mutationFn: async (inviteData) => {
      // Check if user already exists with this email
      const existingStaff = staff.find(s => s.email === inviteData.email);

      if (existingStaff) {
        throw new Error('Staff member with this email already exists in your agency');
      }

      // ✅ FIXED: Create staff record using direct Supabase
      const { data: newStaff, error: createError } = await supabase
        .from('staff')
        .insert({
          ...inviteData,
          agency_id: user?.agency_id,
          status: 'onboarding',
          employment_type: 'temporary'
        })
        .select()
        .single();
      
      if (createError) throw createError;

      // ✅ FIXED: Fetch agency name for email branding
      let agencyName = 'Your Agency';
      if (agency?.name) {
        agencyName = agency.name;
        console.log('✅ [Invitation] Agency name loaded:', agencyName);
      } else {
        console.warn('⚠️ [Invitation] Agency name not available');
      }

      // ✅ FIX: Point to signup page with email pre-filled
      const setupUrl = `${window.location.origin}${createPageUrl('Login')}?view=sign-up&email=${encodeURIComponent(inviteData.email)}`;

      // Send invitation email
      const emailResult = await NotificationService.sendEmail({
        to: inviteData.email,
        subject: `You're Invited to Join ${agencyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Welcome to ACG StaffLink</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p style="font-size: 16px; color: #1f2937;">Hi ${inviteData.first_name},</p>
              <p style="font-size: 16px; color: #1f2937;">
                You've been invited to join <strong>${agencyName}</strong> on ACG StaffLink - the UK's leading healthcare staffing platform.
              </p>

              <div style="background: white; border-left: 4px solid #06b6d4; padding: 20px; margin: 20px 0;">
                <p style="margin: 10px 0;"><strong>Role:</strong> ${inviteData.role.replace('_', ' ')}</p>
                <p style="margin: 10px 0;"><strong>Your Email:</strong> ${inviteData.email}</p>
                <p style="margin: 10px 0;"><strong>Next Steps:</strong></p>
                <ol style="margin: 10px 0; padding-left: 20px;">
                  <li>Create your account using the email above</li>
                  <li>Complete your profile</li>
                  <li>Upload compliance documents</li>
                  <li>Start accepting shifts</li>
                </ol>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${setupUrl}" style="background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                  Create Your Account
                </a>
              </div>

              <!-- ✅ Clear instructions for signup -->
              <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #0c4a6e; font-size: 14px; font-weight: 600;">📝 How to Sign Up:</p>
                <p style="margin: 10px 0 0 0; color: #0c4a6e; font-size: 13px; line-height: 1.6;">
                  1️⃣ Click "Create Your Account" above<br>
                  2️⃣ Enter your email: <strong>${inviteData.email}</strong><br>
                  3️⃣ Create a secure password<br>
                  4️⃣ We'll recognize your invitation automatically!
                </p>
              </div>

              <p style="font-size: 14px; color: #6b7280;">
                This invitation expires in 7 days. If you have any questions, please contact your agency manager.
              </p>
            </div>
            <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
              <p>© ${new Date().getFullYear()} ${agencyName}. All rights reserved.</p>
              <p style="margin-top: 5px;">Powered by ACG StaffLink</p>
            </div>
          </div>
        `
      });

      return { newStaff, emailResult };
    },
    onSuccess: ({ newStaff, emailResult }) => {
      queryClient.invalidateQueries(['staff']);
      setShowInviteModal(false);

      if (emailResult.success) {
        toast.success(`✅ Invitation sent to ${newStaff.first_name} ${newStaff.last_name}!`);
      } else {
        toast.warning(`⚠️ Staff added but email failed to send. Contact them manually.`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = async (data) => {
    console.log('📝 [Staff] handleSubmit called with data:', data);
    
    if (editingStaff) {
      console.log('✏️ [Staff] Updating existing staff:', editingStaff.id);
      await updateMutation.mutateAsync({ id: editingStaff.id, updates: data });
    } else {
      console.log('➕ [Staff] Creating new staff');
      await createMutation.mutateAsync(data);
    }
  };

  const handleInvite = async (inviteData) => {
    await inviteStaffMutation.mutateAsync(inviteData);
  };

  // ✅ NEW: Resend invitation mutation
  const resendInviteMutation = useMutation({
    mutationFn: async (staffMember) => {
      console.log('📧 [Resend Invite] Resending invitation to:', staffMember.email);

      // Send invitation email via Edge Function
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: staffMember.email,
          subject: `You're Invited to Join ${user?.agency_name || 'Our Agency'} on ACG StaffLink`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Welcome to ACG StaffLink</h1>
              </div>

              <div style="padding: 30px; background: #f9fafb;">
                <p style="font-size: 16px; color: #374151;">Hi ${staffMember.first_name},</p>

                <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                  You've been invited to join <strong>${user?.agency_name || 'our agency'}</strong> on ACG StaffLink - the UK's leading healthcare staffing platform.
                </p>

                <div style="background: white; border-left: 4px solid #06b6d4; padding: 20px; margin: 20px 0;">
                  <p style="margin: 10px 0;"><strong>Role:</strong> ${staffMember.role.replace('_', ' ')}</p>
                  <p style="margin: 10px 0;"><strong>Your Email:</strong> ${staffMember.email}</p>
                  <p style="margin: 10px 0;"><strong>Next Steps:</strong></p>
                  <ol style="margin: 10px 0; padding-left: 20px;">
                    <li>Create your account using the email above</li>
                    <li>Complete your profile</li>
                    <li>Upload compliance documents</li>
                    <li>Start accepting shifts</li>
                  </ol>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${window.location.origin}/login?view=sign-up&email=${encodeURIComponent(staffMember.email)}"
                     style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    Create Your Account
                  </a>
                </div>

                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                  This invitation expires in 7 days. If you have any questions, please contact your agency manager.
                </p>
              </div>

              <div style="background: #1f2937; padding: 20px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} ACG StaffLink. All rights reserved.
                </p>
              </div>
            </div>
          `
        }
      });

      if (emailError) {
        console.error('❌ [Resend Invite] Email error:', emailError);
        throw new Error('Failed to send invitation email');
      }

      return staffMember;
    },
    onSuccess: (staffMember) => {
      toast.success(
        <div>
          <p className="font-bold">✅ Invitation Resent!</p>
          <p className="text-sm">Email sent to {staffMember.email}</p>
        </div>,
        { duration: 5000 }
      );
    },
    onError: (error) => {
      console.error('❌ [Resend Invite] Error:', error);
      toast.error(`Failed to resend invitation: ${error.message}`);
    }
  });

  const handleResendInvite = (staffMember) => {
    resendInviteMutation.mutate(staffMember);
  };

  const handleEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    const confirmed = confirm(
      '⚠️ Delete Staff Member?\n\n' +
      'If this staff member has shifts, timesheets, or bookings, they will be DEACTIVATED instead of deleted.\n\n' +
      'Staff with no related records will be permanently deleted.\n\n' +
      'Continue?'
    );

    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const variants = {
      active: { variant: 'default', className: 'bg-green-100 text-green-800' },
      inactive: { variant: 'secondary', className: 'bg-gray-100 text-gray-800' },
      suspended: { variant: 'destructive', className: 'bg-red-100 text-red-800' },
      onboarding: { variant: 'secondary', className: 'bg-blue-100 text-blue-800' }
    };
    return variants[status] || variants.inactive;
  };

  // ✅ NEW: CSV Export Function
  const exportToCSV = () => {
    const csvData = filteredStaff.map(staffMember => ({
      'First Name': staffMember.first_name,
      'Last Name': staffMember.last_name,
      'Email': staffMember.email,
      'Phone': staffMember.phone,
      'Role': staffMember.role?.replace('_', ' '),
      'Status': staffMember.status,
      'Employment Type': staffMember.employment_type,
      'Hourly Rate (£)': staffMember.hourly_rate || 'N/A',
      'Rating': staffMember.rating || 'N/A',
      'Total Shifts': staffMember.total_shifts_completed || 0,
      'NMC PIN': staffMember.nmc_pin || 'N/A',
      'Medication Trained': staffMember.medication_trained ? 'Yes' : 'No',
      'Address': staffMember.address?.line1 || '',
      'City': staffMember.address?.city || '',
      'Postcode': staffMember.address?.postcode || '',
      'Emergency Contact Name': staffMember.emergency_contact?.name || '',
      'Emergency Contact Phone': staffMember.emergency_contact?.phone || '',
      'Date Joined': staffMember.date_joined ? new Date(staffMember.date_joined).toLocaleDateString() : ''
    }));

    if (csvData.length === 0) {
      toast.info('No staff data to export.');
      return;
    }

    const headers = Object.keys(csvData[0]); // Use keys from the first object as headers
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle values that might contain commas or double quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`; 
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `staff_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`✅ Exported ${csvData.length} staff records to CSV`);
  };

  const generatePIN = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleGeneratePIN = async (staffMember) => {
    const pin = generatePIN();
    
    try {
      // ✅ FIXED: Update using direct Supabase
      const { error } = await supabase
        .from('staff')
        .update({ whatsapp_pin: pin })
        .eq('id', staffMember.id);
      
      if (error) throw error;

      // Send PIN via email
      await NotificationService.sendEmail({
        to: staffMember.email,
        subject: `Your WhatsApp PIN - ${agency?.name || 'Your Agency'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">🔐 WhatsApp PIN</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p style="font-size: 16px; color: #1f2937;">Hi ${staffMember.first_name},</p>
              <p style="font-size: 16px; color: #1f2937;">
                Your WhatsApp PIN for linking your account is:
              </p>

              <div style="background: white; border: 2px solid #06b6d4; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="font-size: 36px; font-weight: bold; color: #06b6d4; margin: 0; letter-spacing: 8px;">
                  ${pin}
                </p>
              </div>

              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>📱 To link your WhatsApp:</strong><br>
                  1️⃣ Send "Hi" to our WhatsApp number<br>
                  2️⃣ When asked, reply with this PIN: <strong>${pin}</strong><br>
                  3️⃣ You're all set! 🎉
                </p>
              </div>

              <p style="font-size: 14px; color: #6b7280;">
                Keep this PIN safe. You'll only need it once to link your WhatsApp.
              </p>
            </div>
            <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
              <p>© ${new Date().getFullYear()} ${agency?.name || 'Your Agency'}. All rights reserved.</p>
              <p style="margin-top: 5px;">Powered by ACG StaffLink</p>
            </div>
          </div>
        `
      });

      queryClient.invalidateQueries(['staff']);
      toast.success(`✅ PIN generated and sent to ${staffMember.first_name}'s email!`);
    } catch (error) {
      toast.error(`Failed to generate PIN: ${error.message}`);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading staff management...</p>
        </div>
      </div>
    );
  }

  if (!user || user.user_type === 'staff_member') {
    return (
      <Card className="max-w-md mx-auto mt-20">
        <CardContent className="p-12 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">Staff management is only accessible to agency administrators.</p>
          <Button onClick={() => navigate(createPageUrl('StaffPortal'))}>
            Go to Staff Portal
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showForm) {
    return (
      <StaffForm
        staff={editingStaff}
        onSubmit={handleSubmit}
        onCancel={() => {
          setShowForm(false);
          setEditingStaff(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
          <p className="text-gray-600 mt-1">Manage your temporary healthcare staff • {staff.length} staff members</p>
          {currentAgency && (
            <Badge className="mt-2 bg-purple-100 text-purple-800">
              Viewing: Dominion Healthcare
            </Badge>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={filteredStaff.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowInviteModal(true)}
            className="gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Invite Staff
          </Button>
          <Link to={createPageUrl('BulkDataImport')}>
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Bulk Import
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
              >
                Active
              </Button>
              <Button
                variant={statusFilter === 'onboarding' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('onboarding')}
              >
                Onboarding
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Grid */}
      {isLoadingStaff ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map(staffMember => (
            <Card key={staffMember.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {staffMember.profile_photo_url ? (
                      <img
                        src={staffMember.profile_photo_url}
                        alt={`${staffMember.first_name} ${staffMember.last_name}`}
                        className="w-12 h-12 rounded-full object-cover border-2 border-green-400"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-red-100 border-2 border-red-400 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-red-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {staffMember.first_name} {staffMember.last_name}
                      </h3>
                      <Badge className="mt-1" {...getStatusBadge(staffMember.status)}>
                        {staffMember.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span className="capitalize">{staffMember.role?.replace('_', ' ') || 'No role'}</span>
                    {staffMember.medication_trained && (
                      <Badge className="bg-purple-100 text-purple-800 text-xs">Med Trained</Badge>
                    )}
                  </div>
                  {staffMember.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{staffMember.email}</span>
                    </div>
                  )}
                  {staffMember.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{staffMember.phone}</span>
                    </div>
                  )}
                  {staffMember.rating && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{staffMember.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {!staffMember.profile_photo_url && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-semibold">Photo Required</span>
                    </div>
                  )}
                </div>

                {/* ✅ WhatsApp PIN Status */}
                {staffMember.status === 'active' && (
                  <div className="mt-3 mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    {staffMember.whatsapp_number_verified ? (
                      <div className="flex items-center gap-2 text-sm text-purple-800">
                        <CheckCircle className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold">WhatsApp Linked</span>
                      </div>
                    ) : staffMember.whatsapp_pin ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-purple-800">
                          <AlertTriangle className="w-4 h-4 text-purple-600" />
                          <span className="font-semibold">PIN: {staffMember.whatsapp_pin}</span>
                        </div>
                        <p className="text-xs text-purple-600">Not linked yet</p>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-purple-600 border-purple-300 hover:bg-purple-50"
                        onClick={() => handleGeneratePIN(staffMember)}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Generate WhatsApp PIN
                      </Button>
                    )}
                  </div>
                )}

                {/* ✅ NEW: Resend Invitation button for onboarding staff without user_id */}
                {staffMember.status === 'onboarding' && !staffMember.user_id && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                      onClick={() => handleResendInvite(staffMember)}
                      disabled={resendInviteMutation.isPending}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${resendInviteMutation.isPending ? 'animate-spin' : ''}`} />
                      {resendInviteMutation.isPending ? 'Sending...' : 'Resend Invitation'}
                    </Button>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Link to={`${createPageUrl('StaffProfileSimulation')}?id=${staffMember.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      CQC Profile
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(staffMember)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(staffMember.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredStaff.length === 0 && !isLoadingStaff && (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Staff Found</h3>
            <p className="text-gray-600 mb-6">Get started by inviting or adding your first staff member</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setShowInviteModal(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Staff
              </Button>
              <Button variant="outline" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      <InviteStaffModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
      />
    </div>
  );
}
