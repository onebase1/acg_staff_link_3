import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDominionWelcomeEmail } from "@/utils/emailTemplates";
import Papa from 'papaparse';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plus, Search, Filter, User, Mail, Phone, Star,
  Edit, Trash2, CheckCircle, XCircle, FileText, UserPlus, Shield, AlertTriangle, Upload, Download, MessageCircle, RefreshCw, Archive,
  Zap, ZapOff, LayoutGrid, Table as TableIcon, ListFilter, Smartphone, MapPin
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [roleFilter, setRoleFilter] = useState('all');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('staffViewMode') || 'grid';
  }); // 'grid' | 'table'
  const [autoAssignFilter, setAutoAssignFilter] = useState('all'); // 'all' | 'enabled' | 'disabled'
  const [connectivityFilter, setConnectivityFilter] = useState('all'); // 'all' | 'whatsapp_missing' | 'gps_missing'
  const [complianceFilter, setComplianceFilter] = useState('all'); // 'all' | 'photo_missing' | 'docs_missing'
  const [currentAgency, setCurrentAgency] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const queryClient = useQueryClient();

  // ✅ Persist viewMode
  useEffect(() => {
    localStorage.setItem('staffViewMode', viewMode);
  }, [viewMode]);

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

        if (profileError || !profile) {
          navigate(createPageUrl('Home'));
          return;
        }

        // 🚫 Silent redirect for staff members
        if (profile.user_type === 'staff_member') {
          navigate(createPageUrl('StaffPortal'));
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

  // ✅ WHITELIST: Only these columns exist in staff table (prevents phantom field errors)
  const VALID_STAFF_COLUMNS = [
    'id', 'agency_id', 'user_id', 'first_name', 'last_name', 'email', 'phone', 'role',
    'status', 'date_of_birth', 'address', 'emergency_contact', 'employment_type',
    'hourly_rate', 'ni_number', 'bank_details', 'nmc_pin', 'nmc_register_part',
    'medication_trained', 'medication_training_expiry', 'driving_license_number',
    'driving_license_expiry', 'skills', 'groups', 'availability', 'mandatory_training',
    'occupational_health', 'references', 'employment_history', 'months_of_experience',
    'can_work_as_senior', 'role_hierarchy', 'date_joined', 'proposed_first_shift_date',
    'profile_photo_url', 'profile_photo_uploaded_date', 'created_by', 'created_date',
    'updated_date', 'rating', 'reliability_score', 'score_breakdown', 'last_score_update',
    'total_shifts_completed', 'urgent_shifts_covered', 'current_streak', 'longest_streak',
    'last_incident_date', 'suspension_reason', 'invite_token', 'invite_expires',
    'last_invited_at', 'whatsapp_number', 'whatsapp_number_verified', 'whatsapp_pin',
    'whatsapp_linked_at', 'gps_consent', 'gps_consent_status', 'gps_consent_date',
    'last_known_location', 'opt_out_shift_reminders', 'auto_assign_allowed',
    'profile_last_updated_at', 'profile_last_updated_by', 'profile_update_source',
    'archived_at', 'archived_reason'
  ];

  // Helper: Filter out phantom fields that don't exist in database
  const filterValidColumns = (data) => {
    const filtered = {};
    for (const key of Object.keys(data)) {
      if (VALID_STAFF_COLUMNS.includes(key)) {
        filtered[key] = data[key];
      }
    }
    return filtered;
  };

  // ✅ FIXED: Create mutation using direct Supabase
  const createMutation = useMutation({
    mutationFn: async (data) => {
      // 🔧 FIX: Convert empty string dates to null (PostgreSQL doesn't accept "" for date fields)
      const dateFields = [
        'date_of_birth',
        'profile_photo_uploaded_date',
        'medication_training_expiry',
        'driving_license_expiry',
        'date_joined',
        'proposed_first_shift_date'
      ];

      // 🔧 FIX: Convert empty string numeric fields to null (PostgreSQL error 22P02)
      const numericFields = [
        'hourly_rate',
        'months_of_experience',
        'rating',
        'reliability_score',
        'total_shifts_completed',
        'urgent_shifts_covered',
        'current_streak',
        'longest_streak',
        'role_hierarchy'
      ];

      // 🔧 FIX: Filter out phantom fields first
      const sanitizedData = filterValidColumns(data);

      dateFields.forEach(field => {
        if (sanitizedData[field] === '' || sanitizedData[field] === undefined) {
          sanitizedData[field] = null;
        }
      });

      numericFields.forEach(field => {
        if (sanitizedData[field] === '' || sanitizedData[field] === undefined) {
          sanitizedData[field] = null;
        }
      });

      const { data: result, error } = await supabase
        .from('staff')
        .insert(sanitizedData)
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
  // ⚡ MODULE 21: Added audit trail fields
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      console.log('🔄 [Staff] Updating staff:', id, updates);

      // 🔧 FIX: Convert empty string dates to null (PostgreSQL doesn't accept "" for date fields)
      const dateFields = [
        'date_of_birth',
        'profile_photo_uploaded_date',
        'medication_training_expiry',
        'driving_license_expiry',
        'date_joined',
        'proposed_first_shift_date'
      ];

      // 🔧 FIX: Convert empty string numeric fields to null (PostgreSQL error 22P02)
      const numericFields = [
        'hourly_rate',
        'months_of_experience',
        'rating',
        'reliability_score',
        'total_shifts_completed',
        'urgent_shifts_covered',
        'current_streak',
        'longest_streak',
        'role_hierarchy'
      ];

      // 🔧 FIX: Filter out phantom fields first (uses whitelist defined above)
      const sanitizedUpdates = filterValidColumns(updates);

      dateFields.forEach(field => {
        if (sanitizedUpdates[field] === '' || sanitizedUpdates[field] === undefined) {
          sanitizedUpdates[field] = null;
        }
      });

      numericFields.forEach(field => {
        if (sanitizedUpdates[field] === '' || sanitizedUpdates[field] === undefined) {
          sanitizedUpdates[field] = null;
        }
      });

      // ⚡ MODULE 21: Add audit trail to updates
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const auditedUpdates = {
        ...sanitizedUpdates,
        profile_last_updated_at: new Date().toISOString(),
        profile_last_updated_by: currentUser?.id || null,
        profile_update_source: 'admin_portal'
      };

      const { data: updatedStaff, error } = await supabase
        .from('staff')
        .update(auditedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // NOTE: Profile update email notification removed (MVP) - will re-add post-MVP

      return updatedStaff;
    },
    onSuccess: (updatedStaff) => {
      queryClient.invalidateQueries(['staff']);
      toast.success(`✅ ${updatedStaff.first_name} ${updatedStaff.last_name} updated successfully!`);
      // ✅ Close form after successful update
      setShowForm(false);
      setEditingStaff(null);
    },
    onError: (error) => {
      console.error('❌ [Staff] Update error:', error);
      toast.error(`Failed to update: ${error.message}`);
    }
  });

  // ✅ FIXED: Soft delete mutation - sets status to 'inactive' instead of deleting
  // ⚡ MODULE 21: Added archive reason and timestamp
  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      // First check if staff has related records
      const [shiftsCheck, timesheetsCheck, bookingsCheck, complianceCheck] = await Promise.all([
        supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('assigned_staff_id', id),
        supabase.from('timesheets').select('id', { count: 'exact', head: true }).eq('staff_id', id),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('staff_id', id),
        supabase.from('compliance').select('id', { count: 'exact', head: true }).eq('staff_id', id)
      ]);

      const totalRelatedRecords = (shiftsCheck.count || 0) + (timesheetsCheck.count || 0) + (bookingsCheck.count || 0) + (complianceCheck.count || 0);

      if (totalRelatedRecords > 0) {
        // Soft delete: Set status to inactive
        const { error } = await supabase
          .from('staff')
          .update({
            status: 'inactive',
            archived_at: new Date().toISOString(),
            archived_reason: reason || 'Not specified',
            updated_date: new Date().toISOString()
          })
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
        toast.success(
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 font-semibold text-amber-800">
              <Archive size={16} /> Staff Member Archived
            </div>
            <p className="text-xs text-amber-700">All automated communications have been disabled.</p>
          </div>,
          {
            style: { background: '#fffbeb', border: '1px solid #fef3c7' },
            duration: 5000
          }
        );
      } else {
        toast.success(
          <div className="flex items-center gap-2 font-semibold text-red-800">
            <Trash2 size={16} /> Staff Member Deleted
          </div>,
          {
            style: { background: '#fef2f2', border: '1px solid #fee2e2' }
          }
        );
      }
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    }
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('staff')
        .update({
          status: 'active',
          archived_at: null,
          archived_reason: null,
          updated_date: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staff']);
      toast.success(
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-semibold text-green-800">
            <CheckCircle size={16} /> Staff Reactivated
          </div>
          <p className="text-xs text-green-700">Comms triggers have been restored.</p>
        </div>,
        {
          style: { background: '#f0fdf4', border: '1px solid #dcfce7' }
        }
      );
    },
    onError: (error) => {
      toast.error(`Failed to reactivate: ${error.message}`);
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
    mutationFn: async ({ staffMember, agency }) => {
      console.log('📧 [Resend Invite] Resending invitation to:', staffMember.email);

      // Check if this is Dominion Agency
      const DOMINION_AGENCY_ID = 'c8e84c94-8233-4084-b4c3-63ad9dc81c16';
      const isDominion = agency?.id === DOMINION_AGENCY_ID;

      let emailSubject = `You're Invited to Join ${agency?.name || 'Our Agency'} on ACG StaffLink`;
      let emailHtml = '';

      if (isDominion) {
        emailSubject = 'Welcome to ACG StaffLink - Your Account is Ready';
        emailHtml = getDominionWelcomeEmail(staffMember, window.location.origin);
      } else {
        // Standard Invite Template
        emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Welcome to ACG StaffLink</h1>
              </div>

              <div style="padding: 30px; background: #f9fafb;">
                <p style="font-size: 16px; color: #374151;">Hi ${staffMember.first_name},</p>

                <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                  You've been invited to join <strong>${agency?.name || 'our agency'}</strong> on ACG StaffLink - the UK's leading healthcare staffing platform.
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
          `;
      }

      // Send invitation email via Edge Function
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: staffMember.email,
          subject: emailSubject,
          from_name: agency?.name || 'Agile Care Management',
          html: emailHtml
        }
      });

      if (emailError) {
        console.error('❌ [Resend Invite] Email error:', emailError);
        throw new Error('Failed to send invitation email');
      }

      // ✅ Update DB to track sent timestamp
      const { error: updateError } = await supabase
        .from('staff')
        .update({
          welcome_email_sent_at: new Date().toISOString(),
          invite_status: 'sent',
          last_invited_at: new Date().toISOString() // Keep legacy field updated too
        })
        .eq('id', staffMember.id);

      if (updateError) console.error('⚠️ Failed to update timestamp', updateError);

      return { ...staffMember, welcome_email_sent_at: new Date().toISOString() };
    },
    onSuccess: (updatedStaff) => {
      // Optimistic update or refetch can happen here, but we return the updated object
      queryClient.setQueryData(['staff', currentAgency?.id], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(s => s.id === updatedStaff.id ? { ...s, ...updatedStaff } : s);
      });

      toast.success(
        <div>
          <p className="font-bold">✅ Invitation Sent!</p>
          <p className="text-sm">Marked as sent to {updatedStaff.email}</p>
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
    if (!agency) {
      toast.error("Agency data not loaded yet. Please wait a moment and try again.");
      return;
    }
    resendInviteMutation.mutate({ staffMember, agency });
  };

  const handleEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    const reason = prompt(
      '⚠️ Archive Staff Member?\n\n' +
      'Please enter a reason for archiving (e.g., Resigned, Suspended, Left UK, etc.):',
      'Resigned'
    );

    if (reason !== null) {
      deleteMutation.mutate({ id, reason });
    }
  };

  const filteredStaff = staff.filter(s => {
    // 1. Text Search
    const matchesSearch = s.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Status Filter
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      matchesStatus = s.status === statusFilter;
    } else if (!showArchived) {
      // Default: Hide inactive staff
      matchesStatus = s.status !== 'inactive';
    }

    // 3. Role Filter
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;

    // 4. Auto-Assign Filter (Check both allow flag and matching enabled)
    // Note: 'auto_assign_allowed' is the master switch
    const matchesAutoAssign = autoAssignFilter === 'all' ||
      (autoAssignFilter === 'enabled' && s.auto_assign_allowed) ||
      (autoAssignFilter === 'disabled' && !s.auto_assign_allowed);

    // 5. Connectivity Filter
    const matchesConnectivity = connectivityFilter === 'all' ||
      (connectivityFilter === 'whatsapp_missing' && !s.whatsapp_number_verified) ||
      (connectivityFilter === 'gps_missing' && (!s.gps_consent || s.gps_consent_status !== 'granted'));

    // 6. Compliance Filter
    const matchesCompliance = complianceFilter === 'all' ||
      (complianceFilter === 'photo_missing' && !s.profile_photo_url) ||
      (complianceFilter === 'docs_missing' && false); // Placeholder for doc logic if needed

    return matchesSearch && matchesStatus && matchesRole && matchesAutoAssign && matchesConnectivity && matchesCompliance;
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
        <div className="flex gap-3 items-center">
          {/* View Toggle */}
          <div className="bg-gray-100 p-1 rounded-lg flex items-center border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-cyan-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <div className="w-px h-5 bg-gray-300 mx-1"></div>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow text-cyan-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Table View"
            >
              <TableIcon size={18} />
            </button>
          </div>

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
      {/* Advanced Filters Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md border border-gray-100">
          <Label htmlFor="show-archived" className="text-sm font-medium text-gray-600 cursor-pointer">
            Show Archived
          </Label>
          <Switch
            id="show-archived"
            checked={showArchived}
            onCheckedChange={setShowArchived}
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>

          {/* Role Filter */}
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px] h-10">
              <div className="flex items-center gap-2">
                <User size={14} className="text-gray-500" />
                <SelectValue placeholder="All Roles" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="healthcare_assistant">HCA</SelectItem>
              <SelectItem value="registered_nurse">Nurse</SelectItem>
              <SelectItem value="senior_carer">Senior Carer</SelectItem>
              <SelectItem value="support_worker">Support Worker</SelectItem>
            </SelectContent>
          </Select>

          {/* Auto-Assign Filter */}
          <Select value={autoAssignFilter} onValueChange={setAutoAssignFilter}>
            <SelectTrigger className="w-[150px] h-10">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-amber-500" />
                <SelectValue placeholder="Auto-Assign" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Setting</SelectItem>
              <SelectItem value="enabled">Auto-Assign ON</SelectItem>
              <SelectItem value="disabled">Auto-Assign OFF</SelectItem>
            </SelectContent>
          </Select>

          {/* Connectivity Filter */}
          <Select value={connectivityFilter} onValueChange={setConnectivityFilter}>
            <SelectTrigger className="w-[50px] h-10 px-0 justify-center text-gray-500 hover:text-cyan-600" title="Connectivity Issues">
              <Smartphone size={18} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="whatsapp_missing">Missing WhatsApp</SelectItem>
              <SelectItem value="gps_missing">GPS Disabled</SelectItem>
            </SelectContent>
          </Select>

          {/* Compliance Filter */}
          <Select value={complianceFilter} onValueChange={setComplianceFilter}>
            <SelectTrigger className="w-[50px] h-10 px-0 justify-center text-gray-500 hover:text-red-600" title="Compliance Issues">
              <Shield size={18} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="photo_missing">Missing Photo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Staff List - View Mode Logic */}
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
      ) : viewMode === 'table' ? (
        // ✅ TABLE VIEW IMPLEMENTATION
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-700">Staff Member</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Role</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Connectivity</th>
                <th className="px-4 py-3 font-semibold text-gray-700 text-center">Auto-Assign</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Performance</th>
                <th className="px-4 py-3 font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStaff.map((staffMember) => (
                <tr key={staffMember.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {staffMember.profile_photo_url ? (
                        <img src={staffMember.profile_photo_url} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                          <User size={20} />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-900">{staffMember.first_name} {staffMember.last_name}</div>
                        <div className="text-xs text-gray-500">{staffMember.email}</div>
                        <div className="text-xs text-gray-400">{staffMember.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="font-normal text-gray-600 bg-gray-50 capitalize">
                      {staffMember.role?.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge {...getStatusBadge(staffMember.status)} className="text-xs px-2 py-0.5 capitalize">
                      {staffMember.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <div title={staffMember.whatsapp_number_verified ? "WhatsApp Linked" : "WhatsApp Missing"}
                        className={`p-1.5 rounded-md ${staffMember.whatsapp_number_verified ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'}`}>
                        <MessageCircle size={16} />
                      </div>
                      <div title={staffMember.gps_consent_status === 'granted' ? "GPS Active" : "GPS Missing"}
                        className={`p-1.5 rounded-md ${staffMember.gps_consent_status === 'granted' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                        <MapPin size={16} />
                      </div>
                      {!staffMember.profile_photo_url && (
                        <div title="Photo Missing" className="p-1.5 rounded-md bg-red-100 text-red-600 animate-pulse">
                          <AlertTriangle size={16} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <Switch
                        checked={staffMember.auto_assign_allowed !== false}
                        onCheckedChange={(checked) => {
                          updateMutation.mutate({
                            id: staffMember.id,
                            updates: { auto_assign_allowed: checked }
                          });
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div className="flex items-center gap-1 text-yellow-600 font-medium">
                        <Star size={12} fill="currentColor" /> {staffMember.rating || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">{staffMember.total_shifts_completed || 0} shifts</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleEdit(staffMember)} title="Edit">
                        <Edit size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => handleGeneratePIN(staffMember)} title="Send PIN">
                        <Smartphone size={16} />
                      </Button>
                      {staffMember.status === 'inactive' ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => reactivateMutation.mutate(staffMember.id)} title="Reactivate Staff">
                          <RefreshCw size={16} />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to archive ${staffMember.first_name}? This will disable all automated communications.`)) {
                              handleDelete(staffMember.id);
                            }
                          }}
                          title="Archive Staff"
                        >
                          <Archive size={16} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No staff members found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

                {/* ✅ NEW: Send/Resend Invitation button for staff without user_id */}
                {!staffMember.user_id && (
                  <div className="pt-4 border-t space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`w-full border-blue-200 hover:bg-blue-100 ${staffMember.welcome_email_sent_at
                        ? 'bg-gray-100 text-gray-500 border-gray-200'
                        : 'bg-blue-50 text-blue-700'
                        }`}
                      onClick={() => handleResendInvite(staffMember)}
                      disabled={resendInviteMutation.isPending}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${resendInviteMutation.isPending ? 'animate-spin' : ''}`} />
                      {resendInviteMutation.isPending
                        ? 'Sending...'
                        : staffMember.welcome_email_sent_at
                          ? `Resent ${new Date(staffMember.welcome_email_sent_at).toLocaleDateString()}`
                          : (agency?.id === 'c8e84c94-8233-4084-b4c3-63ad9dc81c16' ? 'Send Welcome Email' : 'Resend Invitation')
                      }
                    </Button>
                    {staffMember.last_invited_at && (
                      <p className="text-xs text-center text-gray-500">
                        Last sent: {new Date(staffMember.last_invited_at).toLocaleDateString()} at {new Date(staffMember.last_invited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t space-y-3">
                  {/* ⚡ Auto-Assignment Toggle */}
                  <div className="flex items-center justify-between p-2 bg-amber-50/50 border border-amber-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      {staffMember.auto_assign_allowed !== false ?
                        <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> :
                        <ZapOff className="w-4 h-4 text-gray-400" />
                      }
                      <span className="text-xs font-semibold text-amber-900">Auto-Assign Matching</span>
                    </div>
                    <Switch
                      checked={staffMember.auto_assign_allowed !== false}
                      onCheckedChange={(checked) => {
                        updateMutation.mutate({
                          id: staffMember.id,
                          updates: { auto_assign_allowed: checked }
                        });
                      }}
                    />
                  </div>

                  <div className="flex gap-2">
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
                    {staffMember.status === 'inactive' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reactivateMutation.mutate(staffMember.id)}
                        className="text-green-600 hover:text-green-700 bg-green-50 border-green-200"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Reactivate
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to archive ${staffMember.first_name}?`)) {
                            handleDelete(staffMember.id);
                          }
                        }}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
                        title="Archive Staff"
                      >
                        <Archive className="w-4 h-4 mr-1" />
                        Archive
                      </Button>
                    )}
                  </div>
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
