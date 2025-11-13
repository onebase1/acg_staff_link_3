
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Receipt, User, Calendar, DollarSign, Download, Building2
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom"; // Added useNavigate for navigation

// A simple placeholder for createPageUrl. In a real application, this might come from a routing utility.
const createPageUrl = (path) => {
  // Assuming 'GeneratePayslips' is meant to be a direct path like '/generatepayslips'
  // Or it could be a dynamic path construction based on your routing setup.
  // For this implementation, we'll assume it's directly the path.
  return `/${path.toLowerCase()}`; 
};

export default function Payslips() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate(); // Initialize useNavigate hook

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

        setCurrentUser(profile);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: payslips = [] } = useQuery({
    queryKey: ['payslips', currentUser?.agency_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payslips')
        .select('*')
        .eq('agency_id', currentUser?.agency_id)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching payslips:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentUser?.agency_id,
    refetchOnMount: 'always'
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', currentUser?.agency_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('agency_id', currentUser?.agency_id)
        .order('first_name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentUser?.agency_id,
    refetchOnMount: 'always'
  });

  const { data: agency } = useQuery({
    queryKey: ['agency', currentUser?.agency_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', currentUser?.agency_id)
        .single();

      if (error) {
        console.error('❌ Error fetching agency:', error);
        return null;
      }
      return data;
    },
    enabled: !!currentUser?.agency_id,
    refetchOnMount: 'always'
  });

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'Unknown';
  };

  const filteredPayslips = payslips.filter(p => 
    statusFilter === 'all' || p.status === statusFilter
  );

  const getStatusBadge = (status) => {
    const variants = {
      draft: { className: 'bg-gray-100 text-gray-800' },
      approved: { className: 'bg-blue-100 text-blue-800' },
      paid: { className: 'bg-green-100 text-green-800' },
      cancelled: { className: 'bg-red-100 text-red-800' }
    };
    return variants[status] || variants.draft;
  };

  return (
    <div className="space-y-6">
      {/* Header with Agency Branding */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          {agency?.logo_url && (
            <img 
              src={agency.logo_url} 
              alt={agency.name}
              className="h-12 w-12 rounded-lg object-contain border-2 border-gray-200 p-1"
            />
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Payslips</h2>
            <p className="text-gray-600 mt-1">
              {agency ? `${agency.name} - Staff payments` : 'Manage staff payments and payslips'}
            </p>
          </div>
        </div>
        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600" onClick={() => navigate(createPageUrl('GeneratePayslips'))}>
          <Receipt className="w-4 h-4 mr-2" />
          Generate Payslips
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 overflow-x-auto">
            <Button 
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button 
              variant={statusFilter === 'draft' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('draft')}
            >
              Draft
            </Button>
            <Button 
              variant={statusFilter === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('approved')}
            >
              Approved
            </Button>
            <Button 
              variant={statusFilter === 'paid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('paid')}
            >
              Paid
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payslips List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPayslips.map(payslip => (
          <Card key={payslip.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500">Payslip</p>
                  <p className="text-lg font-bold text-gray-900">#{payslip.payslip_number}</p>
                </div>
                <Badge {...getStatusBadge(payslip.status)}>
                  {payslip.status}
                </Badge>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{getStaffName(payslip.staff_id)}</span>
                </div>
                {payslip.period_start && payslip.period_end && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>
                      {format(new Date(payslip.period_start), 'MMM d')} - {format(new Date(payslip.period_end), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                {payslip.payment_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span>Paid: {format(new Date(payslip.payment_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Gross Pay:</span>
                  <span className="font-medium">£{payslip.gross_pay?.toFixed(2) || '0.00'}</span>
                </div>
                {payslip.total_deductions > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Deductions:</span>
                    <span>-£{payslip.total_deductions?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Net Pay:</span>
                  <span className="text-green-600">£{payslip.net_pay?.toFixed(2) || '0.00'}</span>
                </div>
              </div>

              <Button size="sm" variant="outline" className="w-full mt-4">
                <Download className="w-4 h-4 mr-2" />
                Download Payslip
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPayslips.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payslips Found</h3>
            <p className="text-gray-600">Generate payslips for your staff</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
