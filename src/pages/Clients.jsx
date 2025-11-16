
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus, Search, Building2, Mail, Phone, MapPin,
  Edit, Trash2, Star, Navigation, Shield, Pencil, X as XIcon, AlertCircle, UserPlus, Download
} from "lucide-react";
import { toast } from "sonner";
import ClientGPSSetup from "../components/clients/ClientGPSSetup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import InviteClientModal from "../components/clients/InviteClientModal";


export default function Clients() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showGPSSetup, setShowGPSSetup] = useState(false);
  const [currentAgency, setCurrentAgency] = useState(null);

  const [editingClient, setEditingClient] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    contact_person: { name: '', email: '', phone: '', role: '' },
    address: { line1: '', line2: '', city: '', postcode: '' },
    billing_email: '',
    type: 'care_home',
    internal_locations: [],
    bed_capacity: null,
    cqc_rating: 'not_rated',
    payment_terms: 'net_30',
    contract_terms: {
      require_location_specification: false,
      break_duration_minutes: 0,
      contract_received: false, // New field
      contract_start_date: null, // New field
      rates_by_role: {
        nurse: { pay_rate: 0, charge_rate: 0 },
        care_worker: { pay_rate: 0, charge_rate: 0 },
        hca: { pay_rate: 0, charge_rate: 0 },
        senior_care_worker: { pay_rate: 0, charge_rate: 0 }
      }
    },
    notes: '' // New field
  });

  const [newLocation, setNewLocation] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false); // NEW STATE

  const queryClient = useQueryClient();

  // RBAC Check
  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Get authenticated user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          console.error('❌ Not authenticated:', authError);
          navigate(createPageUrl('Home'));
          return;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profile) {
          console.error('❌ Profile not found:', profileError);
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

        // Set current agency
        setCurrentAgency(profile.agency_id);
        console.log('Clients page - Agency:', profile.agency_id);

        setLoading(false);
      } catch (error) {
        console.error("Auth error:", error);
        toast.error('Authentication failed. Please log in again.');
        navigate(createPageUrl('Home'));
      }
    };
    checkAccess();
  }, [navigate]);

  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients', currentAgency],
    queryFn: async () => {
      console.log('📊 Querying clients for agency:', currentAgency);
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('agency_id', currentAgency)
        .order('created_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }

      console.log('✅ Loaded clients count:', data?.length || 0);
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const createClientMutation = useMutation({
    mutationFn: async (clientData) => {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          ...clientData,
          created_date: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      toast.success('✅ Client created successfully!');
      setShowAddModal(false);
      setEditFormData({
        name: '',
        contact_person: { name: '', email: '', phone: '', role: '' },
        address: { line1: '', line2: '', city: '', postcode: '' },
        billing_email: '',
        type: 'care_home',
        internal_locations: [],
        bed_capacity: null,
        cqc_rating: 'not_rated',
        payment_terms: 'net_30',
        contract_terms: {
          require_location_specification: false,
          break_duration_minutes: 0,
          contract_received: false,
          contract_start_date: null,
          rates_by_role: {
            nurse: { pay_rate: 0, charge_rate: 0 },
            care_worker: { pay_rate: 0, charge_rate: 0 },
            hca: { pay_rate: 0, charge_rate: 0 },
            senior_care_worker: { pay_rate: 0, charge_rate: 0 }
          }
        },
        notes: ''
      });
    },
    onError: (error) => {
      toast.error(`Failed to create client: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // CRITICAL: Check if client has shifts before deletion
      const { data: clientShifts } = await supabase
        .from('shifts')
        .select('*')
        .eq('client_id', id);

      if (clientShifts && clientShifts.length > 0) {
        throw new Error(
          `Cannot delete client: ${clientShifts.length} shift(s) assigned. ` +
          `Archive client instead or reassign shifts first.`
        );
      }

      // Check if client has bookings
      const { data: clientBookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_id', id);
        
      if (clientBookings && clientBookings.length > 0) {
        throw new Error(
          `Cannot delete client: ${clientBookings.length} booking(s) exist. ` +
          `Archive client instead.`
        );
      }

      // Check if client has timesheets
      const { data: clientTimesheets } = await supabase
        .from('timesheets')
        .select('*')
        .eq('client_id', id);
        
      if (clientTimesheets && clientTimesheets.length > 0) {
        throw new Error(
          `Cannot delete client: ${clientTimesheets.length} timesheet(s) exist. ` +
          `Archive client instead for audit trail.`
        );
      }

      // Check if client has invoices
      const { data: clientInvoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', id);
        
      if (clientInvoices && clientInvoices.length > 0) {
        throw new Error(
          `Cannot delete client: ${clientInvoices.length} invoice(s) exist. ` +
          `NEVER delete clients with financial records. Archive instead.`
        );
      }

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      toast.success('Client deleted');
    },
    onError: (error) => {
      toast.error(error.message, { duration: 8000 });
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: updated, error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      toast.success('Client updated successfully!');
      setEditingClient(null);
    },
    onError: (error) => {
      toast.error(`Failed to update client: ${error.message}`);
    }
  });

  const archiveClientMutation = useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase
        .from('clients')
        .update({
          status: 'inactive',
          archived_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      toast.success('Client archived successfully');
    },
    onError: (error) => {
      toast.error(`Failed to archive: ${error.message}`);
    }
  });

  const handleSaveNewClient = () => {
    if (!editFormData.name || !editFormData.contact_person.email) {
      toast.error('Client name and contact email are required');
      return;
    }

    createClientMutation.mutate(editFormData);
  };

  const handleEditClick = (client) => {
    setEditingClient(client);
    setEditFormData({
      name: client.name || '',
      shift_window_type: client.shift_window_type || '8_to_8', // NEW
      contact_person: {
        name: client.contact_person?.name || '',
        email: client.contact_person?.email || '',
        phone: client.contact_person?.phone || '',
        role: client.contact_person?.role || ''
      },
      address: {
        line1: client.address?.line1 || '',
        line2: client.address?.line2 || '',
        city: client.address?.city || '',
        postcode: client.address?.postcode || ''
      },
      billing_email: client.billing_email || client.contact_person?.email || '',
      type: client.type || 'care_home',
      internal_locations: client.internal_locations || [],
      bed_capacity: client.bed_capacity || null,
      cqc_rating: client.cqc_rating || 'not_rated',
      payment_terms: client.payment_terms || 'net_30',
      contract_terms: {
        require_location_specification: client.contract_terms?.require_location_specification || false,
        break_duration_minutes: client.contract_terms?.break_duration_minutes || 0,
        contract_received: client.contract_terms?.contract_received || false, // New field
        contract_start_date: client.contract_terms?.contract_start_date || null, // New field
        rates_by_role: {
          nurse: {
            pay_rate: client.contract_terms?.rates_by_role?.nurse?.pay_rate || 0,
            charge_rate: client.contract_terms?.rates_by_role?.nurse?.charge_rate || 0
          },
          care_worker: {
            pay_rate: client.contract_terms?.rates_by_role?.care_worker?.pay_rate || 0,
            charge_rate: client.contract_terms?.rates_by_role?.care_worker?.charge_rate || 0
          },
          hca: {
            pay_rate: client.contract_terms?.rates_by_role?.hca?.pay_rate || 0,
            charge_rate: client.contract_terms?.rates_by_role?.hca?.charge_rate || 0
          },
          senior_care_worker: {
            pay_rate: client.contract_terms?.rates_by_role?.senior_care_worker?.pay_rate || 0,
            charge_rate: client.contract_terms?.rates_by_role?.senior_care_worker?.charge_rate || 0
          }
        }
      },
      notes: client.notes || '' // New field
    });
  };

  const handleAddLocation = () => {
    if (!newLocation.trim()) {
      toast.error('Please enter a location name');
      return;
    }

    if (editFormData.internal_locations.includes(newLocation.trim())) {
      toast.error('This location already exists');
      return;
    }

    setEditFormData({
      ...editFormData,
      internal_locations: [...editFormData.internal_locations, newLocation.trim()]
    });
    setNewLocation('');
    toast.success(`✅ Added "${newLocation.trim()}"`);
  };

  const handleRemoveLocation = (location) => {
    setEditFormData({
      ...editFormData,
      internal_locations: editFormData.internal_locations.filter(loc => loc !== location)
    });
    toast.success(`🗑️ Removed "${location}"`);
  };

  const handleSaveEdit = () => {
    if (!editFormData.name || !editFormData.contact_person.email) {
      toast.error('Client name and contact email are required');
      return;
    }

    // Calculate enabled_roles based on configured rates
    const enabledRoles = {};
    Object.keys(editFormData.contract_terms.rates_by_role).forEach(role => {
      const rate = editFormData.contract_terms.rates_by_role[role];
      enabledRoles[role] = (rate.charge_rate > 0 || rate.pay_rate > 0);
    });

    updateClientMutation.mutate({
      id: editingClient.id,
      data: {
        ...editFormData,
        enabled_roles: enabledRoles // NEW: Auto-calculate enabled roles
      }
    });
  };

  const handleDeleteClick = (client) => {
    const CONFIRM_PHRASE = client.name;
    
    const userConfirmed = window.confirm(
      `⚠️ DANGER ZONE - DELETE CLIENT\n\n` +
      `Are you ABSOLUTELY SURE you want to delete:\n"${client.name}"?\n\n` +
      `This action:\n` +
      `❌ Cannot be undone\n` +
      `❌ Will fail if shifts/invoices exist\n` +
      `❌ Destroys audit trail\n\n` +
      `💡 RECOMMENDED: Use "Archive" instead (keeps data for compliance)\n\n` +
      `Click OK to proceed to final confirmation, or Cancel to abort.`
    );

    if (!userConfirmed) {
      toast.info('Deletion cancelled');
      return;
    }

    // Second confirmation with typed name
    const typedName = window.prompt(
      `⚠️ FINAL CONFIRMATION\n\n` +
      `Type the client name EXACTLY to confirm deletion:\n\n` +
      `"${CONFIRM_PHRASE}"`
    );

    if (typedName === null) {
      // User clicked Cancel
      toast.info('Deletion cancelled');
      return;
    }

    if (typedName.trim() !== CONFIRM_PHRASE) {
      toast.error(`Deletion cancelled - name did not match. You typed: "${typedName}"`);
      return;
    }

    // Proceed with deletion
    deleteMutation.mutate(client.id);
  };

  const handleArchiveClick = (client) => {
    const confirmArchive = window.confirm(
      `📦 ARCHIVE CLIENT\n\n` +
      `Archive "${client.name}"?\n\n` +
      `This will:\n` +
      `✅ Keep all shifts, invoices, and timesheets\n` +
      `✅ Maintain audit trail for compliance\n` +
      `✅ Hide from active lists\n` +
      `✅ Can be reactivated later\n\n` +
      `Proceed with archive?`
    );

    if (confirmArchive) {
      archiveClientMutation.mutate(client.id);
    } else {
      toast.info('Archive cancelled');
    }
  };

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ NEW: CSV Export Function
  const exportToCSV = () => {
    const csvData = filteredClients.map(client => ({
      'Client Name': client.name,
      'Type': client.type?.replace(/_/g, ' ') || '',
      'Status': client.status,
      'Contact Person': client.contact_person?.name || '',
      'Contact Role': client.contact_person?.role || '',
      'Contact Email': client.contact_person?.email || '',
      'Contact Phone': client.contact_person?.phone || '',
      'Billing Email': client.billing_email || '',
      'Address Line 1': client.address?.line1 || '',
      'Address Line 2': client.address?.line2 || '',
      'City': client.address?.city || '',
      'Postcode': client.address?.postcode || '',
      'Payment Terms': client.payment_terms?.replace(/_/g, ' ') || '',
      'CQC Rating': client.cqc_rating?.replace(/_/g, ' ') || '',
      'Bed Capacity': client.bed_capacity || '',
      'Nurse Pay Rate (£)': client.contract_terms?.rates_by_role?.nurse?.pay_rate || 0,
      'Nurse Charge Rate (£)': client.contract_terms?.rates_by_role?.nurse?.charge_rate || 0,
      'Care Worker Pay Rate (£)': client.contract_terms?.rates_by_role?.care_worker?.pay_rate || 0,
      'Care Worker Charge Rate (£)': client.contract_terms?.rates_by_role?.care_worker?.charge_rate || 0,
      'HCA Pay Rate (£)': client.contract_terms?.rates_by_role?.hca?.pay_rate || 0,
      'HCA Charge Rate (£)': client.contract_terms?.rates_by_role?.hca?.charge_rate || 0,
      'Senior Care Worker Pay Rate (£)': client.contract_terms?.rates_by_role?.senior_care_worker?.pay_rate || 0,
      'Senior Care Worker Charge Rate (£)': client.contract_terms?.rates_by_role?.senior_care_worker?.charge_rate || 0,
      'GPS Enabled': client.geofence_enabled ? 'Yes' : 'No',
      'Geofence Radius (m)': client.geofence_radius_meters || '',
      'Location Required': client.contract_terms?.require_location_specification ? 'Yes' : 'No',
      'Break Duration (mins)': client.contract_terms?.break_duration_minutes || 0,
      'Internal Locations': client.internal_locations?.join('; ') || '',
      'Contract Received': client.contract_terms?.contract_received ? 'Yes' : 'No', // New field
      'Contract Start': client.contract_terms?.contract_start_date || '', // New field
      'Total Bookings': client.total_bookings || 0,
      'Rating': client.rating || '', // Adjusted per outline
      'Notes': client.notes || '' // New field
    }));

    if (csvData.length === 0) {
      toast.info('No clients to export.');
      return;
    }

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.map(header => `"${header.replace(/"/g, '""')}"`).join(','),
      ...csvData.map(row => 
        headers.map(header => {
          let value = row[header];
          if (value === null || value === undefined) {
            value = '';
          }
          if (typeof value === 'number') {
            value = value.toString();
          }
          // Enclose values containing commas, double quotes, or newlines in double quotes, escape existing double quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clients_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up the URL object after download
    
    toast.success(`✅ Exported ${csvData.length} clients to CSV`);
  };

  const getTypeBadge = (type) => {
    const colors = {
      care_home: 'bg-blue-100 text-blue-800',
      hospital: 'bg-purple-100 text-purple-800',
      nursing_home: 'bg-green-100 text-green-800',
      residential_care: 'bg-orange-100 text-orange-800',
      supported_living: 'bg-indigo-100 text-indigo-800',
      home_care: 'bg-teal-100 text-teal-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const handleSetupGPS = (client) => {
    setSelectedClient(client);
    setShowGPSSetup(true);
  };

  const handleCloseGPS = () => {
    setShowGPSSetup(false);
    setSelectedClient(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading clients...</p>
        </div>
      </div>
    );
  }

  if (!user || user.user_type === 'staff_member') {
    return (
      <Card className="max-w-md mx-auto mt-20">
        <CardContent className="p-12 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">Client management is only accessible to agency administrators.</p>
          <Button onClick={() => navigate(createPageUrl('StaffPortal'))}>
            Go to Staff Portal
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Client Management</h2>
          <p className="text-gray-600 mt-1">
            Manage care homes and healthcare facilities • {clients.length} clients
          </p>
        </div>
        <div className="flex gap-2"> {/* Wrapper div for buttons */}
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={filteredClients.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            className="bg-gradient-to-r from-purple-500 to-pink-600"
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Client
          </Button>
          
          {/* ✅ NEW: Enhanced Onboarding Button */}
          <Button
            className="bg-gradient-to-r from-green-500 to-emerald-600"
            onClick={() => navigate(createPageUrl('OnboardClient'))}
          >
            <Plus className="w-4 h-4 mr-2" />
            Onboard Client ⭐
          </Button>
          
          <Button
            className="bg-gradient-to-r from-cyan-500 to-blue-600"
            onClick={() => {
              setShowAddModal(true);
              setEditFormData({
                name: '',
                contact_person: { name: '', email: '', phone: '', role: '' },
                address: { line1: '', line2: '', city: '', postcode: '' },
                billing_email: '',
                type: 'care_home',
                internal_locations: [],
                bed_capacity: null,
                cqc_rating: 'not_rated',
                payment_terms: 'net_30',
                contract_terms: {
                  require_location_specification: false,
                  break_duration_minutes: 0,
                  contract_received: false,
                  contract_start_date: null,
                  rates_by_role: {
                    nurse: { pay_rate: 0, charge_rate: 0 },
                    care_worker: { pay_rate: 0, charge_rate: 0 },
                    hca: { pay_rate: 0, charge_rate: 0 },
                    senior_care_worker: { pay_rate: 0, charge_rate: 0 }
                  }
                },
                notes: ''
              });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Quick Add
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map(client => {
          const hasGPS = client.location_coordinates?.latitude;
          const isArchived = client.status === 'inactive';

          return (
            <Card key={client.id} className={`hover:shadow-lg transition-shadow ${isArchived ? 'opacity-60 border-gray-400' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{client.name}</h3>
                      <Badge className={getTypeBadge(client.type)}>
                        {client.type?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                {isArchived && (
                  <div className="mb-3 p-2 bg-gray-100 border border-gray-300 rounded">
                    <p className="text-xs text-gray-700 font-semibold">📦 ARCHIVED</p>
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  {client.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <span>{client.address.city}, {client.address.postcode}</span>
                    </div>
                  )}
                  {client.contact_person?.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{client.contact_person.email}</span>
                    </div>
                  )}
                  {client.contact_person?.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{client.contact_person.phone}</span>
                    </div>
                  )}
                  {client.rating && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{client.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* GPS Status Badge */}
                {hasGPS ? (
                  <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 text-sm">
                      <Navigation className="w-4 h-4" />
                      <span className="font-semibold">GPS Configured</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Geofence: {client.geofence_radius_meters || 100}m radius
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-800 text-sm">
                      <MapPin className="w-4 h-4" />
                      <span className="font-semibold">GPS Not Set</span>
                    </div>
                    <p className="text-xs text-orange-700 mt-1">
                      Click "Setup GPS" to enable geofencing
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditClick(client)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSetupGPS(client)}
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      {hasGPS ? 'Edit GPS' : 'Setup GPS'}
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    {!isArchived ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchiveClick(client)}
                        className="flex-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                      >
                        📦 Archive
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => supabase
                          .from('clients')
                          .update({ status: 'active' })
                          .eq('id', client.id)
                          .then(() => {
                            queryClient.invalidateQueries(['clients']);
                            toast.success('Client reactivated');
                          })}
                        className="flex-1 text-green-600 border-green-300 hover:bg-green-50"
                      >
                        ✅ Reactivate
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(client)}
                      className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredClients.length === 0 && !isLoadingClients && ( // Using isLoadingClients
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Clients Found</h3>
            <p className="text-gray-600">Start by adding your first client</p>
          </CardContent>
        </Card>
      )}

      {/* GPS Setup Modal */}
      {showGPSSetup && selectedClient && (
        <Dialog open={showGPSSetup} onOpenChange={(open) => !open && handleCloseGPS()}>
          <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto p-0">
            <div className="p-6">
              <ClientGPSSetup
                client={selectedClient}
                onComplete={handleCloseGPS}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="new-client-name">Client Name *</Label>
                <Input
                  id="new-client-name"
                  placeholder="e.g., Castle Bank Residential Home"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="new-client-type">Facility Type *</Label>
                <select
                  id="new-client-type"
                  value={editFormData.type}
                  onChange={(e) => setEditFormData({...editFormData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="care_home">Care Home</option>
                  <option value="nursing_home">Nursing Home</option>
                  <option value="hospital">Hospital</option>
                  <option value="residential_care">Residential Care</option>
                  <option value="supported_living">Supported Living</option>
                  <option value="home_care">Home Care</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-contact-name">Contact Person Name</Label>
                  <Input
                    id="new-contact-name"
                    placeholder="e.g., John Smith"
                    value={editFormData.contact_person.name}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      contact_person: {...editFormData.contact_person, name: e.target.value}
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="new-contact-email">Contact Email *</Label>
                  <Input
                    id="new-contact-email"
                    type="email"
                    placeholder="e.g., manager@carehome.com"
                    value={editFormData.contact_person.email}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      contact_person: {...editFormData.contact_person, email: e.target.value}
                    })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="new-contact-phone">Contact Phone</Label>
                <Input
                  id="new-contact-phone"
                  placeholder="e.g., 01234567890"
                  value={editFormData.contact_person.phone}
                  onChange={(e) => setEditFormData({
                    ...editFormData,
                    contact_person: {...editFormData.contact_person, phone: e.target.value}
                  })}
                />
              </div>

              <div>
                <Label htmlFor="new-billing-email">Billing Email (if different)</Label>
                <Input
                  id="new-billing-email"
                  type="email"
                  placeholder="e.g., accounts@carehome.com"
                  value={editFormData.billing_email}
                  onChange={(e) => setEditFormData({...editFormData, billing_email: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="new-address-line1">Address Line 1</Label>
                  <Input
                    id="new-address-line1"
                    placeholder="e.g., 123 High Street"
                    value={editFormData.address.line1}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      address: {...editFormData.address, line1: e.target.value}
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="new-address-city">City</Label>
                  <Input
                    id="new-address-city"
                    placeholder="e.g., Wingate"
                    value={editFormData.address.city}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      address: {...editFormData.address, city: e.target.value}
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="new-address-postcode">Postcode</Label>
                  <Input
                    id="new-address-postcode"
                    placeholder="e.g., TS28 5EN"
                    value={editFormData.address.postcode}
                    onChange={(e) => setEditFormData({
                      ...editFormData,
                      address: {...editFormData.address, postcode: e.target.value}
                    })}
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                <p className="text-blue-900">
                  💡 <strong>Tip:</strong> You can setup GPS geofencing after creating the client using the "Setup GPS" button
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveNewClient}
                disabled={createClientMutation.isPending}
                className="bg-gradient-to-r from-cyan-500 to-blue-600"
              >
                {createClientMutation.isPending ? 'Creating...' : 'Create Client'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Client Modal - ENHANCED */}
      {editingClient && (
        <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Client: {editingClient.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client-name">Client Name *</Label>
                    <Input
                      id="client-name"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="client-type">Facility Type *</Label>
                    <select
                      id="client-type"
                      value={editFormData.type}
                      onChange={(e) => setEditFormData({...editFormData, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="care_home">Care Home</option>
                      <option value="nursing_home">Nursing Home</option>
                      <option value="hospital">Hospital</option>
                      <option value="residential_care">Residential Care</option>
                      <option value="supported_living">Supported Living</option>
                      <option value="home_care">Home Care</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="bed-capacity">Bed Capacity</Label>
                    <Input
                      id="bed-capacity"
                      type="number"
                      value={editFormData.bed_capacity || ''}
                      onChange={(e) => setEditFormData({...editFormData, bed_capacity: parseInt(e.target.value) || null})}
                      placeholder="e.g., 50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cqc-rating">CQC Rating</Label>
                    <select
                      id="cqc-rating"
                      value={editFormData.cqc_rating}
                      onChange={(e) => setEditFormData({...editFormData, cqc_rating: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="outstanding">Outstanding</option>
                      <option value="good">Good</option>
                      <option value="requires_improvement">Requires Improvement</option>
                      <option value="inadequate">Inadequate</option>
                      <option value="not_rated">Not Rated</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="payment-terms">Payment Terms</Label>
                    <select
                      id="payment-terms"
                      value={editFormData.payment_terms}
                      onChange={(e) => setEditFormData({...editFormData, payment_terms: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="net_7">Net 7 Days</option>
                      <option value="net_14">Net 14 Days</option>
                      <option value="net_30">Net 30 Days</option>
                      <option value="net_60">Net 60 Days</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact-name">Contact Person Name</Label>
                    <Input
                      id="contact-name"
                      value={editFormData.contact_person.name}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        contact_person: {...editFormData.contact_person, name: e.target.value}
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-role">Contact Person Role</Label>
                    <Input
                      id="contact-role"
                      value={editFormData.contact_person.role}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        contact_person: {...editFormData.contact_person, role: e.target.value}
                      })}
                      placeholder="e.g., Care Home Manager"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-email">Contact Email *</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={editFormData.contact_person.email}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        contact_person: {...editFormData.contact_person, email: e.target.value}
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-phone">Contact Phone</Label>
                    <Input
                      id="contact-phone"
                      value={editFormData.contact_person.phone}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        contact_person: {...editFormData.contact_person, phone: e.target.value}
                      })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="billing-email">Billing Email (if different)</Label>
                    <Input
                      id="billing-email"
                      type="email"
                      value={editFormData.billing_email}
                      onChange={(e) => setEditFormData({...editFormData, billing_email: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="address-line1">Address Line 1</Label>
                    <Input
                      id="address-line1"
                      value={editFormData.address.line1}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        address: {...editFormData.address, line1: e.target.value}
                      })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address-line2">Address Line 2</Label>
                    <Input
                      id="address-line2"
                      value={editFormData.address.line2}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        address: {...editFormData.address, line2: e.target.value}
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address-city">City</Label>
                    <Input
                      id="address-city"
                      value={editFormData.address.city}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        address: {...editFormData.address, city: e.target.value}
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address-postcode">Postcode</Label>
                    <Input
                      id="address-postcode"
                      value={editFormData.address.postcode}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        address: {...editFormData.address, postcode: e.target.value}
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Internal Locations (Rooms) - NEW SECTION */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-600" />
                  Internal Locations / Rooms
                </h3>
                <Alert className="border-cyan-300 bg-cyan-50">
                  <MapPin className="h-4 w-4 text-cyan-600" />
                  <AlertDescription className="text-cyan-900 text-sm">
                    <strong>💡 Important:</strong> Pre-define all rooms/units within this facility. These locations will be used when creating shifts to specify exactly where staff will work (e.g., "Room 14", "Lounge", "Dining Room").
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Input
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g., Room 14, Lounge, Dining Room"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLocation();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddLocation}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>

                {editFormData.internal_locations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {editFormData.internal_locations.map((location, idx) => (
                      <Badge
                        key={idx}
                        className="bg-cyan-100 text-cyan-800 hover:bg-cyan-200 px-3 py-1 flex items-center gap-2"
                      >
                        📍 {location}
                        <button
                          type="button"
                          onClick={() => handleRemoveLocation(location)}
                          className="ml-1 hover:text-red-600"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No locations added yet. Add rooms/units where staff will work.</p>
                )}
              </div>

              {/* Contract Terms */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Contract Terms</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded">
                    <input
                      type="checkbox"
                      id="require-location"
                      checked={editFormData.contract_terms.require_location_specification}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        contract_terms: {
                          ...editFormData.contract_terms,
                          require_location_specification: e.target.checked
                        }
                      })}
                      className="w-5 h-5"
                    />
                    <Label htmlFor="require-location" className="cursor-pointer flex-1">
                      <strong>Require Location Specification</strong>
                      <p className="text-xs text-amber-800 mt-1">
                        ⚠️ If enabled, ALL shifts MUST specify a work location (room/unit). This prevents invoice disputes.
                      </p>
                    </Label>
                  </div>

                  <div>
                    <Label htmlFor="break-duration">Standard Break Duration (minutes)</Label>
                    <Input
                      id="break-duration"
                      type="number"
                      value={editFormData.contract_terms.break_duration_minutes}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        contract_terms: {
                          ...editFormData.contract_terms,
                          break_duration_minutes: parseInt(e.target.value) || 0
                        }
                      })}
                      placeholder="e.g., 30"
                    />
                  </div>

                  {/* New contract fields */}
                  <div className="flex items-center gap-3 p-3 bg-sky-50 border border-sky-200 rounded">
                    <input
                      type="checkbox"
                      id="contract-received"
                      checked={editFormData.contract_terms.contract_received}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        contract_terms: {
                          ...editFormData.contract_terms,
                          contract_received: e.target.checked
                        }
                      })}
                      className="w-5 h-5"
                    />
                    <Label htmlFor="contract-received" className="cursor-pointer flex-1">
                      <strong>Contract Received & Signed</strong>
                      <p className="text-xs text-sky-800 mt-1">
                        Check this if a formal service agreement or contract has been received and signed.
                      </p>
                    </Label>
                  </div>

                  <div>
                    <Label htmlFor="contract-start-date">Contract Start Date</Label>
                    <Input
                      id="contract-start-date"
                      type="date"
                      value={editFormData.contract_terms.contract_start_date ? new Date(editFormData.contract_terms.contract_start_date).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        contract_terms: {
                          ...editFormData.contract_terms,
                          contract_start_date: e.target.value ? new Date(e.target.value).toISOString() : null
                        }
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* 🆕 SHIFT WINDOW CONFIGURATION - NEW SECTION */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                  🕐 Shift Window Configuration
                </h3>
                <Alert className="border-cyan-300 bg-cyan-50">
                  <AlertCircle className="h-4 w-4 text-cyan-600" />
                  <AlertDescription className="text-cyan-900 text-sm">
                    <strong>💡 Important:</strong> Define the 12-hour shift windows for day and night shifts. 99% of care homes use 8-8 windows.
                  </AlertDescription>
                </Alert>
                <div>
                  <Label htmlFor="shift-window-type">Shift Window Type</Label>
                  <select
                    id="shift-window-type"
                    value={editFormData.shift_window_type || '8_to_8'}
                    onChange={(e) => setEditFormData({...editFormData, shift_window_type: e.target.value})}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="8_to_8">🕐 8-8 Window (08:00-20:00 / 20:00-08:00) - Standard</option>
                    <option value="7_to_7">🕐 7-7 Window (07:00-19:00 / 19:00-07:00)</option>
                  </select>
                  <div className="mt-2 text-xs text-gray-500 space-y-1">
                    <div>• Day Shift: {editFormData.shift_window_type === '7_to_7' ? '07:00 - 19:00' : '08:00 - 20:00'}</div>
                    <div>• Night Shift: {editFormData.shift_window_type === '7_to_7' ? '19:00 - 07:00' : '20:00 - 08:00'}</div>
                  </div>
                </div>
              </div>

              {/* 🆕 CONTRACTUAL RATES BY ROLE - NEW SECTION */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                  💰 Contractual Rates by Role
                </h3>
                <Alert className="border-green-300 bg-green-50">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900 text-sm">
                    <strong>💡 CRITICAL:</strong> These are the agreed rates from your contract with this client. 
                    When creating shifts, these rates will auto-populate. This prevents rate discrepancies and ensures consistency.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  {/* Nurse Rates */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      🩺 Nurse
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nurse-pay">Staff Pay Rate (£/hr)</Label>
                        <Input
                          id="nurse-pay"
                          type="number"
                          step="0.01"
                          placeholder="e.g., 18.50"
                          value={editFormData.contract_terms.rates_by_role.nurse.pay_rate || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            contract_terms: {
                              ...editFormData.contract_terms,
                              rates_by_role: {
                                ...editFormData.contract_terms.rates_by_role,
                                nurse: {
                                  ...editFormData.contract_terms.rates_by_role.nurse,
                                  pay_rate: parseFloat(e.target.value) || 0
                                }
                              }
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="nurse-charge">Client Charge Rate (£/hr)</Label>
                        <Input
                          id="nurse-charge"
                          type="number"
                          step="0.01"
                          placeholder="e.g., 24.00"
                          value={editFormData.contract_terms.rates_by_role.nurse.charge_rate || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            contract_terms: {
                              ...editFormData.contract_terms,
                              rates_by_role: {
                                ...editFormData.contract_terms.rates_by_role,
                                nurse: {
                                  ...editFormData.contract_terms.rates_by_role.nurse,
                                  charge_rate: parseFloat(e.target.value) || 0
                                }
                              }
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    {editFormData.contract_terms.rates_by_role.nurse.charge_rate > 0 && editFormData.contract_terms.rates_by_role.nurse.pay_rate > 0 && (
                      <p className="text-xs text-blue-700 mt-2">
                        💰 Margin: £{(editFormData.contract_terms.rates_by_role.nurse.charge_rate - editFormData.contract_terms.rates_by_role.nurse.pay_rate).toFixed(2)}/hr 
                        ({((editFormData.contract_terms.rates_by_role.nurse.charge_rate - editFormData.contract_terms.rates_by_role.nurse.pay_rate) / editFormData.contract_terms.rates_by_role.nurse.charge_rate * 100).toFixed(1)}%)
                      </p>
                    )}
                  </div>

                  {/* Care Worker Rates */}
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                      👥 Care Worker
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cw-pay">Staff Pay Rate (£/hr)</Label>
                        <Input
                          id="cw-pay"
                          type="number"
                          step="0.01"
                          placeholder="e.g., 14.75"
                          value={editFormData.contract_terms.rates_by_role.care_worker.pay_rate || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            contract_terms: {
                              ...editFormData.contract_terms,
                              rates_by_role: {
                                ...editFormData.contract_terms.rates_by_role,
                                care_worker: {
                                  ...editFormData.contract_terms.rates_by_role.care_worker,
                                  pay_rate: parseFloat(e.target.value) || 0
                                }
                              }
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cw-charge">Client Charge Rate (£/hr)</Label>
                        <Input
                          id="cw-charge"
                          type="number"
                          step="0.01"
                          placeholder="e.g., 19.18"
                          value={editFormData.contract_terms.rates_by_role.care_worker.charge_rate || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            contract_terms: {
                              ...editFormData.contract_terms,
                              rates_by_role: {
                                ...editFormData.contract_terms.rates_by_role,
                                care_worker: {
                                  ...editFormData.contract_terms.rates_by_role.care_worker,
                                  charge_rate: parseFloat(e.target.value) || 0
                                }
                              }
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    {editFormData.contract_terms.rates_by_role.care_worker.charge_rate > 0 && editFormData.contract_terms.rates_by_role.care_worker.pay_rate > 0 && (
                      <p className="text-xs text-purple-700 mt-2">
                        💰 Margin: £{(editFormData.contract_terms.rates_by_role.care_worker.charge_rate - editFormData.contract_terms.rates_by_role.care_worker.pay_rate).toFixed(2)}/hr 
                        ({((editFormData.contract_terms.rates_by_role.care_worker.charge_rate - editFormData.contract_terms.rates_by_role.care_worker.pay_rate) / editFormData.contract_terms.rates_by_role.care_worker.charge_rate * 100).toFixed(1)}%)
                      </p>
                    )}
                  </div>

                  {/* HCA Rates */}
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                    <h4 className="font-semibold text-teal-900 mb-3 flex items-center gap-2">
                      🏥 HCA (Healthcare Assistant)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hca-pay">Staff Pay Rate (£/hr)</Label>
                        <Input
                          id="hca-pay"
                          type="number"
                          step="0.01"
                          placeholder="e.g., 15.50"
                          value={editFormData.contract_terms.rates_by_role.hca.pay_rate || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            contract_terms: {
                              ...editFormData.contract_terms,
                              rates_by_role: {
                                ...editFormData.contract_terms.rates_by_role,
                                hca: {
                                  ...editFormData.contract_terms.rates_by_role.hca,
                                  pay_rate: parseFloat(e.target.value) || 0
                                }
                              }
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hca-charge">Client Charge Rate (£/hr)</Label>
                        <Input
                          id="hca-charge"
                          type="number"
                          step="0.01"
                          placeholder="e.g., 20.15"
                          value={editFormData.contract_terms.rates_by_role.hca.charge_rate || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            contract_terms: {
                              ...editFormData.contract_terms,
                              rates_by_role: {
                                ...editFormData.contract_terms.rates_by_role,
                                hca: {
                                  ...editFormData.contract_terms.rates_by_role.hca,
                                  charge_rate: parseFloat(e.target.value) || 0
                                }
                              }
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    {editFormData.contract_terms.rates_by_role.hca.charge_rate > 0 && editFormData.contract_terms.rates_by_role.hca.pay_rate > 0 && (
                      <p className="text-xs text-teal-700 mt-2">
                        💰 Margin: £{(editFormData.contract_terms.rates_by_role.hca.charge_rate - editFormData.contract_terms.rates_by_role.hca.pay_rate).toFixed(2)}/hr 
                        ({((editFormData.contract_terms.rates_by_role.hca.charge_rate - editFormData.contract_terms.rates_by_role.hca.pay_rate) / editFormData.contract_terms.rates_by_role.hca.charge_rate * 100).toFixed(1)}%)
                      </p>
                    )}
                  </div>

                  {/* Senior Care Worker Rates */}
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                      ⭐ Senior Care Worker
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="scw-pay">Staff Pay Rate (£/hr)</Label>
                        <Input
                          id="scw-pay"
                          type="number"
                          step="0.01"
                          placeholder="e.g., 16.50"
                          value={editFormData.contract_terms.rates_by_role.senior_care_worker.pay_rate || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            contract_terms: {
                              ...editFormData.contract_terms,
                              rates_by_role: {
                                ...editFormData.contract_terms.rates_by_role,
                                senior_care_worker: {
                                  ...editFormData.contract_terms.rates_by_role.senior_care_worker,
                                  pay_rate: parseFloat(e.target.value) || 0
                                }
                              }
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="scw-charge">Client Charge Rate (£/hr)</Label>
                        <Input
                          id="scw-charge"
                          type="number"
                          step="0.01"
                          placeholder="e.g., 21.45"
                          value={editFormData.contract_terms.rates_by_role.senior_care_worker.charge_rate || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            contract_terms: {
                              ...editFormData.contract_terms,
                              rates_by_role: {
                                ...editFormData.contract_terms.rates_by_role,
                                senior_care_worker: {
                                  ...editFormData.contract_terms.rates_by_role.senior_care_worker,
                                  charge_rate: parseFloat(e.target.value) || 0
                                }
                              }
                            }
                          })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    {editFormData.contract_terms.rates_by_role.senior_care_worker.charge_rate > 0 && editFormData.contract_terms.rates_by_role.senior_care_worker.pay_rate > 0 && (
                      <p className="text-xs text-amber-700 mt-2">
                        💰 Margin: £{(editFormData.contract_terms.rates_by_role.senior_care_worker.charge_rate - editFormData.contract_terms.rates_by_role.senior_care_worker.pay_rate).toFixed(2)}/hr 
                        ({((editFormData.contract_terms.rates_by_role.senior_care_worker.charge_rate - editFormData.contract_terms.rates_by_role.senior_care_worker.pay_rate) / editFormData.contract_terms.rates_by_role.senior_care_worker.charge_rate * 100).toFixed(1)}%)
                      </p>
                    )}
                  </div>
                </div>

                <Alert className="border-gray-300 bg-gray-50">
                  <AlertCircle className="h-4 w-4 text-gray-600" />
                  <AlertDescription className="text-gray-700 text-xs">
                    <strong>💡 How it works:</strong> When you create a shift for this client and select a role, 
                    these rates will automatically populate in the shift form. You can override them on a per-shift basis if needed 
                    (e.g., for urgent shifts with incentive pay).
                  </AlertDescription>
                </Alert>
              </div>

              {/* Notes */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Notes</h3>
                <div>
                  <Label htmlFor="notes">Internal Notes (visible only to your agency)</Label>
                  <textarea
                    id="notes"
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Add any internal notes about this client, e.g., communication preferences, specific requirements, previous issues."
                  ></textarea>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingClient(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateClientMutation.isPending}
              >
                {updateClientMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ✅ NEW: Invite Client Modal */}
      <InviteClientModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        currentAgency={currentAgency}
      />
    </div>
  );
}
