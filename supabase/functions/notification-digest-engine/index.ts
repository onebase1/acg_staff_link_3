import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 📧 NOTIFICATION DIGEST ENGINE
 *
 * Processes queued notifications and sends batched emails
 * Runs every 5 minutes via cron
 *
 * ✅ BATCHING: Multiple shifts in one email
 * ✅ PROFESSIONAL: Branded templates with agency logos
 * ✅ SMART: Groups by recipient + type
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

                let emailHtml = '';
                let subject = '';

                // ✅ BATCHED SHIFT ASSIGNMENTS
                if (queue.notification_type === 'shift_assignment') {
                    const shiftCount = queue.pending_items.length;
                    subject = `${shiftCount} New Shift${shiftCount > 1 ? 's' : ''} Assigned - ${agency?.name || 'Your Agency'}`;

                    const totalHours = queue.pending_items.reduce((sum, item) => sum + (item.duration_hours || 0), 0);
                    const totalEarnings = queue.pending_items.reduce((sum, item) =>
                        sum + ((item.pay_rate || 0) * (item.duration_hours || 0)), 0
                    );

                    // Generate shift cards HTML
                    const shiftCardsHtml = queue.pending_items.map(item => `
                        <div style="border-left: 4px solid #06b6d4; padding: 15px; background: #f9fafb; border-radius: 8px; margin-bottom: 15px;">
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
                    `).join('');

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
                                <div style="background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); padding: 30px 20px; text-align: center;">
                                    ${agency?.logo_url ? `
                                        <img src="${agency.logo_url}" alt="${agency.name}" style="max-height: 60px; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto;">
                                    ` : ''}
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                                        <span style="font-size: 32px;">📅</span>
                                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">New Shift Assignment</h1>
                                    </div>
                                </div>

                                <!-- CONTENT -->
                                <div style="padding: 30px 20px;">
                                    <p style="font-size: 16px; color: #374151; margin: 0 0 10px 0;">
                                        Dear ${queue.recipient_first_name || 'Team Member'},
                                    </p>

                                    <p style="font-size: 16px; color: #374151; margin: 0 0 25px 0;">
                                        You have been assigned to <strong>${shiftCount} shift${shiftCount > 1 ? 's' : ''}</strong>. Please review the details below and confirm your availability.
                                    </p>

                                    ${shiftCardsHtml}

                                    <!-- Total Earnings Box -->
                                    <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border: 2px solid #059669; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
                                        <div style="font-size: 18px; color: #065f46; font-weight: bold; margin-bottom: 5px;">
                                            💰 Total Earnings: £${totalEarnings.toFixed(2)}
                                        </div>
                                        <div style="font-size: 14px; color: #047857;">
                                            ${totalHours} hours • ${shiftCount} shift${shiftCount > 1 ? 's' : ''}
                                        </div>
                                    </div>

                                    <!-- Action Required Box -->
                                    <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                                        <div style="font-weight: bold; color: #92400e; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                                            <span style="font-size: 20px;">⚠️</span>
                                            <span>ACTION REQUIRED</span>
                                        </div>
                                        <p style="margin: 0; font-size: 14px; color: #78350f;">
                                            Please confirm your availability as soon as possible. Contact us immediately if you cannot attend any of these shifts.
                                        </p>
                                    </div>

                                    <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0;">
                                        Questions? Contact us at <a href="mailto:${agency?.contact_email || 'support@agilecaremanagement.co.uk'}" style="color: #0284c7; text-decoration: none;">${agency?.contact_email || 'support@agilecaremanagement.co.uk'}</a> or ${agency?.contact_phone || '+44 20 1234 5678'}
                                    </p>
                                </div>

                                <!-- Unsubscribe Link -->
                                <div style="background: #f9fafb; padding: 15px; text-align: center;">
                                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                        <a href="https://agilecaremanagement.co.uk/preferences?email=${encodeURIComponent(queue.recipient_email)}" style="color: #64748b; text-decoration: underline;">
                                            Manage email preferences
                                        </a>
                                    </p>
                                </div>

                                <!-- ✅ FOOTER -->
                                <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center;">
                                    <p style="margin: 0; font-size: 13px;">© ${new Date().getFullYear()} Agile Care Management. All rights reserved.</p>
                                    <p style="margin: 10px 0 0 0; font-size: 12px;">
                                        Need help? Contact us at <a href="mailto:support@agilecaremanagement.co.uk" style="color: #06b6d4; text-decoration: none;">support@agilecaremanagement.co.uk</a>
                                    </p>
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
                                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center;">
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
                                        <a href="https://agilecaremanagement.co.uk/preferences?email=${encodeURIComponent(queue.recipient_email)}" style="color: #64748b; text-decoration: underline;">
                                            Manage email preferences
                                        </a>
                                    </p>
                                </div>

                                <!-- FOOTER -->
                                <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center;">
                                    <p style="margin: 0; font-size: 13px;">© ${new Date().getFullYear()} Agile Care Management. All rights reserved.</p>
                                    <p style="margin: 10px 0 0 0; font-size: 12px;">
                                        Need help? Contact us at <a href="mailto:support@agilecaremanagement.co.uk" style="color: #06b6d4; text-decoration: none;">support@agilecaremanagement.co.uk</a>
                                    </p>
                                </div>

                            </div>
                        </body>
                        </html>
                    `;
                }

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
                    throw new Error(emailResult?.error || emailError?.message || 'Email send failed');
                }

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
                console.error(`❌ [Queue ${queue.id}] Error:`, queueError.message);

                // ✅ FIX: Changed from notification_queues to notification_queue (singular)
                await supabase
                    .from("notification_queue")
                    .update({
                        status: 'failed',
                        error_message: queueError.message
                    })
                    .eq("id", queue.id);

                results.failed++;
                results.errors.push({
                    queue_id: queue.id,
                    error: queueError.message
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
