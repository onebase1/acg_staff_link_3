
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  FileText, Building2, Calendar, Plus, Send, Eye, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner"; // Assuming sonner is used for toasts

export default function Invoices() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [sendingInvoices, setSendingInvoices] = useState(new Set()); // ✅ FIX 1: Track individual invoices
  const [currentAgency, setCurrentAgency] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // For invalidating queries after send

  // Get current user and agency
  useEffect(() => {
    const fetchUser = async () => {
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

      setCurrentAgency(profile.agency_id);
    };
    fetchUser();
  }, []);

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', currentAgency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('agency_id', currentAgency)
        .order('invoice_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching invoices:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', currentAgency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('agency_id', currentAgency)
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching clients:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentAgency,
    refetchOnMount: 'always'
  });

  // Query for approved timesheets ready to invoice
  const { data: readyToInvoiceCount = 0 } = useQuery({
    queryKey: ['ready-to-invoice-count', currentAgency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timesheets')
        .select('*', { count: 'exact', head: false })
        .eq('agency_id', currentAgency)
        .eq('status', 'approved')
        .is('invoice_id', null);

      if (error) {
        console.error('❌ Error counting timesheets:', error);
        return 0;
      }
      return data?.length || 0;
    },
    enabled: !!currentAgency
  });

  // Mutation for sending draft invoices
  // ✅ FIX 2: Enhanced mutation with per-invoice tracking
  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId) => {
      console.log('📧 [Send Invoice] Sending invoice:', invoiceId);
      const { data, error } = await supabase.functions.invoke('send-invoice', {
        body: {
          invoice_id: invoiceId
        }
      });
      if (error) throw error;
      return { invoiceId, data }; // ✅ FIX: Return invoiceId with data
    },
    onMutate: (invoiceId) => {
      console.log('🔄 [Send Invoice] Mutation started for:', invoiceId);
      // ✅ FIX: Add this specific invoice to sending set
      setSendingInvoices(prev => new Set([...prev, invoiceId]));
    },
    onSuccess: ({ invoiceId, data }) => { // ✅ FIX: Destructure invoiceId from result
      console.log('✅ [Send Invoice] Success for:', invoiceId, data);
      
      // ✅ FIX: Remove this specific invoice from sending set
      setSendingInvoices(prev => {
        const newSet = new Set(prev);
        newSet.delete(invoiceId);
        return newSet;
      });

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(
        <div>
          <p className="font-bold">Invoice Sent!</p>
          <p className="text-sm">📧 {data.message}</p>
        </div>,
        { duration: 5000 }
      );
    },
    onError: (error, invoiceId) => { // ✅ FIX: invoiceId is passed as variables
      console.error('❌ [Send Invoice] Error for:', invoiceId, error);
      
      // ✅ FIX: Remove this specific invoice from sending set
      setSendingInvoices(prev => {
        const newSet = new Set(prev);
        newSet.delete(invoiceId);
        return newSet;
      });

      toast.error(`Failed to send invoice: ${error.message || 'An unknown error occurred.'}`);
    }
  });

  const handleSendInvoice = (invoice) => {
    // ✅ FIX: Prevent double-send for this specific invoice
    if (sendingInvoices.has(invoice.id)) {
      console.log('⏸️ [Send Invoice] Already sending invoice:', invoice.id);
      toast.warning('This invoice is already being sent, please wait.');
      return;
    }

    const confirmMessage = `Send invoice #${invoice.invoice_number} to ${getClientName(invoice.client_id)}?\n\nThis will:\n✅ Email the invoice to the client\n✅ Lock the invoice (cannot be edited after sending)`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    sendInvoiceMutation.mutate(invoice.id);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  const filteredInvoices = invoices.filter(inv =>
    statusFilter === 'all' || inv.status === statusFilter
  );

  const getStatusBadge = (status) => {
    const variants = {
      draft: { className: 'bg-gray-100 text-gray-800' },
      sent: { className: 'bg-blue-100 text-blue-800' },
      viewed: { className: 'bg-cyan-100 text-cyan-800' },
      partially_paid: { className: 'bg-yellow-100 text-yellow-800' },
      paid: { className: 'bg-green-100 text-green-800' },
      overdue: { className: 'bg-red-100 text-red-800' },
      cancelled: { className: 'bg-gray-100 text-gray-600' }
    };
    return variants[status] || variants.draft;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
          <p className="text-gray-600 mt-1">Manage client invoicing and payments</p>
        </div>
        <Button
          className="bg-gradient-to-r from-cyan-500 to-blue-600"
          onClick={() => navigate(createPageUrl('GenerateInvoices'))}
        >
          <FileText className="w-4 h-4 mr-2" />
          Create Invoice
          {readyToInvoiceCount > 0 && (
            <Badge className="ml-2 bg-green-600 text-white">
              {readyToInvoiceCount} ready
            </Badge>
          )}
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
              variant={statusFilter === 'sent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('sent')}
            >
              Sent
            </Button>
            <Button
              variant={statusFilter === 'paid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('paid')}
            >
              Paid
            </Button>
            <Button
              variant={statusFilter === 'overdue' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('overdue')}
            >
              Overdue
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInvoices.map(invoice => {
          // ✅ FIX: Check if THIS specific invoice is sending
          const isThisInvoiceSending = sendingInvoices.has(invoice.id);

          return (
            <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Invoice</p>
                    <p className="text-lg font-bold text-gray-900">#{invoice.invoice_number}</p>
                  </div>
                  <Badge {...getStatusBadge(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{getClientName(invoice.client_id)}</span>
                  </div>
                  {invoice.invoice_date && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>Issued: {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {invoice.due_date && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {invoice.line_items && (
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      {invoice.line_items.length} shift(s) •
                      {' '}{invoice.line_items.reduce((sum, item) => sum + item.hours, 0).toFixed(1)}h total
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">£{invoice.subtotal?.toFixed(2) || '0.00'}</span>
                  </div>
                  {invoice.vat_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">VAT:</span>
                      <span className="font-medium">£{invoice.vat_amount?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-cyan-600">£{invoice.total?.toFixed(2) || '0.00'}</span>
                  </div>
                  {invoice.balance_due > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Balance Due:</span>
                      <span className="font-semibold">£{invoice.balance_due?.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Link to={`${createPageUrl('InvoiceDetail')}?id=${invoice.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </Link>
                  {invoice.status === 'draft' && (
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleSendInvoice(invoice)}
                      disabled={isThisInvoiceSending} // ✅ FIX: Disable only this button
                    >
                      {isThisInvoiceSending ? ( // ✅ FIX: Show spinner only for this invoice
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredInvoices.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Invoices Found</h3>
            <p className="text-gray-600">Create your first invoice to get started</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
