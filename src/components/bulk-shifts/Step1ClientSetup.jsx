import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Info, Calendar } from "lucide-react";
import { getShiftTimes } from "@/utils/clientHelpers";

export default function Step1ClientSetup({
  currentAgency,
  formData,
  setFormData,
  onNext
}) {
  // Fetch clients for the current agency
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients-bulk', currentAgency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, contract_terms, day_shift_start, day_shift_end, night_shift_start, night_shift_end, internal_locations, shift_window_type, enabled_roles')
        .eq('agency_id', currentAgency)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAgency
  });

  // Get selected client
  const selectedClient = clients.find(c => c.id === formData.client_id);

  // Handle client selection
  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);

    if (client) {
      // Use clientHelpers to get shift times based on shift_window_type
      const dayTimes = getShiftTimes(client, 'day');
      const nightTimes = getShiftTimes(client, 'night');

      // Auto-populate defaults from client
      setFormData(prev => ({
        ...prev,
        client_id: clientId,
        client: client,
        // Extract shift times using helper (respects shift_window_type)
        shiftTimes: {
          day: {
            start: dayTimes.start,
            end: dayTimes.end
          },
          night: {
            start: nightTimes.start,
            end: nightTimes.end
          }
        },
        // Extract rates by role
        ratesByRole: client.contract_terms?.rates_by_role || {},
        // Other defaults
        break_duration_minutes: client.contract_terms?.break_duration_minutes || 0,
        location_options: client.internal_locations || []
      }));
    }
  };

  // Handle date change
  const handleDateChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value
      }
    }));
  };

  // Get today's date in YYYY-MM-DD format (for min date)
  const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Quick presets
  const applyPreset = (preset) => {
    const today = new Date();
    let startDate, endDate;

    switch (preset) {
      case 'next_7_days':
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 6);
        break;
      case 'next_week':
        const nextWeekStart = new Date(today);
        nextWeekStart.setDate(today.getDate() + (7 - today.getDay()));
        startDate = nextWeekStart;
        endDate = new Date(nextWeekStart);
        endDate.setDate(nextWeekStart.getDate() + 6);
        break;
      case 'next_month':
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 30);
        break;
      default:
        return;
    }

    setFormData(prev => ({
      ...prev,
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    }));
  };

  // Apply default preset on mount if no dates set
  React.useEffect(() => {
    if (!formData.dateRange.startDate && !formData.dateRange.endDate) {
      applyPreset('next_month');
    }
  }, []);

  // Validation
  const isValid = formData.client_id && formData.dateRange.startDate && formData.dateRange.endDate;
  const dateRangeError = formData.dateRange.startDate && formData.dateRange.endDate &&
    new Date(formData.dateRange.endDate) < new Date(formData.dateRange.startDate);

  return (
    <Card>
      <CardHeader className="border-b bg-gray-50">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-cyan-600" />
          Step 1: Select Client & Date Range
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Client Selection */}
        <div className="space-y-2">
          <Label htmlFor="client-select">Client *</Label>
          <Select value={formData.client_id} onValueChange={handleClientSelect}>
            <SelectTrigger id="client-select">
              <SelectValue placeholder="-- Select a client --" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingClients ? (
                <SelectItem value="loading" disabled>Loading clients...</SelectItem>
              ) : clients.length === 0 ? (
                <SelectItem value="none" disabled>No clients found</SelectItem>
              ) : (
                clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Schedule Period *
          </Label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date" className="text-sm text-gray-600">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.dateRange.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                min={getTodayString()}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="end-date" className="text-sm text-gray-600">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={formData.dateRange.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                min={formData.dateRange.startDate || getTodayString()}
                className="mt-1"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-sm text-gray-600">Quick Presets:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('next_7_days')}
            >
              Next 7 Days
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('next_week')}
            >
              Next Week
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('next_month')}
            >
              Next Month (Default)
            </Button>
          </div>

          {dateRangeError && (
            <Alert variant="destructive">
              <AlertDescription>
                End date must be after start date
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Defaults Summary */}
        {selectedClient && formData.client_id && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Client Defaults Loaded</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {selectedClient.contract_terms?.rates_by_role && Object.entries(selectedClient.contract_terms.rates_by_role).map(([role, rates]) => (
                <div key={role} className="space-y-1">
                  <div className="text-xs uppercase text-blue-600 font-medium">
                    {role.replace(/_/g, ' ')}
                  </div>
                  <div className="text-gray-900">
                    Pay: £{rates.pay_rate?.toFixed(2)}/hr
                  </div>
                  <div className="text-gray-900">
                    Charge: £{rates.charge_rate?.toFixed(2)}/hr
                  </div>
                </div>
              ))}

              <div className="space-y-1">
                <div className="text-xs uppercase text-blue-600 font-medium">Day Shift</div>
                <div className="text-gray-900">
                  {selectedClient.day_shift_start} - {selectedClient.day_shift_end}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs uppercase text-blue-600 font-medium">Night Shift</div>
                <div className="text-gray-900">
                  {selectedClient.night_shift_start} - {selectedClient.night_shift_end}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={onNext}
            disabled={!isValid || dateRangeError}
            size="lg"
          >
            Next: Build Schedule Grid →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
