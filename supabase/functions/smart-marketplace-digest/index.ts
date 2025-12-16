import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 🎯 SMART MARKETPLACE DIGEST
 *
 * Sends ONE consolidated notification per staff member showing ONLY shifts they're eligible for
 *
 * Features:
 * - Reuses marketplace eligibility logic (role, availability, double-booking prevention)
 * - Multi-channel parallel notifications (SMS, WhatsApp, Email)
 * - Respects agency settings toggles
 * - Solves SMS ambiguity problem (multiple shifts → one digest)
 * - Coexists with individual notification system
 *
 * Triggered: When admin posts urgent shifts OR broadcasts to marketplace
 * Settings: automation_settings.use_smart_marketplace_digest
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========================================
// HELPER: Filter eligible shifts for a staff member
// ========================================
async function filterEligibleShifts(
    supabase: any,
    shifts: any[],
    staff: any,
    assignedDates: string[]
) {
    const now = new Date();

    return shifts.filter(shift => {
        // Must be open status
        if (shift.status !== 'open') return false;

        // Must NOT have any staff assigned
        if (shift.assigned_staff_id) return false;

        // Must be same agency
        if (shift.agency_id !== staff.agency_id) return false;

        // ✅ CRITICAL: Role must match
        if (shift.role_required !== staff.role) {
            console.log(`  ❌ Role mismatch: shift requires ${shift.role_required}, staff is ${staff.role}`);
            return false;
        }

        // ✅ Check shift hasn't ended (handles overnight shifts)
        const shiftEndDateTime = new Date(`${shift.date}T${shift.end_time}`);

        // If end_time < start_time, it's an overnight shift - add 1 day
        if (shift.end_time < shift.start_time) {
            shiftEndDateTime.setDate(shiftEndDateTime.getDate() + 1);
        }

        if (shiftEndDateTime < now) {
            console.log(`  ❌ Shift ended: ${shift.date} ended at ${shiftEndDateTime.toISOString()}`);
            return false;
        }

        // ✅ Check for double-booking
        if (assignedDates.includes(shift.date)) {
            console.log(`  ❌ Double-booking: staff already working on ${shift.date}`);
            return false;
        }

        // ✅ Check availability OR marketplace_visible flag
        const isAdminApproved = shift.marketplace_visible === true;

        // Auto-match based on availability
        const isAutoMatched = (() => {
            const shiftDate = new Date(shift.date);
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const shiftDay = dayNames[shiftDate.getDay()];

            const availability = staff.availability?.[shiftDay] || [];

            const isNightShift = shift.start_time >= '20:00' || shift.start_time <= '08:00';
            const shiftType = isNightShift ? 'night' : 'day';

            const matches = availability.includes(shiftType);
            console.log(`  📅 Availability check for ${shiftDay} ${shiftType}: ${matches ? '✅' : '❌'}`);
            return matches;
        })();

        const eligible = isAdminApproved || isAutoMatched;
        console.log(`  ${eligible ? '✅' : '❌'} Shift ${shift.id}: admin=${isAdminApproved}, auto=${isAutoMatched}`);

        return eligible;
    });
}

// ========================================
// HELPER: Format date for display
// ========================================
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

// ========================================
// HELPER: Send SMS notification
// ========================================
async function sendSMS(supabase: any, staff: any, shiftCount: number, agencyName: string) {
    const message = `🏥 ${agencyName}

${shiftCount} NEW SHIFT${shiftCount > 1 ? 'S' : ''} AVAILABLE

These shifts match your:
✓ Role (${staff.role.replace('_', ' ').toUpperCase()})
✓ Availability
✓ Schedule (no double-bookings)

View & claim shifts now:
👉 https://acgstafflink.com/portal

First come, first served!

Reply STOP to opt out`;

    const { error } = await supabase.functions.invoke('send-sms', {
        body: {
            to: staff.phone,
            message: message
        }
    });

    if (error) throw error;
    console.log(`  ✅ SMS sent to ${staff.phone}`);
}

// ========================================
// HELPER: Send WhatsApp notification
// ========================================
async function sendWhatsApp(supabase: any, staff: any, shifts: any[], agencyName: string) {
    // Build shift list
    let shiftList = '';
    shifts.slice(0, 5).forEach((shift, idx) => {
        const earnings = (shift.pay_rate * (shift.duration_hours - (shift.break_duration_minutes || 60) / 60)).toFixed(2);
        shiftList += `\n${idx + 1}. *${formatDate(shift.date)}* ${shift.start_time}-${shift.end_time}
   ${shift.role_required.replace('_', ' ').toUpperCase()} • £${shift.pay_rate}/hr (£${earnings} total)`;
    });

    if (shifts.length > 5) {
        shiftList += `\n\n_...and ${shifts.length - 5} more shift${shifts.length - 5 > 1 ? 's' : ''}_`;
    }

    const message = `🏥 *${agencyName}*

*${shifts.length} NEW SHIFT${shifts.length > 1 ? 'S' : ''} MATCHED FOR YOU*

These shifts match your profile:
✅ Role: ${staff.role.replace('_', ' ').toUpperCase()}
✅ Your availability
✅ No schedule conflicts
${shiftList}

*Claim your shifts:*
🔗 https://acgstafflink.com/portal

⚡ First come, first served!`;

    const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
            to: staff.phone,
            message: message
        }
    });

    if (error) throw error;
    console.log(`  ✅ WhatsApp sent to ${staff.phone}`);
}

// ========================================
// HELPER: Send Email notification
// ========================================
async function sendEmail(supabase: any, staff: any, shifts: any[], clients: any[], agencyName: string) {
    // Build shift cards HTML
    let shiftCardsHtml = '';

    shifts.forEach((shift) => {
        const client = clients.find(c => c.id === shift.client_id);
        const clientName = client?.name || 'Unknown Client';
        const location = client?.address
            ? `${client.address.line1}, ${client.address.city} ${client.address.postcode}`
            : 'Location TBA';

        const breakHours = (shift.break_duration_minutes || 60) / 60;
        const billableHours = Math.max(0, shift.duration_hours - breakHours);
        const earnings = (shift.pay_rate * billableHours).toFixed(2);

        const urgencyBadge = shift.urgency === 'urgent'
            ? '<span style="background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">⚠️ URGENT</span>'
            : shift.urgency === 'critical'
            ? '<span style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">🚨 CRITICAL</span>'
            : '';

        shiftCardsHtml += `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #f9fafb;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <h3 style="margin: 0; color: #111827; font-size: 18px;">${clientName}</h3>
                ${urgencyBadge}
            </div>
            <div style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                <p style="margin: 4px 0;">📅 <strong>${formatDate(shift.date)}</strong> • ${shift.start_time} - ${shift.end_time} (${shift.duration_hours}h)</p>
                <p style="margin: 4px 0;">👔 <strong>Role:</strong> ${shift.role_required.replace('_', ' ').toUpperCase()}</p>
                <p style="margin: 4px 0;">📍 <strong>Location:</strong> ${location}</p>
                <p style="margin: 4px 0;">💰 <strong>Pay:</strong> £${shift.pay_rate}/hr • <strong>Total Earnings:</strong> £${earnings}</p>
                ${shift.notes ? `<p style="margin: 4px 0; padding-top: 8px; border-top: 1px solid #e5e7eb;">📝 ${shift.notes}</p>` : ''}
            </div>
        </div>`;
    });

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎯 ${shifts.length} New Shift${shifts.length > 1 ? 's' : ''} Matched For You</h1>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #111827; margin-bottom: 20px;">
                Hi <strong>${staff.first_name}</strong>,
            </p>

            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Great news! We have <strong>${shifts.length} new shift${shifts.length > 1 ? 's' : ''}</strong> that perfectly match your profile:
            </p>

            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 8px 0; color: #374151;">✅ <strong>Role:</strong> ${staff.role.replace('_', ' ').toUpperCase()}</p>
                <p style="margin: 8px 0; color: #374151;">✅ <strong>Availability:</strong> Matches your schedule</p>
                <p style="margin: 8px 0; color: #374151;">✅ <strong>No Conflicts:</strong> No double-bookings</p>
            </div>

            <h2 style="color: #111827; font-size: 20px; margin-bottom: 16px;">Available Shifts</h2>
            ${shiftCardsHtml}

            <div style="text-align: center; margin-top: 30px;">
                <a href="https://acgstafflink.com/portal" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                    View & Claim Shifts Now →
                </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                ⚡ <strong>First come, first served!</strong> These shifts are visible to all eligible staff.
            </p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>${agencyName} • Powered by ACG StaffLink</p>
        </div>
    </body>
    </html>`;

    const { error } = await supabase.functions.invoke('send-email', {
        body: {
            to: staff.email,
            subject: `🎯 ${shifts.length} New Shift${shifts.length > 1 ? 's' : ''} Matched For You`,
            html: html,
            from_name: agencyName
        }
    });

    if (error) throw error;
    console.log(`  ✅ Email sent to ${staff.email}`);
}

// ========================================
// MAIN FUNCTION
// ========================================
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { shift_ids, agency_id } = await req.json();

        if (!shift_ids || shift_ids.length === 0 || !agency_id) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'shift_ids[] and agency_id required'
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`🎯 [Smart Marketplace Digest] Processing ${shift_ids.length} shifts for agency ${agency_id}`);

        // ✅ Get agency settings
        const { data: agency, error: agencyError } = await supabase
            .from("agencies")
            .select("*")
            .eq("id", agency_id)
            .single();

        if (agencyError) throw agencyError;

        // Check if feature is enabled (default: false for backward compatibility)
        const isEnabled = agency?.settings?.automation_settings?.use_smart_marketplace_digest === true;

        if (!isEnabled) {
            console.log('⏭️  Smart marketplace digest disabled for this agency');
            return new Response(
                JSON.stringify({
                    success: true,
                    skipped: true,
                    reason: 'Feature disabled in settings. Enable in Agency Settings → Automation → Smart Marketplace Digest'
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get notification channel settings
        const channelSettings = agency?.settings?.urgent_shift_notifications || {
            sms_enabled: true,
            whatsapp_enabled: true,
            email_enabled: true
        };

        console.log(`📡 Channels enabled: SMS=${channelSettings.sms_enabled}, WhatsApp=${channelSettings.whatsapp_enabled}, Email=${channelSettings.email_enabled}`);

        // ✅ Fetch all shifts
        const { data: shifts, error: shiftsError } = await supabase
            .from("shifts")
            .select("*")
            .in("id", shift_ids);

        if (shiftsError) throw shiftsError;

        console.log(`📋 Fetched ${shifts.length} shifts`);

        // ✅ Fetch all staff in agency
        const { data: allStaff, error: staffError } = await supabase
            .from("staff")
            .select("*")
            .eq("agency_id", agency_id)
            .eq("status", "active");

        if (staffError) throw staffError;

        console.log(`👥 Found ${allStaff.length} active staff members`);

        // ✅ Fetch all clients for shift details
        const clientIds = [...new Set(shifts.map(s => s.client_id))];
        const { data: clients, error: clientsError } = await supabase
            .from("clients")
            .select("*")
            .in("id", clientIds);

        if (clientsError) throw clientsError;

        const results = {
            totalStaff: allStaff.length,
            staffNotified: 0,
            staffSkipped: 0,
            totalNotificationsSent: 0,
            channelBreakdown: {
                sms: 0,
                whatsapp: 0,
                email: 0
            },
            errors: []
        };

        // ✅ Process each staff member
        for (const staff of allStaff) {
            try {
                console.log(`\n👤 Processing ${staff.first_name} ${staff.last_name} (${staff.role})`);

                // Check if staff has opted out
                if (staff.opt_out_shift_reminders === true) {
                    console.log(`  ⏭️  Staff opted out of notifications`);
                    results.staffSkipped++;
                    continue;
                }

                // Get staff's assigned dates for double-booking check
                const { data: assignedShifts, error: assignedError } = await supabase
                    .from("shifts")
                    .select("date")
                    .eq("assigned_staff_id", staff.id)
                    .in("status", ["confirmed", "pending", "in_progress"]);

                if (assignedError) throw assignedError;

                const assignedDates = assignedShifts.map(s => s.date);
                console.log(`  📅 Staff has ${assignedDates.length} assigned dates`);

                // ✅ Filter eligible shifts for this staff member
                const eligibleShifts = await filterEligibleShifts(
                    supabase,
                    shifts,
                    staff,
                    assignedDates
                );

                if (eligibleShifts.length === 0) {
                    console.log(`  ⏭️  No eligible shifts for this staff member`);
                    results.staffSkipped++;
                    continue;
                }

                console.log(`  ✅ ${eligibleShifts.length} eligible shift(s) found`);

                // ✅ Send notifications in parallel across enabled channels
                const notificationPromises = [];

                if (channelSettings.sms_enabled && staff.phone) {
                    notificationPromises.push(
                        sendSMS(supabase, staff, eligibleShifts.length, agency.name)
                            .then(() => { results.channelBreakdown.sms++; })
                            .catch(err => console.error('  ❌ SMS failed:', err.message))
                    );
                }

                if (channelSettings.whatsapp_enabled && staff.phone) {
                    notificationPromises.push(
                        sendWhatsApp(supabase, staff, eligibleShifts, agency.name)
                            .then(() => { results.channelBreakdown.whatsapp++; })
                            .catch(err => console.error('  ❌ WhatsApp failed:', err.message))
                    );
                }

                if (channelSettings.email_enabled && staff.email) {
                    notificationPromises.push(
                        sendEmail(supabase, staff, eligibleShifts, clients, agency.name)
                            .then(() => { results.channelBreakdown.email++; })
                            .catch(err => console.error('  ❌ Email failed:', err.message))
                    );
                }

                await Promise.all(notificationPromises);

                results.staffNotified++;
                results.totalNotificationsSent += notificationPromises.length;

                console.log(`  ✅ Sent ${notificationPromises.length} notification(s) to ${staff.first_name}`);

            } catch (staffError: any) {
                console.error(`  ❌ Error processing staff ${staff.id}:`, staffError.message);
                results.errors.push({
                    staff_id: staff.id,
                    staff_name: `${staff.first_name} ${staff.last_name}`,
                    error: staffError.message
                });
            }
        }

        console.log(`\n✅ [Smart Digest] Complete! Notified ${results.staffNotified}/${results.totalStaff} staff`);
        console.log(`📊 Breakdown: ${results.channelBreakdown.sms} SMS, ${results.channelBreakdown.whatsapp} WhatsApp, ${results.channelBreakdown.email} Email`);

        return new Response(
            JSON.stringify({
                success: true,
                results: results
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error('❌ [Smart Marketplace Digest] Fatal error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
