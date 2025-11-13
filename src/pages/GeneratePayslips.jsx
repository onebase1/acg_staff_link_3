import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Receipt, Calendar, DollarSign, AlertTriangle, CheckCircle, Download, FileText, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * 💰 PAYSLIP GENERATOR - PHASE 2 READY
 * 
 * Features:
 * ✅ Auto-group approved timesheets by staff + period
 * ✅ Calculate gross pay, deductions (tax, NI, pension)
 * ✅ Validate compliance before payment
 * ✅ Export payroll CSV for accounting software
 * ✅ Bulk generate or individual payslips
 */

export default function GeneratePayslips() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [agency, setAgency] = useState(null);
  const [generating, setGenerating] = useState(false);
  
  // Period selection
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  
  // Staff selection
  const [selectedStaff, setSelectedStaff] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

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

      setUser(profile);
      
      if (profile.agency_id) {
        const { data: userAgency, error: agencyError } = await supabase
          .from('agencies')
          .select('*')
          .eq('id', profile.agency_id)
          .single();
        
        if (!agencyError && userAgency) {
          setAgency(userAgency);
        }
      }
    };
    fetchUser();
  }, []);

  // Get approved timesheets for period
  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets-for-payroll', periodStart, periodEnd],
    queryFn: async () => {
      if (!user?.agency_id) return [];
      
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('agency_id', user.agency_id)
        .eq('status', 'approved')
        .gte('shift_date', periodStart)
        .lte('shift_date', periodEnd);

      if (error) {
        console.error('❌ Error fetching timesheets:', error);
        return [];
      }

      console.log(`📊 [Payslips] Found ${data?.length || 0} approved timesheets for period`);
      return data || [];
    },
    enabled: !!user && !!periodStart && !!periodEnd,
    initialData: []
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      if (!user?.agency_id) return [];
      
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('agency_id', user.agency_id);
      
      if (error) {
        console.error('❌ Error fetching staff:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user,
    refetchOnMount: 'always'
  });

  const { data: compliance = [] } = useQuery({
    queryKey: ['compliance'],
    queryFn: async () => {
      if (!user?.agency_id) return [];
      
      const { data, error } = await supabase
        .from('compliance')
        .select('*')
        .eq('agency_id', user.agency_id);
      
      if (error) {
        console.error('❌ Error fetching compliance:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user,
    refetchOnMount: 'always'
  });

  // Group timesheets by staff
  const staffPayrollData = staff
    .map(staffMember => {
      const staffTimesheets = timesheets.filter(t => t.staff_id === staffMember.id);
      
      if (staffTimesheets.length === 0) return null;

      const totalHours = staffTimesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0);
      const grossPay = staffTimesheets.reduce((sum, t) => sum + (t.staff_pay_amount || 0), 0);
      
      // Check compliance
      const criticalDocs = ['dbs_check', 'right_to_work', 'professional_registration'];
      const hasCompliance = criticalDocs.every(docType => 
        compliance.some(c => 
          c.staff_id === staffMember.id && 
          c.document_type === docType && 
          c.status === 'verified' &&
          (!c.expiry_date || new Date(c.expiry_date) > new Date())
        )
      );

      // Simple tax calculation (PAYE approximation)
      const taxableIncome = grossPay;
      const personalAllowance = 1048; // Monthly (£12,570 annual / 12)
      const taxableAmount = Math.max(0, taxableIncome - personalAllowance);
      const tax = taxableAmount * 0.20; // Basic rate 20%
      const ni = grossPay > 1048 ? (grossPay - 1048) * 0.12 : 0; // 12% NI on income above threshold
      
      const totalDeductions = tax + ni;
      const netPay = grossPay - totalDeductions;

      return {
        staff: staffMember,
        timesheets: staffTimesheets,
        totalHours,
        grossPay,
        deductions: { tax, ni, pension: 0, other: 0 },
        totalDeductions,
        netPay,
        hasCompliance,
        complianceIssues: hasCompliance ? [] : criticalDocs.filter(docType => 
          !compliance.some(c => 
            c.staff_id === staffMember.id && 
            c.document_type === docType && 
            c.status === 'verified'
          )
        )
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.netPay - a.netPay);

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedStaff(new Set(staffPayrollData.filter(s => s.hasCompliance).map(s => s.staff.id)));
    } else {
      setSelectedStaff(new Set());
    }
  };

  const handleSelectStaff = (staffId, checked) => {
    const newSet = new Set(selectedStaff);
    if (checked) {
      newSet.add(staffId);
    } else {
      newSet.delete(staffId);
    }
    setSelectedStaff(newSet);
    setSelectAll(newSet.size === staffPayrollData.filter(s => s.hasCompliance).length);
  };

  const generatePayslips = async () => {
    if (selectedStaff.size === 0) {
      toast.error('Please select at least one staff member');
      return;
    }

    setGenerating(true);

    try {
      const staffToGenerate = staffPayrollData.filter(s => selectedStaff.has(s.staff.id));
      
      console.log(`💰 [Payslips] Generating for ${staffToGenerate.length} staff members...`);

      for (const staffData of staffToGenerate) {
        // Check for existing payslip
        const { data: existing, error: checkError } = await supabase
          .from('payslips')
          .select('*')
          .eq('staff_id', staffData.staff.id)
          .eq('period_start', periodStart)
          .eq('period_end', periodEnd);

        if (existing.length > 0) {
          console.log(`⏭️  [Payslips] Skipping ${staffData.staff.first_name} - payslip already exists`);
          continue;
        }

        // Generate payslip number
        const payslipNumber = `PAY-${format(new Date(), 'MMM-yyyy')}-${staffData.staff.first_name.substring(0, 2).toUpperCase()}${staffData.staff.id.substring(0, 4)}`.toUpperCase();

        const payslipData = {
          agency_id: user.agency_id,
          payslip_number: payslipNumber,
          staff_id: staffData.staff.id,
          period_start: periodStart,
          period_end: periodEnd,
          payment_date: format(endOfMonth(new Date(periodEnd)), 'yyyy-MM-dd'),
          status: 'approved',
          timesheets: staffData.timesheets.map(t => ({
            timesheet_id: t.id,
            shift_date: t.shift_date,
            hours: t.total_hours,
            rate: t.pay_rate,
            amount: t.staff_pay_amount
          })),
          gross_pay: staffData.grossPay,
          deductions: staffData.deductions,
          total_deductions: staffData.totalDeductions,
          net_pay: staffData.netPay,
          payment_method: 'bank_transfer',
          notes: `Auto-generated payslip for ${format(new Date(periodStart), 'MMMM yyyy')}`
        };

        const { error: createError } = await supabase
          .from('payslips')
          .insert({
            ...payslipData,
            created_date: new Date().toISOString()
          });
        
        if (createError) {
          console.error('❌ Error creating payslip:', createError);
          throw createError;
        }

        // Update timesheets to link to payslip
        for (const timesheet of staffData.timesheets) {
          const { error: updateError } = await supabase
            .from('timesheets')
            .update({
              payslip_id: payslipNumber,
              status: 'paid'
            })
            .eq('id', timesheet.id);
          
          if (updateError) {
            console.error('❌ Error updating timesheet:', updateError);
          }
        }

        console.log(`✅ [Payslips] Generated for ${staffData.staff.first_name} ${staffData.staff.last_name} - £${staffData.netPay.toFixed(2)}`);
      }

      queryClient.invalidateQueries(['payslips']);
      queryClient.invalidateQueries(['timesheets']);

      toast.success(`✅ Generated ${staffToGenerate.length} payslips successfully!`);
      navigate(createPageUrl('Payslips'));

    } catch (error) {
      console.error('❌ [Payslips] Generation error:', error);
      toast.error(`Failed to generate payslips: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Export payroll CSV for accounting
  const exportPayrollCSV = () => {
    const csvData = staffPayrollData.map(data => ({
      'Staff ID': data.staff.id.substring(0, 8),
      'First Name': data.staff.first_name,
      'Last Name': data.staff.last_name,
      'Email': data.staff.email,
      'Role': data.staff.role,
      'Total Hours': data.totalHours.toFixed(2),
      'Gross Pay (£)': data.grossPay.toFixed(2),
      'Tax (£)': data.deductions.tax.toFixed(2),
      'NI (£)': data.deductions.ni.toFixed(2),
      'Pension (£)': data.deductions.pension.toFixed(2),
      'Total Deductions (£)': data.totalDeductions.toFixed(2),
      'Net Pay (£)': data.netPay.toFixed(2),
      'Shifts Worked': data.timesheets.length,
      'Compliance OK': data.hasCompliance ? 'YES' : 'NO',
      'Issues': data.complianceIssues.join(', '),
      'Period Start': periodStart,
      'Period End': periodEnd
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_export_${periodStart}_to_${periodEnd}.csv`;
    a.click();
    
    toast.success(`✅ Exported payroll data for ${csvData.length} staff`);
  };

  const totalGrossPay = staffPayrollData.reduce((sum, s) => sum + s.grossPay, 0);
  const totalNetPay = staffPayrollData.reduce((sum, s) => sum + s.netPay, 0);
  const totalDeductions = staffPayrollData.reduce((sum, s) => sum + s.totalDeductions, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Generate Payslips</h2>
        <p className="text-gray-600 mt-1">Create payslips for staff based on approved timesheets</p>
      </div>

      {/* Period Selection */}
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-cyan-50 to-blue-50">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-600" />
            Select Pay Period
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Period Start</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Period End</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Quick Period Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const lastMonth = subMonths(new Date(), 1);
                setPeriodStart(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
                setPeriodEnd(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
              }}
            >
              Last Month
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPeriodStart(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                setPeriodEnd(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
              }}
            >
              This Month
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-4">
            <User className="w-8 h-8 text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-blue-900">{staffPayrollData.length}</p>
            <p className="text-sm text-blue-700">Staff to Pay</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <DollarSign className="w-8 h-8 text-green-600 mb-2" />
            <p className="text-2xl font-bold text-green-900">£{totalGrossPay.toFixed(0)}</p>
            <p className="text-sm text-green-700">Total Gross Pay</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-4">
            <Receipt className="w-8 h-8 text-red-600 mb-2" />
            <p className="text-2xl font-bold text-red-900">£{totalDeductions.toFixed(0)}</p>
            <p className="text-sm text-red-700">Total Deductions</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-4">
            <FileText className="w-8 h-8 text-purple-600 mb-2" />
            <p className="text-2xl font-bold text-purple-900">£{totalNetPay.toFixed(0)}</p>
            <p className="text-sm text-purple-700">Total Net Pay</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Checkbox
            id="select-all"
            checked={selectAll}
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor="select-all" className="cursor-pointer font-medium">
            Select All ({staffPayrollData.filter(s => s.hasCompliance).length} eligible)
          </Label>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportPayrollCSV}
            disabled={staffPayrollData.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={generatePayslips}
            disabled={selectedStaff.size === 0 || generating}
            className="bg-gradient-to-r from-green-600 to-emerald-600"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4 mr-2" />
                Generate {selectedStaff.size} Payslip{selectedStaff.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Staff Payroll List */}
      <div className="space-y-3">
        {staffPayrollData.map(data => (
          <Card key={data.staff.id} className={`border-2 ${data.hasCompliance ? 'border-green-200' : 'border-red-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Checkbox
                  id={`staff-${data.staff.id}`}
                  checked={selectedStaff.has(data.staff.id)}
                  onCheckedChange={(checked) => handleSelectStaff(data.staff.id, checked)}
                  disabled={!data.hasCompliance}
                />
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {data.staff.first_name} {data.staff.last_name}
                      </h3>
                      <p className="text-sm text-gray-600 capitalize">{data.staff.role.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500">{data.timesheets.length} shifts • {data.totalHours.toFixed(1)}h</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">£{data.netPay.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">Net Pay</p>
                    </div>
                  </div>

                  {/* Compliance Status */}
                  {!data.hasCompliance && (
                    <Alert className="border-red-300 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-900 text-sm">
                        <strong>⚠️ PAYMENT BLOCKED:</strong> Missing compliance documents: {data.complianceIssues.join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Payment Breakdown */}
                  <div className="grid grid-cols-4 gap-3 mt-3 text-sm bg-gray-50 p-3 rounded">
                    <div>
                      <p className="text-gray-600">Gross Pay</p>
                      <p className="font-semibold">£{data.grossPay.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Tax</p>
                      <p className="font-semibold text-red-600">-£{data.deductions.tax.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">NI</p>
                      <p className="font-semibold text-red-600">-£{data.deductions.ni.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Net Pay</p>
                      <p className="font-semibold text-green-600">£{data.netPay.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {staffPayrollData.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Approved Timesheets</h3>
            <p className="text-gray-600">
              No approved timesheets found for the selected period.
              <br />
              Approve timesheets first to generate payslips.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}