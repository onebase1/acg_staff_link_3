
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

  // 🛡️ RBAC: Block staff members
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          navigate(createPageUrl('Home'));
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profile) {
          navigate(createPageUrl('Home'));
          return;
        }

        // 🚫 NO LONGER REDIRECTING STAFF - We want them to see their own payslips
        // if (profile.user_type === 'staff_member') {
        //   navigate(createPageUrl('StaffPortal'));
        //   return;
        // }
        
        setCurrentUser(profile);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, [navigate]);

  const { data: payslips = [] } = useQuery({
    queryKey: ['payslips', currentUser?.agency_id],
    queryFn: async () => {
      let query = supabase
        .from('payslips')
        .select('*')
        .eq('agency_id', currentUser?.agency_id);

      // 🔍 Filter for staff member: Only see their own payslips
      if (currentUser?.user_type === 'staff_member') {
        query = query.eq('staff_id', currentUser.id);
      }

      const { data, error } = await query.order('payment_date', { ascending: false });

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

  const getStaffMember = (staffId) => staff.find(s => s.id === staffId) || {};

  const filteredPayslips = payslips.filter(p =>
    statusFilter === 'all' || p.status === statusFilter
  );

  // 📥 Export payroll-ready CSV — one row per payslip (summary for payroll upload)
  // Contains all fields needed to import into Staffology / Xero / Sage / Brightpay
  const handleExportCSV = () => {
    if (filteredPayslips.length === 0) return;

    // TWO sheets in one file is not possible in CSV — we produce the payroll-upload format
    // (one row per employee per period), with shift detail appended as extra columns
    const headers = [
      // === EMPLOYEE IDENTITY (payroll app needs these to match/create employee) ===
      "Payslip Ref",
      "First Name", "Last Name",
      "NI Number", "Date of Birth", "Tax Code", "NI Category",
      "Email",
      // === BANK (for BACS payment) ===
      "Sort Code", "Account Number", "Account Name",
      // === PAY PERIOD ===
      "Period Start", "Period End", "Payment Date", "Payment Method",
      // === FINANCIALS ===
      "Total Hours", "Shifts Worked",
      "Gross Pay (£)", "PAYE Tax (£)", "Employee NI (£)", "Pension (£)",
      "Total Deductions (£)", "Net Pay (£)",
      // === STATUS ===
      "Status", "Agency PAYE Ref"
    ];

    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const rows = filteredPayslips.map(p => {
      const sm = getStaffMember(p.staff_id);
      const bd = sm.bank_details || {};
      const shiftCount = Array.isArray(p.timesheets) ? p.timesheets.length : (p.total_hours ? '?' : '');
      const totalDed = (p.tax || 0) + (p.ni || 0) + (p.pension || 0);

      return [
        p.payslip_number,
        sm.first_name || '', sm.last_name || '',
        sm.ni_number || '', sm.date_of_birth || '', sm.tax_code || '1257L', 'A',
        sm.email || '',
        bd.sort_code || '', bd.account_number || '', bd.account_name || (sm.first_name ? `${sm.first_name} ${sm.last_name}` : ''),
        p.period_start, p.period_end, p.payment_date || '', 'BACS',
        (p.total_hours || 0).toFixed(2), shiftCount,
        (p.gross_pay || 0).toFixed(2), (p.tax || 0).toFixed(2), (p.ni || 0).toFixed(2), (p.pension || 0).toFixed(2),
        totalDed.toFixed(2), (p.net_pay || 0).toFixed(2),
        p.status, agency?.paye_reference || ''
      ].map(cell).join(',');
    });

    // Append a blank line then shift-level detail as a second section
    const shiftHeaders = [
      "--- SHIFT DETAIL ---",
      "Payslip Ref", "Staff Name", "Shift Date", "Role", "Client", "Hours", "Shift Start", "Shift End", "Rate (£/hr)", "Shift Pay (£)"
    ];
    const csvRoleAbbr = { specialist_nurse: 'SRN', senior_carer: 'SC', healthcare_assistant: 'HCA', registered_nurse: 'RGN', support_worker: 'SW', care_assistant: 'CA' };
    const shiftRows = [];
    for (const p of filteredPayslips) {
      const shifts = Array.isArray(p.timesheets) && p.timesheets.length > 0 ? p.timesheets : null;
      if (shifts) {
        for (const ts of shifts) {
          shiftRows.push([
            '', // blank for alignment
            p.payslip_number,
            getStaffName(p.staff_id),
            ts.shift_date || '',
            csvRoleAbbr[ts.role] || (ts.role || '').replace(/_/g, ' '),
            ts.client_name || '',
            (ts.total_hours || 0).toFixed(2),
            ts.actual_start_time ? (ts.actual_start_time.length <= 5 ? ts.actual_start_time : format(new Date(ts.actual_start_time), 'HH:mm')) : '',
            ts.actual_end_time ? (ts.actual_end_time.length <= 5 ? ts.actual_end_time : format(new Date(ts.actual_end_time), 'HH:mm')) : '',
            ts.hourly_rate ? Number(ts.hourly_rate).toFixed(2) : '',
            (ts.staff_pay_amount || 0).toFixed(2)
          ].map(cell).join(','));
        }
      }
    }

    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows,
      '',
      shiftHeaders.map(h => `"${h}"`).join(','),
      ...shiftRows
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payroll_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // 🖨️ Print individual payslip — UK Employment Rights Act compliant
  const handlePrintPayslip = (payslip) => {
    const staffMember = getStaffMember(payslip.staff_id);
    const staffName = getStaffName(payslip.staff_id);
    const niNumber = staffMember.ni_number || 'Not recorded';
    const taxCode = staffMember.tax_code || '1257L';
    const niCategory = 'A'; // Standard — update when student/pension categories stored
    const agencyAddress = typeof agency?.address === 'string' ? agency.address : [agency?.address?.line1, agency?.address?.line2, agency?.address?.city, agency?.address?.postcode].filter(Boolean).join(', ') || '';
    const totalHours = (payslip.total_hours || 0).toFixed(2);
    const totalDeductions = (payslip.tax || 0) + (payslip.ni || 0) + (payslip.pension || 0);

    const printWindow = window.open('', '_blank');
    const content = `
      <html>
        <head>
          <title>Payslip - ${staffName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 32px; color: #1a1a1a; line-height: 1.5; font-size: 13px; }
            .container { max-width: 820px; margin: 0 auto; border: 1px solid #d1d5db; padding: 28px; border-radius: 6px; }

            /* Header */
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e40af; padding-bottom: 16px; margin-bottom: 20px; }
            .brand { font-size: 22px; font-weight: 800; color: #1e40af; }
            .employer-meta { font-size: 11px; color: #6b7280; margin-top: 4px; line-height: 1.6; }
            .payslip-badge { background: #1e40af; color: white; padding: 6px 16px; border-radius: 4px; font-size: 13px; font-weight: 700; letter-spacing: 0.05em; }
            .payslip-ref { font-size: 12px; color: #374151; margin-top: 6px; text-align: right; }

            /* Info grid — 4 columns */
            .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; }
            .info-cell {}
            .info-label { font-size: 10px; text-transform: uppercase; color: #9ca3af; font-weight: 600; letter-spacing: 0.06em; }
            .info-value { font-size: 13px; font-weight: 600; color: #111827; margin-top: 2px; }
            .info-value.highlight { color: #1e40af; }

            /* Earnings/deductions table */
            .table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
            .table th { text-align: left; padding: 9px 10px; border-bottom: 2px solid #e5e7eb; font-size: 11px; color: #6b7280; text-transform: uppercase; background: #f9fafb; }
            .table th:not(:first-child) { text-align: right; }
            .table td { padding: 9px 10px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
            .table td:not(:first-child) { text-align: right; }
            .row-earnings td { background: #f0fdf4; }
            .row-deduction td { background: #fef9f9; }
            .row-total td { background: #f1f5f9; font-weight: 700; border-top: 2px solid #d1d5db; }

            /* NI/Hours band */
            .compliance-band { display: flex; gap: 32px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 14px; margin: 16px 0; font-size: 12px; }
            .compliance-item {}
            .compliance-label { color: #6b7280; font-size: 10px; text-transform: uppercase; font-weight: 600; }
            .compliance-value { color: #1e3a8a; font-weight: 700; margin-top: 1px; }

            /* Shift journal */
            .journal-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em; }
            .journal-table { width: 100%; border-collapse: collapse; font-size: 11px; }
            .journal-table th { text-align: left; padding: 7px 8px; border-bottom: 1px solid #e5e7eb; color: #9ca3af; text-transform: uppercase; font-size: 10px; background: #f9fafb; }
            .journal-table th:not(:first-child):not(:nth-child(2)) { text-align: right; }
            .journal-table td { padding: 7px 8px; border-bottom: 1px solid #f3f4f6; }
            .journal-table td:not(:first-child):not(:nth-child(2)) { text-align: right; }
            .journal-table tr:last-child td { border-bottom: none; }

            /* Net pay */
            .net-pay-box { background: #1e40af; color: white; padding: 20px 24px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
            .net-pay-label { font-size: 13px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.05em; }
            .net-pay-amount { font-size: 30px; font-weight: 800; }

            .footer { margin-top: 28px; font-size: 11px; color: #9ca3af; text-align: center; font-style: italic; border-top: 1px solid #f3f4f6; padding-top: 12px; }
            @media print { body { padding: 0; } .container { border: none; } }
          </style>
        </head>
        <body>
          <div class="container">

            <!-- HEADER -->
            <div class="header">
              <div>
                <div class="brand">${agency?.name || 'ACG StaffLink'}</div>
                <div class="employer-meta">
                  ${agencyAddress ? agencyAddress + '<br>' : ''}
                  PAYE Ref: <strong>${agency?.paye_reference || 'Pending registration'}</strong>
                </div>
              </div>
              <div style="text-align:right">
                <div class="payslip-badge">PAYSLIP</div>
                <div class="payslip-ref">Ref: ${payslip.payslip_number}</div>
              </div>
            </div>

            <!-- EMPLOYEE / PERIOD INFO -->
            <div class="info-grid">
              <div class="info-cell">
                <div class="info-label">Employee</div>
                <div class="info-value">${staffName}</div>
              </div>
              <div class="info-cell">
                <div class="info-label">NI Number</div>
                <div class="info-value">${niNumber}</div>
              </div>
              <div class="info-cell">
                <div class="info-label">Tax Code</div>
                <div class="info-value highlight">${taxCode}</div>
              </div>
              <div class="info-cell">
                <div class="info-label">NI Category</div>
                <div class="info-value">${niCategory}</div>
              </div>
              <div class="info-cell">
                <div class="info-label">Pay Period</div>
                <div class="info-value">${format(new Date(payslip.period_start), 'dd MMM')} – ${format(new Date(payslip.period_end), 'dd MMM yyyy')}</div>
              </div>
              <div class="info-cell">
                <div class="info-label">Payment Date</div>
                <div class="info-value">${format(new Date(payslip.payment_date || new Date()), 'dd MMM yyyy')}</div>
              </div>
              <div class="info-cell">
                <div class="info-label">Payment Method</div>
                <div class="info-value">BACS / Bank Transfer</div>
              </div>
              <div class="info-cell">
                <div class="info-label">Total Hours</div>
                <div class="info-value highlight">${totalHours}h</div>
              </div>
            </div>

            <!-- EARNINGS & DEDUCTIONS -->
            <table class="table">
              <thead>
                <tr>
                  <th style="width:50%">Description</th>
                  <th>Units / Hours</th>
                  <th>Earnings (£)</th>
                  <th>Deductions (£)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="row-earnings">
                  <td>Basic Pay — Variable Hours${payslip.timesheets?.length ? ` (${payslip.timesheets.length} shifts)` : ''}${(() => { const rate = payslip.timesheets?.[0]?.hourly_rate; return rate ? ` @ £${Number(rate).toFixed(2)}/hr` : ''; })()}</td>
                  <td>${totalHours}h</td>
                  <td>${(payslip.gross_pay || 0).toFixed(2)}</td>
                  <td></td>
                </tr>
                <tr class="row-deduction">
                  <td>PAYE Income Tax (Tax Code: ${taxCode})</td>
                  <td></td>
                  <td></td>
                  <td>${(payslip.tax || 0).toFixed(2)}</td>
                </tr>
                <tr class="row-deduction">
                  <td>National Insurance (Cat ${niCategory})</td>
                  <td></td>
                  <td></td>
                  <td>${(payslip.ni || 0).toFixed(2)}</td>
                </tr>
                ${(payslip.pension || 0) > 0 ? `
                <tr class="row-deduction">
                  <td>Pension Contribution (Auto-Enrolment)</td>
                  <td></td>
                  <td></td>
                  <td>${(payslip.pension || 0).toFixed(2)}</td>
                </tr>` : ''}
                <tr class="row-total">
                  <td>Totals</td>
                  <td></td>
                  <td>${(payslip.gross_pay || 0).toFixed(2)}</td>
                  <td>${totalDeductions.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <!-- NI / HOURS COMPLIANCE BAND -->
            <div class="compliance-band">
              <div class="compliance-item">
                <div class="compliance-label">NI Number</div>
                <div class="compliance-value">${niNumber}</div>
              </div>
              <div class="compliance-item">
                <div class="compliance-label">NI Category</div>
                <div class="compliance-value">${niCategory}</div>
              </div>
              <div class="compliance-item">
                <div class="compliance-label">Total Hours This Period</div>
                <div class="compliance-value">${totalHours}h</div>
              </div>
              <div class="compliance-item">
                <div class="compliance-label">Shifts Worked</div>
                <div class="compliance-value">${payslip.timesheets?.length || '—'}</div>
              </div>
              <div class="compliance-item">
                <div class="compliance-label">Tax Code</div>
                <div class="compliance-value">${taxCode}</div>
              </div>
            </div>

            ${payslip.timesheets && payslip.timesheets.length > 0 ? (() => {
              const parseTime = (v) => { try { if (!v) return null; if (/^\d{1,2}:\d{2}$/.test(v.trim())) return v.trim().padStart(5,'0'); const d = new Date(v); return isNaN(d) ? null : d.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'}); } catch(e){ return null; } };
              const parseDate = (v) => { try { if (!v) return ''; const d = new Date(v); return isNaN(d) ? (v || '') : d.toLocaleDateString('en-GB'); } catch(e){ return v || ''; } };
              const hasClockTimes = payslip.timesheets.some(ts => parseTime(ts.actual_start_time) || parseTime(ts.actual_end_time));
              const roleAbbr = { specialist_nurse: 'SRN', senior_carer: 'SC', healthcare_assistant: 'HCA', registered_nurse: 'RGN', support_worker: 'SW', care_assistant: 'CA' };
              const hasRates = payslip.timesheets.some(ts => ts.hourly_rate);
              const hasLocation = payslip.timesheets.some(ts => ts.client_name);
              const rows = payslip.timesheets.map(ts => {
                const startStr = parseTime(ts.actual_start_time) || '—';
                const endStr = parseTime(ts.actual_end_time) || '—';
                const dateStr = parseDate(ts.shift_date);
                const roleDisplay = roleAbbr[ts.role] || (ts.role || 'Shift').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                return `<tr>
                  <td>${dateStr}</td>
                  <td>${roleDisplay}</td>
                  ${hasLocation ? `<td>${ts.client_name || '—'}</td>` : ''}
                  <td>${(ts.total_hours || 0).toFixed(2)}h</td>
                  ${hasClockTimes ? `<td>${startStr}</td><td>${endStr}</td>` : ''}
                  ${hasRates ? `<td style="text-align: right">£${Number(ts.hourly_rate || 0).toFixed(2)}/hr</td>` : ''}
                  <td style="text-align: right">£${(ts.staff_pay_amount || 0).toFixed(2)}</td>
                </tr>`;
              }).join('');
              return `<div style="margin-top: 20px; border-top: 1px dashed #d1d5db; padding-top: 14px;">
                <div class="journal-title">Shift Journal (Itemised Hours Breakdown)</div>
                <table class="journal-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Role</th>
                      ${hasLocation ? '<th>Client</th>' : ''}
                      <th>Hours</th>
                      ${hasClockTimes ? '<th>Start</th><th>End</th>' : ''}
                      ${hasRates ? '<th>Rate</th>' : ''}
                      <th>Pay (£)</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>`;
            })() : `<div style="margin-top: 16px; font-size: 11px; color: #9ca3af; font-style: italic; border-top: 1px dashed #e5e7eb; padding-top: 10px;">
                Itemised shift breakdown not available for this payslip period.
              </div>`}

            <!-- NET PAY -->
            <div class="net-pay-box">
              <div>
                <div class="net-pay-label">Net Pay This Period</div>
                <div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">Gross £${(payslip.gross_pay || 0).toFixed(2)} − Deductions £${totalDeductions.toFixed(2)}</div>
              </div>
              <div class="net-pay-amount">£${(payslip.net_pay || 0).toFixed(2)}</div>
            </div>

            <div class="footer">
              This payslip was issued by ${agency?.name || 'ACG StaffLink'} and generated by ACG StaffLink Payroll Engine.<br>
              Keep this document for your records. It is proof of income for tax, benefits and mortgage applications.
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              // window.close(); // Optional: close tab after print dialog
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

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
        <div className="flex gap-2">
          {filteredPayslips.length > 0 && (
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
          {currentUser?.user_type !== 'staff_member' && (
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600" onClick={() => navigate(createPageUrl('GeneratePayslips'))}>
              <Receipt className="w-4 h-4 mr-2" />
              Generate Payslips
            </Button>
          )}
        </div>
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
                
                {/* Always show core tax/NI fields to prove "AI calculations" works */}
                <div className="flex justify-between text-sm text-red-500">
                  <span>Tax (PAYE):</span>
                  <span>-£{(payslip.tax || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-red-500">
                  <span>National Insurance:</span>
                  <span>-£{(payslip.ni || 0).toFixed(2)}</span>
                </div>
                
                {payslip.pension > 0 && (
                  <div className="flex justify-between text-sm text-red-500">
                    <span>Pension:</span>
                    <span>-£{payslip.pension?.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Net Pay:</span>
                  <span className="text-green-600">£{payslip.net_pay?.toFixed(2) || '0.00'}</span>
                </div>
              </div>

              <Button 
                size="sm" 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => handlePrintPayslip(payslip)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download / Print
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
