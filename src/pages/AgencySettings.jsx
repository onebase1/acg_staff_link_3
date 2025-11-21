
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings, Save, Info, Bell, AlertTriangle, Upload, Building2,
  Shield, Zap, DollarSign, RefreshCw, CheckCircle, Rocket, Star, MapPin, XCircle,
  MessageSquare, Mail, MessageCircle
} from "lucide-react";
import { toast } from "sonner";

export default function AgencySettings() {
  const [user, setUser] = useState(null);
  const [agency, setAgency] = useState(null);
  const [pendingChanges, setPendingChanges] = useState({});
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  // Helper to safely get nested properties from an object
  const getNestedValue = (obj, path, defaultValue) => {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length; i++) {
      if (current === null || current === undefined) return defaultValue;
      current = current[parts[i]];
    }
    return current ?? defaultValue;
  };

  // Helper to safely set nested properties immutably in an object
  const setNestedValue = (obj, path, value) => {
    const parts = path.split('.');
    const newObj = { ...obj }; // shallow copy at current level
    let current = newObj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
        // If the path segment doesn't exist or is not an object, create a new object
        current[part] = {};
      }
      current[part] = { ...current[part] }; // shallow copy for the next level
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
    return newObj;
  };

  const hasChange = (field) => pendingChanges.hasOwnProperty(field);
  
  // Existing getValue, handles top-level fields only
  const getValue = (field, defaultValue = '') => {
    return pendingChanges.hasOwnProperty(field) 
      ? pendingChanges[field] 
      : (agency?.[field] ?? defaultValue);
  };

  // New getCurrentValue, handles nested fields
  const getCurrentValue = (path, defaultValue = '') => {
    const pendingVal = getNestedValue(pendingChanges, path);
    // If the pending value is explicitly set (even to null/false/0), use it.
    // Otherwise, it means it's not in pendingChanges, so fall back to agency data.
    if (pendingVal !== undefined) {
      return pendingVal;
    }
    return getNestedValue(agency, path, defaultValue);
  };

  const getBankDetail = (field, defaultValue = '') => {
    if (pendingChanges.bank_details?.[field] !== undefined) {
      return pendingChanges.bank_details[field];
    }
    return agency?.bank_details?.[field] ?? defaultValue;
  };

  const setBankDetailChange = (field, value) => {
    setPendingChanges(prev => ({
      ...prev,
      bank_details: {
        ...(prev.bank_details || agency?.bank_details || {}),
        [field]: value
      }
    }));
  };

  const setChange = (field, value) => {
    setPendingChanges(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // New updateField function for nested changes
  const updateField = (path, value) => {
    setPendingChanges(prev => setNestedValue(prev, path, value));
  };

  const resetChanges = () => {
    setPendingChanges({});
    toast.info('All changes discarded');
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          console.error('❌ Not authenticated:', authError);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profile) {
          console.error('❌ Profile not found:', profileError);
          return;
        }

        setUser(profile);
      } catch (error) {
        console.error("Error:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: agencies = [], isLoading } = useQuery({
    queryKey: ['agencies'],
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

  useEffect(() => {
    if (user?.agency_id && agencies.length > 0) {
      const userAgency = agencies.find(a => a.id === user.agency_id);
      if (userAgency) {
        setAgency(userAgency);
        setPendingChanges({});
      }
    }
  }, [user, agencies]);

  const updateAgencyMutation = useMutation({
    mutationFn: async (updates) => {
      if (!agency?.id) {
        throw new Error("Agency ID is missing for update.");
      }
      
      const { data, error } = await supabase
        .from('agencies')
        .update(updates)
        .eq('id', agency.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      setPendingChanges({});
      toast.success('✅ Settings saved successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    }
  });

  const handleLogoUpload = async (e) => {
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

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);
      
      setChange('logo_url', publicUrl);
      toast.success('✅ Logo uploaded! Click "Save Changes" to apply.');
    } catch (error) {
      toast.error(`❌ Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const handleSaveChanges = () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast.info('No changes to save');
      return;
    }

    // ✅ VALIDATION: Check critical fields before saving
    const finalData = { ...agency, ...pendingChanges };
    const errors = [];

    // Check contact email
    if (!finalData.contact_email || finalData.contact_email.trim() === '') {
      errors.push("Contact email is required");
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(finalData.contact_email)) {
        errors.push("Contact email is invalid");
      }
    }

    // Check contact phone
    if (!finalData.contact_phone || finalData.contact_phone.trim() === '') {
      errors.push("Contact phone is required");
    } else {
      const phoneRegex = /^(\+44|0)[0-9\s]{9,13}$/;
      if (!phoneRegex.test(finalData.contact_phone.replace(/\s/g, ''))) {
        errors.push("Contact phone must be UK format (+44 20 1234 5678)");
      }
    }

    // Check agency name
    if (!finalData.name || finalData.name.trim() === '') {
      errors.push("Agency name is required");
    }

    if (errors.length > 0) {
      toast.error(
        <div>
          <p className="font-bold">❌ Cannot Save - Validation Errors</p>
          <ul className="text-sm mt-2 list-disc list-inside">
            {errors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
          <p className="text-xs mt-2 text-red-200">
            Contact email and phone are critical for staff notifications!
          </p>
        </div>,
        { duration: 8000 }
      );
      return;
    }

    updateAgencyMutation.mutate(pendingChanges);
  };

  const hasUnsavedChanges = Object.keys(pendingChanges).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading agency settings...</p>
        </div>
      </div>
    );
  }

  if (!agency) {
    return (
      <Alert className="max-w-2xl mx-auto mt-12 border-amber-300 bg-amber-50">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <AlertDescription className="text-amber-900">
          <strong>No Agency Profile Found</strong>
          <p className="mt-2">Please contact support to set up your agency profile.</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agency Settings</h1>
          <p className="text-gray-600 mt-1">Manage your agency profile and view platform features</p>
        </div>
        <div className="flex gap-2">
          {hasUnsavedChanges && (
            <>
              <Badge variant="warning" className="bg-yellow-500 text-white text-sm px-3 py-1">
                {Object.keys(pendingChanges).length} Unsaved
              </Badge>
              <Button 
                variant="outline" 
                onClick={resetChanges}
                disabled={updateAgencyMutation.isPending}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </>
          )}
          <Button 
            onClick={handleSaveChanges} 
            className="bg-cyan-600 hover:bg-cyan-700"
            disabled={!hasUnsavedChanges || updateAgencyMutation.isPending}
          >
            {updateAgencyMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Subscription Tier Badge */}
      <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Star className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {agency.subscription_tier?.charAt(0).toUpperCase() + agency.subscription_tier?.slice(1) || 'Starter'} Plan
                </h3>
                <p className="text-gray-600">All premium features enabled</p>
              </div>
            </div>
            <Badge className="bg-green-600 text-white text-sm px-4 py-2">
              ✓ Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Agency Branding */}
      <Card className="border-2 border-purple-300">
        <CardHeader className="border-b bg-purple-50">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            Agency Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Alert className="mb-4 border-purple-300 bg-purple-50">
            <Info className="h-5 w-5 text-purple-600" />
            <AlertDescription className="text-purple-900">
              <strong>⚠️ CRITICAL:</strong> Your agency logo appears on all invoices sent to clients. 
              A professional logo builds trust and ensures invoices are not marked as spam.
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              {getValue('logo_url') ? (
                <div className="relative group">
                  <img 
                    src={getValue('logo_url')} 
                    alt="Agency Logo"
                    className={`w-32 h-32 object-contain border-2 rounded-lg bg-white p-2 ${
                      hasChange('logo_url') ? 'border-yellow-400' : 'border-gray-300'
                    }`}
                  />
                  {hasChange('logo_url') && (
                    <Badge className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs">
                      New
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No logo</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1">
              <Label className="text-lg font-semibold mb-2 block">
                {getValue('logo_url') ? 'Update Logo' : 'Upload Logo'}
              </Label>
              <p className="text-sm text-gray-600 mb-4">
                Recommended: PNG or JPG, transparent background, 500x500px minimum
              </p>
              <label className="cursor-pointer">
                <Button type="button" disabled={uploading} asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : getValue('logo_url') ? 'Change Logo' : 'Upload Logo'}
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card className="border-2 border-green-300">
        <CardHeader className="border-b bg-green-50">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Bank Details for Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Alert className="mb-6 border-green-300 bg-green-50">
            <DollarSign className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>🏦 CRITICAL FOR PAYMENTS:</strong> These bank details will appear on ALL invoices sent to clients.
              Clients cannot pay without this information.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="font-semibold mb-2 flex items-center gap-2">
                Account Holder Name <span className="text-red-500">*</span>
                {hasChange('bank_details') && (
                  <Badge className="bg-yellow-500 text-white text-xs">Modified</Badge>
                )}
              </Label>
              <Input
                placeholder="e.g., Dominion Healthcare Services Ltd"
                value={getBankDetail('account_name')}
                onChange={(e) => setBankDetailChange('account_name', e.target.value)}
                className={hasChange('bank_details') ? 'border-yellow-400 border-2' : ''}
              />
              <p className="text-xs text-gray-500 mt-1">Full legal name as registered with bank</p>
            </div>

            <div>
              <Label className="font-semibold mb-2">
                Bank Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g., NatWest, Barclays, HSBC"
                value={getBankDetail('bank_name')}
                onChange={(e) => setBankDetailChange('bank_name', e.target.value)}
                className={hasChange('bank_details') ? 'border-yellow-400 border-2' : ''}
              />
            </div>

            <div>
              <Label className="font-semibold mb-2">
                Account Number <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g., 12345678"
                value={getBankDetail('account_number')}
                onChange={(e) => setBankDetailChange('account_number', e.target.value)}
                maxLength={8}
                className={hasChange('bank_details') ? 'border-yellow-400 border-2' : ''}
              />
              <p className="text-xs text-gray-500 mt-1">8-digit account number</p>
            </div>

            <div>
              <Label className="font-semibold mb-2">
                Sort Code <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g., 12-34-56"
                value={getBankDetail('sort_code')}
                onChange={(e) => setBankDetailChange('sort_code', e.target.value)}
                maxLength={8}
                className={hasChange('bank_details') ? 'border-yellow-400 border-2' : ''}
              />
              <p className="text-xs text-gray-500 mt-1">Format: XX-XX-XX</p>
            </div>

            <div>
              <Label className="font-semibold mb-2">IBAN (Optional)</Label>
              <Input
                placeholder="e.g., GB29 NWBK 6016 1331 9268 19"
                value={getBankDetail('iban')}
                onChange={(e) => setBankDetailChange('iban', e.target.value)}
                className={hasChange('bank_details') ? 'border-yellow-400 border-2' : ''}
              />
              <p className="text-xs text-gray-500 mt-1">For international payments</p>
            </div>

            <div>
              <Label className="font-semibold mb-2">SWIFT/BIC (Optional)</Label>
              <Input
                placeholder="e.g., NWBKGB2L"
                value={getBankDetail('swift_bic')}
                onChange={(e) => setBankDetailChange('swift_bic', e.target.value)}
                className={hasChange('bank_details') ? 'border-yellow-400 border-2' : ''}
              />
              <p className="text-xs text-gray-500 mt-1">For international payments</p>
            </div>
          </div>

          {!agency?.bank_details?.account_name && (
            <Alert className="mt-6 border-red-300 bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>⚠️ ACTION REQUIRED:</strong> Bank details are not configured. 
                You cannot send invoices to clients until this is completed.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Agency Information */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Agency Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {(!agency?.contact_email || !agency?.contact_phone) && (
            <Alert className="mb-6 border-red-300 bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>⚠️ CRITICAL:</strong> Contact email and phone are missing!
                Staff will not receive shift notifications until this is configured.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="font-semibold mb-2 flex items-center gap-2">
                Agency Name <span className="text-red-500">*</span>
                {hasChange('name') && (
                  <Badge className="bg-yellow-500 text-white text-xs">Modified</Badge>
                )}
              </Label>
              <Input
                value={getValue('name')}
                onChange={(e) => setChange('name', e.target.value)}
                className={hasChange('name') ? 'border-yellow-400 border-2' : ''}
              />
            </div>

            <div>
              <Label className="font-semibold mb-2 flex items-center gap-2">
                Contact Email <span className="text-red-500">*</span>
                {hasChange('contact_email') && (
                  <Badge className="bg-yellow-500 text-white text-xs">Modified</Badge>
                )}
              </Label>
              <Input
                type="email"
                value={getValue('contact_email')}
                onChange={(e) => setChange('contact_email', e.target.value)}
                className={hasChange('contact_email') ? 'border-yellow-400 border-2' : ''}
              />
            </div>

            <div>
              <Label className="font-semibold mb-2 flex items-center gap-2">
                Phone Number <span className="text-red-500">*</span>
                {hasChange('contact_phone') && (
                  <Badge className="bg-yellow-500 text-white text-xs">Modified</Badge>
                )}
              </Label>
              <Input
                value={getValue('contact_phone')}
                onChange={(e) => setChange('contact_phone', e.target.value)}
                className={hasChange('contact_phone') ? 'border-yellow-400 border-2' : ''}
                placeholder="+44 20 1234 5678"
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for staff notifications (shift confirmations, reminders)
              </p>
            </div>

            <div>
              <Label className="font-semibold mb-2 flex items-center gap-2">
                Registration Number
                {hasChange('registration_number') && (
                  <Badge className="bg-yellow-500 text-white text-xs">Modified</Badge>
                )}
              </Label>
              <Input
                value={getValue('registration_number')}
                onChange={(e) => setChange('registration_number', e.target.value)}
                className={hasChange('registration_number') ? 'border-yellow-400 border-2' : ''}
              />
            </div>

            <div className="md:col-span-2">
              <Label className="font-semibold mb-2 flex items-center gap-2">
                Address
                {hasChange('address') && (
                  <Badge className="bg-yellow-500 text-white text-xs">Modified</Badge>
                )}
              </Label>
              <Input
                value={getValue('address')}
                onChange={(e) => setChange('address', e.target.value)}
                className={hasChange('address') ? 'border-yellow-400 border-2' : ''}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ ENHANCED: Platform Features - Add Auto-Approval Settings */}
      {/* This card combines and enhances the previous "Platform Features (Informational)" section */}
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Platform Features & Automation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Timesheet Auto-Approval Settings */}
          <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-purple-600" />
                <div>
                  <h4 className="font-semibold text-gray-900">⚡ Intelligent Timesheet Auto-Approval</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically approve timesheets that meet validation criteria
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={getCurrentValue('settings.automation_settings.auto_timesheet_approval', true)}
                  onChange={(e) => updateField('settings.automation_settings.auto_timesheet_approval', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Criteria Display */}
            <div className="ml-8 space-y-2 text-sm">
              <p className="font-medium text-gray-700 mb-2">Auto-approval criteria:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Both signatures present</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>GPS validated (if consent given)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Hours within ±15 mins of scheduled</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>No active disputes</span>
                </div>
              </div>
              <p className="text-xs text-purple-700 mt-3 bg-purple-100 p-2 rounded">
                💡 Timesheets that don't meet criteria will be flagged for manual review via Admin Workflows
              </p>
            </div>
          </div>

          {/* GPS Auto-Completion Setting */}
          <div className="border-l-4 border-green-500 pl-4 py-2">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="font-semibold text-gray-900">🎯 GPS Auto-Complete Shifts</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically mark shifts as completed when GPS-validated timesheets are approved
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={getCurrentValue('settings.automation_settings.gps_auto_complete_shifts', true)}
                  onChange={(e) => updateField('settings.automation_settings.gps_auto_complete_shifts', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* GPS Auto-Completion Details */}
            <div className="ml-8 space-y-2 text-sm">
              <p className="font-medium text-gray-700 mb-2">When enabled:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Shifts with GPS-validated clock-in/out auto-complete</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Actual start/end times auto-populated from GPS timestamps</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>No manual admin closure required for GPS shifts</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <XCircle className="w-4 h-4 text-orange-600" />
                  <span>Non-GPS shifts still require manual admin closure</span>
                </div>
              </div>
              <p className="text-xs text-green-700 mt-3 bg-green-100 p-2 rounded">
                💡 Recommended: Keep enabled for maximum automation. Disable if you want to manually review all shifts regardless of GPS validation.
              </p>
            </div>
          </div>

          {/* 🆕 URGENT SHIFT BROADCAST CHANNELS */}
          <div className="border-l-4 border-red-500 pl-4 py-2">
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <Bell className="w-5 h-5 text-red-600" />
                <div>
                  <h4 className="font-semibold text-gray-900">📢 Urgent Shift Broadcast Channels</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose which notification channels to use for urgent shift broadcasts
                  </p>
                </div>
              </div>
            </div>

            {/* Channel Toggles */}
            <div className="ml-8 space-y-4">
              {/* SMS Toggle */}
              <div className="flex items-start justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">SMS (Twilio)</p>
                    <p className="text-xs text-gray-600 mt-1">Instant delivery, ~£0.20 per message</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getCurrentValue('settings.urgent_shift_notifications.sms_enabled', true)}
                    onChange={(e) => updateField('settings.urgent_shift_notifications.sms_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Email Toggle */}
              <div className="flex items-start justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Email (Resend)</p>
                    <p className="text-xs text-gray-600 mt-1">Free, detailed info + portal link, 1-5 min delay</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getCurrentValue('settings.urgent_shift_notifications.email_enabled', false)}
                    onChange={(e) => updateField('settings.urgent_shift_notifications.email_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              {/* WhatsApp Toggle */}
              <div className="flex items-start justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">WhatsApp (Meta)</p>
                    <p className="text-xs text-gray-600 mt-1">Free, instant, rich formatting</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getCurrentValue('settings.urgent_shift_notifications.whatsapp_enabled', false)}
                    onChange={(e) => updateField('settings.urgent_shift_notifications.whatsapp_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Manual Override Toggle */}
              <div className="flex items-start justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start gap-3">
                  <Settings className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Allow Manual Override</p>
                    <p className="text-xs text-gray-600 mt-1">Let admins choose channels per broadcast</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getCurrentValue('settings.urgent_shift_notifications.allow_manual_override', true)}
                    onChange={(e) => updateField('settings.urgent_shift_notifications.allow_manual_override', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <p className="text-xs text-red-700 mt-3 bg-red-100 p-2 rounded">
                💡 <strong>Testing Mode:</strong> Enable all 3 channels to test, then disable unwanted ones for production. Manual override lets you choose channels per broadcast.
              </p>
            </div>
          </div>

          {/* Existing Alert moved here */}
          <Alert className="border-cyan-300 bg-cyan-50">
            <Info className="h-5 w-5 text-cyan-600" />
            <AlertDescription className="text-cyan-900">
              <strong>🚀 Premium Features:</strong> Your agency has access to all automation and intelligence features. 
              These are designed to save you hours every day while ensuring compliance and profitability.
            </AlertDescription>
          </Alert>

          {/* Existing FeatureCard grid moved here */}
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard
              icon={Shield}
              title="Compliance Automation"
              description="Auto-monitors DBS, training certificates, and documents. Sends 30/14/7-day expiry reminders."
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            
            <FeatureCard
              icon={Zap}
              title="Smart Shift Matching"
              description="AI-powered staff matching based on skills, location, availability, and past performance."
              color="text-purple-600"
              bgColor="bg-purple-50"
            />
            
            <FeatureCard
              icon={DollarSign}
              title="Automated Invoicing"
              description="Auto-generates invoices from approved timesheets. Sends payment reminders automatically."
              color="text-green-600"
              bgColor="bg-green-50"
            />
            
            <FeatureCard
              icon={Bell}
              title="Multi-Channel Notifications"
              description="Email, SMS, and WhatsApp notifications for shifts, timesheets, and compliance updates."
              color="text-orange-600"
              bgColor="bg-orange-50"
            />
          </div>

          {/* Existing Invoice Configuration moved here */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Invoice Configuration</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Frequency</p>
                <p className="font-medium text-gray-900">{agency.invoice_frequency || 'Weekly'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Terms</p>
                <p className="font-medium text-gray-900">{agency.payment_terms_days || 30} days</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Integration Status</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <IntegrationStatus name="Twilio (SMS)" status="active" description="Send shift confirmations and reminders via SMS" />
          <IntegrationStatus name="WhatsApp Business" status="active" description="Staff can respond to shifts via WhatsApp" />
          <IntegrationStatus name="Resend (Email)" status="active" description="Professional email notifications and invoices" />
          <IntegrationStatus name="OpenAI (AI)" status="active" description="Intelligent shift matching and automation" />
        </CardContent>
      </Card>

      {/* Bottom Save Button */}
      {hasUnsavedChanges && (
        <div className="flex justify-end gap-3 sticky bottom-6 z-10">
          <Button 
            variant="outline" 
            onClick={resetChanges}
            size="lg"
            disabled={updateAgencyMutation.isPending}
            className="bg-white shadow-lg"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Discard Changes
          </Button>
          <Button 
            onClick={handleSaveChanges} 
            size="lg"
            className="bg-cyan-600 hover:bg-cyan-700 shadow-lg"
            disabled={updateAgencyMutation.isPending}
          >
            {updateAgencyMutation.isPending ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save All Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Reusable Components

function FeatureCard({ icon: Icon, title, description, color, bgColor }) {
  return (
    <div className={`${bgColor} border border-gray-200 rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <div className={`${bgColor} rounded-lg p-2`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
          <Badge className="mt-2 bg-green-100 text-green-800 text-xs">
            ✓ Active
          </Badge>
        </div>
      </div>
    </div>
  );
}

function IntegrationStatus({ name, status, description }) {
  const isActive = status === 'active';
  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${
      isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${
          isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
        }`}></div>
        <div>
          <p className={`font-medium ${isActive ? 'text-green-900' : 'text-gray-900'}`}>
            {name}
          </p>
          <p className={`text-xs ${isActive ? 'text-green-700' : 'text-gray-600'}`}>
            {description}
          </p>
        </div>
      </div>
      <Badge className={`${isActive ? 'bg-green-600' : 'bg-gray-600'} text-white text-xs`}>
        {isActive ? '✓ Connected' : '○ Inactive'}
      </Badge>
    </div>
  );
}
