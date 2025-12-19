import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shouldSendNotification } from "../_shared/preferenceChecker.ts";
import {
    logNotificationSent,
    logNotificationFailed,
    logNotificationSkipped
} from "../_shared/notificationLogger.ts";
import { getBranding } from "../_shared/getBranding.ts";

/**
 * 📧 NOTIFICATION DIGEST ENGINE - ENHANCED
 *
 * Processes queued notifications and sends batched emails
 * Runs every 5 minutes via cron
 *
 * ✅ BATCHING: Multiple shifts in one email
 * ✅ PROFESSIONAL: Branded templates with agency logos
 * ✅ SMART: Groups by recipient + type
 * ✅ PREFERENCE CHECKING: Respects user opt-outs (NEW)
 * ✅ COMPREHENSIVE LOGGING: Audit trail for all sends (NEW)
 */

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log('📧 [Digest Engine] Starting batch processing...');

        const now = new Date();

        // ✅ FIX: Changed from notification_queues to notification_queue (singular)
        const { data: pendingQueues, error: queuesError } = await supabase
            .from("notification_queue")
            .select("*")
            .eq("status", "pending");

        if (queuesError) {
            console.error('❌ [Digest Engine] Error fetching queues:', queuesError);
            throw queuesError;
        }

        const readyQueues = pendingQueues?.filter(q => new Date(q.scheduled_send_at) <= now) || [];

        console.log(`📊 [Digest Engine] Found ${readyQueues.length} queues ready to send`);

        const results = {
            processed: 0,
            sent: 0,
            failed: 0,
            errors: []
        };

        for (const queue of readyQueues) {
            try {
                console.log(`📤 [Queue ${queue.id}] Processing ${queue.item_count} items for ${queue.recipient_email}`);

                // Get agency for branding
                const { data: agencies } = await supabase
                    .from("agencies")
                    .select("*")
                    .eq("id", queue.agency_id);

                const agency = agencies?.[0];

                // Get dynamic branding for this agency
                const branding = await getBranding(supabase, queue.agency_id);

                let emailHtml = '';
                let subject = '';

                // ✅ BATCHED SHIFT ASSIGNMENTS
                if (queue.notification_type === 'shift_assignment') {
                    const shiftCount = queue.pending_items.length;
                    
                    // ✅ CHECK STATUS: If all shifts are already confirmed, change template
                    const isAllConfirmed = queue.pending_items.every((item: any) => item.status === 'confirmed');
                    
                    const title = isAllConfirmed ? 'Shift Confirmed' : 'New Shift Assignment';
                    const icon = isAllConfirmed ? '✅' : '📅';
                    const headerColor = isAllConfirmed ? '#10b981' : '#0284c7';
                    
                    subject = isAllConfirmed 
                        ? `Shift${shiftCount > 1 ? 's' : ''} Confirmed - ${agency?.name || 'Your Agency'}`
                        : `${shiftCount} New Shift${shiftCount > 1 ? 's' : ''} Assigned - ${agency?.name || 'Your Agency'}`;

                    const totalHours = queue.pending_items.reduce((sum, item) => sum + (item.duration_hours || 0), 0);
                    const totalEarnings = queue.pending_items.reduce((sum, item) =>
                        sum + ((item.pay_rate || 0) * (item.duration_hours || 0)), 0
                    );

                    // Generate shift cards HTML
                    const shiftCardsHtml = queue.pending_items.map(item => {
                        const deadlineStr = item.confirmation_deadline 
                            ? new Date(item.confirmation_deadline).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                            : null;
                        
                        const isUrgent = item.urgency === 'high' || (item.status === 'assigned' && deadlineStr);

                        return `
                        <div style="border-left: 4px solid ${isUrgent ? '#ef4444' : headerColor}; padding: 15px; background: #f9fafb; border-radius: 8px; margin-bottom: 15px;">
                            ${isUrgent ? `
                                <div style="display: inline-block; background: #fee2e2; color: #b91c1c; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 4px; margin-bottom: 8px; text-transform: uppercase;">
                                    ${deadlineStr ? `⏰ Confirm by ${deadlineStr}` : '🔥 Urgent'}
                                </div>
                            ` : ''}
                            <div style="font-weight: bold; color: #1f2937; margin-bottom: 8px;">
                                ${new Date(item.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} • ${item.start_time} - ${item.end_time} (${item.duration_hours}h)
                            </div>
                            <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">
                                📍 ${item.client_name}${item.location ? ` → ${item.location}` : ''}
                            </div>
                            <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">
                                👤 ${item.role}
                            </div>
                            <div style="font-size: 14px; color: #059669; font-weight: 600;">
                                💰 £${item.pay_rate}/hr = £${((item.pay_rate || 0) * (item.duration_hours || 0)).toFixed(2)}
                            </div>
                        </div>
                    `}).join('');

                    // ✅ FIXED: Complete professional template with proper header, footer, and dark mode support
                    emailHtml = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <meta name="color-scheme" content="light dark">
                            <meta name="supported-color-schemes" content="light dark">
                        </head>
                        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

                                <!-- ✅ HEADER - Fixed for both light and dark mode -->
                                <div style="background-color: ${headerColor}; padding: 30px 20px; text-align: center;" bgcolor="${headerColor}">
                                    ${agency?.logo_url ? `
                                        <img src="${agency.logo_url}" alt="${agency.name}" style="max-height: 60px; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto;">
                                    ` : ''}
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                                        <span style="font-size: 32px;">${icon}</span>
                                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">${title}</h1>
                                    </div>
                                </div>

                                <!-- CONTENT -->
                                <div style="padding: 30px 20px;">
                                    <p style="font-size: 16px; color: #374151; margin: 0 0 10px 0;">
                                        Dear ${queue.recipient_first_name || 'Team Member'},
                                    </p>

                                    <p style="font-size: 16px; color: #374151; margin: 0 0 25px 0;">
                                        ${isAllConfirmed 
                                            ? `You have been assigned to <strong>${shiftCount} confirmed shift${shiftCount > 1 ? 's' : ''}</strong>. Please ensure you arrive on time.`
                                            : `You have been assigned to <strong>${shiftCount} shift${shiftCount > 1 ? 's' : ''}</strong>. Please review the details below and <strong>confirm by the deadlines shown</strong> to secure your spot.`
                                        }
                                    </p>

                                    ${shiftCardsHtml}

                                    <!-- Total Earnings Box -->
                                    <div style="background-color: #d1fae5; border: 2px solid #059669; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;" bgcolor="#d1fae5">
                                        <div style="font-size: 18px; color: #065f46; font-weight: bold; margin-bottom: 5px;">
                                            💰 Total Earnings: £${totalEarnings.toFixed(2)}
                                        </div>
                                        <div style="font-size: 14px; color: #047857;">
                                            ${totalHours} hours • ${shiftCount} shift${shiftCount > 1 ? 's' : ''}
                                        </div>
                                    </div>

                                    <!-- Action Required Box (Only if NOT confirmed) -->
                                    ${!isAllConfirmed ? `
                                    <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                        <div style="font-weight: bold; color: #92400e; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                            <span style="font-size: 20px;">⚠️</span>
                                            <span>ACTION REQUIRED</span>
                                        </div>
                                        <p style="margin: 0 0 20px 0; font-size: 15px; color: #78350f; line-height: 1.5;">
                                            Please confirm your availability in the staff portal before the deadlines to secure these bookings.
                                        </p>
                                        <div style="text-align: center;">
                                            <a href="${branding.appUrl}/shifts" style="display: inline-block; background-color: #0284c7; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                                Confirm Shifts in Staff Portal
                                            </a>
                                        </div>
                                    </div>
                                    ` : `
                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="${branding.appUrl}/shifts" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                            View Shifts in Staff Portal
                                        </a>
                                    </div>
                                    `}

                                    <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0;">
                                        Questions? Contact us at <a href="mailto:${agency?.contact_email || branding.supportEmail}" style="color: #0284c7; text-decoration: none;">${agency?.contact_email || branding.supportEmail}</a> or ${agency?.contact_phone || branding.supportPhone}
                                    </p>
                                </div>

                                <!-- Unsubscribe Link -->
                                <div style="background: #f9fafb; padding: 15px; text-align: center;">
                                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                        <a href="${branding.siteUrl}/preferences?email=${encodeURIComponent(queue.recipient_email)}" style="color: #64748b; text-decoration: underline;">
                                            Manage email preferences
                                        </a>
                                    </p>
                                </div>

                                <!-- ✅ FOOTER -->
                                <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center;">
                                    <p style="margin: 0; font-size: 13px;">© ${new Date().getFullYear()} ${branding.companyName}. All rights reserved.</p>
                                    <p style="margin: 10px 0 0 0; font-size: 12px;">
                                        Need help? Contact us at <a href="mailto:${branding.supportEmail}" style="color: #06b6d4; text-decoration: none;">${branding.supportEmail}</a>
                                    </p>
                                </div>

                            </div>
                        </body>
                        </html>
                    `;
                }

                // ✅ SHIFT RECEIPT (For Creator/Admin)
                else if (queue.notification_type === 'shift_receipt') {
                    const shiftCount = queue.pending_items.length;
                    subject = `Receipt: ${shiftCount} Shift${shiftCount > 1 ? 's' : ''} Created - ${agency?.name || 'Your Agency'}`;

                    const shiftCardsHtml = queue.pending_items.map(item => `
                        <div style="border-left: 4px solid #6366f1; padding: 15px; background: #eff6ff; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-weight: bold; color: #1f2937; margin-bottom: 8px;">
                                ${new Date(item.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} • ${item.start_time} - ${item.end_time}
                            </div>
                            <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">
                                📍 ${item.location ? `${item.client_name} → ${item.location}` : item.client_name}
                            </div>
                            <div style="font-size: 14px; color: #6b7280;">
                                📋 ${item.role}
                            </div>
                        </div>
                    `).join('');

                    emailHtml = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <meta name="color-scheme" content="light dark">
                        </head>
                        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

                                <!-- HEADER -->
                                <div style="background-color: #6366f1; padding: 30px 20px; text-align: center;">
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                                        <span style="font-size: 32px;">📝</span>
                                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Shift Receipt</h1>
                                    </div>
                                </div>

                                <!-- CONTENT -->
                                <div style="padding: 30px 20px;">
                                    <p style="font-size: 16px; color: #374151; margin: 0 0 10px 0;">
                                        Hello ${queue.recipient_first_name || 'Admin'},
                                    </p>

                                    <p style="font-size: 16px; color: #374151; margin: 0 0 25px 0;">
                                        This email confirms that you successfully created ${shiftCount} new shift${shiftCount > 1 ? 's' : ''}.
                                    </p>

                                    ${shiftCardsHtml}

                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="${branding.appUrl}/shifts" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Shifts</a>
                                    </div>
                                </div>

                                <!-- FOOTER -->
                                <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center;">
                                    <p style="margin: 0; font-size: 13px;">© ${new Date().getFullYear()} ${agency?.name || branding.companyName}</p>
                                </div>

                            </div>
                        </body>
                        </html>
                    `;
                }

                // ✅ BATCHED SHIFT CONFIRMATIONS TO CLIENT
                else if (queue.notification_type === 'shift_confirmation') {
                    const shiftCount = queue.pending_items.length;
                    subject = `${shiftCount} Shift${shiftCount > 1 ? 's' : ''} Confirmed - ${agency?.name || 'Your Agency'}`;

                    const totalHours = queue.pending_items.reduce((sum, item) => sum + (item.duration_hours || 0), 0);
                    const totalCharge = queue.pending_items.reduce((sum, item) =>
                        sum + ((item.charge_rate || 0) * (item.duration_hours || 0)), 0
                    );

                    const shiftCardsHtml = queue.pending_items.map(item => `
                        <div style="border-left: 4px solid #10b981; padding: 15px; background: #f0fdf4; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-weight: bold; color: #1f2937; margin-bottom: 8px;">
                                ${new Date(item.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} • ${item.start_time} - ${item.end_time}
                            </div>
                            <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">
                                👤 ${item.staff_name} (${item.role})
                            </div>
                            ${item.location ? `
                                <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">
                                    📍 ${item.location}
                                </div>
                            ` : ''}
                            <div style="font-size: 14px; color: #6b7280;">
                                📞 ${item.staff_phone || 'Contact via agency'}
                            </div>
                        </div>
                    `).join('');

                    emailHtml = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <meta name="color-scheme" content="light dark">
                        </head>
                        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

                                <!-- HEADER -->
                                <div style="background-color: #10b981; padding: 30px 20px; text-align: center;" bgcolor="#10b981">
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                                        <span style="font-size: 32px;">✅</span>
                                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Shift${shiftCount > 1 ? 's' : ''} Confirmed</h1>
                                    </div>
                                </div>

                                <!-- CONTENT -->
                                <div style="padding: 30px 20px;">
                                    <p style="font-size: 16px; color: #374151; margin: 0 0 10px 0;">
                                        Dear ${queue.recipient_first_name || 'Team'},
                                    </p>

                                    <p style="font-size: 16px; color: #374151; margin: 0 0 25px 0;">
                                        We're pleased to confirm that ${shiftCount} shift${shiftCount > 1 ? 's have' : ' has'} been successfully filled for your facility.
                                    </p>

                                    ${shiftCardsHtml}

                                    <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0;">
                                        The assigned staff ${shiftCount > 1 ? 'members' : 'member'} will arrive at the scheduled time${shiftCount > 1 ? 's' : ''}.
                                    </p>
                                </div>

                                <!-- Unsubscribe Link -->
                                <div style="background: #f9fafb; padding: 15px; text-align: center;">
                                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                        <a href="${branding.siteUrl}/preferences?email=${encodeURIComponent(queue.recipient_email)}" style="color: #64748b; text-decoration: underline;">
                                            Manage email preferences
                                        </a>
                                    </p>
                                </div>

                                <!-- FOOTER -->
                                <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center;">
                                    <p style="margin: 0; font-size: 13px;">© ${new Date().getFullYear()} ${branding.companyName}. All rights reserved.</p>
                                    <p style="margin: 10px 0 0 0; font-size: 12px;">
                                        Need help? Contact us at <a href="mailto:${branding.supportEmail}" style="color: #06b6d4; text-decoration: none;">${branding.supportEmail}</a>
                                    </p>
                                </div>

                            </div>
                        </body>
                        </html>
                    `; }

                // ✅ NEW: Check if user has opted out of this notification type
                const recipientType = queue.recipient_type || 'client'; // Default to client
                const preferenceCheck = await shouldSendNotification(
                    supabase,
                    queue.recipient_email,
                    queue.notification_type,
                    'email',
                    recipientType
                );

                // If user opted out, log and skip
                if (!preferenceCheck.allowed) {
                    console.log(`⏭️ [Queue ${queue.id}] Skipping - ${preferenceCheck.reason}`);
                    
                    // Log skipped notification
                    await logNotificationSkipped(supabase, {
                        recipientEmail: queue.recipient_email,
                        recipientFirstName: queue.recipient_first_name,
                        recipientType: recipientType,
                        agencyId: queue.agency_id,
                        notificationType: queue.notification_type,
                        channel: 'email',
                        subject: subject,
                        templateName: 'inline_html', // TODO: Extract to templates
                        preferenceChecked: preferenceCheck.preferenceChecked,
                        preferenceStatus: preferenceCheck.preferenceStatus,
                        skippedReason: preferenceCheck.reason,
                        queueId: queue.id,
                        batchId: queue.id, // Using queue ID as batch ID
                        metadata: {
                            item_count: queue.item_count,
                            pending_items: queue.pending_items
                        }
                    });

                    // Update queue status to skipped
                    await supabase
                        .from("notification_queue")
                        .update({
                            status: 'skipped',
                            sent_at: now.toISOString()
                        })
                        .eq("id", queue.id);

                    results.processed++;
                    continue; // Skip to next queue item
                }

                console.log(`✅ [Queue ${queue.id}] Preference check passed - proceeding with send`);

                // Send the batched email
                const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
                    body: {
                        to: queue.recipient_email,
                        subject: subject,
                        html: emailHtml,
                        from_name: agency?.name || 'Agile Care Management'
                    }
                });

                if (emailError || !emailResult?.success) {
                    const errorMessage = emailResult?.error || emailError?.message || 'Email send failed';
                    throw new Error(errorMessage);
                }

                // ✅ NEW: Log successful send
                await logNotificationSent(supabase, {
                    recipientEmail: queue.recipient_email,
                    recipientFirstName: queue.recipient_first_name,
                    recipientType: recipientType,
                    agencyId: queue.agency_id,
                    notificationType: queue.notification_type,
                    channel: 'email',
                    subject: subject,
                    templateName: 'inline_html', // TODO: Extract to templates
                    provider: 'resend',
                    providerMessageId: emailResult.messageId,
                    preferenceChecked: preferenceCheck.preferenceChecked,
                    preferenceStatus: preferenceCheck.preferenceStatus,
                    queueId: queue.id,
                    batchId: queue.id,
                    metadata: {
                        item_count: queue.item_count,
                        agency_name: agency?.name
                    }
                });

                // ✅ FIX: Changed from notification_queues to notification_queue (singular)
                await supabase
                    .from("notification_queue")
                    .update({
                        status: 'sent',
                        sent_at: now.toISOString(),
                        email_message_id: emailResult.messageId
                    })
                    .eq("id", queue.id);

                console.log(`✅ [Queue ${queue.id}] Sent to ${queue.recipient_email}`);
                results.sent++;
                results.processed++;

            } catch (queueError) {
                const error = queueError as Error;
                console.error(`❌ [Queue ${queue.id}] Error:`, error.message);

                // ✅ NEW: Log failed send
                await logNotificationFailed(supabase, {
                    recipientEmail: queue.recipient_email,
                    recipientFirstName: queue.recipient_first_name,
                    recipientType: queue.recipient_type || 'client',
                    agencyId: queue.agency_id,
                    notificationType: queue.notification_type,
                    channel: 'email',
                    subject: '', // Subject may not be set if error occurred early
                    errorMessage: error.message,
                    errorCode: 'send_failed',
                    queueId: queue.id,
                    batchId: queue.id,
                    metadata: {
                        item_count: queue.item_count
                    }
                });

                // ✅ FIX: Changed from notification_queues to notification_queue (singular)
                await supabase
                    .from("notification_queue")
                    .update({
                        status: 'failed',
                        error_message: error.message
                    })
                    .eq("id", queue.id);

                results.failed++;
                results.errors.push({
                    queue_id: queue.id,
                    error: error.message
                });
            }
        }

        console.log('✅ [Digest Engine] Complete:', results);

        return new Response(JSON.stringify({
            success: true,
            timestamp: now.toISOString(),
            results: results
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('❌ [Digest Engine] Fatal error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
