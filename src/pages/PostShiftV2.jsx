
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
 * Generate shift templates based on client's shift patterns
 * Returns only Day/Night options for the selected client (no clutter)
 */
const getClientShiftTemplates = (client) => {
  if (!client) {
    // Default templates when no client selected
    return [
      { id: 'day', name: 'Day Shift (08:00-20:00)', start: '08:00', end: '20:00', hours: 12 },
      { id: 'night', name: 'Night Shift (20:00-08:00)', start: '20:00', end: '08:00', hours: 12 }
    ];
  }

  // Client-specific templates (only 2 options: Day and Night)
  return [
    {
      id: 'day',
      name: `Day Shift (${client.day_shift_start}-${client.day_shift_end})`,
      start: client.day_shift_start || '08:00',
      end: client.day_shift_end || '20:00',
      hours: 12
    },
    {
      id: 'night',
      name: `Night Shift (${client.night_shift_start}-${client.night_shift_end})`,
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

  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  // const [shouldBroadcast, setShouldBroadcast] = useState(false); // REMOVED: Broadcast logic moved

  const [formData, setFormData] = useState({
    client_id: '',
    role_required: 'healthcare_assistant',
    date: '',
    shift_template: 'day', // Changed from 'day_8am' to 'day'
    start_time: '08:00',
    end_time: '20:00',
    duration_hours: 12,
    work_location_within_site: '',
    pay_rate: 14.75,
    charge_rate: 19.18,
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

  // Get shift templates for selected client (only Day/Night for that client)
  const shiftTemplates = getClientShiftTemplates(selectedClient);

  // When client changes, update shift times to match client's default day shift
  useEffect(() => {
    if (formData.client_id) {
      const client = clients.find(c => c.id === formData.client_id);

      if (client) {
        const simpleRates = client.contract_terms?.rates_by_role?.[formData.role_required];

        // Get client's day shift as default
        const dayShift = getClientShiftTemplates(client)[0]; // First template is always day shift

        setFormData(prev => ({
          ...prev,
          pay_rate: simpleRates?.pay_rate || prev.pay_rate,
          charge_rate: simpleRates?.charge_rate || prev.charge_rate,
          break_duration_minutes: client.contract_terms?.break_duration_minutes || 0,
          // Update shift times to match client's pattern
          shift_template: 'day',
          start_time: dayShift.start,
          end_time: dayShift.end,
          duration_hours: dayShift.hours
        }));
      }
    }
  }, [formData.client_id, formData.role_required, clients]);

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

  const updateClientMutation = useMutation({
    mutationFn: async ({ clientId, newLocations }) => {
      const { error } = await supabase
        .from('clients')
        .update({
          internal_locations: newLocations
        })
        .eq('id', clientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      toast.success('✅ Location added');
      setShowAddLocationModal(false);
      setNewLocationName('');
    }
  });

  const handleAddLocation = () => {
    if (!newLocationName.trim() || !formData.client_id) {
      toast.error('Please enter a location name');
      return;
    }

    const client = clients.find(c => c.id === formData.client_id);
    const existingLocations = client?.internal_locations || [];

    if (existingLocations.includes(newLocationName.trim())) {
      toast.error('This location already exists');
      return;
    }

    updateClientMutation.mutate({
      clientId: formData.client_id,
      newLocations: [...existingLocations, newLocationName.trim()]
    });

    setFormData(prev => ({
      ...prev,
      work_location_within_site: newLocationName.trim()
    }));
  };

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
  const isFormValid = formData.client_id && formData.date && (!locationRequired || formData.work_location_within_site?.trim());

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
    </div>;
  }

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
                  onValueChange={(value) => {
                    const template = shiftTemplates.find(t => t.id === value);
                    if (template) {
                      setFormData(prev => ({
                        ...prev,
                        shift_template: value,
                        start_time: template.start,
                        end_time: template.end,
                        duration_hours: template.hours
                      }));
                    }
                  }}
                  disabled={!formData.client_id}
                >
                  <SelectTrigger>
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
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.icon} {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        <Card>
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-lg">Care Home & Location</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Care Home *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({...formData, client_id: value, work_location_within_site: ''})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select care home..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.client_id && selectedClient?.internal_locations?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>
                    Work Location {locationRequired && <span className="text-red-600">*</span>}
                  </Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setShowAddLocationModal(true)}
                    className="h-auto p-0"
                  >
                    + Add Location
                  </Button>
                </div>

                <Select
                  value={formData.work_location_within_site}
                  onValueChange={(value) => setFormData({...formData, work_location_within_site: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room/unit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedClient.internal_locations.map((loc, idx) => (
                      <SelectItem key={idx} value={loc}>
                        📍 {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-lg">Shift Priority</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Urgency Level</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={formData.urgency === 'normal' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({...formData, urgency: 'normal'})}
                    className="flex-1"
                  >
                    Normal
                  </Button>
                  <Button
                    type="button"
                    variant={formData.urgency === 'urgent' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({...formData, urgency: 'urgent'})}
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                  >
                    🔥 Urgent
                  </Button>
                </div>
              </div>

              {formData.urgency === 'urgent' && !isPastShift && (
                <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-orange-900 mb-1">
                        Urgent Shift - Next Steps
                      </p>
                      <p className="text-xs text-orange-800">
                        After creating this shift, go to the Shifts page to:
                      </p>
                      <ul className="text-xs text-orange-800 mt-2 space-y-1">
                        <li>• Assign staff directly (saves SMS costs)</li>
                        <li>• OR broadcast alert via SMS to all eligible staff</li>
                        <li>• OR add to marketplace for staff to accept</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
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

      <Dialog open={showAddLocationModal} onOpenChange={setShowAddLocationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Location Name</Label>
            <Input
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              placeholder="e.g., Room 14"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLocationModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLocation}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
