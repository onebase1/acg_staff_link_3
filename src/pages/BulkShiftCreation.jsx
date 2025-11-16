import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Import step components
import Step1ClientSetup from "@/components/bulk-shifts/Step1ClientSetup";
import RoleSelector from "@/components/bulk-shifts/RoleSelector";
import Step2MultiRoleGrid from "@/components/bulk-shifts/Step2MultiRoleGrid";
import Step3PreviewTable from "@/components/bulk-shifts/Step3PreviewTable";

// Import utilities
import { expandGridToShifts, prepareShiftsForInsert } from "@/utils/bulkShifts/shiftGenerator";
import { validateBulkShifts } from "@/utils/bulkShifts/validation";
import { getClientRates } from "@/utils/clientHelpers";

export default function BulkShiftCreation() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentAgency, setCurrentAgency] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  // Form data state
  const [formData, setFormData] = useState({
    // Step 1
    client_id: '',
    client: null,
    dateRange: {
      startDate: '',
      endDate: ''
    },
    shiftTimes: {
      day: { start: '08:00', end: '20:00' },
      night: { start: '20:00', end: '08:00' }
    },
    ratesByRole: {},
    break_duration_minutes: 0,
    location_options: [],

    // Step 2
    activeRoles: [],
    gridData: {},

    // Step 3
    generatedShifts: [],
    validation: { errors: [], warnings: [], isValid: false },

    // Additional
    work_location_within_site: '',
    urgency: 'normal',
    notes: ''
  });

  // RBAC Check
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError || !authUser) {
          console.error('❌ Not authenticated:', authError);
          toast.error('Authentication failed. Please log in again.');
          navigate(createPageUrl('Home'));
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profile) {
          console.error('❌ Profile not found:', profileError);
          toast.error('Profile not found. Please log in again.');
          navigate(createPageUrl('Home'));
          return;
        }

        setUser(profile);

        // Block staff members from accessing this page
        if (profile.user_type === 'staff_member') {
          toast.error('Access Denied: This page is for agency admins only');
          navigate(createPageUrl('StaffPortal'));
          return;
        }

        setCurrentAgency(profile.agency_id);
        console.log('✅ Bulk Shift Creation - Agency:', profile.agency_id);

        setLoading(false);
      } catch (error) {
        console.error("Auth error:", error);
        toast.error('Authentication failed. Please log in again.');
        navigate(createPageUrl('Home'));
      }
    };
    checkAccess();
  }, [navigate]);

  // Generate shifts for preview (Step 2 → Step 3)
  const handleGeneratePreview = () => {
    if (!formData.client_id || !formData.activeRoles || !formData.gridData) {
      toast.error('Please complete all required fields');
      return;
    }

    // Expand grid to individual shifts
    const shifts = expandGridToShifts(
      formData.gridData,
      formData.activeRoles,
      formData.client,
      formData,
      currentAgency,
      user
    );

    // Validate shifts
    const validation = validateBulkShifts(shifts);

    // Update form data
    setFormData(prev => ({
      ...prev,
      generatedShifts: shifts,
      validation: validation
    }));

    // Move to step 4 (Preview)
    setCurrentStep(4);
  };

  // Handle shift update from edit modal
  const handleShiftUpdate = (updatedShift) => {
    // Find and replace the shift in generatedShifts array
    const updatedShifts = formData.generatedShifts.map(shift => {
      // Match by _tempId if available, otherwise by all key fields
      if (shift._tempId && shift._tempId === updatedShift._tempId) {
        return updatedShift;
      }
      // Fallback: match by date, role, and start_time
      if (
        shift.date === updatedShift.date &&
        shift.role === updatedShift.role &&
        shift.start_time === updatedShift.start_time &&
        !updatedShift._tempId
      ) {
        return { ...updatedShift, _tempId: shift._tempId };
      }
      return shift;
    });

    // Re-validate after update
    const validation = validateBulkShifts(updatedShifts);

    // Update form data
    setFormData(prev => ({
      ...prev,
      generatedShifts: updatedShifts,
      validation: validation
    }));

    toast.success('Shift updated successfully');
  };

  // Create shifts in database
  const handleCreateShifts = async () => {
    if (!formData.validation.isValid || formData.generatedShifts.length === 0) {
      toast.error('Cannot create shifts: Validation errors present');
      return;
    }

    setIsCreating(true);
    setCreationProgress(0);

    try {
      // Prepare shifts (remove temp fields)
      const shiftsToInsert = prepareShiftsForInsert(formData.generatedShifts);

      // Batch insert (50 shifts per batch)
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < shiftsToInsert.length; i += batchSize) {
        batches.push(shiftsToInsert.slice(i, i + batchSize));
      }

      let totalInserted = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        const { data, error } = await supabase
          .from('shifts')
          .insert(batch)
          .select();

        if (error) {
          console.error('❌ Batch insert error:', error);
          throw new Error(`Failed to insert batch ${i + 1}: ${error.message}`);
        }

        totalInserted += data.length;
        setCreationProgress(((i + 1) / batches.length) * 100);
      }

      // Success
      setCreatedCount(totalInserted);
      setIsCreating(false);
      setShowSuccess(true);

      toast.success(`🎉 Successfully created ${totalInserted} shifts!`);

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        navigate(createPageUrl('Shifts'));
      }, 3000);

    } catch (error) {
      console.error('❌ Error creating shifts:', error);
      toast.error(`Failed to create shifts: ${error.message}`);
      setIsCreating(false);
      setCreationProgress(0);
    }
  };

  // Navigation handlers
  const handleStep1Next = () => {
    if (!formData.client_id || !formData.dateRange.startDate || !formData.dateRange.endDate) {
      toast.error('Please select a client and date range');
      return;
    }
    setCurrentStep(2); // Go to role selection
  };

  const handleRoleSelectorContinue = (roleConfigs) => {
    // Build activeRoles from role configurations
    // Must match Step2MultiRoleGrid expected format: {key, label, role, shiftType, payRate, chargeRate}
    const activeRoles = [];

    roleConfigs.forEach(config => {
      // Get rates using getClientRates helper (handles role normalization)
      // This ensures we get rates even if client uses 'hca' instead of 'healthcare_assistant'

      if (config.includeDay) {
        const dayRates = getClientRates(formData.client, config.role, 'day');
        activeRoles.push({
          key: `${config.role}_day`,
          label: `${config.role.replace(/_/g, ' ')} Day`,
          role: config.role,
          shiftType: 'day',
          payRate: dayRates.pay_rate,
          chargeRate: dayRates.charge_rate
        });
      }
      if (config.includeNight) {
        const nightRates = getClientRates(formData.client, config.role, 'night');
        activeRoles.push({
          key: `${config.role}_night`,
          label: `${config.role.replace(/_/g, ' ')} Night`,
          role: config.role,
          shiftType: 'night',
          payRate: nightRates.pay_rate,
          chargeRate: nightRates.charge_rate
        });
      }
    });

    setFormData(prev => ({
      ...prev,
      activeRoles: activeRoles
    }));

    setCurrentStep(3); // Go to grid
  };

  const handleStep2Back = () => {
    setCurrentStep(1);
  };

  const handleStep3Back = () => {
    setCurrentStep(2); // Back to role selection
  };

  const handleStep4Back = () => {
    setCurrentStep(3); // Back to grid
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  // Success screen
  if (showSuccess) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-12">
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-emerald-700 mb-3">
              Success!
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Created {createdCount} shifts successfully
            </p>
            <div className="space-y-3 text-sm text-gray-600 mb-8">
              <p>All shifts have been added to the system.</p>
              <p>Redirecting to Shifts page...</p>
            </div>
            <Button
              size="lg"
              onClick={() => navigate(createPageUrl('Shifts'))}
            >
              Go to Shifts Now →
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Bulk Shift Creation</h1>
          <p className="text-gray-600">Create multiple shifts across dates and roles</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3, 4].map((step) => (
          <React.Fragment key={step}>
            <div className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  currentStep === step
                    ? 'bg-cyan-600 text-white'
                    : currentStep > step
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {currentStep > step ? '✓' : step}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {step === 1 ? 'Setup' : step === 2 ? 'Roles' : step === 3 ? 'Grid' : 'Preview'}
              </span>
            </div>
            {step < 4 && <div className="w-12 h-0.5 bg-gray-300"></div>}
          </React.Fragment>
        ))}
      </div>

      {/* Step Components */}
      {currentStep === 1 && (
        <Step1ClientSetup
          currentAgency={currentAgency}
          formData={formData}
          setFormData={setFormData}
          onNext={handleStep1Next}
        />
      )}

      {currentStep === 2 && (
        <RoleSelector
          client={formData.client}
          onContinue={handleRoleSelectorContinue}
        />
      )}

      {currentStep === 3 && (
        <Step2MultiRoleGrid
          formData={formData}
          setFormData={setFormData}
          onBack={handleStep3Back}
          onNext={handleGeneratePreview}
          currentAgency={currentAgency}
        />
      )}

      {currentStep === 4 && (
        <Step3PreviewTable
          shifts={formData.generatedShifts}
          validation={formData.validation}
          onBack={handleStep4Back}
          onCreate={handleCreateShifts}
          onShiftUpdate={handleShiftUpdate}
          isCreating={isCreating}
          creationProgress={creationProgress}
        />
      )}
    </div>
  );
}
