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
  Bell, Receipt, DollarSign, Filter, Search, Eraser
} from 'lucide-react';
import { toast } from 'sonner';

export default function CleanSlate() {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0, entity: '' });
  const [deleteMode, setDeleteMode] = useState('all'); // 'all' or 'selective'
  const [selectedClients, setSelectedClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCleaningOrphans, setIsCleaningOrphans] = useState(false);
  const queryClient = useQueryClient();

  // Fetch counts for display
  const { data: shifts = [] } = useQuery({
    queryKey: ['all-shifts-count'],
    queryFn: async () => {
      const { data } = await supabase.from('shifts').select('*', { count: 'exact', head: true });
      return new Array(data?.length || 0);
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

  // Fetch clients with their shift counts
  const { data: clientsWithShifts = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients-with-shift-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select(`id, name, status, shifts:shifts(count)`)
        .order('name');

      if (error) throw error;

      return data.map(client => ({
        ...client,
        shiftCount: client.shifts?.[0]?.count || 0
      })).filter(c => c.shiftCount > 0);
    }
  });

  // ✅ NEW: Calculate exactly how many shifts will be deleted based on filters
  const { data: impactedShiftsCount = 0, isLoading: calculatingImpact } = useQuery({
    queryKey: ['deletion-impact', selectedClients, startDate, endDate, deleteMode],
    queryFn: async () => {
      if (deleteMode === 'all') {
        const { count } = await supabase.from('shifts').select('*', { count: 'exact', head: true });
        return count || 0;
      }
      if (selectedClients.length === 0) return 0;

      let query = supabase.from('shifts').select('*', { count: 'exact', head: true });
      query = query.in('client_id', selectedClients);
      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: true
  });

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clientsWithShifts;
    return clientsWithShifts.filter(c =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [clientsWithShifts, clientSearch]);

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

    setIsDeleting(true);
    try {
      setDeleteProgress({ current: 0, total: 100, entity: 'Initializing...' });
      let data, rpcError;

      if (deleteMode === 'all') {
        const { data: allData, error } = await supabase.rpc('delete_all_shift_data');
        data = allData;
        rpcError = error;
      } else {
        const { data: selData, error } = await supabase.rpc('delete_client_shift_data', {
          target_client_ids: selectedClients,
          start_date: startDate || null,
          end_date: endDate || null
        });
        data = selData;
        rpcError = error;
      }

      if (rpcError) {
        console.error('❌ Deletion failed:', rpcError);
        const errorMsg = rpcError.message?.includes('foreign key constraint')
          ? "Deletion failed: Active bookings or timesheets exist. Please run the provided SQL fix in Supabase Dashboard."
          : `Deletion failed: ${rpcError.message}`;
        toast.error(errorMsg, { duration: 10000 });
        return;
      }

      toast.success(`🎉 Deleted ${data?.deleted_shifts || 0} shifts successfully!`);
      await queryClient.invalidateQueries();
      setConfirmText('');
      setSelectedClients([]);
      setStartDate('');
      setEndDate('');

    } catch (error) {
      console.error('❌ Deletion failed:', error);
      toast.error(`Deletion failed: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteProgress({ current: 0, total: 0, entity: '' });
    }
  };

  const handleCleanupOrphans = async () => {
    setIsCleaningOrphans(true);
    try {
      const { data, error } = await supabase.rpc('cleanup_orphan_workflows');
      if (error) throw error;
      toast.success(`🎉 ${data.deleted_count} orphan workflows cleaned up!`);
      await queryClient.invalidateQueries(['workflows']);
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      toast.error(`Cleanup failed: ${error.message}`);
    } finally {
      setIsCleaningOrphans(false);
    }
  };

  const totalToDelete = shifts.length + bookings.length + timesheets.length + invoices.length + notifications.length;
  const CONFIRM_PHRASE = deleteMode === 'all' ? 'DELETE ALL SHIFTS' : 'DELETE SELECTED';
  const canDelete = confirmText === CONFIRM_PHRASE;

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      {/* 🚨 DANGER ZONE HEADER */}
      <Card className="border-0 shadow-2xl overflow-hidden rounded-xl">
        <div className="bg-red-600 p-4 flex items-center gap-3 text-white">
          <AlertTriangle className="w-8 h-8" />
          <h1 className="text-xl font-bold uppercase tracking-wider">🚨 DANGER ZONE: Clean Slate Utility</h1>
        </div>

        <CardContent className="p-6 space-y-6 bg-red-50/30">
          <Alert className="border-red-200 bg-white shadow-sm">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-gray-800 font-medium">
              <strong>⚠️ DESTRUCTIVE ACTION:</strong> This will permanently delete ALL selected data. This action CANNOT be undone!
            </AlertDescription>
          </Alert>

          {/* 📊 SUMMARY CARDS - WHAT WILL BE DELETED */}
          <div className="border-2 border-red-100 rounded-xl p-6 bg-white shadow-sm">
            <h3 className="text-red-800 font-bold uppercase text-sm mb-4 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> What will be DELETED:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-gray-700">Shifts</span>
                </div>
                <Badge className="bg-red-600 text-white text-lg px-3">{shifts.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-gray-700">Bookings</span>
                </div>
                <Badge className="bg-red-600 text-white text-lg px-3">{bookings.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-gray-700">Timesheets</span>
                </div>
                <Badge className="bg-red-600 text-white text-lg px-3">{timesheets.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-gray-700">Invoices</span>
                </div>
                <Badge className="bg-red-600 text-white text-lg px-3">{invoices.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-gray-700">Notifications</span>
                </div>
                <Badge className="bg-red-600 text-white text-lg px-3">{notifications.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-600 rounded-lg border-2 border-red-700 text-white shadow-md lg:col-span-1">
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5" />
                  <span className="font-bold uppercase text-xs">TOTAL TO DELETE</span>
                </div>
                <span className="text-2xl font-black">{totalToDelete}</span>
              </div>
            </div>
          </div>

          {/* ✅ SUMMARY CARDS - WHAT WILL BE PRESERVED */}
          <div className="border-2 border-green-100 rounded-xl p-6 bg-green-50/30">
            <h3 className="text-green-800 font-bold uppercase text-sm mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> What will be PRESERVED:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-gray-700">Staff</span>
                </div>
                <Badge className="bg-green-600 text-white text-lg px-3">{staff.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-gray-700">Clients</span>
                </div>
                <Badge className="bg-green-600 text-white text-lg px-3">{clients.length}</Badge>
              </div>
            </div>
          </div>

          <Tabs value={deleteMode} onValueChange={(v) => { setDeleteMode(v); setConfirmText(''); }} className="pt-4">
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
                  <strong>⚠️ NUCLEAR OPTION:</strong> This will delete ALL {shifts.length} shifts across ALL clients.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="selective">
              <Alert className="border-orange-400 bg-orange-50 mb-4">
                <Building2 className="h-5 w-5 text-orange-600" />
                <AlertDescription className="text-orange-900">
                  <strong>🎯 TARGETED:</strong> Select clients and optional dates. Only those shifts will be deleted.
                </AlertDescription>
              </Alert>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="sm" onClick={selectAllFiltered}>
                  {filteredClients.length > 0 && filteredClients.every(c => selectedClients.includes(c.id)) ? 'Deselect All' : 'Select All Visible'}
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCleanupOrphans} disabled={isCleaningOrphans}>
                    {isCleaningOrphans ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Cleanup Orphans
                  </Button>
                  <Badge variant="secondary">
                    {selectedClients.length} selected • {selectedShiftCount} shifts
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3 p-3 bg-gray-50 border rounded-lg">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">From Date (Optional)</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">To Date (Optional)</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              {/* ✅ QUICK SELECT BUTTONS */}
              <div className="flex flex-wrap gap-2 mb-6">
                <Button
                  variant="outline"
                  size="xs"
                  className="text-[10px] h-7 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 font-bold"
                  onClick={() => { setStartDate('2025-12-01'); setEndDate('2025-12-31'); }}
                >
                  🗓️ Dec 2025
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  className="text-[10px] h-7"
                  onClick={() => {
                    const d = new Date();
                    const first = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
                    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
                    setStartDate(first); setEndDate(last);
                  }}
                >
                  📅 This Month
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  className="text-[10px] h-7"
                  onClick={() => {
                    const d = new Date();
                    const first = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0];
                    const last = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0];
                    setStartDate(first); setEndDate(last);
                  }}
                >
                  ⏪ Last Month
                </Button>
                <Button variant="ghost" size="xs" className="text-[10px] h-7 text-gray-400" onClick={() => { setStartDate(''); setEndDate(''); }}>
                  Clear Dates
                </Button>
              </div>

              <ScrollArea className="h-64 border rounded-lg p-2">
                {loadingClients ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin" /></div>
                ) : filteredClients.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No clients with shifts found</p>
                ) : (
                  <div className="space-y-1">
                    {filteredClients.map(client => (
                      <div
                        key={client.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer ${selectedClients.includes(client.id) ? 'bg-orange-100 border' : 'hover:bg-gray-50'}`}
                        onClick={() => toggleClientSelection(client.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={selectedClients.includes(client.id)} />
                          <span className="font-medium">{client.name}</span>
                        </div>
                        <Badge variant="outline">{client.shiftCount} shifts</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-2 border-orange-400">
        <CardHeader className="bg-orange-50">
          <CardTitle>Confirmation Required</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Alert className="border-orange-400 bg-orange-50 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <div className="flex flex-col gap-1">
                <p>Type: <code className="bg-orange-200 px-2 rounded font-mono">{CONFIRM_PHRASE}</code></p>
                <div className="mt-2 p-2 bg-white border border-orange-200 rounded text-sm font-bold flex items-center justify-between">
                  <span>🎯 Impact Preview:</span>
                  {calculatingImpact ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="text-red-600 text-lg">
                      {impactedShiftsCount} shifts will be deleted
                    </span>
                  )}
                </div>
                {deleteMode === 'selective' && (startDate || endDate) && (
                  <p className="text-[10px] text-orange-700 italic mt-1">
                    * Showing count for {selectedClients.length} client(s) between {startDate || 'ANY'} and {endDate || 'ANY'}
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>

          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            className="text-lg font-mono"
            disabled={isDeleting}
          />

          <Button
            onClick={handleDelete}
            disabled={!canDelete || isDeleting || (deleteMode === 'selective' && selectedClients.length === 0)}
            className={`w-full h-14 text-lg font-bold ${canDelete ? 'bg-red-600' : 'bg-gray-400'}`}
          >
            {isDeleting ? <Loader2 className="animate-spin mr-2" /> : <Trash2 className="mr-2" />}
            {isDeleting ? 'Deleting...' : CONFIRM_PHRASE}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
