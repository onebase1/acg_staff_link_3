import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * TIER 2B-3: Client Communication Automation
 *
 * Auto-emails clients for key events:
 * 1. Shift filled confirmation (staff assigned)
 * 2. Day-before reminder (staff arriving tomorrow)
 * 3. Post-shift thank you + feedback request
 *
 * Settings: automation_settings.client_communication_automation
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { type, shift_id } = await req.json();

        if (!type || !shift_id) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'type and shift_id required. type: "shift_filled" | "day_before_reminder" | "post_shift_thank_you"'
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        console.log(`📧 [Client Communication] ${type} for shift ${shift_id}`);

        // Get shift details
        const { data: shifts, error: shiftError } = await supabase
            .from("shifts")
            .select("*")
            .eq("id", shift_id);

        if (shiftError) {
            throw shiftError;
        }

        if (!shifts || shifts.length === 0) {
            return new Response(
                JSON.stringify({ success: false, error: 'Shift not found' }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }
        const shift = shifts[0];

        // Check if feature enabled
        const { data: agencies, error: agencyError } = await supabase
            .from("agencies")
            .select("*")
            .eq("id", shift.agency_id);

        if (agencyError) {
            throw agencyError;
        }

        const agency = agencies[0];
        const isEnabled = agency?.settings?.automation_settings?.client_communication_automation !== false;

        if (!isEnabled) {
            console.log('⏭️  Client communication automation disabled');
            return new Response(
                JSON.stringify({
                    success: true,
                    skipped: true,
                    reason: 'Feature disabled in settings'
                }),
                { headers: { "Content-Type": "application/json" } }
            );
        }

        // Get client and staff details
        const { data: clients, error: clientError } = await supabase
            .from("clients")
            .select("*")
            .eq("id", shift.client_id);

        if (clientError) {
            throw clientError;
        }

        const client = clients[0];

        if (!client) {
            return new Response(
                JSON.stringify({ success: false, error: 'Client not found' }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        const clientEmail = client.billing_email || client.contact_person?.email;
        if (!clientEmail) {
            return new Response(
                JSON.stringify({ success: false, error: 'Client has no email address' }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        let staff = null;
        if (shift.assigned_staff_id) {
            const { data: staffData, error: staffError } = await supabase
                .from("staff")
                .select("*")
                .eq("id", shift.assigned_staff_id);

            if (staffError) {
                throw staffError;
            }

            staff = staffData?.[0];
        }

        // Format date
        const shiftDate = new Date(shift.date);
        const formattedDate = shiftDate.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        let subject, html;

        // TYPE 1: Shift Filled Confirmation
        if (type === 'shift_filled' && staff) {
            subject = `✅ Shift Confirmed - ${staff.first_name} ${staff.last_name} assigned for ${formattedDate}`;

            html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">✅ Shift Confirmed</h1>
                    </div>
                    <div style="padding: 30px; background: #f0fdf4;">
                        <p style="font-size: 16px; color: #1f2937;">Dear ${client.contact_person?.name || 'Team'},</p>
                        <p style="font-size: 16px; color: #1f2937;">Great news! We've assigned a staff member to your shift request.</p>

                        <div style="background: white; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px;">
                            <h3 style="margin-top: 0; color: #059669;">📋 Shift Details</h3>
                            <p style="margin: 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
                            <p style="margin: 10px 0;"><strong>Time:</strong> ${shift.start_time} - ${shift.end_time} (${shift.duration_hours} hours)</p>
                            <p style="margin: 10px 0;"><strong>Role:</strong> ${shift.role_required.replace('_', ' ')}</p>

                            <h3 style="margin-top: 20px; color: #059669;">👤 Assigned Staff</h3>
                            <p style="margin: 10px 0;"><strong>Name:</strong> ${staff.first_name} ${staff.last_name}</p>
                            <p style="margin: 10px 0;"><strong>Phone:</strong> ${staff.phone}</p>
                            ${staff.rating ? `<p style="margin: 10px 0;"><strong>Rating:</strong> ⭐ ${staff.rating.toFixed(1)}/5.0</p>` : ''}
                        </div>

                        <div style="background: #dcfce7; border: 2px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 8px;">
                            <p style="font-size: 14px; color: #065f46; margin: 0;">
                                💡 <strong>Note:</strong> ${staff.first_name} will arrive at the scheduled time. If you need to make any changes, please contact us immediately.
                            </p>
                        </div>

                        <p style="font-size: 14px; color: #6b7280;">
                            If you have any questions or concerns, please don't hesitate to contact us.
                        </p>
                    </div>
                    <div style="background: #059669; padding: 20px; text-align: center;">
                        <p style="color: white; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ${agency.name}</p>
                    </div>
                </div>
            `;
        }

        // TYPE 2: Day-Before Reminder
        else if (type === 'day_before_reminder' && staff) {
            subject = `📅 Reminder: ${staff.first_name} ${staff.last_name} arriving tomorrow at ${shift.start_time}`;

            html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">📅 Shift Reminder</h1>
                    </div>
                    <div style="padding: 30px; background: #eff6ff;">
                        <p style="font-size: 16px; color: #1f2937;">Dear ${client.contact_person?.name || 'Team'},</p>
                        <p style="font-size: 16px; color: #1f2937;">Just a friendly reminder about your shift tomorrow.</p>

                        <div style="background: white; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
                            <h3 style="margin-top: 0; color: #2563eb;">⏰ Tomorrow's Shift</h3>
                            <p style="margin: 10px 0;"><strong>Staff:</strong> ${staff.first_name} ${staff.last_name}</p>
                            <p style="margin: 10px 0;"><strong>Arrival Time:</strong> ${shift.start_time}</p>
                            <p style="margin: 10px 0;"><strong>Duration:</strong> ${shift.duration_hours} hours (until ${shift.end_time})</p>
                            <p style="margin: 10px 0;"><strong>Contact:</strong> ${staff.phone}</p>
                        </div>

                        <div style="background: #dbeafe; border: 2px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 8px;">
                            <p style="font-size: 14px; color: #1e40af; margin: 0;">
                                ✓ <strong>Everything's Ready:</strong> ${staff.first_name} has been notified and will arrive on time tomorrow morning.
                            </p>
                        </div>

                        <p style="font-size: 14px; color: #6b7280;">
                            If you need to make any last-minute changes, please contact us as soon as possible.
                        </p>
                    </div>
                    <div style="background: #2563eb; padding: 20px; text-align: center;">
                        <p style="color: white; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ${agency.name}</p>
                    </div>
                </div>
            `;
        }

        // TYPE 3: Post-Shift Thank You + Feedback
        else if (type === 'post_shift_thank_you' && staff) {
            subject = `Thank you - How was ${staff.first_name} ${staff.last_name}?`;

            html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">🙏 Thank You!</h1>
                    </div>
                    <div style="padding: 30px; background: #faf5ff;">
                        <p style="font-size: 16px; color: #1f2937;">Dear ${client.contact_person?.name || 'Team'},</p>
                        <p style="font-size: 16px; color: #1f2937;">Thank you for choosing ${agency.name}. We hope ${staff.first_name} provided excellent service.</p>

                        <div style="background: white; border-left: 4px solid #8b5cf6; padding: 20px; margin: 20px 0; border-radius: 8px;">
                            <h3 style="margin-top: 0; color: #7c3aed;">📝 Quick Feedback</h3>
                            <p style="margin: 10px 0;">We'd love to hear about your experience:</p>

                            <div style="margin: 20px 0;">
                                <p style="margin: 5px 0;"><strong>How would you rate ${staff.first_name}'s performance?</strong></p>
                                <p style="font-size: 24px; margin: 10px 0;">
                                    <a href="mailto:${agency.contact_email}?subject=Feedback:%205%20Stars%20-%20${shift.id}" style="text-decoration: none; margin: 0 5px;">⭐</a>
                                    <a href="mailto:${agency.contact_email}?subject=Feedback:%204%20Stars%20-%20${shift.id}" style="text-decoration: none; margin: 0 5px;">⭐</a>
                                    <a href="mailto:${agency.contact_email}?subject=Feedback:%203%20Stars%20-%20${shift.id}" style="text-decoration: none; margin: 0 5px;">⭐</a>
                                    <a href="mailto:${agency.contact_email}?subject=Feedback:%202%20Stars%20-%20${shift.id}" style="text-decoration: none; margin: 0 5px;">⭐</a>
                                    <a href="mailto:${agency.contact_email}?subject=Feedback:%201%20Star%20-%20${shift.id}" style="text-decoration: none; margin: 0 5px;">⭐</a>
                                </p>
                                <p style="font-size: 12px; color: #6b7280; margin: 0;">Click a star to send feedback</p>
                            </div>
                        </div>

                        <div style="background: #ede9fe; border: 2px solid #8b5cf6; padding: 15px; margin: 20px 0; border-radius: 8px;">
                            <p style="font-size: 14px; color: #5b21b6; margin: 0;">
                                💜 <strong>Need more shifts?</strong> Reply to this email or call us - we're here to help!
                            </p>
                        </div>
                    </div>
                    <div style="background: #7c3aed; padding: 20px; text-align: center;">
                        <p style="color: white; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ${agency.name} | ${agency.contact_phone}</p>
                    </div>
                </div>
            `;
        }

        else {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Invalid type: ${type} or missing staff data`
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Send email
        await supabase.functions.invoke('send-email', {
            body: {
                to: clientEmail,
                subject: subject,
                html: html
            }
        });

        console.log(`✅ Sent ${type} email to ${client.name}`);

        return new Response(
            JSON.stringify({
                success: true,
                type: type,
                recipient: clientEmail
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [Client Communication] Fatal error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
