import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
    shouldSendNotification,
    logNotificationSent,
    logNotificationFailed,
    logNotificationSkipped,
    getBranding,
    loadTemplate,
    generateStaffProfileLink
} from "../_shared/all.ts";

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

// CORS headers for browser requests
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Check for trigger type
        let body: { manual_trigger?: boolean; client_id?: string; agency_id?: string; force_send?: boolean } = {};
        try {
            const json = await req.json();
            body = json;
        } catch {
            // No body
        }

        const isManualTrigger = body.manual_trigger === true;
        const targetClientId = body.client_id;
        const forceSend = body.force_send === true;

        console.log(`📧 [Digest Engine] Starting batch processing... Manual: ${isManualTrigger}`);

        const now = new Date();

        // ✅ FIX: Changed from notification_queues to notification_queue (singular)
        let query = supabase
            .from("notification_queue")
            .select("*")
            .eq("status", "pending");

        if (isManualTrigger && targetClientId) {
            query = query.eq("recipient_id", targetClientId); // Queue record has recipient_id
        }

        const { data: pendingQueues, error: queuesError } = await query;

        if (queuesError) {
            console.error('❌ [Digest Engine] Error fetching queues:', queuesError);
            throw queuesError;
        }

        let readyQueues = pendingQueues?.filter(q => {
            if (isManualTrigger && forceSend) return true;
            return new Date(q.scheduled_send_at) <= now;
        }) || [];

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
                                            <a href="${branding.staffPortalUrl}" style="display: inline-block; background-color: #0284c7; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                                Confirm Shifts in Staff Portal
                                            </a>
                                        </div>
                                    </div>
                                    ` : `
                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="${branding.staffPortalUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
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
                                        <a href="${branding.adminDashboardUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Shifts</a>
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

                // ✅ BATCHED SHIFT CONFIRMATIONS TO CLIENT (GROUPED TABLE FORMAT)
                else if (queue.notification_type === 'shift_confirmation') {
                    const shiftCount = queue.pending_items.length;
                    subject = `${shiftCount} Shift${shiftCount > 1 ? 's' : ''} Confirmed - ${agency?.name || 'Your Agency'}`;

                    const totalHours = queue.pending_items.reduce((sum: number, item: ShiftItem) => sum + (item.duration_hours || 0), 0);

                    // 1. Pre-generate staff profile links (Async)
                    const enrichedPendingItems = await Promise.all(queue.pending_items.map(async (item: any) => {
                        if (item.staff_id) {
                            try {
                                const profileLink = await generateStaffProfileLink(
                                    supabase, 
                                    item.staff_id, 
                                    queue.client_id, 
                                    queue.agency_id
                                );
                                return { ...item, staff_profile_link: profileLink };
                            } catch (err) {
                                console.warn(`⚠️ [Digest Engine] Failed to generate profile link for staff ${item.staff_id}:`, err);
                                return item;
                            }
                        }
                        return item;
                    }));

                    // Group shifts by date -> time slot -> role
                    const groupedShifts = groupShiftsByDateTimeRole(enrichedPendingItems);
                    const dateRange = getDateRange(enrichedPendingItems);
                    const roleCounts = getRoleCounts(enrichedPendingItems);

                    // Build grouped HTML
                    const groupedHtml = buildGroupedShiftHtml(groupedShifts);

                    emailHtml = await loadTemplate('batch_confirmation', {
                        client_name: queue.recipient_first_name || 'Team',
                        shift_count: shiftCount,
                        shift_count_plural: shiftCount > 1 ? 's' : '',
                        date_range: dateRange ? ` across ${dateRange}` : '',
                        role_summary_boxes: buildRoleSummaryBoxes(roleCounts),
                        total_hours: totalHours,
                        grouped_shifts_html: groupedHtml,
                        agency_name: agency?.name || branding.companyName,
                        agency_email: agency?.contact_email || branding.supportEmail,
                        portal_url: branding.clientPortalUrl,
                        preferences_url: `${branding.siteUrl}/preferences?email=${encodeURIComponent(queue.recipient_email)}`,
                        current_year: new Date().getFullYear().toString()
                    });
; }

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

                console.log(`✅ [Queue ${queue.id}] Successfully sent to ${queue.recipient_email}`);

                // ✅ FIX: Changed from notification_queues to notification_queue (singular)
                const { error: updateError } = await supabase
                    .from("notification_queue")
                    .update({
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        provider_message_id: emailResult?.messageId
                    })
                    .eq("id", queue.id);

                if (updateError) {
                    console.error(`❌ [Queue ${queue.id}] CRITICAL: Email sent but failed to update queue status:`, updateError);
                    results.errors.push({
                        queue_id: queue.id,
                        error: `Email sent but DB update failed: ${updateError.message}`
                    });
                }

                // ✅ FIX: Add a small delay between sends to avoid 429 Rate Limiting from Resend
                // Especially important for bulk assignments or manual triggers
                await new Promise(resolve => setTimeout(resolve, 1000));

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
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('❌ [Digest Engine] Fatal error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});



// ============================================================================
// HELPER FUNCTIONS FOR GROUPED SHIFT CONFIRMATION EMAILS
// ============================================================================

interface ShiftItem {
    date: string;
    start_time: string;
    end_time: string;
    role: string;
    staff_name: string;
    staff_phone?: string;
    staff_id?: string;
    staff_profile_link?: string;
    location?: string;
    duration_hours?: number;
}

interface GroupedShift {
    date: string;
    dateFormatted: string;
    timeSlots: Map<string, TimeSlotGroup>;
}

interface TimeSlotGroup {
    startTime: string;
    endTime: string;
    shiftType: 'Day' | 'Night';
    roles: Map<string, StaffGroup>;
}

interface StaffGroup {
    role: string;
    staff: Array<{ name: string; phone: string; profile_link?: string }>;
}

/** Group shifts by Date -> Time Slot -> Role */
function groupShiftsByDateTimeRole(items: ShiftItem[]): Map<string, GroupedShift> {
    const grouped = new Map<string, GroupedShift>();

    for (const item of items) {
        const dateKey = item.date;
        const dateFormatted = new Date(item.date).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });

        if (!grouped.has(dateKey)) {
            grouped.set(dateKey, {
                date: dateKey,
                dateFormatted,
                timeSlots: new Map()
            });
        }

        const dateGroup = grouped.get(dateKey)!;
        const timeKey = `${item.start_time}-${item.end_time}`;
        const shiftType = isNightShift(item.start_time) ? 'Night' : 'Day';

        if (!dateGroup.timeSlots.has(timeKey)) {
            dateGroup.timeSlots.set(timeKey, {
                startTime: item.start_time,
                endTime: item.end_time,
                shiftType,
                roles: new Map()
            });
        }

        const timeSlot = dateGroup.timeSlots.get(timeKey)!;
        const roleKey = item.role || 'Staff';

        if (!timeSlot.roles.has(roleKey)) {
            timeSlot.roles.set(roleKey, {
                role: roleKey,
                staff: []
            });
        }

        timeSlot.roles.get(roleKey)!.staff.push({
            name: item.staff_name || 'TBC',
            phone: item.staff_phone || 'Contact via agency',
            profile_link: item.staff_profile_link
        });
    }

    return grouped;
}

/** Check if shift is a night shift based on start time */
function isNightShift(startTime: string): boolean {
    if (!startTime) return false;
    const hour = parseInt(startTime.split(':')[0], 10);
    return hour >= 18 || hour < 6;
}

/** Get date range string from items */
function getDateRange(items: ShiftItem[]): string {
    if (!items || items.length === 0) return '';

    const dates = items.map(i => new Date(i.date)).sort((a, b) => a.getTime() - b.getTime());
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];

    if (firstDate.getTime() === lastDate.getTime()) {
        return firstDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${formatDate(firstDate)} - ${formatDate(lastDate)}`;
}

/** Get counts by role */
function getRoleCounts(items: ShiftItem[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of items) {
        const role = formatRoleName(item.role || 'Staff');
        counts[role] = (counts[role] || 0) + 1;
    }
    return counts;
}

/** Build role summary boxes HTML */
function buildRoleSummaryBoxes(roleCounts: Record<string, number>): string {
    return Object.entries(roleCounts).map(([role, count]) => `
        <div style="text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #059669;">${count}</div>
            <div style="font-size: 12px; color: #047857;">${role} Shifts</div>
        </div>
    `).join('');
}

/** Format role name for display */
function formatRoleName(role: string): string {
    const roleMap: Record<string, string> = {
        'healthcare_assistant': 'HCA',
        'registered_nurse': 'RN',
        'senior_carer': 'Senior Carer',
        'support_worker': 'Support Worker'
    };
    return roleMap[role.toLowerCase()] || role;
}

/** Build grouped HTML for shifts */
function buildGroupedShiftHtml(grouped: Map<string, GroupedShift>): string {
    let html = '';

    // Sort dates
    const sortedDates = Array.from(grouped.entries()).sort((a, b) =>
        new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );

    for (const [_, dateGroup] of sortedDates) {
        // Date header
        html += `
            <div style="background: #f9fafb; padding: 10px 15px; border-left: 4px solid #0284c7; margin-bottom: 10px; margin-top: 15px;">
                <strong style="color: #1f2937; font-size: 16px;">${dateGroup.dateFormatted}</strong>
            </div>
        `;

        // Time slots
        for (const [_, timeSlot] of dateGroup.timeSlots) {
            const shiftIcon = timeSlot.shiftType === 'Night' ? '🌙' : '🌞';
            const badgeColor = timeSlot.shiftType === 'Night' ? '#1e293b' : '#fef3c7';
            const badgeTextColor = timeSlot.shiftType === 'Night' ? '#e0f2fe' : '#92400e';

            // Role sections within time slot
            for (const [_, roleGroup] of timeSlot.roles) {
                const staffCount = roleGroup.staff.length;

                html += `
                    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 10px; background: #fefefe;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                            <div style="flex: 1; min-width: 150px;">
                                <div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">
                                    ${shiftIcon} ${timeSlot.shiftType} Shift • ${timeSlot.startTime} - ${timeSlot.endTime}
                                </div>
                                <div style="font-size: 13px; color: #6b7280;">${formatRoleName(roleGroup.role)}</div>
                            </div>
                            <div style="text-align: right; min-width: 80px;">
                                <div style="display: inline-block; background: ${badgeColor}; color: ${badgeTextColor}; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 14px;">
                                    ${staffCount} Staff
                                </div>
                            </div>
                        </div>
                        <div style="margin-top: 12px; padding: 12px; background: #f0fdf4; border-radius: 6px; border-left: 3px solid #10b981;">
                            <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">👤 ${formatRoleName(roleGroup.role)}</div>
                            <div style="font-size: 13px; color: #065f46; font-weight: 600; margin-bottom: 6px;">👥 Assigned Staff:</div>
                            <div style="font-size: 13px; color: #047857; line-height: 1.6;">
                                ${roleGroup.staff.map(s => `
                                    <div style="margin-bottom: 8px;">
                                        • <strong>${s.name}</strong>
                                        ${s.profile_link ? `
                                            <a href="${s.profile_link}" style="color: #0284c7; text-decoration: none; font-weight: 600; margin-left: 4px;">
                                                [📋 View Profile]
                                            </a>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }

    return html;
}