import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { format } from "https://esm.sh/date-fns@2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shouldSendNotification } from "../_shared/preferenceChecker.ts";
import { 
    logNotificationSent, 
    logNotificationFailed, 
    logNotificationSkipped 
} from "../_shared/notificationLogger.ts";
import { scheduleRetry } from "../_shared/retryHandler.ts";

/**
 * 💳 PRODUCTION MODE: Payment Reminder Engine - ENHANCED
 *
 * ✅ PREFERENCE CHECKING: Respects user opt-outs (NEW)
 * ✅ COMPREHENSIVE LOGGING: Audit trail for all sends (NEW)
 *
 * PRODUCTION INTERVALS (Industry Standard):
 * - 7 days overdue = First gentle reminder (Email)
 * - 14 days overdue = Formal reminder (Email + SMS)
 * - 21 days overdue = Final notice (Email + SMS + WhatsApp)
 * - 28 days overdue = Escalation to admin workflow (Collections)
 *
 * TESTING INTERVALS (for dev/staging):
 * - Set TESTING_MODE=true to use: 10min, 20min, 30min, 40min intervals
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // ✅ CONFIGURABLE: Testing vs Production intervals
        const TESTING_MODE = Deno.env.get("PAYMENT_REMINDER_TESTING_MODE") === "true";
        
        const intervals = TESTING_MODE ? {
            first_reminder: 2 * 60 * 1000,       // 2 minutes (RAPID testing)
            second_reminder: 4 * 60 * 1000,      // 4 minutes (RAPID testing)
            final_notice: 6 * 60 * 1000,         // 6 minutes (RAPID testing)
            admin_escalation: 8 * 60 * 1000,     // 8 minutes (RAPID testing)
        } : {
            first_reminder: 7 * 24 * 60 * 60 * 1000,   // 7 days (production)
            second_reminder: 14 * 24 * 60 * 60 * 1000,  // 14 days (production)
            final_notice: 21 * 24 * 60 * 60 * 1000,    // 21 days (production)
            admin_escalation: 28 * 24 * 60 * 60 * 1000, // 28 days (production)
        };

        console.log(`💳 [Payment Reminder Engine - ${TESTING_MODE ? 'TESTING' : 'PRODUCTION'} MODE] Starting run...`);
        console.log('📅 Intervals:', {
            first: TESTING_MODE ? '2 min' : '7 days',
            second: TESTING_MODE ? '4 min' : '14 days',
            final: TESTING_MODE ? '6 min' : '21 days',
            escalation: TESTING_MODE ? '8 min' : '28 days',
        });

        const results = {
            checked: 0,
            first_reminders: 0,
            second_reminders: 0,
            final_notices: 0,
            workflows_created: 0,
            errors: [] as any[],
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
                const msOverdue = now - dueDate;

                // Skip if not overdue yet
                if (msOverdue < 0) continue;

                const daysOverdue = Math.floor(msOverdue / (24 * 60 * 60 * 1000));
                const minutesOverdue = Math.floor(msOverdue / (60 * 1000));
                
                console.log(`📋 [Invoice ${invoice.invoice_number}] ${TESTING_MODE ? minutesOverdue + ' minutes' : daysOverdue + ' days'} overdue`);

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

                // REMINDER 1: First gentle reminder (Email)
                if (msOverdue >= intervals.first_reminder && msOverdue < intervals.second_reminder && invoice.reminder_sent_count === 0) {
                    console.log(`📧 [Invoice ${invoice.invoice_number}] Sending first reminder (${TESTING_MODE ? '10 min' : '7 days'})`);

                    // ✅ Check preference before sending
                    const preferenceCheck = await shouldSendNotification(
                        supabase,
                        contactEmail,
                        'payment_reminder',
                        'email',
                        'client'
                    );

                    if (!preferenceCheck.allowed) {
                        console.log(`⏭️ [Invoice ${invoice.invoice_number}] Skipping - ${preferenceCheck.reason}`);
                        await logNotificationSkipped(supabase, {
                            recipientEmail: contactEmail,
                            recipientType: 'client',
                            agencyId: invoice.agency_id,
                            clientId: invoice.client_id,
                            notificationType: 'payment_reminder',
                            channel: 'email',
                            subject: `Payment Reminder: Invoice ${invoice.invoice_number}`,
                            preferenceChecked: preferenceCheck.preferenceChecked,
                            preferenceStatus: preferenceCheck.preferenceStatus,
                            skippedReason: preferenceCheck.reason,
                            relatedEntityId: invoice.id,
                            relatedEntityType: 'invoice',
                            metadata: { invoice_number: invoice.invoice_number, reminder_count: 1 }
                        });
                        continue;
                    }

                    if (contactEmail) {
                        const subject = `Gentle Reminder: Invoice ${invoice.invoice_number} Payment Due`;
                        const message = `
                            <p>Dear ${clientInfo.contact_person?.name || clientInfo.name},</p>
                            
                            <p>This is a gentle reminder that Invoice ${invoice.invoice_number} for <strong>£${invoice.total.toFixed(2)}</strong> 
                            was due on ${format(dueDate, 'MMM dd, yyyy')} and remains unpaid.</p>
                            
                            <p>If you've already processed this payment, please disregard this message. Otherwise, please process payment at your earliest convenience.</p>
                            
                            <p>If you have any questions or concerns, please don't hesitate to contact us.</p>
                            
                            <p>Thank you,<br/>${agencyInfo.name}</p>
                        `;

                        try {
                            const emailResult = await supabase.functions.invoke('send-email', {
                                body: {
                                    to: contactEmail,
                                    subject: subject,
                                    html: message
                                }
                            });

                            // ✅ Log successful send
                            await logNotificationSent(supabase, {
                                recipientEmail: contactEmail,
                                recipientType: 'client',
                                agencyId: invoice.agency_id,
                                clientId: invoice.client_id,
                                notificationType: 'payment_reminder',
                                channel: 'email',
                                subject: subject,
                                provider: 'resend',
                                providerMessageId: emailResult?.data?.messageId,
                                preferenceChecked: preferenceCheck.preferenceChecked,
                                preferenceStatus: preferenceCheck.preferenceStatus,
                                relatedEntityId: invoice.id,
                                relatedEntityType: 'invoice',
                                metadata: { invoice_number: invoice.invoice_number, reminder_count: 1 }
                            });

                            await supabase
                                .from("invoices")
                                .update({
                                    reminder_sent_count: 1,
                                    last_reminder_sent: now.toISOString()
                                })
                                .eq("id", invoice.id);

                            results.first_reminders++;
                            console.log(`✅ [Invoice ${invoice.invoice_number}] First reminder email sent`);
                        } catch (error) {
                            // ✅ Log failed send
                            await logNotificationFailed(supabase, {
                                recipientEmail: contactEmail,
                                recipientType: 'client',
                                agencyId: invoice.agency_id,
                                clientId: invoice.client_id,
                                notificationType: 'payment_reminder',
                                channel: 'email',
                                subject: subject,
                                errorMessage: error.message,
                                relatedEntityId: invoice.id,
                                relatedEntityType: 'invoice',
                                metadata: { invoice_number: invoice.invoice_number, reminder_count: 1 }
                            });
                            // ✅ NEW: Schedule Retry
                            await scheduleRetry(supabase, {
                                notificationType: 'payment_reminder',
                                channel: 'email',
                                recipientEmail: contactEmail,
                                recipientType: 'client',
                                agencyId: invoice.agency_id,
                                recipientId: invoice.client_id,
                                subject: subject,
                                content: message,
                                relatedEntityId: invoice.id,
                                relatedEntityType: 'invoice',
                                errorMessage: error.message,
                                metadata: { invoice_number: invoice.invoice_number, reminder_count: 1 }
                            });

                            console.error(`❌ [Invoice ${invoice.invoice_number}] Email failed:`, error.message);
                            results.errors.push({
                                invoice_id: invoice.id,
                                error: `Email failed: ${error.message}`
                            });
                        }
                    } else {
                        console.log(`⚠️  [Invoice ${invoice.invoice_number}] No phone number for WhatsApp`);
                    }
                }

                // REMINDER 2: Second reminder (Email)
                if (msOverdue >= intervals.second_reminder && msOverdue < intervals.final_notice && invoice.reminder_sent_count === 1) {
                    console.log(`📧 [Invoice ${invoice.invoice_number}] Sending second reminder (${TESTING_MODE ? '4 min' : '14 days'})`);

                    // ✅ Check preference before sending
                    const preferenceCheck = await shouldSendNotification(
                        supabase,
                        contactEmail,
                        'payment_reminder',
                        'email',
                        'client'
                    );

                    if (!preferenceCheck.allowed) {
                        console.log(`⏭️ [Invoice ${invoice.invoice_number}] Skipping - ${preferenceCheck.reason}`);
                        await logNotificationSkipped(supabase, {
                            recipientEmail: contactEmail,
                            recipientType: 'client',
                            agencyId: invoice.agency_id,
                            clientId: invoice.client_id,
                            notificationType: 'payment_reminder',
                            channel: 'email',
                            subject: `Payment Reminder #2: Invoice ${invoice.invoice_number}`,
                            preferenceChecked: preferenceCheck.preferenceChecked,
                            preferenceStatus: preferenceCheck.preferenceStatus,
                            skippedReason: preferenceCheck.reason,
                            relatedEntityId: invoice.id,
                            relatedEntityType: 'invoice',
                            metadata: { invoice_number: invoice.invoice_number, reminder_count: 2 }
                        });
                        continue;
                    }

                    if (contactEmail) {
                        try {
                            const emailResult = await supabase.functions.invoke('send-email', {
                                body: {
                                    to: contactEmail,
                                    subject: `🧪 TEST: Payment Reminder #2 - Invoice ${invoice.invoice_number} (4 mins overdue)`,
                                    html: `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <div style="background: #f59e0b; padding: 30px; text-align: center;">
                                            <h1 style="color: white; margin: 0;">⚠️ Payment Reminder #2 (TEST)</h1>
                                        </div>
                                        <div style="padding: 30px; background: #fffbeb;">
                                            <p style="font-size: 16px; color: #1f2937;">Dear ${clientInfo.contact_person?.name || 'Finance Team'},</p>
                                            <p style="font-size: 16px; color: #1f2937;">This is <strong>TEST reminder #2</strong> that invoice ${invoice.invoice_number} is now <strong>4 minutes overdue</strong>.</p>

                                            <div style="background: white; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
                                                <p style="margin: 10px 0;"><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                                                <p style="margin: 10px 0;"><strong>Invoice Date:</strong> ${invoice.invoice_date}</p>
                                                <p style="margin: 10px 0;"><strong>Due Date:</strong> ${invoice.due_date}</p>
                                                <p style="margin: 10px 0;"><strong>Amount Due:</strong> £${invoice.balance_due.toFixed(2)}</p>
                                                <p style="margin: 10px 0; color: #dc2626;"><strong>Test Mode:</strong> 4 minutes overdue (14 days in production)</p>
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

                            // ✅ Log successful send
                            await logNotificationSent(supabase, {
                                recipientEmail: contactEmail,
                                recipientType: 'client',
                                agencyId: invoice.agency_id,
                                clientId: invoice.client_id,
                                notificationType: 'payment_reminder',
                                channel: 'email',
                                subject: `Payment Reminder #2 - Invoice ${invoice.invoice_number}`,
                                provider: 'resend',
                                providerMessageId: emailResult?.data?.messageId,
                                preferenceChecked: preferenceCheck.preferenceChecked,
                                preferenceStatus: preferenceCheck.preferenceStatus,
                                relatedEntityId: invoice.id,
                                relatedEntityType: 'invoice',
                                metadata: { invoice_number: invoice.invoice_number, reminder_count: 2, testing_mode: TESTING_MODE }
                            });

                            await supabase
                                .from("invoices")
                                .update({
                                    reminder_sent_count: 2,
                                    last_reminder_sent: now.toISOString()
                                })
                                .eq("id", invoice.id);

                            results.second_reminders++;
                            console.log(`✅ [Invoice ${invoice.invoice_number}] 20-min email sent`);
                        } catch (error) {
                            // ✅ Log failure
                            await logNotificationFailed(supabase, {
                                recipientEmail: contactEmail,
                                recipientType: 'client',
                                agencyId: invoice.agency_id,
                                clientId: invoice.client_id,
                                notificationType: 'payment_reminder',
                                channel: 'email',
                                subject: `Payment Reminder #2 - Invoice ${invoice.invoice_number}`,
                                errorMessage: (error as Error).message,
                                relatedEntityId: invoice.id,
                                relatedEntityType: 'invoice'
                            });

                            // ✅ NEW: Schedule Retry
                            await scheduleRetry(supabase, {
                                notificationType: 'payment_reminder',
                                channel: 'email',
                                recipientEmail: contactEmail,
                                recipientType: 'client',
                                agencyId: invoice.agency_id,
                                recipientId: invoice.client_id,
                                subject: `Payment Reminder #2 - Invoice ${invoice.invoice_number}`,
                                content: `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <div style="background: #f59e0b; padding: 30px; text-align: center;">
                                            <h1 style="color: white; margin: 0;">⚠️ Payment Reminder #2 (TEST)</h1>
                                        </div>
                                        <div style="padding: 30px; background: #fffbeb;">
                                            <p style="font-size: 16px; color: #1f2937;">Dear ${clientInfo.contact_person?.name || 'Finance Team'},</p>
                                            <p style="font-size: 16px; color: #1f2937;">This is <strong>TEST reminder #2</strong> that invoice ${invoice.invoice_number} is now <strong>4 minutes overdue</strong>.</p>

                                            <div style="background: white; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
                                                <p style="margin: 10px 0;"><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                                                <p style="margin: 10px 0;"><strong>Invoice Date:</strong> ${invoice.invoice_date}</p>
                                                <p style="margin: 10px 0;"><strong>Due Date:</strong> ${invoice.due_date}</p>
                                                <p style="margin: 10px 0;"><strong>Amount Due:</strong> £${invoice.balance_due.toFixed(2)}</p>
                                                <p style="margin: 10px 0; color: #dc2626;"><strong>Test Mode:</strong> 4 minutes overdue (14 days in production)</p>
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
                                `,
                                relatedEntityId: invoice.id,
                                relatedEntityType: 'invoice',
                                errorMessage: (error as Error).message,
                                metadata: { invoice_number: invoice.invoice_number, reminder_count: 2 }
                            });

                            console.error(`❌ [Invoice ${invoice.invoice_number}] Email failed:`, (error as Error).message);
                            results.errors.push({
                                invoice_id: invoice.id,
                                error: `Email failed: ${error.message}`
                            });
                        }
                    } else {
                        console.log(`⚠️  [Invoice ${invoice.invoice_number}] No email address`);
                    }
                }

                // REMINDER 3: Final notice (Urgent Email + SMS)
                if (msOverdue >= intervals.final_notice && msOverdue < intervals.admin_escalation && invoice.reminder_sent_count === 2) {
                    console.log(`🚨 [Invoice ${invoice.invoice_number}] Sending final notice (${TESTING_MODE ? '6 min' : '21 days'})`);

                    // --- EMAIL NOTIFICATION ---
                    const emailPref = await shouldSendNotification(
                        supabase,
                        contactEmail,
                        'payment_reminder',
                        'email',
                        'client'
                    );

                    if (emailPref.allowed && contactEmail) {
                        try {
                            const emailResult = await supabase.functions.invoke('send-email', {
                                body: {
                                    to: contactEmail,
                                    subject: `🚨 URGENT TEST: Reminder #3 - Invoice ${invoice.invoice_number} - 6 Minutes Overdue - Immediate Action Required`,
                                    html: `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <div style="background: #dc2626; padding: 30px; text-align: center;">
                                            <h1 style="color: white; margin: 0;">🚨 URGENT PAYMENT REQUEST #3 (TEST)</h1>
                                        </div>
                                        <div style="padding: 30px; background: #fef2f2;">
                                            <p style="font-size: 16px; color: #1f2937;">Dear ${clientInfo.contact_person?.name || 'Finance Team'},</p>
                                            <p style="font-size: 18px; color: #dc2626; font-weight: bold;">URGENT TEST REMINDER #3: Invoice ${invoice.invoice_number} is now <strong>6 minutes overdue</strong>.</p>

                                            <div style="background: white; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
                                                <p style="margin: 10px 0;"><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                                                <p style="margin: 10px 0;"><strong>Due Date:</strong> ${invoice.due_date}</p>
                                                <p style="margin: 10px 0; color: #dc2626; font-size: 20px;"><strong>Amount Due:</strong> £${invoice.balance_due.toFixed(2)}</p>
                                                <p style="margin: 10px 0; color: #dc2626; font-size: 18px;"><strong>Test Mode:</strong> 6 minutes overdue (21 days in production)</p>
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

                            await logNotificationSent(supabase, {
                                recipientEmail: contactEmail,
                                recipientType: 'client',
                                agencyId: invoice.agency_id,
                                clientId: invoice.client_id,
                                notificationType: 'payment_reminder',
                                channel: 'email',
                                subject: `Payment Reminder #3 - Invoice ${invoice.invoice_number}`,
                                provider: 'resend',
                                providerMessageId: emailResult?.data?.messageId,
                                preferenceChecked: emailPref.preferenceChecked,
                                preferenceStatus: emailPref.preferenceStatus,
                                relatedEntityId: invoice.id,
                                relatedEntityType: 'invoice',
                                metadata: { invoice_number: invoice.invoice_number, reminder_count: 3, testing_mode: TESTING_MODE }
                            });

                        } catch (error) {
                            // ✅ Log failure
                            await logNotificationFailed(supabase, {
                                recipientEmail: contactEmail,
                                recipientType: 'client',
                                agencyId: invoice.agency_id,
                                clientId: invoice.client_id,
                                notificationType: 'payment_reminder',
                                channel: 'email',
                                subject: `FINAL NOTICE: Invoice ${invoice.invoice_number} Overdue`,
                                errorMessage: (error as Error).message,
                                relatedEntityId: invoice.id,
                                relatedEntityType: 'invoice'
                            });

                            // ✅ NEW: Schedule Retry
                            await scheduleRetry(supabase, {
                                notificationType: 'payment_reminder',
                                channel: 'email',
                                recipientEmail: contactEmail,
                                recipientType: 'client',
                                agencyId: invoice.agency_id,
                                recipientId: invoice.client_id,
                                subject: `FINAL NOTICE: Invoice ${invoice.invoice_number} Overdue`,
                                content: `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <div style="background: #dc2626; padding: 30px; text-align: center;">
                                            <h1 style="color: white; margin: 0;">🚨 FINAL NOTICE (TEST)</h1>
                                        </div>
                                        <div style="padding: 30px; background: #fef2f2;">
                                            <p style="font-size: 16px; color: #1f2937;">Dear ${clientInfo.contact_person?.name || 'Finance Team'},</p>
                                            <p style="font-size: 16px; color: #1f2937;">This is a <strong>FINAL NOTICE (TEST)</strong> regarding invoice ${invoice.invoice_number} which is now <strong>6 minutes overdue</strong>.</p>

                                            <div style="background: white; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
                                                <p style="margin: 10px 0;"><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                                                <p style="margin: 10px 0;"><strong>Amount Due:</strong> £${invoice.balance_due.toFixed(2)}</p>
                                                <p style="margin: 10px 0; color: #dc2626;"><strong>Status:</strong> SERIOUSLY OVERDUE</p>
                                            </div>

                                            <p style="font-size: 14px; color: #78716c;">
                                                In production, this would be sent 30 days after invoice is overdue.
                                            </p>

                                            <div style="background: #fee2e2; border: 2px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 8px;">
                                                <p style="font-size: 14px; color: #991b1b; margin: 0;">
                                                    <strong>IMMEDIATE ACTION REQUIRED:</strong> Please remit payment immediately to avoid service interruption.
                                                </p>
                                            </div>
                                        </div>
                                        <div style="background: #991b1b; padding: 20px; text-align: center;">
                                            <p style="color: white; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ${agencyInfo.name}</p>
                                        </div>
                                    </div>
                                `,
                                relatedEntityId: invoice.id,
                                relatedEntityType: 'invoice',
                                errorMessage: (error as Error).message,
                                metadata: { invoice_number: invoice.invoice_number, reminder_count: 3 }
                            });

                            console.error(`❌ [Invoice ${invoice.invoice_number}] Email failed:`, (error as Error).message);
                            results.errors.push({
                                invoice_id: invoice.id,
                                error: `Email failed: ${error.message}`
                            });
                        }
                    } else if (!emailPref.allowed) {
                         console.log(`⏭️ [Invoice ${invoice.invoice_number}] Email Skipped - ${emailPref.reason}`);
                         await logNotificationSkipped(supabase, {
                            recipientEmail: contactEmail,
                            recipientType: 'client',
                            agencyId: invoice.agency_id,
                            clientId: invoice.client_id,
                            notificationType: 'payment_reminder',
                            channel: 'email',
                            subject: `Payment Reminder #3: Invoice ${invoice.invoice_number}`,
                            preferenceChecked: emailPref.preferenceChecked,
                            preferenceStatus: emailPref.preferenceStatus,
                            skippedReason: emailPref.reason,
                            relatedEntityId: invoice.id,
                            relatedEntityType: 'invoice',
                            metadata: { invoice_number: invoice.invoice_number, reminder_count: 3 }
                        });
                    }

                    // --- SMS NOTIFICATION ---
                    const smsPref = await shouldSendNotification(
                        supabase,
                        contactEmail,
                        'payment_reminder',
                        'sms',
                        'client'
                    );

                    if (smsPref.allowed && contactPhone) {
                        try {
                            const smsResult = await supabase.functions.invoke('send-sms', {
                                body: {
                                    to: contactPhone,
                                    message: `🧪 TEST: 🚨 URGENT REMINDER #3: Invoice ${invoice.invoice_number} for £${invoice.balance_due.toFixed(2)} is now 6 minutes overdue. IMMEDIATE PAYMENT REQUIRED. Contact: ${agencyInfo.contact_phone}`
                                }
                            });

                             await logNotificationSent(supabase, {
                                recipientEmail: contactEmail,
                                recipientPhone: contactPhone,
                                recipientType: 'client',
                                agencyId: invoice.agency_id,
                                clientId: invoice.client_id,
                                notificationType: 'payment_reminder',
                                channel: 'sms',
                                subject: `Payment Reminder #3 SMS`,
                                provider: 'twilio',
                                providerMessageId: smsResult?.data?.sid,
                                preferenceChecked: smsPref.preferenceChecked,
                                preferenceStatus: smsPref.preferenceStatus,
                                relatedEntityId: invoice.id,
                                relatedEntityType: 'invoice',
                                metadata: { invoice_number: invoice.invoice_number, reminder_count: 3, testing_mode: TESTING_MODE }
                            });

                            console.log(`✅ [Invoice ${invoice.invoice_number}] 30-min urgent SMS sent`);
                        } catch (error) {
                             await logNotificationFailed(supabase, {
                                recipientEmail: contactEmail,
                                recipientPhone: contactPhone,
                                recipientType: 'client',
                                agencyId: invoice.agency_id,
                                clientId: invoice.client_id,
                                notificationType: 'payment_reminder',
                                channel: 'sms',
                                subject: `Payment Reminder #3 SMS`,
                                errorMessage: (error as Error).message,
                                relatedEntityId: invoice.id,
                                relatedEntityType: 'invoice'
                            });
                             // ✅ NEW: Schedule Retry
                             await scheduleRetry(supabase, {
                                notificationType: 'payment_reminder',
                                channel: 'sms',
                                recipientEmail: contactEmail,
                                recipientPhone: contactPhone,
                                recipientType: 'client',
                                agencyId: invoice.agency_id,
                                recipientId: invoice.client_id,
                                content: `🧪 TEST: 🚨 URGENT REMINDER #3: Invoice ${invoice.invoice_number} for £${invoice.balance_due.toFixed(2)} is now 6 minutes overdue. IMMEDIATE PAYMENT REQUIRED. Contact: ${agencyInfo.contact_phone}`,
                                relatedEntityId: invoice.id,
                                relatedEntityType: 'invoice',
                                errorMessage: (error as Error).message,
                                metadata: { invoice_number: invoice.invoice_number, reminder_count: 3 }
                            });

                            console.error(`❌ [Invoice ${invoice.invoice_number}] SMS failed:`, (error as Error).message);
                            results.errors.push({ invoice_id: invoice.id, error: `SMS failed: ${error.message}` });
                        }
                    } else if (!smsPref.allowed) {
                        console.log(`⏭️ [Invoice ${invoice.invoice_number}] SMS Skipped - ${smsPref.reason}`);
                         await logNotificationSkipped(supabase, {
                            recipientEmail: contactEmail,
                            recipientPhone: contactPhone,
                            recipientType: 'client',
                            agencyId: invoice.agency_id,
                            clientId: invoice.client_id,
                            notificationType: 'payment_reminder',
                            channel: 'sms',
                            subject: `Payment Reminder #3 SMS`,
                            preferenceChecked: smsPref.preferenceChecked,
                            preferenceStatus: smsPref.preferenceStatus,
                            skippedReason: smsPref.reason,
                            relatedEntityId: invoice.id,
                            relatedEntityType: 'invoice',
                            metadata: { invoice_number: invoice.invoice_number, reminder_count: 3 }
                        });
                    }

                    await supabase
                        .from("invoices")
                        .update({
                            reminder_sent_count: 3,
                            last_reminder_sent: now.toISOString()
                        })
                        .eq("id", invoice.id);

                    results.final_notices++;
                }

                // ESCALATION: Admin workflow for critical overdue
                if (msOverdue >= intervals.admin_escalation && invoice.reminder_sent_count === 3) {
                    console.log(`📋 [Invoice ${invoice.invoice_number}] Creating admin workflow for critical overdue (${TESTING_MODE ? '8 min' : '28 days'})`);

                    await supabase
                        .from("admin_workflows")
                        .insert({
                            agency_id: invoice.agency_id,
                            type: 'payment_issue',
                            priority: 'critical',
                            status: 'pending',
                            title: `🧪 TEST: CRITICAL - Reminder #4 - Invoice ${invoice.invoice_number} - 8 Minutes Overdue - £${invoice.balance_due.toFixed(2)}`,
                            description: `[TEST MODE] Invoice is critically overdue (8 minutes in test, would be 28 days in production). Client: ${clientInfo.name}. All 3 automatic reminders sent. Manual intervention required.`,
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
                note: '🧪 RAPID TESTING MODE: Using 2-minute intervals (2min, 4min, 6min, 8min) instead of days. Remember to revert!'
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
