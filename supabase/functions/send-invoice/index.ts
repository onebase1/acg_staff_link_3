import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 📧 SEND INVOICE - Draft → Sent Workflow
 *
 * ✅ UPDATED: NOW handles financial locking (moved from autoInvoiceGenerator)
 *
 * Transitions invoice from draft to sent status:
 * - ✅ Validates invoice is in draft status
 * - ✅ LOCKS all timesheets financially (NEW - moved here)
 * - ✅ Updates timesheet status to 'invoiced'
 * - ✅ Updates invoice status: draft → sent
 * - ✅ Sets sent_at timestamp
 * - ✅ Creates immutable_sent_snapshot
 * - ✅ Sends email with PDF to client
 * - ✅ Logs to ChangeLog for audit trail
 *
 * CRITICAL: This is the ONLY place where financial locks are applied
 */

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Authentication check
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        const { invoice_id } = await req.json();

        if (!invoice_id) {
            return new Response(JSON.stringify({
                error: 'invoice_id is required'
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log('📧 [Send Invoice] Starting send process for:', invoice_id);

        // Fetch invoice
        const { data: invoices, error: invoiceError } = await supabase
            .from("invoices")
            .select("*")
            .eq("id", invoice_id);

        if (invoiceError || !invoices || invoices.length === 0) {
            return new Response(JSON.stringify({
                error: 'Invoice not found'
            }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        const invoice = invoices[0];

        // 🔒 VALIDATION: Must be draft
        if (invoice.status !== 'draft') {
            return new Response(JSON.stringify({
                error: `Cannot send invoice with status "${invoice.status}". Only draft invoices can be sent.`
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Fetch related data
        const { data: clients } = await supabase
            .from("clients")
            .select("*")
            .eq("id", invoice.client_id);

        const { data: agencies } = await supabase
            .from("agencies")
            .select("*")
            .eq("id", invoice.agency_id);

        const client = clients?.[0];
        const agency = agencies?.[0];

        if (!client || !agency) {
            return new Response(JSON.stringify({
                error: 'Client or agency not found'
            }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        const billingEmail = client.billing_email || client.contact_person?.email;

        if (!billingEmail) {
            return new Response(JSON.stringify({
                error: 'No billing email found for client. Cannot send invoice.'
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const now = new Date();

        // ✅ NEW STEP 0: LOCK ALL TIMESHEETS FINANCIALLY (moved from autoInvoiceGenerator)
        console.log('🔒 [Send Invoice] Locking timesheets financially...');

        const timesheetIds = invoice.line_items.map((item: any) => item.timesheet_id).filter(Boolean);

        for (const timesheetId of timesheetIds) {
            const { data: timesheets } = await supabase
                .from("timesheets")
                .select("*")
                .eq("id", timesheetId);

            const timesheet = timesheets?.[0];

            if (!timesheet) {
                console.warn(`⚠️ Timesheet ${timesheetId} not found - skipping`);
                continue;
            }

            await supabase
                .from("timesheets")
                .update({
                    status: 'invoiced',
                    financial_locked: true,
                    financial_locked_at: now.toISOString(),
                    financial_locked_by: user.id,
                    financial_snapshot: {
                        total_hours: timesheet.total_hours,
                        pay_rate: timesheet.pay_rate,
                        charge_rate: timesheet.charge_rate,
                        staff_pay_amount: timesheet.staff_pay_amount,
                        client_charge_amount: timesheet.client_charge_amount,
                        work_location_within_site: timesheet.work_location_within_site,
                        locked_at: now.toISOString()
                    }
                })
                .eq("id", timesheetId);

            // 📝 Log financial lock to ChangeLog
            await supabase
                .from("change_logs")
                .insert({
                    agency_id: agency.id,
                    change_type: 'timesheet_override',
                    affected_entity_type: 'timesheet',
                    affected_entity_id: timesheetId,
                    old_value: 'approved',
                    new_value: 'invoiced_and_locked',
                    reason: `Timesheet financially locked - included in invoice ${invoice.invoice_number}`,
                    changed_by: user.id,
                    changed_by_email: user.email,
                    changed_at: now.toISOString(),
                    risk_level: 'high',
                    flagged_for_review: false
                });
        }

        console.log(`✅ [Send Invoice] Locked ${timesheetIds.length} timesheets`);

        // ✅ STEP 1: Update invoice status and create immutable snapshot
        console.log('📝 [Send Invoice] Updating invoice status to "sent"...');

        const immutableSnapshot = {
            invoice_number: invoice.invoice_number,
            total: invoice.total,
            line_items: invoice.line_items,
            sent_at: now.toISOString(),
            recipient_email: billingEmail,
            client_name: client.name,
            agency_name: agency.name
        };

        await supabase
            .from("invoices")
            .update({
                status: 'sent',
                sent_at: now.toISOString(),
                immutable_sent_snapshot: immutableSnapshot
            })
            .eq("id", invoice.id);

        console.log('✅ [Send Invoice] Invoice status updated to "sent"');

        // ✅ STEP 2: Generate and send email
        console.log('📧 [Send Invoice] Sending email to:', billingEmail);

        const invoiceViewUrl = `${Deno.env.get('SUPABASE_URL') || 'https://acgstafflink.supabase.co'}/InvoiceDetail?id=${invoice.id}`;

        const lineItemsHTML = invoice.line_items.map((item: any) => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
                ${client?.contract_terms?.require_location_specification ?
                `<td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.work_location_within_site || '<span style="color: #f59e0b;">⚠️ Missing</span>'}</td>`
                : ''}
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.hours.toFixed(2)}h</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">£${item.rate.toFixed(2)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">£${item.amount.toFixed(2)}</td>
            </tr>
        `).join('');

        const bankDetailsHTML = agency.bank_details ? `
            <div style="background: #dbeafe; border-left: 4px solid #0284c7; padding: 20px; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e40af;">Payment Instructions:</p>
                <p style="margin: 5px 0; font-size: 14px; color: #1e40af;">Please make payment via bank transfer to:</p>
                ${agency.bank_details.account_name ? `<p style="margin: 5px 0; font-size: 14px; color: #1e40af;"><strong>Account Name:</strong> ${agency.bank_details.account_name}</p>` : ''}
                ${agency.bank_details.account_number ? `<p style="margin: 5px 0; font-size: 14px; color: #1e40af;"><strong>Account Number:</strong> ${agency.bank_details.account_number}</p>` : ''}
                ${agency.bank_details.sort_code ? `<p style="margin: 5px 0; font-size: 14px; color: #1e40af;"><strong>Sort Code:</strong> ${agency.bank_details.sort_code}</p>` : ''}
                ${agency.bank_details.bank_name ? `<p style="margin: 5px 0; font-size: 14px; color: #1e40af;"><strong>Bank:</strong> ${agency.bank_details.bank_name}</p>` : ''}
                ${agency.bank_details.iban ? `<p style="margin: 5px 0; font-size: 13px; color: #1e40af;"><strong>IBAN:</strong> ${agency.bank_details.iban}</p>` : ''}
                ${agency.bank_details.swift_bic ? `<p style="margin: 5px 0; font-size: 13px; color: #1e40af;"><strong>SWIFT/BIC:</strong> ${agency.bank_details.swift_bic}</p>` : ''}
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #1e40af;"><strong>Reference:</strong> ${invoice.invoice_number}</p>
            </div>
        ` : `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">⚠️ Bank details not configured</p>
                <p style="margin: 5px 0; font-size: 14px; color: #92400e;">Please contact ${agency.contact_email} for payment details.</p>
                <p style="margin: 5px 0; font-size: 14px; color: #92400e;"><strong>Reference:</strong> ${invoice.invoice_number}</p>
            </div>
        `;

        const paymentTermsDays = client.payment_terms === 'net_7' ? 7 :
            client.payment_terms === 'net_14' ? 14 :
                client.payment_terms === 'net_60' ? 60 : 30;

        const dueDate = new Date(invoice.due_date);
        const invoiceDate = new Date(invoice.invoice_date);

        // ✅ UK-FRIENDLY: Format dates as "6 January 2025" instead of MM/DD/YYYY
        const formattedInvoiceDate = invoiceDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const formattedDueDate = dueDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        await supabase.functions.invoke('send-email', {
            body: {
                to: billingEmail,
                from_name: agency.name,
                subject: `Invoice ${invoice.invoice_number} from ${agency.name}`,
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); padding: 40px; text-align: center;">
                        ${agency.logo_url ? `<img src="${agency.logo_url}" alt="${agency.name}" style="max-height: 80px; margin-bottom: 15px;">` : ''}
                        <h1 style="color: white; margin: 0; font-size: 32px;">INVOICE</h1>
                        <p style="color: #e0f2fe; margin-top: 10px; font-size: 18px;">${invoice.invoice_number}</p>
                        <a href="${invoiceViewUrl}" style="display: inline-block; margin-top: 15px; background: white; color: #0284c7; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">📄 View Full Invoice</a>
                    </div>

                    <div style="padding: 40px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                            <div>
                                <h3 style="color: #1f2937; margin: 0 0 10px 0;">FROM:</h3>
                                <p style="margin: 5px 0; font-weight: bold;">${agency.name}</p>
                                <p style="margin: 5px 0; font-size: 14px;">${agency.address?.line1 || ''}</p>
                                <p style="margin: 5px 0; font-size: 14px;">${agency.address?.city || ''}, ${agency.address?.postcode || ''}</p>
                                <p style="margin: 5px 0; font-size: 14px;">${agency.contact_email}</p>
                            </div>
                            <div style="text-align: right;">
                                <h3 style="color: #1f2937; margin: 0 0 10px 0;">TO:</h3>
                                <p style="margin: 5px 0; font-weight: bold;">${client.name}</p>
                                <p style="margin: 5px 0; font-size: 14px;">${client.address?.line1 || ''}</p>
                                <p style="margin: 5px 0; font-size: 14px;">${client.address?.city || ''}, ${client.address?.postcode || ''}</p>
                            </div>
                        </div>

                        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                            <div style="display: flex; justify-content: space-between;">
                                <div>
                                    <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">Invoice Date</p>
                                    <p style="margin: 5px 0; font-weight: bold;">${formattedInvoiceDate}</p>
                                </div>
                                <div>
                                    <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">Due Date</p>
                                    <p style="margin: 5px 0; font-weight: bold;">${formattedDueDate}</p>
                                </div>
                                <div>
                                    <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">Payment Terms</p>
                                    <p style="margin: 5px 0; font-weight: bold;">Net ${paymentTermsDays}</p>
                                </div>
                            </div>
                        </div>

                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                            <thead>
                                <tr style="background: #f3f4f6;">
                                    <th style="padding: 12px 8px; text-align: left; font-size: 14px; color: #374151;">Description</th>
                                    ${client?.contract_terms?.require_location_specification ? '<th style="padding: 12px 8px; text-align: left; font-size: 14px; color: #374151;">Location</th>' : ''}
                                    <th style="padding: 12px 8px; text-align: center; font-size: 14px; color: #374151;">Hours</th>
                                    <th style="padding: 12px 8px; text-align: right; font-size: 14px; color: #374151;">Rate</th>
                                    <th style="padding: 12px 8px; text-align: right; font-size: 14px; color: #374151;">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${lineItemsHTML}
                            </tbody>
                        </table>

                        <div style="text-align: right; margin-bottom: 30px;">
                            <div style="display: inline-block; text-align: left; min-width: 300px;">
                                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                    <span>Subtotal:</span>
                                    <span style="font-weight: bold;">£${invoice.subtotal.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                    <span>VAT (${invoice.vat_rate}%):</span>
                                    <span style="font-weight: bold;">£${invoice.vat_amount.toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-between; padding: 12px 0; background: #f0f9ff; margin-top: 10px; padding-left: 15px; padding-right: 15px;">
                                    <span style="font-size: 18px; font-weight: bold;">TOTAL:</span>
                                    <span style="font-size: 18px; font-weight: bold; color: #0284c7;">£${invoice.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        ${bankDetailsHTML}

                        <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px; text-align: center;">
                            <p style="margin: 0 0 15px 0; color: #374151;">For a printable copy of this invoice:</p>
                            <a href="${invoiceViewUrl}" style="display: inline-block; background: #0284c7; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">📄 View & Download Invoice</a>
                        </div>
                    </div>

                    <div style="background: #0284c7; padding: 20px; text-align: center;">
                        <p style="color: white; font-size: 12px; margin: 0;">Thank you for your business!</p>
                        <p style="color: #e0f2fe; font-size: 12px; margin: 5px 0;">Questions? Contact: ${agency.contact_email}</p>
                    </div>
                </div>
            `
            }
        });

        console.log('✅ [Send Invoice] Email sent successfully');

        // ✅ STEP 3: Log to ChangeLog for audit trail
        await supabase
            .from("change_logs")
            .insert({
                agency_id: invoice.agency_id,
                change_type: 'other',
                affected_entity_type: 'invoice',
                affected_entity_id: invoice.id,
                old_value: 'draft',
                new_value: 'sent',
                reason: `Invoice ${invoice.invoice_number} sent to ${client.name} (${billingEmail}) - immutable snapshot created + ${timesheetIds.length} timesheets locked`,
                changed_by: user.id,
                changed_by_email: user.email,
                changed_at: now.toISOString(),
                risk_level: 'medium',
                flagged_for_review: false
            });

        console.log('📝 [Send Invoice] Change logged to ChangeLog');

        return new Response(JSON.stringify({
            success: true,
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            sent_to: billingEmail,
            sent_at: now.toISOString(),
            timesheets_locked: timesheetIds.length,
            message: `Invoice ${invoice.invoice_number} successfully sent to ${client.name}. ${timesheetIds.length} timesheets locked.`
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('❌ [Send Invoice] Fatal error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
