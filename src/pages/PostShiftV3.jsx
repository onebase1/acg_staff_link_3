import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Calendar as CalendarIcon, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { STAFF_ROLES } from "@/constants/staffRoles";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

/**
 * PostShiftV3 - Modern Multi-Shift Creation UI
 * Matches sample UI: Care Home + Calendar + Daily Staffing Grid
 */

// Helper: Get available roles for client (only charge_rate > 0)
const getAvailableRoles = (client) => {
  if (!client || !client.contract_terms?.rates_by_role) return [];
  
  return STAFF_ROLES.filter(role => {
    const rates = client.contract_terms.rates_by_role[role.value];
    return rates && rates.charge_rate > 0;
  }).map(role => ({
    ...role,
    pay_rate: client.contract_terms.rates_by_role[role.value].pay_rate,
    charge_rate: client.contract_terms.rates_by_role[role.value].charge_rate
  }));
};

// Helper: Get shift templates for client
const getShiftTemplates = (client) => {
  if (!client) return [];
  
  return [
    {
      id: 'day',
      label: `Day (${client.day_shift_start || '07:00'}-${client.day_shift_end || '19:00'})`,
      start: client.day_shift_start || '07:00',
      end: client.day_shift_end || '19:00'
    },
    {
      id: 'night',
      label: `Night (${client.night_shift_start || '19:00'}-${client.night_shift_end || '07:00'})`,
      start: client.night_shift_start || '19:00',
      end: client.night_shift_end || '07:00'
    }
  ];
};

export default function PostShiftV3() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentAgency, setCurrentAgency] = useState(null);

  // Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedDates, setSelectedDates] = useState([]); // Array of Date objects
  const [shiftRows, setShiftRows] = useState([
    { id: 1, role: '', staffCount: 1, timeSlot: '' }
  ]);
  const [urgency, setUrgency] = useState('normal');

  // Auth check
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate(createPageUrl('Login'));
        return;
      }
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .single();

      if (profile?.agency_id) {
        setCurrentAgency(profile.agency_id);
      }
      setLoading(false);
    };
    checkUser();
  }, [navigate]);

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', currentAgency],
    queryFn: async () => {
      if (!currentAgency) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('agency_id', currentAgency)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentAgency
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const availableRoles = getAvailableRoles(selectedClient);
  const shiftTemplates = getShiftTemplates(selectedClient);

  // Determine shift type from start time
  const determineShiftType = (startTime) => {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour >= 7 && hour < 19) return 'day';
    return 'night';
  };

  // Create shifts mutation
  const createShiftsMutation = useMutation({
    mutationFn: async () => {
      if (!currentAgency) throw new Error('Agency ID not found');
      if (!selectedClientId) throw new Error('No client selected');
      if (selectedDates.length === 0) throw new Error('No dates selected');
      if (shiftRows.every(r => !r.role || !r.timeSlot)) throw new Error('No shifts configured');

      const shiftsToCreate = [];

      // Generate all combinations: dates × shift rows
      for (const date of selectedDates) {
        const dateStr = format(date, 'yyyy-MM-dd');

        for (const row of shiftRows) {
          if (!row.role || !row.timeSlot) continue;

          const template = shiftTemplates.find(t => t.id === row.timeSlot);
          if (!template) continue;

          const role = availableRoles.find(r => r.value === row.role);
          if (!role) continue;

          // Create multiple shifts if staffCount > 1
          for (let i = 0; i < row.staffCount; i++) {
            const startTimestamp = `${dateStr}T${template.start}:00`;
            const endTimestamp = `${dateStr}T${template.end}:00`;
            const shift_type = determineShiftType(template.start);

            shiftsToCreate.push({
              agency_id: currentAgency,
              client_id: selectedClientId,
              role_required: row.role,
              start_time: startTimestamp,
              end_time: endTimestamp,
              shift_type: shift_type,
              pay_rate: role.pay_rate,
              charge_rate: role.charge_rate,
              break_duration_minutes: selectedClient?.contract_terms?.break_duration_minutes || 0,
              status: urgency === 'urgent' ? 'urgent_unfilled' : 'unfilled',
              urgency: urgency,
              work_location_within_site: null,
              notes: null
            });
          }
        }
      }

      console.log(`📝 Creating ${shiftsToCreate.length} shifts...`);

      // Batch insert all shifts
      const { data, error } = await supabase
        .from('shifts')
        .insert(shiftsToCreate)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['shifts']);
      toast.success(
        <div>
          <p className="font-bold text-lg">✅ {data.length} Shifts Created!</p>
          <p className="text-xs mt-2">
            {selectedClient?.name} • {selectedDates.length} dates • {shiftRows.filter(r => r.role && r.timeSlot).length} shift types
          </p>
        </div>,
        { duration: 6000 }
      );
      navigate(createPageUrl('Shifts'));
    },
    onError: (error) => {
      console.error('❌ Error creating shifts:', error);
      toast.error(`Failed to create shifts: ${error.message}`);
    }
  });

  // Add shift row
  const addShiftRow = () => {
    setShiftRows([...shiftRows, { id: Date.now(), role: '', staffCount: 1, timeSlot: '' }]);
  };

  // Remove shift row
  const removeShiftRow = (id) => {
    if (shiftRows.length === 1) {
      toast.error('At least one shift row required');
      return;
    }
    setShiftRows(shiftRows.filter(row => row.id !== id));
  };

  // Update shift row
  const updateShiftRow = (id, field, value) => {
    setShiftRows(shiftRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  // Handle calendar date selection (multi-select mode)
  const handleDateSelect = (dates) => {
    if (dates) {
      setSelectedDates(dates);
    } else {
      setSelectedDates([]);
    }
  };

  // Remove individual date
  const removeDate = (dateToRemove) => {
    setSelectedDates(selectedDates.filter(d =>
      format(d, 'yyyy-MM-dd') !== format(dateToRemove, 'yyyy-MM-dd')
    ));
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
    </div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Create New Shift Request</h2>
        <Button variant="outline" onClick={() => navigate(createPageUrl('Shifts'))}>
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT PANEL: Care Home + Calendar */}
        <div className="space-y-6">
          {/* Care Home Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Care Home</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search care homes..."
                  className="pl-10"
                  value={selectedClient?.name || ''}
                  readOnly
                />
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {clients.map(client => (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedClientId === client.id
                        ? 'bg-blue-50 border-blue-500'
                        : 'hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="font-medium">{client.name}</div>
                    <div className="text-xs text-gray-500">{client.type || 'Care Home'}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Date Selection - Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Select Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Calendar Component */}
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md border"
                />

                {/* Selected Dates List */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Selected Dates ({selectedDates.length})
                  </Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedDates.length === 0 && (
                      <p className="text-sm text-gray-500 italic">Click dates on calendar to select</p>
                    )}
                    {selectedDates
                      .sort((a, b) => a - b)
                      .map((date, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded">
                          <span className="text-sm font-medium text-blue-900">
                            {format(date, 'EEE, MMM d, yyyy')}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDate(date)}
                            className="h-6 w-6 p-0 hover:bg-blue-100"
                          >
                            <X className="h-4 w-4 text-blue-600" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shift Priority */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Shift Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUrgency('normal')}
                  className={`flex-1 ${urgency === 'normal' ? 'bg-gray-900 text-white' : ''}`}
                >
                  Normal
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUrgency('urgent')}
                  className={`flex-1 ${urgency === 'urgent' ? 'bg-orange-500 text-white' : ''}`}
                >
                  🔥 Urgent
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL: Daily Staffing Grid */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Daily Staffing for {selectedDates.length > 0 ? selectedDates[0] : 'Select Date'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedClientId && (
                <p className="text-sm text-gray-500">Select a care home first</p>
              )}
              {selectedClientId && availableRoles.length === 0 && (
                <p className="text-sm text-red-600">⚠️ No roles configured for this client</p>
              )}
              {selectedClientId && availableRoles.length > 0 && (
                <div className="space-y-3">
                  {shiftRows.map((row, index) => (
                    <div key={row.id} className="grid grid-cols-12 gap-2 items-end">
                      {/* Role */}
                      <div className="col-span-5">
                        {index === 0 && <Label className="text-xs mb-1">Role</Label>}
                        <Select
                          value={row.role}
                          onValueChange={(value) => updateShiftRow(row.id, 'role', value)}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map(role => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.icon} {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* # of Staff */}
                      <div className="col-span-2">
                        {index === 0 && <Label className="text-xs mb-1"># Staff</Label>}
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          value={row.staffCount}
                          onChange={(e) => updateShiftRow(row.id, 'staffCount', parseInt(e.target.value) || 1)}
                          className="h-10"
                        />
                      </div>

                      {/* Time Slot */}
                      <div className="col-span-4">
                        {index === 0 && <Label className="text-xs mb-1">Time Slot</Label>}
                        <Select
                          value={row.timeSlot}
                          onValueChange={(value) => updateShiftRow(row.id, 'timeSlot', value)}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {shiftTemplates.map(template => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Remove Button */}
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeShiftRow(row.id)}
                          className="h-10 w-10 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addShiftRow}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Row
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">Request Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700">📅 Dates:</div>
                <div className="text-sm text-gray-600">
                  {selectedDates.length > 0
                    ? selectedDates.sort((a, b) => a - b).map(d => format(d, 'MMM d')).join(', ')
                    : 'No dates selected'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">🏥 Care Home:</div>
                <div className="text-sm text-gray-600">{selectedClient?.name || 'Not selected'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">👥 Daily Staffing Pattern:</div>
                <div className="text-sm text-gray-600 space-y-1">
                  {shiftRows.filter(r => r.role && r.timeSlot).map((row, i) => {
                    const role = availableRoles.find(r => r.value === row.role);
                    const template = shiftTemplates.find(t => t.id === row.timeSlot);
                    return (
                      <div key={i}>
                        • {role?.label} x{row.staffCount} ({template?.label})
                      </div>
                    );
                  })}
                  {shiftRows.filter(r => r.role && r.timeSlot).length === 0 && (
                    <div className="text-gray-400">No shifts configured</div>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="text-sm font-bold text-blue-900">
                  📊 Total: {selectedDates.length * shiftRows.filter(r => r.role && r.timeSlot).reduce((sum, r) => sum + r.staffCount, 0)} shifts
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {selectedDates.length} dates × {shiftRows.filter(r => r.role && r.timeSlot).reduce((sum, r) => sum + r.staffCount, 0)} staff per day
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create Shifts Button */}
          <Button
            onClick={() => createShiftsMutation.mutate()}
            disabled={
              !selectedClientId ||
              selectedDates.length === 0 ||
              shiftRows.every(r => !r.role || !r.timeSlot) ||
              createShiftsMutation.isPending
            }
            className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold"
          >
            {createShiftsMutation.isPending ? (
              <>⏳ Creating {selectedDates.length * shiftRows.filter(r => r.role && r.timeSlot).reduce((sum, r) => sum + r.staffCount, 0)} shifts...</>
            ) : (
              <>✨ Create {selectedDates.length * shiftRows.filter(r => r.role && r.timeSlot).reduce((sum, r) => sum + r.staffCount, 0)} Shifts</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

