
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Building2, FileCheck, DollarSign, MapPin, CheckCircle, AlertCircle,
  ArrowRight, ArrowLeft, X, Plus
} from "lucide-react";
import { toast } from "sonner";

export default function OnboardClient() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [newLocation, setNewLocation] = useState('');
  const [requiresLocationTracking, setRequiresLocationTracking] = useState(false);
  const [selectedAgencyId, setSelectedAgencyId] = useState(null); // ✅ NEW: For super admin agency selection

  // ✅ NEW: Fetch agencies for super admin
  const { data: agencies = [] } = useQuery({
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
    enabled: !!user && (user.email === 'g.basera@yahoo.com' || localStorage.getItem('admin_view_mode') === 'super_admin'),
    refetchOnMount: 'always'
  });

  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    type: 'care_home',
    contact_person: { name: '', email: '', phone: '', role: '' },
    billing_email: '',
    
    // Step 2: Address & Location
    address: { line1: '', line2: '', city: '', postcode: '' },
    internal_locations: [],
    
    // Step 3: Contract Terms
    contract_received: false,
    contract_start_date: '',
    contract_reference: '',
    require_location_specification: false,
    payment_terms: 'net_30',
    break_duration_minutes: 0,
    
    // Step 4: Rate Configuration
    rate_model: 'simple', // 'simple' or 'advanced'
    
    // Simple rates (legacy backward compatible)
    simple_rates: {
      nurse: { pay_rate: 0, charge_rate: 0 },
      hca: { pay_rate: 0, charge_rate: 0 },
      support_worker: { pay_rate: 0, charge_rate: 0 },
      senior_carer: { pay_rate: 0, charge_rate: 0 }
    },
    
    // Advanced rates (Dominion-style)
    advanced_rates: {
      nurse: {
        weekday_day: { pay_rate: 0, charge_rate: 0 },
        weekday_night: { pay_rate: 0, charge_rate: 0 },
        weekend_day: { pay_rate: 0, charge_rate: 0 },
        weekend_night: { pay_rate: 0, charge_rate: 0 },
        bank_holiday: { pay_rate: 0, charge_rate: 0, multiplier: 'time_and_half' }
      },
      hca: {
        weekday_day: { pay_rate: 0, charge_rate: 0 },
        weekday_night: { pay_rate: 0, charge_rate: 0 },
        weekend_day: { pay_rate: 0, charge_rate: 0 },
        weekend_night: { pay_rate: 0, charge_rate: 0 },
        bank_holiday: { pay_rate: 0, charge_rate: 0, multiplier: 'time_and_half' }
      },
      support_worker: {
        weekday_day: { pay_rate: 0, charge_rate: 0 },
        weekday_night: { pay_rate: 0, charge_rate: 0 },
        weekend_day: { pay_rate: 0, charge_rate: 0 },
        weekend_night: { pay_rate: 0, charge_rate: 0 },
        bank_holiday: { pay_rate: 0, charge_rate: 0, multiplier: 'time_and_half' }
      },
      senior_carer: {
        weekday_day: { pay_rate: 0, charge_rate: 0 },
        weekday_night: { pay_rate: 0, charge_rate: 0 },
        weekend_day: { pay_rate: 0, charge_rate: 0 },
        weekend_night: { pay_rate: 0, charge_rate: 0 },
        bank_holiday: { pay_rate: 0, charge_rate: 0, multiplier: 'time_and_half' }
      }
    }
  });

  useEffect(() => {
    const checkAccess = async () => {
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

        if (currentUser.user_type === 'staff_member') {
          toast.error('Access Denied');
          navigate(createPageUrl('StaffPortal'));
          return;
        }

        // ✅ FIX: Set agency_id based on user type
        const isSuperAdmin = currentUser.email === 'g.basera@yahoo.com' || localStorage.getItem('admin_view_mode') === 'super_admin';
        
        if (!isSuperAdmin && currentUser.agency_id) {
          setSelectedAgencyId(currentUser.agency_id);
        }
      } catch (error) {
        toast.error('Authentication failed');
        navigate(createPageUrl('Home'));
      }
    };
    checkAccess();
  }, [navigate]);

  const createClientMutation = useMutation({
    mutationFn: async (clientData) => {
      // ✅ NEW: Send welcome email after client creation
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert({
          ...clientData,
          created_date: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Send welcome email
      try {
        const agency = agencies.find(a => a.id === clientData.agency_id);
        
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: clientData.contact_person.email,
            subject: `Welcome to ${agency?.name || 'Our Agency'} - Contract Confirmed`,
            from_name: agency?.name || 'ACG StaffLink',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Welcome to ${agency?.name || 'Our Agency'}!</h1>
              </div>
              
              <div style="padding: 30px; background: #f8fafc;">
                <p style="font-size: 16px; color: #334155;">Dear ${clientData.contact_person.name || 'Care Home Manager'},</p>
                
                <p style="font-size: 16px; color: #334155;">
                  Thank you for choosing ${agency?.name || 'our agency'} as your staffing partner. We're excited to begin working with <strong>${clientData.name}</strong>.
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0284c7;">
                  <h3 style="margin-top: 0; color: #0284c7;">📋 Contract Summary</h3>
                  <ul style="color: #475569; line-height: 1.8;">
                    <li><strong>Facility:</strong> ${clientData.name}</li>
                    <li><strong>Type:</strong> ${clientData.type.replace('_', ' ')}</li>
                    <li><strong>Start Date:</strong> ${clientData.contract_terms.contract_start_date}</li>
                    <li><strong>Payment Terms:</strong> ${clientData.payment_terms.replace('_', ' ')}</li>
                    ${clientData.contract_terms.contract_reference ? `<li><strong>Contract Reference:</strong> ${clientData.contract_terms.contract_reference}</li>` : ''}
                  </ul>
                </div>
                
                <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #0369a1;">🚀 Next Steps</h3>
                  <ol style="color: #475569; line-height: 1.8;">
                    <li>Our team will contact you within 24 hours to finalize operational details</li>
                    <li>You'll receive shift confirmation notifications via email</li>
                    <li>Invoices will be sent ${clientData.payment_terms === 'net_7' ? 'weekly' : clientData.payment_terms === 'net_14' ? 'bi-weekly' : 'monthly'}</li>
                    <li>You can reach us anytime at ${agency?.contact_email || 'info@agency.com'} or ${agency?.contact_phone || ''}</li>
                  </ol>
                </div>
                
                <p style="font-size: 16px; color: #334155;">
                  We look forward to providing exceptional care staff for your facility.
                </p>
                
                <p style="font-size: 16px; color: #334155; margin-top: 30px;">
                  Best regards,<br>
                  <strong>${agency?.name || 'The Team'}</strong><br>
                  ${agency?.contact_email || ''}<br>
                  ${agency?.contact_phone || ''}
                </p>
              </div>
              
              <div style="background: #1e293b; padding: 20px; text-align: center;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  This is an automated message from ACG StaffLink. Please do not reply directly to this email.
                </p>
              </div>
            </div>
          `
          }
        });
        
        console.log('✅ Welcome email sent to', clientData.contact_person.email);
      } catch (emailError) {
        console.error('⚠️ Failed to send welcome email:', emailError);
        // Don't fail the entire operation if email fails
      }
      
      return newClient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      toast.success('✅ Client onboarded successfully! Welcome email sent.');
      navigate(createPageUrl('Clients'));
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const handleAddLocation = () => {
    if (!newLocation.trim()) {
      toast.error('Please enter a location');
      return;
    }

    if (formData.internal_locations.includes(newLocation.trim())) {
      toast.error('Location already added');
      return;
    }

    setFormData(prev => ({
      ...prev,
      internal_locations: [...prev.internal_locations, newLocation.trim()]
    }));
    setNewLocation('');
    toast.success(`✅ Added "${newLocation.trim()}"`);
  };

  const handleRemoveLocation = (location) => {
    setFormData(prev => ({
      ...prev,
      internal_locations: prev.internal_locations.filter(loc => loc !== location)
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.name || !formData.contact_person.email) {
          toast.error('Client name and contact email required');
          return false;
        }
        
        // ✅ NEW: Validate agency selection for super admin
        const isSuperAdmin = user?.email === 'g.basera@yahoo.com' || localStorage.getItem('admin_view_mode') === 'super_admin';
        if (isSuperAdmin && !selectedAgencyId) {
          toast.error('Please select an agency for this client');
          return false;
        }
        
        return true;
      
      case 2:
        // Address optional, but locations recommended
        return true;
      
      case 3:
        if (!formData.contract_received) {
          toast.error('Please confirm contract receipt');
          return false;
        }
        if (!formData.contract_start_date) {
          toast.error('Contract start date required');
          return false;
        }
        return true;
      
      case 4:
        // Validate rates configured
        if (formData.rate_model === 'simple') {
          const hasRates = Object.values(formData.simple_rates).some(
            role => role.charge_rate > 0 && role.pay_rate > 0
          );
          if (!hasRates) {
            toast.error('Configure at least one role with rates');
            return false;
          }
        } else {
          const hasRates = Object.values(formData.advanced_rates).some(
            role => Object.values(role).some(rateType => rateType.charge_rate > 0)
          );
          if (!hasRates) {
            toast.error('Configure at least one role with rates');
            return false;
          }
        }
        return true;
      
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (!validateStep(4)) return;

    // ✅ FIX: Use selectedAgencyId for super admin, user.agency_id otherwise
    const isSuperAdmin = user.email === 'g.basera@yahoo.com' || localStorage.getItem('admin_view_mode') === 'super_admin';
    const agencyId = isSuperAdmin ? selectedAgencyId : user.agency_id;

    if (!agencyId) {
      toast.error('No agency selected - cannot create client');
      return;
    }

    const clientData = {
      agency_id: agencyId,
      name: formData.name,
      type: formData.type,
      contact_person: formData.contact_person,
      billing_email: formData.billing_email || formData.contact_person.email,
      address: formData.address,
      internal_locations: formData.internal_locations,
      payment_terms: formData.payment_terms,
      status: 'active',
      contract_terms: {
        contract_received: formData.contract_received,
        contract_received_date: new Date().toISOString().split('T')[0],
        contract_received_by: user.id,
        contract_start_date: formData.contract_start_date,
        contract_reference: formData.contract_reference,
        require_location_specification: formData.require_location_specification,
        break_duration_minutes: formData.break_duration_minutes,
        
        // Legacy simple rates (backward compatible)
        rates_by_role: formData.rate_model === 'simple' ? formData.simple_rates : {},
        
        // Advanced rate card
        advanced_rate_card: formData.rate_model === 'advanced' ? {
          enabled: true,
          rate_structure: formData.advanced_rates,
          night_shift_hours: {
            start: '20:00',
            end: '08:00'
          }
        } : { enabled: false }
      }
    };

    console.log('📤 Creating client:', clientData);
    createClientMutation.mutate(clientData);
  };

  const progress = (currentStep / 5) * 100;

  const steps = [
    { num: 1, title: 'Basic Info', icon: Building2 },
    { num: 2, title: 'Locations', icon: MapPin },
    { num: 3, title: 'Contract', icon: FileCheck },
    { num: 4, title: 'Rates', icon: DollarSign },
    { num: 5, title: 'Review', icon: CheckCircle }
  ];

  // ✅ NEW: Check if user is super admin
  const isSuperAdmin = user?.email === 'g.basera@yahoo.com' || localStorage.getItem('admin_view_mode') === 'super_admin';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Onboard New Client</h2>
        <p className="text-gray-600 mt-1">Complete contract setup with advanced rate configuration</p>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isCompleted = currentStep > step.num;
              
              return (
                <React.Fragment key={step.num}>
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-green-600' :
                      isActive ? 'bg-cyan-600' : 'bg-gray-300'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <Icon className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <p className={`text-xs mt-2 font-medium ${
                      isActive ? 'text-cyan-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      currentStep > step.num ? 'bg-green-600' : 'bg-gray-300'
                    }`}></div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            {React.createElement(steps[currentStep - 1].icon, { className: 'w-6 h-6 text-cyan-600' })}
            Step {currentStep}: {steps[currentStep - 1].title}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Enter client facility details'}
            {currentStep === 2 && 'Define internal locations within the care home'}
            {currentStep === 3 && 'Confirm contract terms and receipt'}
            {currentStep === 4 && 'Configure pay and charge rates per role'}
            {currentStep === 5 && 'Review and confirm all details'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {/* STEP 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* ✅ NEW: Agency selector for super admin */}
              {isSuperAdmin && (
                <Alert className="border-purple-300 bg-purple-50">
                  <AlertCircle className="h-4 w-4 text-purple-600" />
                  <AlertDescription>
                    <strong>⭐ Super Admin Mode:</strong> Select which agency this client belongs to
                  </AlertDescription>
                </Alert>
              )}

              {isSuperAdmin && (
                <div>
                  <Label htmlFor="agency">Agency *</Label>
                  <select
                    id="agency"
                    value={selectedAgencyId || ''}
                    onChange={(e) => setSelectedAgencyId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">-- Select Agency --</option>
                    {agencies.map(agency => (
                      <option key={agency.id} value={agency.id}>
                        {agency.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <Label htmlFor="name">Client Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Divine Care Centre"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="type">Facility Type</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="care_home">Care Home</option>
                  <option value="nursing_home">Nursing Home</option>
                  <option value="hospital">Hospital</option>
                  <option value="residential_care">Residential Care</option>
                  <option value="supported_living">Supported Living</option>
                  <option value="home_care">Home Care</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_name">Contact Person Name</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_person.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      contact_person: {...formData.contact_person, name: e.target.value}
                    })}
                    placeholder="e.g., Lisa Nausbet"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_role">Contact Role</Label>
                  <Input
                    id="contact_role"
                    value={formData.contact_person.role}
                    onChange={(e) => setFormData({
                      ...formData,
                      contact_person: {...formData.contact_person, role: e.target.value}
                    })}
                    placeholder="e.g., Care Home Manager"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="contact_email">Contact Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_person.email}
                  onChange={(e) => setFormData({
                    ...formData,
                    contact_person: {...formData.contact_person, email: e.target.value}
                  })}
                  placeholder="manager@divinecare.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_person.phone}
                  onChange={(e) => setFormData({
                    ...formData,
                    contact_person: {...formData.contact_person, phone: e.target.value}
                  })}
                  placeholder="01234567890"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="billing_email">Billing Email (if different)</Label>
                <Input
                  id="billing_email"
                  type="email"
                  value={formData.billing_email}
                  onChange={(e) => setFormData({...formData, billing_email: e.target.value})}
                  placeholder="accounts@divinecare.com"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Address & Locations */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4">Facility Address</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address_line1">Address Line 1</Label>
                    <Input
                      id="address_line1"
                      value={formData.address.line1}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: {...formData.address, line1: e.target.value}
                      })}
                      placeholder="Station Town"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="address_city">City</Label>
                      <Input
                        id="address_city"
                        value={formData.address.city}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: {...formData.address, city: e.target.value}
                        })}
                        placeholder="Wingate"
                        className="mt-1"
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
                        placeholder="TS28 5DP"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ NEW: Conditional Location Tracking */}
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="requires_location_tracking"
                    checked={requiresLocationTracking}
                    onChange={(e) => {
                      setRequiresLocationTracking(e.target.checked);
                      if (!e.target.checked) {
                        // Clear locations if unchecked
                        setFormData({...formData, internal_locations: []});
                      }
                    }}
                    className="w-5 h-5 mt-1"
                  />
                  <Label htmlFor="requires_location_tracking" className="cursor-pointer flex-1">
                    <strong>📍 Will staff work at different locations within this facility?</strong>
                    <p className="text-xs text-blue-800 mt-1">
                      Examples: Specific rooms (Room 14, Room 20), buildings (North Wing, South Block), or areas (Lounge, Dining Room). 
                      <strong className="block mt-1">Only needed if client requires location details on timesheets/invoices.</strong>
                    </p>
                  </Label>
                </div>
              </div>

              {/* ✅ CONDITIONAL: Only show location input if checkbox is ticked */}
              {requiresLocationTracking && (
                <div>
                  <h3 className="font-semibold mb-2">Internal Locations (Rooms/Units)</h3>
                  <Alert className="mb-4">
                    <MapPin className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Pre-define all rooms/units where staff will work. These appear on shifts, timesheets, and invoices.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2 mb-4">
                    <Input
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="e.g., Room 14, Room 20, Lounge, Dining Room"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddLocation();
                        }
                      }}
                    />
                    <Button type="button" onClick={handleAddLocation}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  {formData.internal_locations.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {formData.internal_locations.map((location, idx) => (
                        <Badge
                          key={idx}
                          className="bg-cyan-100 text-cyan-800 px-3 py-1.5 flex items-center gap-2"
                        >
                          📍 {location}
                          <button
                            type="button"
                            onClick={() => handleRemoveLocation(location)}
                            className="hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No locations added yet - Add at least 2-3 common work areas</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Contract Terms */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Alert className="border-amber-300 bg-amber-50">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-900">
                  <strong>CRITICAL:</strong> Confirm you have received and reviewed the signed contract via email. Do not proceed without a valid contract.
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <input
                  type="checkbox"
                  id="contract_received"
                  checked={formData.contract_received}
                  onChange={(e) => setFormData({...formData, contract_received: e.target.checked})}
                  className="w-5 h-5"
                />
                <Label htmlFor="contract_received" className="cursor-pointer flex-1">
                  <strong>✅ I confirm I have received and reviewed the signed contract via email</strong>
                  <p className="text-xs text-green-800 mt-1">
                    Contract documents are stored in your email. Checkbox serves as audit trail.
                  </p>
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contract_start">Contract Start Date *</Label>
                  <Input
                    id="contract_start"
                    type="date"
                    value={formData.contract_start_date}
                    onChange={(e) => setFormData({...formData, contract_start_date: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="contract_ref">Contract Reference Number</Label>
                  <Input
                    id="contract_ref"
                    value={formData.contract_reference}
                    onChange={(e) => setFormData({...formData, contract_reference: e.target.value})}
                    placeholder="e.g., DHC-2025-001"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <select
                  id="payment_terms"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="net_7">Net 7 Days</option>
                  <option value="net_14">Net 14 Days</option>
                  <option value="net_30">Net 30 Days</option>
                  <option value="net_60">Net 60 Days</option>
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <input
                  type="checkbox"
                  id="require_location"
                  checked={formData.require_location_specification}
                  onChange={(e) => setFormData({...formData, require_location_specification: e.target.checked})}
                  className="w-5 h-5"
                />
                <Label htmlFor="require_location" className="cursor-pointer flex-1">
                  <strong>Require Location Specification</strong>
                  <p className="text-xs text-blue-800 mt-1">
                    If enabled, ALL shifts must specify exact room/unit. Prevents invoice disputes.
                  </p>
                </Label>
              </div>

              <div>
                <Label htmlFor="break_duration">Standard Break Duration (minutes)</Label>
                <Input
                  id="break_duration"
                  type="number"
                  value={formData.break_duration_minutes}
                  onChange={(e) => setFormData({...formData, break_duration_minutes: parseInt(e.target.value) || 0})}
                  placeholder="e.g., 30"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Rate Configuration */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <Label>Rate Configuration Model</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, rate_model: 'simple'})}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.rate_model === 'simple' 
                        ? 'border-cyan-600 bg-cyan-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <h3 className="font-semibold">Simple Rates</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Single rate per role (no day/night variations)
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, rate_model: 'advanced'})}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.rate_model === 'advanced' 
                        ? 'border-cyan-600 bg-cyan-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <h3 className="font-semibold">Advanced Rates ⭐</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Day/Night, Weekday/Weekend, Bank Holiday rates
                    </p>
                  </button>
                </div>
              </div>

              {formData.rate_model === 'simple' ? (
                // Simple Rate Entry
                <div className="space-y-4">
                  <Alert>
                    <DollarSign className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Enter single pay/charge rate per role. This rate applies to all shifts.
                    </AlertDescription>
                  </Alert>

                  {Object.keys(formData.simple_rates).map(role => (
                    <div key={role} className="p-4 bg-gray-50 border rounded-lg">
                      <h4 className="font-semibold mb-3 capitalize">{role.replace('_', ' ')}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Staff Pay Rate (£/hr)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.simple_rates[role].pay_rate || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              simple_rates: {
                                ...formData.simple_rates,
                                [role]: {
                                  ...formData.simple_rates[role],
                                  pay_rate: parseFloat(e.target.value) || 0
                                }
                              }
                            })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Client Charge Rate (£/hr)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.simple_rates[role].charge_rate || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              simple_rates: {
                                ...formData.simple_rates,
                                [role]: {
                                  ...formData.simple_rates[role],
                                  charge_rate: parseFloat(e.target.value) || 0
                                }
                              }
                            })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      {formData.simple_rates[role].charge_rate > 0 && formData.simple_rates[role].pay_rate > 0 && (
                        <p className="text-xs text-green-700 mt-2">
                          💰 Margin: £{(formData.simple_rates[role].charge_rate - formData.simple_rates[role].pay_rate).toFixed(2)}/hr 
                          ({((formData.simple_rates[role].charge_rate - formData.simple_rates[role].pay_rate) / formData.simple_rates[role].charge_rate * 100).toFixed(1)}%)
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // Advanced Rate Entry (Dominion-style)
                <div className="space-y-4">
                  <Alert className="border-purple-300 bg-purple-50">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-purple-900 text-sm">
                      <strong>Dominion-Style Rates:</strong> Configure 5 rate types per role (Weekday Day, Weekday Night, Weekend Day, Weekend Night, Bank Holiday)
                    </AlertDescription>
                  </Alert>

                  {/* Rate Entry for each role */}
                  {Object.keys(formData.advanced_rates).map(role => (
                    <details key={role} className="border rounded-lg">
                      <summary className="p-4 bg-gray-100 cursor-pointer font-semibold capitalize hover:bg-gray-200">
                        {role.replace('_', ' ')} Rates
                      </summary>
                      <div className="p-4 space-y-4">
                        {['weekday_day', 'weekday_night', 'weekend_day', 'weekend_night', 'bank_holiday'].map(rateType => (
                          <div key={rateType} className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded">
                            <div>
                              <Label className="text-xs capitalize">{rateType.replace('_', ' ')} - Pay Rate (£/hr)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={formData.advanced_rates[role][rateType].pay_rate || ''}
                                onChange={(e) => {
                                  const newRates = {...formData.advanced_rates};
                                  newRates[role][rateType].pay_rate = parseFloat(e.target.value) || 0;
                                  setFormData({...formData, advanced_rates: newRates});
                                }}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs capitalize">{rateType.replace('_', ' ')} - Charge Rate (£/hr)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={formData.advanced_rates[role][rateType].charge_rate || ''}
                                onChange={(e) => {
                                  const newRates = {...formData.advanced_rates};
                                  newRates[role][rateType].charge_rate = parseFloat(e.target.value) || 0;
                                  setFormData({...formData, advanced_rates: newRates});
                                }}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-900">
                  <strong>Ready to create!</strong> Review all details below before confirming.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 border rounded-lg">
                  <h3 className="font-semibold mb-2">Basic Information</h3>
                  <div className="text-sm space-y-1">
                    <p><strong>Client:</strong> {formData.name}</p>
                    <p><strong>Type:</strong> {formData.type.replace('_', ' ')}</p>
                    <p><strong>Contact:</strong> {formData.contact_person.name} ({formData.contact_person.email})</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border rounded-lg">
                  <h3 className="font-semibold mb-2">Contract Terms</h3>
                  <div className="text-sm space-y-1">
                    <p><strong>Contract Received:</strong> ✅ Yes</p>
                    <p><strong>Start Date:</strong> {formData.contract_start_date}</p>
                    <p><strong>Payment Terms:</strong> {formData.payment_terms.replace('_', ' ')}</p>
                    <p><strong>Location Required:</strong> {formData.require_location_specification ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border rounded-lg">
                  <h3 className="font-semibold mb-2">Rate Model</h3>
                  <p className="text-sm">
                    <strong>{formData.rate_model === 'simple' ? 'Simple Rates' : 'Advanced Rates (Dominion-Style)'}</strong>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {formData.rate_model === 'simple' 
                      ? 'Single rate per role applies to all shifts'
                      : '5 rate types per role (day/night, weekday/weekend, bank holiday)'}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 border rounded-lg">
                  <h3 className="font-semibold mb-2">Internal Locations</h3>
                  {formData.internal_locations.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {formData.internal_locations.map((loc, idx) => (
                        <Badge key={idx} className="bg-cyan-100 text-cyan-800">
                          📍 {loc}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No locations defined</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentStep < 5 ? (
          <Button onClick={nextStep}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createClientMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {createClientMutation.isPending ? 'Creating...' : 'Confirm & Create Client'}
            <CheckCircle className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
