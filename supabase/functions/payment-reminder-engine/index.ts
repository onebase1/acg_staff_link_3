import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 🧪 TESTING MODE: Payment Reminder Engine
 *
 * INTERVALS CHANGED FOR TESTING:
 * - 10 minutes overdue = First reminder (WhatsApp)
 * - 20 minutes overdue = Formal email reminder
 * - 30 minutes overdue = Urgent SMS + email
 * - 40 minutes overdue = Admin workflow creation
 *
 * ⚠️ REMEMBER TO REVERT TO PRODUCTION AFTER TESTING!
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log('💳 [Payment Reminder Engine - TESTING MODE] Starting run...');

        const results = {
            checked: 0,
            reminders_10min: 0,
            reminders_20min: 0,
            reminders_30min: 0,
            workflows_created: 0,
            errors: [],
        };

        // Get all unpaid/partially paid invoices
        const { data: invoices, error: invoicesError } = await supabase
            .from("invoices")
            .select("*")
            .in("status", ['sent', 'viewed', 'partially_paid', 'overdue']);

        if (invoicesError) {
            throw invoicesError;
        }

        const now = new Date();

        for (const invoice of invoices) {
            results.checked++;

            try {
                const dueDate = new Date(invoice.due_date);
                const minutesOverdue = Math.floor((now - dueDate) / (1000 * 60));

                // Skip if not overdue yet
                if (minutesOverdue < 0) continue;

                console.log(`📋 [Invoice ${invoice.invoice_number}] ${minutesOverdue} minutes overdue`);

                // Get client and agency details
                const { data: client, error: clientError } = await supabase
                    .from("clients")
                    .select("*")
                    .eq("id", invoice.client_id)
                    .single();

                const { data: agency, error: agencyError } = await supabase
                    .from("agencies")
                    .select("*")
                    .eq("id", invoice.agency_id)
                    .single();

                if (!client || !agency) {
                    console.log(`⚠️  [Invoice ${invoice.invoice_number}] Missing client or agency data`);
                    continue;
                }

                const clientInfo = client;
                const agencyInfo = agency;

                // Update invoice status to overdue if not already
                if (invoice.status !== 'overdue') {
                    await supabase
                        .from("invoices")
                        .update({ status: 'overdue' })
                        .eq("id", invoice.id);
                }

                const contactEmail = clientInfo.billing_email || clientInfo.contact_person?.email;
                const contactPhone = clientInfo.contact_person?.phone;

                // REMINDER 1: 10 minutes overdue - Friendly WhatsApp
                if (minutesOverdue >= 10 && minutesOverdue < 20 && invoice.reminder_sent_count === 0) {
                    console.log(`📱 [Invoice ${invoice.invoice_number}] Sending 10-min WhatsApp reminder`);

                    if (contactPhone) {
                        const message = `Hi ${clientInfo.contact_person?.name || clientInfo.name},\n\n🧪 TEST REMINDER (10 minutes overdue):\n\nInvoice ${invoice.invoice_number} for £${invoice.total.toFixed(2)} is now overdue.\n\nIf you've already paid, please disregard this message.\n\nThank you!\n${agencyInfo.name}`;

                        try {
                            await supabase.functions.invoke('send-whatsapp', {
                                body: {
                                    to: contactPhone,
                                    message: message
                                }
                            });

                            await supabase
                                .from("invoices")
                                .update({
                                    reminder_sent_count: 1,
                                    last_reminder_sent: now.toISOString()
                                })
                                .eq("id", invoice.id);

                            results.reminders_10min++;
                            console.log(`✅ [Invoice ${invoice.invoice_number}] 10-min WhatsApp sent`);
                        } catch (error) {
                            console.error(`❌ [Invoice ${invoice.invoice_number}] WhatsApp failed:`, error.message);
                            results.errors.push({
                                invoice_id: invoice.id,
                                error: `WhatsApp failed: ${error.message}`
                            });
                        }
                    } else {
                        console.log(`⚠️  [Invoice ${invoice.invoice_number}] No phone number for WhatsApp`);
                    }
                }

                // REMINDER 2: 20 minutes overdue - Formal Email
                if (minutesOverdue >= 20 && minutesOverdue < 30 && invoice.reminder_sent_count === 1) {
                    console.log(`📧 [Invoice ${invoice.invoice_number}] Sending 20-min formal email`);

                    if (contactEmail) {
                        try {
                            await supabase.functions.invoke('send-email', {
                                body: {
                                    to: contactEmail,
                                    subject: `🧪 TEST: Payment Reminder - Invoice ${invoice.invoice_number} (20 mins overdue)`,
                                    html: `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <div style="background: #f59e0b; padding: 30px; text-align: center;">
                                            <h1 style="color: white; margin: 0;">⚠️ Payment Reminder (TEST)</h1>
                                        </div>
                                        <div style="padding: 30px; background: #fffbeb;">
                                            <p style="font-size: 16px; color: #1f2937;">Dear ${clientInfo.contact_person?.name || 'Finance Team'},</p>
                                            <p style="font-size: 16px; color: #1f2937;">This is a <strong>TEST reminder</strong> that invoice ${invoice.invoice_number} is now <strong>20 minutes overdue</strong>.</p>

                                            <div style="background: white; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
                                                <p style="margin: 10px 0;"><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                                                <p style="margin: 10px 0;"><strong>Invoice Date:</strong> ${invoice.invoice_date}</p>
                                                <p style="margin: 10px 0;"><strong>Due Date:</strong> ${invoice.due_date}</p>
                                                <p style="margin: 10px 0;"><strong>Amount Due:</strong> £${invoice.balance_due.toFixed(2)}</p>
                                                <p style="margin: 10px 0; color: #dc2626;"><strong>Test Mode:</strong> 20 minutes overdue</p>
                                            </div>

                                            <p style="font-size: 14px; color: #78716c;">
                                                In production, this would be sent 14 days after invoice is overdue.
                                            </p>

                                            <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px;">
                                                <p style="font-size: 14px; color: #92400e; margin: 0;">
                                                    <strong>Payment Details:</strong> Please reference invoice number ${invoice.invoice_number} when making payment.
                                                </p>
                                            </div>
                                        </div>
                                        <div style="background: #d97706; padding: 20px; text-align: center;">
                                            <p style="color: white; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ${agencyInfo.name}</p>
                                        </div>
                                    </div>
                                `
                                }
                            });

                            await supabase
                                .from("invoices")
                                .update({
                                    reminder_sent_count: 2,
                                    last_reminder_sent: now.toISOString()
                                })
                                .eq("id", invoice.id);

                            results.reminders_20min++;
                            console.log(`✅ [Invoice ${invoice.invoice_number}] 20-min email sent`);
                        } catch (error) {
                            console.error(`❌ [Invoice ${invoice.invoice_number}] Email failed:`, error.message);
                            results.errors.push({
                                invoice_id: invoice.id,
                                error: `Email failed: ${error.message}`
                            });
                        }
                    } else {
                        console.log(`⚠️  [Invoice ${invoice.invoice_number}] No email address`);
                    }
                }

                // REMINDER 3: 30 minutes overdue - Urgent SMS + Email
                if (minutesOverdue >= 30 && minutesOverdue < 40 && invoice.reminder_sent_count === 2) {
                    console.log(`🚨 [Invoice ${invoice.invoice_number}] Sending 30-min urgent reminder`);

                    // Send email
                    if (contactEmail) {
                        try {
                            await supabase.functions.invoke('send-email', {
                                body: {
                                    to: contactEmail,
                                    subject: `🚨 URGENT TEST: Invoice ${invoice.invoice_number} - 30 Minutes Overdue - Immediate Action Required`,
                                    html: `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <div style="background: #dc2626; padding: 30px; text-align: center;">
                                            <h1 style="color: white; margin: 0;">🚨 URGENT PAYMENT REQUEST (TEST)</h1>
                                        </div>
                                        <div style="padding: 30px; background: #fef2f2;">
                                            <p style="font-size: 16px; color: #1f2937;">Dear ${clientInfo.contact_person?.name || 'Finance Team'},</p>
                                            <p style="font-size: 18px; color: #dc2626; font-weight: bold;">URGENT TEST: Invoice ${invoice.invoice_number} is now <strong>30 minutes overdue</strong>.</p>

                                            <div style="background: white; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
                                                <p style="margin: 10px 0;"><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                                                <p style="margin: 10px 0;"><strong>Due Date:</strong> ${invoice.due_date}</p>
                                                <p style="margin: 10px 0; color: #dc2626; font-size: 20px;"><strong>Amount Due:</strong> £${invoice.balance_due.toFixed(2)}</p>
                                                <p style="margin: 10px 0; color: #dc2626; font-size: 18px;"><strong>Test Mode:</strong> 30 minutes overdue</p>
                                            </div>

                                            <div style="background: #fee2e2; border: 2px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 8px;">
                                                <p style="font-size: 16px; color: #991b1b; margin: 0;">
                                                    <strong>⚠️ TEST FINAL NOTICE:</strong> In production (21 days overdue), failure to pay within 7 days would result in service suspension.
                                                </p>
                                            </div>

                                            <p style="font-size: 14px; color: #1f2937; margin-top: 20px;">
                                                Contact: ${agencyInfo.contact_email} | ${agencyInfo.contact_phone}
                                            </p>
                                        </div>
                                        <div style="background: #991b1b; padding: 20px; text-align: center;">
                                            <p style="color: white; font-size: 14px; margin: 0; font-weight: bold;">🧪 TEST MODE - URGENT PAYMENT REQUIRED</p>
                                        </div>
                                    </div>
                                `
                                }
                            });
                            console.log(`✅ [Invoice ${invoice.invoice_number}] 30-min urgent email sent`);
                        } catch (error) {
                            console.error(`❌ [Invoice ${invoice.invoice_number}] Urgent email failed:`, error.message);
                        }
                    }

                    // Send SMS
                    if (contactPhone) {
                        try {
                            await supabase.functions.invoke('send-sms', {
                                body: {
                                    to: contactPhone,
                                    message: `🧪 TEST: 🚨 URGENT: Invoice ${invoice.invoice_number} for £${invoice.balance_due.toFixed(2)} is now 30 minutes overdue. IMMEDIATE PAYMENT REQUIRED. Contact: ${agencyInfo.contact_phone}`
                                }
                            });
                            console.log(`✅ [Invoice ${invoice.invoice_number}] 30-min urgent SMS sent`);
                        } catch (error) {
                            console.error(`❌ [Invoice ${invoice.invoice_number}] SMS failed:`, error.message);
                        }
                    }

                    await supabase
                        .from("invoices")
                        .update({
                            reminder_sent_count: 3,
                            last_reminder_sent: now.toISOString()
                        })
                        .eq("id", invoice.id);

                    results.reminders_30min++;
                }

                // ESCALATION: 40 minutes overdue - Create Admin Workflow
                if (minutesOverdue >= 40 && invoice.reminder_sent_count === 3) {
                    console.log(`📋 [Invoice ${invoice.invoice_number}] Creating admin workflow for 40-min overdue (TEST)`);

                    await supabase
                        .from("admin_workflows")
                        .insert({
                            agency_id: invoice.agency_id,
                            type: 'payment_issue',
                            priority: 'critical',
                            status: 'pending',
                            title: `🧪 TEST: CRITICAL - Invoice ${invoice.invoice_number} - 40 Minutes Overdue - £${invoice.balance_due.toFixed(2)}`,
                            description: `[TEST MODE] Invoice is critically overdue (40 minutes in test, would be 28 days in production). Client: ${clientInfo.name}. All automatic reminders sent. Manual intervention required.`,
                            related_entity: {
                                entity_type: 'invoice',
                                entity_id: invoice.id
                            },
                            deadline: new Date(now.getTime() + 10 * 60 * 1000).toISOString(), // 10 minutes
                            auto_created: true
                        });

                    await supabase
                        .from("invoices")
                        .update({
                            reminder_sent_count: 4,
                            last_reminder_sent: now.toISOString()
                        })
                        .eq("id", invoice.id);

                    results.workflows_created++;
                    console.log(`✅ [Invoice ${invoice.invoice_number}] Admin workflow created`);
                }

            } catch (invoiceError) {
                console.error(`❌ [Invoice ${invoice.id}] Error:`, invoiceError.message);
                results.errors.push({
                    invoice_id: invoice.id,
                    error: invoiceError.message
                });
            }
        }

        console.log('✅ [Payment Reminder Engine - TESTING MODE] Complete:', results);

        return new Response(
            JSON.stringify({
                success: true,
                test_mode: true,
                timestamp: new Date().toISOString(),
                results: results,
                note: '🧪 TESTING MODE: Using 10-minute intervals instead of days. Remember to revert!'
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [Payment Reminder Engine] Fatal error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
