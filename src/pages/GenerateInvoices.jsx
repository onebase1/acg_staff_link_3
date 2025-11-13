
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText, Building2, Calendar, DollarSign, AlertCircle, CheckCircle2,
  ArrowLeft, Loader2, Clock, User, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function GenerateInvoices() {
  const [selectedTimesheets, setSelectedTimesheets] = useState([]);
  const [groupBy, setGroupBy] = useState('client');
  const [user, setUser] = useState(null); // ✅ FIX: Fetch real user
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ✅ FIX: Fetch authenticated user
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
        console.log('✅ [Generate Invoices] User loaded:', profile.email, 'Agency:', profile.agency_id);
      } catch (error) {
        console.error('❌ [Generate Invoices] Auth error:', error);
        toast.error('Failed to load user data');
      }
    };
    fetchUser();
  }, []);

  // ✅ FIX: Fetch agency with proper error handling
  const { data: agency, isLoading: agencyLoading, error: agencyError } = useQuery({
    queryKey: ['agency', user?.agency_id],
    queryFn: async () => {
      if (!user?.agency_id) {
        console.warn('⚠️ [Generate Invoices] No agency_id for user');
        return null;
      }

      console.log('🔍 [Generate Invoices] Fetching agency:', user.agency_id);
      const { data: userAgency, error: agencyError } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', user.agency_id)
        .single();
      
      if (agencyError) {
        console.error('❌ Error fetching agency:', agencyError);
        return null;
      }
      
      if (!userAgency) {
        console.error('❌ [Generate Invoices] Agency not found:', user.agency_id);
        return null;
      }

      console.log('✅ [Generate Invoices] Agency loaded:', userAgency.name);
      console.log('🏦 [Generate Invoices] Bank details:', userAgency.bank_details);
      
      return userAgency;
    },
    enabled: !!user?.agency_id,
    staleTime: 60000
  });

  // ✅ ENHANCED: Better bank details validation with logging
  const hasBankDetails = React.useMemo(() => {
    if (!agency) {
      console.warn('⚠️ [Generate Invoices] No agency loaded yet');
      return false;
    }

    const hasDetails = !!(
      agency.bank_details?.account_name &&
      agency.bank_details?.account_number &&
      agency.bank_details?.sort_code
    );

    console.log('🏦 [Generate Invoices] Bank details check:', {
      hasDetails,
      account_name: agency.bank_details?.account_name || 'MISSING',
      account_number: agency.bank_details?.account_number || 'MISSING',
      sort_code: agency.bank_details?.sort_code || 'MISSING'
    });

    return hasDetails;
  }, [agency]);

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ['approved-timesheets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('status', 'approved')
        .is('invoice_id', null)
        .order('shift_date', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching timesheets:', error);
        return [];
      }
      return data || [];
    },
    refetchOnMount: 'always'
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*');
      
      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      return data || [];
    },
    refetchOnMount: 'always'
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
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

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unknown';
  };

  const timesheetsByClient = timesheets.reduce((acc, timesheet) => {
    if (!acc[timesheet.client_id]) {
      acc[timesheet.client_id] = [];
    }
    acc[timesheet.client_id].push(timesheet);
    return acc;
  }, {});

  const getInvoiceCount = () => {
    if (selectedTimesheets.length === 0) return 0;
    
    const selectedTimesheetObjects = timesheets.filter(t => selectedTimesheets.includes(t.id));
    const uniqueClients = new Set(selectedTimesheetObjects.map(t => t.client_id));
    return uniqueClients.size;
  };

  const invoiceCount = getInvoiceCount();

  const generateInvoicesMutation = useMutation({
    mutationFn: async (timesheetIds) => {
      console.log('🔄 [Generate Invoices] Starting with', timesheetIds.length, 'timesheets');
      console.log('📋 [Generate Invoices] Timesheet IDs:', timesheetIds);
      
      if (!hasBankDetails) {
        throw new Error('🚫 BLOCKED: Bank details must be configured before generating invoices. Go to Agency Settings → Bank Details.');
      }

      const { data: response, error: invoiceError } = await supabase.functions.invoke('auto-invoice-generator', {
        body: {
          timesheet_ids: timesheetIds,
          auto_mode: false
        }
      });

      return response.data;
    },
    onSuccess: (data) => {
      console.log('✅ [Generate Invoices] Success:', data);
      queryClient.invalidateQueries(['approved-timesheets']);
      queryClient.invalidateQueries(['timesheets']);
      queryClient.invalidateQueries(['invoices']);
      
      setSelectedTimesheets([]);

      if (data.validation_errors && data.validation_errors.length > 0) {
        data.validation_errors.forEach(error => {
          if (error.error === 'missing_bank_details') {
            toast.error(
              <div>
                <p className="font-bold">🚨 Invoice Generation Blocked</p>
                <p className="text-sm mt-1">{error.message}</p>
                <p className="text-xs mt-2">
                  <Link to={createPageUrl('AgencySettings')} className="underline font-semibold">
                    → Go to Agency Settings
                  </Link>
                </p>
              </div>,
              { duration: 10000 }
            );
          } else if (error.error === 'missing_location_specification') {
            toast.error(
              <div>
                <p className="font-bold">⚠️ Missing Location Data</p>
                <p className="text-sm mt-1">{error.message}</p>
                <p className="text-xs mt-2">Edit affected timesheets to add work location.</p>
              </div>,
              { duration: 8000 }
            );
          } else {
            toast.error(error.message);
          }
        });
      }
      
      if (data.invoices_created > 0) {
        toast.success(
          <div>
            <p className="font-bold">✅ {data.invoices_created} Invoice(s) Created!</p>
            <p className="text-sm mt-1">Review draft invoices and click "Send" when ready.</p>
          </div>,
          { duration: 6000 }
        );
        navigate(createPageUrl('Invoices'));
      } else if (!data.validation_errors || data.validation_errors.length === 0) {
        toast.error("No invoices were created. Please check timesheet data or try again.");
      }
    },
    onError: (error) => {
      console.error('❌ [Generate Invoices] Error:', error);
      toast.error(`Failed to generate invoices: ${error.message}`);
    }
  });

  const handleSelectTimesheet = (timesheetId) => {
    setSelectedTimesheets(prev =>
      prev.includes(timesheetId)
        ? prev.filter(id => id !== timesheetId)
        : [...prev, timesheetId]
    );
  };

  const handleSelectAllForClient = (clientId) => {
    const clientTimesheetIds = timesheetsByClient[clientId].map(t => t.id);
    const allSelected = clientTimesheetIds.every(id => selectedTimesheets.includes(id));

    if (allSelected) {
      setSelectedTimesheets(prev => prev.filter(id => !clientTimesheetIds.includes(id)));
    } else {
      setSelectedTimesheets(prev => [...new Set([...prev, ...clientTimesheetIds])]);
    }
  };

  const handleSelectAll = () => {
    if (selectedTimesheets.length === timesheets.length) {
      setSelectedTimesheets([]);
    } else {
      setSelectedTimesheets(timesheets.map(t => t.id));
    }
  };

  const handleGenerateInvoices = () => {
    if (generateInvoicesMutation.isPending) {
      console.log('⏸️ [Generate Invoices] Already generating, ignoring duplicate call');
      toast.warning('Invoice generation already in progress...');
      return;
    }

    if (selectedTimesheets.length === 0) {
      toast.error('Please select at least one timesheet');
      return;
    }

    // ✅ ENHANCED: Better error message if bank details missing
    if (!hasBankDetails) {
      toast.error(
        <div>
          <p className="font-bold">🚫 Bank Details Required</p>
          <p className="text-sm mt-1">Configure bank details before generating invoices.</p>
          <Link to={createPageUrl('AgencySettings')}>
            <Button size="sm" className="mt-2 bg-red-600 hover:bg-red-700">
              Go to Settings →
            </Button>
          </Link>
        </div>,
        { duration: 8000 }
      );
      return;
    }

    const confirmMessage = invoiceCount === 1
      ? `Generate 1 invoice for ${selectedTimesheets.length} timesheet(s)?`
      : `Generate ${invoiceCount} invoices for ${selectedTimesheets.length} timesheet(s) across ${invoiceCount} clients?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    console.log('🚀 [Generate Invoices] User confirmed, calling mutation once with all IDs');
    generateInvoicesMutation.mutate(selectedTimesheets);
  };

  const calculateTotals = (timesheetIds) => {
    const selectedTimesheetObjects = timesheets.filter(t => timesheetIds.includes(t.id));
    const totalHours = selectedTimesheetObjects.reduce((sum, t) => sum + (t.total_hours || 0), 0);
    const totalValue = selectedTimesheetObjects.reduce((sum, t) => sum + (t.client_charge_amount || 0), 0);
    return { totalHours, totalValue };
  };

  const selectedTotals = calculateTotals(selectedTimesheets);

  // ✅ ENHANCED: Better loading states
  if (!user || isLoading || agencyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!user ? 'Loading user...' : agencyLoading ? 'Loading agency...' : 'Loading timesheets...'}
          </p>
        </div>
      </div>
    );
  }

  // ✅ NEW: Show error if agency failed to load
  if (agencyError || (!agency && user?.agency_id)) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>Failed to Load Agency</strong>
            <p className="mt-2">Could not load agency data. Please refresh the page or contact support.</p>
            <p className="text-xs mt-2">Agency ID: {user?.agency_id}</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(createPageUrl('Invoices'))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Generate Invoices</h2>
            <p className="text-gray-600 mt-1">Create invoices from approved timesheets</p>
            {/* ✅ NEW: Show agency name for confirmation */}
            {agency && (
              <p className="text-sm text-gray-500 mt-1">
                Agency: <strong>{agency.name}</strong>
              </p>
            )}
          </div>
        </div>

        {selectedTimesheets.length > 0 && (
          <Button
            onClick={handleGenerateInvoices}
            disabled={generateInvoicesMutation.isPending || !hasBankDetails}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            size="lg"
          >
            {generateInvoicesMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 mr-2" />
                Generate {invoiceCount} Invoice{invoiceCount > 1 ? 's' : ''}
                <Badge className="ml-2 bg-white text-green-700">
                  {selectedTimesheets.length} timesheet{selectedTimesheets.length > 1 ? 's' : ''}
                </Badge>
              </>
            )}
          </Button>
        )}
      </div>

      {/* ✅ ENHANCED: Better bank details warning with real-time check */}
      {!hasBankDetails && (
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <div className="flex items-start justify-between">
              <div>
                <strong className="block mb-1">🚨 CRITICAL: Bank Details Required</strong>
                <p className="text-sm">
                  Invoices cannot be generated without bank details. Clients need payment instructions.
                </p>
                {/* ✅ NEW: Show what's missing */}
                <div className="mt-2 text-xs">
                  <p className="font-semibold">Missing:</p>
                  <ul className="list-disc ml-5 mt-1">
                    {!agency?.bank_details?.account_name && <li>Account Name</li>}
                    {!agency?.bank_details?.account_number && <li>Account Number</li>}
                    {!agency?.bank_details?.sort_code && <li>Sort Code</li>}
                  </ul>
                </div>
              </div>
              <Link to={createPageUrl('AgencySettings')}>
                <Button className="bg-red-600 hover:bg-red-700 text-white ml-4">
                  Configure Bank Details →
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {selectedTimesheets.length > 0 && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Invoices</p>
                  <p className="text-3xl font-bold text-green-900">{invoiceCount}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {invoiceCount === 1 ? 'for 1 client' : `across ${invoiceCount} clients`}
                  </p>
                </div>
                <FileText className="w-10 h-10 text-green-600 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Timesheets</p>
                  <p className="text-3xl font-bold text-blue-900">{selectedTimesheets.length}</p>
                  <p className="text-xs text-blue-600 mt-1">selected</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-blue-600 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">Total Hours</p>
                  <p className="text-3xl font-bold text-purple-900">{selectedTotals.totalHours.toFixed(1)}</p>
                  <p className="text-xs text-purple-600 mt-1">hours worked</p>
                </div>
                <Clock className="w-10 h-10 text-purple-600 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700 font-medium">Total Value</p>
                  <p className="text-3xl font-bold text-amber-900">£{selectedTotals.totalValue.toFixed(2)}</p>
                  <p className="text-xs text-amber-600 mt-1">to invoice</p>
                </div>
                <DollarSign className="w-10 h-10 text-amber-600 opacity-30" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {timesheets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-gray-600">No approved timesheets waiting to be invoiced</p>
            <Button
              onClick={() => navigate(createPageUrl('Timesheets'))}
              variant="outline"
              className="mt-4"
            >
              Go to Timesheets
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Alert className="border-blue-300 bg-blue-50">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <AlertDescription>
              <p className="font-semibold text-blue-900">How it works</p>
              <p className="text-sm text-blue-800 mt-1">
                ✅ Timesheets are automatically grouped by client<br />
                ✅ One invoice per client (even if you select 100 timesheets)<br />
                ✅ All shifts appear as line items on a single invoice<br />
                ✅ Invoices created as <strong>DRAFT</strong> - you can review before sending<br />
                ✅ Click "Send Invoice" to email PDF to client
              </p>
            </AlertDescription>
          </Alert>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedTimesheets.length === timesheets.length && timesheets.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="font-semibold">Select All ({timesheets.length})</span>
                </div>
                {selectedTimesheets.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTimesheets([])}
                  >
                    Clear Selection
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {Object.entries(timesheetsByClient).map(([clientId, clientTimesheets]) => {
              const clientTotals = calculateTotals(clientTimesheets.map(t => t.id));
              const allSelected = clientTimesheets.every(t => selectedTimesheets.includes(t.id));

              return (
                <Card key={clientId} className="border-2">
                  <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={() => handleSelectAllForClient(clientId)}
                        />
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-gray-600" />
                            {getClientName(clientId)}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            {clientTimesheets.length} timesheet{clientTimesheets.length > 1 ? 's' : ''} • 
                            {' '}{clientTotals.totalHours.toFixed(1)}h • 
                            {' '}£{clientTotals.totalValue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {clientTimesheets.map((timesheet) => (
                        <div
                          key={timesheet.id}
                          className={`p-4 hover:bg-gray-50 transition-colors ${
                            selectedTimesheets.includes(timesheet.id) ? 'bg-cyan-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedTimesheets.includes(timesheet.id)}
                              onCheckedChange={() => handleSelectTimesheet(timesheet.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 grid md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-gray-500">Staff</p>
                                <p className="font-medium">{getStaffName(timesheet.staff_id)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Date</p>
                                <p className="font-medium">
                                  {format(new Date(timesheet.shift_date), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Hours</p>
                                <p className="font-semibold">{timesheet.total_hours}h</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Amount</p>
                                <p className="font-bold text-green-600">
                                  £{timesheet.client_charge_amount.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            {timesheet.work_location_within_site && (
                              <Badge className="bg-cyan-100 text-cyan-800">
                                📍 {timesheet.work_location_within_site}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
