import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Building2, UserCheck, Users, Loader2, CheckCircle } from 'lucide-react';

export default function ApproveUserModal({ workflow, isOpen, onClose }) {
  const [selectedAgency, setSelectedAgency] = useState('');
  const [selectedUserType, setSelectedUserType] = useState('staff_member');
  const [notes, setNotes] = useState('');
  
  const queryClient = useQueryClient();

  // Extract user details from workflow
  const userEmail = workflow?.related_entity?.email;
  const userId = workflow?.related_entity?.entity_id;
  const userName = workflow?.title?.replace('New User Signup: ', '') || userEmail;

  // Fetch agencies
  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name, contact_email')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen
  });

  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgency) {
        throw new Error('Please select an agency');
      }

      console.log('🔄 [ApproveUser] Approving user:', userEmail);
      console.log('🔄 [ApproveUser] Agency:', selectedAgency);
      console.log('🔄 [ApproveUser] User Type:', selectedUserType);

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          user_type: selectedUserType,
          agency_id: selectedAgency,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) {
        console.error('❌ [ApproveUser] Profile update failed:', profileError);
        throw profileError;
      }

      console.log('✅ [ApproveUser] Profile updated successfully');

      // Mark workflow as resolved
      const { error: workflowError } = await supabase
        .from('admin_workflows')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: 'g.basera@yahoo.com',
          resolution_notes: notes || `User approved and assigned to agency as ${selectedUserType.replace('_', ' ')}`
        })
        .eq('id', workflow.id);

      if (workflowError) {
        console.error('❌ [ApproveUser] Workflow update failed:', workflowError);
        throw workflowError;
      }

      console.log('✅ [ApproveUser] Workflow resolved successfully');

      return { userEmail, selectedAgency, selectedUserType };
    },
    onSuccess: ({ userEmail, selectedAgency, selectedUserType }) => {
      queryClient.invalidateQueries(['workflows']);
      queryClient.invalidateQueries(['profiles']);
      
      const agencyName = agencies.find(a => a.id === selectedAgency)?.name || 'agency';
      const roleLabel = selectedUserType.replace('_', ' ');
      
      toast.success(`✅ User approved!`, {
        description: `${userEmail} assigned to ${agencyName} as ${roleLabel}`
      });
      
      onClose();
      setSelectedAgency('');
      setSelectedUserType('staff_member');
      setNotes('');
    },
    onError: (error) => {
      console.error('❌ [ApproveUser] Error:', error);
      toast.error(`Failed to approve user: ${error.message}`);
    }
  });

  const handleApprove = () => {
    approveMutation.mutate();
  };

  if (!workflow) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Approve User Signup
          </DialogTitle>
          <DialogDescription>
            Assign <strong>{userName}</strong> to an agency and role
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>Email:</strong> {userEmail}
            </p>
            <p className="text-sm text-blue-900">
              <strong>Name:</strong> {userName}
            </p>
          </div>

          {/* Agency Selection */}
          <div>
            <Label htmlFor="agency">Agency *</Label>
            <Select value={selectedAgency} onValueChange={setSelectedAgency}>
              <SelectTrigger id="agency" className="mt-1">
                <SelectValue placeholder="Select agency..." />
              </SelectTrigger>
              <SelectContent>
                {agencies.map(agency => (
                  <SelectItem key={agency.id} value={agency.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {agency.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* User Type Selection */}
          <div>
            <Label htmlFor="userType">Role *</Label>
            <Select value={selectedUserType} onValueChange={setSelectedUserType}>
              <SelectTrigger id="userType" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff_member">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    Staff Member
                  </div>
                </SelectItem>
                <SelectItem value="agency_admin">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Agency Admin
                  </div>
                </SelectItem>
                <SelectItem value="client">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Client
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Optional Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this approval..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={approveMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleApprove} 
            disabled={!selectedAgency || approveMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {approveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve User
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

