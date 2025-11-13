import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Shield, CheckCircle, XCircle, User, Mail, Phone,
  AlertTriangle, Info, Search, Clock
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function StaffGPSConsent() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('created_date', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      return data || [];
    },
    refetchOnMount: 'always'
  });

  const updateConsentMutation = useMutation({
    mutationFn: async ({ staffId, consent }) => {
      const { error } = await supabase
        .from('staff')
        .update({
          gps_consent: consent,
          gps_consent_date: consent ? new Date().toISOString() : null
        })
        .eq('id', staffId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staff']);
      toast.success('GPS consent updated');
    }
  });

  const filteredStaff = staff.filter(s =>
    s.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: staff.length,
    consented: staff.filter(s => s.gps_consent).length,
    notConsented: staff.filter(s => !s.gps_consent).length,
    consentRate: staff.length > 0 
      ? ((staff.filter(s => s.gps_consent).length / staff.length) * 100).toFixed(0)
      : 0
  };

  const handleToggleConsent = (staffId, currentConsent) => {
    const newConsent = !currentConsent;
    
    if (!newConsent) {
      const confirmed = confirm(
        'Are you sure you want to revoke GPS consent for this staff member? They will not be able to clock in to shifts until they grant consent again.'
      );
      if (!confirmed) return;
    }

    updateConsentMutation.mutate({ staffId, consent: newConsent });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Staff GPS Consent Management</h2>
        <p className="text-gray-600 mt-1">Privacy-first location tracking permissions</p>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-300 bg-blue-50">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>GDPR Compliant:</strong> Staff must explicitly consent to GPS tracking. 
          Location is only captured during clock-in/out—never continuously tracked.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-gray-600">Total Staff</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-gray-600">Consented</p>
              <p className="text-3xl font-bold text-green-600">{stats.consented}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-gray-600">Not Consented</p>
              <p className="text-3xl font-bold text-red-600">{stats.notConsented}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-gray-600">Consent Rate</p>
              <p className="text-3xl font-bold text-purple-600">{stats.consentRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search staff by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Loading staff...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map(staffMember => (
            <Card key={staffMember.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {staffMember.first_name?.[0]}{staffMember.last_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {staffMember.first_name} {staffMember.last_name}
                      </h3>
                      <p className="text-xs text-gray-600 capitalize">
                        {staffMember.role?.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {staffMember.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{staffMember.email}</span>
                    </div>
                  )}
                  {staffMember.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{staffMember.phone}</span>
                    </div>
                  )}
                </div>

                {/* Consent Status */}
                <div className="mb-4">
                  {staffMember.gps_consent ? (
                    <div className="space-y-2">
                      <Badge className="bg-green-100 text-green-800 w-full justify-center py-2">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        GPS Consent Granted
                      </Badge>
                      {staffMember.gps_consent_date && (
                        <p className="text-xs text-gray-600 text-center">
                          Granted: {format(new Date(staffMember.gps_consent_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Badge className="bg-red-100 text-red-800 w-full justify-center py-2">
                      <XCircle className="w-4 h-4 mr-2" />
                      No GPS Consent
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {!staffMember.gps_consent ? (
                    <Alert className="border-yellow-300 bg-yellow-50 py-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-xs text-yellow-900">
                        Cannot clock in to GPS-enabled shifts
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-green-300 bg-green-50 py-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-xs text-green-900">
                        Can clock in with GPS verification
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleToggleConsent(staffMember.id, staffMember.gps_consent)}
                    disabled={updateConsentMutation.isPending}
                  >
                    {staffMember.gps_consent ? (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Revoke Consent
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Grant Consent
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredStaff.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Staff Found</h3>
            <p className="text-gray-600">Try adjusting your search</p>
          </CardContent>
        </Card>
      )}

      {/* Privacy Policy */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4" />
            GPS Privacy Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>What we collect:</strong> GPS coordinates, accuracy, timestamp (only during clock-in/out)</p>
            <p><strong>Why we collect it:</strong> Verify staff attendance at client locations, reduce disputes, comply with care regulations</p>
            <p><strong>How we store it:</strong> Encrypted, stored for 30 days, then automatically deleted</p>
            <p><strong>Who can access it:</strong> Agency admins only—staff can view their own data</p>
            <p><strong>Your rights:</strong> Revoke consent anytime, request data deletion, view all collected data</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}