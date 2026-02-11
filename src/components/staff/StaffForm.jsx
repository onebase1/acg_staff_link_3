import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Save, AlertCircle, CheckCircle, User, Mail, Phone, MapPin, Calendar,
  Briefcase, Shield, Star, Upload, Loader2, Banknote, Heart, ChevronDown, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { STAFF_ROLES } from "@/constants/staffRoles";
import { formatSortCode } from "@/utils/profileHelpers";
import TrainingCertificateModal from "./TrainingCertificateModal";
import { reconcileTrainingCertificates } from "@/utils/reconcileTrainingCertificates";
import { supabase } from "@/lib/supabase";

// ✅ Phone normalization utilities (inline)
function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('07')) return '+44' + cleaned.substring(1);
  if (cleaned.startsWith('447')) return '+' + cleaned;
  if (cleaned.startsWith('+44')) return cleaned;
  if (cleaned.startsWith('44') && cleaned.length >= 12) return '+' + cleaned;
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
}

function isValidUKPhone(phone) {
  if (!phone) return false;
  const normalized = normalizePhoneNumber(phone);
  const ukPhoneRegex = /^\+44[127]\d{9}$/;
  return ukPhoneRegex.test(normalized);
}

function formatPhoneForDisplay(phone) {
  if (!phone) return '';
  const normalized = normalizePhoneNumber(phone);
  if (normalized.startsWith('+447')) {
    return normalized.replace(/(\+44)(\d{4})(\d{3})(\d{3})/, '$1 $2 $3 $4');
  }
  if (normalized.startsWith('+441') || normalized.startsWith('+442')) {
    return normalized.replace(/(\+44)(\d{4})(\d{3})(\d{3})/, '$1 $2 $3 $4');
  }
  return normalized;
}

export default function StaffForm({ staff, onSubmit, onCancel }) {
  // Normalize nested objects so editing works even when address or emergency_contact are null in the DB
  const normalizedStaff = staff
    ? {
      ...staff,
      address: {
        line1: '',
        line2: '',
        city: '',
        postcode: '',
        ...(staff.address || {}),
      },
      emergency_contact: {
        name: '',
        relationship: '',
        phone: '',
        ...(staff.emergency_contact || {}),
      },
      bank_details: {
        account_name: '',
        sort_code: '',
        account_number: '',
        bank_name: '',
        ...(staff.bank_details || {}),
      },
      occupational_health: {
        cleared_to_work: true,
        restrictions: '',
        ...(staff.occupational_health || {}),
      },
      mandatory_training: {
        manual_handling: {},
        safeguarding_children: {},
        safeguarding_adults: {},
        prevent: {},
        fire_safety: {},
        food_hygiene: {},
        health_safety: {},
        infection_control: {},
        person_centred_care: {},
        dementia_awareness: {},
        ...(staff.mandatory_training || {}),
      },
    }
    : null;

  // ⚡ MODULE 21: Helper to merge staff data with proper defaults (prevents controlled/uncontrolled warnings)
  const mergeWithDefaults = (staffData, defaults) => {
    if (!staffData) return defaults;
    const merged = { ...defaults };
    Object.keys(defaults).forEach(key => {
      if (staffData[key] !== undefined && staffData[key] !== null) {
        if (typeof defaults[key] === 'object' && !Array.isArray(defaults[key])) {
          // Deep merge for nested objects
          merged[key] = { ...defaults[key], ...(staffData[key] || {}) };
        } else {
          merged[key] = staffData[key];
        }
      }
    });
    return merged;
  };

  const defaultFormData = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'care_worker',
    nmc_pin: '',
    medication_trained: false,
    date_of_birth: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      postcode: '',
    },
    emergency_contact: {
      name: '',
      relationship: '',
      phone: '',
    },
    hourly_rate: '',
    employment_type: 'temporary',
    status: 'onboarding',
    profile_photo_url: '',
    auto_assign_allowed: true,
    // ⚡ MODULE 21: New fields for admin profile pre-fill
    ni_number: '',
    bank_details: {
      account_name: '',
      sort_code: '',
      account_number: '',
      bank_name: ''
    },
    occupational_health: {
      cleared_to_work: true,
      restrictions: ''
    },
    mandatory_training: {
      manual_handling: {},
      safeguarding_children: {},
      safeguarding_adults: {},
      prevent: {},
      fire_safety: {},
      food_hygiene: {},
      health_safety: {},
      infection_control: {},
      person_centred_care: {},
      dementia_awareness: {}
    },
    skills: [],
    groups: [],
    driving_license_number: '',
    driving_license_expiry: '',
    can_work_as_senior: false,
    months_of_experience: '',
    proposed_first_shift_date: '',
    references: [],
    employment_history: [],
  };

  const [formData, setFormData] = useState(mergeWithDefaults(normalizedStaff, defaultFormData));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // ⚡ Training Certificate Modal state
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [activeTrainingContext, setActiveTrainingContext] = useState(null);

  // ⚡ MODULE 21: State for sensitive data masking
  const [showFullNI, setShowFullNI] = useState(false);
  const [showFullBankAccount, setShowFullBankAccount] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ⚡ MODULE 21: Helper functions for sensitive data masking
  const maskNINumber = (ni) => {
    if (!ni || showFullNI) return ni || '';
    if (ni.length <= 4) return ni;
    return ni.slice(0, -4).replace(/./g, '*') + ni.slice(-4);
  };

  const maskBankAccount = (account) => {
    if (!account || showFullBankAccount) return account || '';
    if (account.length <= 4) return account;
    return '*'.repeat(account.length - 4) + account.slice(-4);
  };

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
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      // 🔧 FIX: Sanitize filename to avoid "Invalid key" error
      // Remove special chars, keep only alphanumeric, dots, hyphens, underscores
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const sanitizedName = file.name
        .replace(/\.[^/.]+$/, '') // remove extension
        .replace(/[^a-zA-Z0-9_-]/g, '_') // replace special chars with underscore
        .substring(0, 50); // limit length
      const fileName = `${staff?.id || 'new'}-${Date.now()}-${sanitizedName}.${ext}`;

      const { data, error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      setFormData({
        ...formData,
        profile_photo_url: publicUrl
      });

      toast.success('✅ Photo uploaded successfully!');
    } catch (error) {
      toast.error(`❌ Upload failed: ${error.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ⚡ Training Certificate Modal handlers
  const handleOpenTrainingModal = (context = {}) => {
    if (!staff?.id) {
      toast.error("Please save the staff record first before uploading training certificates.");
      return;
    }
    const { mode = "core", key, label } = context;
    setActiveTrainingContext({ mode, key: key || null, label: label || "" });
    setTrainingModalOpen(true);
  };

  const handleTrainingSaved = ({ mode, trainingKey, trainingLabel, values, complianceDoc }) => {
    // Update the mandatory_training in formData with the new certificate info
    if (mode === "core" && trainingKey) {
      const existingMandatory = formData.mandatory_training || {};
      const existingTraining = existingMandatory[trainingKey] || {};
      const existingCertIds = existingTraining.certificate_ids || [];

      setFormData({
        ...formData,
        mandatory_training: {
          ...existingMandatory,
          [trainingKey]: {
            ...existingTraining,
            completed_date: values.completed_date || existingTraining.completed_date,
            expiry_date: values.expiry_date || existingTraining.expiry_date,
            certificate_ref: values.certificate_ref || existingTraining.certificate_ref,
            certificate_ids: complianceDoc?.id
              ? [...new Set([...existingCertIds, complianceDoc.id])]
              : existingCertIds
          }
        }
      });
    }

    toast.success("✅ Training certificate uploaded and linked");
    setTrainingModalOpen(false);
    setActiveTrainingContext(null);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.first_name?.trim()) errors.first_name = 'First name is required';
    if (!formData.last_name?.trim()) errors.last_name = 'Last name is required';
    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    if (!formData.phone?.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!isValidUKPhone(formData.phone)) {
      errors.phone = 'Invalid UK phone number (should be 07... or +447...)';
    }
    if (!formData.role) errors.role = 'Role is required';
    if (formData.role === 'nurse' && !formData.nmc_pin?.trim()) {
      errors.nmc_pin = 'NMC PIN is required for nurses';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix validation errors before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const dataToSubmit = {
        ...formData,
        phone: normalizePhoneNumber(formData.phone),
        emergency_contact: formData.emergency_contact?.phone ? {
          ...formData.emergency_contact,
          phone: normalizePhoneNumber(formData.emergency_contact.phone)
        } : formData.emergency_contact
      };

      console.log('📤 Submitting staff data:', dataToSubmit);

      await onSubmit(dataToSubmit);

    } catch (error) {
      console.error('❌ Form submission error:', error);
      toast.error(`Failed to save: ${error.message}`);
      setIsSubmitting(false);
    }
  };

  const handlePhoneBlur = (field) => {
    if (field === 'phone' && formData.phone) {
      const normalized = normalizePhoneNumber(formData.phone);
      setFormData({ ...formData, phone: normalized });
    } else if (field === 'emergency_phone' && formData.emergency_contact?.phone) {
      const normalized = normalizePhoneNumber(formData.emergency_contact.phone);
      setFormData({
        ...formData,
        emergency_contact: { ...formData.emergency_contact, phone: normalized }
      });
    }
  };

  useEffect(() => {
    setIsSubmitting(false);
  }, [staff?.id]);

  // 🔄 AUTO-RECOVERY: Reconcile orphaned training certificates on load
  // Fixes cases where admin uploaded certificates but save failed
  useEffect(() => {
    const reconcileOrphanedCertificates = async () => {
      if (!staff?.id) return; // Only for existing staff (not new)

      console.log('🔄 [StaffForm] Checking for orphaned training certificates...');

      const reconciledTraining = await reconcileTrainingCertificates(
        supabase,
        staff.id,
        formData.mandatory_training
      );

      // Only update if reconciliation found orphans
      if (JSON.stringify(reconciledTraining) !== JSON.stringify(formData.mandatory_training)) {
        console.log('🔧 [StaffForm] Found orphaned certificates - updating form data');
        setFormData(prev => ({
          ...prev,
          mandatory_training: reconciledTraining
        }));
        toast.info('📋 Recovered previously uploaded training certificates');
      }
    };

    reconcileOrphanedCertificates();
  }, [staff?.id]); // Only run when staff.id changes (on initial load)

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="border-b bg-gradient-to-r from-cyan-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <CardTitle className="text-2xl">
                  {staff ? 'Edit Staff Member' : 'Add New Staff Member'}
                </CardTitle>
              </div>
              {staff && (
                <Badge className={
                  staff.status === 'active' ? 'bg-green-100 text-green-800' :
                    staff.status === 'onboarding' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                }>
                  {staff.status}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-8">
            {Object.keys(validationErrors).length > 0 && (
              <Alert className="border-red-300 bg-red-50">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-900">
                  <p className="font-semibold mb-2">Please fix the following errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {Object.entries(validationErrors).map(([field, error]) => (
                      <li key={field} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Profile Photo Upload */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Photo
              </h3>
              <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-lg">
                {formData.profile_photo_url && !formData.profile_photo_url.includes('placeholder') ? (
                  <div className="relative">
                    <img
                      src={formData.profile_photo_url}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-2">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                    <div className="text-center">
                      <User className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-600 font-bold">No Photo</p>
                    </div>
                  </div>
                )}

                <label className="w-full max-w-xs">
                  <Button type="button" disabled={uploadingPhoto} className="w-full h-12 text-base" asChild>
                    <span>
                      <Upload className="w-5 h-5 mr-2" />
                      {uploadingPhoto ? 'Uploading...' : formData.profile_photo_url ? 'Change Photo' : 'Upload Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-gray-600 text-center">
                  Clear, recent photo. JPG or PNG, max 5MB. Required for CQC profile.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Basic Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="first_name"
                    value={formData.first_name ?? ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className={validationErrors.first_name ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                  {validationErrors.first_name && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.first_name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="last_name"
                    value={formData.last_name ?? ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className={validationErrors.last_name ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                  {validationErrors.last_name && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.last_name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email ?? ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={validationErrors.email ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                  {validationErrors.email && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.email}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    value={formData.phone ?? ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    onBlur={() => handlePhoneBlur('phone')}
                    placeholder="07700900123 or +447700900123"
                    className={validationErrors.phone ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                  {validationErrors.phone ? (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.phone}</p>
                  ) : formData.phone && isValidUKPhone(formData.phone) && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Valid: {formatPhoneForDisplay(formData.phone)}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth ?? ''}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Professional Details
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Role <span className="text-red-500">*</span></Label>
                  <select
                    id="role"
                    value={formData.role ?? 'care_worker'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md ${validationErrors.role ? 'border-red-500' : 'border-gray-300'}`}
                    disabled={isSubmitting}
                  >
                    {STAFF_ROLES.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.icon} {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-amber-50/30 border border-amber-100 rounded-lg md:col-span-2 mt-2">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold text-amber-900">Auto-Assignment Eligible</Label>
                    <p className="text-sm text-amber-700/80">
                      If enabled, this staff member will be considered by the automatic shift matching engine.
                    </p>
                  </div>
                  <Switch
                    checked={formData.auto_assign_allowed !== false}
                    onCheckedChange={(checked) => setFormData({ ...formData, auto_assign_allowed: checked })}
                  />
                </div>

                {formData.role === 'nurse' && (
                  <div>
                    <Label htmlFor="nmc_pin">NMC PIN <span className="text-red-500">*</span></Label>
                    <Input
                      id="nmc_pin"
                      value={formData.nmc_pin ?? ''}
                      onChange={(e) => setFormData({ ...formData, nmc_pin: e.target.value })}
                      placeholder="e.g., 12A3456E"
                      className={validationErrors.nmc_pin ? 'border-red-500' : ''}
                      disabled={isSubmitting}
                    />
                    {validationErrors.nmc_pin && (
                      <p className="text-xs text-red-600 mt-1">{validationErrors.nmc_pin}</p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="hourly_rate">Hourly Rate (£)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate ?? ''}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="employment_type">Employment Type</Label>
                  <select
                    id="employment_type"
                    value={formData.employment_type ?? 'temporary'}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={isSubmitting}
                  >
                    <option value="temporary">Temporary</option>
                    <option value="contract">Contract</option>
                    <option value="permanent">Permanent</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="medication_trained"
                    checked={formData.medication_trained ?? false}
                    onChange={(e) => setFormData({ ...formData, medication_trained: e.target.checked })}
                    className="w-4 h-4"
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="medication_trained" className="cursor-pointer">
                    Medication Trained
                  </Label>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Address
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="address_line1">Address Line 1</Label>
                  <Input
                    id="address_line1"
                    value={formData.address?.line1 ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...(formData.address || {}), line1: e.target.value }
                    })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="address_city">City</Label>
                  <Input
                    id="address_city"
                    value={formData.address?.city ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...(formData.address || {}), city: e.target.value }
                    })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="address_postcode">Postcode</Label>
                  <Input
                    id="address_postcode"
                    value={formData.address?.postcode ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...(formData.address || {}), postcode: e.target.value }
                    })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Emergency Contact
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="emergency_name">Name</Label>
                  <Input
                    id="emergency_name"
                    value={formData.emergency_contact?.name ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      emergency_contact: { ...(formData.emergency_contact || {}), name: e.target.value }
                    })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_relationship">Relationship</Label>
                  <Input
                    id="emergency_relationship"
                    value={formData.emergency_contact?.relationship ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      emergency_contact: { ...(formData.emergency_contact || {}), relationship: e.target.value }
                    })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_phone">Phone</Label>
                  <Input
                    id="emergency_phone"
                    value={formData.emergency_contact?.phone ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      emergency_contact: { ...(formData.emergency_contact || {}), phone: e.target.value }
                    })}
                    onBlur={() => handlePhoneBlur('emergency_phone')}
                    placeholder="07700900123"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* ========== MODULE 21: FINANCIAL INFORMATION ========== */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <Banknote className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Financial Information</h3>
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 p-4 border-l-2 border-emerald-200 ml-2 mt-2">
                {/* NI Number with Masking */}
                <div>
                  <Label htmlFor="ni_number">National Insurance Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ni_number"
                      type="text"
                      placeholder="AB123456C"
                      value={showFullNI ? (formData.ni_number || '') : maskNINumber(formData.ni_number)}
                      onChange={(e) => {
                        if (showFullNI) {
                          setFormData({ ...formData, ni_number: e.target.value.toUpperCase() });
                        }
                      }}
                      disabled={!showFullNI || isSubmitting}
                      className="uppercase"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFullNI(!showFullNI)}
                    >
                      {showFullNI ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      <span className="ml-1">{showFullNI ? 'Hide' : 'Show'}</span>
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Format: 2 letters, 6 numbers, 1 letter (e.g., AB123456C)</p>
                </div>

                {/* Bank Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="bank_account_name">Account Holder Name</Label>
                    <Input
                      id="bank_account_name"
                      type="text"
                      placeholder="John Smith"
                      value={formData.bank_details?.account_name || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        bank_details: { ...formData.bank_details, account_name: e.target.value }
                      })}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bank_sort_code">Sort Code</Label>
                    <Input
                      id="bank_sort_code"
                      type="text"
                      placeholder="12-34-56"
                      maxLength={8}
                      value={formData.bank_details?.sort_code || ''}
                      onChange={(e) => {
                        const formatted = formatSortCode(e.target.value);
                        setFormData({
                          ...formData,
                          bank_details: { ...formData.bank_details, sort_code: formatted }
                        });
                      }}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bank_account_number">Account Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="bank_account_number"
                        type="text"
                        placeholder="12345678"
                        maxLength={8}
                        value={showFullBankAccount ? (formData.bank_details?.account_number || '') : maskBankAccount(formData.bank_details?.account_number || '')}
                        onChange={(e) => {
                          if (showFullBankAccount) {
                            const value = e.target.value.replace(/\D/g, '');
                            setFormData({
                              ...formData,
                              bank_details: { ...formData.bank_details, account_number: value }
                            });
                          }
                        }}
                        disabled={!showFullBankAccount || isSubmitting}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFullBankAccount(!showFullBankAccount)}
                      >
                        {showFullBankAccount ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      type="text"
                      placeholder="Barclays, HSBC, Lloyds, etc."
                      value={formData.bank_details?.bank_name || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        bank_details: { ...formData.bank_details, bank_name: e.target.value }
                      })}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* ========== MODULE 21: PROFESSIONAL HISTORY ========== */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Professional History</h3>
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 p-4 border-l-2 border-purple-200 ml-2 mt-2">
                {/* Months of Experience */}
                <div>
                  <Label htmlFor="months_of_experience">Months of Experience</Label>
                  <Input
                    id="months_of_experience"
                    type="number"
                    min="0"
                    placeholder="24"
                    value={formData.months_of_experience || ''}
                    onChange={(e) => setFormData({ ...formData, months_of_experience: parseInt(e.target.value) || 0 })}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Driving License */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="driving_license_number">Driving License Number (Optional)</Label>
                    <Input
                      id="driving_license_number"
                      type="text"
                      placeholder="SMITH061085A99IJ"
                      value={formData.driving_license_number || ''}
                      onChange={(e) => setFormData({ ...formData, driving_license_number: e.target.value.toUpperCase() })}
                      className="uppercase"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <Label htmlFor="driving_license_expiry">License Expiry Date</Label>
                    <Input
                      id="driving_license_expiry"
                      type="date"
                      value={formData.driving_license_expiry || ''}
                      onChange={(e) => setFormData({ ...formData, driving_license_expiry: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Can Work As Senior */}
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="can_work_as_senior"
                    checked={formData.can_work_as_senior || false}
                    onChange={(e) => setFormData({ ...formData, can_work_as_senior: e.target.checked })}
                    className="w-4 h-4"
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="can_work_as_senior" className="cursor-pointer">
                    Can work as Senior Carer (requires medication training)
                  </Label>
                </div>

                {/* Proposed First Shift Date */}
                <div>
                  <Label htmlFor="proposed_first_shift_date">Proposed First Shift Date</Label>
                  <Input
                    id="proposed_first_shift_date"
                    type="date"
                    value={formData.proposed_first_shift_date || ''}
                    onChange={(e) => setFormData({ ...formData, proposed_first_shift_date: e.target.value })}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">When is this staff member expected to start?</p>
                </div>

                {/* References and Employment History Note */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-900">
                    <strong>Note:</strong> References ({formData.references?.length || 0}) and Employment History ({formData.employment_history?.length || 0})
                    are managed during staff onboarding. Admin can view these in ComplianceTracker after staff completes their profile.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* ========== MODULE 21: HEALTH & COMPLIANCE ========== */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <Heart className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Health & Compliance</h3>
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 p-4 border-l-2 border-red-200 ml-2 mt-2">
                {/* Occupational Health */}
                <div>
                  <Label>Occupational Health Clearance</Label>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg mb-2">
                    <input
                      type="checkbox"
                      id="cleared_to_work"
                      checked={formData.occupational_health?.cleared_to_work || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        occupational_health: {
                          ...formData.occupational_health,
                          cleared_to_work: e.target.checked
                        }
                      })}
                      className="w-4 h-4"
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="cleared_to_work" className="cursor-pointer">
                      Cleared to work (Occupational Health approved)
                    </Label>
                  </div>

                  <Label htmlFor="health_restrictions">Health Restrictions / Notes</Label>
                  <textarea
                    id="health_restrictions"
                    rows={3}
                    placeholder="Any health considerations or restrictions (e.g., cannot lift heavy objects, requires breaks, etc.)"
                    value={formData.occupational_health?.restrictions || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      occupational_health: {
                        ...formData.occupational_health,
                        restrictions: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500"
                    disabled={isSubmitting}
                  />
                </div>

                {/* ========== MANDATORY TRAINING TABLE (CQC Core) ========== */}
                <div className="space-y-4 mt-6">
                  <Label className="text-base font-semibold">Mandatory Training (CQC Core)</Label>
                  <p className="text-sm text-gray-600">Pre-fill training dates. Staff verifies during onboarding.</p>

                  <div className="border rounded-lg overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Training</th>
                          <th className="px-3 py-2 text-left font-semibold">Completed</th>
                          <th className="px-3 py-2 text-left font-semibold">Expiry</th>
                          <th className="px-3 py-2 text-left font-semibold">Cert Ref</th>
                          <th className="px-3 py-2 text-center font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'manual_handling', label: 'Manual Handling & Moving People' },
                          { key: 'safeguarding_children', label: 'Safeguarding Children' },
                          { key: 'safeguarding_adults', label: 'Safeguarding Vulnerable Adults' },
                          { key: 'prevent', label: 'Preventing Radicalisation (PREVENT)' },
                          { key: 'fire_safety', label: 'Fire Safety' },
                          { key: 'food_hygiene', label: 'Food Hygiene' },
                          { key: 'health_safety', label: 'Health Safety & Welfare' },
                          { key: 'infection_control', label: 'Infection Control' },
                          { key: 'person_centred_care', label: 'Person Centred Care & Consent' },
                          { key: 'dementia_awareness', label: 'Dementia Awareness' }
                        ].map((training) => {
                          const trainingData = formData.mandatory_training?.[training.key] || {};
                          const hasCertificate = trainingData.certificate_ids?.length > 0;
                          const hasDetails = trainingData.completed_date || trainingData.certificate_ref;

                          return (
                            <tr key={training.key} className="border-t hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-sm">{training.label}</td>
                              <td className="px-3 py-2">
                                <Input
                                  type="date"
                                  value={trainingData.completed_date || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    mandatory_training: {
                                      ...formData.mandatory_training,
                                      [training.key]: {
                                        ...trainingData,
                                        completed_date: e.target.value
                                      }
                                    }
                                  })}
                                  disabled={isSubmitting}
                                  className="w-full min-w-[130px]"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="date"
                                  value={trainingData.expiry_date || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    mandatory_training: {
                                      ...formData.mandatory_training,
                                      [training.key]: {
                                        ...trainingData,
                                        expiry_date: e.target.value
                                      }
                                    }
                                  })}
                                  disabled={isSubmitting}
                                  className="w-full min-w-[130px]"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  type="text"
                                  placeholder="e.g. RE"
                                  value={trainingData.certificate_ref || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    mandatory_training: {
                                      ...formData.mandatory_training,
                                      [training.key]: {
                                        ...trainingData,
                                        certificate_ref: e.target.value
                                      }
                                    }
                                  })}
                                  disabled={isSubmitting}
                                  className="w-full min-w-[80px]"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-[11px] whitespace-nowrap"
                                  onClick={() => handleOpenTrainingModal({
                                    mode: "core",
                                    key: training.key,
                                    label: training.label
                                  })}
                                  disabled={isSubmitting || !staff?.id}
                                  title={!staff?.id ? "Save staff record first, then upload certificates" : "Upload training certificate"}
                                >
                                  {!staff?.id ? "Save First" : hasCertificate ? "View / Edit" : hasDetails ? "Edit / Attach" : "Add / Attach"}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Training note */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Training Certificates:</strong> Upload supporting documents via the Compliance Tracker.
                      Staff can verify and update their training records during onboarding.
                    </p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* ========== MODULE 21: SKILLS & PREFERENCES ========== */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Skills & Preferences</h3>
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 p-4 border-l-2 border-indigo-200 ml-2 mt-2">
                {/* Skills */}
                <div>
                  <Label htmlFor="skills">Skills (comma-separated)</Label>
                  <Input
                    id="skills"
                    type="text"
                    placeholder="Care Skills, Manual Handling, First Aid, Dementia Care"
                    value={Array.isArray(formData.skills) ? formData.skills.join(', ') : ''}
                    onChange={(e) => {
                      const skillsArray = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                      setFormData({ ...formData, skills: skillsArray });
                    }}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Groups */}
                <div>
                  <Label htmlFor="groups">Groups / Teams (comma-separated)</Label>
                  <Input
                    id="groups"
                    type="text"
                    placeholder="Night Shift Team, Weekend Cover, Medication Trained"
                    value={Array.isArray(formData.groups) ? formData.groups.join(', ') : ''}
                    onChange={(e) => {
                      const groupsArray = e.target.value.split(',').map(g => g.trim()).filter(g => g);
                      setFormData({ ...formData, groups: groupsArray });
                    }}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional tags for organizing staff</p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-cyan-600 hover:bg-cyan-700 min-w-[180px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {staff ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {staff ? 'Update Staff Member' : 'Create Staff Member'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Training Certificate Modal - OUTSIDE form to avoid nested form error */}
      {trainingModalOpen && activeTrainingContext && staff?.id && (
        <TrainingCertificateModal
          open={trainingModalOpen}
          mode={activeTrainingContext.mode}
          trainingKey={activeTrainingContext.key}
          trainingLabel={activeTrainingContext.label}
          staffId={staff.id}
          agencyId={staff.agency_id}
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
    </>
  );
}
