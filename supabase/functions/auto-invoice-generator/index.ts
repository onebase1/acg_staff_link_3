
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 💰 AUTO INVOICE GENERATOR FROM APPROVED TIMESHEETS
 *
 * ✅ UPDATED: Enhanced invoice quality controls
 *
 * CRITICAL VALIDATIONS:
 * - ✅ Bank details MUST exist before invoice creation
 * - ✅ Location MUST be specified for clients that require it
 * - ✅ Role extracted from shift (not generic "Care Staff")
 * - ✅ Draft invoices can be regenerated without data loss
 * - ✅ Financial lock only happens when invoice is SENT
 */

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const authHeader = req.headers.get('Authorization');
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            if (authError || !user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" }
                });
            }
        }

        const { timesheet_ids, auto_mode, client_id, period_start, period_end } = await req.json();

        console.log('💰 [Invoice Generator] Starting (NO FINANCIAL LOCKS UNTIL SENT)...');

        let candidateTimesheets = [];

        // MODE 1: Specific timesheets
        if (timesheet_ids && timesheet_ids.length > 0) {
            const { data: allTimesheets } = await supabase
                .from("timesheets")
                .select("*");
            candidateTimesheets = allTimesheets ? allTimesheets.filter(t => timesheet_ids.includes(t.id)) : [];
        }
        // MODE 2: Auto mode (all uninvoiced approved timesheets)
        else if (auto_mode) {
            const { data: timesheets } = await supabase
                .from("timesheets")
                .select("*")
                .eq("status", "approved")
                .is("invoice_id", null);

            candidateTimesheets = timesheets || [];

            if (client_id) {
                candidateTimesheets = candidateTimesheets.filter(t => t.client_id === client_id);
            }

            if (period_start && period_end) {
                candidateTimesheets = candidateTimesheets.filter(t =>
                    t.shift_date >= period_start && t.shift_date <= period_end
                );
            }
        } else {
            return new Response(JSON.stringify({
                error: 'Must provide either timesheet_ids or auto_mode=true'
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        if (candidateTimesheets.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: 'No timesheets to invoice',
                invoices_created: 0
            }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`📋 Found ${candidateTimesheets.length} candidate timesheets`);

        // 🔒 VALIDATION 1: Check if any timesheets are already locked
        const lockedTimesheets = candidateTimesheets.filter(t => t.financial_locked);
        if (lockedTimesheets.length > 0) {
            console.warn(`⚠️ ${lockedTimesheets.length} timesheet(s) already locked - filtering out`);
            candidateTimesheets = candidateTimesheets.filter(t => !t.financial_locked);

            if (candidateTimesheets.length === 0) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'All selected timesheets are already invoiced.',
                    locked_count: lockedTimesheets.length
                }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }
        }

        // 🛡️ VALIDATION 2: Check shift status
        console.log('🛡️ [Shift Status Validation] Checking related shift statuses...');

        const validTimesheets = [];
        const rejectedTimesheets = [];

        const { data: allShifts } = await supabase.from("shifts").select("*");
        const shiftsMap = new Map(allShifts ? allShifts.map(s => [s.id, s]) : []);

        for (const timesheet of candidateTimesheets) {
            const { data: bookings } = await supabase
                .from("bookings")
                .select("*")
                .eq("id", timesheet.booking_id);
            const booking = bookings && bookings.length > 0 ? bookings[0] : null;

            if (!booking) {
                console.warn(`⚠️ Timesheet ${timesheet.id} has no booking - REJECTING`);
                rejectedTimesheets.push({
                    timesheet_id: timesheet.id,
                    reason: 'no_booking_found',
                    shift_status: null
                });
                continue;
            }

            const shift = shiftsMap.get(booking.shift_id);

            if (!shift) {
                console.warn(`⚠️ Timesheet ${timesheet.id} - shift not found - REJECTING`);
                rejectedTimesheets.push({
                    timesheet_id: timesheet.id,
                    reason: 'shift_not_found',
                    shift_status: null
                });
                continue;
            }

            if (shift.status === 'completed') {
                console.log(`✅ Timesheet ${timesheet.id.substring(0, 8)} - Shift COMPLETED - APPROVED`);
                validTimesheets.push(timesheet);
            } else {
                console.warn(`❌ Timesheet ${timesheet.id.substring(0, 8)} - Shift status: "${shift.status}" - REJECTED`);
                rejectedTimesheets.push({
                    timesheet_id: timesheet.id,
                    shift_id: shift.id,
                    reason: 'shift_not_completed',
                    shift_status: shift.status,
                    rejection_explanation: getShiftRejectionReason(shift.status)
                });
            }
        }

        console.log(`\n📊 [Validation Results]:`);
        console.log(`   ✅ Valid for invoicing: ${validTimesheets.length}`);
        console.log(`   ❌ Rejected: ${rejectedTimesheets.length}`);

        if (validTimesheets.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No timesheets passed validation.',
                validation_summary: {
                    total_candidates: candidateTimesheets.length,
                    approved_for_invoicing: 0,
                    rejected: rejectedTimesheets.length,
                    rejected_reasons: rejectedTimesheets
                }
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const timesheetsToInvoice = validTimesheets;

        // Group by client
        const timesheetsByClient = {};
        for (const timesheet of timesheetsToInvoice) {
            if (!timesheetsByClient[timesheet.client_id]) {
                timesheetsByClient[timesheet.client_id] = [];
            }
            timesheetsByClient[timesheet.client_id].push(timesheet);
        }

        const invoicesCreated = [];
        const validationErrors = [];

        // Generate invoice for each client
        for (const [clientId, timesheets] of Object.entries(timesheetsByClient)) {
            try {
                const [clientsResult, agenciesResult] = await Promise.all([
                    supabase.from("clients").select("*").eq("id", clientId),
                    supabase.from("agencies").select("*").eq("id", timesheets[0].agency_id)
                ]);

                const client = clientsResult.data && clientsResult.data.length > 0 ? clientsResult.data[0] : null;
                const agency = agenciesResult.data && agenciesResult.data.length > 0 ? agenciesResult.data[0] : null;

                if (!client || !agency) {
                    console.error(`⚠️ Client or agency not found for ${clientId}`);
                    continue;
                }

                // ✅ NEW VALIDATION 3: Check bank details BEFORE creating invoice
                console.log('🏦 [Bank Details] Validating agency bank details...');
                if (!agency.bank_details ||
                    !agency.bank_details.account_name ||
                    !agency.bank_details.account_number ||
                    !agency.bank_details.sort_code) {

                    console.error('❌ [Bank Details] BLOCKED: Missing bank details for agency:', agency.id);

                    // Create admin workflow to chase bank details
                    await supabase.from("admin_workflows").insert({
                        agency_id: agency.id,
                        type: 'other',
                        priority: 'critical',
                        status: 'pending',
                        title: '🚨 URGENT: Missing Bank Details - Cannot Generate Invoices',
                        description: `Invoice generation BLOCKED for ${client.name}. Bank details are missing from Agency Settings. Invoices cannot be sent without payment instructions.`,
                        related_entity: {
                            entity_type: 'client',
                            entity_id: clientId
                        },
                        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                        auto_created: true
                    });

                    validationErrors.push({
                        client_id: clientId,
                        client_name: client.name,
                        error: 'missing_bank_details',
                        message: 'Invoice generation blocked: Agency bank details not configured. Go to Agency Settings → Bank Details to add payment information.',
                        action_required: 'Configure bank details in Agency Settings',
                        timesheets_affected: timesheets.length
                    });

                    continue;
                }

                // ✅ NEW VALIDATION 4: Check location specification for clients that require it
                console.log('📍 [Location Validation] Checking work locations...');
                if (client.contract_terms?.require_location_specification) {
                    const missingLocations = timesheets.filter(t => !t.work_location_within_site);

                    if (missingLocations.length > 0) {
                        console.error(`❌ [Location] BLOCKED: ${missingLocations.length} timesheet(s) missing location for client requiring specification:`, client.name);

                        // Create admin workflow
                        await supabase.from("admin_workflows").insert({
                            agency_id: agency.id,
                            type: 'missing_staff_information',
                            priority: 'high',
                            status: 'pending',
                            title: `⚠️ Missing Location Info - ${client.name}`,
                            description: `Invoice generation BLOCKED: ${missingLocations.length} timesheet(s) missing work_location_within_site. ${client.name} requires location specification on all invoices (contractual requirement).`,
                            related_entity: {
                                entity_type: 'client',
                                entity_id: clientId
                            },
                            deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                            auto_created: true
                        });

                        validationErrors.push({
                            client_id: clientId,
                            client_name: client.name,
                            error: 'missing_location_specification',
                            message: `${client.name} requires work location (e.g., Room 14) on all timesheets. ${missingLocations.length} timesheet(s) missing location data.`,
                            action_required: 'Edit timesheets to add work_location_within_site before invoicing',
                            timesheets_affected: missingLocations.length,
                            missing_timesheet_ids: missingLocations.map(t => t.id)
                        });

                        continue;
                    }
                }

                // ✅ ENHANCED: Build line items with ACTUAL role from shift
                const lineItems = await Promise.all(timesheets.map(async (t) => {
                    const { data: staffRecords } = await supabase
                        .from("staff")
                        .select("*")
                        .eq("id", t.staff_id);
                    const staff = staffRecords && staffRecords.length > 0 ? staffRecords[0] : null;

                    // ✅ FIX 1: Get ACTUAL role and shift_type from shift (not generic "Care Staff")
                    const { data: bookings } = await supabase
                        .from("bookings")
                        .select("*")
                        .eq("id", t.booking_id);
                    const booking = bookings && bookings.length > 0 ? bookings[0] : null;
                    let actualRole = 'Care Staff'; // Fallback
                    let shiftType = 'day'; // Fallback

                    if (booking) {
                        const { data: shifts } = await supabase
                            .from("shifts")
                            .select("*")
                            .eq("id", booking.shift_id);
                        const shift = shifts && shifts.length > 0 ? shifts[0] : null;
                        if (shift?.role_required) {
                            // Convert role_required to readable format
                            actualRole = shift.role_required
                                .split('_')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ');
                        }
                        if (shift?.shift_type) {
                            shiftType = shift.shift_type;
                        }
                    }

                    const lineItem = {
                        timesheet_id: t.id,
                        description: `${staff ? `${staff.first_name} ${staff.last_name}` : 'Staff'} - ${actualRole}`,
                        staff_name: staff ? `${staff.first_name} ${staff.last_name}` : 'Staff',
                        shift_date: t.shift_date,
                        role: actualRole,
                        shift_type: shiftType, // ✅ NEW: Include shift_type in line item
                        hours: t.total_hours || 0,
                        rate: t.charge_rate || 0,
                        amount: t.client_charge_amount || 0
                    };

                    // ✅ FIX 2: Graceful location handling
                    if (client.contract_terms?.require_location_specification) {
                        lineItem.work_location_within_site = t.work_location_within_site || null;
                    }

                    return lineItem;
                }));

                // Calculate totals
                const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
                const vatRate = 20;
                const vatAmount = subtotal * (vatRate / 100);
                const total = subtotal + vatAmount;

                // ✅ FIX: Generate SHORT, professional invoice number
                const now = new Date();
                const year = now.getFullYear().toString().slice(-2);
                const month = (now.getMonth() + 1).toString().padStart(2, '0');

                // Get invoice count for this month to generate sequential number
                const { data: existingInvoices } = await supabase
                    .from("invoices")
                    .select("*")
                    .eq("agency_id", agency.id);

                const thisMonthInvoices = existingInvoices ? existingInvoices.filter(inv => {
                    const invDate = new Date(inv.invoice_date);
                    return invDate.getMonth() === now.getMonth() &&
                           invDate.getFullYear() === now.getFullYear();
                }) : [];

                const sequenceNumber = (thisMonthInvoices.length + 1).toString().padStart(4, '0');

                const invoiceNumber = `INV-${year}${month}-${sequenceNumber}`;

                // Calculate due date
                const dueDate = new Date(now);
                const paymentTermsDays = client.payment_terms === 'net_7' ? 7 :
                                         client.payment_terms === 'net_14' ? 14 :
                                         client.payment_terms === 'net_60' ? 60 : 30;
                dueDate.setDate(dueDate.getDate() + paymentTermsDays);

                // ✅ CRITICAL CHANGE: Create invoice as DRAFT (NO LOCKING)
                const { data: invoice, error: invoiceError } = await supabase
                    .from("invoices")
                    .insert({
                        agency_id: agency.id,
                        invoice_number: invoiceNumber,
                        client_id: clientId,
                        invoice_date: now.toISOString().split('T')[0],
                        due_date: dueDate.toISOString().split('T')[0],
                        period_start: timesheets[0].shift_date,
                        period_end: timesheets[timesheets.length - 1].shift_date,
                        status: 'draft',
                        line_items: lineItems,
                        subtotal: subtotal,
                        vat_rate: vatRate,
                        vat_amount: vatAmount,
                        total: total,
                        amount_paid: 0,
                        balance_due: total,
                        sent_at: null,
                        notes: `Invoice generated from ${timesheets.length} approved timesheet(s) - DRAFT (not locked)`,
                        immutable_sent_snapshot: null
                    })
                    .select()
                    .single();

                if (invoiceError) {
                    throw invoiceError;
                }

                console.log(`✅ Invoice ${invoiceNumber} created as DRAFT for ${client.name}: £${total.toFixed(2)}`);

                // ✅ CRITICAL CHANGE: Only link timesheets to invoice, DON'T lock them yet
                for (const timesheet of timesheets) {
                    await supabase
                        .from("timesheets")
                        .update({ invoice_id: invoice.id })
                        .eq("id", timesheet.id);
                }

                invoicesCreated.push({
                    invoice_id: invoice.id,
                    invoice_number: invoiceNumber,
                    client_name: client.name,
                    total: total,
                    timesheets_count: timesheets.length,
                    timesheets_locked: false,
                    status: 'draft'
                });

            } catch (clientError) {
                console.error(`❌ Error creating invoice for client ${clientId}:`, clientError.message);
                validationErrors.push({
                    client_id: clientId,
                    error: 'generation_failed',
                    message: clientError.message
                });
            }
        }

        console.log(`\n✅ [Invoice Generator] COMPLETE`);
        console.log(`   📊 Invoices created: ${invoicesCreated.length} (DRAFT - not locked)`);
        console.log(`   ✅ Timesheets linked: ${validTimesheets.length}`);
        console.log(`   ❌ Timesheets rejected: ${rejectedTimesheets.length}`);
        console.log(`   ❌ Validation errors: ${validationErrors.length}`);

        return new Response(JSON.stringify({
            success: validationErrors.length === 0 || invoicesCreated.length > 0,
            invoices_created: invoicesCreated.length,
            invoices: invoicesCreated,
            validation_errors: validationErrors.length > 0 ? validationErrors : undefined,
            validation_summary: {
                total_candidates: candidateTimesheets.length,
                approved_for_invoicing: validTimesheets.length,
                rejected: rejectedTimesheets.length,
                blocked_by_validation: validationErrors.length,
                rejected_details: rejectedTimesheets.map(r => ({
                    timesheet_id: r.timesheet_id,
                    shift_status: r.shift_status,
                    reason: r.rejection_explanation || r.reason
                }))
            },
            important_note: invoicesCreated.length > 0
                ? '⚠️ Invoices created as DRAFT. Timesheets NOT locked yet. Financial lock happens when you click "Send Invoice".'
                : validationErrors.length > 0
                    ? '🚫 Invoice generation blocked due to validation errors. Resolve issues and try again.'
                    : 'No invoices created.'
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('❌ [Invoice Generator] Fatal error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});

function getShiftRejectionReason(shiftStatus) {
    const reasons = {
        'open': 'Shift is still open (not assigned)',
        'assigned': 'Shift assigned but not completed',
        'confirmed': 'Shift confirmed but not completed',
        'in_progress': 'Shift currently in progress',
        'awaiting_staff_confirmation': 'Awaiting staff confirmation',
        'awaiting_admin_closure': 'Awaiting admin closure - mark as completed first',
        'cancelled': 'Shift was cancelled - cannot invoice',
        'no_show': 'Staff no-show - cannot invoice',
        'disputed': 'Shift is disputed - resolve dispute before invoicing',
        'unfilled_escalated': 'Shift unfilled',
        'archived': 'Shift archived'
    };

    return reasons[shiftStatus] || `Shift status "${shiftStatus}" not eligible for invoicing`;
}
