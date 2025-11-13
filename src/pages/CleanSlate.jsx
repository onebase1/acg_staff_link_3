import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, AlertTriangle, CheckCircle, Calendar, 
  Clock, FileText, Users, Building2, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function CleanSlate() {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0, entity: '' });
  const queryClient = useQueryClient();

  // Fetch counts for display
  const { data: shifts = [] } = useQuery({
    queryKey: ['all-shifts-count'],
    queryFn: async () => {
      const { data } = await supabase.from('shifts').select('*');
      return data || [];
    }
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['all-bookings-count'],
    queryFn: async () => {
      const { data } = await supabase.from('bookings').select('*');
      return data || [];
    }
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['all-timesheets-count'],
    queryFn: async () => {
      const { data } = await supabase.from('timesheets').select('*');
      return data || [];
    }
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['all-staff-count'],
    queryFn: async () => {
      const { data } = await supabase.from('staff').select('*');
      return data || [];
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['all-clients-count'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('*');
      return data || [];
    }
  });

  const handleBulkDelete = async () => {
    const CONFIRM_PHRASE = 'DELETE ALL SHIFTS';
    
    if (confirmText !== CONFIRM_PHRASE) {
      toast.error(`Please type "${CONFIRM_PHRASE}" exactly to confirm`);
      return;
    }

    setIsDeleting(true);

    try {
      // Step 1: Delete all Timesheets (depends on Shifts/Bookings)
      console.log('🗑️ Step 1: Deleting timesheets...');
      setDeleteProgress({ current: 0, total: timesheets.length, entity: 'Timesheets' });
      
      for (let i = 0; i < timesheets.length; i++) {
        await supabase.from('timesheets').delete().eq('id', timesheets[i].id);
        setDeleteProgress({ current: i + 1, total: timesheets.length, entity: 'Timesheets' });
      }
      
      toast.success(`✅ Deleted ${timesheets.length} timesheets`);

      // Step 2: Delete all Bookings (depends on Shifts)
      console.log('🗑️ Step 2: Deleting bookings...');
      setDeleteProgress({ current: 0, total: bookings.length, entity: 'Bookings' });
      
      for (let i = 0; i < bookings.length; i++) {
        await supabase.from('bookings').delete().eq('id', bookings[i].id);
        setDeleteProgress({ current: i + 1, total: bookings.length, entity: 'Bookings' });
      }
      
      toast.success(`✅ Deleted ${bookings.length} bookings`);

      // Step 3: Delete all Shifts (core entity)
      console.log('🗑️ Step 3: Deleting shifts...');
      setDeleteProgress({ current: 0, total: shifts.length, entity: 'Shifts' });
      
      for (let i = 0; i < shifts.length; i++) {
        await supabase.from('shifts').delete().eq('id', shifts[i].id);
        setDeleteProgress({ current: i + 1, total: shifts.length, entity: 'Shifts' });
      }
      
      toast.success(`✅ Deleted ${shifts.length} shifts`);

      // Refresh all queries
      queryClient.invalidateQueries(['shifts']);
      queryClient.invalidateQueries(['bookings']);
      queryClient.invalidateQueries(['timesheets']);
      queryClient.invalidateQueries(['workflows']);
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['payslips']);
      queryClient.invalidateQueries(['all-shifts-count']);
      queryClient.invalidateQueries(['all-bookings-count']);
      queryClient.invalidateQueries(['all-timesheets-count']);

      toast.success('🎉 CLEAN SLATE COMPLETE! All shifts, bookings, and timesheets deleted. Staff and clients preserved.');
      setConfirmText('');

    } catch (error) {
      console.error('❌ Clean slate error:', error);
      toast.error(`Deletion failed: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteProgress({ current: 0, total: 0, entity: '' });
    }
  };

  const totalToDelete = shifts.length + bookings.length + timesheets.length;
  const canDelete = confirmText === 'DELETE ALL SHIFTS';

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
              <strong>⚠️ DESTRUCTIVE ACTION:</strong> This will permanently delete ALL shifts, bookings, and timesheets from the database. This action CANNOT be undone!
            </AlertDescription>
          </Alert>

          <div className="bg-white p-4 rounded-lg border-2 border-red-200">
            <h3 className="font-bold text-red-900 mb-3">What will be DELETED:</h3>
            <div className="space-y-2">
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
              <div className="flex items-center justify-between p-3 bg-red-100 rounded border-2 border-red-400">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-700" />
                  <span className="font-bold text-red-900">TOTAL TO DELETE</span>
                </div>
                <Badge className="bg-red-700 text-white text-xl">{totalToDelete}</Badge>
              </div>
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

      {/* Confirmation Section */}
      <Card className="border-2 border-orange-400">
        <CardHeader className="bg-orange-50">
          <CardTitle>Confirmation Required</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Alert className="border-orange-400 bg-orange-50">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>Type the phrase exactly:</strong> <code className="bg-orange-200 px-2 py-1 rounded font-mono">DELETE ALL SHIFTS</code>
            </AlertDescription>
          </Alert>

          <div>
            <label className="block text-sm font-semibold mb-2">Confirmation Phrase:</label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type: DELETE ALL SHIFTS"
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
              <p className="text-sm text-blue-700 mt-1">
                {deleteProgress.current} / {deleteProgress.total}
              </p>
            </div>
          )}

          <Button
            onClick={handleBulkDelete}
            disabled={!canDelete || isDeleting}
            className={`w-full h-14 text-lg font-bold ${
              canDelete && !isDeleting
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-400'
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Deleting... Please wait
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5 mr-2" />
                {canDelete ? `DELETE ${totalToDelete} RECORDS` : 'Enter Confirmation Phrase'}
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
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✅ <strong>Starting fresh for UAT testing</strong> - Remove all test shifts while keeping staff/client data</li>
            <li>✅ <strong>Data reset after demo</strong> - Clean slate for real production data</li>
            <li>✅ <strong>Fixing bulk import errors</strong> - Delete bad data and re-import correctly</li>
            <li>❌ <strong>NOT for individual shift cleanup</strong> - Use normal delete buttons for that</li>
            <li>❌ <strong>NOT for live production</strong> - Only use in testing environments</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}