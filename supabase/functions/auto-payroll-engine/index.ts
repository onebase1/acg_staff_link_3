import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { format } from "https://deno.land/std@0.168.0/datetime/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STAFFOLOGY_BASE_URL = 'https://api.staffology.co.uk'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log(`🔍 [Payroll Engine] Env Check: URL=${!!supabaseUrl}, Key=${!!supabaseKey}`);

    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseKey ?? ''
    )

    const staffologyApiKey = Deno.env.get('STAFFOLOGY_API_KEY')
    const staffologyEmail = Deno.env.get('STAFFOLOGY_EMAIL') || 'g.basera5@gmail.com'
    const bureauId = Deno.env.get('STAFFOLOGY_BUREAU_ID')

    if (!staffologyApiKey) {
      throw new Error('STAFFOLOGY_API_KEY is not configured in Supabase secrets')
    }

    const rawBody = await req.text();
    console.log("📥 [Payroll Engine] Raw Body:", rawBody);
    
    let payload;
    try {
      payload = JSON.parse(rawBody || '{}');
    } catch (e) {
      throw new Error(`Invalid JSON payload: ${rawBody}`);
    }
    
    const { period_start, period_end, agency_id, staff_ids } = payload;

    if (!agency_id || !period_start || !period_end) {
      throw new Error('Missing required parameters: agency_id, period_start, period_end')
    }

    console.log(`💰 [Payroll Engine] Processing for Agency ${agency_id} (${period_start} to ${period_end})`)

    // 1. Fetch Agency details
    const { data: agency, error: agencyError } = await supabaseClient
      .from('agencies')
      .select('*')
      .eq('id', agency_id)
      .single()

    if (agencyError || !agency) {
      throw new Error(`Agency not found: ${agencyError?.message}`)
    }

    // 2. Staffology: Get or Create Employer (Agency)
    let employerId = agency.payroll_provider_id
    if (!employerId) {
      console.log(`🏢 [Payroll Engine] Agency ${agency.name} has no payroll_provider_id. Creating Employer in Staffology...`)
      employerId = await getOrCreateEmployer(agency, staffologyApiKey, staffologyEmail, bureauId)
      
      // Update agency with the new employer ID
      await supabaseClient
        .from('agencies')
        .update({ payroll_provider_id: employerId })
        .eq('id', agency_id)
    }

    // 3. Invoice Gate: Fetch Approved Timesheets where invoice_id is NOT NULL
    let query = supabaseClient
      .from('timesheets')
      .select(`
        *,
        staff:staff_id (*),
        client:client_id (id, name)
      `)
      .eq('agency_id', agency_id)
      .eq('status', 'approved')
      .not('invoice_id', 'is', null) // CRITICAL: Invoice Gate
      .gte('shift_date', period_start)
      .lte('shift_date', period_end)

    if (staff_ids && staff_ids.length > 0) {
      query = query.in('staff_id', staff_ids)
    }

    const { data: timesheets, error: tsError } = await query
    if (tsError) throw new Error(`Error fetching timesheets: ${tsError.message}`)

    if (!timesheets || timesheets.length === 0) {
      return new Response(JSON.stringify({ message: 'No invoiced timesheets found for this period.', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 4. Group by Staff and sync Employees
    const staffGrouped = groupByStaff(timesheets)
    const syncResults = []

    for (const [staffId, data] of Object.entries(staffGrouped)) {
      const staffMember = data.staff
      let employeeId = staffMember.payroll_employee_id

      if (!employeeId) {
        console.log(`👤 [Payroll Engine] Syncing Staff ${staffMember.first_name} ${staffMember.last_name} to Staffology...`)
        employeeId = await getOrCreateEmployee(employerId, staffMember, staffologyApiKey, staffologyEmail)
        
        await supabaseClient
          .from('staff')
          .update({ payroll_employee_id: employeeId })
          .eq('id', staffId)
      }
      
      syncResults.push({ staff_id: staffId, employee_id: employeeId, gross_pay: data.grossPay })
    }

    // 5. Create PayRuns and Persist to Database
    console.log(`💸 [Payroll Engine] Initializing persistence for ${syncResults.length} staff members...`)
    
    const processedPayslips = []

    for (const [staffId, data] of Object.entries(staffGrouped)) {
      const { staff, timesheets: staffTimesheets, grossPay } = data as any
      
      // Calculate Approximations (UK PAYE Basic)
      const monthlyAllowance = 1048
      const taxableAmount = Math.max(0, grossPay - monthlyAllowance)
      const tax = taxableAmount * 0.20
      const ni = grossPay > 1048 ? (grossPay - 1048) * 0.12 : 0
      const totalDeductions = tax + ni
      const netPay = grossPay - totalDeductions

      // Generate Payslip Number
      const payslipNum = `PS-${format(new Date(), 'yyyyMM')}-${staffId.substring(0, 4).toUpperCase()}`

      // A. Insert into payslips table
      const { data: newPayslip, error: payslipError } = await supabaseClient
        .from('payslips')
        .insert({
          agency_id,
          staff_id: staffId,
          period_start,
          period_end,
          gross_pay: grossPay,
          tax,
          ni,
          total_deductions: totalDeductions,
          net_pay: netPay,
          total_hours: staffTimesheets.reduce((sum: number, ts: any) => sum + (ts.total_hours || 0), 0),
          status: 'paid', // Mark as paid immediately for now
          payslip_number: payslipNum,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'bank_transfer',
          created_by: 'auto-payroll-engine',
          timesheets: staffTimesheets.map((ts: Record<string, unknown> & { client?: { name?: string } }) => ({
            id: ts.id,
            shift_date: ts.shift_date,
            role: ts.role,
            total_hours: ts.total_hours,
            actual_start_time: ts.actual_start_time,
            actual_end_time: ts.actual_end_time,
            staff_pay_amount: ts.staff_pay_amount,
            hourly_rate: ts.hourly_rate || ts.pay_rate,
            client_id: ts.client_id,
            client_name: ts.client?.name || null,
            agency_id: ts.agency_id,
          }))
        })
        .select()
        .single()

      if (payslipError) {
        console.error(`❌ [Payroll Engine] Failed to insert payslip for staff ${staffId}:`, payslipError)
        continue
      }

      // B. Update timesheets to link to payslip and mark as paid
      const timesheetIds = staffTimesheets.map((ts: any) => ts.id)
      const { error: updateError } = await supabaseClient
        .from('timesheets')
        .update({
          status: 'paid',
          payslip_id: newPayslip.id
        })
        .in('id', timesheetIds)

      if (updateError) {
        console.error(`❌ [Payroll Engine] Failed to update timesheets for staff ${staffId}:`, updateError)
      }

      processedPayslips.push({
        staff_name: `${staff.first_name} ${staff.last_name}`,
        payslip_id: newPayslip.id,
        net_pay: netPay
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully generated ${processedPayslips.length} payslips.`,
      agency: agency.name,
      staff_processed: processedPayslips.length,
      payslips: processedPayslips
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Final Catch Error:', error.message)
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// === HELPERS ===

function getAuthHeader(email, apiKey) {
  return `Basic ${btoa(`${email}:${apiKey}`)}`
}

async function safeFetch(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  console.log(`🌐 [Payroll Engine] API call: ${url} (Status: ${res.status})`);
  
  if (!res.ok) {
    throw new Error(`API Error (${res.status}): ${text || res.statusText}`);
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    if (!text) return null; // Empty body is fine for some endpoints
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
  }
}

async function getOrCreateEmployer(agency, apiKey, email, bureauId) {
  // If we already have a provider ID in the database, just use it
  if (agency.payroll_provider_id) return agency.payroll_provider_id;

  // If no Bureau ID is available, we can't create a new employer via Bureau API
  if (!bureauId) {
    throw new Error(`Employer not found for agency ${agency.name}. Bureau ID missing.`);
  }

  // Check if employer exists by Name or PAYE Reference
  const searchUrl = `${STAFFOLOGY_BASE_URL}/employers?search=${encodeURIComponent(agency.paye_reference || agency.name)}`;
  const searchData = await safeFetch(searchUrl, {
    headers: { 'Authorization': getAuthHeader(email, apiKey) }
  });
  
  if (searchData && searchData.length > 0) return searchData[0].id;

  // Create new Employer if not found
  const createRes = await safeFetch(`${STAFFOLOGY_BASE_URL}/employers`, {
    method: 'POST',
    headers: { 
      'Authorization': getAuthHeader(email, apiKey),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: agency.name,
      registrationNumber: agency.company_number,
      address: agency.address,
      bureauId: bureauId,
      payeReference: agency.paye_reference
    })
  });
  
  return createRes.id;
}

async function getOrCreateEmployee(employerId, staffMember, apiKey, email) {
  // Check if employee exists by NI Number
  const searchUrl = `${STAFFOLOGY_BASE_URL}/employers/${employerId}/employees?search=${encodeURIComponent(staffMember.ni_number)}`;
  const searchData = await safeFetch(searchUrl, {
    headers: { 'Authorization': getAuthHeader(email, apiKey) }
  });
  
  if (searchData && searchData.length > 0) return searchData[0].id;

  // Create new Employee
  const newEmployee = await safeFetch(`${STAFFOLOGY_BASE_URL}/employers/${employerId}/employees`, {
    method: 'POST',
    headers: { 
      'Authorization': getAuthHeader(email, apiKey),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      firstName: staffMember.first_name,
      lastName: staffMember.last_name,
      email: staffMember.email,
      niNumber: staffMember.ni_number,
      dateOfBirth: staffMember.date_of_birth,
      address: staffMember.address,
      bankDetails: staffMember.bank_details
    })
  });
  
  return newEmployee.id;
}

function groupByStaff(timesheets) {
  return timesheets.reduce((acc, ts) => {
    if (!acc[ts.staff_id]) {
      acc[ts.staff_id] = {
        staff: ts.staff,
        timesheets: [],
        grossPay: 0
      }
    }
    acc[ts.staff_id].timesheets.push(ts)
    acc[ts.staff_id].grossPay += (ts.staff_pay_amount || 0)
    return acc
  }, {})
}
