import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shouldSendNotification } from "../_shared/preferenceChecker.ts";
import {
    logNotificationSent,
    logNotificationFailed,
    logNotificationSkipped
} from "../_shared/notificationLogger.ts";
import { scheduleRetry } from "../_shared/retryHandler.ts";

/**
 * TIER 2B-1: Enhanced WhatsApp Shift Offers
 *
 * Sends rich formatted shift offers to staff via WhatsApp
 * Includes: client name, date, time, location, pay rate, accept/decline buttons
 *
 * Triggered: When admin assigns shift OR when urgent shift broadcast is sent
 * Settings: automation_settings.enhanced_whatsapp_offers
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { shift_id, staff_ids } = await req.json();

        if (!shift_id || !staff_ids || staff_ids.length === 0) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'shift_id and staff_ids[] required'
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        console.log(`📱 [Enhanced WhatsApp Offers] Processing shift ${shift_id} for ${staff_ids.length} staff`);

        // Get shift details
        const { data: shift, error: shiftError } = await supabase
            .from("shifts")
            .select("*")
            .eq("id", shift_id)
            .single();

        if (shiftError || !shift) {
            return new Response(
                JSON.stringify({ success: false, error: 'Shift not found' }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        // Check if feature enabled for this agency
        const { data: agency, error: agencyError } = await supabase
            .from("agencies")
            .select("*")
            .eq("id", shift.agency_id)
            .single();

        if (agencyError) throw agencyError;

        const isEnabled = agency?.settings?.automation_settings?.enhanced_whatsapp_offers !== false;

        if (!isEnabled) {
            console.log('⏭️  Enhanced WhatsApp offers disabled for this agency');
            return new Response(
                JSON.stringify({
                    success: true,
                    skipped: true,
                    reason: 'Feature disabled in settings'
                }),
                { headers: { "Content-Type": "application/json" } }
            );
        }

        // Get client details
        const { data: client, error: clientError } = await supabase
            .from("clients")
            .select("*")
            .eq("id", shift.client_id)
            .single();

        if (clientError || !client) {
            return new Response(
                JSON.stringify({ success: false, error: 'Client not found' }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        const results = {
            sent: 0,
            failed: 0,
            errors: []
        };

        // Send to each staff member
        for (const staffId of staff_ids) {
            let staffMember = null;
            try {
                const { data: fetchedStaff, error: staffError } = await supabase
                    .from("staff")
                    .select("*")
                    .eq("id", staffId)
                    .single();

                if (staffError || !fetchedStaff) {
                    console.log(`⚠️  Staff ${staffId} not found, skipping`);
                    continue;
                }

                staffMember = fetchedStaff;

                // Check preferences
                const preferenceCheck = await shouldSendNotification(
                    supabase,
                    staffMember.email,
                    'shift_offer',
                    'whatsapp',
                    'staff'
                );

                if (!preferenceCheck.allowed) {
                    console.log(`⏭️ [WhatsApp Offer] Skipped for ${staffMember.email} - ${preferenceCheck.reason}`);
                    await logNotificationSkipped(supabase, {
                        recipientEmail: staffMember.email,
                        recipientType: 'staff',
                        staffId: staffMember.id,
                        agencyId: shift.agency_id,
                        notificationType: 'shift_offer',
                        channel: 'whatsapp',
                        preferenceChecked: preferenceCheck.preferenceChecked,
                        preferenceStatus: preferenceCheck.preferenceStatus,
                        skippedReason: preferenceCheck.reason,
                        metadata: { shift_id: shift.id }
                    });
                    continue;
                }

                // Format location
                const location = client.address
                    ? `${client.address.line1}, ${client.address.city} ${client.address.postcode}`
                    : 'Location TBA';

                // Calculate earnings (accounting for break time)
                const breakHours = (shift.break_duration_minutes || 60) / 60;
                const billableHours = Math.max(0, shift.duration_hours - breakHours);
                const totalEarnings = (shift.pay_rate * billableHours).toFixed(2);

                // Format message with rich details
                const message = `🏥 *NEW SHIFT OFFER*

📍 *${client.name}*
${location}

📅 *Date:* ${new Date(shift.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
🕐 *Time:* ${shift.start_time} - ${shift.end_time} (${shift.duration_hours}h)
👔 *Role:* ${shift.role_required.replace('_', ' ').toUpperCase()}

💰 *Pay:* £${shift.pay_rate}/hr
💵 *Total Earnings:* £${totalEarnings}

${shift.urgency === 'urgent' ? '⚠️ *URGENT SHIFT*\n' : ''}${shift.urgency === 'critical' ? '🚨 *CRITICAL - SAME DAY*\n' : ''}
${shift.notes ? `📝 *Notes:* ${shift.notes}\n` : ''}
---

*To accept this shift:*
Reply *YES* or *1*

*To decline:*
Reply *NO* or *2*

_Shift ID: ${shift.id.slice(-8)}_`;

                // Send WhatsApp message
                const { error: sendError } = await supabase.functions.invoke('send-whatsapp', {
                    body: {
                        to: staffMember.phone,
                        message: message
                    }
                });

                if (sendError) throw sendError;

                console.log(`✅ Sent WhatsApp offer to ${staffMember.first_name} ${staffMember.last_name}`);
                
                await logNotificationSent(supabase, {
                    recipientEmail: staffMember.email,
                    recipientType: 'staff',
                    staffId: staffMember.id,
                    agencyId: shift.agency_id,
                    notificationType: 'shift_offer',
                    channel: 'whatsapp',
                    provider: 'twilio', // Assuming Twilio for WhatsApp
                    preferenceChecked: preferenceCheck.preferenceChecked,
                    preferenceStatus: preferenceCheck.preferenceStatus,
                    metadata: { shift_id: shift.id }
                });

                results.sent++;

            } catch (staffError: any) {
                console.error(`❌ Error sending to staff ${staffId}:`, staffError.message);
                
                await logNotificationFailed(supabase, {
                    recipientEmail: staffMember?.email || 'unknown',
                    recipientType: 'staff',
                    staffId: staffId,
                    agencyId: shift.agency_id,
                    notificationType: 'shift_offer',
                    channel: 'whatsapp',
                    errorMessage: staffError.message,
                    errorCode: 'send_failed'
                });
                
                await scheduleRetry(supabase, {
                    notificationType: 'shift_offer',
                    recipientEmail: staffMember?.email || `staff_${staffId}@unknown.com`,
                    recipientId: staffId,
                    agencyId: shift.agency_id,
                    channel: 'whatsapp',
                    metadata: { shift_id: shift.id }
                });
                
                results.failed++;
                results.errors.push({
                    staff_id: staffId,
                    error: staffError.message
                });
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                results: results
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [Enhanced WhatsApp Offers] Fatal error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
