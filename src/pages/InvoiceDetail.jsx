
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Download, Send, Eye, Loader2, AlertCircle, AlertTriangle // Added AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function InvoiceDetail() {
  const [invoiceId, setInvoiceId] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setInvoiceId(params.get('id'));
  }, []);

  // ✅ FIX: Draft invoices query LIVE data, sent invoices use snapshot
  const { data: invoice } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('*');
      
      if (invError) {
        console.error('❌ Error fetching invoices:', invError);
        return null;
      }
      
      const inv = invoices?.find(inv => inv.id === invoiceId);
      
      // ✅ If draft, query live timesheet data
      if (inv && inv.status === 'draft' && inv.line_items) {
        console.log('📝 [Draft Invoice] Fetching live timesheet data...');
        const { data: allTimesheets, error: tsError } = await supabase
          .from('timesheets')
          .select('*');
        
        if (tsError) {
          console.error('❌ Error fetching timesheets:', tsError);
          return inv;
        }
        
        // Update line items with current timesheet data
        const updatedLineItems = inv.line_items.map(item => {
          const currentTimesheet = allTimesheets.find(t => t.id === item.timesheet_id);
          if (currentTimesheet) {
            return {
              ...item,
              work_location_within_site: currentTimesheet.work_location_within_site,
              hours: currentTimesheet.total_hours || item.hours,
              rate: currentTimesheet.charge_rate || item.rate,
              amount: currentTimesheet.client_charge_amount || item.amount,
              _live_data: true // Flag to indicate this is live
            };
          }
          return item;
        });
        
        // Recalculate totals with live data
        const subtotal = updatedLineItems.reduce((sum, item) => sum + item.amount, 0);
        const vatAmount = subtotal * (inv.vat_rate / 100);
        const total = subtotal + vatAmount;
        
        return {
          ...inv,
          line_items: updatedLineItems,
          subtotal,
          vat_amount: vatAmount,
          total,
          balance_due: total - (inv.amount_paid || 0),
          _is_live: true
        };
      }
      
      return inv;
    },
    enabled: !!invoiceId,
    refetchInterval: (data) => {
      // Auto-refresh draft invoices every 30 seconds
      return data?.status === 'draft' ? 30000 : false;
    }
  });

  const { data: client } = useQuery({
    queryKey: ['client', invoice?.client_id],
    queryFn: async () => {
      if (!invoice?.client_id) return null;
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', invoice.client_id)
        .single();
      
      if (error) {
        console.error('❌ Error fetching client:', error);
        return null;
      }
      return data;
    },
    enabled: !!invoice?.client_id,
    refetchOnMount: 'always'
  });

  const { data: agency } = useQuery({
    queryKey: ['agency', invoice?.agency_id],
    queryFn: async () => {
      if (!invoice?.agency_id) return null;
      
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', invoice.agency_id)
        .single();
      
      if (error) {
        console.error('❌ Error fetching agency:', error);
        return null;
      }
      return data;
    },
    enabled: !!invoice?.agency_id,
    refetchOnMount: 'always'
  });

  // NEW: Mutation for sending draft invoice
  const sendInvoiceMutation = useMutation({
    mutationFn: async () => {
      console.log('📧 [Send Invoice] Sending invoice:', invoiceId);
      const { data: response, error } = await supabase.functions.invoke('send-invoice', {
        body: {
          invoice_id: invoiceId
        }
      });
      
      if (error) {
        console.error('❌ Error sending invoice:', error);
        throw error;
      }
      return response.data;
    },
    onSuccess: (data) => {
      console.log('✅ [Send Invoice] Success:', data);
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(
        <div>
          <p className="font-bold">Invoice Sent!</p>
          <p className="text-sm">📧 {data.message}</p>
        </div>
      );
    },
    onError: (error) => {
      console.error('❌ [Send Invoice] Error:', error);
      toast.error(`Failed to send invoice: ${error.message}`);
    }
  });

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleSendInvoice = async () => {
    if (sendInvoiceMutation.isPending) {
      toast.warning('Already sending...');
      return;
    }

    const recipientEmail = client?.billing_email || client?.contact_person?.email;
    const confirmMessage = `Send this invoice to ${client?.name}?\n\nThis will:\n✅ Email the invoice with PDF to ${recipientEmail || 'the client'}\n✅ Lock the invoice (cannot be edited after sending)\n✅ Client will be able to view and download`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    sendInvoiceMutation.mutate();
  };

  if (!invoice) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Loading invoice...</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const variants = {
      draft: { className: 'bg-gray-100 text-gray-800', text: 'Draft' },
      sent: { className: 'bg-blue-100 text-blue-800', text: 'Sent' },
      viewed: { className: 'bg-cyan-100 text-cyan-800', text: 'Viewed' },
      partially_paid: { className: 'bg-yellow-100 text-yellow-800', text: 'Partially Paid' },
      paid: { className: 'bg-green-100 text-green-800', text: 'Paid' },
      overdue: { className: 'bg-red-100 text-red-800', text: 'Overdue' },
      cancelled: { className: 'bg-gray-100 text-gray-600', text: 'Cancelled' }
    };
    return variants[status] || variants.draft;
  };

  const statusInfo = getStatusBadge(invoice.status);

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoice Details</h2>
          <p className="text-gray-600 mt-1">Invoice #{invoice.invoice_number}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
          {invoice.status !== 'draft' && (
             <Button variant="outline" onClick={() => toast.info('Link copied to clipboard', { description: 'Client can view this invoice using this link.' })}>
             <Eye className="w-4 h-4 mr-2" />
             View Link
           </Button>
          )}
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          {/* FIXED: Send button only for draft invoices */}
          {invoice.status === 'draft' && (
            <Button
              onClick={handleSendInvoice}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
              disabled={sendInvoiceMutation.isPending}
            >
              {sendInvoiceMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invoice
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Draft Warning Alert */}
      {invoice.status === 'draft' && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>📝 DRAFT INVOICE:</strong> This invoice has not been sent to the client yet.
            Review carefully, then click <strong>"Send Invoice"</strong> to email it and lock it for audit compliance.
            {invoice._is_live && <span className="block mt-1 text-sm">✨ Live data - refreshes every 30 seconds</span>}
          </AlertDescription>
        </Alert>
      )}

      {/* Invoice Document */}
      <Card className="shadow-lg print:shadow-none">
        <CardContent className="p-12">
          {/* Header */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                {agency?.logo_url ? (
                  <img
                    src={agency.logo_url}
                    alt={agency.name}
                    className="h-16 w-auto object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">
                      {agency?.name?.[0] || 'ACG'}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{agency?.name || 'Agile Care Group'}</h1>
                  <p className="text-sm text-gray-600">Healthcare Staffing Solutions</p>
                </div>
              </div>
              {agency?.address && (
                <div className="text-sm text-gray-600">
                  <p>{agency.address.line1}</p>
                  {agency.address.line2 && <p>{agency.address.line2}</p>}
                  <p>{agency.address.city}, {agency.address.postcode}</p>
                  <p className="mt-2">Email: {agency.contact_email}</p>
                  <p>Phone: {agency.contact_phone}</p>
                </div>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h2>
              <p className="text-sm text-gray-600">
                Invoice #: <span className="font-semibold">{invoice.invoice_number}</span>
              </p>
              <p className="text-sm text-gray-600">
                Date: <span className="font-semibold">{format(new Date(invoice.invoice_date), 'MMMM d, yyyy')}</span>
              </p>
              <Badge {...statusInfo} className="mt-2">
                {statusInfo.text}
              </Badge>
            </div>
          </div>

          {/* Client & Invoice Info */}
          <div className="grid md:grid-cols-2 gap-8 mb-12 pb-8 border-b">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">BILL TO:</h3>
              <div className="text-sm">
                <p className="font-semibold text-gray-900 text-lg">{client?.name}</p>
                {client?.address && (
                  <>
                    <p className="text-gray-600">{client.address.line1}</p>
                    {client.address.line2 && <p className="text-gray-600">{client.address.line2}</p>}
                    <p className="text-gray-600">{client.address.city}, {client.address.postcode}</p>
                  </>
                )}
                {client?.contact_person && (
                  <div className="mt-3">
                    <p className="text-gray-600">Attn: {client.contact_person.name}</p>
                    <p className="text-gray-600">{client.contact_person.email}</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">INVOICE DETAILS:</h3>
              <div className="space-y-2.text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice Period:</span>
                  <span className="font-medium">
                    {format(new Date(invoice.period_start), 'MMM d')} - {format(new Date(invoice.period_end), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Terms:</span>
                  <span className="font-medium">{client?.payment_terms?.replace('net_', 'Net ') || 'Net 30'} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Due Date:</span>
                  <span className="font-medium text-red-600">
                    {format(new Date(invoice.due_date), 'MMMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* FIX 4: Enhanced Line Items Table with ROLE column */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">SERVICES PROVIDED:</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-700 uppercase">Date</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-700 uppercase">Staff Member</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-700 uppercase">Role</th>
                    {client?.contract_terms?.require_location_specification && (
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-700 uppercase">Location</th>
                    )}
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-700 uppercase">Shift Type</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-gray-700 uppercase">Hours</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-gray-700 uppercase">Rate</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-gray-700 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items?.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-2 text-sm text-gray-700">
                        {format(new Date(item.shift_date), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-900 font-medium">
                        {item.staff_name}
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-700">
                        {/* ✅ FIX 1: Show actual role from line item */}
                        <span className="font-semibold text-blue-700">
                          {item.role || 'Care Staff'}
                        </span>
                      </td>
                      {client?.contract_terms?.require_location_specification && (
                        <td className="py-3 px-2 text-sm">
                          {/* ✅ FIX 2: Graceful location display */}
                          {item.work_location_within_site ? (
                            <span className="font-semibold text-cyan-700">
                              {item.work_location_within_site}
                            </span>
                          ) : (
                            <span className="text-amber-600 italic text-xs">
                              ⚠️ Not Specified
                            </span>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-2 text-center">
                        {item.shift_type === 'night' ? (
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 text-xs">Night</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs">Day</Badge>
                        )}
                      </td>
                      <td className="py-3 px-2 text-sm text-right text-gray-700">
                        {item.hours.toFixed(1)}h
                      </td>
                      <td className="py-3 px-2 text-sm text-right text-gray-700">
                        £{item.rate.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-sm text-right text-gray-900 font-medium">
                        £{item.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-12">
            <div className="w-80">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">£{invoice.subtotal?.toFixed(2)}</span>
                </div>
                {invoice.vat_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">VAT ({invoice.vat_rate}%):</span>
                    <span className="font-medium">£{invoice.vat_amount?.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t-2 border-gray-300 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-cyan-600">£{invoice.total?.toFixed(2)}</span>
                  </div>
                </div>
                {invoice.amount_paid > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Amount Paid:</span>
                    <span className="font-medium">-£{invoice.amount_paid?.toFixed(2)}</span>
                  </div>
                )}
                {invoice.balance_due > 0 && (
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Balance Due:</span>
                    <span className="text-2xl font-bold text-red-600">£{invoice.balance_due?.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className={`p-6 rounded-lg border ${
            !agency?.bank_details || !agency.bank_details.account_name 
              ? 'bg-red-50 border-red-300' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">PAYMENT INSTRUCTIONS:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Please make payment via bank transfer to:</p>

              {agency?.bank_details && agency.bank_details.account_name ? (
                <div className="mt-3 space-y-1">
                  {agency.bank_details.account_name && (
                    <p className="font-medium text-gray-900">
                      <span className="text-gray-600">Account Name:</span> {agency.bank_details.account_name}
                    </p>
                  )}
                  {agency.bank_details.account_number && (
                    <p className="font-medium text-gray-900">
                      <span className="text-gray-600">Account Number:</span> {agency.bank_details.account_number}
                    </p>
                  )}
                  {agency.bank_details.sort_code && (
                    <p className="font-medium text-gray-900">
                      <span className="text-gray-600">Sort Code:</span> {agency.bank_details.sort_code}
                    </p>
                  )}
                  {agency.bank_details.bank_name && (
                    <p className="font-medium text-gray-900">
                      <span className="text-gray-600">Bank:</span> {agency.bank_details.bank_name}
                    </p>
                  )}
                  {agency.bank_details.iban && (
                    <p className="font-medium text-gray-900 text-xs">
                      <span className="text-gray-600">IBAN:</span> {agency.bank_details.iban}
                    </p>
                  )}
                  {agency.bank_details.swift_bic && (
                    <p className="font-medium text-gray-900 text-xs">
                      <span className="text-gray-600">SWIFT/BIC:</span> {agency.bank_details.swift_bic}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-3 p-4 bg-red-100 border-l-4 border-red-500 rounded">
                  <p className="font-bold text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    ⚠️ CRITICAL: Bank Details Missing
                  </p>
                  <p className="text-sm text-red-700 mt-2">
                    This invoice cannot be sent without payment instructions. 
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    <strong>Action Required:</strong> Go to Agency Settings → Bank Details to configure payment information.
                  </p>
                </div>
              )}

              <p className="mt-3">Reference: <span className="font-semibold">{invoice.invoice_number}</span></p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t text-center text-sm text-gray-500">
            <p>Thank you for your business!</p>
            <p className="mt-2">
              For any queries regarding this invoice, please contact {agency?.contact_email || 'accounts@agilecaregroup.com'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
