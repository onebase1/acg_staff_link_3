import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Save, AlertCircle, CheckCircle, User, Mail, Phone, MapPin, Calendar, 
  Briefcase, Shield, Star, Upload, Loader2
} from "lucide-react";
import { toast } from "sonner";

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
  const [formData, setFormData] = useState({
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
      postcode: ''
    },
    emergency_contact: {
      name: '',
      relationship: '',
      phone: ''
    },
    hourly_rate: 0,
    employment_type: 'temporary',
    status: 'onboarding',
    profile_photo_url: '',
    ...staff
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

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

  return (
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
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
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
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
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
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
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
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
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
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-md ${validationErrors.role ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={isSubmitting}
                >
                  <option value="nurse">Nurse</option>
                  <option value="care_worker">Care Worker</option>
                  <option value="hca">HCA</option>
                  <option value="senior_care_worker">Senior Care Worker</option>
                  <option value="support_worker">Support Worker</option>
                  <option value="specialist_nurse">Specialist Nurse</option>
                </select>
              </div>

              {formData.role === 'nurse' && (
                <div>
                  <Label htmlFor="nmc_pin">NMC PIN <span className="text-red-500">*</span></Label>
                  <Input
                    id="nmc_pin"
                    value={formData.nmc_pin}
                    onChange={(e) => setFormData({...formData, nmc_pin: e.target.value})}
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
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value) || 0})}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="employment_type">Employment Type</Label>
                <select
                  id="employment_type"
                  value={formData.employment_type}
                  onChange={(e) => setFormData({...formData, employment_type: e.target.value})}
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
                  checked={formData.medication_trained}
                  onChange={(e) => setFormData({...formData, medication_trained: e.target.checked})}
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
                  value={formData.address.line1}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: {...formData.address, line1: e.target.value}
                  })}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="address_city">City</Label>
                <Input
                  id="address_city"
                  value={formData.address.city}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: {...formData.address, city: e.target.value}
                  })}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="address_postcode">Postcode</Label>
                <Input
                  id="address_postcode"
                  value={formData.address.postcode}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: {...formData.address, postcode: e.target.value}
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
                  value={formData.emergency_contact.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergency_contact: {...formData.emergency_contact, name: e.target.value}
                  })}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="emergency_relationship">Relationship</Label>
                <Input
                  id="emergency_relationship"
                  value={formData.emergency_contact.relationship}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergency_contact: {...formData.emergency_contact, relationship: e.target.value}
                  })}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="emergency_phone">Phone</Label>
                <Input
                  id="emergency_phone"
                  value={formData.emergency_contact.phone}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergency_contact: {...formData.emergency_contact, phone: e.target.value}
                  })}
                  onBlur={() => handlePhoneBlur('emergency_phone')}
                  placeholder="07700900123"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

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
  );
}