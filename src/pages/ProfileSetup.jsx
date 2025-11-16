import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Building2, CheckCircle, AlertCircle, Upload, AlertTriangle, FileText, Heart, Briefcase, Plus, Trash2, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import MandatoryTrainingSection from "@/components/staff/MandatoryTrainingSection";
import TrainingCertificateModal from "@/components/staff/TrainingCertificateModal";


export default function ProfileSetup() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [agency, setAgency] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [linkedStaff, setLinkedStaff] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [activeTrainingContext, setActiveTrainingContext] = useState(null);

  // ✅ NEW: Extended form data for staff onboarding
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    user_type: 'staff_member',
    agency_id: '',
    profile_photo_url: '',
    date_of_birth: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      postcode: ''
    },
    emergency_contact: {
      name: '',
      phone: '',
      relationship: ''
    },
    references: [],
    employment_history: [],
    occupational_health: {
      cleared_to_work: false,
      restrictions: ''
    },
    mandatory_training: {}
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['all-staff-for-linking'],
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
    refetchOnMount: 'always'
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('*');

      if (error) {
        console.error('❌ Error fetching agencies:', error);
        return [];
      }
      return data || [];
    },
    refetchOnMount: 'always'
  });

  const { data: compliance = [] } = useQuery({
    queryKey: ['compliance', user?.id],
    queryFn: async () => {
      if (!linkedStaff?.id) return [];

      const { data, error } = await supabase
        .from('compliance')
        .select('*')
        .eq('staff_id', linkedStaff.id);

      if (error) {
        console.error('❌ Error fetching compliance:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!linkedStaff?.id,
    refetchOnMount: 'always'
  });

  // ✅ FIXED: Only show "Awaiting Approval" for self-signup users WITHOUT staff record
  // If user has linked staff record, they were invited by admin and are NOT pending
  const isPendingUser = user?.user_type === 'pending' && !linkedStaff;

  useEffect(() => {
    const initSetup = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const shouldLogout = urlParams.get('logout') === 'true';

        if (shouldLogout) {
          console.log('🔓 [ProfileSetup] Logout parameter detected - clearing previous session');
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('logout');
            await supabase.auth.signOut();
            window.location.href = url.toString();
            return;
          } catch (logoutError) {
            console.log('⚠️ [ProfileSetup] No active session to logout from or logout failed:', logoutError);
          }
        }

        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          console.error('❌ Not authenticated:', authError);
          return;
        }

        const { data: currentUser, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !currentUser) {
          console.error('❌ Profile not found:', profileError);
          return;
        }

        console.log('✅ [ProfileSetup] Current user:', currentUser.email);
        setUser(currentUser);

        const superAdminEmail = 'g.basera@yahoo.com';
        const isSuper = currentUser.email === superAdminEmail;
        setIsSuperAdmin(isSuper);

        const matchingStaff = allStaff.find(s =>
          s.user_id === currentUser.id ||
          s.email?.toLowerCase() === currentUser.email?.toLowerCase()
        );

        if (matchingStaff) {
          console.log('✅ [ProfileSetup] Auto-linked to staff record:', matchingStaff.id);
          setLinkedStaff(matchingStaff);

          // ✅ Pre-fill ALL staff data
          const photoUrl = matchingStaff.profile_photo_url || currentUser.profile_photo_url || '';

          setFormData({
            full_name: `${matchingStaff.first_name} ${matchingStaff.last_name}`,
            email: currentUser.email || '',
            phone: matchingStaff.phone || currentUser.phone || '',
            user_type: 'staff_member',
            agency_id: matchingStaff.agency_id || '',
            profile_photo_url: photoUrl,
            date_of_birth: matchingStaff.date_of_birth || '',
            address: matchingStaff.address || { line1: '', line2: '', city: '', postcode: '' },
            emergency_contact: matchingStaff.emergency_contact || { name: '', phone: '', relationship: '' },
            references: matchingStaff.references || [],
            employment_history: matchingStaff.employment_history || [],
            occupational_health: matchingStaff.occupational_health || { cleared_to_work: false, restrictions: '' },
            mandatory_training: matchingStaff.mandatory_training || {}
          });
        } else {
          console.warn('⚠️ [ProfileSetup] No staff record found for email:', currentUser.email);

          const photoUrl = currentUser.profile_photo_url || '';

          setFormData(prev => ({
            ...prev,
            full_name: currentUser.full_name || '',
            email: currentUser.email || '',
            phone: currentUser.phone || '',
            user_type: currentUser.user_type === 'pending' ? 'staff_member' : (currentUser.user_type || 'agency_admin'),
            agency_id: currentUser.agency_id || '',
            profile_photo_url: photoUrl
          }));
        }

        if (!isSuper && currentUser.agency_id) {
          const { data: userAgency, error: agencyError } = await supabase
            .from('agencies')
            .select('*')
            .eq('id', currentUser.agency_id)
            .single();

          if (!agencyError && userAgency) {
            setAgency(userAgency);
          }
        }

        if (isSuper) {
          setNeedsOnboarding(false);
          return;
        }

        if (currentUser.user_type === 'pending' || !currentUser.agency_id || !currentUser.user_type) {
          setNeedsOnboarding(true);
        }

      } catch (error) {
        console.error("Error fetching user:", error);
        toast.error('Failed to load profile');
      }
    };

    if (allStaff.length > 0 || agencies.length > 0) {
      initSetup();
    } else if (allStaff.length === 0 && agencies.length === 0) {
       initSetup();
    }

  }, [allStaff, agencies]);

  const updateMutation = useMutation({
    mutationFn: async (dataToUpdate) => {
      if (dataToUpdate.user_type === 'staff_member' && !dataToUpdate.profile_photo_url && !linkedStaff?.profile_photo_url) {
        throw new Error('Profile photo is mandatory for staff members.');
      }

      const userUpdatePayload = {
        full_name: dataToUpdate.full_name,
        phone: dataToUpdate.phone,
        user_type: dataToUpdate.user_type,
        agency_id: dataToUpdate.agency_id,
        profile_photo_url: dataToUpdate.profile_photo_url
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(userUpdatePayload)
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
        throw updateError;
      }

      // ✅ NEW: Update staff record with ALL onboarding data
      if (linkedStaff && linkedStaff.id) {
        const staffUpdatePayload = {
          user_id: user.id,
          status: 'active',
          phone: dataToUpdate.phone,
          date_of_birth: dataToUpdate.date_of_birth,
          address: dataToUpdate.address,
          emergency_contact: dataToUpdate.emergency_contact,
          references: dataToUpdate.references,
          employment_history: dataToUpdate.employment_history,
          occupational_health: dataToUpdate.occupational_health,
          mandatory_training: dataToUpdate.mandatory_training
        };

        if (dataToUpdate.profile_photo_url) {
          staffUpdatePayload.profile_photo_url = dataToUpdate.profile_photo_url;
          staffUpdatePayload.profile_photo_uploaded_date = new Date().toISOString().split('T')[0];
        }

        const { error: staffUpdateError } = await supabase
          .from('staff')
          .update(staffUpdatePayload)
          .eq('id', linkedStaff.id);

        if (staffUpdateError) {
          console.error('❌ Error updating staff:', staffUpdateError);
          throw staffUpdateError;
        }

        // Send admin notification
        try {
          const { data: staffAgency, error: agencyError } = await supabase
            .from('agencies')
            .select('*')
            .eq('id', linkedStaff.agency_id)
            .single();

          if (!agencyError && staffAgency?.contact_email) {
            const { error: emailError } = await supabase.functions.invoke('send-email', {
              body: {
                to: staffAgency.contact_email,
                subject: `✅ Staff Onboarding Complete: ${dataToUpdate.full_name}`,
                text: `Staff member ${dataToUpdate.full_name} has completed their profile setup.`
              }
            });
          }
        } catch (emailError) {
          console.error('Failed to send admin notification:', emailError);
        }
      }

      return dataToUpdate;
    },
    onSuccess: () => {
      toast.success('✅ Profile updated successfully!');

      setTimeout(() => {
        if (isSuperAdmin) {
          navigate(createPageUrl('Dashboard'));
        } else if (formData.user_type === 'staff_member') {
          navigate(createPageUrl('StaffPortal'));
        } else {
          navigate(createPageUrl('Dashboard'));
        }

        window.location.reload();
      }, 1500);
    },
    onError: (error) => {
      toast.error(`❌ Failed to update profile: ${error.message}`);
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      const file_url = publicUrl;

      setFormData({
        ...formData,
        profile_photo_url: file_url
      });

      toast.success('✅ Photo uploaded successfully!');
    } catch (error) {
      toast.error(`❌ Upload failed: ${error.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ✅ NEW: Reference management
  const addReference = () => {
    setFormData({
      ...formData,
      references: [
        ...formData.references,
        { referee_name: '', referee_position: '', referee_company: '', referee_email: '', referee_phone: '' }
      ]
    });
  };

  const updateReference = (index, field, value) => {
    const updated = [...formData.references];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, references: updated });
  };

  const removeReference = (index) => {
    setFormData({
      ...formData,
      references: formData.references.filter((_, i) => i !== index)
    });
  };

  // ✅ NEW: Employment history management
  const addEmployment = () => {
    setFormData({
      ...formData,
      employment_history: [
        ...formData.employment_history,
        { employer: '', position: '', start_date: '', end_date: '', responsibilities: '' }
      ]
    });
  };

  const updateEmployment = (index, field, value) => {
    const updated = [...formData.employment_history];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, employment_history: updated });
  };

  const removeEmployment = (index) => {
    setFormData({
      ...formData,
      employment_history: formData.employment_history.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // ✅ FIXED: Check both formData.agency_id AND user.agency_id (from database)
    // This handles cases where profile was updated but form state hasn't refreshed
    const hasAgency = formData.agency_id || user?.agency_id || linkedStaff?.agency_id;

    if (!isSuperAdmin && !hasAgency && !isPendingUser) {
      toast.error('⚠️ Please select an agency');
      return;
    }

    if (!formData.user_type && !isPendingUser && !linkedStaff) {
      toast.error('⚠️ Please select your role');
      return;
    }

    // ✅ FIXED: Check both formData.profile_photo_url AND user.profile_photo_url
    const hasPhoto = formData.profile_photo_url || user?.profile_photo_url || linkedStaff?.profile_photo_url;

    if (formData.user_type === 'staff_member' && !hasPhoto) {
      toast.error('⚠️ Profile photo is MANDATORY for staff members.');
      return;
    }

    // ✅ REMOVED: References are optional - compliance emails will chase
    // Staff can save profile without references and complete them later

    updateMutation.mutate(formData);
  };

  const calculateProgress = () => {
    if (!linkedStaff || user?.user_type !== "staff_member") return 100;

    let completed = 0;
    const total = 10;

    if (formData.profile_photo_url || linkedStaff.profile_photo_url) completed++;
    if (formData.references.length >= 2) completed++;
    if (formData.employment_history.length > 0) completed++;
    if (formData.occupational_health.cleared_to_work) completed++;
    if (formData.date_of_birth) completed++;
    if (formData.address.postcode) completed++;
    if (formData.emergency_contact.phone) completed++;

    const dbsCheck = compliance.find((c) => c.document_type === "dbs_check");
    if (dbsCheck) completed++;

    const rightToWork = compliance.find((c) => c.document_type === "right_to_work");
    if (rightToWork) completed++;

    const mandatoryTrainingValues = Object.values(formData.mandatory_training || {});
    const validMandatoryTrainingCount = mandatoryTrainingValues.filter((t) => {
      if (!t?.completed_date) return false;
      if (!t.expiry_date) return true;
      return new Date(t.expiry_date) > new Date();
    }).length;

    const complianceTrainingCount = compliance.filter(
      (c) => c.document_type === "training_certificate"
    ).length;

    const trainingCount =
      validMandatoryTrainingCount > 0 ? validMandatoryTrainingCount : complianceTrainingCount;

    if (trainingCount >= 10) completed++;

    return Math.round((completed / total) * 100);
  };

  const progress = calculateProgress();
  const isFullyCompliant = progress === 100;

  const handleOpenTrainingModal = (context = {}) => {
    if (!linkedStaff?.id) {
      toast.error(
        "Please complete the basic profile first so we can link training to your staff record."
      );
      return;
    }

    const { mode = "core", key, label } = context;

    setActiveTrainingContext({
      mode,
      key: key || null,
      label: label || "",
    });
    setTrainingModalOpen(true);
  };

  const handleTrainingSaved = ({
    mode,
    trainingKey,
    trainingLabel,
    values,
    complianceDoc,
  }) => {
    setFormData((prev) => {
      const existingMandatory = prev.mandatory_training || {};
      const safeMode = mode === "additional" ? "additional" : "core";

      if (safeMode === "core" && trainingKey) {
        const prevEntry = existingMandatory[trainingKey] || {};
        const updatedEntry = {
          ...prevEntry,
          completed_date:
            values.completed_date || prevEntry.completed_date || "",
          expiry_date: values.expiry_date || prevEntry.expiry_date || "",
          certificate_ref:
            values.certificate_ref || prevEntry.certificate_ref || "",
        };

        const existingIds = Array.isArray(prevEntry.certificate_ids)
          ? prevEntry.certificate_ids
          : [];
        if (complianceDoc?.id) {
          updatedEntry.certificate_ids = Array.from(
            new Set([...existingIds, complianceDoc.id])
          );
        }

        return {
          ...prev,
          mandatory_training: {
            ...existingMandatory,
            [trainingKey]: updatedEntry,
          },
        };
      }

      const additionalList = Array.isArray(existingMandatory.additional)
        ? existingMandatory.additional
        : [];

      const newItem = {
        id: values.id || `local-${Date.now()}`,
        name: values.name || trainingLabel || "Training / Qualification",
        provider: values.provider || "",
        completed_date: values.completed_date || "",
        expiry_date: values.expiry_date || "",
        certificate_ref: values.certificate_ref || "",
        certificate_ids: complianceDoc?.id ? [complianceDoc.id] : [],
      };

      return {
        ...prev,
        mandatory_training: {
          ...existingMandatory,
          additional: [...additionalList, newItem],
        },
      };
    });

    toast.success("✅ Training details & certificate saved");
    setTrainingModalOpen(false);
    setActiveTrainingContext(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ✅ MOBILE-FIRST: Fixed header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-4 shadow-lg">
        <h1 className="text-xl font-bold">Profile Settings</h1>
        {user?.user_type === 'staff_member' && linkedStaff && (
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Onboarding Progress</span>
              <span className="text-sm font-bold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 mt-1" />
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Alerts */}
        {isPendingUser && !isSuperAdmin && (
          <Alert className="border-orange-300 bg-orange-50">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>⏳ Account Under Review</strong>
              <p className="mt-2">Your account is awaiting approval from an agency administrator.</p>
            </AlertDescription>
          </Alert>
        )}

        {!isFullyCompliant && user?.user_type === 'staff_member' && linkedStaff && (
          <Alert className="border-red-300 bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>⚠️ CRITICAL: Cannot Accept Shifts Until 100% Complete</strong>
              <p className="text-sm mt-1">Care homes require full compliance before staff can work.</p>
            </AlertDescription>
          </Alert>
        )}

        {linkedStaff && !isSuperAdmin && (
          <Alert className="border-green-300 bg-green-50">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>Staff Record Found!</strong>
              <p className="mt-1">Linked to: {linkedStaff.first_name} {linkedStaff.last_name} ({linkedStaff.role?.replace('_', ' ')})</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Agency Info */}
        {agency && !isSuperAdmin && (
          <Card className="border-2 border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {agency.logo_url ? (
                  <img
                    src={agency.logo_url}
                    alt={agency.name}
                    className="w-12 h-12 rounded-lg object-contain bg-white p-1"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-cyan-600 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Your Agency</p>
                  <p className="font-bold text-gray-900">{agency.name}</p>
                </div>
                <Badge className="bg-cyan-100 text-cyan-800">Verified</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ✅ MOBILE-OPTIMIZED: Profile Photo Section */}
          <Card className="border-2 border-purple-300">
            <CardHeader className="bg-purple-50">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Photo {user?.user_type === 'staff_member' && <span className="text-red-600">*</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {user?.user_type === 'staff_member' && (
                <Alert className="mb-4 border-purple-200">
                  <AlertTriangle className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-sm">
                    <strong>CRITICAL:</strong> Professional headshot required for care home verification
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col items-center gap-4">
                {formData.profile_photo_url ? (
                  <div className="relative">
                    <img
                      src={formData.profile_photo_url}
                      alt="Profile"
                      className="w-40 h-40 object-cover border-4 border-green-400 rounded-2xl"
                    />
                    <CheckCircle className="absolute -top-2 -right-2 w-8 h-8 text-green-600 bg-white rounded-full" />
                  </div>
                ) : (
                  <div className="w-40 h-40 border-4 border-dashed border-red-400 rounded-2xl flex items-center justify-center bg-red-50">
                    <div className="text-center">
                      <User className="w-12 h-12 text-red-600 mx-auto mb-2" />
                      <p className="text-xs text-red-700 font-bold">REQUIRED</p>
                    </div>
                  </div>
                )}

                <label className="w-full">
                  <Button type="button" disabled={uploadingPhoto} className="w-full h-14 text-base" asChild>
                    <span>
                      <Upload className="w-5 h-5 mr-2" />
                      {uploadingPhoto ? 'Uploading...' : formData.profile_photo_url ? 'Change Photo' : 'Upload Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        capture="user"
                      />
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-gray-600 text-center">
                  Clear, recent photo. JPG or PNG, max 5MB
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader className="bg-gray-50">
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="h-12 text-base"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  className="h-12 text-base bg-gray-100"
                  disabled
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="h-12 text-base"
                  placeholder="+44..."
                  required
                />
              </div>

              {/* ✅ RBAC: Only show Date of Birth for staff members */}
              {(user?.user_type === 'staff_member' || linkedStaff) && (
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                    className="h-12 text-base"
                    required
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* ✅ RBAC: Only show Address for staff members */}
          {(user?.user_type === 'staff_member' || linkedStaff) && (
          <Card>
            <CardHeader className="bg-gray-50">
              <CardTitle className="text-lg">Address *</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label htmlFor="address_line1">Address Line 1 *</Label>
                <Input
                  id="address_line1"
                  value={formData.address.line1}
                  onChange={(e) => setFormData({...formData, address: {...formData.address, line1: e.target.value}})}
                  className="h-12 text-base"
                  required
                />
              </div>

              <div>
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  value={formData.address.line2}
                  onChange={(e) => setFormData({...formData, address: {...formData.address, line2: e.target.value}})}
                  className="h-12 text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="address_city">City *</Label>
                  <Input
                    id="address_city"
                    value={formData.address.city}
                    onChange={(e) => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                    className="h-12 text-base"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address_postcode">Postcode *</Label>
                  <Input
                    id="address_postcode"
                    value={formData.address.postcode}
                    onChange={(e) => setFormData({...formData, address: {...formData.address, postcode: e.target.value}})}
                    className="h-12 text-base"
                    placeholder="TS28 5EN"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* ✅ RBAC: Only show Emergency Contact for staff members */}
          {(user?.user_type === 'staff_member' || linkedStaff) && (
          <Card>
            <CardHeader className="bg-gray-50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-600" />
                Emergency Contact *
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label htmlFor="emergency_name">Contact Name *</Label>
                <Input
                  id="emergency_name"
                  value={formData.emergency_contact.name}
                  onChange={(e) => setFormData({...formData, emergency_contact: {...formData.emergency_contact, name: e.target.value}})}
                  className="h-12 text-base"
                  required
                />
              </div>

              <div>
                <Label htmlFor="emergency_phone">Contact Phone *</Label>
                <Input
                  id="emergency_phone"
                  type="tel"
                  value={formData.emergency_contact.phone}
                  onChange={(e) => setFormData({...formData, emergency_contact: {...formData.emergency_contact, phone: e.target.value}})}
                  className="h-12 text-base"
                  placeholder="+44..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="emergency_relationship">Relationship *</Label>
                <Input
                  id="emergency_relationship"
                  value={formData.emergency_contact.relationship}
                  onChange={(e) => setFormData({...formData, emergency_contact: {...formData.emergency_contact, relationship: e.target.value}})}
                  className="h-12 text-base"
                  placeholder="e.g., Spouse, Parent, Sibling"
                  required
                />
              </div>
            </CardContent>
          </Card>
          )}

          {/* ✅ RBAC: Only show References for staff members */}
          {(user?.user_type === 'staff_member' || linkedStaff) && (
          <Card>
            <CardHeader className="bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  References (Optional - Recommended 2)
                </CardTitle>
                <Badge className={formData.references.length >= 2 ? 'bg-green-600' : 'bg-yellow-600'}>
                  {formData.references.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {formData.references.map((ref, idx) => (
                <Card key={idx} className="border-2">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">Reference {idx + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReference(idx)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>

                    <Input
                      placeholder="Referee Name"
                      value={ref.referee_name}
                      onChange={(e) => updateReference(idx, 'referee_name', e.target.value)}
                      className="h-11 text-base"
                    />
                    <Input
                      placeholder="Position/Job Title"
                      value={ref.referee_position}
                      onChange={(e) => updateReference(idx, 'referee_position', e.target.value)}
                      className="h-11 text-base"
                    />
                    <Input
                      placeholder="Company"
                      value={ref.referee_company}
                      onChange={(e) => updateReference(idx, 'referee_company', e.target.value)}
                      className="h-11 text-base"
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={ref.referee_email}
                      onChange={(e) => updateReference(idx, 'referee_email', e.target.value)}
                      className="h-11 text-base"
                    />
                    <Input
                      placeholder="Phone"
                      type="tel"
                      value={ref.referee_phone}
                      onChange={(e) => updateReference(idx, 'referee_phone', e.target.value)}
                      className="h-11 text-base"
                    />
                  </CardContent>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addReference}
                className="w-full h-12 text-base"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Reference
              </Button>
            </CardContent>
          </Card>
          )}

          {/* ✅ RBAC: Only show Employment History for staff members */}
          {(user?.user_type === 'staff_member' || linkedStaff) && (
          <Card>
            <CardHeader className="bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Employment History *
                </CardTitle>
                <Badge className={formData.employment_history.length > 0 ? 'bg-green-600' : 'bg-red-600'}>
                  {formData.employment_history.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {formData.employment_history.map((emp, idx) => (
                <Card key={idx} className="border-2">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">Job {idx + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmployment(idx)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>

                    <Input
                      placeholder="Employer Name *"
                      value={emp.employer}
                      onChange={(e) => updateEmployment(idx, 'employer', e.target.value)}
                      className="h-11 text-base"
                      required
                    />
                    <Input
                      placeholder="Position/Job Title *"
                      value={emp.position}
                      onChange={(e) => updateEmployment(idx, 'position', e.target.value)}
                      className="h-11 text-base"
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Start Date</Label>
                        <Input
                          type="date"
                          value={emp.start_date}
                          onChange={(e) => updateEmployment(idx, 'start_date', e.target.value)}
                          className="h-11 text-base"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">End Date</Label>
                        <Input
                          type="date"
                          value={emp.end_date}
                          onChange={(e) => updateEmployment(idx, 'end_date', e.target.value)}
                          className="h-11 text-base"
                        />
                      </div>
                    </div>
                    <Textarea
                      placeholder="Key Responsibilities"
                      value={emp.responsibilities}
                      onChange={(e) => updateEmployment(idx, 'responsibilities', e.target.value)}
                      className="text-base"
                      rows={2}
                    />
                  </CardContent>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addEmployment}
                className="w-full h-12 text-base"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Employment
              </Button>
            </CardContent>
          </Card>
          )}

          {/* ✅ RBAC: Only show Occupational Health & Training for staff members */}
          {(user?.user_type === "staff_member" || linkedStaff) && (
            <>
              <Card>
                <CardHeader className="bg-gray-50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-600" />
                    Occupational Health *
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <Label htmlFor="cleared_to_work" className="font-semibold">
                      Cleared to Work?
                    </Label>
                    <input
                      type="checkbox"
                      id="cleared_to_work"
                      checked={formData.occupational_health.cleared_to_work}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          occupational_health: {
                            ...formData.occupational_health,
                            cleared_to_work: e.target.checked,
                          },
                        })
                      }
                      className="h-6 w-6 rounded border-gray-300"
                    />
                  </div>

                  <div>
                    <Label htmlFor="health_restrictions">Any Restrictions?</Label>
                    <Textarea
                      id="health_restrictions"
                      value={formData.occupational_health.restrictions}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          occupational_health: {
                            ...formData.occupational_health,
                            restrictions: e.target.value,
                          },
                        })
                      }
                      className="text-base"
                      rows={2}
                      placeholder="e.g., No heavy lifting, No night shifts"
                    />
                  </div>
                </CardContent>
              </Card>

              <MandatoryTrainingSection
                training={formData.mandatory_training}
                additionalTraining={formData.mandatory_training?.additional || []}
                onOpenTrainingModal={handleOpenTrainingModal}
                onChange={(updated) =>
                  setFormData((prev) => ({
                    ...prev,
                    mandatory_training: updated,
                  }))
                }
              />
            </>
          )}

          {/* Compliance Documents Link */}
          {(user?.user_type === 'staff_member' || linkedStaff) && (
            <Card className="border-2 border-purple-300 bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Upload className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Need to Upload Documents?</h3>
                    <p className="text-sm text-gray-700 mb-3">
                      Upload DBS, Right to Work, and Training certificates in the Compliance section
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(createPageUrl('ComplianceTracker'))}
                      className="w-full h-12 text-base"
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      Go to My Docs
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ✅ MOBILE-OPTIMIZED: Large save button */}
          <div className="sticky bottom-0 bg-white border-t-4 border-cyan-500 p-4 -mx-4 shadow-2xl">
            <Button
              type="submit"
              className="w-full h-14 text-lg bg-gradient-to-r from-cyan-500 to-blue-600"
              disabled={updateMutation.isPending || isPendingUser}
            >
              {updateMutation.isPending ? (
                'Saving...'
              ) : isPendingUser ? (
                '⏳ Awaiting Approval'
              ) : needsOnboarding && !isSuperAdmin ? (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Complete Setup
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {trainingModalOpen && activeTrainingContext && linkedStaff && (
        <TrainingCertificateModal
          open={trainingModalOpen}
          mode={activeTrainingContext.mode}
          trainingKey={activeTrainingContext.key}
          trainingLabel={activeTrainingContext.label}
          staffId={linkedStaff.id}
          agencyId={linkedStaff.agency_id || agency?.id}
          initialValues={
            activeTrainingContext.mode === "core" && activeTrainingContext.key
              ? formData.mandatory_training?.[activeTrainingContext.key]
              : null
          }
          onClose={() => {
            setTrainingModalOpen(false);
            setActiveTrainingContext(null);
          }}
          onSaved={handleTrainingSaved}
        />
      )}

    </div>

  );
}