
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Zap, AlertCircle, Building2, Info, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { NotificationService } from "../components/notifications/NotificationService";
import { Badge } from "@/components/ui/badge";
import { STAFF_ROLES } from "@/constants/staffRoles";
import { determineShiftType } from "@/utils/shiftHelpers";

/**
 * Get available roles for a client (only roles with charge_rate > 0)
 * Prevents billing errors by blocking shifts for roles without agreed rates
 * ✅ FIXED: STAFF_ROLES is an array, not an object
 */
const getAvailableRoles = (client) => {
  if (!client || !client.contract_terms?.rates_by_role) {
    console.log('❌ [getAvailableRoles] No client or rates_by_role:', {
      hasClient: !!client,
      hasContractTerms: !!client?.contract_terms,
      hasRatesByRole: !!client?.contract_terms?.rates_by_role
    });
    return [];
  }

  const ratesByRole = client.contract_terms.rates_by_role;
  const availableRoles = [];

  console.log('🔍 [getAvailableRoles] Client rates:', {
    clientName: client.name,
    ratesByRole,
    totalStaffRoles: STAFF_ROLES.length
  });

  // ✅ STAFF_ROLES is an array, iterate correctly
  STAFF_ROLES.forEach((roleData) => {
    // Try primary key first
    let rates = ratesByRole[roleData.value];
    let matchedKey = roleData.value;

    // ✅ If not found, check aliases (handles deprecated keys like 'care_worker', 'hca')
    if (!rates && roleData.aliases) {
      for (const alias of roleData.aliases) {
        if (ratesByRole[alias]) {
          rates = ratesByRole[alias];
          matchedKey = alias;
          console.log(`  ℹ️ [getAvailableRoles] Found ${roleData.value} via alias: ${alias}`);
          break;
        }
      }
    }

    console.log(`  → Checking ${roleData.value}:`, {
      hasRates: !!rates,
      matchedKey: matchedKey,
      chargeRate: rates?.charge_rate,
      payRate: rates?.pay_rate,
      willInclude: rates && rates.charge_rate > 0
    });

    // Only include if charge_rate > 0 (means client has agreed rate for this role)
    if (rates && rates.charge_rate > 0) {
      availableRoles.push({
        value: roleData.value,  // Use standard key, not alias
        label: roleData.label,
        icon: roleData.icon,
        pay_rate: rates.pay_rate,
        charge_rate: rates.charge_rate
      });
    }
  });

  console.log('✅ [getAvailableRoles] Available roles:', availableRoles.length, availableRoles.map(r => r.value));

  return availableRoles;
};

/**
 * Generate shift templates based on client's shift patterns
 * Returns only Day/Night options for the selected client (no clutter)
 */
const getClientShiftTemplates = (client) => {
  if (!client) {
    return [];
  }

  // Client-specific templates (only 2 options: Day and Night)
  return [
    {
      id: 'day',
      name: `Day (${client.day_shift_start || '08:00'}-${client.day_shift_end || '20:00'})`,
      start: client.day_shift_start || '08:00',
      end: client.day_shift_end || '20:00',
      hours: 12
    },
    {
      id: 'night',
      name: `Night (${client.night_shift_start || '20:00'}-${client.night_shift_end || '08:00'})`,
      start: client.night_shift_start || '20:00',
      end: client.night_shift_end || '08:00',
      hours: 12
    }
  ];
};

export default function PostShiftV2() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentAgency, setCurrentAgency] = useState(null);

  // ✅ REMOVED: Add location modal (locations managed in /clients only)
  const [formData, setFormData] = useState({
    client_id: '',
    role_required: '',
    date: '',
    shift_template: '',
    start_time: '08:00',
    end_time: '20:00',
    duration_hours: 12,
    work_location_within_site: '',
    pay_rate: 0,
    charge_rate: 0,
    break_duration_minutes: 0,
    urgency: 'normal',
    notes: ''
  });

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

        if (profile.user_type === 'staff_member') {
          toast.error('Access Denied: This page is for agency admins only');
          navigate(createPageUrl('StaffPortal'));
          return;
        }

        if (profile.agency_id) {
          setCurrentAgency(profile.agency_id);
        }

        setLoading(false);
      } catch (error) {
        console.error("Auth error:", error);
        toast.error('Authentication failed. Please log in again.');
        navigate(createPageUrl('Home'));
      }
    };
    checkAccess();
  }, [navigate]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', currentAgency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, type, contract_terms, internal_locations, day_shift_start, day_shift_end, night_shift_start, night_shift_end')
        .eq('agency_id', currentAgency)
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies', currentAgency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', currentAgency)
        .single();

      if (error) {
        console.error('❌ Error fetching agency:', error);
        return [];
      }
      return data ? [data] : [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const selectedClient = clients.find(c => c.id === formData.client_id);
  const locationRequired = selectedClient?.contract_terms?.require_location_specification || false;

  // Get available roles and shift templates for selected client
  const availableRoles = getAvailableRoles(selectedClient);
  const shiftTemplates = getClientShiftTemplates(selectedClient);

  // ✅ When client changes, reset dependent fields and populate with client defaults
  useEffect(() => {
    if (formData.client_id) {
      const client = clients.find(c => c.id === formData.client_id);

      if (client) {
        const availableRolesForClient = getAvailableRoles(client);
        const templates = getClientShiftTemplates(client);

        // Get first available role (or empty if none)
        const firstRole = availableRolesForClient[0];
        const dayShift = templates[0]; // First template is always day shift

        setFormData(prev => ({
          ...prev,
          // Reset role and template when client changes
          role_required: firstRole?.value || '',
          shift_template: dayShift ? 'day' : '',
          // Set rates from first available role
          pay_rate: firstRole?.pay_rate || 0,
          charge_rate: firstRole?.charge_rate || 0,
          break_duration_minutes: client.contract_terms?.break_duration_minutes || 0,
          // Update shift times to match client's day shift pattern
          start_time: dayShift?.start || '08:00',
          end_time: dayShift?.end || '20:00',
          duration_hours: dayShift?.hours || 12
        }));
      }
    } else {
      // Reset when no client selected
      setFormData(prev => ({
        ...prev,
        role_required: '',
        shift_template: '',
        pay_rate: 0,
        charge_rate: 0
      }));
    }
  }, [formData.client_id, clients]);

  // ✅ When role changes, update rates
  useEffect(() => {
    if (formData.client_id && formData.role_required) {
      const client = clients.find(c => c.id === formData.client_id);
      if (client) {
        const rates = client.contract_terms?.rates_by_role?.[formData.role_required];
        if (rates) {
          setFormData(prev => ({
            ...prev,
            pay_rate: rates.pay_rate || 0,
            charge_rate: rates.charge_rate || 0
          }));
        }
      }
    }
  }, [formData.role_required, formData.client_id, clients]);

  const applyTemplate = (templateId) => {
    const template = shiftTemplates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        shift_template: templateId,
        start_time: template.start,
        end_time: template.end,
        duration_hours: template.hours
      }));
    }
  };

  // Removed calculateDuration and custom template logic
  // All shifts now use client-specific Day/Night templates only

  // ✅ REMOVED: updateClientMutation - locations managed in /clients only

  const createShiftMutation = useMutation({
    mutationFn: async (shiftData) => {
      const agencyId = currentAgency;
      if (!agencyId) throw new Error('Agency ID not found');
      
      console.log('📝 [Create Shift] Starting shift creation with data:', {
        urgency: shiftData.urgency,
        client_id: shiftData.client_id,
        role: shiftData.role_required
      });

      // ✅ CRITICAL FIX: Extract date and times, remove fields that cause issues
      // Remove: shift_template (doesn't exist in DB), duration_hours (causes ROUND() errors)
      const { shift_template, date, start_time, end_time, duration_hours, ...restData } = shiftData;

      // ✅ FIX: Database expects HH:MM format (TEXT), NOT full timestamps
      // start_time and end_time are already in HH:MM format from formData
      // Just use them directly

      // Build full timestamp temporarily for shift_type determination only
      const startTimestamp = `${date}T${start_time}:00`;

      // ✅ Determine shift_type from start_time
      const shift_type = determineShiftType(startTimestamp);

      const { data: newShift, error: shiftError } = await supabase
        .from('shifts')
        .insert({
          ...restData,
          date: date,                    // "2025-11-12"
          start_time: start_time,        // ✅ FIXED: Send HH:MM only (e.g., "08:00")
          end_time: end_time,            // ✅ FIXED: Send HH:MM only (e.g., "20:00")
          shift_type: shift_type,        // "day" or "night"
          agency_id: agencyId,
          status: 'open',
          shift_journey_log: [{
            state: 'created',
            timestamp: new Date().toISOString(),
            user_id: user?.id,
            method: 'manual' // Always 'manual' as broadcast logic is removed from this page
          }],
          created_date: new Date().toISOString()
        })
        .select()
        .single();

      if (shiftError) {
        console.error('❌ [Create Shift] Error:', shiftError);
        throw shiftError;
      }

      console.log('✅ [Create Shift] Shift created successfully:', newShift.id);

      // ✅ REMOVED: Broadcast logic removed from PostShiftV2
      // Broadcasts should only happen from /Shifts page to save SMS costs
      // Admin can assign staff or add to marketplace from /Shifts

      if (shiftData.urgency === 'urgent' || shiftData.urgency === 'critical') {
        const { error: workflowError } = await supabase
          .from('admin_workflows')
          .insert({
            agency_id: agencyId,
            type: 'unfilled_urgent_shift',
            priority: shiftData.urgency === 'critical' ? 'critical' : 'high',
            status: 'pending',
            title: `Urgent shift - ${clients.find(c => c.id === shiftData.client_id)?.name}`,
          description: `${shiftData.role_required} needed`,
          related_entity: { entity_type: 'shift', entity_id: newShift.id }
        });
      }
      
      return { newShift };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['shifts']);
      
      const client = clients.find(c => c.id === formData.client_id);
      
      toast.success(
        <div>
          <p className="font-bold text-lg">✅ Shift Created!</p>
          <p className="text-xs mt-2 font-semibold">
            {client?.name} • {formData.date} • {formData.start_time}-{formData.end_time}
            {formData.work_location_within_site && <> • 📍 {formData.work_location_within_site}</>}
          </p>
          {formData.urgency === 'urgent' && (
            <p className="text-xs mt-2 text-orange-600">
              ⚠️ Go to Shifts page to assign staff or broadcast alert
            </p>
          )}
        </div>,
        { duration: 6000 }
      );
      
      navigate(createPageUrl('Shifts'));
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.client_id || !formData.date || !formData.start_time || !formData.end_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (locationRequired && !formData.work_location_within_site?.trim()) {
      toast.error(`${selectedClient?.name} requires work location`);
      return;
    }

    createShiftMutation.mutate(formData);
  };

  const isPastShift = formData.date && formData.start_time && (new Date(`${formData.date}T${formData.start_time}`) < new Date());

  // ✅ FIXED: Complete validation - check ALL required fields
  const isFormValid =
    formData.client_id &&
    formData.date &&
    formData.role_required &&
    formData.shift_template &&
    formData.start_time &&
    formData.end_time &&
    (!locationRequired || formData.work_location_within_site?.trim());

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
    </div>;
  }

  // ✅ REMOVED: Duplicate V3 code - this is V2, uses formData not selectedClientId

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Create Shift</h2>
          <p className="text-gray-600 mt-1">Schedule a new shift</p>
        </div>
        <Button variant="outline" onClick={() => navigate(createPageUrl('Shifts'))}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ✅ STEP 1: Care Home Selection (FIRST) */}
        <Card>
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-lg">Care Home & Location</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Care Home *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({...formData, client_id: value})}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select care home..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        {client.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location (if required by client) - ✅ REMOVED "Add Location" option */}
            {locationRequired && (
              <div>
                <Label>Work Location *</Label>
                <Select
                  value={formData.work_location_within_site}
                  onValueChange={(value) => setFormData({...formData, work_location_within_site: value})}
                  disabled={!formData.client_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedClient?.internal_locations?.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Manage locations in the Clients page
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ✅ STEP 2: Shift Schedule & Role (Disabled until care home selected) */}
        <Card>
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-lg">Shift Schedule & Role</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Shift Template *</Label>
                <Select
                  value={formData.shift_template}
                  onValueChange={(value) => applyTemplate(value)}
                  disabled={!formData.client_id}
                >
                  <SelectTrigger className={!formData.client_id ? 'bg-gray-50' : ''}>
                    <SelectValue placeholder={!formData.client_id ? "Select care home first..." : "Select shift template..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {shiftTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!formData.client_id && (
                  <p className="text-xs text-gray-500 mt-1">Select a care home to see available shift times</p>
                )}
              </div>

              <div>
                <Label>Role Required *</Label>
                <Select
                  value={formData.role_required}
                  onValueChange={(value) => setFormData({...formData, role_required: value})}
                  disabled={!formData.client_id || availableRoles.length === 0}
                >
                  <SelectTrigger className={!formData.client_id ? 'bg-gray-50' : ''}>
                    <SelectValue placeholder={!formData.client_id ? "Select care home first..." : availableRoles.length === 0 ? "No roles configured" : "Select role..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center gap-2">
                          <span>{role.icon}</span>
                          <span>{role.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!formData.client_id && (
                  <p className="text-xs text-gray-500 mt-1">Only roles with agreed rates will appear</p>
                )}
                {formData.client_id && availableRoles.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">⚠️ No roles configured for this client. Please add contract rates first.</p>
                )}
              </div>
            </div>

            <div>
              <Label>Shift Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  readOnly
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Set by shift template</p>
              </div>
              <div>
                <Label>End Time *</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  readOnly
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Set by shift template</p>
              </div>
              <div>
                <Label>Duration (hrs)</Label>
                <Input
                  value={formData.duration_hours}
                  readOnly
                  className="bg-gray-50 font-semibold"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ REMOVED: Duplicate Care Home card - now at top of form */}

        <Card>
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-lg">Shift Priority</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Urgency Level</Label>
              <div className="flex gap-3 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setFormData({...formData, urgency: 'normal'})}
                  className={`flex-1 h-12 ${formData.urgency === 'normal' ? 'bg-gray-900 text-white hover:bg-gray-800' : 'hover:bg-gray-50'}`}
                >
                  Normal
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setFormData({...formData, urgency: 'urgent'})}
                  className={`flex-1 h-12 ${formData.urgency === 'urgent' ? 'bg-orange-500 text-white hover:bg-orange-600' : 'hover:bg-orange-50'}`}
                >
                  🔥 Urgent
                </Button>
              </div>
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Special requirements or instructions..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={!isFormValid || createShiftMutation.isPending}
            className="flex-1 h-12 text-base bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            {createShiftMutation.isPending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Creating...</>
            ) : (
              <><CheckCircle className="w-5 h-5 mr-2" />Create Shift</>
            )}
          </Button>
        </div>
      </form>

      {/* ✅ REMOVED: Add Location modal - locations managed in /clients only */}
    </div>
  );
}
