import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Trash2, AlertTriangle, CheckCircle, Calendar,
  Clock, FileText, Users, Building2, Loader2, Database,
  Bell, Receipt, DollarSign, Filter, Search
} from 'lucide-react';
import { toast } from 'sonner';

export default function CleanSlate() {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0, entity: '' });
  const [deleteMode, setDeleteMode] = useState('all'); // 'all' or 'selective'
  const [selectedClients, setSelectedClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const queryClient = useQueryClient();

  // Fetch counts for display
  const { data: shifts = [] } = useQuery({
    queryKey: ['all-shifts-count'],
    queryFn: async () => {
      const { data } = await supabase.from('shifts').select('*', { count: 'exact', head: true });
      return new Array(data?.length || 0); // Mock array for length
    }
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['all-bookings-count'],
    queryFn: async () => {
      const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
      return new Array(count || 0);
    }
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['all-timesheets-count'],
    queryFn: async () => {
      const { count } = await supabase.from('timesheets').select('*', { count: 'exact', head: true });
      return new Array(count || 0);
    }
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['all-invoices-count'],
    queryFn: async () => {
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
      return new Array(count || 0);
    }
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['all-notifications-count'],
    queryFn: async () => {
      const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true });
      return new Array(count || 0);
    }
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['all-staff-count'],
    queryFn: async () => {
      const { count } = await supabase.from('staff').select('*', { count: 'exact', head: true });
      return new Array(count || 0);
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['all-clients-count'],
    queryFn: async () => {
      const { count } = await supabase.from('clients').select('*', { count: 'exact', head: true });
      return new Array(count || 0);
    }
  });

  // Fetch clients with their shift counts for selective deletion
  const { data: clientsWithShifts = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients-with-shift-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          status,
          shifts:shifts(count)
        `)
        .order('name');

      if (error) throw error;

      // Transform to include shift count
      return data.map(client => ({
        ...client,
        shiftCount: client.shifts?.[0]?.count || 0
      })).filter(c => c.shiftCount > 0); // Only show clients with shifts
    }
  });

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clientsWithShifts;
    return clientsWithShifts.filter(c =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [clientsWithShifts, clientSearch]);

  // Calculate selected shift count
  const selectedShiftCount = useMemo(() => {
    return clientsWithShifts
      .filter(c => selectedClients.includes(c.id))
      .reduce((sum, c) => sum + c.shiftCount, 0);
  }, [clientsWithShifts, selectedClients]);

  const toggleClientSelection = (clientId) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredClients.map(c => c.id);
    setSelectedClients(prev => {
      const allSelected = filteredIds.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(id => !filteredIds.includes(id));
      }
      return [...new Set([...prev, ...filteredIds])];
    });
  };

  const handleDelete = async () => {
    const CONFIRM_PHRASE = deleteMode === 'all' ? 'DELETE ALL SHIFTS' : 'DELETE SELECTED';

    if (confirmText !== CONFIRM_PHRASE) {
      toast.error(`Please type "${CONFIRM_PHRASE}" exactly to confirm`);
      return;
    }

    // Validate selective mode has selections
    if (deleteMode === 'selective' && selectedClients.length === 0) {
      toast.error('Please select at least one client');
      return;
    }

    setIsDeleting(true);

    try {
      console.log(`🗑️ Starting Clean Slate deletion (mode: ${deleteMode})...`);
      setDeleteProgress({ current: 0, total: 100, entity: 'Initializing...' });

      let data, rpcError;

      if (deleteMode === 'all') {
        // Delete ALL shifts
        const result = await supabase.rpc('delete_all_shift_data');
        data = result.data;
        rpcError = result.error;
      } else {
        // Delete only selected clients' shifts
        const result = await supabase.rpc('delete_client_shift_data', {
          target_client_ids: selectedClients
        });
        data = result.data;
        rpcError = result.error;
      }

      if (rpcError) {
        console.error('❌ RPC deletion error:', rpcError);
        if (deleteMode === 'all') {
          console.log('⚠️ RPC failed, falling back to manual deletion...');
          await handleManualDelete();
        } else {
          throw rpcError;
        }
      } else {
        console.log('✅ RPC deletion success:', data);
        const deletedCount = data?.deleted_shifts || 0;
        toast.success(`🎉 ${deletedCount} shifts deleted successfully!`);
      }

      // Refresh all queries
      await queryClient.invalidateQueries();
      setConfirmText('');
      setSelectedClients([]);

    } catch (error) {
      console.error('❌ Clean slate error:', error);
      toast.error(`Deletion failed: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteProgress({ current: 0, total: 0, entity: '' });
    }
  };

  const handleManualDelete = async () => {
    console.log('🗑️ Starting manual fallback deletion...');

    try {
      // 1. Operational Costs
      setDeleteProgress({ current: 1, total: 9, entity: 'Operational Costs' });
      const { error: opError } = await supabase.from('operational_costs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (opError) throw new Error(`Operational Costs: ${opError.message}`);

      // 2. Invoice Amendments
      setDeleteProgress({ current: 2, total: 9, entity: 'Invoice Amendments' });
      const { error: iaError } = await supabase.from('invoice_amendments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (iaError) throw new Error(`Invoice Amendments: ${iaError.message}`);

      // 3. Timesheets
      setDeleteProgress({ current: 3, total: 9, entity: 'Timesheets' });
      const { error: tsError } = await supabase.from('timesheets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (tsError) throw new Error(`Timesheets: ${tsError.message}`);

      // 4. Bookings
      setDeleteProgress({ current: 4, total: 9, entity: 'Bookings' });
      const { error: bkError } = await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (bkError) throw new Error(`Bookings: ${bkError.message}`);

      // 5. Notifications
      setDeleteProgress({ current: 5, total: 9, entity: 'Notifications' });
      const { error: ntError } = await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (ntError) throw new Error(`Notifications: ${ntError.message}`);

      // 6. Invoices
      setDeleteProgress({ current: 6, total: 9, entity: 'Invoices' });
      const { error: invError } = await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (invError) throw new Error(`Invoices: ${invError.message}`);

      // 7. Admin Workflows
      setDeleteProgress({ current: 7, total: 9, entity: 'Admin Workflows' });
      // Best effort, ignore errors as RLS might block
      await supabase.from('admin_workflows').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 8. Change Logs
      setDeleteProgress({ current: 8, total: 9, entity: 'Change Logs' });
      await supabase.from('change_logs').delete().in('affected_entity_type', ['shift', 'timesheet', 'booking', 'invoice']);

      // 9. Shifts
      setDeleteProgress({ current: 9, total: 9, entity: 'Shifts' });
      const { error: shiftError } = await supabase.from('shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (shiftError) throw new Error(`Shifts: ${shiftError.message}`);

      toast.success('✅ Manual deletion complete');
    } catch (error) {
      console.error('❌ Manual deletion failed:', error);
      throw error; // Re-throw to be caught by main handler
    }
  };

  const totalToDelete = shifts.length + bookings.length + timesheets.length + invoices.length + notifications.length;
  const CONFIRM_PHRASE = deleteMode === 'all' ? 'DELETE ALL SHIFTS' : 'DELETE SELECTED';
  const canDelete = confirmText === CONFIRM_PHRASE;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Warning Header */}
      <Card className="border-4 border-red-600 bg-red-50">
        <CardHeader className="bg-red-600 text-white">
          <CardTitle className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
            🚨 DANGER ZONE: Clean Slate Utility
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Alert className="border-red-400 bg-white mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>⚠️ DESTRUCTIVE ACTION:</strong> This will permanently delete ALL shifts, bookings, timesheets, invoices, and notifications. This action CANNOT be undone!
            </AlertDescription>
          </Alert>

          <div className="bg-white p-4 rounded-lg border-2 border-red-200">
            <h3 className="font-bold text-red-900 mb-3">What will be DELETED:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-red-600" />
                  <span className="font-semibold">Shifts</span>
                </div>
                <Badge className="bg-red-600 text-white text-lg">{shifts.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold">Bookings</span>
                </div>
                <Badge className="bg-red-600 text-white text-lg">{bookings.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-red-600" />
                  <span className="font-semibold">Timesheets</span>
                </div>
                <Badge className="bg-red-600 text-white text-lg">{timesheets.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-red-600" />
                  <span className="font-semibold">Invoices</span>
                </div>
                <Badge className="bg-red-600 text-white text-lg">{invoices.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-red-600" />
                  <span className="font-semibold">Notifications</span>
                </div>
                <Badge className="bg-red-600 text-white text-lg">{notifications.length}</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-100 rounded border-2 border-red-400 mt-4">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-700" />
                <span className="font-bold text-red-900">TOTAL TO DELETE</span>
              </div>
              <Badge className="bg-red-700 text-white text-xl">{totalToDelete}</Badge>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300 mt-4">
            <h3 className="font-bold text-green-900 mb-3">✅ What will be PRESERVED:</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 bg-white rounded">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <span className="font-semibold">Staff</span>
                </div>
                <Badge className="bg-green-600 text-white">{staff.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold">Clients</span>
                </div>
                <Badge className="bg-green-600 text-white">{clients.length}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Mode Selection */}
      <Card className="border-2 border-orange-400">
        <CardHeader className="bg-orange-50">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Delete Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={deleteMode} onValueChange={(v) => { setDeleteMode(v); setConfirmText(''); }}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="all" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                🗑️ Delete ALL Shifts
              </TabsTrigger>
              <TabsTrigger value="selective" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                🎯 Select Clients
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Alert className="border-red-400 bg-red-50 mb-4">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>⚠️ NUCLEAR OPTION:</strong> This will delete ALL {shifts.length} shifts across ALL clients. Use for full system reset only.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="selective">
              <Alert className="border-orange-400 bg-orange-50 mb-4">
                <Building2 className="h-5 w-5 text-orange-600" />
                <AlertDescription className="text-orange-900">
                  <strong>🎯 TARGETED:</strong> Select specific test clients below. Only their shifts will be deleted.
                </AlertDescription>
              </Alert>

              {/* Client Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Select All Button */}
              <div className="flex items-center justify-between mb-2">
                <Button variant="outline" size="sm" onClick={selectAllFiltered}>
                  {filteredClients.every(c => selectedClients.includes(c.id)) ? 'Deselect All' : 'Select All Visible'}
                </Button>
                <Badge variant="secondary">
                  {selectedClients.length} selected • {selectedShiftCount} shifts
                </Badge>
              </div>

              {/* Client List */}
              <ScrollArea className="h-64 border rounded-lg p-2">
                {loadingClients ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredClients.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No clients with shifts found</p>
                ) : (
                  <div className="space-y-1">
                    {filteredClients.map(client => (
                      <div
                        key={client.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          selectedClients.includes(client.id)
                            ? 'bg-orange-100 border border-orange-300'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleClientSelection(client.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedClients.includes(client.id)}
                            onCheckedChange={() => toggleClientSelection(client.id)}
                          />
                          <span className="font-medium">{client.name}</span>
                          {client.name.toLowerCase().includes('test') && (
                            <Badge variant="outline" className="text-xs">Test</Badge>
                          )}
                        </div>
                        <Badge className="bg-red-100 text-red-800">
                          {client.shiftCount} shifts
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Confirmation Section */}
      <Card className="border-2 border-orange-400">
        <CardHeader className="bg-orange-50">
          <CardTitle>Confirmation Required</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Alert className="border-orange-400 bg-orange-50">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>Type the phrase exactly:</strong>{' '}
              <code className="bg-orange-200 px-2 py-1 rounded font-mono">
                {deleteMode === 'all' ? 'DELETE ALL SHIFTS' : 'DELETE SELECTED'}
              </code>
            </AlertDescription>
          </Alert>

          <div>
            <label className="block text-sm font-semibold mb-2">Confirmation Phrase:</label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Type: ${deleteMode === 'all' ? 'DELETE ALL SHIFTS' : 'DELETE SELECTED'}`}
              className={`text-lg font-mono ${canDelete ? 'border-red-600 border-2' : ''}`}
              disabled={isDeleting}
            />
          </div>

          {/* Progress Indicator */}
          {isDeleting && (
            <div className="p-4 bg-blue-50 border border-blue-300 rounded">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="font-semibold text-blue-900">
                  Deleting {deleteProgress.entity}...
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-blue-600 h-4 transition-all duration-300"
                  style={{
                    width: `${deleteProgress.total > 0 ? (deleteProgress.current / deleteProgress.total) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleDelete}
            disabled={!canDelete || isDeleting || (deleteMode === 'selective' && selectedClients.length === 0)}
            className={`w-full h-14 text-lg font-bold ${
              canDelete && !isDeleting && (deleteMode === 'all' || selectedClients.length > 0)
                ? deleteMode === 'all' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
                : 'bg-gray-400'
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Deleting... Please wait
              </>
            ) : deleteMode === 'all' ? (
              <>
                <Trash2 className="w-5 h-5 mr-2" />
                {canDelete ? `DELETE ALL ${totalToDelete} RECORDS` : 'Enter Confirmation Phrase'}
              </>
            ) : (
              <>
                <Filter className="w-5 h-5 mr-2" />
                {canDelete && selectedClients.length > 0
                  ? `DELETE ${selectedShiftCount} SHIFTS (${selectedClients.length} clients)`
                  : selectedClients.length === 0
                    ? 'Select clients above'
                    : 'Enter Confirmation Phrase'}
              </>
            )}
          </Button>

          {!canDelete && !isDeleting && (
            <p className="text-sm text-gray-600 text-center italic">
              Type the confirmation phrase exactly as shown above to enable deletion
            </p>
          )}
        </CardContent>
      </Card>

      {/* Use Case */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💡 When to Use This</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h4 className="font-bold text-red-900 mb-2">🗑️ Delete ALL (Nuclear)</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>✅ Starting fresh for UAT testing</li>
                <li>✅ Full data reset after demos</li>
                <li>✅ Fixing bulk import errors</li>
                <li>❌ NOT for live production</li>
              </ul>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <h4 className="font-bold text-orange-900 mb-2">🎯 Select Clients (Targeted)</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>✅ Delete test client shifts only</li>
                <li>✅ Clean up "Divine Care Center" test data</li>
                <li>✅ Production-safe: real clients untouched</li>
                <li>✅ Perfect for ongoing testing</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}