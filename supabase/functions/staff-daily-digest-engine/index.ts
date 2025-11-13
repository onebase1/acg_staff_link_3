import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * TIER 2B-4: Staff Daily Digest Engine
 *
 * Sends staff their shift schedule every morning at 8am
 * Can send via Email, SMS, or both (configurable per agency)
 *
 * Triggered: Scheduled daily at 8am
 * Settings:
 * - automation_settings.staff_daily_digest_enabled
 * - automation_settings.staff_daily_digest_email
 * - automation_settings.staff_daily_digest_sms
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log('🌅 [Staff Daily Digest] Starting 8am run...');

        const { data: agencies, error: agenciesError } = await supabase
            .from("agencies")
            .select("*");

        if (agenciesError) throw agenciesError;

        const results = {
            emails_sent: 0,
            sms_sent: 0,
            errors: [],
        };

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        for (const agency of agencies) {
            const settings = agency.settings?.automation_settings || {};

            // Check if feature enabled
            if (!settings.staff_daily_digest_enabled) {
                console.log(`⏭️  [Agency: ${agency.name}] Daily digest disabled`);
                continue;
            }

            const sendEmail = settings.staff_daily_digest_email !== false; // Default true
            const sendSMS = settings.staff_daily_digest_sms === true; // Default false

            if (!sendEmail && !sendSMS) {
                console.log(`⏭️  [Agency: ${agency.name}] No delivery methods enabled`);
                continue;
            }

            console.log(`🏥 [Agency: ${agency.name}] Processing daily digests (Email: ${sendEmail}, SMS: ${sendSMS})`);

            // Get today's confirmed shifts
            const { data: todayShifts, error: shiftsError } = await supabase
                .from("shifts")
                .select("*")
                .eq("agency_id", agency.id)
                .eq("date", todayStr)
                .in("status", ['confirmed', 'assigned', 'in_progress']);

            if (shiftsError) {
                console.error(`❌ Error fetching shifts for ${agency.name}:`, shiftsError);
                continue;
            }

            // Group by staff
            const shiftsByStaff = todayShifts.reduce((acc, shift) => {
                if (shift.assigned_staff_id) {
                    if (!acc[shift.assigned_staff_id]) acc[shift.assigned_staff_id] = [];
                    acc[shift.assigned_staff_id].push(shift);
                }
                return acc;
            }, {});

            // Send digest to each staff member with shifts today
            for (const [staffId, shifts] of Object.entries(shiftsByStaff)) {
                try {
                    const { data: staff, error: staffError } = await supabase
                        .from("staff")
                        .select("*")
                        .eq("id", staffId)
                        .single();

                    if (staffError || !staff) continue;

                    const staffMember = staff;

                    // Get client names
                    const shiftsWithClients = await Promise.all(shifts.map(async (shift) => {
                        const { data: client } = await supabase
                            .from("clients")
                            .select("*")
                            .eq("id", shift.client_id)
                            .single();
                        return { ...shift, client };
                    }));

                    // Sort shifts by start time
                    shiftsWithClients.sort((a, b) => a.start_time.localeCompare(b.start_time));

                    // Calculate total earnings
                    const totalEarnings = shiftsWithClients.reduce((sum, s) =>
                        sum + (s.pay_rate * s.duration_hours), 0
                    ).toFixed(2);

                    // SEND EMAIL
                    if (sendEmail && staffMember.email) {
                        const shiftListHTML = shiftsWithClients.map(s => `
                            <div style="background: white; border-left: 4px solid #06b6d4; padding: 15px; margin: 10px 0; border-radius: 8px;">
                                <p style="margin: 5px 0;"><strong style="font-size: 18px;">${s.start_time} - ${s.end_time}</strong> <span style="color: #6b7280;">(${s.duration_hours}h)</span></p>
                                <p style="margin: 5px 0; font-size: 16px;">📍 ${s.client?.name || 'Client'}</p>
                                <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">${s.client?.address?.line1}, ${s.client?.address?.postcode}</p>
                                ${s.client?.contact_person?.phone ? `<p style="margin: 5px 0; font-size: 14px; color: #6b7280;">☎️ Contact: ${s.client.contact_person.phone}</p>` : ''}
                                <p style="margin: 5px 0; color: #059669; font-weight: bold;">💰 £${s.pay_rate}/hr = £${(s.pay_rate * s.duration_hours).toFixed(2)}</p>
                            </div>
                        `).join('');

                        await supabase.functions.invoke('send-email', {
                            body: {
                                to: staffMember.email,
                                subject: `🌅 Good Morning! You have ${shifts.length} shift${shifts.length > 1 ? 's' : ''} today`,
                                html: `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <div style="background: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%); padding: 30px; text-align: center;">
                                            <h1 style="color: white; margin: 0;">🌅 Good Morning, ${staffMember.first_name}!</h1>
                                            <p style="color: #e0f2fe; margin-top: 10px; font-size: 18px;">${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                        </div>
                                        <div style="padding: 30px; background: #f0f9ff;">
                                            <p style="font-size: 16px; color: #1f2937;">Here's your schedule for today:</p>

                                            ${shiftListHTML}

                                            <div style="background: #cffafe; border: 2px solid #06b6d4; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
                                                <p style="font-size: 14px; color: #0e7490; margin: 0;">
                                                    💰 <strong>Today's Total Earnings:</strong> £${totalEarnings}
                                                </p>
                                            </div>

                                            <div style="background: #dbeafe; border: 2px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 8px;">
                                                <p style="font-size: 14px; color: #0369a1; margin: 0;">
                                                    💡 <strong>Reminder:</strong> Arrive 10 minutes early to each shift. Have your ID and any required documents ready.
                                                </p>
                                            </div>

                                            <p style="font-size: 14px; color: #6b7280; text-align: center;">
                                                Have a great day! 🌟
                                            </p>
                                        </div>
                                        <div style="background: #0284c7; padding: 20px; text-align: center;">
                                            <p style="color: white; font-size: 12px; margin: 0;">© ${now.getFullYear()} ${agency.name}</p>
                                        </div>
                                    </div>
                                `
                            }
                        });

                        results.emails_sent++;
                    }

                    // SEND SMS (shorter version)
                    if (sendSMS && staffMember.phone) {
                        const shiftListSMS = shiftsWithClients.map(s =>
                            `${s.start_time}-${s.end_time} @ ${s.client?.name} (£${(s.pay_rate * s.duration_hours).toFixed(0)})`
                        ).join('\n');

                        const smsMessage = `🌅 Good morning ${staffMember.first_name}! Today's shifts:\n\n${shiftListSMS}\n\nTotal: £${totalEarnings}. Have a great day! 🌟`;

                        await supabase.functions.invoke('send-sms', {
                            body: {
                                to: staffMember.phone,
                                message: smsMessage
                            }
                        });

                        results.sms_sent++;
                    }

                    console.log(`✅ Sent daily digest to ${staffMember.first_name} ${staffMember.last_name} (${shifts.length} shifts)`);

                } catch (staffError) {
                    console.error(`❌ Error sending digest to staff ${staffId}:`, staffError.message);
                    results.errors.push({
                        staff_id: staffId,
                        error: staffError.message
                    });
                }
            }

            // ALSO: Send "rest day" message to staff with NO shifts today
            const { data: allActiveStaff, error: allStaffError } = await supabase
                .from("staff")
                .select("*")
                .eq("agency_id", agency.id)
                .eq("status", "active");

            if (!allStaffError && allActiveStaff) {
                const staffWithNoShifts = allActiveStaff.filter(s => !shiftsByStaff[s.id]);

                for (const staffMember of staffWithNoShifts) {
                    try {
                        if (sendEmail && staffMember.email) {
                            await supabase.functions.invoke('send-email', {
                                body: {
                                    to: staffMember.email,
                                    subject: `☀️ Good Morning! Rest day today`,
                                    html: `
                                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
                                                <h1 style="color: white; margin: 0;">☀️ Good Morning, ${staffMember.first_name}!</h1>
                                            </div>
                                            <div style="padding: 30px; background: #f0fdf4; text-align: center;">
                                                <p style="font-size: 18px; color: #1f2937; margin: 20px 0;">You have no shifts scheduled today.</p>
                                                <p style="font-size: 48px; margin: 20px 0;">🌴</p>
                                                <p style="font-size: 16px; color: #059669; font-weight: bold;">Enjoy your rest day!</p>
                                                <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">Check your portal or WhatsApp for new shift offers</p>
                                            </div>
                                            <div style="background: #059669; padding: 20px; text-align: center;">
                                                <p style="color: white; font-size: 12px; margin: 0;">© ${now.getFullYear()} ${agency.name}</p>
                                            </div>
                                        </div>
                                    `
                                }
                            });

                            results.emails_sent++;
                        }
                    } catch (error) {
                        // Silent fail for rest day messages (not critical)
                        console.log(`⚠️  Failed to send rest day message to ${staffMember.first_name}: ${error.message}`);
                    }
                }
            }
        }

        console.log('✅ [Staff Daily Digest] Complete:', results);

        return new Response(
            JSON.stringify({
                success: true,
                timestamp: new Date().toISOString(),
                results: results
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [Staff Daily Digest] Fatal error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
